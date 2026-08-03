import { normalizeSiteMediaPath, readableMediaTitle } from "@/shared/utils/site-media";
import { normalizeImageCollection, normalizeImageLayout } from "./image-collection";
import type { ImageCollectionLayout, SingleImageValue, SiteMediaSlotDraft } from "./types";

export type SiteMediaSlot = {
  id: string;
  group: "home" | "contacts" | "brand" | "footer";
  groupLabel: string;
  label: string;
  description: string;
  blockKey: string;
  field: string;
  mode: "single" | "collection";
  folder: string;
  title: string;
  subtitle: string;
  layout?: Partial<ImageCollectionLayout>;
  showLayoutSettings?: boolean;
};

export const SITE_MEDIA_SLOTS: SiteMediaSlot[] = [
  { id: "home-hero", group: "home", groupLabel: "Главная", label: "Первый экран", description: "Главное изображение рядом с заголовком страницы.", blockKey: "home.media", field: "heroImage", mode: "single", folder: "hero", title: "Медиа главной", subtitle: "Изображения первого экрана" },
  { id: "facilities", group: "home", groupLabel: "Главная", label: "Фото помещений", description: "Первое видимое фото используется как основное изображение класса.", blockKey: "home.facilities", field: "images", mode: "collection", folder: "facilities", title: "Фото помещений", subtitle: "Наши учебные классы", showLayoutSettings: false },
  { id: "student-projects", group: "home", groupLabel: "Главная", label: "Проекты учеников", description: "Карточки проектов; подписи и порядок сохраняются вместе с изображениями.", blockKey: "home.student_projects", field: "items", mode: "collection", folder: "student-projects", title: "Проекты учеников", subtitle: "Инженерные разработки" },
  { id: "lesson-process", group: "home", groupLabel: "Главная", label: "Как проходят занятия", description: "Иллюстрации этапов занятия в порядке показа.", blockKey: "home.lesson_process", field: "steps", mode: "collection", folder: "lesson-process", title: "Как проходят занятия", subtitle: "Этапы уроков", layout: { columnsDesktop: 5, columnsTablet: 3, columnsMobile: 1, gap: 24 } },
  { id: "equipment", group: "home", groupLabel: "Главная", label: "Классы и оборудование", description: "Первые два видимых изображения используются в промоблоке.", blockKey: "home.equipment", field: "images", mode: "collection", folder: "equipment", title: "Классы и оборудование", subtitle: "Материалы и стенды", showLayoutSettings: false },
  { id: "contacts-map", group: "contacts", groupLabel: "Контакты", label: "Карта или общий вид", description: "Основное изображение в блоке контактов.", blockKey: "contacts.media", field: "mapImage", mode: "single", folder: "contacts", title: "Медиа контактов", subtitle: "Фотографии контактов" },
  { id: "contacts-facade", group: "contacts", groupLabel: "Контакты", label: "Фасад", description: "Фото входа или фасада филиала.", blockKey: "contacts.media", field: "facadeImage", mode: "single", folder: "contacts", title: "Медиа контактов", subtitle: "Фотографии контактов" },
  { id: "contacts-classroom", group: "contacts", groupLabel: "Контакты", label: "Класс", description: "Фото учебного класса в контактном блоке.", blockKey: "contacts.media", field: "classroomImage", mode: "single", folder: "contacts", title: "Медиа контактов", subtitle: "Фотографии контактов" },
  { id: "contacts-gallery", group: "contacts", groupLabel: "Контакты", label: "Галерея контактов", description: "Дополнительные фотографии для страницы контактов.", blockKey: "contacts.media", field: "images", mode: "collection", folder: "contacts", title: "Медиа контактов", subtitle: "Фотографии контактов", showLayoutSettings: false },
  { id: "brand-logo", group: "brand", groupLabel: "Бренд и SEO", label: "Логотип", description: "Основной логотип в шапке и публичных разделах.", blockKey: "site.branding", field: "logo", mode: "single", folder: "branding", title: "Робокс", subtitle: "Настройки брендинга" },
  { id: "brand-favicon", group: "brand", groupLabel: "Бренд и SEO", label: "Favicon", description: "Иконка вкладки браузера; лучше использовать квадратный SVG, PNG или ICO.", blockKey: "site.branding", field: "favicon", mode: "single", folder: "branding", title: "Робокс", subtitle: "Настройки брендинга" },
  { id: "seo-social", group: "brand", groupLabel: "Бренд и SEO", label: "Изображение для соцсетей", description: "Превью ссылки (Open Graph); рекомендуемый формат 1200×630.", blockKey: "home.seo", field: "ogImage", mode: "single", folder: "branding", title: "SEO", subtitle: "Поисковое представление главной страницы" },
  { id: "footer-map", group: "footer", groupLabel: "Футер", label: "Резервная схема проезда", description: "Используется в футере, если для филиала не задано отдельное изображение.", blockKey: "site.footer", field: "mapImage", mode: "single", folder: "footer", title: "Футер сайта", subtitle: "Параметры отображения нижней части страниц" },
];

export function normalizeSingleImage(value: unknown): SingleImageValue | null {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const rawPath = typeof value === "string" ? value : record.path || record.image || record.url || record.publicUrl || "";
  const path = normalizeSiteMediaPath(String(rawPath || ""));
  if (!path) return null;
  const fallbackTitle = readableMediaTitle(path);
  const title = String(record.title || "").trim() || fallbackTitle;
  return {
    path,
    title,
    alt: String(record.alt || "").trim() || title,
    objectPosition: String(record.objectPosition || "").trim() || "50% 50%",
  };
}

export function replaceSingleImage(current: SingleImageValue | null, path: string): SingleImageValue | null {
  const nextPath = normalizeSiteMediaPath(path);
  if (!nextPath) return null;
  if (!current) return normalizeSingleImage(nextPath);
  return { ...current, path: nextPath };
}

export function createSiteMediaDrafts(blocks: Array<{ block_key: string; content?: Record<string, unknown> | null }>): Record<string, SiteMediaSlotDraft> {
  const blocksByKey = new Map(blocks.map((block) => [block.block_key, block]));
  return Object.fromEntries(SITE_MEDIA_SLOTS.map((slot) => {
    const content = blocksByKey.get(slot.blockKey)?.content || {};
    if (slot.mode === "single") return [slot.id, { image: normalizeSingleImage(content[slot.field]) }];
    return [slot.id, {
      images: normalizeImageCollection(content[slot.field]),
      layout: normalizeImageLayout((content.layout as Partial<ImageCollectionLayout> | undefined) || slot.layout),
    }];
  }));
}
