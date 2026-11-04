package se.comerit.resurs.native_bridge;

import java.util.Objects;

// Resultatet av verifyChain: om kedjan är giltig, och annars vilken post som först inte stämde.
// firstInvalidIndex är -1 om kedjan är giltig.
// Ska ändras till ett record när projektet går över till Java 21 (se IMPLEMENTATION-PLAN.md).
public final class VerifyChainResult {

    private final boolean valid;
    private final int firstInvalidIndex;

    public VerifyChainResult(boolean valid, int firstInvalidIndex) {
        this.valid = valid;
        this.firstInvalidIndex = firstInvalidIndex;
    }

    public boolean valid() {
        return valid;
    }

    public int firstInvalidIndex() {
        return firstInvalidIndex;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof VerifyChainResult)) {
            return false;
        }
        VerifyChainResult other = (VerifyChainResult) o;
        return valid == other.valid && firstInvalidIndex == other.firstInvalidIndex;
    }

    @Override
    public int hashCode() {
        return Objects.hash(valid, firstInvalidIndex);
    }

    @Override
    public String toString() {
        return "VerifyChainResult[valid=" + valid + ", firstInvalidIndex=" + firstInvalidIndex + "]";
    }
}
