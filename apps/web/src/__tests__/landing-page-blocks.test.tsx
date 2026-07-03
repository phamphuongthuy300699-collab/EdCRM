import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPageClient from "../app/(public)/LandingPageClient";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("LandingPageClient dynamic data rendering and fallbacks", () => {
  it("renders teachers empty state when no teachers are provided", () => {
    render(<LandingPageClient initialTeachers={[]} />);
    expect(screen.getByText("Наши преподаватели")).toBeInTheDocument();
    expect(screen.getByText("Преподаватели пока не заполнены в CRM.")).toBeInTheDocument();
  });

  it("renders parent/student portal preview block with values", () => {
    render(<LandingPageClient />);
    expect(screen.getByText("Родители видят прогресс ребенка в личном кабинете")).toBeInTheDocument();
    expect(screen.getByText("Миша Иванов")).toBeInTheDocument();
  });

  it("uses courses from database props if provided", () => {
    const mockCourses = [
      {
        id: "c-111",
        title: "Супер Робототехника",
        slug: "super-robot",
        short_description: "Описание курса из базы данных",
        min_age: 5,
        max_age: 8,
        price_monthly: 9999
      }
    ];

    render(<LandingPageClient initialCourses={mockCourses} />);
    
    // Check that DB course title is rendered
    expect(screen.getAllByText("Супер Робототехника")[0]).toBeInTheDocument();
    expect(screen.getByText("Описание курса из базы данных")).toBeInTheDocument();
    expect(screen.getByText("от 9999 ₽ / мес")).toBeInTheDocument();
  });

  it("renders courses empty state when initialCourses prop is empty", () => {
    render(<LandingPageClient initialCourses={[]} />);
    expect(screen.getByText("Направления обучения пока не заполнены в CRM.")).toBeInTheDocument();
  });

  it("uses schedule from database props if provided", () => {
    const mockSchedule = [
      {
        age: "5-6 лет",
        course: "Утреннее конструирование",
        time: "Пн/Ср 10:00",
        spots: 2
      }
    ];

    render(<LandingPageClient initialSchedule={mockSchedule} />);
    expect(screen.getAllByText("Утреннее конструирование")[0]).toBeInTheDocument();
    expect(screen.getByText("Пн/Ср 10:00")).toBeInTheDocument();
    expect(screen.getByText("Мест: 2 (мало)")).toBeInTheDocument();
  });

  it("uses tariffs from initialTariffs props if provided", () => {
    const mockTariffs = [
      { id: "trial", title: "Пробный урок", price: 0, format: "Ознакомительное занятие 90 минут.", is_one_time: true, audience: "Дошкольники" },
      { id: "monthly", title: "Месячный абонемент", price: 4000, format: "4 занятия по 90 минут.", is_one_time: false, audience: "Школьники" }
    ];

    render(<LandingPageClient initialTariffs={mockTariffs} />);
    expect(screen.getByText("Пробный урок")).toBeInTheDocument();
    expect(screen.getByText("Месячный абонемент")).toBeInTheDocument();
    expect(screen.getByText(/4.*000/i)).toBeInTheDocument();
  });

  it("uses CRM media for every contact photo slot", () => {
    const { container } = render(
      <LandingPageClient
        initialBranches={[{ address: "ул. Тестовая, 1", work_hours: "10:00-20:00" }]}
        initialBlocks={[
          {
            block_key: "contacts.media",
            content: {
              mapImage: "contacts/map.jpg",
              facadeImage: { path: "contacts/facade.jpg", title: "Фасад" },
              classroomImage: { path: "contacts/classroom.jpg", title: "Класс" },
            },
          },
        ]}
      />,
    );

    const contactsSection = container.querySelector("#contacts");
    expect(contactsSection).not.toBeNull();
    const styles = Array.from(contactsSection!.querySelectorAll<HTMLElement>("[style]"))
      .map((element) => element.getAttribute("style") || "")
      .join("\n");

    expect(styles).toContain("contacts/map.jpg");
    expect(styles).toContain("contacts/facade.jpg");
    expect(styles).toContain("contacts/classroom.jpg");
    expect(styles).not.toContain("images.unsplash.com");
  });
});
