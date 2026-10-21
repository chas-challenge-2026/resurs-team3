
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useApplications } from "./useApplications";
import { getApplications } from "./applicationRead.api";

vi.mock("./applicationRead.api", () => ({
  getApplications: vi.fn(),
}));

const testApplication = {
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

beforeEach(() => {
  vi.resetAllMocks();
});

describe("useApplications", () => {
  it("does not fetch when disabled", () => {
    const { result } = renderHook(() => useApplications(false, "session-a"));

    expect(getApplications).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.applications).toEqual([]);
    expect(result.current.error).toBeNull();
  });


it("shows loading until applications arrive", async () => {
  // Create a request that does not finish immediately.
  let resolveRequest!: (
    applications: Array<typeof testApplication>
  ) => void;

  const pendingRequest = new Promise<Array<typeof testApplication>>(
    (resolve) => {
      resolveRequest = resolve;
    },
  );

  vi.mocked(getApplications).mockReturnValue(pendingRequest);

  // Render the hook while the request is still pending.
  const { result } = renderHook(() => useApplications(true, "session-a"));

  expect(getApplications).toHaveBeenCalledTimes(1);
  expect(result.current.loading).toBe(true);
  expect(result.current.applications).toEqual([]);

  // Now simulate Java returning the application.
  await act(async () => {
    resolveRequest([testApplication]);
  });

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.applications).toEqual([testApplication]);
  expect(result.current.error).toBeNull();
});


  it("handles an empty application list", async () => {
    vi.mocked(getApplications).mockResolvedValue([]);

    const { result } = renderHook(() => useApplications(true, "session-a"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.applications).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("shows a readable error when the request fails", async () => {
    vi.mocked(getApplications).mockRejectedValue(
      new Error("Du behöver logga in för att se ansökningarna."),
    );

    const { result } = renderHook(() => useApplications(true, "session-a"));

    await waitFor(() => {
      expect(result.current.error).toBe(
        "Du behöver logga in för att se ansökningarna.",
      );
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.applications).toEqual([]);
  });

  it("cancels an unfinished request on unmount", () => {
    vi.mocked(getApplications).mockReturnValue(
      new Promise(() => {}),
    );

    const { unmount } = renderHook(() => useApplications(true, "session-a"));

    const signal = vi.mocked(getApplications).mock.calls[0]?.[0];

    expect(signal?.aborted).toBe(false);

    unmount();

    expect(signal?.aborted).toBe(true);
  });

it("does not reuse previous applications when fetching restarts", async () => {
  vi.mocked(getApplications)
    .mockResolvedValueOnce([testApplication])
    .mockImplementationOnce(() => new Promise(() => {}));

  const { result, rerender } = renderHook(
    ({ enabled }: { enabled: boolean }) => useApplications(enabled, "session-a"),
    { initialProps: { enabled: true } },
  );

  // First request finishes.
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.applications).toEqual([testApplication]);

  // User logs out.
  rerender({ enabled: false });
  expect(result.current.applications).toEqual([]);

  // A new login starts another request.
  rerender({ enabled: true });

  expect(getApplications).toHaveBeenCalledTimes(2);
  expect(result.current.loading).toBe(true);
  expect(result.current.applications).toEqual([]);
    });

it("clears old company data when the session changes", async () => {
  vi.mocked(getApplications)
    .mockResolvedValueOnce([testApplication])
    .mockImplementationOnce(() => new Promise(() => {}));

  const { result, rerender } = renderHook(
    ({ sessionKey }: { sessionKey: string }) =>
      useApplications(true, sessionKey),
    {
      initialProps: {
        sessionKey: "session-a",
      },
    },
  );

  // Company A's request finishes.
  await waitFor(() => {
    expect(result.current.applications).toEqual([
      testApplication,
    ]);
  });

  const firstSignal =
    vi.mocked(getApplications).mock.calls[0]?.[0];

  // Switch to a different session.
  rerender({
    sessionKey: "session-b",
  });

  // The old request must be cancelled.
  expect(firstSignal?.aborted).toBe(true);

  // Company A's data must disappear immediately.
  expect(result.current.applications).toEqual([]);
  expect(result.current.loading).toBe(true);

  // Company B must trigger a new request.
  expect(getApplications).toHaveBeenCalledTimes(2);
});

it("does not fetch without a session key", () => {
  const { result } = renderHook(() =>
    useApplications(true, null),
  );

  expect(getApplications).not.toHaveBeenCalled();

  expect(result.current.applications).toEqual([]);
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBeNull();
});
});
