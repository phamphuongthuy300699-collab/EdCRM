import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { createOrReuseInvoicePaymentLink } from "./invoice-payment-links";

export type PublishInvoiceResult = {
  invoiceId: string;
  guardianId: string | null;
  payUrl: string;
  publicId: string;
  reused: boolean;
  channel: "max" | "manual";
  maxLinked: boolean;
  message: string;
};

export async function publishInvoiceForParent(input: {
  invoiceId: string;
  origin?: string | null;
  regenerate?: boolean;
  actorId?: string | null;
  source: string;
}): Promise<PublishInvoiceResult> {
  const admin = createSupabaseAdminClient();
  const { data: invoice, error: invoiceError } = await (admin.from("invoices") as any)
    .select("id, organization_id, guardian_id, status, title, amount")
    .eq("id", input.invoiceId)
    .maybeSingle();

  if (invoiceError || !invoice) throw new Error("Счет не найден");
  if (["paid", "cancelled"].includes(invoice.status)) {
    throw new Error("Оплаченный или отмененный счет нельзя выставить повторно");
  }

  if (invoice.status !== "issued") {
    const { error: updateError } = await (admin.from("invoices") as any)
      .update({ status: "issued", issued_at: new Date().toISOString() })
      .eq("id", invoice.id);
    if (updateError) throw new Error("Не удалось выставить счет");
  }

  const link = await createOrReuseInvoicePaymentLink(invoice.id, {
    origin: input.origin,
    regenerate: input.regenerate === true,
    metadata: { source: input.source, actorId: input.actorId || null },
  });

  const { data: maxSettings } = await (admin.from("bot_settings") as any)
    .select("is_enabled")
    .eq("organization_id", invoice.organization_id)
    .eq("provider", "max")
    .maybeSingle();
  const { data: maxAccount } = invoice.guardian_id
    ? await (admin.from("guardian_messenger_accounts") as any)
      .select("id")
      .eq("organization_id", invoice.organization_id)
      .eq("guardian_id", invoice.guardian_id)
      .eq("provider", "max")
      .eq("is_verified", true)
      .maybeSingle()
    : { data: null };
  const channel: "max" | "manual" = maxSettings?.is_enabled && maxAccount ? "max" : "manual";

  await (admin.from("notification_outbox") as any).insert({
    organization_id: invoice.organization_id,
    guardian_id: invoice.guardian_id || null,
    invoice_id: invoice.id,
    channel,
    destination: null,
    template_key: "invoice_payment_link",
    payload: {
      invoiceId: invoice.id,
      payUrl: link.payUrl,
      publicId: link.publicId,
      amount: Number(invoice.amount),
      title: invoice.title,
    },
  });

  return {
    invoiceId: invoice.id,
    guardianId: invoice.guardian_id || null,
    payUrl: link.payUrl,
    publicId: link.publicId,
    reused: link.reused,
    channel,
    maxLinked: channel === "max",
    message: `Робокс: выставлен счёт ${invoice.title} на сумму ${Number(invoice.amount).toLocaleString("ru-RU")} ₽. Оплатить: ${link.payUrl}`,
  };
}
