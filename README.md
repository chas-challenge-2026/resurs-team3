# ResursPortal – Team 3

B2B-kreditansökningsportal för Resurs Bank. Företag loggar in med (simulerat) BankID, ansöker om kredit och följer sitt ärende. Handläggare granskar ärenden som kräver manuell bedömning och fattar beslut.

> **Utbildningsprototyp.** Detta är inte en produktionsgodkänd banklösning. Se [kända brister och avgränsningar](docs/BRISTER_OCH_AVGRANSNINGAR.md).

**Granskad version:** `develop` `2776f2a` (3–4 november 2026).

## Dokumentation

| Dokument | Innehåll |
| --- | --- |
| Denna README | Installation, körning, testning, teststatus, arbetsflöde och arkitektur |
| [docs/BESLUTSLOGG.md](docs/BESLUTSLOGG.md) | Arkitektur-, leverans- och prioriteringsbeslut |
| [docs/BRISTER_OCH_AVGRANSNINGAR.md](docs/BRISTER_OCH_AVGRANSNINGAR.md) | Kända brister, risker, buggar och avgränsningar |
| [docs/DEMO_FALLBACK.md](docs/DEMO_FALLBACK.md) | Plan för demon och vad vi gör om något går fel |
| [docs/SPECIALIST_FEEDBACK.md](docs/SPECIALIST_FEEDBACK.md) | Hur specialisternas feed forward har bearbetats |

## Innehåll

1. [Snabbstart](#snabbstart)
2. [Installation](#installation)
3. [Körning](#körning)
4. [Testning](#testning)
5. [Teststatus](#teststatus)
6. [Arbetsflöde och systemstatus](#arbetsflöde-och-systemstatus)
7. [Arkitektur](#arkitektur)
8. [Mappstruktur](#mappstruktur)

---

## Snabbstart

```bash
git clone https://github.com/chas-challenge-2026/resurs-team3.git
cd resurs-team3/infra
docker compose up --build
```

Bygget tar flera minuter.

| Sida | Lokalt | Stage |
| --- | --- | --- |
| Kundportal (React) | http://localhost:8083/portal/index.html | https://resurs-team3-dev.team.chas-challenge.comerit.se/portal/index.html |
| Handläggarinloggning (Thymeleaf) | http://localhost:8083/login | https://resurs-team3-dev.team.chas-challenge.comerit.se/login |
| Java-backoffice (databasanslutet) | http://localhost:8083/backoffice | https://resurs-team3-dev.team.chas-challenge.comerit.se/backoffice |

`/portal/` utan `index.html` ger 404. Prod ligger på https://resurs-team3.team.chas-challenge.comerit.se och byggs från `main`; stage byggs från `develop`. Se [`DRIFT.md`](DRIFT.md) för driftdetaljer.

### Testinloggningar

Endast syntetiska testdata från `infra/seed.sql`.

| Roll | Uppgifter |
| --- | --- |
| Företag – Malmö Fastigheter AB | Org.nr `556000-1234` (firmatecknare Anders Karlsson) |
| Företag – Göteborg Handel AB | Org.nr `556000-5678` (firmatecknare Maria Svensson) |
| Handläggare | `karin@resurs.se` / `password123` |

- **Handläggaren loggar in via `/login`.** Inloggning som handläggare i React-portalen öppnar prototypen med mockade ärenden.
- **Använd två webbläsarprofiler** (t.ex. ett vanligt fönster och ett inkognitofönster) för företag och handläggare. Annars delar rollerna session.
- BankID är mockat, och uppgifterna gäller bara testdata.

Seed-datan innehåller också en ansökan i `UNDER_REVIEW`, så handläggarkön har något att visa direkt. Skriv organisationsnummer **med bindestreck** (se [B3](docs/BRISTER_OCH_AVGRANSNINGAR.md#b3-organisationsnummer-utan-bindestreck-nekas)).

---

## Installation

### Krav

| Verktyg | Version | Behövs för |
| --- | --- | --- |
| Docker + Docker Compose | Aktuell | Hela systemet (PostgreSQL + Java + byggd frontend) |
| Node.js + npm | Node 22 (samma som Dockerfile) | Frontendutveckling och frontendtester |
| Java + Maven | Java 21, Maven 3.9 | Backendtester utanför Docker |
| gcc, make, OpenSSL-utvecklingsfiler (`libssl-dev` på Debian/Ubuntu) | – | Native C-moduler; krävs för att alla Java-tester ska köras |

### Frontendberoenden

```bash
cd backend/ResursPortal/frontend
npm ci
```

---

## Körning

### Hela systemet (Docker)

```bash
cd infra
docker compose up --build
```

- `db`: PostgreSQL 12. `seed.sql` körs när volymen skapas första gången.
- `app`: Spring Boot 3.5 / Java 21 på port `8083`. Dockerfilen bygger React med `--base=/portal/` och lägger resultatet i jar-filen, så frontend serveras av Java under `/portal/`.
- `docker-compose.override.yml` öppnar port `8083` lokalt. `docker-compose.yml` är en plattformsfil och använder bara `expose` (se `DRIFT.md`).

Stoppa:

```bash
docker compose down
```

Om bygget misslyckas utan tydligt felmeddelande: Dockerfilen kör Maven med `-q`, vilket döljer felet. Ta tillfälligt bort `-q` för att se det (se [I1](docs/BRISTER_OCH_AVGRANSNINGAR.md#i1-dockerfilen-döljer-byggfel--q)).

Nollställ databasen och kör seed på nytt (raderar all lokal data):

```bash
docker compose down -v && docker compose up --build
```

### Frontend i utvecklingsläge

Starta först systemet med Docker enligt ovan, sedan:

```bash
cd backend/ResursPortal/frontend
npm run dev
```

Öppna http://localhost:5173/. Vite skickar `/api`, `/login/company`, `/login/caseWorker`, `/logout` och `/backoffice` vidare till Java på `localhost:8083`, så ingen CORS- eller `.env`-konfiguration behövs. Om Vite visar `502 Bad Gateway` når den inte Java: kontrollera att Docker-containern `app` körs.

Appen använder hash-routing, så adresserna ser ut som `/#/logga-in`, `/#/kreditansokan/steg-1`, `/#/oversikt`, `/#/mina-handlingar` och `/#/ansokan/:id`.

> BankID är simulerat. I utvecklingsläge finns en knapp på inloggningssidan som låtsas bekräfta i BankID-appen.

### Övriga frontendkommandon

| Kommando | Gör |
| --- | --- |
| `npm run build` | Typkontroll (`tsc -b`) och produktionsbygge till `dist/` |
| `npm run preview` | Serverar produktionsbygget lokalt |
| `npm run lint` | ESLint |

---

## Testning

### Frontend

Vitest + React Testing Library + jsdom. Testfilerna ligger bredvid koden (`*.test.ts` / `*.test.tsx`).

```bash
cd backend/ResursPortal/frontend
npm test            # kör alla tester en gång
npm run test:watch  # kör om vid ändringar
npm run lint
npm run build
```

Testerna täcker auth och sessionshantering, skyddade routes, inloggningsvalidering, API-klienter med mockade nätverkssvar, guiden, översikts- och statussidor, företagsregistrets mock samt tangentbordsnavigering i inloggningsflikarna.

### Backend

JUnit 5 + Mockito via `spring-boot-starter-test`.

```bash
cd backend/ResursPortal
mvn test
```

Testerna täcker bland annat `ScoringService`, requestvalidering, REST-controllers (ansökan, handläggare, dokument, auth), `BankIdService` och `StatusService`. Många använder mockade services/repositories och bevisar därför inte integration mot riktig PostgreSQL.

### Native C och JNA

**Bygg C-biblioteken före `mvn test`.** Annars hoppas 10 Java-tester som anropar C över, utan att bygget misslyckas.

```bash
cd native
make
make test
```

Bara JNA-testerna:

```bash
cd backend/ResursPortal
mvn test -Dtest='ResursAudit*'
```

Redovisa överhoppade tester separat. Testerna körs **inte** automatiskt i GitHub Actions; där körs bara `infra-guard`.

### Manuellt end-to-end-test

1. Starta systemet med Docker (eller använd stage). Använd två webbläsarprofiler.
2. Logga in som seed-företag i React (`/portal/index.html`), skicka en ansökan och anteckna ärendenumret. Ange att kassaflödesanalys saknas, så går ansökan säkert till manuell granskning.
3. Kontrollera företagets status i React (`/#/oversikt` och `/#/ansokan/:id`).
4. Logga in som handläggare via `/login` i den andra profilen och hitta samma ärende i **Java-backoffice** (`/backoffice`).
5. Godkänn eller avslå med en kommentar, och läs om statusen som företag. Ladda inte om portalen, eftersom det loggar ut användaren.

Använd **inte** riktiga person- eller finansuppgifter. React-handläggarvyn visar fortfarande testdata (se [F2](docs/BRISTER_OCH_AVGRANSNINGAR.md#f2-inskickade-ansökningar-når-inte-react-handläggarvyn)), så använd Java-backoffice för steg 4–5.

---

## Teststatus

Rapporten skiljer mellan tre nivåer:

1. **Test finns:** testet är incheckat i GitHub.
2. **Tidigare godkänt:** det finns dokumenterat resultat från en äldre körning.
3. **Verifierat vid slutleverans:** testet har körts mot den slutliga commiten och resultatet är dokumenterat här.

`infra-guard` och stagingstatus på GitHub är **inte** enhets-, integrations- eller säkerhetstester.

### Sammanfattning (`develop` `2776f2a`, 2026-11-04)

| Område | Hur det testas | Resultat | Status |
| --- | --- | --- | --- |
| Java | `mvn test` (JUnit 5, Mockito) | 69 av 69 gröna, 0 överhoppade | ✅ Kört 2026-11-04 |
| C-moduler | `make test` | 15 av 15 gröna | ✅ Kört 2026-11-04 |
| Frontend | `npm test` (Vitest, Testing Library) | 121 av 121 gröna (21 testfiler) | ✅ Kört 2026-11-04 |
| Lint och produktionsbygge | `npm run lint`, `npm run build` | Godkända | ✅ Kört 2026-11-04 |
| Stage | Inloggning och läsning (se nedan) | Svarar som väntat | ✅ Kört 2026-11-04 |
| Hela flödet | Manuellt | Godkänt tidigare (`RES-2026-0005`), före PR #83–#85 | ⚠️ Inte omkört på slutlig commit |
| Docker-bygget lokalt | `docker compose up --build` | Bygget går igenom och systemet startar | ✅ Kört 2026-11-04 |
| CI | GitHub Actions | Bara `infra-guard`, inga tester | ❌ Saknas |

Antalet Java-tester ökade från 57 till 69 efter specialisternas feed forward. Därefter har två scoringtester lagts till för de regler som ändrades i `0fd2aec`; med dem är det 71 Java-tester (se körprotokollet).

### Testverktyg och täckning

| Område | Verktyg | Vad testerna huvudsakligen kontrollerar | Begränsning |
| --- | --- | --- | --- |
| React | Vitest + React Testing Library | Formulärvalidering, auth, skyddade routes, API-klienter med mockade svar, ansöknings- och statussidor | Testar inte mot riktig backend |
| Java | JUnit 5 + Mockito | Scoring, requestvalidering, REST-svar, sessions-/rollkontroller, felhantering | Mockade services; ingen riktig PostgreSQL |
| Handläggar-REST | `BackofficeRestControllerTest` | Kö, detalj, beslut, nekad åtkomst, ogiltigt beslut | Mockad `BackofficeService` |
| Dokument-REST | `DocumentRestControllerTest` | Dokumentlistning och åtkomstvillkor | – |
| Native C | `make test` | Kryptering/dekryptering, audit-signering/verifiering | Ej i ordinarie drift |
| Java/C | JNA-tester (`ResursAudit*`) | Native audit-signering/verifiering | Kan skippas utan `.so` |
| CI/deploy | `infra-guard` + stagingstatus | Compose-kontrakt och rapporterad deployment | Inget bevis för fungerande användarflöden |

### Java-tester per klass

| Testklass | Antal | Vad det bekräftar |
| --- | --- | --- |
| `ApplicationRestControllerTest` | 8 | Skapa och hämta ansökningar, behörighet, fel org.nr ger 403, regler för kassaflöde |
| `BackofficeRestControllerTest` | 7 | Handläggarkö, ärendedetaljer, beslut och behörighet |
| `DocumentRestControllerTest` | 5 | Dokumentlista och att ett företag bara ser sina egna |
| `AuthControllerTest` | 3 | BankID-inloggning och session |
| `BankIdServiceTest` | 4 | Giltigt, ogiltigt, tomt och saknat org.nr |
| `ScoringServiceTest` | 5 | Utfallen godkänd, granskning (soliditet 20–25 %) och avslag (under 20 %); att storkreditregeln inte flaggar soliditet över 25 %; att den branschjusterade gränsen används för `HANDEL` |
| `StatusServiceTest` | 4 | Statussteg för ansökan |
| `CreateApplicationRequestTest` | 3 | Validering av ansökningsdata |
| `ResursAuditServiceSignTest` | 12 | Signering via Java-bryggan |
| `ResursAuditServiceVerifyTest` | 19 | Verifiering och upptäckt av manipulerad kedja |
| `ResursAuditSmokeTest` | 1 | Att Java når C-biblioteket |

### Frontend-tester per fil

Körda med `npx vitest run --reporter=verbose` (Vitest 5.0.2) på `2776f2a`, 2026-11-04: 21 filer, 121 tester, alla gröna.

| Testfil | Antal | Vad det bekräftar |
| --- | --- | --- |
| `auth/session.test.ts` | 10 | Sessionen sparas och läses tillbaka exakt; felaktig eller manipulerad data (okänd roll, saknade fält, ogiltig JSON) räknas som utloggad och rensas |
| `auth/ProtectedRoute.test.tsx` | 4 | Utloggad skickas till `/logga-in`; fel roll skickas till `/` |
| `auth/PublicOnlyRoute.test.tsx` | 2 | Inloggad skickas bort från inloggningssidan |
| `auth/bankIdLogin.validation.test.ts` | 5 | Org.nr med och utan bindestreck godkänns; tomt, fel antal siffror och icke-siffror nekas |
| `auth/adminLogin.validation.test.ts` | 6 | E-post och lösenord krävs, e-postformat kontrolleras, blanksteg trimmas |
| `auth/mockBankId.test.ts` | 5 | BankID-mocken hittar rätt testföretag, nekar okända nummer och simulerar bekräftelse |
| `auth/mockAdminDirectory.test.ts` | 5 | Handläggarmocken: rätt e-post och lösenord, e-post skiftlägesokänslig, lösenord skiftlägeskänsligt |
| `services/companyValidationService.test.ts` | 2 | BankID-mocken och företagsregistret är överens om de två seed-företagen |
| `features/credit-application/creditApplication.api.test.ts` | 10 | Formuläret mappas till Java-kontraktet; tomma värden blir inte 0; regler för kassaflöde; `POST` och bevarade fältfel vid 400 |
| `features/credit-application/applicationRead.api.test.ts` | 13 | `GET` av lista och enskild ansökan; 401/403/404/500, ogiltig JSON, ogiltiga svar, nätverksfel och avbrutna anrop |
| `features/credit-application/useApplications.test.tsx` | 8 | Hooken laddar, visar fel, avbryter gamla anrop och rensar data när sessionen byts |
| `features/credit-application/useApplication.test.tsx` | 6 | Samma för en enskild ansökan, inklusive byte av id |
| `pages/LoginPage.a11y.test.tsx` | 6 | Tangentbordsnavigering i inloggningsflikarna (piltangenter, roving tabindex, etiketter) |
| `pages/BankIdLoginForm.test.tsx` | 4 | Validering, okänt org.nr, väntepanel med fokus och fokus tillbaka vid avbryt |
| `pages/wizard/WizardPage.api.test.tsx` | 3 | Guiden renderas, en komplett ansökan skickas via API-klienten, och utkastet bevaras vid API-fel så att ett nytt försök lyckas |
| `pages/overview/OverviewPage.test.tsx` | 4 | Översikten visar riktiga ansökningar framför testdata och aldrig ett annat företags ärende |
| `pages/overview/BackendApplicationsSection.test.tsx` | 5 | Laddning, fel, tom lista och flera ansökningar från Java |
| `pages/overview/BackendApplicationCard.test.tsx` | 3 | Kortet visar ansökan och klarar saknade fält och okänd status |
| `pages/status/ApplicationStatusPage.test.tsx` | 10 | Kvittot efter inskick visas bara för rätt ansökan och företag, och återanvänds inte efter navigering |
| `pages/status/BackendApplicationStatusSection.test.tsx` | 6 | Laddning, fel, ogiltigt id och saknad ansökan |
| `pages/status/BackendApplicationStatusView.test.tsx` | 4 | Statusvyn visar ansökan från Java och klarar saknade fält, okänd status och tom motivering |

React-handläggarvyn (`pages/backoffice/`) och Mina handlingar (`pages/documents/`) saknar tester.

### C-tester

| Modul | Antal | Vad det bekräftar |
| --- | --- | --- |
| `test_resurs_crypto` | 6 | Kryptering och dekryptering, felhantering och upptäckt av ändrad data |
| `test_resurs_audit` | 9 | Signering, verifiering av kedja, tom kedja, för liten buffert och NULL-argument |

### Kontroll av stage (2026-11-04)

| Kontroll | Resultat |
| --- | --- |
| `/portal/index.html` | 200 |
| `/api/applications` och `/api/backoffice/applications` utan inloggning | 401 |
| Handläggarinloggning, sedan `/backoffice` och `/api/backoffice/applications` | Fungerar, kön returneras |
| Företagsinloggning, sedan `/api/applications` | Fungerar, ansökningar returneras |

Kontrollerna skapade inga ansökningar och fattade inga beslut.

### Backendens REST-tester i detalj

Enhetstester med JUnit 5 och Mockito. Services och repositories är mockade, och `HttpSession` mockas för att simulera inloggning. Ingen databas startas och inga HTTP-anrop görs.

**`ApplicationRestControllerTest` – 8 tester**

| Test | Kontrollerar |
| --- | --- |
| Ansökan utan kassaflödesanalys | Scoringen hoppas över och ansökan sätts till `UNDER_REVIEW` i stället för att bedömas på nollor |
| Ansökan med saknade kassaflödesvärden | Anropet nekas med 400 |
| Ansökan i annat företags namn | 403, och ingen ansökan skapas |
| Lista ansökningar som inloggat företag | Endast det egna företagets ärenden returneras |
| Hämta enskild ansökan | Rätt ärende med ärendenummer och företagsnamn |
| Annat företags ansökan | 404 |
| Utloggad användare | 401, ingen service anropas |
| Fel roll | 403, ingen service anropas |

**`BackofficeRestControllerTest` – 7 tester**

| Test | Kontrollerar |
| --- | --- |
| Handläggarkön | Ansökningar under granskning och nyligen beslutade returneras |
| Utloggad | 401, ingen service anropas |
| Företagsroll mot handläggarendpoint | 403, ingen service anropas |
| Beslut på okänt ärende | 404, inget beslut registreras |
| Ogiltigt beslutsvärde | 400, inget beslut registreras |
| Giltigt beslut | Beslutet skickas vidare med rätt ärende, beslut, handläggarnamn och kommentar |
| Ärendedetaljer | Ärendenummer, företag och dokumentlista returneras |

**`DocumentRestControllerTest` – 5 tester**

| Test | Kontrollerar |
| --- | --- |
| Dokument för eget ärende | Dokumenten listas med filnamn och typ |
| Utloggad | 401 |
| Handläggarroll | 403 |
| Okänt ärende | 404 |
| Annat företags ärende | 404, och dokumenten hämtas inte |

Testerna visar att controllerlogiken och behörighetskontrollerna fungerar, men inte att controller, service, repository och PostgreSQL fungerar tillsammans.

### Körprotokoll – slutleverans

Tabellen innehåller bara resultat från faktiska körningar.

| Kontroll | Datum | Commit | Resultat | Kommentar |
| --- | --- | --- | --- | --- |
| `npm test` | 2026-11-04 | `2776f2a` | **Pass** – 21 testfiler, 121 tester | Lokal körning (Node 22) |
| `npm run lint` | 2026-11-04 | `2776f2a` | **Pass** | Lokal körning |
| `npm run build` (`tsc -b` + `vite build`) | 2026-11-04 | `2776f2a` | **Pass** | Lokal körning |
| `mvn test` (hela backendsviten) | 2026-11-04 | `2776f2a` | **Pass** – 69 av 69, 0 överhoppade | C-biblioteken byggda först |
| `mvn test -Dtest=ScoringServiceTest` (inkl. två nya tester) | 2026-11-04 | `a927bf5` (i `develop`) | **Pass** – 5 av 5, BUILD SUCCESS | Lokal körning |
| `make test` | 2026-11-04 | `2776f2a` | **Pass** – 15 av 15 | – |
| Stage: inloggning och läsning | 2026-11-04 | `2776f2a` | **Pass** | Se kontroll av stage ovan |
| Manuell företagsinloggning | 2026-11-03 | `2776f2a` | Fungerar vid manuell kontroll | Endast inloggning, inte hela E2E |
| Manuellt E2E-flöde | – | – | Inte omkört vid slutleverans | Senast verifierat före PR #83–#85: `RES-2026-0005`, 250 000 kr, `APPROVED`, syntes i React och Java-backoffice |
| `docker compose up --build` | 2026-11-04 | `develop` | **Pass** – bygget går igenom och systemet startar | Lokal körning |
| `infra-guard` | 2026-11-03 | `2776f2a` | Success | GitHub Check |
| Stage deployment | 2026-11-03 | `2776f2a` | Success (statusrapporterat) | Inte funktionstest |

**Definition av klar:** ett test får kallas "godkänt i slutleveransen" först när datum, commit och faktiskt resultat finns i tabellen. Fel och skipped redovisas öppet.

### Inte verifierat

- Hela kedjan React → API → PostgreSQL → Java-backoffice → uppdaterad företagsstatus med den slutliga koden.
- Integrationstest mot riktig PostgreSQL (t.ex. Testcontainers): finns inte.
- Automatiserat webbläsarflöde (t.ex. Playwright): finns inte.
- Samtidiga inskick: ärendenumret räknas fram från befintliga nummer, så två samtidiga ansökningar kan krocka. Inte testat.
- Last-/prestandatest och återställningsprov.
- Docker-bygget på alla teamets datorer: det fungerar lokalt (2026-11-04) men har inte gått igenom på alla datorer, se [I1](docs/BRISTER_OCH_AVGRANSNINGAR.md#i1-dockerfilen-döljer-byggfel--q).
- **Thymeleaf-controllerna** (`ApplicationController`, `BackofficeController`, `DocumentController`, `StatusController`) saknar egna tester, inklusive handläggarens beslut via `/backoffice/decide`.
- **Kreditbedömningen:** fem tester täcker huvudutfallen och de två regler som ändrade beteende i `0fd2aec`, men inte övriga trösklar (se [B2](docs/BRISTER_OCH_AVGRANSNINGAR.md#b2-vissa-scoringgränser-är-fortfarande-hårdkodade)).
- **Kryptobryggan:** `ResursCryptoService` saknar Java-tester.
- **React-handläggarvyn** testas inte mot backend, eftersom den använder mockdata.
- Säkerhets-/penetrationstest, GDPR-efterlevnad och native-kryptering i drift.

---

## Arbetsflöde och systemstatus

### Företagets arbetsflöde

1. **Identifiering.** Företaget väljer ett testorganisationsnummer i en simulerad BankID-process. React anropar `POST /login/company`, och Java skapar en session efter kontroll mot testföretagen.
2. **Ansökan.** Användaren fyller i en stegvis React-guide: Företag, Ekonomi, Kredit, Granska. Formuläret kontrollerar bland annat obligatoriska och numeriska fält. Utkastet sparas per användare i webbläsaren i upp till 7 dagar.
3. **Signering.** Ansökan signeras med simulerat BankID, och frontend kontrollerar mot ett mockat företagsregister att den angivna firmatecknaren finns.
4. **Serverkontroll och kreditbedömning.** `POST /api/applications` kräver företagssession. Java kontrollerar att organisationsnumret stämmer med sessionen (PR #83). Med kassaflödesanalys tillämpas reglerna i `ScoringService`. Utan analys går ansökan till manuell granskning i stället för att siffrorna antas vara noll.
5. **Datalagring.** Java sparar ärendet i PostgreSQL med ärendenummer, status och motivering och returnerar resultatet till React.
6. **Uppföljning.** Företaget hämtar sina ärenden med `GET /api/applications` och ett enskilt ärende med `GET /api/applications/{id}`. API:erna begränsar åtkomsten till det inloggade företagets ärenden.

### Handläggarens arbetsflöde – två gränssnitt

**Java-backoffice (databasanslutet, verifierbart):**

- Handläggaren loggar in via `POST /login/caseWorker`.
- `/backoffice` visar ärenden med `UNDER_REVIEW` och de senaste besluten.
- Ärendedetaljer visar ansökan, beslutsorsak, audittext och dokumentmetadata.
- Manuellt `APPROVED` eller `REJECTED` registreras via `/backoffice/decide`. Det uppdaterar databasposten och lägger till en post i den JSON-baserade loggen.
- Företaget ser därefter den nya statusen via sina API:er.

**Nya REST-API:er (implementerade, inte inkopplade i React):**

| Endpoint | Syfte | Avgränsning |
| --- | --- | --- |
| `GET /api/backoffice/applications` | Kö och nyligen avgjorda ärenden | Kräver handläggarroll; React använder det inte ännu |
| `GET /api/backoffice/applications/{id}` | Ärendedetaljer | Kräver handläggarroll |
| `POST /api/backoffice/applications/{id}/decision` | Registrera beslut | Kräver handläggarroll; tester mockar servicen |
| `GET /api/applications/{id}/documents` | Dokumentmetadata för eget ärende | Kräver företagssession och ägarkontroll |

**React-handläggarvyn** använder `CasesContext.tsx` och `mockCases.ts` med `localStorage`. Ärenden och beslut som visas där ska **inte** presenteras som bevis för databaslagring. Java-backoffice är den verifierbara vägen tills React-vyn är integrerad (se [F2](docs/BRISTER_OCH_AVGRANSNINGAR.md#f2-inskickade-ansökningar-når-inte-react-handläggarvyn)).

### Kreditbedömning och ansvar

- Bedömningen är regelbaserad, inte AI-baserad. Den använder bland annat soliditet, likviditet, skuldsättning, kassaflöde och räntetäckning.
- Utfallet blir `APPROVED`, `REJECTED` eller `UNDER_REVIEW`. Flaggade eller ofullständiga fall går till manuell bedömning.
- De ekonomiska uppgifterna kommer från användarens inmatning. Uppladdade årsredovisningar tolkas inte automatiskt och jämförs inte med inmatningen.
- Reglerna är prototypregler, inte en verifierad kommersiell kreditpolicy.

### Nytta för kund och verksamhet

- **Företagskunden** kan skicka en ansökan, få ett ärendenummer och följa statusen utan att ringa.
- **Handläggaren** får en egen kö för ärenden som kräver manuell granskning, ser beslutsunderlaget och kan fatta beslut.
- **Verksamheten** får ett gemensamt databasärende och ett tydligare flöde. Nyttan i stor skala är inte mätt med belastnings-, tids- eller användbarhetsstudier.

### Inte klarlagt

Drift med många samtidiga ansökningar, verklig identitetskontroll, säker permanent dokumentlagring, integrerad React-handläggarvy, produktionsanpassad audit-signering och full GDPR-efterlevnad. Se [brister och avgränsningar](docs/BRISTER_OCH_AVGRANSNINGAR.md).

---

## Arkitektur

### Systemöversikt

```
Webbläsare
  ├─ React-portal (/portal/ eller Vite :5173)
  └─ Java-sidor (Thymeleaf: /, /apply, /backoffice …)
          │  same-origin, sessionscookie (HttpSession)
          ▼
Spring Boot 3.5 / Java 21  (port 8083)
  ├─ Controllers: Auth, Application(Rest), Backoffice(Rest), Document(Rest)
  ├─ Services: ScoringService, ApplicationService, BankIdService, StatusService …
  └─ native_bridge (JNA) ──► native/ C-moduler (AES-256-GCM, SHA-256/Ed25519) – ej i ordinarie flöde
          │
          ▼
PostgreSQL 12  (infra/seed.sql)
```

### Backend-API som frontend använder

| Metod och sökväg | Används av | Kommentar |
| --- | --- | --- |
| `POST /login/company` | BankID-inloggning | Formulärdata `orgNumber`; lyckat = redirect |
| `POST /login/caseWorker` | Handläggarinloggning | Formulärdata `email`, `password`; lyckat = redirect |
| `GET /logout` | Utloggning, inaktivitetstimer | Lyckat = redirect |
| `GET /api/applications` | Översikt, kontroller vid in-/utloggning | 401 utan inloggning |
| `GET /api/applications/{id}` | Statussidan | |
| `POST /api/applications` | Guiden, inskick | JSON; 400 med fältfel |
| `GET /backoffice` | Kontroll av handläggarsession | |

### Backend: teknik, validering och scoring

**Teknik och versioner.** Backend har moderniserats från en äldre grund (commit `b964492`, 6 okt):

- **Java:** 11 → 21.
- **Spring Boot:** 2.7 → 3.5. Det innebär även övergången till Jakarta EE (`javax` → `jakarta`), t.ex. `jakarta.validation` i `CreateApplicationRequest`.
- **Maven** för beroenden och bygge.
- **Spring MVC** för endpoints och formulär (REST och Thymeleaf).
- **Databasåtkomst:** Spring Data JPA (`ApplicationRepository`, `CompanyRepository`, `CaseWorkerRepository`, `DocumentRepository`) och `JdbcTemplate` med parametriserade frågor (`AuthRepository`, `BackofficeRepository`, `StatusRepository`). v1 hade handskriven SQL direkt i controllers, bland annat en inloggningsfråga som var sårbar för SQL injection. Nu bygger controllerna ingen SQL själva, och all databasåtkomst är samlad i repository-lagret och parametriserad (Issue #16).
- **PostgreSQL** som databas.

**Lager.**

| Lager | Ansvar |
| --- | --- |
| Controller | Tar emot HTTP-anrop och hanterar användarflöden |
| Service | Affärslogik, validering och scoring |
| Repository | Kommunicerar med databasen |
| Model / DTO | Datamodeller (`model/`) och request-objekt (`dto/`) |

Validering och scoring ligger i egna serviceklasser i stället för i controllers. Det gör koden enklare att testa, vidareutveckla och underhålla. Nya REST-controllers anropar alltid service-lagret och rör inte repositories direkt.

**REST-API.** Alla endpoints kräver session. Felkoder: **401** utloggad, **403** fel roll eller annat företags organisationsnummer, **404** okänt eller otillgängligt ärende, **400** ogiltig indata.

| Endpoint | Metod | Kräver | Syfte |
| --- | --- | --- | --- |
| `/api/applications` | POST | Företagssession | Skicka in ansökan; organisationsnumret kontrolleras mot sessionen (PR #83) |
| `/api/applications` | GET | Företagssession | Företagets egna ansökningar |
| `/api/applications/{id}` | GET | Företagssession | En ansökan; annat företags ärende ger 404 |
| `/api/applications/{id}/documents` | GET | Företagssession | Dokumentmetadata för eget ärende (PR #85) |
| `/api/backoffice/applications` | GET | Handläggarsession | Handläggarkö och nyligen beslutade (PR #84) |
| `/api/backoffice/applications/{id}` | GET | Handläggarsession | Ärendets detaljer, inklusive auditlogg |
| `/api/backoffice/applications/{id}/decision` | POST | Handläggarsession | Godkänn eller neka med kommentar |

Svaret på en ny ansökan innehåller ett ärendenummer i formatet `RES-2026-0001`, så att kund, support och handläggare kan prata om samma ärende. React använder fortfarande `applicationId` för routing.

**Innehåll i en kreditansökan.** Ekonomisk situation: eget kapital, totalt kapital, omsättningstillgångar, kortfristiga och totala skulder, rörelseresultat, nettoomsättning, kassaflöde (operativt och investeringar, eller uppgift om att kassaflödesanalys saknas) och räntekostnader. Därtill sökt belopp, syfte och bransch.

**Validering.** Det finns två vägar in, med olika validering:

| Väg | Används av | Validering |
| --- | --- | --- |
| `POST /api/applications` (`ApplicationRestController`) | React | Bean Validation (`@Valid` på `CreateApplicationRequest`) + kontroll att organisationsnumret tillhör sessionen |
| `POST /apply` (`ApplicationController`) | Thymeleaf-formuläret | `CompanyValidationService` + `CreditApplicationValidationService` |

- `CompanyValidationService` kontrollerar organisationsnumrets format (sex siffror, bindestreck, fyra siffror, t.ex. `556000-1234`) och slår upp numret i ett **hårdkodat mockregister**. Det är ingen kontroll mot ett riktigt företagsregister.
- `CreditApplicationValidationService` kontrollerar organisationsnummer, företagsnamn, firmatecknare, obligatoriska ekonomiska värden, ett positivt sökt belopp och ett angivet syfte.
- Eget kapital och rörelseresultat **får vara negativa**. Det är inget valideringsfel, eftersom scoringen ska kunna bedöma företag med svag ekonomi.

**Kreditbedömning (`ScoringService`).** Bedömningen väger bland annat soliditet, skuldsättning, rörelseresultat, omsättning, kassaflöde, räntekostnader, sökt belopp och bransch. Resultatet ger beslut och status, och ansökan kan flaggas för manuell granskning.

**Soliditetströsklar.** Tidigare kontrollerades soliditet på fyra ställen med olika gränser, så ett bolag kunde få flera flaggor för samma svaghet. Teamet valde att behålla en avslagsgräns och en varningsgräns som övriga regler återanvänder. De är samlade i `ScoringThresholds` och konfigureras i `application.properties` (commit `0fd2aec`):

| Soliditet | Resultat av grundregeln |
| --- | --- |
| Under 20 % (`scoring.solidity-reject-threshold`) | Avslag (`REJECTED`) |
| 20 % till under 25 % (`scoring.solidity-warning-threshold`) | Flagga → manuell granskning (`REVIEW`) |
| 25 % eller högre | Ingen flagga från grundregeln |

Varje flagga, från vilken regel som helst, ger `REVIEW`; ett avslagsvillkor ger `REJECTED`.

- **25 %:** Varningsgränsen används även i kombinerade regler (kreditbelopp över 1 000 000 kr, skuldsättningsgrad över 2,5) och multipliceras med en branschfaktor. Exempel: för `HANDEL` är faktorn 1,10, så den branschjusterade gränsen blir 25 % × 1,10 = 27,5 %.
- **30 %** (hårdkodad): flagga om eget kapital täcker mindre än 30 % av det sökta kreditbeloppet.

Grundgränserna är oförändrade, men två regler ändrade beteende när de började återanvända varningsgränsen: regeln för belopp över 1 000 000 kr gick från soliditet < 30 % till < 25 % (mildare), och den branschjusterade gränsen från 20 % till 25 % × branschfaktor (strängare). Det är ett utvecklingsbeslut, inte ett kundbeslut, och bör stämmas av med kunden eftersom trösklar är kreditpolicy. Ändringen täcks nu av två tester i `ScoringServiceTest` (se [beslutsloggen](docs/BESLUTSLOGG.md#kreditbedömning) och [B5](docs/BRISTER_OCH_AVGRANSNINGAR.md#b5-ändrade-tröskelregler-är-inte-avstämda-med-kunden)).

Syftet är att slippa leta upp och ändra samma värde på flera ställen. Vissa regler är fortfarande hårdkodade (se [B2](docs/BRISTER_OCH_AVGRANSNINGAR.md#b2-vissa-scoringgränser-är-fortfarande-hårdkodade)).

### Frontend

React 19 + TypeScript + Vite, i `backend/ResursPortal/frontend`. Samma bundle har två roller:

| Roll | Vem | Får |
| --- | --- | --- |
| `client` | Företag (BankID) | Guide, översikt, Mina handlingar, ärendestatus |
| `admin` | Handläggare | React-handläggarvy: översikt, ärenden, aviseringar (testdata) |

```
src/
  main.tsx, App.tsx      Startpunkt, providers och routes
  routes.ts              Alla URL:er (svenska, utan å/ä/ö)
  auth/                  AuthContext, session, route-skydd, validering, BankID-mock
  context/               CasesContext – handläggarvyns prototypdata
  features/credit-application/
                         Typer, validering, API-klienter, hooks, utkast, signering, guidesteg
  pages/                 En mapp per vy (wizard, overview, documents, status, backoffice) + inloggning
  components/ui/         Egna UI-komponenter (Button, Dialog, Sheet, Select …), inget UI-bibliotek
  components/layout/     Layout och sidomeny för företagsportalen
  services/              Utbytbara tjänster med mockimplementation (företagsregister, notiser)
  hooks/, utils/, data/, types/, styles/tokens.css, test/setup.ts
```

Tumregel: `pages/` sätter ihop vyer, `features/` äger domänlogik och backendkontrakt, och `components/` är fri från domänlogik.

**Routing.** `HashRouter`, så Java bara behöver servera en `index.html` och en omladdning aldrig når servern som okänd sökväg. `ProtectedRoute` skickar utloggade till `/logga-in`, och `PublicOnlyRoute` skickar inloggade bort från inloggningssidan. `AuthedRoot` väljer layout efter roll: handläggare får alltid `BackofficeLayout`, företag får `AppLayout`.

**Inloggning och session.**
- *Företag:* BankID-mocken körs, därefter `POST /login/company`. Inloggningen godkänns bara om Java svarar med redirect *och* `GET /api/applications` lyckas utan ärenden från ett annat företag.
- *Handläggare:* `POST /login/caseWorker`, därefter kontroll att `GET /backoffice` ger åtkomst.
- Anropen använder `redirect: 'manual'`, eftersom backend svarar på formulärinloggning med redirects avsedda för serverrenderade sidor.
- Användaren sparas i `AuthContext` och `sessionStorage` (`session.ts`, formkontrolleras vid läsning). Vid omladdning rensas sessionen avsiktligt (se [F1](docs/BRISTER_OCH_AVGRANSNINGAR.md#f1-sessionen-försvinner-vid-siduppdatering)).
- En inaktivitetstimer på 15 minuter anropar `/logout` och rensar den lokala sessionen.
- Utloggning kontrollerar att Java-sessionen verkligen är borta (`/api/applications` ska ge 401, `/backoffice` ska ge redirect) innan den lokala sessionen rensas.

**Dataflöde vid inskick (riktig backend).**

```
Guidens steg ─► CreditApplicationData (strängar)  ── utkast i localStorage, 7 dagar
   ▼  validering per fält
signApplication()           ── BankID-mock + kontroll av firmatecknare
   ▼
toCreateApplicationRequest()  ── strängar → hela kronor; saknat kassaflöde = noCashFlowStatement: true
   ▼
POST /api/applications ─► { applicationId, caseNumber, status, decision, … }
   ▼
utkastet raderas → /ansokan/:id
```

Saknat kassaflöde skickas aldrig som `0`. Totala skulder räknas ut som kortfristiga + långfristiga skulder, och räntekostnader skickas alltid som positivt tal. Alla fel visas som ett gemensamt meddelande (se [F4](docs/BRISTER_OCH_AVGRANSNINGAR.md#f4-backendens-fältfel-visas-inte-vid-formulärfälten)).

**Läsning (riktig backend).** `applicationRead.api.ts` formkontrollerar varje svar. Hookarna `useApplications`/`useApplication` nycklas på företagets organisationsnummer och avbryter inaktuella anrop med `AbortController`.

**Mockar och utbytespunkter.** Där backend saknar en funktion anropar frontend ett gränssnitt med mockimplementation, så att UI inte behöver ändras när den riktiga funktionen kommer:

| Mock | Ersätter | Byt mot |
| --- | --- | --- |
| `auth/mockBankId.ts` | Riktig BankID-inloggning | BankID via backend |
| `features/.../bankIdSigning.ts` | BankID-signering + firmatecknarkontroll | Signerings-endpoint (behåll signaturen på `signApplication`) |
| `services/companyValidationService.ts` | Företagsregister | HTTP-klient mot backend |
| `services/notificationService.ts` | E-post till sökande (Spring Mail) | HTTP-anrop till backend |
| `auth/session.ts` | "Vem är jag" från servern | Endpoint med HttpOnly-cookie |
| `context/CasesContext.tsx` + `data/mockCases.ts` | Handläggar-API | `/api/backoffice/...` (finns sedan PR #84) |

**Övrigt.** Allt som läses från nätverket, `sessionStorage` eller `localStorage` formkontrolleras före användning. Styling sker med CSS Modules och designtokens i `styles/tokens.css`. Tillgänglighet: fokusfälla i `Dialog`/`Sheet`, fokushantering i guiden och signeringsvyn, Escape-hantering och tangentbordstester för inloggningsflikarna.

---

## Mappstruktur

```
backend/ResursPortal/            Spring Boot 3.5 / Java 21 (Maven)
  src/main/java/se/comerit/resurs/
    controller/                  Auth, Application(Rest), Backoffice(Rest), Document(Rest)
    service/                     Scoring, Application, BankId, Status, Auth …
    native_bridge/               JNA-gränssnitt mot native C-moduler
  src/main/resources/templates/  Thymeleaf-sidor (Java-backoffice m.m.)
  frontend/                      React-portalen (se Arkitektur)
  Dockerfile                     Bygger frontend + backend till en jar
native/                          C-moduler för kryptering och audit + tester
infra/                           docker-compose.yml, override, seed.sql
docs/                            Beslutslogg, brister, demo-fallback, specialistfeedback
docs (Old V1)/                   Dokumentation från v1 (historik)
DRIFT.md                         Regler för plattformsfilen och driften
```
