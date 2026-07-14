import crypto from "node:crypto";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";

export type InvoicePaymentLinkResult = {
  invoiceId: string;
  organizationId: string;
  guardianId: string | null;
  publicId: string;
  tokenHash: string;
  payUrl: string;
  reused: boolean;
};

export type VerifiedInvoicePaymentToken = {
  link: any;
  invoice: any;
};

export function hashInvoicePaymentToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function newPublicPaymentLinkId() {
  return `pl_${crypto.randomBytes(24).toString("base64url")}`;
}

export function buildPublicPayUrl(publicId: string, origin?: string | null) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim() || origin || "";
  if (!configuredOrigin) return `/pay/${publicId}`;
  return new URL(`/pay/${publicId}`, configuredOrigin).toString();
}

export function isInvoicePayable(invoice: { status?: string | null }) {
  return !["paid", "cancelled"].includes(String(invoice.status || ""));
}

async function loadInvoice(admin: ReturnType<typeof createSupabaseAdminClient>, invoiceId: string) {
  const { data: invoice, error } = await (admin.from("invoices") as any)
    .select("id, organization_id, guardian_id, student_id, title, description, amount, currency, status, due_date, number")
    .eq("id", invoiceId)
    .maybeSingle();

  if (error || !invoice) {
    throw new Error("Счет не найден");
  }

  return invoice;
}

export async function createOrReuseInvoicePaymentLink(
  invoiceId: string,
  input: { origin?: string | null; expiresAt?: string | null; metadata?: Record<string, any>; regenerate?: boolean } = {},
): Promise<InvoicePaymentLinkResult> {
  const admin = createSupabaseAdminClient();
  const invoice = await loadInvoice(admin, invoiceId);

  if (!isInvoicePayable(invoice)) {
    throw new Error("Нельзя выставить ссылку для оплаченного или отмененного счета");
  }

  const { data: existing } = await (admin.from("invoice_payment_links") as any)
    .select("id, public_id, token_hash, status, expires_at")
    .eq("invoice_id", invoice.id)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing?.id && existing.public_id && !input.regenerate) {
    return {
      invoiceId: invoice.id,
      organizationId: invoice.organization_id,
      guardianId: invoice.guardian_id || null,
      publicId: existing.public_id,
      tokenHash: existing.token_hash,
      payUrl: buildPublicPayUrl(existing.public_id, input.origin),
      reused: true,
    };
  }

  if (existing?.id && !input.regenerate) {
    const publicId = newPublicPaymentLinkId();
    const tokenHash = existing.token_hash || hashInvoicePaymentToken(publicId);
    const { error: updateError } = await (admin.from("invoice_payment_links") as any)
      .update({ public_id: publicId, token_hash: tokenHash, updated_at: now })
      .eq("id", existing.id);
    if (updateError) throw new Error(updateError.message || "Не удалось обновить публичную ссылку");

    return {
      invoiceId: invoice.id,
      organizationId: invoice.organization_id,
      guardianId: invoice.guardian_id || null,
      publicId,
      tokenHash,
      payUrl: buildPublicPayUrl(publicId, input.origin),
      reused: true,
    };
  }

  if (existing?.id && input.regenerate) {
    await (admin.from("invoice_payment_links") as any)
      .update({ status: "inactive", updated_at: now })
      .eq("id", existing.id);
  }

  const publicId = newPublicPaymentLinkId();
  const tokenHash = hashInvoicePaymentToken(publicId);
  const { data: link, error: insertError } = await (admin.from("invoice_payment_links") as any)
    .insert({
      organization_id: invoice.organization_id,
      invoice_id: invoice.id,
      guardian_id: invoice.guardian_id || null,
      public_id: publicId,
      token_hash: tokenHash,
      status: "active",
      expires_at: input.expiresAt || null,
      metadata: {
        ...(input.metadata || {}),
        replacedLinkId: existing?.id || null,
      },
    })
    .select("id")
    .single();

  if (insertError || !link) {
    throw new Error(insertError?.message || "Не удалось создать ссылку на счет");
  }

  return {
    invoiceId: invoice.id,
    organizationId: invoice.organization_id,
    guardianId: invoice.guardian_id || null,
    publicId,
    tokenHash,
    payUrl: buildPublicPayUrl(publicId, input.origin),
    reused: false,
  };
}

export async function verifyInvoicePaymentPublicId(publicId: string): Promise<VerifiedInvoicePaymentToken> {
  const admin = createSupabaseAdminClient();
  const { data: link, error } = await (admin.from("invoice_payment_links") as any)
    .select("id, organization_id, invoice_id, guardian_id, public_id, token_hash, status, expires_at")
    .eq("public_id", publicId)
    .maybeSingle();

  if (error || !link) {
    throw new Error("PAY_LINK_NOT_FOUND");
  }

  if (link.status !== "active") {
    throw new Error("PAY_LINK_INACTIVE");
  }

  if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) {
    await (admin.from("invoice_payment_links") as any)
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", link.id);
    throw new Error("PAY_LINK_EXPIRED");
  }

  const invoice = await loadInvoice(admin, link.invoice_id);
  await (admin.from("invoice_payment_links") as any)
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", link.id);

  return { link, invoice };
}

export async function verifyInvoicePaymentToken(token: string): Promise<VerifiedInvoicePaymentToken> {
  const admin = createSupabaseAdminClient();
  const tokenHash = hashInvoicePaymentToken(token);
  const { data: link, error } = await (admin.from("invoice_payment_links") as any)
    .select("public_id")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !link?.public_id) throw new Error("PAY_LINK_NOT_FOUND");
  return verifyInvoicePaymentPublicId(link.public_id);
}
