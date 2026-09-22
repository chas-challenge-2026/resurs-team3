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
