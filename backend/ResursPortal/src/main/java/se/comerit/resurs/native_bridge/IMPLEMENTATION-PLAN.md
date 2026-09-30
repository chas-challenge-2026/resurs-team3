# Audit-signering — Java-implementering

## Vad är redan gjort

- C-programmet för signering och verifiering (libresurs_audit.so) är färdigt och testat
- Design är dokumenterad i audit-integration.md
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

**Status:** `ResursAudit.java`, en tom `ResursAuditService.java` och
`jna.library.path` i `pom.xml` är klara och kompilerar.

**Nästa:** ett röktest (`ResursAuditSmokeTest.java`, kräver `make` i `native/`)
som kontrollerar att Java-koden kan ladda och anropa `libresurs_audit.so`.
Görs innan vi delar upp arbetet.

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
