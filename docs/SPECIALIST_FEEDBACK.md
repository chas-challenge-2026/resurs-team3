# Bearbetning av specialisternas feed forward – ResursTeam3

Teamet fick feed forward från fyra specialister: **delivery manager, CTO, UX/UI och kunden**. Delivery managerns och UX-specialistens återkoppling kom den 2 respektive 5 oktober, före kvaldemon. Efter kvaldemon den 22 oktober gjorde vi en omtagsplan utifrån den samlade återkopplingen. Med drygt en vecka kvar valde vi att prioritera **ett sammankopplat och verifierat flöde framför många halvfärdiga delar**.

## Kundens feed forward → vad vi gjorde

| Feed forward | Vad vi gjorde | Vad som är kvar | Var det syns |
| --- | --- | --- | --- |
| **1. Verifiering:** visa vad som är testat, hur och vad testerna bekräftar | Java-testerna ökade från 57 till 71, varav två nya scoringtester för de ändrade tröskelreglerna. Alla sviter är körda (Java 69/69 på `2776f2a` plus 5/5 scoringtester, C 15/15, frontend 121/121). En teststatus redovisar också vad som **inte** är testat. | Testerna körs inte i CI, och hela kedjan testas inte automatiskt. | [Teststatus](../README.md#teststatus) |
| **2. Sammankopplat flöde:** ansökan, kreditbedömning, datalagring och handläggning ska fungera tillsammans | Flödet från ansökan till beslut är beskrivet. Handläggaren använder Thymeleaf-sidorna, så att hela flödet går att köra mot riktig data. | React-handläggarvyn är inte kopplad till backend. | [Arbetsflöde](../README.md#arbetsflöde-och-systemstatus), [demoflöde](DEMO_FALLBACK.md#demoflöde) |
| **3. Handläggarens arbetsdag:** lättare att hitta, granska och besluta | REST-API för kö, ärendedetaljer, beslut och dokumentlistor. Varje regel som slår till i bedömningen skrivs i motiveringen. | React-vyn använder inte API:et än, så vinsten når inte handläggaren där. | PR #84, #85 |
| **4. Kundnytta:** spara tid för handläggarna och ge kunderna en tydligare process | Ärendenummer (`RES-2026-0001`) så att kund och handläggare kan prata om samma ärende. Dokumentlistan via API förbereder för dokument i portalen. | Tidsvinsten är inte mätt, e-postnotiser saknas, och dokumentlistan används inte i portalen än. | PR #64, #85, [kända brister](BRISTER_OCH_AVGRANSNINGAR.md) |
| **5. Säkerhet och GDPR:** bättre skydd av personuppgifter och behörigheter | `POST /api/applications` kräver inloggning och rätt org.nr, så ett företag inte kan ansöka i någon annans namn. De nya API:erna kontrollerar inloggning och roll. Databasåtkomsten går genom repositories för att SQL injection inte ska återinföras. Kvarvarande brister är dokumenterade och prioriterade. | Krypteringen och audit-kedjan i C är inte inkopplade. MD5, secrets i konfigurationen och flera behörighetsbrister i de äldre sidorna finns kvar. | PR #83, #84, #85, [kända brister](BRISTER_OCH_AVGRANSNINGAR.md) |

## CTO:ns feed forward → vad vi gjorde

CTO:n tyckte att vi hade identifierat relevanta och verkliga säkerhetsrisker, särskilt SQL injection, och att den lagerindelade arkitekturen är bra ur ett säkerhetsperspektiv. Den viktigaste kritiken var att bli **mer riskorienterade**: fokusera på de 3–5 viktigaste riskerna i stället för många tekniska detaljer.

| CTO:ns punkt | Vad vi gjorde | Vad som är kvar |
| --- | --- | --- |
| 1. Använd OWASP Top 10 som checklista | Alla tio OWASP-kategorier är kartlagda mot kända brister, inklusive beroenden (A06) och SSRF (A10) ([tabell](BRISTER_OCH_AVGRANSNINGAR.md#koppling-till-owasp-top-10-2021)) | Ingen fullständig säkerhetsgranskning eller penetrationstest; ingen automatisk beroendegranskning |
| 2. Var konsekventa med separation of concerns i ny kod | Alla nya REST-controllers går via service-lagret och rör inte repositories direkt | `requireCompanyId` är duplicerad i två controllers ([B4](BRISTER_OCH_AVGRANSNINGAR.md#b4-requirecompanyid-är-duplicerad-i-två-controllers)) |
| 3. Överväg integrationstester | Luckan redovisas öppet i teststatus | Inga integrationstester är skrivna |
| 4. Teknisk garanti för att BankID-mocken inte hamnar i produktion | Mocken är utbruten till `BankIdService` med tydligt gränssnitt; dubblerad kontroll borttagen (`6ed6aa0`) | Ingen miljöstyrd spärr eller CI-kontroll stoppar mocken i produktion |
| 5. Garantier mot att framtida kod återinför SQL injection | Controllerna bygger ingen SQL; all databasåtkomst är samlad i repository-lagret och parametriserad. Mönstret är beskrivet i README | Ingen automatisk kontroll (t.ex. statisk analys) av ny kod |
| 6. MD5 är olämpligt för lösenord | Dokumenterat som kritisk brist | Byte till bcrypt/Argon2id/scrypt med salt och migrering av befintliga lösenord |
| 7. Strategi för secrets och nycklar | Genomgång: databasuppgifter ligger i klartext i `application.properties` och `docker-compose.yml` | Ingen central secrets-hantering; lösenordet finns i git-historiken |
| 8. Break-glass-scenario | – | Inga regler finns ([native-moduler](BRISTER_OCH_AVGRANSNINGAR.md#native-moduler--byggt-men-inte-inkopplat)) |
| 9. Nyckelrotation och omkryptering | – | Ingen nyckelhantering, rotation eller plan för komprometterad nyckel |
| 10. Sökning på krypterad data | Krypteringen är medvetet inte inkopplad | Måste lösas i designen innan kryptering kopplas in |
| 11. Tänk utifrån CIA | *Integritet:* saknat kassaflöde bedöms inte längre som noll (PR #63), ansökan kan inte skickas i annat företags namn (PR #83), signerad audit-kedja byggd. *Konfidentialitet:* behörighetsbrister kartlagda | *Tillgänglighet* är minst bearbetad: ingen backup-/återställningsplan, filer i `/tmp/uploads` |
| 12. Fokusera presentationen på 3–5 risker: risk, konsekvens, sannolikhet, åtgärd, kvarvarande risk | De fem viktigaste riskerna redovisas med just den strukturen ([tabell](BRISTER_OCH_AVGRANSNINGAR.md#de-fem-viktigaste-riskerna)) | – |

## UX/UI-specialistens feed forward → vad vi gjorde

Källa: inspelad återkoppling ("UX-feedforward Resurs 3", Loom), 2026-10-05 – före kvaldemon. Huvudbudskapet: handläggarvyn är mer utvecklad än användarvyn, men casets största problem är att **kunden står mitt i ett köp och väntar på besked**. Användaren ska veta var ärendet är, varför det är där och vad hen kan göra åt det.

| UX-synpunkt | Vad vi gjorde | Vad som är kvar |
| --- | --- | --- |
| 1. Statustidslinje med steg och tidsuppskattning; visa **varför** ansökan gick till manuell granskning | Java `StatusService` bygger statussteg med tidsuppskattning (testat i `StatusServiceTest`). React visar status och motivering (`decisionReason`) för riktiga ansökningar, och prototypen har en tidslinje med tider (`applicationProgress.ts`). | Tidslinjen visas bara för testdata i React; inga tidsstämplar per steg; motiveringen visas som oformaterad text |
| 2. Automatisk företagsvalidering, steg för steg | Guiden slår upp organisationsnumret och visar registrering, F-skatt och moms var för sig, med företagsnamnet ifyllt | Bygger på ett mockat register; adress saknas i datamodellen; backendens `CompanyValidationService` ger ett samlat resultat |
| 3. Vid misslyckad validering: säg vad, varför, och ge val | Orsaken visas (t.ex. likvidation, inaktivt, hittas inte) | Inga vägar vidare (försök igen, ladda upp dokument, kontakta kundtjänst) |
| 4. Genomtänkt kompletteringsflöde | Dokumentkategorier och tillåtna filformat i Mina handlingar; statussteget "Komplettering krävs"; i Java går ärendet tillbaka till granskning när årsredovisning laddas upp | Uppladdningen i React når inte backend; ingen maxstorlek eller förhandsgranskning; den äldre uppladdningen saknar filtyps- och ägarkontroll |
| 5. Visa kunden krav och utfall i siffror ("kravet är 0,20, ni nådde 0,14") | Prototypen förklarar varje nyckeltal med krav och utfall (`outcomeExplanation.ts`) | Fungerar bara för testdata; backend returnerar motiveringen som prosatext ([F5](BRISTER_OCH_AVGRANSNINGAR.md#f5-frontendens-kopia-av-scoringreglerna-har-gamla-gränser)) |
| 6. Handläggarvyn: vårt krav bredvid kundens utfall | Prototypens granskningspanel listar nyckeltal och flaggor var för sig | Java-backoffice visar en svårläst textrad; kräver strukturerad scoringdata från backend |
| 7. Läsbar auditlogg: vad, när och varför | Prototypen visar händelser med läsbara etiketter | Den riktiga loggen är en JSON-sträng i en textkolumn |

**Slutsats:** mycket av UX-återkopplingen är prototypat i React, men mot testdata, eftersom React-handläggarvyn inte är kopplad till backend ([F2](BRISTER_OCH_AVGRANSNINGAR.md#f2-inskickade-ansökningar-når-inte-react-handläggarvyn)). Den största återstående ändringen är att låta kreditbedömningen returnera **strukturerad data** (krav och utfall per nyckeltal) i stället för prosatext. Det löser punkt 5, 6 och 7 samtidigt.

## Delivery managerns feed forward → vad vi gjorde

Källa: inspelad återkoppling, 2026-10-02 – före kvaldemon. Helhetsintrycket var övervägande positivt: de **funktionella kraven är på plats** och demon fungerade. Han lyfte kravnedbrytningen, öppenheten om återstående arbete i GitHub och tidsuppdelningen. Det som återstår är de **icke-funktionella kraven**: testning, integration och skala.

| Synpunkt | Vad vi gjorde | Vad som är kvar |
| --- | --- | --- |
| Icke-funktionella krav: testning och integration återstår | Testning och integration prioriterades framför ny funktionalitet i omtagsplanen. Java-testerna ökade från 57 till 71, och alla sviter är körda | Inga integrationstester, inga tester i CI, och React-handläggarvyn är inte kopplad till backend |
| En liten andel var klar i GitHub – bli färdig i tid | Omtagsplanen begränsade omfånget till ett sammankopplat flöde | 20 av 34 issues stängda (59 %) den 4 november. Flera öppna issues är genomförda i koden men inte stängda, t.ex. #46 (ärendenummer), #20 (formulär mot REST-API), #28 (Java-gränssnitt mot C) och #29 (tester för native-moduler) |
| Avvikelser ska redovisas | Allt som inte blev klart redovisas i [kända brister](BRISTER_OCH_AVGRANSNINGAR.md) och i omtagsplanens utfall nedan | – |
| Säkerhet och regulatoriska krav är projektets kritiska risker | Sammanfaller med CTO:ns återkoppling; riskerna är prioriterade och kopplade till OWASP Top 10 | MD5, secrets i konfigurationen, okrypterad PII och GDPR-kartläggning är identifierade men inte åtgärdade |
| Skalbarhet: många användare och ansökningar parallellt ska testas | Redovisas som avgränsning i stället för att vara outtalad | Ingen belastnings- eller samtidighetstestning; ärendenumret kan krocka vid samtidiga inskick |
| Affärskravet: handläggaren ska kunna hjälpa kunden snabbt och visuellt | Java-backoffice uppfyller kravet mot riktig data | React-handläggarvyn gör det inte än (mockdata) |
| Vart tar besluten vägen efter handläggaren? | Lagt till som uttalad avgränsning: beslutet arkiveras och hanteras vidare i bankens egna system | – |

## Omtagsplanen och utfallet

| Område | Planerat | Utfall |
| --- | --- | --- |
| Backend 1 | API för att hämta, granska och besluta om ansökningar | ✅ Klart (PR #84, #85) |
| Frontend 1 | Koppla React-backoffice till riktig data | ❌ Inte klart; React-backoffice är kvar som prototyp |
| Frontend 2 | Testa och förbättra handläggarens arbetsflöde och felhantering | ❌ Inte påbörjat: React-handläggarvyn har inte ändrats efter kvaldemon och saknar tester |
| Backend 2 | Koppla in audit-kedjan från C-modulen | ❌ Inte klart; modulen är byggd och testad men inte inkopplad |
| Test/CI | Tester i GitHub Actions, test av hela kedjan, fler scoringtester | ⚠️ Delvis: fler backendtester och en mall för manuellt test av hela kedjan (ej ifylld), två nya scoringtester, men inget i CI |
| Dokumentation | Flödesbeskrivning och verifieringstabell | ✅ Klart ([arbetsflöde](../README.md#arbetsflöde-och-systemstatus), [teststatus](../README.md#teststatus)) |

**Medvetet bortvalt:** riktig BankID och e-post (kräver externa avtal – tydligt märkta mockar), PDF-parsning (manuell granskning), full PII-kryptering i databasen (kräver datamigrering), samt Spring Security, bcrypt och pagination (dokumenterade som kända brister). Se [beslutsloggen](BESLUTSLOGG.md#prioriteringar-i-omtagsplanen).

## Vad vi ändrade på vägen

Vi hann inte koppla ihop React-backoffice med API:et. Handläggaren använder därför Thymeleaf-sidorna i leveransen, så att hela flödet ändå går att köra mot riktig data. Under slutskedet lade vi tiden på att beskriva läget korrekt, i stället för att påbörja fler delar som inte skulle hinna bli klara.


