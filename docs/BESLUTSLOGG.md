# Beslutslogg – ResursPortal Team 3

**Version:** dokumentationsunderlag 2026-11-04, `develop` `2776f2a`.
**Syfte:** visa vilka arkitektur-, leverans- och prioriteringsval teamet har gjort, varför, och vad som valdes bort. Besluten är hämtade från PR:er, commits, designdokument och omtagsplanen. Där ett faktiskt mötesbeslut saknas redovisas valet som ett **observerat teknikval**. Där motivet eller det bortvalda alternativet inte framgår av källan anges det inte (–).

Detaljer om varje ändring finns i respektive PR, dess commits och GitHub-historiken.

## Arkitektur och teknik

| Datum | Beslut | Skäl och konsekvens | Valt bort | Belägg |
| --- | --- | --- | --- | --- |
| Implementerat i v2 | Separat React/TypeScript-gränssnitt och Spring Boot/Java-backend | Tydligare ansvarsfördelning mellan presentation, affärslogik och datalagring. Kräver korrekt API- och sessionsintegration. | Bara serverrenderade Thymeleaf-sidor | `backend/ResursPortal/frontend/src`, `ApplicationRestController.java`, `Dockerfile` |
| Implementerat i v2 | PostgreSQL som gemensam datakälla för ansökningar och beslut | En ansökan ska få ett ärendenummer och kunna hämtas igen. | – | `infra/seed.sql`, entiteter/repositories, `ApplicationService.java` |
| 2026-09-03 | Kreditbedömningen flyttas från controller till `ScoringService` | Separerar affärslogik från controllern och gör den testbar. Besluten kan motiveras med ekonomiska regler, och varje regel som slår till skrivs i motiveringen så att handläggaren ser varför ett ärende hamnade hos dem. | Scoring kvar i controllern | PR #31, commit `9690ce7`, `ScoringServiceTest.java` |
| 2026-09-07 – 09-21 | Databaslagret byggs om med JPA/Hibernate och repositories | v1 använde `JdbcTemplate` direkt i controllers, och handläggarinloggningen byggde sin SQL med användarens inmatning inklistrad (SQL injection). Att laga ett ställe löser ett symptom; ett repository-lager tar bort mönstret så att framtida kod inte lika lätt återinför det. Fyra entiteter och repositories ersatte spridd SQL i fem controllers. Controllerna bygger inte längre SQL själva, och all databasåtkomst är samlad i repository-lagret och parametriserad – det är det som tar bort SQL injection. Tre repositories (`Auth`, `Backoffice`, `Status`) använder `JdbcTemplate` i stället för JPA, men med parametriserade frågor. | Parametrisera bara den sårbara frågan | Issue #16, branch `feature/jpa-hibernate-migration`, merge `666359b` |
| 2026-09-07 – 09-21 | Stegvis refaktorering, en controller i taget | v1 fungerade, och det fanns få tester att luta sig mot. Varje steg går att granska och backa för sig, till priset av fler commits. | En stor omskrivning | Commitordningen på `feature/jpa-hibernate-migration` |
| 2026-09-10 – 09-21 | Uppdelning i controller, service och repository | `ApplicationController` i v1 hade över 800 rader med scoring, databasanrop och sessionskontroller blandat. Logiken bröts ut till `ScoringService`, `ApplicationService`, `AuthService` och `StatusService` utan att flödet ändrades; controllern krympte med 780 rader. | Affärslogik och databasåtkomst kvar i controllers | PR #40, commits `e208fb5`, `0c3155e` |
| 2026-09-17 | BankID-mocken läggs i en egen `BankIdService` | Ersätter den hårdkodade kontrollen i `AuthService`. v2-målet är att mocken ska kunna bytas mot en skarp integration utan att resten påverkas. | Riktig BankID (se [avgränsningar](BRISTER_OCH_AVGRANSNINGAR.md#avgränsningar-i-slutleveransen)) | PR #47 |
| 2026-09-29 | Dubblerad kontroll av organisationsnummer tas bort; `BankIdService` äger regeln | Samma lista fanns i `AuthService` och `BankIdService`. Två kopior av samma regel glider isär. | Behålla båda kopiorna | Commit `6ed6aa0` |
| 2026-10-07 | REST-API för kreditansökan med validering | React behöver kunna skicka ansökningar till Java. | – | PR #58 |
| Implementerat i v2 | Validering flyttad från controllers till egna services | Lättare att testa och underhålla. REST-anropet använder dock Bean Validation och inte dessa services (se [brister](BRISTER_OCH_AVGRANSNINGAR.md#funktioner-som-inte-blev-klara)). | Validering i controllers | `CompanyValidationService.java`, `CreditApplicationValidationService.java` |
| 2026-10-19 | Uppgradering till Java 21 och Spring Boot 3.5 (Jakarta EE) | v2-mål. Modernisera den tekniska grunden med en aktuell Java LTS-version och en modernare Spring Boot, som ger bättre förutsättningar för fortsatt utveckling och underhåll. Kräver övergång från `javax` till `jakarta`. | Stanna på Java 11 / Spring Boot 2.7 | PR #67, commit `b964492` |
| 2026-10-19 | React och Java byggs i samma Docker-avbildning; React serveras under `/portal/` | Krav i projektets driftinstruktioner: en separat frontend-container får ingen publik adress. Samma origin som backend, så sessionscookien fungerar utan CORS. | Separat frontend-container | PR #69, `DRIFT.md`, `Dockerfile` (`--base=/portal/`) |
| 2026-10-19 | `case_number` läggs till med en idempotent `schema.sql` vid uppstart | `seed.sql` körs bara när databasen skapas, och befintlig data ska bevaras. | Nollställa databasen | PR #70, `src/main/resources/schema.sql` |
| 2026-10-20 – 10-21 | Företags- och handläggarinloggningen i React kopplas till Java-sessioner; företaget läser riktiga ansökningar och status | Sammanhängande kundflöde och mindre beroende av lokal mockdata för företagets ansökningar. | Fortsätta med mockdata i portalen | [PR #81](https://github.com/chas-challenge-2026/resurs-team3/pull/81), merge `267f303` |
| 2026-11-03 | Nya REST-controllers för handläggarkö, ärendedetaljer, beslut och dokumentlistor läggs **bredvid** de gamla Thymeleaf-controllerna | React-handläggarvyn behöver ett API för riktig data. Arbetet gjordes nära inlämning, och ett additivt tillägg kan inte förstöra det fungerande Thymeleaf-backoffice som används i demon. De nya endpointsen återanvänder `BackofficeService` och `DocumentService`. Till skillnad från de gamla sidorna ger okänt id 404 och ogiltigt beslut 400 med förklaring, i stället för en tyst omdirigering. | Ändra de befintliga controllerna | Commits `a1eacd8`, `97e1f8e`, [PR #84](https://github.com/chas-challenge-2026/resurs-team3/pull/84) (merge `7cbee69`), [PR #85](https://github.com/chas-challenge-2026/resurs-team3/pull/85) (merge `2776f2a`) |

## Kreditbedömning

| Datum | Beslut | Skäl och konsekvens | Valt bort | Belägg |
| --- | --- | --- | --- | --- |
| 2026-10-08 – 10-19 | Saknat kassaflöde behandlas inte som noll; ansökan utan kassaflödesanalys går till manuell granskning, annars krävs båda kassaflödesvärdena | Fälten var primitiva `double`, så ett tomt fält blev 0 och gav två varningsflaggor – ett kreditbeslut på data som aldrig lämnats. Fälten blev `Double` med `@NotNull`. Mindre bolag saknar ofta kassaflödesanalys, så flaggan `noCashFlowStatement` lades till: fälten blir frivilliga och ansökan går till `UNDER_REVIEW` / `REVIEW`. Automatisk bedömning går inte att göra utan underlaget. | Tolka saknat värde som 0 | PR #63, #66, commits `722d968`, `34ce2c8` |
| 2026-09-29 – 10-13 | Ärendenummer i formatet `RES-2026-0001`; `applicationId` används fortfarande för routing | Databasens id är inte läsbart för kunden och går inte att läsa upp i telefon. Kund, support och handläggare ska kunna prata om samma ärende. Efter avstämning med frontend behövdes ingen uppslagning på ärendenummer. | Routing via ärendenummer | Issue #46, PR #64, #66, commits `3a77696`, `25e651f` |
| 2026-10-15 – 10-19 | Soliditetsgränserna samlas i `ScoringThresholds`: en avslagsgräns (20 %) och en varningsgräns (25 %), som övriga regler återanvänder | Soliditet kontrollerades på fyra ställen med olika gränser, så ett bolag kunde få flera flaggor för samma svaghet och det var oklart vilken gräns som gällde. Gränserna är nu synliga och ändringsbara i `application.properties`. Grundgränserna är oförändrade, men **två regler ändrade beteende** när de började återanvända varningsgränsen: regeln för belopp över 1 000 000 kr gick från soliditet < 30 % till < 25 % (mildare), och den branschjusterade gränsen från 20 % till 25 % × branschfaktor (strängare). Att reglerna skulle sluta ha egna värden var avsiktligt; att det ändrade vem som flaggas, och åt olika håll, upptäcktes i efterhand. **Detta är ett utvecklingsbeslut, inte ett kundbeslut.** Trösklar är kreditpolicy och bör stämmas av med kunden. Ändringen täcks av två tester i `ScoringServiceTest`. | Fyra separata, hårdkodade gränser | PR #68, commit `0fd2aec` ("teamet har valt att behålla en avslagsgräns och en varningsgräns …") |

## Säkerhet och native-moduler

| Datum | Beslut | Skäl och konsekvens | Valt bort | Belägg |
| --- | --- | --- | --- | --- |
| 2026-09-10 | Kryptering med AES-256-GCM | Ger konfidentialitet, integritet och autentisering. | – | PR #39, `native/crypto-design.md` |
| 2026-10-12 | Audit-poster signeras med Ed25519 och kedjas med SHA-256 | Fasta, korta nycklar och signaturer, stöd i OpenSSL och inget externt beroende. | RSA, ECDSA P-256 | PR #60, `native/audit-design.md` |
| 2026-10-12 | C anropas från Java via JNA; längder kontrolleras i Java innan C anropas | C läser ett fast antal bytes, så en för kort array skulle ge läsning utanför minnet. | – | PR #60, `native_bridge/IMPLEMENTATION-PLAN.md` |
| 2026-10-26 | Inskickad ansökan knyts till det inloggade företaget: företaget hämtas ur sessionen och jämförs med org.nr i anropet | `POST /api/applications` hämtade företaget utifrån organisationsnumret i anropet, så ett inloggat företag kunde ansöka i en annan firmas namn. Avvikelse ger nu 403. Indata från klienten kan inte användas som identitet. | Att ta bort org.nr ur anropet, som PR #82 föreslog | [PR #83](https://github.com/chas-challenge-2026/resurs-team3/pull/83), commit `9189357`, merge `0cc4bf4` |
| Efter specialisternas feed forward | De viktigaste riskerna prioriteras och redovisas med konsekvens, sannolikhet, åtgärd och kvarvarande risk | CTO:n bad teamet bli mer riskorienterat och fokusera på de viktigaste riskerna (se [feed forward](SPECIALIST_FEEDBACK.md)). | En lång lista utan prioritering | [De fem viktigaste riskerna](BRISTER_OCH_AVGRANSNINGAR.md#de-fem-viktigaste-riskerna), [kända brister](BRISTER_OCH_AVGRANSNINGAR.md) |

## Prioriteringar i omtagsplanen

Efter kvaldemon den 22 oktober gjorde teamet en omtagsplan utifrån specialisternas feed forward. Principen var att prioritera ett sammankopplat och verifierat flöde framför många halvfärdiga delar.

| Datum | Beslut | Skäl och konsekvens | Valt bort | Belägg |
| --- | --- | --- | --- | --- |
| Efter 2026-10-22 | Behålla mockar för BankID och e-post | Riktiga integrationer kräver externa avtal och tjänster. | Riktiga integrationer | Omtagsplanen |
| Efter 2026-10-22 | Inte tolka PDF:er; handläggaren granskar dokument manuellt | Prioriterar det sammankopplade flödet. | PDF-parsning | Omtagsplanen |
| Efter 2026-10-22 | Inte koppla in PII-kryptering i databasen | Kräver datamigrering. Modulen visas som byggd och testad men inte inkopplad. | Full kryptering | Omtagsplanen |
| Efter 2026-10-22 | Dokumentera Spring Security, bcrypt och pagination som kända brister i stället för att bygga dem | Begränsad tid. | Att bygga dem | Omtagsplanen, [kända brister](BRISTER_OCH_AVGRANSNINGAR.md) |
| Efter 2026-10-22 | Handläggaren använder Thymeleaf-sidorna i leveransen; React-handläggarvyn lämnas som prototyp | Tiden räckte inte för att koppla React till API:et. Så går hela flödet ändå att köra mot riktig data, och demo och dokumentation ger inte sken av att mockärenden är riktiga. | Att koppla React till API:et | Sluttillståndet i koden, `CasesContext.tsx` (`MOCK_CASES`) |
| Efter 2026-10-22 | Audit-kedjan kopplas inte in i appen | Planerades i omtagsplanen (Backend 2) men hann inte bli klart. Modulen är byggd och testad, men nyckelhantering, `audit_events` och bygget i Docker saknas. | Att koppla in den i liten skala | Sluttillståndet i koden, `native/`, `native_bridge/` |
| 2026-11-03 | Sluttiden läggs på att dokumentera vad som finns och vad som inte blev klart; verifierbara funktioner och öppna risker prioriteras | Kort tid kvar och tre tillgängliga personer. Dokumentationen skiljer på testat, implementerat och återstående. | Nya funktioner | Teambeslut, `README.md`, `docs/` |
| Slutleverans | Ingen utfästelse om produktionssäkerhet eller full GDPR-efterlevnad | Riktigt BankID, modern lösenordshantering, säker dokumentlagring, nyckelhantering och GDPR-processer saknas eller är inte verifierade. | – | [Kända brister](BRISTER_OCH_AVGRANSNINGAR.md) |

## Frontend – observerade teknikval

Dessa val syns i koden men har inget dokumenterat mötesbeslut i repot.

| Datum | Observerat val | Skäl och konsekvens | Valt bort | Belägg |
| --- | --- | --- | --- | --- |
| 2026-10-19 | `HashRouter` i stället för vanlig URL-routing | Java behöver bara servera en `index.html`; en omladdning når aldrig servern som okänd sökväg. Adresserna får formen `/#/…`. | `BrowserRouter` med server-fallback | `src/main.tsx`, commit `7cbb837` |
| 2026-10-19 | Funktioner som backend saknar ligger bakom gränssnitt med mockimplementation (BankID, signering, företagsregister, notiser) | UI kan byggas och testas nu, och den riktiga implementationen kan bytas in utan UI-ändringar. Kräver att mockarna tydligt redovisas som mockar. | Vänta på backend, eller mockdata direkt i komponenterna | `services/`, `auth/mockBankId.ts`, `features/credit-application/bankIdSigning.ts`, commit `7cbb837` |
| 2026-10-19 | Ansökningsutkast sparas per användare i `localStorage` i 7 dagar | En firmatecknare kan avbryta och fortsätta senare. Utkastet rensas vid inskick, omstart och utloggning. | `sessionStorage` (försvinner när fliken stängs) | `features/credit-application/applicationDraft.ts`, commit `7cbb837` |
| 2026-10-21 | Alla svar från nätverk och webbläsarlagring formkontrolleras före användning | Skyddar UI mot oväntade eller manipulerade data. | Lita på TypeScript-typerna | `applicationRead.api.ts` (`isApplication`), `auth/session.ts`, commit `92b0e9e` |
| 2026-10-21 | Sessionen i frontend rensas vid omladdning | Troligen för att frontend inte kan kontrollera Java-sessionen. Konsekvens: användaren måste logga in igen efter omladdning (se [F1](BRISTER_OCH_AVGRANSNINGAR.md#f1-sessionen-försvinner-vid-siduppdatering)). | Återställa sessionen utan kontroll mot Java | `auth/AuthContext.tsx`, commit `8492979` |
| Observerat | Egna UI-komponenter och CSS Modules med designtokens | Full kontroll över utseende och tillgänglighet; mer egen kod att underhålla. | Ett UI-bibliotek | `components/ui/`, `styles/tokens.css` |

## Prioriteringsprincip utifrån specialisternas feed forward

Feed forward kom från delivery manager, CTO, UX/UI och kunden. Kundens feed forward gällde särskilt **verifiering** (vad som är testat och hur), ett **sammankopplat flöde** från ansökan till beslut, **handläggarens arbetsdag**, **kundnytta** och **säkerhet/GDPR**. Slutleveransen redovisar därför vad som faktiskt går att göra med riktiga testärenden, hur det är testat och vad som återstår. Nya tillägg utan tydlig nytta prioriteras lägre än dokumentation, verifiering och riskhantering.
