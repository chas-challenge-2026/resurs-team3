# Resurs Audit – Design

## Syfte

Native-modul för att upptäcka manipulation av audit-loggen i efterhand,
enligt Issue #28.

I v1 är audit-loggen en osignerad JSON-blob (`audit_log TEXT`) utan index.
En rad kan ändras eller raderas i efterhand utan att det syns
(se `docs/known-bugs.md` #6 och `docs/v2-targets.md`).

Modulen kedjar ihop audit-poster med hashar och signerar varje post, så att
både enskild manipulation och omkastning av kedjans ordning går att upptäcka
vid verifiering.

## Signaturalgoritm

Ed25519 (RFC 8032), via OpenSSL:s `EVP_PKEY`-API.

Valt istället för RSA eller ECDSA P-256 eftersom:

- Fasta, korta nycklar (32 byte) och signaturer (64 byte) — inget att
  parametrisera eller råka konfigurera fel.
- Stöds direkt av projektets OpenSSL-version (3.0.13) utan extra bibliotek.
- Inget externt krav (revisor/tillsynsmyndighet) styr mot RSA eller P-256
  idag.

## Hash-kedja

SHA-256 används för att kedja posterna:

    hash_0 = SHA256(entry_0)
    hash_N = SHA256(hash_(N-1) || entry_N)   för N > 0

Varje `hash_N` signeras separat med Ed25519. Att ändra en post i mitten av
kedjan, eller kasta om ordningen på annars giltiga poster, bryter
hash-länken till efterföljande poster och upptäcks därför vid verifiering
(se `resurs_audit_verify_chain` nedan) — inte bara att en enskild signatur är
förfalskad.

## Nyckel

Ed25519-nycklar är 32 byte råa bytes (ingen PEM-inkapsling behövs i
C-gränssnittet):

- Privat nyckel (32 byte): skickas in vid signering, lagras inte av modulen.
  Samma princip som `key` i `resurs_encrypt_pii` — ska i produktion komma
  från separat nyckelhantering (Vault/KMS), inte databasen.
- Publik nyckel (32 byte): kan distribueras fritt för verifiering, t.ex.
  till revisor eller tillsynsmyndighet.

## Publikt API

```c
int resurs_audit_chain_entry(
    const unsigned char* prev_hash,      /* 32 byte, NULL för första posten */
    const char* entry_json,
    size_t entry_len,
    const unsigned char* private_key,    /* 32 byte, rå Ed25519-nyckel */
    unsigned char* hash_out,             /* 32 byte */
    unsigned char* signature_out,        /* minst 64 byte */
    size_t* signature_len                /* in: kapacitet, ut: faktisk längd */
);

int resurs_audit_verify_chain(
    const unsigned char* entries_json,   /* alla poster, back-to-back */
    const size_t* entry_lens,            /* entry_count längder */
    const unsigned char* hashes,         /* entry_count * 32 byte */
    const unsigned char* signatures,     /* entry_count * 64 byte */
    size_t entry_count,
    const unsigned char* public_key,     /* 32 byte */
    int* first_invalid_index             /* ut: -1 om kedjan är giltig */
);
```

Se `resurs_audit.h` för fullständig dokumentation per parameter.

### Avsteg från ursprunglig spec (`native/README.md`)

Den ursprungliga planeringsspecen i `native/README.md` saknade `private_key`
som parameter till `resurs_audit_chain_entry` (signering är omöjlig utan
den), och lät `resurs_audit_verify_chain` ta emot enbart färdigräknade
`hashes` utan `entry_json`. Det senare gör att funktionen bara kunnat
verifiera signaturer på lösryckta hash-värden — inte upptäcka att någon
kastat om ordningen på annars giltiga, korrekt signerade poster. Det
faktiska API:et ovan räknar istället om hela hash-kedjan från
`entries_json` vid verifiering, vilket ger verkligt kedjeskydd. Bekräftat
med ett testfall (`test_reordered_chain_detected` i
`tests/test_resurs_audit.c`) som visar att en omkastning upptäcks.

## Return codes

    0  = RESURS_OK
   -1  = RESURS_ERR_NULL_ARG
   -2  = RESURS_ERR_CRYPTO (oväntat hash-/signeringsfel)
   -3  = RESURS_ERR_AUTH_FAILED (kedjan/signaturen verifierades inte, eller
         chain_entry anropades med fel privat nyckel-längd)
   -4  = RESURS_ERR_BUFFER_TOO_SMALL

`resurs_audit_verify_chain` returnerar `RESURS_ERR_AUTH_FAILED` så fort en
post inte stämmer (fel hash *eller* fel signatur) och sätter
`first_invalid_index` till den postens index, utan att fortsätta
kontrollera resten av kedjan.

## Dataflöde

Signering (en gång per ny audit-post):

    entry_json + prev_hash + private_key
              |
              v
       SHA-256 (kedjar mot prev_hash)
              |
              v
            hash_out
              |
              v
       Ed25519-signering
              |
              v
          signature_out

    hash_out och signature_out sparas tillsammans med posten; hash_out blir
    nästa posts prev_hash.

Verifiering (av hela eller delar av kedjan):

    entries_json + entry_lens + hashes + signatures + public_key
              |
              v
    räkna om hash-kedjan från entries_json, jämför mot hashes
              |
              v
    verifiera signatures mot hashes med public_key
              |
              v
    first_invalid_index (-1 = giltig kedja)
