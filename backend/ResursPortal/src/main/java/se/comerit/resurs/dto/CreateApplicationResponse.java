package se.comerit.resurs.dto;

public class CreateApplicationResponse {

    private final Long applicationId;
    private final String status;
    private final String decision;
    private final String decisionReason;
    private final int flagCount;
    private final int creditScore;

    public CreateApplicationResponse(
            Long applicationId,
            String status,
            String decision,
            String decisionReason,
            int flagCount,
            int creditScore) {

        this.applicationId = applicationId;
        this.status = status;
        this.decision = decision;
        this.decisionReason = decisionReason;
        this.flagCount = flagCount;
        this.creditScore = creditScore;
    }

    public Long getApplicationId() {
        return applicationId;
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

    public int getFlagCount() {
        return flagCount;
    }

    public int getCreditScore() {
        return creditScore;
    }
}