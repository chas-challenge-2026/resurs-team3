package se.comerit.resurs.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import se.comerit.resurs.service.ApplicationService;
import se.comerit.resurs.service.ScoringResult;
import se.comerit.resurs.service.ScoringService;

import javax.servlet.http.HttpSession;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Controller
public class ApplicationController {

    private final ScoringService scoringService;
    private final ApplicationService applicationService;

    public ApplicationController(
            ScoringService scoringService,
            ApplicationService applicationService
    ) {
        this.scoringService = scoringService;
        this.applicationService = applicationService;
    }

    @GetMapping("/apply")
    public String showApplyForm(HttpSession session, Model model) {

        if (session.getAttribute("userId") == null) {
            return "redirect:/login";
        }

        if (!"company".equals(session.getAttribute("role"))) {
            return "redirect:/login";
        }

        model.addAttribute("companyName", session.getAttribute("companyName"));
        model.addAttribute("orgNumber", session.getAttribute("orgNumber"));

        return "apply";
    }

    @PostMapping("/apply")
    public String submitApplication(
            @RequestParam("orgNumber") String orgNumber,
            @RequestParam("companyName") String companyName,
            @RequestParam("authorizedSignatory") String authorizedSignatory,
            @RequestParam("egetKapital") String egetKapitalStr,
            @RequestParam("totaltKapital") String totaltKapitalStr,
            @RequestParam("omsattningstillgangar") String omsattningstillgangarStr,
            @RequestParam("kortfristigaSkulder") String kortfristigaSkulderStr,
            @RequestParam("totalaSkulder") String totalaSkulderStr,
            @RequestParam("rorelseresultat") String rorelseresultatStr,
            @RequestParam("nettoomsattning") String nettoomsattningStr,
            @RequestParam("requestedAmount") String requestedAmountStr,
            @RequestParam("purpose") String purpose,
            @RequestParam(value = "operativtKassaflode", defaultValue = "")
            String operativtKassaflodeStr,
            @RequestParam(value = "investeringsKassaflode", defaultValue = "")
            String investeringsKassaflodeStr,
            @RequestParam(value = "ranteKostnader", defaultValue = "")
            String ranteKostnaderStr,
            @RequestParam(value = "bransch", defaultValue = "")
            String bransch,
            HttpSession session,
            Model model
    ) {

        if (session.getAttribute("userId") == null) {
            return "redirect:/login";
        }

        if (!"company".equals(session.getAttribute("role"))) {
            return "redirect:/login";
        }

        double egetKapital;
        double totaltKapital;
        double omsattningstillgangar;
        double kortfristigaSkulder;
        double totalaSkulder;
        double rorelseresultat;
        double nettoomsattning;
        BigDecimal requestedAmount;

        try {
            egetKapital = parseDouble(egetKapitalStr);
            totaltKapital = parseDouble(totaltKapitalStr);
            omsattningstillgangar = parseDouble(omsattningstillgangarStr);
            kortfristigaSkulder = parseDouble(kortfristigaSkulderStr);
            totalaSkulder = parseDouble(totalaSkulderStr);
            rorelseresultat = parseDouble(rorelseresultatStr);
            nettoomsattning = parseDouble(nettoomsattningStr);

            requestedAmount = new BigDecimal(
                    requestedAmountStr.replace(",", ".").trim()
            );

        } catch (NumberFormatException e) {

            model.addAttribute(
                    "error",
                    "Ogiltiga numeriska värden. Kontrollera dina inmatningar."
            );

            model.addAttribute("companyName", companyName);
            model.addAttribute("orgNumber", orgNumber);

            return "apply";
        }

        double operativtKassaflode =
                parseOptionalDouble(operativtKassaflodeStr);

        double investeringsKassaflode =
                parseOptionalDouble(investeringsKassaflodeStr);

        double ranteKostnader =
                parseOptionalDouble(ranteKostnaderStr);

        ScoringResult scoringResult = scoringService.evaluate(
                egetKapital,
                totaltKapital,
                omsattningstillgangar,
                kortfristigaSkulder,
                totalaSkulder,
                rorelseresultat,
                nettoomsattning,
                requestedAmount,
                operativtKassaflode,
                investeringsKassaflode,
                ranteKostnader,
                bransch
        );

        long companyId = applicationService.findOrCreateCompany(
                orgNumber,
                companyName,
                authorizedSignatory
        );

        session.setAttribute("companyId", companyId);

        String decision = scoringResult.getDecision();
        String status = scoringResult.getStatus();
        String decisionReason = scoringResult.getDecisionReason();
        String scoringLog = scoringResult.getScoringLog();
        int flagCount = scoringResult.getFlagCount();

        String initialAuditLog =
                "[{\"ts\":\"" +
                        LocalDateTime.now()
                                .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) +
                        "\",\"action\":\"APPLICATION_CREATED\"," +
                        "\"orgNumber\":\"" + orgNumber + "\"}]";

        long applicationId = applicationService.createApplication(
                companyId,
                requestedAmount,
                purpose,
                status,
                decision,
                decisionReason,
                scoringLog,
                initialAuditLog
        );

        String scoringAuditEntry =
                "{\"ts\":\"" +
                        LocalDateTime.now()
                                .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) +
                        "\",\"action\":\"SCORING_RUN\"," +
                        "\"result\":\"" + decision + "\"," +
                        "\"flags\":" + flagCount + "}";

        String currentAuditLog =
                applicationService.getAuditLog(applicationId);

        String updatedAuditLog;

        if (currentAuditLog == null || currentAuditLog.equals("[]")) {

            updatedAuditLog =
                    "[" + scoringAuditEntry + "]";

        } else {

            updatedAuditLog =
                    currentAuditLog.substring(
                            0,
                            currentAuditLog.lastIndexOf("]")
                    )
                            + ","
                            + scoringAuditEntry
                            + "]";
        }

        applicationService.updateAuditLog(
                applicationId,
                updatedAuditLog
        );

        return "redirect:/application/" + applicationId;
    }

    @GetMapping("/application/{id}")
    public String viewApplication(
            @PathVariable("id") Long id,
            HttpSession session,
            Model model
    ) {

        if (session.getAttribute("userId") == null) {
            return "redirect:/login";
        }

        String role = (String) session.getAttribute("role");

        List<Map<String, Object>> applications;

        if ("caseWorker".equals(role)) {

            applications =
                    applicationService.getApplicationForCaseWorker(id);

        } else {

            Long companyId =
                    (Long) session.getAttribute("companyId");

            if (companyId == null) {

                String orgNumber =
                        (String) session.getAttribute("orgNumber");

                companyId =
                        applicationService.findCompanyIdByOrgNumber(orgNumber);

                if (companyId == null) {
                    return "redirect:/apply";
                }

                session.setAttribute("companyId", companyId);
            }

            applications =
                    applicationService.getApplicationForCompany(
                            id,
                            companyId
                    );
        }

        if (applications.isEmpty()) {
            return "redirect:/applications";
        }

        Map<String, Object> application =
                applications.get(0);

        model.addAttribute(
                "application",
                application
        );

        model.addAttribute(
                "role",
                role
        );

        model.addAttribute(
                "auditLogRaw",
                application.get("audit_log")
        );

        model.addAttribute(
                "documents",
                applicationService.getDocuments(id)
        );

        return "status";
    }

    @GetMapping("/applications")
    public String listApplications(
            HttpSession session,
            Model model
    ) {

        if (session.getAttribute("userId") == null) {
            return "redirect:/login";
        }

        if (!"company".equals(session.getAttribute("role"))) {
            return "redirect:/login";
        }

        String orgNumber =
                (String) session.getAttribute("orgNumber");

        Long companyId =
                applicationService.findCompanyIdByOrgNumber(orgNumber);

        if (companyId == null) {

            model.addAttribute(
                    "applications",
                    Collections.emptyList()
            );

            return "applications";
        }

        model.addAttribute(
                "applications",
                applicationService.getApplicationsForCompany(companyId)
        );

        model.addAttribute(
                "companyName",
                session.getAttribute("companyName")
        );

        return "applications";
    }

    @GetMapping("/dashboard")
    public String dashboard(
            HttpSession session,
            Model model
    ) {

        if (session.getAttribute("userId") == null) {
            return "redirect:/login";
        }

        if (!"company".equals(session.getAttribute("role"))) {
            return "redirect:/backoffice";
        }

        String orgNumber =
                (String) session.getAttribute("orgNumber");

        Long companyId =
                applicationService.findCompanyIdByOrgNumber(orgNumber);

        if (companyId == null) {

            model.addAttribute(
                    "applications",
                    Collections.emptyList()
            );

        } else {

            model.addAttribute(
                    "applications",
                    applicationService
                            .getRecentApplicationsForCompany(companyId)
            );
        }

        model.addAttribute(
                "companyName",
                session.getAttribute("companyName")
        );

        return "dashboard";
    }

    private double parseDouble(String value) {
        return Double.parseDouble(
                value.replace(",", ".").trim()
        );
    }

    private double parseOptionalDouble(String value) {

        if (value == null || value.trim().isEmpty()) {
            return 0.0;
        }

        try {
            return parseDouble(value);

        } catch (NumberFormatException e) {
            return 0.0;
        }
    }
}