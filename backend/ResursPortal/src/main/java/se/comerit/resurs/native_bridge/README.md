# Java ↔ C++ Bridge (native_bridge)

Detta paket innehåller Java-gränssnittet mot de native C-modulerna för
kryptering (`native/resurs_crypto.c`) och audit-signering
(`native/resurs_audit.c`), enligt Issue #28.

## Vad finns här

| Fil | Syfte |
|---|---|
| `ResursCrypto.java` | Lågnivå-interface (JNA) som speglar C-funktionerna exakt |
| `ResursCryptoService.java` | Enkel, användbar klass för resten av backend att anropa |
| `ResursCryptoExample.java` | Körbart exempel som visar hela flödet: kryptera → dekryptera |
| `ResursAudit.java` | Lågnivå-interface (JNA) mot `resurs_audit_chain_entry` och `resurs_audit_verify_chain` |
| `ResursAuditService.java` | Signera audit-poster (`signEntry`) och verifiera en kedja (`verifyChain`) |
| `AuditChainResult.java`, `VerifyChainResult.java` | Resultatet av signering respektive verifiering |

## Så här använder du det

```java
ResursCryptoService cryptoService = new ResursCryptoService();

byte[] key = ...;    // 32 bytes, hämtas från nyckelhantering (ej native-modulen)
byte[] nonce = ...;  // 12 bytes, unik per krypteringsoperation

String encrypted = cryptoService.encrypt("556000-1234", key, nonce);
String decrypted = cryptoService.decrypt(encrypted, key, nonce);
```

## Indata/utdata-format

**Kryptering (`encrypt`)**
- In: klartext (`String`), nyckel (32 bytes), nonce (12 bytes)
- Ut: Base64-kodad sträng, innehåller krypterad data + 16-bytes authentication-tag

**Dekryptering (`decrypt`)**
- In: Base64-kodad krypterad sträng, samma nyckel och nonce som vid kryptering
- Ut: klartext (`String`)

## Viktigt

- Nyckeln (`key`) ska **inte** hanteras av denna modul i produktion — den ska komma från separat nyckelhantering (t.ex. Vault/KMS), enligt `native/crypto-design.md`
- Nonce måste vara **unik** för varje krypteringsoperation med samma nyckel
- Kräver att `resurs_crypto`-biblioteket är kompilerat (`.dll`/`.so`) och tillgängligt i systemets bibliotekssökväg — se `native/Makefile`

## Audit-signering

```java
ResursAuditService auditService = new ResursAuditService();

// Första posten i kedjan har ingen föregående hash (null).
AuditChainResult first = auditService.signEntry(entryJson, null, privateKey);
AuditChainResult second = auditService.signEntry(nextEntryJson, first.hash(), privateKey);

VerifyChainResult result = auditService.verifyChain(
        List.of(entryJson, nextEntryJson),
        List.of(first.hash(), second.hash()),
        List.of(first.signature(), second.signature()),
        publicKey);
// result.valid() == true, result.firstInvalidIndex() == -1
```

- Hash och signatur är Base64-strängar. Nycklar är 32 bytes (Ed25519).
- Fel längd eller `null` ger `IllegalArgumentException` innan C anropas.
- En manipulerad kedja ger `VerifyChainResult(false, index)`, inget undantag.
- Exakt den JSON-text som signerades måste sparas och skickas till
  `verifyChain`. Ändras ett enda tecken (även mellanslag eller nyckelordning)
  blir posten ogiltig.

C-funktionerna skiljer sig något från den ursprungliga specen i
`native/README.md`: `resurs_audit_chain_entry` tar emot en `private_key`, och
`resurs_audit_verify_chain` tar emot hela kedjans `entries_json`/`entry_lens`
(inte bara färdiga hashar) för att kunna upptäcka omkastade poster, inte bara
förfalskade signaturer. Se `native/audit-design.md`.

Detaljer om beslut och tester finns i `IMPLEMENTATION-PLAN.md`.

## Ej klart än

Servicen används inte av resten av backend än. Kvar att göra: en
`AuditService` som signerar händelser och sparar dem i `audit_events`,
samt var nycklarna ska hämtas ifrån i produktion.
