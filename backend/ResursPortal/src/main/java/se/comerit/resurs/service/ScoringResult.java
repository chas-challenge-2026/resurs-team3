package se.comerit.resurs.service;

public class ScoringResult {

    private final String decision;
    private final String status;
    private final String decisionReason;
    private final String scoringLog;
    private final int flagCount;
    private final int creditScore;

    public ScoringResult(
            String decision,
            String status,
            String decisionReason,
            String scoringLog,
            int flagCount,
            int creditScore) {

        this.decision = decision;
        this.status = status;
        this.decisionReason = decisionReason;
        this.scoringLog = scoringLog;
        this.flagCount = flagCount;
        this.creditScore = creditScore;
    }

    public String getDecision() {
        return decision;
    }

    public String getStatus() {
        return status;
    }

    public String getDecisionReason() {
        return decisionReason;
    }

    public String getScoringLog() {
        return scoringLog;
    }

    public int getFlagCount() {
        return flagCount;
    }

    public int getCreditScore() {
        return creditScore;
    }
}