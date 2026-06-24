-- LMS and Sales-light schema additions migration

-- 1. Create Enums if they do not exist
create type public.content_status as enum (
  'draft',
  'published',
  'archived'
);

create type public.material_visibility as enum (
  'admin_only',
  'teacher_only',
  'student_visible',
  'parent_visible',
  'public_preview'
);

create type public.material_type as enum (
  'lesson_plan',
  'presentation',
  'build_scheme',
  'code_listing',
  'student_handout',
  'homework',
  'quiz',
  'control_task',
  'teacher_notes',
  'video',
  'image',
  'external_link',
  'checklist',
  'safety',
  'equipment_list'
);

create type public.lesson_session_status as enum (
  'planned',
  'completed',
  'cancelled',
  'moved'
);

create type public.homework_assignment_status as enum (
  'assigned',
  'submitted',
  'checked',
  'cancelled'
);

create type public.lead_interaction_type as enum (
  'call',
  'message',
  'email',
  'telegram',
  'max',
  'comment',
  'meeting'
);

create type public.lead_interaction_result as enum (
  'answered',
  'no_answer',
  'interested',
  'scheduled_trial',
  'thinking',
  'rejected',
  'paid'
);

-- 2. Create Tables
create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  sort_order int not null default 100,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid references public.course_modules(id) on delete set null,
  title text not null,
  description text,
  goals text,
  plan text,
  duration_minutes int not null default 90,
  teacher_notes text,
  equipment text,
  sort_order int not null default 100,
  status public.content_status not null default 'draft',
  version int not null default 1,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_materials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lesson_template_id uuid not null references public.lesson_templates(id) on delete cascade,
  title text not null,
  type public.material_type not null,
  visibility public.material_visibility not null default 'teacher_only',
  file_url text,
  external_url text,
  content text,
  sort_order int not null default 100,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  module_id uuid references public.course_modules(id) on delete set null,
  lesson_template_id uuid references public.lesson_templates(id) on delete set null,
  teacher_id uuid references public.profiles(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status public.lesson_session_status not null default 'planned',
  topic text,
  teacher_comment text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Modify public.attendance
alter table public.attendance
add column if not exists lesson_session_id uuid references public.lesson_sessions(id) on delete cascade;

-- 4. Homework Tables
create table public.homework_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  module_id uuid references public.course_modules(id) on delete set null,
  lesson_template_id uuid references public.lesson_templates(id) on delete set null,
  title text not null,
  description text,
  difficulty text,
  estimated_minutes int,
  file_url text,
  external_url text,
  status public.content_status not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.homework_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  homework_template_id uuid not null references public.homework_templates(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  lesson_session_id uuid references public.lesson_sessions(id) on delete set null,
  assigned_by uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  status public.homework_assignment_status not null default 'assigned',
  created_at timestamptz not null default now()
);

-- 5. Sales Tables
create table public.lead_interactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  manager_id uuid references public.profiles(id) on delete set null,
  type public.lead_interaction_type not null,
  result public.lead_interaction_result,
  summary text,
  next_action_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.call_scripts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  stage text,
  content text not null,
  checklist jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.objections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  category text,
  recommended_answer text not null,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Create Indexes
create index if not exists idx_course_modules_course_order
  on public.course_modules(course_id, sort_order);

create index if not exists idx_lesson_templates_course_module_order
  on public.lesson_templates(course_id, module_id, sort_order);

create index if not exists idx_lesson_materials_template_order
  on public.lesson_materials(lesson_template_id, sort_order);

create index if not exists idx_lesson_sessions_group_starts
  on public.lesson_sessions(group_id, starts_at);

create index if not exists idx_homework_assignments_group_created
  on public.homework_assignments(group_id, created_at desc);

create index if not exists idx_lead_interactions_lead_created
  on public.lead_interactions(lead_id, created_at desc);

-- 7. Enable RLS
alter table public.course_modules enable row level security;
alter table public.lesson_templates enable row level security;
alter table public.lesson_materials enable row level security;
alter table public.lesson_sessions enable row level security;
alter table public.homework_templates enable row level security;
alter table public.homework_assignments enable row level security;
alter table public.lead_interactions enable row level security;
alter table public.call_scripts enable row level security;
alter table public.objections enable row level security;

-- 8. Add RLS Policies using existing is_org_member & has_org_role helpers
-- course_modules
create policy "course_modules_select" on public.course_modules
  for select to authenticated using (public.is_org_member(organization_id));
create policy "course_modules_all" on public.course_modules
  for all to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- lesson_templates
create policy "lesson_templates_select" on public.lesson_templates
  for select to authenticated using (public.is_org_member(organization_id));
create policy "lesson_templates_all" on public.lesson_templates
  for all to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- lesson_materials
create policy "lesson_materials_select" on public.lesson_materials
  for select to authenticated using (public.is_org_member(organization_id));
create policy "lesson_materials_all" on public.lesson_materials
  for all to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- lesson_sessions
create policy "lesson_sessions_select" on public.lesson_sessions
  for select to authenticated using (public.is_org_member(organization_id));
create policy "lesson_sessions_insert" on public.lesson_sessions
  for insert to authenticated with check (public.has_org_role(organization_id, array['owner','admin','manager','teacher']::public.app_role[]));
create policy "lesson_sessions_update" on public.lesson_sessions
  for update to authenticated using (public.is_org_member(organization_id));
create policy "lesson_sessions_delete" on public.lesson_sessions
  for delete to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- homework_templates
create policy "homework_templates_select" on public.homework_templates
  for select to authenticated using (public.is_org_member(organization_id));
create policy "homework_templates_all" on public.homework_templates
  for all to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- homework_assignments
create policy "homework_assignments_select" on public.homework_assignments
  for select to authenticated using (public.is_org_member(organization_id));
create policy "homework_assignments_all" on public.homework_assignments
  for all to authenticated using (public.is_org_member(organization_id));

-- lead_interactions
create policy "lead_interactions_select" on public.lead_interactions
  for select to authenticated using (public.is_org_member(organization_id));
create policy "lead_interactions_all" on public.lead_interactions
  for all to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- call_scripts
create policy "call_scripts_select" on public.call_scripts
  for select to authenticated using (public.is_org_member(organization_id));
create policy "call_scripts_all" on public.call_scripts
  for all to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- objections
create policy "objections_select" on public.objections
  for select to authenticated using (public.is_org_member(organization_id));
create policy "objections_all" on public.objections
  for all to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));


-- 9. Seed Demo Data directly in Migration
-- Organization is 'a3848a60-a292-491a-85eb-7f2824cf4e77', Course is '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a'
-- Update title of seeded course to Lego Start
update public.courses
set title = 'LEGO Start'
where id = '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a';

-- Insert Modules
insert into public.course_modules (id, organization_id, course_id, title, description, sort_order, status)
values
  ('d1111111-1111-1111-1111-111111111111', 'a3848a60-a292-491a-85eb-7f2824cf4e77', '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a', 'Введение', 'Вводная часть, знакомство с деталями и простыми программами', 10, 'published'),
  ('d2222222-2222-2222-2222-222222222222', 'a3848a60-a292-491a-85eb-7f2824cf4e77', '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a', 'Простые механизмы', 'Изучение шестеренок, рычагов, датчиков и алгоритмов движения', 20, 'published')
on conflict do nothing;

-- Insert Lesson Templates
insert into public.lesson_templates (id, organization_id, course_id, module_id, title, description, goals, plan, duration_minutes, teacher_notes, equipment, sort_order, status)
values
  ('e1111111-1111-1111-1111-111111111111', 'a3848a60-a292-491a-85eb-7f2824cf4e77', '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a', 'd1111111-1111-1111-1111-111111111111', 'Первое занятие', 'Сборка и знакомство с базовым набором деталей', 'Знакомство с деталями, сборка первой тележки', '1. Введение (10 мин)
2. Конструирование (40 мин)
3. Программирование (20 мин)
4. Тест и уборка (20 мин)', 90, 'Проследить, чтобы все дети убрали детали в свои ячейки.', 'Базовый набор LEGO Education', 10, 'published'),
  ('e2222222-2222-2222-2222-222222222222', 'a3848a60-a292-491a-85eb-7f2824cf4e77', '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a', 'd1111111-1111-1111-1111-111111111111', 'Моторы', 'Подключение моторов, управление мощностью и направлением', 'Изучение работы сервомоторов, алгоритм движения вперед-назад', '1. Повторение (10 мин)
2. Разбор теории моторов (15 мин)
3. Сборка робота-тягача (40 мин)
4. Написание кода и тест (25 мин)', 90, 'Помочь детям настроить правильные порты в приложении.', 'Конструктор LEGO, моторы', 20, 'published'),
  ('e3333333-3333-3333-3333-333333333333', 'a3848a60-a292-491a-85eb-7f2824cf4e77', '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a', 'd2222222-2222-2222-2222-222222222222', 'Датчики', 'Изучение датчиков расстояния и гироскопа', 'Работа с ультразвуковым датчиком, объезд препятствий', '1. Теория датчиков (20 мин)
2. Сборка робота-обходчика (40 мин)
3. Код с условием IF-ELSE (20 мин)
4. Демонстрация (10 мин)', 90, 'Объяснить принцип эхолокации простыми словами.', 'LEGO Smart Hub, датчик расстояния', 30, 'published'),
  ('e4444444-4444-4444-4444-444444444444', 'a3848a60-a292-491a-85eb-7f2824cf4e77', '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a', 'd2222222-2222-2222-2222-222222222222', 'Зубчатые передачи', 'Изучение видов шестеренок и передаточного числа', 'Понимание повышающей и понижающей передач, сборка мельницы', '1. Разбор видов шестеренок (15 мин)
2. Сборка передаточного стенда (45 мин)
3. Эксперименты с весом (20 мин)
4. Заключение (10 мин)', 90, 'Обратить внимание на соосность валов при сборке.', 'Набор LEGO, набор шестеренок разных диаметров', 40, 'published')
on conflict do nothing;

-- Insert Lesson Materials (5 per lesson)
insert into public.lesson_materials (organization_id, lesson_template_id, title, type, visibility, file_url, external_url, content, sort_order)
values
  -- Lesson 1
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e1111111-1111-1111-1111-111111111111', 'План занятия: Знакомство с робототехникой', 'lesson_plan', 'teacher_only', null, 'https://docs.google.com/document/d/demo-plan-1', 'Конспект вводного занятия для преподавателя.', 10),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e1111111-1111-1111-1111-111111111111', 'Презентация: Введение в LEGO Start', 'presentation', 'teacher_only', null, 'https://docs.google.com/presentation/d/demo-pres-1', 'Слайды о правилах безопасности и роботах.', 20),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e1111111-1111-1111-1111-111111111111', 'Схема сборки: Первая тележка', 'build_scheme', 'student_visible', null, 'https://instructions.lego.com/demo-build-1', 'Инструкция по сборке трехколесной тележки.', 30),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e1111111-1111-1111-1111-111111111111', 'Код: Движение вперед-назад', 'code_listing', 'student_visible', null, null, '# LEGO EV3 / Spike Python Code
from spike import PrimeHub, Motor

hub = PrimeHub()
motor = Motor(''A'')
motor.run_for_seconds(2, speed=50)
motor.run_for_seconds(2, speed=-50)', 40),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e1111111-1111-1111-1111-111111111111', 'Раздаточный материал: Основы алгоритмов', 'student_handout', 'student_visible', null, 'https://files.robotics.ru/handouts/basics.pdf', 'Рабочий лист для соединения стрелочками алгоритма.', 50),

  -- Lesson 2
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e2222222-2222-2222-2222-222222222222', 'План занятия: Подключение моторов', 'lesson_plan', 'teacher_only', null, 'https://docs.google.com/document/d/demo-plan-2', 'Конспект урока о моторах для учителя.', 10),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e2222222-2222-2222-2222-222222222222', 'Презентация: Виды моторов и мощность', 'presentation', 'teacher_only', null, 'https://docs.google.com/presentation/d/demo-pres-2', 'Теория о силе тока, редукторах и мощности.', 20),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e2222222-2222-2222-2222-222222222222', 'Схема сборки: Робот-тягач', 'build_scheme', 'student_visible', null, 'https://instructions.lego.com/demo-build-2', 'Пошаговая сборка мощного гусеничного тягача.', 30),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e2222222-2222-2222-2222-222222222222', 'Код: Синхронное вращение', 'code_listing', 'student_visible', null, null, '# Синхронный старт двух моторов
from spike import MotorPair

pair = MotorPair(''A'', ''B'')
pair.move_tank(10, ''seconds'', left_speed=60, right_speed=60)', 40),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e2222222-2222-2222-2222-222222222222', 'Рабочий лист: Мощность и скорость', 'student_handout', 'student_visible', null, 'https://files.robotics.ru/handouts/motors.pdf', 'Графики зависимости скорости от мощности.', 50),

  -- Lesson 3
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e3333333-3333-3333-3333-333333333333', 'План занятия: Работа с ультразвуковым датчиком', 'lesson_plan', 'teacher_only', null, 'https://docs.google.com/document/d/demo-plan-3', 'Как провести лабиринт с роботами.', 10),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e3333333-3333-3333-3333-333333333333', 'Презентация: Датчики расстояния и цвета', 'presentation', 'teacher_only', null, 'https://docs.google.com/presentation/d/demo-pres-3', 'Слайды об ультразвуке и ИК-лучах.', 20),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e3333333-3333-3333-3333-333333333333', 'Схема сборки: Робот-обходчик', 'build_scheme', 'student_visible', null, 'https://instructions.lego.com/demo-build-3', 'Сборка датчика на передний бампер тележки.', 30),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e3333333-3333-3333-3333-333333333333', 'Код: Остановка перед стеной', 'code_listing', 'student_visible', null, null, '# Использование датчика расстояния
from spike import DistanceSensor, MotorPair

pair = MotorPair(''A'', ''B'')
sensor = DistanceSensor(''C'')

while True:
    if sensor.get_distance_cm() < 10:
        pair.stop()
    else:
        pair.start(speed=40)', 40),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e3333333-3333-3333-3333-333333333333', 'Карточка заданий: Логические ветвления', 'student_handout', 'student_visible', null, 'https://files.robotics.ru/handouts/sensors.pdf', 'Схема ветвлений блок-схем.', 50),

  -- Lesson 4
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e4444444-4444-4444-4444-444444444444', 'План занятия: Зубчатые передачи и редукторы', 'lesson_plan', 'teacher_only', null, 'https://docs.google.com/document/d/demo-plan-4', 'Теория механических связей.', 10),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e4444444-4444-4444-4444-444444444444', 'Презентация: Механическая передача момента', 'presentation', 'teacher_only', null, 'https://docs.google.com/presentation/d/demo-pres-4', 'Слайды про ведомую и ведущую шестерни.', 20),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e4444444-4444-4444-4444-444444444444', 'Схема сборки: Механическая мельница', 'build_scheme', 'student_visible', null, 'https://instructions.lego.com/demo-build-4', 'Инструкция по созданию повышающего редуктора.', 30),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e4444444-4444-4444-4444-444444444444', 'Код: Управление мельницей', 'code_listing', 'student_visible', null, null, '# Запуск крутящего момента
from spike import Motor

motor = Motor(''A'')
motor.start(speed=100) # Максимальная скорость для раскрутки', 40),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e4444444-4444-4444-4444-444444444444', 'Раздатка: Передаточное отношение', 'student_handout', 'student_visible', null, 'https://files.robotics.ru/handouts/gears.pdf', 'Задачи на подсчет зубьев и оборотов.', 50)
on conflict do nothing;

-- Insert Homework Templates (2 templates)
insert into public.homework_templates (id, organization_id, course_id, module_id, lesson_template_id, title, description, difficulty, estimated_minutes, status)
values
  ('b1111111-1111-1111-1111-111111111111', 'a3848a60-a292-491a-85eb-7f2824cf4e77', '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a', 'd1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'Мини-проект дома', 'Нарисуйте схему своего придуманного робота на листе бумаги и придумайте 3 действия, которые он умеет делать.', 'Легкая', 30, 'published'),
  ('b2222222-2222-2222-2222-222222222222', 'a3848a60-a292-491a-85eb-7f2824cf4e77', '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a', 'd2222222-2222-2222-2222-222222222222', 'e3333333-3333-3333-3333-333333333333', 'Повторить термины', 'Откройте файл с раздаткой и ответьте на вопросы по датчикам. Запишите в тетради определение ультразвука.', 'Средняя', 20, 'published')
on conflict do nothing;

-- Insert Call Scripts (3 scripts)
insert into public.call_scripts (id, organization_id, title, stage, content, checklist)
values
  ('c1111111-1111-1111-1111-111111111111', 'a3848a60-a292-491a-85eb-7f2824cf4e77', 'Первичный звонок', 'Знакомство', 'Приветствие: "Здравствуйте! Вы оставляли заявку на сайте школы робототехники. Меня зовут [Имя], я куратор академии."\n\nВыявление интереса: "Скажите, пожалуйста, сколько лет вашему ребенку? Увлекался ли он уже конструированием?"\n\nПрезентация: "У нас детская инженерная лаборатория. Уже на первом занятии ребенок соберет и запрограммирует своего первого колесного робота."\n\nЗакрытие на пробный: "В эту субботу в 12:00 у нас как раз будет проходить пробный урок. Записать вас?"', '["Поздороваться вежливо", "Узнать имя родителя и ребенка", "Спросить возраст ребенка", "Сделать упор на сборку робота на 1-м занятии", "Предложить конкретное время пробного"]'::jsonb),
  ('c2222222-2222-2222-2222-222222222222', 'a3848a60-a292-491a-85eb-7f2824cf4e77', 'Подтверждение пробного', 'Подтверждение', 'Приветствие: "Добрый день! Это [Имя] из инженерной школы Robotics."\n\nСуть: "Напоминаю, что вы записаны на пробное занятие завтра, в субботу в 12:00."\n\nДетали: "Мы находимся по адресу ул. Ленина, д. 10. С собой сменная обувь не требуется, мы выдаем бахилы. Приходите за 10 минут до начала, чтобы заполнить анкету."\n\nЗакрытие: "Подтверждаете ваше присутствие? Ждем вас!"', '["Упомянуть точное время", "Назвать точный адрес школы", "Напомнить прийти за 10 минут", "Получить твердое Да/Подтверждаю"]'::jsonb),
  ('c3333333-3333-3333-3333-333333333333', 'a3848a60-a292-491a-85eb-7f2824cf4e77', 'Дожим после пробного', 'Продажа', 'Приветствие: "Здравствуйте! Ваш ребенок вчера посетил наше занятие по зубчатым передачам. Расскажите, поделился ли впечатлениями?"\n\nПодведение к ценности: "Педагог отметил, что у него отличные способности к логике. Он сам собрал модель мельницы."\n\nПродажа абонемента: "Для тех, кто покупает абонемент в день пробного, у нас действует скидка 10% на первый месяц обучения. Стоимость будет 4050 руб вместо 4500 руб. Вы планируете заниматься по будням или выходным?"', '["Спросить отзывы ребенка", "Передать похвалу от педагога", "Озвучить спец-предложение/акцию", "Задать альтернативный вопрос о расписании"]'::jsonb)
on conflict do nothing;

-- Insert Objections (5 objections)
insert into public.objections (id, organization_id, title, category, recommended_answer, tags)
values
  ('f1111111-1111-1111-1111-111111111111', 'a3848a60-a292-491a-85eb-7f2824cf4e77', 'Дорого', 'Цена', '"Я вас понимаю. На первый взгляд секции кажутся дешевле. Но у нас не просто кружок сборки, а настоящая инженерная школа. В стоимость входят дорогие наборы LEGO Education, лицензионное ПО, профессиональные кураторы и личный кабинет родителя. Кроме того, ребенок унесет свои первые 4 игры и проекты уже в первый месяц. Согласитесь, инвестиции в техническое будущее окупятся? Плюс при покупке сегодня есть скидка 10%."', '{"цена", "скидки", "дорого"}'),
  ('f2222222-2222-2222-2222-222222222222', 'a3848a60-a292-491a-85eb-7f2824cf4e77', 'Далеко', 'Локация', '"Да, дорога может занимать время. Но у нас занимаются раз в неделю по выходным (сразу 90 минут), поэтому ездить каждый день не придется. Это отличная возможность провести время с пользой, а пока ребенок на занятии, вы можете отдохнуть в нашей зоне ожидания с чаем или сходить в ТЦ рядом. Многие родители объединяются и привозят детей по очереди."', '{"место", "дорога", "далеко"}'),
  ('f3333333-3333-3333-3333-333333333333', 'a3848a60-a292-491a-85eb-7f2824cf4e77', 'Надо подумать', 'Сомнение', '"Конечно, это важное решение. Скажите, пожалуйста, у вас остались сомнения по программе или расписанию? Давайте я помогу разобраться. Также напоминаю, что скидка 10% на абонемент и бронь места в группе сгорает завтра. Давайте забронируем место без оплаты на 24 часа?"', '{"сомнение", "подумать"}'),
  ('f4444444-4444-4444-4444-444444444444', 'a3848a60-a292-491a-85eb-7f2824cf4e77', 'Ребенок уже ходит в другой кружок', 'Конкуренты', '"Отлично, что ребенок активный! А куда вы ходите? Робототехника и программирование развивают системное алгоритмическое мышление, которое поможет ему и в спорте, и в языках. К тому же наши занятия проходят по выходным и отлично сочетаются с другими секциями. Приходите просто на пробный урок — это ни к чему не обязывает, но ребенок попробует новое направление."', '{"конкуренты", "спорт", "время"}'),
  ('f5555555-5555-5555-5555-555555555555', 'a3848a60-a292-491a-85eb-7f2824cf4e77', 'Неудобное время', 'Расписание', '"Понимаю вас, график у всех плотный. У нас есть несколько вариантов групп: утренние в 10:00, дневные в 13:00 и вечерние в 16:30. Также мы сейчас формируем новую группу на будний день в 18:30. Какое время вам было бы комфортно в идеале? Давайте мы запишем вас в лист ожидания на это время."', '{"время", "расписание", "график"}')
on conflict do nothing;
