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
  it("renders teachers block with default values when no props are provided", () => {
    render(<LandingPageClient />);
    expect(screen.getByText("Наши преподаватели")).toBeInTheDocument();
    expect(screen.getByText("Алексей Дмитриев")).toBeInTheDocument();
    expect(screen.getByText("Мария Соколова")).toBeInTheDocument();
    expect(screen.getByText("Егор Смирнов")).toBeInTheDocument();
  });

  it("renders parent/student portal preview block with default values when no props are provided", () => {
    render(<LandingPageClient />);
    expect(screen.getByText("Родители видят прогресс ребенка в личном кабинете")).toBeInTheDocument();
    expect(screen.getByText("Миша Иванов")).toBeInTheDocument();
    expect(screen.getByText("Робот RoboSort-3000")).toBeInTheDocument();
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

  it("falls back to default courses list when initialCourses prop is empty", () => {
    render(<LandingPageClient initialCourses={[]} />);
    expect(screen.getAllByText("Робототехника (Lego Education)")[0]).toBeInTheDocument();
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
    expect(screen.getByText("Утреннее конструирование")).toBeInTheDocument();
    expect(screen.getByText("Пн/Ср 10:00")).toBeInTheDocument();
    expect(screen.getByText("Осталось 2 места")).toBeInTheDocument();
  });

  it("uses prices from site blocks content props if provided", () => {
    const mockBlocks = [
      {
        block_key: "home.prices",
        content: {
          trialPrice: "Бесплатно!",
          monthlyPrice: "от 5 500 руб",
          individualPrice: "от 2 000 руб"
        }
      }
    ];

    render(<LandingPageClient initialBlocks={mockBlocks} />);
    expect(screen.getByText("Бесплатно!")).toBeInTheDocument();
    expect(screen.getByText("от 5 500 руб")).toBeInTheDocument();
    expect(screen.getByText("от 2 000 руб")).toBeInTheDocument();
  });
});
