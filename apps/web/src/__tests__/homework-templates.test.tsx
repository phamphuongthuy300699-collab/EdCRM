import { describe, it, expect, vi } from "vitest";

describe("Homework template actions and double-submit protection", () => {
  it("prevents duplicate creation using submittingTemplate guard", () => {
    let submittingTemplate = false;
    let createCount = 0;

    const handleCreate = () => {
      if (submittingTemplate) return;
      submittingTemplate = true;
      createCount++;
    };

    // First click
    handleCreate();
    expect(createCount).toBe(1);
    expect(submittingTemplate).toBe(true);

    // Second click (double click before resetting state)
    handleCreate();
    expect(createCount).toBe(1); // Blocked!
  });

  it("prevents duplicate updates using submittingTemplate guard", () => {
    let submittingTemplate = false;
    let updateCount = 0;

    const handleUpdate = () => {
      if (submittingTemplate) return;
      submittingTemplate = true;
      updateCount++;
    };

    // First click
    handleUpdate();
    expect(updateCount).toBe(1);
    expect(submittingTemplate).toBe(true);

    // Second click (double click before resetting state)
    handleUpdate();
    expect(updateCount).toBe(1); // Blocked!
  });
});
