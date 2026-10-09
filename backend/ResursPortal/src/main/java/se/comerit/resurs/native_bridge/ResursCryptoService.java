package se.comerit.resurs.native_bridge;

import com.sun.jna.ptr.LongByReference;

import java.util.Base64;

public class ResursCryptoService {

    public String encrypt(String plaintext, byte[] key, byte[] nonce) {
        byte[] outputBuffer = new byte[plaintext.getBytes().length + ResursCrypto.RESURS_CRYPTO_TAG_LEN];
        LongByReference outputLen = new LongByReference(outputBuffer.length);

        int result = ResursCrypto.INSTANCE.resurs_encrypt_pii(
                plaintext, key, nonce, outputBuffer, outputLen
        );

        if (result != ResursCrypto.RESURS_OK) {
            throw new RuntimeException("Kryptering misslyckades, felkod: " + result);
        }

        return Base64.getEncoder().encodeToString(outputBuffer);
    }

    public String decrypt(String encryptedBase64, byte[] key, byte[] nonce) {
        byte[] ciphertext = Base64.getDecoder().decode(encryptedBase64);
        byte[] outputBuffer = new byte[ciphertext.length];
        LongByReference outputLen = new LongByReference(outputBuffer.length);

        int result = ResursCrypto.INSTANCE.resurs_decrypt_pii(
                ciphertext, ciphertext.length, key, nonce, outputBuffer, outputLen
        );

        if (result != ResursCrypto.RESURS_OK) {
            throw new RuntimeException("Dekryptering misslyckades, felkod: " + result);
        }

        return new String(outputBuffer, 0, (int) outputLen.getValue());
    }
}