
package se.comerit.resurs;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import se.comerit.resurs.controller.ApplicationRestController;
import se.comerit.resurs.controller.ApplicationRestController;

import se.comerit.resurs.dto.CreateApplicationRequest;
import se.comerit.resurs.dto.CreateApplicationResponse;
import se.comerit.resurs.service.ApplicationService;
import se.comerit.resurs.service.ScoringService;

import java.util.Optional;
import se.comerit.resurs.model.Company;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
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
}