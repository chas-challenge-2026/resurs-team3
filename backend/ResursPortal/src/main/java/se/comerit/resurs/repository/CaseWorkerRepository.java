package se.comerit.resurs.repository;

import se.comerit.resurs.model.CaseWorker;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CaseWorkerRepository extends JpaRepository<CaseWorker, Long> {
    Optional<CaseWorker> findByEmail(String email);
}