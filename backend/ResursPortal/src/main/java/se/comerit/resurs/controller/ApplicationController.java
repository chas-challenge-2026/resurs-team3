package se.comerit.resurs.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import se.comerit.resurs.model.Application;
import se.comerit.resurs.model.Company;
import se.comerit.resurs.service.ApplicationService;
import se.comerit.resurs.service.CompanyValidationService;
import se.comerit.resurs.service.CreditApplicationValidationService;
import se.comerit.resurs.service.ScoringResult;
import se.comerit.resurs.service.ScoringService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Controller
public class ApplicationController {

    private final ScoringService scoringService;
    private final ApplicationService applicationService;
    private final CompanyValidationService companyValidationService;
    private final CreditApplicationValidationService validationService;

    public ApplicationController(
            ScoringService scoringService,
            ApplicationService applicationService,
            CompanyValidationService companyValidationService,
            CreditApplicationValidationService validationService) {

        this.scoringService = scoringService;
        this.applicationService = applicationService;
        this.companyValidationService = companyValidationService;
        this.validationService = validationService;
    }

    // ============================================================
    // GET /apply — visa ansökningsformulär
    // ============================================================

    @GetMapping("/apply")
    public String showApplyForm(HttpSession session, Model model) {

        if (session.getAttribute("userId") == null) {
            return "redirect:/login";
        }

        if (!"company".equals(session.getAttribute("role"))) {
            return "redirect:/login";
        }

        Long companyId = resolveCompanyId(session);

        if (companyId == null) {
            return "redirect:/login";
        }

        Optional<Company> companyOpt =
                applicationService.getCompanyById(companyId);

        if (companyOpt.isEmpty()) {
            return "redirect:/login";
        }

        Company company = companyOpt.get();

        model.addAttribute("companyName", company.getCompanyName());
        model.addAttribute("orgNumber", company.getOrgNumber());

        return "apply";
    }

    // ============================================================
    // POST /apply — skapa ansökan och kör scoring
    // ============================================================

    @PostMapping("/apply")
    public String submitApplication(
            @RequestParam("egetKapital") String egetKapitalStr,
            @RequestParam("totaltKapital") String totaltKapitalStr,
            @RequestParam("omsattningstillgangar") String omsattningstillgangarStr,
            @RequestParam("kortfristigaSkulder") String kortfristigaSkulderStr,
            @RequestParam("totalaSkulder") String totalaSkulderStr,
            @RequestParam("rorelseresultat") String rorelseresultatStr,
            @RequestParam("nettoomsattning") String nettoomsattningStr,
            @RequestParam("requestedAmount") String requestedAmountStr,
            @RequestParam("purpose") String purpose,
            @RequestParam(value = "operativtKassaflode", defaultValue = "") String operativtKassaflodeStr,
            @RequestParam(value = "investeringsKassaflode", defaultValue = "") String investeringsKassaflodeStr,
            @RequestParam(value = "ranteKostnader", defaultValue = "") String ranteKostnaderStr,
            @RequestParam(value = "bransch", defaultValue = "") String bransch,
            HttpSession session,
            Model model) {

        // 1. Kontrollera inloggning och roll.
        if (session.getAttribute("userId") == null) {
            return "redirect:/login";
        }

        if (!"company".equals(session.getAttribute("role"))) {
            return "redirect:/login";
        }

        // 2. Hämta företagets identitet från sessionen.
        Long companyId = resolveCompanyId(session);

        if (companyId == null) {
            return "redirect:/login";
        }

        Optional<Company> companyOpt =
                applicationService.getCompanyById(companyId);

        if (companyOpt.isEmpty()) {
            return "redirect:/login";
        }

        Company company = companyOpt.get();

        String orgNumber = company.getOrgNumber();
        String companyName = company.getCompanyName();
        String authorizedSignatory = company.getAuthorizedSignatory();

        // Gör så att formuläret kan visa företagets uppgifter vid fel.
        model.addAttribute("companyName", companyName);
        model.addAttribute("orgNumber", orgNumber);

        // 3. Konvertera numeriska inmatningar.
        double egetKapital;
        double totaltKapital;
        double omsattningstillgangar;
        double kortfristigaSkulder;
        double totalaSkulder;
        double rorelseresultat;
        double nettoomsattning;
        BigDecimal requestedAmount;

        double operativtKassaflode;
        double investeringsKassaflode;
        double ranteKostnader;

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

            operativtKassaflode = parseOptionalDouble(operativtKassaflodeStr);
            investeringsKassaflode = parseOptionalDouble(investeringsKassaflodeStr);
            ranteKostnader = parseOptionalDouble(ranteKostnaderStr);

        } catch (NumberFormatException e) {
            model.addAttribute(
                    "error",
                    "Ogiltiga numeriska värden. Kontrollera dina inmatningar."
            );

            return "apply";
        }

        // 4. Validera ansökningsuppgifterna.
        List<String> validationErrors = validationService.validate(
                companyName,
                orgNumber,
                authorizedSignatory,
                purpose,
                requestedAmount,
                BigDecimal.valueOf(nettoomsattning)
        );

        if (!validationErrors.isEmpty()) {
            model.addAttribute("validationErrors", validationErrors);
            model.addAttribute("requestedAmount", requestedAmount);
            model.addAttribute("nettoomsattning", nettoomsattning);

            return "apply";
        }

        // 5. Kontrollera organisationsnumret.
        CompanyValidationService.CompanyValidationResult validationResult =
                companyValidationService.validate(orgNumber);

        if (!validationResult.valid()) {
            model.addAttribute("error", validationResult.message());
            return "apply";
        }

        // 6. Kör kreditbedömningen.
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

        // 7. Skapa en initial audit log.
        String timestamp = LocalDateTime.now()
                .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

        String initialAuditLog =
                "[{\"ts\":\"" + timestamp
                        + "\",\"action\":\"APPLICATION_CREATED\""
                        + ",\"orgNumber\":\"" + orgNumber + "\"}]";

        // 8. Spara ansökan med företagets ID från sessionen.
        Long applicationId = applicationService.createApplication(
                companyId,
                requestedAmount,
                purpose,
                scoringResult.getStatus(),
                scoringResult.getDecision(),
                scoringResult.getDecisionReason(),
                scoringResult.getScoringLog(),
                initialAuditLog
        );

        // 9. Lägg till bedömningen i audit log.
        String scoringAuditEntry =
                "{\"ts\":\"" + LocalDateTime.now()
                        .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        + "\",\"action\":\"SCORING_RUN\""
                        + ",\"result\":\"" + scoringResult.getDecision()
                        + "\",\"flags\":" + scoringResult.getFlagCount()
                        + "}";

        String currentAuditLog =
                applicationService.getAuditLog(applicationId);

        String updatedAuditLog;

        if (currentAuditLog == null
                || currentAuditLog.isBlank()
                || currentAuditLog.equals("[]")) {

            updatedAuditLog = "[" + scoringAuditEntry + "]";

        } else {
            updatedAuditLog = currentAuditLog.substring(
                    0,
                    currentAuditLog.lastIndexOf("]")
            ) + "," + scoringAuditEntry + "]";
        }

        applicationService.updateAuditLog(
                applicationId,
                updatedAuditLog
        );

        // 10. Visa den skapade ansökan.
        return "redirect:/application/" + applicationId;
    }

    // ============================================================
    // GET /application/{id} — visa en enskild ansökan
    // ============================================================

    @GetMapping("/application/{id}")
    public String viewApplication(
            @PathVariable("id") Long id,
            HttpSession session,
            Model model) {

        if (session.getAttribute("userId") == null) {
            return "redirect:/login";
        }

        String role = (String) session.getAttribute("role");
        Optional<Application> appOpt;

        if ("caseWorker".equals(role)) {

            appOpt = applicationService.getApplicationForCaseWorker(id);

        } else if ("company".equals(role)) {

            Long companyId = resolveCompanyId(session);

            if (companyId == null) {
                return "redirect:/login";
            }

            // Hämtar endast ansökan om den tillhör detta företag.
            appOpt = applicationService.getApplicationForCompany(
                    id,
                    companyId
            );

        } else {
            return "redirect:/login";
        }

        if (appOpt.isEmpty()) {
            if ("caseWorker".equals(role)) {
                return "redirect:/backoffice";
            }

            return "redirect:/applications";
        }

        Application app = appOpt.get();

        model.addAttribute("application", app);
        model.addAttribute("role", role);
        model.addAttribute("auditLogRaw", app.getAuditLog());
        model.addAttribute("documents", applicationService.getDocuments(id));

        return "status";
    }

    // ============================================================
    // GET /applications — lista företagets ansökningar
    // ============================================================

    @GetMapping("/applications")
    public String listApplications(HttpSession session, Model model) {

        if (session.getAttribute("userId") == null) {
            return "redirect:/login";
        }

        if (!"company".equals(session.getAttribute("role"))) {
            return "redirect:/login";
        }

        Long companyId = resolveCompanyId(session);

        if (companyId == null) {
            model.addAttribute("applications", Collections.emptyList());
            return "applications";
        }

        model.addAttribute(
                "applications",
                applicationService.getApplicationsForCompany(companyId)
        );

        model.addAttribute("companyName", session.getAttribute("companyName"));

        return "applications";
    }

    // ============================================================
    // GET /dashboard — företagets startsida
    // ============================================================

    @GetMapping("/dashboard")
    public String dashboard(HttpSession session, Model model) {

        if (session.getAttribute("userId") == null) {
            return "redirect:/login";
        }

        if (!"company".equals(session.getAttribute("role"))) {
            return "redirect:/backoffice";
        }

        Long companyId = resolveCompanyId(session);

        if (companyId == null) {
            model.addAttribute("applications", Collections.emptyList());
        } else {
            model.addAttribute(
                    "applications",
                    applicationService.getRecentApplicationsForCompany(companyId)
            );
        }

        model.addAttribute("companyName", session.getAttribute("companyName"));

        return "dashboard";
    }

    // ============================================================
    // Hjälpmetoder
    // ============================================================

    private Long resolveCompanyId(HttpSession session) {

        Long companyId = (Long) session.getAttribute("companyId");

        if (companyId != null) {
            return companyId;
        }

        String orgNumber = (String) session.getAttribute("orgNumber");

        if (orgNumber == null || orgNumber.isBlank()) {
            return null;
        }

        companyId = applicationService.findCompanyIdByOrgNumber(orgNumber);

        if (companyId != null) {
            session.setAttribute("companyId", companyId);
        }

        return companyId;
    }

    private double parseDouble(String value) {
        return Double.parseDouble(value.replace(",", ".").trim());
    }

    private double parseOptionalDouble(String value) {
        if (value == null || value.trim().isEmpty()) {
            return 0.0;
        }

        return parseDouble(value);
    }
}