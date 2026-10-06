package se.comerit.resurs.service;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class CreditApplicationValidationService {
    public List<String> validate(
            String companyName,
            String orgNumber,
            String authorizedSignatory,
            String purpose,
            BigDecimal requestedAmount,
            BigDecimal nettoomsattning
    ) {
        List<String> errors = new ArrayList<>();
        if (companyName == null || companyName.isBlank()) {
            errors.add("Företagsnamn måste anges.");
        }
        if (orgNumber == null || orgNumber.isBlank()) {
            errors.add("Organisationsnummer måste anges.");
        } else if (!orgNumber.trim().matches("\\d{6}-\\d{4}")) {
            errors.add("Ogiltigt organisationsnummer. Ange formatet 556000-1234.");
        }
        if (authorizedSignatory == null || authorizedSignatory.isBlank()) {
            errors.add("Behörig firmatecknare måste anges.");
        }
        if (purpose == null || purpose.isBlank()) {
            errors.add("Syfte med krediten måste anges.");
        }
        if (requestedAmount == null) {
            errors.add("Önskat kreditbelopp måste anges.");
        } else if (requestedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            errors.add("Önskat kreditbelopp måste vara större än 0.");
        }
        if (annualTurnover == null) {
            errors.add("Årsomsättning måste anges.");
        } else if (annualTurnover.compareTo(BigDecimal.ZERO) < 0) {
            errors.add("Årsomsättning kan inte vara negativ.");
        }
        return errors;
    }
}
