import { describe, expect, it } from "vitest";
import { mapAlfaStatusToCrmStatus } from "../lib/payments/alfabank/mapper";

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
});
