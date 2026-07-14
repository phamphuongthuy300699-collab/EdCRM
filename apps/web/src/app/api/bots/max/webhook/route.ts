import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildRequestContactMessage, sendMaxMessage, type MaxInlineKeyboardButton } from "@/lib/bots/max/client";
import { createOrReuseInvoicePaymentLink, isInvoicePayable } from "@/lib/payments/invoice-payment-links";
import {
  findGuardianByVerifiedPhone,
  normalizeMaxVcfInfo,
  normalizeRuPhone,
  parsePhoneFromMaxVcf,
  verifyMaxContactHash,
} from "@/lib/bots/max/utils";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";

const PUBLIC_APP_URL = "https://xn--48-9kc0bsblm.xn--p1ai";

type MaxWebhookStage =
  | "received"
  | "contact_detected"
  | "hash_verified"
  | "guardian_found"
  | "account_linked"
  | "user_not_found"
  | "invalid_contact"
  | "contact_not_found"
  | "failed";

type MaxWebhookLogContext = {
  requestId: string;
  update: any;
  updateType: string;
  stage: MaxWebhookStage;
  code?: string;
};

type MaxSelfServiceLogContext = {
  requestId: string;
  updateType: string;
  action: "menu" | "bills" | "help" | "contact";
  accountLinked: boolean;
  invoiceCount?: number;
  result: string;
};

class MaxWebhookDbError extends Error {
  code = "MAX_LINK_DB_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "MaxWebhookDbError";
  }
}

function pickUserId(update: any) {
  return String(update?.user?.user_id || update?.user?.id || update?.message?.sender?.user_id || update?.message?.sender?.id || update?.sender?.user_id || update?.sender?.id || "");
}

function pickChatId(update: any) {
  return String(
    update?.chat_id ||
    update?.chat?.chat_id ||
    update?.chat?.id ||
    update?.message?.recipient?.chat_id ||
    update?.message?.chat?.chat_id ||
    update?.message?.chat?.id ||
    "",
  );
}

function pickMessageText(update: any) {
  return String(update?.message?.body?.text || update?.message?.text || "").trim().toLowerCase();
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function pickAttachments(update: any) {
  return [
    ...asArray(update?.message?.body?.attachments),
    ...asArray(update?.message?.attachments),
    ...asArray(update?.attachments),
  ];
}

function pickContact(update: any) {
  const attachments = pickAttachments(update);
  const attachment = attachments.find(
    (item: any) => item?.type === "contact",
  );

  return (
    attachment?.payload ||
    update?.message?.body?.contact ||
    update?.message?.contact ||
    null
  );
}

function logMaxWebhookEvent(context: MaxWebhookLogContext) {
  const contact = pickContact(context.update);
  const logger = context.stage === "failed" ? console.error : console.info;
  logger("[MAX webhook]", {
    scope: "max-webhook",
    requestId: context.requestId,
    updateType: context.updateType,
    hasMessage: Boolean(context.update?.message),
    hasMessageBody: Boolean(context.update?.message?.body),
    attachmentTypes: pickAttachments(context.update)
      .map((item: any) => item?.type)
      .filter((type: unknown): type is string => typeof type === "string"),
    hasUserId: Boolean(pickUserId(context.update)),
    hasChatId: Boolean(pickChatId(context.update)),
    hasContact: Boolean(contact),
    stage: context.stage,
    ...(context.code ? { code: context.code } : {}),
  });
}

function logMaxSelfServiceEvent(context: MaxSelfServiceLogContext) {
  console.info("[MAX self-service]", {
    scope: "max-webhook",
    requestId: context.requestId,
    updateType: context.updateType,
    action: context.action,
    accountLinked: context.accountLinked,
    invoiceCount: context.invoiceCount,
    result: context.result,
  });
}

async function loadSettingsBySecret(secret: string) {
  const admin = createSupabaseAdminClient();
  const { data } = await (admin.from("bot_settings") as any)
    .select("*")
    .eq("provider", "max")
    .eq("webhook_secret", secret)
    .eq("is_enabled", true)
    .maybeSingle();
  return { admin, settings: data };
}

async function loadVerifiedAccount(admin: ReturnType<typeof createSupabaseAdminClient>, organizationId: string, externalUserId: string) {
  if (!externalUserId) return null;
  const { data, error } = await (admin.from("guardian_messenger_accounts") as any)
    .select("organization_id, guardian_id, is_verified")
    .eq("organization_id", organizationId)
    .eq("provider", "max")
    .eq("external_user_id", externalUserId)
    .eq("is_verified", true)
    .not("guardian_id", "is", null)
    .maybeSingle();
  if (error) throw new MaxWebhookDbError("Failed to load MAX account");
  return data?.guardian_id ? data : null;
}

function mainMenuButtons(): MaxInlineKeyboardButton[][] {
  return [
    [{ type: "message", text: "Мои счета", payload: "Мои счета" }],
    [{ type: "link", text: "Личный кабинет", url: `${PUBLIC_APP_URL}/parent` }],
    [{ type: "message", text: "Помощь", payload: "Помощь" }],
  ];
}

async function sendRequestContact(settings: any, update: any, requestId: string, updateType: string, action: MaxSelfServiceLogContext["action"]) {
  const userId = pickUserId(update);
  const chatId = pickChatId(update);
  const message = buildRequestContactMessage();
  await sendMaxMessage(settings.bot_token_secret, { userId, chatId, text: message.text, attachments: message.attachments });
  logMaxSelfServiceEvent({ requestId, updateType, action, accountLinked: false, result: "request_contact_sent" });
}

async function sendMainMenu(admin: ReturnType<typeof createSupabaseAdminClient>, settings: any, update: any, requestId: string, updateType: string) {
  const userId = pickUserId(update);
  const chatId = pickChatId(update);
  const account = await loadVerifiedAccount(admin, settings.organization_id, userId);
  if (!account) {
    await sendRequestContact(settings, update, requestId, updateType, "menu");
    return;
  }
  await sendMaxMessage(settings.bot_token_secret, {
    userId,
    chatId,
    text: "Готово! MAX привязан к личному кабинету Робокс.",
    inlineKeyboardButtons: mainMenuButtons(),
  });
  logMaxSelfServiceEvent({ requestId, updateType, action: "menu", accountLinked: true, result: "menu_sent" });
}

async function sendHelp(admin: ReturnType<typeof createSupabaseAdminClient>, settings: any, update: any, requestId: string, updateType: string) {
  const userId = pickUserId(update);
  const chatId = pickChatId(update);
  const account = await loadVerifiedAccount(admin, settings.organization_id, userId);
  if (!account) {
    await sendRequestContact(settings, update, requestId, updateType, "help");
    return;
  }
  await sendMaxMessage(settings.bot_token_secret, {
    userId,
    chatId,
    text: "Через бот Робокс можно:\n• проверить текущие счета;\n• перейти к оплате;\n• открыть личный кабинет.\n\nПо вопросам напишите администратору школы.",
    inlineKeyboardButtons: mainMenuButtons(),
  });
  logMaxSelfServiceEvent({ requestId, updateType, action: "help", accountLinked: true, result: "help_sent" });
}

function invoiceSortValue(invoice: any) {
  const dueTime = invoice.due_date ? new Date(`${invoice.due_date}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
  const createdTime = invoice.created_at ? new Date(invoice.created_at).getTime() : Number.MAX_SAFE_INTEGER;
  return { overdue: invoice.status === "overdue" ? 0 : 1, dueTime: Number.isFinite(dueTime) ? dueTime : Number.MAX_SAFE_INTEGER, createdTime: Number.isFinite(createdTime) ? createdTime : Number.MAX_SAFE_INTEGER };
}

function formatMoney(value: number | string | null | undefined) {
  return `${Math.round(Number(value || 0)).toLocaleString("ru-RU").replace(/\s/g, " ")} ₽`;
}

function invoiceLine(invoice: any) {
  const title = invoice.title || invoice.number || "Счёт";
  const due = invoice.due_date ? `срок ${invoice.due_date}` : "срок не указан";
  return `• ${title}: ${formatMoney(invoice.amount)} — ${due}, статус ${invoice.status || "issued"}`;
}

async function sendBills(admin: ReturnType<typeof createSupabaseAdminClient>, settings: any, update: any, requestId: string, updateType: string) {
  const userId = pickUserId(update);
  const chatId = pickChatId(update);
  const account = await loadVerifiedAccount(admin, settings.organization_id, userId);
  if (!account) {
    await sendRequestContact(settings, update, requestId, updateType, "bills");
    return;
  }

  const { data: invoices, error } = await (admin.from("invoices") as any)
    .select("id, organization_id, guardian_id, number, title, amount, status, due_date, created_at")
    .eq("organization_id", account.organization_id)
    .eq("guardian_id", account.guardian_id);
  if (error) throw new MaxWebhookDbError("Failed to load invoices");

  const payableInvoices = (invoices || [])
    .filter(isInvoicePayable)
    .sort((left: any, right: any) => {
      const a = invoiceSortValue(left);
      const b = invoiceSortValue(right);
      return a.overdue - b.overdue || a.dueTime - b.dueTime || a.createdTime - b.createdTime;
    })
    .slice(0, 5);

  if (payableInvoices.length === 0) {
    await sendMaxMessage(settings.bot_token_secret, {
      userId,
      chatId,
      text: "Активных счетов нет. Все платежи оплачены или ещё не выставлены.",
      inlineKeyboardButtons: [[{ type: "link", text: "Открыть личный кабинет", url: `${PUBLIC_APP_URL}/parent` }]],
    });
    logMaxSelfServiceEvent({ requestId, updateType, action: "bills", accountLinked: true, invoiceCount: 0, result: "empty" });
    return;
  }

  let links;
  try {
    links = await Promise.all(payableInvoices.map((invoice: any) => createOrReuseInvoicePaymentLink(invoice.id, { origin: PUBLIC_APP_URL })));
  } catch {
    logMaxSelfServiceEvent({ requestId, updateType, action: "bills", accountLinked: true, invoiceCount: payableInvoices.length, result: "failed" });
    throw new MaxWebhookDbError("Failed to create payment links");
  }
  await sendMaxMessage(settings.bot_token_secret, {
    userId,
    chatId,
    text: `Текущие счета:\n${payableInvoices.map(invoiceLine).join("\n")}`,
    inlineKeyboardButtons: [
      ...payableInvoices.map((invoice: any, index: number): MaxInlineKeyboardButton[] => [
        { type: "link", text: `Оплатить ${formatMoney(invoice.amount)}`, url: links[index].payUrl },
      ]),
      [{ type: "link", text: "Открыть личный кабинет", url: `${PUBLIC_APP_URL}/parent` }],
    ],
  });
  logMaxSelfServiceEvent({ requestId, updateType, action: "bills", accountLinked: true, invoiceCount: payableInvoices.length, result: "sent" });
}

function textAction(text: string): "menu" | "bills" | "help" | null {
  if (["мои счета", "счета", "оплатить", "/bills"].includes(text)) return "bills";
  if (["меню", "start"].includes(text)) return "menu";
  if (text === "помощь") return "help";
  return null;
}

async function handleContact(admin: ReturnType<typeof createSupabaseAdminClient>, settings: any, update: any, requestId: string, updateType: string) {
  const contact = pickContact(update);
  const externalUserId = pickUserId(update);
  const chatId = pickChatId(update);
  if (!contact) {
    logMaxWebhookEvent({ requestId, update, updateType, stage: "contact_not_found" });
    return;
  }
  logMaxWebhookEvent({ requestId, update, updateType, stage: "contact_detected" });
  if (!externalUserId) {
    logMaxWebhookEvent({ requestId, update, updateType, stage: "user_not_found" });
    return;
  }

  const contactPayload = contact?.payload || contact;
  const vcfInfo = normalizeMaxVcfInfo(contactPayload.vcf_info || contactPayload.vcfInfo || contactPayload.vcard || "");
  const contactHash = contactPayload.hash || contactPayload.contact_hash || contact.hash || contact.contact_hash || "";
  if (!vcfInfo || !contactHash || !verifyMaxContactHash(settings.bot_token_secret, vcfInfo, contactHash)) {
    logMaxWebhookEvent({ requestId, update, updateType, stage: "invalid_contact" });
    await sendMaxMessage(settings.bot_token_secret, { userId: externalUserId, chatId, text: "Не удалось проверить контакт. Отправьте телефон через кнопку ещё раз." });
    return;
  }
  logMaxWebhookEvent({ requestId, update, updateType, stage: "hash_verified" });

  const fallbackPhone = contactPayload.phone || contactPayload.phone_number || contactPayload.phoneNumber || "";
  const phone = parsePhoneFromMaxVcf(vcfInfo) || (/\d/.test(fallbackPhone) ? normalizeRuPhone(fallbackPhone) : "");
  if (!phone) {
    logMaxWebhookEvent({ requestId, update, updateType, stage: "invalid_contact" });
    await sendMaxMessage(settings.bot_token_secret, { userId: externalUserId, chatId, text: "Не удалось прочитать телефон из контакта MAX. Отправьте контакт через кнопку ещё раз или напишите администратору школы." });
    return;
  }

  const { data: guardians, error: guardiansError } = await (admin.from("guardians") as any)
    .select("id, full_name, phone")
    .eq("organization_id", settings.organization_id);
  if (guardiansError) {
    logMaxWebhookEvent({ requestId, update, updateType, stage: "failed", code: "MAX_LINK_DB_ERROR" });
    throw new MaxWebhookDbError("Failed to load guardians");
  }
  const guardian = findGuardianByVerifiedPhone(guardians, phone);

  if (!guardian) {
    logMaxWebhookEvent({ requestId, update, updateType, stage: "user_not_found" });
    await sendMaxMessage(settings.bot_token_secret, { userId: externalUserId, chatId, text: "Этот номер не найден в базе Робокс. Напишите администратору школы." });
    return;
  }
  logMaxWebhookEvent({ requestId, update, updateType, stage: "guardian_found" });

  const { error: upsertError } = await (admin.from("guardian_messenger_accounts") as any).upsert(
    {
      organization_id: settings.organization_id,
      guardian_id: guardian.id,
      provider: "max",
      external_user_id: externalUserId,
      chat_id: chatId || null,
      phone_normalized: phone,
      display_name: contactPayload.name || guardian.full_name || null,
      is_verified: true,
      verified_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      metadata: { source: "max_contact" },
    },
    { onConflict: "organization_id,provider,external_user_id" },
  );
  if (upsertError) {
    logMaxWebhookEvent({ requestId, update, updateType, stage: "failed", code: "MAX_LINK_DB_ERROR" });
    throw new MaxWebhookDbError("Failed to link guardian messenger account");
  }
  logMaxWebhookEvent({ requestId, update, updateType, stage: "account_linked" });
  logMaxSelfServiceEvent({ requestId, updateType, action: "contact", accountLinked: true, result: "linked" });

  await sendMaxMessage(settings.bot_token_secret, {
    userId: externalUserId,
    chatId,
    text: "Готово! MAX привязан к личному кабинету Робокс.",
    inlineKeyboardButtons: mainMenuButtons(),
  });
}

async function handleBotStarted(admin: ReturnType<typeof createSupabaseAdminClient>, settings: any, update: any, requestId: string, updateType: string) {
  const userId = pickUserId(update);
  const chatId = pickChatId(update);
  if (!userId && !chatId) return;
  await sendMainMenu(admin, settings, update, requestId, updateType);
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const secret = request.headers.get("x-max-bot-api-secret") || "";
  if (!secret) return NextResponse.json({ ok: false }, { status: 401 });

  const { admin, settings } = await loadSettingsBySecret(secret);
  if (!settings?.bot_token_secret) return NextResponse.json({ ok: false }, { status: 401 });

  let update: any;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const updateType = update?.update_type || update?.type || update?.event_type;
    logMaxWebhookEvent({ requestId, update, updateType, stage: "received" });
    if (updateType === "bot_started") {
      await handleBotStarted(admin, settings, update, requestId, updateType);
    } else if (updateType === "message_created") {
      const action = textAction(pickMessageText(update));
      if (action === "bills") {
        await sendBills(admin, settings, update, requestId, updateType);
      } else if (action === "menu") {
        await sendMainMenu(admin, settings, update, requestId, updateType);
      } else if (action === "help") {
        await sendHelp(admin, settings, update, requestId, updateType);
      } else {
        await handleContact(admin, settings, update, requestId, updateType);
      }
    }
  } catch (error) {
    if (error instanceof MaxWebhookDbError) {
      return NextResponse.json({ ok: false, code: error.code, requestId }, { status: 500 });
    }
    const updateType = update?.update_type || update?.type || update?.event_type || "";
    logMaxWebhookEvent({ requestId, update, updateType, stage: "failed" });
  }

  return NextResponse.json({ ok: true });
}
