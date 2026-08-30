import pg from "pg";

const { Client } = pg;
const connectionString =
  process.env.SUPABASE_DB_URL ||
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const ids = {
  actor: "99000000-0000-4000-8000-000000000001",
  teacher: "99000000-0000-4000-8000-000000000002",
  organization: "99000000-0000-4000-8000-000000000010",
  branch: "99000000-0000-4000-8000-000000000020",
  room: "99000000-0000-4000-8000-000000000030",
  course: "99000000-0000-4000-8000-000000000040",
  group: "99000000-0000-4000-8000-000000000050",
  student: "99000000-0000-4000-8000-000000000060",
  leadA: "99000000-0000-4000-8000-000000000070",
  leadB: "99000000-0000-4000-8000-000000000071",
  leadC: "99000000-0000-4000-8000-000000000072",
  session: "99000000-0000-4000-8000-000000000080",
  sourceSession: "99000000-0000-4000-8000-000000000081",
  sessionWithMakeupRace: "99000000-0000-4000-8000-000000000082",
  attendance: "99000000-0000-4000-8000-000000000090",
  makeup: "99000000-0000-4000-8000-000000000091",
};

async function connect() {
  const client = new Client({ connectionString });
  await client.connect();
  return client;
}

const setup = await connect();
try {
  await setup.query("delete from public.organizations where id = $1", [
    ids.organization,
  ]);
  await setup.query("delete from public.profiles where id = any($1::uuid[])", [
    [ids.actor, ids.teacher],
  ]);
  await setup.query("delete from auth.users where id = any($1::uuid[])", [
    [ids.actor, ids.teacher],
  ]);
  await setup.query(
    `insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
    ($1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','race-manager@trial.test','',now(),'{}','{}',now(),now()),
    ($2,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','race-teacher@trial.test','',now(),'{}','{}',now(),now())`,
    [ids.actor, ids.teacher],
  );
  await setup.query(
    "insert into public.organizations (id, name, slug) values ($1, 'Trial race tenant', 'trial-race-tenant')",
    [ids.organization],
  );
  await setup.query(
    "insert into public.profiles (id, full_name) values ($1, 'Race manager'), ($2, 'Race teacher')",
    [ids.actor, ids.teacher],
  );
  await setup.query(
    "insert into public.org_memberships (organization_id, user_id, role) values ($1, $2, 'manager'), ($1, $3, 'teacher')",
    [ids.organization, ids.actor, ids.teacher],
  );
  await setup.query(
    "insert into public.branches (id, organization_id, name) values ($1, $2, 'Race branch')",
    [ids.branch, ids.organization],
  );
  await setup.query(
    "insert into public.rooms (id, organization_id, branch_id, name, capacity) values ($1, $2, $3, 'Race room', 1)",
    [ids.room, ids.organization, ids.branch],
  );
  await setup.query(
    "insert into public.courses (id, organization_id, title, slug) values ($1, $2, 'Race course', 'trial-race-course')",
    [ids.course, ids.organization],
  );
  await setup.query(
    `insert into public.groups (id, organization_id, course_id, branch_id, room_id, teacher_id, title, status, capacity)
    values ($1, $2, $3, $4, $5, $6, 'Last seat group', 'active', 1)`,
    [
      ids.group,
      ids.organization,
      ids.course,
      ids.branch,
      ids.room,
      ids.teacher,
    ],
  );
  await setup.query(
    "insert into public.students (id, organization_id, full_name, status) values ($1, $2, 'Makeup race student', 'active')",
    [ids.student, ids.organization],
  );
  await setup.query(
    `insert into public.leads (id, organization_id, parent_name, parent_phone, child_name, status) values
    ($1, $3, 'Parent A', '+70000000101', 'Child A', 'contacted'),
    ($2, $3, 'Parent B', '+70000000102', 'Child B', 'contacted'),
    ($4, $3, 'Parent C', '+70000000103', 'Child C', 'contacted')`,
    [ids.leadA, ids.leadB, ids.organization, ids.leadC],
  );
  await setup.query(
    `insert into public.lesson_sessions (id, organization_id, group_id, course_id, teacher_id, room_id, starts_at, ends_at, lesson_date, status, session_kind)
    values ($1, $2, $3, $4, $5, $6, '2099-09-10 17:00+03', '2099-09-10 18:00+03', '2099-09-10', 'planned', 'regular')`,
    [
      ids.session,
      ids.organization,
      ids.group,
      ids.course,
      ids.teacher,
      ids.room,
    ],
  );
  await setup.query(
    `insert into public.lesson_sessions (id, organization_id, group_id, course_id, teacher_id, room_id, starts_at, ends_at, lesson_date, status, session_kind) values
    ($1, $3, $4, $5, $6, $7, '2099-09-09 10:00+03', '2099-09-09 11:00+03', '2099-09-09', 'completed', 'regular'),
    ($2, $3, $4, $5, $6, $7, '2099-09-11 17:00+03', '2099-09-11 18:00+03', '2099-09-11', 'planned', 'regular')`,
    [
      ids.sourceSession,
      ids.sessionWithMakeupRace,
      ids.organization,
      ids.group,
      ids.course,
      ids.teacher,
      ids.room,
    ],
  );
  await setup.query(
    `insert into public.attendance (id, organization_id, group_id, student_id, lesson_session_id, lesson_date, is_present, attendance_status)
    values ($1, $2, $3, $4, $5, '2099-09-09', false, 'absent_excused')`,
    [
      ids.attendance,
      ids.organization,
      ids.group,
      ids.student,
      ids.sourceSession,
    ],
  );
  await setup.query(
    `insert into public.makeup_assignments (id, organization_id, source_attendance_id, student_id, status)
    values ($1, $2, $3, $4, 'requested')`,
    [ids.makeup, ids.organization, ids.attendance, ids.student],
  );

  const first = await connect();
  const second = await connect();
  const call = (client, leadId, sessionId = ids.session) =>
    client.query(
      "select public.crm_create_trial_event($1,$2,'attached_session',$3,null,null,null,null,null,$4::jsonb)",
      [
        ids.organization,
        ids.actor,
        sessionId,
        JSON.stringify([{ lead_id: leadId }]),
      ],
    );
  const results = await Promise.allSettled([
    call(first, ids.leadA),
    call(second, ids.leadB),
  ]);
  await first.end();
  await second.end();

  const successes = results.filter((result) => result.status === "fulfilled");
  const capacityFailures = results.filter(
    (result) =>
      result.status === "rejected" &&
      result.reason?.message?.includes("trial_capacity_exceeded"),
  );
  const count = await setup.query(
    `select count(*)::integer as count
     from public.trial_participants participant
     join public.trial_events event on event.id = participant.trial_event_id
     where event.lesson_session_id = $1 and participant.status <> 'cancelled'`,
    [ids.session],
  );
  if (
    successes.length !== 1 ||
    capacityFailures.length !== 1 ||
    count.rows[0].count !== 1
  ) {
    throw new Error(
      `capacity race failed: successes=${successes.length}, capacityFailures=${capacityFailures.length}, participants=${count.rows[0].count}`,
    );
  }
  console.log(
    "PASS: concurrent last-seat requests produced one success, one capacity conflict, and one participant",
  );

  const trialClient = await connect();
  const makeupClient = await connect();
  const trialVsMakeup = await Promise.allSettled([
    call(trialClient, ids.leadC, ids.sessionWithMakeupRace),
    makeupClient.query(
      "update public.makeup_assignments set target_session_id=$1,status='scheduled' where id=$2",
      [ids.sessionWithMakeupRace, ids.makeup],
    ),
  ]);
  await trialClient.end();
  await makeupClient.end();
  const crossWriterSuccesses = trialVsMakeup.filter(
    (result) => result.status === "fulfilled",
  );
  const crossWriterCapacityFailures = trialVsMakeup.filter(
    (result) =>
      result.status === "rejected" &&
      /(trial_capacity_exceeded|group_session_capacity_exceeded)/.test(
        result.reason?.message || "",
      ),
  );
  const crossWriterOccupancy = await setup.query(
    "select public.trial_attached_occupancy($1,$2,'[]'::jsonb,null) as count",
    [ids.organization, ids.sessionWithMakeupRace],
  );
  if (
    crossWriterSuccesses.length !== 1 ||
    crossWriterCapacityFailures.length !== 1 ||
    Number(crossWriterOccupancy.rows[0].count) !== 1
  ) {
    throw new Error(
      `cross-writer race failed: successes=${crossWriterSuccesses.length}, capacityFailures=${crossWriterCapacityFailures.length}, occupancy=${crossWriterOccupancy.rows[0].count}`,
    );
  }
  console.log(
    "PASS: concurrent trial/makeup last-seat requests share one lock and cannot overbook",
  );
} finally {
  await setup
    .query("delete from public.organizations where id = $1", [ids.organization])
    .catch(() => undefined);
  await setup
    .query("delete from public.profiles where id = any($1::uuid[])", [
      [ids.actor, ids.teacher],
    ])
    .catch(() => undefined);
  await setup
    .query("delete from auth.users where id = any($1::uuid[])", [
      [ids.actor, ids.teacher],
    ])
    .catch(() => undefined);
  await setup.end();
}
