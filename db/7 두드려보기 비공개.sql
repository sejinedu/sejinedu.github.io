-- ============================================================
--  두드려 보기 — 비공개 글 · 게시글 비밀번호 · 단원 관리  (2026-09-23)
--  ★ 아무것도 남기지 않는다: 맨 끝에서 일부러 오류를 내서 통째로 되돌린다.
--    결과는 「오류」 칸에 나온다. 「통과 N / 실패 0」 이면 된 것이다.
--  ★ 6 비공개 글.sql 을 먼저 돌려야 한다.
-- ============================================================
do $$
declare
  A  uuid := gen_random_uuid();  -- 관리자
  T  uuid := gen_random_uuid();  -- 선생님 (비번 1234)
  T2 uuid := gen_random_uuid();  -- 다른 선생님 (비번 없음)
  M  uuid := gen_random_uuid();  -- 일반
  P  uuid; Q uuid; n int; j jsonb; v text; b boolean;
  결과 text := ''; 통과 int := 0; 실패 int := 0;
  yP text := 'PRIVATEvid1'; yQ text := 'PUBLICvid01';
  나 text;
begin
  insert into auth.users (id, aud, role, email) values
    (A,'authenticated','authenticated','비공개A@x.invalid'),
    (T,'authenticated','authenticated','비공개T@x.invalid'),
    (T2,'authenticated','authenticated','비공개T2@x.invalid'),
    (M,'authenticated','authenticated','비공개M@x.invalid');
  update public.site_members set role='admin'   where user_id = A;
  update public.site_members set role='teacher' where user_id in (T,T2);
  insert into public.site_units (id, name) values ('시험:비공개','시험 비공개 단원');

  -- ── 1. 선생님이 비번을 정한다 (1234)
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',T,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.site_set_pin('1234');
    execute 'select public.site_has_pin()' into b;
    execute 'reset role';
    if b then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 1 비번을 정했는데 없다고 한다'; end if;
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 1 선생님이 비번을 못 정한다: ' || sqlerrm; end;

  -- ── 2. 숫자 네 자리가 아니면 안 받는다
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',T,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.site_set_pin('12a4');
    execute 'reset role';
    실패 := 실패+1; 결과 := 결과 || E'\n✗ 2 「12a4」 를 비번으로 받았다';
  exception when others then 통과 := 통과+1; end;

  -- ── 3. 일반 회원은 비번을 못 정한다
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',M,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.site_set_pin('5555');
    execute 'reset role';
    실패 := 실패+1; 결과 := 결과 || E'\n✗ 3 일반 회원이 비번을 정했다';
  exception when others then 통과 := 통과+1; end;

  -- ── 4. 비번 없는 선생님은 비공개 글을 못 쓴다
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',T2,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    insert into public.site_posts (title, unit_id, youtube_id, is_private) values ('비번 없는 비공개','시험:비공개','NOPINvideo1', true);
    execute 'reset role';
    실패 := 실패+1; 결과 := 결과 || E'\n✗ 4 비번 없이 비공개 글이 올라갔다';
  exception when others then 통과 := 통과+1; end;

  -- ── 5. 비번 있는 선생님은 비공개 글을 쓴다 (P) · 공개 글도 (Q)
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',T,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    insert into public.site_posts (title, unit_id, youtube_id, body, is_private) values ('비공개 글','시험:비공개', yP, '비밀 본문', true);
    insert into public.site_posts (title, unit_id, youtube_id, body) values ('공개 글','시험:비공개', yQ, '공개 본문');
    execute 'reset role';
    통과 := 통과+1;
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 5 선생님이 글을 못 썼다: ' || sqlerrm; end;
  select id into P from public.site_posts where youtube_id = yP;
  select id into Q from public.site_posts where youtube_id = yQ;
  insert into public.site_captions (youtube_id, data, source) values (yP, '{"줄":[{"s":0,"e":1,"t":"비밀 자막"}]}', 'site');
  insert into public.site_comments (post_id, body, author) values (P, '비밀 댓글', M);

  -- ── 6~9. 손님이 읽는 창에서 비공개 글을 보면 영상 번호 · 본문이 비어 있다
  begin
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    execute 'set local role anon';
    execute 'select youtube_id from public.site_posts_view where id = $1' into v using P;
    if v is null then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 6 손님한테 비공개 영상 번호가 샜다'; end if;
    execute 'select body from public.site_posts_view where id = $1' into v using P;
    if v = '' then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 7 손님한테 비공개 본문이 샜다'; end if;
    execute 'select locked from public.site_posts_view where id = $1' into b using P;
    if b then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 8 손님한테 잠김 표시가 안 간다'; end if;
    execute 'select youtube_id from public.site_posts_view where id = $1' into v using Q;
    if v = yQ then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 9 공개 글 영상 번호가 안 보인다'; end if;
    execute 'reset role';
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 6~9 손님 읽기가 터졌다: ' || sqlerrm; end;

  -- ── 10~12. 손님은 잠긴 글의 자막 · 댓글 · 금고를 못 본다
  begin
    execute 'set local role anon';
    execute 'select count(*) from public.site_captions where youtube_id = $1' into n using yP;
    if n = 0 then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 10 손님한테 잠긴 영상 자막이 샜다'; end if;
    execute 'select count(*) from public.site_comments_view where post_id = $1' into n using P;
    if n = 0 then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 11 손님한테 잠긴 글 댓글이 샜다'; end if;
    execute 'reset role';
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 10~11 터졌다: ' || sqlerrm; end;
  begin
    execute 'set local role anon';
    execute 'select count(*) from public.site_pins' into n;
    execute 'reset role';
    실패 := 실패+1; 결과 := 결과 || E'\n✗ 12 손님이 비번 금고를 읽었다';
  exception when others then 통과 := 통과+1; end;

  -- ── 13. 로그인한 사람도 금고는 못 읽는다 (쓴 선생님 자신도)
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',T,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    execute 'select count(*) from public.site_pins' into n;
    execute 'reset role';
    실패 := 실패+1; 결과 := 결과 || E'\n✗ 13 선생님이 비번 금고를 읽었다';
  exception when others then 통과 := 통과+1; end;

  -- ── 14~16. 누가 비번 없이 보나 — 쓴 선생님 · 관리자는 보고, 일반 · 다른 선생님은 못 본다
  foreach 나 in array array['T','A','M','T2'] loop
    begin
      perform set_config('request.jwt.claims', json_build_object('sub',
        case 나 when 'T' then T when 'A' then A when 'M' then M else T2 end,'role','authenticated')::text, true);
      execute 'set local role authenticated';
      execute 'select locked from public.site_posts_view where id = $1' into b using P;
      execute 'reset role';
      if (나 in ('T','A') and not b) or (나 in ('M','T2') and b) then 통과 := 통과+1;
      else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 14 「' || 나 || '」 잠김이 거꾸로다'; end if;
    exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 14 「' || 나 || '」 터졌다: ' || sqlerrm; end;
  end loop;

  -- ── 18. 틀린 비번 → 안 열린다, 남은 횟수 4
  begin
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    execute 'set local role anon';
    execute 'select public.site_open_post($1, $2)::jsonb' into j using P, '0000';
    execute 'reset role';
    if (j->>'됐나')::boolean = false and (j->>'남은')::int = 4 and j->>'youtube_id' is null then 통과 := 통과+1;
    else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 18 틀린 비번 답이 이상하다: ' || j::text; end if;
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 18 터졌다: ' || sqlerrm; end;

  -- ── 19. 맞는 비번 → 영상 번호 · 본문 · 자막 · 댓글이 온다
  begin
    execute 'set local role anon';
    execute 'select public.site_open_post($1, $2)::jsonb' into j using P, '1234';
    execute 'reset role';
    if (j->>'됐나')::boolean and j->>'youtube_id' = yP and j->>'body' = '비밀 본문'
       and j->'captions' is not null and jsonb_array_length(j->'comments') = 1 then 통과 := 통과+1;
    else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 19 맞는 비번인데 안 열린다: ' || j::text; end if;
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 19 터졌다: ' || sqlerrm; end;

  -- ── 20. 다섯 번 틀리면 잠긴다 — 그 뒤엔 맞는 비번도 안 된다
  begin
    execute 'set local role anon';
    for n in 1..5 loop execute 'select public.site_open_post($1, $2)::jsonb' into j using P, '9999'; end loop;
    execute 'select public.site_open_post($1, $2)::jsonb' into j using P, '1234';
    execute 'reset role';
    if (j->>'됐나')::boolean = false and (j->>'잠김')::boolean then 통과 := 통과+1;
    else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 20 다섯 번 틀려도 안 잠긴다: ' || j::text; end if;
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 20 터졌다: ' || sqlerrm; end;

  -- ── 21. 공개 글은 비번 없이 열린다
  begin
    execute 'set local role anon';
    execute 'select public.site_open_post($1, null)::jsonb' into j using Q;
    execute 'reset role';
    if (j->>'됐나')::boolean and j->>'youtube_id' = yQ then 통과 := 통과+1;
    else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 21 공개 글이 안 열린다: ' || j::text; end if;
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 21 터졌다: ' || sqlerrm; end;

  -- ── 22. 댓글 수는 잠긴 글도 센다 (내용은 안 준다)
  begin
    execute 'set local role anon';
    execute 'select n from public.site_comment_counts() where post_id = $1' into n using P;
    execute 'reset role';
    if n = 1 then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 22 댓글 수가 틀렸다: ' || coalesce(n::text,'없음'); end if;
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 22 터졌다: ' || sqlerrm; end;

  -- ── 23. 일반 회원은 남의 글 공개/비공개를 못 바꾼다
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',M,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    execute 'update public.site_posts set is_private = false where id = $1' using P;
    execute 'reset role';
  exception when others then null; end;
  select is_private into b from public.site_posts where id = P;
  if b then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 23 일반 회원이 비공개를 풀었다'; end if;

  -- ── 24. 다른 선생님도 못 바꾼다
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',T2,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    execute 'update public.site_posts set is_private = true where id = $1' using Q;
    execute 'reset role';
  exception when others then null; end;
  select is_private into b from public.site_posts where id = Q;
  if not b then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 24 다른 선생님이 남의 글을 잠갔다'; end if;

  -- ── 25. 쓴 선생님은 제 글을 잠그고 푼다
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',T,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    execute 'update public.site_posts set is_private = true where id = $1' using Q;
    execute 'reset role';
  exception when others then 결과 := 결과 || E'\n  (25 오류: ' || sqlerrm || ')'; end;
  select is_private into b from public.site_posts where id = Q;
  if b then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 25 쓴 선생님이 제 글을 못 잠갔다'; end if;

  -- ── 26. 선생님은 단원을 못 만든다
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',T,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    insert into public.site_units (id, parent_id, name) values ('시험:선생님단원', '시험:비공개', '선생님이 만든 단원');
    execute 'reset role';
    실패 := 실패+1; 결과 := 결과 || E'\n✗ 26 선생님이 단원을 만들었다';
  exception when others then 통과 := 통과+1; end;

  -- ── 27~29. 관리자는 만들고 · 이름 바꾸고 · 빈 칸은 지운다
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',A,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    insert into public.site_units (id, parent_id, name, sort) values ('시험:새단원', '시험:비공개', '새 단원', 9);
    execute 'update public.site_units set name = $1 where id = $2' using '바꾼 이름', '시험:새단원';
    execute 'reset role';
    select name into v from public.site_units where id = '시험:새단원';
    if v = '바꾼 이름' then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 27 관리자가 이름을 못 바꿨다'; end if;
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 27 관리자가 단원을 못 만들었다: ' || sqlerrm; end;
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',A,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    execute 'delete from public.site_units where id = $1' using '시험:새단원';
    execute 'reset role';
    select count(*) into n from public.site_units where id = '시험:새단원';
    if n = 0 then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 28 빈 칸을 못 지웠다'; end if;
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 28 빈 칸 지우기가 터졌다: ' || sqlerrm; end;

  -- ── 29. 글이 있는 칸은 관리자도 못 지운다
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',A,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    execute 'delete from public.site_units where id = $1' using '시험:비공개';
    execute 'reset role';
    실패 := 실패+1; 결과 := 결과 || E'\n✗ 29 글이 있는 칸이 지워졌다';
  exception when others then 통과 := 통과+1; end;

  raise exception '통과 % / 실패 %', 통과, 실패 || 결과;
end $$;
