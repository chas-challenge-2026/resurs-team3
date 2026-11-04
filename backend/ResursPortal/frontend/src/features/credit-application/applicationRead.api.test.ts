import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApplicationReadApiError,
  getApplication,
  getApplications,
} from "./applicationRead.api";

const application = {
  applicationId: 42,
  caseNumber: "RES-2026-0042",
  requestedAmount: 300000,
  purpose: "Ny utrustning",
  status: "UNDER_REVIEW",
  decision: null,
  decisionReason: "Manuell granskning krävs.",
  createdAt: "2026-10-20T12:00:00",
  companyName: "Testbolaget AB",
};

function mockSuccess(data: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => data,
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Application GET API", () => {
  it("fetches the company application list", async () => {
    const fetchMock = mockSuccess([application]);

    const result = await getApplications();

    expect(result).toEqual([application]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/applications",
      {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        signal: undefined,
      },
    );
  });

  it("accepts an empty application list", async () => {
    mockSuccess([]);

    await expect(getApplications()).resolves.toEqual([]);
  });

  it("fetches one application by ID", async () => {
    const fetchMock = mockSuccess(application);

    await expect(getApplication(42)).resolves.toEqual(application);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/applications/42",
      expect.objectContaining({
        method: "GET",
        credentials: "same-origin",
      }),
    );
  });

  it("rejects invalid application IDs", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(getApplication(0)).rejects.toThrow(
      "Ogiltigt ansöknings-ID",
    );

    await expect(getApplication(1.5)).rejects.toThrow();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([401, 403, 404, 500])(
    "handles HTTP %i correctly",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status,
        }),
      );

      await expect(getApplications()).rejects.toMatchObject({
        name: "ApplicationReadApiError",
        status,
      });
    },
  );

  it("rejects an invalid application list", async () => {
    mockSuccess([{ applicationId: "wrong-type" }]);

    await expect(getApplications()).rejects.toBeInstanceOf(
      ApplicationReadApiError,
    );
  });

  it("rejects an invalid single application", async () => {
    mockSuccess({ applicationId: 42 });

    await expect(getApplication(42)).rejects.toBeInstanceOf(
      ApplicationReadApiError,
    );
  });

  it("handles invalid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      }),
    );

    await expect(getApplications()).rejects.toThrow(
      "ogiltigt JSON-svar",
    );
  });

  it("handles network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network offline")),
    );

    await expect(getApplications()).rejects.toMatchObject({
      name: "ApplicationReadApiError",
      status: null,
    });
  });

  it("preserves request cancellation", async () => {
    const abortError = new Error("Cancelled");
    abortError.name = "AbortError";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(abortError),
    );

    await expect(getApplications()).rejects.toBe(abortError);
  });
});
