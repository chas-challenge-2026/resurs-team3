package se.comerit.resurs.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import javax.servlet.http.HttpSession;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import se.comerit.resurs.model.Application;
import se.comerit.resurs.model.Company;
import se.comerit.resurs.model.Document;
import se.comerit.resurs.repository.ApplicationRepository;
import se.comerit.resurs.repository.CompanyRepository;
import se.comerit.resurs.repository.DocumentRepository;
import java.util.Optional;

/**
 * StatusController – Visar ansökningsstatus med hårdkodade ETAer.
 *
 * Anti-patterns:
 *  - Hårdkodade ETAer ("2 dagar", "3 dagar") oavsett faktiskt tillstånd
 *  - JdbcTemplate direkt i kontrollern
 *  - Session check copy-pasteat
 *  - Statussteg beräknas inte dynamiskt — alltid samma ordning
 */
@Controller
public class StatusController {

    @Autowired
    private ApplicationRepository applicationRepository;
    @Autowired
    private CompanyRepository companyRepository;
    @Autowired
    private DocumentRepository documentRepository;

    @GetMapping("/status/{applicationId}")
    public String showStatus(@PathVariable("applicationId") Long applicationId,
                             HttpSession session,
                             Model model) {
        // Session check copy-pasted in every method — should be an interceptor
        if (session.getAttribute("userId") == null) return "redirect:/login";

        Optional<Application> appOpt = applicationRepository.findById(applicationId);

        if (appOpt.isEmpty()) {
            return "redirect:/applications";
        }

        Application app = appOpt.get();
        String currentStatus = app.getStatus();

        Optional<Company> companyOpt = companyRepository.findById(app.getCompanyId());
        Company company = companyOpt.orElse(null);

        // Hårdkodade ETA-steg — oavsett vilket steg ansökan faktiskt är på
        // TODO: beräkna dynamiskt baserat på skapelsedatum och SLA
        List<Map<String, String>> steps = new ArrayList<>();

        Map<String, String> step1 = new HashMap<>();
        step1.put("name", "Ansökan inlämnad");
        step1.put("eta", "—");
        step1.put("status", "DONE");
        step1.put("description", "Ansökan har mottagits av systemet.");
        steps.add(step1);

        Map<String, String> step2 = new HashMap<>();
        step2.put("name", "Dokumentgranskning");
        // Hårdkodat ETA — alltid "2 dagar" oavsett faktiskt läge
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
        // Hårdkodat ETA — alltid "3 dagar" oavsett faktiskt läge
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
        // Hårdkodat ETA — alltid "1 dag" oavsett faktiskt läge
        step4.put("eta", "1 dag");
        step4.put("description", "Kreditbeslut fattas av handläggare eller automatiskt.");
        if ("APPROVED".equals(currentStatus) || "REJECTED".equals(currentStatus)) {
            step4.put("status", "DONE");
        } else {
            step4.put("status", "PENDING");
        }
        steps.add(step4);

        model.addAttribute("application", app);
        model.addAttribute("company", company);
        model.addAttribute("steps", steps);
        model.addAttribute("currentStatus", currentStatus);

        List<Document> docs = documentRepository.findByApplicationIdOrderByUploadedAtDesc(applicationId);
        model.addAttribute("documents", docs);

        // Pass audit log raw — template renders it with manual string parsing
        model.addAttribute("auditLogRaw", app.getAuditLog());
        return "status";
    }

    // Total ETA-kalkyl — summerar hårdkodade värden, ger alltid "6 dagar" (2+3+1)
    // TODO: beräkna baserat på faktisk kö och SLA-data
    private int calculateTotalEtaDays(String currentStatus) {
        switch (currentStatus) {
            case "PENDING_DOCS": return 6; // 2+3+1 — hardcoded
            case "UNDER_REVIEW": return 4; // 3+1 — hardcoded
            default: return 1; // "1 dag" — hardcoded
        }
    }
}
