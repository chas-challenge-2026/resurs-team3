
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import type { ApplicationReadResponse } from "../../features/credit-application/applicationRead.api";
import { BackendApplicationStatusView } from "./BackendApplicationStatusView";

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

function renderStatus(applicationData: ApplicationReadResponse) {
  return render(
    <MemoryRouter>
      <BackendApplicationStatusView
        application={applicationData}
      />
    </MemoryRouter>,
  );
}

describe("BackendApplicationStatusView", () => {
  it("displays an application from the Java backend", () => {
    renderStatus(application);

    expect(
      screen.getByRole("heading", {
        name: "Ansökan RES-2026-0042",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Under granskning"),
    ).toBeInTheDocument();

    const details = screen.getByRole("region", {
      name: "Ansökningsuppgifter",
    });

    expect(
      within(details).getByText("Ny utrustning"),
    ).toBeInTheDocument();

    expect(
      within(details).getByText(/300\s*000\s*SEK/),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Manuell granskning krävs."),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Översikt" }),
    ).toHaveAttribute("href", "/oversikt");
  });

  it("handles missing optional fields safely", () => {
    renderStatus({
      ...application,
      caseNumber: null,
      requestedAmount: null,
      purpose: null,
      createdAt: null,
      companyName: null,
      decisionReason: null,
    });

    expect(
      screen.getByRole("heading", {
        name: "Ansökan #42",
      }),
    ).toBeInTheDocument();

    const details = screen.getByRole("region", {
      name: "Ansökningsuppgifter",
    });

    expect(
      within(details).getByText("Belopp saknas"),
    ).toBeInTheDocument();

    expect(
      within(details).getByText("Datum saknas"),
    ).toBeInTheDocument();

    expect(
      within(details).getByText("Ej angivet"),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("heading", {
        name: "Beslutsinformation",
      }),
    ).not.toBeInTheDocument();
  });

  it("handles an unknown status without crashing", () => {
    renderStatus({
      ...application,
      status: "FUTURE_STATUS",
    });

    expect(
      screen.getByText("Okänd status"),
    ).toBeInTheDocument();
  });

  it("does not show an empty decision reason", () => {
    renderStatus({
      ...application,
      decisionReason: "   ",
    });

    expect(
      screen.queryByRole("heading", {
        name: "Beslutsinformation",
      }),
    ).not.toBeInTheDocument();
  });
});
