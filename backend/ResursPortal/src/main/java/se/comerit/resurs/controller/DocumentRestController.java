package se.comerit.resurs.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import se.comerit.resurs.model.Application;
import se.comerit.resurs.model.Document;
import se.comerit.resurs.service.DocumentService;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class DocumentRestController {

    private final DocumentService documentService;

    public DocumentRestController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping("/api/applications/{id}/documents")
    public List<Map<String, Object>> getDocuments(@PathVariable("id") Long applicationId,
                                                  HttpSession session) {
        Long companyId = requireCompanyId(session);

        Application application = documentService.getApplication(applicationId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Ansökan hittades inte."));

        if (!companyId.equals(application.getCompanyId())) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Ansökan hittades inte.");
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Document document : documentService.getDocuments(applicationId)) {
            Map<String, Object> documentMap = new HashMap<>();
            documentMap.put("id", document.getId());
            documentMap.put("filename", document.getFilename());
            documentMap.put("docType", document.getDocType());
            documentMap.put("uploadedAt", document.getUploadedAt());
            result.add(documentMap);
        }
        return result;
    }

    private Long requireCompanyId(HttpSession session) {
        if (session.getAttribute("userId") == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Du måste vara inloggad.");
        }

        if (!"company".equals(session.getAttribute("role"))) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Endast företag har åtkomst.");
        }

        return (Long) session.getAttribute("companyId");
    }
}