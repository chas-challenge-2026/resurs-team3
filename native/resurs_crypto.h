#ifndef RESURS_CRYPTO_H
#define RESURS_CRYPTO_H

#include <stddef.h>

/* Error codes */
#define RESURS_OK                   0
#define RESURS_ERR_NULL_ARG        -1
#define RESURS_ERR_BUFFER_TOO_SMALL -1
#define RESURS_ERR_CRYPTO          -2
#define RESURS_ERR_AUTH_FAILED     -3

/* Constants */
#define RESURS_CRYPTO_KEY_LEN   32  /* AES-256 key in bytes */
#define RESURS_CRYPTO_NONCE_LEN 12  /* GCM nonce in bytes */
#define RESURS_CRYPTO_TAG_LEN   16  /* GCM authentication tag in bytes */

/*
 * Encrypt plaintext using AES-256-GCM.
 *
 * Args:
 *   plaintext: null-terminated input string
 *   key: 32-byte key (RESURS_CRYPTO_KEY_LEN)
 *   nonce: 12-byte nonce (RESURS_CRYPTO_NONCE_LEN)
 *   ciphertext_out: output buffer (must hold ciphertext + tag)
 *   ciphertext_len: IN: capacity of ciphertext_out
 *                   OUT: actual bytes written (ciphertext + tag)
 *
 * Returns:
 *   RESURS_OK on success
 *   RESURS_ERR_NULL_ARG if any pointer is NULL
 *   RESURS_ERR_BUFFER_TOO_SMALL if ciphertext_out too small
 *   RESURS_ERR_CRYPTO on encryption failure
 */
int resurs_encrypt_pii(
    const char* plaintext,
    const unsigned char* key,
    const unsigned char* nonce,
    unsigned char* ciphertext_out,
    size_t* ciphertext_len
);

/*
 * Decrypt ciphertext using AES-256-GCM.
 *
 * Args:
 *   ciphertext: encrypted data + 16-byte GCM tag
 *   ciphertext_len: total length (ciphertext + tag)
 *   key: 32-byte key (RESURS_CRYPTO_KEY_LEN)
 *   nonce: 12-byte nonce (RESURS_CRYPTO_NONCE_LEN)
 *   plaintext_out: output buffer
 *   plaintext_len: IN: capacity of plaintext_out
 *                  OUT: actual bytes written (excluding null terminator)
 *
 * Returns:
 *   RESURS_OK on success (plaintext_out is not null-terminated)
 *   RESURS_ERR_NULL_ARG if any pointer is NULL
 *   RESURS_ERR_BUFFER_TOO_SMALL if plaintext_out too small
 *   RESURS_ERR_AUTH_FAILED if tag verification fails (modified ciphertext or wrong key)
 *   RESURS_ERR_CRYPTO on decryption failure
 */
int resurs_decrypt_pii(
    const unsigned char* ciphertext,
    size_t ciphertext_len,
    const unsigned char* key,
    const unsigned char* nonce,
    char* plaintext_out,
    size_t* plaintext_len
);

#endif
