# Resurs Crypto – Design

## Syfte

Native-modul för kryptering och dekryptering av känsliga
applikationsdata med AES-256-GCM.

Modulen ska inte persistent lagra plaintext eller krypteringsnycklar.

## Krypteringsalgoritm

AES-256-GCM används för:

- Konfidentialitet
- Integritet
- Autentisering av krypterad data

## Nyckel

AES-256 använder en nyckel på:

- 32 bytes
- 256 bits

Nyckeln skickas till modulen vid operationen och lagras inte av modulen.

Nyckeln ska i produktion hanteras separat från databasen, exempelvis
via Vault eller KMS.

## Nonce

GCM använder en nonce på:

- 12 bytes

En unik nonce ska användas för varje krypteringsoperation med samma nyckel.

Nonce skickas in till native-modulen och ska lagras tillsammans med
ciphertext så att data kan dekrypteras senare.

## Authentication tag

AES-256-GCM producerar en authentication tag på:

- 16 bytes

Taggen lagras tillsammans med ciphertext.

Native-modulen returnerar följande format:

    [ciphertext][16-byte authentication tag]

Därför är:

    ciphertext_len = plaintext_len + 16

## Publikt API

Kryptering:

    int resurs_encrypt_pii(
        const char* plaintext,
        const unsigned char* key,
        const unsigned char* nonce,
        unsigned char* ciphertext_out,
        size_t* ciphertext_len
    );

Dekryptering:

    int resurs_decrypt_pii(
        const unsigned char* ciphertext,
        size_t ciphertext_len,
        const unsigned char* key,
        const unsigned char* nonce,
        char* plaintext_out,
        size_t* plaintext_len
    );

## Return codes

    0  = Success
    -1 = Invalid input
    -2 = Encryption/decryption error
    -3 = Authentication failed

## Plaintext

Modulen ska inte persistent lagra plaintext.

Plaintext får endast finnas i minnet under själva
krypterings-/dekrypteringsoperationen.

Modulen ska inte skriva plaintext till:

- Databas
- Fil
- Global variabel
- Cache
- Permanent buffer

## Dataflöde

Kryptering:

    plaintext + key + nonce
              |
              v
        AES-256-GCM
              |
              v
    ciphertext + authentication tag

Dekryptering:

    ciphertext + authentication tag
              +
          key + nonce
              |
              v
        AES-256-GCM
              |
              v
           plaintext