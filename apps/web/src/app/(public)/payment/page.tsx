import type { Metadata } from "next";
import { LegalPageShell, DynamicLegalSections } from "../LegalPageShell";
import { getDynamicPageBlock } from "../legal-data";
import { getLegalPageDefault } from "@/shared/utils/legal-page-defaults";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Условия оплаты | Робокс Липецк",
  description: "Условия оплаты услуг школы робототехники и программирования Робокс банковской картой.",
};

export default async function PaymentPage() {
  const fallback = getLegalPageDefault("legal.page.payment");
  const pageBlock = await getDynamicPageBlock(
    fallback.key,
    fallback.title,
    fallback.subtitle,
    fallback.body
  );

  return (
    <LegalPageShell
      title={pageBlock.title}
      lead={pageBlock.subtitle}
    >
      <DynamicLegalSections bodyText={pageBlock.body} />
    </LegalPageShell>
  );
}
