import { describe, expect, it } from "vitest";
import {
  mapCreateOrderToAlfaRequest,
  resolveRegisterEndpoint,
  sanitizeAlfaRequest,
  toMinorUnits,
  redactSensitivePaymentPayload,
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
        currencyCode: undefined,
        orderNumber: "INV-2026-0001",
      },
      { apiLogin: "merchant", apiPassword: "secret-password" },
    );

    expect(request.amount).toBe("450000");
    expect(request).not.toHaveProperty("currency");
    expect(sanitizeAlfaRequest(request).password).toBe("[redacted]");
  });

  it("sends currency 810 only when explicitly configured", () => {
    const request = mapCreateOrderToAlfaRequest(
      {
        invoiceId: "00000000-0000-0000-0000-000000000001",
        amount: 4500,
        currency: "RUB",
        currencyCode: "810",
        description: "Абонемент",
        returnUrl: "https://example.com/success",
        failUrl: "https://example.com/fail",
        orderNumber: "INV-2026-0001",
      },
      { apiLogin: "merchant", apiPassword: "secret-password" },
    );

    expect(request.currency).toBe("810");
  });

  it("uses registerPreAuth for two-step payments unless endpoint is configured", () => {
    expect(resolveRegisterEndpoint({ paymentStage: "one_step" })).toBe("register.do");
    expect(resolveRegisterEndpoint({ paymentStage: "two_step" })).toBe("registerPreAuth.do");
    expect(resolveRegisterEndpoint({ paymentStage: "two_step", registerEndpoint: "/custom/register.do" })).toBe("custom/register.do");
  });

  it("scrubs sensitive values from payment logs nested payloads", () => {
    const payload = {
      orderId: "123",
      maskedPan: "411111******1111",
      cardholderName: "IVAN IVANOV",
      ip: "203.0.113.10",
      browserParams: {
        user_agent: "Mozilla/5.0",
        approvalCode: "123456",
        authRefNum: "654321",
      },
      credentials: {
        userName: "user-123",
        password: "secret-password-123",
        api_password_secret: "some-secret",
      },
      security: {
        signature: "sig-val",
        token: "token-val",
      }
    };

    const redacted = redactSensitivePaymentPayload(payload);
    expect(redacted.orderId).toBe("123");
    expect(redacted.maskedPan).toBe("[redacted]");
    expect(redacted.cardholderName).toBe("[redacted]");
    expect(redacted.ip).toBe("[redacted]");
    expect(redacted.browserParams).toBe("[redacted]");
    expect(redacted.credentials.userName).toBe("[redacted]");
    expect(redacted.credentials.password).toBe("[redacted]");
    expect(redacted.credentials.api_password_secret).toBe("[redacted]");
    expect(redacted.security.signature).toBe("[redacted]");
    expect(redacted.security.token).toBe("[redacted]");
  });
});
