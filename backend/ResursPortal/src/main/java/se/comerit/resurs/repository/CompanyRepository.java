package se.comerit.resurs.repository;

import se.comerit.resurs.model.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CompanyRepository extends JpaRepository<Company, Long> {
    Optional<Company> findByOrgNumber(String orgNumber);
}