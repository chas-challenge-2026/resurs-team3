package se.comerit.resurs.service;

import org.springframework.stereotype.Service;
import se.comerit.resurs.repository.ApplicationRepository;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;

    public ApplicationService(ApplicationRepository applicationRepository) {
        this.applicationRepository = applicationRepository;
    }

    public Long findCompanyIdByOrgNumber(String orgNumber) {
        List<Map<String, Object>> rows =
                applicationRepository.findCompanyByOrgNumber(orgNumber);

        if (rows.isEmpty()) {
            return null;
        }

        return ((Number) rows.get(0).get("id")).longValue();
    }

    public long findOrCreateCompany(
            String orgNumber,
            String companyName,
            String authorizedSignatory
    ) {
        Long existingCompanyId = findCompanyIdByOrgNumber(orgNumber);

        if (existingCompanyId != null) {
            return existingCompanyId;
        }

        return applicationRepository.createCompany(
                orgNumber,
                companyName,
                authorizedSignatory
        );
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
        return applicationRepository.createApplication(
                companyId,
                requestedAmount,
                purpose,
                status,
                decision,
                decisionReason,
                scoringLog,
                auditLog
        );
    }

    public String getAuditLog(long applicationId) {
        return applicationRepository.findAuditLogByApplicationId(applicationId);
    }

    public void updateAuditLog(long applicationId, String auditLog) {
        applicationRepository.updateAuditLog(applicationId, auditLog);
    }

    public List<Map<String, Object>> getApplicationForCaseWorker(long applicationId) {
        return applicationRepository.findApplicationById(applicationId);
    }

    public List<Map<String, Object>> getApplicationForCompany(
            long applicationId,
            long companyId
    ) {
        return applicationRepository.findApplicationByIdAndCompanyId(
                applicationId,
                companyId
        );
    }

    public List<Map<String, Object>> getDocuments(long applicationId) {
        return applicationRepository.findDocumentsByApplicationId(applicationId);
    }

    public List<Map<String, Object>> getApplicationsForCompany(long companyId) {
        return applicationRepository.findApplicationsByCompanyId(companyId);
    }

    public List<Map<String, Object>> getRecentApplicationsForCompany(long companyId) {
        return applicationRepository.findRecentApplicationsByCompanyId(companyId);
    }
}