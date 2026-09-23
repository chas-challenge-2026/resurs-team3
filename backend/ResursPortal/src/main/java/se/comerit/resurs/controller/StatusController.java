package se.comerit.resurs.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import se.comerit.resurs.model.Application;
import se.comerit.resurs.model.Document;
import se.comerit.resurs.service.StatusService;

import javax.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Controller
public class StatusController {

    @Autowired
    private StatusService statusService;

    @GetMapping("/status/{applicationId}")
    public String showStatus(@PathVariable("applicationId") Long applicationId,
                             HttpSession session,
                             Model model) {
        if (session.getAttribute("userId") == null) return "redirect:/login";

        Optional<Application> appOpt = statusService.getApplication(applicationId);

        if (appOpt.isEmpty()) {
            return "redirect:/applications";
        }

        Application app = appOpt.get();
        String currentStatus = app.getStatus();

        model.addAttribute("application", app);
        model.addAttribute("steps", statusService.buildStatusSteps(currentStatus));
        model.addAttribute("currentStatus", currentStatus);

        List<Document> docs = statusService.getDocuments(applicationId);
        model.addAttribute("documents", docs);

        model.addAttribute("auditLogRaw", app.getAuditLog());

        return "status";
    }
}