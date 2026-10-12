package se.comerit.resurs.native_bridge;

import com.sun.jna.NativeLibrary;

/**
 * Används med @EnabledIf så att tester som anropar C hoppas över (i stället för att faila)
 * när libresurs_audit.so inte är byggd, t.ex. utan `make` i native/ eller på Windows.
 */
final class NativeAuditLibrary {

    private static Boolean available;

    // Laddar via NativeLibrary och inte ResursAudit.INSTANCE: misslyckas INSTANCE en gång
    // går interfacet inte att använda alls under resten av testkörningen.
    static synchronized boolean isAvailable() {
        if (available == null) {
            try {
                NativeLibrary.getInstance("resurs_audit");
                available = true;
            } catch (UnsatisfiedLinkError e) {
                available = false;
            }
        }
        return available;
    }

    private NativeAuditLibrary() {
    }
}
