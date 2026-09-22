import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ require: vi.fn(), from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/app/api/crm/_shared", () => ({ requireCrmStaff: mock.require, crmAdmin: () => ({ from: mock.from, rpc: mock.rpc }) }));
import { GET, POST } from "@/app/api/teacher/lessons/[sessionId]/trials/route";
const sessionId = "93000000-0000-4000-8000-000000000080";
const studentId = "93000000-0000-4000-8000-000000000062";
const ctx = { params: Promise.resolve({ sessionId }) };
let filters: Array<[string, unknown]>;
function query(data: unknown, error: unknown = null) {
  const chain: any = { then: (resolve: (r: unknown) => unknown) => Promise.resolve({ data, error }).then(resolve), maybeSingle: async () => ({ data, error }) };
  for (const name of ["select", "in", "is", "order", "limit"]) chain[name] = vi.fn(() => chain);
  chain.eq = vi.fn((key, value) => { filters.push([key, value]); return chain; });
  return chain;
}
beforeEach(() => {
  vi.clearAllMocks(); filters = [];
  mock.require.mockResolvedValue({ ok: true, organizationId: "org", staffProfileId: "profile", role: "teacher" });
  mock.from.mockImplementation(table => query(table === "lesson_sessions" ? { id: sessionId, status: "live" } : []));
  mock.rpc.mockResolvedValue({ data: { trial_event_id: "event" }, error: null });
});
const request = (body: unknown) => new Request("http://localhost/api/teacher/lessons/id/trials", { method: "POST", body: JSON.stringify(body) });
describe("teacher lesson trial endpoint", () => {
  it("scopes the lesson before exposing names or accepting participant", async () => {
    const response = await POST(request({ kind: "existing", participant: { studentId } }), ctx);
    expect(response.status).toBe(201);
    expect(filters).toContainEqual(["organization_id", "org"]);
    expect(filters).toContainEqual(["teacher_id", "profile"]);
    expect(mock.rpc).toHaveBeenCalledWith("crm_create_trial_event", expect.objectContaining({ p_actor_id: "profile", p_organization_id: "org", p_lesson_session_id: sessionId, p_mode: "attached_session", p_participants: [{ student_id: studentId }] }));
  });
  it("rejects foreign lesson before candidate reads or writes", async () => {
    mock.from.mockReturnValue(query(null));
    expect((await GET(new Request("http://localhost"), ctx)).status).toBe(403);
    expect((await POST(request({ kind: "existing", participant: { studentId } }), ctx)).status).toBe(403);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("does not allow a teacher to override organization or lesson in the body", async () => {
    expect((await POST(request({ kind: "existing", participant: { studentId }, organizationId: "other" }), ctx)).status).toBe(400);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("creates the walk-in through the atomic RPC", async () => {
    expect((await POST(request({ kind: "new", requestId: studentId, childName: "Новый ребёнок" }), ctx)).status).toBe(201);
    expect(mock.rpc).toHaveBeenCalledWith("crm_add_teacher_walkin", expect.objectContaining({ p_child_name: "Новый ребёнок", p_request_id: studentId, p_parent_phone: "" }));
  });
  it("rejects invalid input and completed lessons", async () => {
    expect((await POST(request({ kind: "new", requestId: studentId, childName: " " }), ctx)).status).toBe(400);
    mock.from.mockReturnValue(query({ id: sessionId, status: "completed" }));
    expect((await POST(request({ kind: "existing", participant: { studentId } }), ctx)).status).toBe(409);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("returns a safe capacity error", async () => {
    mock.rpc.mockResolvedValue({ error: { message: "trial_capacity_exceeded:0" } });
    const response = await POST(request({ kind: "existing", participant: { studentId } }), ctx);
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("0 мест");
  });
});
