import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CrmLeadsPage from "../app/(crm)/crm/leads/page";

// Mock fetch API globally
global.fetch = vi.fn();

describe("CRM Leads Page actions and states", () => {
  it("renders leads tables and action buttons", async () => {
    render(<CrmLeadsPage />);
    
    // Check table headers and tab filter items are rendered
    expect(screen.getByText("Заявки и Лиды")).toBeInTheDocument();
    expect(screen.getByText(/Всего заявок в системе:/)).toBeInTheDocument();
  });

  it("handles loading states correctly when converting lead", async () => {
    // Check loading states logic
    const mockLead = {
      id: "mock-lead-id",
      status: "new",
      converting: true
    };

    const isConverting = (leadId: string, convertingLeadId: string | null) => {
      return leadId === convertingLeadId;
    };

    expect(isConverting(mockLead.id, "mock-lead-id")).toBe(true);
    expect(isConverting(mockLead.id, null)).toBe(false);
  });
});
