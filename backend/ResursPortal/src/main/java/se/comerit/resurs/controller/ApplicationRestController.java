package se.comerit.resurs.controller;

import org.springframework.web.bind.annotation.RestController;
import se.comerit.resurs.service.ApplicationService;
import se.comerit.resurs.service.ScoringService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import se.comerit.resurs.dto.CreateApplicationRequest;
import se.comerit.resurs.dto.CreateApplicationResponse;
import se.comerit.resurs.service.ScoringResult;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import javax.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import se.comerit.resurs.model.Company;

@RestController
public class ApplicationRestController {

    private final ScoringService scoringService;
    private final ApplicationService applicationService;

    public ApplicationRestController(ScoringService scoringService,
                                     ApplicationService applicationService) {
        this.scoringService = scoringService;
        this.applicationService = applicationService;
    }
    @PostMapping("/api/applications")
    public CreateApplicationResponse createApplication(
            @Valid @RequestBody CreateApplicationRequest request) {

        if (!request.isNoCashFlowStatement()
                && (request.getOperativtKassaflode() == null
                || request.getInvesteringsKassaflode() == null)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Båda kassaflödesvärdena krävs när företaget har en kassaflödesanalys."
            );
        }
        ScoringResult scoringResult;

        if (request.isNoCashFlowStatement()) {
            scoringResult = new ScoringResult(
                    "REVIEW",
                    "UNDER_REVIEW",
                    "Företaget saknar kassaflödesanalys. Manuell granskning krävs.",
                    "Automatisk kreditbedömning har inte utförts eftersom kassaflödesanalys saknas.",
                    0,
                    0
            );
        } else {
            scoringResult = scoringService.evaluate(
                    request.getEgetKapital(),
                    request.getTotaltKapital(),
                    request.getOmsattningstillgangar(),
                    request.getKortfristigaSkulder(),
                    request.getTotalaSkulder(),
                    request.getRorelseresultat(),
                    request.getNettoomsattning(),
                    request.getRequestedAmount(),
                    request.getOperativtKassaflode(),
                    request.getInvesteringsKassaflode(),
                    request.getRanteKostnader(),
                    request.getBransch()
            );
        }
        String initialAuditLog = "[{\"ts\":\""
                + LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                + "\",\"action\":\"APPLICATION_CREATED\",\"orgNumber\":\""
                + request.getOrgNumber()
                + "\"}]";

        Long companyId = applicationService.findOrCreateCompany(
                request.getOrgNumber(),
                request.getCompanyName(),
                request.getAuthorizedSignatory()
        );

        Long applicationId = applicationService.createApplication(
                companyId,
                request.getRequestedAmount(),
                request.getPurpose(),
                scoringResult.getStatus(),
                scoringResult.getDecision(),
                scoringResult.getDecisionReason(),
                scoringResult.getScoringLog(),
                initialAuditLog
        );
        String caseNumber = applicationService.getCaseNumber(applicationId);
        Company company = applicationService.getCompanyById(companyId)
                .orElseThrow(() -> new IllegalStateException("Company not found"));

        return new CreateApplicationResponse(
                applicationId,
                caseNumber,
                scoringResult.getStatus(),
                scoringResult.getDecision(),
                scoringResult.getDecisionReason(),
                scoringResult.getFlagCount(),
                company.getCompanyName(),
                company.getOrgNumber(),
                company.getAuthorizedSignatory(),
                scoringResult.getCreditScore()
        );
    }

}