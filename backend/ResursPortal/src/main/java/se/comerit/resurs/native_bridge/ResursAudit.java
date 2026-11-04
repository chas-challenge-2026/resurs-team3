package se.comerit.resurs.native_bridge;

import com.sun.jna.Library;
import com.sun.jna.Native;
import com.sun.jna.ptr.IntByReference;
import com.sun.jna.ptr.LongByReference;

public interface ResursAudit extends Library {

    ResursAudit INSTANCE = Native.load("resurs_audit", ResursAudit.class);

    int RESURS_OK = 0;
    int RESURS_ERR_NULL_ARG = -1;
    int RESURS_ERR_CRYPTO = -2;
    int RESURS_ERR_AUTH_FAILED = -3;
    int RESURS_ERR_BUFFER_TOO_SMALL = -4;

    int RESURS_AUDIT_HASH_LEN = 32;
    int RESURS_AUDIT_SIGNATURE_LEN = 64;
    int RESURS_AUDIT_PUBKEY_LEN = 32;
    int RESURS_AUDIT_PRIVKEY_LEN = 32;

    int resurs_audit_chain_entry(
            byte[] prevHash,
            byte[] entryJson,
            long entryLen,
            byte[] privateKey,
            byte[] hashOut,
            byte[] signatureOut,
            LongByReference signatureLen
    );

    int resurs_audit_verify_chain(
            byte[] entriesJson,
            long[] entryLens,
            byte[] hashes,
            byte[] signatures,
            long entryCount,
            byte[] publicKey,
            IntByReference firstInvalidIndex
    );
}
