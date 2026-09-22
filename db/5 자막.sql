-- ============================================================
--  자막 — 저장소에 둔다  (2026-09-22 · 사용자가 정함)
--    「루트는 유튜브에서 홈피로, 영상 편집프로그램에서 홈피로 가는거다」
--
--  ★ 전에는 자막이 파일(자막/<영상>.js)이라 8777 에서 「올리기」 를 눌러야 사이트에 붙었다.
--    이제 영상편집 · 유튜브 가져오기가 여기에 바로 적는다. 적는 순간 모두에게 보인다.
--  ★ data 는 옛 파일의 window.자막모음[아이디] 와 **똑같은 모양**이다 —
--    { 아이디, 제목, 줄: [{ 시작, 끝, 글 }, …], … }  그래서 화면(js/자막.js)은 그대로 쓴다.
--  ★ 읽기는 누구나. 쓰기는 선생님 · 관리자만. 적은 사람(uid)은 밖에 안 보인다.
--  두 번 돌려도 안전하다.
-- ============================================================
create table if not exists public.site_captions (
  youtube_id text primary key check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  data       jsonb not null check (jsonb_typeof(data -> '줄') = 'array'),
  source     text not null default 'site' check (source in ('editor', 'youtube', 'factory', 'site')),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.site_captions enable row level security;
drop policy if exists "누구나 본다" on public.site_captions;
create policy "누구나 본다" on public.site_captions for select using (true);
drop policy if exists "선생님 이상이 쓴다" on public.site_captions;
create policy "선생님 이상이 쓴다" on public.site_captions for insert with check (public.site_can_post());
drop policy if exists "선생님 이상이 고친다" on public.site_captions;
create policy "선생님 이상이 고친다" on public.site_captions for update
  using (public.site_can_post()) with check (public.site_can_post());
drop policy if exists "관리자만 지운다" on public.site_captions;
create policy "관리자만 지운다" on public.site_captions for delete using (public.site_is_admin());

revoke all on public.site_captions from anon, authenticated;
grant select (youtube_id, data, source, updated_at) on public.site_captions to anon, authenticated;
grant insert (youtube_id, data, source), update (data, source, updated_at) on public.site_captions to authenticated;
grant delete on public.site_captions to authenticated;

-- 고친 때 · 고친 사람은 서버가 넣는다
create or replace function public.site_자막고친때() returns trigger
language plpgsql as $$ begin new.updated_at := now(); new.updated_by := auth.uid(); return new; end $$;
drop trigger if exists site_자막고친때 on public.site_captions;
create trigger site_자막고친때 before insert or update on public.site_captions
  for each row execute function public.site_자막고친때();

-- ---------- 두드려 보기 (남기지 않는다) ----------
do $$
declare A uuid := gen_random_uuid(); M uuid := gen_random_uuid(); 통과 int := 0; 실패 int := 0; 결과 text := ''; n int;
begin
  insert into auth.users (id, aud, role, email) values (A,'authenticated','authenticated','시험A@x.invalid'),(M,'authenticated','authenticated','시험M@x.invalid');
  update public.site_members set role='teacher' where user_id=A;
  -- 일반 회원은 못 쓴다
  begin perform set_config('request.jwt.claims', json_build_object('sub',M,'role','authenticated')::text, true); execute 'set local role authenticated';
    insert into public.site_captions (youtube_id, data) values ('AAAAAAAAAAA', '{"줄":[]}'); execute 'reset role'; 실패:=실패+1; 결과:=결과||' ✗일반이씀';
  exception when others then 통과:=통과+1; end;
  -- 손님은 못 쓴다
  begin execute 'set local role anon'; insert into public.site_captions (youtube_id, data) values ('AAAAAAAAAAA', '{"줄":[]}'); execute 'reset role'; 실패:=실패+1; 결과:=결과||' ✗손님이씀';
  exception when others then 통과:=통과+1; end;
  -- 선생님은 쓴다
  begin perform set_config('request.jwt.claims', json_build_object('sub',A,'role','authenticated')::text, true); execute 'set local role authenticated';
    insert into public.site_captions (youtube_id, data, source) values ('AAAAAAAAAAA', '{"줄":[{"시작":0,"끝":1,"글":"가"}]}', 'editor'); execute 'reset role'; 통과:=통과+1;
  exception when others then 실패:=실패+1; 결과:=결과||' ✗선생님이못씀:'||sqlerrm; end;
  -- 손님은 읽는다, 적은 사람은 못 본다
  begin execute 'set local role anon'; execute 'select count(*) from public.site_captions where youtube_id=''AAAAAAAAAAA''' into n; execute 'reset role';
    if n=1 then 통과:=통과+1; else 실패:=실패+1; 결과:=결과||' ✗손님이못읽음'; end if;
  exception when others then 실패:=실패+1; 결과:=결과||' ✗손님읽기:'||sqlerrm; end;
  begin execute 'set local role anon'; execute 'select count(updated_by) from public.site_captions' into n; execute 'reset role'; 실패:=실패+1; 결과:=결과||' ✗적은사람이보임';
  exception when others then 통과:=통과+1; end;
  raise exception '자막 두드려 보기 — 통과 % / 실패 % %', 통과, 실패, 결과;
end $$;
