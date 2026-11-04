package se.comerit.resurs.service;

import org.springframework.stereotype.Service;

import java.util.Set;

@Service
public class BankIdService {

    private static final Set<String> ALLOWED_ORG_NUMBERS = Set.of(
            "556000-1234",
            "556000-5678"
    );

    public boolean authenticateCompany(String orgNumber) {
        if (orgNumber == null || orgNumber.isBlank()) {
            return false;
        }

        return ALLOWED_ORG_NUMBERS.contains(orgNumber);
    }
}