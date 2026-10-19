
package se.comerit.resurs.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ApplicationResponse {

    private final Long applicationId;
    private final String caseNumber;
    private final BigDecimal requestedAmount;
    private final String purpose;
    private final String status;
    private final String decision;
    private final String decisionReason;
    private final LocalDateTime createdAt;
    private final String companyName;

    public ApplicationResponse(
            Long applicationId,
            String caseNumber,
            BigDecimal requestedAmount,
            String purpose,
            String status,
            String decision,
            String decisionReason,
            LocalDateTime createdAt,
            String companyName) {

        this.applicationId = applicationId;
        this.caseNumber = caseNumber;
        this.requestedAmount = requestedAmount;
        this.purpose = purpose;
        this.status = status;
        this.decision = decision;
        this.decisionReason = decisionReason;
        this.createdAt = createdAt;
        this.companyName = companyName;
    }

    public Long getApplicationId() {
        return applicationId;
    }

    public String getCaseNumber() {
        return caseNumber;
    }

    public BigDecimal getRequestedAmount() {
        return requestedAmount;
    }

    public String getPurpose() {
        return purpose;
    }

    public String getStatus() {
        return status;
    }

    public String getDecision() {
        return decision;
    }

    public String getDecisionReason() {
        return decisionReason;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public String getCompanyName() {
        return companyName;
    }
}
