"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@robotics-crm/ui";
import {
  Archive,
  Banknote,
  BookOpen,
  Bot,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  DoorOpen,
  Eye,
  EyeOff,
  KeyRound,
  Link as LinkIcon,
  MessageCircle,
  Percent,
  Plus,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Tag,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import { isDemoMode } from "@/shared/utils/demo";
import { useActionConfirmation } from "@/shared/ui/useActionConfirmation";
import { getMediaUrl } from "@/shared/utils/media";

type TabId = "organization" | "branches" | "courses" | "groups" | "staff" | "payments" | "discounts" | "bots" | "system";
type GroupStatus = "draft" | "active" | "paused" | "closed";
type StaffRole = "owner" | "admin" | "manager" | "teacher" | "accountant";

const DEFAULT_ORG_SLUG = process.env.NEXT_PUBLIC_DEFAULT_ORG_SLUG || "robotics-lipetsk";
const roleLabels: Record<string, string> = {
  owner: "Владелец",
  admin: "Администратор",
  manager: "Менеджер",
  teacher: "Преподаватель",
  accountant: "Бухгалтер",
};
const weekdays = [
  { value: 1, label: "Пн" },
  { value: 2, label: "Вт" },
  { value: 3, label: "Ср" },
  { value: 4, label: "Чт" },
  { value: 5, label: "Пт" },
  { value: 6, label: "Сб" },
  { value: 7, label: "Вс" },
];

const emptyBranch = {
  id: "",
  name: "",
  address: "",
  phone: "",
  email: "",
  work_hours: "",
  map_url: "",
  description: "",
  is_active: true,
  show_on_site: true,
  sort_order: 100,
};

const emptyRoom = {
  id: "",
  branch_id: "",
  name: "",
  capacity: 8,
  equipment: "",
  description: "",
  is_active: true,
};

const emptyCourse = {
  id: "",
  title: "",
  slug: "",
  short_description: "",
  full_description: "",
  min_age: 6,
  max_age: 14,
  duration_minutes: 90,
  price_monthly: 4500,
  is_public: true,
  is_active: true,
  sort_order: 100,
  seo_title: "",
  seo_description: "",
  card_image_url: "",
  card_image_alt: "",
};

const emptyGroup = {
  id: "",
  title: "",
  course_id: "",
  branch_id: "",
  room_id: "",
  teacher_id: "",
  status: "active" as GroupStatus,
  age_from: 6,
  age_to: 14,
  capacity: 8,
  starts_on: "",
  ends_on: "",
  price_monthly: "",
  show_on_site: true,
  sort_order: 100,
};

const emptyRule = {
  weekday: 1,
  starts_at: "17:00",
  ends_at: "18:30",
};

const emptyStaff = {
  userId: "",
  email: "",
  fullName: "",
  phone: "",
  role: "teacher" as StaffRole,
  specialty: "",
  publicBio: "",
  internalComment: "",
  avatarUrl: "",
  showOnSite: false,
  sortOrder: 100,
};

const demoOrg = {
  id: "demo-org",
  name: "Робокс",
  slug: "robotics-lipetsk",
  city: "Липецк",
  timezone: "Europe/Moscow",
  phone: "+7 994 777-48-48",
  email: "robokslip48@mail.ru",
  legal_name: "ИП Юлдашев Рустам Хакимович",
  inn: "482426310695",
  ogrn: "",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function toTime(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 5);
}

function formatMoney(value: any) {
  const amount = Number(value || 0);
  return amount ? `${amount.toLocaleString("ru-RU")} ₽` : "не указано";
}

function ruleLabel(rule: any) {
  const day = weekdays.find((item) => item.value === Number(rule.weekday))?.label || rule.weekday;
  return `${day} ${toTime(rule.starts_at)}-${toTime(rule.ends_at)}`;
}

function flattenValidationDetails(details: any, prefix = ""): string[] {
  if (!details || typeof details !== "object") return [];
  const ownErrors = Array.isArray(details._errors) ? details._errors : [];
  const lines = ownErrors.map((message: string) => `${prefix || "form"}: ${message}`);

  for (const [key, value] of Object.entries(details)) {
    if (key === "_errors") continue;
    lines.push(...flattenValidationDetails(value, prefix ? `${prefix}.${key}` : key));
  }

  return lines;
}

function staffErrorMessage(payload: any) {
  const details = flattenValidationDetails(payload?.details);
  if (details.length === 0) return payload?.error || "Не удалось сохранить сотрудника";
  return `${payload?.error || "Некорректные данные сотрудника"}\n${details.join("\n")}`;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="form-input" {...props} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="form-input settings-textarea" {...props} />;
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="form-input" {...props} />;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="settings-toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Modal({
  title,
  children,
  onClose,
  width = 720,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: number;
}) {
  return (
    <div className="settings-modal-backdrop">
      <div className="settings-modal" style={{ maxWidth: width }}>
        <div className="settings-modal-header">
          <h3>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function CrmSettingsPage() {
  const { askAction, modal: actionModal } = useActionConfirmation();
  const [activeTab, setActiveTab] = useState<TabId>("organization");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [org, setOrg] = useState<any>(demoOrg);
  const [showArchivedGroups, setShowArchivedGroups] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<any>({
    is_enabled: false,
    mode: "test",
    merchant_id: "",
    terminal_id: "",
    return_url: "",
    fail_url: "",
    webhook_url: "",
    settings: {},
  });
  const [paymentSecretsConfigured, setPaymentSecretsConfigured] = useState(false);
  const [maxSettings, setMaxSettings] = useState<any>({
    isEnabled: false,
    tokenConfigured: false,
    webhookSecret: "",
    webhookUrl: "https://xn--48-9kc0bsblm.xn--p1ai/api/bots/max/webhook",
    botUsername: "",
    settings: {},
  });
  const [maxBotToken, setMaxBotToken] = useState("");

  const [discountTypes, setDiscountTypes] = useState<any[]>([]);
  const [discountAssignments, setDiscountAssignments] = useState<any[]>([]);
  const [discountAssignmentDraft, setDiscountAssignmentDraft] = useState<any | null>(null);
  const [guardians, setGuardians] = useState<any[]>([]);
  const [discountStudents, setDiscountStudents] = useState<any[]>([]);

  const [branchDraft, setBranchDraft] = useState<any | null>(null);
  const [roomDraft, setRoomDraft] = useState<any | null>(null);
  const [courseDraft, setCourseDraft] = useState<any | null>(null);
  const [groupDraft, setGroupDraft] = useState<any | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<any[]>([]);
  const [staffDraft, setStaffDraft] = useState<any | null>(null);
  const [staffError, setStaffError] = useState("");
  const [uploadingStaffAvatar, setUploadingStaffAvatar] = useState(false);
  const [uploadingCourseImage, setUploadingCourseImage] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const supabase = createSupabaseBrowserClient();
  const demo = isDemoMode();

  const activeBranches = useMemo(() => branches.filter((branch) => branch.is_active), [branches]);
  const activeRooms = useMemo(() => rooms.filter((room) => room.is_active), [rooms]);
  const activeCourses = useMemo(() => courses.filter((course) => course.is_active), [courses]);
  const teacherStaff = useMemo(() => staff.filter((item) => item.role === "teacher" && item.is_active), [staff]);
  const visibleGroups = useMemo(
    () => showArchivedGroups ? groups : groups.filter((group) => !group.archived_at),
    [groups, showArchivedGroups],
  );

  function setTab(tab: TabId) {
    if (tab === "payments" && typeof window !== "undefined") {
      window.location.assign("/crm/settings/payments");
      return;
    }
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("tab", tab);
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      setNotice("");

      if (demo) {
        const demoBranches = [
          {
            ...emptyBranch,
            id: "demo-branch-1",
            name: "Филиал на Осканова",
            address: "Липецк, ул. Осканова, 3",
            phone: "+7 994 777-48-48",
            email: "robokslip48@mail.ru",
            work_hours: "Пн-Сб 09:00-20:00",
            description: "Светлый учебный класс с современным робототехническим оборудованием.",
            sort_order: 10,
          },
        ];
        const demoCourses = [
          { ...emptyCourse, id: "demo-course-1", title: "Робототехника (Lego Education)", slug: "robotics-lego", min_age: 6, max_age: 12, price_monthly: 3000, sort_order: 10 },
          { ...emptyCourse, id: "demo-course-2", title: "Scratch и основы программирования", slug: "scratch", min_age: 8, max_age: 12, price_monthly: 3500, sort_order: 20 },
        ];
        const demoStaff = [
          {
            user_id: "demo-teacher-1",
            full_name: "Загрядская Дарья",
            email: "paramonovadara838@mail.ru",
            phone: "+7 905 684-60-65",
            role: "teacher",
            specialty: "дошкольники, школьники; LEGO Education, DUPLO, WeDo 2.0, EV3, Scratch",
            public_bio: "Дарья ведёт занятия по робототехнике для дошкольников и школьников. Помогает детям освоить конструирование, первые алгоритмы и программирование.",
            show_on_site: true,
            sort_order: 10,
            is_active: true,
          },
        ];
        setOrg(demoOrg);
        setBranches(demoBranches);
        setRooms([{ ...emptyRoom, id: "demo-room-1", branch_id: "demo-branch-1", name: "Кабинет 101", equipment: "LEGO Education, ноутбуки", capacity: 8 }]);
        setCourses(demoCourses);
        setStaff(demoStaff);
        setGroups([
          {
            ...emptyGroup,
            id: "demo-group-1",
            title: "LEGO Start 1",
            course_id: "demo-course-1",
            branch_id: "demo-branch-1",
            room_id: "demo-room-1",
            teacher_id: "demo-teacher-1",
            course: { title: "Робототехника LEGO" },
            branch: { name: "Основной филиал" },
            room: { name: "Кабинет 101" },
            teacher: { full_name: "Алексей Дмитриев" },
            group_schedule_rules: [
              { id: "demo-rule-1", weekday: 2, starts_at: "17:00:00", ends_at: "18:30:00" },
              { id: "demo-rule-2", weekday: 4, starts_at: "17:00:00", ends_at: "18:30:00" },
            ],
            enrollments: [{ id: "e1", status: "active" }],
          },
        ]);
        return;
      }

      const { data: orgData, error: orgError } = await (supabase.from("organizations") as any)
        .select("*")
        .eq("slug", DEFAULT_ORG_SLUG)
        .single();
      if (orgError || !orgData) throw new Error("Организация не найдена");
      setOrg(orgData);

      const [
        branchesRes,
        roomsRes,
        coursesRes,
        groupsRes,
        staffListRes,
        paymentRes,
        maxSettingsRes,
      ] = await Promise.all([
        (supabase.from("branches") as any).select("*").eq("organization_id", orgData.id).order("sort_order"),
        (supabase.from("rooms") as any).select("*").eq("organization_id", orgData.id).order("name"),
        (supabase.from("courses") as any).select("*").eq("organization_id", orgData.id).order("sort_order"),
        (supabase.from("groups") as any)
          .select(`
            *,
            course:courses(title, price_monthly),
            branch:branches(name, address, is_active, show_on_site),
            room:rooms(name, is_active),
            teacher:profiles(full_name),
            group_schedule_rules(id, weekday, starts_at, ends_at),
            enrollments(id, status)
          `)
          .eq("organization_id", orgData.id)
          .order("sort_order"),
        fetch("/api/crm/staff/list").then((res) => res.json()).catch(() => ({ ok: false, staff: [] })),
        fetch("/api/crm/payment-settings/alfabank").then((res) => res.json()).catch(() => null),
        fetch("/api/crm/bot-settings/max").then((res) => res.json()).catch(() => null),
      ]);

      if (branchesRes.error) throw branchesRes.error;
      if (roomsRes.error) throw roomsRes.error;
      if (coursesRes.error) throw coursesRes.error;
      if (groupsRes.error) throw groupsRes.error;
      if (staffListRes && !staffListRes.ok) {
        throw new Error(staffListRes.error || "Не удалось загрузить список сотрудников");
      }

      setBranches(branchesRes.data || []);
      setRooms(roomsRes.data || []);
      setCourses(coursesRes.data || []);
      setGroups(groupsRes.data || []);
      setStaff(staffListRes.staff || []);
      if (paymentRes?.ok) {
        setPaymentSettings(paymentRes.settings || paymentSettings);
        setPaymentSecretsConfigured(Boolean(paymentRes.passwordConfigured));
      }
      if (maxSettingsRes?.ok) {
        setMaxSettings({
          isEnabled: Boolean(maxSettingsRes.settings?.isEnabled),
          tokenConfigured: Boolean(maxSettingsRes.settings?.tokenConfigured),
          webhookSecret: maxSettingsRes.settings?.webhookSecret || "",
          webhookUrl: maxSettingsRes.settings?.webhookUrl || "https://xn--48-9kc0bsblm.xn--p1ai/api/bots/max/webhook",
          botUsername: maxSettingsRes.settings?.botUsername || "",
          settings: maxSettingsRes.settings?.settings || {},
        });
        setMaxBotToken("");
      }

      // Load discount data
      const [dtRes, daRes, guardiansRes, studentsRes] = await Promise.all([
        (supabase.from("discount_types") as any)
          .select("*")
          .eq("organization_id", orgData.id)
          .order("title"),
        (supabase.from("discount_assignments") as any)
          .select(`
            *,
            discount_type:discount_types(id, title, percent, code, kind, is_one_time),
            approver:profiles!discount_assignments_approved_by_fkey(full_name),
            guardian:guardians(full_name),
            student:students(full_name)
          `)
          .eq("organization_id", orgData.id)
          .order("created_at", { ascending: false }),
        (supabase.from("guardians") as any)
          .select("id, full_name, phone, email")
          .eq("organization_id", orgData.id)
          .order("full_name"),
        (supabase.from("students") as any)
          .select("id, full_name")
          .eq("organization_id", orgData.id)
          .order("full_name"),
      ]);

      setDiscountTypes(dtRes.data || []);
      setDiscountAssignments(daRes.data || []);
      setGuardians(guardiansRes.data || []);
      setDiscountStudents(studentsRes.data || []);
    } catch (err: any) {
      console.error("Settings load error:", err);
      setError(err.message || "Не удалось загрузить настройки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const requestedTab = new URLSearchParams(window.location.search).get("tab") as TabId | null;
      if (requestedTab === "payments") {
        window.location.assign("/crm/settings/payments");
        return;
      }
      if (requestedTab && ["organization", "branches", "courses", "groups", "staff", "payments", "discounts", "bots", "system"].includes(requestedTab)) {
        setActiveTab(requestedTab);
      }
    }
    loadData();
  }, []);

  async function runEntityAction(entity: string, action: "archive" | "restore" | "delete" | "anonymize", id: string, expectedText?: string) {
    const response = await fetch(`/api/crm/entities/${entity}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, organizationId: org.id, expectedText }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось выполнить действие");
    await loadData();
  }

  async function runConfirmedEntityAction(input: {
    entity: string;
    action: "archive" | "restore" | "delete" | "anonymize";
    id: string;
    name: string;
    title: string;
    description: string;
    confirmText: string;
    dangerLevel: "safe" | "warning" | "danger";
    demoUpdate?: () => void;
  }) {
    const needsTypedConfirmation = input.action === "delete" || input.action === "anonymize";
    const allowed = await askAction({
      title: input.title,
      description: input.description,
      dangerLevel: input.dangerLevel,
      confirmText: input.confirmText,
      requireTypedConfirmation: needsTypedConfirmation,
      expectedText: needsTypedConfirmation ? "УДАЛИТЬ" : undefined,
    });
    if (!allowed) return;
    if (demo && input.demoUpdate) {
      input.demoUpdate();
      setNotice(`${input.name}: действие выполнено`);
      return;
    }
    try {
      await runEntityAction(input.entity, input.action, input.id, needsTypedConfirmation ? "УДАЛИТЬ" : undefined);
      setNotice(`${input.name}: действие выполнено`);
    } catch (err: any) {
      setError(err.message || "Не удалось выполнить действие");
    }
  }

  async function saveOrganization(event: React.FormEvent) {
    event.preventDefault();
    try {
      setSaving(true);
      if (!demo) {
        const { error: updateError } = await (supabase.from("organizations") as any)
          .update({
            name: org.name,
            city: org.city,
            timezone: org.timezone,
            phone: org.phone || null,
            email: org.email || null,
            legal_name: org.legal_name || null,
            inn: org.inn || null,
            ogrn: org.ogrn || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", org.id);
        if (updateError) throw updateError;
      }
      setNotice("Организация сохранена");
    } catch (err: any) {
      setError(err.message || "Не удалось сохранить организацию");
    } finally {
      setSaving(false);
    }
  }

  async function saveBranch(event: React.FormEvent) {
    event.preventDefault();
    if (!branchDraft) return;
    try {
      setSaving(true);
      const payload = {
        organization_id: org.id,
        name: branchDraft.name,
        address: branchDraft.address || null,
        phone: branchDraft.phone || null,
        email: branchDraft.email || null,
        work_hours: branchDraft.work_hours || null,
        map_url: branchDraft.map_url || null,
        description: branchDraft.description || null,
        is_active: branchDraft.is_active,
        show_on_site: branchDraft.show_on_site,
        sort_order: Number(branchDraft.sort_order || 100),
        updated_at: new Date().toISOString(),
      };
      if (demo) {
        setBranches((prev) => branchDraft.id ? prev.map((item) => item.id === branchDraft.id ? { ...branchDraft } : item) : [{ ...branchDraft, id: `demo-branch-${Date.now()}` }, ...prev]);
      } else if (branchDraft.id) {
        const { error: updateError } = await (supabase.from("branches") as any).update(payload).eq("id", branchDraft.id);
        if (updateError) throw updateError;
        await loadData();
      } else {
        const { error: insertError } = await (supabase.from("branches") as any).insert(payload);
        if (insertError) throw insertError;
        await loadData();
      }
      setBranchDraft(null);
      setNotice("Филиал сохранен");
    } catch (err: any) {
      setError(err.message || "Не удалось сохранить филиал");
    } finally {
      setSaving(false);
    }
  }

  async function archiveBranch(branch: any) {
    const allowed = await askAction({
      title: "Архивировать филиал",
      description: `Филиал "${branch.name}" исчезнет из выбора новых групп и публичного сайта.`,
      dangerLevel: "warning",
      confirmText: "Архивировать",
    });
    if (!allowed) return;
    if (demo) {
      setBranches((prev) => prev.map((item) => item.id === branch.id ? { ...item, is_active: false, show_on_site: false } : item));
      return;
    }
    try {
      await runEntityAction("branches", "archive", branch.id);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function saveRoom(event: React.FormEvent) {
    event.preventDefault();
    if (!roomDraft) return;
    try {
      setSaving(true);
      const payload = {
        organization_id: org.id,
        branch_id: roomDraft.branch_id || null,
        name: roomDraft.name,
        capacity: Number(roomDraft.capacity || 8),
        equipment: roomDraft.equipment || null,
        description: roomDraft.description || null,
        is_active: roomDraft.is_active,
        updated_at: new Date().toISOString(),
      };
      if (demo) {
        setRooms((prev) => roomDraft.id ? prev.map((item) => item.id === roomDraft.id ? { ...roomDraft } : item) : [{ ...roomDraft, id: `demo-room-${Date.now()}` }, ...prev]);
      } else if (roomDraft.id) {
        const { error: updateError } = await (supabase.from("rooms") as any).update(payload).eq("id", roomDraft.id);
        if (updateError) throw updateError;
        await loadData();
      } else {
        const { error: insertError } = await (supabase.from("rooms") as any).insert(payload);
        if (insertError) throw insertError;
        await loadData();
      }
      setRoomDraft(null);
      setNotice("Кабинет сохранен");
    } catch (err: any) {
      setError(err.message || "Не удалось сохранить кабинет");
    } finally {
      setSaving(false);
    }
  }

  async function archiveRoom(room: any) {
    const allowed = await askAction({
      title: "Архивировать кабинет",
      description: `Кабинет "${room.name}" будет скрыт из рабочих списков.`,
      dangerLevel: "warning",
      confirmText: "Архивировать",
    });
    if (!allowed) return;
    if (demo) {
      setRooms((prev) => prev.map((item) => item.id === room.id ? { ...item, is_active: false } : item));
      return;
    }
    try {
      await runEntityAction("rooms", "archive", room.id);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function saveCourse(event: React.FormEvent) {
    event.preventDefault();
    if (!courseDraft) return;
    try {
      setSaving(true);
      const payload = {
        organization_id: org.id,
        title: courseDraft.title,
        slug: courseDraft.slug || slugify(courseDraft.title),
        short_description: courseDraft.short_description || null,
        full_description: courseDraft.full_description || null,
        min_age: courseDraft.min_age ? Number(courseDraft.min_age) : null,
        max_age: courseDraft.max_age ? Number(courseDraft.max_age) : null,
        duration_minutes: Number(courseDraft.duration_minutes || 90),
        price_monthly: courseDraft.price_monthly ? Number(courseDraft.price_monthly) : null,
        is_public: courseDraft.is_public,
        is_active: courseDraft.is_active,
        sort_order: Number(courseDraft.sort_order || 100),
        seo_title: courseDraft.seo_title || null,
        seo_description: courseDraft.seo_description || null,
        card_image_url: courseDraft.card_image_url?.trim() || null,
        card_image_alt: courseDraft.card_image_alt?.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (demo) {
        setCourses((prev) => courseDraft.id ? prev.map((item) => item.id === courseDraft.id ? { ...courseDraft } : item) : [{ ...courseDraft, id: `demo-course-${Date.now()}` }, ...prev]);
      } else if (courseDraft.id) {
        const { error: updateError } = await (supabase.from("courses") as any).update(payload).eq("id", courseDraft.id);
        if (updateError) throw updateError;
        await loadData();
      } else {
        const { error: insertError } = await (supabase.from("courses") as any).insert(payload);
        if (insertError) throw insertError;
        await loadData();
      }
      setCourseDraft(null);
      setNotice("Направление сохранено");
    } catch (err: any) {
      setError(err.message || "Не удалось сохранить направление");
    } finally {
      setSaving(false);
    }
  }

  async function handleCourseImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !courseDraft) return;

    try {
      setUploadingCourseImage(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "course-cards");
      const response = await fetch("/api/crm/media", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Не удалось загрузить фон");
      setCourseDraft((current: any) => current ? { ...current, card_image_url: payload.path } : current);
      setNotice("Фон карточки загружен");
    } catch (err: any) {
      setError(err.message || "Не удалось загрузить фон карточки");
    } finally {
      setUploadingCourseImage(false);
    }
  }

  async function archiveCourse(course: any) {
    const allowed = await askAction({
      title: "Архивировать направление",
      description: `Направление "${course.title}" будет скрыто с сайта и из выбора новых групп. Связанные группы и лиды сохранятся.`,
      dangerLevel: "warning",
      confirmText: "Архивировать",
    });
    if (!allowed) return;
    if (demo) {
      setCourses((prev) => prev.map((item) => item.id === course.id ? { ...item, is_active: false, is_public: false } : item));
      return;
    }
    try {
      await runEntityAction("courses", "archive", course.id);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function restoreBranch(branch: any) {
    await runConfirmedEntityAction({
      entity: "branches",
      action: "restore",
      id: branch.id,
      name: branch.name,
      title: "Восстановить филиал",
      description: `Филиал "${branch.name}" снова появится в рабочих списках.`,
      confirmText: "Восстановить",
      dangerLevel: "safe",
      demoUpdate: () => setBranches((prev) => prev.map((item) => item.id === branch.id ? { ...item, is_active: true } : item)),
    });
  }

  async function deleteBranch(branch: any) {
    await runConfirmedEntityAction({
      entity: "branches",
      action: "delete",
      id: branch.id,
      name: branch.name,
      title: "Удалить филиал",
      description: `Филиал "${branch.name}" будет удален только если нет связанных групп, кабинетов и заявок. Введите УДАЛИТЬ для подтверждения.`,
      confirmText: "Удалить",
      dangerLevel: "danger",
      demoUpdate: () => setBranches((prev) => prev.filter((item) => item.id !== branch.id)),
    });
  }

  async function restoreRoom(room: any) {
    await runConfirmedEntityAction({
      entity: "rooms",
      action: "restore",
      id: room.id,
      name: room.name,
      title: "Восстановить кабинет",
      description: `Кабинет "${room.name}" снова появится в рабочих списках.`,
      confirmText: "Восстановить",
      dangerLevel: "safe",
      demoUpdate: () => setRooms((prev) => prev.map((item) => item.id === room.id ? { ...item, is_active: true } : item)),
    });
  }

  async function deleteRoom(room: any) {
    await runConfirmedEntityAction({
      entity: "rooms",
      action: "delete",
      id: room.id,
      name: room.name,
      title: "Удалить кабинет",
      description: `Кабинет "${room.name}" будет удален только если нет связанных групп и занятий. Введите УДАЛИТЬ для подтверждения.`,
      confirmText: "Удалить",
      dangerLevel: "danger",
      demoUpdate: () => setRooms((prev) => prev.filter((item) => item.id !== room.id)),
    });
  }

  async function restoreCourse(course: any) {
    await runConfirmedEntityAction({
      entity: "courses",
      action: "restore",
      id: course.id,
      name: course.title,
      title: "Восстановить направление",
      description: `Направление "${course.title}" снова станет доступно для новых групп.`,
      confirmText: "Восстановить",
      dangerLevel: "safe",
      demoUpdate: () => setCourses((prev) => prev.map((item) => item.id === course.id ? { ...item, is_active: true } : item)),
    });
  }

  async function deleteCourse(course: any) {
    await runConfirmedEntityAction({
      entity: "courses",
      action: "delete",
      id: course.id,
      name: course.title,
      title: "Удалить направление",
      description: `Направление "${course.title}" будет удалено только если нет групп, заявок, тарифов и финансовой истории. Введите УДАЛИТЬ для подтверждения.`,
      confirmText: "Удалить",
      dangerLevel: "danger",
      demoUpdate: () => setCourses((prev) => prev.filter((item) => item.id !== course.id)),
    });
  }

  async function archiveGroup(group: any) {
    await runConfirmedEntityAction({
      entity: "groups",
      action: "archive",
      id: group.id,
      name: group.title,
      title: "Архивировать группу",
      description: `Группа "${group.title}" будет скрыта из рабочих списков по умолчанию и с сайта, но история сохранится.`,
      confirmText: "Архивировать",
      dangerLevel: "warning",
      demoUpdate: () => setGroups((prev) => prev.map((item) => item.id === group.id ? { ...item, archived_at: new Date().toISOString(), show_on_site: false } : item)),
    });
  }

  async function restoreGroup(group: any) {
    await runConfirmedEntityAction({
      entity: "groups",
      action: "restore",
      id: group.id,
      name: group.title,
      title: "Восстановить группу",
      description: `Группа "${group.title}" снова появится в рабочих списках.`,
      confirmText: "Восстановить",
      dangerLevel: "safe",
      demoUpdate: () => setGroups((prev) => prev.map((item) => item.id === group.id ? { ...item, archived_at: null, show_on_site: true } : item)),
    });
  }

  async function deleteGroup(group: any) {
    await runConfirmedEntityAction({
      entity: "groups",
      action: "delete",
      id: group.id,
      name: group.title,
      title: "Удалить группу",
      description: `Группа "${group.title}" будет удалена только если это черновик без учеников, занятий, счетов, посещаемости и домашней работы. Введите УДАЛИТЬ для подтверждения.`,
      confirmText: "Удалить",
      dangerLevel: "danger",
      demoUpdate: () => setGroups((prev) => prev.filter((item) => item.id !== group.id)),
    });
  }

  function openGroupModal(group?: any) {
    setGroupDraft(group ? {
      id: group.id,
      title: group.title,
      course_id: group.course_id || "",
      branch_id: group.branch_id || "",
      room_id: group.room_id || "",
      teacher_id: group.teacher_id || "",
      status: group.status || "active",
      age_from: group.age_from || 6,
      age_to: group.age_to || 14,
      capacity: group.capacity || 8,
      starts_on: group.starts_on || "",
      ends_on: group.ends_on || "",
      price_monthly: group.price_monthly || "",
      show_on_site: group.show_on_site ?? true,
      sort_order: group.sort_order || 100,
    } : { ...emptyGroup });
    setScheduleDraft((group?.group_schedule_rules || []).map((rule: any) => ({
      id: rule.id,
      weekday: rule.weekday,
      starts_at: toTime(rule.starts_at) || "17:00",
      ends_at: toTime(rule.ends_at) || "18:30",
    })));
  }

  async function saveGroup(event: React.FormEvent) {
    event.preventDefault();
    if (!groupDraft) return;
    try {
      setSaving(true);
      const payload = {
        organization_id: org.id,
        title: groupDraft.title,
        course_id: groupDraft.course_id,
        branch_id: groupDraft.branch_id || null,
        room_id: groupDraft.room_id || null,
        teacher_id: groupDraft.teacher_id || null,
        status: groupDraft.status,
        age_from: groupDraft.age_from ? Number(groupDraft.age_from) : null,
        age_to: groupDraft.age_to ? Number(groupDraft.age_to) : null,
        capacity: Number(groupDraft.capacity || 8),
        starts_on: groupDraft.starts_on || null,
        ends_on: groupDraft.ends_on || null,
        price_monthly: groupDraft.price_monthly ? Number(groupDraft.price_monthly) : null,
        show_on_site: groupDraft.show_on_site,
        sort_order: Number(groupDraft.sort_order || 100),
        updated_at: new Date().toISOString(),
      };

      if (demo) {
        const localGroup = {
          ...groupDraft,
          id: groupDraft.id || `demo-group-${Date.now()}`,
          group_schedule_rules: scheduleDraft,
          course: { title: courses.find((course) => course.id === groupDraft.course_id)?.title },
          branch: { name: branches.find((branch) => branch.id === groupDraft.branch_id)?.name },
          room: { name: rooms.find((room) => room.id === groupDraft.room_id)?.name },
          teacher: { full_name: staff.find((person) => person.user_id === groupDraft.teacher_id)?.full_name },
          enrollments: [],
        };
        setGroups((prev) => groupDraft.id ? prev.map((item) => item.id === groupDraft.id ? localGroup : item) : [localGroup, ...prev]);
      } else {
        let groupId = groupDraft.id;
        if (groupDraft.id) {
          const { error: updateError } = await (supabase.from("groups") as any).update(payload).eq("id", groupDraft.id);
          if (updateError) throw updateError;
          await (supabase.from("group_schedule_rules") as any).delete().eq("group_id", groupDraft.id);
        } else {
          const { data: created, error: insertError } = await (supabase.from("groups") as any).insert(payload).select("id").single();
          if (insertError) throw insertError;
          groupId = created.id;
        }

        if (scheduleDraft.length > 0) {
          const rulesPayload = scheduleDraft.map((rule) => ({
            organization_id: org.id,
            group_id: groupId,
            weekday: Number(rule.weekday),
            starts_at: `${rule.starts_at}:00`,
            ends_at: `${rule.ends_at}:00`,
          }));
          const { error: rulesError } = await (supabase.from("group_schedule_rules") as any).insert(rulesPayload);
          if (rulesError) throw rulesError;
        }
        await loadData();
      }
      setGroupDraft(null);
      setScheduleDraft([]);
      setNotice("Группа и расписание сохранены");
    } catch (err: any) {
      setError(err.message || "Не удалось сохранить группу");
    } finally {
      setSaving(false);
    }
  }

  async function closeGroup(group: any) {
    const allowed = await askAction({
      title: "Закрыть набор",
      description: `Группа "${group.title}" останется в истории, но набор и показ на сайте будут закрыты.`,
      dangerLevel: "warning",
      confirmText: "Закрыть набор",
    });
    if (!allowed) return;
    if (demo) {
      setGroups((prev) => prev.map((item) => item.id === group.id ? { ...item, status: "closed", show_on_site: false } : item));
      return;
    }
    const { error: closeError } = await (supabase.from("groups") as any)
      .update({ status: "closed", show_on_site: false, updated_at: new Date().toISOString() })
      .eq("id", group.id);
    if (closeError) setError(closeError.message);
    else await loadData();
  }

  async function saveStaff(event: React.FormEvent) {
    event.preventDefault();
    if (!staffDraft) return;
    try {
      setSaving(true);
      setStaffError("");
      setTemporaryPassword("");
      const endpoint = staffDraft.userId ? "/api/crm/staff/update" : "/api/crm/staff/create";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffDraft),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(staffErrorMessage(payload));
      if (payload.temporaryPassword) setTemporaryPassword(payload.temporaryPassword);
      if (demo) {
        const local = {
          user_id: staffDraft.userId || `demo-staff-${Date.now()}`,
          full_name: staffDraft.fullName,
          email: staffDraft.email,
          phone: staffDraft.phone,
          role: staffDraft.role,
          specialty: staffDraft.specialty,
          public_bio: staffDraft.publicBio,
          internal_comment: staffDraft.internalComment,
          avatar_url: staffDraft.avatarUrl,
          show_on_site: staffDraft.showOnSite,
          sort_order: staffDraft.sortOrder,
          is_active: true,
        };
        setStaff((prev) => staffDraft.userId ? prev.map((item) => item.user_id === staffDraft.userId ? local : item) : [local, ...prev]);
      } else {
        await loadData();
      }
      setStaffDraft(null);
      setNotice("Сотрудник сохранён");
    } catch (err: any) {
      setStaffError(err.message || "Не удалось сохранить сотрудника");
    } finally {
      setSaving(false);
    }
  }

  async function handleStaffAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !staffDraft) return;

    try {
      setUploadingStaffAvatar(true);
      setStaffError("");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "teachers");

      const response = await fetch("/api/crm/media", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Не удалось загрузить фото");
      }

      setStaffDraft((current: any) => current ? { ...current, avatarUrl: payload.path } : current);
      setNotice("Фото сотрудника загружено");
    } catch (err: any) {
      setStaffError(err.message || "Не удалось загрузить фото");
    } finally {
      setUploadingStaffAvatar(false);
    }
  }

  async function resetStaffPassword(person: any) {
    try {
      const response = await fetch("/api/crm/staff/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: org.id, userId: person.user_id }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось сбросить пароль");
      setTemporaryPassword(payload.temporaryPassword);
      setNotice(`Временный пароль для ${person.full_name || person.email}: ${payload.temporaryPassword}`);
    } catch (err: any) {
      setError(err.message || "Не удалось сбросить пароль");
    }
  }

  async function deactivateStaff(person: any) {
    const allowed = await askAction({
      title: "Деактивировать доступ",
      description: `Сотрудник "${person.full_name || person.email}" потеряет доступ к CRM и будет скрыт с сайта.`,
      dangerLevel: "danger",
      confirmText: "Деактивировать",
    });
    if (!allowed) return;
    try {
      const response = await fetch("/api/crm/staff/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: org.id, userId: person.user_id }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось деактивировать доступ");
      if (demo) setStaff((prev) => prev.map((item) => item.user_id === person.user_id ? { ...item, is_active: false, show_on_site: false } : item));
      else await loadData();
      setNotice("Доступ деактивирован");
    } catch (err: any) {
      setError(err.message || "Не удалось деактивировать доступ");
    }
  }

  async function saveAlfabank(event: React.FormEvent) {
    event.preventDefault();
    try {
      setSaving(true);
      const response = await fetch("/api/crm/payment-settings/alfabank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: org.id,
          isEnabled: Boolean(paymentSettings.is_enabled),
          mode: paymentSettings.mode,
          merchantId: paymentSettings.merchant_id,
          terminalId: paymentSettings.terminal_id,
          returnUrl: paymentSettings.return_url,
          failUrl: paymentSettings.fail_url,
          webhookUrl: paymentSettings.webhook_url,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось сохранить Альфабанк");
      setPaymentSecretsConfigured(Boolean(payload.passwordConfigured));
      setNotice("Настройки Альфабанка сохранены");
    } catch (err: any) {
      setError(err.message || "Не удалось сохранить Альфабанк");
    } finally {
      setSaving(false);
    }
  }

  async function saveDiscountAssignment(event: React.FormEvent) {
    event.preventDefault();
    if (!discountAssignmentDraft) return;
    try {
      setSaving(true);
      const payload = {
        organization_id: org.id,
        discount_type_id: discountAssignmentDraft.discount_type_id,
        guardian_id: discountAssignmentDraft.guardian_id || null,
        student_id: discountAssignmentDraft.student_id || null,
        status: "pending" as const,
        comment: discountAssignmentDraft.comment || null,
      };
      if (demo) {
        const localAssignment = {
          ...payload,
          id: `demo-da-${Date.now()}`,
          created_at: new Date().toISOString(),
          discount_type: discountTypes.find((dt) => dt.id === payload.discount_type_id),
          guardian: guardians.find((g) => g.id === payload.guardian_id),
          student: discountStudents.find((s) => s.id === payload.student_id),
          approver: null,
          approved_at: null,
          approved_by: null,
        };
        setDiscountAssignments((prev) => [localAssignment, ...prev]);
      } else {
        const { error: insertError } = await (supabase.from("discount_assignments") as any).insert(payload);
        if (insertError) throw insertError;
        await loadData();
      }
      setDiscountAssignmentDraft(null);
      setNotice("Скидка назначена и ожидает подтверждения");
    } catch (err: any) {
      setError(err.message || "Не удалось назначить скидку");
    } finally {
      setSaving(false);
    }
  }

  async function approveDiscountAssignment(assignment: any) {
    try {
      setSaving(true);
      if (demo) {
        setDiscountAssignments((prev) =>
          prev.map((item) =>
            item.id === assignment.id
              ? { ...item, status: "approved", approved_at: new Date().toISOString(), approver: { full_name: "Администратор" } }
              : item
          )
        );
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error: updateError } = await (supabase.from("discount_assignments") as any)
          .update({
            status: "approved",
            approved_by: user?.id || null,
            approved_at: new Date().toISOString(),
          })
          .eq("id", assignment.id);
        if (updateError) throw updateError;
        await loadData();
      }
      setNotice("Скидка подтверждена");
    } catch (err: any) {
      setError(err.message || "Не удалось подтвердить скидку");
    } finally {
      setSaving(false);
    }
  }

  async function rejectDiscountAssignment(assignment: any) {
    const allowed = await askAction({
      title: "Отклонить скидку",
      description: `Скидка "${assignment.discount_type?.title || ""}" будет отклонена.`,
      dangerLevel: "warning",
      confirmText: "Отклонить",
    });
    if (!allowed) return;
    try {
      setSaving(true);
      if (demo) {
        setDiscountAssignments((prev) =>
          prev.map((item) =>
            item.id === assignment.id
              ? { ...item, status: "rejected", approved_at: new Date().toISOString(), approver: { full_name: "Администратор" } }
              : item
          )
        );
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error: updateError } = await (supabase.from("discount_assignments") as any)
          .update({
            status: "rejected",
            approved_by: user?.id || null,
            approved_at: new Date().toISOString(),
          })
          .eq("id", assignment.id);
        if (updateError) throw updateError;
        await loadData();
      }
      setNotice("Скидка отклонена");
    } catch (err: any) {
      setError(err.message || "Не удалось отклонить скидку");
    } finally {
      setSaving(false);
    }
  }

  function generateClientSecret() {
    const bytes = new Uint8Array(24);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function saveMaxBotSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setNotice("");
      const response = await fetch("/api/crm/bot-settings/max", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isEnabled: Boolean(maxSettings.isEnabled),
          botToken: maxBotToken.trim() || undefined,
          webhookSecret: maxSettings.webhookSecret,
          webhookUrl: maxSettings.webhookUrl,
          botUsername: maxSettings.botUsername,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось сохранить настройки MAX");
      setMaxSettings({
        ...maxSettings,
        ...payload.settings,
        tokenConfigured: Boolean(payload.settings?.tokenConfigured),
      });
      setMaxBotToken("");
      setNotice("Настройки MAX сохранены. Токен скрыт и больше не показывается в интерфейсе.");
    } catch (err: any) {
      setError(err.message || "Не удалось сохранить настройки MAX");
    } finally {
      setSaving(false);
    }
  }

  async function checkMaxBotToken() {
    try {
      setSaving(true);
      setError("");
      setNotice("");
      const response = await fetch("/api/crm/bot-settings/max/check", { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось проверить токен MAX");
      setNotice(`MAX bot доступен${payload.bot?.username ? `: @${payload.bot.username}` : ""}`);
    } catch (err: any) {
      setError(err.message || "Не удалось проверить токен MAX");
    } finally {
      setSaving(false);
    }
  }

  async function subscribeMaxWebhookAction() {
    try {
      setSaving(true);
      setError("");
      setNotice("");
      const response = await fetch("/api/crm/bot-settings/max/subscribe", { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось подписать webhook MAX");
      setNotice("Webhook MAX подписан. Проверьте, что публичный домен работает по HTTPS на 443.");
    } catch (err: any) {
      setError(err.message || "Не удалось подписать webhook MAX");
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { id: "organization", label: "Организация", icon: Building2 },
    { id: "branches", label: "Филиалы и кабинеты", icon: DoorOpen },
    { id: "courses", label: "Направления", icon: BookOpen },
    { id: "groups", label: "Группы и расписание", icon: CalendarClock },
    { id: "staff", label: "Сотрудники и доступы", icon: Users },
    { id: "payments", label: "Платежи → Альфа-Банк", icon: CreditCard },
    { id: "discounts", label: "Скидки", icon: Percent },
    { id: "bots", label: "Боты и уведомления", icon: Bot },
    { id: "system", label: "Системные параметры", icon: Settings },
  ] as const;

  return (
    <div className="settings-page">
      <style>{`
        .settings-page { display: flex; flex-direction: column; gap: 24px; }
        .settings-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .settings-header h1 { font-size: var(--font-h2); font-family: var(--font-geologica); color: var(--color-text); margin: 0 0 4px; }
        .settings-header p { font-size: var(--font-small); color: var(--color-text-muted); margin: 0; line-height: 1.5; }
        .settings-shell { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 24px; align-items: start; }
        .settings-nav { background: #fff; border: 1px solid var(--color-border); border-radius: 12px; padding: 8px; display: grid; gap: 4px; position: sticky; top: 88px; }
        .settings-nav button { border: 0; background: transparent; display: flex; align-items: center; gap: 10px; text-align: left; padding: 11px 12px; border-radius: 8px; color: var(--color-text-muted); font-weight: 650; font-size: 13px; cursor: pointer; }
        .settings-nav button[data-active="true"] { background: var(--color-primary-soft); color: var(--color-primary-dark); }
        .settings-panel { background: #fff; border: 1px solid var(--color-border); border-radius: 12px; padding: 24px; display: grid; gap: 20px; min-width: 0; }
        .settings-panel-title { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; border-bottom: 1px solid var(--color-border); padding-bottom: 16px; }
        .settings-panel-title h2 { margin: 0 0 4px; font-size: 18px; font-weight: 800; }
        .settings-panel-title p { margin: 0; color: var(--color-text-muted); font-size: 13px; line-height: 1.5; }
        .settings-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        .settings-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .settings-card-list { display: grid; gap: 12px; }
        .settings-card { border: 1px solid var(--color-border); border-radius: 10px; padding: 16px; display: grid; gap: 12px; background: #fff; min-width: 0; }
        .settings-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
        .settings-card h3 { margin: 0 0 4px; font-size: 15px; font-weight: 800; }
        .settings-card p { margin: 0; color: var(--color-text-muted); font-size: 12px; line-height: 1.45; }
        .settings-meta { display: flex; flex-wrap: wrap; gap: 8px; color: var(--color-text-muted); font-size: 12px; }
        .settings-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .settings-field { display: grid; gap: 6px; font-size: 12px; font-weight: 750; color: var(--color-text); }
        .settings-field span { color: var(--color-text-muted); }
        .settings-textarea { min-height: 84px; padding: 10px 12px; resize: vertical; }
        .settings-toggle { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: var(--color-text); }
        .settings-toggle input { width: 18px; height: 18px; accent-color: var(--color-primary); }
        .settings-form-actions { display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--color-border); padding-top: 16px; }
        .settings-empty { border: 1px dashed var(--color-border); border-radius: 12px; padding: 28px; text-align: center; color: var(--color-text-muted); font-size: 13px; }
        .settings-alert { border-radius: 10px; padding: 12px 14px; font-size: 13px; font-weight: 700; }
        .settings-alert.ok { background: var(--color-success-soft); color: var(--color-success); }
        .settings-alert.error { background: var(--color-danger-soft); color: var(--color-danger); }
        .settings-modal-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(15, 23, 42, 0.44); display: flex; align-items: center; justify-content: center; padding: 20px; }
        .settings-modal { width: 100%; max-height: 92vh; overflow: auto; background: #fff; border: 1px solid var(--color-border); border-radius: 14px; padding: 22px; box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18); display: grid; gap: 18px; }
        .settings-modal-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--color-border); padding-bottom: 12px; }
        .settings-modal-header h3 { margin: 0; font-size: 17px; font-weight: 800; }
        .settings-modal-header button { border: 0; background: transparent; color: var(--color-text-muted); cursor: pointer; }
        .schedule-row { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 10px; align-items: end; padding: 10px; border: 1px solid var(--color-border); border-radius: 10px; }
        .settings-mini-table { display: grid; gap: 8px; }
        .settings-muted { color: var(--color-text-muted); font-size: 12px; line-height: 1.5; }
        @media (max-width: 980px) {
          .settings-shell { grid-template-columns: 1fr; }
          .settings-nav { position: static; display: flex; overflow-x: auto; }
          .settings-nav button { white-space: nowrap; }
          .settings-grid-3 { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 720px) {
          .settings-header, .settings-panel-title, .settings-card-head { flex-direction: column; align-items: stretch; }
          .settings-grid-2, .settings-grid-3 { grid-template-columns: 1fr; }
          .settings-panel { padding: 16px; }
          .schedule-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="settings-header">
        <div>
          <h1>Настройки системы</h1>
          <p>Операционные справочники EdCRM: филиалы, кабинеты, курсы, группы, сотрудники, доступы и платежи.</p>
        </div>
        {loading && <span className="badge badge-blue">Загрузка</span>}
      </div>

      {notice && <div className="settings-alert ok">{notice}</div>}
      {error && <div className="settings-alert error">{error}</div>}
      {temporaryPassword && <div className="settings-alert ok">Временный пароль: {temporaryPassword}</div>}

      <div className="settings-shell">
        <aside className="settings-nav">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} type="button" data-active={activeTab === tab.id} onClick={() => setTab(tab.id)}>
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        <section className="settings-panel">
          {activeTab === "organization" && (
            <>
              <div className="settings-panel-title">
                <div>
                  <h2>Организация</h2>
                  <p>Основные реквизиты, контакты и часовой пояс школы.</p>
                </div>
              </div>
              <form onSubmit={saveOrganization} className="settings-card-list">
                <div className="settings-grid-2">
                  <Field label="Название организации">
                    <TextInput required value={org.name || ""} onChange={(event) => setOrg({ ...org, name: event.target.value })} />
                  </Field>
                  <Field label="Город">
                    <TextInput required value={org.city || ""} onChange={(event) => setOrg({ ...org, city: event.target.value })} />
                  </Field>
                  <Field label="Часовой пояс">
                    <TextInput required value={org.timezone || "Europe/Moscow"} onChange={(event) => setOrg({ ...org, timezone: event.target.value })} />
                  </Field>
                  <Field label="Основной телефон">
                    <TextInput value={org.phone || ""} onChange={(event) => setOrg({ ...org, phone: event.target.value })} />
                  </Field>
                  <Field label="Основной email">
                    <TextInput type="email" value={org.email || ""} onChange={(event) => setOrg({ ...org, email: event.target.value })} />
                  </Field>
                  <Field label="Юридическое название">
                    <TextInput value={org.legal_name || ""} onChange={(event) => setOrg({ ...org, legal_name: event.target.value })} />
                  </Field>
                  <Field label="ИНН">
                    <TextInput value={org.inn || ""} onChange={(event) => setOrg({ ...org, inn: event.target.value })} />
                  </Field>
                  <Field label="ОГРН">
                    <TextInput value={org.ogrn || ""} onChange={(event) => setOrg({ ...org, ogrn: event.target.value })} />
                  </Field>
                </div>
                <div className="settings-form-actions">
                  <Button type="submit" variant="primary-crm" disabled={saving}>
                    <Save size={16} /> Сохранить
                  </Button>
                </div>
              </form>
            </>
          )}

          {activeTab === "branches" && (
            <>
              <div className="settings-panel-title">
                <div>
                  <h2>Филиалы и кабинеты</h2>
                  <p>Адреса, режим работы, кабинеты и оборудование. Архивные филиалы не появляются в выборе группы.</p>
                </div>
                <Button type="button" variant="primary-crm" onClick={() => setBranchDraft({ ...emptyBranch })}>
                  <Plus size={16} /> Добавить филиал
                </Button>
              </div>
              <div className="settings-card-list">
                {branches.length === 0 && <div className="settings-empty">Филиалы пока не созданы</div>}
                {branches.map((branch) => {
                  const branchRooms = rooms.filter((room) => room.branch_id === branch.id);
                  return (
                    <div key={branch.id} className="settings-card">
                      <div className="settings-card-head">
                        <div>
                          <h3>{branch.name}</h3>
                          <p>{branch.address || "Адрес не указан"}</p>
                        </div>
                        <div className="settings-actions">
                          <span className={`badge ${branch.is_active ? "badge-green" : "badge-gray"}`}>{branch.is_active ? "Активен" : "Архив"}</span>
                          <span className={`badge ${branch.show_on_site ? "badge-blue" : "badge-gray"}`}>{branch.show_on_site ? "На сайте" : "Скрыт"}</span>
                        </div>
                      </div>
                      <div className="settings-meta">
                        <span>{branch.phone || "телефон не указан"}</span>
                        <span>{branch.email || "email не указан"}</span>
                        <span>{branch.work_hours || branch.hours || "режим не указан"}</span>
                        <span>Сортировка: {branch.sort_order}</span>
                      </div>
                      <p>{branch.description || "Описание филиала можно добавить для сайта и менеджеров."}</p>
                      <div className="settings-actions">
                        <Button type="button" variant="secondary-crm" onClick={() => setBranchDraft({ ...emptyBranch, ...branch, work_hours: branch.work_hours || branch.hours || "" })}>Редактировать филиал</Button>
                        <Button type="button" variant="secondary-crm" onClick={() => setRoomDraft({ ...emptyRoom, branch_id: branch.id })}>Добавить кабинет</Button>
                        {branch.is_active ? (
                          <Button type="button" variant="secondary-crm" onClick={() => archiveBranch(branch)}><Archive size={14} /> Архивировать</Button>
                        ) : (
                          <Button type="button" variant="secondary-crm" onClick={() => restoreBranch(branch)}><RotateCcw size={14} /> Восстановить</Button>
                        )}
                        <Button type="button" variant="secondary-crm" onClick={() => deleteBranch(branch)}><Trash2 size={14} /> Удалить</Button>
                      </div>
                      <div className="settings-mini-table">
                        {branchRooms.map((room) => (
                          <div key={room.id} className="settings-card" style={{ padding: 12 }}>
                            <div className="settings-card-head">
                              <div>
                                <h3>{room.name}</h3>
                                <p>Вместимость: {room.capacity || "не указана"} · {room.equipment || "оборудование не указано"}</p>
                              </div>
                              <div className="settings-actions">
                                <span className={`badge ${room.is_active ? "badge-green" : "badge-gray"}`}>{room.is_active ? "Активен" : "Архив"}</span>
                                <Button type="button" variant="secondary-crm" onClick={() => setRoomDraft({ ...emptyRoom, ...room })}>Редактировать</Button>
                                {room.is_active ? (
                                  <Button type="button" variant="secondary-crm" onClick={() => archiveRoom(room)}>Архивировать</Button>
                                ) : (
                                  <Button type="button" variant="secondary-crm" onClick={() => restoreRoom(room)}>Восстановить</Button>
                                )}
                                <Button type="button" variant="secondary-crm" onClick={() => deleteRoom(room)}>Удалить</Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === "courses" && (
            <>
              <div className="settings-panel-title">
                <div>
                  <h2>Направления</h2>
                  <p>Единый источник курсов, цен и SEO. Сайт и форма заявки используют эти же записи.</p>
                </div>
                <Button type="button" variant="primary-crm" onClick={() => setCourseDraft({ ...emptyCourse })}>
                  <Plus size={16} /> Добавить направление
                </Button>
              </div>
              <div className="settings-card-list">
                {courses.map((course) => (
                  <div key={course.id} className="settings-card">
                    <div className="settings-card-head">
                      <div>
                        <h3>{course.title}</h3>
                        <p>{course.short_description || "Краткое описание не заполнено"}</p>
                      </div>
                      <div className="settings-actions">
                        <span className={`badge ${course.is_active ? "badge-green" : "badge-gray"}`}>{course.is_active ? "Активен" : "Архив"}</span>
                        <span className={`badge ${course.is_public ? "badge-blue" : "badge-gray"}`}>{course.is_public ? "На сайте" : "Скрыт"}</span>
                      </div>
                    </div>
                    <div className="settings-meta">
                      <span>Slug: {course.slug}</span>
                      <span>{course.min_age || 6}-{course.max_age || 14} лет</span>
                      <span>{course.duration_minutes || 90} мин</span>
                      <span>{formatMoney(course.price_monthly)}</span>
                      <span>Сортировка: {course.sort_order}</span>
                    </div>
                    <div className="settings-actions">
                      <Button type="button" variant="secondary-crm" onClick={() => setCourseDraft({ ...emptyCourse, ...course })}>Редактировать</Button>
                      <Button type="button" variant="secondary-crm" onClick={() => setCourseDraft({ ...emptyCourse, ...course, is_public: false })}><EyeOff size={14} /> Скрыть с сайта</Button>
                      {course.is_active ? (
                        <Button type="button" variant="secondary-crm" onClick={() => archiveCourse(course)}><Archive size={14} /> Архивировать</Button>
                      ) : (
                        <Button type="button" variant="secondary-crm" onClick={() => restoreCourse(course)}><RotateCcw size={14} /> Восстановить</Button>
                      )}
                      <Button type="button" variant="secondary-crm" onClick={() => deleteCourse(course)}><Trash2 size={14} /> Удалить</Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === "groups" && (
            <>
              <div className="settings-panel-title">
                <div>
                  <h2>Группы и расписание</h2>
                  <p>Группа связана с курсом, филиалом, кабинетом и преподавателем. Расписание хранится структурно.</p>
                </div>
                <Button type="button" variant="primary-crm" onClick={() => openGroupModal()}>
                  <Plus size={16} /> Создать группу
                </Button>
              </div>
              <div className="settings-actions" style={{ justifyContent: "flex-start", marginBottom: 12 }}>
                <Toggle checked={showArchivedGroups} onChange={setShowArchivedGroups} label="Показать архив" />
              </div>
              <div className="settings-card-list">
                {visibleGroups.map((group) => {
                  const activeEnrollments = group.enrollments?.filter((enrollment: any) => enrollment.status === "active").length || 0;
                  const freePlaces = Math.max(0, Number(group.capacity || 0) - activeEnrollments);
                  const isArchived = Boolean(group.archived_at);
                  return (
                    <div key={group.id} className="settings-card">
                      <div className="settings-card-head">
                        <div>
                          <h3>{group.title}</h3>
                          <p>{group.course?.title || "Курс не выбран"} · {group.branch?.name || "филиал не выбран"} · {group.room?.name || "кабинет не выбран"}</p>
                        </div>
                        <div className="settings-actions">
                          <span className={`badge ${isArchived ? "badge-gray" : group.status === "active" ? "badge-green" : group.status === "closed" ? "badge-red" : "badge-gray"}`}>{isArchived ? "Архив" : group.status}</span>
                          <span className={`badge ${group.show_on_site ? "badge-blue" : "badge-gray"}`}>{group.show_on_site ? "На сайте" : "Скрыта"}</span>
                        </div>
                      </div>
                      <div className="settings-meta">
                        <span>Преподаватель: {group.teacher?.full_name || "не назначен"}</span>
                        <span>Возраст: {group.age_from || "?"}-{group.age_to || "?"}</span>
                        <span>Места: {activeEnrollments}/{group.capacity} · свободно {freePlaces}</span>
                        <span>Цена: {group.price_monthly ? formatMoney(group.price_monthly) : `курс ${formatMoney(group.course?.price_monthly)}`}</span>
                      </div>
                      <div className="settings-meta">
                        {(group.group_schedule_rules || []).map((rule: any) => <span key={rule.id || `${rule.weekday}-${rule.starts_at}`} className="badge badge-gray">{ruleLabel(rule)}</span>)}
                      </div>
                      <div className="settings-actions">
                        <Button type="button" variant="secondary-crm" onClick={() => openGroupModal(group)}>Редактировать</Button>
                        <Button type="button" variant="secondary-crm" onClick={() => closeGroup(group)}>Закрыть набор</Button>
                        {isArchived ? (
                          <Button type="button" variant="secondary-crm" onClick={() => restoreGroup(group)}><RotateCcw size={14} /> Восстановить</Button>
                        ) : (
                          <Button type="button" variant="secondary-crm" onClick={() => archiveGroup(group)}><Archive size={14} /> Архивировать</Button>
                        )}
                        <Button type="button" variant="secondary-crm" onClick={() => deleteGroup(group)}><Trash2 size={14} /> Удалить</Button>
                        <Button type="button" variant="secondary-crm" onClick={() => window.location.href = `/crm/groups?open=${group.id}`}><Users size={14} /> Ученики</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === "staff" && (
            <>
              <div className="settings-panel-title">
                <div>
                  <h2>Сотрудники и доступы</h2>
                  <p>Профили, роли и доступы создаются через Supabase Auth и `org_memberships`.</p>
                </div>
                <Button type="button" variant="primary-crm" onClick={() => setStaffDraft({ ...emptyStaff })}>
                  <UserPlus size={16} /> Добавить сотрудника
                </Button>
              </div>
              <div className="settings-card-list">
                {staff.map((person) => (
                  <div key={person.user_id} className="settings-card">
                    <div className="settings-card-head">
                      <div>
                        <h3>{person.full_name || person.email || "Без имени"}</h3>
                        <p>{person.email || "email не указан"} · {person.phone || "телефон не указан"}</p>
                      </div>
                      <div className="settings-actions">
                        <span className="badge badge-blue">{roleLabels[person.role] || person.role}</span>
                        <span className={`badge ${person.is_active ? "badge-green" : "badge-gray"}`}>{person.is_active ? "Доступ активен" : "Доступ выключен"}</span>
                        <span className={`badge ${person.show_on_site ? "badge-green" : "badge-gray"}`}>{person.show_on_site ? "На сайте" : "Скрыт"}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", margin: "8px 0" }}>
                      <p style={{ fontSize: "13px", color: "var(--color-text)", margin: 0 }}>
                        <strong>Специализация:</strong> {person.specialty || "не указана"}
                      </p>
                      <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: 0 }}>
                        <strong>О себе на сайте:</strong> {person.public_bio ? (person.public_bio.length > 120 ? person.public_bio.slice(0, 120) + "..." : person.public_bio) : "нет описания"}
                      </p>
                    </div>
                    <div className="settings-actions">
                      <Button
                        type="button"
                        variant="secondary-crm"
                        onClick={() => setStaffDraft({
                          userId: person.user_id,
                          email: person.email || "",
                          fullName: person.full_name || "",
                          phone: person.phone || "",
                          role: person.role,
                          specialty: person.specialty || "",
                          publicBio: person.public_bio || "",
                          internalComment: person.internal_comment || "",
                          avatarUrl: person.avatar_url || "",
                          showOnSite: Boolean(person.show_on_site),
                          sortOrder: person.sort_order || 100,
                        })}
                      >
                        Редактировать
                      </Button>
                      <Button type="button" variant="secondary-crm" onClick={() => resetStaffPassword(person)}><KeyRound size={14} /> Сбросить пароль</Button>
                      <Button type="button" variant="secondary-crm" onClick={() => deactivateStaff(person)}><ShieldCheck size={14} /> Деактивировать</Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === "payments" && (
            <>
              <div className="settings-panel-title">
                <div>
                  <h2>Платежи</h2>
                  <p>Ручные оплаты остаются в CRM. Единственный онлайн-эквайринг MVP: Альфабанк.</p>
                </div>
              </div>
              <div className="settings-card">
                <div className="settings-card-head">
                  <div>
                    <h3><Banknote size={16} /> Ручные оплаты</h3>
                    <p>Наличные, перевод или терминал отмечаются менеджером в разделе `/crm/payments`.</p>
                  </div>
                  <span className="badge badge-green">Включено</span>
                </div>
              </div>
              <form onSubmit={saveAlfabank} className="settings-card-list">
                <div className="settings-card">
                  <div className="settings-card-head">
                    <div>
                      <h3>Альфабанк эквайринг</h3>
                      <p>Секретные ключи хранятся только в server env. В CRM виден только статус настройки.</p>
                    </div>
                    <span className={`badge ${paymentSecretsConfigured ? "badge-green" : "badge-amber"}`}>
                      {paymentSecretsConfigured ? "Ключи настроены" : "Ключи не настроены"}
                    </span>
                  </div>
                  <div className="settings-grid-2">
                    <Toggle checked={Boolean(paymentSettings?.is_enabled)} onChange={(checked) => setPaymentSettings({ ...paymentSettings, is_enabled: checked })} label="Включить онлайн-оплату" />
                    <Field label="Режим">
                      <SelectInput value={paymentSettings?.mode || "test"} onChange={(event) => setPaymentSettings({ ...paymentSettings, mode: event.target.value })}>
                        <option value="test">test</option>
                        <option value="live">live</option>
                      </SelectInput>
                    </Field>
                    <Field label="merchant_id">
                      <TextInput value={paymentSettings?.merchant_id || ""} onChange={(event) => setPaymentSettings({ ...paymentSettings, merchant_id: event.target.value })} />
                    </Field>
                    <Field label="terminal_id">
                      <TextInput value={paymentSettings?.terminal_id || ""} onChange={(event) => setPaymentSettings({ ...paymentSettings, terminal_id: event.target.value })} />
                    </Field>
                    <Field label="return_url">
                      <TextInput value={paymentSettings?.return_url || ""} onChange={(event) => setPaymentSettings({ ...paymentSettings, return_url: event.target.value })} />
                    </Field>
                    <Field label="fail_url">
                      <TextInput value={paymentSettings?.fail_url || ""} onChange={(event) => setPaymentSettings({ ...paymentSettings, fail_url: event.target.value })} />
                    </Field>
                    <Field label="webhook_url">
                      <TextInput value={paymentSettings?.webhook_url || ""} onChange={(event) => setPaymentSettings({ ...paymentSettings, webhook_url: event.target.value })} />
                    </Field>
                    <div className="settings-muted">
                      Последняя проверка: {paymentSettings?.settings?.lastCheckedAt ? new Date(paymentSettings.settings.lastCheckedAt).toLocaleString("ru-RU") : "еще не выполнялась"}
                    </div>
                  </div>
                  <div className="settings-form-actions">
                    <Button type="button" variant="secondary-crm" onClick={() => setNotice(paymentSecretsConfigured ? "Серверные ключи Альфабанка найдены" : "Серверные ключи Альфабанка не найдены")}>
                      <CheckCircle2 size={16} /> Проверить подключение
                    </Button>
                    <Button type="submit" variant="primary-crm" disabled={saving}>
                      <Save size={16} /> Сохранить Альфабанк
                    </Button>
                  </div>
                </div>
              </form>
            </>
          )}


          {activeTab === "discounts" && (
            <>
              <div className="settings-panel-title">
                <div>
                  <h2>Скидки</h2>
                  <p>Типы скидок и назначения скидок ученикам / родителям.</p>
                </div>
                <Button variant="primary-crm" onClick={() => setDiscountAssignmentDraft({ discount_type_id: "", guardian_id: "", student_id: "", comment: "" })}>
                  <Plus size={16} /> Назначить скидку
                </Button>
              </div>

              {/* Discount Types */}
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px", color: "var(--color-text)" }}>Доступные типы скидок</h3>
                <div style={{ overflowX: "auto" }}>
                  <table className="settings-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 700 }}>Название</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 700 }}>Код</th>
                        <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 700 }}>Процент</th>
                        <th style={{ textAlign: "center", padding: "8px 12px", fontWeight: 700 }}>Разовая</th>
                        <th style={{ textAlign: "center", padding: "8px 12px", fontWeight: 700 }}>Активна</th>
                      </tr>
                    </thead>
                    <tbody>
                      {discountTypes.map((dt: any) => (
                        <tr key={dt.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <td style={{ padding: "10px 12px" }}>{dt.title}</td>
                          <td style={{ padding: "10px 12px" }}><code style={{ background: "#F3F4F6", padding: "2px 6px", borderRadius: "4px", fontSize: "12px" }}>{dt.code}</code></td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "var(--color-primary)" }}>{dt.percent}%</td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>{dt.is_one_time ? "✓" : "—"}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>{dt.is_active ? <span className="badge badge-green">Да</span> : <span className="badge badge-gray">Нет</span>}</td>
                        </tr>
                      ))}
                      {discountTypes.length === 0 && (
                        <tr><td colSpan={5} style={{ textAlign: "center", padding: "20px", color: "var(--color-text-muted)" }}>Типы скидок не настроены.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Discount Assignments */}
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px", color: "var(--color-text)" }}>Назначенные скидки</h3>
                <div style={{ overflowX: "auto" }}>
                  <table className="settings-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 700 }}>Тип</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 700 }}>Родитель</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 700 }}>Ученик</th>
                        <th style={{ textAlign: "center", padding: "8px 12px", fontWeight: 700 }}>Статус</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 700 }}>Комментарий</th>
                        <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 700 }}>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {discountAssignments.map((da: any) => {
                        const dt = Array.isArray(da.discount_type) ? da.discount_type[0] : da.discount_type;
                        const guardian = Array.isArray(da.guardian) ? da.guardian[0] : da.guardian;
                        const student = Array.isArray(da.student) ? da.student[0] : da.student;
                        const statusBadge: Record<string, string> = { pending: "badge-amber", approved: "badge-green", rejected: "badge-red" };
                        const statusLabel: Record<string, string> = { pending: "Ожидает", approved: "Одобрена", rejected: "Отклонена" };

                        return (
                          <tr key={da.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                            <td style={{ padding: "10px 12px" }}>{dt?.title || "—"} <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>({dt?.percent || 0}%)</span></td>
                            <td style={{ padding: "10px 12px" }}>{guardian?.full_name || "—"}</td>
                            <td style={{ padding: "10px 12px" }}>{student?.full_name || "—"}</td>
                            <td style={{ padding: "10px 12px", textAlign: "center" }}><span className={`badge ${statusBadge[da.status] || "badge-gray"}`}>{statusLabel[da.status] || da.status}</span></td>
                            <td style={{ padding: "10px 12px", fontSize: "12px", color: "var(--color-text-muted)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{da.comment || ""}</td>
                            <td style={{ padding: "10px 12px", textAlign: "right" }}>
                              {da.status === "pending" && (
                                <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                  <Button variant="primary-crm" style={{ padding: "4px 10px", fontSize: "12px" }}
                                    onClick={async () => {
                                      try {
                                        setSaving(true);
                                        const { data: userData } = await supabase.auth.getUser();
                                        const { error: err } = await (supabase.from("discount_assignments") as any)
                                          .update({ status: "approved", approved_by: userData.user?.id || null, approved_at: new Date().toISOString() })
                                          .eq("id", da.id);
                                        if (err) throw err;
                                        setNotice("Скидка одобрена");
                                        loadData();
                                      } catch (e: any) { setError(e.message); } finally { setSaving(false); }
                                    }}
                                  >
                                    <CheckCircle2 size={12} /> Одобрить
                                  </Button>
                                  <Button variant="secondary-crm" style={{ padding: "4px 10px", fontSize: "12px", color: "#EF4444" }}
                                    onClick={async () => {
                                      try {
                                        setSaving(true);
                                        const { data: userData } = await supabase.auth.getUser();
                                        const { error: err } = await (supabase.from("discount_assignments") as any)
                                          .update({ status: "rejected", approved_by: userData.user?.id || null, approved_at: new Date().toISOString() })
                                          .eq("id", da.id);
                                        if (err) throw err;
                                        setNotice("Скидка отклонена");
                                        loadData();
                                      } catch (e: any) { setError(e.message); } finally { setSaving(false); }
                                    }}
                                  >
                                    <X size={12} /> Отклонить
                                  </Button>
                                </div>
                              )}
                              {da.status !== "pending" && (
                                <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                                  {da.approved_at ? new Date(da.approved_at).toLocaleDateString("ru-RU") : ""}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {discountAssignments.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: "center", padding: "20px", color: "var(--color-text-muted)" }}>Назначенных скидок пока нет.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* New Assignment Modal */}
              {discountAssignmentDraft && (
                <Modal title="Назначить скидку" onClose={() => setDiscountAssignmentDraft(null)}>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      setSaving(true);
                      const { error: insertErr } = await (supabase.from("discount_assignments") as any).insert({
                        organization_id: org.id,
                        discount_type_id: discountAssignmentDraft.discount_type_id,
                        guardian_id: discountAssignmentDraft.guardian_id || null,
                        student_id: discountAssignmentDraft.student_id || null,
                        status: "pending",
                        comment: discountAssignmentDraft.comment || null,
                      });
                      if (insertErr) throw insertErr;
                      setNotice("Скидка назначена и ожидает одобрения");
                      setDiscountAssignmentDraft(null);
                      loadData();
                    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
                  }} style={{ display: "grid", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Тип скидки *</label>
                      <select value={discountAssignmentDraft.discount_type_id} onChange={(e) => setDiscountAssignmentDraft({ ...discountAssignmentDraft, discount_type_id: e.target.value })} required className="settings-input">
                        <option value="">Выберите тип скидки</option>
                        {discountTypes.filter((dt: any) => dt.is_active).map((dt: any) => (
                          <option key={dt.id} value={dt.id}>{dt.title} ({dt.percent}%)</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Родитель</label>
                      <select value={discountAssignmentDraft.guardian_id} onChange={(e) => setDiscountAssignmentDraft({ ...discountAssignmentDraft, guardian_id: e.target.value })} className="settings-input">
                        <option value="">Не указан</option>
                        {guardians.map((g: any) => (
                          <option key={g.id} value={g.id}>{g.full_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Ученик</label>
                      <select value={discountAssignmentDraft.student_id} onChange={(e) => setDiscountAssignmentDraft({ ...discountAssignmentDraft, student_id: e.target.value })} className="settings-input">
                        <option value="">Не указан</option>
                        {discountStudents.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.full_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Комментарий</label>
                      <input type="text" className="settings-input" value={discountAssignmentDraft.comment} onChange={(e) => setDiscountAssignmentDraft({ ...discountAssignmentDraft, comment: e.target.value })} placeholder="Например: документ №123 от 01.01.2026" />
                    </div>
                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                      <Button variant="secondary-crm" type="button" onClick={() => setDiscountAssignmentDraft(null)}>Отмена</Button>
                      <Button variant="primary-crm" type="submit" disabled={saving || !discountAssignmentDraft.discount_type_id}>
                        <Tag size={16} /> Назначить
                      </Button>
                    </div>
                  </form>
                </Modal>
              )}
            </>
          )}

          {activeTab === "bots" && (
            <>
              <div className="settings-panel-title">
                <div>
                  <h2>Боты и уведомления</h2>
                  <p>MAX MVP: привязка родителя по телефону, webhook и отправка ссылок на оплату из notification_outbox.</p>
                </div>
                <span className={`badge ${maxSettings.tokenConfigured ? "badge-green" : "badge-amber"}`}>
                  {maxSettings.tokenConfigured ? "Токен настроен" : "Токен не задан"}
                </span>
              </div>

              <form onSubmit={saveMaxBotSettings} className="settings-card-list">
                <div className="settings-card">
                  <div className="settings-card-head">
                    <div>
                      <h3><MessageCircle size={16} /> MAX</h3>
                      <p>Сохраненный bot token не показывается повторно. Для webhook MAX должен видеть HTTPS endpoint на 443.</p>
                    </div>
                    <span className={`badge ${maxSettings.isEnabled ? "badge-green" : "badge-gray"}`}>
                      {maxSettings.isEnabled ? "Включен" : "Выключен"}
                    </span>
                  </div>

                  <div className="settings-grid-2">
                    <Toggle checked={Boolean(maxSettings.isEnabled)} onChange={(checked) => setMaxSettings({ ...maxSettings, isEnabled: checked })} label="Включить MAX уведомления" />
                    <div className="settings-muted">
                      Статус токена: {maxSettings.tokenConfigured ? "сохранен на сервере" : "не сохранен"}
                    </div>
                    <Field label="Новый bot token">
                      <TextInput
                        type="password"
                        value={maxBotToken}
                        autoComplete="new-password"
                        placeholder={maxSettings.tokenConfigured ? "Оставьте пустым, чтобы не менять" : "Вставьте токен MAX"}
                        onChange={(event) => setMaxBotToken(event.target.value)}
                      />
                    </Field>
                    <Field label="Bot username">
                      <TextInput value={maxSettings.botUsername || ""} onChange={(event) => setMaxSettings({ ...maxSettings, botUsername: event.target.value })} />
                    </Field>
                    <Field label="Webhook secret">
                      <div className="settings-actions" style={{ alignItems: "stretch" }}>
                        <TextInput style={{ flex: 1 }} value={maxSettings.webhookSecret || ""} onChange={(event) => setMaxSettings({ ...maxSettings, webhookSecret: event.target.value })} />
                        <Button type="button" variant="secondary-crm" onClick={() => setMaxSettings({ ...maxSettings, webhookSecret: generateClientSecret() })}>Сгенерировать</Button>
                      </div>
                    </Field>
                    <Field label="Webhook URL">
                      <TextInput value={maxSettings.webhookUrl || ""} onChange={(event) => setMaxSettings({ ...maxSettings, webhookUrl: event.target.value })} />
                    </Field>
                  </div>

                  <div className="settings-form-actions">
                    <Button type="button" variant="secondary-crm" onClick={checkMaxBotToken} disabled={saving || !maxSettings.tokenConfigured}>
                      <CheckCircle2 size={16} /> Проверить токен
                    </Button>
                    <Button type="button" variant="secondary-crm" onClick={subscribeMaxWebhookAction} disabled={saving || !maxSettings.tokenConfigured || !maxSettings.webhookUrl || !maxSettings.webhookSecret}>
                      <LinkIcon size={16} /> Подписать webhook
                    </Button>
                    <Button type="button" variant="secondary-crm" disabled title="Станет доступно после привязки тестового MAX аккаунта">
                      Отправить тест
                    </Button>
                    <Button type="submit" variant="primary-crm" disabled={saving}>
                      <Save size={16} /> Сохранить MAX
                    </Button>
                  </div>
                </div>
              </form>
            </>
          )}

          {activeTab === "system" && (
            <>
              <div className="settings-panel-title">
                <div>
                  <h2>Системные параметры</h2>
                  <p>Служебные признаки окружения и ссылки на связанные разделы.</p>
                </div>
              </div>
              <div className="settings-grid-2">
                <div className="settings-card">
                  <h3>Режим данных</h3>
                  <p>{demo ? "Demo mode: Supabase env не настроен или включен NEXT_PUBLIC_DEMO_MODE." : "Реальный Supabase подключен."}</p>
                </div>
                <div className="settings-card">
                  <h3>Редактор сайта</h3>
                  <p>Тексты, SEO, фотографии и визуальные блоки редактируются в `/crm/site`.</p>
                  <Button type="button" variant="secondary-crm" onClick={() => window.location.href = "/crm/site"}><LinkIcon size={14} /> Перейти</Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {branchDraft && (
        <Modal title={branchDraft.id ? "Редактировать филиал" : "Новый филиал"} onClose={() => setBranchDraft(null)}>
          <form onSubmit={saveBranch} className="settings-card-list">
            <div className="settings-grid-2">
              <Field label="Название"><TextInput required value={branchDraft.name} onChange={(e) => setBranchDraft({ ...branchDraft, name: e.target.value })} /></Field>
              <Field label="Порядок"><TextInput type="number" value={branchDraft.sort_order} onChange={(e) => setBranchDraft({ ...branchDraft, sort_order: e.target.value })} /></Field>
              <Field label="Адрес"><TextInput value={branchDraft.address || ""} onChange={(e) => setBranchDraft({ ...branchDraft, address: e.target.value })} /></Field>
              <Field label="Телефон"><TextInput value={branchDraft.phone || ""} onChange={(e) => setBranchDraft({ ...branchDraft, phone: e.target.value })} /></Field>
              <Field label="Email"><TextInput type="email" value={branchDraft.email || ""} onChange={(e) => setBranchDraft({ ...branchDraft, email: e.target.value })} /></Field>
              <Field label="Режим работы"><TextInput value={branchDraft.work_hours || ""} onChange={(e) => setBranchDraft({ ...branchDraft, work_hours: e.target.value })} /></Field>
              <Field label="Ссылка на точку Яндекс.Карт">
                <TextInput
                  type="url"
                  value={branchDraft.map_url || ""}
                  onChange={(e) => setBranchDraft({ ...branchDraft, map_url: e.target.value })}
                  placeholder="https://yandex.ru/maps/?ll=39.4900857%2C52.596328&z=16"
                />
              </Field>
            </div>
            <Field label="Описание"><TextArea value={branchDraft.description || ""} onChange={(e) => setBranchDraft({ ...branchDraft, description: e.target.value })} /></Field>
            <div className="settings-actions">
              <Toggle checked={branchDraft.is_active} onChange={(checked) => setBranchDraft({ ...branchDraft, is_active: checked })} label="Активен" />
              <Toggle checked={branchDraft.show_on_site} onChange={(checked) => setBranchDraft({ ...branchDraft, show_on_site: checked })} label="Показывать на сайте" />
            </div>
            <div className="settings-form-actions"><Button type="submit" variant="primary-crm" disabled={saving}>Сохранить филиал</Button></div>
          </form>
        </Modal>
      )}

      {roomDraft && (
        <Modal title={roomDraft.id ? "Редактировать кабинет" : "Новый кабинет"} onClose={() => setRoomDraft(null)}>
          <form onSubmit={saveRoom} className="settings-card-list">
            <div className="settings-grid-2">
              <Field label="Филиал">
                <SelectInput required value={roomDraft.branch_id || ""} onChange={(e) => setRoomDraft({ ...roomDraft, branch_id: e.target.value })}>
                  <option value="">Выберите филиал</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </SelectInput>
              </Field>
              <Field label="Название"><TextInput required value={roomDraft.name} onChange={(e) => setRoomDraft({ ...roomDraft, name: e.target.value })} /></Field>
              <Field label="Вместимость"><TextInput type="number" value={roomDraft.capacity || 8} onChange={(e) => setRoomDraft({ ...roomDraft, capacity: e.target.value })} /></Field>
              <Field label="Оборудование"><TextInput value={roomDraft.equipment || ""} onChange={(e) => setRoomDraft({ ...roomDraft, equipment: e.target.value })} /></Field>
            </div>
            <Field label="Описание"><TextArea value={roomDraft.description || ""} onChange={(e) => setRoomDraft({ ...roomDraft, description: e.target.value })} /></Field>
            <Toggle checked={roomDraft.is_active} onChange={(checked) => setRoomDraft({ ...roomDraft, is_active: checked })} label="Активен" />
            <div className="settings-form-actions"><Button type="submit" variant="primary-crm" disabled={saving}>Сохранить кабинет</Button></div>
          </form>
        </Modal>
      )}

      {courseDraft && (
        <Modal title={courseDraft.id ? "Редактировать направление" : "Новое направление"} onClose={() => setCourseDraft(null)} width={820}>
          <form onSubmit={saveCourse} className="settings-card-list">
            <div className="settings-grid-2">
              <Field label="Название"><TextInput required value={courseDraft.title} onChange={(e) => setCourseDraft({ ...courseDraft, title: e.target.value, slug: courseDraft.slug || slugify(e.target.value) })} /></Field>
              <Field label="Slug"><TextInput required value={courseDraft.slug} onChange={(e) => setCourseDraft({ ...courseDraft, slug: e.target.value })} /></Field>
              <Field label="Возраст от"><TextInput type="number" value={courseDraft.min_age || ""} onChange={(e) => setCourseDraft({ ...courseDraft, min_age: e.target.value })} /></Field>
              <Field label="Возраст до"><TextInput type="number" value={courseDraft.max_age || ""} onChange={(e) => setCourseDraft({ ...courseDraft, max_age: e.target.value })} /></Field>
              <Field label="Длительность, мин"><TextInput type="number" value={courseDraft.duration_minutes || 90} onChange={(e) => setCourseDraft({ ...courseDraft, duration_minutes: e.target.value })} /></Field>
              <Field label="Цена в месяц"><TextInput type="number" value={courseDraft.price_monthly || ""} onChange={(e) => setCourseDraft({ ...courseDraft, price_monthly: e.target.value })} /></Field>
              <Field label="Порядок"><TextInput type="number" value={courseDraft.sort_order || 100} onChange={(e) => setCourseDraft({ ...courseDraft, sort_order: e.target.value })} /></Field>
              <Field label="SEO title"><TextInput value={courseDraft.seo_title || ""} onChange={(e) => setCourseDraft({ ...courseDraft, seo_title: e.target.value })} /></Field>
            </div>
            <Field label="Краткое описание"><TextArea value={courseDraft.short_description || ""} onChange={(e) => setCourseDraft({ ...courseDraft, short_description: e.target.value })} /></Field>
            <Field label="Полное описание"><TextArea value={courseDraft.full_description || ""} onChange={(e) => setCourseDraft({ ...courseDraft, full_description: e.target.value })} /></Field>
            <Field label="SEO description"><TextArea value={courseDraft.seo_description || ""} onChange={(e) => setCourseDraft({ ...courseDraft, seo_description: e.target.value })} /></Field>
            <div className="settings-card">
              <div className="settings-card-head">
                <div>
                  <h3>Фон карточки курса</h3>
                  <p>Файл хранится в media/course-cards, а в курсе — только путь.</p>
                </div>
                {courseDraft.card_image_url && (
                  <Button type="button" variant="secondary-crm" onClick={() => setCourseDraft({ ...courseDraft, card_image_url: "", card_image_alt: "" })}>Очистить</Button>
                )}
              </div>
              {courseDraft.card_image_url && (
                <img src={getMediaUrl(courseDraft.card_image_url)} alt={courseDraft.card_image_alt || courseDraft.title || "Фон карточки курса"} style={{ width: "100%", height: "220px", objectFit: "cover", borderRadius: "12px" }} />
              )}
              <div className="settings-grid-2">
                <Field label="Путь / URL изображения"><TextInput value={courseDraft.card_image_url || ""} onChange={(e) => setCourseDraft({ ...courseDraft, card_image_url: e.target.value })} placeholder="course-cards/robotics.webp" /></Field>
                <Field label="Описание изображения"><TextInput value={courseDraft.card_image_alt || ""} onChange={(e) => setCourseDraft({ ...courseDraft, card_image_alt: e.target.value })} /></Field>
              </div>
              <label className="btn btn-secondary-crm" style={{ alignSelf: "flex-start", cursor: uploadingCourseImage ? "wait" : "pointer" }}>
                <Upload size={16} /> {uploadingCourseImage ? "Загрузка..." : "Загрузить в media"}
                <input type="file" accept="image/*" hidden disabled={uploadingCourseImage} onChange={handleCourseImageUpload} />
              </label>
            </div>
            <div className="settings-actions">
              <Toggle checked={courseDraft.is_public} onChange={(checked) => setCourseDraft({ ...courseDraft, is_public: checked })} label="Показывать на сайте" />
              <Toggle checked={courseDraft.is_active} onChange={(checked) => setCourseDraft({ ...courseDraft, is_active: checked })} label="Активен" />
            </div>
            <div className="settings-form-actions"><Button type="submit" variant="primary-crm" disabled={saving}>Сохранить направление</Button></div>
          </form>
        </Modal>
      )}

      {groupDraft && (
        <Modal title={groupDraft.id ? "Редактировать группу" : "Новая группа"} onClose={() => setGroupDraft(null)} width={880}>
          <form onSubmit={saveGroup} className="settings-card-list">
            <div className="settings-grid-3">
              <Field label="Название"><TextInput required value={groupDraft.title} onChange={(e) => setGroupDraft({ ...groupDraft, title: e.target.value })} /></Field>
              <Field label="Курс">
                <SelectInput required value={groupDraft.course_id} onChange={(e) => setGroupDraft({ ...groupDraft, course_id: e.target.value })}>
                  <option value="">Выберите курс</option>
                  {activeCourses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                </SelectInput>
              </Field>
              <Field label="Статус">
                <SelectInput value={groupDraft.status} onChange={(e) => setGroupDraft({ ...groupDraft, status: e.target.value })}>
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="closed">closed</option>
                </SelectInput>
              </Field>
              <Field label="Филиал">
                <SelectInput value={groupDraft.branch_id || ""} onChange={(e) => setGroupDraft({ ...groupDraft, branch_id: e.target.value, room_id: "" })}>
                  <option value="">Выберите филиал</option>
                  {activeBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </SelectInput>
              </Field>
              <Field label="Кабинет">
                <SelectInput value={groupDraft.room_id || ""} onChange={(e) => setGroupDraft({ ...groupDraft, room_id: e.target.value })}>
                  <option value="">Выберите кабинет</option>
                  {activeRooms.filter((room) => !groupDraft.branch_id || room.branch_id === groupDraft.branch_id).map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
                </SelectInput>
              </Field>
              <Field label="Преподаватель">
                <SelectInput value={groupDraft.teacher_id || ""} onChange={(e) => setGroupDraft({ ...groupDraft, teacher_id: e.target.value })}>
                  <option value="">Не назначен</option>
                  {teacherStaff.map((person) => <option key={person.user_id} value={person.user_id}>{person.full_name || person.email}</option>)}
                </SelectInput>
              </Field>
              <Field label="Возраст от"><TextInput type="number" value={groupDraft.age_from || ""} onChange={(e) => setGroupDraft({ ...groupDraft, age_from: e.target.value })} /></Field>
              <Field label="Возраст до"><TextInput type="number" value={groupDraft.age_to || ""} onChange={(e) => setGroupDraft({ ...groupDraft, age_to: e.target.value })} /></Field>
              <Field label="Вместимость"><TextInput type="number" value={groupDraft.capacity || 8} onChange={(e) => setGroupDraft({ ...groupDraft, capacity: e.target.value })} /></Field>
              <Field label="Дата старта"><TextInput type="date" value={groupDraft.starts_on || ""} onChange={(e) => setGroupDraft({ ...groupDraft, starts_on: e.target.value })} /></Field>
              <Field label="Дата окончания"><TextInput type="date" value={groupDraft.ends_on || ""} onChange={(e) => setGroupDraft({ ...groupDraft, ends_on: e.target.value })} /></Field>
              <Field label="Цена группы"><TextInput type="number" value={groupDraft.price_monthly || ""} onChange={(e) => setGroupDraft({ ...groupDraft, price_monthly: e.target.value })} /></Field>
              <Field label="Порядок"><TextInput type="number" value={groupDraft.sort_order || 100} onChange={(e) => setGroupDraft({ ...groupDraft, sort_order: e.target.value })} /></Field>
            </div>
            <div className="settings-actions">
              <Toggle checked={groupDraft.show_on_site} onChange={(checked) => setGroupDraft({ ...groupDraft, show_on_site: checked })} label="Показывать на сайте" />
            </div>
            <div className="settings-card">
              <div className="settings-card-head">
                <div>
                  <h3>Расписание</h3>
                  <p>Правила сохраняются в `group_schedule_rules`, без текстового дубля.</p>
                </div>
                <Button type="button" variant="secondary-crm" onClick={() => setScheduleDraft([...scheduleDraft, { ...emptyRule }])}><Plus size={14} /> Добавить правило</Button>
              </div>
              {scheduleDraft.length === 0 && <div className="settings-empty">Добавьте хотя бы одно правило расписания</div>}
              {scheduleDraft.map((rule, index) => (
                <div className="schedule-row" key={index}>
                  <Field label="День">
                    <SelectInput value={rule.weekday} onChange={(e) => setScheduleDraft(scheduleDraft.map((item, idx) => idx === index ? { ...item, weekday: Number(e.target.value) } : item))}>
                      {weekdays.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                    </SelectInput>
                  </Field>
                  <Field label="Начало"><TextInput type="time" value={rule.starts_at} onChange={(e) => setScheduleDraft(scheduleDraft.map((item, idx) => idx === index ? { ...item, starts_at: e.target.value } : item))} /></Field>
                  <Field label="Окончание"><TextInput type="time" value={rule.ends_at} onChange={(e) => setScheduleDraft(scheduleDraft.map((item, idx) => idx === index ? { ...item, ends_at: e.target.value } : item))} /></Field>
                  <Button
                    type="button"
                    variant="secondary-crm"
                    onClick={async () => {
                      if (rule.id) {
                        const allowed = await askAction({
                          title: "Удалить правило расписания",
                          description: "Это изменит расписание группы после сохранения формы.",
                          dangerLevel: "warning",
                          confirmText: "Удалить правило",
                        });
                        if (!allowed) return;
                      }
                      setScheduleDraft(scheduleDraft.filter((_, idx) => idx !== index));
                    }}
                  >
                    Удалить
                  </Button>
                </div>
              ))}
            </div>
            <div className="settings-form-actions"><Button type="submit" variant="primary-crm" disabled={saving}>Сохранить группу</Button></div>
          </form>
        </Modal>
      )}

      {staffDraft && (
        <Modal title={staffDraft.userId ? "Редактировать сотрудника" : "Новый сотрудник"} onClose={() => { setStaffDraft(null); setStaffError(""); }} width={820}>
          <form onSubmit={saveStaff} className="settings-card-list">
            {staffError && (
              <div className="settings-alert error" style={{ margin: "0 0 16px 0", whiteSpace: "pre-wrap" }}>
                ✕ {staffError}
              </div>
            )}
            <div className="settings-grid-2">
              <Field label="ФИО"><TextInput required value={staffDraft.fullName} onChange={(e) => setStaffDraft({ ...staffDraft, fullName: e.target.value })} /></Field>
              <Field label="Email / логин"><TextInput type="email" required value={staffDraft.email} onChange={(e) => setStaffDraft({ ...staffDraft, email: e.target.value })} /></Field>
              <Field label="Телефон"><TextInput value={staffDraft.phone} onChange={(e) => setStaffDraft({ ...staffDraft, phone: e.target.value })} /></Field>
              <Field label="Роль">
                <SelectInput value={staffDraft.role} onChange={(e) => setStaffDraft({ ...staffDraft, role: e.target.value })}>
                  <option value="owner">owner</option>
                  <option value="admin">admin</option>
                  <option value="manager">manager</option>
                  <option value="teacher">teacher</option>
                  <option value="accountant">accountant</option>
                </SelectInput>
              </Field>
              <Field label="Специализация"><TextInput value={staffDraft.specialty} onChange={(e) => setStaffDraft({ ...staffDraft, specialty: e.target.value })} /></Field>
              <Field label="Фото: storage path или URL">
                <div className="settings-card-list" style={{ gap: 8 }}>
                  <TextInput value={staffDraft.avatarUrl} onChange={(e) => setStaffDraft({ ...staffDraft, avatarUrl: e.target.value })} placeholder="teachers/photo.jpg" />
                  <input
                    id="staff-avatar-upload"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    style={{ display: "none" }}
                    onChange={handleStaffAvatarUpload}
                  />
                  <Button
                    type="button"
                    variant="secondary-crm"
                    disabled={uploadingStaffAvatar}
                    onClick={() => document.getElementById("staff-avatar-upload")?.click()}
                  >
                    <Upload size={14} />
                    {uploadingStaffAvatar ? "Загрузка..." : "Загрузить фото"}
                  </Button>
                </div>
              </Field>
              <Field label="Порядок"><TextInput type="number" value={staffDraft.sortOrder} onChange={(e) => setStaffDraft({ ...staffDraft, sortOrder: e.target.value })} /></Field>
            </div>
            <Field label="Публичное описание"><TextArea value={staffDraft.publicBio} onChange={(e) => setStaffDraft({ ...staffDraft, publicBio: e.target.value })} /></Field>
            <Field label="Внутренний комментарий"><TextArea value={staffDraft.internalComment} onChange={(e) => setStaffDraft({ ...staffDraft, internalComment: e.target.value })} /></Field>
            <Toggle checked={staffDraft.showOnSite} onChange={(checked) => setStaffDraft({ ...staffDraft, showOnSite: checked })} label="Показывать на сайте" />
            <div className="settings-form-actions"><Button type="submit" variant="primary-crm" disabled={saving}>{saving ? "Сохранение..." : "Сохранить сотрудника"}</Button></div>
          </form>
        </Modal>
      )}
      {actionModal}
    </div>
  );
}
