import React from "react";
import Link from "next/link";
import Script from "next/script";
import { Button } from "@robotics-crm/ui";
import { Phone } from "lucide-react";
import { getMediaUrl } from "@/shared/utils/media";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import Header from "./Header";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ymId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  let phone = "+7 994 777-48-48";
  let email = "robokslip48@mail.ru";
  let shortLegalName = "ИП Юлдашев Рустам Хакимович";
  let fullLegalName = "Юлдашев Рустам Хакимович (ИП)";
  let inn = "482426310695";
  let legalAddress = "398057, Россия, Липецкая область, Липецк, ул. Артемова, 5а, 126";
  let bankName = 'АО "АЛЬФА-БАНК"';
  let account = "40802810102930009628";
  let bik = "044525593";
  let corrAccount = "30101810200000000593";
  
  let showLegalName = true;
  let showInn = true;
  let showBankRequisites = false;
  let showBranchAddresses = true;
  let showLegalAddress = false;
  let copyrightText = "© {year} Робокс Липецк. Все права защищены.";
  let socials = { vk: "", telegram: "", whatsapp: "" };
  let branches: any[] = [];
  let mapImage = "";

  let brandName = "Робокс";
  let brandLogo = "branding/roboks-logo.svg";
  let logoAlt = "Робокс — школа робототехники и программирования в Липецке";
  let logoDisplay = "full";

  try {
    const supabase = createSupabaseAdminClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("id, phone, email, short_legal_name, full_legal_name, inn, legal_address, bank_name, account_number, bik, correspondent_account")
      .eq("slug", "robotics-lipetsk")
      .single();

    if (org) {
      if (org.phone) phone = org.phone;
      if (org.email) email = org.email;
      if (org.short_legal_name) shortLegalName = org.short_legal_name;
      if (org.full_legal_name) fullLegalName = org.full_legal_name;
      if (org.inn) inn = org.inn;
      if (org.legal_address) legalAddress = org.legal_address;
      if (org.bank_name) bankName = org.bank_name;
      if (org.account_number) account = org.account_number;
      if (org.bik) bik = org.bik;
      if (org.correspondent_account) corrAccount = org.correspondent_account;

      // Load footer settings
      const { data: fBlock } = await (supabase.from("site_content_blocks") as any)
        .select("*")
        .eq("organization_id", org.id)
        .eq("block_key", "site.footer")
        .maybeSingle();

      if (fBlock?.content) {
        const c = fBlock.content;
        if (c.showLegalName !== undefined) showLegalName = c.showLegalName;
        if (c.showInn !== undefined) showInn = c.showInn;
        if (c.showBankRequisites !== undefined) showBankRequisites = c.showBankRequisites;
        if (c.showBranchAddresses !== undefined) showBranchAddresses = c.showBranchAddresses;
        if (c.showLegalAddress !== undefined) showLegalAddress = c.showLegalAddress;
        if (c.copyrightText) copyrightText = c.copyrightText;
        if (c.socials) socials = { ...socials, ...c.socials };
        if (c.mapImage) mapImage = c.mapImage;
      }

      // Load branding settings
      const { data: brandingBlock } = await (supabase.from("site_content_blocks") as any)
        .select("*")
        .eq("organization_id", org.id)
        .eq("block_key", "site.branding")
        .maybeSingle();

      if (brandingBlock?.content) {
        const c = brandingBlock.content;
        if (brandingBlock.title) brandName = brandingBlock.title;
        if (c.logo) brandLogo = c.logo;
        if (c.logoAlt) logoAlt = c.logoAlt;
        if (c.logoDisplay) logoDisplay = c.logoDisplay;
      }

      // Load branches
      const { data: branchesData } = await (supabase.from("branches") as any)
        .select("name, address")
        .eq("organization_id", org.id)
        .eq("is_active", true)
        .eq("show_on_site", true)
        .order("sort_order", { ascending: true });
      if (branchesData) {
        branches = branchesData;
      }
    }
  } catch (e) {
    console.error("Error loading layout data:", e);
  }

  const ymScript = ymId ? `
    (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
    (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

    ym(${ymId}, "init", {
         clickmap:true,
         trackLinks:true,
         accurateTrackBounce:true,
         webvisor:true
    });
  ` : "";

  const gaScript = gaId ? `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${gaId}');
  ` : "";

  const resolvedCopyright = copyrightText.replace("{year}", new Date().getFullYear().toString());

  return (
    <>
      {ymId && (
        <Script id="yandex-metrika" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: ymScript }} />
      )}
      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="google-analytics" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: gaScript }} />
        </>
      )}
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Header */}
      <Header
        brandName={brandName}
        brandLogo={brandLogo}
        logoAlt={logoAlt}
        logoDisplay={logoDisplay}
        phone={phone}
      />

      {/* Main Content */}
      <main style={{ flex: 1, background: "#FFFFFF" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        background: "var(--color-text)",
        color: "white",
        padding: "64px 0 32px 0",
        borderTop: "1px solid var(--color-border)"
      }}>
        <div className="container">
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "48px",
            marginBottom: "48px"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <img 
                  src={getMediaUrl(brandLogo)} 
                  alt={logoAlt || brandName} 
                  style={{ height: "32px", width: "auto" }}
                />
                <span style={{ fontWeight: 800, fontFamily: "var(--font-geologica)", fontSize: "1.2rem" }}>
                  {brandName}
                </span>
              </div>
              <p style={{ color: "#9CA3AF", fontSize: "var(--font-small)", maxWidth: "250px" }}>
                Современная школа инженерного мышления и робототехники для детей 6–14 лет в Липецке.
              </p>
              
              {/* Social links */}
              {(socials.vk || socials.telegram || socials.whatsapp) && (
                <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                  {socials.vk && (
                    <a href={socials.vk} target="_blank" rel="noopener noreferrer" style={{ color: "#9CA3AF", fontSize: "12px", textDecoration: "underline" }}>ВКонтакте</a>
                  )}
                  {socials.telegram && (
                    <a href={socials.telegram} target="_blank" rel="noopener noreferrer" style={{ color: "#9CA3AF", fontSize: "12px", textDecoration: "underline" }}>Telegram</a>
                  )}
                  {socials.whatsapp && (
                    <a href={socials.whatsapp} target="_blank" rel="noopener noreferrer" style={{ color: "#9CA3AF", fontSize: "12px", textDecoration: "underline" }}>WhatsApp</a>
                  )}
                </div>
              )}
            </div>
            
            <div>
              <h4 style={{ marginBottom: "16px", fontSize: "var(--font-small)", textTransform: "uppercase", letterSpacing: "0.05em", color: "#9CA3AF" }}>Навигация</h4>
              <ul style={{ listStyle: "none", display: "grid", gap: "12px", fontSize: "var(--font-small)" }}>
                <li><Link href="/robototekhnika-dlya-detey-lipetsk" style={{ color: "#E5E7EB" }}>Робототехника</Link></li>
                <li><Link href="/programmirovanie-dlya-detey-lipetsk" style={{ color: "#E5E7EB" }}>Программирование</Link></li>
                <li><Link href="/raspisanie" style={{ color: "#E5E7EB" }}>Расписание</Link></li>
                <li><Link href="/stoimost" style={{ color: "#E5E7EB" }}>Стоимость</Link></li>
                <li><Link href="/teachers" style={{ color: "#E5E7EB" }}>Преподаватели</Link></li>
              </ul>
            </div>

            <div>
              <h4 style={{ marginBottom: "16px", fontSize: "var(--font-small)", textTransform: "uppercase", letterSpacing: "0.05em", color: "#9CA3AF" }}>Документы</h4>
              <ul style={{ listStyle: "none", display: "grid", gap: "12px", fontSize: "var(--font-small)" }}>
                <li><Link href="/contacts" style={{ color: "#E5E7EB" }}>Контакты</Link></li>
                <li><Link href="/legal" style={{ color: "#E5E7EB" }}>Реквизиты</Link></li>
                <li><Link href="/privacy" style={{ color: "#E5E7EB" }}>Политика обработки данных</Link></li>
                <li><Link href="/offer" style={{ color: "#E5E7EB" }}>Публичная оферта</Link></li>
                <li><Link href="/payment" style={{ color: "#E5E7EB" }}>Условия оплаты</Link></li>
                <li><Link href="/refund" style={{ color: "#E5E7EB" }}>Условия возврата</Link></li>
                <li><Link href="/privacy-policy" style={{ color: "#E5E7EB" }}>Конфиденциальность</Link></li>
                <li><Link href="/consent" style={{ color: "#E5E7EB" }}>Согласие на ОПД</Link></li>
              </ul>
            </div>

            <div>
              <h4 style={{ marginBottom: "16px", fontSize: "var(--font-small)", textTransform: "uppercase", letterSpacing: "0.05em", color: "#9CA3AF" }}>Контакты</h4>
              {showLegalName && (
                <p style={{ color: "#E5E7EB", fontSize: "var(--font-small)", marginBottom: "4px", fontWeight: 700 }}>
                  {shortLegalName || fullLegalName}
                </p>
              )}
              {showInn && (
                <p style={{ color: "#9CA3AF", fontSize: "var(--font-xs)", marginBottom: "12px" }}>
                  ИНН: {inn}
                </p>
              )}
              
              {showBranchAddresses && branches.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <span style={{ fontSize: "var(--font-xs)", color: "#9CA3AF", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Филиалы:</span>
                  {branches.map((b, idx) => (
                    <p key={idx} style={{ color: "#E5E7EB", fontSize: "var(--font-small)", margin: "0 0 4px 0" }}>
                      {b.address}
                    </p>
                  ))}
                </div>
              )}

              {showLegalAddress && (
                <p style={{ color: "#E5E7EB", fontSize: "var(--font-small)", marginBottom: "12px", fontStyle: "italic" }}>
                  Юр. адрес: {legalAddress}
                </p>
              )}

              {showBankRequisites && (
                <div style={{ color: "#9CA3AF", fontSize: "var(--font-xs)", marginBottom: "12px", borderTop: "1px solid #374151", paddingTop: "8px" }}>
                  <p style={{ margin: "0 0 2px 0" }}>Банк: {bankName}</p>
                  <p style={{ margin: "0 0 2px 0" }}>Р/с: {account}</p>
                  <p style={{ margin: "0" }}>БИК: {bik}</p>
                </div>
              )}

              <p style={{ color: "#E5E7EB", fontSize: "var(--font-small)", marginBottom: "8px", fontWeight: 700 }}>
                {phone}
              </p>
              <p style={{ color: "#E5E7EB", fontSize: "var(--font-small)" }}>
                {email}
              </p>
              {mapImage && (
                <div style={{ marginTop: "16px", borderRadius: "8px", overflow: "hidden", border: "1px solid #374151", maxWidth: "300px" }}>
                  <img src={getMediaUrl(mapImage)} alt="Схема проезда" style={{ width: "100%", height: "auto", display: "block" }} />
                </div>
              )}
            </div>
          </div>

          <div style={{
            borderTop: "1px solid #374151",
            paddingTop: "32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "var(--font-xs)",
            color: "#9CA3AF"
          }}>
            <span>{resolvedCopyright}</span>
            <Link href="/login" style={{ color: "#6B7280", textDecoration: "underline" }} className="hover-link-primary">
              Вход для сотрудников
            </Link>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
