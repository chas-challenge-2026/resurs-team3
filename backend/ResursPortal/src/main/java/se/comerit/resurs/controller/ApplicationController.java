
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

        model.addAttribute("companyName", session.getAttribute("companyName"));
        model.addAttribute("orgNumber", session.getAttribute("orgNumber"));

        return "apply";
    }

    // ============================================================
    // POST /apply — validera och skapa kreditansökan
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
            @RequestParam(value = "operativtKassaflode", required = false)
            String operativtKassaflodeStr,
            @RequestParam(value = "investeringsKassaflode", required = false)
            String investeringsKassaflodeStr,
            @RequestParam(value = "ranteKostnader", required = false)
            String ranteKostnaderStr,
            @RequestParam(value = "bransch", required = false, defaultValue = "")
            String bransch,
            HttpSession session,
            Model model) {

        // 1. Kontrollera inloggning och roll.

        if (session.getAttribute("userId") == null
                || !"company".equals(session.getAttribute("role"))) {
            return "redirect:/login";
        }

        // 2. Hämta företagets ID från sessionen.

        Object companyIdAttribute = session.getAttribute("companyId");

        if (!(companyIdAttribute instanceof Long)) {
            return "redirect:/login";
        }

        Long companyId = (Long) companyIdAttribute;

        // 3. Hämta företagets registrerade uppgifter från databasen.

        Company company = applicationService.getCompanyById(companyId)
                .orElse(null);

        if (company == null) {
            return "redirect:/login";
        }

        String companyName = company.getCompanyName();
        String orgNumber = company.getOrgNumber();
        String authorizedSignatory = company.getAuthorizedSignatory();

        model.addAttribute("companyName", companyName);
        model.addAttribute("orgNumber", orgNumber);

        // 4. Konvertera de numeriska formulärvärdena.

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

        } catch (NumberFormatException | NullPointerException e) {
            model.addAttribute(
                    "error",
                    "Ogiltiga numeriska värden. Kontrollera dina inmatningar."
            );
            return "apply";
        }

        // 5. Validera företaget och kreditansökan.

        CompanyValidationService.CompanyValidationResult companyResult =
                companyValidationService.validate(orgNumber);

        if (!companyResult.valid()) {
            model.addAttribute("error", companyResult.message());
            return "apply";
        }

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

        // 6. Konvertera valfria kassaflödes- och räntevärden.

        double operativtKassaflode =
                parseOptionalDouble(operativtKassaflodeStr);

        double investeringsKassaflode =
                parseOptionalDouble(investeringsKassaflodeStr);

        double ranteKostnader =
                parseOptionalDouble(ranteKostnaderStr);

        // 7. Beräkna kreditbedömningen.

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

        String decision = scoringResult.getDecision();
        String status = scoringResult.getStatus();

        // 8. Skapa en första audit-logg.

        String timestamp = LocalDateTime.now()
                .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

        String initialAuditLog =
                "[{\"ts\":\"" + timestamp
                        + "\",\"action\":\"APPLICATION_CREATED\",\"orgNumber\":\""
                        + orgNumber + "\"}]";

        // 9. Skapa ansökan kopplad till det inloggade företaget.

        Long applicationId = applicationService.createApplication(
                companyId,
                requestedAmount,
                purpose,
                status,
                decision,
                scoringResult.getDecisionReason(),
                scoringResult.getScoringLog(),
                initialAuditLog
        );

        // 10. Lägg till scoring-resultatet i audit-loggen.

        String scoringAuditEntry =
                "{\"ts\":\""
                        + LocalDateTime.now()
                        .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        + "\",\"action\":\"SCORING_RUN\",\"result\":\""
                        + decision
                        + "\",\"flags\":"
                        + scoringResult.getFlagCount()
                        + "}";

        String currentAuditLog =
                applicationService.getAuditLog(applicationId);

        String updatedAuditLog;

        if (currentAuditLog == null
                || currentAuditLog.isBlank()
                || currentAuditLog.equals("[]")) {

            updatedAuditLog = "[" + scoringAuditEntry + "]";

        } else {
            int closingBracket = currentAuditLog.lastIndexOf("]");

            if (closingBracket == -1) {
                updatedAuditLog =
                        "[" + scoringAuditEntry + "]";
            } else {
                updatedAuditLog =
                        currentAuditLog.substring(0, closingBracket)
                                + "," + scoringAuditEntry
                                + currentAuditLog.substring(closingBracket);
            }
        }

        applicationService.updateAuditLog(
                applicationId,
                updatedAuditLog
        );

        return "redirect:/application/" + applicationId;
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

        Object companyIdAttribute = session.getAttribute("companyId");

        if (!(companyIdAttribute instanceof Long)) {
            return "redirect:/login";
        }

        Long companyId = (Long) companyIdAttribute;

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

            Object companyIdAttribute = session.getAttribute("companyId");

            if (!(companyIdAttribute instanceof Long)) {
                return "redirect:/login";
            }

            Long companyId = (Long) companyIdAttribute;

            appOpt = applicationService.getApplicationForCompany(
                    id,
                    companyId
            );

        } else {
            return "redirect:/login";
        }

        if (appOpt.isEmpty()) {
            return "redirect:/applications";
        }

        Application app = appOpt.get();

        model.addAttribute("application", app);
        model.addAttribute("role", role);
        model.addAttribute("auditLogRaw", app.getAuditLog());
        model.addAttribute(
                "documents",
                applicationService.getDocuments(id)
        );

        return "status";
    }

    // ============================================================
    // GET /dashboard — startsida för företagsanvändare
    // ============================================================

    @GetMapping("/dashboard")
    public String dashboard(HttpSession session, Model model) {

        if (session.getAttribute("userId") == null) {
            return "redirect:/login";
        }

        if (!"company".equals(session.getAttribute("role"))) {
            return "redirect:/backoffice";
        }

        Object companyIdAttribute = session.getAttribute("companyId");

        if (!(companyIdAttribute instanceof Long)) {
            return "redirect:/login";
        }

        Long companyId = (Long) companyIdAttribute;

        model.addAttribute(
                "applications",
                applicationService.getRecentApplicationsForCompany(companyId)
        );

        model.addAttribute(
                "companyName",
                session.getAttribute("companyName")
        );

        return "dashboard";
    }

    // ============================================================
    // Hjälpmetoder för numeriska värden
    // ============================================================

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
