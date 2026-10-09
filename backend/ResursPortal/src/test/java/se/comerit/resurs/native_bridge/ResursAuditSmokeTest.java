package se.comerit.resurs.native_bridge;

import com.sun.jna.ptr.IntByReference;
import com.sun.jna.ptr.LongByReference;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Smoke test: verifies that libresurs_audit.so can be loaded and that the JNA
 * mapping in ResursAudit passes arguments correctly. Skipped if `make` has not been run in native/.
 */
@EnabledIf("se.comerit.resurs.native_bridge.NativeAuditLibrary#isAvailable")
class ResursAuditSmokeTest {

    @Test
    void signedEntryVerifiesThroughNativeLibrary() {
        byte[] entry = "{\"action\":\"APPLICATION_CREATED\",\"id\":\"1\"}"
                .getBytes(StandardCharsets.UTF_8);
        byte[] hash = new byte[ResursAudit.RESURS_AUDIT_HASH_LEN];
        byte[] signature = new byte[ResursAudit.RESURS_AUDIT_SIGNATURE_LEN];
        LongByReference sigLen = new LongByReference(ResursAudit.RESURS_AUDIT_SIGNATURE_LEN);

        // 1. Sign (first entry in the chain -> prevHash = null)
        int signResult = ResursAudit.INSTANCE.resurs_audit_chain_entry(
                null, entry, entry.length, AuditTestKeys.TEST_PRIV, hash, signature, sigLen);

        assertEquals(ResursAudit.RESURS_OK, signResult);
        assertEquals(ResursAudit.RESURS_AUDIT_SIGNATURE_LEN, sigLen.getValue());

        // 2. Verify a chain with a single entry
        IntByReference firstInvalid = new IntByReference(-1);
        int verifyResult = ResursAudit.INSTANCE.resurs_audit_verify_chain(
                entry, new long[] {entry.length}, hash, signature, 1, AuditTestKeys.TEST_PUB, firstInvalid);

        assertEquals(ResursAudit.RESURS_OK, verifyResult);
    }
}
