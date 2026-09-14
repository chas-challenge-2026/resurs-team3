package se.comerit.resurs.repository;

import org.springframework.data.jpa.repository.Query;
import se.comerit.resurs.model.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
    List<Application> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

    List<Application> findTop5ByCompanyIdOrderByCreatedAtDesc(Long companyId);

    Optional<Application> findByIdAndCompanyId(Long id, Long companyId);

    List<Application> findByStatus(String status);

    List<Application> findTop20ByStatusInOrderByUpdatedAtDesc(List<String> statuses);

    @Query(
            "SELECT new map(a.id as id, a.requestedAmount as requested_amount, a.purpose as purpose, " +
                    "a.status as status, a.createdAt as created_at, a.scoringResult as scoring_result, " +
                    "a.decisionReason as decision_reason, c.companyName as company_name, c.orgNumber as org_number) " +
                    "FROM Application a JOIN Company c ON a.companyId = c.id " +
                    "WHERE a.status = 'UNDER_REVIEW' ORDER BY a.createdAt ASC"
    )
    List<Map<String, Object>> findReviewApplicationsWithCompany();

    @Query(
            "SELECT new map(a.id as id, a.requestedAmount as requested_amount, a.purpose as purpose, " +
                    "a.status as status, a.decision as decision, a.createdAt as created_at, a.updatedAt as updated_at, " +
                    "c.companyName as company_name, c.orgNumber as org_number) " +
                    "FROM Application a JOIN Company c ON a.companyId = c.id " +
                    "WHERE a.status IN ('APPROVED', 'REJECTED') ORDER BY a.updatedAt DESC"
    )
    List<Map<String, Object>> findDecidedApplicationsWithCompany();
}