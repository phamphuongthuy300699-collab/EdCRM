"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@robotics-crm/ui";
import { RoboAssistant } from "@/shared/ui/robo-assistant";
import Link from "next/link";
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

interface LandingPageClientProps {
  initialCourses?: any[];
  initialSchedule?: any[];
  initialPrices?: any;
  initialBlocks?: any[];
  initialTeachers?: any[];
  initialBranches?: any[];
}

export default function LandingPageClient({
  initialCourses,
  initialSchedule,
  initialPrices,
  initialBlocks,
  initialTeachers,
  initialBranches,
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

  // Static Fallback Data
  const coursesList = [
    {
      id: "4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a",
      slug: "/robototekhnika-dlya-detey-lipetsk",
      title: "Робототехника (Lego Education)",
      age: "6–9 лет",
      desc: "Изучение механики и основ программирования роботов через конструирование.",
      mission: "Собрать робота-уборщика, объезжающего препятствия",
      results: ["первый рабочий механизм", "базовые алгоритмы", "защита мини-проекта"],
      icon: Cpu,
      price: "4 500 ₽ / мес"
    },
    {
      id: "1d0d97b0-cbe6-444a-a006-2c5e533ebbbd",
      slug: "/scratch-dlya-detey-lipetsk",
      title: "Scratch и основы программирования",
      age: "7–11 лет",
      desc: "Создание собственных игр, мультфильмов и интерактивных проектов.",
      mission: "Создать 2D-платформер с физикой прыжков и врагами",
      results: ["своя игра на Scratch", "логические ветвления", "опыт геймдизайна"],
      icon: Gamepad2,
      price: "4 000 ₽ / мес"
    },
    {
      id: "2d0d97b0-cbe6-444a-a006-2c5e533ebbbd",
      slug: "/python-dlya-detey-lipetsk",
      title: "Программирование на Python",
      age: "10–14 лет",
      desc: "Освоение профессионального программирования на простых и понятных задачах.",
      mission: "Написать ИИ-помощника для Telegram",
      results: ["синтаксис Python", "работа с API", "деплой первого чат-бота"],
      icon: Code,
      price: "4 800 ₽ / мес"
    },
    {
      id: "3d0d97b0-cbe6-444a-a006-2c5e533ebbbd",
      slug: "/arduino-dlya-detey-lipetsk",
      title: "Arduino и схемотехника",
      age: "10–15 лет",
      desc: "Проектирование электронных схем, умных устройств и программирование микроконтроллеров.",
      mission: "Спроектировать систему автополива растений с датчиком влажности",
      results: ["сборка схем без пайки", "программирование C/C++", "работа с сенсорами"],
      icon: Lightbulb,
      price: "5 200 ₽ / мес"
    }
  ];

  const steps = [
    { num: "01", title: "Разбираем идею", text: "Объясняем тему занятия на простых физических примерах.", img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=200" },
    { num: "02", title: "Собираем модель", text: "Конструируем робота или схему собственными руками.", img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=200" },
    { num: "03", title: "Пишем алгоритм", text: "Программируем логику поведения на компьютере.", img: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=200" },
    { num: "04", title: "Тестируем проект", text: "Запускаем робота на трассе, находим ошибки в коде.", img: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=200" },
    { num: "05", title: "Защищаем результат", text: "Ребёнок объясняет работу модели и показывает её родителям.", img: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=200" }
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
  const teachersTitle = teachersBlock?.title || "Наши преподаватели";
  const teachersSubtitle = teachersBlock?.subtitle || "Практикующие наставники, которые умеют объяснять сложное детям простым языком";
  const teacherFallbackList = teachersBlock?.content?.items || [
    {
      name: "Алексей Дмитриев",
      role: "Старший наставник LEGO & Arduino",
      text: "Помогает детям не бояться ошибок и доводить инженерные проекты до рабочего результата.",
      imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
      alt: "Алексей Дмитриев — преподаватель робототехники"
    },
    {
      name: "Мария Соколова",
      role: "Преподаватель Scratch и основ программирования",
      text: "Учит мыслить алгоритмами через игры, мультфильмы и первые интерактивные проекты.",
      imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
      alt: "Мария Соколова — преподаватель программирования"
    },
    {
      name: "Егор Смирнов",
      role: "Python / Arduino наставник",
      text: "Объясняет Python, электронику и датчики через практические задачи и мини-проекты.",
      imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
      alt: "Егор Смирнов — наставник Python/Arduino"
    }
  ];
  const teachersListToRender = initialTeachers && initialTeachers.length > 0
    ? initialTeachers.map((teacher: any) => ({
        name: teacher.name,
        role: teacher.role || "Наставник инженерной лаборатории",
        text: teacher.text || "Помогает детям уверенно разбираться в инженерных задачах и доводить проекты до результата.",
        imageUrl: teacher.imageUrl || "",
        alt: teacher.alt || teacher.name,
      }))
    : teacherFallbackList;

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
  const contactAddress = primaryBranch?.address || "г. Липецк, ул. Ленина, д. 10";
  const contactHours = primaryBranch?.work_hours || primaryBranch?.hours || "Понедельник — Суббота: 09:00 - 20:00";

  // Dynamic Courses Mapping
  const coursesToRender = (initialCourses && initialCourses.length > 0)
    ? initialCourses.map(dbCourse => {
        const localConfig = coursesList.find(c => c.id === dbCourse.id || c.title.toLowerCase().includes(dbCourse.title.toLowerCase()));
        return {
          id: dbCourse.id,
          title: dbCourse.title,
          slug: dbCourse.slug ? `/${dbCourse.slug}` : (localConfig?.slug || "/"),
          age: dbCourse.min_age && dbCourse.max_age ? `${dbCourse.min_age}–${dbCourse.max_age} лет` : (localConfig?.age || "6-14 лет"),
          desc: dbCourse.short_description || dbCourse.full_description || (localConfig?.desc || ""),
          mission: localConfig?.mission || "Собрать и запрограммировать собственный проект",
          results: localConfig?.results || ["первые навыки", "логическое мышление"],
          icon: localConfig?.icon || Cpu,
          price: dbCourse.price_monthly ? `от ${Math.round(dbCourse.price_monthly)} ₽ / мес` : (localConfig?.price || "4 000 ₽ / мес")
        };
      })
    : coursesList;

  // Dynamic Schedule Mapping
  const scheduleToRender = (initialSchedule && initialSchedule.length > 0)
    ? initialSchedule.map((item: any) => {
        let spotsText = "Осталось несколько мест";
        let badgeClass = "badge-green";
        const spots = item.spots ?? 0;
        if (spots <= 0) {
          spotsText = "Группа заполнена";
          badgeClass = "badge-red";
        } else if (spots === 1 || spots === 2) {
          spotsText = `Осталось ${spots} места`;
          badgeClass = "badge-amber";
        } else {
          spotsText = `Осталось ${spots} мест`;
          badgeClass = "badge-green";
        }
        return {
          age: item.age,
          course: item.course,
          time: item.time,
          spotsText,
          badgeClass,
        };
      })
    : [
        { age: "6–8 лет", course: "Робототехника Lego (Старт)", time: "Вторник / Четверг 17:00", spotsText: "Осталось 2 места", badgeClass: "badge-amber" },
        { age: "8–10 лет", course: "Программирование Scratch", time: "Среда / Пятница 18:00", spotsText: "Осталось 3 места", badgeClass: "badge-green" },
        { age: "10–14 лет", course: "Разработка на Python", time: "Суббота 12:00", spotsText: "Группа заполнена", badgeClass: "badge-red" },
        { age: "10–15 лет", course: "Схемотехника и Arduino", time: "Суббота 15:00", spotsText: "Осталось 4 места", badgeClass: "badge-green" }
      ];

  return (
    <div style={{ fontFamily: "var(--font-inter), sans-serif", color: "var(--color-text)" }}>
      
      {/* 1. HERO SECTION */}
      <section className="bg-grid-blueprint" style={{
        padding: "80px 0 120px 0",
        borderBottom: "1px solid var(--color-border)",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{
          position: "absolute",
          top: "-150px",
          right: "-150px",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          border: "1.5px dashed rgba(37,99,235,0.06)",
          pointerEvents: "none"
        }} />

        <div className="container" style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.1fr",
          alignItems: "center",
          gap: "64px",
          position: "relative",
          zIndex: 10
        }}>
          {/* Hero Left Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--color-primary-soft)",
              color: "var(--color-primary-dark)",
              padding: "6px 12px",
              borderRadius: "20px",
              width: "fit-content",
              fontWeight: 800,
              fontSize: "var(--font-xs)",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}>
              {heroBadge}
            </div>

            <h1 style={{
              fontSize: "var(--font-h1)",
              color: "var(--color-text)",
              lineHeight: 1.15,
              fontFamily: "var(--font-geologica)",
              maxWidth: "600px"
            }}>
              {heroTitle}
            </h1>

            <p style={{
              fontSize: "var(--font-body-lg)",
              color: "var(--color-text-muted)",
              maxWidth: "500px",
              lineHeight: 1.6
            }}>
              {heroSubtitle}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>
              <div style={{ display: "flex", gap: "16px" }}>
                <Link href="/#lead-form" onClick={() => triggerGoal("cta_button_clicked")}>
                  <Button variant="primary-site" style={{ background: "var(--color-accent)", height: "52px", padding: "0 28px" }}>
                    {heroCtaText}
                    <ArrowRight size={18} />
                  </Button>
                </Link>
                <Link href="/#projects">
                  <Button variant="secondary-site" style={{ height: "52px", padding: "0 28px" }}>
                    {heroSecondaryCtaText}
                  </Button>
                </Link>
              </div>
              
              {/* Bullet points under Hero CTA */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px 24px",
                maxWidth: "500px",
                background: "rgba(255, 255, 255, 0.7)",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid var(--color-border)"
              }}>
                {heroBullets.map((bullet: string, idx: number) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600 }}>
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
                backgroundImage: "linear-gradient(to bottom, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.98)), url('https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&q=80&w=800')",
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
                Липецк · ул. Ленина, 10
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
            {coursesToRender.map((course) => {
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

                    <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", marginBottom: "16px" }}>{course.desc}</p>
                    
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
            })}
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
            <div className="card-site" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ height: "240px", position: "relative" }}>
                <img 
                  src="/images/robot_sumo.png" 
                  alt="Робот-сумоист на базе LEGO" 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div style={{ padding: "24px" }}>
                <span className="badge badge-amber" style={{ marginBottom: "12px" }}>Lego Education · 8-10 лет</span>
                <h4 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px" }}>Робот для соревнований «Сумо»</h4>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                  Проект Данила (8 лет). Робот оборудован ультразвуковым датчиком для поиска противника на ринге и гусеничным приводом для максимальной силы выталкивания.
                </p>
              </div>
            </div>

            <div className="card-site" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ height: "240px", position: "relative" }}>
                <img 
                  src="/images/arduino_greenhouse.png" 
                  alt="Умная теплица на Arduino" 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div style={{ padding: "24px" }}>
                <span className="badge badge-purple" style={{ marginBottom: "12px" }}>Arduino & C++ · 11-14 лет</span>
                <h4 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px" }}>Автоматическая микро-теплица</h4>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                  Проект Ивана (12 лет). Конструкция автоматически включает светодиодное освещение при затенении и поливает почву при срабатывании датчика влажности.
                </p>
              </div>
            </div>
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

            {steps.map((step, idx) => (
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
                src="/images/classroom_lipetsk.png" 
                alt="Кабинет робототехники Липецк" 
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: "24px" }}>
              <div style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.45)), url('https://images.unsplash.com/photo-1560785496-3c9d27877182?auto=format&fit=crop&q=80&w=400') center/cover no-repeat",
                borderRadius: "20px",
                border: "1px solid var(--color-border)",
                position: "relative",
                height: "188px"
              }}>
                <span style={{ position: "absolute", bottom: "16px", left: "20px", fontSize: "12px", color: "white", background: "rgba(15, 23, 42, 0.75)", padding: "4px 8px", borderRadius: "6px", fontWeight: 600 }}>Оригинальное оборудование LEGO</span>
              </div>
              <div style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.45)), url('https://images.unsplash.com/photo-1564981797816-1043664bf78d?auto=format&fit=crop&q=80&w=400') center/cover no-repeat",
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
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
              Расписание учебных групп в Липецке
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-body-lg)" }}>
              Мы подберем удобный график занятий для вашего ребенка
            </p>
          </div>

          <div style={{
            background: "white",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-card-site)",
            overflow: "hidden",
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.03)"
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr 1.2fr", padding: "20px 32px", background: "var(--color-bg)", fontWeight: 700, fontSize: "var(--font-small)", borderBottom: "1px solid var(--color-border)" }}>
              <span>Возраст</span>
              <span>Курс</span>
              <span>Время занятий</span>
              <span>Наличие мест</span>
            </div>
            
            {scheduleToRender.map((sched: any, idx: number) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr 1.2fr", padding: "24px 32px", borderBottom: idx < scheduleToRender.length - 1 ? "1px solid var(--color-border)" : "none", alignItems: "center" }}>
                <span style={{ fontWeight: 700 }}>{sched.age}</span>
                <span>{sched.course}</span>
                <span>{sched.time}</span>
                <span className={`badge ${sched.badgeClass}`}>{sched.spotsText}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. PRICES SECTION */}
      <section id="prices" style={{ padding: "100px 0", background: "var(--color-bg)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
              Стоимость занятий
            </h2>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "32px"
          }}>
            <div className="card-site" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "32px" }}>
              <div>
                <span className="badge badge-blue" style={{ marginBottom: "16px" }}>Знакомство</span>
                <h3 style={{ fontSize: "var(--font-h3)", marginBottom: "8px" }}>Пробное занятие</h3>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", marginBottom: "24px" }}>
                  Ознакомительное занятие 90 минут. Ребенок соберет первого робота.
                </p>
                <div style={{ fontSize: "2rem", fontWeight: 900, fontFamily: "var(--font-geologica)" }}>
                  {trialPrice}
                </div>
              </div>
              <Link href="/#lead-form" onClick={() => triggerGoal("cta_button_clicked")}>
                <Button variant="secondary-site" style={{ width: "100%" }}>Записаться бесплатно</Button>
              </Link>
            </div>

            <div className="card-site" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "32px", border: "2px solid var(--color-primary)" }}>
              <div>
                <span className="badge badge-green" style={{ marginBottom: "16px" }}>Популярно</span>
                <h3 style={{ fontSize: "var(--font-h3)", marginBottom: "8px" }}>Месячный абонемент</h3>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", marginBottom: "24px" }}>
                  4 занятия по 90 минут. Все учебные материалы и LEGO включены.
                </p>
                <div style={{ fontSize: "2rem", fontWeight: 900, fontFamily: "var(--font-geologica)" }}>
                  {monthlyPrice}
                </div>
              </div>
              <Link href="/#lead-form" onClick={() => triggerGoal("cta_button_clicked")}>
                <Button variant="primary-site" style={{ width: "100%" }}>Купить абонемент</Button>
              </Link>
            </div>

            <div className="card-site" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "32px" }}>
              <div>
                <span className="badge badge-purple" style={{ marginBottom: "16px" }}>Углубленный</span>
                <h3 style={{ fontSize: "var(--font-h3)", marginBottom: "8px" }}>Индивидуальный</h3>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", marginBottom: "24px" }}>
                  Персональный урок с наставником. Индивидуальный разбор сложных проектов.
                </p>
                <div style={{ fontSize: "2rem", fontWeight: 900, fontFamily: "var(--font-geologica)" }}>
                  {individualPrice}
                </div>
              </div>
              <Link href="/#lead-form" onClick={() => triggerGoal("cta_button_clicked")}>
                <Button variant="secondary-site" style={{ width: "100%" }}>Заказать разбор</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TEACHERS SECTION */}
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
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "32px"
          }}>
            {teachersListToRender.map((teacher: any, idx: number) => (
              <div key={idx} className="card-site" style={{ textAlign: "center" }}>
                <div style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  margin: "0 auto 20px auto",
                  border: "3px solid var(--color-primary-soft)",
                  boxShadow: "0 8px 16px rgba(0,0,0,0.06)",
                  position: "relative"
                }}>
                  <img src={teacher.imageUrl} alt={teacher.alt || teacher.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div className="bg-grid-blueprint" style={{ position: "absolute", inset: 0, opacity: 0.1, pointerEvents: "none" }} />
                </div>
                <h4 style={{ fontSize: "1.25rem", marginBottom: "4px" }}>{teacher.name}</h4>
                <p style={{ fontSize: "var(--font-xs)", textTransform: "uppercase", color: "var(--color-primary)", fontWeight: 700, marginBottom: "16px" }}>{teacher.role}</p>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
                  «{teacher.text}»
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
        <div className="container" style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: "80px",
          alignItems: "center"
        }}>
          <div style={{ display: "grid", gridTemplateRows: "250px 130px", gap: "20px" }}>
            {/* Address map mock */}
            <div style={{
              background: "linear-gradient(to bottom, rgba(15, 23, 42, 0.1), rgba(15, 23, 42, 0.25)), url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=600') center/cover no-repeat",
              borderRadius: "var(--radius-card-site)",
              position: "relative",
              border: "1px solid var(--color-border)",
              boxShadow: "0 10px 25px rgba(0,0,0,0.03)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "250px"
            }}>
              <div style={{
                background: "white",
                padding: "8px 16px",
                borderRadius: "20px",
                border: "2px solid var(--color-primary)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}>
                <MapPin size={16} style={{ color: "var(--color-primary)" }} />
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text)" }}>{contactAddress}</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.45)), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=300') center/cover no-repeat",
                borderRadius: "12px",
                border: "1px solid var(--color-border)",
                position: "relative",
                height: "130px"
              }}>
                <span style={{ position: "absolute", bottom: "8px", left: "10px", fontSize: "10px", color: "white", background: "rgba(15, 23, 42, 0.75)", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>Фасад школы</span>
              </div>
              <div style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.45)), url('/images/classroom_lipetsk.png') center/cover no-repeat",
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
              <div>
                <h4 style={{ fontWeight: 700, fontSize: "1rem" }}>Наш адрес</h4>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>{contactAddress}</p>
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
              <div>ИП Куратор Липецк Роботикс</div>
              <div>ОГРНИП: 326482100099999 · ИНН: 482609999999</div>
              <div>Лицензия на образовательную деятельность № 48-Л01-9999</div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
