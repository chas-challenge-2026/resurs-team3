package se.comerit.resurs.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BankIdServiceTest {

    private final BankIdService bankIdService = new BankIdService();

    @Test
    void shouldAuthenticateAllowedCompany() {
        boolean result =
                bankIdService.authenticateCompany("556000-1234");

        assertTrue(result);
    }

    @Test
    void shouldRejectUnknownCompany() {
        boolean result =
                bankIdService.authenticateCompany("123456-7890");

        assertFalse(result);
    }

    @Test
    void shouldRejectBlankOrgNumber() {
        boolean result =
                bankIdService.authenticateCompany("");

        assertFalse(result);
    }

    @Test
    void shouldRejectNullOrgNumber() {
        boolean result =
                bankIdService.authenticateCompany(null);

        assertFalse(result);
    }
}
