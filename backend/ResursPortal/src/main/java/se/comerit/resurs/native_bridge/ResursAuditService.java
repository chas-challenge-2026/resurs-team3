package se.comerit.resurs.native_bridge;

import java.util.Base64;
import java.util.List;

public class ResursAuditService {

    /** prevHashBase64 är null för första posten i kedjan. */
    public AuditChainResult signEntry(String entryJson, String prevHashBase64, byte[] privateKey) {
        if (entryJson == null) {
            throw new IllegalArgumentException("entryJson får inte vara null");
        }
        // C läser alltid exakt RESURS_AUDIT_PRIVKEY_LEN bytes och kan inte upptäcka fel längd själv.
        if (privateKey == null || privateKey.length != ResursAudit.RESURS_AUDIT_PRIVKEY_LEN) {
            throw new IllegalArgumentException(
                    "privateKey måste vara " + ResursAudit.RESURS_AUDIT_PRIVKEY_LEN + " bytes");
        }
        byte[] prevHash = decodePrevHash(prevHashBase64);
        throw new UnsupportedOperationException("signEntry är inte implementerad än");
    }

    /** Listorna måste vara lika långa och i kedjeordning. */
    public VerifyChainResult verifyChain(List<String> entriesJson, List<String> hashesBase64,
                                         List<String> signaturesBase64, byte[] publicKey) {
        throw new UnsupportedOperationException("verifyChain är inte implementerad än");
    }

    /** Bara null betyder första posten; "" avkodas till 0 bytes och avvisas av längdkontrollen. */
    private static byte[] decodePrevHash(String prevHashBase64) {
        if (prevHashBase64 == null) {
            return null;
        }
        byte[] prevHash;
        try {
            prevHash = Base64.getDecoder().decode(prevHashBase64);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("prevHashBase64 är inte giltig Base64", e);
        }
        // C läser alltid exakt RESURS_AUDIT_HASH_LEN bytes och kan inte upptäcka fel längd själv.
        if (prevHash.length != ResursAudit.RESURS_AUDIT_HASH_LEN) {
            throw new IllegalArgumentException(
                    "prevHashBase64 måste avkodas till " + ResursAudit.RESURS_AUDIT_HASH_LEN + " bytes");
        }
        return prevHash;
    }
}
