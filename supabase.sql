-- Supabase SQL Editor에서 전체 내용을 실행하세요.
-- ADMIN_EMAIL을 관리자 본인의 로그인 이메일로 바꿔서 실행해야 합니다.
create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  summoner_name text not null check (char_length(summoner_name) between 1 and 40),
  tier text not null default '언랭크',
  role text not null check (role in ('탑','정글','미드','원딜','서폿')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

alter table public.players enable row level security;

-- 이 함수의 이메일을 관리자 계정 이메일로 교체하세요.
create or replace function public.is_summoners_admin()
returns boolean
language sql stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email','')) = lower('choux0427@gmail.com');
$$;

drop policy if exists "read approved or own or admin" on public.players;
create policy "read approved or own or admin"
on public.players for select to authenticated
using (status = 'approved' or user_id = auth.uid() or public.is_summoners_admin());

drop policy if exists "users submit own pending applications" on public.players;
create policy "users submit own pending applications"
on public.players for insert to authenticated
with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "admin update applications" on public.players;
create policy "admin update applications"
on public.players for update to authenticated
using (public.is_summoners_admin())
with check (public.is_summoners_admin());

drop policy if exists "admin delete applications" on public.players;
create policy "admin delete applications"
on public.players for delete to authenticated
using (public.is_summoners_admin());
