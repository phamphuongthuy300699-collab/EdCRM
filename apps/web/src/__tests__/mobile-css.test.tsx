import fs from "fs";
import path from "path";
import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LandingPageClient from "../app/(public)/LandingPageClient";

describe("public landing mobile CSS contract", () => {
  it("scopes mobile-first responsive rules to the public landing page", () => {
    const { container } = render(<LandingPageClient />);
    expect(container.querySelector(".site-landing")).not.toBeNull();
    expect(container.querySelector(".site-hero-grid")).not.toBeNull();
    expect(container.querySelector(".site-contact-grid")).not.toBeNull();

    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toContain(".site-landing div[style*=\"grid-template-columns\"]");
    expect(css).toContain(".site-contact-grid");
    expect(css).toContain(".site-hero-actions");
    expect(css).toContain(".site-hero-mentor-badge");
    expect(css).toContain(".site-course-card-footer");
    expect(css).toContain(".site-course-card-actions");
    expect(css).toContain(".logo-container");
    expect(css).toContain(".mobile-burger-btn");

    const roboCss = fs.readFileSync(path.join(process.cwd(), "src/shared/ui/robo-assistant/RoboAssistant.module.css"), "utf8");
    expect(roboCss).toContain("@media (max-width: 760px)");
    expect(roboCss).toContain(".speechBubble");
    expect(roboCss).toContain("flex-wrap: wrap");
  });

  it("marks course card controls for narrow mobile stacking", () => {
    const { container } = render(
      <LandingPageClient
        initialCourses={[
          {
            id: "python",
            title: "Программирование на Python",
            slug: "python-dlya-detey-lipetsk",
            min_age: 10,
            max_age: 14,
            short_description: "Освоение профессионального программирования на простых задачах.",
            price_monthly: 3500,
          },
        ]}
      />,
    );

    expect(container.querySelector(".site-course-card-footer")).not.toBeNull();
    expect(container.querySelector(".site-course-card-actions")).not.toBeNull();
    expect(container.querySelectorAll(".site-course-card-actions button")).toHaveLength(2);
  });
});
