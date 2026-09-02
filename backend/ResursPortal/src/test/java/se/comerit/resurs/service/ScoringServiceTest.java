package se.comerit.resurs.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ScoringServiceTest {

    private final ScoringService scoringService = new ScoringService();

    @Test
    void shouldApproveWhenFinancialValuesAreHealthy() {

        ScoringResult result = scoringService.evaluate(
                400000,      // egetKapital
                1000000,     // totaltKapital
                500000,      // omsattningstillgangar
                200000,      // kortfristigaSkulder
                500000,      // totalaSkulder
                150000,      // rorelseresultat
                2000000,     // nettoomsattning
                new BigDecimal("500000"),
                100000,      // operativtKassaflode
                0,           // investeringsKassaflode
                50000,       // ranteKostnader
                "IT"
        );

        assertEquals("APPROVED", result.getDecision());
        assertEquals("APPROVED", result.getStatus());
    }
    @Test
    void shouldReviewWhenSoliditetIsLowButNotRejected() {

        ScoringResult result = scoringService.evaluate(
                220000,      // egetKapital -> 22%
                1000000,     // totaltKapital
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
                150000,      // egetKapital -> 15%
                1000000,     // totaltKapital
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
}