-- Jalankan di Supabase SQL Editor ketika siap menyalakan sinkronisasi cloud.
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.subgoals (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  name text not null,
  target numeric not null check (target > 0),
  current numeric not null default 0 check (current >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  name text not null,
  task_date date not null default current_date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- user_id boleh kosong agar catatan tetap bisa disimpan sebelum login diaktifkan di aplikasi.
-- Catatan: RLS sengaja TIDAK diaktifkan di sini, konsisten dengan tabel goals/daily_tasks/subgoals
-- yang saat ini juga "RLS disabled" di project ini. Aktifkan nanti bersamaan saat login ditambahkan.
drop table if exists public.log_entries cascade;
create table public.log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  text text not null,
  activity text,
  amount numeric,
  unit text,
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);
