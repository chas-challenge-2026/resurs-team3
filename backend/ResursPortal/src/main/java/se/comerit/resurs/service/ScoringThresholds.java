package se.comerit.resurs.service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ScoringThresholds {
    private final double solidityRejectThreshold;
    private final double solidityWarningThreshold;

    public ScoringThresholds(@Value("${scoring.solidity-reject-threshold}") double solidityRejectThreshold,
                             @Value("${scoring.solidity-warning-threshold}") double solidityWarningThreshold) {
        this.solidityRejectThreshold = solidityRejectThreshold;
        this.solidityWarningThreshold = solidityWarningThreshold;
    }

    public double getSolidityRejectThreshold() {
        return solidityRejectThreshold;
    }

    public double getSolidityWarningThreshold() {
        return solidityWarningThreshold;
    }
}