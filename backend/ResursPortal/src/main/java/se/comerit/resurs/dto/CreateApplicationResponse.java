package se.comerit.resurs.dto;

public class CreateApplicationResponse {

    private final Long applicationId;
    private final String caseNumber;
    private final String status;
    private final String decision;
    private final String decisionReason;
    private final int flagCount;
    private final int creditScore;
    private final String companyName;
    private final String orgNumber;
    private final String authorizedSignatory;


    public CreateApplicationResponse(
            Long applicationId,
            String caseNumber,
            String status,
            String decision,
            String decisionReason,
            int flagCount,
            String companyName,
            String orgNumber,
            String authorizedSignatory,
            int creditScore) {


        this.applicationId = applicationId;
        this.status = status;
        this.decision = decision;
        this.decisionReason = decisionReason;
        this.flagCount = flagCount;
        this.creditScore = creditScore;
        this.caseNumber = caseNumber;
        this.companyName = companyName;
        this.orgNumber = orgNumber;
        this.authorizedSignatory = authorizedSignatory;
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

    public String getCaseNumber() { return caseNumber;
    }
    public String getCompanyName() {
        return companyName;
    }

    public String getOrgNumber() {
        return orgNumber;
    }

    public String getAuthorizedSignatory() {
        return authorizedSignatory;
    }
}