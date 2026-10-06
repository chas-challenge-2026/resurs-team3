package se.comerit.resurs.native_bridge;

import com.sun.jna.ptr.IntByReference;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Tester för ResursAuditService.signEntry. Valideringstesterna kastar innan C anropas
 * och kräver därför inte libresurs_audit.so. Signeringstesterna kräver `make` i native/.
 */
class ResursAuditServiceSignTest {

    private static final String ENTRY = "{\"action\":\"APPLICATION_CREATED\",\"id\":\"1\"}";

    private static final byte[] VALID_KEY = new byte[ResursAudit.RESURS_AUDIT_PRIVKEY_LEN];

    private final ResursAuditService service = new ResursAuditService();

    @Test
    void tooShortPrivateKeyIsRejected() {
        byte[] key = new byte[ResursAudit.RESURS_AUDIT_PRIVKEY_LEN - 1];
        assertThrows(IllegalArgumentException.class, () -> service.signEntry(ENTRY, null, key));
    }

    @Test
    void tooLongPrivateKeyIsRejected() {
        byte[] key = new byte[ResursAudit.RESURS_AUDIT_PRIVKEY_LEN + 1];
        assertThrows(IllegalArgumentException.class, () -> service.signEntry(ENTRY, null, key));
    }

    @Test
    void nullPrivateKeyIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> service.signEntry(ENTRY, null, null));
    }

    @Test
    void nullEntryJsonIsRejected() {
        byte[] key = new byte[ResursAudit.RESURS_AUDIT_PRIVKEY_LEN];
        assertThrows(IllegalArgumentException.class, () -> service.signEntry(null, null, key));
    }

    @Test
    void invalidBase64PrevHashIsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> service.signEntry(ENTRY, "inte base64!", VALID_KEY));
    }

    @Test
    void tooShortPrevHashIsRejected() {
        String prevHash = Base64.getEncoder().encodeToString(new byte[ResursAudit.RESURS_AUDIT_HASH_LEN - 1]);
        assertThrows(IllegalArgumentException.class,
                () -> service.signEntry(ENTRY, prevHash, VALID_KEY));
    }

    @Test
    void emptyPrevHashIsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> service.signEntry(ENTRY, "", VALID_KEY));
    }

    @Test
    void firstEntryHashIsSha256OfEntryJson() throws NoSuchAlgorithmException {
        AuditChainResult result = service.signEntry(ENTRY, null, AuditTestKeys.TEST_PRIV);

        // Första posten har ingen prevHash, så hashen är bara SHA-256 av JSON-texten.
        byte[] expected = MessageDigest.getInstance("SHA-256")
                .digest(ENTRY.getBytes(StandardCharsets.UTF_8));
        assertArrayEquals(expected, Base64.getDecoder().decode(result.hash()));
    }

    @Test
    void firstEntrySignatureVerifiesWithPublicKey() {
        AuditChainResult result = service.signEntry(ENTRY, null, AuditTestKeys.TEST_PRIV);

        byte[] entry = ENTRY.getBytes(StandardCharsets.UTF_8);
        byte[] hash = Base64.getDecoder().decode(result.hash());
        byte[] signature = Base64.getDecoder().decode(result.signature());
        IntByReference firstInvalid = new IntByReference();

        int verifyResult = ResursAudit.INSTANCE.resurs_audit_verify_chain(
                entry, new long[] {entry.length}, hash, signature, 1, AuditTestKeys.TEST_PUB, firstInvalid);

        assertEquals(ResursAudit.RESURS_OK, verifyResult);
    }
}
