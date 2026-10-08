package se.comerit.resurs.native_bridge;

import com.sun.jna.ptr.IntByReference;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
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

    private static final String SECOND_ENTRY = "{\"action\":\"APPLICATION_APPROVED\",\"id\":\"1\"}";

    private static final String THIRD_ENTRY = "{\"action\":\"APPLICATION_PAID_OUT\",\"id\":\"1\"}";

    private static final String SWEDISH_ENTRY = "{\"namn\":\"Åsa Öberg\",\"ort\":\"Mälarhöjden\"}";

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

    @Test
    void secondEntryHashIsSha256OfPrevHashAndEntryJson() throws NoSuchAlgorithmException {
        AuditChainResult first = service.signEntry(ENTRY, null, AuditTestKeys.TEST_PRIV);
        AuditChainResult second = service.signEntry(SECOND_ENTRY, first.hash(), AuditTestKeys.TEST_PRIV);

        // Kedjelänken: förra postens hash (råa bytes, inte Base64) läggs före JSON-texten.
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        digest.update(Base64.getDecoder().decode(first.hash()));
        digest.update(SECOND_ENTRY.getBytes(StandardCharsets.UTF_8));
        assertArrayEquals(digest.digest(), Base64.getDecoder().decode(second.hash()));
    }

    @Test
    void threeEntryChainVerifiesWithPublicKey() {
        String[] entries = {ENTRY, SECOND_ENTRY, THIRD_ENTRY};
        ByteArrayOutputStream entryBytes = new ByteArrayOutputStream();
        ByteArrayOutputStream hashes = new ByteArrayOutputStream();
        ByteArrayOutputStream signatures = new ByteArrayOutputStream();
        long[] entryLens = new long[entries.length];

        String prevHash = null;
        for (int i = 0; i < entries.length; i++) {
            AuditChainResult result = service.signEntry(entries[i], prevHash, AuditTestKeys.TEST_PRIV);
            byte[] entry = entries[i].getBytes(StandardCharsets.UTF_8);
            entryBytes.writeBytes(entry);
            entryLens[i] = entry.length;
            hashes.writeBytes(Base64.getDecoder().decode(result.hash()));
            signatures.writeBytes(Base64.getDecoder().decode(result.signature()));
            prevHash = result.hash();
        }
        IntByReference firstInvalid = new IntByReference();

        int verifyResult = ResursAudit.INSTANCE.resurs_audit_verify_chain(
                entryBytes.toByteArray(), entryLens, hashes.toByteArray(), signatures.toByteArray(),
                entries.length, AuditTestKeys.TEST_PUB, firstInvalid);

        assertEquals(ResursAudit.RESURS_OK, verifyResult);
        assertEquals(-1, firstInvalid.getValue());
    }

    @Test
    void swedishCharactersAreHashedAsUtf8() throws NoSuchAlgorithmException {
        AuditChainResult result = service.signEntry(SWEDISH_ENTRY, null, AuditTestKeys.TEST_PRIV);

        // å/ä/ö är två bytes var i UTF-8, så entry_len måste vara antal bytes, inte antal tecken.
        byte[] expected = MessageDigest.getInstance("SHA-256")
                .digest(SWEDISH_ENTRY.getBytes(StandardCharsets.UTF_8));
        assertArrayEquals(expected, Base64.getDecoder().decode(result.hash()));
    }
}
