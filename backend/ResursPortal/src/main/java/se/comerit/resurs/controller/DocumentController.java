package se.comerit.resurs.controller;

import org.springframework.beans.factory.annotation.Autowired;
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

import javax.servlet.http.HttpSession;
import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;


import se.comerit.resurs.model.Application;
import se.comerit.resurs.model.Document;
import se.comerit.resurs.repository.ApplicationRepository;
import se.comerit.resurs.repository.DocumentRepository;

import java.util.Optional;

/**
 * DocumentController – Hanterar dokumentuppladdning.
 * <p>
 * VARNING: PDF sparas men parsas INTE.
 * TODO: implement PDF parsing in v2 (see native/README.md)
 * <p>
 * Anti-patterns:
 * - JdbcTemplate direkt i kontrollern
 * - Filer sparas i /tmp/uploads — rensas vid omstart
 * - Ingen validering av filtyp (accepterar vad som helst)
 * - Audit log uppdateras via JSON string manipulation
 * - Session check copy-pasteat
 */
@Controller
public class DocumentController {


    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private DocumentRepository documentRepository;

    // Uploads dir — /tmp rensas vid omstart, ingen persistent lagring
    // TODO: använd ett persistent filsystem eller S3 i v2
    private static final String UPLOAD_DIR = "/tmp/uploads/";

    @GetMapping("/documents/{applicationId}")
    public String showDocumentsPage(@PathVariable("applicationId") Long applicationId,
                                    HttpSession session,
                                    Model model) {
        if (session.getAttribute("userId") == null) return "redirect:/login";

        Optional<Application> appOpt = applicationRepository.findById(applicationId);

        if (appOpt.isEmpty()) {
            return "redirect:/applications";
        }

        List<Document> docs = documentRepository.findByApplicationIdOrderByUploadedAtDesc(applicationId);

        model.addAttribute("application", appOpt.get());
        model.addAttribute("documents", docs);
        model.addAttribute("applicationId", applicationId);
        return "documents";
    }


    // Store filename in DB — file path is /tmp which is not persistent
    // TODO: implement PDF parsing in v2 (see native/README.md)
    // The file is saved but its contents are never read or validated

    @PostMapping("/document/upload")
    public String uploadDocument(@RequestParam("applicationId") Long applicationId,
                                 @RequestParam("docType") String docType,
                                 @RequestParam("file") MultipartFile file,
                                 HttpSession session,
                                 Model model) {
        if (session.getAttribute("userId") == null) return "redirect:/login";

        if (file.isEmpty()) {
            model.addAttribute("error", "Ingen fil vald.");
            return "redirect:/documents/" + applicationId;
        }

        String originalFilename = file.getOriginalFilename();
        String storedFilename = applicationId + "_" + originalFilename;

        File uploadDir = new File(UPLOAD_DIR);
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }

        File destination = new File(UPLOAD_DIR + storedFilename);

        try {
            file.transferTo(destination);
        } catch (IOException e) {
            model.addAttribute("error", "Uppladdning misslyckades: " + e.getMessage());
            return "redirect:/documents/" + applicationId;
        }

        // Spara dokumentet
        Document newDocument = new Document();
        newDocument.setApplicationId(applicationId);
        newDocument.setFilename(storedFilename);
        newDocument.setDocType(docType);
        documentRepository.save(newDocument);

        // Uppdatera audit log och ev. status på ansökan
        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isPresent()) {
            Application app = appOpt.get();

            String newEntry = "{\"ts\":\"" + LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                    + "\",\"action\":\"DOCUMENT_UPLOADED\",\"filename\":\"" + originalFilename
                    + "\",\"docType\":\"" + docType + "\"}";

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

        return "redirect:/documents/" + applicationId;
    }


    @GetMapping("/document/{id}")
    public ResponseEntity<Resource> downloadDocument(@PathVariable("id") Long documentId,
                                                     HttpSession session) {
        // Session check copy-pasted in every method — should be an interceptor
        if (session.getAttribute("userId") == null) {
            return ResponseEntity.status(302).header("Location", "/login").build();
        }

        Optional<Document> docOpt = documentRepository.findById(documentId);

        if (docOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        String filename = docOpt.get().getFilename();
        File file = new File(UPLOAD_DIR + filename);

        if (!file.exists()) {
            // File was in /tmp and got cleared on server restart
            return ResponseEntity.notFound().build();
        }

        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }
}
