#include "../resurs_audit.h"
#include <stdio.h>
#include <string.h>
#include <assert.h>
#include <stdlib.h>

static unsigned char test_priv[RESURS_AUDIT_PRIVKEY_LEN] = {
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
    0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
    0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
    0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f};

static unsigned char test_pub[RESURS_AUDIT_PUBKEY_LEN] = {
    0x03, 0xa1, 0x07, 0xbf, 0xf3, 0xce, 0x10, 0xbe,
    0x1d, 0x70, 0xdd, 0x18, 0xe7, 0x4b, 0xc0, 0x99,
    0x67, 0xe4, 0xd6, 0x30, 0x9b, 0xa5, 0x0d, 0x5f,
    0x1d, 0xdc, 0x86, 0x64, 0x12, 0x55, 0x31, 0xb8};

static unsigned char wrong_pub[RESURS_AUDIT_PUBKEY_LEN] = {
    0x75, 0x5c, 0x4c, 0xb9, 0x25, 0x6c, 0xa7, 0xcd,
    0xc4, 0xac, 0xfd, 0xc6, 0xcf, 0xee, 0xda, 0x84,
    0x90, 0x17, 0xe5, 0xb9, 0xf9, 0x51, 0x4e, 0x99,
    0x19, 0x1b, 0xd6, 0x7e, 0x0b, 0x0d, 0x42, 0x76};

static const char *test_entries[3] = {
    "{\"action\":\"APPLICATION_CREATED\",\"id\":\"1\"}",
    "{\"action\":\"SCORING_RUN\",\"id\":\"1\",\"result\":\"APPROVED\"}",
    "{\"action\":\"DECISION_SENT\",\"id\":\"1\"}"};

/* Builds a valid 3-entry chain into the caller-provided buffers. */
static void build_chain(
    unsigned char *entries_json,
    size_t *entry_lens,
    unsigned char *hashes,
    unsigned char *signatures)
{
    size_t offset = 0;

    for (int i = 0; i < 3; i++)
    {
        entry_lens[i] = strlen(test_entries[i]);
        memcpy(entries_json + offset, test_entries[i], entry_lens[i]);

        const unsigned char *prev_hash = (i == 0) ? NULL : &hashes[(i - 1) * RESURS_AUDIT_HASH_LEN];
        unsigned char *hash_out = &hashes[i * RESURS_AUDIT_HASH_LEN];
        unsigned char *sig_out = &signatures[i * RESURS_AUDIT_SIGNATURE_LEN];
        size_t sig_len = RESURS_AUDIT_SIGNATURE_LEN;

        int ret = resurs_audit_chain_entry(prev_hash, test_entries[i], entry_lens[i], test_priv, hash_out, sig_out, &sig_len);
        assert(ret == RESURS_OK);
        assert(sig_len == RESURS_AUDIT_SIGNATURE_LEN);

        offset += entry_lens[i];
    }
}

static void test_chain_entry_round_trip(void)
{
    printf("Test: chain_entry produces a hash + signature the CLI/verify can trust... ");

    const char *entry = "{\"action\":\"APPLICATION_CREATED\",\"id\":\"1\"}";
    size_t entry_len = strlen(entry);

    unsigned char hash_out[RESURS_AUDIT_HASH_LEN];
    unsigned char sig_out[RESURS_AUDIT_SIGNATURE_LEN];
    size_t sig_len = sizeof(sig_out);

    int ret = resurs_audit_chain_entry(NULL, entry, entry_len, test_priv, hash_out, sig_out, &sig_len);
    assert(ret == RESURS_OK);
    assert(sig_len == RESURS_AUDIT_SIGNATURE_LEN);

    unsigned char entries_json[256];
    memcpy(entries_json, entry, entry_len);
    size_t entry_lens[1] = {entry_len};

    int first_invalid = -99;
    ret = resurs_audit_verify_chain(entries_json, entry_lens, hash_out, sig_out, 1, test_pub, &first_invalid);
    assert(ret == RESURS_OK);
    assert(first_invalid == -1);

    printf("PASS\n");
}

static void test_valid_chain(void)
{
    printf("Test: valid multi-entry chain verifies... ");

    unsigned char entries_json[256];
    size_t entry_lens[3];
    unsigned char hashes[3 * RESURS_AUDIT_HASH_LEN];
    unsigned char signatures[3 * RESURS_AUDIT_SIGNATURE_LEN];
    build_chain(entries_json, entry_lens, hashes, signatures);

    int first_invalid = -99;
    int ret = resurs_audit_verify_chain(entries_json, entry_lens, hashes, signatures, 3, test_pub, &first_invalid);
    assert(ret == RESURS_OK);
    assert(first_invalid == -1);

    printf("PASS\n");
}

static void test_tampered_entry_detected(void)
{
    printf("Test: tampered entry payload detected at correct index... ");

    unsigned char entries_json[256];
    size_t entry_lens[3];
    unsigned char hashes[3 * RESURS_AUDIT_HASH_LEN];
    unsigned char signatures[3 * RESURS_AUDIT_SIGNATURE_LEN];
    build_chain(entries_json, entry_lens, hashes, signatures);

    entries_json[entry_lens[0] + 5] ^= 0x01; /* flip a byte inside entry 1 */

    int first_invalid = -99;
    int ret = resurs_audit_verify_chain(entries_json, entry_lens, hashes, signatures, 3, test_pub, &first_invalid);
    assert(ret == RESURS_ERR_AUTH_FAILED);
    assert(first_invalid == 1);

    printf("PASS\n");
}

static void test_tampered_signature_detected(void)
{
    printf("Test: tampered signature detected at correct index... ");

    unsigned char entries_json[256];
    size_t entry_lens[3];
    unsigned char hashes[3 * RESURS_AUDIT_HASH_LEN];
    unsigned char signatures[3 * RESURS_AUDIT_SIGNATURE_LEN];
    build_chain(entries_json, entry_lens, hashes, signatures);

    signatures[2 * RESURS_AUDIT_SIGNATURE_LEN] ^= 0x01; /* flip a byte in entry 2's signature */

    int first_invalid = -99;
    int ret = resurs_audit_verify_chain(entries_json, entry_lens, hashes, signatures, 3, test_pub, &first_invalid);
    assert(ret == RESURS_ERR_AUTH_FAILED);
    assert(first_invalid == 2);

    printf("PASS\n");
}

static void test_wrong_public_key_detected(void)
{
    printf("Test: wrong public key rejected... ");

    unsigned char entries_json[256];
    size_t entry_lens[3];
    unsigned char hashes[3 * RESURS_AUDIT_HASH_LEN];
    unsigned char signatures[3 * RESURS_AUDIT_SIGNATURE_LEN];
    build_chain(entries_json, entry_lens, hashes, signatures);

    int first_invalid = -99;
    int ret = resurs_audit_verify_chain(entries_json, entry_lens, hashes, signatures, 3, wrong_pub, &first_invalid);
    assert(ret == RESURS_ERR_AUTH_FAILED);
    assert(first_invalid == 0);

    printf("PASS\n");
}

static void test_reordered_chain_detected(void)
{
    printf("Test: reordered (swapped) entries break the chain link... ");

    unsigned char entries_json[256];
    size_t entry_lens[3];
    unsigned char hashes[3 * RESURS_AUDIT_HASH_LEN];
    unsigned char signatures[3 * RESURS_AUDIT_SIGNATURE_LEN];
    build_chain(entries_json, entry_lens, hashes, signatures);

    /* Swap entries 1 and 2 (payload, hash and signature together) - each
     * entry's own hash/signature is still individually "valid", but the
     * chain link (prev_hash) no longer matches. */
    unsigned char reordered_json[256];
    size_t reordered_lens[3] = {entry_lens[0], entry_lens[2], entry_lens[1]};
    unsigned char reordered_hashes[3 * RESURS_AUDIT_HASH_LEN];
    unsigned char reordered_sigs[3 * RESURS_AUDIT_SIGNATURE_LEN];

    size_t offset = 0;
    memcpy(reordered_json + offset, test_entries[0], entry_lens[0]);
    offset += entry_lens[0];
    memcpy(reordered_json + offset, test_entries[2], entry_lens[2]);
    offset += entry_lens[2];
    memcpy(reordered_json + offset, test_entries[1], entry_lens[1]);

    memcpy(reordered_hashes, hashes, RESURS_AUDIT_HASH_LEN);
    memcpy(reordered_hashes + RESURS_AUDIT_HASH_LEN, hashes + 2 * RESURS_AUDIT_HASH_LEN, RESURS_AUDIT_HASH_LEN);
    memcpy(reordered_hashes + 2 * RESURS_AUDIT_HASH_LEN, hashes + RESURS_AUDIT_HASH_LEN, RESURS_AUDIT_HASH_LEN);

    memcpy(reordered_sigs, signatures, RESURS_AUDIT_SIGNATURE_LEN);
    memcpy(reordered_sigs + RESURS_AUDIT_SIGNATURE_LEN, signatures + 2 * RESURS_AUDIT_SIGNATURE_LEN, RESURS_AUDIT_SIGNATURE_LEN);
    memcpy(reordered_sigs + 2 * RESURS_AUDIT_SIGNATURE_LEN, signatures + RESURS_AUDIT_SIGNATURE_LEN, RESURS_AUDIT_SIGNATURE_LEN);

    int first_invalid = -99;
    int ret = resurs_audit_verify_chain(reordered_json, reordered_lens, reordered_hashes, reordered_sigs, 3, test_pub, &first_invalid);
    assert(ret == RESURS_ERR_AUTH_FAILED);
    assert(first_invalid == 1);

    printf("PASS\n");
}

static void test_empty_chain_is_valid(void)
{
    printf("Test: empty chain verifies trivially... ");

    int first_invalid = -99;
    int ret = resurs_audit_verify_chain(NULL, NULL, NULL, NULL, 0, test_pub, &first_invalid);
    assert(ret == RESURS_OK);
    assert(first_invalid == -1);

    printf("PASS\n");
}

static void test_buffer_too_small(void)
{
    printf("Test: signature output buffer too small... ");

    const char *entry = "short";
    unsigned char hash_out[RESURS_AUDIT_HASH_LEN];
    unsigned char sig_out[10];
    size_t sig_len = sizeof(sig_out);

    int ret = resurs_audit_chain_entry(NULL, entry, strlen(entry), test_priv, hash_out, sig_out, &sig_len);
    assert(ret == RESURS_ERR_BUFFER_TOO_SMALL);

    printf("PASS\n");
}

static void test_null_arguments(void)
{
    printf("Test: NULL arguments... ");

    unsigned char hash_out[RESURS_AUDIT_HASH_LEN];
    unsigned char sig_out[RESURS_AUDIT_SIGNATURE_LEN];
    size_t sig_len = sizeof(sig_out);
    const char *entry = "entry";

    assert(resurs_audit_chain_entry(NULL, NULL, 5, test_priv, hash_out, sig_out, &sig_len) == RESURS_ERR_NULL_ARG);
    assert(resurs_audit_chain_entry(NULL, entry, 5, NULL, hash_out, sig_out, &sig_len) == RESURS_ERR_NULL_ARG);
    assert(resurs_audit_chain_entry(NULL, entry, 5, test_priv, NULL, sig_out, &sig_len) == RESURS_ERR_NULL_ARG);
    assert(resurs_audit_chain_entry(NULL, entry, 5, test_priv, hash_out, NULL, &sig_len) == RESURS_ERR_NULL_ARG);
    assert(resurs_audit_chain_entry(NULL, entry, 5, test_priv, hash_out, sig_out, NULL) == RESURS_ERR_NULL_ARG);

    /* first_invalid_index must always be writable, even for an empty chain */
    assert(resurs_audit_verify_chain(NULL, NULL, NULL, NULL, 0, test_pub, NULL) == RESURS_ERR_NULL_ARG);

    unsigned char entries_json[16] = {0};
    size_t entry_lens[1] = {16};
    unsigned char hashes[RESURS_AUDIT_HASH_LEN] = {0};
    unsigned char signatures[RESURS_AUDIT_SIGNATURE_LEN] = {0};
    int first_invalid = -99;

    assert(resurs_audit_verify_chain(NULL, entry_lens, hashes, signatures, 1, test_pub, &first_invalid) == RESURS_ERR_NULL_ARG);
    assert(resurs_audit_verify_chain(entries_json, NULL, hashes, signatures, 1, test_pub, &first_invalid) == RESURS_ERR_NULL_ARG);
    assert(resurs_audit_verify_chain(entries_json, entry_lens, NULL, signatures, 1, test_pub, &first_invalid) == RESURS_ERR_NULL_ARG);
    assert(resurs_audit_verify_chain(entries_json, entry_lens, hashes, NULL, 1, test_pub, &first_invalid) == RESURS_ERR_NULL_ARG);
    assert(resurs_audit_verify_chain(entries_json, entry_lens, hashes, signatures, 1, NULL, &first_invalid) == RESURS_ERR_NULL_ARG);

    printf("PASS\n");
}

int main(void)
{
    printf("Running resurs_audit tests...\n\n");

    test_chain_entry_round_trip();
    test_valid_chain();
    test_tampered_entry_detected();
    test_tampered_signature_detected();
    test_wrong_public_key_detected();
    test_reordered_chain_detected();
    test_empty_chain_is_valid();
    test_buffer_too_small();
    test_null_arguments();

    printf("\nAll tests passed!\n");
    return 0;
}
