import React from "react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Политика конфиденциальности | Школа Robotics Липецк",
  description: "Политика конфиденциальности и обработки персональных данных в школе робототехники и программирования Robotics Липецк.",
  alternates: {
    canonical: "https://robotics-lipetsk.ru/privacy-policy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container" style={{ padding: "80px 20px", maxWidth: "800px", fontFamily: "var(--font-inter), sans-serif", lineHeight: 1.7 }}>
      <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--color-primary)", fontWeight: 600, marginBottom: "32px", fontSize: "14px" }}>
        ← Вернуться на главную
      </Link>
      
      <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "24px" }}>
        Политика конфиденциальности
      </h1>
      
      <p style={{ color: "var(--color-text-muted)", fontSize: "13px", marginBottom: "32px" }}>
        Последнее обновление: 28 июня 2026 года
      </p>

      <section style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "12px" }}>1. Общие положения</h2>
        <p>
          Настоящая политика конфиденциальности определяет порядок обработки персональных данных пользователей на сайте школы Robotics Липецк (https://robotics-lipetsk.ru). Мы уделяем приоритетное внимание безопасности и защите ваших персональных данных.
        </p>
      </section>

      <section style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "12px" }}>2. Состав собираемых персональных данных</h2>
        <p>
          Мы обрабатываем только те персональные данные, которые вы предоставляете добровольно при заполнении веб-форм на нашем сайте:
        </p>
        <ul style={{ paddingLeft: "20px", marginTop: "8px", display: "grid", gap: "6px" }}>
          <li>Имя и фамилия родителя;</li>
          <li>Имя и возраст ребенка;</li>
          <li>Контактный номер телефона;</li>
          <li>Желаемое время занятий и выбранное учебное направление;</li>
          <li>Текстовые комментарии к заявке.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "12px" }}>3. Цели обработки персональных данных</h2>
        <p>
          Персональные данные собираются и обрабатываются исключительно в целях:
        </p>
        <ul style={{ paddingLeft: "20px", marginTop: "8px", display: "grid", gap: "6px" }}>
          <li>Связи с клиентом для консультации и записи на бесплатное пробное занятие;</li>
          <li>Подбора оптимальной учебной группы по возрасту ребенка;</li>
          <li>Предоставления доступа к личному кабинету после заключения договора.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "12px" }}>4. Сроки и защита данных</h2>
        <p>
          Персональные данные хранятся не дольше, чем этого требуют цели их обработки, либо до момента отзыва согласия пользователем. Мы принимаем все необходимые организационные и технические меры для защиты ваших данных от неправомерного или случайного доступа.
        </p>
      </section>

      <section style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "12px" }}>5. Права пользователей</h2>
        <p>
          Вы имеете право запросить сведения о хранящихся у нас ваших персональных данных, изменить их или отозвать свое согласие на обработку, направив обращение на адрес электронной почты: <strong>info@robotics-lipetsk.ru</strong>.
        </p>
      </section>
    </div>
  );
}
