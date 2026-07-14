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
    expect(screen.getByText("Ученик Робокс")).toBeInTheDocument();
    expect(screen.queryByText("Миша Иванов")).not.toBeInTheDocument();
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

  it("uses the course card image as a stable background and skips empty image URLs", () => {
    const { container, rerender } = render(<LandingPageClient initialCourses={[{
      id: "course-with-image",
      title: "Курс с фоном",
      slug: "course-with-image",
      card_image_url: "course-cards/robotics.webp",
      card_image_alt: "Робот на учебном столе",
    }]} />);

    const card = container.querySelector('[data-course-card="course-with-image"]');
    expect(card).toHaveStyle({ minHeight: "380px" });
    expect(card?.getAttribute("style")).toContain("course-cards/robotics.webp");
    expect(card?.querySelector("[data-course-card-icon-link]")).toHaveStyle({
      color: "rgb(255, 255, 255)",
      background: "rgba(255, 255, 255, 0.16)",
    });
    expect(card?.querySelector("[data-course-card-age]")).toHaveStyle({
      color: "rgb(255, 255, 255)",
      background: "rgba(255, 255, 255, 0.16)",
    });

    rerender(<LandingPageClient initialCourses={[{
      id: "course-without-image",
      title: "Курс без фона",
      slug: "course-without-image",
      card_image_url: "",
    }]} />);
    const fallbackCard = container.querySelector('[data-course-card="course-without-image"]');
    expect(fallbackCard?.getAttribute("style")).not.toContain("background-image");
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

  it("renders a real marker map with separate branch links in the main contacts window", () => {
    const { container } = render(
      <LandingPageClient
        initialBranches={[
          { address: "Липецк, ул. Осканова, 3", work_hours: "10:00-20:00", is_active: true, show_on_site: true },
          { address: "Липецк, ул. Славянова, 1", work_hours: "10:00-20:00", is_active: true, show_on_site: true },
        ]}
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
    const markers = contactsSection!.querySelectorAll(".branch-map-marker");
    expect(markers).toHaveLength(2);
    expect(contactsSection!.querySelector('iframe[title="Карта филиалов Робокс"]')).toBeNull();

    const mapLinks = screen.getAllByRole("link", { name: "Открыть на картах" });
    expect(mapLinks).toHaveLength(2);
    expect(new URL(mapLinks[0].getAttribute("href") || "").searchParams.get("text")).toBe("Липецк, ул. Осканова, 3");
    expect(new URL(mapLinks[1].getAttribute("href") || "").searchParams.get("text")).toBe("Липецк, ул. Славянова, 1");

    const styles = Array.from(contactsSection!.querySelectorAll<HTMLElement>("[style]"))
      .map((element) => element.getAttribute("style") || "")
      .join("\n");

    expect(styles).toContain("contacts/facade.jpg");
    expect(styles).toContain("contacts/classroom.jpg");
    expect(styles).not.toContain("contacts/map.jpg");
    expect(styles).not.toContain("images.unsplash.com");
  });

  it("renders contact empty state instead of hardcoded branch markers when CRM branches are unavailable", () => {
    const { container } = render(<LandingPageClient initialBranches={[]} />);
    expect(container.querySelectorAll("#contacts .branch-map-marker")).toHaveLength(0);
    expect(screen.getByText("Адреса филиалов появятся на карте после заполнения в CRM")).toBeInTheDocument();
    expect(screen.queryByText("Липецк, ул. Осканова, 3")).not.toBeInTheDocument();
    expect(screen.queryByText("Липецк, ул. Славянова, 1")).not.toBeInTheDocument();
  });

  it("does not render testimonials, student projects, or lesson steps without enabled CRM blocks", () => {
    render(<LandingPageClient initialBlocks={[]} />);

    expect(screen.queryByText("Отзывы родителей")).not.toBeInTheDocument();
    expect(screen.queryByText("Проекты наших учеников")).not.toBeInTheDocument();
    expect(screen.queryByText("Как проходит занятие: 5 этапов урока")).not.toBeInTheDocument();
    expect(screen.queryByText("Ольга Николаева")).not.toBeInTheDocument();
    expect(screen.queryByText("Робот для соревнований «Сумо»")).not.toBeInTheDocument();
  });

  it("renders editable homepage blocks from site_content_blocks content", () => {
    render(
      <LandingPageClient
        initialBlocks={[
          {
            block_key: "home.student_projects",
            content: {
              enabled: true,
              title: "Проекты из CRM",
              subtitle: "Редактируемые карточки",
              items: [
                {
                  id: "project-crm",
                  title: "Марсоход из CRM",
                  badge: "Scratch",
                  description: "Описание проекта из базы",
                  image: "student-projects/mars.jpg",
                  alt: "Марсоход",
                  isActive: true,
                  sortOrder: 20,
                },
              ],
            },
          },
          {
            block_key: "home.lesson_process",
            content: {
              enabled: true,
              title: "Этапы из CRM",
              subtitle: "Порядок занятия редактируется",
              steps: [
                {
                  id: "step-crm",
                  number: "01",
                  title: "Стартуем с CRM",
                  description: "Описание этапа из базы",
                  image: "lesson-process/start.jpg",
                  alt: "Старт",
                  isActive: true,
                  sortOrder: 10,
                },
              ],
            },
          },
          {
            block_key: "home.testimonials",
            content: {
              enabled: true,
              title: "Отзывы из CRM",
              subtitle: "Реальные отзывы управляются редактором",
              items: [
                {
                  id: "review-crm",
                  author: "Анна из CRM",
                  caption: "мама ученика",
                  initials: "АЦ",
                  text: "Отзыв из базы данных",
                  rating: 5,
                  isActive: true,
                  sortOrder: 10,
                },
              ],
            },
          },
        ]}
      />,
    );

    expect(screen.getByText("Проекты из CRM")).toBeInTheDocument();
    expect(screen.getByText("Марсоход из CRM")).toBeInTheDocument();
    expect(screen.getByText("Этапы из CRM")).toBeInTheDocument();
    expect(screen.getByText("Стартуем с CRM")).toBeInTheDocument();
    expect(screen.getByText("Отзывы из CRM")).toBeInTheDocument();
    expect(screen.getByText("Анна из CRM")).toBeInTheDocument();
    expect(screen.queryByText("Ольга Николаева")).not.toBeInTheDocument();
    expect(screen.queryByText("Робот для соревнований «Сумо»")).not.toBeInTheDocument();
  });
});
