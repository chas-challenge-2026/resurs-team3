package se.comerit.resurs.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class BackofficeRepository {

    private final JdbcTemplate jdbcTemplate;

    public BackofficeRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> findApplicationsUnderReview() {
        return jdbcTemplate.queryForList(
                "SELECT a.id, a.requested_amount, a.purpose, a.status, a.created_at, " +
                        "a.scoring_result, a.decision_reason, c.company_name, c.org_number " +
                        "FROM applications a JOIN companies c ON a.company_id = c.id " +
                        "WHERE a.status = 'UNDER_REVIEW' ORDER BY a.created_at ASC"
        );
    }

    public List<Map<String, Object>> findRecentDecidedApplications() {
        return jdbcTemplate.queryForList(
                "SELECT a.id, a.requested_amount, a.purpose, a.status, a.decision, a.created_at, " +
                        "a.updated_at, c.company_name, c.org_number " +
                        "FROM applications a JOIN companies c ON a.company_id = c.id " +
                        "WHERE a.status IN ('APPROVED', 'REJECTED') " +
                        "ORDER BY a.updated_at DESC LIMIT 20"
        );
    }

    public void updateDecision(
            long applicationId,
            String status,
            String decision
    ) {
        jdbcTemplate.update(
                "UPDATE applications " +
                        "SET status = ?, decision = ?, updated_at = NOW() " +
                        "WHERE id = ?",
                status,
                decision,
                applicationId
        );
    }

    public String findAuditLogByApplicationId(long applicationId) {
        return jdbcTemplate.queryForObject(
                "SELECT audit_log FROM applications WHERE id = ?",
                String.class,
                applicationId
        );
    }

    public void updateAuditLog(long applicationId, String auditLog) {
        jdbcTemplate.update(
                "UPDATE applications SET audit_log = ? WHERE id = ?",
                auditLog,
                applicationId
        );
    }

    public List<Map<String, Object>> findApplicationById(long applicationId) {
        return jdbcTemplate.queryForList(
                "SELECT a.*, c.company_name, c.org_number, c.authorized_signatory " +
                        "FROM applications a " +
                        "JOIN companies c ON a.company_id = c.id " +
                        "WHERE a.id = ?",
                applicationId
        );
    }

    public List<Map<String, Object>> findDocumentsByApplicationId(long applicationId) {
        return jdbcTemplate.queryForList(
                "SELECT * FROM documents " +
                        "WHERE application_id = ? " +
                        "ORDER BY uploaded_at DESC",
                applicationId
        );
    }
}
