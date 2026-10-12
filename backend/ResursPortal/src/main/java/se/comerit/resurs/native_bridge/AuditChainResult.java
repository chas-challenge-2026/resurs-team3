package se.comerit.resurs.native_bridge;

import java.util.Objects;

// Resultatet av signEntry: hash och signatur, båda Base64.
// Ska ändras till ett record när projektet går över till Java 21 (se IMPLEMENTATION-PLAN.md).
public final class AuditChainResult {

    private final String hash;
    private final String signature;

    public AuditChainResult(String hash, String signature) {
        this.hash = hash;
        this.signature = signature;
    }

    public String hash() {
        return hash;
    }

    public String signature() {
        return signature;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof AuditChainResult)) {
            return false;
        }
        AuditChainResult other = (AuditChainResult) o;
        return Objects.equals(hash, other.hash) && Objects.equals(signature, other.signature);
    }

    @Override
    public int hashCode() {
        return Objects.hash(hash, signature);
    }

    @Override
    public String toString() {
        return "AuditChainResult[hash=" + hash + ", signature=" + signature + "]";
    }
}
