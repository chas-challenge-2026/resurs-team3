
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ApplicationReadResponse } from "../../features/credit-application/applicationRead.api";
import { MemoryRouter } from "react-router-dom";
import { BackendApplicationCard } from "./BackendApplicationCard";

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

  function renderCard(value: ApplicationReadResponse) {
    return render(
      <MemoryRouter>
        <BackendApplicationCard application={value} />
      </MemoryRouter>
    );
  }

describe("BackendApplicationCard", () => {
  it("shows application information from the backend", () => {
    renderCard(application);

    expect(
      screen.getByRole("heading", {
        name: "Ansökan RES-2026-0042",
      }),
    ).toBeInTheDocument();

    // ADD THIS HERE
    expect(
      screen.getByRole("link", {
        name: "Ansökan RES-2026-0042",
      }),
    ).toHaveAttribute("href", "/ansokan/42");
    
    expect(screen.getByText("Ny utrustning")).toBeInTheDocument();
    expect(screen.getByText("Under granskning")).toBeInTheDocument();
    expect(screen.getByText("Under granskning")).toBeInTheDocument();
    expect(screen.getByText(/300\s*000\s*SEK/)).toBeInTheDocument();
    expect(
      screen.getByText("Manuell granskning krävs."),
    ).toBeInTheDocument();
  });

  it("handles missing optional information", () => {
    renderCard({
      ...application,
      caseNumber: null,
      requestedAmount: null,
      purpose: null,
      createdAt: null,
      decisionReason: null,
    });

    expect(
      screen.getByRole("heading", { name: "Ansökan #42" }),
    ).toBeInTheDocument();

    expect(screen.getByText("Belopp saknas")).toBeInTheDocument();
    expect(screen.getByText("Datum saknas")).toBeInTheDocument();
    expect(screen.getByText("Företagskredit")).toBeInTheDocument();

    expect(
      screen.queryByText("Visa beslutsinformation"),
    ).not.toBeInTheDocument();
  });

  it("handles an unknown backend status", () => {
    renderCard({
      ...application,
      status: "NEW_BACKEND_STATUS",
    });

    expect(screen.getByText("Okänd status")).toBeInTheDocument();
  });
});
