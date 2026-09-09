package se.comerit.resurs.service;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Service
public class CreditScoringService {
    public CreditScoringResult calculate(CreditScoringInput input) {
        // ===========================================================
        // SCORING ENGINE — giant if-else chain, all inline, no service
        // Magic numbers scattered inconsistently throughout
        // See docs/known-bugs.md for the full list of issues
        // ===========================================================
        StringBuilder scoringLog = new StringBuilder();
        StringBuilder decisionReason = new StringBuilder();
        int flagCount = 0;
        boolean hardReject = false;

        // Kreditpoäng — separat poängsystem, börjar på 100
        // Beräknas men används ALDRIG i beslutslogiken nedan — bara i scoringLog
        // TODO: koppla kreditPoang till faktiskt beslut
        int kreditPoang = 100;

        // --- Soliditet (eget_kapital / totalt_kapital) ---
        // Magic number 0.25 used here, but 0.20 used below — inconsistency intentional
        double soliditet = 0.0;
        if (totaltKapital != 0) {
            soliditet = egetKapital / totaltKapital;
        }
        scoringLog.append("soliditet=").append(String.format("%.2f", soliditet));

        if (soliditet < 0.20) {
            // Hard reject threshold — magic number
            hardReject = true;
            decisionReason.append("AVSLAG: Soliditet för låg (").append(String.format("%.2f", soliditet))
                    .append(" < 0.20 gräns). ");
            scoringLog.append(" [REJECT]");
            kreditPoang -= 40;
        } else if (soliditet < 0.25) {
            // Flag threshold — different magic number from above
            flagCount++;
            decisionReason.append("VARNING: Soliditet låg (").append(String.format("%.2f", soliditet))
                    .append(", rekommenderad miniminivå 0.25). ");
            scoringLog.append(" [FLAGGED]");
            kreditPoang -= 20;
        } else {
            decisionReason.append("Soliditet OK (").append(String.format("%.2f", soliditet)).append("). ");
            scoringLog.append(" [OK]");
            kreditPoang += 5;
        }

        scoringLog.append(", ");

        // --- Likviditetsgrad (omsättningstillgångar / kortfristiga_skulder) ---
        double likviditetsgrad = 0.0;
        if (kortfristigaSkulder != 0) {
            likviditetsgrad = omsattningstillgangar / kortfristigaSkulder;
        }
        scoringLog.append("likviditetsgrad=").append(String.format("%.2f", likviditetsgrad));

        if (likviditetsgrad < 1.0) {
            flagCount++;
            decisionReason.append("VARNING: Likviditetsgrad under 1.0 (").append(String.format("%.2f", likviditetsgrad))
                    .append("). Kortfristiga skulder överstiger omsättningstillgångar. ");
            scoringLog.append(" [FLAGGED]");
            kreditPoang -= 15;
        } else if (likviditetsgrad >= 2.0) {
            decisionReason.append("Likviditetsgrad god (").append(String.format("%.2f", likviditetsgrad)).append("). ");
            scoringLog.append(" [GOOD]");
            kreditPoang += 10;
        } else {
            decisionReason.append("Likviditetsgrad godkänd (").append(String.format("%.2f", likviditetsgrad)).append("). ");
            scoringLog.append(" [OK]");
        }

        scoringLog.append(", ");

        // --- Skuldsättningsgrad (totala_skulder / eget_kapital) ---
        double skuldsattningsgrad = 0.0;
        if (egetKapital != 0) {
            skuldsattningsgrad = totalaSkulder / egetKapital;
        }
        scoringLog.append("skuldsättningsgrad=").append(String.format("%.2f", skuldsattningsgrad));

        if (skuldsattningsgrad > 3.0) {
            // Hard reject — magic number 3.0
            hardReject = true;
            decisionReason.append("AVSLAG: Skuldsättningsgrad för hög (").append(String.format("%.2f", skuldsattningsgrad))
                    .append(" > 3.0). ");
            scoringLog.append(" [REJECT]");
            kreditPoang -= 35;
        } else if (skuldsattningsgrad > 2.0) {
            // Flag — different magic number than reject threshold
            flagCount++;
            decisionReason.append("VARNING: Skuldsättningsgrad hög (").append(String.format("%.2f", skuldsattningsgrad))
                    .append(", rekommenderas under 2.0). ");
            scoringLog.append(" [FLAGGED]");
            kreditPoang -= 15;
        } else {
            decisionReason.append("Skuldsättningsgrad OK (").append(String.format("%.2f", skuldsattningsgrad)).append("). ");
            scoringLog.append(" [OK]");
            kreditPoang += 5;
        }

        scoringLog.append(", ");

        // --- Rörelseresultatmarginal (rörelseresultat / nettoomsättning) ---
        double rorelsemarginal = 0.0;
        if (nettoomsattning != 0) {
            rorelsemarginal = rorelseresultat / nettoomsattning;
        }
        scoringLog.append("rörelsemarginal=").append(String.format("%.2f", rorelsemarginal));

        if (rorelsemarginal < 0.02) {
            // Flag — magic number 0.02 (2%)
            flagCount++;
            decisionReason.append("VARNING: Rörelseresultatmarginal låg (")
                    .append(String.format("%.2f", rorelsemarginal * 100)).append("%, rekommenderas över 2%). ");
            scoringLog.append(" [FLAGGED]");
            kreditPoang -= 10;
        } else if (rorelsemarginal >= 0.10) {
            decisionReason.append("Rörelseresultatmarginal god (")
                    .append(String.format("%.2f", rorelsemarginal * 100)).append("%). ");
            scoringLog.append(" [GOOD]");
            kreditPoang += 8;
        } else {
            decisionReason.append("Rörelseresultatmarginal godkänd (")
                    .append(String.format("%.2f", rorelsemarginal * 100)).append("%). ");
            scoringLog.append(" [OK]");
        }

        // Extra soliditet-kontroll med ANNAN tröskel (0.30) — inkonsekvent med ovan
        // TODO: bestäm en tröskel och håll dig till den
        if (soliditet < 0.30 && requestedAmount.compareTo(new BigDecimal("1000000")) > 0) {
            flagCount++;
            decisionReason.append("VARNING: Stor kreditbelopp med soliditet under 0.30 – extra granskning rekommenderas. ");
            scoringLog.append(", storkredit_soliditet [FLAGGED]");
            kreditPoang -= 12;
        }

        // Extra likviditets-check med 1.2-tröskel (ännu ett magic number)
        if (likviditetsgrad < 1.2 && likviditetsgrad >= 1.0) {
            flagCount++;
            decisionReason.append("VARNING: Likviditetsgrad nära minimigräns (")
                    .append(String.format("%.2f", likviditetsgrad)).append(" < 1.2). ");
            scoringLog.append(", likviditet_marginal [FLAGGED]");
            kreditPoang -= 8;
        }

        // Kreditbeloppskontroll — ännu ett magic number (5 000 000)
        if (requestedAmount.compareTo(new BigDecimal("5000000")) > 0) {
            flagCount++;
            decisionReason.append("VARNING: Kreditbelopp överstiger 5 000 000 kr — kräver manuell granskning. ");
            scoringLog.append(", storkredit [FLAGGED]");
            kreditPoang -= 10;
        }

        // Negativt eget kapital — ej täckt av soliditet-formeln om totalt_kapital också är negativt
        if (egetKapital < 0) {
            hardReject = true;
            decisionReason.append("AVSLAG: Negativt eget kapital. ");
            scoringLog.append(", negativt_eget_kapital [REJECT]");
            kreditPoang -= 50;
        }

        // Nettoomsättning-kontroll — liten verksamhet flaggas
        if (nettoomsattning < 500000) {
            flagCount++;
            decisionReason.append("VARNING: Låg nettoomsättning (under 500 000 kr). ");
            scoringLog.append(", låg_omsättning [FLAGGED]");
            kreditPoang -= 7;
        }

        // Rörelseresultat negativt — extra flagg utöver marginalen
        if (rorelseresultat < 0) {
            flagCount++;
            decisionReason.append("VARNING: Negativt rörelseresultat. ");
            scoringLog.append(", negativt_rörelseresultat [FLAGGED]");
            kreditPoang -= 12;
        }

        // Totala skulder > nettoomsättning — inget eget threshold, bara ett av många checks
        if (totalaSkulder > nettoomsattning * 2) {
            flagCount++;
            decisionReason.append("VARNING: Totala skulder överstiger dubbla nettoomsättningen. ");
            scoringLog.append(", skulder_vs_omsattning [FLAGGED]");
            kreditPoang -= 10;
        }

        // Kortfristiga skulder > omsättningstillgångar (redundant med likviditetsgrad-check ovan)
        if (kortfristigaSkulder > omsattningstillgangar) {
            // Already counted in likviditetsgrad, but re-checked here — duplicate logic
            decisionReason.append("Not: Kortfristiga skulder överstiger omsättningstillgångar. ");
        }

        // ===========================================================
        // BRANSCHKORREKTIONSFAKTOR
        // Mappar branschkod till justerings-multiplikator för soliditetsgräns
        // Används BARA för ett av soliditet-checkarna nedan — inkonsekvent med övriga
        // TODO: applicera branschfaktor konsekvent på alla nyckeltal
        // ===========================================================
        double branschFaktor = 1.0; // default — okänd bransch
        if ("BYGG".equals(bransch)) {
            branschFaktor = 0.85; // magic number — byggbranschen har lägre soliditetskrav
        } else if ("HANDEL".equals(bransch)) {
            branschFaktor = 1.1; // magic number — handel har högre marginaltolerens
        } else if ("IT".equals(bransch)) {
            branschFaktor = 1.2; // magic number — IT-bolag värderas annorlunda
        } else if ("FASTIGHET".equals(bransch)) {
            branschFaktor = 0.9; // magic number — fastighetsbolag har annorlunda kapitalstruktur
        } else if ("TILLVERKNING".equals(bransch)) {
            branschFaktor = 0.95; // magic number — tillverkning kräver mer kapital
        } else if ("TRANSPORT".equals(bransch)) {
            branschFaktor = 0.88; // magic number — transport = kapitalintensiv
        } else if ("RESTAURANG".equals(bransch)) {
            branschFaktor = 0.80; // magic number — restaurang = hög konkursrisk
        } else if ("FINANS".equals(bransch)) {
            branschFaktor = 1.15; // magic number — finansbolag reglerade annorlunda
        } else if ("VÅRD".equals(bransch)) {
            branschFaktor = 1.05; // magic number — vård = stabil sektor
        } else if ("UTBILDNING".equals(bransch)) {
            branschFaktor = 1.0; // magic number — utbildning = neutral
        } else {
            branschFaktor = 1.0; // default fallback
        }
        scoringLog.append(", bransch=").append(bransch.isEmpty() ? "OKÄND" : bransch)
                .append("(faktor=").append(String.format("%.2f", branschFaktor)).append(")");

        // Branschjusterad soliditetskontroll — BARA detta check använder branschFaktor
        // Inkonsekvent: soliditet-check ovan använder fast 0.20/0.25, inte branschjusterad
        double branschJusteradSoliditetGrans = 0.20 * branschFaktor; // inkonsekvent med 0.25 ovan
        if (soliditet < branschJusteradSoliditetGrans) {
            flagCount++;
            decisionReason.append("VARNING: Soliditet understiger branschjusterad gräns (")
                    .append(String.format("%.2f", branschJusteradSoliditetGrans))
                    .append(" för bransch ").append(bransch).append("). ");
            scoringLog.append(", bransch_soliditet [FLAGGED]");
            kreditPoang -= 8;
        }

        // ===========================================================
        // HISTORISK JÄMFÖRELSE (MOCK)
        // TODO: hämta från DB — för nu hårdkodar vi branschsnitt
        // Dessa värden borde ligga i en konfigurationstabell i databasen
        // copy from stackoverflow: https://stackoverflow.com/questions/1234567 (fiktiv URL)
        // ===========================================================
        Map<String, Double> branschSnittSoliditet = new HashMap<>();
        branschSnittSoliditet.put("BYGG", 0.22);
        branschSnittSoliditet.put("HANDEL", 0.28);
        branschSnittSoliditet.put("IT", 0.45);
        branschSnittSoliditet.put("FASTIGHET", 0.18);
        branschSnittSoliditet.put("TILLVERKNING", 0.30);
        branschSnittSoliditet.put("TRANSPORT", 0.20);
        branschSnittSoliditet.put("RESTAURANG", 0.15);
        branschSnittSoliditet.put("FINANS", 0.35);
        branschSnittSoliditet.put("VÅRD", 0.38);
        branschSnittSoliditet.put("UTBILDNING", 0.32);

        Map<String, Double> branschSnittSkuldsattning = new HashMap<>();
        branschSnittSkuldsattning.put("BYGG", 2.8);
        branschSnittSkuldsattning.put("HANDEL", 1.9);
        branschSnittSkuldsattning.put("IT", 0.8);
        branschSnittSkuldsattning.put("FASTIGHET", 3.5);
        branschSnittSkuldsattning.put("TILLVERKNING", 1.5);
        branschSnittSkuldsattning.put("TRANSPORT", 2.2);
        branschSnittSkuldsattning.put("RESTAURANG", 2.5);
        branschSnittSkuldsattning.put("FINANS", 1.2);
        branschSnittSkuldsattning.put("VÅRD", 0.9);
        branschSnittSkuldsattning.put("UTBILDNING", 1.1);

        Map<String, Double> branschSnittMarginal = new HashMap<>();
        branschSnittMarginal.put("BYGG", 0.04);
        branschSnittMarginal.put("HANDEL", 0.03);
        branschSnittMarginal.put("IT", 0.15);
        branschSnittMarginal.put("FASTIGHET", 0.12);
        branschSnittMarginal.put("TILLVERKNING", 0.06);
        branschSnittMarginal.put("TRANSPORT", 0.03);
        branschSnittMarginal.put("RESTAURANG", 0.05);
        branschSnittMarginal.put("FINANS", 0.18);
        branschSnittMarginal.put("VÅRD", 0.07);
        branschSnittMarginal.put("UTBILDNING", 0.08);

        // Jämför mot branschsnitt — bara om bransch är känd
        if (branschSnittSoliditet.containsKey(bransch)) {
            double snittSoliditet = branschSnittSoliditet.get(bransch);
            if (soliditet < snittSoliditet * 0.75) { // magic number 0.75 — "75% av branschsnitt"
                flagCount++;
                decisionReason.append("VARNING: Soliditet betydligt under branschsnitt för ")
                        .append(bransch).append(" (snitt=").append(String.format("%.2f", snittSoliditet))
                        .append("). ");
                scoringLog.append(", under_branschsnitt_soliditet [FLAGGED]");
                kreditPoang -= 6;
            }
        }

        if (branschSnittMarginal.containsKey(bransch)) {
            double snittMarginal = branschSnittMarginal.get(bransch);
            if (rorelsemarginal < snittMarginal * 0.5) { // magic number 0.5 — inkonsekvent med 0.75 ovan
                flagCount++;
                decisionReason.append("VARNING: Rörelsemarginal under 50% av branschsnitt för ")
                        .append(bransch).append(". ");
                scoringLog.append(", under_branschsnitt_marginal [FLAGGED]");
                kreditPoang -= 5;
            }
        }

        // ===========================================================
        // KASSAFLÖDESANALYS
        // Tröskelvärde 0.05 används här men 0.08 används i check nedan — inkonsekvent
        // TODO: bestäm ett enda tröskelvärde för kassaflödeskvot
        // ===========================================================
        double kassaflodeKvot = 0.0;
        if (totalaSkulder != 0) {
            kassaflodeKvot = operativtKassaflode / totalaSkulder;
        }
        scoringLog.append(", kassaflödeskvot=").append(String.format("%.3f", kassaflodeKvot));

        if (kassaflodeKvot < 0) {
            // Negativt operativt kassaflöde — hård avvisning
            hardReject = true;
            decisionReason.append("AVSLAG: Negativt operativt kassaflöde (kassaflödeskvot=")
                    .append(String.format("%.3f", kassaflodeKvot)).append("). ");
            scoringLog.append(" [REJECT]");
            kreditPoang -= 30;
        } else if (kassaflodeKvot < 0.05) {
            // magic number 0.05 — men 0.08 används i check nedanför
            flagCount++;
            decisionReason.append("VARNING: Kassaflödeskvot låg (").append(String.format("%.3f", kassaflodeKvot))
                    .append(" < 0.05). ");
            scoringLog.append(" [FLAGGED]");
            kreditPoang -= 12;
        } else if (kassaflodeKvot < 0.08) {
            // inkonsekvent med 0.05 ovan — borde vara samma gräns
            flagCount++;
            decisionReason.append("VARNING: Kassaflödeskvot under rekommenderad nivå (")
                    .append(String.format("%.3f", kassaflodeKvot)).append(" < 0.08, inkonsekvent med gräns 0.05 ovan). ");
            scoringLog.append(" [FLAGGED]");
            kreditPoang -= 6;
        } else {
            decisionReason.append("Kassaflödeskvot OK (").append(String.format("%.3f", kassaflodeKvot)).append("). ");
            scoringLog.append(" [OK]");
            kreditPoang += 5;
        }

        // Investeringskassaflöde — negativt är ofta normalt men flaggas ändå
        if (investeringsKassaflode < -nettoomsattning * 0.3) { // magic number 0.3
            flagCount++;
            decisionReason.append("VARNING: Högt negativt investeringskassaflöde (")
                    .append(String.format("%.0f", investeringsKassaflode)).append(" kr). ");
            scoringLog.append(", inv_kassaflode [FLAGGED]");
            kreditPoang -= 4;
        }

        // ===========================================================
        // RÄNTETÄCKNINGSGRAD (rörelseresultat / räntekostnader)
        // Edge case: negativa räntekostnader hanteras med magic number 999
        // ===========================================================
        double ranteTackningsgrad;
        if (ranteKostnader < 0) {
            ranteTackningsgrad = 999; // edge case — negativa räntekostnader, sätter till 999 vilket aldrig triggar
        } else if (ranteKostnader == 0) {
            ranteTackningsgrad = 999; // inga räntekostnader = inget problem, sätt till 999
        } else {
            ranteTackningsgrad = rorelseresultat / ranteKostnader;
        }
        scoringLog.append(", ränteTäckning=").append(String.format("%.2f", ranteTackningsgrad));

        if (ranteTackningsgrad < 1.5) {
            // Hard reject — magic number 1.5
            hardReject = true;
            decisionReason.append("AVSLAG: Räntetäckningsgrad under 1.5 (")
                    .append(String.format("%.2f", ranteTackningsgrad)).append("). Rörelseresultat täcker ej räntekostnader. ");
            scoringLog.append(" [REJECT]");
            kreditPoang -= 35;
        } else if (ranteTackningsgrad < 2.5) {
            // Flag — magic number 2.5, inkonsekvent med hardReject-gränsen 1.5
            flagCount++;
            decisionReason.append("VARNING: Räntetäckningsgrad låg (").append(String.format("%.2f", ranteTackningsgrad))
                    .append(" < 2.5, rekommenderas minst 2.5). ");
            scoringLog.append(" [FLAGGED]");
            kreditPoang -= 15;
        } else if (ranteTackningsgrad >= 999) {
            // Ingen räntekostnad — poäng-neutral, loggas bara
            decisionReason.append("Räntetäckningsgrad ej tillämplig (inga räntekostnader). ");
            scoringLog.append(" [N/A]");
        } else {
            decisionReason.append("Räntetäckningsgrad OK (").append(String.format("%.2f", ranteTackningsgrad)).append("). ");
            scoringLog.append(" [OK]");
            kreditPoang += 8;
        }

        // ===========================================================
        // KOMBINATIONSRISKREGLER
        // Kombinerar flera nyckeltal — varje check är separat if-sats inline
        // ===========================================================

        // Kombination 1: låg soliditet OCH hög skuldsättning — "dubbel riskindikator"
        if (soliditet < 0.25 && skuldsattningsgrad > 2.5) {
            // dubbel riskindikator — magic numbers inkonsekvent med individuella checks ovan
            flagCount++;
            decisionReason.append("VARNING: Dubbel riskindikator — låg soliditet (")
                    .append(String.format("%.2f", soliditet)).append(") kombinerat med hög skuldsättning (")
                    .append(String.format("%.2f", skuldsattningsgrad)).append("). ");
            scoringLog.append(", kombinationsrisk_soliditet_skuld [FLAGGED]");
            kreditPoang -= 18;
        }

        // Kombination 2: dålig likviditet OCH negativt rörelseresultat — omedelbar avvisning
        if (likviditetsgrad < 1.0 && rorelseresultat < 0) {
            hardReject = true;
            decisionReason.append("AVSLAG: Kombinationsrisk — likviditetsgrad under 1.0 samt negativt rörelseresultat. ");
            scoringLog.append(", kombinationsrisk_likviditet_resultat [REJECT]");
            kreditPoang -= 40;
        }

        // Kombination 3: kreditbelopp överstiger årsoms — flaggas
        if (requestedAmount.doubleValue() > nettoomsattning) {
            flagCount++;
            decisionReason.append("VARNING: Kreditbelopp överstiger årsoms. (")
                    .append(String.format("%.0f", requestedAmount.doubleValue()))
                    .append(" kr > ").append(String.format("%.0f", nettoomsattning)).append(" kr). ");
            scoringLog.append(", kredit_vs_omsattning [FLAGGED]");
            kreditPoang -= 8;
        }

        // Kombination 4: eget kapital i förhållande till kreditbelopp
        if (requestedAmount.doubleValue() > 0 && egetKapital / requestedAmount.doubleValue() < 0.3) {
            // magic number 0.3 — eget kapital borde vara minst 30% av kreditbelopp
            flagCount++;
            decisionReason.append("VARNING: Eget kapital täcker mindre än 30% av kreditbeloppet. ");
            scoringLog.append(", eget_kapital_vs_kredit [FLAGGED]");
            kreditPoang -= 10;
        }

        // Kombination 5: OBS — felaktig formel, borde vara (totalaSkulder / nettoomsattning) men det funkar i de flesta fall
        // OBS: detta är fel, borde vara totalaSkulder / nettoomsattning men det funkar i de flesta fall
        double skuldTackningsFel = (totalaSkulder + kortfristigaSkulder) / (nettoomsattning + 1); // +1 för att undvika division med noll
        if (skuldTackningsFel > 2.0) { // magic number 2.0 — inkonsekvent med skuldsättningsgrad-check ovan
            flagCount++;
            decisionReason.append("VARNING: Skuldbörda hög relativt omsättning (kombinationscheck). ");
            scoringLog.append(", skuld_omsattning_kombination [FLAGGED]");
            kreditPoang -= 7;
        }

        // Kombination 6: kassaflöde + skuldsättning
        if (kassaflodeKvot < 0.05 && skuldsattningsgrad > 2.0) {
            // inkonsekvent — 0.05 här men 0.08 användes ovan
            flagCount++;
            decisionReason.append("VARNING: Kombinationsrisk kassaflöde + skuldsättning. ");
            scoringLog.append(", kassaflode_skuld_kombination [FLAGGED]");
            kreditPoang -= 12;
        }

        // Logga kreditpoäng i scoringLog — men poängen används INTE för beslut
        // TODO: ersätt flagCount-logiken med kreditPoang-baserad tröskel
        scoringLog.append(", kreditPoäng=").append(kreditPoang).append(" (ANVÄNDS EJ I BESLUT)");

        // ===========================================================
        // BESLUT — combine flags and hard rejects
        // ===========================================================
        String decision;
        String status;

        if (hardReject) {
            decision = "REJECTED";
            status = "REJECTED";
            decisionReason.insert(0, "=== ANSÖKAN AVSLAGEN === ");
        } else if (flagCount >= 2) {
            decision = "REVIEW";
            status = "UNDER_REVIEW";
            decisionReason.insert(0, "=== MANUELL GRANSKNING === Antal varningsflaggor: " + flagCount + ". ");
        } else if (flagCount == 1) {
            decision = "REVIEW";
            status = "UNDER_REVIEW";
            decisionReason.insert(0, "=== GRANSKNING REKOMMENDERAS === 1 varningsflagga. ");
        } else {
            decision = "APPROVED";
            status = "APPROVED";
            decisionReason.insert(0, "=== ANSÖKAN GODKÄND === Alla nyckeltal uppfyller krav. ");
        }
        return null;
    }
    public record CreditScoringInput(
            double egetKapital,
            double totaltKapital,
            double omsattningstillgangar,
            double kortfristigaSkulder,
            double totalaSkulder,
            double rorelseresultat,
            double nettoomsattning,
            BigDecimal requestedAmount,
            double operativKassaflode,
            double investeringsKassaflode,
            double ranteKostnader,
            String branch
    ) {}
    public record CreditScoringResult(
            String decision,
            String status,
            String decisionReason,
            String scoringLog,
            int flagCount
    ) {}
}
