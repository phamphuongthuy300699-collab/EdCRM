import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOrReuseInvoicePaymentLink } from "@/lib/payments/invoice-payment-links";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";

const bodySchema = z.object({
  invoiceId: z.string().uuid(),
  regenerate: z.boolean().optional(),
});

const financeRoles = new Set(["owner", "admin", "manager", "accountant"]);

function jsonError(message: string, status = 400, code = "INVOICE_PAYMENT_LINK_ERROR") {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Некорректный invoiceId", 422, "INVALID_INVOICE_ID");

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonError("Необходима авторизация", 401, "UNAUTHORIZED");

    const admin = createSupabaseAdminClient();
    const { data: invoice, error: invoiceError } = await (admin.from("invoices") as any)
      .select("id, organization_id, guardian_id, status, title, amount")
      .eq("id", parsed.data.invoiceId)
      .maybeSingle();

    if (invoiceError || !invoice) return jsonError("Счет не найден", 404, "INVOICE_NOT_FOUND");

    const { data: membership } = await (admin.from("org_memberships") as any)
      .select("role")
      .eq("organization_id", invoice.organization_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!membership?.role || !financeRoles.has(membership.role)) {
      return jsonError("Недостаточно прав для выставления счета", 403, "FORBIDDEN");
    }

    if (["paid", "cancelled"].includes(invoice.status)) {
      return jsonError("Оплаченный или отмененный счет нельзя выставить повторно", 409, "INVOICE_NOT_PAYABLE");
    }

    if (invoice.status !== "issued") {
      const { error: updateError } = await (admin.from("invoices") as any)
        .update({ status: "issued", issued_at: new Date().toISOString() })
        .eq("id", invoice.id);
      if (updateError) return jsonError("Не удалось выставить счет", 500, "INVOICE_ISSUE_FAILED");
    }

    const link = await createOrReuseInvoicePaymentLink(invoice.id, {
      origin: request.nextUrl.origin,
      regenerate: parsed.data.regenerate === true,
      metadata: { source: "crm_publish_action", actorId: user.id },
    });

    const message = `Робокс: выставлен счёт ${invoice.title} на сумму ${Number(invoice.amount).toLocaleString("ru-RU")} ₽. Оплатить: ${link.payUrl}`;

    await (admin.from("notification_outbox") as any).insert({
      organization_id: invoice.organization_id,
      guardian_id: invoice.guardian_id || null,
      invoice_id: invoice.id,
      channel: "manual",
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

    return NextResponse.json({
      ok: true,
      invoiceId: invoice.id,
      guardianId: invoice.guardian_id || null,
      payUrl: link.payUrl,
      publicId: link.publicId,
      reused: link.reused,
      regenerated: parsed.data.regenerate === true,
      message,
    });
  } catch (error: any) {
    return jsonError(error.message || "Не удалось создать ссылку для родителя", 500);
  }
}
