package se.comerit.resurs.service;

import org.junit.jupiter.api.Test;
import se.comerit.resurs.repository.ApplicationRepository;
import se.comerit.resurs.repository.DocumentRepository;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class StatusServiceTest {

    private final ApplicationRepository applicationRepository =
            mock(ApplicationRepository.class);

    private final DocumentRepository documentRepository =
            mock(DocumentRepository.class);

    private final StatusService statusService =
            new StatusService(applicationRepository, documentRepository);

    @Test
    void shouldShowReviewAsCurrentWhenApplicationIsUnderReview() {

        List<Map<String, String>> steps =
                statusService.buildStatusSteps("UNDER_REVIEW");

        assertEquals("Granskas", steps.get(2).get("name"));
        assertEquals("CURRENT", steps.get(2).get("status"));

        assertEquals("PENDING", steps.get(3).get("status"));
    }
    @Test
    void shouldShowAdditionalDocumentsAsCurrentWhenDocumentsAreMissing() {

        List<Map<String, String>> steps =
                statusService.buildStatusSteps("PENDING_DOCS");

        assertEquals("Komplettering krävs", steps.get(3).get("name"));
        assertEquals("CURRENT", steps.get(3).get("status"));

        assertEquals("DONE", steps.get(1).get("status"));
        assertEquals("DONE", steps.get(2).get("status"));
    }
    @ParameterizedTest
    @ValueSource(strings = {"APPROVED", "REJECTED"})
    void shouldShowDecisionAsDoneWhenApplicationHasFinalDecision(String status) {

        List<Map<String, String>> steps =
                statusService.buildStatusSteps(status);

        assertEquals("Beslut", steps.get(4).get("name"));
        assertEquals("DONE", steps.get(4).get("status"));
    }
}