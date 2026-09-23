-- ============================================================
--  8. 게시글 비밀번호 — 본인에게 보이기 · 내 글 전체 비공개   (2026-09-23)
-- ============================================================
--
--  사용자가 정한 것:
--    「게시글 비밀 번호 다시 누르니 번호가 안보인다. 자신에게 보이게 하라.
--      그리고 새로 입력하면 그냥 그걸로 바뀌는 거다.」
--    「게시글 비밀번호 입력창 아래쪽에 전체 비공개 버튼 만들어 놔라. 누르면 자기꺼 다 비공개 되는거다.」
--
--  ★ 숫자를 **본인만** 볼 수 있게 금고에 같이 둔다. 금고 표는 여전히 아무도 못 읽는다 —
--    site_my_pin() 이 **제 줄 하나만** 꺼내 준다. 남의 비번은 관리자도 못 본다.
--  ★ 맞나 틀리나는 여전히 암호(pin_hash)로 가린다. 숫자 칸은 「보여 주기」 용이다.
--  ★ 6 비공개 글.sql 을 먼저 돌려야 한다. 여러 번 돌려도 안 망가진다.

alter table public.site_pins add column if not exists pin text;

-- 비번 정하기 — 숫자도 같이 둔다 (6 의 것을 바꿔 끼운다)
create or replace function public.site_set_pin(p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.site_can_post() then
    raise exception '선생님만 게시글 비밀번호를 정한다' using errcode = '42501';
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    raise exception '비밀번호는 숫자 네 자리다' using errcode = '22023';
  end if;
  insert into public.site_pins (user_id, pin_hash, pin)
       values (auth.uid(), extensions.crypt(p_pin, extensions.gen_salt('bf', 8)), p_pin)
  on conflict (user_id) do update set pin_hash = excluded.pin_hash, pin = excluded.pin, updated_at = now();
  delete from public.site_pin_tries where author = auth.uid();   -- 새 비번이면 잠금도 푼다
end $$;

-- 내 비번 숫자 — 제 것만. 예전 방식(암호만 있고 숫자가 없는) 비번이면 null
create or replace function public.site_my_pin() returns text
language sql stable security definer set search_path = public as $$
  select pin from public.site_pins where user_id = auth.uid()
$$;

-- 내 글 전체 비공개 — 바꾼 편수를 돌려준다
create or replace function public.site_my_posts_private() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.site_can_post() then
    raise exception '선생님만 한다' using errcode = '42501';
  end if;
  if not exists (select 1 from public.site_pins where user_id = auth.uid()) then
    raise exception '게시글 비밀번호를 먼저 정해라' using errcode = '22023';
  end if;
  update public.site_posts set is_private = true where author = auth.uid() and not is_private;
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.site_my_pin(), public.site_my_posts_private() from public, anon;
grant  execute on function public.site_my_pin(), public.site_my_posts_private() to authenticated;

select (select count(*) from public.site_pins)                   as 비번정한선생님,
       (select count(*) from public.site_pins where pin is null) as 숫자없는옛비번;
