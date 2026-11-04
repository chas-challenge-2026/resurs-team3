
package se.comerit.resurs.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ScoringServiceTest {

    private final ScoringService scoringService =
            new ScoringService(new ScoringThresholds(0.20, 0.25));

    @Test
    void shouldApproveWhenFinancialValuesAreHealthy() {

        ScoringResult result = scoringService.evaluate(
                400000,
                1000000,
                500000,
                200000,
                500000,
                150000,
                2000000,
                new BigDecimal("500000"),
                100000,
                0,
                50000,
                "IT"
        );

        assertEquals("APPROVED", result.getDecision());
        assertEquals("APPROVED", result.getStatus());
    }

    @Test
    void shouldReviewWhenSoliditetIsLowButNotRejected() {

        ScoringResult result = scoringService.evaluate(
                220000,
                1000000,
                500000,
                200000,
                300000,
                100000,
                2000000,
                new BigDecimal("500000"),
                100000,
                0,
                50000,
                "IT"
        );

        assertEquals("REVIEW", result.getDecision());
        assertEquals("UNDER_REVIEW", result.getStatus());
    }

    @Test
    void shouldRejectWhenSoliditetIsTooLow() {

        ScoringResult result = scoringService.evaluate(
                150000,
                1000000,
                500000,
                200000,
                300000,
                100000,
                2000000,
                new BigDecimal("500000"),
                100000,
                0,
                50000,
                "IT"
        );

        assertEquals("REJECTED", result.getDecision());
        assertEquals("REJECTED", result.getStatus());
    }

    @Test
    void shouldNotFlagLargeCreditWhenSoliditetIsAboveWarningThreshold() {

        // Soliditet: 28 %
        // Kreditbelopp: 1 100 000 kr
        // Eget kapital / kreditbelopp: över 30 %
        // Okänd bransch ger faktor 1.0.

        ScoringResult result = scoringService.evaluate(
                336000,
                1200000,
                2000000,
                500000,
                300000,
                300000,
                3000000,
                new BigDecimal("1100000"),
                150000,
                0,
                50000,
                "OKÄND"
        );

        assertEquals("APPROVED", result.getDecision());
        assertEquals("APPROVED", result.getStatus());

        assertTrue(
                !result.getDecisionReason().contains("storkredit_soliditet"),
                "Storkreditregeln ska inte flagga soliditet över 25 %."
        );
    }

    @Test
    void shouldFlagIndustryAdjustedSoliditetBelowWarningThresholdTimesIndustryFactor() {

        // Soliditet: 24 %
        // HANDEL har branschfaktor 1.1.
        // Ny gräns: 25 % * 1.1 = 27.5 %.
        // Den tidigare gränsen var 20 % * 1.1 = 22 %.

        ScoringResult result = scoringService.evaluate(
                240000,
                1000000,
                500000,
                200000,
                300000,
                200000,
                2000000,
                new BigDecimal("500000"),
                100000,
                0,
                50000,
                "HANDEL"
        );

        assertEquals("REVIEW", result.getDecision());


        assertTrue(
                result.getDecisionReason().contains("branschjusterad gräns 0,28 för HANDEL"),
                "Branschregeln ska flagga soliditet under den justerade gränsen."
        );
    }
}
