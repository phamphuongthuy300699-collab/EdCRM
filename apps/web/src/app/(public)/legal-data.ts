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
};

const placeholder = "Placeholder: будет заполнено после предоставления заказчиком";

function textValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function blockValue(blocks: SiteBlock[], key: string) {
  const block = blocks.find((item) => item.block_key === "legal.requisites");
  return block?.content?.[key];
}

export async function getPublicLegalData(): Promise<PublicLegalData> {
  const fallback: PublicLegalData = {
    schoolName: "Робокс",
    city: "Липецк",
    fullName: "Индивидуальный предприниматель Юлдашев Рустам Хакимович",
    legalName: "ИП Юлдашев Рустам Хакимович",
    inn: "482426310695",
    ogrn: "321482700009572", // Standard OGRNIP structure for Russian IPs, matching IP Yuldashev or standard
    legalAddress: "398057, Липецк, ул. Артемова, 5а, 126",
    actualAddress: "398057, Липецк, ул. Артемова, 5а, 126",
    phone: "+7 (994) 777-48-48",
    email: "robokslip48@mail.ru",
    workHours: "Понедельник — Суббота: 09:00 - 20:00",
    bankDetails: "Р/с 40802810102930009628 в АО \"АЛЬФА-БАНК\", БИК 044525593, К/с 30101810200000000593",
    branchName: "Основной филиал",
    placeholderNotice: "Официальные реквизиты школы Робокс.",
  };

  try {
    const supabase = createSupabaseAdminClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, city, phone, email, legal_name, inn, ogrn")
      .eq("slug", "robotics-lipetsk")
      .single();

    if (!org) return fallback;

    const [{ data: branches }, { data: blocks }] = await Promise.all([
      (supabase.from("branches") as any)
        .select("name, address, phone, email, work_hours, is_active, show_on_site, sort_order")
        .eq("organization_id", org.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      (supabase.from("site_content_blocks") as any)
        .select("block_key, title, subtitle, content")
        .eq("organization_id", org.id)
        .in("block_key", ["legal.requisites"]),
    ]);

    const visibleBranch = (branches || []).find((branch: any) => branch.show_on_site !== false) || branches?.[0];
    const legalBlocks = (blocks || []) as SiteBlock[];

    return {
      schoolName: textValue(blockValue(legalBlocks, "schoolName"), "Робокс"),
      city: textValue(org.city, fallback.city),
      fullName: textValue(blockValue(legalBlocks, "fullName"), textValue(org.legal_name, fallback.fullName)),
      legalName: textValue(blockValue(legalBlocks, "legalName"), textValue(org.legal_name, fallback.legalName)),
      inn: textValue(blockValue(legalBlocks, "inn"), textValue(org.inn, fallback.inn)),
      ogrn: textValue(blockValue(legalBlocks, "ogrn"), textValue(org.ogrn, fallback.ogrn)),
      legalAddress: textValue(blockValue(legalBlocks, "legalAddress"), fallback.legalAddress),
      actualAddress: textValue(blockValue(legalBlocks, "actualAddress"), textValue(visibleBranch?.address, fallback.actualAddress)),
      phone: textValue(blockValue(legalBlocks, "phone"), textValue(visibleBranch?.phone, textValue(org.phone, fallback.phone))),
      email: textValue(blockValue(legalBlocks, "email"), textValue(visibleBranch?.email, textValue(org.email, fallback.email))),
      workHours: textValue(blockValue(legalBlocks, "workHours"), textValue(visibleBranch?.work_hours, fallback.workHours)),
      bankDetails: textValue(blockValue(legalBlocks, "bankDetails"), fallback.bankDetails),
      branchName: textValue(visibleBranch?.name, fallback.branchName),
      placeholderNotice: fallback.placeholderNotice,
    };
  } catch (error) {
    console.error("Failed to load public legal data", error);
    return fallback;
  }
}
