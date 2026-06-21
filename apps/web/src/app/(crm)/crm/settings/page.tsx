"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@robotics-crm/ui";
import { Settings, Building, BookOpen, Users, CreditCard, Save } from "lucide-react";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";

export default function CrmSettingsPage() {
  const [activeSection, setActiveSection] = useState<"org" | "courses" | "teachers" | "payments">("org");
  const [loading, setLoading] = useState(false);

  // 1. Org Form State
  const [orgName, setOrgName] = useState("Робототехника Липецк");
  const [city, setCity] = useState("Липецк");
  const [address, setAddress] = useState("ул. Ленина, д. 10");
  const [phone, setPhone] = useState("+7 (999) 123-45-67");
  const [email, setEmail] = useState("info@robotics-lipetsk.ru");
  const [hours, setHours] = useState("Пн - Сб: 09:00 - 20:00");

  // 2. Courses State
  const [courses, setCourses] = useState<any[]>([
    { id: "c1", title: "Робототехника (Lego Education)", minAge: 6, maxAge: 9, price: 4500 },
    { id: "c2", title: "Программирование на Scratch", minAge: 7, maxAge: 11, price: 4000 },
    { id: "c3", title: "Программирование на Python", minAge: 10, maxAge: 14, price: 4800 },
    { id: "c4", title: "Arduino и схемотехника", minAge: 10, maxAge: 15, price: 5200 }
  ]);

  // 3. Teachers State
  const [teachers, setTeachers] = useState<any[]>([
    { id: "t1", name: "Алексей Дмитриев", specialty: "LEGO & Arduino", active: true },
    { id: "t2", name: "Мария Соколова", specialty: "Scratch", active: true },
    { id: "t3", name: "Егор Смирнов", specialty: "Python & Arduino", active: true }
  ]);

  // 4. Payment Options State
  const [yookassaActive, setYookassaActive] = useState(false);
  const [robokassaActive, setRobokassaActive] = useState(false);
  const [manualActive, setManualActive] = useState(true);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: org } = await (supabase.from("organizations") as any)
          .select("*")
          .eq("slug", "robotics-lipetsk")
          .single();

        if (org) {
          setOrgName(org.name);
          setCity(org.city);
        }

        const { data: branches } = await (supabase.from("branches") as any)
          .select("*")
          .limit(1)
          .single();

        if (branches) {
          setAddress(branches.address || "");
          setPhone(branches.phone || "");
        }

        // Load Courses
        const { data: coursesData } = await (supabase.from("courses") as any)
          .select("*")
          .order("sort_order");

        if (coursesData && coursesData.length > 0) {
          setCourses(coursesData.map((c: any) => ({
            id: c.id,
            title: c.title,
            minAge: c.min_age,
            maxAge: c.max_age,
            price: parseFloat(c.price_monthly || "0")
          })));
        }

        // Load Teachers
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name");

        if (profilesData && profilesData.length > 0) {
          setTeachers(profilesData.map((p: any) => ({
            id: p.id,
            name: p.full_name || "Без имени",
            specialty: "Преподаватель",
            active: true
          })));
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Update organization name in db
      const orgRes = await (supabase.from("organizations") as any).select("id").eq("slug", "robotics-lipetsk").single();
      if (orgRes.data) {
        await (supabase.from("organizations") as any)
          .update({ name: orgName, city })
          .eq("id", orgRes.data.id);
        
        await (supabase.from("branches") as any)
          .update({ address, phone })
          .eq("organization_id", orgRes.data.id);
      }

      alert("Настройки организации успешно сохранены!");
    } catch (err: any) {
      console.error(err);
      alert("Не удалось сохранить настройки: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrice = async (courseId: string, newPrice: number) => {
    try {
      if (courseId.length > 5) {
        await (supabase.from("courses") as any)
          .update({ price_monthly: newPrice })
          .eq("id", courseId);
      }
      setCourses(courses.map(c => c.id === courseId ? { ...c, price: newPrice } : c));
    } catch (err: any) {
      console.error(err);
      alert("Не удалось обновить цену: " + err.message);
    }
  };

  const menuItems = [
    { id: "org", label: "Организация", icon: Building },
    { id: "courses", label: "Направления и цены", icon: BookOpen },
    { id: "teachers", label: "Преподаватели", icon: Users },
    { id: "payments", label: "Платежные шлюзы", icon: CreditCard },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", color: "var(--color-text)", marginBottom: "4px" }}>
          Настройки системы
        </h1>
        <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
          Конфигурация филиалов, направлений обучения и платежных систем
        </p>
      </div>

      {/* Main Container Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "32px", alignItems: "flex-start" }}>
        {/* Sidebar Nav Settings */}
        <aside style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-border)", padding: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "var(--font-small)",
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? "var(--color-primary-soft)" : "transparent",
                  color: isSelected ? "var(--color-primary-dark)" : "var(--color-text-muted)",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s"
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Content Card Settings */}
        <div className="card-crm" style={{ background: "white" }}>
          {/* 1. ORGANIZATION SECTION */}
          {activeSection === "org" && (
            <form onSubmit={handleSaveOrg} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "16px" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>Параметры организации</h3>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Реквизиты и контакты вашего учебного центра</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Название центра *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={orgName} 
                    onChange={(e) => setOrgName(e.target.value)} 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Город *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={city} 
                    onChange={(e) => setCity(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Фактический адрес *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Телефон филиала *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email для уведомлений *</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    required 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Режим работы</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={hours} 
                  onChange={(e) => setHours(e.target.value)} 
                />
              </div>

              <Button 
                type="submit" 
                variant="primary-crm" 
                style={{ width: "fit-content", display: "flex", gap: "8px", alignSelf: "flex-end" }}
                disabled={loading}
              >
                <Save size={16} />
                <span>Сохранить настройки</span>
              </Button>
            </form>
          )}

          {/* 2. COURSES / PRICING SECTION */}
          {activeSection === "courses" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "16px" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>Направления обучения и цены</h3>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Управление стоимостью курсов и возрастным цензом</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {courses.map((course) => (
                  <div key={course.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", border: "1px solid var(--color-border)", borderRadius: "10px" }}>
                    <div>
                      <h4 style={{ fontWeight: 700, color: "var(--color-text)", marginBottom: "2px" }}>{course.title}</h4>
                      <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>Для детей {course.minAge}–{course.maxAge} лет</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Стоимость в месяц:</span>
                      <input
                        type="number"
                        className="form-input"
                        style={{ width: "100px", height: "36px", textAlign: "right", borderRadius: "6px" }}
                        value={course.price}
                        onChange={(e) => handleUpdatePrice(course.id, parseFloat(e.target.value) || 0)}
                      />
                      <span style={{ fontWeight: 600 }}>₽</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. TEACHERS SECTION */}
          {activeSection === "teachers" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "16px" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>Наставники и преподаватели</h3>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Список активных преподавателей филиала</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {teachers.map((teacher) => (
                  <div key={teacher.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", border: "1px solid var(--color-border)", borderRadius: "10px" }}>
                    <div>
                      <h4 style={{ fontWeight: 700, color: "var(--color-text)" }}>{teacher.name}</h4>
                      <span className="badge badge-gray" style={{ fontSize: "10px", marginTop: "4px" }}>{teacher.specialty}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "var(--font-xs)", fontWeight: 600, color: teacher.active ? "var(--color-success)" : "var(--color-text-muted)" }}>
                        {teacher.active ? "Активен" : "Отпуск"}
                      </span>
                      <input 
                        type="checkbox" 
                        checked={teacher.active} 
                        onChange={() => setTeachers(teachers.map(t => t.id === teacher.id ? { ...t, active: !t.active } : t))}
                        style={{ width: "36px", height: "20px", accentColor: "var(--color-primary)" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. PAYMENTS SECTION */}
          {activeSection === "payments" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "16px" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>Настройки приема платежей</h3>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Подключение онлайн-эквайринга для родительского портала</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px", border: "1px solid var(--color-border)", borderRadius: "12px" }}>
                  <div>
                    <h4 style={{ fontWeight: 700, marginBottom: "4px" }}>Наличный расчет и терминалы</h4>
                    <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0 }}>Ручной учет оплат в кассе администратором</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={manualActive} 
                    onChange={() => setManualActive(!manualActive)}
                    style={{ width: "36px", height: "20px", accentColor: "var(--color-primary)" }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px", border: "1px solid var(--color-border)", borderRadius: "12px", opacity: yookassaActive ? 1 : 0.75 }}>
                  <div>
                    <h4 style={{ fontWeight: 700, marginBottom: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>ЮKassa</span>
                      <span className="badge badge-gray" style={{ fontSize: "9px" }}>Скоро в CRM</span>
                    </h4>
                    <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0 }}>Прием платежей картами, СБП, SberPay</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={yookassaActive} 
                    onChange={() => setYookassaActive(!yookassaActive)}
                    style={{ width: "36px", height: "20px", accentColor: "var(--color-primary)" }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px", border: "1px solid var(--color-border)", borderRadius: "12px", opacity: robokassaActive ? 1 : 0.75 }}>
                  <div>
                    <h4 style={{ fontWeight: 700, marginBottom: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>Robokassa</span>
                      <span className="badge badge-gray" style={{ fontSize: "9px" }}>Скоро в CRM</span>
                    </h4>
                    <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0 }}>Прием международных и локальных онлайн-карт</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={robokassaActive} 
                    onChange={() => setRobokassaActive(!robokassaActive)}
                    style={{ width: "36px", height: "20px", accentColor: "var(--color-primary)" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
