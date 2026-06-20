"use client";

import React, { useState } from "react";
import { Button } from "@robotics-crm/ui";
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  CreditCard, 
  Calendar, 
  MoreVertical 
} from "lucide-react";

export default function CrmStudentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "archived">("all");

  const initialStudents = [
    { id: 1, name: "Игорь Петров", age: 8, group: "LEGO Start 1", parent: "Анна Петрова", phone: "+7 (905) 555-12-34", paymentStatus: "paid", attendance: "100%", status: "active" },
    { id: 2, name: "Данил Соловьев", age: 9, group: "LEGO Start 1", parent: "Михаил С.", phone: "+7 (910) 333-22-11", paymentStatus: "paid", attendance: "90%", status: "active" },
    { id: 3, name: "Алиса Волкова", age: 10, group: "Scratch Basic", parent: "Сергей Волков", phone: "+7 (920) 222-33-44", paymentStatus: "pending", attendance: "95%", status: "active" },
    { id: 4, name: "Кирилл Семенов", age: 7, group: "LEGO Start 2", parent: "Ольга Семенова", phone: "+7 (915) 333-55-66", paymentStatus: "overdue", attendance: "80%", status: "active" },
    { id: 5, name: "Даша Смирнова", age: 9, group: "Scratch Basic", parent: "Елена Смирнова", phone: "+7 (903) 111-22-33", paymentStatus: "paid", attendance: "100%", status: "active" },
    { id: 6, name: "Максим Козлов", age: 12, group: "Python Junior", parent: "Алексей К.", phone: "+7 (980) 444-55-66", paymentStatus: "paid", attendance: "85%", status: "paused" }
  ];

  const [students] = useState(initialStudents);

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid": return <span className="badge badge-green">Оплачено</span>;
      case "pending": return <span className="badge badge-blue">Ожидает</span>;
      case "overdue": return <span className="badge badge-red">Долг</span>;
      default: return <span className="badge badge-gray">{status}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <span className="badge badge-green">Активен</span>;
      case "paused": return <span className="badge badge-amber">Пауза</span>;
      case "archived": return <span className="badge badge-gray">Архив</span>;
      default: return <span className="badge badge-gray">{status}</span>;
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesStatus = statusFilter === "all" || student.status === statusFilter;
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      student.parent.toLowerCase().includes(searchQuery.toLowerCase()) || 
      student.group.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", color: "var(--color-text)", marginBottom: "4px" }}>
            База учеников
          </h1>
          <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
            Активных учеников в филиале: {students.filter(s => s.status === "active").length}
          </p>
        </div>
        <Button variant="primary-crm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <UserPlus size={16} />
          <span>Создать ученика</span>
        </Button>
      </div>

      {/* Filters */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--color-border)",
        paddingBottom: "12px",
        gap: "24px"
      }}>
        {/* Status filters */}
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { id: "all", label: "Все ученики" },
            { id: "active", label: "Активные" },
            { id: "paused", label: "На паузе" },
            { id: "archived", label: "В архиве" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                fontSize: "var(--font-small)",
                fontWeight: statusFilter === tab.id ? 700 : 500,
                border: "none",
                cursor: "pointer",
                background: statusFilter === tab.id ? "var(--color-primary-soft)" : "transparent",
                color: statusFilter === tab.id ? "var(--color-primary-dark)" : "var(--color-text-muted)",
                transition: "all 0.2s"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: "relative", width: "240px" }}>
          <Search size={16} style={{
            position: "absolute",
            left: "12px",
            top: "12px",
            color: "var(--color-text-muted)"
          }} />
          <input 
            type="text" 
            className="form-input" 
            style={{ height: "40px", borderRadius: "8px", paddingLeft: "36px", fontSize: "var(--font-small)" }}
            placeholder="Поиск ученика, группы..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="card-crm" style={{ padding: 0, overflow: "hidden" }}>
        {filteredStudents.length === 0 ? (
          <div style={{ padding: "64px 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <Users size={48} style={{ color: "var(--color-text-muted)", opacity: 0.5 }} />
            <div>
              <h4 style={{ fontWeight: 700, fontSize: "1.1rem" }}>Учеников не найдено</h4>
              <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Попробуйте скорректировать условия поиска.</p>
            </div>
          </div>
        ) : (
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
            fontSize: "var(--font-small)"
          }}>
            <thead>
              <tr style={{
                background: "var(--color-bg)",
                borderBottom: "1px solid var(--color-border)",
                fontWeight: 700,
                color: "var(--color-text)",
                height: "48px"
              }}>
                <th style={{ padding: "0 24px" }}>Ученик</th>
                <th>Возраст</th>
                <th>Учебная группа</th>
                <th>Родитель</th>
                <th>Телефон</th>
                <th>Оплата</th>
                <th>Посещаемость</th>
                <th>Статус</th>
                <th style={{ padding: "0 24px", textAlign: "right" }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id} style={{
                  borderBottom: "1px solid var(--color-border)",
                  height: "64px",
                  transition: "background 0.2s"
                }} className="table-row">
                  <td style={{ padding: "0 24px", fontWeight: 700 }}>{student.name}</td>
                  <td>{student.age} лет</td>
                  <td>{student.group}</td>
                  <td>{student.parent}</td>
                  <td>{student.phone}</td>
                  <td>{getPaymentStatusBadge(student.paymentStatus)}</td>
                  <td style={{ fontWeight: 600 }}>{student.attendance}</td>
                  <td>{getStatusBadge(student.status)}</td>
                  <td style={{ padding: "0 24px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <button title="Контакты" style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "6px",
                        border: "1px solid var(--color-border)",
                        background: "white",
                        color: "var(--color-text)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer"
                      }}>
                        <Phone size={14} />
                      </button>
                      <button title="История оплат" style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "6px",
                        border: "1px solid var(--color-border)",
                        background: "white",
                        color: "var(--color-text)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer"
                      }}>
                        <CreditCard size={14} />
                      </button>
                      <button title="Подробнее" style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "6px",
                        border: "1px solid var(--color-border)",
                        background: "white",
                        color: "var(--color-text)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer"
                      }}>
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
