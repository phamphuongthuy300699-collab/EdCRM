import { NextRequest, NextResponse } from "next/server";
import { buildRequestContactMessage, sendMaxMessage } from "@/lib/bots/max/client";
import { normalizeRuPhone, verifyMaxContactHash } from "@/lib/bots/max/utils";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";

function pickUserId(update: any) {
  return String(update?.user?.user_id || update?.user?.id || update?.message?.sender?.user_id || update?.message?.sender?.id || update?.sender?.user_id || update?.sender?.id || "");
}

function pickChatId(update: any) {
  return String(update?.chat?.chat_id || update?.chat?.id || update?.message?.chat?.chat_id || update?.message?.chat?.id || "");
}

function pickContact(update: any) {
  const attachments = update?.message?.attachments || update?.attachments || [];
  return attachments.find((item: any) => item?.type === "contact" || item?.payload?.type === "contact")?.payload || update?.message?.contact || null;
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

async function handleContact(admin: ReturnType<typeof createSupabaseAdminClient>, settings: any, update: any) {
  const contact = pickContact(update);
  const externalUserId = pickUserId(update);
  const chatId = pickChatId(update);
  if (!contact || !externalUserId) return;

  const vcfInfo = contact.vcf_info || contact.vcfInfo || contact.vcard || "";
  const contactHash = contact.hash || contact.contact_hash || "";
  if (!vcfInfo || !contactHash || !verifyMaxContactHash(settings.bot_token_secret, vcfInfo, contactHash)) {
    await sendMaxMessage(settings.bot_token_secret, { userId: externalUserId, chatId, text: "Не удалось проверить контакт. Отправьте телефон через кнопку ещё раз." });
    return;
  }

  const phone = normalizeRuPhone(contact.phone || contact.phone_number || contact.phoneNumber || "");
  const { data: guardian } = await (admin.from("guardians") as any)
    .select("id, full_name, phone")
    .eq("organization_id", settings.organization_id)
    .or(`phone.eq.${phone},phone.eq.${phone.replace("+7", "8")}`)
    .maybeSingle();

  if (!guardian) {
    await sendMaxMessage(settings.bot_token_secret, { userId: externalUserId, chatId, text: "Этот номер не найден в базе Робокс. Напишите администратору школы." });
    return;
  }

  await (admin.from("guardian_messenger_accounts") as any).upsert(
    {
      organization_id: settings.organization_id,
      guardian_id: guardian.id,
      provider: "max",
      external_user_id: externalUserId,
      chat_id: chatId || null,
      phone_normalized: phone,
      display_name: contact.name || guardian.full_name || null,
      is_verified: true,
      verified_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      metadata: { source: "max_contact" },
    },
    { onConflict: "organization_id,provider,external_user_id" },
  );

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
    if (updateType === "bot_started") {
      await handleBotStarted(settings, update);
    } else if (updateType === "message_created") {
      await handleContact(admin, settings, update);
    }
  } catch (error) {
    console.error("[MAX webhook] update processing failed", error instanceof Error ? error.message : "unknown");
  }

  return NextResponse.json({ ok: true });
}
