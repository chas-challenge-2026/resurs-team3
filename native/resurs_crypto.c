#include "resurs_crypto.h"
#include <string.h>
#include <openssl/evp.h>
#include <openssl/err.h>

int resurs_encrypt_pii(
    const char* plaintext,
    const unsigned char* key,
    const unsigned char* nonce,
    unsigned char* ciphertext_out,
    size_t* ciphertext_len)
{
    if (!plaintext || !key || !nonce || !ciphertext_out || !ciphertext_len) {
        return RESURS_ERR_NULL_ARG;
    }

    size_t plaintext_len = strlen(plaintext);
    size_t required_len = plaintext_len + RESURS_CRYPTO_TAG_LEN;

    if (*ciphertext_len < required_len) {
        return RESURS_ERR_BUFFER_TOO_SMALL;
    }

    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    if (!ctx) {
        return RESURS_ERR_CRYPTO;
    }

    int ret = RESURS_OK;
    int len = 0;

    if (!EVP_EncryptInit_ex(ctx, EVP_aes_256_gcm(), NULL, key, nonce)) {
        ret = RESURS_ERR_CRYPTO;
        goto cleanup;
    }

    if (!EVP_EncryptUpdate(ctx, ciphertext_out, &len, (const unsigned char*)plaintext, plaintext_len)) {
        ret = RESURS_ERR_CRYPTO;
        goto cleanup;
    }

    int ciphertext_actual_len = len;

    if (!EVP_EncryptFinal_ex(ctx, ciphertext_out + len, &len)) {
        ret = RESURS_ERR_CRYPTO;
        goto cleanup;
    }

    ciphertext_actual_len += len;

    if (!EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG, RESURS_CRYPTO_TAG_LEN,
                             ciphertext_out + ciphertext_actual_len)) {
        ret = RESURS_ERR_CRYPTO;
        goto cleanup;
    }

    *ciphertext_len = ciphertext_actual_len + RESURS_CRYPTO_TAG_LEN;

cleanup:
    EVP_CIPHER_CTX_free(ctx);
    return ret;
}

int resurs_decrypt_pii(
    const unsigned char* ciphertext,
    size_t ciphertext_len,
    const unsigned char* key,
    const unsigned char* nonce,
    char* plaintext_out,
    size_t* plaintext_len)
{
    if (!ciphertext || !key || !nonce || !plaintext_out || !plaintext_len) {
        return RESURS_ERR_NULL_ARG;
    }

    if (ciphertext_len < RESURS_CRYPTO_TAG_LEN) {
        return RESURS_ERR_AUTH_FAILED;
    }

    size_t actual_ciphertext_len = ciphertext_len - RESURS_CRYPTO_TAG_LEN;

    if (*plaintext_len < actual_ciphertext_len) {
        return RESURS_ERR_BUFFER_TOO_SMALL;
    }

    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    if (!ctx) {
        return RESURS_ERR_CRYPTO;
    }

    int ret = RESURS_OK;
    int len = 0;

    if (!EVP_DecryptInit_ex(ctx, EVP_aes_256_gcm(), NULL, key, nonce)) {
        ret = RESURS_ERR_CRYPTO;
        goto cleanup;
    }

    if (!EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_TAG, RESURS_CRYPTO_TAG_LEN,
                             (unsigned char*)(ciphertext + actual_ciphertext_len))) {
        ret = RESURS_ERR_CRYPTO;
        goto cleanup;
    }

    if (!EVP_DecryptUpdate(ctx, (unsigned char*)plaintext_out, &len, ciphertext, actual_ciphertext_len)) {
        ret = RESURS_ERR_CRYPTO;
        goto cleanup;
    }

    int plaintext_actual_len = len;

    if (!EVP_DecryptFinal_ex(ctx, (unsigned char*)plaintext_out + len, &len)) {
        ret = RESURS_ERR_AUTH_FAILED;
        goto cleanup;
    }

    plaintext_actual_len += len;
    *plaintext_len = plaintext_actual_len;

cleanup:
    EVP_CIPHER_CTX_free(ctx);
    return ret;
}
