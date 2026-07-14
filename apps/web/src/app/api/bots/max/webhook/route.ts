import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildRequestContactMessage, sendMaxMessage } from "@/lib/bots/max/client";
import {
  findGuardianByVerifiedPhone,
  normalizeMaxVcfInfo,
  normalizeRuPhone,
  parsePhoneFromMaxVcf,
  verifyMaxContactHash,
} from "@/lib/bots/max/utils";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";

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

  await sendMaxMessage(settings.bot_token_secret, { userId: externalUserId, chatId, text: "Готово! MAX привязан к личному кабинету Робокс. Теперь сюда можно получать счета на оплату." });
}

async function handleBotStarted(settings: any, update: any) {
  const userId = pickUserId(update);
  const chatId = pickChatId(update);
  if (!userId && !chatId) return;
  const message = buildRequestContactMessage();
  await sendMaxMessage(settings.bot_token_secret, { userId, chatId, text: message.text, attachments: message.attachments });
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
      await handleBotStarted(settings, update);
    } else if (updateType === "message_created") {
      await handleContact(admin, settings, update, requestId, updateType);
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
