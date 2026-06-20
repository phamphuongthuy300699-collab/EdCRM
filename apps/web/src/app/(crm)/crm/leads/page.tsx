"use client";

import React, { useState } from "react";
import { Button } from "@robotics-crm/ui";
import { 
  Inbox, 
  Search, 
  Filter, 
  PhoneCall, 
  UserCheck, 
  XCircle, 
  MoreVertical, 
  Plus 
} from "lucide-react";

export default function CrmLeadsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "new" | "contacted" | "trial" | "converted" | "lost">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const initialLeads = [
    { id: 1, parentName: "Анна Петрова", phone: "+7 (905) 555-12-34", childName: "Игорь", childAge: 8, course: "Робототехника LEGO", status: "new", date: "20.06.2026", source: "Форма на сайте" },
    { id: 2, parentName: "Сергей Волков", phone: "+7 (920) 222-33-44", childName: "Алиса", childAge: 10, course: "Программирование Scratch", status: "new", date: "20.06.2026", source: "Форма на сайте" },
    { id: 3, parentName: "Ольга Семенова", phone: "+7 (915) 333-55-66", childName: "Кирилл", childAge: 7, course: "Робототехника LEGO", status: "contacted", date: "19.06.2026", source: "Форма на сайте" },
    { id: 4, parentName: "Дмитрий Кузнецов", phone: "+7 (910) 777-88-99", childName: "Максим", childAge: 12, course: "Разработка на Python", status: "trial", date: "18.06.2026", source: "Звонок" },
    { id: 5, parentName: "Елена Смирнова", phone: "+7 (903) 111-22-33", childName: "Даша", childAge: 9, course: "Программирование Scratch", status: "converted", date: "17.06.2026", source: "ВКонтакте" },
    { id: 6, parentName: "Алексей Иванов", phone: "+7 (980) 444-55-66", childName: "Артем", childAge: 11, course: "Разработка на Python", status: "lost", date: "15.06.2026", source: "Звонок" }
  ];

  const [leads, setLeads] = useState(initialLeads);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new": return <span className="badge badge-blue">Новая</span>;
      case "contacted": return <span className="badge badge-amber">Связались</span>;
      case "trial": return <span className="badge badge-purple">Пробное</span>;
      case "converted": return <span className="badge badge-green">Ученик</span>;
      case "lost": return <span className="badge badge-red">Потеряна</span>;
      default: return <span className="badge badge-gray">{status}</span>;
    }
  };

  const handleUpdateStatus = (id: number, newStatus: string) => {
    setLeads(leads.map(lead => lead.id === id ? { ...lead, status: newStatus } : lead));
  };

  const filteredLeads = leads.filter(lead => {
    const matchesTab = activeTab === "all" || lead.status === activeTab;
    const matchesSearch = 
      lead.parentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (lead.childName && lead.childName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      lead.phone.includes(searchQuery);
    return matchesTab && matchesSearch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", color: "var(--color-text)", marginBottom: "4px" }}>
            Заявки и Лиды
          </h1>
          <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
            Всего заявок в системе: {leads.length}
          </p>
        </div>
        <Button variant="primary-crm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Plus size={16} />
          <span>Добавить вручную</span>
        </Button>
      </div>

      {/* Tabs / Filters */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--color-border)",
        paddingBottom: "12px",
        gap: "24px"
      }}>
        {/* Status filters */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
          {[
            { id: "all", label: "Все" },
            { id: "new", label: "Новые" },
            { id: "contacted", label: "В работе" },
            { id: "trial", label: "Пробные" },
            { id: "converted", label: "Ученики" },
            { id: "lost", label: "Потерянные" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                fontSize: "var(--font-small)",
                fontWeight: activeTab === tab.id ? 700 : 500,
                border: "none",
                cursor: "pointer",
                background: activeTab === tab.id ? "var(--color-primary)" : "transparent",
                color: activeTab === tab.id ? "white" : "var(--color-text-muted)",
                transition: "all 0.2s"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
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
            placeholder="Поиск по имени, тел..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="card-crm" style={{ padding: 0, overflow: "hidden" }}>
        {filteredLeads.length === 0 ? (
          <div style={{ padding: "64px 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <Inbox size={48} style={{ color: "var(--color-text-muted)", opacity: 0.5 }} />
            <div>
              <h4 style={{ fontWeight: 700, fontSize: "1.1rem" }}>Заявок не найдено</h4>
              <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Попробуйте изменить параметры фильтрации.</p>
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
                <th style={{ padding: "0 24px" }}>Родитель</th>
                <th>Телефон</th>
                <th>Ребенок</th>
                <th>Курс</th>
                <th>Статус</th>
                <th>Дата</th>
                <th>Источник</th>
                <th style={{ padding: "0 24px", textAlign: "right" }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} style={{
                  borderBottom: "1px solid var(--color-border)",
                  height: "64px",
                  transition: "background 0.2s"
                }} className="table-row">
                  <td style={{ padding: "0 24px", fontWeight: 700 }}>{lead.parentName}</td>
                  <td>{lead.phone}</td>
                  <td>{lead.childName ? `${lead.childName} (${lead.childAge} лет)` : "—"}</td>
                  <td>{lead.course}</td>
                  <td>{getStatusBadge(lead.status)}</td>
                  <td>{lead.date}</td>
                  <td style={{ color: "var(--color-text-muted)" }}>{lead.source}</td>
                  <td style={{ padding: "0 24px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <button 
                        onClick={() => handleUpdateStatus(lead.id, "contacted")}
                        title="Связались" 
                        style={{
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
                        }}
                      >
                        <PhoneCall size={14} />
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(lead.id, "converted")}
                        title="Конвертировать в ученика" 
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "6px",
                          border: "none",
                          background: "var(--color-success-soft)",
                          color: "var(--color-success)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer"
                        }}
                      >
                        <UserCheck size={14} />
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(lead.id, "lost")}
                        title="Пометить потерянной" 
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "6px",
                          border: "none",
                          background: "var(--color-danger-soft)",
                          color: "var(--color-danger)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer"
                        }}
                      >
                        <XCircle size={14} />
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
