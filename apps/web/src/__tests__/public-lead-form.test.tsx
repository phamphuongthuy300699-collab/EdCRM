import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LandingPage from "../app/(public)/page";

// Mock fetch API globally
global.fetch = vi.fn();

describe("Public Lead Form rendering and actions", () => {
  it("renders form fields correctly", () => {
    render(<LandingPage />);
    
    expect(screen.getByPlaceholderText("Иван Иванов")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Миша")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("+7 (999) 123-45-67")).toBeInTheDocument();
  });

  it("prevents double-submitting using loading state guard", async () => {
    const mockFetch = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }), 100))
    );
    global.fetch = mockFetch;

    render(<LandingPage />);

    const parentInput = screen.getByPlaceholderText("Иван Иванов");
    const childInput = screen.getByPlaceholderText("Миша");
    const phoneInput = screen.getByPlaceholderText("+7 (999) 123-45-67");
    const submitButton = screen.getByRole("button", { name: /отправить заявку/i });

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
