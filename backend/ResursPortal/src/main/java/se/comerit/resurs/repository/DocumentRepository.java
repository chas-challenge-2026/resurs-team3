package se.comerit.resurs.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

@Repository
public class DocumentRepository {

    private final JdbcTemplate jdbcTemplate;

    public DocumentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> findApplicationById(long applicationId) {
        return jdbcTemplate.queryForList(
                "SELECT a.*, c.company_name " +
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

    public long createDocument(
            long applicationId,
            String filename,
            String docType
    ) {
        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO documents " +
                            "(application_id, filename, doc_type) " +
                            "VALUES (?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS
            );

            ps.setLong(1, applicationId);
            ps.setString(2, filename);
            ps.setString(3, docType);

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
                "UPDATE applications " +
                        "SET audit_log = ?, updated_at = NOW() " +
                        "WHERE id = ?",
                auditLog,
                applicationId
        );
    }

    public void movePendingDocsToUnderReview(long applicationId) {
        jdbcTemplate.update(
                "UPDATE applications " +
                        "SET status = 'UNDER_REVIEW', updated_at = NOW() " +
                        "WHERE id = ? AND status = 'PENDING_DOCS'",
                applicationId
        );
    }

    public List<Map<String, Object>> findDocumentById(long documentId) {
        return jdbcTemplate.queryForList(
                "SELECT * FROM documents WHERE id = ?",
                documentId
        );
    }
}
