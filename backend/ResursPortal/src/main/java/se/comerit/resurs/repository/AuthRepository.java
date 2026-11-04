package se.comerit.resurs.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class AuthRepository {

    private final JdbcTemplate jdbcTemplate;

    public AuthRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> findCompanyByOrgNumber(String orgNumber) {
        return jdbcTemplate.queryForList(
                "SELECT * FROM companies WHERE org_number = ?",
                orgNumber
        );
    }

    public List<Map<String, Object>> findCaseWorkerByEmailAndPasswordHash(
            String email,
            String passwordHash
    ) {
        return jdbcTemplate.queryForList(
                "SELECT * FROM case_workers WHERE email = ? AND password_md5 = ?",
                email,
                passwordHash
        );
    }
}