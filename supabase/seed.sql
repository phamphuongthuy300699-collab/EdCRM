-- Seed initial organization
insert into public.organizations (id, name, slug, city, timezone)
values (
  'a3848a60-a292-491a-85eb-7f2824cf4e77',
  'Робототехника Липецк',
  'robotics-lipetsk',
  'Липецк',
  'Europe/Moscow'
) on conflict (slug) do nothing;

-- Seed branches
insert into public.branches (id, organization_id, name, address, phone, is_active)
values (
  '120c1a93-8ef9-4eb5-8e7c-eb8ab57342fb',
  'a3848a60-a292-491a-85eb-7f2824cf4e77',
  'Основной',
  'ул. Ленина, д. 10',
  '+7 (999) 123-45-67',
  true
);

-- Seed rooms
insert into public.rooms (id, organization_id, branch_id, name, capacity)
values (
  'd0d82998-d102-411a-8742-1e967a57c1d3',
  'a3848a60-a292-491a-85eb-7f2824cf4e77',
  '120c1a93-8ef9-4eb5-8e7c-eb8ab57342fb',
  'Кабинет 101 (Лего-конструирование)',
  10
);

-- Seed courses
insert into public.courses (id, organization_id, title, slug, short_description, min_age, max_age, duration_minutes, price_monthly, is_public, sort_order)
values 
(
  '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a',
  'a3848a60-a292-491a-85eb-7f2824cf4e77',
  'Робототехника (Lego Education)',
  'robotics-lego',
  'Курс конструирования и программирования роботов для детей на базе Lego Education.',
  6,
  10,
  90,
  4500.00,
  true,
  10
),
(
  '1d0d97b0-cbe6-444a-a006-2c5e533ebbbd',
  'a3848a60-a292-491a-85eb-7f2824cf4e77',
  'Программирование на Scratch',
  'scratch',
  'Создание интерактивных историй, игр и анимации.',
  8,
  12,
  90,
  4000.00,
  true,
  20
)
)
on conflict (organization_id, slug) do nothing;

-- Update course title
update public.courses set title = 'LEGO Start' where id = '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a';

-- Seed modules
insert into public.course_modules (id, organization_id, course_id, title, description, sort_order, status)
values
  ('d1111111-1111-1111-1111-111111111111', 'a3848a60-a292-491a-85eb-7f2824cf4e77', '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a', 'Введение', 'Вводная часть, знакомство с деталями и простыми программами', 10, 'published'),
  ('d2222222-2222-2222-2222-222222222222', 'a3848a60-a292-491a-85eb-7f2824cf4e77', '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a', 'Простые механизмы', 'Изучение шестеренок, рычагов, датчиков и алгоритмов движения', 20, 'published')
on conflict (id) do nothing;

-- Seed lesson templates
insert into public.lesson_templates (id, organization_id, course_id, module_id, title, description, goals, plan, duration_minutes, teacher_notes, equipment, sort_order, status)
values
  ('e1111111-1111-1111-1111-111111111111', 'a3848a60-a292-491a-85eb-7f2824cf4e77', '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a', 'd1111111-1111-1111-1111-111111111111', 'Первое занятие', 'Сборка и знакомство с базовым набором деталей', 'Знакомство с деталями, сборка первой тележки', '1. Введение (10 мин)\n2. Конструирование (40 мин)\n3. Программирование (20 мин)\n4. Тест и уборка (20 мин)', 90, 'Проследить, чтобы все дети убрали детали в свои ячейки.', 'Базовый набор LEGO Education', 10, 'published'),
  ('e2222222-2222-2222-2222-222222222222', 'a3848a60-a292-491a-85eb-7f2824cf4e77', '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a', 'd1111111-1111-1111-1111-111111111111', 'Моторы', 'Подключение моторов, управление мощностью и направлением', 'Изучение работы сервомоторов, алгоритм движения вперед-назад', '1. Повторение (10 мин)\n2. Разбор теории моторов (15 мин)\n3. Сборка робота-тягача (40 мин)\n4. Написание кода и тест (25 мин)', 90, 'Помочь детям настроить правильные порты в приложении.', 'Конструктор LEGO, моторы', 20, 'published'),
  ('e3333333-3333-3333-3333-333333333333', 'a3848a60-a292-491a-85eb-7f2824cf4e77', '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a', 'd2222222-2222-2222-2222-222222222222', 'Датчики', 'Изучение датчиков расстояния и гироскопа', 'Работа с ультразвуковым датчиком, объезд препятствий', '1. Теория датчиков (20 мин)\n2. Сборка робота-обходчика (40 мин)\n3. Код с условием IF-ELSE (20 мин)\n4. Демонстрация (10 мин)', 90, 'Объяснить принцип эхолокации простыми словами.', 'LEGO Smart Hub, датчик расстояния', 30, 'published'),
  ('e4444444-4444-4444-4444-444444444444', 'a3848a60-a292-491a-85eb-7f2824cf4e77', '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a', 'd2222222-2222-2222-2222-222222222222', 'Зубчатые передачи', 'Изучение видов шестеренок и передаточного числа', 'Понимание повышающей и понижающей передач, сборка мельницы', '1. Разбор видов шестеренок (15 мин)\n2. Сборка передаточного стенда (45 мин)\n3. Эксперименты с весом (20 мин)\n4. Заключение (10 мин)', 90, 'Обратить внимание на соосность валов при сборке.', 'Набор LEGO, набор шестеренок разных диаметров', 40, 'published')
on conflict (id) do nothing;

-- Seed lesson materials
insert into public.lesson_materials (organization_id, lesson_template_id, title, type, visibility, file_url, external_url, content, sort_order)
values
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e1111111-1111-1111-1111-111111111111', 'План занятия: Знакомство с робототехникой', 'lesson_plan', 'teacher_only', null, 'https://docs.google.com/document/d/demo-plan-1', 'Конспект вводного занятия для преподавателя.', 10),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e1111111-1111-1111-1111-111111111111', 'Презентация: Введение в LEGO Start', 'presentation', 'teacher_only', null, 'https://docs.google.com/presentation/d/demo-pres-1', 'Слайды о правилах безопасности и роботах.', 20),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e1111111-1111-1111-1111-111111111111', 'Схема сборки: Первая тележка', 'build_scheme', 'student_visible', null, 'https://instructions.lego.com/demo-build-1', 'Инструкция по сборке трехколесной тележки.', 30),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e1111111-1111-1111-1111-111111111111', 'Код: Движение вперед-назад', 'code_listing', 'student_visible', null, null, '# LEGO EV3 / Spike Python Code\nfrom spike import PrimeHub, Motor\n\nhub = PrimeHub()\nmotor = Motor(''A'')\nmotor.run_for_seconds(2, speed=50)\nmotor.run_for_seconds(2, speed=-50)', 40),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e1111111-1111-1111-1111-111111111111', 'Раздаточный материал: Основы алгоритмов', 'student_handout', 'student_visible', null, 'https://files.robotics.ru/handouts/basics.pdf', 'Рабочий лист для соединения стрелочками алгоритма.', 50),

  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e2222222-2222-2222-2222-222222222222', 'План занятия: Подключение моторов', 'lesson_plan', 'teacher_only', null, 'https://docs.google.com/document/d/demo-plan-2', 'Конспект урока о моторах для учителя.', 10),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e2222222-2222-2222-2222-222222222222', 'Презентация: Виды моторов и мощность', 'presentation', 'teacher_only', null, 'https://docs.google.com/presentation/d/demo-pres-2', 'Теория о силе тока, редукторах и мощности.', 20),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e2222222-2222-2222-2222-222222222222', 'Схема сборки: Робот-тягач', 'build_scheme', 'student_visible', null, 'https://instructions.lego.com/demo-build-2', 'Пошаговая сборка мощного гусеничного тягача.', 30),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e2222222-2222-2222-2222-222222222222', 'Код: Синхронное вращение', 'code_listing', 'student_visible', null, null, '# Синхронный старт двух моторов\nfrom spike import MotorPair\n\npair = MotorPair(''A'', ''B'')\npair.move_tank(10, ''seconds'', left_speed=60, right_speed=60)', 40),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'e2222222-2222-2222-2222-222222222222', 'Рабочий лист: Мощность и скорость', 'student_handout', 'student_visible', null, 'https://files.robotics.ru/handouts/motors.pdf', 'Графики зависимости скорости от мощности.', 50)
on conflict do nothing;

-- Seed homework templates
insert into public.homework_templates (id, organization_id, course_id, module_id, lesson_template_id, title, description, difficulty, estimated_minutes, status)
values
  ('b1111111-1111-1111-1111-111111111111', 'a3848a60-a292-491a-85eb-7f2824cf4e77', '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a', 'd1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'Мини-проект дома', 'Нарисуйте схему своего придуманного робота на листе бумаги и придумайте 3 действия, которые он умеет делать.', 'Легкая', 30, 'published'),
  ('b2222222-2222-2222-2222-222222222222', 'a3848a60-a292-491a-85eb-7f2824cf4e77', '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a', 'd2222222-2222-2222-2222-222222222222', 'e3333333-3333-3333-3333-333333333333', 'Повторить термины', 'Откройте файл с раздаткой и ответьте на вопросы по датчикам. Запишите в тетради определение ультразвука.', 'Средняя', 20, 'published')
on conflict (id) do nothing;

-- Seed call scripts
insert into public.call_scripts (id, organization_id, title, stage, content, checklist)
values
  ('c1111111-1111-1111-1111-111111111111', 'a3848a60-a292-491a-85eb-7f2824cf4e77', 'Первичный звонок', 'Знакомство', 'Приветствие: "Здравствуйте! Вы оставляли заявку на сайте школы робототехники. Меня зовут [Имя], я куратор академии."\n\nВыявление интереса: "Скажите, пожалуйста, сколько лет вашему ребенку? Увлекался ли он уже конструированием?"\n\nПрезентация: "У нас детская инженерная лаборатория. Уже на первом занятии ребенок соберет и запрограммирует своего первого колесного робота."\n\nЗакрытие на пробный: "В эту субботу в 12:00 у нас как раз будет проходить пробный урок. Записать вас?"', '["Поздороваться вежливо", "Узнать имя родителя и ребенка", "Спросить возраст ребенка", "Сделать упор на сборку робота на 1-м занятии", "Предложить конкретное время пробного"]'::jsonb)
on conflict (id) do nothing;

-- Seed objections
insert into public.objections (id, organization_id, title, category, recommended_answer, tags)
values
  ('f1111111-1111-1111-1111-111111111111', 'a3848a60-a292-491a-85eb-7f2824cf4e77', 'Дорого', 'Цена', '"Я вас понимаю. На первый взгляд секции кажутся дешевле. Но у нас не просто кружок сборки, а настоящая инженерная школа. В стоимость входят дорогие наборы LEGO Education, лицензионное ПО, профессиональные кураторы и личный кабинет родителя. Кроме того, ребенок унесет свои первые 4 игры и проекты уже в первый месяц. Согласитесь, инвестиции в техническое будущее окупятся? Плюс при покупке сегодня есть скидка 10%."', '{"цена", "скидки", "дорого"}')
on conflict (id) do nothing;

