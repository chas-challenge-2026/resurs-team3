package se.comerit.resurs.native_bridge;

import java.util.List;

public class ResursAuditService {

    /** prevHashBase64 är null för första posten i kedjan. */
    public AuditChainResult signEntry(String entryJson, String prevHashBase64, byte[] privateKey) {
        throw new UnsupportedOperationException("signEntry är inte implementerad än");
    }

    /** Listorna måste vara lika långa och i kedjeordning. */
    public VerifyChainResult verifyChain(List<String> entriesJson, List<String> hashesBase64,
                                         List<String> signaturesBase64, byte[] publicKey) {
        throw new UnsupportedOperationException("verifyChain är inte implementerad än");
    }
}
