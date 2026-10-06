package se.comerit.resurs.native_bridge;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Tester för ResursAuditService.signEntry. Valideringstesterna kastar innan C anropas
 * och kräver därför inte libresurs_audit.so.
 */
class ResursAuditServiceSignTest {

    private static final String ENTRY = "{\"action\":\"APPLICATION_CREATED\",\"id\":\"1\"}";

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
}
