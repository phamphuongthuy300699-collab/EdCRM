import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendMaxMessage: vi.fn(),
  createOrReuseInvoicePaymentLink: vi.fn(),
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
    accounts: [] as any[],
    invoices: [] as any[],
    invoicesError: null as null | { message: string },
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

vi.mock("@/lib/payments/invoice-payment-links", () => ({
  createOrReuseInvoicePaymentLink: mocks.createOrReuseInvoicePaymentLink,
  isInvoicePayable: (invoice: { status?: string | null }) => !["paid", "cancelled"].includes(String(invoice.status || "")),
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
        const filters: Record<string, any> = {};
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn(function eq(this: any, key: string, value: any) {
            filters[key] = value;
            return this;
          }),
          not: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(async function maybeSingle() {
            const account = mocks.state.accounts.find((item) => {
              if (filters.organization_id && item.organization_id !== filters.organization_id) return false;
              if (filters.provider && item.provider !== filters.provider) return false;
              if (filters.external_user_id && item.external_user_id !== filters.external_user_id) return false;
              if (filters.is_verified !== undefined && item.is_verified !== filters.is_verified) return false;
              return item.guardian_id;
            });
            return { data: account || null, error: null };
          }),
          upsert: vi.fn(async (row: any) => {
            mocks.state.upserts.push(row);
            return { error: mocks.state.upsertError };
          }),
        };
      }
      if (table === "invoices") {
        const filters: Record<string, any> = {};
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn(function eq(this: any, key: string, value: any) {
            filters[key] = value;
            return this;
          }),
          then(resolve: any) {
            const data = mocks.state.invoices.filter((invoice) => {
              if (filters.organization_id && invoice.organization_id !== filters.organization_id) return false;
              if (filters.guardian_id && invoice.guardian_id !== filters.guardian_id) return false;
              return true;
            });
            return Promise.resolve({ data, error: mocks.state.invoicesError }).then(resolve);
          },
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
  mocks.state.accounts = [];
  mocks.state.invoices = [];
  mocks.state.invoicesError = null;
  mocks.state.upsertError = null;
  mocks.state.upserts = [];
  mocks.createOrReuseInvoicePaymentLink.mockImplementation(async (invoiceId: string) => ({
    invoiceId,
    organizationId: "org-1",
    guardianId: "guardian-1",
    publicId: `public-${invoiceId}`,
    tokenHash: `hash-${invoiceId}`,
    payUrl: `https://xn--48-9kc0bsblm.xn--p1ai/pay/public-${invoiceId}`,
    reused: true,
  }));
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
        text: "Готово! MAX привязан к личному кабинету Робокс.",
        inlineKeyboardButtons: expect.arrayContaining([
          [expect.objectContaining({ type: "message", text: "Мои счета", payload: "Мои счета" })],
        ]),
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
        text: "Готово! MAX привязан к личному кабинету Робокс.",
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
        text: "Готово! MAX привязан к личному кабинету Робокс.",
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

  it("sends menu on bot_started for an already verified MAX account", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    mocks.state.accounts = [{ organization_id: "org-1", provider: "max", external_user_id: "456", guardian_id: "guardian-1", is_verified: true }];

    const response = await postWebhook({
      update_type: "bot_started",
      chat_id: 123,
      user: { user_id: 456 },
    });

    expect(response.status).toBe(200);
    expect(mocks.sendMaxMessage).toHaveBeenCalledWith(
      "max-test-token",
      expect.objectContaining({
        userId: "456",
        chatId: "123",
        text: "Готово! MAX привязан к личному кабинету Робокс.",
        inlineKeyboardButtons: expect.arrayContaining([
          [expect.objectContaining({ type: "message", text: "Мои счета", payload: "Мои счета" })],
          [expect.objectContaining({ type: "link", text: "Личный кабинет", url: "https://xn--48-9kc0bsblm.xn--p1ai/parent" })],
          [expect.objectContaining({ type: "message", text: "Помощь", payload: "Помощь" })],
        ]),
      }),
    );
  });

  it("requests contact on bot_started for an unverified MAX account", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const response = await postWebhook({
      update_type: "bot_started",
      chat_id: 123,
      user: { user_id: 456 },
    });

    expect(response.status).toBe(200);
    expect(mocks.sendMaxMessage).toHaveBeenCalledWith(
      "max-test-token",
      expect.objectContaining({
        userId: "456",
        chatId: "123",
        text: "request contact",
        attachments: [],
      }),
    );
  });

  it("serves bills only for the guardian linked by external_user_id and skips paid or cancelled invoices", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    mocks.state.accounts = [{ organization_id: "org-1", provider: "max", external_user_id: "456", guardian_id: "guardian-1", is_verified: true }];
    mocks.state.invoices = [
      { id: "paid", organization_id: "org-1", guardian_id: "guardian-1", title: "Paid", amount: 1000, status: "paid", due_date: "2026-07-01", created_at: "2026-07-01T00:00:00Z" },
      { id: "cancelled", organization_id: "org-1", guardian_id: "guardian-1", title: "Cancelled", amount: 1000, status: "cancelled", due_date: "2026-07-01", created_at: "2026-07-01T00:00:00Z" },
      { id: "other", organization_id: "org-1", guardian_id: "guardian-2", title: "Other", amount: 9999, status: "issued", due_date: "2026-07-01", created_at: "2026-07-01T00:00:00Z" },
      { id: "open", organization_id: "org-1", guardian_id: "guardian-1", title: "July", amount: 3500, status: "issued", due_date: "2026-07-20", created_at: "2026-07-02T00:00:00Z" },
    ];

    const response = await postWebhook({
      update_type: "message_created",
      chat_id: 123,
      message: {
        sender: { user_id: 456 },
        recipient: { chat_id: 123 },
        body: { text: "Мои счета" },
      },
    });

    expect(response.status).toBe(200);
    expect(mocks.createOrReuseInvoicePaymentLink).toHaveBeenCalledTimes(1);
    expect(mocks.createOrReuseInvoicePaymentLink).toHaveBeenCalledWith("open", { origin: "https://xn--48-9kc0bsblm.xn--p1ai" });
    expect(mocks.createOrReuseInvoicePaymentLink).not.toHaveBeenCalledWith("paid", expect.anything());
    expect(mocks.createOrReuseInvoicePaymentLink).not.toHaveBeenCalledWith("cancelled", expect.anything());
    expect(mocks.createOrReuseInvoicePaymentLink).not.toHaveBeenCalledWith("other", expect.anything());
    expect(mocks.sendMaxMessage).toHaveBeenCalledWith(
      "max-test-token",
      expect.objectContaining({
        text: expect.stringContaining("July"),
        inlineKeyboardButtons: expect.arrayContaining([
          [expect.objectContaining({ type: "link", text: "Оплатить 3 500 ₽", url: "https://xn--48-9kc0bsblm.xn--p1ai/pay/public-open" })],
        ]),
      }),
    );
    const logs = JSON.stringify(infoSpy.mock.calls);
    expect(logs).toContain("\"action\":\"bills\"");
    expect(logs).toContain("\"accountLinked\":true");
    expect(logs).toContain("\"invoiceCount\":1");
    expect(logs).not.toContain("max-test-token");
    expect(logs).not.toContain("79990000000");
    expect(logs).not.toContain("BEGIN:VCARD");
    expect(logs).not.toContain("/pay/public-open");
  });

  it("reuses stable payment links on repeated bill requests", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    mocks.state.accounts = [{ organization_id: "org-1", provider: "max", external_user_id: "456", guardian_id: "guardian-1", is_verified: true }];
    mocks.state.invoices = [
      { id: "open", organization_id: "org-1", guardian_id: "guardian-1", title: "July", amount: 3500, status: "issued", due_date: "2026-07-20", created_at: "2026-07-02T00:00:00Z" },
    ];
    mocks.createOrReuseInvoicePaymentLink.mockResolvedValue({
      invoiceId: "open",
      organizationId: "org-1",
      guardianId: "guardian-1",
      publicId: "stable-public-id",
      tokenHash: "stable-hash",
      payUrl: "https://xn--48-9kc0bsblm.xn--p1ai/pay/stable-public-id",
      reused: true,
    });

    const update = {
      update_type: "message_created",
      chat_id: 123,
      message: {
        sender: { user_id: 456 },
        recipient: { chat_id: 123 },
        body: { text: "/bills" },
      },
    };

    await postWebhook(update);
    await postWebhook(update);

    expect(mocks.createOrReuseInvoicePaymentLink).toHaveBeenCalledTimes(2);
    expect(mocks.sendMaxMessage).toHaveBeenCalledWith(
      "max-test-token",
      expect.objectContaining({
        inlineKeyboardButtons: expect.arrayContaining([
          [expect.objectContaining({ url: "https://xn--48-9kc0bsblm.xn--p1ai/pay/stable-public-id" })],
        ]),
      }),
    );
  });

  it("returns a clear message when there are no active bills", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    mocks.state.accounts = [{ organization_id: "org-1", provider: "max", external_user_id: "456", guardian_id: "guardian-1", is_verified: true }];
    mocks.state.invoices = [
      { id: "paid", organization_id: "org-1", guardian_id: "guardian-1", title: "Paid", amount: 1000, status: "paid" },
    ];

    const response = await postWebhook({
      update_type: "message_created",
      chat_id: 123,
      message: {
        sender: { user_id: 456 },
        recipient: { chat_id: 123 },
        body: { text: "оплатить" },
      },
    });

    expect(response.status).toBe(200);
    expect(mocks.createOrReuseInvoicePaymentLink).not.toHaveBeenCalled();
    expect(mocks.sendMaxMessage).toHaveBeenCalledWith(
      "max-test-token",
      expect.objectContaining({
        text: "Активных счетов нет. Все платежи оплачены или ещё не выставлены.",
      }),
    );
  });

  it("answers help command with self-service instructions", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    mocks.state.accounts = [{ organization_id: "org-1", provider: "max", external_user_id: "456", guardian_id: "guardian-1", is_verified: true }];

    await postWebhook({
      update_type: "message_created",
      chat_id: 123,
      message: {
        sender: { user_id: 456 },
        recipient: { chat_id: 123 },
        body: { text: "Помощь" },
      },
    });

    expect(mocks.sendMaxMessage).toHaveBeenCalledWith(
      "max-test-token",
      expect.objectContaining({
        text: "Через бот Робокс можно:\n• проверить текущие счета;\n• перейти к оплате;\n• открыть личный кабинет.\n\nПо вопросам напишите администратору школы.",
      }),
    );
  });

  it("does not let one MAX user read another guardian's bills", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    mocks.state.accounts = [{ organization_id: "org-1", provider: "max", external_user_id: "999", guardian_id: "guardian-2", is_verified: true }];
    mocks.state.invoices = [
      { id: "other", organization_id: "org-1", guardian_id: "guardian-2", title: "Other", amount: 9999, status: "issued" },
    ];

    const response = await postWebhook({
      update_type: "message_created",
      chat_id: 123,
      message: {
        sender: { user_id: 456 },
        recipient: { chat_id: 123 },
        body: { text: "счета" },
      },
    });

    expect(response.status).toBe(200);
    expect(mocks.createOrReuseInvoicePaymentLink).not.toHaveBeenCalled();
    expect(mocks.sendMaxMessage).toHaveBeenCalledWith(
      "max-test-token",
      expect.objectContaining({
        text: "request contact",
      }),
    );
  });
});
