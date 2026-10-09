package se.comerit.resurs.native_bridge;

import com.sun.jna.ptr.IntByReference;
import com.sun.jna.ptr.LongByReference;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
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
        byte[] entry = entryJson.getBytes(StandardCharsets.UTF_8);
        byte[] hash = new byte[ResursAudit.RESURS_AUDIT_HASH_LEN];
        byte[] signature = new byte[ResursAudit.RESURS_AUDIT_SIGNATURE_LEN];
        LongByReference signatureLen = new LongByReference(signature.length);

        int result = ResursAudit.INSTANCE.resurs_audit_chain_entry(
                prevHash, entry, entry.length, privateKey, hash, signature, signatureLen);

        if (result != ResursAudit.RESURS_OK) {
            throw new RuntimeException("Signering av audit-post misslyckades, felkod: " + result);
        }

        Base64.Encoder encoder = Base64.getEncoder();
        return new AuditChainResult(encoder.encodeToString(hash), encoder.encodeToString(signature));
    }

    /** Listorna måste vara lika långa och i kedjeordning. */
    public VerifyChainResult verifyChain(List<String> entriesJson, List<String> hashesBase64,
                                         List<String> signaturesBase64, byte[] publicKey) {
        if (entriesJson == null || hashesBase64 == null || signaturesBase64 == null) {
            throw new IllegalArgumentException("Listorna får inte vara null");
        }
        if (hashesBase64.size() != entriesJson.size() || signaturesBase64.size() != entriesJson.size()) {
            throw new IllegalArgumentException("Listorna måste vara lika långa");
        }
        // C läser alltid exakt RESURS_AUDIT_PUBKEY_LEN bytes och kan inte upptäcka fel längd själv.
        if (publicKey == null || publicKey.length != ResursAudit.RESURS_AUDIT_PUBKEY_LEN) {
            throw new IllegalArgumentException(
                    "publicKey måste vara " + ResursAudit.RESURS_AUDIT_PUBKEY_LEN + " bytes");
        }
        int count = entriesJson.size();
        // Samma svar som C ger för entry_count == 0, men utan att skicka tomma arrayer via JNA.
        if (count == 0) {
            return new VerifyChainResult(true, -1);
        }
        ByteArrayOutputStream entries = new ByteArrayOutputStream();
        long[] entryLens = new long[count];
        byte[] hashes = new byte[count * ResursAudit.RESURS_AUDIT_HASH_LEN];
        byte[] signatures = new byte[count * ResursAudit.RESURS_AUDIT_SIGNATURE_LEN];
        for (int i = 0; i < count; i++) {
            if (entriesJson.get(i) == null) {
                throw new IllegalArgumentException("entriesJson[" + i + "] får inte vara null");
            }
            byte[] entry = entriesJson.get(i).getBytes(StandardCharsets.UTF_8);
            entries.writeBytes(entry);
            entryLens[i] = entry.length;
            byte[] hash = decodeFixed(hashesBase64.get(i), ResursAudit.RESURS_AUDIT_HASH_LEN,
                    "hashesBase64[" + i + "]");
            System.arraycopy(hash, 0, hashes, i * ResursAudit.RESURS_AUDIT_HASH_LEN, hash.length);
            byte[] signature = decodeFixed(signaturesBase64.get(i), ResursAudit.RESURS_AUDIT_SIGNATURE_LEN,
                    "signaturesBase64[" + i + "]");
            System.arraycopy(signature, 0, signatures, i * ResursAudit.RESURS_AUDIT_SIGNATURE_LEN, signature.length);
        }
        IntByReference firstInvalidIndex = new IntByReference();

        int result = ResursAudit.INSTANCE.resurs_audit_verify_chain(
                entries.toByteArray(), entryLens, hashes, signatures, count, publicKey, firstInvalidIndex);

        if (result == ResursAudit.RESURS_OK) {
            return new VerifyChainResult(true, -1);
        }
        // En ogiltig kedja är ett normalt utfall, inget fel.
        if (result == ResursAudit.RESURS_ERR_AUTH_FAILED) {
            return new VerifyChainResult(false, firstInvalidIndex.getValue());
        }
        throw new RuntimeException("Verifiering av audit-kedja misslyckades, felkod: " + result);
    }

    /** Bara null betyder första posten; "" avkodas till 0 bytes och avvisas av längdkontrollen. */
    private static byte[] decodePrevHash(String prevHashBase64) {
        if (prevHashBase64 == null) {
            return null;
        }
        return decodeFixed(prevHashBase64, ResursAudit.RESURS_AUDIT_HASH_LEN, "prevHashBase64");
    }

    // C läser alltid ett fast antal bytes och kan inte upptäcka fel längd själv.
    private static byte[] decodeFixed(String base64, int length, String name) {
        if (base64 == null) {
            throw new IllegalArgumentException(name + " får inte vara null");
        }
        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(base64);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(name + " är inte giltig Base64", e);
        }
        if (decoded.length != length) {
            throw new IllegalArgumentException(name + " måste avkodas till " + length + " bytes");
        }
        return decoded;
    }
}
