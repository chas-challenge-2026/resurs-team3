package se.comerit.resurs.controller;

import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import se.comerit.resurs.controller.BackofficeRestController;
import se.comerit.resurs.dto.DecisionRequest;
import se.comerit.resurs.model.Application;
import se.comerit.resurs.model.Company;
import se.comerit.resurs.service.BackofficeService;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BackofficeRestControllerTest {

    @Mock
    private BackofficeService backofficeService;

    @InjectMocks
    private BackofficeRestController controller;

    private HttpSession caseWorkerSession() {
        HttpSession session = mock(HttpSession.class);
        when(session.getAttribute("userId")).thenReturn(1L);
        when(session.getAttribute("role")).thenReturn("caseWorker");
        return session;
    }

    @Test
    void shouldReturnQueueForCaseWorker() {
        HttpSession session = caseWorkerSession();

        when(backofficeService.getApplicationsUnderReview())
                .thenReturn(List.of(Map.of("id", 10L)));
        when(backofficeService.getRecentDecidedApplications())
                .thenReturn(List.of());

        Map<String, Object> result = controller.getQueue(session);

        assertEquals(List.of(Map.of("id", 10L)), result.get("underReview"));
        assertEquals(List.of(), result.get("recentlyDecided"));
    }

    @Test
    void shouldRejectQueueWhenNotLoggedIn() {
        HttpSession session = mock(HttpSession.class);
        when(session.getAttribute("userId")).thenReturn(null);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.getQueue(session));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatusCode());
        verifyNoInteractions(backofficeService);
    }

    @Test
    void shouldRejectQueueForCompanyRole() {
        HttpSession session = mock(HttpSession.class);
        when(session.getAttribute("userId")).thenReturn(1L);
        when(session.getAttribute("role")).thenReturn("company");

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.getQueue(session));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        verifyNoInteractions(backofficeService);
    }

    @Test
    void shouldReturnNotFoundWhenDecidingUnknownApplication() {
        HttpSession session = caseWorkerSession();

        when(backofficeService.getApplicationById(99L))
                .thenReturn(Optional.empty());

        DecisionRequest request = new DecisionRequest();
        request.setDecision("APPROVED");

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.decide(99L, request, session));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        verify(backofficeService, never())
                .decideApplication(anyLong(), anyString(), anyString(), anyString());
    }

    @Test
    void shouldRejectInvalidDecision() {
        HttpSession session = caseWorkerSession();

        when(backofficeService.getApplicationById(10L))
                .thenReturn(Optional.of(mock(Application.class)));

        DecisionRequest request = new DecisionRequest();
        request.setDecision("KANSKE");

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.decide(10L, request, session));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(backofficeService, never())
                .decideApplication(anyLong(), anyString(), anyString(), anyString());
    }

    @Test
    void shouldDecideApplication() {
        HttpSession session = caseWorkerSession();
        when(session.getAttribute("workerName")).thenReturn("Karin");

        when(backofficeService.getApplicationById(10L))
                .thenReturn(Optional.of(mock(Application.class)));
        when(backofficeService.isValidDecision("APPROVED")).thenReturn(true);

        DecisionRequest request = new DecisionRequest();
        request.setDecision("APPROVED");
        request.setComment("Ser bra ut");

        Map<String, Object> result = controller.decide(10L, request, session);

        assertEquals("APPROVED", result.get("decision"));
        verify(backofficeService)
                .decideApplication(10L, "APPROVED", "Karin", "Ser bra ut");
    }

    @Test
    void shouldReturnApplicationDetail() {
        HttpSession session = caseWorkerSession();

        Application application = mock(Application.class);
        when(application.getId()).thenReturn(10L);
        when(application.getCaseNumber()).thenReturn("RES-2026-0001");

        when(backofficeService.getApplicationById(10L))
                .thenReturn(Optional.of(application));

        Company company = new Company();
        company.setCompanyName("Testbolag AB");
        company.setOrgNumber("556000-1234");

        when(backofficeService.getCompanyForApplication(application))
                .thenReturn(Optional.of(company));
        when(backofficeService.getDocuments(10L))
                .thenReturn(List.of());

        Map<String, Object> result = controller.getApplicationDetail(10L, session);

        assertEquals("RES-2026-0001", result.get("caseNumber"));
        assertEquals(List.of(), result.get("documents"));
    }
}