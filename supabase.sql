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

alter table public.goals enable row level security;
alter table public.daily_tasks enable row level security;
create policy "Users manage own goals" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own tasks" on public.daily_tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Subgoal access follows ownership of its parent goal.
alter table public.subgoals enable row level security;
create policy "Users manage own subgoals" on public.subgoals for all using (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid())) with check (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid()));
