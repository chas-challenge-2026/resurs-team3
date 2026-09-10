package se.comerit.resurs.service;

import org.springframework.stereotype.Service;
import se.comerit.resurs.repository.DocumentRepository;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;

    public DocumentService(DocumentRepository documentRepository) {
        this.documentRepository = documentRepository;
    }

    public Map<String, Object> getApplication(long applicationId) {
        List<Map<String, Object>> applications =
                documentRepository.findApplicationById(applicationId);

        if (applications.isEmpty()) {
            return null;
        }

        return applications.get(0);
    }

    public List<Map<String, Object>> getDocuments(long applicationId) {
        return documentRepository.findDocumentsByApplicationId(applicationId);
    }

    public void registerUploadedDocument(
            long applicationId,
            String storedFilename,
            String originalFilename,
            String docType
    ) {
        documentRepository.createDocument(
                applicationId,
                storedFilename,
                docType
        );

        String newEntry =
                "{\"ts\":\""
                        + LocalDateTime.now()
                        .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        + "\",\"action\":\"DOCUMENT_UPLOADED\""
                        + ",\"filename\":\"" + sanitize(originalFilename) + "\""
                        + ",\"docType\":\"" + sanitize(docType) + "\""
                        + "}";

        String currentLog =
                documentRepository.findAuditLogByApplicationId(applicationId);

        String updatedLog;

        if (currentLog == null || currentLog.equals("[]")) {
            updatedLog = "[" + newEntry + "]";
        } else {
            updatedLog =
                    currentLog.substring(
                            0,
                            currentLog.lastIndexOf("]")
                    )
                            + ","
                            + newEntry
                            + "]";
        }

        documentRepository.updateAuditLog(
                applicationId,
                updatedLog
        );

        if ("arsredovisning".equals(docType)
                || "årsredovisning".equals(docType)) {

            documentRepository.movePendingDocsToUnderReview(
                    applicationId
            );
        }
    }

    public Map<String, Object> getDocument(long documentId) {
        List<Map<String, Object>> documents =
                documentRepository.findDocumentById(documentId);

        if (documents.isEmpty()) {
            return null;
        }

        return documents.get(0);
    }

    private String sanitize(String value) {
        if (value == null) {
            return "";
        }

        return value.replace("\"", "'");
    }
}