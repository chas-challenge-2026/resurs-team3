package se.comerit.resurs.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import se.comerit.resurs.model.CaseWorker;
import se.comerit.resurs.model.Company;
import se.comerit.resurs.service.AuthService;

import javax.servlet.http.HttpSession;
import java.util.Optional;

@Controller
public class AuthController {

    @Autowired
    private AuthService authService;

    @GetMapping("/")
    public String root() {
        return "redirect:/login";
    }

    @GetMapping("/login")
    public String loginPage(HttpSession session, Model model) {
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

    // BankID mock — hardcoded org numbers, real BankID integration skipped
    // TODO: replace with real BankID integration
    @PostMapping("/login/company")
    public String loginCompany(@RequestParam("orgNumber") String orgNumber,
                               HttpSession session,
                               Model model) {
        if (!authService.isAllowedCompanyOrgNumber(orgNumber)) {
            model.addAttribute("error", "BankID-autentisering misslyckades. Org.nummer ej godkänt.");
            model.addAttribute("activeTab", "company");
            return "login";
        }

        Optional<Company> companyOpt = authService.findCompany(orgNumber);

        if (companyOpt.isEmpty()) {
            model.addAttribute("error", "Företaget hittades inte i systemet.");
            model.addAttribute("activeTab", "company");
            return "login";
        }

        Company company = companyOpt.get();
        session.setAttribute("userId", company.getId());
        session.setAttribute("role", "company");
        session.setAttribute("orgNumber", orgNumber);
        session.setAttribute("companyName", company.getCompanyName());
        session.setAttribute("companyId", company.getId());

        return "redirect:/apply";
    }

    @PostMapping("/login/caseWorker")
    public String loginCaseWorker(@RequestParam("email") String email,
                                  @RequestParam("password") String password,
                                  HttpSession session,
                                  Model model) {
        Optional<CaseWorker> workerOpt = authService.authenticateCaseWorker(email, password);

        if (workerOpt.isEmpty()) {
            model.addAttribute("error", "Felaktigt användarnamn eller lösenord.");
            model.addAttribute("activeTab", "caseWorker");
            return "login";
        }

        CaseWorker worker = workerOpt.get();
        session.setAttribute("userId", worker.getId());
        session.setAttribute("role", "caseWorker");
        session.setAttribute("workerName", worker.getName());
        session.setAttribute("workerEmail", worker.getEmail());

        return "redirect:/backoffice";
    }

    @GetMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/login";
    }
}