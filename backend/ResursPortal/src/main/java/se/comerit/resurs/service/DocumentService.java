package se.comerit.resurs.service;

import org.springframework.stereotype.Service;
import se.comerit.resurs.model.Application;
import se.comerit.resurs.model.Document;
import se.comerit.resurs.repository.ApplicationRepository;
import se.comerit.resurs.repository.DocumentRepository;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Service
public class DocumentService {

    private final ApplicationRepository applicationRepository;
    private final DocumentRepository documentRepository;

    public DocumentService(ApplicationRepository applicationRepository, DocumentRepository documentRepository) {
        this.applicationRepository = applicationRepository;
        this.documentRepository = documentRepository;
    }

    public Optional<Application> getApplication(Long applicationId) {
        return applicationRepository.findById(applicationId);
    }

    public List<Document> getDocuments(Long applicationId) {
        return documentRepository.findByApplicationIdOrderByUploadedAtDesc(applicationId);
    }

    public void registerUploadedDocument(Long applicationId, String storedFilename,
                                         String originalFilename, String docType) {
        Document newDocument = new Document();
        newDocument.setApplicationId(applicationId);
        newDocument.setFilename(storedFilename);
        newDocument.setDocType(docType);
        documentRepository.save(newDocument);

        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isPresent()) {
            Application app = appOpt.get();

            String newEntry = "{\"ts\":\"" + LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                    + "\",\"action\":\"DOCUMENT_UPLOADED\",\"filename\":\"" + sanitize(originalFilename)
                    + "\",\"docType\":\"" + sanitize(docType) + "\"}";

            String currentLog = app.getAuditLog();
            String updatedLog;
            if (currentLog == null || currentLog.equals("[]")) {
                updatedLog = "[" + newEntry + "]";
            } else {
                updatedLog = currentLog.substring(0, currentLog.lastIndexOf("]")) + "," + newEntry + "]";
            }
            app.setAuditLog(updatedLog);

            if (("arsredovisning".equals(docType) || "årsredovisning".equals(docType))
                    && "PENDING_DOCS".equals(app.getStatus())) {
                app.setStatus("UNDER_REVIEW");
            }

            applicationRepository.save(app);
        }
    }

    public Optional<Document> getDocument(Long documentId) {
        return documentRepository.findById(documentId);
    }

    private String sanitize(String value) {
        if (value == null) return "";
        return value.replace("\"", "'");
    }
}