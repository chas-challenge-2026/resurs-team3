package se.comerit.resurs.native_bridge;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Tester för ResursAuditService.signEntry. Valideringstesterna kastar innan C anropas
 * och kräver därför inte libresurs_audit.so.
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
}
