package se.comerit.resurs.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import se.comerit.resurs.service.BackofficeService;

import javax.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;

@Controller
public class BackofficeController {

    private final BackofficeService backofficeService;

    public BackofficeController(BackofficeService backofficeService) {
        this.backofficeService = backofficeService;
    }

    @GetMapping("/backoffice")
    public String backofficeOverview(
            HttpSession session,
            Model model
    ) {
        if (session.getAttribute("userId") == null) {
            return "redirect:/login";
        }

        if (!"caseWorker".equals(session.getAttribute("role"))) {
            return "redirect:/login";
        }

        List<Map<String, Object>> reviewApps =
                backofficeService.getApplicationsUnderReview();

        List<Map<String, Object>> decidedApps =
                backofficeService.getRecentDecidedApplications();

        model.addAttribute(
                "reviewApplications",
                reviewApps
        );

        model.addAttribute(
                "decidedApplications",
                decidedApps
        );

        model.addAttribute(
                "workerName",
                session.getAttribute("workerName")
        );

        model.addAttribute(
                "reviewCount",
                reviewApps.size()
        );

        return "backoffice";
    }

    @PostMapping("/backoffice/decide")
    public String decide(
            @RequestParam("applicationId") Long applicationId,
            @RequestParam("decision") String decision,
            @RequestParam(value = "comment", defaultValue = "") String comment,
            HttpSession session,
            Model model
    ) {
        if (session.getAttribute("userId") == null) {
            return "redirect:/login";
        }

        if (!"caseWorker".equals(session.getAttribute("role"))) {
            return "redirect:/login";
        }

        if (!backofficeService.isValidDecision(decision)) {
            return "redirect:/backoffice";
        }

        String workerName =
                (String) session.getAttribute("workerName");

        backofficeService.decideApplication(
                applicationId,
                decision,
                workerName,
                comment
        );

        return "redirect:/backoffice";
    }

    @GetMapping("/backoffice/application/{id}")
    public String viewApplicationDetail(
            @PathVariable("id") Long id,
            HttpSession session,
            Model model
    ) {
        if (session.getAttribute("userId") == null) {
            return "redirect:/login";
        }

        if (!"caseWorker".equals(session.getAttribute("role"))) {
            return "redirect:/login";
        }

        Map<String, Object> application =
                backofficeService.getApplicationById(id);

        if (application == null) {
            return "redirect:/backoffice";
        }

        model.addAttribute(
                "application",
                application
        );

        model.addAttribute(
                "auditLogRaw",
                application.get("audit_log")
        );

        model.addAttribute(
                "workerName",
                session.getAttribute("workerName")
        );

        model.addAttribute(
                "documents",
                backofficeService.getDocuments(id)
        );

        return "backoffice_detail";
    }
}