"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@robotics-crm/ui";
import { RoboAssistant } from "@/shared/ui/robo-assistant";
import Link from "next/link";
import { getMediaUrl } from "@/shared/utils/media";
import { buildYandexStaticMapUrl, publicMapBranches, resolveBranchMapMarkers } from "@/shared/utils/public-map";
import { 
  Users, 
  Layers, 
  Calendar, 
  Clock, 
  Cpu, 
  Gamepad2, 
  Code, 
  Lightbulb, 
  Smile, 
  ArrowRight, 
  Check, 
  ShieldCheck, 
  UserCheck, 
  ChevronDown, 
  MapPin, 
  Clock3 
} from "lucide-react";

// Analytics trigger helper
const triggerGoal = (goalName: string) => {
  if (typeof window !== "undefined") {
    // Yandex Metrika Goal
    const ymId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
    if (ymId && (window as any).ym) {
      (window as any).ym(parseInt(ymId, 10), 'reachGoal', goalName);
    }
    // Google Analytics Event
    if ((window as any).gtag) {
      (window as any).gtag('event', goalName, {
        'event_category': 'engagement',
        'event_label': goalName
      });
    }
    console.log(`[Analytics] Triggered goal: ${goalName}`);
  }
};

const defaultContactBranches = [
  { name: "Филиал на Осканова", address: "Липецк, ул. Осканова, 3", is_active: true, show_on_site: true },
  { name: "Филиал на Славянова", address: "Липецк, ул. Славянова, 1", is_active: true, show_on_site: true },
];

function mediaPath(value: any) {
  return typeof value === "string" ? value : value?.path || "";
}

function mediaTitle(value: any, fallback: string) {
  if (typeof value === "object" && value?.title) return value.title;
  return fallback;
}

function mediaAlt(value: any, fallback: string) {
  if (typeof value === "object" && value?.alt) return value.alt;
  return mediaTitle(value, fallback);
}

function mediaItems(values: any[] | undefined) {
  return Array.isArray(values) ? values.filter((item) => mediaPath(item)) : [];
}

function mediaSrc(value: any) {
  const path = mediaPath(value);
  return path ? getMediaUrl(path) : "";
}

interface LandingPageClientProps {
  initialCourses?: any[];
  initialSchedule?: any[];
  initialPrices?: any;
  initialBlocks?: any[];
  initialTeachers?: any[];
  initialBranches?: any[];
  orgDetails?: any;
  initialTariffs?: any[];
}

export default function LandingPageClient({
  initialCourses,
  initialSchedule,
  initialPrices,
  initialBlocks,
  initialTeachers,
  initialBranches,
  orgDetails,
  initialTariffs,
}: LandingPageClientProps) {
  const router = useRouter();
  
  // Form State
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [courseId, setCourseId] = useState("");
  const [convenientTime, setConvenientTime] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [roboAdvice, setRoboAdvice] = useState("Я помогу подобрать идеальную группу по возрасту и уровню!");
  const [roboMood, setRoboMood] = useState<"idle" | "happy" | "thinking" | "success" | "warning" | "sleepy">("idle");

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Schedule Filter State
  const [filterAge, setFilterAge] = useState<string>("all");
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [filterBranch, setFilterBranch] = useState<string>("all");

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // Scroll tracking for form
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          triggerGoal("scrolled_to_lead_form");
        }
      },
      { threshold: 0.1 }
    );
    if (formRef.current) {
      observer.observe(formRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // Submit Lead
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!consent) {
      setErrorMsg("Необходимо согласие на обработку персональных данных");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentName,
          parentPhone,
          childName,
          childAge: childAge ? parseInt(childAge, 10) : undefined,
          courseId: courseId || undefined,
          convenientTime: convenientTime || undefined,
          message: message || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось отправить заявку");
      }

      // Trigger conversion goal
      triggerGoal("lead_form_submitted");

      // Redirect to thanks page
      router.push("/thanks");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: "01", title: "Разбираем идею", text: "Объясняем тему занятия на простых физических примерах.", img: "/images/classroom_lipetsk.png" },
    { num: "02", title: "Собираем модель", text: "Конструируем робота или схему собственными руками.", img: "/images/robot_sumo.png" },
    { num: "03", title: "Пишем алгоритм", text: "Программируем логику поведения на компьютере.", img: "/images/arduino_greenhouse.png" },
    { num: "04", title: "Тестируем проект", text: "Запускаем робота на трассе, находим ошибки в коде.", img: "/images/robot_sumo.png" },
    { num: "05", title: "Защищаем результат", text: "Ребёнок объясняет работу модели и показывает её родителям.", img: "/images/classroom_lipetsk.png" }
  ];

  const faqItems = [
    { q: "Нужна ли подготовка ребенку?", a: "Нет, наши курсы рассчитаны на обучение с нуля. Преподаватели плавно адаптируют ребенка к нагрузке." },
    { q: "Что делать, если мы пропустили занятие?", a: "Мы предоставляем возможность отработать занятие с другой группой по согласованию с администратором." },
    { q: "Сколько детей в одной группе?", a: "Мы жестко держим лимит: не более 8 детей в одной группе. Это гарантирует внимание преподавателя каждому ребенку." },
    { q: "Как происходит оплата?", a: "Оплата производится помесячно. Все расходные материалы и оборудование уже включены в стоимость." }
  ];

  // Dynamic Block Helper
  const getBlock = (key: string) => {
    return initialBlocks?.find(b => b.block_key === key);
  };

  // Block Mappings & Fallbacks
  const heroBlock = getBlock('home.hero');
  const heroTitle = heroBlock?.title || "Бесплатное пробное занятие 90 минут: ребенок соберет и запрограммирует первого робота";
  const heroSubtitle = heroBlock?.subtitle || "Курсы робототехники и программирования для детей 6–14 лет в Липецке. Практика на реальном оборудовании в мини-группах.";
  const heroBullets = heroBlock?.content?.bullets || ["Без предоплаты", "Оборудование включено", "Мини-группы до 8 детей", "Подберем группу по возрасту"];
  const heroBadge = heroBlock?.content?.badge || "Школа робототехники в Липецке";
  const heroCtaText = heroBlock?.content?.ctaText || "Записаться на пробный урок";
  const heroSecondaryCtaText = heroBlock?.content?.secondaryCtaText || "Посмотреть проекты";

  const teachersBlock = getBlock('home.teachers');
  const showTeachers = teachersBlock?.content?.showBlock !== false;
  const teachersTitle = teachersBlock?.title || "Наши преподаватели";
  const teachersSubtitle = teachersBlock?.subtitle || "Практикующие наставники, которые умеют объяснять сложное детям простым языком";
  const teachersListToRender = initialTeachers && initialTeachers.length > 0
    ? initialTeachers.map((teacher: any) => ({
        name: teacher.name,
        role: teacher.role || "Наставник инженерной лаборатории",
        text: teacher.text || "Помогает детям уверенно разбираться в инженерных задачах и доводить проекты до результата.",
        imageUrl: teacher.imageUrl || "",
        alt: teacher.alt || teacher.name,
      }))
    : [];

  const portalPreviewBlock = getBlock('home.parent_student_portal_preview');
  const portalPreviewTitle = portalPreviewBlock?.title || "Родители видят прогресс ребенка в личном кабинете";
  const portalPreviewSubtitle = portalPreviewBlock?.subtitle || "Расписание, посещаемость, баланс, материалы урока и отчеты наставника — в одном месте.";
  const portalData = portalPreviewBlock?.content || {
    studentName: "Миша Иванов",
    age: "8 лет",
    course: "Робототехника LEGO",
    nextLesson: "Суббота, 12:00",
    cabinet: "Кабинет 3",
    attendance: "7 из 8",
    project: "Робот RoboSort-3000",
    balance: "Осталось 2 занятия",
    teacherNote: "Миша отлично справился с логикой ветвления и доработал алгоритм захвата кубиков."
  };

  const pricesBlock = getBlock('home.prices');
  const trialPrice = pricesBlock?.content?.trialPrice || "0 ₽";
  const monthlyPrice = pricesBlock?.content?.monthlyPrice || "от 4 000 ₽";
  const individualPrice = pricesBlock?.content?.individualPrice || "от 1 500 ₽";
  const primaryBranch = initialBranches?.[0] || null;
  const contactBranchesFromCrm = publicMapBranches(initialBranches || []);
  const contactBranches = contactBranchesFromCrm.length > 0 ? contactBranchesFromCrm : defaultContactBranches;
  const contactMapMarkers = resolveBranchMapMarkers(contactBranches);
  const contactStaticMapUrl = buildYandexStaticMapUrl(contactMapMarkers, { width: 650, height: 300 });
  const contactHours = primaryBranch?.work_hours || primaryBranch?.hours || "Время работы уточняется в CRM";
  const heroLocationLabel = initialBranches && initialBranches.length > 1
    ? `${initialBranches.length} филиала в Липецке`
    : primaryBranch?.address || "Адреса филиалов уточняются";

  const homeMediaBlock = getBlock('home.media');
  const customHeroImage = mediaPath(homeMediaBlock?.content?.heroImage);

  const facilitiesBlock = getBlock('home.facilities');
  const facilitiesImages = mediaItems(facilitiesBlock?.content?.images);

  const studentProjectsBlock = getBlock('home.student_projects');
  const studentProjectsImages = mediaItems(studentProjectsBlock?.content?.images);

  const lessonProcessBlock = getBlock('home.lesson_process');
  const lessonProcessImages = mediaItems(lessonProcessBlock?.content?.images);

  const equipmentBlock = getBlock('home.equipment');
  const equipmentImages = mediaItems(equipmentBlock?.content?.images);

  const contactsMediaBlock = getBlock('contacts.media');
  const contactsImages = mediaItems(contactsMediaBlock?.content?.images);
  const contactFacadeImage = mediaPath(contactsMediaBlock?.content?.facadeImage) || mediaPath(contactsImages[1]);
  const contactClassroomImage = mediaPath(contactsMediaBlock?.content?.classroomImage)
    || mediaPath(contactsMediaBlock?.content?.image)
    || mediaPath(contactsImages[2]);

  const stepsToRender = steps.map((step, idx) => {
    const customImg = lessonProcessImages[idx];
    return {
      ...step,
      img: customImg ? mediaSrc(customImg) : step.img
    };
  });

  const defaultProjects = [
    {
      img: "/images/robot_sumo.png",
      tag: "Lego Education · 8-10 лет",
      tagColor: "badge-amber",
      title: "Робот для соревнований «Сумо»",
      desc: "Проект Данила (8 лет). Робот оборудован ультразвуковым датчиком для поиска противника на ринге и гусеничным приводом для максимальной силы выталкивания."
    },
    {
      img: "/images/arduino_greenhouse.png",
      tag: "Arduino & C++ · 11-14 лет",
      tagColor: "badge-purple",
      title: "Автоматическая микро-теплица",
      desc: "Проект Ивана (12 лет). Конструкция автоматически включает светодиодное освещение при затенении и поливает почву при срабатывании датчика влажности."
    }
  ];

  const projectsToRender = studentProjectsImages.length > 0
    ? studentProjectsImages.map((img: any, idx: number) => {
        const defaultProj = defaultProjects[idx] || {
          tag: "Инженерный проект",
          tagColor: idx % 2 === 0 ? "badge-amber" : "badge-purple",
          title: mediaTitle(img, `Роботехническая разработка ${idx + 1}`),
          desc: "Ребенок собрал и запрограммировал действующий механизм, решающий конкретную задачу."
        };
        return {
          img: mediaSrc(img),
          tag: defaultProj.tag,
          tagColor: defaultProj.tagColor,
          title: mediaTitle(img, defaultProj.title),
          alt: mediaAlt(img, defaultProj.title),
          desc: defaultProj.desc
        };
      })
    : defaultProjects;

  const resolvedClassroomMainImage = facilitiesImages[0] 
    ? mediaSrc(facilitiesImages[0])
    : "/images/classroom_lipetsk.png";

  const resolvedEquipmentTopImage = equipmentImages[0]
    ? mediaSrc(equipmentImages[0])
    : "/images/robot_sumo.png";

  const resolvedEquipmentBottomImage = equipmentImages[1]
    ? mediaSrc(equipmentImages[1])
    : "/images/arduino_greenhouse.png";

  const resolvedHeroImage = customHeroImage ? getMediaUrl(customHeroImage) : resolvedClassroomMainImage;
  const resolvedContactFacadeImage = contactFacadeImage ? mediaSrc(contactFacadeImage) : resolvedEquipmentTopImage;
  const resolvedContactClassroomImage = contactClassroomImage ? mediaSrc(contactClassroomImage) : resolvedClassroomMainImage;

  // Dynamic Courses Mapping
  const coursesToRender = (initialCourses && initialCourses.length > 0)
    ? initialCourses.map(dbCourse => ({
        id: dbCourse.id,
        title: dbCourse.title,
        slug: dbCourse.slug ? `/${dbCourse.slug}` : "#lead-form",
        age: dbCourse.min_age && dbCourse.max_age ? `${dbCourse.min_age}–${dbCourse.max_age} лет` : "Возраст уточняется",
        desc: dbCourse.short_description || dbCourse.full_description || "Описание направления уточняется в CRM.",
        mission: "",
        results: [],
        icon: Cpu,
        price: dbCourse.price_monthly ? `от ${Math.round(dbCourse.price_monthly)} ₽ / мес` : "Цена уточняется"
      }))
    : [];

  // Dynamic Schedule Mapping & Filters
  const rawSchedule = (initialSchedule && initialSchedule.length > 0)
    ? initialSchedule
    : [];

  const uniqueCourses = Array.from(new Set(rawSchedule.map((s: any) => s.course).filter(Boolean)));
  const uniqueBranches = Array.from(new Set(rawSchedule.map((s: any) => s.branch).filter(Boolean)));

  const scheduleToRender = rawSchedule.filter((item: any) => {
    // Age filter
    if (filterAge !== "all") {
      const match = item.age.match(/(\d+)\s*[–-]\s*(\d+)/);
      if (match) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        if (filterAge === "preschool" && min > 7) return false;
        if (filterAge === "junior" && (max < 8 || min > 10)) return false;
        if (filterAge === "senior" && max < 11) return false;
      }
    }
    // Course filter
    if (filterCourse !== "all" && item.course !== filterCourse) return false;
    // Branch filter
    if (filterBranch !== "all" && item.branch !== filterBranch) return false;

    return true;
  }).map((item: any) => {
    let spotsText = "Осталось несколько мест";
    let badgeClass = "badge-green";
    const spots = item.spots ?? 0;
    if (spots <= 0) {
      spotsText = "Группа заполнена";
      badgeClass = "badge-red";
    } else if (spots === 1 || spots === 2) {
      spotsText = `Мест: ${spots} (мало)`;
      badgeClass = "badge-amber";
    } else {
      spotsText = `Мест: ${spots}`;
      badgeClass = "badge-green";
    }
    return {
      age: item.age,
      course: item.course,
      time: item.time,
      branch: item.branch || "",
      teacher: item.teacher || "",
      spotsText,
      badgeClass,
    };
  });

  return (
    <div className="site-landing" style={{ fontFamily: "var(--font-inter), sans-serif", color: "var(--color-text)" }}>
      
      {/* 1. HERO SECTION */}
      <section className="bg-grid-blueprint" style={{
        padding: "100px 0 130px 0",
        borderBottom: "1px solid var(--color-border)",
        position: "relative",
        overflow: "hidden",
        background: "var(--roboks-bg)"
      }}>
        {/* Soft gradient blur spots */}
        <div style={{
          position: "absolute",
          top: "10%",
          left: "5%",
          width: "350px",
          height: "350px",
          borderRadius: "50%",
          background: "var(--roboks-cyan)",
          opacity: 0.16,
          filter: "blur(90px)",
          pointerEvents: "none"
        }} />
        <div style={{
          position: "absolute",
          bottom: "10%",
          right: "5%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "var(--roboks-pink)",
          opacity: 0.14,
          filter: "blur(110px)",
          pointerEvents: "none"
        }} />

        <div style={{
          position: "absolute",
          top: "-150px",
          right: "-150px",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          border: "1.5px dashed rgba(70, 62, 142, 0.08)",
          pointerEvents: "none"
        }} />

        <div className="container site-hero-grid" style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          alignItems: "center",
          gap: "64px",
          position: "relative",
          zIndex: 10,
          padding: "0 20px"
        }}>
          {/* Hero Left Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <span className="badge badge-blue" style={{ background: "rgba(142, 208, 221, 0.15)", color: "var(--roboks-purple)", fontWeight: 800 }}>🤖 Дошкольники и школьники</span>
              <span className="badge badge-purple" style={{ background: "rgba(70, 62, 142, 0.08)", color: "var(--roboks-purple)", fontWeight: 800 }}>📍 2 адреса в Липецке</span>
              <span className="badge badge-green" style={{ background: "#DCFCE7", color: "#15803D", fontWeight: 800 }}>👥 Мини-группы</span>
              <span className="badge badge-red" style={{ background: "rgba(218, 60, 140, 0.08)", color: "var(--roboks-pink)", fontWeight: 800 }}>⚡️ 100% Практика</span>
            </div>

            <h1 style={{
              fontSize: "clamp(2.2rem, 5.5vw, 3.4rem)",
              color: "var(--color-text)",
              lineHeight: 1.12,
              fontFamily: "var(--font-geologica)",
              maxWidth: "640px",
              fontWeight: 900,
              letterSpacing: "-0.03em"
            }}>
              Робототехника и программирование для детей в Липецке
            </h1>

            <p style={{
              fontSize: "var(--font-body-lg)",
              color: "var(--color-text-muted)",
              maxWidth: "540px",
              lineHeight: 1.65,
              fontWeight: 500
            }}>
              Занятия для дошкольников и школьников: LEGO Education, WeDo 2.0, EV3, SPIKE Prime, Scratch и первые цифровые проекты.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>
              <div className="site-hero-actions" style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                <a href="#lead-form" onClick={() => triggerGoal("cta_button_clicked")}>
                  <Button variant="primary-site" style={{ 
                    background: "var(--roboks-gradient)", 
                    height: "54px", 
                    padding: "0 32px",
                    fontWeight: 800,
                    border: "none",
                    borderRadius: "14px",
                    boxShadow: "0 10px 25px rgba(218, 60, 140, 0.15)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    Записаться на пробное занятие
                    <ArrowRight size={18} />
                  </Button>
                </a>
                <a href="#schedule">
                  <Button variant="secondary-site" style={{ 
                    height: "54px", 
                    padding: "0 32px",
                    fontWeight: 750,
                    borderRadius: "14px"
                  }}>
                    Посмотреть расписание
                  </Button>
                </a>
              </div>
              
              {/* Bullet points under Hero CTA */}
              <div className="site-hero-bullets" style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px 24px",
                maxWidth: "540px",
                background: "rgba(255, 255, 255, 0.75)",
                backdropFilter: "blur(4px)",
                padding: "18px",
                borderRadius: "16px",
                border: "1px solid var(--color-border)"
              }}>
                {heroBullets.map((bullet: string, idx: number) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", fontWeight: 650 }}>
                    <Check size={16} style={{ color: "var(--color-success)" }} />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hero Right Visuals */}
          <div style={{ position: "relative" }} className="hero-visual-card">
            <div style={{
              background: "white",
              borderRadius: "var(--radius-card-site)",
              width: "100%",
              boxShadow: "0 24px 60px rgba(37, 99, 235, 0.08)",
              border: "1px solid var(--color-border)",
              position: "relative",
              overflow: "hidden",
              height: "420px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column"
            }}>
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundImage: `linear-gradient(to bottom, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.98)), url('${resolvedHeroImage}')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.15,
                zIndex: 0
              }} />

              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundImage: "radial-gradient(circle, rgba(37,99,235,0.06) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
                zIndex: 1
              }} />

              <div style={{ zIndex: 10, position: "relative" }}>
                <RoboAssistant context="hero" mood="idle" size="lg" />
              </div>

              <div style={{
                position: "absolute",
                bottom: "20px",
                zIndex: 10,
                fontSize: "11px",
                color: "var(--color-primary-dark)",
                background: "var(--color-primary-soft)",
                padding: "4px 12px",
                borderRadius: "20px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em"
              }}>
                Робо-наставник Роберт 🤖
              </div>
            </div>

            {/* Floating Info Cards */}
            <div className="card-site floating-card-anim" style={{
              position: "absolute",
              bottom: "40px",
              left: "-32px",
              padding: "12px 18px",
              background: "white",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 10px 25px rgba(37, 99, 235, 0.12)",
              zIndex: 20
            }}>
              <div style={{
                background: "var(--color-success-soft)",
                color: "var(--color-success)",
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Smile size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "12px", color: "var(--color-text)" }}>90 минут практики</div>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Робот готов на 1-м занятии</div>
              </div>
            </div>

            <div className="card-site floating-card-anim" style={{
              position: "absolute",
              top: "32px",
              right: "-20px",
              padding: "10px 16px",
              background: "white",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 10px 25px rgba(37, 99, 235, 0.12)",
              zIndex: 20
            }}>
              <Cpu size={16} style={{ color: "var(--color-primary)" }} />
              <div style={{ fontWeight: 800, fontSize: "12px", color: "var(--color-text)" }}>
                {heroLocationLabel}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. NUMBERS SECTION */}
      <section style={{ padding: "64px 0", background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="container" style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "32px"
        }}>
          <div style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: "2.5rem", color: "var(--color-primary)", marginBottom: "4px" }}>6–14 лет</h3>
            <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", fontWeight: 600 }}>Кружок робототехники в Липецке</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: "2.5rem", color: "var(--color-primary)", marginBottom: "4px" }}>до 8 детей</h3>
            <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", fontWeight: 600 }}>Внимание наставника каждому</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: "2.5rem", color: "var(--color-primary)", marginBottom: "4px" }}>90 минут</h3>
            <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", fontWeight: 600 }}>Длительность занятия</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: "2.5rem", color: "var(--color-primary)", marginBottom: "4px" }}>0 ₽</h3>
            <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", fontWeight: 600 }}>Первый пробный урок</p>
          </div>
        </div>
      </section>

      {/* 3. Что ребенок принесет домой после первого месяца */}
      <section style={{ padding: "100px 0", borderBottom: "1px solid var(--color-border)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
              Что ребёнок получит после 1-го месяца занятий
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-body-lg)" }}>
              Осязаемые результаты обучения, которыми ребенок будет гордиться
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "24px"
          }}>
            <div className="card-site" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Cpu size={24} />
              </div>
              <h4 style={{ fontSize: "1.25rem", fontWeight: 700 }}>3–4 собранных механизма</h4>
              <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                Проекты от простых передач до роботов-манипуляторов. Ребенок изучит основы конструирования.
              </p>
            </div>

            <div className="card-site" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Code size={24} />
              </div>
              <h4 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Свою первую 2D-игру</h4>
              <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                Написанный на Scratch или Python игровой проект. Ребенок разберется, как мыслят программисты.
              </p>
            </div>

            <div className="card-site" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "var(--color-success-soft)", color: "var(--color-success)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Lightbulb size={24} />
              </div>
              <h4 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Инженерную логику</h4>
              <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                Понимание работы датчиков, моторов и шестеренок на практике, а не по скучным учебникам.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. COURSES SECTION (BENTO GRID) */}
      <section id="courses" style={{ padding: "100px 0", background: "var(--color-bg)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
              Курсы для детей в Липецке
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-body-lg)" }}>
              Подберите направление под возраст и интересы вашего ребенка
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "32px"
          }}>
            {coursesToRender.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px 0", color: "var(--color-text-muted)", background: "white", borderRadius: "16px", border: "1px dashed var(--color-border)" }}>
                Направления обучения пока не заполнены в CRM.
              </div>
            ) : (
              coursesToRender.map((course) => {
                const IconComp = course.icon;
                return (
                <div key={course.id} className="card-site" style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "24px",
                  minHeight: "380px"
                }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <Link href={course.slug} onClick={() => triggerGoal("course_page_viewed")} style={{
                        background: "var(--color-primary-soft)",
                        color: "var(--color-primary)",
                        padding: "10px",
                        borderRadius: "10px",
                        display: "inline-flex"
                      }}>
                        <IconComp size={24} />
                      </Link>
                      <span className="badge badge-blue" style={{ fontWeight: 800 }}>{course.age}</span>
                    </div>
                    <Link href={course.slug} onClick={() => triggerGoal("course_page_viewed")}>
                      <h3 style={{ fontSize: "var(--font-h3)", marginBottom: "12px", fontFamily: "var(--font-geologica)", transition: "color 0.2s" }} className="hover-link-primary">
                        {course.title}
                      </h3>
                    </Link>
                    
                    {course.mission && (
                      <div style={{ 
                        background: "var(--color-bg)", 
                        padding: "12px", 
                        borderRadius: "8px", 
                        marginBottom: "16px",
                        borderLeft: "3px solid var(--color-accent)" 
                      }}>
                        <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Миссия курса:</div>
                        <div style={{ fontSize: "var(--font-small)", fontWeight: 700, color: "var(--color-text)" }}>{course.mission}</div>
                      </div>
                    )}

                    <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", marginBottom: "16px" }}>{course.desc}</p>
                    
                    {course.results.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)" }}>Результаты первого месяца:</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {course.results.map((res: string, i: number) => (
                            <span key={i} style={{
                              background: "rgba(37, 99, 235, 0.05)",
                              color: "var(--color-primary-dark)",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 600
                            }}>
                              ✓ {res}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--color-border)", paddingTop: "16px" }}>
                    <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--color-text)" }}>{course.price}</span>
                    <div style={{ display: "flex", gap: "12px" }}>
                      <Link href={course.slug}>
                        <Button variant="secondary-site" style={{ height: "38px", padding: "0 16px", fontSize: "12px" }}>
                          Подробнее
                        </Button>
                      </Link>
                      <Link href="/#lead-form" onClick={() => { setCourseId(course.id); triggerGoal("cta_button_clicked"); }}>
                        <Button variant="primary-site" style={{ height: "38px", padding: "0 16px", fontSize: "12px" }}>
                          Записаться
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>
      </section>

      {/* 5. PROJECTS SECTION (Trust) */}
      <section id="projects" style={{ padding: "100px 0", borderBottom: "1px solid var(--color-border)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
              Проекты наших учеников
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-body-lg)" }}>
              Посмотрите, какие реальные инженерные проекты собирают и программируют дети
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px" }}>
            {projectsToRender.map((proj: any, idx: number) => (
              <div key={idx} className="card-site" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ height: "240px", position: "relative" }}>
                  <img 
                    src={proj.img} 
                    alt={proj.alt || proj.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <div style={{ padding: "24px" }}>
                  <span className={`badge ${proj.tagColor}`} style={{ marginBottom: "12px" }}>{proj.tag}</span>
                  <h4 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px" }}>{proj.title}</h4>
                  <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                    {proj.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS (TIMELINE) */}
      <section style={{ padding: "100px 0", borderBottom: "1px solid var(--color-border)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "80px" }}>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
              Как проходит занятие: 5 этапов урока
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-body-lg)" }}>
              Занятие строится как полноценный спринт разработки
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "24px",
            position: "relative"
          }}>
            <div style={{
              position: "absolute",
              top: "40px",
              left: "40px",
              right: "40px",
              height: "2px",
              borderTop: "2px dashed rgba(37,99,235,0.15)",
              zIndex: 1,
              pointerEvents: "none"
            }} />

            {stepsToRender.map((step, idx) => (
              <div key={idx} style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                zIndex: 2,
                background: "white",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid var(--color-border)",
                boxShadow: "0 8px 20px rgba(0,0,0,0.02)"
              }}>
                <div style={{
                  height: "90px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  position: "relative",
                  background: "var(--color-surface-soft)"
                }}>
                  <img src={step.img} alt={step.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div className="bg-grid-blueprint" style={{ position: "absolute", inset: 0, opacity: 0.1, pointerEvents: "none" }} />
                </div>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "var(--color-primary-soft)",
                  color: "var(--color-primary-dark)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: 800,
                  fontFamily: "var(--font-geologica)",
                  border: "2px solid white",
                  boxShadow: "0 4px 10px rgba(37, 99, 235, 0.1)",
                  marginTop: "-28px",
                  marginLeft: "8px",
                  position: "relative",
                  zIndex: 5
                }}>
                  {step.num}
                </div>
                <div style={{ marginTop: "4px" }}>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "6px" }}>{step.title}</h4>
                  <p style={{ fontSize: "11px", color: "var(--color-text-muted)", lineHeight: 1.4, margin: 0 }}>{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CLASSROOM PHOTOS */}
      <section id="classroom-photos" style={{ padding: "100px 0", background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
              Фото классов и оборудования
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-body-lg)" }}>
              Современные компьютеры, оригинальные конструкторы LEGO Education и электронные стенды Arduino
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px" }}>
            <div style={{ height: "400px", position: "relative", borderRadius: "20px", overflow: "hidden", border: "1px solid var(--color-border)" }}>
              <img 
                src={resolvedClassroomMainImage} 
                alt="Кабинет робототехники Липецк" 
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: "24px" }}>
              <div style={{
                background: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.45)), url('${resolvedEquipmentTopImage}') center/cover no-repeat`,
                borderRadius: "20px",
                border: "1px solid var(--color-border)",
                position: "relative",
                height: "188px"
              }}>
                <span style={{ position: "absolute", bottom: "16px", left: "20px", fontSize: "12px", color: "white", background: "rgba(15, 23, 42, 0.75)", padding: "4px 8px", borderRadius: "6px", fontWeight: 600 }}>Оригинальное оборудование LEGO</span>
              </div>
              <div style={{
                background: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.45)), url('${resolvedEquipmentBottomImage}') center/cover no-repeat`,
                borderRadius: "20px",
                border: "1px solid var(--color-border)",
                position: "relative",
                height: "188px"
              }}>
                <span style={{ position: "absolute", bottom: "16px", left: "20px", fontSize: "12px", color: "white", background: "rgba(15, 23, 42, 0.75)", padding: "4px 8px", borderRadius: "6px", fontWeight: 600 }}>Удобные рабочие зоны для детей</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PORTAL PREVIEW SECTION */}
      <section id="portal-preview" style={{ padding: "100px 0", background: "white", borderBottom: "1px solid var(--color-border)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
              {portalPreviewTitle}
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-body-lg)" }}>
              {portalPreviewSubtitle}
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: "48px",
            alignItems: "start"
          }}>
            {/* Parent Portal Preview Card */}
            <div style={{
              background: "white",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-card-site)",
              padding: "32px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.04)",
              position: "relative",
              overflow: "hidden"
            }}>
              {/* Header */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                borderBottom: "1px solid var(--color-border)",
                paddingBottom: "16px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--color-primary) 0%, #3b82f6 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "var(--font-small)"
                  }}>
                    МИ
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: "0.95rem", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                      {portalData.studentName} <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--color-text-muted)" }}>({portalData.age})</span>
                    </h4>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-primary)", fontWeight: 600 }}>
                      Курс: {portalData.course}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{
                    display: "inline-block",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    background: "rgba(34, 197, 94, 0.1)",
                    color: "rgb(34, 197, 94)",
                    fontSize: "0.7rem",
                    fontWeight: 600
                  }}>
                    Активен
                  </span>
                </div>
              </div>

              {/* Grid content */}
              <div style={{ display: "grid", gap: "12px", marginBottom: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-text-muted)", fontSize: "0.7rem", marginBottom: "4px" }}>
                      <Calendar size={12} style={{ color: "var(--color-primary)" }} />
                      <span>Следующее занятие</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{portalData.nextLesson}</div>
                    <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginTop: "2px" }}>{portalData.cabinet}</div>
                  </div>

                  <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-text-muted)", fontSize: "0.7rem", marginBottom: "4px" }}>
                      <Check size={12} style={{ color: "rgb(34, 197, 94)" }} />
                      <span>Посещаемость</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{portalData.attendance}</span>
                    </div>
                    <div style={{ display: "flex", gap: "3px", marginTop: "6px" }}>
                      {[1, 2, 3, 4, 5, 6, 7].map(i => (
                        <span key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "rgb(34, 197, 94)" }} />
                      ))}
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--color-border)" }} />
                    </div>
                  </div>
                </div>

                <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-text-muted)", fontSize: "0.7rem" }}>
                      <Cpu size={12} style={{ color: "var(--color-primary)" }} />
                      <span>Текущий проект (Миссия)</span>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "2px" }}>{portalData.project}</div>
                </div>

                <div style={{ background: "rgba(249, 115, 22, 0.04)", border: "1px dashed rgba(249, 115, 22, 0.3)", borderRadius: "12px", padding: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-warning-dark)", fontSize: "0.7rem", fontWeight: 600, marginBottom: "4px" }}>
                    <Smile size={12} />
                    <span>Отчет наставника</span>
                  </div>
                  <p style={{ fontSize: "0.75rem", lineHeight: "1.3", fontStyle: "italic", margin: 0, color: "var(--color-text)" }}>
                    «{portalData.teacherNote}»
                  </p>
                </div>
              </div>

              {/* Bottom part */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-bg)", borderRadius: "12px", padding: "12px 16px", border: "1px solid var(--color-border)" }}>
                <div>
                  <span style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", display: "block" }}>Баланс абонемента</span>
                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--color-warning-dark)" }}>{portalData.balance}</span>
                </div>
                <Link href="/#lead-form">
                  <Button variant="primary-site" style={{ padding: "6px 12px", fontSize: "0.75rem", height: "auto" }}>
                    Посмотреть пример кабинета
                  </Button>
                </Link>
              </div>
            </div>

            {/* Student Portal Preview Card */}
            <div style={{
              background: "white",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-card-site)",
              padding: "32px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "20px"
            }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--font-geologica)", margin: 0 }}>
                Ученик видит материалы урока после старта занятия
              </h3>
              <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
                В личном кабинете ученика открывается интерактивная рабочая тетрадь: схемы сборки, примеры кода и домашние задания. Доступ открывает преподаватель в один клик при начале урока.
              </p>

              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", background: "var(--color-bg)", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
                  <div style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)", padding: "6px", borderRadius: "6px" }}>
                    <Calendar size={16} />
                  </div>
                  <div style={{ fontSize: "var(--font-small)", fontWeight: 700 }}>Интерактивное расписание занятий</div>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", background: "var(--color-bg)", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
                  <div style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)", padding: "6px", borderRadius: "6px" }}>
                    <Code size={16} />
                  </div>
                  <div style={{ fontSize: "var(--font-small)", fontWeight: 700 }}>Домашние задания и статус их проверки</div>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", background: "var(--color-bg)", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
                  <div style={{ background: "var(--color-success-soft)", color: "var(--color-success)", padding: "6px", borderRadius: "6px" }}>
                    <Layers size={16} />
                  </div>
                  <div style={{ fontSize: "var(--font-small)", fontWeight: 700 }}>Материалы текущей и прошлых миссий</div>
                </div>
              </div>

              <div style={{ background: "rgba(34, 197, 94, 0.05)", borderLeft: "3px solid rgb(34, 197, 94)", padding: "12px", borderRadius: "4px", fontSize: "12px", color: "rgb(21, 128, 61)", fontWeight: 600 }}>
                🔒 Доступ к материалам контролируется преподавателем
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. TRUST / REVIEWS SECTION */}
      <section style={{ padding: "100px 0", borderBottom: "1px solid var(--color-border)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
              Отзывы родителей
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-body-lg)" }}>
              Мнения семей наших учеников, которые уже оценили прогресс в обучении
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>
            <div className="card-site" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <p style={{ fontStyle: "italic", fontSize: "var(--font-small)", lineHeight: 1.6, color: "var(--color-text)" }}>
                «Ребенок ходит на робототехнику с огромным удовольствием. Каждое занятие ждет с нетерпением. За месяц собрал робота-пылесоса и машинку на датчиках. Удивительно, как быстро дети вовлекаются!»
              </p>
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "16px", marginTop: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--color-primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px", color: "var(--color-primary-dark)" }}>ОН</div>
                <div>
                  <h5 style={{ fontWeight: 700, fontSize: "13px", margin: 0 }}>Ольга Николаева</h5>
                  <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Мама Артема (8 лет)</span>
                </div>
              </div>
            </div>

            <div className="card-site" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <p style={{ fontStyle: "italic", fontSize: "var(--font-small)", lineHeight: 1.6, color: "var(--color-text)" }}>
                «Сын увлекался играми, решили направить интерес в полезное русло. На курсе Scratch он сам создал 2D платформер! Преподаватели очень чуткие и терпеливые. Рекомендую школу Робокс!»
              </p>
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "16px", marginTop: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--color-accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px", color: "var(--color-accent-dark)" }}>ДП</div>
                <div>
                  <h5 style={{ fontWeight: 700, fontSize: "13px", margin: 0 }}>Дмитрий Петров</h5>
                  <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Папа Игоря (10 лет)</span>
                </div>
              </div>
            </div>

            <div className="card-site" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <p style={{ fontStyle: "italic", fontSize: "var(--font-small)", lineHeight: 1.6, color: "var(--color-text)" }}>
                «Отличные светлые классы и качественное оборудование. Дочка занимается схемотехникой на Arduino. Наставники объясняют все на пальцах. Очень радует наличие отчетов в личном кабинете.»
              </p>
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "16px", marginTop: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--color-success-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px", color: "var(--color-success)" }}>ЕС</div>
                <div>
                  <h5 style={{ fontWeight: 700, fontSize: "13px", margin: 0 }}>Елена Смирнова</h5>
                  <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Мама Ани (11 лет)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. SCHEDULE */}
      <section id="schedule" style={{ padding: "100px 0" }}>
        <div className="container" style={{ padding: "0 20px" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
              Расписание учебных групп в Липецке
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-body-lg)" }}>
              Мы подберем удобный график занятий для вашего ребенка
            </p>
          </div>

          {/* Filters Bar */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "32px",
            background: "white",
            padding: "20px 24px",
            borderRadius: "16px",
            border: "1px solid var(--color-border)"
          }}>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "var(--color-text-muted)", display: "block", marginBottom: "6px" }}>Возраст ребенка</label>
              <select className="form-input" style={{ width: "100%", height: "44px", borderRadius: "10px", border: "1px solid var(--color-border)", background: "white", padding: "0 12px" }} value={filterAge} onChange={e => setFilterAge(e.target.value)}>
                <option value="all">Все возрасты</option>
                <option value="preschool">Дошкольники (5–7 лет)</option>
                <option value="junior">Младшая школа (8–10 лет)</option>
                <option value="senior">Средняя/старшая школа (11–15 лет)</option>
              </select>
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "var(--color-text-muted)", display: "block", marginBottom: "6px" }}>Направление</label>
              <select className="form-input" style={{ width: "100%", height: "44px", borderRadius: "10px", border: "1px solid var(--color-border)", background: "white", padding: "0 12px" }} value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
                <option value="all">Все направления</option>
                {uniqueCourses.map((c: any) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "var(--color-text-muted)", display: "block", marginBottom: "6px" }}>Адрес / Филиал</label>
              <select className="form-input" style={{ width: "100%", height: "44px", borderRadius: "10px", border: "1px solid var(--color-border)", background: "white", padding: "0 12px" }} value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
                <option value="all">Все филиалы</option>
                {uniqueBranches.map((b: any) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* Schedule list container */}
          <div style={{ display: "grid", gap: "16px" }}>
            {scheduleToRender.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px", color: "var(--color-text-muted)", background: "white", borderRadius: "var(--radius-card-site)", border: "1px solid var(--color-border)" }}>
                Нет подходящих групп. Попробуйте сбросить фильтры или оставьте заявку, мы подберем группу индивидуально!
              </div>
            ) : (
              scheduleToRender.map((sched: any, idx: number) => (
                <div key={idx} className="card-site" style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "24px 32px",
                  gap: "24px",
                  flexWrap: "wrap",
                  background: "white"
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 180px" }}>
                    <span style={{ fontSize: "12px", color: "var(--roboks-pink)", fontWeight: 800 }}>Возраст: {sched.age}</span>
                    <h4 style={{ fontSize: "17px", fontWeight: 800, margin: 0, color: "var(--color-text)" }}>{sched.course}</h4>
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: "1 1 180px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Расписание</span>
                    <span style={{ fontWeight: 650, fontSize: "14px" }}>{sched.time}</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: "1 1 180px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Филиал & Преподаватель</span>
                    <span style={{ fontSize: "13.5px", fontWeight: 600 }}>{sched.branch || "Школа Робокс"} {sched.teacher ? `• ${sched.teacher}` : ""}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: "0 0 auto", flexWrap: "wrap" }}>
                    <span className={`badge ${sched.badgeClass}`} style={{ fontWeight: 800, padding: "8px 14px", borderRadius: "20px" }}>{sched.spotsText}</span>
                    <a href="#lead-form">
                      <Button variant="secondary-site" style={{ height: "40px", fontSize: "12px", borderRadius: "10px", padding: "0 16px" }}>Записаться</Button>
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 10. PRICES SECTION */}
      <section id="prices" style={{ padding: "100px 0", background: "var(--color-bg)" }}>
        <div className="container" style={{ padding: "0 20px" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
              Стоимость занятий
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-body-lg)" }}>
              Выбирайте удобный формат посещения занятий в нашей школе
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "32px"
          }}>
            {(() => {
              const tariffsList = (initialTariffs && initialTariffs.length > 0)
                ? initialTariffs
                : [];

              if (tariffsList.length === 0) {
                return (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px 0", color: "var(--color-text-muted)", background: "white", borderRadius: "16px", border: "1px dashed var(--color-border)" }}>
                    Тарифы обучения пока не заполнены в CRM.
                  </div>
                );
              }

              return tariffsList.map((t: any) => {
                const isTrial = Number(t.price) === 0 || t.title.toLowerCase().includes("пробн") || t.audience?.toLowerCase().includes("дошкол");
                const isMonthly = t.title.toLowerCase().includes("абонемент") || t.audience?.toLowerCase().includes("школ");
                
                const cardStyle: React.CSSProperties = {
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "28px",
                  position: "relative"
                };

                let badgeClass = "badge-gray";
                let badgeText = "Разовый";
                
                if (isTrial) {
                  cardStyle.border = "2.5px solid var(--roboks-cyan)";
                  cardStyle.background = "rgba(142, 208, 221, 0.04)";
                  badgeClass = "badge-blue";
                  badgeText = "Знакомство";
                } else if (isMonthly) {
                  cardStyle.border = "2.5px solid var(--roboks-purple)";
                  cardStyle.boxShadow = "0 16px 40px rgba(70, 62, 142, 0.08)";
                  badgeClass = "badge-purple";
                  badgeText = "Популярно";
                } else {
                  cardStyle.border = "1px solid var(--color-border)";
                  badgeClass = "badge-gray";
                  badgeText = "Персональный";
                }

                return (
                  <div key={t.id} className="card-site" style={cardStyle}>
                    <div>
                      <span className={`badge ${badgeClass}`} style={{ marginBottom: "16px", fontWeight: 800 }}>{badgeText}</span>
                      <h3 style={{ fontSize: "var(--font-h3)", marginBottom: "8px", fontFamily: "var(--font-geologica)" }}>{t.title}</h3>
                      <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", marginBottom: "24px", lineHeight: 1.5 }}>
                        {t.format || t.audience}
                      </p>
                      <div style={{ fontSize: "2rem", fontWeight: 900, fontFamily: "var(--font-geologica)", color: "var(--color-text)" }}>
                        {Number(t.price) === 0 ? "Бесплатно" : `${Number(t.price).toLocaleString("ru-RU")} ₽`}
                        {!t.is_one_time && Number(t.price) > 0 && <span style={{ fontSize: "14px", fontWeight: 650, color: "var(--color-text-muted)" }}> / мес</span>}
                      </div>
                    </div>
                    <Link href="/#lead-form" onClick={() => triggerGoal("cta_button_clicked")}>
                      <Button 
                        variant={isMonthly ? "primary-site" : "secondary-site"} 
                        style={{ 
                          width: "100%", 
                          background: isMonthly ? "var(--roboks-gradient)" : undefined,
                          border: isMonthly ? "none" : undefined,
                          color: isMonthly ? "white" : undefined,
                          fontWeight: 750
                        }}
                      >
                        {isTrial ? "Записаться бесплатно" : isMonthly ? "Купить абонемент" : "Записаться"}
                      </Button>
                    </Link>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </section>

      {/* TEACHERS SECTION */}
      {showTeachers && (
        <section id="teachers" style={{ padding: "100px 0" }}>
          <div className="container">
            <div style={{ textAlign: "center", marginBottom: "64px" }}>
              <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
                {teachersTitle}
              </h2>
              <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-body-lg)" }}>
                {teachersSubtitle}
              </p>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "32px"
            }}>
              {teachersListToRender.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px 0", color: "var(--color-text-muted)", background: "white", borderRadius: "16px", border: "1px dashed var(--color-border)" }}>
                  Преподаватели пока не заполнены в CRM.
                </div>
              ) : (
                teachersListToRender.map((teacher: any, idx: number) => {
                  const initials = teacher.name 
                    ? teacher.name.split(" ").filter(Boolean).map((n: string) => n[0]).join("") 
                    : "Р";
                  return (
                  <div key={idx} className="card-site" style={{ textAlign: "center" }}>
                    <div style={{
                      width: "120px",
                      height: "120px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      margin: "0 auto 20px auto",
                      border: "3px solid var(--color-primary-soft)",
                      boxShadow: "0 8px 24px rgba(70, 62, 142, 0.1)",
                      position: "relative"
                    }}>
                      {teacher.imageUrl ? (
                        <img src={teacher.imageUrl} alt={teacher.alt || teacher.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{
                          width: "100%",
                          height: "100%",
                          background: "var(--roboks-gradient)",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 900,
                          fontSize: "2rem",
                          fontFamily: "var(--font-geologica)"
                        }}>
                          {initials}
                        </div>
                      )}
                      <div className="bg-grid-blueprint" style={{ position: "absolute", inset: 0, opacity: 0.1, pointerEvents: "none" }} />
                    </div>
                    <h4 style={{ fontSize: "1.25rem", marginBottom: "4px", fontFamily: "var(--font-geologica)", fontWeight: 800 }}>{teacher.name}</h4>
                    <p style={{ fontSize: "var(--font-xs)", textTransform: "uppercase", color: "var(--roboks-pink)", fontWeight: 800, marginBottom: "16px" }}>{teacher.role}</p>
                    <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                      «{teacher.text}»
                    </p>
                  </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      )}

      {/* 11. FAQ */}
      <section id="faq" style={{ padding: "100px 0", background: "var(--color-bg)" }}>
        <div className="container" style={{ maxWidth: "800px" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
              Часто задаваемые вопросы
            </h2>
          </div>

          <div style={{ display: "grid", gap: "16px" }}>
            {faqItems.map((item, idx) => (
              <div key={idx} style={{
                background: "white",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                overflow: "hidden"
              }}>
                <button 
                  onClick={() => toggleFaq(idx)}
                  style={{
                    width: "100%",
                    padding: "24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "none",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "var(--font-body)",
                    fontWeight: 700,
                    color: "var(--color-text)"
                  }}
                >
                  <span>{item.q}</span>
                  <ChevronDown 
                    size={20} 
                    style={{ 
                      transform: openFaq === idx ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s" 
                    }} 
                  />
                </button>
                {openFaq === idx && (
                  <div style={{
                    padding: "0 24px 24px 24px",
                    fontSize: "var(--font-small)",
                    color: "var(--color-text-muted)",
                    lineHeight: 1.6
                  }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12. LEAD FORM SECTION */}
      <section id="lead-form" style={{ padding: "100px 0" }} ref={formRef}>
        <div className="container" style={{ maxWidth: "600px" }}>
          <div style={{
            background: "white",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-card-site)",
            padding: "48px",
            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08)"
          }}>
            <h2 style={{
              fontSize: "var(--font-h3)",
              fontFamily: "var(--font-geologica)",
              textAlign: "center",
              marginBottom: "12px"
            }}>
              Записаться на бесплатное пробное занятие
            </h2>
            <p style={{
              color: "var(--color-text-muted)",
              fontSize: "var(--font-small)",
              textAlign: "center",
              marginBottom: "32px",
              lineHeight: 1.5
            }}>
              Заполните форму ниже, чтобы забронировать место. Мы свяжемся с вами в течение 15 минут для подтверждения времени.
            </p>

            <div style={{ marginBottom: "32px" }}>
              <RoboAssistant context="lead-form" mood={roboMood} message={roboAdvice} size="md" />
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Имя родителя *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Иван Иванов" 
                  required 
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Имя ребенка *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Миша" 
                  required 
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Номер телефона *</label>
                <input 
                  type="tel" 
                  className="form-input" 
                  placeholder="+7 (999) 123-45-67" 
                  required 
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="form-group">
                  <label className="form-label">Возраст ребенка</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="8" 
                    min="3"
                    max="18"
                    value={childAge}
                    onChange={(e) => setChildAge(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Направление</label>
                  <select 
                    className="form-input" 
                    style={{ padding: "0 12px" }}
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                  >
                    <option value="">Выберите курс</option>
                    {coursesToRender.map((course) => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selection of convenient time */}
              <div className="form-group">
                <label className="form-label">Удобное время для занятий</label>
                <select 
                  className="form-input" 
                  style={{ padding: "0 12px" }}
                  value={convenientTime}
                  onChange={(e) => setConvenientTime(e.target.value)}
                >
                  <option value="">Выберите время</option>
                  <option value="Утро (09:00 - 12:00)">Утро (09:00 - 12:00)</option>
                  <option value="День (12:00 - 15:00)">День (12:00 - 15:00)</option>
                  <option value="Вечер (15:00 - 18:00)">Вечер (15:00 - 18:00)</option>
                  <option value="Поздний вечер (18:00 - 20:00)">Поздний вечер (18:00 - 20:00)</option>
                  <option value="Выходные дни">Выходные дни</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Комментарий к заявке</label>
                <textarea 
                  className="form-input" 
                  style={{ height: "80px", padding: "12px", resize: "none" }}
                  placeholder="Например: занимались ли раньше конструированием..." 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              {/* Consent checkbox */}
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginTop: "12px" }}>
                <input 
                  type="checkbox" 
                  id="consent" 
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  style={{ marginTop: "4px", cursor: "pointer" }}
                />
                <label htmlFor="consent" style={{ fontSize: "11px", color: "var(--color-text-muted)", cursor: "pointer", lineHeight: 1.4 }}>
                  Нажимая кнопку, вы соглашаетесь с{" "}
                  <Link href="/privacy" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>
                    политикой обработки персональных данных
                  </Link>{" "}
                  и подтверждаете{" "}
                  <Link href="/consent" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>
                    согласие на обработку персональных данных
                  </Link>.
                </label>
              </div>

              {errorMsg && (
                <div style={{
                  color: "var(--color-danger)",
                  background: "var(--color-danger-soft)",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "var(--font-small)",
                  marginTop: "16px",
                  fontWeight: 600
                }}>
                  {errorMsg}
                </div>
              )}

              <Button 
                type="submit" 
                variant="primary-site" 
                style={{ width: "100%", marginTop: "20px", background: "var(--color-accent)" }}
                disabled={loading}
              >
                {loading ? "Отправка..." : "Записаться на бесплатное пробное занятие"}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* 13. CONTACTS SECTION */}
      <section id="contacts" style={{ padding: "100px 0", borderTop: "1px solid var(--color-border)" }}>
        <div className="container site-contact-grid" style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: "80px",
          alignItems: "center"
        }}>
          <div className="site-contact-media-grid" style={{ display: "grid", gridTemplateRows: "250px 130px", gap: "20px" }}>
            <div className="branch-map-shell" style={{
              borderRadius: "var(--radius-card-site)",
              position: "relative",
              border: "1px solid var(--color-border)",
              boxShadow: "0 10px 25px rgba(0,0,0,0.03)",
              height: "250px",
              overflow: "hidden",
              background: "var(--color-primary-soft)"
            }}>
              {contactStaticMapUrl && contactMapMarkers.length > 0 ? (
                <>
                  <img
                    src={contactStaticMapUrl}
                    alt="Карта филиалов Робокс"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  {contactMapMarkers.map((marker, index) => (
                    <a
                      key={`${marker.address}-${index}`}
                      className="branch-map-marker"
                      href={marker.openUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Открыть на картах: ${marker.address}`}
                      title={marker.address}
                      style={{
                        position: "absolute",
                        left: `${marker.x}%`,
                        top: `${marker.y}%`,
                        transform: "translate(-50%, -100%)",
                        width: "34px",
                        height: "42px",
                        display: "grid",
                        placeItems: "center",
                        color: "#fff",
                        filter: "drop-shadow(0 6px 10px rgba(15,23,42,0.22))",
                      }}
                    >
                      <MapPin size={34} fill="var(--color-accent)" stroke="white" strokeWidth={2} />
                      <span style={{
                        position: "absolute",
                        top: "9px",
                        fontSize: "11px",
                        fontWeight: 900,
                        color: "white",
                        lineHeight: 1,
                      }}>
                        {index + 1}
                      </span>
                    </a>
                  ))}
                </>
              ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)", padding: "24px", textAlign: "center", fontWeight: 700 }}>
                  Адреса филиалов появятся на карте после заполнения в CRM
                </div>
              )}
            </div>

            <div className="site-contact-photo-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div style={{
                backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.45)), url('${resolvedContactFacadeImage}')`,
                backgroundPosition: "center",
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                borderRadius: "12px",
                border: "1px solid var(--color-border)",
                position: "relative",
                height: "130px"
              }}>
                <span style={{ position: "absolute", bottom: "8px", left: "10px", fontSize: "10px", color: "white", background: "rgba(15, 23, 42, 0.75)", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>Фасад школы</span>
              </div>
              <div style={{
                backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.45)), url('${resolvedContactClassroomImage}')`,
                backgroundPosition: "center",
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                borderRadius: "12px",
                border: "1px solid var(--color-border)",
                position: "relative",
                height: "130px"
              }}>
                <span style={{ position: "absolute", bottom: "8px", left: "10px", fontSize: "10px", color: "white", background: "rgba(15, 23, 42, 0.75)", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>Наш класс</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
              <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "12px" }}>Контакты</h2>
              <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-small)" }}>
                Приходите на бесплатный пробный урок и посмотрите наши классы лично!
              </p>
            </div>

            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)", padding: "10px", borderRadius: "10px" }}>
                <MapPin size={20} />
              </div>
              <div style={{ display: "grid", gap: "12px", minWidth: 0 }}>
                <h4 style={{ fontWeight: 700, fontSize: "1rem" }}>Наши адреса</h4>
                {contactMapMarkers.map((marker, index) => (
                  <div key={`${marker.address}-contact-${index}`} style={{ display: "grid", gap: "4px" }}>
                    <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", margin: 0 }}>
                      {marker.address}
                    </p>
                    <a
                      href={marker.openUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "12px", color: "var(--color-primary)", fontWeight: 800, textDecoration: "underline" }}
                    >
                      Открыть на картах
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)", padding: "10px", borderRadius: "10px" }}>
                <Clock3 size={20} />
              </div>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: "1rem" }}>Режим работы</h4>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>{contactHours}</p>
              </div>
            </div>

            {/* Legal Information */}
            <div style={{
              borderTop: "1px solid var(--color-border)",
              paddingTop: "16px",
              fontSize: "11px",
              color: "var(--color-text-muted)",
              lineHeight: 1.5
            }}>
              <div style={{ fontWeight: 700, marginBottom: "4px" }}>Юридическая информация:</div>
              <div>{orgDetails?.full_legal_name || orgDetails?.short_legal_name || "Юлдашев Рустам Хакимович (ИП)"}</div>
              <div>ИНН: {orgDetails?.inn || "482426310695"}{orgDetails?.ogrn ? ` · ОГРНИП: ${orgDetails.ogrn}` : ""}</div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
