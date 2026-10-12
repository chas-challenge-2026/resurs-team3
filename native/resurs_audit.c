#include "resurs_audit.h"
#include <string.h>
#include <openssl/evp.h>
#include <openssl/sha.h>

int resurs_audit_chain_entry(
    const unsigned char *prev_hash,
    const char *entry_json,
    size_t entry_len,
    const unsigned char *private_key,
    unsigned char *hash_out,
    unsigned char *signature_out,
    size_t *signature_len)
{
    if (!entry_json || !private_key || !hash_out || !signature_out || !signature_len) {
        return RESURS_ERR_NULL_ARG;
    }

    if (*signature_len < RESURS_AUDIT_SIGNATURE_LEN) {
        return RESURS_ERR_BUFFER_TOO_SMALL;
    }

    /* hash_out = SHA-256(prev_hash || entry_json) */
    EVP_MD_CTX *md_ctx = EVP_MD_CTX_new();
    if (!md_ctx) {
        return RESURS_ERR_CRYPTO;
    }

    int ret = RESURS_OK;
    unsigned int hash_len = 0;

    if (!EVP_DigestInit_ex(md_ctx, EVP_sha256(), NULL)) {
        ret = RESURS_ERR_CRYPTO;
        goto cleanup_md;
    }

    if (prev_hash && !EVP_DigestUpdate(md_ctx, prev_hash, RESURS_AUDIT_HASH_LEN)) {
        ret = RESURS_ERR_CRYPTO;
        goto cleanup_md;
    }

    if (!EVP_DigestUpdate(md_ctx, entry_json, entry_len)) {
        ret = RESURS_ERR_CRYPTO;
        goto cleanup_md;
    }

    if (!EVP_DigestFinal_ex(md_ctx, hash_out, &hash_len) || hash_len != RESURS_AUDIT_HASH_LEN) {
        ret = RESURS_ERR_CRYPTO;
        goto cleanup_md;
    }

cleanup_md:
    EVP_MD_CTX_free(md_ctx);
    if (ret != RESURS_OK) {
        return ret;
    }

    /* signature_out = Ed25519_Sign(private_key, hash_out) */
    EVP_PKEY *pkey = EVP_PKEY_new_raw_private_key(
        EVP_PKEY_ED25519, NULL, private_key, RESURS_AUDIT_PRIVKEY_LEN);
    if (!pkey) {
        return RESURS_ERR_CRYPTO;
    }

    EVP_MD_CTX *sign_ctx = EVP_MD_CTX_new();
    if (!sign_ctx) {
        EVP_PKEY_free(pkey);
        return RESURS_ERR_CRYPTO;
    }

    ret = RESURS_OK;
    size_t sig_len = RESURS_AUDIT_SIGNATURE_LEN;

    /* Ed25519 is "pure" EdDSA: no separate digest step, sign the message
     * (here, hash_out) directly in one shot via EVP_DigestSign. */
    if (!EVP_DigestSignInit(sign_ctx, NULL, NULL, NULL, pkey)) {
        ret = RESURS_ERR_CRYPTO;
        goto cleanup_sign;
    }

    if (!EVP_DigestSign(sign_ctx, signature_out, &sig_len, hash_out, RESURS_AUDIT_HASH_LEN)) {
        ret = RESURS_ERR_CRYPTO;
        goto cleanup_sign;
    }

    if (sig_len != RESURS_AUDIT_SIGNATURE_LEN) {
        ret = RESURS_ERR_CRYPTO;
        goto cleanup_sign;
    }

    *signature_len = sig_len;

cleanup_sign:
    EVP_MD_CTX_free(sign_ctx);
    EVP_PKEY_free(pkey);
    return ret;
}

int resurs_audit_verify_chain(
    const unsigned char *entries_json,
    const size_t *entry_lens,
    const unsigned char *hashes,
    const unsigned char *signatures,
    size_t entry_count,
    const unsigned char *public_key,
    int *first_invalid_index)
{
    if (!first_invalid_index) {
        return RESURS_ERR_NULL_ARG;
    }

    if (entry_count == 0) {
        *first_invalid_index = -1;
        return RESURS_OK;
    }

    if (!entries_json || !entry_lens || !hashes || !signatures || !public_key) {
        return RESURS_ERR_NULL_ARG;
    }

    EVP_PKEY *pkey = EVP_PKEY_new_raw_public_key(
        EVP_PKEY_ED25519, NULL, public_key, RESURS_AUDIT_PUBKEY_LEN);
    if (!pkey) {
        return RESURS_ERR_CRYPTO;
    }

    EVP_MD_CTX *md_ctx = EVP_MD_CTX_new();
    EVP_MD_CTX *verify_ctx = EVP_MD_CTX_new();
    if (!md_ctx || !verify_ctx) {
        EVP_MD_CTX_free(md_ctx);
        EVP_MD_CTX_free(verify_ctx);
        EVP_PKEY_free(pkey);
        return RESURS_ERR_CRYPTO;
    }

    int ret = RESURS_OK;
    size_t offset = 0;

    for (size_t i = 0; i < entry_count; i++) {
        const unsigned char *entry = entries_json + offset;
        size_t entry_len = entry_lens[i];
        const unsigned char *stored_hash = hashes + i * RESURS_AUDIT_HASH_LEN;
        const unsigned char *stored_sig = signatures + i * RESURS_AUDIT_SIGNATURE_LEN;

        /* Recompute expected_hash = SHA-256(prev_hash || entry), same as
         * resurs_audit_chain_entry, to catch a tampered payload or a
         * broken/reordered chain link. */
        unsigned char expected_hash[RESURS_AUDIT_HASH_LEN];
        unsigned int hash_len = 0;

        if (!EVP_DigestInit_ex(md_ctx, EVP_sha256(), NULL)) {
            ret = RESURS_ERR_CRYPTO;
            goto cleanup;
        }

        if (i > 0) {
            const unsigned char *prev_hash = hashes + (i - 1) * RESURS_AUDIT_HASH_LEN;
            if (!EVP_DigestUpdate(md_ctx, prev_hash, RESURS_AUDIT_HASH_LEN)) {
                ret = RESURS_ERR_CRYPTO;
                goto cleanup;
            }
        }

        if (!EVP_DigestUpdate(md_ctx, entry, entry_len)) {
            ret = RESURS_ERR_CRYPTO;
            goto cleanup;
        }

        if (!EVP_DigestFinal_ex(md_ctx, expected_hash, &hash_len) || hash_len != RESURS_AUDIT_HASH_LEN) {
            ret = RESURS_ERR_CRYPTO;
            goto cleanup;
        }

        if (memcmp(expected_hash, stored_hash, RESURS_AUDIT_HASH_LEN) != 0) {
            *first_invalid_index = (int)i;
            ret = RESURS_ERR_AUTH_FAILED;
            goto cleanup;
        }

        /* Verify the signature over the (now confirmed correct) stored hash. */
        if (!EVP_DigestVerifyInit(verify_ctx, NULL, NULL, NULL, pkey)) {
            ret = RESURS_ERR_CRYPTO;
            goto cleanup;
        }

        if (EVP_DigestVerify(verify_ctx, stored_sig, RESURS_AUDIT_SIGNATURE_LEN,
                              stored_hash, RESURS_AUDIT_HASH_LEN) != 1) {
            *first_invalid_index = (int)i;
            ret = RESURS_ERR_AUTH_FAILED;
            goto cleanup;
        }

        offset += entry_len;
    }

    *first_invalid_index = -1;

cleanup:
    EVP_MD_CTX_free(md_ctx);
    EVP_MD_CTX_free(verify_ctx);
    EVP_PKEY_free(pkey);
    return ret;
}
