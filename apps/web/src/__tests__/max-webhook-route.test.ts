import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendMaxMessage: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  state: {
    settings: {
      organization_id: "org-1",
      bot_token_secret: "max-test-token",
      webhook_secret: "webhook-secret",
      is_enabled: true,
    },
    guardians: [
      { id: "guardian-1", full_name: "Test Parent", phone: "+7 999 000-00-00" },
    ],
    guardiansError: null as null | { message: string },
    upsertError: null as null | { message: string },
    upserts: [] as any[],
  },
}));

vi.mock("@/lib/bots/max/client", () => ({
  buildRequestContactMessage: vi.fn(() => ({ text: "request contact", attachments: [] })),
  sendMaxMessage: mocks.sendMaxMessage,
}));

vi.mock("@/shared/db/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

function createAdminMock() {
  return {
    from(table: string) {
      if (table === "bot_settings") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(async () => ({ data: mocks.state.settings })),
        };
      }
      if (table === "guardians") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn(async () => ({ data: mocks.state.guardians, error: mocks.state.guardiansError })),
        };
      }
      if (table === "guardian_messenger_accounts") {
        return {
          upsert: vi.fn(async (row: any) => {
            mocks.state.upserts.push(row);
            return { error: mocks.state.upsertError };
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

function signedContactPayload(token = mocks.state.settings.bot_token_secret) {
  const vcfInfo = "BEGIN:VCARD\\r\\nVERSION:3.0\\r\\nTEL;TYPE=cell:79990000000\\r\\nFN:Test\\r\\nEND:VCARD\\r\\n";
  const normalizedVcf = vcfInfo.replace(/\\r\\n/g, "\r\n");
  const hash = crypto.createHmac("sha256", token).update(normalizedVcf).digest("hex");

  return {
    vcf_info: vcfInfo,
    max_info: {},
    hash,
  };
}

function buildRequest(update: any) {
  return new Request("http://localhost/api/bots/max/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-max-bot-api-secret": "webhook-secret",
    },
    body: JSON.stringify(update),
  }) as any;
}

async function postWebhook(update: any) {
  const { POST } = await import("../app/api/bots/max/webhook/route");
  return POST(buildRequest(update));
}

function officialContactUpdate(payload = signedContactPayload()) {
  return {
    update_type: "message_created",
    chat_id: 123,
    message: {
      sender: { user_id: 456 },
      recipient: { chat_id: 123 },
      body: {
        attachments: [
          {
            type: "contact",
            payload,
          },
        ],
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.guardians = [
    { id: "guardian-1", full_name: "Test Parent", phone: "+7 999 000-00-00" },
  ];
  mocks.state.guardiansError = null;
  mocks.state.upsertError = null;
  mocks.state.upserts = [];
  mocks.createSupabaseAdminClient.mockReturnValue(createAdminMock());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MAX webhook request_contact", () => {
  it("links a guardian from official message.body.attachments contact payload", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await postWebhook(officialContactUpdate());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true });
    expect(mocks.state.upserts).toHaveLength(1);
    expect(mocks.state.upserts[0]).toMatchObject({
      organization_id: "org-1",
      guardian_id: "guardian-1",
      provider: "max",
      external_user_id: "456",
      chat_id: "123",
      phone_normalized: "+79990000000",
      is_verified: true,
    });
    expect(mocks.sendMaxMessage).toHaveBeenCalledWith(
      "max-test-token",
      expect.objectContaining({
        userId: "456",
        chatId: "123",
        text: "Готово! MAX привязан к личному кабинету Робокс. Теперь сюда можно получать счета на оплату.",
      }),
    );

    const logs = JSON.stringify([...infoSpy.mock.calls, ...errorSpy.mock.calls]);
    expect(logs).toContain("contact_detected");
    expect(logs).toContain("hash_verified");
    expect(logs).toContain("guardian_found");
    expect(logs).toContain("account_linked");
    expect(logs).not.toContain("BEGIN:VCARD");
    expect(logs).not.toContain(signedContactPayload().hash);
    expect(logs).not.toContain("79990000000");
    expect(logs).not.toContain("max-test-token");

    infoSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("does not send success message and returns 500 when account upsert fails", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.state.upsertError = { message: "db unavailable" };

    const response = await postWebhook(officialContactUpdate());
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({ ok: false, code: "MAX_LINK_DB_ERROR" });
    expect(payload.requestId).toEqual(expect.any(String));
    expect(mocks.sendMaxMessage).not.toHaveBeenCalledWith(
      "max-test-token",
      expect.objectContaining({
        text: "Готово! MAX привязан к личному кабинету Робокс. Теперь сюда можно получать счета на оплату.",
      }),
    );
  });

  it("keeps fallback support for message.attachments contact payload", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const update = officialContactUpdate();
    update.message.attachments = update.message.body.attachments;
    update.message.body.attachments = [];

    const response = await postWebhook(update);

    expect(response.status).toBe(200);
    expect(mocks.state.upserts).toHaveLength(1);
    expect(mocks.sendMaxMessage).toHaveBeenCalledWith(
      "max-test-token",
      expect.objectContaining({
        text: "Готово! MAX привязан к личному кабинету Робокс. Теперь сюда можно получать счета на оплату.",
      }),
    );
  });

  it("returns 200 and logs contact_not_found for message_created without contact", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const response = await postWebhook({
      update_type: "message_created",
      chat_id: 123,
      message: {
        sender: { user_id: 456 },
        recipient: { chat_id: 123 },
        body: { attachments: [{ type: "text", payload: { text: "hello" } }] },
      },
    });

    expect(response.status).toBe(200);
    expect(mocks.state.upserts).toHaveLength(0);
    expect(mocks.sendMaxMessage).not.toHaveBeenCalled();
    expect(JSON.stringify(infoSpy.mock.calls)).toContain("contact_not_found");
  });
});
