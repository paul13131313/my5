-- ============================================================
-- MY5 — Supabase Schema (run in SQL Editor)
-- ============================================================

-- 1. profiles テーブル
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  handle      text unique not null
                check (handle ~ '^[a-zA-Z0-9_]{3,20}$'),
  display_name text not null default '',
  bio         text not null default '',
  is_public   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. favorites テーブル
create table public.favorites (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  slot      smallint not null check (slot between 1 and 5),
  category  text not null default '',
  title     text not null,
  note      text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slot)
);

-- 3. RLS 有効化
alter table public.profiles enable row level security;
alter table public.favorites enable row level security;

-- 4. profiles ポリシー
-- SELECT: 全員OK（MVPでは表示側で is_public を制御）
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

-- INSERT: 本人のみ（サインアップ直後に作成）
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- UPDATE: 本人のみ
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 5. favorites ポリシー
-- SELECT: 全員OK
create policy "favorites_select_all"
  on public.favorites for select
  using (true);

-- INSERT: 本人のみ
create policy "favorites_insert_own"
  on public.favorites for insert
  with check (auth.uid() = user_id);

-- UPDATE: 本人のみ
create policy "favorites_update_own"
  on public.favorites for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: 本人のみ
create policy "favorites_delete_own"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- 6. updated_at 自動更新トリガー
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger favorites_updated_at
  before update on public.favorites
  for each row execute function public.handle_updated_at();

-- 7. インデックス
create index favorites_user_id_slot on public.favorites(user_id, slot);
create index profiles_handle on public.profiles(handle);
