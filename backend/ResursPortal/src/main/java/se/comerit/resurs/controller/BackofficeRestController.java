package se.comerit.resurs.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import se.comerit.resurs.service.BackofficeService;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import se.comerit.resurs.dto.DecisionRequest;
import se.comerit.resurs.model.Application;
import se.comerit.resurs.model.Document;

import java.util.ArrayList;
import java.util.List;

import java.util.HashMap;
import java.util.Map;

@RestController
public class BackofficeRestController {

    private final BackofficeService backofficeService;

    public BackofficeRestController(BackofficeService backofficeService) {
        this.backofficeService = backofficeService;
    }

    @GetMapping("/api/backoffice/applications")
    public Map<String, Object> getQueue(HttpSession session) {
        requireCaseWorker(session);

        Map<String, Object> result = new HashMap<>();
        result.put("underReview", backofficeService.getApplicationsUnderReview());
        result.put("recentlyDecided", backofficeService.getRecentDecidedApplications());
        return result;
    }

    @PostMapping("/api/backoffice/applications/{id}/decision")
    public Map<String, Object> decide(@PathVariable("id") Long id,
                                      @RequestBody DecisionRequest request,
                                      HttpSession session) {
        requireCaseWorker(session);

        if (backofficeService.getApplicationById(id).isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Ansökan hittades inte.");
        }

        if (!backofficeService.isValidDecision(request.getDecision())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Beslut måste vara APPROVED eller REJECTED.");
        }

        String workerName = (String) session.getAttribute("workerName");
        String comment = request.getComment() == null ? "" : request.getComment();

        backofficeService.decideApplication(id, request.getDecision(), workerName, comment);

        Map<String, Object> result = new HashMap<>();
        result.put("applicationId", id);
        result.put("decision", request.getDecision());
        return result;
    }
    @GetMapping("/api/backoffice/applications/{id}")
    public Map<String, Object> getApplicationDetail(@PathVariable("id") Long id,
                                                    HttpSession session) {
        requireCaseWorker(session);

        Application application = backofficeService.getApplicationById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Ansökan hittades inte."));

        Map<String, Object> result = new HashMap<>();
        result.put("id", application.getId());
        result.put("caseNumber", application.getCaseNumber());
        result.put("requestedAmount", application.getRequestedAmount());
        result.put("purpose", application.getPurpose());
        result.put("status", application.getStatus());
        result.put("decision", application.getDecision());
        result.put("decisionReason", application.getDecisionReason());
        result.put("scoringResult", application.getScoringResult());
        result.put("createdAt", application.getCreatedAt());
        result.put("updatedAt", application.getUpdatedAt());
        result.put("auditLogRaw", application.getAuditLog());

        backofficeService.getCompanyForApplication(application).ifPresent(company -> {
            Map<String, Object> companyMap = new HashMap<>();
            companyMap.put("orgNumber", company.getOrgNumber());
            companyMap.put("companyName", company.getCompanyName());
            companyMap.put("authorizedSignatory", company.getAuthorizedSignatory());
            result.put("company", companyMap);
        });

        List<Map<String, Object>> documents = new ArrayList<>();
        for (Document document : backofficeService.getDocuments(id)) {
            Map<String, Object> documentMap = new HashMap<>();
            documentMap.put("id", document.getId());
            documentMap.put("filename", document.getFilename());
            documentMap.put("docType", document.getDocType());
            documentMap.put("uploadedAt", document.getUploadedAt());
            documents.add(documentMap);
        }
        result.put("documents", documents);

        return result;
    }

    private void requireCaseWorker(HttpSession session) {
        if (session.getAttribute("userId") == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Du måste vara inloggad.");
        }

        if (!"caseWorker".equals(session.getAttribute("role"))) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Endast handläggare har åtkomst.");
        }
    }
}