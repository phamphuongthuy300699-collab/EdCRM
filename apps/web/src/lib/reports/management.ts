type Input = {
  students: any[];
  groups: any[];
  enrollments: any[];
  sessions: any[];
  attendance: any[];
  payments: any[];
  ledger: any[];
  accounts: any[];
  payroll: any[];
  dateFrom: string;
  dateTo: string;
};

const number = (value: unknown) => Number(value || 0);
const round = (value: number) => Math.round(value * 100) / 100;
const percent = (part: number, total: number) => total ? round((part / total) * 100) : 0;

export function buildManagementReport(input: Input) {
  const activeStudents = input.students.filter((student) => student.status == null || student.status === "active");
  const activeEnrollments = input.enrollments.filter((enrollment) => enrollment.status === "active");
  const enrolledStudents = new Set(activeEnrollments.map((enrollment) => enrollment.student_id));
  const activeGroups = input.groups.filter((group) => group.status === "active");
  const capacity = activeGroups.reduce((sum, group) => sum + number(group.capacity), 0);
  const marked = input.attendance.filter((row) => row.status && row.status !== "unmarked");
  const present = marked.filter((row) => row.status === "present").length;
  const late = marked.filter((row) => row.status === "late").length;
  const absentExcused = marked.filter((row) => row.status === "absent_excused").length;
  const absentUnexcused = marked.filter((row) => row.status === "absent_unexcused").length;
  const lessonDebits = input.ledger.filter((entry) => entry.entry_type === "lesson_debit");
  const manualAdjustments = input.ledger.filter((entry) => entry.entry_type === "manual_credit" || entry.entry_type === "manual_debit");
  const debtAccounts = input.accounts.filter((account) => number(account.balance) < 0);

  const groupRows = activeGroups.map((group) => {
    const enrollments = activeEnrollments.filter((item) => item.group_id === group.id).length;
    const sessions = input.sessions.filter((item) => item.group_id === group.id);
    const attendance = marked.filter((item) => item.group_id === group.id);
    const groupPayroll = input.payroll.filter((item) => item.group_id === group.id);
    return {
      id: group.id,
      title: group.title,
      teacher: group.teacher_name || "Не назначен",
      students: enrollments,
      capacity: number(group.capacity),
      occupancyRate: percent(enrollments, number(group.capacity)),
      completedLessons: sessions.filter((item) => item.status === "completed").length,
      visits: attendance.filter((item) => item.status === "present" || item.status === "late").length,
      absences: attendance.filter((item) => item.status === "absent_excused" || item.status === "absent_unexcused").length,
      lessonDebits: lessonDebits.filter((item) => item.group_id === group.id).reduce((sum, item) => sum + Math.abs(number(item.amount)), 0),
      teacherPayroll: groupPayroll.reduce((sum, item) => sum + number(item.amount), 0),
    };
  });

  const teacherMap = new Map<string, any>();
  for (const payroll of input.payroll) {
    const current = teacherMap.get(payroll.teacher_id) || {
      id: payroll.teacher_id,
      teacher: payroll.teacher_name || "Преподаватель",
      completedLessons: 0,
      actualVisits: 0,
      payrollRows: 0,
      accrued: 0,
      approved: 0,
      paid: 0,
      payable: 0,
    };
    current.actualVisits += number(payroll.attendee_count);
    current.payrollRows += 1;
    current.accrued += number(payroll.amount);
    if (payroll.status === "approved" || payroll.status === "paid") current.approved += number(payroll.amount);
    if (payroll.status === "approved") current.payable += number(payroll.amount);
    if (payroll.status === "paid") current.paid += number(payroll.amount);
    teacherMap.set(payroll.teacher_id, current);
  }
  for (const teacher of teacherMap.values()) {
    teacher.completedLessons = input.sessions.filter((session) => session.teacher_id === teacher.id && session.status === "completed").length;
    teacher.averageChildren = teacher.payrollRows ? round(teacher.actualVisits / teacher.payrollRows) : 0;
    delete teacher.payrollRows;
  }

  const attendanceMap = new Map<string, any>();
  for (const row of marked) {
    const key = `${row.student_id}:${row.group_id}`;
    const current = attendanceMap.get(key) || {
      studentId: row.student_id,
      student: row.student_name || "Ученик",
      groupId: row.group_id,
      group: row.group_title || "Группа",
      lessons: 0,
      present: 0,
      late: 0,
      absentExcused: 0,
      absentUnexcused: 0,
    };
    current.lessons += 1;
    if (row.status === "present") current.present += 1;
    if (row.status === "late") current.late += 1;
    if (row.status === "absent_excused") current.absentExcused += 1;
    if (row.status === "absent_unexcused") current.absentUnexcused += 1;
    current.rate = percent(current.present + current.late, current.lessons);
    attendanceMap.set(key, current);
  }

  const payrollAccrued = input.payroll.reduce((sum, item) => sum + number(item.amount), 0);
  const payrollApproved = input.payroll.filter((item) => item.status === "approved" || item.status === "paid").reduce((sum, item) => sum + number(item.amount), 0);
  const payrollPaid = input.payroll.filter((item) => item.status === "paid").reduce((sum, item) => sum + number(item.amount), 0);
  const payrollPayable = input.payroll.filter((item) => item.status === "approved").reduce((sum, item) => sum + number(item.amount), 0);

  return {
    sources: {
      students: "students + active enrollments",
      groups: "groups.capacity + active enrollments (current occupancy)",
      lessons: "lesson_sessions",
      attendance: "attendance",
      cash: "payments paid/succeeded",
      lessonDebits: "billing_ledger_entries.lesson_debit",
      debt: "billing_accounts.balance",
      payroll: "teacher_payroll_entries snapshots",
    },
    students: {
      active: activeStudents.length,
      withoutGroup: activeStudents.filter((student) => !enrolledStudents.has(student.id)).length,
      newInPeriod: activeStudents.filter((student) => student.created_at >= input.dateFrom && student.created_at <= `${input.dateTo}T23:59:59.999Z`).length,
    },
    groups: { active: activeGroups.length, enrolled: activeEnrollments.length, capacity, occupancyRate: percent(activeEnrollments.length, capacity) },
    lessons: {
      scheduled: input.sessions.length,
      completed: input.sessions.filter((session) => session.status === "completed").length,
      cancelled: input.sessions.filter((session) => session.status === "cancelled").length,
      moved: input.sessions.filter((session) => session.status === "moved" || session.rescheduled_from_session_id).length,
    },
    attendance: { total: marked.length, present, late, absentExcused, absentUnexcused, rate: percent(present + late, marked.length) },
    finance: {
      paidPayments: input.payments.filter((payment) => payment.status === "paid" || payment.status === "succeeded").length,
      cashReceived: input.payments.filter((payment) => payment.status === "paid" || payment.status === "succeeded").reduce((sum, item) => sum + number(item.amount), 0),
      lessonDebits: lessonDebits.reduce((sum, item) => sum + Math.abs(number(item.amount)), 0),
      manualAdjustments: manualAdjustments.reduce((sum, item) => sum + number(item.amount), 0),
      totalDebt: debtAccounts.reduce((sum, item) => sum + Math.abs(number(item.balance)), 0),
      debtors: debtAccounts.length,
    },
    payroll: { accrued: payrollAccrued, approved: payrollApproved, paid: payrollPaid, payable: payrollPayable },
    groupRows,
    teacherRows: [...teacherMap.values()],
    attendanceRows: [...attendanceMap.values()],
  };
}
