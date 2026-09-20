package se.comerit.resurs.service;

import org.springframework.stereotype.Service;
import se.comerit.resurs.model.Application;
import se.comerit.resurs.model.Company;
import se.comerit.resurs.model.Document;
import se.comerit.resurs.repository.ApplicationRepository;
import se.comerit.resurs.repository.CompanyRepository;
import se.comerit.resurs.repository.DocumentRepository;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class BackofficeService {

    private final ApplicationRepository applicationRepository;
    private final CompanyRepository companyRepository;
    private final DocumentRepository documentRepository;

    public BackofficeService(ApplicationRepository applicationRepository,
                             CompanyRepository companyRepository,
                             DocumentRepository documentRepository) {
        this.applicationRepository = applicationRepository;
        this.companyRepository = companyRepository;
        this.documentRepository = documentRepository;
    }

    public List<Map<String, Object>> getApplicationsUnderReview() {
        return applicationRepository.findReviewApplicationsWithCompany();
    }

    public List<Map<String, Object>> getRecentDecidedApplications() {
        List<Map<String, Object>> decided = applicationRepository.findDecidedApplicationsWithCompany();
        if (decided.size() > 20) {
            return decided.subList(0, 20);
        }
        return decided;
    }

    public boolean isValidDecision(String decision) {
        return "APPROVED".equals(decision) || "REJECTED".equals(decision);
    }

    public void decideApplication(Long applicationId, String decision, String workerName, String comment) {
        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) return;

        Application app = appOpt.get();
        app.setStatus(decision);
        app.setDecision(decision);

        String auditEntry = "{\"ts\":\"" + LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                + "\",\"action\":\"MANUAL_DECISION\",\"decision\":\"" + decision
                + "\",\"worker\":\"" + sanitize(workerName) + "\""
                + buildCommentPart(comment) + "}";

        String currentLog = app.getAuditLog();
        String updatedLog;
        if (currentLog == null || currentLog.equals("[]")) {
            updatedLog = "[" + auditEntry + "]";
        } else {
            updatedLog = currentLog.substring(0, currentLog.lastIndexOf("]")) + "," + auditEntry + "]";
        }
        app.setAuditLog(updatedLog);

        applicationRepository.save(app);
    }

    public Optional<Application> getApplicationById(Long applicationId) {
        return applicationRepository.findById(applicationId);
    }

    public Optional<Company> getCompanyForApplication(Application app) {
        return companyRepository.findById(app.getCompanyId());
    }

    public List<Document> getDocuments(Long applicationId) {
        return documentRepository.findByApplicationIdOrderByUploadedAtDesc(applicationId);
    }

    private String buildCommentPart(String comment) {
        if (comment == null || comment.isEmpty()) return "";
        return ",\"comment\":\"" + sanitize(comment) + "\"";
    }

    private String sanitize(String value) {
        if (value == null) return "";
        return value.replace("\"", "'");
    }
}