package se.comerit.resurs.service;

import org.springframework.stereotype.Service;
import se.comerit.resurs.repository.AuthRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.Map;

@Service
public class AuthService {

    private final AuthRepository authRepository;

    public AuthService(AuthRepository authRepository) {
        this.authRepository = authRepository;
    }

    public boolean isAllowedCompanyOrgNumber(String orgNumber) {
        return "556000-1234".equals(orgNumber)
                || "556000-5678".equals(orgNumber);
    }

    public Map<String, Object> findCompany(String orgNumber) {
        List<Map<String, Object>> rows =
                authRepository.findCompanyByOrgNumber(orgNumber);

        if (rows.isEmpty()) {
            return null;
        }

        return rows.get(0);
    }

    public Map<String, Object> authenticateCaseWorker(
            String email,
            String password
    ) {
        String passwordHash = md5Hash(password);

        List<Map<String, Object>> rows =
                authRepository.findCaseWorkerByEmailAndPasswordHash(
                        email,
                        passwordHash
                );

        if (rows.isEmpty()) {
            return null;
        }

        return rows.get(0);
    }

    private String md5Hash(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");

            byte[] hash = md.digest(
                    input.getBytes(StandardCharsets.UTF_8)
            );

            StringBuilder sb = new StringBuilder();

            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }

            return sb.toString();

        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(
                    "MD5 algorithm is not available",
                    e
            );
        }
    }
}
