package se.comerit.resurs.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class StatusRepository {

    private final JdbcTemplate jdbcTemplate;

    public StatusRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> findApplicationById(long applicationId) {
        return jdbcTemplate.queryForList(
                "SELECT a.*, c.company_name, c.org_number " +
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