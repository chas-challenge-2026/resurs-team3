package se.comerit.resurs.native_bridge;

import java.util.List;

public class ResursAuditService {

    /** prevHashBase64 är null för första posten i kedjan. */
    public AuditChainResult signEntry(String entryJson, String prevHashBase64, byte[] privateKey) {
        // C läser alltid exakt RESURS_AUDIT_PRIVKEY_LEN bytes och kan inte upptäcka fel längd själv.
        if (privateKey == null || privateKey.length != ResursAudit.RESURS_AUDIT_PRIVKEY_LEN) {
            throw new IllegalArgumentException(
                    "privateKey måste vara " + ResursAudit.RESURS_AUDIT_PRIVKEY_LEN + " bytes");
        }
        throw new UnsupportedOperationException("signEntry är inte implementerad än");
    }

    /** Listorna måste vara lika långa och i kedjeordning. */
    public VerifyChainResult verifyChain(List<String> entriesJson, List<String> hashesBase64,
                                         List<String> signaturesBase64, byte[] publicKey) {
        throw new UnsupportedOperationException("verifyChain är inte implementerad än");
    }
}
