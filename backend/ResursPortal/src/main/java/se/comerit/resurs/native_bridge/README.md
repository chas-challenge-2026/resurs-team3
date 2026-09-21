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

## Ej klart än (väntar på C-teamet)

- Audit signing API — ingen C-funktion för detta finns ännu i `native/`
- Audit verification API — samma

Dessa läggs till i denna brygga när motsvarande C-funktioner finns tillgängliga
(troligen kopplat till en separat Issue för audit-signering).