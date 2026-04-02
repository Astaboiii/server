create extension if not exists "pgcrypto";

create schema if not exists supabase_migrations;

create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  name text not null,
  checksum text,
  executed_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('subscriber', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  plan_id text,
  razorpay_plan_id text,
  razorpay_subscription_id text,
  razorpay_payment_id text,
  status text not null check (status in ('inactive', 'active', 'lapsed', 'cancelled')),
  cancel_at_period_end boolean not null default false,
  renewal_date timestamptz,
  started_at timestamptz,
  cancelled_at timestamptz
);

create table if not exists charities (
  id text primary key,
  name text not null,
  mission text not null,
  contribution_percentage numeric(5,2) not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists charity_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  charity_id text not null references charities(id) on delete restrict,
  contribution_percentage numeric(5,2) not null,
  extra_donation_amount numeric(10,2) not null default 0,
  updated_at timestamptz not null default now()
);

alter table charity_selections
  add column if not exists extra_donation_amount numeric(10,2) not null default 0,
  add column if not exists updated_at timestamptz not null default now();

insert into charities (id, name, mission, contribution_percentage)
values
  ('kids-education', 'Kids Education Fund', 'Investing in the next generation through coaching and school supplies.', 10),
  ('course-restoration', 'Course Restoration Trust', 'Preserving fairways and supporting eco-friendly course upgrades.', 10),
  ('golf-access', 'Golf Access Initiative', 'Helping underserved communities get access to the game.', 10)
on conflict (id) do nothing;

create table if not exists winnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  total_won numeric(10,2) not null default 0,
  payment_status text not null default 'No winnings yet',
  last_updated_at timestamptz not null default now()
);

create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  course_name text not null,
  gross_score integer not null check (gross_score between 1 and 45),
  played_at date not null,
  created_at timestamptz not null default now()
);

alter table scores
  add column if not exists gross_score integer not null default 1,
  add column if not exists played_at date not null default now(),
  add column if not exists created_at timestamptz not null default now();

alter table scores drop constraint if exists scores_gross_score_check;
alter table scores add constraint scores_gross_score_check check (gross_score between 1 and 45);

create index if not exists idx_scores_user_played_at on scores(user_id, played_at desc, created_at desc);

create table if not exists draws (
  id uuid primary key default gen_random_uuid(),
  period_key text not null unique,
  winning_numbers jsonb not null,
  draw_mode text not null default 'random',
  base_prize_pool numeric(10,2) not null default 0,
  jackpot_carryover_in numeric(10,2) not null default 0,
  jackpot_carryover_out numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table draws
  add column if not exists draw_mode text not null default 'random',
  add column if not exists base_prize_pool numeric(10,2) not null default 0,
  add column if not exists jackpot_carryover_in numeric(10,2) not null default 0,
  add column if not exists jackpot_carryover_out numeric(10,2) not null default 0,
  add column if not exists created_at timestamptz not null default now();

create table if not exists draw_results (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references draws(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  ticket_numbers jsonb not null,
  match_count integer not null check (match_count between 0 and 5),
  amount_won numeric(10,2) not null default 0
);

create index if not exists idx_draw_results_draw_id on draw_results(draw_id);
create index if not exists idx_draw_results_user_id on draw_results(user_id);

create table if not exists proof_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  original_file_name text not null,
  public_url text not null,
  status text not null check (status in ('Pending', 'Approved', 'Rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists idx_proof_submissions_user_id on proof_submissions(user_id);
create index if not exists idx_proof_submissions_status on proof_submissions(status);
