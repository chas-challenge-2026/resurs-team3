
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ApplicationReadResponse } from "../../features/credit-application/applicationRead.api";
import { useApplications } from "../../features/credit-application/useApplications";
import { BackendApplicationsSection } from "./BackendApplicationsSection";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../features/credit-application/useApplications", () => ({
  useApplications: vi.fn(),
}));

const application: ApplicationReadResponse = {
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

describe("BackendApplicationsSection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows loading while waiting for Java", () => {
    vi.mocked(useApplications).mockReturnValue({
      applications: [],
      loading: true,
      error: null,
    });

    render(
  <BackendApplicationsSection
    enabled={true}
    sessionKey="session-a"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Hämtar företagets ansökningar",
    );

    expect(
      screen.getByRole("region", { name: "Mina ansökningar" }),
    ).toHaveAttribute("aria-busy", "true");

    expect(useApplications).toHaveBeenCalledWith(
  true,
  "session-a",
    );
  });

  it("shows an error instead of an empty list", () => {
    vi.mocked(useApplications).mockReturnValue({
      applications: [],
      loading: false,
      error: "Du behöver logga in för att se ansökningarna.",
    });

    render(
  <BackendApplicationsSection
    enabled={true}
    sessionKey="session-a"
    />,
  );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Du behöver logga in",
    );

    expect(
      screen.queryByText("Inga ansökningar ännu"),
    ).not.toBeInTheDocument();
  });

  it("shows the empty state when Java returns no applications", () => {
    vi.mocked(useApplications).mockReturnValue({
      applications: [],
      loading: false,
      error: null,
    });

    render(
  <BackendApplicationsSection
    enabled={true}
    sessionKey="session-a"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Inga ansökningar ännu" }),
    ).toBeInTheDocument();

    expect(screen.getByText("0 ansökningar")).toBeInTheDocument();
  });

  it("displays multiple real applications", () => {
    const secondApplication: ApplicationReadResponse = {
      ...application,
      applicationId: 43,
      caseNumber: "RES-2026-0043",
      purpose: "Utöka verksamheten",
      status: "APPROVED",
    };

    vi.mocked(useApplications).mockReturnValue({
      applications: [application, secondApplication],
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <BackendApplicationsSection
          enabled={true}
          sessionKey="session-a"
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Ansökan RES-2026-0042",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: "Ansökan RES-2026-0043",
      }),
    ).toBeInTheDocument();

    expect(screen.getByText("2 ansökningar")).toBeInTheDocument();
    expect(screen.getByText("Beviljad")).toBeInTheDocument();
  });

it("renders nothing when backend loading is disabled", () => {
  vi.mocked(useApplications).mockReturnValue({
    applications: [],
    loading: false,
    error: null,
  });

  const { container } = render(
    <BackendApplicationsSection
      enabled={false}
      sessionKey={null}
    />,
  );

  expect(container).toBeEmptyDOMElement();

  expect(useApplications).toHaveBeenCalledWith(
    false,
    null,
  );
  });
});
