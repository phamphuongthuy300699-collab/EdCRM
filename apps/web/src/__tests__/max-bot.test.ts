import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  findGuardianByVerifiedPhone,
  normalizeMaxVcfInfo,
  normalizeRuPhone,
  parsePhoneFromMaxVcf,
  verifyMaxContactHash,
} from "../lib/bots/max/utils";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("MAX bot MVP", () => {
  it("uses official MAX API base and passes token only in Authorization header", () => {
    const client = read("src/lib/bots/max/client.ts");

    expect(client).toContain("https://platform-api2.max.ru");
    expect(client).toContain("Authorization: token");
    expect(client).toContain("/messages?");
    expect(client).not.toContain("access_token=");
    expect(client).not.toContain("bot_token=");
  });

  it("verifies request_contact hash with HMAC-SHA256(bot_token, vcf_info)", () => {
    const token = "max-test-token";
    const vcfInfo = "BEGIN:VCARD\nTEL:+79997770000\nEND:VCARD";
    const hash = crypto.createHmac("sha256", token).update(vcfInfo).digest("hex");

    expect(verifyMaxContactHash(token, vcfInfo, hash)).toBe(true);
    expect(verifyMaxContactHash(token, vcfInfo, "bad-hash")).toBe(false);
  });

  it("parses phone from official MAX VCF contact payload with CRLF", () => {
    const vcfInfo = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "FN:Parent",
      "TEL;TYPE=cell:79056846065;",
      "END:VCARD",
    ].join("\r\n");

    expect(parsePhoneFromMaxVcf(vcfInfo)).toBe("+79056846065");
    expect(parsePhoneFromMaxVcf("BEGIN:VCARD\nTEL:+79997770000;\nEND:VCARD")).toBe("+79997770000");
  });

  it("verifies MAX contact hash after converting literal CRLF sequences", () => {
    const token = "max-test-token";
    const rawVcfInfo = "BEGIN:VCARD\\r\\nTEL;TYPE=cell:79056846065;\\r\\nEND:VCARD";
    const normalizedVcfInfo = normalizeMaxVcfInfo(rawVcfInfo);
    const hash = crypto.createHmac("sha256", token).update(normalizedVcfInfo).digest("hex");

    expect(verifyMaxContactHash(token, normalizedVcfInfo, hash)).toBe(true);
    expect(parsePhoneFromMaxVcf(normalizedVcfInfo)).toBe("+79056846065");
  });

  it("normalizes Russian parent phones to a stable +7 format", () => {
    expect(normalizeRuPhone("89997770000")).toBe("+79997770000");
    expect(normalizeRuPhone("+79997770000")).toBe("+79997770000");
  });

  it("matches formatted CRM guardian phone with MAX VCF phone", () => {
    const guardians = [
      { id: "guardian-1", full_name: "Parent One", phone: "+7 905 684-60-65" },
      { id: "guardian-2", full_name: "Parent Two", phone: "+7 999 777-00-00" },
    ];
    const verifiedPhone = parsePhoneFromMaxVcf("BEGIN:VCARD\r\nTEL;TYPE=cell:79056846065;\r\nEND:VCARD");

    expect(findGuardianByVerifiedPhone(guardians, verifiedPhone)?.id).toBe("guardian-1");
  });

  it("webhook checks X-Max-Bot-Api-Secret and links verified guardian messenger account", () => {
    const webhook = read("src/app/api/bots/max/webhook/route.ts");

    expect(webhook).toContain("x-max-bot-api-secret");
    expect(webhook).toContain('eq("webhook_secret", secret)');
    expect(webhook).toContain("verifyMaxContactHash");
    expect(webhook).toContain("guardian_messenger_accounts");
    expect(webhook).toContain("status: 401");
    expect(webhook).toContain("is_verified: true");
    expect(webhook).not.toContain(".or(`phone.eq.");
  });

  it("handles bot_started updates with top-level chat_id", () => {
    const webhook = read("src/app/api/bots/max/webhook/route.ts");

    expect(webhook).toContain("update?.chat_id");
    expect(webhook).toContain("update?.message?.recipient?.chat_id");
    expect(webhook).toContain('updateType === "bot_started"');
  });

  it("invoice publish creates MAX notification outbox when guardian is linked", () => {
    const endpoint = read("src/app/api/crm/invoice-payment-links/route.ts");

    expect(endpoint).toContain("guardian_messenger_accounts");
    expect(endpoint).toContain("notification_outbox");
    expect(endpoint).toContain('"max" : "manual"');
    expect(endpoint).toContain("payUrl: link.payUrl");
    expect(endpoint).toContain("publicId: link.publicId");
  });

  it("notification worker sends /messages with inline_keyboard link button", () => {
    const worker = read("src/app/api/jobs/notifications/process/route.ts");
    const client = read("src/lib/bots/max/client.ts");

    expect(worker).toContain("sendMaxMessage");
    expect(worker).toContain("linkUrl: payload.payUrl");
    expect(worker).toContain('linkText: "Оплатить счёт"');
    expect(client).toContain('type: "inline_keyboard"');
    expect(client).toContain('type: "link"');
  });

  it("bot settings API never returns stored bot token", () => {
    const route = read("src/app/api/crm/bot-settings/max/route.ts");
    const webhook = read("src/app/api/bots/max/webhook/route.ts");

    expect(route).toContain("tokenConfigured");
    expect(route).toContain("bot_token_secret");
    expect(route).not.toContain("botTokenSecret");
    expect(route).not.toContain("botToken: data");
    expect(route).not.toContain("botToken: current");
    expect(webhook).not.toMatch(/console\.(log|warn|error)\([^)]*bot_token_secret/s);
    expect(webhook).not.toMatch(/NextResponse\.json\([^)]*bot_token_secret/s);
  });
});
