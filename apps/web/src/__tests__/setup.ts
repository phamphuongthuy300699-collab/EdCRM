import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => {
  return {
    useRouter: () => ({
      push: vi.fn(),
      refresh: vi.fn(),
    }),
    useParams: () => ({
      studentId: "mock-1",
    }),
    usePathname: () => "/student",
  };
});
