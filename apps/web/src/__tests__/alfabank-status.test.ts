import { describe, expect, it } from "vitest";
import { mapAlfaStatusToCrmStatus } from "../lib/payments/alfabank/mapper";
import { statusSchema } from "../app/api/payments/alfabank/status/route";

describe("alfabank status mapper", () => {
  it("correctly maps alfabank order status integers to CRM payment status strings", () => {
    expect(mapAlfaStatusToCrmStatus(0)).toBe("pending");
    expect(mapAlfaStatusToCrmStatus(1)).toBe("authorized");
    expect(mapAlfaStatusToCrmStatus(2)).toBe("paid");
    expect(mapAlfaStatusToCrmStatus(3)).toBe("cancelled");
    expect(mapAlfaStatusToCrmStatus(4)).toBe("refunded");
    expect(mapAlfaStatusToCrmStatus(6)).toBe("failed");
    expect(mapAlfaStatusToCrmStatus(5)).toBe("unknown");
    expect(mapAlfaStatusToCrmStatus(undefined)).toBe("unknown");
  });

  it("validates request inputs correctly", () => {
    const validUuid = "12345678-1234-4234-8234-123456789012";
    
    // UUID parsing should succeed
    expect(statusSchema.safeParse({ paymentId: validUuid }).success).toBe(true);
    expect(statusSchema.safeParse({ invoiceId: validUuid }).success).toBe(true);
    
    // Non-UUID paymentId should fail
    expect(statusSchema.safeParse({ paymentId: "non-uuid-string" }).success).toBe(false);
    expect(statusSchema.safeParse({ invoiceId: "non-uuid-string" }).success).toBe(false);

    // String providerOrderId should succeed
    expect(statusSchema.safeParse({ providerOrderId: "bank-order-id-123" }).success).toBe(true);
    expect(statusSchema.safeParse({ providerOrderId: "12345" }).success).toBe(true);
  });
});
