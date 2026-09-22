# Java ↔ C++ Bridge (native_bridge)

Detta paket innehåller Java-gränssnittet mot den native C++-krypteringsmodulen
(`native/resurs_crypto.c`), enligt Issue #28.

## Vad finns här

| Fil | Syfte |
|---|---|
| `ResursCrypto.java` | Lågnivå-interface (JNA) som speglar C-funktionerna exakt |
| `ResursCryptoService.java` | Enkel, användbar klass för resten av backend att anropa |
| `ResursCryptoExample.java` | Körbart exempel som visar hela flödet: kryptera → dekryptera |

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

## Ej klart än (Java-sidan)

C-sidans audit-signering/verifiering är nu klar (`native/resurs_audit.c`,
`native/resurs_audit.h`, dokumenterad i `native/audit-design.md`), men har
ännu ingen motsvarighet i den här bryggan:

- `ResursAudit.java` — lågnivå-interface (JNA) mot `resurs_audit_chain_entry`
  och `resurs_audit_verify_chain`
- `ResursAuditService.java` — användbar klass för resten av backend

Notera att C-funktionerna skiljer sig något från den ursprungliga specen i
`native/README.md`: `resurs_audit_chain_entry` tar emot en `private_key`, och
`resurs_audit_verify_chain` tar emot hela kedjans `entries_json`/`entry_lens`
(inte bara färdiga hashar) för att kunna upptäcka omkastade poster, inte bara
förfalskade signaturer. Se `native/audit-design.md` för fullständig
motivering och exakta signaturer innan JNA-interfacet skrivs.