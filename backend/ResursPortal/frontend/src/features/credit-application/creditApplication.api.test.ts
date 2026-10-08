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
  equity: "100000",
  totalCapital: "500000",
  currentAssets: "250000",
  shortTermLiabilities: "100000",
  totalDebt: "200000",
  operatingProfit: "-5000",
  netSales: "1000000",
  requestedAmount: "300000",
  purpose: "  Ny utrustning  ",
};

describe("toCreateApplicationRequest", () => {
  it("maps the React form fields to the Java API contract", () => {
    expect(toCreateApplicationRequest(formData)).toEqual({
      orgNumber: "556000-1234",
      companyName: "Testbolaget AB",
      authorizedSignatory: "Anna Andersson",
      egetKapital: 100000,
      totaltKapital: 500000,
      omsattningstillgangar: 250000,
      kortfristigaSkulder: 100000,
      totalaSkulder: 200000,
      rorelseresultat: -5000,
      nettoomsattning: 1000000,
      requestedAmount: 300000,
      purpose: "Ny utrustning",
    });
  });

  it("converts financial form values from strings to JSON numbers", () => {
    const request = toCreateApplicationRequest(formData);

    expect(typeof request.egetKapital).toBe("number");
    expect(typeof request.rorelseresultat).toBe("number");
    expect(typeof request.requestedAmount).toBe("number");
  });

  it("does not invent values for financial fields the wizard does not collect", () => {
    const request = toCreateApplicationRequest(formData);

    expect(request).not.toHaveProperty("operativtKassaflode");
    expect(request).not.toHaveProperty("investeringsKassaflode");
    expect(request).not.toHaveProperty("ranteKostnader");
    expect(request).not.toHaveProperty("bransch");
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createApplication", () => {
  it("posts the application to the Java REST API and returns the response", async () => {
    const backendResponse = {
      applicationId: 42,
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
