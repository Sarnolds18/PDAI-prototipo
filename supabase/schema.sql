-- EmprendeRed · esquema de base de datos (Supabase / Postgres)
-- Ejecutar completo en Supabase → SQL Editor. Es idempotente: se puede volver a correr.
--
-- Seguridad: RLS activado en todas las tablas y SIN políticas para anon/authenticated.
-- Solo el servidor de Next.js (con la service role key) lee y escribe.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Participantes (emprendedores y evaluadores)
-- ---------------------------------------------------------------------------
create table if not exists participants (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,                 -- código de participante, ej. ER-7K3Q
  name        text not null,
  email       text not null,
  role        text not null check (role in ('emprendedor', 'evaluador')),
  consent     boolean not null default false,
  consent_at  timestamptz,
  is_test     boolean not null default false,        -- demo / pruebas internas: se excluye de la validación
  created_at  timestamptz not null default now()
);
create index if not exists participants_email_idx on participants (lower(email));

-- ---------------------------------------------------------------------------
-- Perfil validado (H6)
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references participants (id) on delete cascade,
  -- segmentación (feedback Hito 2: edad, etapa, rubro)
  age_range      text,
  region         text,
  industry       text,                                -- área / rubro del proyecto
  stage          text check (stage in ('idea', 'validacion', 'primeras_ventas')),
  seeking        text[] not null default '{}',        -- socio | mentor | inversion
  main_obstacle  text,                                -- evidencia nueva del problema
  -- competencias: [{ skill, level (1-3), evidence_type, evidence }]
  skills         jsonb not null default '[]',
  -- descripción estandarizada del proyecto
  project_name   text,
  problem        text,
  solution       text,
  customer       text,
  traction       text,
  -- medición
  started_at     timestamptz not null default now(),
  completed_at   timestamptz,
  duration_s     integer,
  completed      boolean not null default false,
  needed_help    boolean,
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Plantilla financiera guiada (H3)
-- ---------------------------------------------------------------------------
create table if not exists financial_models (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references participants (id) on delete cascade,
  inputs         jsonb not null default '{}',
  results        jsonb,                                -- VAN, TIR, PE, facturación años 1-3 por escenario
  started_at     timestamptz not null default now(),
  completed_at   timestamptz,
  duration_s     integer,
  completed      boolean not null default false,
  needed_help    boolean,
  help_opens     integer not null default 0,
  last_step      integer not null default 0,
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Eventos de uso: embudo por paso, ayudas abiertas, abandono
-- ---------------------------------------------------------------------------
create table if not exists events (
  id             bigint generated always as identity primary key,
  participant_id uuid references participants (id) on delete cascade,
  module         text not null check (module in ('perfil', 'finanzas', 'conexiones', 'evaluar', 'pacto')),
  type           text not null check (type in ('step_view', 'step_done', 'help_open', 'start', 'complete')),
  step           integer,
  payload        jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists events_participant_idx on events (participant_id, module);

-- ---------------------------------------------------------------------------
-- Red: socios, mentores e inversionistas (semilla con is_demo = true)
-- ---------------------------------------------------------------------------
create table if not exists network_profiles (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null check (kind in ('socio', 'mentor', 'inversionista')),
  name           text not null,
  headline       text not null,
  bio            text not null,
  region         text not null,
  industries     text[] not null default '{}',
  stages         text[] not null default '{}',
  skills         text[] not null default '{}',         -- competencias que aporta
  ticket_min     integer,                             -- CLP, solo inversionistas
  ticket_max     integer,
  is_demo        boolean not null default true,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Conexiones sugeridas y su calificación (H1)
-- ---------------------------------------------------------------------------
create table if not exists match_suggestions (
  id                 uuid primary key default gen_random_uuid(),
  participant_id     uuid not null references participants (id) on delete cascade,
  network_profile_id uuid not null references network_profiles (id) on delete cascade,
  kind               text not null,
  rank               integer not null,
  score              numeric not null,
  reasons            jsonb not null default '[]',
  rating             smallint check (rating between 1 and 5),
  rated_at           timestamptz,
  created_at         timestamptz not null default now(),
  unique (participant_id, network_profile_id)
);

create table if not exists platform_feedback (
  participant_id uuid primary key references participants (id) on delete cascade,
  would_use      boolean not null,
  wtp_monthly    text,                                -- disposición a pagar (tramo), opcional
  comment        text,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Test A/B de evaluadores (H2, H3-defendible, H5)
-- ---------------------------------------------------------------------------
create table if not exists evaluations (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references participants (id) on delete cascade,
  variant        text not null check (variant in ('A', 'B')),
  evaluator_type text,                                -- mentor | inversionista | ejecutivo | academico | otro
  meeting_score  smallint check (meeting_score between 1 and 5),
  meeting_yes    boolean,
  defensibility  smallint check (defensibility between 1 and 5),
  would_receive  boolean,
  comment        text,
  saw_other      boolean not null default false,
  preferred      text check (preferred in ('A', 'B')),
  preferred_why  text,
  started_at     timestamptz not null default now(),
  answered_at    timestamptz,
  completed_at   timestamptz
);

-- ---------------------------------------------------------------------------
-- Pacto de socios (H4)
-- ---------------------------------------------------------------------------
create table if not exists pacts (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references participants (id) on delete cascade,
  data           jsonb not null default '{}',
  started_at     timestamptz not null default now(),
  completed_at   timestamptz,
  duration_s     integer,
  completed      boolean not null default false,
  would_use      boolean,
  last_step      integer not null default 0,
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Bitácora de iteraciones (pauta Hito 3: "mejoras realizadas con base en la validación")
-- ---------------------------------------------------------------------------
create table if not exists iterations (
  id          uuid primary key default gen_random_uuid(),
  date        date not null default current_date,
  module      text not null,
  hypothesis  text,
  change      text not null,
  reason      text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Configuración editable desde /admin (n objetivo, n mínimo)
-- ---------------------------------------------------------------------------
create table if not exists settings (
  key   text primary key,
  value jsonb not null
);

-- ---------------------------------------------------------------------------
-- RLS: activado, sin políticas públicas
-- ---------------------------------------------------------------------------
alter table participants      enable row level security;
alter table profiles          enable row level security;
alter table financial_models  enable row level security;
alter table events            enable row level security;
alter table network_profiles  enable row level security;
alter table match_suggestions enable row level security;
alter table platform_feedback enable row level security;
alter table evaluations       enable row level security;
alter table pacts             enable row level security;
alter table iterations        enable row level security;
alter table settings          enable row level security;
