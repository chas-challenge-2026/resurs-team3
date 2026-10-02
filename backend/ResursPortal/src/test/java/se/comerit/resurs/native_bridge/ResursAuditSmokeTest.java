package se.comerit.resurs.native_bridge;

import com.sun.jna.ptr.IntByReference;
import com.sun.jna.ptr.LongByReference;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Smoke test: verifies that libresurs_audit.so can be loaded and that the JNA
 * mapping in ResursAudit passes arguments correctly. Requires `make` in native/.
 */
class ResursAuditSmokeTest {

    // Same keypair as native/tests/test_resurs_audit.c
    private static final byte[] TEST_PRIV = {
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
            0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
            0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
            0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f};

    private static final byte[] TEST_PUB = {
            0x03, (byte) 0xa1, 0x07, (byte) 0xbf, (byte) 0xf3, (byte) 0xce, 0x10, (byte) 0xbe,
            0x1d, 0x70, (byte) 0xdd, 0x18, (byte) 0xe7, 0x4b, (byte) 0xc0, (byte) 0x99,
            0x67, (byte) 0xe4, (byte) 0xd6, 0x30, (byte) 0x9b, (byte) 0xa5, 0x0d, 0x5f,
            0x1d, (byte) 0xdc, (byte) 0x86, 0x64, 0x12, 0x55, 0x31, (byte) 0xb8};

    @Test
    void signedEntryVerifiesThroughNativeLibrary() {
        byte[] entry = "{\"action\":\"APPLICATION_CREATED\",\"id\":\"1\"}"
                .getBytes(StandardCharsets.UTF_8);
        byte[] hash = new byte[ResursAudit.RESURS_AUDIT_HASH_LEN];
        byte[] signature = new byte[ResursAudit.RESURS_AUDIT_SIGNATURE_LEN];
        LongByReference sigLen = new LongByReference(ResursAudit.RESURS_AUDIT_SIGNATURE_LEN);

        // 1. Sign (first entry in the chain -> prevHash = null)
        int signResult = ResursAudit.INSTANCE.resurs_audit_chain_entry(
                null, entry, entry.length, TEST_PRIV, hash, signature, sigLen);

        assertEquals(ResursAudit.RESURS_OK, signResult);
        assertEquals(ResursAudit.RESURS_AUDIT_SIGNATURE_LEN, sigLen.getValue());

        // 2. Verify a chain with a single entry
        IntByReference firstInvalid = new IntByReference(-1);
        int verifyResult = ResursAudit.INSTANCE.resurs_audit_verify_chain(
                entry, new long[] {entry.length}, hash, signature, 1, TEST_PUB, firstInvalid);

        assertEquals(ResursAudit.RESURS_OK, verifyResult);
    }
}
