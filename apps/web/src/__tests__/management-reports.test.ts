import { describe, expect, it } from "vitest";
import { buildManagementReport } from "@/lib/reports/management";

describe("authoritative management report formulas", () => {
  it("keeps cash, lesson debits, attendance, debt and payroll snapshots distinct", () => {
    const report = buildManagementReport({
      students: [
        { id: "s1", status: "active", created_at: "2026-08-05" },
        { id: "s2", status: "active", created_at: "2026-07-01" },
      ],
      groups: [{ id: "g1", title: "Group 1", status: "active", capacity: 4, teacher_id: "t1", teacher_name: "Teacher 1" }],
      enrollments: [{ student_id: "s1", group_id: "g1", status: "active" }],
      sessions: [
        { id: "l1", group_id: "g1", teacher_id: "t1", status: "completed", rescheduled_from_session_id: null },
        { id: "l2", group_id: "g1", teacher_id: "t1", status: "planned", rescheduled_from_session_id: "old" },
      ],
      attendance: [
        { student_id: "s1", student_name: "Student 1", group_id: "g1", group_title: "Group 1", status: "present" },
        { student_id: "s1", student_name: "Student 1", group_id: "g1", group_title: "Group 1", status: "late" },
        { student_id: "s1", student_name: "Student 1", group_id: "g1", group_title: "Group 1", status: "absent_excused" },
        { student_id: "s1", student_name: "Student 1", group_id: "g1", group_title: "Group 1", status: "absent_unexcused" },
      ],
      payments: [{ id: "p1", amount: 1000, status: "paid" }],
      ledger: [
        { entry_type: "payment", amount: 1000, group_id: null },
        { entry_type: "lesson_debit", amount: -500, group_id: "g1" },
        { entry_type: "manual_credit", amount: 200, group_id: null },
        { entry_type: "manual_debit", amount: -50, group_id: null },
      ],
      accounts: [{ guardian_id: "r1", balance: -500 }],
      payroll: [
        { teacher_id: "t1", teacher_name: "Teacher 1", group_id: "g1", lesson_session_id: "l1", attendee_count: 2, amount: 300, status: "accrued" },
        { teacher_id: "t1", teacher_name: "Teacher 1", group_id: "g1", lesson_session_id: "l2", attendee_count: 1, amount: 400, status: "approved" },
        { teacher_id: "t1", teacher_name: "Teacher 1", group_id: "g1", lesson_session_id: "l3", attendee_count: 3, amount: 500, status: "paid" },
      ],
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
    });

    expect(report.students).toEqual({ active: 2, withoutGroup: 1, newInPeriod: 1 });
    expect(report.groups).toEqual({ active: 1, enrolled: 1, capacity: 4, occupancyRate: 25 });
    expect(report.lessons).toEqual({ scheduled: 2, completed: 1, cancelled: 0, moved: 1 });
    expect(report.attendance).toEqual({ total: 4, present: 1, late: 1, absentExcused: 1, absentUnexcused: 1, rate: 50 });
    expect(report.finance).toEqual({ paidPayments: 1, cashReceived: 1000, lessonDebits: 500, manualAdjustments: 150, totalDebt: 500, debtors: 1 });
    expect(report.payroll).toEqual({ accrued: 1200, approved: 900, paid: 500, payable: 400 });
    expect(report.groupRows[0]).toMatchObject({ occupancyRate: 25, completedLessons: 1, visits: 2, absences: 2, lessonDebits: 500, teacherPayroll: 1200 });
    expect(report.teacherRows[0]).toMatchObject({ completedLessons: 1, actualVisits: 6, averageChildren: 2, accrued: 1200, approved: 900, paid: 500, payable: 400 });
    expect(report.attendanceRows[0]).toMatchObject({ lessons: 4, present: 1, late: 1, absentExcused: 1, absentUnexcused: 1, rate: 50 });
  });
});
