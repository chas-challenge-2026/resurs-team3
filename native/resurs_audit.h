#ifndef RESURS_AUDIT_H
#define RESURS_AUDIT_H

#include <stddef.h>

/* Error codes (shared numbering with resurs_crypto.h) */
#define RESURS_OK 0
#define RESURS_ERR_NULL_ARG -1
#define RESURS_ERR_CRYPTO -2
#define RESURS_ERR_AUTH_FAILED -3
#define RESURS_ERR_BUFFER_TOO_SMALL -4

/* Constants */
#define RESURS_AUDIT_HASH_LEN 32      /* SHA-256 digest */
#define RESURS_AUDIT_SIGNATURE_LEN 64 /* Ed25519 signature (fixed length) */
#define RESURS_AUDIT_PUBKEY_LEN 32    /* Ed25519 raw public key */
#define RESURS_AUDIT_PRIVKEY_LEN 32   /* Ed25519 raw private key seed */

/*
 * Compute the chained hash for one audit entry and sign it with Ed25519.
 *
 *   hash_out = SHA-256(prev_hash || entry_json)   (prev_hash omitted for the
 *                                                   first entry in a chain)
 *   signature_out = Ed25519_Sign(private_key, hash_out)
 *
 * Args:
 *   prev_hash: RESURS_AUDIT_HASH_LEN bytes, the previous entry's hash_out.
 *              NULL for the first entry in a chain (nothing is prepended).
 *   entry_json: audit entry payload (timestamp, rule id, input, outcome, ...),
 *               not required to be null-terminated.
 *   entry_len: length of entry_json in bytes.
 *   private_key: RESURS_AUDIT_PRIVKEY_LEN bytes, raw Ed25519 private key.
 *                Not persisted by this module - same principle as the `key`
 *                argument to resurs_encrypt_pii (see native/crypto-design.md).
 *   hash_out: caller-provided buffer, RESURS_AUDIT_HASH_LEN bytes. Must be
 *             stored alongside the entry so it can serve as prev_hash for
 *             the next entry, and so resurs_audit_verify_chain can check it.
 *   signature_out: caller-provided buffer, at least RESURS_AUDIT_SIGNATURE_LEN
 *                  bytes.
 *   signature_len: IN: capacity of signature_out.
 *                  OUT: actual bytes written (always RESURS_AUDIT_SIGNATURE_LEN
 *                  on success).
 *
 * Returns:
 *   RESURS_OK on success
 *   RESURS_ERR_NULL_ARG if a required pointer is NULL
 *   RESURS_ERR_BUFFER_TOO_SMALL if signature_out is too small
 *   RESURS_ERR_CRYPTO on hashing/signing failure
 */
int resurs_audit_chain_entry(
    const unsigned char *prev_hash,
    const char *entry_json,
    size_t entry_len,
    const unsigned char *private_key,
    unsigned char *hash_out,
    unsigned char *signature_out,
    size_t *signature_len);

/*
 * Verify a full chain of audit entries: recomputes every hash from the
 * stored entry payloads (catching tampered content or a broken chain link)
 * and checks every Ed25519 signature (catching a forged or missing
 * signature) against the given public key.
 *
 * Args:
 *   entries_json: the entry_count entry payloads, back to back with no
 *                 separator.
 *   entry_lens: entry_count lengths, one per entry, in the same order as
 *               entries_json.
 *   hashes: entry_count * RESURS_AUDIT_HASH_LEN bytes, the stored hash_out
 *           values in chain order.
 *   signatures: entry_count * RESURS_AUDIT_SIGNATURE_LEN bytes, the stored
 *               signature_out values in the same order.
 *   entry_count: number of entries in the chain (0 is treated as valid).
 *   public_key: RESURS_AUDIT_PUBKEY_LEN bytes, raw Ed25519 public key.
 *   first_invalid_index: OUT, -1 if the whole chain verifies. Otherwise the
 *                         index of the first entry where either the
 *                         recomputed hash does not match the stored hash
 *                         (tampered payload or broken chain link) or the
 *                         signature does not verify (forged/corrupted
 *                         signature or wrong key).
 *
 * Returns:
 *   RESURS_OK if the chain was fully checked and is valid
 *   RESURS_ERR_AUTH_FAILED if the chain was fully checked and is invalid
 *                           (first_invalid_index is set)
 *   RESURS_ERR_NULL_ARG if a required pointer is NULL (entries_json,
 *                        entry_lens, hashes, signatures or public_key may
 *                        only be NULL together with entry_count == 0)
 *   RESURS_ERR_CRYPTO on an unexpected hashing/verification failure
 */
int resurs_audit_verify_chain(
    const unsigned char *entries_json,
    const size_t *entry_lens,
    const unsigned char *hashes,
    const unsigned char *signatures,
    size_t entry_count,
    const unsigned char *public_key,
    int *first_invalid_index);

#endif
