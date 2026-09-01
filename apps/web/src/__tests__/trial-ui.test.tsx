import fs from "fs";
import path from "path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrialDialog } from "../features/trials/TrialDialog";
import { TrialParticipantList } from "../features/trials/TrialParticipantList";
import {
  TrialSubjectPicker,
  type TrialSubjectOption,
} from "../features/trials/TrialSubjectPicker";
import type { TrialSubjectInput } from "../features/trials/contracts";

const read = (file: string) =>
  fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
const leadId = "a2222222-e222-3333-4444-555555555555";
const studentId = "b2222222-e222-3333-4444-555555555555";

afterEach(() => vi.unstubAllGlobals());

function PickerHarness({ options }: { options: TrialSubjectOption[] }) {
  const [selected, setSelected] = useState<TrialSubjectInput[]>([]);
  return (
    <TrialSubjectPicker
      options={options}
      selected={selected}
      onChange={setSelected}
    />
  );
}

describe("trial subject picker", () => {
  it("searches, selects mixed subjects, prevents duplicates, and removes chips", () => {
    render(
      <PickerHarness
        options={[
          {
            kind: "lead",
            id: leadId,
            name: "Лёва из заявки",
            detail: "Анна · LEGO",
          },
          {
            kind: "student",
            id: studentId,
            name: "Миша Ученик",
            detail: "Активный ученик",
          },
        ]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Добавить Лёва из заявки" }),
    );
    expect(screen.getByLabelText("Удалить Лёва из заявки")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Добавить Лёва из заявки" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Добавить Миша Ученик" }),
    );
    expect(screen.getByLabelText("Удалить Миша Ученик")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Удалить Лёва из заявки"));
    expect(
      screen.queryByLabelText("Удалить Лёва из заявки"),
    ).not.toBeInTheDocument();
  });
});

describe("trial dialog", () => {
  it("preselects a lead and switches between attached and standalone modes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          leads: [
            {
              id: leadId,
              child_name: "Лёва из заявки",
              parent_name: "Анна",
              status: "contacted",
            },
          ],
          students: [],
          teachers: [{ id: studentId, name: "Преподаватель" }],
          branches: [{ id: studentId, name: "Филиал" }],
          rooms: [
            {
              id: studentId,
              name: "Кабинет",
              branch_id: studentId,
              capacity: 8,
            },
          ],
          sessions: [
            {
              id: studentId,
              starts_at: "2026-09-01T10:00:00.000Z",
              groups: { title: "Группа", capacity: 8 },
            },
          ],
        }),
      }),
    );

    render(
      <TrialDialog
        initialSubjects={[{ leadId }]}
        onClose={() => undefined}
        onSaved={() => undefined}
      />,
    );
    expect(
      await screen.findByLabelText("Удалить Лёва из заявки"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("К обычному занятию")).toBeChecked();
    fireEvent.click(screen.getByLabelText("Отдельное пробное"));
    expect(screen.getByLabelText("Преподаватель")).toBeInTheDocument();
    expect(screen.getByLabelText("Начало")).toBeInTheDocument();
    expect(screen.getByLabelText("Окончание")).toBeInTheDocument();
  });
});

describe("trial participant operations", () => {
  it("edits trial status/result/comment separately from ordinary attendance", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          participant: { status: "attended", result: "interested" },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <TrialParticipantList
        participants={[
          {
            id: leadId,
            eventId: studentId,
            leadId,
            studentId: null,
            subjectName: "Лёва из заявки",
            subjectKind: "lead",
            status: "scheduled",
            result: null,
            resultComment: null,
          },
        ]}
      />,
    );

    expect(screen.getByText("Пробные участники")).toBeInTheDocument();
    expect(screen.queryByText("Журнал посещаемости")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Статус — Лёва из заявки"), {
      target: { value: "attended" },
    });
    fireEvent.change(screen.getByLabelText("Результат — Лёва из заявки"), {
      target: { value: "interested" },
    });
    fireEvent.change(screen.getByLabelText("Комментарий — Лёва из заявки"), {
      target: { value: "Готовы продолжать" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Сохранить результат" }),
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/crm/trials/participants/${leadId}`,
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
  });
});

describe("CRM trial entry points", () => {
  it("uses the same dialog from leads and students instead of status-only trial buttons", () => {
    const leads = read("src/app/(crm)/crm/leads/page.tsx");
    const students = read("src/app/(crm)/crm/students/page.tsx");
    expect(leads).toContain("<TrialDialog");
    expect(leads).not.toContain(
      'onClick={() => handleUpdateStatus(lead.id, "trial_scheduled")}',
    );
    expect(students).toContain("<TrialDialog");
  });
});
