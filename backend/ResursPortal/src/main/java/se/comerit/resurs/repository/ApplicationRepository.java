package se.comerit.resurs.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

@Repository
public class ApplicationRepository {

    private final JdbcTemplate jdbcTemplate;

    public ApplicationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> findCompanyByOrgNumber(String orgNumber) {
        return jdbcTemplate.queryForList(
                "SELECT id FROM companies WHERE org_number = ?",
                orgNumber
        );
    }

    public long createCompany(
            String orgNumber,
            String companyName,
            String authorizedSignatory
    ) {
        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO companies " +
                            "(org_number, company_name, authorized_signatory) " +
                            "VALUES (?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS
            );

            ps.setString(1, orgNumber);
            ps.setString(2, companyName);
            ps.setString(3, authorizedSignatory);

            return ps;
        }, keyHolder);

        return keyHolder.getKey().longValue();
    }

    public long createApplication(
            long companyId,
            BigDecimal requestedAmount,
            String purpose,
            String status,
            String decision,
            String decisionReason,
            String scoringLog,
            String auditLog
    ) {
        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO applications " +
                            "(company_id, requested_amount, purpose, status, decision, " +
                            "decision_reason, scoring_result, audit_log) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS
            );

            ps.setLong(1, companyId);
            ps.setBigDecimal(2, requestedAmount);
            ps.setString(3, purpose);
            ps.setString(4, status);
            ps.setString(5, "REVIEW".equals(decision) ? null : decision);
            ps.setString(6, decisionReason);
            ps.setString(7, scoringLog);
            ps.setString(8, auditLog);

            return ps;
        }, keyHolder);

        return keyHolder.getKey().longValue();
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
                "UPDATE applications SET audit_log = ?, updated_at = NOW() WHERE id = ?",
                auditLog,
                applicationId
        );
    }

    public List<Map<String, Object>> findApplicationById(long applicationId) {
        return jdbcTemplate.queryForList(
                "SELECT a.*, c.org_number, c.company_name, c.authorized_signatory " +
                        "FROM applications a " +
                        "JOIN companies c ON a.company_id = c.id " +
                        "WHERE a.id = ?",
                applicationId
        );
    }

    public List<Map<String, Object>> findApplicationByIdAndCompanyId(
            long applicationId,
            long companyId
    ) {
        return jdbcTemplate.queryForList(
                "SELECT a.*, c.org_number, c.company_name, c.authorized_signatory " +
                        "FROM applications a " +
                        "JOIN companies c ON a.company_id = c.id " +
                        "WHERE a.id = ? AND a.company_id = ?",
                applicationId,
                companyId
        );
    }

    public List<Map<String, Object>> findDocumentsByApplicationId(long applicationId) {
        return jdbcTemplate.queryForList(
                "SELECT * FROM documents WHERE application_id = ?",
                applicationId
        );
    }

    public List<Map<String, Object>> findApplicationsByCompanyId(long companyId) {
        return jdbcTemplate.queryForList(
                "SELECT a.id, a.requested_amount, a.purpose, a.status, " +
                        "a.decision, a.created_at, a.updated_at " +
                        "FROM applications a " +
                        "WHERE a.company_id = ? " +
                        "ORDER BY a.created_at DESC",
                companyId
        );
    }

    public List<Map<String, Object>> findRecentApplicationsByCompanyId(long companyId) {
        return jdbcTemplate.queryForList(
                "SELECT a.id, a.requested_amount, a.purpose, a.status, " +
                        "a.decision, a.created_at " +
                        "FROM applications a " +
                        "WHERE a.company_id = ? " +
                        "ORDER BY a.created_at DESC LIMIT 5",
                companyId
        );
    }
}