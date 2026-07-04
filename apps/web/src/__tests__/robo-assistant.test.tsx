import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RoboAssistant } from "../shared/ui/robo-assistant";

describe("RoboAssistant interactive assembly", () => {
  it("toggles the hero robot between assembled and disassembled states", () => {
    render(<RoboAssistant context="hero" size="lg" interactiveAssembly />);

    const robotButton = screen.getByRole("button", { name: "Разобрать робота" });
    expect(robotButton).toHaveAttribute("aria-pressed", "false");
    expect(robotButton).toHaveAttribute("data-assembly-state", "assembled");

    fireEvent.click(robotButton);

    expect(screen.getByRole("button", { name: "Собрать робота" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Собрать робота" })).toHaveAttribute("data-assembly-state", "disassembled");
  });
});
