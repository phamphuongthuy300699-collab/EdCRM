import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import LandingPageClient from "../app/(public)/LandingPageClient";

// Mock fetch API globally
global.fetch = vi.fn();

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("Public Lead Form rendering and actions", () => {
  it("renders only the short lead capture fields", () => {
    const { container } = render(<LandingPageClient />);
    const leadForm = within(container.querySelector("#lead-form") as HTMLElement);
    
    expect(leadForm.getByPlaceholderText("Иван Иванов")).toBeInTheDocument();
    expect(leadForm.getByPlaceholderText("Миша")).toBeInTheDocument();
    expect(leadForm.getByPlaceholderText("+7 (999) 123-45-67")).toBeInTheDocument();
    expect(leadForm.queryByPlaceholderText("8")).not.toBeInTheDocument();
    expect(leadForm.queryByText("Направление")).not.toBeInTheDocument();
    expect(leadForm.queryByText("Удобное время для занятий")).not.toBeInTheDocument();
    expect(leadForm.queryByText("Комментарий к заявке")).not.toBeInTheDocument();
  });

  it("prevents double-submitting using loading state guard", async () => {
    const mockFetch = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }), 100))
    );
    global.fetch = mockFetch;

    render(<LandingPageClient />);

    const parentInput = screen.getByPlaceholderText("Иван Иванов");
    const childInput = screen.getByPlaceholderText("Миша");
    const phoneInput = screen.getByPlaceholderText("+7 (999) 123-45-67");
    const submitButton = screen.getByRole("button", { name: /записаться на бесплатное пробное занятие/i });

    // Fill details
    fireEvent.change(parentInput, { target: { value: "Ольга" } });
    fireEvent.change(childInput, { target: { value: "Даниил" } });
    fireEvent.change(phoneInput, { target: { value: "89991234567" } });

    // Double click the button
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    // Verify fetch was only called once because the loading guard blocked the second submit
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent("Отправка...");
  });
});
