package se.comerit.resurs.service;

import org.springframework.stereotype.Service;
import se.comerit.resurs.model.Application;
import se.comerit.resurs.model.Company;
import se.comerit.resurs.model.Document;
import se.comerit.resurs.repository.ApplicationRepository;
import se.comerit.resurs.repository.CompanyRepository;
import se.comerit.resurs.repository.DocumentRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final CompanyRepository companyRepository;
    private final DocumentRepository documentRepository;

    public ApplicationService(ApplicationRepository applicationRepository,
                              CompanyRepository companyRepository,
                              DocumentRepository documentRepository) {
        this.applicationRepository = applicationRepository;
        this.companyRepository = companyRepository;
        this.documentRepository = documentRepository;
    }

    public Long findOrCreateCompany(String orgNumber, String companyName, String authorizedSignatory) {
        Optional<Company> existing = companyRepository.findByOrgNumber(orgNumber);
        if (existing.isPresent()) {
            return existing.get().getId();
        }
        Company newCompany = new Company();
        newCompany.setOrgNumber(orgNumber);
        newCompany.setCompanyName(companyName);
        newCompany.setAuthorizedSignatory(authorizedSignatory);
        return companyRepository.save(newCompany).getId();
    }

    public Long createApplication(Long companyId, BigDecimal requestedAmount, String purpose,
                                  String status, String decision, String decisionReason,
                                  String scoringLog, String initialAuditLog) {
        Application app = new Application();
        app.setCompanyId(companyId);
        app.setRequestedAmount(requestedAmount);
        app.setPurpose(purpose);
        app.setStatus(status);
        app.setDecision(decision.equals("REVIEW") ? null : decision);
        app.setDecisionReason(decisionReason);
        app.setScoringResult(scoringLog);
        app.setAuditLog(initialAuditLog);
        return applicationRepository.save(app).getId();
    }

    public String getAuditLog(Long applicationId) {
        return applicationRepository.findById(applicationId)
                .map(Application::getAuditLog)
                .orElse(null);
    }

    public void updateAuditLog(Long applicationId, String updatedAuditLog) {
        applicationRepository.findById(applicationId).ifPresent(app -> {
            app.setAuditLog(updatedAuditLog);
            applicationRepository.save(app);
        });
    }

    public Optional<Application> getApplicationForCaseWorker(Long id) {
        return applicationRepository.findById(id);
    }

    public Optional<Application> getApplicationForCompany(Long id, Long companyId) {
        return applicationRepository.findByIdAndCompanyId(id, companyId);
    }

    public Long findCompanyIdByOrgNumber(String orgNumber) {
        return companyRepository.findByOrgNumber(orgNumber).map(Company::getId).orElse(null);
    }

    public List<Document> getDocuments(Long applicationId) {
        return documentRepository.findByApplicationIdOrderByUploadedAtDesc(applicationId);
    }

    public List<Application> getApplicationsForCompany(Long companyId) {
        return applicationRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);
    }

    public List<Application> getRecentApplicationsForCompany(Long companyId) {
        return applicationRepository.findTop5ByCompanyIdOrderByCreatedAtDesc(companyId);
    }
}