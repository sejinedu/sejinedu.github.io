-- ============================================================
--  세진 과학 커뮤니티 — 회원 등급 · 단원 · 글 · 댓글  (2026-09-22)
--  세도비 Supabase 에 얹는다. 기존 표와 안 섞이게 전부 site_ 머리.
--  두 번 돌려도 안전하다 (if not exists / or replace / drop policy if exists).
-- ============================================================
--
--  등급 (사용자가 정함)
--    member  : 보기 · 댓글 쓰기 · 내 댓글 지우기
--    teacher : 위 + 영상 글 올리기 · 내 글 고치기/지우기
--    admin   : 전부 — 남의 글·댓글 지우기, 단원 만들기, 등급 바꾸기
--
--  ★ 권한은 화면이 아니라 **여기서** 막는다. 화면은 보여 주기만 한다.
--  ★ 로그인 번호(auth uid)는 밖에 안 내보낸다 (조교: 알면 남의 런처 자리를 풀 수 있다).
--    남에게 보이는 이름표는 site_members.public_id 와 별명뿐이다.
--  ★ 읽기는 뷰(site_*_view)로만 연다. 표 자체는 anon 에게 안 열린다.

-- ---------- 회원 ----------
create table if not exists public.site_members (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  public_id  uuid not null unique default gen_random_uuid(),
  nickname   text check (nickname is null or char_length(btrim(nickname)) between 2 and 20),
  role       text not null default 'member' check (role in ('member','teacher','admin')),
  created_at timestamptz not null default now()
);
create unique index if not exists site_members_별명 on public.site_members (lower(btrim(nickname)))
  where nickname is not null;

-- 가입하면 저절로 일반 회원 줄이 생긴다
create or replace function public.site_새회원() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- ★ 여기서 탈이 나도 가입·로그인(런처 포함)은 절대 안 막는다
  begin
    insert into public.site_members (user_id) values (new.id) on conflict do nothing;
  exception when others then null;
  end;
  return new;
end $$;
drop trigger if exists site_새회원 on auth.users;
create trigger site_새회원 after insert on auth.users
  for each row execute function public.site_새회원();

-- 내 등급 (줄이 없으면 member)
create or replace function public.site_my_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.site_members where user_id = auth.uid()), 'member')
$$;
create or replace function public.site_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and public.site_my_role() = 'admin'
$$;
create or replace function public.site_can_post() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and public.site_my_role() in ('teacher','admin')
$$;

alter table public.site_members enable row level security;
drop policy if exists "내 줄 보기" on public.site_members;
create policy "내 줄 보기" on public.site_members for select
  using (user_id = auth.uid());
drop policy if exists "내 별명 고치기" on public.site_members;
create policy "내 별명 고치기" on public.site_members for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- ★ 등급은 스스로 못 고친다 — 고칠 수 있는 칸은 별명 하나뿐
revoke all on public.site_members from anon, authenticated;
grant select on public.site_members to authenticated;
grant update (nickname) on public.site_members to authenticated;

-- 등급 바꾸기 — 관리자만. 자기 등급은 못 바꾼다(마지막 관리자가 사라지는 사고 방지)
create or replace function public.site_set_role(p_public_id uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.site_is_admin() then raise exception '관리자만 등급을 바꿀 수 있다'; end if;
  if p_role not in ('member','teacher','admin') then raise exception '없는 등급: %', p_role; end if;
  if exists (select 1 from public.site_members where public_id = p_public_id and user_id = auth.uid())
    then raise exception '자기 등급은 못 바꾼다'; end if;
  update public.site_members set role = p_role where public_id = p_public_id;
  if not found then raise exception '그런 회원 없다'; end if;
end $$;

-- 관리자 명단 — 관리자만 메일이 보인다
create or replace function public.site_admin_members()
returns table (public_id uuid, nickname text, email text, role text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.site_is_admin() then raise exception '관리자만 본다'; end if;
  return query
    select m.public_id, m.nickname, u.email::text, m.role, m.created_at
    from public.site_members m join auth.users u on u.id = m.user_id
    order by m.created_at desc;
end $$;

-- ---------- 단원 (과목 → 대 → 중 → 소) ----------
create table if not exists public.site_units (
  id         text primary key,
  parent_id  text references public.site_units(id) on delete restrict,
  name       text not null check (char_length(btrim(name)) between 1 and 100),
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);
alter table public.site_units enable row level security;
drop policy if exists "누구나 본다" on public.site_units;
create policy "누구나 본다" on public.site_units for select using (true);
drop policy if exists "관리자만 쓴다" on public.site_units;
create policy "관리자만 쓴다" on public.site_units for all
  using (public.site_is_admin()) with check (public.site_is_admin());
revoke all on public.site_units from anon, authenticated;
grant select on public.site_units to anon, authenticated;
grant insert, update, delete on public.site_units to authenticated;

-- ---------- 글 ----------
create table if not exists public.site_posts (
  id         uuid primary key default gen_random_uuid(),
  unit_id    text references public.site_units(id) on delete set null,
  title      text not null check (char_length(btrim(title)) between 1 and 200),
  body       text not null default '' check (char_length(body) <= 20000),
  youtube_id text check (youtube_id is null or youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  author     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists site_posts_단원 on public.site_posts (unit_id, created_at desc);
alter table public.site_posts enable row level security;
drop policy if exists "선생님 이상이 쓴다" on public.site_posts;
create policy "선생님 이상이 쓴다" on public.site_posts for insert
  with check (public.site_can_post() and author = auth.uid());
drop policy if exists "제 글 고치기" on public.site_posts;
create policy "제 글 고치기" on public.site_posts for update
  using ((public.site_can_post() and author = auth.uid()) or public.site_is_admin())
  with check ((public.site_can_post() and author = auth.uid()) or public.site_is_admin());
drop policy if exists "제 글 지우기" on public.site_posts;
create policy "제 글 지우기" on public.site_posts for delete
  using ((public.site_can_post() and author = auth.uid()) or public.site_is_admin());
-- ★ select 정책이 없다 = 표로는 아무도 못 읽는다. 읽기는 아래 뷰로만.
revoke all on public.site_posts from anon, authenticated;
grant insert, update, delete on public.site_posts to authenticated;
grant select (id, author) on public.site_posts to authenticated;   -- update/delete 가 제 줄을 찾으려면 필요

-- ---------- 댓글 ----------
create table if not exists public.site_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.site_posts(id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 2000),
  author     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists site_comments_글 on public.site_comments (post_id, created_at);
alter table public.site_comments enable row level security;
drop policy if exists "가입자는 쓴다" on public.site_comments;
create policy "가입자는 쓴다" on public.site_comments for insert
  with check (auth.uid() is not null and author = auth.uid());
drop policy if exists "제 댓글 지우기" on public.site_comments;
create policy "제 댓글 지우기" on public.site_comments for delete
  using (author = auth.uid() or public.site_is_admin());
revoke all on public.site_comments from anon, authenticated;
grant insert, delete on public.site_comments to authenticated;
grant select (id, author) on public.site_comments to authenticated;

-- select (id, author) 를 줬으니 제 것만 보이게 막는다
drop policy if exists "제 줄만 찾기" on public.site_posts;
create policy "제 줄만 찾기" on public.site_posts for select
  using (author = auth.uid() or public.site_is_admin());
drop policy if exists "제 줄만 찾기" on public.site_comments;
create policy "제 줄만 찾기" on public.site_comments for select
  using (author = auth.uid() or public.site_is_admin());

-- 수정 시각은 서버가 넣는다
create or replace function public.site_고친때() returns trigger
language plpgsql as $$ begin new.updated_at := now(); new.author := old.author; return new; end $$;
drop trigger if exists site_고친때 on public.site_posts;
create trigger site_고친때 before update on public.site_posts
  for each row execute function public.site_고친때();

-- ---------- 읽는 창 (누구나) — 로그인 번호 대신 이름표만 ----------
create or replace view public.site_posts_view as
  select p.id, p.unit_id, p.title, p.body, p.youtube_id, p.created_at, p.updated_at,
         m.public_id as author_id, coalesce(m.nickname, '선생님') as author_name
  from public.site_posts p left join public.site_members m on m.user_id = p.author;

create or replace view public.site_comments_view as
  select c.id, c.post_id, c.body, c.created_at,
         m.public_id as author_id, coalesce(m.nickname, '회원') as author_name
  from public.site_comments c left join public.site_members m on m.user_id = c.author;

revoke all on public.site_posts_view, public.site_comments_view from anon, authenticated;
grant select on public.site_posts_view, public.site_comments_view to anon, authenticated;

-- 내 이름표 (화면이 「이건 내 글」 을 알려고)
create or replace function public.site_me()
returns table (public_id uuid, nickname text, role text)
language sql stable security definer set search_path = public as $$
  select m.public_id, m.nickname, public.site_my_role()
  from public.site_members m where m.user_id = auth.uid()
$$;

revoke execute on function public.site_set_role(uuid, text), public.site_admin_members() from public, anon;
grant  execute on function public.site_set_role(uuid, text), public.site_admin_members() to authenticated;
