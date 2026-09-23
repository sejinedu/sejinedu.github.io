-- ============================================================
--  두드려 보기 — 비번 본인에게 보이기 · 내 글 전체 비공개  (2026-09-23)
--  ★ 아무것도 남기지 않는다: 맨 끝에서 일부러 오류를 내서 통째로 되돌린다.
--    결과는 「오류」 칸에 나온다. 「통과 N / 실패 0」 이면 된 것이다.
--  ★ 8 비번 보이기·전체 비공개.sql 을 먼저 돌려야 한다.
-- ============================================================
do $$
declare
  T  uuid := gen_random_uuid();   -- 선생님 (비번 4321)
  T2 uuid := gen_random_uuid();   -- 다른 선생님 (나중에 1111)
  T3 uuid := gen_random_uuid();   -- 비번 없는 선생님
  M  uuid := gen_random_uuid();   -- 일반
  v text; n int; 결과 text := ''; 통과 int := 0; 실패 int := 0;
begin
  insert into auth.users (id, aud, role, email) values
    (T,'authenticated','authenticated','비번보기T@x.invalid'),
    (T2,'authenticated','authenticated','비번보기T2@x.invalid'),
    (T3,'authenticated','authenticated','비번보기T3@x.invalid'),
    (M,'authenticated','authenticated','비번보기M@x.invalid');
  update public.site_members set role='teacher' where user_id in (T,T2,T3);
  insert into public.site_units (id, name) values ('시험:비번보기','시험 단원');
  insert into public.site_posts (title, unit_id, youtube_id, author) values
    ('T 글 1','시험:비번보기','TTTTTTTTTT1', T), ('T 글 2','시험:비번보기','TTTTTTTTTT2', T),
    ('T2 글','시험:비번보기','TTTTTTTTTT3', T2);

  -- 1. 정한 비번이 본인에게 보인다
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',T,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.site_set_pin('4321');
    execute 'select public.site_my_pin()' into v;
    execute 'reset role';
    if v = '4321' then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 1 내 비번이 안 보인다: ' || coalesce(v,'없음'); end if;
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 1 터졌다: ' || sqlerrm; end;

  -- 2. 비번 없는 선생님은 빈칸
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',T2,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    execute 'select public.site_my_pin()' into v;
    execute 'reset role';
    if v is null then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 2 비번 없는데 뭔가 보인다: ' || v; end if;
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 2 터졌다: ' || sqlerrm; end;

  -- 3. 다른 선생님이 비번을 정해도 자기 것만 보인다 (남의 4321 은 안 보인다)
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',T2,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.site_set_pin('1111');
    execute 'select public.site_my_pin()' into v;
    execute 'reset role';
    if v = '1111' then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 3 남의 비번이 보인다: ' || coalesce(v,'없음'); end if;
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 3 터졌다: ' || sqlerrm; end;

  -- 4. 새로 넣으면 그걸로 바뀐다
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',T,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.site_set_pin('9876');
    execute 'select public.site_my_pin()' into v;
    execute 'reset role';
    if v = '9876' then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 4 새 비번으로 안 바뀌었다: ' || coalesce(v,'없음'); end if;
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 4 터졌다: ' || sqlerrm; end;

  -- 5. 손님은 비번 보기를 못 부른다
  begin
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    execute 'set local role anon';
    execute 'select public.site_my_pin()' into v;
    execute 'reset role';
    실패 := 실패+1; 결과 := 결과 || E'\n✗ 5 손님이 비번 보기를 불렀다';
  exception when others then 통과 := 통과+1; end;

  -- 6. 로그인해도 금고 표는 여전히 못 읽는다
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',T,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    execute 'select count(pin) from public.site_pins' into n;
    execute 'reset role';
    실패 := 실패+1; 결과 := 결과 || E'\n✗ 6 선생님이 금고 표를 읽었다';
  exception when others then 통과 := 통과+1; end;

  -- 7. 전체 비공개 — 내 글 둘만 바뀌고 남의 글은 그대로
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',T,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    execute 'select public.site_my_posts_private()' into n;
    execute 'reset role';
    if n = 2 and (select count(*) from public.site_posts where author = T and is_private) = 2
             and (select count(*) from public.site_posts where author = T2 and is_private) = 0
    then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 7 전체 비공개가 이상하다: 바꾼 수 ' || coalesce(n::text,'?'); end if;
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 7 터졌다: ' || sqlerrm; end;

  -- 8. 두 번 눌러도 안 망가진다 (바꿀 게 없으면 0)
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',T,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    execute 'select public.site_my_posts_private()' into n;
    execute 'reset role';
    if n = 0 then 통과 := 통과+1; else 실패 := 실패+1; 결과 := 결과 || E'\n✗ 8 두 번째에 ' || n || '편을 또 바꿨다'; end if;
  exception when others then 실패 := 실패+1; 결과 := 결과 || E'\n✗ 8 터졌다: ' || sqlerrm; end;

  -- 9. 비번 없는 선생님은 전체 비공개를 못 한다
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',T3,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    execute 'select public.site_my_posts_private()' into n;
    execute 'reset role';
    실패 := 실패+1; 결과 := 결과 || E'\n✗ 9 비번 없이 전체 비공개가 됐다';
  exception when others then 통과 := 통과+1; end;

  -- 10. 일반 회원은 못 한다
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',M,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    execute 'select public.site_my_posts_private()' into n;
    execute 'reset role';
    실패 := 실패+1; 결과 := 결과 || E'\n✗ 10 일반 회원이 전체 비공개를 불렀다';
  exception when others then 통과 := 통과+1; end;

  raise exception '통과 % / 실패 %', 통과, 실패 || 결과;
end $$;
