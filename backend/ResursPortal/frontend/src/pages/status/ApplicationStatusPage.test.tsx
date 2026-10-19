import { fireEvent, render, screen, within } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ApplicationStatusPage } from "./ApplicationStatusPage";
import { CasesProvider } from "../../context/CasesContext";
import { useAuth } from "../../auth/useAuth";
import type { CreateApplicationResponse } from "../../features/credit-application/creditApplication.api";

vi.mock("../../auth/useAuth", () => ({
  useAuth: vi.fn(),
}));

const backendResult: CreateApplicationResponse = {
  applicationId: 42,
  caseNumber: "RES-2026-0042",
  companyName: "Malmö Fastigheter AB",
  orgNumber: "556000-1234",
  authorizedSignatory: "Anders Karlsson",
  status: "UNDER_REVIEW",
  decision: "REVIEW",
  decisionReason: "Ansökan behöver granskas.",
  flagCount: 1,
  creditScore: 90,
};

describe("ApplicationStatusPage backend receipt", () => {
  it("shows the Java submission receipt instead of a not-found page", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        role: "client",
        id: "556000-1234",
        orgNumber: "556000-1234",
        companyName: "Malmö Fastigheter AB",
      },
      isAuthenticated: true,
      loginAsClient: vi.fn(),
      loginAsAdmin: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/ansokan/42",
            state: {
              justSubmitted: true,
              backendResult,
            },
          },
        ]}
      >
        <CasesProvider>
          <Routes>
            <Route path="/ansokan/:id" element={<ApplicationStatusPage />} />
          </Routes>
        </CasesProvider>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Ansökan mottagen" }),
    ).toBeInTheDocument();

    expect(screen.getByText("RES-2026-0042")).toBeInTheDocument();
    const progress = screen.getByRole("region", {
      name: "Förlopp vid inskickning",
    });

    expect(
      within(progress).getByText("Under granskning")
    ).toBeInTheDocument();

    expect(
      within(progress).getByText("Inget beslut har registrerats vid inskickning.")
    ).toBeInTheDocument();


    expect(screen.queryByText("Ansökan hittades inte")).not.toBeInTheDocument();
  });

  it("does not display a stale receipt after navigating to another application", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        role: "client",
        id: "556000-1234",
        orgNumber: "556000-1234",
        companyName: "Malmö Fastigheter AB",
      },
      isAuthenticated: true,
      loginAsClient: vi.fn(),
      loginAsAdmin: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/ansokan/42",
            state: {
              justSubmitted: true,
              backendResult,
            },
          },
        ]}
      >
        <CasesProvider>
          <Link to="/ansokan/43">Öppna en annan ansökan</Link>

          <Routes>
            <Route path="/ansokan/:id" element={<ApplicationStatusPage />} />
          </Routes>
        </CasesProvider>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Ansökan mottagen" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("link", {
        name: "Öppna en annan ansökan",
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Ansökan hittades inte",
      }),
    ).toBeInTheDocument();

    expect(screen.queryByText("RES-2026-0042")).not.toBeInTheDocument();
  });

  it("does not restore an old receipt when returning to the original URL", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        role: "client",
        id: "556000-1234",
        orgNumber: "556000-1234",
        companyName: "Malmö Fastigheter AB",
      },
      isAuthenticated: true,
      loginAsClient: vi.fn(),
      loginAsAdmin: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/ansokan/42",
            state: {
              justSubmitted: true,
              backendResult,
            },
          },
        ]}
      >
        <CasesProvider>
          <Link to="/ansokan/43">Gå till 43</Link>
          <Link to="/ansokan/42">Tillbaka till 42</Link>

          <Routes>
            <Route path="/ansokan/:id" element={<ApplicationStatusPage />} />
          </Routes>
        </CasesProvider>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Ansökan mottagen",
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Gå till 43" }));

    expect(
      screen.getByRole("heading", {
        name: "Ansökan hittades inte",
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Tillbaka till 42" }));

    expect(
      screen.getByRole("heading", {
        name: "Ansökan hittades inte",
      }),
    ).toBeInTheDocument();

    expect(screen.queryByText("RES-2026-0042")).not.toBeInTheDocument();
  });

  it.each([
    {
      name: "rejects a different application ID",
      path: "/ansokan/43",
      state: { justSubmitted: true, backendResult },
      orgNumber: "556000-1234",
    },
    {
      name: "rejects a different company",
      path: "/ansokan/42",
      state: { justSubmitted: true, backendResult },
      orgNumber: "556000-5678",
    },
    {
      name: "does not invent a receipt on direct visit",
      path: "/ansokan/42",
      state: null,
      orgNumber: "556000-1234",
    },
    {
      name: "requires the submission flag",
      path: "/ansokan/42",
      state: { backendResult },
      orgNumber: "556000-1234",
    },
    {
      name: "rejects an invalid backend status",
      path: "/ansokan/42",
      state: {
        justSubmitted: true,
        backendResult: {
          ...backendResult,
          status: "INVALID_STATUS",
        },
      },
      orgNumber: "556000-1234",
    },
  ])("$name", ({ path, state, orgNumber }) => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        role: "client",
        id: orgNumber,
        orgNumber,
        companyName: "Malmö Fastigheter AB",
      },
      isAuthenticated: true,
      loginAsClient: vi.fn(),
      loginAsAdmin: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: path, state }]}>
        <CasesProvider>
          <Routes>
            <Route path="/ansokan/:id" element={<ApplicationStatusPage />} />
          </Routes>
        </CasesProvider>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Ansökan hittades inte",
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("heading", {
        name: "Ansökan mottagen",
      }),
    ).not.toBeInTheDocument();

    expect(screen.queryByText("RES-2026-0042")).not.toBeInTheDocument();
  });

  it("does not reuse a receipt when navigating to the same URL", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        role: "client",
        id: "556000-1234",
        orgNumber: "556000-1234",
        companyName: "Malmö Fastigheter AB",
      },
      isAuthenticated: true,
      loginAsClient: vi.fn(),
      loginAsAdmin: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/ansokan/42",
            state: {
              justSubmitted: true,
              backendResult,
            },
          },
        ]}
      >
        <CasesProvider>
          <Link to="/ansokan/42">Öppna samma ansökan igen</Link>

          <Routes>
            <Route path="/ansokan/:id" element={<ApplicationStatusPage />} />
          </Routes>
        </CasesProvider>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Ansökan mottagen",
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("link", {
        name: "Öppna samma ansökan igen",
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Ansökan hittades inte",
      }),
    ).toBeInTheDocument();

    expect(screen.queryByText("RES-2026-0042")).not.toBeInTheDocument();
  });

it("does not show another company's prototype case when only the name matches", () => {
  localStorage.clear();

  vi.mocked(useAuth).mockReturnValue({
    user: {
      role: "client",
      id: "556999-9999",
      orgNumber: "556999-9999",
      companyName: "Göteborg Handel AB",
    },
    isAuthenticated: true,
    loginAsClient: vi.fn(),
    loginAsAdmin: vi.fn(),
    logout: vi.fn(),
  });

  render(
    <MemoryRouter initialEntries={["/ansokan/c-1001"]}>
      <CasesProvider>
        <Routes>
          <Route path="/ansokan/:id" element={<ApplicationStatusPage />} />
        </Routes>
      </CasesProvider>
    </MemoryRouter>,
  );

  expect(
    screen.getByRole("heading", {
      name: "Ansökan hittades inte",
    }),
  ).toBeInTheDocument();
});
});
