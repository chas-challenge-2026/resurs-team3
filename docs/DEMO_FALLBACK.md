# Demo och fallback – ResursPortal Team 3

**Syfte:** se till att demon går att genomföra även om något tekniskt fallerar, och att vi bara visar sådant som faktiskt fungerar. Se [README](../README.md) för installation och körning.

> **Grundregel:** React-handläggarvyn visar testdata (`MOCK_CASES`). Handläggaren loggar in via **`/login`** och arbetar i **Java-backoffice** (`/backoffice`) när riktig data ska visas. Säg det tydligt under demon. Se [F2](BRISTER_OCH_AVGRANSNINGAR.md#f2-inskickade-ansökningar-når-inte-react-handläggarvyn).

## Reservplan

| Nivå | När | Vad vi gör |
| --- | --- | --- |
| 1. Stage | Normalläge | Kör demon på https://resurs-team3-dev.team.chas-challenge.comerit.se |
| 2. Lokal Docker | Stage är nere eller långsamt | Starta `cd infra && docker compose up --build` **i förväg** (bygget tar flera minuter) och använd http://localhost:8083. Körs från en dator där bygget fungerar ([I1](BRISTER_OCH_AVGRANSNINGAR.md#i1-dockerfilen-döljer-byggfel--q)). |
| 3. Inspelning / bildspel | Inget fungerar live | Visa inspelningen av flödet eller bildspelet med skärmbilder från varje steg. Byt **direkt**, i stället för att felsöka framför kunden. |
| 4. Tester och kod | Bara koden går att visa | Kör `make test`, `mvn test` och `npm test`, visa [teststatus](../README.md#teststatus) och nyckelkod: `ScoringService.java`, kontrollen av org.nr (PR #83), `creditApplication.api.ts`. Var öppen med [kända brister](BRISTER_OCH_AVGRANSNINGAR.md). |

**Om React krånglar men Java fungerar** kan backend visas direkt: Java-backoffice, eller REST-endpointsen med JSON-svaret (t.ex. `GET /api/applications` som inloggat företag).

### Inspelning och bildspel (nivå 3)

- Materialet tas fram i förväg medan systemet körs, och **inte** samma dag som demon.
- Minst två personer i teamet har filerna lokalt, så att någon annan kan ta över om en dator krånglar.
- Materialet följer samma ordning som livedemon:
  1. Problemet i v1.
  2. En ansökan som godkänns.
  3. En ansökan som får anmärkning och går till granskning.
  4. Handläggarens vy (Java-backoffice).
  5. Skyddet av personuppgifter.

Säg när förinspelat material visas, och vilken commit och vilket datum det kommer från.

### Status för reservplanen

| Nivå | Senast provad | Resultat |
| --- | --- | --- |
| Stage | 2026-11-04, `2776f2a` | Inloggning och läsning fungerar för företag och handläggare; hela flödet är inte provat |
| Lokal Docker | 2026-11-04, `develop` | `docker compose up --build` går igenom och systemet startar. Bygget har inte fungerat på alla datorer, så kör från en dator där det fungerar |
| Inspelning / bildspel | – | Ingen inspelning eller inget bildspel finns i repot |

## Checklista före demon

- [ ] Senaste `develop` är deployad till stage och commit är antecknad.
- [ ] **Ingen push till `develop` strax före demon** – en omdeploy kan påverka stage.
- [ ] Lokal Docker är startad i förväg som reserv.
- [ ] `/portal/index.html` och `/login` öppnas (på stage och lokalt).
- [ ] Två webbläsarprofiler är öppna: en för företaget, en för handläggaren.
- [ ] Hela demoflödet har körts igenom och ärendenumret är antecknat.
- [ ] Inspelning/bildspel finns hos minst två personer och öppnas offline.
- [ ] Ström, laddare, skärmadapter och nätverk är kontrollerade; webbläsaren är zoomad för projektor.

Teamet fördelar rollerna före demon: presentation, körning, tidhållning och beslut om fallback, samt tekniska frågor.

## Demoflöde

Använd **två separata webbläsarprofiler**, t.ex. ett vanligt fönster och ett inkognitofönster. Annars delar företag och handläggare session.

| # | Steg | Var | Vad vi visar/säger |
| --- | --- | --- | --- |
| 1 | **Företag:** logga in med org.nr `556000-1234` (med bindestreck) | `/portal/index.html` | Inloggning kopplad till Java-session. BankID är simulerat. |
| 2 | **Ansökan:** fyll i guiden och ange att kassaflödesanalys saknas | React | Då går ansökan alltid till manuell granskning. Validering per fält; utkastet sparas om man avbryter. |
| 3 | **Signera och skicka** | React | Kontroll av firmatecknare (mock); ansökan sparas i PostgreSQL. |
| 4 | **Kvitto:** visa ärendenumret och att ansökan syns under företagets ansökningar | React `/#/oversikt`, `/#/ansokan/:id` | Riktiga data från `GET /api/applications`. |
| 5 | **Handläggare:** logga in som `karin@resurs.se` / `password123` i den andra profilen | `/login` | – |
| 6 | **Granskning:** öppna ärendet i kön och visa företagsuppgifter, bedömning och historik | `/backoffice` | Motiveringen visar vilka regler som slog till. |
| 7 | **Beslut:** godkänn eller avslå med en kommentar | `/backoffice` | Beslutet sparas i databasen och loggas. |
| 8 | **Resultat:** visa beslutet hos handläggaren och sedan företagets ansökningar i portalen | React | **Ladda inte om sidan** – det loggar ut användaren. Kontrollera i genomkörningen att statusen uppdateras utan omladdning. |
| 9 | *(Valfritt)* React-handläggarvyn | Portalen, inloggad som handläggare | **Säg tydligt att vyn är en prototyp med testdata.** |

`infra/seed.sql` innehåller redan en ansökan i `UNDER_REVIEW`, så kön har något att visa även om steg 1–4 inte hinns med.

## Kända problem under demon

| Problem | Så hanterar vi det |
| --- | --- |
| Handläggarinloggning i React visar mockade ärenden | Logga in på `/login`, inte i portalen, när riktig data ska visas. |
| Omladdning av portalen loggar ut användaren ([F1](BRISTER_OCH_AVGRANSNINGAR.md#f1-sessionen-försvinner-vid-siduppdatering)) | Undvik omladdning, eller logga in igen. |
| Samma webbläsare delar session mellan roller | Använd två profiler. |
| `/portal/` ger 404 | Använd `/portal/index.html`. |
| Org.nr utan bindestreck nekas ([B3](BRISTER_OCH_AVGRANSNINGAR.md#b3-organisationsnummer-utan-bindestreck-nekas)) | Skriv `556000-1234` med bindestreck. |
| Stage innehåller gamla testansökningar, och äldre saknar ärendenummer | Visa den nya ansökan. Databasen på stage kan bara nollställas via techsupport. |
| Prod saknar portalen tills `develop` har mergats till `main` | Demonstrera på stage, eller merga och kontrollera prod först. |
| En omdeploy under demon påverkar stage | Pusha inte till `develop` strax före demon. |
| Ansökan syns inte i Java-kön | Den blev automatiskt `APPROVED`/`REJECTED`: visa den under senaste beslut, eller använd seed-ärendet. |
| Lokalt: `502 Bad Gateway` i Vite eller `:8083` svarar inte | Java-containern är inte uppe: kontrollera `docker compose ps` / `docker compose logs -f app`. Annars nivå 1 eller 3. |
| Lokalt: Docker-bygget misslyckas | Starta med senast byggda image (`docker compose up` utan `--build`). Felet döljs av `-q` i Dockerfilen ([I1](BRISTER_OCH_AVGRANSNINGAR.md#i1-dockerfilen-döljer-byggfel--q)). |
| Lokalt: tom eller trasig databas | `docker compose down -v && docker compose up` (**raderar all lokal data**). |

## Vad vi inte påstår under demon

- Att BankID är riktigt.
- Att React-handläggarvyns ärenden och beslut ligger i databasen.
- Att data är krypterad eller auditloggen signerad i drift.
- Att systemet är testat för många samtidiga användare eller är GDPR-godkänt.
