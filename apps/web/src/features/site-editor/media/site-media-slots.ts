import { normalizeSiteMediaPath, readableMediaTitle } from "@/shared/utils/site-media";
import { normalizeContentImage, resolveFacilitiesMedia } from "@/shared/utils/site-media-content";
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
  { id: "facilities-main", group: "home", groupLabel: "Главная", label: "Основное большое фото", description: "Большое изображение слева в блоке классов.", blockKey: "home.facilities", field: "mainImage", mode: "single", folder: "facilities", title: "Фото классов и оборудования", subtitle: "Наши учебные классы" },
  { id: "facilities-equipment", group: "home", groupLabel: "Главная", label: "Оборудование", description: "Верхнее изображение справа.", blockKey: "home.facilities", field: "equipmentImage", mode: "single", folder: "facilities", title: "Фото классов и оборудования", subtitle: "Наши учебные классы" },
  { id: "facilities-workspace", group: "home", groupLabel: "Главная", label: "Рабочая зона", description: "Нижнее изображение справа.", blockKey: "home.facilities", field: "workspaceImage", mode: "single", folder: "facilities", title: "Фото классов и оборудования", subtitle: "Наши учебные классы" },
  { id: "student-projects", group: "home", groupLabel: "Главная", label: "Проекты учеников", description: "Карточки проектов; подписи и порядок сохраняются вместе с изображениями.", blockKey: "home.student_projects", field: "items", mode: "collection", folder: "student-projects", title: "Проекты учеников", subtitle: "Инженерные разработки" },
  { id: "lesson-process", group: "home", groupLabel: "Главная", label: "Как проходят занятия", description: "Иллюстрации этапов занятия в порядке показа.", blockKey: "home.lesson_process", field: "steps", mode: "collection", folder: "lesson-process", title: "Как проходят занятия", subtitle: "Этапы уроков", layout: { columnsDesktop: 5, columnsTablet: 3, columnsMobile: 1, gap: 24 } },
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
  return normalizeContentImage(value);
}

export function replaceSingleImage(current: SingleImageValue | null, path: string): SingleImageValue | null {
  const nextPath = normalizeSiteMediaPath(path);
  if (!nextPath) return null;
  if (!current) return normalizeSingleImage(nextPath);
  return { ...current, path: nextPath };
}

export function createSiteMediaDrafts(blocks: Array<{ block_key: string; content?: Record<string, unknown> | null }>): Record<string, SiteMediaSlotDraft> {
  const blocksByKey = new Map(blocks.map((block) => [block.block_key, block]));
  const facilitiesBlock = blocksByKey.get("home.facilities") as (typeof blocks)[number] & { title?: string; subtitle?: string } | undefined;
  const equipmentBlock = blocksByKey.get("home.equipment");
  const facilities = resolveFacilitiesMedia(facilitiesBlock?.content, equipmentBlock?.content);
  return Object.fromEntries(SITE_MEDIA_SLOTS.map((slot) => {
    const content = blocksByKey.get(slot.blockKey)?.content || {};
    if (slot.id.startsWith("facilities-")) {
      const field = slot.field as keyof typeof facilities;
      return [slot.id, {
        image: facilities[field],
        title: facilitiesBlock?.title || slot.title,
        subtitle: facilitiesBlock?.subtitle || slot.subtitle,
      }];
    }
    if (slot.mode === "single") return [slot.id, { image: normalizeSingleImage(content[slot.field]) }];
    return [slot.id, {
      images: normalizeImageCollection(content[slot.field]),
      layout: normalizeImageLayout((content.layout as Partial<ImageCollectionLayout> | undefined) || slot.layout),
    }];
  }));
}
