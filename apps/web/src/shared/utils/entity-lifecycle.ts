export type LifecycleAction = "archive" | "restore" | "delete" | "anonymize";
export type LifecycleEntity =
  | "branches"
  | "rooms"
  | "courses"
  | "course_tariffs"
  | "groups"
  | "profiles"
  | "students"
  | "guardians"
  | "leads"
  | "invoices"
  | "discount_types"
  | "discount_assignments"
  | "site_content_blocks";

type DependencyCounts = Record<string, number | undefined>;

type DeleteSafety = {
  allowed: boolean;
  message: string;
  fallbackAction?: "archive" | "anonymize";
};

const hardDeleteRoles = new Set(["owner", "admin"]);
const staffLifecycleRoles = new Set(["owner", "admin", "manager"]);

export function roleCanPerformLifecycleAction(role: string | null | undefined, action: LifecycleAction) {
  if (!role) return false;
  if (action === "delete" || action === "anonymize") return hardDeleteRoles.has(role);
  return staffLifecycleRoles.has(role);
}

export function buildArchivePayload(entity: LifecycleEntity, actorId: string) {
  const base = {
    archived_at: new Date().toISOString(),
    archived_by: actorId,
  };

  if (entity === "branches") return { ...base, is_active: false, show_on_site: false };
  if (entity === "rooms") return { ...base, is_active: false };
  if (entity === "courses") return { ...base, is_active: false, is_public: false };
  if (entity === "course_tariffs") return { ...base, show_on_site: false };
  if (entity === "groups") return { ...base, show_on_site: false };
  if (entity === "students") return { ...base, status: "archived" };
  if (entity === "profiles") return { ...base, show_on_site: false };
  if (entity === "guardians") return base;
  if (entity === "leads") return base;
  if (entity === "invoices") return { ...base, is_archived: true };
  if (entity === "discount_types") return { ...base, is_active: false };
  if (entity === "discount_assignments") return { ...base, status: "rejected" };
  if (entity === "site_content_blocks") return { ...base, status: "hidden" };
  return base;
}

export function buildRestorePayload(entity: LifecycleEntity) {
  const base = {
    archived_at: null,
    archived_by: null,
  };

  if (entity === "branches") return { ...base, is_active: true };
  if (entity === "rooms") return { ...base, is_active: true };
  if (entity === "courses") return { ...base, is_active: true };
  if (entity === "course_tariffs") return { ...base, show_on_site: true };
  if (entity === "groups") return { ...base, show_on_site: true };
  if (entity === "students") return { ...base, status: "active" };
  if (entity === "profiles") return base;
  if (entity === "invoices") return { ...base, is_archived: false };
  if (entity === "discount_types") return { ...base, is_active: true };
  if (entity === "site_content_blocks") return { ...base, status: "published" };
  return base;
}

function hasAny(counts: DependencyCounts, keys: string[]) {
  return keys.some((key) => Number(counts[key] || 0) > 0);
}

export function evaluateDeleteSafety(entity: LifecycleEntity, record: Record<string, any>, counts: DependencyCounts = {}): DeleteSafety {
  if (entity === "groups") {
    const unsafe = hasAny(counts, ["activeEnrollments", "lessonSessions", "attendance", "invoices", "homeworkAssignments"]);
    if (unsafe || record.status !== "draft") {
      return {
        allowed: false,
        message: "Группа используется в учениках/занятиях/счетах. Можно только архивировать.",
        fallbackAction: "archive",
      };
    }
    return { allowed: true, message: "Черновую группу без связей можно удалить." };
  }

  if (entity === "branches" && hasAny(counts, ["groups", "rooms", "leads", "enrollments"])) {
    return { allowed: false, message: "Нельзя удалить филиал, есть связанные группы/кабинеты. Можно архивировать.", fallbackAction: "archive" };
  }

  if (entity === "rooms" && hasAny(counts, ["groups", "lessonSessions"])) {
    return { allowed: false, message: "Нельзя удалить кабинет, он связан с группами или занятиями. Можно архивировать.", fallbackAction: "archive" };
  }

  if (entity === "courses" && hasAny(counts, ["groups", "leads", "courseTariffs", "enrollments", "invoices"])) {
    return { allowed: false, message: "Нельзя удалить направление, есть связанные группы, заявки или история оплат. Можно архивировать.", fallbackAction: "archive" };
  }

  if (entity === "course_tariffs" && hasAny(counts, ["invoices", "leads", "history"])) {
    return { allowed: false, message: "Тариф уже использован в истории. Можно скрыть/архивировать.", fallbackAction: "archive" };
  }

  if (entity === "students" && hasAny(counts, ["enrollments", "invoices", "payments", "attendance", "lessonSessions", "homeworkAssignments"])) {
    return { allowed: false, message: "У ученика есть учебная или финансовая история. Можно архивировать или анонимизировать персональные данные.", fallbackAction: "anonymize" };
  }

  if (entity === "guardians" && hasAny(counts, ["students", "invoices", "payments"])) {
    return { allowed: false, message: "У родителя есть связи с учениками или платежами. Можно очистить персональные данные.", fallbackAction: "anonymize" };
  }

  if (entity === "leads" && record.status === "converted") {
    return { allowed: false, message: "Конвертированную заявку нельзя удалить без проверки связей. Можно архивировать.", fallbackAction: "archive" };
  }

  if (entity === "invoices" && (record.status !== "draft" || hasAny(counts, ["payments", "paymentEvents"]))) {
    return { allowed: false, message: "Счет уже выдан или связан с платежами. Удаление запрещено, можно отменить или архивировать отображение.", fallbackAction: "archive" };
  }

  if (entity === "discount_types" && hasAny(counts, ["assignments", "invoiceDiscounts"])) {
    return { allowed: false, message: "Скидка уже использовалась. Можно деактивировать.", fallbackAction: "archive" };
  }

  if (entity === "discount_assignments" && record.status !== "pending") {
    return { allowed: false, message: "Нельзя удалить уже обработанную скидку. Можно отозвать/архивировать.", fallbackAction: "archive" };
  }

  if (entity === "site_content_blocks") {
    return { allowed: false, message: "Критичный блок сайта нельзя удалить целиком. Используйте скрытие или редактирование JSON-элементов.", fallbackAction: "archive" };
  }

  return { allowed: true, message: "Удаление разрешено: критичных связей не найдено." };
}
