import { afterEach, describe, expect, it, vi } from "vitest";
import type { CreditApplicationData } from "./creditApplication.types";
import {
  ApplicationApiError,
  createApplication,
  toCreateApplicationRequest,
} from "./creditApplication.api";

const formData: CreditApplicationData = {
  orgNumber: "  556000-1234  ",
  companyName: "  Testbolaget AB  ",
  authorizedSignatory: "  Anna Andersson  ",

  financialYear: "2025",
  industry: "HANDEL",

  equity: "100000",
  totalCapital: "500000",
  currentAssets: "250000",
  shortTermLiabilities: "100000",
  longTermLiabilities: "100000",
  operatingProfit: "-5000",
  netSales: "1000000",

  operatingCashFlow: "30000",
  investingCashFlow: "-10000",
  noCashFlowStatement: "",
  interestExpenses: "-5000",

  requestedAmount: "300000",
  repaymentTerm: "36",
  purpose: "  Ny utrustning  ",
};

describe("toCreateApplicationRequest", () => {
it("maps the React form fields to the Java API contract", () => {
  expect(toCreateApplicationRequest(formData)).toEqual({


    egetKapital: 100000,
    totaltKapital: 500000,
    omsattningstillgangar: 250000,
    kortfristigaSkulder: 100000,
    totalaSkulder: 200000,
    rorelseresultat: -5000,
    nettoomsattning: 1000000,

    operativtKassaflode: 30000,
    investeringsKassaflode: -10000,
    ranteKostnader: 5000,
    bransch: "HANDEL",

    requestedAmount: 300000,
    purpose: "Ny utrustning",
  });
});

it("rejects empty financial values instead of converting them to zero", () => {
  const data: CreditApplicationData = {
    ...formData,
    longTermLiabilities: " ",
  };

  expect(() => toCreateApplicationRequest(data)).toThrow(
    "Långfristiga skulder"
  );
});

it("rejects invalid financial numbers", () => {
  const data: CreditApplicationData = {
    ...formData,
    longTermLiabilities: "invalid",
  };

  expect(() => toCreateApplicationRequest(data)).toThrow(
    "Långfristiga skulder"
  );
});


it("allows manual review when no cash-flow statement exists", () => {
  const data: CreditApplicationData = {
    ...formData,
    noCashFlowStatement: "true",
    operatingCashFlow: "",
    investingCashFlow: "",
  };

  const request = toCreateApplicationRequest(data);

  expect(request.noCashFlowStatement).toBe(true);
  expect(request).not.toHaveProperty("operativtKassaflode");
  expect(request).not.toHaveProperty("investeringsKassaflode");

  expect(request.requestedAmount).toBe(300000);
  expect(request.ranteKostnader).toBe(5000);
});

it("rejects missing cash-flow values when a statement exists", () => {
  const data: CreditApplicationData = {
    ...formData,
    noCashFlowStatement: "",
    operatingCashFlow: "",
    investingCashFlow: "",
  };

  expect(() => toCreateApplicationRequest(data)).toThrow(
    "Kassaflödesuppgifter saknas"
  );
});


  it("converts financial form values from strings to JSON numbers", () => {
    const request = toCreateApplicationRequest(formData);

    expect(typeof request.egetKapital).toBe("number");
    expect(typeof request.rorelseresultat).toBe("number");
    expect(typeof request.requestedAmount).toBe("number");
  });

it("includes the financial fields collected by the new wizard", () => {
  const request = toCreateApplicationRequest(formData);

  expect(request.operativtKassaflode).toBe(30000);
  expect(request.investeringsKassaflode).toBe(-10000);
  expect(request.ranteKostnader).toBe(5000);
  expect(request.bransch).toBe("HANDEL");
});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createApplication", () => {
  it("posts the application to the Java REST API and returns the response", async () => {
    const backendResponse = {
      applicationId: 42,
      caseNumber: "RES-2026-0042",
      companyName: "Testbolaget AB",
      orgNumber: "556000-1234",
      authorizedSignatory: "Anna Andersson",
      status: "UNDER_REVIEW",
      decision: "REVIEW",
      decisionReason: "Ansökan kräver manuell granskning.",
      flagCount: 1,
      creditScore: 78,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => backendResponse,
    });

    vi.stubGlobal("fetch", fetchMock);

    const request = toCreateApplicationRequest(formData);
    const result = await createApplication(request);

    expect(fetchMock).toHaveBeenCalledWith("/api/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    expect(result).toEqual(backendResponse);
  });

  it("preserves backend field validation errors from HTTP 400", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        errors: {
          requestedAmount: "Ansökt belopp måste vara större än 0",
        },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const request = toCreateApplicationRequest(formData);

    try {
      await createApplication(request);
      throw new Error("Expected createApplication to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationApiError);

      if (error instanceof ApplicationApiError) {
        expect(error.status).toBe(400);
        expect(error.errors).toEqual({
          requestedAmount: "Ansökt belopp måste vara större än 0",
        });
      }
    }
  });
  it("returns a clear generic error for non-validation API failures", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    vi.stubGlobal("fetch", fetchMock);

    const request = toCreateApplicationRequest(formData);

    try {
      await createApplication(request);
      throw new Error("Expected createApplication to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationApiError);

      if (error instanceof ApplicationApiError) {
        expect(error.status).toBe(500);
        expect(error.message).toBe("Ansökan kunde inte skickas. Försök igen.");
        expect(error.errors).toEqual({});
      }
    }
  });
});
