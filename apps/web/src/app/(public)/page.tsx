"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@robotics-crm/ui";
import { RoboAssistant } from "@/shared/ui/robo-assistant";
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

export default function LandingPage() {
  const router = useRouter();
  
  // Form State
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [courseId, setCourseId] = useState("");
  const [message, setMessage] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [roboAdvice, setRoboAdvice] = useState("Я помогу подобрать идеальную группу по возрасту и уровню!");
  const [roboMood, setRoboMood] = useState<"idle" | "happy" | "thinking" | "success" | "warning" | "sleepy">("idle");

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // Submit Lead
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
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
          message: message || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось отправить заявку");
      }

      // Redirect to thanks page
      router.push("/thanks");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  const coursesList = [
    {
      id: "4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a",
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
    { q: "Как происходит оплата?", a: "Оплата производится помесячно. Возможен наличный или безналичный расчет, а также онлайн-оплата по ссылке." }
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
        {/* Soft engineering decorative circle in background */}
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
              Для детей 6–14 лет в Липецке
            </div>

            <h1 style={{
              fontSize: "var(--font-h1)",
              color: "var(--color-text)",
              lineHeight: 1.1,
              fontFamily: "var(--font-geologica)",
              maxWidth: "600px"
            }}>
              Ребёнок соберёт своего первого робота уже на пробном занятии
            </h1>

            <p style={{
              fontSize: "var(--font-body-lg)",
              color: "var(--color-text-muted)",
              maxWidth: "500px",
              lineHeight: 1.6
            }}>
              Робототехника, Scratch, Python и Arduino в мини-группах до 8 детей под руководством заботливых инженеров-наставников.
            </p>

            <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
              <a href="#lead-form">
                <Button variant="primary-site" style={{ background: "var(--color-accent)", height: "52px", padding: "0 28px" }}>
                  Записаться на пробный урок
                  <ArrowRight size={18} />
                </Button>
              </a>
              <a href="#courses">
                <Button variant="secondary-site" style={{ height: "52px", padding: "0 28px" }}>
                  Посмотреть проекты
                </Button>
              </a>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginTop: "16px",
              borderTop: "1px solid var(--color-border)",
              paddingTop: "24px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "var(--font-small)", fontWeight: 500 }}>
                <Check size={18} style={{ color: "var(--color-success)" }} />
                <span>Мини-группы до 8 человек</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "var(--font-small)", fontWeight: 500 }}>
                <Check size={18} style={{ color: "var(--color-success)" }} />
                <span>Все оборудование включено</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "var(--font-small)", fontWeight: 500 }}>
                <Check size={18} style={{ color: "var(--color-success)" }} />
                <span>Первый проект за 90 минут</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "var(--font-small)", fontWeight: 500 }}>
                <Check size={18} style={{ color: "var(--color-success)" }} />
                <span>Оплата помесячно, без долгов</span>
              </div>
            </div>
          </div>

          {/* Hero Right Visuals: Interactive Robot Assembly Simulator */}
          <div style={{ position: "relative" }} className="hero-visual-card">
            {/* Visual Blueprint Frame */}
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
              {/* Image Placeholder Backdrop */}
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

              {/* Blueprint pattern overlay */}
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

              {/* Concentric blueprint circles */}
              <div style={{
                position: "absolute",
                width: "300px",
                height: "300px",
                borderRadius: "50%",
                border: "1px dashed rgba(37,99,235,0.08)",
                zIndex: 1,
                pointerEvents: "none"
              }} />
              <div style={{
                position: "absolute",
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                border: "1px solid rgba(37,99,235,0.04)",
                zIndex: 1,
                pointerEvents: "none"
              }} />

              {/* Centered RoboAssistant */}
              <div style={{ zIndex: 10, position: "relative" }}>
                <RoboAssistant context="hero" mood="idle" size="lg" />
              </div>

              {/* Character label */}
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

            {/* Floating Info Card 1 */}
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
                <div style={{ fontWeight: 800, fontSize: "12px", color: "var(--color-text)" }}>Первый проект за 90 мин</div>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Данил, 8 лет · собрал робота-сумо</div>
              </div>
            </div>

            {/* Floating Info Card 2 */}
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
                LEGO · Scratch · Python · Arduino
              </div>
            </div>

            {/* Floating Info Card 3 */}
            <div className="card-site floating-card-anim" style={{
              position: "absolute",
              top: "140px",
              left: "-40px",
              padding: "8px 12px",
              background: "#FEF3C7",
              border: "1px solid #F59E0B",
              borderRadius: "10px",
              fontWeight: 800,
              fontSize: "11px",
              color: "#B45309",
              boxShadow: "0 8px 20px rgba(245, 158, 11, 0.15)",
              zIndex: 20
            }}>
              🔥 Осталось 2 места в группе
            </div>
          </div>
        </div>
      </section>

      {/* 2. NUMBERS SECTION */}
      <section style={{ padding: "64px 0", background: "var(--color-bg)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="container" style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "32px"
        }}>
          <div style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: "2.5rem", color: "var(--color-primary)", marginBottom: "4px" }}>6–14 лет</h3>
            <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", fontWeight: 600 }}>Возрастные группы</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: "2.5rem", color: "var(--color-primary)", marginBottom: "4px" }}>до 8 детей</h3>
            <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", fontWeight: 600 }}>Мини-группы</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: "2.5rem", color: "var(--color-primary)", marginBottom: "4px" }}>90 минут</h3>
            <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", fontWeight: 600 }}>Длительность урока</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: "2.5rem", color: "var(--color-primary)", marginBottom: "4px" }}>100% практики</h3>
            <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", fontWeight: 600 }}>Результат на каждом занятии</p>
          </div>
        </div>
      </section>

      {/* 2.5. ТАК ВЫГЛЯДИТ ЗАНЯТИЕ ВНУТРИ (PHOTO GALLERY) */}
      <section style={{ padding: "80px 0", background: "white", borderBottom: "1px solid var(--color-border)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
              Так выглядит занятие внутри
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-body-lg)" }}>
              Каждое занятие — это полноценный цикл разработки от идеи до готового устройства
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "24px"
          }}>
            {[
              { title: "Собираем конструкцию", desc: "Конструирование из LEGO Education и Arduino датчиков", img: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=400" },
              { title: "Пишем код", desc: "Программирование поведения робота в Scratch или Python", img: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&q=80&w=400" },
              { title: "Тестируем робота", desc: "Запуск роботов на специальных трассах и полигонах", img: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=400" },
              { title: "Показываем результат", desc: "Демонстрация работы готового проекта родителям", img: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=400" }
            ].map((step, idx) => (
              <div key={idx} className="card-site" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{
                  height: "180px",
                  position: "relative",
                  background: "var(--color-surface-soft)",
                  overflow: "hidden"
                }}>
                  <img
                    src={step.img}
                    alt={step.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover"
                    }}
                  />
                  {/* Subtle Blueprint Grid Overlay */}
                  <div className="bg-grid-blueprint" style={{ position: "absolute", inset: 0, opacity: 0.1, pointerEvents: "none" }} />
                </div>
                <div style={{ padding: "20px", flexGrow: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                  <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>{step.title}</h4>
                  <p style={{ fontSize: "13px", color: "var(--color-text-muted)", lineHeight: 1.4, margin: 0 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Что ребенок принесет домой после первого месяца */}
      <section style={{ padding: "120px 0", borderBottom: "1px solid var(--color-border)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
              Что ребёнок унесёт домой после 1-го месяца занятий
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-body-lg)" }}>
              Осязаемые результаты обучения, которые вы увидите своими глазами
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "24px"
          }}>
            {/* Card 1 */}
            <div className="card-site" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Cpu size={24} />
              </div>
              <h4 style={{ fontSize: "1.25rem", fontWeight: 700 }}>3–4 работающих робота</h4>
              <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                Собственные инженерные проекты: от простого вентилятора до робота-манипулятора и спортивного робота-сумоиста на LEGO.
              </p>
            </div>

            {/* Card 2 */}
            <div className="card-site" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Code size={24} />
              </div>
              <h4 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Свою первую 2D-игру</h4>
              <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                Созданный и опубликованный в Scratch проект: аркада, лабиринт или платформер с собственными персонажами и прописанными скриптами.
              </p>
            </div>

            {/* Card 3 */}
            <div className="card-site" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "var(--color-success-soft)", color: "var(--color-success)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Lightbulb size={24} />
              </div>
              <h4 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Понимание физики и логики</h4>
              <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                Ребёнок на практике разберется, как работают шестеренки, ременные передачи, датчики цвета и ультразвуковые сенсоры.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. COURSES SECTION (BENTO GRID) */}
      <section id="courses" style={{ padding: "120px 0", background: "var(--color-bg)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
              Учебные направления
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-body-lg)" }}>
              Программы адаптированы под возраст и уровень подготовки каждого ребенка
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "32px"
          }}>
            {coursesList.map((course) => {
              const IconComp = course.icon;
              return (
                <div key={course.id} className="card-site" style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "24px",
                  minHeight: "380px"
                }} boundary-dummy-attribute="some-id">
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <div style={{
                        background: "var(--color-primary-soft)",
                        color: "var(--color-primary)",
                        padding: "10px",
                        borderRadius: "10px"
                      }}>
                        <IconComp size={24} />
                      </div>
                      <span className="badge badge-blue" style={{ fontWeight: 800 }}>{course.age}</span>
                    </div>
                    <h3 style={{ fontSize: "var(--font-h3)", marginBottom: "12px", fontFamily: "var(--font-geologica)" }}>{course.title}</h3>
                    
                    {/* Mission badge & text */}
                    <div style={{ 
                      background: "var(--color-bg)", 
                      padding: "12px", 
                      borderRadius: "8px", 
                      marginBottom: "16px",
                      borderLeft: "3px solid var(--color-accent)" 
                    }}>
                      <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Инженерная миссия:</div>
                      <div style={{ fontSize: "var(--font-small)", fontWeight: 700, color: "var(--color-text)" }}>{course.mission}</div>
                    </div>

                    <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", marginBottom: "16px" }}>{course.desc}</p>
                    
                    {/* Month results checklist */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)" }}>Результат первого месяца:</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {course.results.map((res, i) => (
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
                    <a href="#lead-form" onClick={() => setCourseId(course.id)}>
                      <Button variant="secondary-site" style={{ height: "38px", padding: "0 20px", fontSize: "var(--font-small)", fontWeight: 700 }}>
                        Записаться на миссию
                      </Button>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS (TIMELINE) */}
      <section style={{ padding: "120px 0", borderBottom: "1px solid var(--color-border)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "80px" }}>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
              Как рождается проект: 5 этапов занятия
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-body-lg)" }}>
              Каждый урок — это полный путь от идеи до презентации готового робота
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "24px",
            position: "relative"
          }}>
            {/* Dashed connector line in background for desktop */}
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

      {/* 6. WHY PARENTS TRUST US */}
      <section style={{ padding: "120px 0", background: "var(--color-surface-soft)" }}>
        <div className="container" style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "80px",
          alignItems: "center"
        }}>
          <div>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "24px" }}>
              Почему родители доверяют нам обучение детей
            </h2>
            <p style={{ fontSize: "var(--font-body-lg)", color: "var(--color-text-muted)", marginBottom: "32px" }}>
              Мы заботимся о комфорте родителей не меньше, чем об интересе детей к инженерии.
            </p>
            <div style={{ display: "grid", gap: "20px" }}>
              <div style={{ display: "flex", gap: "16px" }}>
                <ShieldCheck size={24} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: "1.05rem" }}>Полная безопасность</h4>
                  <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Светлые оборудованные классы, соответствие санитарным нормам, охрана.</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <UserCheck size={24} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: "1.05rem" }}>Обратная связь от наставника</h4>
                  <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>После каждого занятия вы знаете о прогрессе вашего ребенка.</p>
                </div>
              </div>
            </div>

            {/* Environment Collage */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "32px" }}>
              <div style={{ height: "90px", borderRadius: "8px", overflow: "hidden", position: "relative", border: "1px solid var(--color-border)" }}>
                <img src="https://images.unsplash.com/photo-1564981797816-1043664bf78d?auto=format&fit=crop&q=80&w=200" alt="Кабинет" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", bottom: "4px", left: "6px", fontSize: "9px", color: "white", background: "rgba(15, 23, 42, 0.75)", padding: "1px 5px", borderRadius: "4px", fontWeight: 600 }}>Кабинет</div>
              </div>
              <div style={{ height: "90px", borderRadius: "8px", overflow: "hidden", position: "relative", border: "1px solid var(--color-border)" }}>
                <img src="https://images.unsplash.com/photo-1560785496-3c9d27877182?auto=format&fit=crop&q=80&w=200" alt="Наборы LEGO" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", bottom: "4px", left: "6px", fontSize: "9px", color: "white", background: "rgba(15, 23, 42, 0.75)", padding: "1px 5px", borderRadius: "4px", fontWeight: 600 }}>Наборы LEGO</div>
              </div>
              <div style={{ height: "90px", borderRadius: "8px", overflow: "hidden", position: "relative", border: "1px solid var(--color-border)" }}>
                <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=200" alt="Зона ожидания" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", bottom: "4px", left: "6px", fontSize: "9px", color: "white", background: "rgba(15, 23, 42, 0.75)", padding: "1px 5px", borderRadius: "4px", fontWeight: 600 }}>Зона ожидания</div>
              </div>
            </div>
          </div>

          {/* Smart Parent Portal Mockup */}
          <div style={{
            background: "white",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-card-site)",
            padding: "32px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.04)",
            position: "relative",
            overflow: "hidden"
          }}>
            {/* Header / Top bar of the app mockup */}
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
                    Миша Иванов <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--color-text-muted)" }}>(8 лет)</span>
                  </h4>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-primary)", fontWeight: 600 }}>
                    Курс: Робототехника Lego
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

            {/* Content Cards Grid */}
            <div style={{ display: "grid", gap: "12px", marginBottom: "20px" }}>
              {/* Row 1: Next Class & Attendance */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "12px",
                  padding: "12px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-text-muted)", fontSize: "0.7rem", marginBottom: "4px" }}>
                    <Calendar size={12} style={{ color: "var(--color-primary)" }} />
                    <span>Следующее занятие</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>Суббота, 12:00</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginTop: "2px" }}>Кабинет 3, Александр</div>
                </div>

                <div style={{
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "12px",
                  padding: "12px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-text-muted)", fontSize: "0.7rem", marginBottom: "4px" }}>
                    <Check size={12} style={{ color: "rgb(34, 197, 94)" }} />
                    <span>Посещаемость</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>7 из 8</span>
                    <span style={{ color: "var(--color-text-muted)", fontWeight: 400, fontSize: "0.65rem" }}>88%</span>
                  </div>
                  {/* Attendance dots */}
                  <div style={{ display: "flex", gap: "3px", marginTop: "6px" }}>
                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                      <span key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "rgb(34, 197, 94)" }} />
                    ))}
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--color-border)" }} />
                  </div>
                </div>
              </div>

              {/* Row 2: Current Project */}
              <div style={{
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                padding: "12px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-text-muted)", fontSize: "0.7rem" }}>
                    <Cpu size={12} style={{ color: "var(--color-primary)" }} />
                    <span>Текущий проект (Миссия)</span>
                  </div>
                  <span style={{
                    fontSize: "0.65rem",
                    color: "var(--color-primary)",
                    background: "rgba(37, 99, 235, 0.1)",
                    padding: "1px 4px",
                    borderRadius: "4px",
                    fontWeight: 600
                  }}>
                    Сборка и код
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "2px" }}>
                  Робот «RoboSort-3000»
                </div>
                <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", margin: 0, lineHeight: "1.3" }}>
                  Программируем ультразвуковой датчик расстояния и сервопривод для сортировки деталей.
                </p>
              </div>

              {/* Row 3: Tutor Feedback Quote */}
              <div style={{
                background: "rgba(249, 115, 22, 0.04)",
                border: "1px dashed rgba(249, 115, 22, 0.3)",
                borderRadius: "12px",
                padding: "12px",
                position: "relative"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-warning-dark)", fontSize: "0.7rem", fontWeight: 600, marginBottom: "4px" }}>
                  <Smile size={12} />
                  <span>Отчет наставника (Александр К.)</span>
                </div>
                <p style={{ fontSize: "0.75rem", lineHeight: "1.3", fontStyle: "italic", margin: 0, color: "var(--color-text-main)" }}>
                  «Миша отлично справился с логикой ветвления. Сам доработал алгоритм захвата кубиков, добавив ультразвуковой датчик. Умничка!»
                </p>
              </div>
            </div>

            {/* Bottom Panel: Finance & Button */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--color-bg)",
              borderRadius: "12px",
              padding: "12px 16px",
              border: "1px solid var(--color-border)"
            }}>
              <div>
                <span style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", display: "block" }}>Баланс абонемента</span>
                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                  Осталось <span style={{ color: "var(--color-warning-dark)" }}>2 занятия</span>
                </span>
              </div>
              <Button variant="primary-site" style={{ padding: "6px 12px", fontSize: "0.75rem", height: "auto" }}>
                Продлить
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SCHEDULE & GROUPS */}
      <section id="schedule" style={{ padding: "120px 0" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
              Расписание учебных групп
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-body-lg)" }}>
              Группы формируются по возрасту. Места бронируются по факту подачи заявки.
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
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr 1.2fr", padding: "24px 32px", borderBottom: "1px solid var(--color-border)", alignItems: "center" }}>
              <span style={{ fontWeight: 700 }}>6–8 лет</span>
              <span>Робототехника Lego (Старт)</span>
              <span>Вторник / Четверг 17:00</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ display: "flex", gap: "3px" }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <span key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--color-warning-dark)" }} />
                    ))}
                    {[1, 2].map(i => (
                      <span key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--color-border)" }} />
                    ))}
                  </div>
                  <span className="badge badge-amber">Осталось 2 места</span>
                </div>
              </div>
            </div>
 
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr 1.2fr", padding: "24px 32px", borderBottom: "1px solid var(--color-border)", alignItems: "center" }}>
              <span style={{ fontWeight: 700 }}>8–10 лет</span>
              <span>Программирование на Scratch</span>
              <span>Среда / Пятница 18:00</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ display: "flex", gap: "3px" }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <span key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "rgb(34, 197, 94)" }} />
                    ))}
                    {[1, 2, 3].map(i => (
                      <span key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--color-border)" }} />
                    ))}
                  </div>
                  <span className="badge badge-green">Осталось 3 места</span>
                </div>
              </div>
            </div>
 
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr 1.2fr", padding: "24px 32px", borderBottom: "1px solid var(--color-border)", alignItems: "center" }}>
              <span style={{ fontWeight: 700 }}>10–14 лет</span>
              <span>Разработка на Python</span>
              <span>Суббота 12:00</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ display: "flex", gap: "3px" }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <span key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--color-danger)" }} />
                    ))}
                  </div>
                  <span className="badge badge-red">Группа заполнена</span>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr 1.2fr", padding: "24px 32px", alignItems: "center" }}>
              <span style={{ fontWeight: 700 }}>9–12 лет</span>
              <span>Схемотехника и Arduino</span>
              <span>Суббота 15:00</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ display: "flex", gap: "3px" }}>
                    {[1, 2, 3, 4].map(i => (
                      <span key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "rgb(34, 197, 94)" }} />
                    ))}
                    {[1, 2, 3, 4].map(i => (
                      <span key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--color-border)" }} />
                    ))}
                  </div>
                  <span className="badge badge-green">Осталось 4 места</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "40px", textAlign: "center" }}>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-small)", marginBottom: "16px" }}>
              Не нашли удобное время или сомневаетесь в уровне подготовки ребенка?
            </p>
            <a href="#lead-form">
              <Button variant="secondary-site">Подобрать индивидуальное расписание</Button>
            </a>
          </div>
        </div>
      </section>

      {/* 8. PRICES SECTION */}
      <section id="prices" style={{ padding: "120px 0", background: "var(--color-bg)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
              Стоимость обучения
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-body-lg)" }}>
              Прозрачные тарифы без скрытых переплат и комиссий
            </p>
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
                  Ознакомительный урок для ребенка и знакомство с преподавателем.
                </p>
                <div style={{ fontSize: "2rem", fontWeight: 900, fontFamily: "var(--font-geologica)" }}>
                  0 ₽ <span style={{ fontSize: "var(--font-body)", fontWeight: 500, color: "var(--color-text-muted)" }}>/ первый урок</span>
                </div>
              </div>
              <a href="#lead-form">
                <Button variant="secondary-site" style={{ width: "100%" }}>Записаться бесплатно</Button>
              </a>
            </div>

            <div className="card-site" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "32px", border: "2px solid var(--color-primary)" }}>
              <div>
                <span className="badge badge-green" style={{ marginBottom: "16px" }}>Популярно</span>
                <h3 style={{ fontSize: "var(--font-h3)", marginBottom: "8px" }}>Месячный абонемент</h3>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", marginBottom: "24px" }}>
                  4 занятия по 90 минут. Все учебные материалы включены.
                </p>
                <div style={{ fontSize: "2rem", fontWeight: 900, fontFamily: "var(--font-geologica)" }}>
                  от 4 000 ₽ <span style={{ fontSize: "var(--font-body)", fontWeight: 500, color: "var(--color-text-muted)" }}>/ 4 урока</span>
                </div>
              </div>
              <a href="#lead-form">
                <Button variant="primary-site" style={{ width: "100%" }}>Купить абонемент</Button>
              </a>
            </div>

            <div className="card-site" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "32px" }}>
              <div>
                <span className="badge badge-purple" style={{ marginBottom: "16px" }}>Углубленный</span>
                <h3 style={{ fontSize: "var(--font-h3)", marginBottom: "8px" }}>Индивидуальный</h3>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", marginBottom: "24px" }}>
                  Персональный темп обучения для разбора сложных проектов и подготовки к олимпиадам.
                </p>
                <div style={{ fontSize: "2rem", fontWeight: 900, fontFamily: "var(--font-geologica)" }}>
                  от 1 500 ₽ <span style={{ fontSize: "var(--font-body)", fontWeight: 500, color: "var(--color-text-muted)" }}>/ урок</span>
                </div>
              </div>
              <a href="#lead-form">
                <Button variant="secondary-site" style={{ width: "100%" }}>Заказать разбор</Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 9. TEACHERS SECTION */}
      <section id="teachers" style={{ padding: "120px 0" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
              Наши преподаватели
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-body-lg)" }}>
              Практикующие специалисты, любящие обучать детей робототехнике
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "32px"
          }}>
            <div className="card-site" style={{ textAlign: "center" }}>
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
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200" alt="Алексей Дмитриев" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div className="bg-grid-blueprint" style={{ position: "absolute", inset: 0, opacity: 0.1, pointerEvents: "none" }} />
              </div>
              <h4 style={{ fontSize: "1.25rem", marginBottom: "4px" }}>Алексей Дмитриев</h4>
              <p style={{ fontSize: "var(--font-xs)", textTransform: "uppercase", color: "var(--color-primary)", fontWeight: 700, marginBottom: "16px" }}>Старший наставник (LEGO & Arduino)</p>
              <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
                «Помогает детям не бояться ошибок и доводить свои инженерные разработки до рабочего результата.»
              </p>
            </div>

            <div className="card-site" style={{ textAlign: "center" }}>
              <div style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                overflow: "hidden",
                margin: "0 auto 20px auto",
                border: "3px solid var(--color-accent-soft)",
                boxShadow: "0 8px 16px rgba(0,0,0,0.06)",
                position: "relative"
              }}>
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200" alt="Мария Соколова" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div className="bg-grid-blueprint" style={{ position: "absolute", inset: 0, opacity: 0.1, pointerEvents: "none" }} />
              </div>
              <h4 style={{ fontSize: "1.25rem", marginBottom: "4px" }}>Мария Соколова</h4>
              <p style={{ fontSize: "var(--font-xs)", textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 700, marginBottom: "16px" }}>Преподаватель программирования (Scratch)</p>
              <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
                «Учит мыслить алгоритмами, создавая красочные игры и раскрывая творческий потенциал ребят.»
              </p>
            </div>

            <div className="card-site" style={{ textAlign: "center" }}>
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
                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200" alt="Егор Смирнов" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div className="bg-grid-blueprint" style={{ position: "absolute", inset: 0, opacity: 0.1, pointerEvents: "none" }} />
              </div>
              <h4 style={{ fontSize: "1.25rem", marginBottom: "4px" }}>Егор Смирнов</h4>
              <p style={{ fontSize: "var(--font-xs)", textTransform: "uppercase", color: "var(--color-primary)", fontWeight: 700, marginBottom: "16px" }}>Разработчик на Python / Arduino</p>
              <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
                «Объясняет сложный синтаксис Python и устройство электронных датчиков на простых примерах.»
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FAQ SECTION */}
      <section id="faq" style={{ padding: "120px 0", background: "var(--color-bg)" }}>
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

      {/* 11. LEAD FORM SECTION */}
      <section id="lead-form" style={{ padding: "120px 0" }}>
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
              Записаться на бесплатный урок
            </h2>
            <p style={{
              color: "var(--color-text-muted)",
              fontSize: "var(--font-small)",
              textAlign: "center",
              marginBottom: "32px",
              lineHeight: 1.5
            }}>
              Оставьте контактные данные. Наш администратор свяжется с вами, чтобы подобрать удобную группу.
            </p>

            {/* Robo-Helper Advisor */}
            <div style={{ marginBottom: "32px" }}>
              <RoboAssistant context="lead-form" mood={roboMood} message={roboAdvice} size="md" />
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Ваше имя *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Иван Иванов" 
                  required 
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  onFocus={() => {
                    setRoboAdvice("Знакомимся 👋 Напишите имя — администратор будет знать, как к вам обращаться.");
                    setRoboMood("happy");
                  }}
                  onBlur={() => {
                    setRoboAdvice("Я помогу подобрать идеальную группу по возрасту и уровню!");
                    setRoboMood("idle");
                  }}
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
                  onFocus={() => {
                    setRoboAdvice("Напишите имя ребенка. Это поможет нам настроить его личный кабинет!");
                    setRoboMood("happy");
                  }}
                  onBlur={() => {
                    setRoboAdvice("Я помогу подобрать идеальную группу по возрасту и уровню!");
                    setRoboMood("idle");
                  }}
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
                  onFocus={() => {
                    setRoboAdvice("Позвоним один раз, чтобы подобрать группу. Без спама.");
                    setRoboMood("happy");
                  }}
                  onBlur={() => {
                    setRoboAdvice("Я помогу подобрать идеальную группу по возрасту и уровню!");
                    setRoboMood("idle");
                  }}
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
                    onFocus={() => {
                      setRoboAdvice("6–9 лет → LEGO, 7–11 лет → Scratch, 10+ лет → Python / Arduino ⚙️");
                      setRoboMood("thinking");
                    }}
                    onBlur={() => {
                      setRoboAdvice("Я помогу подобрать идеальную группу по возрасту и уровню!");
                      setRoboMood("idle");
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Направление</label>
                  <select 
                    className="form-input" 
                    style={{ padding: "0 12px" }}
                    value={courseId}
                    onChange={(e) => {
                      setCourseId(e.target.value);
                      if (e.target.value) {
                        setRoboAdvice("Отличный старт! Прекрасный выбор курса.");
                        setRoboMood("happy");
                      }
                    }}
                    onFocus={() => {
                      setRoboAdvice("Выберите стартовое направление. На пробном наставник подскажет точнее.");
                      setRoboMood("happy");
                    }}
                    onBlur={() => {
                      setRoboAdvice("Я помогу подобрать идеальную группу по возрасту и уровню!");
                      setRoboMood("idle");
                    }}
                  >
                    <option value="">Выберите курс</option>
                    {coursesList.map((course) => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Комментарий</label>
                <textarea 
                  className="form-input" 
                  style={{ height: "100px", padding: "12px", resize: "none" }}
                  placeholder="Любые дополнительные пожелания..." 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onFocus={() => {
                    setRoboAdvice("Расскажите о ребенке. Увлекался ли уже роботами или программированием?");
                    setRoboMood("thinking");
                  }}
                  onBlur={() => {
                    setRoboAdvice("Я помогу подобрать идеальную группу по возрасту и уровню!");
                    setRoboMood("idle");
                  }}
                />
              </div>

              {errorMsg && (
                <div style={{
                  color: "var(--color-danger)",
                  background: "var(--color-danger-soft)",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "var(--font-small)",
                  marginBottom: "20px",
                  fontWeight: 600
                }}>
                  {errorMsg}
                </div>
              )}

              <Button 
                type="submit" 
                variant="primary-site" 
                style={{ width: "100%", marginTop: "16px" }}
                disabled={loading}
              >
                {loading ? "Отправка..." : "Отправить заявку"}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* 12. CONTACTS SECTION */}
      <section id="contacts" style={{ padding: "120px 0", background: "var(--color-bg)", borderTop: "1px solid var(--color-border)" }}>
        <div className="container" style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: "80px",
          alignItems: "center"
        }}>
          {/* Map & Photos Split */}
          <div style={{ display: "grid", gridTemplateRows: "250px 130px", gap: "20px" }}>
            {/* Styled Map Preview Card */}
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
              {/* Map pin indicator */}
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
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text)" }}>ул. Ленина, д. 10</span>
              </div>
            </div>

            {/* Photos collage */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.45)), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=300') center/cover no-repeat",
                borderRadius: "12px",
                border: "1px solid var(--color-border)",
                position: "relative",
                height: "130px"
              }}>
                <span style={{ position: "absolute", bottom: "8px", left: "10px", fontSize: "10px", color: "white", background: "rgba(15, 23, 42, 0.75)", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>Фасад здания</span>
              </div>
              <div style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.45)), url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=300') center/cover no-repeat",
                borderRadius: "12px",
                border: "1px solid var(--color-border)",
                position: "relative",
                height: "130px"
              }}>
                <span style={{ position: "absolute", bottom: "8px", left: "10px", fontSize: "10px", color: "white", background: "rgba(15, 23, 42, 0.75)", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>Вход в школу</span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            <div>
              <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>Контакты</h2>
              <p style={{ color: "var(--color-text-muted)" }}>
                Мы всегда рады видеть вас в нашей школе. Заходите на чай и знакомство с лабораторией!
              </p>
            </div>

            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)", padding: "10px", borderRadius: "10px" }}>
                <MapPin size={20} />
              </div>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: "1rem" }}>Наш адрес</h4>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>г. Липецк, ул. Ленина, д. 10</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)", padding: "10px", borderRadius: "10px" }}>
                <Clock3 size={20} />
              </div>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: "1rem" }}>Режим работы</h4>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Понедельник — Суббота: 09:00 - 20:00</p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
