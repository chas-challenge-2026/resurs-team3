package se.comerit.resurs.repository;

import se.comerit.resurs.model.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
    List<Application> findByCompanyIdOrderByCreatedAtDesc(Long companyId);
    List<Application> findTop5ByCompanyIdOrderByCreatedAtDesc(Long companyId);
    Optional<Application> findByIdAndCompanyId(Long id, Long companyId);
}