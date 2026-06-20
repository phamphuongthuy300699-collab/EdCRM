"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@robotics-crm/ui";
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
  const [childAge, setChildAge] = useState("");
  const [courseId, setCourseId] = useState("");
  const [message, setMessage] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // Submit Lead
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentName,
          parentPhone,
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
      icon: Cpu,
      price: "4 500 ₽ / мес"
    },
    {
      id: "1d0d97b0-cbe6-444a-a006-2c5e533ebbbd",
      title: "Scratch и основы программирования",
      age: "7–11 лет",
      desc: "Создание собственных игр, мультфильмов и интерактивных проектов.",
      icon: Gamepad2,
      price: "4 000 ₽ / мес"
    },
    {
      id: "python-kids",
      title: "Программирование на Python",
      age: "10–14 лет",
      desc: "Освоение профессионального языка программирования на простых и понятных задачах.",
      icon: Code,
      price: "4 800 ₽ / мес"
    },
    {
      id: "arduino-electronics",
      title: "Arduino и схемотехника",
      age: "10–15 лет",
      desc: "Проектирование электронных схем, умных устройств и программирование микроконтроллеров.",
      icon: Lightbulb,
      price: "5 200 ₽ / мес"
    }
  ];

  const steps = [
    { num: "01", title: "Разбираем идею", text: "Объясняем тему занятия на простых физических примерах." },
    { num: "02", title: "Собираем модель", text: "Конструируем робота или схему собственными руками." },
    { num: "03", title: "Пишем алгоритм", text: "Программируем логику поведения на компьютере." },
    { num: "04", title: "Тестируем и улучшаем", text: "Запускаем проект, находим ошибки и совершенствуем код." }
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
      <section style={{
        padding: "80px 0 120px 0",
        background: "radial-gradient(50% 50% at 50% 50%, #F5F7FA 0%, #FFFFFF 100%)",
        overflow: "hidden"
      }}>
        <div className="container" style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          alignItems: "center",
          gap: "64px"
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
              fontWeight: 700,
              fontSize: "var(--font-xs)",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}>
              Для детей от 6 до 14 лет в Липецке
            </div>

            <h1 style={{
              fontSize: "var(--font-h1)",
              color: "var(--color-text)",
              lineHeight: 1.1,
              fontFamily: "var(--font-geologica)"
            }}>
              Инженерное мышление и робототехника для детей
            </h1>

            <p style={{
              fontSize: "var(--font-body-lg)",
              color: "var(--color-text-muted)",
              maxWidth: "500px",
              lineHeight: 1.6
            }}>
              Собираем роботов, изучаем код и создаем проекты в мини-группах с заботливыми наставниками.
            </p>

            <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
              <a href="#lead-form">
                <Button variant="primary-site">
                  Записаться на пробный урок
                  <ArrowRight size={18} />
                </Button>
              </a>
              <a href="#courses">
                <Button variant="secondary-site">
                  Посмотреть курсы
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
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "var(--font-small)" }}>
                <Check size={18} style={{ color: "var(--color-success)" }} />
                <span>Мини-группы до 8 человек</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "var(--font-small)" }}>
                <Check size={18} style={{ color: "var(--color-success)" }} />
                <span>Все оборудование включено</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "var(--font-small)" }}>
                <Check size={18} style={{ color: "var(--color-success)" }} />
                <span>Первый проект на 1-м уроке</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "var(--font-small)" }}>
                <Check size={18} style={{ color: "var(--color-success)" }} />
                <span>Оплата помесячно, без долгов</span>
              </div>
            </div>
          </div>

          {/* Hero Right Visuals */}
          <div style={{ position: "relative" }}>
            {/* Main Visual Frame */}
            <div style={{
              background: "#EEF2F6",
              borderRadius: "var(--radius-card-site)",
              width: "100%",
              height: "460px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.05)",
              border: "1px solid var(--color-border)",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                <Cpu size={80} style={{ color: "var(--color-primary)", opacity: 0.8 }} />
                <span style={{ fontSize: "var(--font-body)", fontWeight: 700, color: "var(--color-text-muted)" }}>
                  [ Фото учебной лаборатории ]
                </span>
              </div>
            </div>

            {/* Floating Card 1 */}
            <div className="card-site" style={{
              position: "absolute",
              bottom: "40px",
              left: "-32px",
              padding: "16px 20px",
              background: "white",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
            }}>
              <div style={{
                background: "var(--color-success-soft)",
                color: "var(--color-success)",
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Smile size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--font-small)" }}>Собрал первого робота</div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>Данил, 8 лет</div>
              </div>
            </div>

            {/* Floating Card 2 */}
            <div className="card-site" style={{
              position: "absolute",
              top: "32px",
              right: "-20px",
              padding: "16px 20px",
              background: "white",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
            }}>
              <Cpu size={20} style={{ color: "var(--color-primary)" }} />
              <div style={{ fontWeight: 700, fontSize: "var(--font-small)" }}>Scratch · LEGO · Arduino</div>
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

      {/* 3. PROBLEM & SOLUTION */}
      <section style={{ padding: "120px 0" }}>
        <div className="container" style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr",
          gap: "80px",
          alignItems: "center"
        }}>
          <div>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", lineHeight: 1.2, marginBottom: "24px" }}>
              Не просто «занять ребенка после школы»
            </h2>
            <p style={{ fontSize: "var(--font-body-lg)", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
              Наша миссия — вырастить инженеров, изобретателей и программистов, которые понимают, как работают современные технологии изнутри, а не просто потребляют контент с экрана.
            </p>
          </div>

          <div style={{ display: "grid", gap: "24px" }}>
            <div className="card-site" style={{ padding: "24px", display: "flex", gap: "20px", alignItems: "flex-start" }}>
              <div style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)", padding: "12px", borderRadius: "12px" }}>
                <Lightbulb size={24} />
              </div>
              <div>
                <h4 style={{ fontSize: "1.125rem", marginBottom: "8px", fontWeight: 700 }}>Инженерное мышление</h4>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Ребенок учится анализировать задачу, проектировать конструкции и создавать механизмы с нуля.</p>
              </div>
            </div>

            <div className="card-site" style={{ padding: "24px", display: "flex", gap: "20px", alignItems: "flex-start" }}>
              <div style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)", padding: "12px", borderRadius: "12px" }}>
                <Code size={24} />
              </div>
              <div>
                <h4 style={{ fontSize: "1.125rem", marginBottom: "8px", fontWeight: 700 }}>Программирование и логика</h4>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Осваиваем алгоритмы в Scratch и переходим к реальному коду на Python и Arduino.</p>
              </div>
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
                  height: "300px"
                }}>
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
                      <span className="badge badge-blue">{course.age}</span>
                    </div>
                    <h3 style={{ fontSize: "var(--font-h3)", marginBottom: "8px" }}>{course.title}</h3>
                    <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>{course.desc}</p>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--color-border)", paddingTop: "16px" }}>
                    <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>{course.price}</span>
                    <a href="#lead-form" onClick={() => setCourseId(course.id)}>
                      <Button variant="secondary-site" style={{ height: "36px", padding: "0 16px", fontSize: "var(--font-small)" }}>
                        Записаться
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
      <section style={{ padding: "120px 0" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>
              Как проходит занятие
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-body-lg)" }}>
              Каждый урок — это завершенный цикл от идеи до рабочего проекта
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "24px"
          }}>
            {steps.map((step, idx) => (
              <div key={idx} style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: "16px"
              }}>
                <div style={{
                  fontSize: "3.5rem",
                  fontWeight: 900,
                  color: "var(--color-primary-soft)",
                  lineHeight: 1,
                  fontFamily: "var(--font-geologica)"
                }}>
                  {step.num}
                </div>
                <h4 style={{ fontSize: "1.125rem", fontWeight: 700 }}>{step.title}</h4>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>{step.text}</p>
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
          </div>

          <div style={{
            background: "white",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-card-site)",
            padding: "40px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.03)"
          }}>
            <h3 style={{ fontSize: "var(--font-h3)", fontFamily: "var(--font-geologica)", marginBottom: "24px" }}>
              Контроль оплат и занятий
            </h3>
            <p style={{ fontSize: "var(--font-body)", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              С помощью нашей CRM-системы вы всегда будете видеть баланс своего абонемента, даты посещений и получать ссылки на оплату в мессенджерах.
            </p>
            <div style={{
              background: "var(--color-bg)",
              borderRadius: "12px",
              padding: "16px",
              fontSize: "var(--font-small)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              border: "1px solid var(--color-border)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Ученик:</span>
                <span style={{ fontWeight: 700 }}>Миша Иванов</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Абонемент:</span>
                <span style={{ fontWeight: 700 }}>4 занятия</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Статус оплаты:</span>
                <span className="badge badge-green">Оплачено</span>
              </div>
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
              <span className="badge badge-amber">Осталось 2 места</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr 1.2fr", padding: "24px 32px", borderBottom: "1px solid var(--color-border)", alignItems: "center" }}>
              <span style={{ fontWeight: 700 }}>8–10 лет</span>
              <span>Программирование на Scratch</span>
              <span>Среда / Пятница 18:00</span>
              <span className="badge badge-green">Места есть</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr 1.2fr", padding: "24px 32px", alignItems: "center" }}>
              <span style={{ fontWeight: 700 }}>10–14 лет</span>
              <span>Разработка на Python</span>
              <span>Суббота 12:00</span>
              <span className="badge badge-red">Группа заполнена</span>
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
              <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: "var(--color-primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px auto" }}>
                <Users size={40} style={{ color: "var(--color-primary)" }} />
              </div>
              <h4 style={{ fontSize: "1.25rem", marginBottom: "4px" }}>Алексей Дмитриев</h4>
              <p style={{ fontSize: "var(--font-xs)", textTransform: "uppercase", color: "var(--color-primary)", fontWeight: 700, marginBottom: "16px" }}>Старший наставник (LEGO & Arduino)</p>
              <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
                «Помогает детям не бояться ошибок и доводить свои инженерные разработки до рабочего результата.»
              </p>
            </div>

            <div className="card-site" style={{ textAlign: "center" }}>
              <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: "var(--color-accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px auto" }}>
                <Users size={40} style={{ color: "var(--color-accent)" }} />
              </div>
              <h4 style={{ fontSize: "1.25rem", marginBottom: "4px" }}>Мария Соколова</h4>
              <p style={{ fontSize: "var(--font-xs)", textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 700, marginBottom: "16px" }}>Преподаватель программирования (Scratch)</p>
              <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
                «Учит мыслить алгоритмами, создавая красочные игры и раскрывая творческий потенциал ребят.»
              </p>
            </div>

            <div className="card-site" style={{ textAlign: "center" }}>
              <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: "var(--color-primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px auto" }}>
                <Users size={40} style={{ color: "var(--color-primary)" }} />
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
          {/* Map / Location Placeholders */}
          <div style={{
            background: "#E5E7EB",
            borderRadius: "var(--radius-card-site)",
            height: "400px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 25px rgba(0,0,0,0.03)",
            border: "1px solid var(--color-border)"
          }}>
            <MapPin size={48} style={{ color: "var(--color-primary)", marginBottom: "12px" }} />
            <span style={{ fontWeight: 700, color: "var(--color-text)" }}>Интерактивная карта</span>
            <span style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>г. Липецк, ул. Ленина, д. 10</span>
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
