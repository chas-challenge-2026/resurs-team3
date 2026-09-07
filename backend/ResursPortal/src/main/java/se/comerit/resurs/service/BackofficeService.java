package se.comerit.resurs.service;

import org.springframework.stereotype.Service;
import se.comerit.resurs.repository.BackofficeRepository;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
public class BackofficeService {

    private final BackofficeRepository backofficeRepository;

    public BackofficeService(BackofficeRepository backofficeRepository) {
        this.backofficeRepository = backofficeRepository;
    }

    public List<Map<String, Object>> getApplicationsUnderReview() {
        return backofficeRepository.findApplicationsUnderReview();
    }

    public List<Map<String, Object>> getRecentDecidedApplications() {
        return backofficeRepository.findRecentDecidedApplications();
    }

    public boolean isValidDecision(String decision) {
        return "APPROVED".equals(decision)
                || "REJECTED".equals(decision);
    }

    public void decideApplication(
            long applicationId,
            String decision,
            String workerName,
            String comment
    ) {
        String newStatus =
                "APPROVED".equals(decision)
                        ? "APPROVED"
                        : "REJECTED";

        backofficeRepository.updateDecision(
                applicationId,
                newStatus,
                decision
        );

        String auditEntry =
                "{\"ts\":\""
                        + LocalDateTime.now()
                        .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        + "\",\"action\":\"MANUAL_DECISION\""
                        + ",\"decision\":\"" + decision + "\""
                        + ",\"worker\":\"" + sanitize(workerName) + "\""
                        + buildCommentPart(comment)
                        + "}";

        String currentLog =
                backofficeRepository.findAuditLogByApplicationId(
                        applicationId
                );

        String updatedLog;

        if (currentLog == null || currentLog.equals("[]")) {
            updatedLog = "[" + auditEntry + "]";
        } else {
            updatedLog =
                    currentLog.substring(
                            0,
                            currentLog.lastIndexOf("]")
                    )
                            + ","
                            + auditEntry
                            + "]";
        }

        backofficeRepository.updateAuditLog(
                applicationId,
                updatedLog
        );
    }

    public Map<String, Object> getApplicationById(long applicationId) {
        List<Map<String, Object>> applications =
                backofficeRepository.findApplicationById(applicationId);

        if (applications.isEmpty()) {
            return null;
        }

        return applications.get(0);
    }

    public List<Map<String, Object>> getDocuments(long applicationId) {
        return backofficeRepository.findDocumentsByApplicationId(
                applicationId
        );
    }

    private String buildCommentPart(String comment) {
        if (comment == null || comment.isEmpty()) {
            return "";
        }

        return ",\"comment\":\""
                + sanitize(comment)
                + "\"";
    }

    private String sanitize(String value) {
        if (value == null) {
            return "";
        }

        return value.replace("\"", "'");
    }
}
