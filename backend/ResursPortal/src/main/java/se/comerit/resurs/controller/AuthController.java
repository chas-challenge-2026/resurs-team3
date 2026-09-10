package se.comerit.resurs.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import se.comerit.resurs.service.AuthService;

import javax.servlet.http.HttpSession;
import java.util.Map;

@Controller
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/")
    public String root() {
        return "redirect:/login";
    }

    @GetMapping("/login")
    public String loginPage(
            HttpSession session,
            Model model
    ) {
        if (session.getAttribute("userId") != null) {
            String role = (String) session.getAttribute("role");

            if ("caseWorker".equals(role)) {
                return "redirect:/backoffice";
            }

            return "redirect:/apply";
        }

        model.addAttribute("error", null);
        return "login";
    }

    @PostMapping("/login/company")
    public String loginCompany(
            @RequestParam("orgNumber") String orgNumber,
            HttpSession session,
            Model model
    ) {
        if (!authService.isAllowedCompanyOrgNumber(orgNumber)) {
            model.addAttribute(
                    "error",
                    "BankID-autentisering misslyckades. Org.nummer ej godkänt."
            );
            model.addAttribute("activeTab", "company");

            return "login";
        }

        Map<String, Object> company =
                authService.findCompany(orgNumber);

        if (company == null) {
            model.addAttribute(
                    "error",
                    "Företaget hittades inte i systemet."
            );
            model.addAttribute("activeTab", "company");

            return "login";
        }

        session.setAttribute("userId", company.get("id"));
        session.setAttribute("role", "company");
        session.setAttribute("orgNumber", orgNumber);
        session.setAttribute(
                "companyName",
                company.get("company_name")
        );
        session.setAttribute("companyId", company.get("id"));

        return "redirect:/apply";
    }

    @PostMapping("/login/caseWorker")
    public String loginCaseWorker(
            @RequestParam("email") String email,
            @RequestParam("password") String password,
            HttpSession session,
            Model model
    ) {
        Map<String, Object> worker =
                authService.authenticateCaseWorker(
                        email,
                        password
                );

        if (worker == null) {
            model.addAttribute(
                    "error",
                    "Felaktigt användarnamn eller lösenord."
            );
            model.addAttribute("activeTab", "caseWorker");

            return "login";
        }

        session.setAttribute("userId", worker.get("id"));
        session.setAttribute("role", "caseWorker");
        session.setAttribute(
                "workerName",
                worker.get("name")
        );
        session.setAttribute(
                "workerEmail",
                worker.get("email")
        );

        return "redirect:/backoffice";
    }

    @GetMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/login";
    }
}