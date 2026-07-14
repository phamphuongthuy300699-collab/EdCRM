import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { publishInvoiceForParent } from "@/lib/payments/publish-invoice";
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

    const published = await publishInvoiceForParent({
      invoiceId: invoice.id,
      origin: request.nextUrl.origin,
      regenerate: parsed.data.regenerate === true,
      source: "crm_publish_action",
      actorId: user.id,
    });

    return NextResponse.json({
      ok: true,
      invoiceId: published.invoiceId,
      guardianId: published.guardianId,
      payUrl: published.payUrl,
      publicId: published.publicId,
      reused: published.reused,
      regenerated: parsed.data.regenerate === true,
      channel: published.channel,
      maxLinked: published.maxLinked,
      message: published.message,
    });
  } catch (error: any) {
    return jsonError(error.message || "Не удалось создать ссылку для родителя", 500);
  }
}
