# Kända brister, risker och avgränsningar – ResursPortal Team 3

**Status vid granskning:** `develop` `2776f2a`, 3–4 november 2026. Systemet är inte redo för riktiga kunder eller riktiga personuppgifter. Detta är en utbildningsprototyp och en teknisk bedömning av aktuell kod, **inte** en fullständig säkerhetsrevision eller GDPR-certifiering.

## Sammanfattning

Ett centralt företagsflöde finns: ansökan, regelbaserad bedömning, sparad status och Java-baserad handläggning. Systemet är däremot **inte redo för skarp bankdrift**. Det gäller framför allt autentisering, skydd av data och dokument, integrationen av handläggarvyn och spårbarhet i drift.

## Prioriterade risker

| Prioritet | Område / aktuell begränsning | Konsekvens | Rekommenderad nästa åtgärd |
| --- | --- | --- | --- |
| **Kritisk inför produktion** | **BankID är simulerat.** Företagsinloggningen godkänner kända testorganisationsnummer. | Kan inte användas som verklig identitetskontroll. Ingen miljöstyrd spärr hindrar att mocken startas i produktion. | Inför riktig identitets- och firmatecknarkontroll med säkra sessioner, och en spärr som stoppar mocken utanför test. |
| **Kritisk inför produktion** | **Handläggarlösenord hashas med MD5 utan salt** i `AuthService` (`md5Hash`). Flaggat av CTO:n. | MD5 är kryptografiskt brutet och går att knäcka snabbt. | bcrypt, Argon2id eller scrypt; hasha om befintliga lösenord i `seed.sql`; centraliserad auth. |
| **Kritisk inför produktion** | **Databasuppgifter ligger i klartext** i `application.properties` och `docker-compose.yml`, som är incheckade i repot. | Fungerar bara för testmiljöer. Lösenordet finns kvar i git-historiken även efter en ändring. | Miljövariabler eller secrets-hantering, och byt lösenordet. |
| **Kritisk inför produktion** | **Personuppgifter lagras okrypterade.** Företagsnamn, org.nr och firmatecknare är läsbara i tabellen `companies`. C/JNA-modulen för kryptering finns men är fristående. | Ett databasintrång kan exponera personuppgifter. | Säker nyckelhantering, integrerad kryptering och tester av hela lagringskedjan (se [native-moduler](#native-moduler--byggt-men-inte-inkopplat)). |
| **Hög** | **Spring Security används inte.** Behörighet kontrolleras för hand i varje metod, och CSRF-skydd saknas. | En glömd kontroll i en ny metod ger direkt en behörighetslucka; formulär kan skickas från andra sajter. | Spring Security med rollbaserade regler och CSRF-skydd. |
| **Hög** | **Formuläret `POST /apply` litar på företagsuppgifter från klienten** (`orgNumber`, `companyName` som formulärfält). | Ett inloggat företag kan skicka en ansökan i ett annat företags namn och få det företagets id i sessionen. React använder `POST /api/applications`, som inte har bristen (PR #83). | Samma kontroll som i PR #83: hämta företaget ur sessionen. |
| **Hög** | **Dokument sparas under `/tmp/uploads`**, inte i persistent, åtkomstkontrollerad lagring. | Filer kan försvinna vid omstart; åtkomstskyddet är svagt. | Permanent lagring, filvalidering, behörighetskontroll och gallring. |
| **Hög** | **Dokument- och statussidorna saknar ägarkontroll.** `GET /documents/{id}`, `GET /document/{id}` (`DocumentController`) och `GET /status/{id}` (`StatusController`) kontrollerar bara att någon är inloggad. | Ett inloggat företag kan se och ladda ner andra företags dokument och se deras status genom att ändra id i adressen. Slutsatsen kommer från kodgranskning och är inte provad i praktiken. | Kontrollera att ansökan tillhör det inloggade företaget, med regressionstester. |
| **Hög** | **Den äldre uppladdningen saknar ägarkontroll.** `POST /document/upload` kontrollerar bara att någon är inloggad. | Ett inloggat företag kan ladda upp dokument till en annan firmas ansökan. | Samma ägarkontroll som ovan. |
| **Hög** | **Filnamnet vid uppladdning används orensat** (`getOriginalFilename()`). | Ett filnamn med sökvägstecken kan placera filen utanför uppladdningsmappen (path traversal). | Generera egna filnamn och validera filtyp. |
| **Hög** | **React-handläggarvyn använder `MOCK_CASES`/`localStorage`** trots att Java-REST för kö, detaljer och beslut finns. Se [F2](#f2-inskickade-ansökningar-når-inte-react-handläggarvyn). | Den moderna handläggarvyn kan inte användas för riktiga databasbeslut. | Koppla React till de riktiga API:erna och testa hela handläggarflödet. |
| **Hög** | **Auditloggen är osignerad JSON i `applications.audit_log`** och uppdateras med strängmanipulation. | Den kan ändras i efterhand utan att det syns, och går inte att söka eller indexera. | Separat händelsemodell (`audit_events`) med integrerad signering (se [native-moduler](#native-moduler--byggt-men-inte-inkopplat)). |
| **Hög** | **GDPR-efterlevnaden är inte kartlagd** (rättslig grund, informationskrav, lagringstider, gallring, registrerades rättigheter, roller/åtkomst, incidentrutiner). | Det går inte att hävda att verklig behandling av personuppgifter är godkänd. | Dokumenterad datakartläggning och riskbedömning med personuppgiftsansvarig före produktion. |
| **Medel/hög** | React-sidan **Mina handlingar** använder prototypdata och filobjekt som bara finns i sessionen, trots Java-endpoints för dokumentmetadata. Se [F2](#f2-inskickade-ansökningar-når-inte-react-handläggarvyn). | Dokumentlistan kan avvika från backend, och filerna sparas inte. | Integrera listning, uppladdning och nedladdning mot ett säkrat backendflöde. |
| **Medel/hög** | Scoring bygger på **manuellt inmatade siffror**; uppladdade PDF:er tolkas eller verifieras inte. | Felaktig eller manipulerad inmatning kan påverka beslut. | Kontroll av underlag, manuell granskning av gränsfall och tydlig riskpolicy. |
| **Medel** | **Ärendenumret genereras genom att räkna befintliga nummer för året.** Samtidiga inskick är inte testade. | Två samtidiga ansökningar kan få samma nummer; databasens unikhetsvillkor gör då att den andra misslyckas. | Databasstyrd sekvens, eller fånga felet och försök igen, samt samtidighetstester. |
| **Medel** | **Ingen transaktion när en ansökan skapas.** Företag, ansökan och auditlogg sparas i separata steg (se TODO i `ApplicationController`). | En krasch mitt i kan lämna inkonsistent data. | `@Transactional` i service-lagret. |
| **Medel** | **Ingen rollbaserad åtkomstkontroll utöver sessionen.** Rollen finns bara i sessionen, och alla handläggare har samma behörighet. | Ingen åtskillnad mellan handläggare och ingen fyra-ögon-princip. | Roller och behörigheter i databasen, eventuellt Spring Security. |
| **Medel** | **Inga integrationstester.** Alla backendtester är enhetstester med mockade services. CTO:n föreslog integrationstester givet den lagerindelade arkitekturen. | Kedjan controller → service → repository → PostgreSQL är inte verifierad. | Spring Boot Test eller Testcontainers. |
| **Låg/medel** | **Handläggarkön hämtar alla ärenden utan gräns.** | Långsamma och minneskrävande svar vid stora volymer. | Pagination. |
| **Medel** | Ingen verifierad last-, återställnings- eller övervakningsplan. | Skalbarhet och återhämtning är okända. | Belastningstest, loggning, larm, backup och återställningsplan. |
| **Medel** | **Inga tester körs i CI.** Bara `infra-guard` körs automatiskt i GitHub Actions. | Regressioner upptäcks bara om någon kör testerna lokalt. | Kör Java-, C- och frontendtester i GitHub Actions. |
| **Medel** | **PostgreSQL 12** används fortfarande, trots att `DRIFT.md` beskriver versionsbyte som ett v2-krav. | Versionen får inga säkerhetsuppdateringar sedan november 2024, och v2-kravet är inte uppfyllt. | Byt version enligt `DRIFT.md` (kräver databas-reset via techsupport). |
| **Medel** | Ingen riktig e-postnotis vid handläggarbeslut. Meddelanden till sökande simuleras i webbläsaren. | Kunden måste själv logga in och kontrollera status. | Prioriteras efter säker kärnprocess. |

## De fem viktigaste riskerna

Fem risker som både CTO:n och delivery managern pekade ut som kritiska, redovisade som CTO:n efterfrågade. Sannolikheten är bedömd utifrån koden: hur lätt risken kan utnyttjas i dag.

| # | Risk | Konsekvens | Sannolikhet | Åtgärd | Kvarvarande risk |
| --- | --- | --- | --- | --- | --- |
| 1 | **Obehörig åtkomst i de äldre Thymeleaf-flödena:** dokument och status saknar ägarkontroll, och `POST /apply` litar på företagsuppgifter från klienten | Andra företags handlingar läcker, och ansökningar kan skickas i ett annat företags namn – en GDPR-incident | **Hög** – kräver bara inloggning och ett ändrat id eller formulärfält | Ägarkontroll som i PR #83 och de nya REST-API:erna, med regressionstester | Kvarstår i de äldre sidorna. REST-API:erna är skyddade och testade |
| 2 | **BankID-mocken hamnar i produktion** | Autentiseringen kan kringgås | **Medel** – ingen teknisk spärr finns | Mocken ligger bakom `BankIdService` (gjort); miljöstyrd spärr och CI-kontroll (ej gjort) | Hög tills spärren finns |
| 3 | **Lösenord knäcks:** MD5 utan salt | Handläggarkonton tas över om databasen läcker | **Medel** – kräver databasåtkomst, men MD5 knäcks snabbt | bcrypt, Argon2id eller scrypt med salt, och omhashning av befintliga lösenord | Oförändrad |
| 4 | **Secrets i repot:** databasuppgifter i klartext i incheckade filer | Lösenordet är känt för alla med åtkomst till repot, även i git-historiken | **Hög** – uppgifterna ligger öppet | Miljövariabler eller secrets-hantering, och byte av lösenord | Oförändrad; godtagbart bara i testmiljö |
| 5 | **Okrypterade personuppgifter och osignerad auditlogg** | Personuppgifter läsbara vid intrång; historiken kan ändras utan spår | **Medel** – kräver databasåtkomst | Moduler för AES-256-GCM och signerad audit-kedja är byggda och testade; inkoppling och nyckelhantering återstår | Oförändrad i drift |

## Koppling till OWASP Top 10 (2021)

CTO:n rekommenderade OWASP Top 10 som checklista. Tabellen kopplar de brister som redan är dokumenterade här till respektive kategori. Det är en kartläggning av kända brister, **inte** en fullständig OWASP-granskning.

| OWASP-kategori | Hanterat | Kvarvarande brister |
| --- | --- | --- |
| A01 Broken Access Control | Org.nr kontrolleras mot sessionen i `POST /api/applications` (PR #83); nya REST-API:er kontrollerar inloggning, roll och ägarskap | Dokument- och statussidor utan ägarkontroll; `POST /apply` litar på klientdata; ingen rollåtskillnad mellan handläggare |
| A02 Cryptographic Failures | AES-256-GCM-modul byggd och testad | MD5 utan salt; personuppgifter okrypterade; ingen nyckelhantering |
| A03 Injection | Controllerna bygger ingen SQL; all databasåtkomst är samlad i repository-lagret och parametriserad | Filnamn vid uppladdning används orensat (path traversal) |
| A04 Insecure Design | Lagerindelad arkitektur | Ärendenummer kan krocka; inga transaktioner |
| A05 Security Misconfiguration | – | Secrets i klartext i repot; inget CSRF-skydd (ingen Spring Security) |
| A06 Vulnerable and Outdated Components | Spring Boot 3.5, Java 21 och JNA 5.13 är aktuella. Frontendens produktionsberoenden har 0 kända sårbarheter (`npm audit --omit=dev`, 2026-11-04) | **PostgreSQL 12** är inte längre supporterad (slutade få säkerhetsuppdateringar i november 2024). `commons-fileupload 1.4` i `pom.xml` har en känd sårbarhet (CVE-2023-24998) men används inte och kan tas bort. Utvecklingsverktygen (Vite, Vitest, ESLint) har 16 kända sårbarheter som inte följer med i produktionsbygget. Ingen automatisk beroendegranskning (t.ex. Dependabot) |
| A07 Identification and Authentication Failures | BankID-mocken är utbruten till `BankIdService` | Mocken saknar spärr mot produktion; MD5-lösenord |
| A08 Software and Data Integrity Failures | Signerad audit-kedja byggd och testad | Auditloggen i drift är osignerad JSON |
| A09 Security Logging and Monitoring Failures | – | Ingen övervakning eller larm |
| A10 Server-Side Request Forgery | Ej tillämpligt i dag: backend gör inga utgående HTTP-anrop, så användaren kan inte få servern att hämta en valfri adress | Blir relevant när riktig BankID eller uppslag mot företagsregister införs |

## Native-moduler – byggt men inte inkopplat

C-modulerna och Java-bryggan för kryptering och audit-kedja är byggda och testade (15 C-tester, 32 JNA-tester), men appen använder dem inte, och de finns inte i Docker-avbildningen. Detta återstår innan de kan tas i bruk:

- En `AuditService` och tabellen `audit_events`, med beslut om hash, signatur och kedjeindelning.
- Nyckelhantering i produktion, t.ex. Vault eller KMS. Ingen sådan lösning finns i dag.
- Att Docker-bygget kompilerar C-biblioteken.
- Längdkontroll av nyckel och nonce, samt Java-tester, för kryptobryggan (`ResursCryptoService`).
- Nollställning av utdatabufferten när autentiseringen misslyckas vid dekryptering.
- Skydd mot att de sista posterna i en kedja tas bort: en kortare kedja verifieras fortfarande som giltig.
- **Nyckelrotation och omkryptering:** versionering av nycklar, skript för omkryptering och en plan för en komprometterad nyckel (återkalla → ny nyckel → omkryptera).
- **Break-glass:** regler för vem som i en nödsituation får tillgång till nycklar och produktionsuppgifter, hur det godkänns och loggas, och hur uppgifterna hanteras efteråt.
- **Sökning på krypterad data:** fritextsökning, filtrering, sortering och matchning på krypterade fält måste lösas i designen innan krypteringen kopplas in.

## Funktioner som inte blev klara

| Område | Läge i dag |
| --- | --- |
| React-handläggarvyn | Prototyp med mockade ärenden. REST-API:et finns (PR #84) men används inte av React. Handläggaren arbetar i Thymeleaf-sidorna. Se [F2](#f2-inskickade-ansökningar-når-inte-react-handläggarvyn). |
| Dokument i React | Uppladdningen sker bara i webbläsaren och når inte backend. Riktig uppladdning finns i Thymeleaf-sidorna. |
| Validering | REST-anropet validerar fälten med Bean Validation, men använder inte `CompanyValidationService` och `CreditApplicationValidationService` som formuläret gör. |
| Transaktioner | Applikationstjänsterna använder inte `@Transactional`, så skrivningar i flera steg kan bli halvfärdiga vid fel. |
| Ärendenummer | Räknas fram som antal plus ett. Samtidiga ansökningar kan krocka, och äldre seed-ansökningar saknar nummer. |
| Sessioner i React | En omladdning loggar ut användaren ([F1](#f1-sessionen-försvinner-vid-siduppdatering)). Företag och handläggare delar session i samma webbläsare. |
| Lagring av filer | Filer sparas i `/tmp/uploads` utan volym och kan försvinna vid omstart eller omdeploy. |
| Handläggarkön | Hämtar alla ärenden under granskning utan pagination. |
| CI | Bara `infra-guard` körs automatiskt. Se [teststatus](../README.md#teststatus). |

## Kända buggar i frontend

Gäller `backend/ResursPortal/frontend`. Se [Arkitektur i README](../README.md#arkitektur) för hur frontend hänger ihop.

| # | Bugg | Allvarlighet | Status |
| --- | --- | --- | --- |
| F1 | Sessionen försvinner vid siduppdatering | Medel | Öppen |
| F2 | Inskickade ansökningar når inte React-handläggarvyn | Hög | Öppen |
| F3 | Inaktuell kommentar och oanvänd kod från det gamla inskicksflödet | Låg | Öppen |
| F4 | Backendens fältfel visas inte vid formulärfälten | Medel | Öppen |
| F5 | Frontendens kopia av scoringreglerna har gamla gränser | Låg | Öppen |

### F1. Sessionen försvinner vid siduppdatering

**Fil:** `src/auth/AuthContext.tsx` (lazy initializer i `useReducer`)

```tsx
const restoredUser = loadMockSession()

if (restoredUser) {
  clearMockSession()
  return { user: null }
}

return { user: restoredUser }
```

**Vad koden gör:** finns en sparad session i `sessionStorage` raderas den och appen startar utloggad. Finns ingen returneras `restoredUser`, som då ändå är `null`. Användaren är alltså alltid utloggad efter omladdning.

**Bakgrund:** beteendet infördes i commit `8492979` ("connect caseworker login and Java sessions") och ersatte en vanlig återställning (`user: loadMockSession()`). Det är troligen avsiktligt, eftersom frontend inte kan avgöra om Java-sessionen fortfarande gäller.

**Varför det är ett problem:**
- F5 eller en djuplänk loggar ut användaren i frontend medan Java-sessionen kan vara giltig. Frontend och backend är då oense om inloggningen.
- Kommentaren ovanför koden ("the restored session is already in state up front") beskriver det gamla beteendet, och `return { user: restoredUser }` kan bara returnera `null`.

**Återskapa:** logga in och tryck F5. Du hamnar på `/#/logga-in`.

**Åtgärd:**
- *Kort sikt:* gör avsikten tydlig (`clearMockSession(); return { user: null }`) och skriv om kommentaren.
- *Rätt lösning:* återställ användaren först efter kontroll mot Java (`GET /api/applications` för företag, `GET /backoffice` för handläggare, samma kontroller som utloggningen gör), eller via en framtida "vem är jag"-endpoint. Återgå **inte** bara till `user: loadMockSession()`, eftersom det återinför problemet commiten undvek.

### F2. Inskickade ansökningar når inte React-handläggarvyn

**Filer:** `src/context/CasesContext.tsx`, `src/data/mockCases.ts`, `src/pages/backoffice/*`

**Vad koden gör:** guiden skickar ansökningar till Java (`POST /api/applications`). React-handläggarvyn (`BackofficeLayout`, `DashboardView`, `CasesView`) läser däremot bara `CasesContext`, som bygger på `MOCK_CASES` och sparas i `localStorage`.

**Varför det är ett problem:**
- En ny ansökan syns inte i React-handläggarvyn, så kedjan ansökan → granskning → beslut kan inte visas där. Java-backoffice (`/backoffice`) visar den.
- Beslut i React-vyn sparas bara i webbläsarens `localStorage` och når aldrig databasen eller företagets statussida.
- `OverviewPage`, `ApplicationStatusPage` och `DocumentsPage` läser också från `CasesContext`, så företaget ser en blandning av riktiga data och testdata.

**Återskapa:** skicka en ansökan som företag, logga ut och logga in som handläggare i React. Ärendet saknas i kön.

**Åtgärd:** backend-API:erna finns sedan PR #84 och #85 (`GET /api/backoffice/applications`, `GET /api/backoffice/applications/{id}`, `POST /api/backoffice/applications/{id}/decision`, `GET /api/applications/{id}/documents`). Bygg en klient på samma sätt som `applicationRead.api.ts` (formkontrollerade svar, `AbortController`) och ersätt mockdatan i `CasesContext`. Behåll `useCases()` så att vyerna inte behöver ändras.

### F3. Inaktuell kommentar och oanvänd kod från det gamla inskicksflödet

**Filer:** `src/pages/wizard/WizardPage.tsx` (kommentar runt rad 94), `src/context/CasesContext.tsx` (`addCase`), `src/features/credit-application/creditApplication.mapper.ts` (`toCaseSubmission`)

**Vad koden gör:** kommentaren säger att inskick anropar `addCase()` och lägger ärendet direkt i handläggarkön. Koden anropar numera `createApplication()` mot Java. `addCase()` och `toCaseSubmission()` anropas inte längre.

**Varför det är ett problem:** kommentaren vilseleder om vart ansökningar tar vägen och döljer därmed F2. `toCaseSubmission` gör dessutom om saknat kassaflöde till `'0'`, vilket strider mot API-kontraktets regel att saknat kassaflöde aldrig ska skickas som noll, om någon återanvänder den.

**Åtgärd:** skriv om kommentaren efter nuvarande flöde (`signApplication()` → `toCreateApplicationRequest()` → `POST /api/applications` → `/ansokan/:id`). Ta bort `addCase` och `toCaseSubmission` när F2 är åtgärdad.

### F4. Backendens fältfel visas inte vid formulärfälten

**Filer:** `src/features/credit-application/creditApplication.api.ts` (`createApplication`), `src/pages/wizard/WizardPage.tsx` (`confirmSigning`)

**Vad koden gör:** när backend svarar `400 { errors: { fält: meddelande } }` sparas felen i `ApplicationApiError.errors`. `confirmSigning` visar bara det allmänna meddelandet "Ansökan innehåller ogiltiga uppgifter." och läser aldrig `errors`.

**Varför det är ett problem:** användaren får veta att något är fel men inte vad eller var. Det gäller särskilt fel som frontendens egen validering inte fångar, alltså när frontend- och backendvalideringen skiljer sig åt.

**Åtgärd:** kontrollera `error instanceof ApplicationApiError` i `catch`, mappa backendens fältnamn (`egetKapital`, `requestedAmount` …) till formulärfält och steg, och skicka användaren till första steget med fel. `fixStep` används redan på samma sätt för signeringsfel.

### F5. Frontendens kopia av scoringreglerna har gamla gränser

**Filer:** `src/utils/scoring.ts`, `src/features/credit-application/outcomeExplanation.ts`

**Vad koden gör:** `utils/scoring.ts` är en kopia av `ScoringService.java` som används för testärendena i React. Den har kvar gränserna från före commit `0fd2aec`: soliditet < 30 % för belopp över 1 000 000 kr och 20 % × branschfaktor. Backend använder 25 % i båda reglerna. Förklaringstexten i `outcomeExplanation.ts` säger också "under 30 %".

**Varför det är ett problem:** prototypen visar andra bedömningar och förklaringar än backend skulle ge för samma siffror. Två kopior av samma regler glider isär.

**Åtgärd:** uppdatera kopian till backendens gränser på kort sikt. På sikt bör frontend inte räkna själv, utan visa strukturerad scoringdata från backend (se UX-återkopplingen i [feed forward](SPECIALIST_FEEDBACK.md)).

## Kända buggar i backend och infrastruktur

| # | Del | Bugg | Allvarlighet | Status |
| --- | --- | --- | --- | --- |
| B1 | Backend | Backendens företagsmock har andra namn än seed-datan | Låg | Öppen |
| B2 | Backend | Vissa scoringgränser är fortfarande hårdkodade | Låg | Öppen |
| B3 | Backend + frontend | Organisationsnummer utan bindestreck nekas | Medel | Öppen |
| B4 | Backend | `requireCompanyId` är duplicerad i två controllers | Låg | Öppen |
| B5 | Backend | Ändrade tröskelregler är inte avstämda med kunden | Medel | Delvis åtgärdad (tester tillagda) |
| I1 | Infra | Dockerfilen döljer byggfel (`-q`) | Medel | Öppen |

### B1. Backendens företagsmock har andra namn än seed-datan

**Fil:** `backend/ResursPortal/src/main/java/se/comerit/resurs/service/CompanyValidationService.java`

**Vad koden gör:** mockregistret mappar `556000-1234` till "Mockföretag AB" och `556000-5678` till "Testbolaget AB". `infra/seed.sql` och frontendens mock använder "Malmö Fastigheter AB" och "Göteborg Handel AB" för samma nummer.

**Varför det är ett problem:** Thymeleaf-flödet (`/apply`) kan visa ett annat företagsnamn än databasen och React för samma organisationsnummer. Det förvirrar vid demo och test.

**Åtgärd:** använd samma namn som `seed.sql`, eller slå upp företaget i `CompanyRepository` i stället för en hårdkodad map.

### B2. Vissa scoringgränser är fortfarande hårdkodade

**Fil:** `backend/ResursPortal/src/main/java/se/comerit/resurs/service/ScoringService.java`

**Vad koden gör:** soliditetsgränserna 20 % och 25 % läses från `application.properties` via `ScoringThresholds`. Övriga affärsgränser står direkt i koden:

| Regel | Nuvarande gräns |
| --- | --- |
| Eget kapital i förhållande till sökt kredit | 30 % |
| Större kreditbelopp | 1 000 000 kr |
| Mycket stort kreditbelopp | 5 000 000 kr |
| Låg nettoomsättning | 500 000 kr |
| Likviditetsgrad – avslags-/varningsnivå | 1,0 / 1,2 |
| Skuldsättningsgrad – risknivåer | 2,0 / 2,5 / 3,0 |
| Rörelsemarginal – risknivåer | 2 % / 10 % |
| Kassaflödeskvot – risknivåer | 0 % / 5 % / 8 % |
| Investeringarnas kassaflöde | 30 % av nettoomsättningen |
| Räntetäckningsgrad – risknivåer | 1,5 / 2,5 |
| Totala skulder i förhållande till omsättning | 2 gånger nettoomsättningen |
| Sökt kredit i förhållande till omsättning | Över 100 % |

Branschfaktorerna i `getBranschFaktor()` är också hårdkodade.

**Varför det är ett problem:** samma problem som `ScoringThresholds` löste för soliditet: reglerna kan inte justeras utan kodändring, och samma värde kan behöva ändras på flera ställen.

**Åtgärd:** gå igenom värdena med kunden för att avgöra vilka som ska vara konfigurerbara och vilka som är fasta affärsregler – de är inte kundgodkända bara för att de finns i koden. Flytta sedan de konfigurerbara till `ScoringThresholds` och `application.properties`, och uppdatera `ScoringServiceTest`.

### B3. Organisationsnummer utan bindestreck nekas

**Filer:** `frontend/src/auth/bankIdLogin.validation.ts`, `frontend/src/auth/mockBankId.ts`, `backend/.../service/BankIdService.java`

**Vad koden gör:** frontendens validering accepterar både `556000-1234` och `5560001234` (`/^\d{6}-?\d{4}$/`). Både frontendens BankID-mock och backendens `BankIdService` jämför däremot exakt mot nummer **med** bindestreck.

**Varför det är ett problem:** ett giltigt nummer utan bindestreck nekas med ett meddelande som antyder att företaget inte finns. Frontend är dessutom inkonsekvent med sig själv: `bankIdLogin.validation.ts` godkänner numret, men mocken nekar det sedan.

**Återskapa:** logga in med `5560001234`.

**Åtgärd:** normalisera organisationsnumret till formatet `NNNNNN-NNNN` på ett ställe i frontend och i backend innan det jämförs.

### B4. `requireCompanyId` är duplicerad i två controllers

**Filer:** `ApplicationRestController.java`, `DocumentRestController.java`

**Vad koden gör:** samma behörighetskontroll (kräv inloggat företag, ge 401/403) finns som privat metod i båda controllerna.

**Varför det är ett problem:** ändras den ena men inte den andra glider behörighetskontrollerna isär.

**Åtgärd:** bryt ut till en gemensam komponent, eller ersätt med Spring Security.

### B5. Ändrade tröskelregler är inte avstämda med kunden

**Fil:** `backend/ResursPortal/src/main/java/se/comerit/resurs/service/ScoringService.java` (commit `0fd2aec`)

**Vad koden gör:** när soliditetsgränserna samlades i `ScoringThresholds` började två regler återanvända varningsgränsen 25 %. Regeln för belopp över 1 000 000 kr gick från 30 % till 25 % (mildare), och den branschjusterade gränsen från 20 % till 25 % × branschfaktor (strängare).

**Varför det är ett problem:** ändringen påverkar vilka ansökningar som flaggas, åt olika håll. Trösklar är kreditpolicy som kunden äger, men ändringen var ett utvecklingsbeslut.

**Åtgärd:** stäm av nivåerna med kunden. ~~Lägg till tester~~ **Gjort:** `ScoringServiceTest` har två nya tester – storkreditregeln flaggar inte soliditet över 25 %, och den branschjusterade gränsen används för `HANDEL` (25 % × 1,10 = 27,5 %).

### I1. Dockerfilen döljer byggfel (`-q`)

**Fil:** `backend/ResursPortal/Dockerfile`

**Vad koden gör:** `mvn dependency:resolve -q` och `mvn package -DskipTests -q` körs i tyst läge.

**Varför det är ett problem:** när bygget misslyckas syns inte det faktiska felet, jar-filen skapas aldrig och felsökningen blir svår. Bygget fungerar inte på alla datorer i teamet, vilket gör att systemet inte går att köra lokalt överallt.

**Åtgärd:** ta bort `-q` (åtminstone vid felsökning) och dokumentera vad som krävs för att bygget ska gå igenom.

## Befintliga skydd – avgränsa påståendena

- Java har sessions- och rollkontroller för de centrala ansöknings- och handläggar-REST-endpointsen.
- Vid inskick kontrolleras att organisationsnumret i ansökan motsvarar det inloggade företaget (PR #83).
- Företagets läsning av ansökningar använder en företagsspecifik databasfråga; detaljhämtning för en annan organisation ger 404.
- Den nya REST-endpointen för dokumentlistan kontrollerar att ansökan tillhör det inloggade företaget.
- Frontend formkontrollerar allt den läser från nätverket, `sessionStorage` och `localStorage` innan det används.
- Native-kod för AES-256-GCM och SHA-256/Ed25519 finns, **men är inte i ordinarie drift**.

Dessa åtgärder är förbättringar, men de betyder inte att alla äldre endpoints, filflöden eller sessioner är fullständigt säkrade.

## Avgränsningar i slutleveransen

Följande valdes medvetet bort i omtagsplanen för att prioritera ett sammankopplat och verifierat flöde (se [beslutsloggen](BESLUTSLOGG.md#prioriteringar-i-omtagsplanen)):

1. **BankID och e-post är mockade**, eftersom riktiga integrationer kräver externa avtal och tjänster. Bara två testföretag kan logga in. Ingen produktionsklar autentisering.
2. Ingen fullständigt integrerad React-arbetsyta för handläggare med riktiga data (se [F2](#f2-inskickade-ansökningar-når-inte-react-handläggarvyn)).
3. **Ingen PII-kryptering i databasen** och ingen signerad auditlogg i drift. Kryptering kräver datamigrering; modulerna visas som byggda och testade men inte inkopplade.
4. **Ingen PDF-parsning:** dokument sparas, men handläggaren granskar dem manuellt. Ingen automatisk fördelning av ärenden mellan handläggare.
5. **Spring Security, bcrypt och pagination** dokumenteras som kända brister i stället för att byggas.
6. **Ingen REST-uppladdning eller -nedladdning av dokument.** Det kräver filhantering och mer risk än tiden medgav. Endast listning av dokumentmetadata finns via REST.
7. **De gamla Thymeleaf-controllerna ändrades inte** när REST-endpointsen lades till, för att inte påverka ett fungerande flöde nära inlämning.
8. **Scoringreglerna är prototypregler.** Vilka nivåer som ska gälla är en kreditpolicyfråga som kunden äger. När gränserna samlades ändrades två regler (se [beslutsloggen](BESLUTSLOGG.md)).
9. Ingen komplett GDPR- eller säkerhetsgodkännandeprocess, bara identifierade tekniska skydd och dokumenterade brister.
10. **Skala är oprövad:** inga belastnings- eller samtidighetstester och inga belagda kapacitetstal för många samtidiga användare och ansökningar.
11. **Hanteringen efter beslut ligger utanför projektet:** när handläggaren har fattat beslut arkiveras det och hanteras vidare i bankens egna system.


## Åtgärdat från v1

Bristerna i v1 finns i [`docs (Old V1)/known-bugs.md`](../docs%20%28Old%20V1%29/known-bugs.md). Följande är åtgärdat:

- SQL injection i handläggarinloggningen (repository-lagret, Issue #16).
- Scoring i controllern – ligger nu i `ScoringService`.
- Inkonsekventa soliditetströsklar – nu samlade och konfigurerbara.
- BankID-mocken som hårdkodad kontroll i inloggningen – ligger nu i `BankIdService`.
- Saknat kassaflöde bedöms inte längre som noll (PR #63).
- `POST /api/applications` kräver inloggning och rätt org.nr (PR #83).

## GDPR och personuppgifter

För att bli produktionsredo krävs minst en dokumenterad förteckning över personuppgiftsbehandlingen: ändamål och rättslig grund, åtkomstbehov, lagringstider, informationsrutiner, gallring/radering där det är tillämpligt, incidenthantering och lämplig teknisk säkerhet. En finansiell verksamhets lagstadgade lagringsskyldigheter kan innebära att alla uppgifter **inte** får eller ska raderas direkt på begäran; sådana regler behöver fastställas av den ansvariga verksamheten. Detta arbete är inte gjort inom prototypen.

**Råd:** använd bara syntetisk seed-/testdata tills systemet är säkerhetsgranskat och de rättsliga och organisatoriska kraven är uppfyllda.
