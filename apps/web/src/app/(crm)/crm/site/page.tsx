"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@robotics-crm/ui";
import { 
  Globe, 
  BookOpen, 
  Calendar, 
  DollarSign, 
  Search, 
  Plus, 
  Trash, 
  Save, 
  Edit,
  PlusCircle,
  XCircle,
  HelpCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import { isDemoMode } from "@/shared/utils/demo";

export default function CrmSitePage() {
  const [activeTab, setActiveTab] = useState<"home" | "courses" | "schedule" | "prices" | "seo">("home");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const supabase = createSupabaseBrowserClient();

  // Site Blocks States
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [heroBadge, setHeroBadge] = useState("");
  const [heroCtaText, setHeroCtaText] = useState("");
  const [heroBullets, setHeroBullets] = useState<string[]>([]);
  
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teachersTitle, setTeachersTitle] = useState("");
  const [teachersSubtitle, setTeachersSubtitle] = useState("");

  const [portalTitle, setPortalTitle] = useState("");
  const [portalSubtitle, setPortalSubtitle] = useState("");
  const [portalStudentName, setPortalStudentName] = useState("");
  const [portalAge, setPortalAge] = useState("");
  const [portalCourse, setPortalCourse] = useState("");
  const [portalNextLesson, setPortalNextLesson] = useState("");
  const [portalCabinet, setPortalCabinet] = useState("");
  const [portalAttendance, setPortalAttendance] = useState("");
  const [portalProject, setPortalProject] = useState("");
  const [portalBalance, setPortalBalance] = useState("");
  const [portalTeacherNote, setPortalTeacherNote] = useState("");

  // Prices Block State
  const [priceTrial, setPriceTrial] = useState("");
  const [priceMonthly, setPriceMonthly] = useState("");
  const [priceIndividual, setPriceIndividual] = useState("");

  // SEO Block State
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoH1, setSeoH1] = useState("");

  // DB entities
  const [courses, setCourses] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  // Selected Course/Group for edit modals
  const [editingCourse, setEditingCourse] = useState<any | null>(null);

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const demo = isDemoMode();

      if (demo) {
        setHeroTitle("Бесплатное пробное занятие 90 минут: ребенок соберет и запрограммирует первого робота");
        setHeroSubtitle("Курсы робототехники и программирования для детей 6–14 лет в Липецке. Практика на реальном оборудовании в мини-группах.");
        setHeroBadge("Школа робототехники в Липецке");
        setHeroCtaText("Записаться на пробный урок");
        setHeroBullets(["Без предоплаты", "Оборудование включено", "Мини-группы до 8 детей", "Подберем группу по возрасту"]);

        setTeachersTitle("Наши преподаватели");
        setTeachersSubtitle("Практикующие наставники, которые умеют объяснять сложное детям простым языком");
        setTeachers([
          { name: "Алексей Дмитриев", role: "Старший наставник LEGO & Arduino", text: "Помогает детям не бояться ошибок и доводить инженерные проекты до рабочего результата.", imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200", alt: "Алексей Дмитриев — преподаватель робототехники" },
          { name: "Мария Соколова", role: "Преподаватель Scratch и основ программирования", text: "Учит мыслить алгоритмами через игры, мультфильмы и первые интерактивные проекты.", imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200", alt: "Мария Соколова — преподаватель программирования" }
        ]);

        setPortalTitle("Родители видят прогресс ребенка в личном кабинете");
        setPortalSubtitle("Расписание, посещаемость, баланс, материалы урока и отчеты наставника — в одном месте.");
        setPortalStudentName("Миша Иванов");
        setPortalAge("8 лет");
        setPortalCourse("Робототехника LEGO");
        setPortalNextLesson("Суббота, 12:00");
        setPortalCabinet("Кабинет 3");
        setPortalAttendance("7 из 8");
        setPortalProject("Робот RoboSort-3000");
        setPortalBalance("Осталось 2 занятия");
        setPortalTeacherNote("Миша отлично справился с логикой ветвления и доработал алгоритм захвата кубиков.");

        setPriceTrial("0 ₽");
        setPriceMonthly("от 4 000 ₽");
        setPriceIndividual("от 1 500 ₽");

        setSeoTitle("Робототехника и программирование для детей в Липецке | Школа Robotics");
        setSeoDescription("Курсы робототехники, Scratch, Python и Arduino для детей 6–14 лет в Липецке. Бесплатное пробное занятие 90 минут! Запись в мини-группы до 8 человек.");
        setSeoH1("Бесплатное пробное занятие 90 минут: ребенок соберет и запрограммирует первого робота");

        setCourses([
          { id: "c1", title: "Робототехника (Lego Education)", short_description: "Изучение механики и программирования", min_age: 6, max_age: 9, price_monthly: 4500, is_public: true, sort_order: 1 },
          { id: "c2", title: "Программирование Scratch", short_description: "Создание игр и анимации", min_age: 7, max_age: 11, price_monthly: 4000, is_public: true, sort_order: 2 }
        ]);

        setGroups([
          { id: "g1", title: "LEGO Start 1", show_on_site: true, capacity: 8, course: { title: "Робототехника (Lego Education)" }, schedule_rules: [{ weekday: 2, starts_at: "17:00:00" }, { weekday: 4, starts_at: "17:00:00" }] }
        ]);

        return;
      }

      const { data: org, error: orgError } = await (supabase
        .from("organizations") as any)
        .select("id")
        .eq("slug", "robotics-lipetsk")
        .single();

      if (orgError || !org) throw new Error("Организация не найдена");
      setOrgId(org.id);

      // 1. Fetch site blocks
      const { data: blocks } = await (supabase
        .from("site_content_blocks") as any)
        .select("*")
        .eq("organization_id", org.id);

      if (blocks) {
        // Hero
        const hero = blocks.find((b: any) => b.block_key === "home.hero");
        setHeroTitle(hero?.title || "");
        setHeroSubtitle(hero?.subtitle || "");
        setHeroBadge(hero?.content?.badge || "");
        setHeroCtaText(hero?.content?.ctaText || "");
        setHeroBullets(hero?.content?.bullets || []);

        // Teachers
        const tBlock = blocks.find((b: any) => b.block_key === "home.teachers");
        setTeachersTitle(tBlock?.title || "");
        setTeachersSubtitle(tBlock?.subtitle || "");
        setTeachers(tBlock?.content?.items || []);

        // Portal Preview
        const pBlock = blocks.find((b: any) => b.block_key === "home.parent_student_portal_preview");
        setPortalTitle(pBlock?.title || "");
        setPortalSubtitle(pBlock?.subtitle || "");
        setPortalStudentName(pBlock?.content?.studentName || "");
        setPortalAge(pBlock?.content?.age || "");
        setPortalCourse(pBlock?.content?.course || "");
        setPortalNextLesson(pBlock?.content?.nextLesson || "");
        setPortalCabinet(pBlock?.content?.cabinet || "");
        setPortalAttendance(pBlock?.content?.attendance || "");
        setPortalProject(pBlock?.content?.project || "");
        setPortalBalance(pBlock?.content?.balance || "");
        setPortalTeacherNote(pBlock?.content?.teacherNote || "");

        // Prices
        const prBlock = blocks.find((b: any) => b.block_key === "home.prices");
        setPriceTrial(prBlock?.content?.trialPrice || "");
        setPriceMonthly(prBlock?.content?.monthlyPrice || "");
        setPriceIndividual(prBlock?.content?.individualPrice || "");

        // SEO
        const seoBlock = blocks.find((b: any) => b.block_key === "home.seo");
        setSeoTitle(seoBlock?.title || "");
        setSeoDescription(seoBlock?.subtitle || "");
        setSeoH1(seoBlock?.content?.h1 || "");
      }

      // 2. Fetch courses
      const { data: coursesData } = await (supabase
        .from("courses") as any)
        .select("*")
        .eq("organization_id", org.id)
        .order("sort_order", { ascending: true });
      if (coursesData) setCourses(coursesData);

      // 3. Fetch groups & rules
      const { data: groupsData } = await (supabase
        .from("groups") as any)
        .select(`
          *,
          course:courses(title),
          schedule_rules:group_schedule_rules(weekday, starts_at)
        `)
        .eq("organization_id", org.id);
      if (groupsData) setGroups(groupsData);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ошибка загрузки данных сайта");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Block Helper
  const saveBlock = async (key: string, title: string, subtitle: string, content: any) => {
    if (isDemoMode()) {
      console.log(`Demo Mode: Saving block ${key}:`, { title, subtitle, content });
      return;
    }

    const { error } = await (supabase
      .from("site_content_blocks") as any)
      .upsert({
        organization_id: orgId,
        page_slug: "/",
        block_key: key,
        title,
        subtitle,
        content,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "organization_id,page_slug,block_key"
      });

    if (error) throw error;
  };

  // Save Home Tab
  const handleSaveHome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // Save Hero
      await saveBlock("home.hero", heroTitle, heroSubtitle, {
        badge: heroBadge,
        ctaText: heroCtaText,
        bullets: heroBullets
      });

      // Save Teachers
      await saveBlock("home.teachers", teachersTitle, teachersSubtitle, {
        items: teachers
      });

      // Save Portal Preview
      await saveBlock("home.parent_student_portal_preview", portalTitle, portalSubtitle, {
        studentName: portalStudentName,
        age: portalAge,
        course: portalCourse,
        nextLesson: portalNextLesson,
        cabinet: portalCabinet,
        attendance: portalAttendance,
        project: portalProject,
        balance: portalBalance,
        teacherNote: portalTeacherNote
      });

      setSuccessMsg("Изменения блоков главной страницы успешно сохранены!");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Не удалось сохранить изменения");
    } finally {
      setSaving(false);
    }
  };

  // Save Prices
  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await saveBlock("home.prices", "Стоимость обучения", "Прозрачные тарифы без скрытых переплат и комиссий", {
        trialPrice: priceTrial,
        monthlyPrice: priceMonthly,
        individualPrice: priceIndividual
      });
      setSuccessMsg("Цены успешно сохранены!");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Не удалось сохранить цены");
    } finally {
      setSaving(false);
    }
  };

  // Save SEO
  const handleSaveSEO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await saveBlock("home.seo", seoTitle, seoDescription, {
        h1: seoH1
      });
      setSuccessMsg("SEO настройки успешно сохранены!");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Не удалось сохранить настройки SEO");
    } finally {
      setSaving(false);
    }
  };

  // Save Course Detail Editing
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    setSaving(true);
    setErrorMsg("");

    try {
      if (isDemoMode()) {
        setCourses(courses.map(c => c.id === editingCourse.id ? editingCourse : c));
        setEditingCourse(null);
        return;
      }

      const { error } = await (supabase
        .from("courses") as any)
        .update({
          title: editingCourse.title,
          short_description: editingCourse.short_description,
          min_age: editingCourse.min_age ? parseInt(editingCourse.min_age, 10) : null,
          max_age: editingCourse.max_age ? parseInt(editingCourse.max_age, 10) : null,
          price_monthly: editingCourse.price_monthly ? parseFloat(editingCourse.price_monthly) : null,
          is_public: editingCourse.is_public,
          sort_order: editingCourse.sort_order ? parseInt(editingCourse.sort_order, 10) : 100
        })
        .eq("id", editingCourse.id);

      if (error) throw error;

      setCourses(courses.map(c => c.id === editingCourse.id ? editingCourse : c));
      setEditingCourse(null);
      setSuccessMsg(`Курс «${editingCourse.title}» успешно обновлен!`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Не удалось обновить курс");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Group show_on_site
  const handleToggleGroupShow = async (group: any) => {
    const nextVal = !group.show_on_site;
    try {
      if (isDemoMode()) {
        setGroups(groups.map(g => g.id === group.id ? { ...g, show_on_site: nextVal } : g));
        return;
      }

      const { error } = await (supabase
        .from("groups") as any)
        .update({ show_on_site: nextVal })
        .eq("id", group.id);

      if (error) throw error;

      setGroups(groups.map(g => g.id === group.id ? { ...g, show_on_site: nextVal } : g));
      setSuccessMsg(`Отображение группы «${group.title}» изменено!`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Не удалось переключить отображение группы");
    }
  };

  // Update Group Capacity
  const handleUpdateGroupCapacity = async (group: any, nextCap: string) => {
    const capNum = parseInt(nextCap, 10);
    if (isNaN(capNum)) return;
    try {
      if (isDemoMode()) {
        setGroups(groups.map(g => g.id === group.id ? { ...g, capacity: capNum } : g));
        return;
      }

      const { error } = await (supabase
        .from("groups") as any)
        .update({ capacity: capNum })
        .eq("id", group.id);

      if (error) throw error;

      setGroups(groups.map(g => g.id === group.id ? { ...g, capacity: capNum } : g));
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Не удалось обновить вместимость группы");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", color: "var(--color-text)", marginBottom: "4px" }}>
          Управление сайтом
        </h1>
        <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
          Простой конструктор контента публичного лендинга и SEO-настроек.
        </p>
      </div>

      {/* Messages */}
      {successMsg && (
        <div style={{ background: "#F0FDF4", border: "1px solid #DCFCE7", color: "#166534", padding: "12px 16px", borderRadius: "8px", fontSize: "14px", fontWeight: 600 }}>
          ✓ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FEE2E2", color: "#991B1B", padding: "12px 16px", borderRadius: "8px", fontSize: "14px", fontWeight: 600 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--color-border)", paddingBottom: "12px" }}>
        {[
          { id: "home", label: "Главная", icon: Globe },
          { id: "courses", label: "Курсы → настройки", icon: BookOpen, href: "/crm/settings?tab=courses" },
          { id: "schedule", label: "Расписание → настройки", icon: Calendar, href: "/crm/settings?tab=groups" },
          { id: "prices", label: "Цены → настройки", icon: DollarSign, href: "/crm/settings?tab=courses" },
          { id: "seo", label: "SEO", icon: Search },
        ].map(tab => {
          const Icon = tab.icon;
          const directoryHref =
            tab.id === "courses" || tab.id === "prices"
              ? "/crm/settings?tab=courses"
              : tab.id === "schedule"
                ? "/crm/settings?tab=groups"
                : "";
          const tabStyle = {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "13px",
            background: activeTab === tab.id ? "var(--color-primary-soft)" : "transparent",
            color: activeTab === tab.id ? "var(--color-primary-dark)" : "var(--color-text-muted)"
          } as React.CSSProperties;

          if (directoryHref) {
            return (
              <a
                key={tab.id}
                data-testid={`site-tab-${tab.id}`}
                href={directoryHref}
                style={{ ...tabStyle, textDecoration: "none" }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </a>
            );
          }

          return (
            <button
              key={tab.id}
              data-testid={`site-tab-${tab.id}`}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSuccessMsg("");
                setErrorMsg("");
              }}
              style={tabStyle}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>Загрузка редактора контента...</div>
      ) : (
        <div>
          {/* TAB 1: HOME */}
          {activeTab === "home" && (
            <form onSubmit={handleSaveHome} style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              
              {/* HERO BLOCK */}
              <div className="card-crm" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-border)", paddingBottom: "8px" }}>Блок «Hero» (Первый экран)</h3>
                
                <div className="form-group">
                  <label className="form-label">Бейдж сверху</label>
                  <input type="text" className="form-input" value={heroBadge} onChange={e => setHeroBadge(e.target.value)} placeholder="Например: Школа робототехники в Липецке" />
                </div>

                <div className="form-group">
                  <label className="form-label">Главный заголовок (H1)</label>
                  <input type="text" className="form-input" value={heroTitle} onChange={e => setHeroTitle(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Подзаголовок</label>
                  <textarea className="form-input" style={{ height: "70px", padding: "8px" }} value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Текст кнопки CTA</label>
                  <input type="text" className="form-input" value={heroCtaText} onChange={e => setHeroCtaText(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Преимущества (список через запятую)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={heroBullets.join(", ")} 
                    onChange={e => setHeroBullets(e.target.value.split(",").map(b => b.trim()).filter(Boolean))} 
                  />
                </div>
              </div>

              {/* TEACHERS BLOCK */}
              <div className="card-crm" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-border)", paddingBottom: "8px" }}>Блок «Наши преподаватели»</h3>
                
                <div className="form-group">
                  <label className="form-label">Заголовок блока</label>
                  <input type="text" className="form-input" value={teachersTitle} onChange={e => setTeachersTitle(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Подзаголовок блока</label>
                  <input type="text" className="form-input" value={teachersSubtitle} onChange={e => setTeachersSubtitle(e.target.value)} required />
                </div>

                {/* Repeatable Teachers Cards */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-muted)" }}>Список преподавателей:</span>
                    <Button 
                      type="button" 
                      onClick={() => setTeachers([...teachers, { name: "", role: "", text: "", imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200", alt: "" }])}
                      variant="secondary-crm"
                      style={{ padding: "4px 8px", fontSize: "11px", height: "auto" }}
                    >
                      <PlusCircle size={12} /> Добавить преподавателя
                    </Button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    {teachers.map((teacher, idx) => (
                      <div key={idx} style={{ border: "1px solid var(--color-border)", borderRadius: "8px", padding: "16px", background: "var(--color-bg)", position: "relative" }}>
                        <button 
                          type="button" 
                          onClick={() => setTeachers(teachers.filter((_, i) => i !== idx))} 
                          style={{ position: "absolute", top: "12px", right: "12px", background: "none", border: "none", color: "#EF4444", cursor: "pointer" }}
                        >
                          <Trash size={14} />
                        </button>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ height: "32px", fontSize: "12px" }}
                            placeholder="Имя преподавателя" 
                            value={teacher.name} 
                            onChange={e => {
                              const updated = [...teachers];
                              updated[idx].name = e.target.value;
                              setTeachers(updated);
                            }}
                            required
                          />
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ height: "32px", fontSize: "12px" }}
                            placeholder="Роль / Предмет" 
                            value={teacher.role} 
                            onChange={e => {
                              const updated = [...teachers];
                              updated[idx].role = e.target.value;
                              setTeachers(updated);
                            }}
                            required
                          />
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ height: "32px", fontSize: "12px" }}
                            placeholder="Ссылка на фото" 
                            value={teacher.imageUrl} 
                            onChange={e => {
                              const updated = [...teachers];
                              updated[idx].imageUrl = e.target.value;
                              setTeachers(updated);
                            }}
                            required
                          />
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ height: "32px", fontSize: "12px" }}
                            placeholder="Alt текст изображения" 
                            value={teacher.alt} 
                            onChange={e => {
                              const updated = [...teachers];
                              updated[idx].alt = e.target.value;
                              setTeachers(updated);
                            }}
                            required
                          />
                          <textarea 
                            className="form-input" 
                            style={{ height: "50px", fontSize: "12px", padding: "6px" }}
                            placeholder="Цитата / Описание" 
                            value={teacher.text} 
                            onChange={e => {
                              const updated = [...teachers];
                              updated[idx].text = e.target.value;
                              setTeachers(updated);
                            }}
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* PORTAL PREVIEW BLOCK */}
              <div className="card-crm" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-border)", paddingBottom: "8px" }}>Блок «Личный кабинет (Preview)»</h3>
                
                <div className="form-group">
                  <label className="form-label">Заголовок блока</label>
                  <input type="text" className="form-input" value={portalTitle} onChange={e => setPortalTitle(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Подзаголовок блока</label>
                  <input type="text" className="form-input" value={portalSubtitle} onChange={e => setPortalSubtitle(e.target.value)} required />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="form-group">
                    <label className="form-label">Имя ученика</label>
                    <input type="text" className="form-input" value={portalStudentName} onChange={e => setPortalStudentName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Возраст ученика</label>
                    <input type="text" className="form-input" value={portalAge} onChange={e => setPortalAge(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Курс</label>
                    <input type="text" className="form-input" value={portalCourse} onChange={e => setPortalCourse(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Следующее занятие</label>
                    <input type="text" className="form-input" value={portalNextLesson} onChange={e => setPortalNextLesson(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Кабинет</label>
                    <input type="text" className="form-input" value={portalCabinet} onChange={e => setPortalCabinet(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Посещаемость</label>
                    <input type="text" className="form-input" value={portalAttendance} onChange={e => setPortalAttendance(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Текущий проект</label>
                    <input type="text" className="form-input" value={portalProject} onChange={e => setPortalProject(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Баланс абонемента</label>
                    <input type="text" className="form-input" value={portalBalance} onChange={e => setPortalBalance(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Отчет наставника</label>
                  <textarea className="form-input" style={{ height: "60px", padding: "8px" }} value={portalTeacherNote} onChange={e => setPortalTeacherNote(e.target.value)} required />
                </div>
              </div>

              {/* SAVE BUTTON */}
              <div>
                <Button type="submit" variant="primary-crm" disabled={saving}>
                  {saving ? "Сохранение..." : "Сохранить все изменения блоков"}
                </Button>
              </div>

            </form>
          )}

          {/* TAB 2: COURSES */}
          {activeTab === "courses" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-text)" }}>Курсы в системе ({courses.length})</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {courses.map(course => (
                  <div key={course.id} className="card-crm" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "16px" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <h4 style={{ fontWeight: 700, fontSize: "15px" }}>{course.title}</h4>
                        <span className={`badge ${course.is_public ? "badge-blue" : "badge-red"}`}>
                          {course.is_public ? "Публичный" : "Скрыт"}
                        </span>
                      </div>
                      <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "8px" }}>
                        {course.short_description || "Нет описания"}
                      </p>
                      <div style={{ fontSize: "12px", display: "flex", gap: "12px" }}>
                        <span>Возраст: {course.min_age}–{course.max_age} лет</span>
                        <span style={{ fontWeight: 700 }}>Цена: {course.price_monthly ? `${course.price_monthly} ₽` : "Не указана"}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--color-border)", paddingTop: "12px" }}>
                      <Button onClick={() => setEditingCourse(course)} variant="secondary-crm" style={{ display: "flex", alignItems: "center", gap: "6px", height: "32px", fontSize: "12px" }}>
                        <Edit size={12} /> Редактировать курс
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Edit Course Modal */}
              {editingCourse && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
                  <div style={{ background: "white", padding: "32px", borderRadius: "16px", border: "1px solid var(--color-border)", width: "500px", display: "flex", flexDirection: "column", gap: "20px", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "12px" }}>
                      <h3 style={{ fontWeight: 700, fontSize: "16px" }}>Редактировать курс: {editingCourse.title}</h3>
                      <button onClick={() => setEditingCourse(null)} style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "16px" }}>✕</button>
                    </div>

                    <form onSubmit={handleSaveCourse} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div className="form-group">
                        <label className="form-label">Название курса</label>
                        <input type="text" className="form-input" value={editingCourse.title} onChange={e => setEditingCourse({ ...editingCourse, title: e.target.value })} required />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Краткое описание (для сайта)</label>
                        <textarea className="form-input" style={{ height: "60px", padding: "8px" }} value={editingCourse.short_description || ""} onChange={e => setEditingCourse({ ...editingCourse, short_description: e.target.value })} required />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div className="form-group">
                          <label className="form-label">Мин. возраст (лет)</label>
                          <input type="number" className="form-input" value={editingCourse.min_age || ""} onChange={e => setEditingCourse({ ...editingCourse, min_age: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Макс. возраст (лет)</label>
                          <input type="number" className="form-input" value={editingCourse.max_age || ""} onChange={e => setEditingCourse({ ...editingCourse, max_age: e.target.value })} />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div className="form-group">
                          <label className="form-label">Цена в месяц (₽)</label>
                          <input type="number" className="form-input" value={editingCourse.price_monthly || ""} onChange={e => setEditingCourse({ ...editingCourse, price_monthly: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Порядок сортировки</label>
                          <input type="number" className="form-input" value={editingCourse.sort_order || 100} onChange={e => setEditingCourse({ ...editingCourse, sort_order: e.target.value })} />
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "8px" }}>
                        <input type="checkbox" id="is_public" checked={editingCourse.is_public} onChange={e => setEditingCourse({ ...editingCourse, is_public: e.target.checked })} style={{ cursor: "pointer" }} />
                        <label htmlFor="is_public" style={{ fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Показывать курс на публичном сайте</label>
                      </div>

                      <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", borderTop: "1px solid var(--color-border)", paddingTop: "16px", marginTop: "8px" }}>
                        <Button type="button" onClick={() => setEditingCourse(null)} variant="secondary-crm" style={{ height: "38px" }}>Отмена</Button>
                        <Button type="submit" variant="primary-crm" disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: SCHEDULE */}
          {activeTab === "schedule" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-text)" }}>Группы и расписание ({groups.length})</span>

              <div style={{ background: "white", border: "1px solid var(--color-border)", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr 1fr", padding: "16px 24px", background: "var(--color-bg)", fontWeight: 700, fontSize: "12px", borderBottom: "1px solid var(--color-border)" }}>
                  <span>Группа</span>
                  <span>Направление</span>
                  <span>Время</span>
                  <span style={{ textAlign: "center" }}>Вместимость</span>
                  <span style={{ textAlign: "right" }}>Показ на сайте</span>
                </div>

                {groups.map(group => {
                  const daysMap: Record<number, string> = {
                    1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб", 7: "Вс"
                  };
                  const rules = group.schedule_rules || [];
                  const sortedRules = [...rules].sort((a: any, b: any) => a.weekday - b.weekday);
                  const days = sortedRules.map((r: any) => daysMap[r.weekday] || "").join("/");
                  const start = sortedRules[0]?.starts_at ? sortedRules[0].starts_at.substring(0, 5) : "";
                  const timeLabel = rules.length > 0 ? `${days} в ${start}` : "Не задано";

                  return (
                    <div key={group.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr 1fr", padding: "16px 24px", borderBottom: "1px solid var(--color-border)", alignItems: "center", fontSize: "13px" }}>
                      <span style={{ fontWeight: 700 }}>{group.title}</span>
                      <span>{group.course?.title || "Не привязан"}</span>
                      <span>{timeLabel}</span>
                      <div style={{ display: "flex", justifySelf: "center", alignItems: "center", gap: "6px" }}>
                        <input 
                          type="number" 
                          value={group.capacity} 
                          onChange={e => handleUpdateGroupCapacity(group, e.target.value)} 
                          style={{ width: "50px", height: "28px", border: "1px solid var(--color-border)", borderRadius: "6px", textAlign: "center", fontSize: "12px" }}
                        />
                        <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>чел.</span>
                      </div>
                      <div style={{ display: "flex", justifySelf: "end" }}>
                        <button
                          onClick={() => handleToggleGroupShow(group)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: group.show_on_site ? "var(--color-primary-dark)" : "var(--color-text-muted)",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontWeight: 700,
                            fontSize: "12px"
                          }}
                        >
                          {group.show_on_site ? (
                            <>
                              <Eye size={14} style={{ color: "#22C55E" }} />
                              <span style={{ color: "#22C55E" }}>Показывается</span>
                            </>
                          ) : (
                            <>
                              <EyeOff size={14} style={{ color: "#EF4444" }} />
                              <span style={{ color: "#EF4444" }}>Скрыта</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: PRICES */}
          {activeTab === "prices" && (
            <form onSubmit={handleSavePrices} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div className="card-crm" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-border)", paddingBottom: "8px" }}>Редактор цен и общих тарифов</h3>
                
                <div className="form-group">
                  <label className="form-label">Пробное занятие</label>
                  <input type="text" className="form-input" value={priceTrial} onChange={e => setPriceTrial(e.target.value)} placeholder="Например: 0 ₽" required />
                </div>

                <div className="form-group">
                  <label className="form-label">Месячный абонемент</label>
                  <input type="text" className="form-input" value={priceMonthly} onChange={e => setPriceMonthly(e.target.value)} placeholder="Например: от 4 000 ₽" required />
                </div>

                <div className="form-group">
                  <label className="form-label">Индивидуальное занятие</label>
                  <input type="text" className="form-input" value={priceIndividual} onChange={e => setPriceIndividual(e.target.value)} placeholder="Например: от 1 500 ₽" required />
                </div>
              </div>

              <div>
                <Button type="submit" variant="primary-crm" disabled={saving}>
                  {saving ? "Сохранение..." : "Сохранить цены"}
                </Button>
              </div>
            </form>
          )}

          {/* TAB 5: SEO */}
          {activeTab === "seo" && (
            <form onSubmit={handleSaveSEO} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div className="card-crm" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-border)", paddingBottom: "8px" }}>SEO настройки главной страницы</h3>
                
                <div className="form-group">
                  <label className="form-label">Meta Title (Заголовок во вкладке браузера)</label>
                  <input type="text" className="form-input" value={seoTitle} onChange={e => setSeoTitle(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Meta Description (Сниппет в выдаче Яндекса/Google)</label>
                  <textarea className="form-input" style={{ height: "80px", padding: "8px" }} value={seoDescription} onChange={e => setSeoDescription(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Заголовок H1 на сайте</label>
                  <input type="text" className="form-input" value={seoH1} onChange={e => setSeoH1(e.target.value)} required />
                </div>
              </div>

              <div>
                <Button type="submit" variant="primary-crm" disabled={saving}>
                  {saving ? "Сохранение..." : "Сохранить SEO настройки"}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
