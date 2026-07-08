export type PublicNavLink = {
  id?: string;
  title: string;
  href: string;
  enabled?: boolean;
  sortOrder?: number;
};

export const defaultHeaderLinks: PublicNavLink[] = [
  { id: "courses", title: "Курсы", href: "/#courses", enabled: true, sortOrder: 10 },
  { id: "prices", title: "Цены", href: "/#prices", enabled: true, sortOrder: 20 },
  { id: "schedule", title: "Расписание", href: "/#schedule", enabled: true, sortOrder: 30 },
  { id: "teachers", title: "Преподаватели", href: "/#teachers", enabled: true, sortOrder: 40 },
  { id: "contacts", title: "Контакты", href: "/contacts", enabled: true, sortOrder: 50 },
];

export const defaultFooterLinks: PublicNavLink[] = [
  { id: "robotics", title: "Робототехника", href: "/robototekhnika-dlya-detey-lipetsk", enabled: true, sortOrder: 10 },
  { id: "programming", title: "Программирование", href: "/programmirovanie-dlya-detey-lipetsk", enabled: true, sortOrder: 20 },
  { id: "schedule", title: "Расписание", href: "/raspisanie", enabled: true, sortOrder: 30 },
  { id: "prices", title: "Стоимость", href: "/stoimost", enabled: true, sortOrder: 40 },
  { id: "teachers", title: "Преподаватели", href: "/#teachers", enabled: true, sortOrder: 50 },
  { id: "contacts", title: "Контакты", href: "/contacts", enabled: true, sortOrder: 60 },
];

export function safePublicNavLinks(value: unknown, fallback: PublicNavLink[]) {
  const items = Array.isArray(value) ? value : fallback;
  const links = items
    .filter((item: any) => item?.title && item?.href && item.enabled !== false)
    .map((item: any, index) => ({
      id: String(item.id || `nav-${index}`),
      title: String(item.title),
      href: String(item.href).startsWith("/crm") ? "/" : String(item.href),
      enabled: item.enabled !== false,
      sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : (index + 1) * 10,
    }))
    .filter((item) => item.href && !item.href.startsWith("/crm"))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return links.length > 0 ? links : fallback;
}
