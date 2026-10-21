
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { getApplication } from "./applicationRead.api";
import type { ApplicationReadResponse } from "./applicationRead.api";
import { useApplication } from "./useApplication";

vi.mock("./applicationRead.api", () => ({
  getApplication: vi.fn(),
}));

const application: ApplicationReadResponse = {
  applicationId: 42,
  caseNumber: "RES-2026-0042",
  requestedAmount: 300000,
  purpose: "Ny utrustning",
  status: "UNDER_REVIEW",
  decision: "REVIEW",
  decisionReason: "Manuell granskning krävs.",
  createdAt: "2026-10-20T12:00:00",
  companyName: "Testbolaget AB",
};

describe("useApplication", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("does not fetch when disabled", () => {
    const { result } = renderHook(() =>
      useApplication(42, false, "session-a"),
    );

    expect(getApplication).not.toHaveBeenCalled();
    expect(result.current.application).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("does not fetch without a session key", () => {
    const { result } = renderHook(() =>
      useApplication(42, true, null),
    );

    expect(getApplication).not.toHaveBeenCalled();
    expect(result.current.application).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("loads one application", async () => {
    // Keep the simulated request pending.
    let resolveRequest!: (
      value: ApplicationReadResponse
    ) => void;

    const pendingRequest = new Promise<ApplicationReadResponse>(
      (resolve) => {
        resolveRequest = resolve;
      },
    );

    vi.mocked(getApplication).mockReturnValue(pendingRequest);

    const { result } = renderHook(() =>
      useApplication(42, true, "session-a"),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.application).toBeNull();

    expect(getApplication).toHaveBeenCalledWith(
      42,
      expect.any(AbortSignal),
    );

    // Simulate the Java backend responding.
    await act(async () => {
      resolveRequest(application);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.application).toEqual(application);
    expect(result.current.error).toBeNull();
  });

  it("shows errors from the API", async () => {
    vi.mocked(getApplication).mockRejectedValue(
      new Error("Du behöver logga in."),
    );

    const { result } = renderHook(() =>
      useApplication(42, true, "session-a"),
    );

    await waitFor(() => {
      expect(result.current.error).toBe(
        "Du behöver logga in.",
      );
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.application).toBeNull();
  });

  it("cancels the old request when the ID changes", async () => {
    vi.mocked(getApplication)
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValueOnce({
        ...application,
        applicationId: 43,
        caseNumber: "RES-2026-0043",
      });

    const { result, rerender } = renderHook(
      ({ id }: { id: number }) =>
        useApplication(id, true, "session-a"),
      { initialProps: { id: 42 } },
    );

    const firstSignal =
      vi.mocked(getApplication).mock.calls[0]?.[1];

    rerender({ id: 43 });

    expect(firstSignal?.aborted).toBe(true);

    await waitFor(() => {
      expect(result.current.application?.applicationId).toBe(43);
    });

    expect(getApplication).toHaveBeenCalledTimes(2);
  });

  it("clears previous data when the session changes", async () => {
    vi.mocked(getApplication)
      .mockResolvedValueOnce(application)
      .mockImplementationOnce(() => new Promise(() => {}));

    const { result, rerender } = renderHook(
      ({ sessionKey }: { sessionKey: string }) =>
        useApplication(42, true, sessionKey),
      { initialProps: { sessionKey: "session-a" } },
    );

    await waitFor(() => {
      expect(result.current.application).toEqual(application);
    });

    // Simulate switching to a different session.
    rerender({ sessionKey: "session-b" });

    expect(result.current.application).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(getApplication).toHaveBeenCalledTimes(2);
  });
});
