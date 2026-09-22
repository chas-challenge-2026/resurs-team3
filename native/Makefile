CC := gcc
CFLAGS := -shared -fPIC -Wall -Wextra -std=c99
LDFLAGS := -lssl -lcrypto
CFLAGS_TEST := -Wall -Wextra -std=c99

LIBS := libresurs_crypto.so libresurs_audit.so
TESTS := tests/test_resurs_crypto tests/test_resurs_audit

.PHONY: all test clean

all: $(LIBS)

libresurs_crypto.so: resurs_crypto.c resurs_crypto.h
	$(CC) $(CFLAGS) -o $@ resurs_crypto.c $(LDFLAGS)

libresurs_audit.so: resurs_audit.c resurs_audit.h
	$(CC) $(CFLAGS) -o $@ resurs_audit.c $(LDFLAGS)

tests/test_resurs_crypto: tests/test_resurs_crypto.c resurs_crypto.c resurs_crypto.h
	$(CC) $(CFLAGS_TEST) -o $@ tests/test_resurs_crypto.c resurs_crypto.c $(LDFLAGS)

tests/test_resurs_audit: tests/test_resurs_audit.c resurs_audit.c resurs_audit.h
	$(CC) $(CFLAGS_TEST) -o $@ tests/test_resurs_audit.c resurs_audit.c $(LDFLAGS)

test: $(TESTS)
	@echo "Running test_resurs_crypto..."
	@./tests/test_resurs_crypto
	@echo ""
	@echo "Running test_resurs_audit..."
	@./tests/test_resurs_audit
	@echo ""

clean:
	rm -f $(LIBS) $(TESTS) *.o tests/*.o
