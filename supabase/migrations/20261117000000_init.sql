-- «Помощник по ВКР»: схема базы данных.
-- На каждой таблице включён Row Level Security с политикой user_id = auth.uid():
-- пользователь видит и изменяет только свои строки.
-- Файлы ВКР в базе не хранятся — только метаданные и отметки.

-- 1. Профиль ВКР ----------------------------------------------------------
create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  full_name text not null default '',
  study_group text not null default '',
  record_book text not null default '',
  topic_ru text not null default '',
  topic_en text not null default '',
  supervisor_degree text not null default '',
  supervisor_name text not null default '',
  format text check (format in ('project', 'business', 'other')),
  organisation text not null default '',
  -- настройки шаблона, количество страниц, выбранные виды исследований
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Контрольные сроки: отметки и точные даты ------------------------------
create table public.deadline_states (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  stage_key text not null,
  done boolean not null default false,
  exact_date date,
  primary key (user_id, stage_key)
);

-- 3. План-график -----------------------------------------------------------
create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position integer not null default 0,
  title text not null default '',
  due_date date,
  actual_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meeting_date date,
  in_person boolean not null default true,
  summary text not null default '',
  created_at timestamptz not null default now()
);

-- 4. Чек-листы (структура, содержание, папка «Данные», сдача) ---------------
create table public.checklist_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  scope text not null,
  item_key text not null,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  note text not null default '',
  chapter_ref text not null default '',
  primary key (user_id, scope, item_key)
);

-- 5. Список литературы ------------------------------------------------------
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('monograph', 'article', 'legal', 'internet', 'report')),
  lang text check (lang in ('ru', 'foreign')),
  data jsonb not null default '{}'::jsonb,
  url_checked boolean not null default false,
  created_at timestamptz not null default now()
);

-- 6. Рисунки и таблицы ------------------------------------------------------
create table public.figures_tables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('figure', 'table')),
  position integer not null default 0,
  title text not null default '',
  units text not null default '',
  period text not null default '',
  common_unit boolean not null default false,
  text_number integer,
  created_at timestamptz not null default now()
);

-- 7. Допущения и риски ------------------------------------------------------
create table public.assumptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null default '',
  used_in text not null default '',
  basis text not null default '',
  data_type text not null default 'source' check (data_type in ('source', 'company', 'expert', 'own')),
  created_at timestamptz not null default now()
);

create table public.risks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null default '',
  probability text not null default '',
  impact text not null default '',
  response text not null default '',
  created_at timestamptz not null default now()
);

-- 8. Журнал использования ИИ ------------------------------------------------
create table public.ai_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  used_on date,
  model text not null default '',
  purpose text not null default '',
  created_at timestamptz not null default now()
);

-- 12. Подготовка к защите ---------------------------------------------------
create table public.defence_notes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criterion_key text not null,
  notes text not null default '',
  questions jsonb not null default '[]'::jsonb,
  primary key (user_id, criterion_key)
);

-- Индексы по владельцу ------------------------------------------------------
create index schedule_items_user_idx on public.schedule_items (user_id);
create index meetings_user_idx on public.meetings (user_id);
create index sources_user_idx on public.sources (user_id);
create index figures_tables_user_idx on public.figures_tables (user_id);
create index assumptions_user_idx on public.assumptions (user_id);
create index risks_user_idx on public.risks (user_id);
create index ai_log_user_idx on public.ai_log (user_id);

-- Row Level Security --------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'deadline_states', 'schedule_items', 'meetings', 'checklist_items',
    'sources', 'figures_tables', 'assumptions', 'risks', 'ai_log', 'defence_notes'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated '
      'using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || '_owner', t
    );
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end
$$;
