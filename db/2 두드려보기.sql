-- ============================================================
--  두드려 보기 — 막혀야 할 것이 정말 막히나  (2026-09-22)
--  ★ 아무것도 남기지 않는다: 맨 끝에서 일부러 오류를 내서 통째로 되돌린다.
--    그래서 결과는 「오류」 칸에 나온다. 「통과 N / 실패 0」 이면 된 것이다.
--  가짜 회원 다섯(관리자·선생님 둘·일반 둘)은 이 안에서만 살다 사라진다.
-- ============================================================
do $$
declare
  A  uuid := gen_random_uuid();  -- 관리자
  T  uuid := gen_random_uuid();  -- 선생님
  T2 uuid := gen_random_uuid();  -- 다른 선생님
  M  uuid := gen_random_uuid();  -- 일반
  M2 uuid := gen_random_uuid();  -- 다른 일반
  글 uuid; 댓 uuid; n int; 결과 text := ''; 통과 int := 0; 실패 int := 0;
  pubM uuid; pubA uuid; 학생전체 int; 학생보임 int;

begin
  insert into auth.users (id, aud, role, email) values
    (A,'authenticated','authenticated','시험A@x.invalid'),
    (T,'authenticated','authenticated','시험T@x.invalid'),
    (T2,'authenticated','authenticated','시험T2@x.invalid'),
    (M,'authenticated','authenticated','시험M@x.invalid'),
    (M2,'authenticated','authenticated','시험M2@x.invalid');
  -- 가입 트리거가 일반 회원 줄을 만들었나
  select count(*) into n from public.site_members where user_id in (A,T,T2,M,M2);
  if n = 5 then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 가입해도 회원 줄이 안 생긴다'; end if;
  update public.site_members set role='admin'   where user_id = A;
  update public.site_members set role='teacher' where user_id in (T,T2);
  update public.site_members set nickname='시험일반' where user_id = M;
  select public_id into pubM from public.site_members where user_id = M;
  select public_id into pubA from public.site_members where user_id = A;
  insert into public.site_units (id, name) values ('시험단원','시험단원');
  begin select count(*) into 학생전체 from public.students; exception when others then 학생전체 := -1; end;

  -- ── 1. 손님(로그인 안 함)은 댓글을 못 쓴다
  begin
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    execute 'set local role anon';
    insert into public.site_comments (post_id, body, author) values (gen_random_uuid(), '손님', A);
    execute 'reset role';
    실패 := 실패+1; 결과 := 결과 || E'\n✗ 1 손님이 댓글을 썼다';
  exception when others then 통과 := 통과+1; end;

  -- ── 2. 손님은 회원 표를 못 읽는다
  begin
    execute 'set local role anon';
    execute 'select count(*) from public.site_members' into n;
    execute 'reset role';
    실패 := 실패+1; 결과 := 결과 || E'\n✗ 2 손님이 회원 표를 읽었다';
  exception when others then 통과 := 통과+1; end;

  -- ── 3. 손님도 글 목록(뷰)은 본다 — 가입 없이 보기
  begin
    execute 'set local role anon';
    execute 'select count(*) from public.site_posts_view' into n;
    execute 'reset role';
    통과 := 통과+1;
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 3 손님이 글 목록을 못 본다: ' || sqlerrm; end;

  -- ── 4. 일반 회원은 글을 못 올린다
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',M,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    insert into public.site_posts (title) values ('일반이 쓴 글');
    execute 'reset role';
    실패 := 실패+1; 결과 := 결과 || E'\n✗ 4 일반 회원이 글을 올렸다';
  exception when others then 통과 := 통과+1; end;

  -- ── 5. 일반 회원은 제 등급을 못 올린다 (표를 직접 고치기)
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',M,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    update public.site_members set role='admin' where user_id = M;
    execute 'reset role';
    실패 := 실패+1; 결과 := 결과 || E'\n✗ 5 일반 회원이 제 등급을 고쳤다';
  exception when others then 통과 := 통과+1; end;

  -- ── 6. 일반 회원은 등급 바꾸는 단추를 못 쓴다
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',M,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.site_set_role(pubM, 'admin');
    execute 'reset role';
    실패 := 실패+1; 결과 := 결과 || E'\n✗ 6 일반 회원이 등급을 바꿨다';
  exception when others then 통과 := 통과+1; end;

  -- ── 7. 일반 회원은 회원 명단(메일)을 못 본다
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',M,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    perform * from public.site_admin_members();
    execute 'reset role';
    실패 := 실패+1; 결과 := 결과 || E'\n✗ 7 일반 회원이 회원 명단을 봤다';
  exception when others then 통과 := 통과+1; end;

  -- ── 8. 일반·선생님은 단원을 못 만든다
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',T,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    insert into public.site_units (id, name) values ('선생님단원','x');
    execute 'reset role';
    실패 := 실패+1; 결과 := 결과 || E'\n✗ 8 선생님이 단원을 만들었다';
  exception when others then 통과 := 통과+1; end;

  -- ── 9. 선생님은 글을 올린다
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',T,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    insert into public.site_posts (title, unit_id, youtube_id) values ('선생님 글', '시험단원', 'SoGkPH5zsao');
    execute 'reset role';
    통과 := 통과+1;
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 9 선생님이 글을 못 올린다: ' || sqlerrm; end;
  select id into 글 from public.site_posts where author = T limit 1;

  -- ── 10. 다른 선생님은 남의 글을 못 지운다
  perform set_config('request.jwt.claims', json_build_object('sub',T2,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  delete from public.site_posts where id = 글; get diagnostics n = row_count;
  execute 'reset role';
  if n = 0 then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 10 선생님이 남의 글을 지웠다'; end if;

  -- ── 11. 일반 회원은 댓글을 쓴다
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',M,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    insert into public.site_comments (post_id, body) values (글, '일반 댓글');
    execute 'reset role';
    통과 := 통과+1;
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 11 일반 회원이 댓글을 못 쓴다: ' || sqlerrm; end;
  select id into 댓 from public.site_comments where author = M limit 1;

  -- ── 12. 남을 사칭해서 댓글을 못 쓴다 (author 를 관리자로)
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',M,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    insert into public.site_comments (post_id, body, author) values (글, '사칭', A);
    execute 'reset role';
    실패 := 실패+1; 결과 := 결과 || E'\n✗ 12 남의 이름으로 댓글을 썼다';
  exception when others then 통과 := 통과+1; end;

  -- ── 13. 다른 일반 회원·선생님은 남의 댓글을 못 지운다
  perform set_config('request.jwt.claims', json_build_object('sub',M2,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  delete from public.site_comments where id = 댓; get diagnostics n = row_count;
  execute 'reset role';
  if n = 0 then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 13 남의 댓글을 지웠다(일반)'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub',T,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  delete from public.site_comments where id = 댓; get diagnostics n = row_count;
  execute 'reset role';
  if n = 0 then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 13b 선생님이 남의 댓글을 지웠다'; end if;

  -- ── 14. 제 댓글은 지운다
  perform set_config('request.jwt.claims', json_build_object('sub',M,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  delete from public.site_comments where id = 댓; get diagnostics n = row_count;
  execute 'reset role';
  if n = 1 then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 14 제 댓글을 못 지운다'; end if;

  -- ── 15. 글쓴이를 남으로 바꿔치기 못 한다
  perform set_config('request.jwt.claims', json_build_object('sub',T,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  update public.site_posts set author = T2, title = '고친 제목' where id = 글;
  execute 'reset role';
  select count(*) into n from public.site_posts where id = 글 and author = T and title = '고친 제목';
  if n = 1 then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 15 제 글 고치기가 안 되거나 글쓴이가 바뀌었다'; end if;

  -- ── 16. 관리자는 남의 글을 지우고, 등급을 바꾸고, 제 등급은 못 바꾼다
  perform set_config('request.jwt.claims', json_build_object('sub',A,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  delete from public.site_posts where id = 글; get diagnostics n = row_count;
  execute 'reset role';
  if n = 1 then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 16 관리자가 남의 글을 못 지운다'; end if;
  begin
    execute 'set local role authenticated';
    perform public.site_set_role(pubM, 'teacher');
    execute 'reset role';
    통과 := 통과+1;
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 16b 관리자가 등급을 못 바꾼다: ' || sqlerrm; end;
  begin
    execute 'set local role authenticated';
    perform public.site_set_role(pubA, 'member');
    execute 'reset role';
    실패 := 실패+1; 결과 := 결과 || E'\n✗ 16c 관리자가 제 등급을 내렸다';
  exception when others then 통과 := 통과+1; end;

  -- ── 17. 보이는 글 목록에 로그인 번호(uid)가 없다
  select count(*) into n from information_schema.columns
   where table_schema='public' and table_name in ('site_posts_view','site_comments_view')
     and column_name in ('author','user_id');
  if n = 0 then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 17 글 목록에 로그인 번호가 보인다'; end if;

  -- ── 18. ★ 학생 계정으로 형 학생 명단이 0줄
  perform set_config('request.jwt.claims', json_build_object('sub',M,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin execute 'select count(*) from public.students' into 학생보임; exception when others then 학생보임 := 0; end;
  execute 'reset role';
  if 학생보임 = 0 then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 18 학생 계정에 학생 명단이 ' || 학생보임 || '줄 보인다'; end if;

  raise exception '두드려 보기 끝 — 통과 % / 실패 %  (학생 명단 전체 %줄 중 학생 계정에 보인 줄 %)%',
    통과, 실패, 학생전체, 학생보임, 결과;
end $$;
