-- ============================================================
--  6. 비공개 글 · 선생님 게시글 비밀번호 · 단원 지우기 막기   (2026-09-23)
-- ============================================================
--
--  사용자가 정한 것:
--    「각 선생님은 자신의 게시글에 비밀번호를 부여할수 있게 하라 … 비번은 4글자다」
--    「글쓰기에서 비밀번호를 공개 비공개 여부를 선택할수 있게 하라」
--    「일반 회원들은 비공개된 게시글을 읽기 위해서는 비밀번호를 입력 해야 한다」
--    「관리자는 과목을 추가, 세부 과목 추가, 단원 추가 이런거 할수 있게 해라」
--    → 계획에 「추천대로」: 숫자 네 자리 · 손님도 비번만 맞으면 본다 · 글 없는 칸만 지운다
--
--  ★★★ 잠그는 자리는 화면이 아니라 여기다.
--    비공개 글의 영상 번호가 새면 유튜브 주소로 바로 본다. 그래서 읽는 창(site_posts_view)이
--    비공개 글의 영상 번호 · 본문을 **아예 안 내준다.** 댓글 · 자막도 같이 막는다.
--    비번이 맞을 때만 site_open_post 가 내준다.
--  ★ 쓴 선생님과 관리자는 비번 없이 본다.
--  ★ 비번은 암호(bcrypt)로만 둔다. 누구도 꺼내 볼 수 없다 — 금고 표에는 읽는 길이 없다.
--  ★ 네 자리는 기계로 두드리면 뚫린다 → 한 사람이 틀리기 5번이면 10분 잠금,
--    한 선생님 글에 한 시간 동안 틀린 게 100번이면 그 선생님 글 전체를 10분 잠근다.
--
--  한 번 돌리면 된다. 여러 번 돌려도 안 망가진다.

create extension if not exists pgcrypto with schema extensions;

-- ---------- 글에 공개/비공개 ----------
alter table public.site_posts add column if not exists is_private boolean not null default false;

-- ---------- 비번 금고 · 틀린 기록 — 읽는 길이 없다 ----------
create table if not exists public.site_pins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  pin_hash   text not null,
  updated_at timestamptz not null default now()
);
alter table public.site_pins enable row level security;
revoke all on public.site_pins from anon, authenticated;

create table if not exists public.site_pin_tries (
  author       uuid not null references auth.users(id) on delete cascade,
  who          text not null,
  fails        int  not null default 0,
  first_at     timestamptz not null default now(),
  locked_until timestamptz,
  primary key (author, who)
);
alter table public.site_pin_tries enable row level security;
revoke all on public.site_pin_tries from anon, authenticated;

-- ---------- 이 글을 비번 없이 봐도 되나 (쓴 사람 · 관리자) ----------
create or replace function public.site_글주인인가(p_author uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (auth.uid() = p_author or public.site_is_admin())
$$;

-- ---------- 읽는 창 — 비공개 글은 영상 번호 · 본문을 비운다 ----------
--  ★ 옛 칸 순서는 그대로 두고 끝에만 더한다 (create or replace view 규칙)
create or replace view public.site_posts_view as
  select p.id, p.unit_id, p.title,
         case when p.is_private and not public.site_글주인인가(p.author) then '' else p.body end as body,
         case when p.is_private and not public.site_글주인인가(p.author) then null else p.youtube_id end as youtube_id,
         p.created_at, p.updated_at,
         m.public_id as author_id, coalesce(m.nickname, '선생님') as author_name,
         p.is_private,
         (p.is_private and not public.site_글주인인가(p.author)) as locked
  from public.site_posts p left join public.site_members m on m.user_id = p.author;

-- 댓글도 잠긴 글 것은 안 보인다 (비번이 맞으면 site_open_post 가 같이 준다)
create or replace view public.site_comments_view as
  select c.id, c.post_id, c.body, c.created_at,
         m.public_id as author_id, coalesce(m.nickname, '회원') as author_name
  from public.site_comments c
  join public.site_posts p on p.id = c.post_id
  left join public.site_members m on m.user_id = c.author
  where not (p.is_private and not public.site_글주인인가(p.author));

revoke all on public.site_posts_view, public.site_comments_view from anon, authenticated;
grant select on public.site_posts_view, public.site_comments_view to anon, authenticated;

-- 게시판 [댓글 수] — 잠긴 글도 수는 보여 준다 (내용은 안 샌다)
create or replace function public.site_comment_counts() returns table (post_id uuid, n bigint)
language sql stable security definer set search_path = public as $$
  select c.post_id, count(*) from public.site_comments c group by c.post_id
$$;
revoke execute on function public.site_comment_counts() from public;
grant  execute on function public.site_comment_counts() to anon, authenticated;

-- ---------- 자막 — 잠긴 영상 것은 안 보인다 ----------
create or replace function public.site_영상잠김(p_yid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.site_posts p
                  where p.youtube_id = p_yid and p.is_private and not public.site_글주인인가(p.author))
     and not exists (select 1 from public.site_posts p where p.youtube_id = p_yid and not p.is_private)
$$;
drop policy if exists "누구나 본다" on public.site_captions;
drop policy if exists "잠긴 영상 것만 빼고 본다" on public.site_captions;
create policy "잠긴 영상 것만 빼고 본다" on public.site_captions for select
  using (not public.site_영상잠김(youtube_id));

-- ---------- 비번 없이 비공개로 못 돌린다 ----------
create or replace function public.site_비공개검사() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_private and not exists (select 1 from public.site_pins where user_id = new.author) then
    raise exception '게시글 비밀번호를 먼저 정해라' using errcode = '22023';
  end if;
  return new;
end $$;
drop trigger if exists site_비공개검사 on public.site_posts;
create trigger site_비공개검사 before insert or update of is_private on public.site_posts
  for each row execute function public.site_비공개검사();

-- ---------- 비번 정하기 (선생님 · 관리자) ----------
create or replace function public.site_set_pin(p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.site_can_post() then
    raise exception '선생님만 게시글 비밀번호를 정한다' using errcode = '42501';
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    raise exception '비밀번호는 숫자 네 자리다' using errcode = '22023';
  end if;
  insert into public.site_pins (user_id, pin_hash)
       values (auth.uid(), extensions.crypt(p_pin, extensions.gen_salt('bf', 8)))
  on conflict (user_id) do update set pin_hash = excluded.pin_hash, updated_at = now();
  delete from public.site_pin_tries where author = auth.uid();   -- 새 비번이면 잠금도 푼다
end $$;

create or replace function public.site_has_pin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.site_pins where user_id = auth.uid())
$$;

revoke execute on function public.site_set_pin(text), public.site_has_pin() from public, anon;
grant  execute on function public.site_set_pin(text), public.site_has_pin() to authenticated;

-- ---------- 비공개 글 열기 — 비번이 맞으면 영상 번호 · 본문 · 자막 · 댓글을 준다 ----------
--  ★ 틀려도 오류를 안 던진다. 던지면 틀린 기록까지 같이 되돌려져서 잠금이 안 걸린다.
create or replace function public.site_open_post(p_post uuid, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  r      public.site_posts%rowtype;
  h      text;
  머리   json;
  누구   text;
  t      public.site_pin_tries%rowtype;
  떼실패 int;
  새실패 int;
  있었나 boolean := false;
begin
  select * into r from public.site_posts where id = p_post;
  if not found then return json_build_object('됐나', false, '왜', '없는 글이다'); end if;

  if r.is_private and not public.site_글주인인가(r.author) then
    -- 누가 두드리나 — 로그인했으면 그 사람, 아니면 주소(IP)
    begin 머리 := current_setting('request.headers', true)::json; exception when others then 머리 := null; end;
    누구 := coalesce(auth.uid()::text,
                     nullif(머리->>'cf-connecting-ip', ''),
                     nullif(btrim(split_part(coalesce(머리->>'x-forwarded-for', ''), ',', 1)), ''),
                     nullif(머리->>'x-real-ip', ''),
                     '?');

    select * into t from public.site_pin_tries where author = r.author and who = 누구;
    있었나 := found;                 -- ★ 아래 select 가 found 를 덮는다. 여기서 잡아 둔다
    if 있었나 and t.locked_until is not null and t.locked_until > now() then
      return json_build_object('됐나', false, '잠김', true, '풀림', t.locked_until);
    end if;
    select coalesce(sum(x.fails), 0) into 떼실패 from public.site_pin_tries x
     where x.author = r.author and x.first_at > now() - interval '1 hour';
    if 떼실패 >= 100 then
      return json_build_object('됐나', false, '잠김', true, '풀림', now() + interval '10 minutes');
    end if;

    select pin_hash into h from public.site_pins where user_id = r.author;
    if h is null or p_pin is null or p_pin !~ '^[0-9]{4}$' or extensions.crypt(p_pin, h) <> h then
      if 있었나 and t.first_at > now() - interval '10 minutes' then 새실패 := t.fails + 1; else 새실패 := 1; end if;
      insert into public.site_pin_tries (author, who, fails, first_at, locked_until)
           values (r.author, 누구, 새실패, now(), case when 새실패 >= 5 then now() + interval '10 minutes' end)
      on conflict (author, who) do update set
           fails        = 새실패,
           first_at     = case when 새실패 = 1 then now() else public.site_pin_tries.first_at end,
           locked_until = case when 새실패 >= 5 then now() + interval '10 minutes' end;
      return json_build_object('됐나', false, '왜', '틀렸다', '남은', greatest(0, 5 - 새실패),
                               '잠김', 새실패 >= 5,
                               '풀림', case when 새실패 >= 5 then now() + interval '10 minutes' end);
    end if;
    delete from public.site_pin_tries where author = r.author and who = 누구;
  end if;

  return json_build_object(
    '됐나', true,
    'youtube_id', r.youtube_id,
    'body', r.body,
    'captions', (select c.data from public.site_captions c where c.youtube_id = r.youtube_id),
    'comments', (select coalesce(json_agg(json_build_object(
                          'id', c.id, 'body', c.body, 'created_at', c.created_at,
                          'author_id', m.public_id, 'author_name', coalesce(m.nickname, '회원'))
                        order by c.created_at), '[]'::json)
                   from public.site_comments c left join public.site_members m on m.user_id = c.author
                  where c.post_id = r.id)
  );
end $$;
revoke execute on function public.site_open_post(uuid, text) from public;
grant  execute on function public.site_open_post(uuid, text) to anon, authenticated;

-- ---------- 단원 지우기 — 글이 있는 칸은 못 지운다 ----------
--  ★ 글 표는 단원을 지우면 「갈 곳 없음」 으로 남는다(on delete set null). 조용히 고아가 된다.
--    그래서 글이 하나라도 있으면 여기서 막는다. 아래 칸이 있으면 원래부터 막힌다(restrict).
create or replace function public.site_단원지우기검사() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.site_posts where unit_id = old.id) then
    raise exception '이 칸에 글이 있다 — 글을 먼저 옮기거나 지워라' using errcode = '23503';
  end if;
  return old;
end $$;
drop trigger if exists site_단원지우기검사 on public.site_units;
create trigger site_단원지우기검사 before delete on public.site_units
  for each row execute function public.site_단원지우기검사();

-- 끝 — 한눈에
select (select count(*) from public.site_posts)                     as 글,
       (select count(*) from public.site_posts where is_private)    as 비공개,
       (select count(*) from public.site_pins)                      as 비번정한선생님;
