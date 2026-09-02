package se.comerit.resurs.service;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class ScoringService {

    public ScoringResult evaluate(
            double egetKapital,
            double totaltKapital,
            double omsattningstillgangar,
            double kortfristigaSkulder,
            double totalaSkulder,
            double rorelseresultat,
            double nettoomsattning,
            BigDecimal requestedAmount,
            double operativtKassaflode,
            double investeringsKassaflode,
            double ranteKostnader,
            String bransch) {

        StringBuilder scoringLog = new StringBuilder();
        StringBuilder decisionReason = new StringBuilder();

        int flagCount = 0;
        boolean hardReject = false;
        int creditScore = 100;

        // SOLIDITET
        double soliditet = calculateSoliditet(egetKapital, totaltKapital);

        scoringLog.append("soliditet=")
                .append(String.format("%.2f", soliditet));

        if (soliditet < 0.20) {
            hardReject = true;
            creditScore -= 40;

            decisionReason.append(
                    String.format(
                            "AVSLAG: Soliditet %.2f. Miniminivå: 0.20. ",
                            soliditet
                    )
            );

            scoringLog.append(" [REJECT]");

        } else if (soliditet < 0.25) {
            flagCount++;
            creditScore -= 20;

            decisionReason.append(
                    String.format(
                            "VARNING: Soliditet %.2f. Rekommenderad nivå: minst 0.25. ",
                            soliditet
                    )
            );

            scoringLog.append(" [FLAGGED]");

        } else {
            creditScore += 5;

            decisionReason.append(
                    String.format(
                            "Soliditet %.2f uppfyller kravet. ",
                            soliditet
                    )
            );

            scoringLog.append(" [OK]");
        }

        // LIKVIDITET
        double likviditetsgrad =
                calculateLiquidity(omsattningstillgangar, kortfristigaSkulder);

        scoringLog.append(", likviditetsgrad=")
                .append(String.format("%.2f", likviditetsgrad));

        if (likviditetsgrad < 1.0) {
            flagCount++;
            creditScore -= 15;

            decisionReason.append(
                    String.format(
                            "VARNING: Likviditetsgrad %.2f. Miniminivå: 1.0. ",
                            likviditetsgrad
                    )
            );

            scoringLog.append(" [FLAGGED]");

        } else if (likviditetsgrad >= 2.0) {
            creditScore += 10;

            decisionReason.append(
                    String.format(
                            "Likviditetsgrad %.2f är god. ",
                            likviditetsgrad
                    )
            );

            scoringLog.append(" [GOOD]");

        } else {
            decisionReason.append(
                    String.format(
                            "Likviditetsgrad %.2f är godkänd. ",
                            likviditetsgrad
                    )
            );

            scoringLog.append(" [OK]");
        }

        // SKULDSÄTTNING
        double skuldsattningsgrad =
                calculateDebtRatio(totalaSkulder, egetKapital);

        scoringLog.append(", skuldsättningsgrad=")
                .append(String.format("%.2f", skuldsattningsgrad));

        if (skuldsattningsgrad > 3.0) {
            hardReject = true;
            creditScore -= 35;

            decisionReason.append(
                    String.format(
                            "AVSLAG: Skuldsättningsgrad %.2f. Maxnivå: 3.0. ",
                            skuldsattningsgrad
                    )
            );

            scoringLog.append(" [REJECT]");

        } else if (skuldsattningsgrad > 2.0) {
            flagCount++;
            creditScore -= 15;

            decisionReason.append(
                    String.format(
                            "VARNING: Skuldsättningsgrad %.2f. Rekommenderad nivå: högst 2.0. ",
                            skuldsattningsgrad
                    )
            );

            scoringLog.append(" [FLAGGED]");

        } else {
            creditScore += 5;

            decisionReason.append(
                    String.format(
                            "Skuldsättningsgrad %.2f är godkänd. ",
                            skuldsattningsgrad
                    )
            );

            scoringLog.append(" [OK]");
        }

        // RÖRELSEMARGINAL
        double rorelsemarginal =
                calculateOperatingMargin(rorelseresultat, nettoomsattning);

        scoringLog.append(", rörelsemarginal=")
                .append(String.format("%.2f", rorelsemarginal));

        if (rorelsemarginal < 0.02) {
            flagCount++;
            creditScore -= 10;

            decisionReason.append(
                    String.format(
                            "VARNING: Rörelsemarginal %.2f%%. Rekommenderad nivå: minst 2%%. ",
                            rorelsemarginal * 100
                    )
            );

            scoringLog.append(" [FLAGGED]");

        } else if (rorelsemarginal >= 0.10) {
            creditScore += 8;

            decisionReason.append(
                    String.format(
                            "Rörelsemarginal %.2f%% är god. ",
                            rorelsemarginal * 100
                    )
            );

            scoringLog.append(" [GOOD]");

        } else {
            decisionReason.append(
                    String.format(
                            "Rörelsemarginal %.2f%% är godkänd. ",
                            rorelsemarginal * 100
                    )
            );

            scoringLog.append(" [OK]");
        }

        // NEGATIVT EGET KAPITAL
        if (egetKapital < 0) {
            hardReject = true;
            creditScore -= 50;
            decisionReason.append("AVSLAG: Negativt eget kapital. ");
            scoringLog.append(", negativt_eget_kapital [REJECT]");
        }

        // STOR KREDIT
        if (requestedAmount.compareTo(new BigDecimal("5000000")) > 0) {
            flagCount++;
            creditScore -= 10;

            decisionReason.append(
                    "VARNING: Kreditbelopp över 5 000 000 kr kräver manuell granskning. "
            );

            scoringLog.append(", storkredit [FLAGGED]");
        }

        // LÅG OMSÄTTNING
        if (nettoomsattning < 500000) {
            flagCount++;
            creditScore -= 7;

            decisionReason.append(
                    "VARNING: Nettoomsättning under 500 000 kr. "
            );

            scoringLog.append(", låg_omsättning [FLAGGED]");
        }

        // NEGATIVT RÖRELSERESULTAT
        if (rorelseresultat < 0) {
            flagCount++;
            creditScore -= 12;

            decisionReason.append(
                    "VARNING: Negativt rörelseresultat. "
            );

            scoringLog.append(", negativt_rörelseresultat [FLAGGED]");
        }
        // EXTRA SOLIDITET VID STOR KREDIT
        if (soliditet < 0.30
                && requestedAmount.compareTo(new BigDecimal("1000000")) > 0) {

            flagCount++;
            creditScore -= 12;

            decisionReason.append(
                    "VARNING: Kreditbelopp över 1 000 000 kr med soliditet under 0.30. "
            );

            scoringLog.append(", storkredit_soliditet [FLAGGED]");
        }


// LIKVIDITET NÄRA MINIMIGRÄNS
        if (likviditetsgrad < 1.2 && likviditetsgrad >= 1.0) {

            flagCount++;
            creditScore -= 8;

            decisionReason.append(
                    String.format(
                            "VARNING: Likviditetsgrad %.2f är nära minimigränsen 1.2. ",
                            likviditetsgrad
                    )
            );

            scoringLog.append(", likviditet_marginal [FLAGGED]");
        }


// SKULDER MOT OMSÄTTNING
        if (totalaSkulder > nettoomsattning * 2) {

            flagCount++;
            creditScore -= 10;

            decisionReason.append(
                    "VARNING: Totala skulder överstiger dubbla nettoomsättningen. "
            );

            scoringLog.append(", skulder_vs_omsattning [FLAGGED]");
        }


// BRANSCHFAKTOR
        double branschFaktor = getBranschFaktor(bransch);

        double branschJusteradSoliditetGrans =
                0.20 * branschFaktor;

        scoringLog.append(", bransch=")
                .append(bransch == null || bransch.isEmpty()
                        ? "OKÄND"
                        : bransch)
                .append("(faktor=")
                .append(String.format("%.2f", branschFaktor))
                .append(")");

        if (soliditet < branschJusteradSoliditetGrans) {

            flagCount++;
            creditScore -= 8;

            decisionReason.append(
                    String.format(
                            "VARNING: Soliditet %.2f understiger branschjusterad gräns %.2f för %s. ",
                            soliditet,
                            branschJusteradSoliditetGrans,
                            bransch
                    )
            );

            scoringLog.append(", bransch_soliditet [FLAGGED]");
        }


// KASSAFLÖDESKVOT
        double kassaflodeKvot =
                calculateCashFlowRatio(
                        operativtKassaflode,
                        totalaSkulder
                );

        scoringLog.append(", kassaflödeskvot=")
                .append(String.format("%.3f", kassaflodeKvot));

        if (kassaflodeKvot < 0) {

            hardReject = true;
            creditScore -= 30;

            decisionReason.append(
                    String.format(
                            "AVSLAG: Negativt operativt kassaflöde, kvot %.3f. ",
                            kassaflodeKvot
                    )
            );

            scoringLog.append(" [REJECT]");

        } else if (kassaflodeKvot < 0.05) {

            flagCount++;
            creditScore -= 12;

            decisionReason.append(
                    String.format(
                            "VARNING: Kassaflödeskvot %.3f understiger 0.05. ",
                            kassaflodeKvot
                    )
            );

            scoringLog.append(" [FLAGGED]");

        } else if (kassaflodeKvot < 0.08) {

            flagCount++;
            creditScore -= 6;

            decisionReason.append(
                    String.format(
                            "VARNING: Kassaflödeskvot %.3f understiger rekommenderad nivå 0.08. ",
                            kassaflodeKvot
                    )
            );

            scoringLog.append(" [FLAGGED]");

        } else {

            creditScore += 5;

            decisionReason.append(
                    String.format(
                            "Kassaflödeskvot %.3f är godkänd. ",
                            kassaflodeKvot
                    )
            );

            scoringLog.append(" [OK]");
        }


// INVESTERINGSKASSAFLÖDE
        if (investeringsKassaflode < -nettoomsattning * 0.3) {

            flagCount++;
            creditScore -= 4;

            decisionReason.append(
                    String.format(
                            "VARNING: Högt negativt investeringskassaflöde %.0f kr. ",
                            investeringsKassaflode
                    )
            );

            scoringLog.append(", inv_kassaflode [FLAGGED]");
        }


// RÄNTETÄCKNING
        double ranteTackningsgrad =
                calculateInterestCoverage(
                        rorelseresultat,
                        ranteKostnader
                );

        scoringLog.append(", ränteTäckning=")
                .append(String.format("%.2f", ranteTackningsgrad));

        if (ranteTackningsgrad < 1.5) {

            hardReject = true;
            creditScore -= 35;

            decisionReason.append(
                    String.format(
                            "AVSLAG: Räntetäckningsgrad %.2f understiger 1.5. ",
                            ranteTackningsgrad
                    )
            );

            scoringLog.append(" [REJECT]");

        } else if (ranteTackningsgrad < 2.5) {

            flagCount++;
            creditScore -= 15;

            decisionReason.append(
                    String.format(
                            "VARNING: Räntetäckningsgrad %.2f understiger rekommenderad nivå 2.5. ",
                            ranteTackningsgrad
                    )
            );

            scoringLog.append(" [FLAGGED]");

        } else if (ranteTackningsgrad >= 999) {

            decisionReason.append(
                    "Räntetäckningsgrad ej tillämplig eftersom räntekostnad saknas. "
            );

            scoringLog.append(" [N/A]");

        } else {

            creditScore += 8;

            decisionReason.append(
                    String.format(
                            "Räntetäckningsgrad %.2f är godkänd. ",
                            ranteTackningsgrad
                    )
            );

            scoringLog.append(" [OK]");
        }


// KOMBINATIONSRISK: SOLIDITET + SKULDSÄTTNING
        if (soliditet < 0.25 && skuldsattningsgrad > 2.5) {

            flagCount++;
            creditScore -= 18;

            decisionReason.append(
                    "VARNING: Kombination av låg soliditet och hög skuldsättning. "
            );

            scoringLog.append(
                    ", kombinationsrisk_soliditet_skuld [FLAGGED]"
            );
        }


// KOMBINATIONSRISK: LIKVIDITET + NEGATIVT RESULTAT
        if (likviditetsgrad < 1.0 && rorelseresultat < 0) {

            hardReject = true;
            creditScore -= 40;

            decisionReason.append(
                    "AVSLAG: Dålig likviditet kombinerat med negativt rörelseresultat. "
            );

            scoringLog.append(
                    ", kombinationsrisk_likviditet_resultat [REJECT]"
            );
        }


// KREDITBELOPP MOT OMSÄTTNING
        if (requestedAmount.doubleValue() > nettoomsattning) {

            flagCount++;
            creditScore -= 8;

            decisionReason.append(
                    "VARNING: Kreditbelopp överstiger årsomsättningen. "
            );

            scoringLog.append(
                    ", kredit_vs_omsattning [FLAGGED]"
            );
        }


// EGET KAPITAL MOT KREDIT
        if (requestedAmount.doubleValue() > 0
                && egetKapital / requestedAmount.doubleValue() < 0.3) {

            flagCount++;
            creditScore -= 10;

            decisionReason.append(
                    "VARNING: Eget kapital täcker mindre än 30% av kreditbeloppet. "
            );

            scoringLog.append(
                    ", eget_kapital_vs_kredit [FLAGGED]"
            );
        }


// KASSAFLÖDE + SKULDSÄTTNING
        if (kassaflodeKvot < 0.05
                && skuldsattningsgrad > 2.0) {

            flagCount++;
            creditScore -= 12;

            decisionReason.append(
                    "VARNING: Kombinationsrisk kassaflöde och skuldsättning. "
            );

            scoringLog.append(
                    ", kassaflode_skuld_kombination [FLAGGED]"
            );
        }

        // SLUTLIGT BESLUT
        String decision;
        String status;

        if (hardReject) {
            decision = "REJECTED";
            status = "REJECTED";

            decisionReason.insert(
                    0,
                    "=== ANSÖKAN AVSLAGEN === "
            );

        } else if (flagCount > 0) {
            decision = "REVIEW";
            status = "UNDER_REVIEW";

            decisionReason.insert(
                    0,
                    "=== MANUELL GRANSKNING === Antal varningsflaggor: "
                            + flagCount + ". "
            );

        } else {
            decision = "APPROVED";
            status = "APPROVED";

            decisionReason.insert(
                    0,
                    "=== ANSÖKAN GODKÄND === "
            );
        }

        scoringLog.append(", kreditPoäng=")
                .append(creditScore);

        return new ScoringResult(
                decision,
                status,
                decisionReason.toString(),
                scoringLog.toString(),
                flagCount,
                creditScore
        );
    }

    private double calculateSoliditet(
            double egetKapital,
            double totaltKapital) {

        if (totaltKapital == 0) {
            return 0;
        }

        return egetKapital / totaltKapital;
    }

    private double calculateLiquidity(
            double omsattningstillgangar,
            double kortfristigaSkulder) {

        if (kortfristigaSkulder == 0) {
            return 0;
        }

        return omsattningstillgangar / kortfristigaSkulder;
    }

    private double calculateDebtRatio(
            double totalaSkulder,
            double egetKapital) {

        if (egetKapital == 0) {
            return 0;
        }

        return totalaSkulder / egetKapital;
    }

    private double calculateOperatingMargin(
            double rorelseresultat,
            double nettoomsattning) {

        if (nettoomsattning == 0) {
            return 0;
        }

        return rorelseresultat / nettoomsattning;
    }
    private double calculateCashFlowRatio(
            double operativtKassaflode,
            double totalaSkulder) {

        if (totalaSkulder == 0) {
            return 0;
        }

        return operativtKassaflode / totalaSkulder;
    }

    private double calculateInterestCoverage(
            double rorelseresultat,
            double ranteKostnader) {

        if (ranteKostnader <= 0) {
            return 999;
        }

        return rorelseresultat / ranteKostnader;
    }

    private double getBranschFaktor(String bransch) {

        if (bransch == null) {
            return 1.0;
        }

        switch (bransch) {
            case "BYGG":
                return 0.85;
            case "HANDEL":
                return 1.1;
            case "IT":
                return 1.2;
            case "FASTIGHET":
                return 0.9;
            case "TILLVERKNING":
                return 0.95;
            case "TRANSPORT":
                return 0.88;
            case "RESTAURANG":
                return 0.80;
            case "FINANS":
                return 1.15;
            case "VÅRD":
                return 1.05;
            case "UTBILDNING":
                return 1.0;
            default:
                return 1.0;
        }
    }
}