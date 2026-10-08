package se.comerit.resurs.native_bridge;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Tester för ResursAuditService.verifyChain. Valideringstesterna kastar innan C anropas
 * och kräver därför inte libresurs_audit.so. Verifieringstesterna kräver `make` i native/.
 */
class ResursAuditServiceVerifyTest {

    private static final List<String> ONE_ENTRY = List.of("{\"action\":\"APPLICATION_CREATED\",\"id\":\"1\"}");

    private static final List<String> ONE_HASH = List.of(zeroBytesBase64(ResursAudit.RESURS_AUDIT_HASH_LEN));

    private static final List<String> ONE_SIGNATURE = List.of(zeroBytesBase64(ResursAudit.RESURS_AUDIT_SIGNATURE_LEN));

    private static final byte[] VALID_KEY = new byte[ResursAudit.RESURS_AUDIT_PUBKEY_LEN];

    private final ResursAuditService service = new ResursAuditService();

    @Test
    void tooShortPublicKeyIsRejected() {
        byte[] key = new byte[ResursAudit.RESURS_AUDIT_PUBKEY_LEN - 1];
        assertThrows(IllegalArgumentException.class,
                () -> service.verifyChain(ONE_ENTRY, ONE_HASH, ONE_SIGNATURE, key));
    }

    @Test
    void tooLongPublicKeyIsRejected() {
        byte[] key = new byte[ResursAudit.RESURS_AUDIT_PUBKEY_LEN + 1];
        assertThrows(IllegalArgumentException.class,
                () -> service.verifyChain(ONE_ENTRY, ONE_HASH, ONE_SIGNATURE, key));
    }

    @Test
    void nullPublicKeyIsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> service.verifyChain(ONE_ENTRY, ONE_HASH, ONE_SIGNATURE, null));
    }

    @Test
    void nullEntriesListIsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> service.verifyChain(null, ONE_HASH, ONE_SIGNATURE, VALID_KEY));
    }

    @Test
    void nullHashesListIsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> service.verifyChain(ONE_ENTRY, null, ONE_SIGNATURE, VALID_KEY));
    }

    @Test
    void nullSignaturesListIsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> service.verifyChain(ONE_ENTRY, ONE_HASH, null, VALID_KEY));
    }

    @Test
    void listsOfDifferentLengthAreRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> service.verifyChain(ONE_ENTRY, Collections.emptyList(), ONE_SIGNATURE, VALID_KEY));
    }

    @Test
    void invalidBase64HashIsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> service.verifyChain(ONE_ENTRY, List.of("inte base64!"), ONE_SIGNATURE, VALID_KEY));
    }

    @Test
    void tooShortHashIsRejected() {
        List<String> hashes = List.of(zeroBytesBase64(ResursAudit.RESURS_AUDIT_HASH_LEN - 1));
        assertThrows(IllegalArgumentException.class,
                () -> service.verifyChain(ONE_ENTRY, hashes, ONE_SIGNATURE, VALID_KEY));
    }

    @Test
    void nullHashIsRejected() {
        List<String> hashes = Collections.singletonList(null);
        assertThrows(IllegalArgumentException.class,
                () -> service.verifyChain(ONE_ENTRY, hashes, ONE_SIGNATURE, VALID_KEY));
    }

    @Test
    void invalidBase64SignatureIsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> service.verifyChain(ONE_ENTRY, ONE_HASH, List.of("inte base64!"), VALID_KEY));
    }

    @Test
    void tooShortSignatureIsRejected() {
        List<String> signatures = List.of(zeroBytesBase64(ResursAudit.RESURS_AUDIT_SIGNATURE_LEN - 1));
        assertThrows(IllegalArgumentException.class,
                () -> service.verifyChain(ONE_ENTRY, ONE_HASH, signatures, VALID_KEY));
    }

    @Test
    void nullSignatureIsRejected() {
        List<String> signatures = Collections.singletonList(null);
        assertThrows(IllegalArgumentException.class,
                () -> service.verifyChain(ONE_ENTRY, ONE_HASH, signatures, VALID_KEY));
    }

    @Test
    void emptyChainIsValid() {
        VerifyChainResult result = service.verifyChain(
                Collections.emptyList(), Collections.emptyList(), Collections.emptyList(), VALID_KEY);

        assertEquals(new VerifyChainResult(true, -1), result);
    }

    @Test
    void nullEntryIsRejected() {
        List<String> entries = Collections.singletonList(null);
        assertThrows(IllegalArgumentException.class,
                () -> service.verifyChain(entries, ONE_HASH, ONE_SIGNATURE, VALID_KEY));
    }

    @Test
    void validChainIsValid() {
        Chain chain = signChain();

        VerifyChainResult result = service.verifyChain(
                chain.entries, chain.hashes, chain.signatures, AuditTestKeys.TEST_PUB);

        assertEquals(new VerifyChainResult(true, -1), result);
    }

    @Test
    void tamperedEntryIsDetected() {
        Chain chain = signChain();
        chain.entries.set(1, "{\"action\":\"APPLICATION_REJECTED\",\"id\":\"1\"}");

        VerifyChainResult result = service.verifyChain(
                chain.entries, chain.hashes, chain.signatures, AuditTestKeys.TEST_PUB);

        assertEquals(new VerifyChainResult(false, 1), result);
    }

    @Test
    void tamperedSignatureIsDetected() {
        Chain chain = signChain();
        byte[] signature = Base64.getDecoder().decode(chain.signatures.get(2));
        signature[0] ^= 0x01;
        chain.signatures.set(2, Base64.getEncoder().encodeToString(signature));

        VerifyChainResult result = service.verifyChain(
                chain.entries, chain.hashes, chain.signatures, AuditTestKeys.TEST_PUB);

        assertEquals(new VerifyChainResult(false, 2), result);
    }

    @Test
    void wrongPublicKeyIsDetected() {
        Chain chain = signChain();

        VerifyChainResult result = service.verifyChain(
                chain.entries, chain.hashes, chain.signatures, AuditTestKeys.WRONG_PUB);

        assertEquals(new VerifyChainResult(false, 0), result);
    }

    /**
     * Signerar tre poster med signEntry. Listorna går att ändra, så testerna kan manipulera dem.
     * Mittenposten har å/ä/ö, så fel längd (tecken i stället för UTF-8-bytes) förskjuter även posten efter.
     */
    private Chain signChain() {
        Chain chain = new Chain();
        String prevHash = null;
        for (String entry : List.of(
                "{\"action\":\"APPLICATION_CREATED\",\"id\":\"1\"}",
                "{\"action\":\"MANUAL_DECISION\",\"decision\":\"APPROVED\",\"worker\":\"Åsa Öberg\","
                        + "\"comment\":\"Godkänd efter granskning av årsredovisning\"}",
                "{\"action\":\"SCORING_RUN\",\"result\":\"APPROVED\",\"flags\":0}")) {
            AuditChainResult result = service.signEntry(entry, prevHash, AuditTestKeys.TEST_PRIV);
            chain.entries.add(entry);
            chain.hashes.add(result.hash());
            chain.signatures.add(result.signature());
            prevHash = result.hash();
        }
        return chain;
    }

    private static final class Chain {
        final List<String> entries = new ArrayList<>();
        final List<String> hashes = new ArrayList<>();
        final List<String> signatures = new ArrayList<>();
    }

    private static String zeroBytesBase64(int length) {
        return Base64.getEncoder().encodeToString(new byte[length]);
    }
}
