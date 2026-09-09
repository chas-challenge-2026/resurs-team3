package se.comerit.resurs.controller;

import org.springframework.beans.factory.annotation.Autowired;
import se.comerit.resurs.model.CaseWorker;
import se.comerit.resurs.repository.CaseWorkerRepository;
import java.util.Optional;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import se.comerit.resurs.model.Company;
import se.comerit.resurs.repository.CompanyRepository;
import javax.servlet.http.HttpSession;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;


@Controller
public class AuthController {

    @Autowired
    private CaseWorkerRepository caseWorkerRepository;
    @Autowired
    private CompanyRepository companyRepository;

    @GetMapping("/")
    public String root() { return "redirect:/login"; }

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
        // TODO: replace with real BankID integration
        if (orgNumber.equals("556000-1234") || orgNumber.equals("556000-5678")) {
            Optional<Company> companyOpt = companyRepository.findByOrgNumber(orgNumber);
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
        } else {
            model.addAttribute("error", "BankID-autentisering misslyckades. Org.nummer ej godkänt.");
            model.addAttribute("activeTab", "company");
            return "login";
        }
    }

    @PostMapping("/login/caseWorker")
    public String loginCaseWorker(@RequestParam("email") String email,
                                  @RequestParam("password") String password,
                                  HttpSession session,
                                  Model model) {
        String md5 = md5Hash(password);
        Optional<CaseWorker> workerOpt = caseWorkerRepository.findByEmail(email);

        if (workerOpt.isPresent() && workerOpt.get().getPasswordMd5().equals(md5)) {
            CaseWorker worker = workerOpt.get();
            session.setAttribute("userId", worker.getId());
            session.setAttribute("role", "caseWorker");
            session.setAttribute("workerName", worker.getName());
            session.setAttribute("workerEmail", worker.getEmail());
            return "redirect:/backoffice";
        } else {
            model.addAttribute("error", "Felaktigt användarnamn eller lösenord.");
            model.addAttribute("activeTab", "caseWorker");
            return "login";
        }
    }

    @GetMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/login";
    }

    // MD5 — weak, but matches DB seed
    // TODO: migrate to bcrypt before go-live
    private String md5Hash(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] hash = md.digest(input.getBytes());
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("MD5 not available", e);
        }
    }
}
