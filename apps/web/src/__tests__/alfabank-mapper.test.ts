import { describe, expect, it } from "vitest";
import {
  mapCreateOrderToAlfaRequest,
  resolveRegisterEndpoint,
  sanitizeAlfaRequest,
  toMinorUnits,
} from "../lib/payments/alfabank/mapper";

describe("alfabank mapper", () => {
  it("maps ruble amount to minor units", () => {
    expect(toMinorUnits(4500)).toBe("450000");
    expect(toMinorUnits(1200.5)).toBe("120050");
  });

  it("redacts API password from saved raw request", () => {
    const request = mapCreateOrderToAlfaRequest(
      {
        invoiceId: "00000000-0000-0000-0000-000000000001",
        amount: 4500,
        currency: "RUB",
        description: "Абонемент",
        returnUrl: "https://example.com/success",
        failUrl: "https://example.com/fail",
        orderNumber: "INV-2026-0001",
      },
      { apiLogin: "merchant", apiPassword: "secret-password" },
    );

    expect(request.amount).toBe("450000");
    expect(request.currency).toBe("643");
    expect(sanitizeAlfaRequest(request).password).toBe("[redacted]");
  });

  it("uses registerPreAuth for two-step payments unless endpoint is configured", () => {
    expect(resolveRegisterEndpoint({ paymentStage: "one_step" })).toBe("register.do");
    expect(resolveRegisterEndpoint({ paymentStage: "two_step" })).toBe("registerPreAuth.do");
    expect(resolveRegisterEndpoint({ paymentStage: "two_step", registerEndpoint: "/custom/register.do" })).toBe("custom/register.do");
  });
});
