package se.comerit.resurs.repository;

import se.comerit.resurs.model.Application;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
}