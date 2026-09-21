package se.comerit.resurs.service;

import org.springframework.stereotype.Service;
import se.comerit.resurs.model.CaseWorker;
import se.comerit.resurs.model.Company;
import se.comerit.resurs.repository.CaseWorkerRepository;
import se.comerit.resurs.repository.CompanyRepository;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Optional;

@Service
public class AuthService {

    private final CompanyRepository companyRepository;
    private final CaseWorkerRepository caseWorkerRepository;

    public AuthService(CompanyRepository companyRepository, CaseWorkerRepository caseWorkerRepository) {
        this.companyRepository = companyRepository;
        this.caseWorkerRepository = caseWorkerRepository;
    }

    public boolean isAllowedCompanyOrgNumber(String orgNumber) {
        return "556000-1234".equals(orgNumber) || "556000-5678".equals(orgNumber);
    }

    public Optional<Company> findCompany(String orgNumber) {
        return companyRepository.findByOrgNumber(orgNumber);
    }

    public Optional<CaseWorker> authenticateCaseWorker(String email, String password) {
        String passwordHash = md5Hash(password);
        Optional<CaseWorker> workerOpt = caseWorkerRepository.findByEmail(email);

        if (workerOpt.isPresent() && workerOpt.get().getPasswordMd5().equals(passwordHash)) {
            return workerOpt;
        }
        return Optional.empty();
    }

    private String md5Hash(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] hash = md.digest(input.getBytes());
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("MD5 not available", e);
        }
    }
}