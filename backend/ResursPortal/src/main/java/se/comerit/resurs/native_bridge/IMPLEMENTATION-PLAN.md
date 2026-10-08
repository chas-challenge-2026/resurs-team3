# Audit-signering — Java-implementering

## Vad är redan gjort

- C-programmet för signering och verifiering (libresurs_audit.so) är färdigt och testat
- Design är dokumenterad i `native/audit-design.md`
- Vi vet vad C-koden kan göra

## Vad vi ska göra nu

Skapa Java-kod som kan prata med C-programmet och använda dess signerings- och verifieringsfunktioner.

### 1. ResursAudit.java
Lågnivå-kopplingen mellan Java och C-programmet.

Det här är som ett "adapter-uttag" — Java på ena sidan, C-programmet på andra.

Behövs:
- Felmeddelanden (vad kan gå fel och vad betyder det)
- Storlekskonstanter (hur många bytes behövs för olika saker)
- Två funktioner som motsvarar C-programmets signerings- och verifieringsfunktioner

Titta på ResursCrypto.java för hur man gör detta.

**Status:** `ResursAudit.java`, `ResursAuditService.java` (`signEntry` och
`verifyChain`) och `jna.library.path` i `pom.xml` är klara. Testerna ligger i
`src/test/.../native_bridge/`: `ResursAuditSmokeTest`,
`ResursAuditServiceSignTest` och `ResursAuditServiceVerifyTest`.

Köra testerna:
```
cd native && make
cd ../backend/ResursPortal && mvn test -Dtest='ResursAudit*'
```
Utan `make` hoppas testerna som anropar C över (skipped). Valideringstesterna
körs ändå, eftersom de kastar innan C anropas.

Punkt 2–5 nedan är klara. Rundturstestet (signera med `signEntry`, verifiera
med `verifyChain`) är `validChainIsValid` i `ResursAuditServiceVerifyTest`.

## Beslut och uppdelning (punkt 2–5)

### Gemensamma beslut
- **Format utåt:** hash och signatur skickas som Base64-strängar (samma som
  `ResursCryptoService`). Det är också så de sparas i databasen.
- **Teckenkodning:** alltid `StandardCharsets.UTF_8`, aldrig `getBytes()` utan
  argument. Annars kan JSON med å/ä/ö ge olika bytes och verifieringen går sönder.
- **Nycklar:** tas in som `byte[]`-parametrar. Var de kommer ifrån i produktion
  bestäms senare.
- **Längdkontroll i Java:** C-funktionerna får bara en pekare och läser alltid
  ett fast antal bytes, så en för kort array ger ingen felkod utan läser utanför
  minnet. Servicen kontrollerar därför längderna *innan* C anropas och kastar
  `IllegalArgumentException` om något är fel:
  - `privateKey` = `RESURS_AUDIT_PRIVKEY_LEN`, `publicKey` = `RESURS_AUDIT_PUBKEY_LEN`
  - `prevHash` (avkodad) = `RESURS_AUDIT_HASH_LEN`
  - varje hash = `RESURS_AUDIT_HASH_LEN`, varje signatur = `RESURS_AUDIT_SIGNATURE_LEN`
- **Null-argument:** obligatoriska argument (`entryJson`, nycklar, listor) som är
  `null` ger `IllegalArgumentException`, inte `NullPointerException`. Undantaget
  är `prevHashBase64`, som får vara `null` för första posten.
- **Felhantering:**
  - `verifyChain`: `RESURS_ERR_AUTH_FAILED` är ett normalt utfall (kedjan är
    ogiltig) → returnera `VerifyChainResult(false, index)`, inget undantag.
  - Alla andra felkoder (och alla fel i `signEntry`) → kasta undantag, som i
    `ResursCryptoService`.
- **Tom kedja:** `verifyChain` med tomma listor ger `VerifyChainResult(true, -1)`.
  Samma som C-koden gör (`entry_count == 0` → `RESURS_OK`).
- **Resultatklasser (record vs class):** `AuditChainResult` och
  `VerifyChainResult` ska bli `record` när Java 21 är mergat till `develop`.
  Tills dess (projektet kör Java 11) skrivs de som `final class` med
  record-liknande accessorer — `hash()`, `signature()`, `valid()`,
  `firstInvalidIndex()`, inte `getHash()` osv — plus `equals`/`hashCode`.
  Då räcker det att byta klasskroppen mot ett `record` senare; inga anrop
  behöver ändras.

  > **Vad är ett record?** Ett record (Java 16+) är Javas inbyggda sätt att
  > skriva en oföränderlig klass som bara bär data:
  > `public record AuditChainResult(String hash, String signature) {}`
  >
  > **Skillnad mot vår `final class`:** beteendet är detsamma — samma
  > konstruktor, `hash()`, `signature()`, `equals`, `hashCode`, `toString`,
  > och värdena kan inte ändras. Skillnaden är att vi skriver allt för hand
  > och själva måste hålla det korrekt (t.ex. uppdatera `equals` om ett fält
  > läggs till), medan Java genererar det i ett record och kompilatorn
  > garanterar att det stämmer. Därför byter vi när vi kör Java 21.

### Metodsignaturer i ResursAuditService
Skrivs in först (med `UnsupportedOperationException`) så att vi kan jobba
parallellt:

    public AuditChainResult signEntry(String entryJson, String prevHashBase64, byte[] privateKey)
    public VerifyChainResult verifyChain(List<String> entriesJson, List<String> hashesBase64,
                                         List<String> signaturesBase64, byte[] publicKey)

- `prevHashBase64` är `null` för första posten i kedjan.
- Listorna i `verifyChain` måste vara lika långa och i kedjeordning.

### Uppdelning

Vi jobbar båda direkt på `feature/28-cpp-java-interface` (inga under-brancher).
Hämta den andras ändringar (`git pull`) innan du pushar. Rör bara din egen metod
(`signEntry` / `verifyChain`) i `ResursAuditService` och ha egna testklasser (`ResursAuditServiceSignTest` /
`ResursAuditServiceVerifyTest`) så krockar vi inte.

**Person A — signering (Gustaf)**
- `AuditChainResult` (`final class` → `record` med Java 21: `hash`, `signature`, båda Base64)
- `signEntry`
- Tester: signera första posten (`prevHash = null`), signera en kedja,
  fel nyckellängd ger undantag

**Person B — verifiering (Powell)**
- `VerifyChainResult` (`final class` → `record` med Java 21: `valid`, `firstInvalidIndex`, `-1` om giltig)
- `verifyChain` — packa listorna till platta arrayer (`byte[]` + `long[]`
  med längder) innan anropet
- Tester: giltig kedja, manipulerad post, fel publik nyckel, tom kedja
- Behöver en signerad kedja i testerna: anropa `ResursAudit.INSTANCE` direkt
  (som i röktestet) tills `signEntry` är klar

Gemensamt till sist: ett rundturstest (signera 3 poster med `signEntry`,
verifiera med `verifyChain`).

### 2. AuditChainResult.java
En låda som innehåller resultatet av en signering.

Innehåll: den beräknade hashkoden och den digitala signaturen (båda kodade som text).

### 3. VerifyChainResult.java
En låda som innehåller resultatet av en verifiering.

Innehåll: var verifieringen ok, och om inte — vilken post i kedjan som inte stämde.

### 4. ResursAuditService.java
Användarvänlig insats som gör det lätt för resten av programmet att använda signering och verifiering.

Två funktioner som gör:
- **Signera en post:** ta in text, tidigare hashkod och nyckel → ge tillbaka hashkod och signatur
- **Verifiera en kedja:** ta in alla poster, alla hashkoder och signaturer → säga om allt är ok

Det här lagret hanterar alla tekniska detaljer så resten av koden behöver inte oroa sig för dem.

### 5.Vi testar att det fungerar
Skriva test-kod som kontrollerar att signering och verifiering fungerar korrekt.

## Vi har ResursCrypto.java som referens

- Titta på ResursCrypto.java och ResursCryptoService.java — de gör samma sak men för kryptering
- Mönstret är samma, bara för audit istället för kryptering

## Nästa steg

- Använd denna kod i backend-systemet när nya poster skrivs till audit-loggen
- Uppdatera databasen för att lagra hashkoder och signaturer
- Testa att signering och verifiering fungerar från början till slut
