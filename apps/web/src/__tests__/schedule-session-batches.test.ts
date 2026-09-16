import { describe, expect, it, vi } from "vitest";
import { loadSessionBatches } from "@/features/scheduling/load-session-batches";

describe("large teacher calendars", () => {
  it("loads all 107 lessons through a proxy with a 4KB header limit", async () => {
    const ids = Array.from({ length: 107 }, (_, i) => `96000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    const result = await loadSessionBatches(ids, async batch => {
      const headerSize = 500 + encodeURIComponent(batch.join(",")).length;
      return headerSize > 4096 ? { data: null, error: "502 header too large" } : { data: batch.map(id => ({ id })), error: null };
    });
    expect(result.error).toBeNull();
    expect(result.data.map(row => row.id)).toEqual(ids);
  });
  it("does not return partial participant counts when a batch fails", async () => {
    const load = vi.fn().mockResolvedValueOnce({ data: [{ id: "trial" }], error: null }).mockResolvedValueOnce({ data: null, error: "database unavailable" });
    expect(await loadSessionBatches(Array(41).fill("id"), load)).toEqual({ data: [], error: "database unavailable" });
  });
  it("skips database calls for an empty calendar", async () => {
    const load = vi.fn();
    expect(await loadSessionBatches([], load)).toEqual({ data: [], error: null });
    expect(load).not.toHaveBeenCalled();
  });
});
