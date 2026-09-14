package se.comerit.resurs.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import se.comerit.resurs.model.Application;
import se.comerit.resurs.model.Company;
import se.comerit.resurs.repository.ApplicationRepository;

import javax.servlet.http.HttpSession;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import se.comerit.resurs.model.Document;
import se.comerit.resurs.repository.CompanyRepository;
import se.comerit.resurs.repository.DocumentRepository;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * BackofficeController – Handläggargränssnitt för manuell granskning.
 * <p>
 * Anti-patterns:
 * - JdbcTemplate direkt i kontrollern
 * - Audit log uppdateras via JSON string manipulation
 * - Ingen e-postnotifiering vid beslut
 * - Session check copy-pasteat
 * - Ingen pagination — hämtar ALLA ansökningar i REVIEW
 */
@Controller
public class BackofficeController {


    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @GetMapping("/backoffice")
    public String backofficeOverview(HttpSession session, Model model) {
        if (session.getAttribute("userId") == null) return "redirect:/login";
        if (!"caseWorker".equals(session.getAttribute("role"))) return "redirect:/login";

        List<Map<String, Object>> reviewApps = applicationRepository.findReviewApplicationsWithCompany();

        List<Map<String, Object>> decidedApps = applicationRepository.findDecidedApplicationsWithCompany();
        if (decidedApps.size() > 20) {
            decidedApps = decidedApps.subList(0, 20);
        }

        model.addAttribute("reviewApplications", reviewApps);
        model.addAttribute("decidedApplications", decidedApps);
        model.addAttribute("workerName", session.getAttribute("workerName"));
        model.addAttribute("reviewCount", reviewApps.size());
        return "backoffice";
    }

    @PostMapping("/backoffice/decide")
    public String decide(@RequestParam("applicationId") Long applicationId,
                         @RequestParam("decision") String decision,
                         @RequestParam(value = "comment", defaultValue = "") String comment,
                         HttpSession session,
                         Model model) {
        if (session.getAttribute("userId") == null) return "redirect:/login";
        if (!"caseWorker".equals(session.getAttribute("role"))) return "redirect:/login";

        if (!"APPROVED".equals(decision) && !"REJECTED".equals(decision)) {
            return "redirect:/backoffice";
        }

        String workerName = (String) session.getAttribute("workerName");

        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return "redirect:/backoffice";
        }

        Application app = appOpt.get();
        app.setStatus(decision);
        app.setDecision(decision);

        String auditEntry = "{\"ts\":\"" + LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                + "\",\"action\":\"MANUAL_DECISION\",\"decision\":\"" + decision
                + "\",\"worker\":\"" + workerName.replace("\"", "'") + "\""
                + (comment.isEmpty() ? "" : ",\"comment\":\"" + comment.replace("\"", "'") + "\"")
                + "}";

        String currentLog = app.getAuditLog();
        String updatedLog;
        if (currentLog == null || currentLog.equals("[]")) {
            updatedLog = "[" + auditEntry + "]";
        } else {
            updatedLog = currentLog.substring(0, currentLog.lastIndexOf("]")) + "," + auditEntry + "]";
        }
        app.setAuditLog(updatedLog);

        applicationRepository.save(app);

        // No email notification — TODO: implement email via Spring Mail in v2
        // TODO: notify company via email when decision is made

        return "redirect:/backoffice";
    }

    @GetMapping("/backoffice/application/{id}")
    public String viewApplicationDetail(
            @PathVariable("id") Long id,
            HttpSession session,
            Model model) {
        if (session.getAttribute("userId") == null) return "redirect:/login";
        if (!"caseWorker".equals(session.getAttribute("role"))) return "redirect:/login";

        Optional<Application> appOpt = applicationRepository.findById(id);

        if (appOpt.isEmpty()) {
            return "redirect:/backoffice";
        }

        Application app = appOpt.get();
        Company company = companyRepository.findById(app.getCompanyId()).orElse(null);

        model.addAttribute("application", app);
        model.addAttribute("company", company);
        model.addAttribute("auditLogRaw", app.getAuditLog());
        model.addAttribute("workerName", session.getAttribute("workerName"));

        List<Document> docs = documentRepository.findByApplicationIdOrderByUploadedAtDesc(id);
        model.addAttribute("documents", docs);

        return "backoffice_detail";
    }
}
