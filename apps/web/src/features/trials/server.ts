type RpcError = { message?: string | null };

const knownErrors: Array<{
  marker: string;
  status: number;
  code: string;
  error: string;
}> = [
  {
    marker: "trial_capacity_exceeded",
    status: 409,
    code: "TRIAL_CAPACITY_EXCEEDED",
    error: "Нет свободных мест для всех выбранных участников",
  },
  {
    marker: "trial_slot_conflict",
    status: 409,
    code: "TRIAL_SLOT_CONFLICT",
    error: "Время занято преподавателем или кабинетом",
  },
  {
    marker: "trial_subject_duplicate",
    status: 409,
    code: "TRIAL_SUBJECT_DUPLICATE",
    error: "Этот участник уже добавлен на пробное занятие",
  },
  {
    marker: "trial_subject_already_occupies_session",
    status: 409,
    code: "TRIAL_SUBJECT_ALREADY_OCCUPIES_SESSION",
    error: "Этот ребёнок уже занимает место на выбранном занятии",
  },
  {
    marker: "trial_forbidden",
    status: 403,
    code: "TRIAL_FORBIDDEN",
    error: "Недостаточно прав для изменения пробного занятия",
  },
  {
    marker: "trial_actor_forbidden",
    status: 403,
    code: "TRIAL_FORBIDDEN",
    error: "Недостаточно прав для изменения пробного занятия",
  },
  {
    marker: "trial_session_not_eligible",
    status: 409,
    code: "TRIAL_SESSION_NOT_ELIGIBLE",
    error: "К этому занятию уже нельзя добавить пробных участников",
  },
  {
    marker: "trial_subject_wrong_organization",
    status: 404,
    code: "TRIAL_SUBJECT_NOT_FOUND",
    error: "Участник не найден",
  },
  {
    marker: "trial_participant_not_found",
    status: 404,
    code: "TRIAL_PARTICIPANT_NOT_FOUND",
    error: "Пробный участник не найден",
  },
  {
    marker: "trial_event_not_found",
    status: 404,
    code: "TRIAL_EVENT_NOT_FOUND",
    error: "Пробное занятие не найдено",
  },
  {
    marker: "trial_teacher_not_active",
    status: 400,
    code: "TRIAL_TEACHER_INVALID",
    error: "Выберите активного преподавателя",
  },
  {
    marker: "trial_branch_not_active",
    status: 400,
    code: "TRIAL_BRANCH_INVALID",
    error: "Выберите активный филиал",
  },
  {
    marker: "trial_room_branch_mismatch",
    status: 400,
    code: "TRIAL_ROOM_INVALID",
    error: "Выберите кабинет выбранного филиала",
  },
];

export function mapTrialRpcError(cause: RpcError) {
  const message = cause.message || "";
  const availableMatch = message.match(/trial_capacity_exceeded:(\d+)/);
  if (availableMatch) {
    const available = Number(availableMatch[1]);
    const ending =
      available % 10 === 1 && available % 100 !== 11
        ? "место"
        : available % 10 >= 2 &&
            available % 10 <= 4 &&
            (available % 100 < 12 || available % 100 > 14)
          ? "места"
          : "мест";
    return {
      status: 409,
      body: {
        ok: false as const,
        code: "TRIAL_CAPACITY_EXCEEDED",
        error: `В занятии доступно только ${available} ${ending}`,
      },
    };
  }
  const known = knownErrors.find((candidate) =>
    message.includes(candidate.marker),
  );
  if (known) {
    return {
      status: known.status,
      body: { ok: false as const, code: known.code, error: known.error },
    };
  }
  return {
    status: 500,
    body: {
      ok: false as const,
      code: "TRIAL_OPERATION_FAILED",
      error: "Не удалось выполнить операцию с пробным занятием",
    },
  };
}

export function trialParticipantDto(row: any) {
  const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads;
  const student = Array.isArray(row.students) ? row.students[0] : row.students;
  return {
    id: row.id,
    eventId: row.trial_event_id,
    leadId: row.lead_id || null,
    studentId: row.student_id || null,
    subjectName:
      student?.full_name || lead?.child_name || lead?.parent_name || "Участник",
    subjectKind: row.student_id ? ("student" as const) : ("lead" as const),
    status: row.status,
    result: row.result || null,
    resultComment: row.result_comment || null,
  };
}
