package se.comerit.resurs.native_bridge;

import com.sun.jna.Library;
import com.sun.jna.Native;
import com.sun.jna.ptr.LongByReference;

public interface ResursCrypto extends Library {

    ResursCrypto INSTANCE = Native.load("resurs_crypto", ResursCrypto.class);

    int RESURS_OK = 0;
    int RESURS_ERR_NULL_ARG = -1;
    int RESURS_ERR_CRYPTO = -2;
    int RESURS_ERR_AUTH_FAILED = -3;
    int RESURS_ERR_BUFFER_TOO_SMALL = -4;

    int RESURS_CRYPTO_KEY_LEN = 32;
    int RESURS_CRYPTO_NONCE_LEN = 12;
    int RESURS_CRYPTO_TAG_LEN = 16;

    int resurs_encrypt_pii(
            String plaintext,
            byte[] key,
            byte[] nonce,
            byte[] ciphertextOut,
            LongByReference ciphertextLen
    );

    int resurs_decrypt_pii(
            byte[] ciphertext,
            long ciphertextLen,
            byte[] key,
            byte[] nonce,
            byte[] plaintextOut,
            LongByReference plaintextLen
    );
}