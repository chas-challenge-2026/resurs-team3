package se.comerit.resurs.native_bridge;

import java.security.SecureRandom;

/**
 * Minimalt exempel som visar hur Java-koden anropar C++-krypteringsmodulen.
 *
 * Kör denna klass fristående för att verifiera att kopplingen mot
 * native/resurs_crypto.c fungerar korrekt.
 */
public class ResursCryptoExample {

    public static void main(String[] args) {
        ResursCryptoService cryptoService = new ResursCryptoService();

        // I produktion: nyckeln ska INTE genereras här, utan hämtas från
        // separat nyckelhantering (t.ex. Vault/KMS), se crypto-design.md
        byte[] key = new byte[32];
        byte[] nonce = new byte[12];
        new SecureRandom().nextBytes(key);
        new SecureRandom().nextBytes(nonce);

        String orgNumber = "556000-1234";

        System.out.println("Klartext: " + orgNumber);

        String encrypted = cryptoService.encrypt(orgNumber, key, nonce);
        System.out.println("Krypterat (Base64): " + encrypted);

        String decrypted = cryptoService.decrypt(encrypted, key, nonce);
        System.out.println("Dekrypterat: " + decrypted);

        if (orgNumber.equals(decrypted)) {
            System.out.println("OK - kryptering och dekryptering fungerar korrekt!");
        } else {
            System.out.println("FEL - dekrypterad text matchar inte originalet!");
        }
    }
}