package se.comerit.resurs.service;

import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class CompanyValidationService {
    private final Map<String, String> mockCompanies = Map.of("556000-1234", "Mockföretag AB",
            "556000-5678", "Testbolaget AB");

    public CompanyValidationResult validate(String orgNumber) {
        if (orgNumber == null || orgNumber.isBlank()) {
            return new CompanyValidationResult(false, "Organisationsnummer måste anges.", null);
        }
        String normalizedOrgNumber = normalize(orgNumber);
        if (!isValidFormat(normalizedOrgNumber)) {
            return new CompanyValidationResult(
                    false,
                    "Ogiltigt organisationsnummer. Ange 10 siffror, exempelvis 556000-1234",
                    null);
        }
        String companyName = mockCompanies.get(normalizedOrgNumber);
        if (companyName == null) {
            return  new CompanyValidationResult(
                    false,
                    "Företaget kunde inte hittas i företagsregistret.",
                    null);
        }
        return new CompanyValidationResult(true, "Företaget är validerat.", companyName);
    }
    private String normalize(String orgNumber) {
        return orgNumber.trim().replaceAll("\\s+", "");
    }
    private boolean isValidFormat(String orgNumber) {
        return orgNumber.matches("\\d{6}-\\d{4}");
    }
    public record CompanyValidationResult(
            boolean valid,
            String message,
            String companyName
    ) {}
}

