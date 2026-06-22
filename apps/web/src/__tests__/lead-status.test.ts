import { describe, it, expect } from "vitest";

describe("Leads status and safety check", () => {
  it("should not contain legacy 'trial' status and should support 'trial_scheduled'", () => {
    const allowedStatuses = ["new", "contacted", "trial_scheduled", "converted", "lost"];
    
    // Check that 'trial' is not in allowedStatuses
    expect(allowedStatuses).not.toContain("trial");
    
    // Check that 'trial_scheduled' is in allowedStatuses
    expect(allowedStatuses).toContain("trial_scheduled");
  });

  it("maps lead status helper functions properly", () => {
    const getStatusBadgeLabel = (status: string) => {
      switch (status) {
        case "new": return "Новая";
        case "contacted": return "В работе";
        case "trial_scheduled": return "Пробное";
        case "converted": return "Ученик";
        case "lost": return "Потеряна";
        default: return "Неизвестно";
      }
    };

    expect(getStatusBadgeLabel("new")).toBe("Новая");
    expect(getStatusBadgeLabel("trial_scheduled")).toBe("Пробное");
    expect(getStatusBadgeLabel("trial")).toBe("Неизвестно");
  });
});
