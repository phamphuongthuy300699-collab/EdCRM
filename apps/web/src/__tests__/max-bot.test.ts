import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MaxBotError, maxErrorResponse, safeMaxHttpCode, safeMaxNetworkCode } from "../lib/bots/max/client";
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

function openSslBin() {
  const candidates = [
    process.env.OPENSSL_BIN,
    "openssl",
    "C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe",
    "C:\\Program Files\\Git\\usr\\bin\\openssl.exe",
  ].filter(Boolean) as string[];
  return candidates.find((candidate) => {
    try {
      execFileSync(candidate, ["version"], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }) || "openssl";
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

  it("maps certificate network causes to MAX_TLS_ERROR", () => {
    expect(safeMaxNetworkCode({ cause: { code: "UNABLE_TO_GET_ISSUER_CERT_LOCALLY", message: "unable to get local issuer certificate" } })).toBe("MAX_TLS_ERROR");
    expect(safeMaxNetworkCode({ cause: { code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" } })).toBe("MAX_TLS_ERROR");
  });

  it("maps DNS network causes to MAX_DNS_ERROR", () => {
    expect(safeMaxNetworkCode({ cause: { code: "ENOTFOUND", hostname: "platform-api2.max.ru" } })).toBe("MAX_DNS_ERROR");
    expect(safeMaxNetworkCode({ cause: { code: "EAI_AGAIN", hostname: "platform-api2.max.ru" } })).toBe("MAX_DNS_ERROR");
  });

  it("maps timeout network causes to MAX_TIMEOUT", () => {
    expect(safeMaxNetworkCode({ name: "AbortError", message: "This operation was aborted" })).toBe("MAX_TIMEOUT");
    expect(safeMaxNetworkCode({ cause: { code: "ETIMEDOUT" } })).toBe("MAX_TIMEOUT");
  });

  it("maps HTTP 401 to MAX_HTTP_401", () => {
    expect(safeMaxHttpCode(401)).toBe("MAX_HTTP_401");
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
    const helper = read("src/lib/payments/publish-invoice.ts");

    expect(endpoint).toContain("publishInvoiceForParent");
    expect(helper).toContain("guardian_messenger_accounts");
    expect(helper).toContain("notification_outbox");
    expect(helper).toContain('"max" : "manual"');
    expect(helper).toContain("payUrl: link.payUrl");
    expect(helper).toContain("publicId: link.publicId");
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
    const checkRoute = read("src/app/api/crm/bot-settings/max/check/route.ts");
    const subscribeRoute = read("src/app/api/crm/bot-settings/max/subscribe/route.ts");
    const client = read("src/lib/bots/max/client.ts");
    const payload = maxErrorResponse(
      new MaxBotError("token max-test-token failed", "MAX_HTTP_401", "request-id", 401),
      "Не удалось проверить токен MAX",
    );

    expect(route).toContain("tokenConfigured");
    expect(route).toContain("bot_token_secret");
    expect(route).not.toContain("botTokenSecret");
    expect(route).not.toContain("botToken: data");
    expect(route).not.toContain("botToken: current");
    expect(webhook).not.toMatch(/console\.(log|warn|error)\([^)]*bot_token_secret/s);
    expect(webhook).not.toMatch(/NextResponse\.json\([^)]*bot_token_secret/s);
    expect(JSON.stringify(payload)).not.toContain("max-test-token");
    expect(checkRoute).toContain("maxErrorResponse");
    expect(subscribeRoute).toContain("maxErrorResponse");
    expect(client).not.toMatch(/console\.error\([^)]*Authorization/s);
    expect(client).not.toMatch(/console\.error\([^)]*token/s);
  });

  it("Dockerfile installs MAX CA certificates for Node TLS", () => {
    const dockerfile = read("../../Dockerfile");

    expect(dockerfile).toContain("apk add --no-cache ca-certificates");
    expect(dockerfile).toContain("update-ca-certificates");
    expect(dockerfile).toContain("NODE_EXTRA_CA_CERTS=/app/certs/max-ca-bundle.pem");
    expect(dockerfile).toContain("russian-trusted-root-ca.crt");
    expect(dockerfile).toContain("russian-trusted-sub-ca.crt");
  });

  it("Russian trusted CA certificates are readable by openssl x509", () => {
    const openssl = openSslBin();
    const root = path.join(process.cwd(), "..", "..", "infra", "certs", "russian-trusted-root-ca.crt");
    const sub = path.join(process.cwd(), "..", "..", "infra", "certs", "russian-trusted-sub-ca.crt");

    expect(execFileSync(openssl, ["x509", "-in", root, "-noout", "-subject"], { encoding: "utf8" })).toContain("Russian Trusted Root CA");
    expect(execFileSync(openssl, ["x509", "-in", sub, "-noout", "-subject"], { encoding: "utf8" })).toContain("Russian Trusted Sub CA");
  });

  it("MAX CA bundle contains only public certificate blocks", () => {
    const bundle = read("../../infra/certs/max-ca-bundle.pem");
    const withoutCerts = bundle.replace(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g, "").trim();

    expect((bundle.match(/-----BEGIN CERTIFICATE-----/g) || [])).toHaveLength(2);
    expect(withoutCerts).toBe("");
    expect(bundle).not.toContain("PRIVATE KEY");
  });
});
