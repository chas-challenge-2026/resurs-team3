package se.comerit.resurs.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import se.comerit.resurs.service.StatusService;

import javax.servlet.http.HttpSession;
import java.util.Map;

@Controller
public class StatusController {

    private final StatusService statusService;

    public StatusController(StatusService statusService) {
        this.statusService = statusService;
    }

    @GetMapping("/status/{applicationId}")
    public String showStatus(
            @PathVariable("applicationId") Long applicationId,
            HttpSession session,
            Model model
    ) {
        if (session.getAttribute("userId") == null) {
            return "redirect:/login";
        }

        Map<String, Object> application =
                statusService.getApplication(applicationId);

        if (application == null) {
            return "redirect:/applications";
        }

        String currentStatus =
                (String) application.get("status");

        model.addAttribute(
                "application",
                application
        );

        model.addAttribute(
                "steps",
                statusService.buildStatusSteps(currentStatus)
        );

        model.addAttribute(
                "currentStatus",
                currentStatus
        );

        model.addAttribute(
                "documents",
                statusService.getDocuments(applicationId)
        );

        model.addAttribute(
                "auditLogRaw",
                application.get("audit_log")
        );

        return "status";
    }
}