
package se.comerit.resurs.controller;

import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.ui.Model;
import se.comerit.resurs.model.Company;
import se.comerit.resurs.service.AuthService;
import se.comerit.resurs.service.BankIdService;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class AuthControllerTest {

    private AuthController authController;
    private AuthService authService;
    private BankIdService bankIdService;
    private HttpSession session;
    private Model model;

    @BeforeEach
    void setUp() {
        authController = new AuthController();

        authService = mock(AuthService.class);
        bankIdService = mock(BankIdService.class);
        session = mock(HttpSession.class);
        model = mock(Model.class);

        ReflectionTestUtils.setField(
                authController, "authService", authService);

        ReflectionTestUtils.setField(
                authController, "bankIdService", bankIdService);
    }

    @Test
    void shouldSaveCompanyDetailsInSessionAfterSuccessfulLogin() {

        String orgNumber = "556000-1234";

        Company company = mock(Company.class);

        when(bankIdService.authenticateCompany(orgNumber))
                .thenReturn(true);

        when(authService.findCompany(orgNumber))
                .thenReturn(Optional.of(company));

        when(company.getId()).thenReturn(1L);
        when(company.getCompanyName()).thenReturn("Test AB");

        String result = authController.loginCompany(
                orgNumber, session, model);

        assertEquals("redirect:/apply", result);

        verify(session).setAttribute("userId", 1L);
        verify(session).setAttribute("companyId", 1L);
        verify(session).setAttribute("orgNumber", orgNumber);
        verify(session).setAttribute("role", "company");
        verify(session).setAttribute("companyName", "Test AB");
    }

    @Test
    void shouldRejectCompanyWhenBankIdFails() {
        String orgNumber = "123456-7890";

        when(bankIdService.authenticateCompany(orgNumber))
                .thenReturn(false);

        String result = authController.loginCompany(
                orgNumber, session, model);

        assertEquals("login", result);

        verify(model).addAttribute("activeTab", "company");
        verify(authService, never()).findCompany(orgNumber);
        verify(session, never())
                .setAttribute(eq("companyId"), any());
    }

    @Test
    void shouldInvalidateSessionOnLogout() {
        String result = authController.logout(session);

        assertEquals("redirect:/login", result);
        verify(session).invalidate();
    }

}
