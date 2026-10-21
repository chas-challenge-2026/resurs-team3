
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import type { ApplicationReadResponse } from "../../features/credit-application/applicationRead.api";
import { useApplication } from "../../features/credit-application/useApplication";
import { BackendApplicationStatusSection } from "./BackendApplicationStatusSection";

vi.mock("../../features/credit-application/useApplication", () => ({
  useApplication: vi.fn(),
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

function renderSection(
  applicationId: number | null = 42,
  enabled = true,
  sessionKey: string | null = "session-a",
) {
  return render(
    <MemoryRouter>
      <BackendApplicationStatusSection
        applicationId={applicationId}
        enabled={enabled}
        sessionKey={sessionKey}
      />
    </MemoryRouter>,
  );
}

describe("BackendApplicationStatusSection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows nothing when backend loading is disabled", () => {
    vi.mocked(useApplication).mockReturnValue({
      application: null,
      loading: false,
      error: null,
    });

    const { container } = renderSection(42, false, null);

    expect(container).toBeEmptyDOMElement();

    expect(useApplication).toHaveBeenCalledWith(
      42,
      false,
      null,
    );
  });

  it("shows an error for an invalid application ID", () => {
    vi.mocked(useApplication).mockReturnValue({
      application: null,
      loading: false,
      error: null,
    });

    renderSection(null);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ogiltigt ansöknings-ID.",
    );
  });

  it("shows loading while waiting for Java", () => {
    vi.mocked(useApplication).mockReturnValue({
      application: null,
      loading: true,
      error: null,
    });

    renderSection();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Hämtar ansökan",
    );

    expect(useApplication).toHaveBeenCalledWith(
      42,
      true,
      "session-a",
    );
  });

  it("shows an API error without displaying application data", () => {
    vi.mocked(useApplication).mockReturnValue({
      application: null,
      loading: false,
      error: "Du behöver logga in.",
    });

    renderSection();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Du behöver logga in.",
    );

    expect(
      screen.getByRole("link", { name: "Till översikten" }),
    ).toHaveAttribute("href", "/oversikt");

    expect(
      screen.queryByText("RES-2026-0042"),
    ).not.toBeInTheDocument();
  });

  it("displays the application after successful loading", () => {
    vi.mocked(useApplication).mockReturnValue({
      application,
      loading: false,
      error: null,
    });

    renderSection();

    expect(
      screen.getByRole("heading", {
        name: "Ansökan RES-2026-0042",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Under granskning"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Ny utrustning"),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("alert"),
    ).not.toBeInTheDocument();
  });

  it("handles a missing application without crashing", () => {
    vi.mocked(useApplication).mockReturnValue({
      application: null,
      loading: false,
      error: null,
    });

    renderSection();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ansökan kunde inte visas.",
    );
  });
});
