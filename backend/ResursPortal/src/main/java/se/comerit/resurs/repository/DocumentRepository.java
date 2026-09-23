package se.comerit.resurs.repository;

import se.comerit.resurs.model.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByApplicationIdOrderByUploadedAtDesc(Long applicationId);
}