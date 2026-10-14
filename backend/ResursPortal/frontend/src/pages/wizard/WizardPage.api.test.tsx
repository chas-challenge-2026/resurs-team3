import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WizardPage } from "./WizardPage";
import {
  ApplicationApiError,
  createApplication,
} from "../../features/credit-application/creditApplication.api";

vi.mock("./WizardTopBar", () => ({
  WizardTopBar: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("../../features/credit-application/creditApplication.api", async () => {
  const actual = await vi.importActual<
    typeof import("../../features/credit-application/creditApplication.api")
  >("../../features/credit-application/creditApplication.api");

  return {
    ...actual,
    createApplication: vi.fn(),
  };
});

const mockedCreateApplication = vi.mocked(createApplication);

describe("WizardPage API submission", () => {
  beforeEach(() => {
    mockedCreateApplication.mockReset();
  });

  it("submits the completed wizard to the API and shows the backend result", async () => {
    const user = userEvent.setup();

    mockedCreateApplication.mockResolvedValue({
      applicationId: 42,
      status: "UNDER_REVIEW",
      decision: "REVIEW",
      decisionReason: "Backend test reason",
      flagCount: 1,
      creditScore: 88,
    });

    render(<WizardPage />);

    await user.type(
      screen.getByLabelText(/^Organisationsnummer/),
      "556000-1234",
    );
    await user.type(screen.getByLabelText(/^Företagsnamn/), "Testbolaget AB");
    await user.type(screen.getByLabelText(/^Firmatecknare/), "Anna Andersson");

    await user.click(screen.getByRole("button", { name: "Nästa" }));

    await user.type(screen.getByLabelText(/^Eget kapital/), "300000");
    await user.type(screen.getByLabelText(/^Totalt kapital/), "1000000");
    await user.type(screen.getByLabelText(/^Omsättningstillgångar/), "500000");
    await user.type(screen.getByLabelText(/^Kortfristiga skulder/), "200000");
    await user.type(screen.getByLabelText(/^Totala skulder/), "300000");
    await user.type(screen.getByLabelText(/^Rörelseresultat/), "50000");
    await user.type(screen.getByLabelText(/^Nettoomsättning/), "2000000");

    await user.click(screen.getByRole("button", { name: "Nästa" }));

    await user.type(screen.getByLabelText(/^Önskat kreditbelopp/), "250000");
    await user.type(
      screen.getByLabelText(/^Syfte med krediten/),
      "Ny utrustning",
    );

    await user.click(screen.getByRole("button", { name: "Skicka in ansökan" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Bekräfta ansökan",
    });

    await user.click(
      within(dialog).getByRole("button", {
        name: "Skicka in ansökan",
      }),
    );

    expect(mockedCreateApplication).toHaveBeenCalledTimes(1);

    expect(mockedCreateApplication).toHaveBeenCalledWith({
      orgNumber: "556000-1234",
      companyName: "Testbolaget AB",
      authorizedSignatory: "Anna Andersson",
      egetKapital: 300000,
      totaltKapital: 1000000,
      omsattningstillgangar: 500000,
      kortfristigaSkulder: 200000,
      totalaSkulder: 300000,
      rorelseresultat: 50000,
      nettoomsattning: 2000000,
      requestedAmount: 250000,
      purpose: "Ny utrustning",
    });

    expect(
      await screen.findByRole("heading", {
        name: "Ansökan under granskning",
      }),
    ).toBeInTheDocument();

    expect(screen.getByText("Backend test reason")).toBeInTheDocument();
  });

  it("shows backend field validation errors on the matching wizard field", async () => {
    const user = userEvent.setup();

    mockedCreateApplication.mockRejectedValue(
      new ApplicationApiError(400, "Ansökan innehåller ogiltiga uppgifter.", {
        requestedAmount: "Ansökt belopp måste vara större än 0",
      }),
    );

    render(<WizardPage />);

    await user.type(
      screen.getByLabelText(/^Organisationsnummer/),
      "556000-1234",
    );
    await user.type(screen.getByLabelText(/^Företagsnamn/), "Testbolaget AB");
    await user.type(screen.getByLabelText(/^Firmatecknare/), "Anna Andersson");

    await user.click(screen.getByRole("button", { name: "Nästa" }));

    await user.type(screen.getByLabelText(/^Eget kapital/), "300000");
    await user.type(screen.getByLabelText(/^Totalt kapital/), "1000000");
    await user.type(screen.getByLabelText(/^Omsättningstillgångar/), "500000");
    await user.type(screen.getByLabelText(/^Kortfristiga skulder/), "200000");
    await user.type(screen.getByLabelText(/^Totala skulder/), "300000");
    await user.type(screen.getByLabelText(/^Rörelseresultat/), "50000");
    await user.type(screen.getByLabelText(/^Nettoomsättning/), "2000000");

    await user.click(screen.getByRole("button", { name: "Nästa" }));

    await user.type(screen.getByLabelText(/^Önskat kreditbelopp/), "250000");
    await user.type(
      screen.getByLabelText(/^Syfte med krediten/),
      "Ny utrustning",
    );

    await user.click(screen.getByRole("button", { name: "Skicka in ansökan" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Bekräfta ansökan",
    });

    await user.click(
      within(dialog).getByRole("button", {
        name: "Skicka in ansökan",
      }),
    );

    expect(mockedCreateApplication).toHaveBeenCalledTimes(1);

    expect(
      await screen.findByText("Ansökt belopp måste vara större än 0"),
    ).toBeInTheDocument();

   await waitFor(() => {
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
    expect(
      screen.getByRole("heading", { name: "Kreditansökan" }),
    ).toBeInTheDocument();
  });
});
