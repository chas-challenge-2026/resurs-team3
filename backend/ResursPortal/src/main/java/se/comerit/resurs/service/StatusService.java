package se.comerit.resurs.service;

import org.springframework.stereotype.Service;
import se.comerit.resurs.model.Application;
import se.comerit.resurs.model.Document;
import se.comerit.resurs.repository.ApplicationRepository;
import se.comerit.resurs.repository.DocumentRepository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class StatusService {

    private final ApplicationRepository applicationRepository;
    private final DocumentRepository documentRepository;

    public StatusService(ApplicationRepository applicationRepository, DocumentRepository documentRepository) {
        this.applicationRepository = applicationRepository;
        this.documentRepository = documentRepository;
    }

    public Optional<Application> getApplication(Long applicationId) {
        return applicationRepository.findById(applicationId);
    }

    public List<Document> getDocuments(Long applicationId) {
        return documentRepository.findByApplicationIdOrderByUploadedAtDesc(applicationId);
    }

    public List<Map<String, String>> buildStatusSteps(String currentStatus) {
        List<Map<String, String>> steps = new ArrayList<>();

        Map<String, String> step1 = new HashMap<>();
        step1.put("name", "Ansökan inlämnad");
        step1.put("eta", "—");
        step1.put("status", "DONE");
        step1.put("description", "Ansökan har mottagits av systemet.");
        steps.add(step1);

        Map<String, String> step2 = new HashMap<>();
        step2.put("name", "Dokumentgranskning");
        step2.put("eta", "2 dagar");
        step2.put("description", "Årsredovisning och F-skatteintyg granskas.");
        if ("PENDING_DOCS".equals(currentStatus)) {
            step2.put("status", "CURRENT");
        } else {
            step2.put("status", "DONE");
        }
        steps.add(step2);

        Map<String, String> step3 = new HashMap<>();
        step3.put("name", "Kreditbedömning");
        step3.put("eta", "3 dagar");
        step3.put("description", "Finansiella nyckeltal analyseras och scoring körs.");
        if ("UNDER_REVIEW".equals(currentStatus)) {
            step3.put("status", "CURRENT");
        } else if ("PENDING_DOCS".equals(currentStatus)) {
            step3.put("status", "PENDING");
        } else {
            step3.put("status", "DONE");
        }
        steps.add(step3);

        Map<String, String> step4 = new HashMap<>();
        step4.put("name", "Beslut");
        step4.put("eta", "1 dag");
        step4.put("description", "Kreditbeslut fattas av handläggare eller automatiskt.");
        if ("APPROVED".equals(currentStatus) || "REJECTED".equals(currentStatus)) {
            step4.put("status", "DONE");
        } else {
            step4.put("status", "PENDING");
        }
        steps.add(step4);

        return steps;
    }
}