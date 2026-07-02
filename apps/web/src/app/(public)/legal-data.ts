import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";

type SiteBlock = {
  block_key: string;
  title?: string | null;
  subtitle?: string | null;
  content?: Record<string, unknown> | null;
};

export type PublicLegalData = {
  schoolName: string;
  city: string;
  fullName: string;
  legalName: string;
  inn: string;
  ogrn: string;
  legalAddress: string;
  actualAddress: string;
  phone: string;
  email: string;
  workHours: string;
  bankDetails: string;
  branchName: string;
  placeholderNotice: string;
  bankName: string;
  bankInn: string;
  bik: string;
  accountNumber: string;
  correspondentAccount: string;
  bankAddress: string;
  branches: any[];
};

function textValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function getPublicLegalData(): Promise<PublicLegalData> {
  const fallback: PublicLegalData = {
    schoolName: "Робокс",
    city: "Липецк",
    fullName: "Юлдашев Рустам Хакимович (ИП)",
    legalName: "ИП Юлдашев Рустам Хакимович",
    inn: "482426310695",
    ogrn: "не указано / требуется уточнить",
    legalAddress: "398057, Россия, Липецкая область, Липецк, ул. Артемова, 5а, 126",
    actualAddress: "Липецк, ул. Осканова, 3; Липецк, ул. Славянова, 1",
    phone: "+7 994 777-48-48",
    email: "robokslip48@mail.ru",
    workHours: "Понедельник — Суббота: 09:00 - 20:00",
    bankDetails: "Р/с 40802810102930009628 в АО \"АЛЬФА-БАНК\", БИК 044525593, К/с 30101810200000000593",
    branchName: "Филиал на Осканова",
    placeholderNotice: "Официальные реквизиты школы Робокс.",
    bankName: 'АО "АЛЬФА-БАНК"',
    bankInn: "7728168971",
    bik: "044525593",
    accountNumber: "40802810102930009628",
    correspondentAccount: "30101810200000000593",
    bankAddress: "398059, Липецк, ул. Барашева, д. 7",
    branches: []
  };

  try {
    const supabase = createSupabaseAdminClient();
    const { data: org } = await supabase
      .from("organizations")
      .select(`
        id, name, city, phone, email, inn, ogrn,
        short_legal_name, full_legal_name, legal_address,
        bank_name, bank_inn, bik, account_number, correspondent_account, bank_address
      `)
      .eq("slug", "robotics-lipetsk")
      .single();

    if (!org) return fallback;

    const { data: branches } = await (supabase.from("branches") as any)
      .select("name, address, phone, email, work_hours, is_active, show_on_site, sort_order")
      .eq("organization_id", org.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const visibleBranches = (branches || []).filter((b: any) => b.show_on_site !== false);
    const primaryBranch = visibleBranches[0] || branches?.[0];

    const actualAddressStr = visibleBranches.length > 0 
      ? visibleBranches.map((b: any) => b.address).join("; ")
      : fallback.actualAddress;

    const bankDetailsStr = org.account_number 
      ? `Р/с ${org.account_number} в ${org.bank_name || ""}, БИК ${org.bik || ""}, К/с ${org.correspondent_account || ""}`
      : fallback.bankDetails;

    return {
      schoolName: textValue(org.name, fallback.schoolName),
      city: textValue(org.city, fallback.city),
      fullName: textValue(org.full_legal_name, fallback.fullName),
      legalName: textValue(org.short_legal_name, fallback.legalName),
      inn: textValue(org.inn, fallback.inn),
      ogrn: org.ogrn ? org.ogrn : "не указано / требуется уточнить",
      legalAddress: textValue(org.legal_address, fallback.legalAddress),
      actualAddress: actualAddressStr,
      phone: textValue(org.phone, textValue(primaryBranch?.phone, fallback.phone)),
      email: textValue(org.email, textValue(primaryBranch?.email, fallback.email)),
      workHours: textValue(primaryBranch?.work_hours, fallback.workHours),
      bankDetails: bankDetailsStr,
      branchName: textValue(primaryBranch?.name, fallback.branchName),
      placeholderNotice: fallback.placeholderNotice,
      bankName: textValue(org.bank_name, fallback.bankName),
      bankInn: textValue(org.bank_inn, fallback.bankInn),
      bik: textValue(org.bik, fallback.bik),
      accountNumber: textValue(org.account_number, fallback.accountNumber),
      correspondentAccount: textValue(org.correspondent_account, fallback.correspondentAccount),
      bankAddress: textValue(org.bank_address, fallback.bankAddress),
      branches: visibleBranches
    };
  } catch (error) {
    console.error("Failed to load public legal data", error);
    return fallback;
  }
}

export type DynamicPageBlock = {
  title: string;
  subtitle: string;
  body: string;
  meta_title: string;
  meta_description: string;
};

export async function getDynamicPageBlock(
  key: string,
  fallbackTitle: string,
  fallbackSubtitle: string,
  fallbackBody: string
): Promise<DynamicPageBlock> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", "robotics-lipetsk")
      .single();

    if (org) {
      const { data: block } = await (supabase.from("site_content_blocks") as any)
        .select("*")
        .eq("organization_id", org.id)
        .eq("block_key", key)
        .maybeSingle();

      if (block) {
        return {
          title: block.title || fallbackTitle,
          subtitle: block.subtitle || fallbackSubtitle,
          body: block.content?.body || fallbackBody,
          meta_title: block.content?.meta_title || "",
          meta_description: block.content?.meta_description || ""
        };
      }
    }
  } catch (e) {
    console.error("Failed to load page block", key, e);
  }

  return {
    title: fallbackTitle,
    subtitle: fallbackSubtitle,
    body: fallbackBody,
    meta_title: "",
    meta_description: ""
  };
}
