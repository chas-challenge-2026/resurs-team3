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

        steps.add(createStep(
                "Inkommen",
                "—",
                "Ansökan har mottagits av systemet.",
                "DONE"
        ));

        steps.add(createStep(
                "Valideras",
                "1 dag",
                "Ansökan och grundläggande uppgifter valideras.",
                "DONE"
        ));

        if ("UNDER_REVIEW".equals(currentStatus)) {
            steps.add(createStep(
                    "Granskas",
                    "3 dagar",
                    "Ansökan granskas och kreditbedömningen genomförs.",
                    "CURRENT"
            ));

            steps.add(createStep(
                    "Komplettering krävs",
                    "1 dag",
                    "Ytterligare dokument eller information kan behöva skickas in.",
                    "PENDING"
            ));

        } else if ("PENDING_DOCS".equals(currentStatus)) {
            steps.add(createStep(
                    "Granskas",
                    "3 dagar",
                    "Ansökan granskas och kreditbedömningen genomförs.",
                    "DONE"
            ));

            steps.add(createStep(
                    "Komplettering krävs",
                    "1 dag",
                    "Ytterligare dokument eller information behöver skickas in.",
                    "CURRENT"
            ));

        } else {
            steps.add(createStep(
                    "Granskas",
                    "3 dagar",
                    "Ansökan granskas och kreditbedömningen genomförs.",
                    "DONE"
            ));

            steps.add(createStep(
                    "Komplettering krävs",
                    "—",
                    "Ingen komplettering krävs.",
                    "DONE"
            ));
        }

        String decisionStatus =
                "APPROVED".equals(currentStatus) || "REJECTED".equals(currentStatus)
                        ? "DONE"
                        : "PENDING";

        steps.add(createStep(
                "Beslut",
                "1 dag",
                "Kreditbeslut fattas av handläggare eller automatiskt.",
                decisionStatus
        ));

        return steps;
    }

    private Map<String, String> createStep(
            String name,
            String eta,
            String description,
            String status) {

        Map<String, String> step = new HashMap<>();
        step.put("name", name);
        step.put("eta", eta);
        step.put("description", description);
        step.put("status", status);

        return step;
    }
}