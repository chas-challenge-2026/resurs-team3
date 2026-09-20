package se.comerit.resurs.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import se.comerit.resurs.model.Application;
import se.comerit.resurs.model.Company;
import se.comerit.resurs.model.Document;
import se.comerit.resurs.service.BackofficeService;

import javax.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * BackofficeController – Handläggargränssnitt för manuell granskning.
 * <p>
 * Kvarvarande kända brister:
 * - Ingen e-postnotifiering vid beslut
 * - Session check copy-pasteat (borde vara en interceptor)
 * TODO: implement email via Spring Mail in v2
 * TODO: notify company via email when decision is made
 */
@Controller
public class BackofficeController {

    private final BackofficeService backofficeService;

    public BackofficeController(BackofficeService backofficeService) {
        this.backofficeService = backofficeService;
    }

    @GetMapping("/backoffice")
    public String backofficeOverview(HttpSession session, Model model) {
        // Session check copy-pasted in every method — should be an interceptor
        if (session.getAttribute("userId") == null) return "redirect:/login";
        if (!"caseWorker".equals(session.getAttribute("role"))) return "redirect:/login";

        List<Map<String, Object>> reviewApps = backofficeService.getApplicationsUnderReview();
        List<Map<String, Object>> decidedApps = backofficeService.getRecentDecidedApplications();

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

        if (!backofficeService.isValidDecision(decision)) {
            return "redirect:/backoffice";
        }

        String workerName = (String) session.getAttribute("workerName");
        backofficeService.decideApplication(applicationId, decision, workerName, comment);

        // No email notification — TODO: implement email via Spring Mail in v2
        // TODO: notify company via email when decision is made

        return "redirect:/backoffice";
    }

    @GetMapping("/backoffice/application/{id}")
    public String viewApplicationDetail(@PathVariable("id") Long id,
                                        HttpSession session,
                                        Model model) {
        if (session.getAttribute("userId") == null) return "redirect:/login";
        if (!"caseWorker".equals(session.getAttribute("role"))) return "redirect:/login";

        Optional<Application> appOpt = backofficeService.getApplicationById(id);

        if (appOpt.isEmpty()) {
            return "redirect:/backoffice";
        }

        Application app = appOpt.get();
        Company company = backofficeService.getCompanyForApplication(app).orElse(null);

        model.addAttribute("application", app);
        model.addAttribute("company", company);
        model.addAttribute("auditLogRaw", app.getAuditLog());
        model.addAttribute("workerName", session.getAttribute("workerName"));

        List<Document> docs = backofficeService.getDocuments(id);
        model.addAttribute("documents", docs);

        return "backoffice_detail";
    }
}