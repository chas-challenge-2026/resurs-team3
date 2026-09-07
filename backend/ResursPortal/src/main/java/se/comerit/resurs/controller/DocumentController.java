package se.comerit.resurs.controller;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import se.comerit.resurs.service.DocumentService;

import javax.servlet.http.HttpSession;
import java.io.File;
import java.io.IOException;
import java.util.Map;

@Controller
public class DocumentController {

    private static final String UPLOAD_DIR = "/tmp/uploads/";

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping("/documents/{applicationId}")
    public String showDocumentsPage(
            @PathVariable("applicationId") Long applicationId,
            HttpSession session,
            Model model
    ) {
        if (session.getAttribute("userId") == null) {
            return "redirect:/login";
        }

        Map<String, Object> application =
                documentService.getApplication(applicationId);

        if (application == null) {
            return "redirect:/applications";
        }

        model.addAttribute("application", application);
        model.addAttribute(
                "documents",
                documentService.getDocuments(applicationId)
        );
        model.addAttribute("applicationId", applicationId);

        return "documents";
    }

    @PostMapping("/document/upload")
    public String uploadDocument(
            @RequestParam("applicationId") Long applicationId,
            @RequestParam("docType") String docType,
            @RequestParam("file") MultipartFile file,
            HttpSession session,
            Model model
    ) {
        if (session.getAttribute("userId") == null) {
            return "redirect:/login";
        }

        if (file.isEmpty()) {
            model.addAttribute("error", "Ingen fil vald.");
            return "redirect:/documents/" + applicationId;
        }

        String originalFilename = file.getOriginalFilename();

        if (originalFilename == null || originalFilename.trim().isEmpty()) {
            model.addAttribute("error", "Ogiltigt filnamn.");
            return "redirect:/documents/" + applicationId;
        }

        String storedFilename =
                applicationId + "_" + originalFilename;

        File uploadDir = new File(UPLOAD_DIR);

        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }

        File destination =
                new File(UPLOAD_DIR + storedFilename);

        try {
            file.transferTo(destination);

        } catch (IOException e) {
            model.addAttribute(
                    "error",
                    "Uppladdning misslyckades: " + e.getMessage()
            );

            return "redirect:/documents/" + applicationId;
        }

        documentService.registerUploadedDocument(
                applicationId,
                storedFilename,
                originalFilename,
                docType
        );

        return "redirect:/documents/" + applicationId;
    }

    @GetMapping("/document/{id}")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable("id") Long documentId,
            HttpSession session
    ) {
        if (session.getAttribute("userId") == null) {
            return ResponseEntity
                    .status(302)
                    .header("Location", "/login")
                    .build();
        }

        Map<String, Object> document =
                documentService.getDocument(documentId);

        if (document == null) {
            return ResponseEntity.notFound().build();
        }

        String filename =
                (String) document.get("filename");

        File file =
                new File(UPLOAD_DIR + filename);

        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }

        Resource resource =
                new FileSystemResource(file);

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\""
                )
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }
}