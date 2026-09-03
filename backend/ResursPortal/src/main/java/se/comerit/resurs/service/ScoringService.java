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

        ScoringContext context = new ScoringContext();

        // 1. Grundläggande finansiella nyckeltal
        double soliditet =
                evaluateSoliditetRule(
                        egetKapital,
                        totaltKapital,
                        context
                );

        double likviditetsgrad =
                evaluateLiquidityRule(
                        omsattningstillgangar,
                        kortfristigaSkulder,
                        context
                );

        double skuldsattningsgrad =
                evaluateDebtRatioRule(
                        totalaSkulder,
                        egetKapital,
                        context
                );

        double rorelsemarginal =
                evaluateOperatingMarginRule(
                        rorelseresultat,
                        nettoomsattning,
                        context
                );

        // 2. Övriga grundregler
        evaluateGeneralRiskRules(
                egetKapital,
                rorelseresultat,
                nettoomsattning,
                requestedAmount,
                soliditet,
                likviditetsgrad,
                totalaSkulder,
                context
        );

        // 3. Branschbedömning
        evaluateIndustryRule(
                soliditet,
                bransch,
                context
        );

        // 4. Kassaflöde och räntetäckning
        double kassaflodeKvot =
                evaluateCashFlowRules(
                        operativtKassaflode,
                        investeringsKassaflode,
                        totalaSkulder,
                        nettoomsattning,
                        context
                );

        evaluateInterestCoverageRule(
                rorelseresultat,
                ranteKostnader,
                context
        );

        // 5. Kombinationsrisker
        evaluateCombinationRisks(
                soliditet,
                likviditetsgrad,
                skuldsattningsgrad,
                rorelseresultat,
                kassaflodeKvot,
                egetKapital,
                nettoomsattning,
                requestedAmount,
                context
        );

        // 6. Slutligt beslut
        return buildFinalResult(context);
    }


    // =========================================================
    // SOLIDITET
    // =========================================================

    private double evaluateSoliditetRule(
            double egetKapital,
            double totaltKapital,
            ScoringContext context) {

        double soliditet =
                calculateSoliditet(egetKapital, totaltKapital);

        context.scoringLog.append("soliditet=")
                .append(String.format("%.2f", soliditet));

        if (soliditet < 0.20) {

            context.hardReject = true;
            context.creditScore -= 40;

            context.decisionReason.append(
                    String.format(
                            "AVSLAG: Soliditet %.2f. Miniminivå: 0.20. ",
                            soliditet
                    )
            );

            context.scoringLog.append(" [REJECT]");

        } else if (soliditet < 0.25) {

            context.flagCount++;
            context.creditScore -= 20;

            context.decisionReason.append(
                    String.format(
                            "VARNING: Soliditet %.2f. Rekommenderad nivå: minst 0.25. ",
                            soliditet
                    )
            );

            context.scoringLog.append(" [FLAGGED]");

        } else {

            context.creditScore += 5;

            context.decisionReason.append(
                    String.format(
                            "Soliditet %.2f uppfyller kravet. ",
                            soliditet
                    )
            );

            context.scoringLog.append(" [OK]");
        }

        return soliditet;
    }


    // =========================================================
    // LIKVIDITET
    // =========================================================

    private double evaluateLiquidityRule(
            double omsattningstillgangar,
            double kortfristigaSkulder,
            ScoringContext context) {

        double likviditetsgrad =
                calculateLiquidity(
                        omsattningstillgangar,
                        kortfristigaSkulder
                );

        context.scoringLog.append(", likviditetsgrad=")
                .append(String.format("%.2f", likviditetsgrad));

        if (likviditetsgrad < 1.0) {

            context.flagCount++;
            context.creditScore -= 15;

            context.decisionReason.append(
                    String.format(
                            "VARNING: Likviditetsgrad %.2f. Miniminivå: 1.0. ",
                            likviditetsgrad
                    )
            );

            context.scoringLog.append(" [FLAGGED]");

        } else if (likviditetsgrad >= 2.0) {

            context.creditScore += 10;

            context.decisionReason.append(
                    String.format(
                            "Likviditetsgrad %.2f är god. ",
                            likviditetsgrad
                    )
            );

            context.scoringLog.append(" [GOOD]");

        } else {

            context.decisionReason.append(
                    String.format(
                            "Likviditetsgrad %.2f är godkänd. ",
                            likviditetsgrad
                    )
            );

            context.scoringLog.append(" [OK]");
        }

        return likviditetsgrad;
    }


    // =========================================================
    // SKULDSÄTTNING
    // =========================================================

    private double evaluateDebtRatioRule(
            double totalaSkulder,
            double egetKapital,
            ScoringContext context) {

        double skuldsattningsgrad =
                calculateDebtRatio(
                        totalaSkulder,
                        egetKapital
                );

        context.scoringLog.append(", skuldsättningsgrad=")
                .append(String.format("%.2f", skuldsattningsgrad));

        if (skuldsattningsgrad > 3.0) {

            context.hardReject = true;
            context.creditScore -= 35;

            context.decisionReason.append(
                    String.format(
                            "AVSLAG: Skuldsättningsgrad %.2f. Maxnivå: 3.0. ",
                            skuldsattningsgrad
                    )
            );

            context.scoringLog.append(" [REJECT]");

        } else if (skuldsattningsgrad > 2.0) {

            context.flagCount++;
            context.creditScore -= 15;

            context.decisionReason.append(
                    String.format(
                            "VARNING: Skuldsättningsgrad %.2f. Rekommenderad nivå: högst 2.0. ",
                            skuldsattningsgrad
                    )
            );

            context.scoringLog.append(" [FLAGGED]");

        } else {

            context.creditScore += 5;

            context.decisionReason.append(
                    String.format(
                            "Skuldsättningsgrad %.2f är godkänd. ",
                            skuldsattningsgrad
                    )
            );

            context.scoringLog.append(" [OK]");
        }

        return skuldsattningsgrad;
    }


    // =========================================================
    // RÖRELSEMARGINAL
    // =========================================================

    private double evaluateOperatingMarginRule(
            double rorelseresultat,
            double nettoomsattning,
            ScoringContext context) {

        double rorelsemarginal =
                calculateOperatingMargin(
                        rorelseresultat,
                        nettoomsattning
                );

        context.scoringLog.append(", rörelsemarginal=")
                .append(String.format("%.2f", rorelsemarginal));

        if (rorelsemarginal < 0.02) {

            context.flagCount++;
            context.creditScore -= 10;

            context.decisionReason.append(
                    String.format(
                            "VARNING: Rörelsemarginal %.2f%%. Rekommenderad nivå: minst 2%%. ",
                            rorelsemarginal * 100
                    )
            );

            context.scoringLog.append(" [FLAGGED]");

        } else if (rorelsemarginal >= 0.10) {

            context.creditScore += 8;

            context.decisionReason.append(
                    String.format(
                            "Rörelsemarginal %.2f%% är god. ",
                            rorelsemarginal * 100
                    )
            );

            context.scoringLog.append(" [GOOD]");

        } else {

            context.decisionReason.append(
                    String.format(
                            "Rörelsemarginal %.2f%% är godkänd. ",
                            rorelsemarginal * 100
                    )
            );

            context.scoringLog.append(" [OK]");
        }

        return rorelsemarginal;
    }


    // =========================================================
    // ÖVRIGA RISKRREGLER
    // =========================================================

    private void evaluateGeneralRiskRules(
            double egetKapital,
            double rorelseresultat,
            double nettoomsattning,
            BigDecimal requestedAmount,
            double soliditet,
            double likviditetsgrad,
            double totalaSkulder,
            ScoringContext context) {

        // Negativt eget kapital
        if (egetKapital < 0) {

            context.hardReject = true;
            context.creditScore -= 50;

            context.decisionReason.append(
                    "AVSLAG: Negativt eget kapital. "
            );

            context.scoringLog.append(
                    ", negativt_eget_kapital [REJECT]"
            );
        }

        // Stor kredit
        if (requestedAmount.compareTo(
                new BigDecimal("5000000")) > 0) {

            context.flagCount++;
            context.creditScore -= 10;

            context.decisionReason.append(
                    "VARNING: Kreditbelopp över 5 000 000 kr kräver manuell granskning. "
            );

            context.scoringLog.append(
                    ", storkredit [FLAGGED]"
            );
        }

        // Låg omsättning
        if (nettoomsattning < 500000) {

            context.flagCount++;
            context.creditScore -= 7;

            context.decisionReason.append(
                    "VARNING: Nettoomsättning under 500 000 kr. "
            );

            context.scoringLog.append(
                    ", låg_omsättning [FLAGGED]"
            );
        }

        // Negativt rörelseresultat
        if (rorelseresultat < 0) {

            context.flagCount++;
            context.creditScore -= 12;

            context.decisionReason.append(
                    "VARNING: Negativt rörelseresultat. "
            );

            context.scoringLog.append(
                    ", negativt_rörelseresultat [FLAGGED]"
            );
        }

        // Stor kredit + låg soliditet
        if (soliditet < 0.30
                && requestedAmount.compareTo(
                new BigDecimal("1000000")) > 0) {

            context.flagCount++;
            context.creditScore -= 12;

            context.decisionReason.append(
                    "VARNING: Kreditbelopp över 1 000 000 kr med soliditet under 0.30. "
            );

            context.scoringLog.append(
                    ", storkredit_soliditet [FLAGGED]"
            );
        }

        // Likviditet nära gränsen
        if (likviditetsgrad < 1.2
                && likviditetsgrad >= 1.0) {

            context.flagCount++;
            context.creditScore -= 8;

            context.decisionReason.append(
                    String.format(
                            "VARNING: Likviditetsgrad %.2f är nära minimigränsen 1.2. ",
                            likviditetsgrad
                    )
            );

            context.scoringLog.append(
                    ", likviditet_marginal [FLAGGED]"
            );
        }

        // Skulder mot omsättning
        if (totalaSkulder > nettoomsattning * 2) {

            context.flagCount++;
            context.creditScore -= 10;

            context.decisionReason.append(
                    "VARNING: Totala skulder överstiger dubbla nettoomsättningen. "
            );

            context.scoringLog.append(
                    ", skulder_vs_omsattning [FLAGGED]"
            );
        }
    }


    // =========================================================
    // BRANSCH
    // =========================================================

    private void evaluateIndustryRule(
            double soliditet,
            String bransch,
            ScoringContext context) {

        double branschFaktor =
                getBranschFaktor(bransch);

        double branschJusteradSoliditetGrans =
                0.20 * branschFaktor;

        context.scoringLog.append(", bransch=")
                .append(
                        bransch == null || bransch.isEmpty()
                                ? "OKÄND"
                                : bransch
                )
                .append("(faktor=")
                .append(String.format("%.2f", branschFaktor))
                .append(")");

        if (soliditet < branschJusteradSoliditetGrans) {

            context.flagCount++;
            context.creditScore -= 8;

            context.decisionReason.append(
                    String.format(
                            "VARNING: Soliditet %.2f understiger branschjusterad gräns %.2f för %s. ",
                            soliditet,
                            branschJusteradSoliditetGrans,
                            bransch
                    )
            );

            context.scoringLog.append(
                    ", bransch_soliditet [FLAGGED]"
            );
        }
    }


    // =========================================================
    // KASSAFLÖDE
    // =========================================================

    private double evaluateCashFlowRules(
            double operativtKassaflode,
            double investeringsKassaflode,
            double totalaSkulder,
            double nettoomsattning,
            ScoringContext context) {

        double kassaflodeKvot =
                calculateCashFlowRatio(
                        operativtKassaflode,
                        totalaSkulder
                );

        context.scoringLog.append(", kassaflödeskvot=")
                .append(String.format("%.3f", kassaflodeKvot));

        if (kassaflodeKvot < 0) {

            context.hardReject = true;
            context.creditScore -= 30;

            context.decisionReason.append(
                    String.format(
                            "AVSLAG: Negativt operativt kassaflöde, kvot %.3f. ",
                            kassaflodeKvot
                    )
            );

            context.scoringLog.append(" [REJECT]");

        } else if (kassaflodeKvot < 0.05) {

            context.flagCount++;
            context.creditScore -= 12;

            context.decisionReason.append(
                    String.format(
                            "VARNING: Kassaflödeskvot %.3f understiger 0.05. ",
                            kassaflodeKvot
                    )
            );

            context.scoringLog.append(" [FLAGGED]");

        } else if (kassaflodeKvot < 0.08) {

            context.flagCount++;
            context.creditScore -= 6;

            context.decisionReason.append(
                    String.format(
                            "VARNING: Kassaflödeskvot %.3f understiger rekommenderad nivå 0.08. ",
                            kassaflodeKvot
                    )
            );

            context.scoringLog.append(" [FLAGGED]");

        } else {

            context.creditScore += 5;

            context.decisionReason.append(
                    String.format(
                            "Kassaflödeskvot %.3f är godkänd. ",
                            kassaflodeKvot
                    )
            );

            context.scoringLog.append(" [OK]");
        }

        // Investeringskassaflöde
        if (investeringsKassaflode
                < -nettoomsattning * 0.3) {

            context.flagCount++;
            context.creditScore -= 4;

            context.decisionReason.append(
                    String.format(
                            "VARNING: Högt negativt investeringskassaflöde %.0f kr. ",
                            investeringsKassaflode
                    )
            );

            context.scoringLog.append(
                    ", inv_kassaflode [FLAGGED]"
            );
        }

        return kassaflodeKvot;
    }


    // =========================================================
    // RÄNTETÄCKNING
    // =========================================================

    private void evaluateInterestCoverageRule(
            double rorelseresultat,
            double ranteKostnader,
            ScoringContext context) {

        double ranteTackningsgrad =
                calculateInterestCoverage(
                        rorelseresultat,
                        ranteKostnader
                );

        context.scoringLog.append(", ränteTäckning=")
                .append(
                        String.format(
                                "%.2f",
                                ranteTackningsgrad
                        )
                );

        if (ranteTackningsgrad < 1.5) {

            context.hardReject = true;
            context.creditScore -= 35;

            context.decisionReason.append(
                    String.format(
                            "AVSLAG: Räntetäckningsgrad %.2f understiger 1.5. ",
                            ranteTackningsgrad
                    )
            );

            context.scoringLog.append(" [REJECT]");

        } else if (ranteTackningsgrad < 2.5) {

            context.flagCount++;
            context.creditScore -= 15;

            context.decisionReason.append(
                    String.format(
                            "VARNING: Räntetäckningsgrad %.2f understiger rekommenderad nivå 2.5. ",
                            ranteTackningsgrad
                    )
            );

            context.scoringLog.append(" [FLAGGED]");

        } else if (ranteTackningsgrad >= 999) {

            context.decisionReason.append(
                    "Räntetäckningsgrad ej tillämplig eftersom räntekostnad saknas. "
            );

            context.scoringLog.append(" [N/A]");

        } else {

            context.creditScore += 8;

            context.decisionReason.append(
                    String.format(
                            "Räntetäckningsgrad %.2f är godkänd. ",
                            ranteTackningsgrad
                    )
            );

            context.scoringLog.append(" [OK]");
        }
    }


    // =========================================================
    // KOMBINATIONSRISKER
    // =========================================================

    private void evaluateCombinationRisks(
            double soliditet,
            double likviditetsgrad,
            double skuldsattningsgrad,
            double rorelseresultat,
            double kassaflodeKvot,
            double egetKapital,
            double nettoomsattning,
            BigDecimal requestedAmount,
            ScoringContext context) {

        // Soliditet + skuldsättning
        if (soliditet < 0.25
                && skuldsattningsgrad > 2.5) {

            context.flagCount++;
            context.creditScore -= 18;

            context.decisionReason.append(
                    "VARNING: Kombination av låg soliditet och hög skuldsättning. "
            );

            context.scoringLog.append(
                    ", kombinationsrisk_soliditet_skuld [FLAGGED]"
            );
        }

        // Likviditet + negativt resultat
        if (likviditetsgrad < 1.0
                && rorelseresultat < 0) {

            context.hardReject = true;
            context.creditScore -= 40;

            context.decisionReason.append(
                    "AVSLAG: Dålig likviditet kombinerat med negativt rörelseresultat. "
            );

            context.scoringLog.append(
                    ", kombinationsrisk_likviditet_resultat [REJECT]"
            );
        }

        // Kreditbelopp mot omsättning
        if (requestedAmount.doubleValue()
                > nettoomsattning) {

            context.flagCount++;
            context.creditScore -= 8;

            context.decisionReason.append(
                    "VARNING: Kreditbelopp överstiger årsomsättningen. "
            );

            context.scoringLog.append(
                    ", kredit_vs_omsattning [FLAGGED]"
            );
        }

        // Eget kapital mot kredit
        if (requestedAmount.doubleValue() > 0
                && egetKapital
                / requestedAmount.doubleValue() < 0.3) {

            context.flagCount++;
            context.creditScore -= 10;

            context.decisionReason.append(
                    "VARNING: Eget kapital täcker mindre än 30% av kreditbeloppet. "
            );

            context.scoringLog.append(
                    ", eget_kapital_vs_kredit [FLAGGED]"
            );
        }

        // Kassaflöde + skuldsättning
        if (kassaflodeKvot < 0.05
                && skuldsattningsgrad > 2.0) {

            context.flagCount++;
            context.creditScore -= 12;

            context.decisionReason.append(
                    "VARNING: Kombinationsrisk kassaflöde och skuldsättning. "
            );

            context.scoringLog.append(
                    ", kassaflode_skuld_kombination [FLAGGED]"
            );
        }
    }


    // =========================================================
    // SLUTLIGT BESLUT
    // =========================================================

    private ScoringResult buildFinalResult(
            ScoringContext context) {

        String decision;
        String status;

        if (context.hardReject) {

            decision = "REJECTED";
            status = "REJECTED";

            context.decisionReason.insert(
                    0,
                    "=== ANSÖKAN AVSLAGEN === "
            );

        } else if (context.flagCount > 0) {

            decision = "REVIEW";
            status = "UNDER_REVIEW";

            context.decisionReason.insert(
                    0,
                    "=== MANUELL GRANSKNING === Antal varningsflaggor: "
                            + context.flagCount
                            + ". "
            );

        } else {

            decision = "APPROVED";
            status = "APPROVED";

            context.decisionReason.insert(
                    0,
                    "=== ANSÖKAN GODKÄND === "
            );
        }

        context.scoringLog.append(", kreditPoäng=")
                .append(context.creditScore);

        return new ScoringResult(
                decision,
                status,
                context.decisionReason.toString(),
                context.scoringLog.toString(),
                context.flagCount,
                context.creditScore
        );
    }


    // =========================================================
    // BERÄKNINGSMETODER
    // =========================================================

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

        return omsattningstillgangar
                / kortfristigaSkulder;
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

        return rorelseresultat
                / nettoomsattning;
    }


    private double calculateCashFlowRatio(
            double operativtKassaflode,
            double totalaSkulder) {

        if (totalaSkulder == 0) {
            return 0;
        }

        return operativtKassaflode
                / totalaSkulder;
    }


    private double calculateInterestCoverage(
            double rorelseresultat,
            double ranteKostnader) {

        if (ranteKostnader <= 0) {
            return 999;
        }

        return rorelseresultat
                / ranteKostnader;
    }


    private double getBranschFaktor(
            String bransch) {

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


    // =========================================================
    // INTERN STATE FÖR EN SCORING
    // =========================================================

    private static class ScoringContext {

        private final StringBuilder scoringLog =
                new StringBuilder();

        private final StringBuilder decisionReason =
                new StringBuilder();

        private int flagCount = 0;

        private boolean hardReject = false;

        private int creditScore = 100;
    }
}