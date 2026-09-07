#include "../resurs_crypto.h"
#include <stdio.h>
#include <string.h>
#include <assert.h>
#include <stdlib.h>

static unsigned char test_key[RESURS_CRYPTO_KEY_LEN] = {
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
    0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
    0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
    0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f
};

static unsigned char test_nonce[RESURS_CRYPTO_NONCE_LEN] = {
    0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7,
    0xf8, 0xf9, 0xfa, 0xfb
};

static unsigned char wrong_key[RESURS_CRYPTO_KEY_LEN] = {
    0xff, 0xfe, 0xfd, 0xfc, 0xfb, 0xfa, 0xf9, 0xf8,
    0xf7, 0xf6, 0xf5, 0xf4, 0xf3, 0xf2, 0xf1, 0xf0,
    0xef, 0xee, 0xed, 0xec, 0xeb, 0xea, 0xe9, 0xe8,
    0xe7, 0xe6, 0xe5, 0xe4, 0xe3, 0xe2, 0xe1, 0xe0
};

static void test_round_trip(void) {
    printf("Test: round-trip encrypt/decrypt... ");

    const char* plaintext = "123456789012";
    size_t plaintext_len = strlen(plaintext);

    unsigned char ciphertext[256];
    size_t ciphertext_len = sizeof(ciphertext);

    int ret = resurs_encrypt_pii(plaintext, test_key, test_nonce, ciphertext, &ciphertext_len);
    assert(ret == RESURS_OK);
    assert(ciphertext_len == plaintext_len + RESURS_CRYPTO_TAG_LEN);

    char decrypted[256];
    size_t decrypted_len = sizeof(decrypted);

    ret = resurs_decrypt_pii(ciphertext, ciphertext_len, test_key, test_nonce, decrypted, &decrypted_len);
    assert(ret == RESURS_OK);
    assert(decrypted_len == plaintext_len);
    assert(memcmp(decrypted, plaintext, plaintext_len) == 0);

    printf("PASS\n");
}

static void test_manipulated_ciphertext(void) {
    printf("Test: manipulated ciphertext byte... ");

    const char* plaintext = "sensitive_data";
    size_t plaintext_len = strlen(plaintext);

    unsigned char ciphertext[256];
    size_t ciphertext_len = sizeof(ciphertext);

    int ret = resurs_encrypt_pii(plaintext, test_key, test_nonce, ciphertext, &ciphertext_len);
    assert(ret == RESURS_OK);

    if (ciphertext_len > 0) {
        ciphertext[0] ^= 0x01;
    }

    char decrypted[256];
    size_t decrypted_len = sizeof(decrypted);

    ret = resurs_decrypt_pii(ciphertext, ciphertext_len, test_key, test_nonce, decrypted, &decrypted_len);
    assert(ret == RESURS_ERR_AUTH_FAILED);

    printf("PASS\n");
}

static void test_manipulated_tag(void) {
    printf("Test: manipulated GCM tag... ");

    const char* plaintext = "company_id_12345";
    size_t plaintext_len = strlen(plaintext);

    unsigned char ciphertext[256];
    size_t ciphertext_len = sizeof(ciphertext);

    int ret = resurs_encrypt_pii(plaintext, test_key, test_nonce, ciphertext, &ciphertext_len);
    assert(ret == RESURS_OK);

    if (ciphertext_len > 0) {
        ciphertext[ciphertext_len - 1] ^= 0x01;
    }

    char decrypted[256];
    size_t decrypted_len = sizeof(decrypted);

    ret = resurs_decrypt_pii(ciphertext, ciphertext_len, test_key, test_nonce, decrypted, &decrypted_len);
    assert(ret == RESURS_ERR_AUTH_FAILED);

    printf("PASS\n");
}

static void test_wrong_key(void) {
    printf("Test: wrong decryption key... ");

    const char* plaintext = "org.number.12345";
    size_t plaintext_len = strlen(plaintext);

    unsigned char ciphertext[256];
    size_t ciphertext_len = sizeof(ciphertext);

    int ret = resurs_encrypt_pii(plaintext, test_key, test_nonce, ciphertext, &ciphertext_len);
    assert(ret == RESURS_OK);

    char decrypted[256];
    size_t decrypted_len = sizeof(decrypted);

    ret = resurs_decrypt_pii(ciphertext, ciphertext_len, wrong_key, test_nonce, decrypted, &decrypted_len);
    assert(ret == RESURS_ERR_AUTH_FAILED);

    printf("PASS\n");
}

static void test_buffer_too_small(void) {
    printf("Test: output buffer too small... ");

    const char* plaintext = "this_is_a_fairly_long_plaintext_string";
    size_t plaintext_len = strlen(plaintext);

    unsigned char ciphertext[10];
    size_t ciphertext_len = sizeof(ciphertext);

    int ret = resurs_encrypt_pii(plaintext, test_key, test_nonce, ciphertext, &ciphertext_len);
    assert(ret == RESURS_ERR_BUFFER_TOO_SMALL);

    printf("PASS\n");
}

static void test_null_argument(void) {
    printf("Test: NULL arguments... ");

    unsigned char buffer[256];
    size_t len = sizeof(buffer);

    assert(resurs_encrypt_pii(NULL, test_key, test_nonce, buffer, &len) == RESURS_ERR_NULL_ARG);
    assert(resurs_encrypt_pii("plaintext", NULL, test_nonce, buffer, &len) == RESURS_ERR_NULL_ARG);
    assert(resurs_encrypt_pii("plaintext", test_key, NULL, buffer, &len) == RESURS_ERR_NULL_ARG);
    assert(resurs_encrypt_pii("plaintext", test_key, test_nonce, NULL, &len) == RESURS_ERR_NULL_ARG);
    assert(resurs_encrypt_pii("plaintext", test_key, test_nonce, buffer, NULL) == RESURS_ERR_NULL_ARG);

    const char* plaintext = "plaintext";
    unsigned char ciphertext[256];
    size_t ciphertext_len = sizeof(ciphertext);

    assert(resurs_encrypt_pii(plaintext, test_key, test_nonce, ciphertext, &ciphertext_len) == RESURS_OK);

    assert(resurs_decrypt_pii(NULL, ciphertext_len, test_key, test_nonce, (char*)buffer, &len) == RESURS_ERR_NULL_ARG);
    assert(resurs_decrypt_pii(ciphertext, ciphertext_len, NULL, test_nonce, (char*)buffer, &len) == RESURS_ERR_NULL_ARG);
    assert(resurs_decrypt_pii(ciphertext, ciphertext_len, test_key, NULL, (char*)buffer, &len) == RESURS_ERR_NULL_ARG);
    assert(resurs_decrypt_pii(ciphertext, ciphertext_len, test_key, test_nonce, NULL, &len) == RESURS_ERR_NULL_ARG);
    assert(resurs_decrypt_pii(ciphertext, ciphertext_len, test_key, test_nonce, (char*)buffer, NULL) == RESURS_ERR_NULL_ARG);

    printf("PASS\n");
}

int main(void) {
    printf("Running resurs_crypto tests...\n\n");

    test_round_trip();
    test_manipulated_ciphertext();
    test_manipulated_tag();
    test_wrong_key();
    test_buffer_too_small();
    test_null_argument();

    printf("\nAll tests passed!\n");
    return 0;
}
