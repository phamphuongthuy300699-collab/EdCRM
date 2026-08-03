import { buildPublicMetadata } from "@/shared/seo/public-metadata";
import { LegalPageShell, DynamicLegalSections } from "../LegalPageShell";
import { getDynamicPageBlock } from "../legal-data";
import { getLegalPageDefault } from "@/shared/utils/legal-page-defaults";

export const revalidate = 300;

export const metadata = buildPublicMetadata({
  title: "Политика конфиденциальности | Робокс Липецк",
  description: "Политика обработки персональных данных на сайте школы робототехники Робокс.",
  path: "/privacy",
});

export default async function PrivacyPage() {
  const fallback = getLegalPageDefault("legal.page.privacy");
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
