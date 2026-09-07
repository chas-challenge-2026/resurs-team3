CC := gcc
CFLAGS := -shared -fPIC -Wall -Wextra -std=c99
LDFLAGS := -lssl -lcrypto
CFLAGS_TEST := -Wall -Wextra -std=c99

LIBS := libresurs_crypto.so
TESTS := tests/test_resurs_crypto

.PHONY: all test clean

all: $(LIBS)

libresurs_crypto.so: resurs_crypto.c resurs_crypto.h
	$(CC) $(CFLAGS) -o $@ resurs_crypto.c $(LDFLAGS)

tests/test_resurs_crypto: tests/test_resurs_crypto.c resurs_crypto.c resurs_crypto.h
	$(CC) $(CFLAGS_TEST) -o $@ tests/test_resurs_crypto.c resurs_crypto.c $(LDFLAGS)

test: $(TESTS)
	@echo "Running test_resurs_crypto..."
	@./tests/test_resurs_crypto
	@echo ""

clean:
	rm -f $(LIBS) $(TESTS) *.o tests/*.o
