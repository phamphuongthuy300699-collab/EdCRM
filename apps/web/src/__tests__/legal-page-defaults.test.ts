import { describe, expect, it } from "vitest";
import { getLegalPageDefault, legalPageDocs } from "../shared/utils/legal-page-defaults";

describe("legal page defaults", () => {
  it("provides editable fallback text for every footer legal page", () => {
    const keys = legalPageDocs.map((doc) => doc.key);

    expect(keys).toEqual([
      "legal.page.legal",
      "legal.page.privacy",
      "legal.page.offer",
      "legal.page.payment",
      "legal.page.refund",
      "legal.page.privacy_policy",
      "legal.page.consent",
    ]);

    legalPageDocs.forEach((doc) => {
      const page = getLegalPageDefault(doc.key, {
        schoolName: "Робокс",
        email: "hello@example.com",
        phone: "+7 000 000-00-00",
      });
      expect(page.title.length).toBeGreaterThan(0);
      expect(page.subtitle.length).toBeGreaterThan(0);
      expect(page.body.length).toBeGreaterThan(80);
    });
  });

  it("keeps dynamic contact values inside refund and consent fallbacks", () => {
    expect(getLegalPageDefault("legal.page.refund", {
      email: "refund@example.com",
      phone: "+7 111 111-11-11",
    }).body).toContain("refund@example.com");

    expect(getLegalPageDefault("legal.page.consent", {
      schoolName: "Школа Тест",
      email: "privacy@example.com",
    }).body).toContain("Школа Тест");
  });
});
