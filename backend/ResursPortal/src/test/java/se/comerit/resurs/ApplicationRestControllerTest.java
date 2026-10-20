
package se.comerit.resurs;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import se.comerit.resurs.controller.ApplicationRestController;
import se.comerit.resurs.dto.ApplicationResponse;
import se.comerit.resurs.dto.CreateApplicationRequest;
import se.comerit.resurs.dto.CreateApplicationResponse;
import se.comerit.resurs.model.Application;
import se.comerit.resurs.model.Company;
import se.comerit.resurs.service.ApplicationService;
import se.comerit.resurs.service.ScoringService;
import jakarta.servlet.http.HttpSession;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApplicationRestControllerTest {

    @Mock
    private ScoringService scoringService;

    @Mock
    private ApplicationService applicationService;

    @InjectMocks
    private ApplicationRestController controller;

    @Test
    void shouldSkipScoringWhenCashFlowStatementIsMissing() {
        CreateApplicationRequest request = new CreateApplicationRequest();
        request.setNoCashFlowStatement(true);

        request.setOrgNumber("5561234567");
        request.setCompanyName("Testbolag AB");
        request.setAuthorizedSignatory("Testperson");
        request.setRequestedAmount(new BigDecimal("100000"));        request.setPurpose("Test");

        when(applicationService.findOrCreateCompany(
                "5561234567", "Testbolag AB", "Testperson"))
                .thenReturn(1L);


        when(applicationService.createApplication(
                anyLong(),
                any(BigDecimal.class),
                anyString(),
                anyString(),
                nullable(String.class),
                anyString(),
                anyString(),
                anyString()))
                .thenReturn(10L);


        when(applicationService.getCaseNumber(10L))
                .thenReturn("RES-2026-0001");
        Company company = new Company();
        company.setCompanyName("Testbolag AB");
        company.setOrgNumber("5561234567");

        when(applicationService.getCompanyById(1L))
                .thenReturn(Optional.of(company));

        CreateApplicationResponse response =
                controller.createApplication(request);

        assertEquals("UNDER_REVIEW", response.getStatus());
        verifyNoInteractions(scoringService);

        verify(applicationService).createApplication(
                eq(1L),
                any(BigDecimal.class),
                eq("Test"),
                eq("UNDER_REVIEW"),
                eq("REVIEW"),
                anyString(),
                anyString(),
                anyString());
    }

    @Test
    void shouldRejectMissingCashFlowValuesWhenStatementExists() {
        CreateApplicationRequest request = new CreateApplicationRequest();
        request.setNoCashFlowStatement(false);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.createApplication(request)
        );

        assertEquals(400, exception.getStatusCode().value());

        verifyNoInteractions(scoringService, applicationService);
    }


    @Test
    void shouldGetApplicationsForLoggedInCompany() {
        HttpSession session = mock(HttpSession.class);

        when(session.getAttribute("userId")).thenReturn(1L);
        when(session.getAttribute("role")).thenReturn("company");
        when(session.getAttribute("companyId")).thenReturn(1L);

        Company company = new Company();
        company.setCompanyName("Testbolag AB");

        when(applicationService.getCompanyById(1L))
                .thenReturn(Optional.of(company));

        Application application = mock(Application.class);

        when(application.getId()).thenReturn(10L);
        when(application.getCaseNumber()).thenReturn("RES-2026-0001");
        when(application.getRequestedAmount())
                .thenReturn(new BigDecimal("100000"));
        when(application.getPurpose()).thenReturn("Test");
        when(application.getStatus()).thenReturn("UNDER_REVIEW");
        when(application.getDecision()).thenReturn("REVIEW");
        when(application.getDecisionReason()).thenReturn("Testorsak");

        when(applicationService.getApplicationsForCompany(1L))
                .thenReturn(List.of(application));

        List<ApplicationResponse> response =
                controller.getApplications(session);

        assertEquals(1, response.size());
        assertEquals("RES-2026-0001", response.get(0).getCaseNumber());
        assertEquals("Testbolag AB", response.get(0).getCompanyName());

        verify(applicationService).getApplicationsForCompany(1L);
    }

    @Test
    void shouldGetSingleApplicationForLoggedInCompany() {
        // Arrange: skapa en inloggad företagssession
        HttpSession session = mock(HttpSession.class);

        when(session.getAttribute("userId")).thenReturn(1L);
        when(session.getAttribute("role")).thenReturn("company");
        when(session.getAttribute("companyId")).thenReturn(1L);

        // Skapa företag
        Company company = new Company();
        company.setCompanyName("Testbolag AB");

        when(applicationService.getCompanyById(1L))
                .thenReturn(Optional.of(company));

        // Skapa en ansökan
        Application application = mock(Application.class);

        when(application.getId()).thenReturn(10L);
        when(application.getCaseNumber()).thenReturn("RES-2026-0001");
        when(application.getRequestedAmount())
                .thenReturn(new BigDecimal("100000"));
        when(application.getPurpose()).thenReturn("Test");
        when(application.getStatus()).thenReturn("UNDER_REVIEW");
        when(application.getDecision()).thenReturn("REVIEW");
        when(application.getDecisionReason()).thenReturn("Testorsak");

        when(applicationService.getApplicationForCompany(10L, 1L))
                .thenReturn(Optional.of(application));

        // Act: hämta ansökan med ID 10
        ApplicationResponse response =
                controller.getApplication(10L, session);

        // Assert: kontrollera svaret
        assertEquals("RES-2026-0001", response.getCaseNumber());
        assertEquals("Testbolag AB", response.getCompanyName());

        verify(applicationService)
                .getApplicationForCompany(10L, 1L);
    }


    @Test
    void shouldNotAllowCompanyToAccessAnotherCompaniesApplication() {
        // Arrange: företag nummer 2 är inloggat
        HttpSession session = mock(HttpSession.class);

        when(session.getAttribute("userId")).thenReturn(2L);
        when(session.getAttribute("role")).thenReturn("company");
        when(session.getAttribute("companyId")).thenReturn(2L);

        // Ansökan med ID 10 tillhör inte företag nummer 2
        when(applicationService.getApplicationForCompany(10L, 2L))
                .thenReturn(Optional.empty());

        // Act + Assert: ansökan ska inte kunna hämtas
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.getApplication(10L, session)
        );

        assertEquals(
                HttpStatus.NOT_FOUND,
                exception.getStatusCode()
        );

        verify(applicationService)
                .getApplicationForCompany(10L, 2L);
    }


    @Test
    void shouldRejectRequestWhenUserIsNotLoggedIn() {
        HttpSession session = mock(HttpSession.class);

        // Ingen inloggad användare
        when(session.getAttribute("userId")).thenReturn(null);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.getApplications(session)
        );

        assertEquals(
                HttpStatus.UNAUTHORIZED,
                exception.getStatusCode()
        );

        verifyNoInteractions(applicationService);
    }


    @Test
    void shouldRejectRequestWhenUserHasWrongRole() {
        HttpSession session = mock(HttpSession.class);

        when(session.getAttribute("userId")).thenReturn(1L);
        when(session.getAttribute("role")).thenReturn("admin");

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.getApplications(session)
        );

        assertEquals(
                HttpStatus.FORBIDDEN,
                exception.getStatusCode()
        );

        verifyNoInteractions(applicationService);
    }




}