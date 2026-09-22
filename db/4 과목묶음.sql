-- ============================================================
--  과목 → 세부 교과 → 단원  (2026-09-22 · 사용자가 정함)
--    「고등 과학, 고등 사회, 고등 수학, 고등 영어, 고등 국어, 이런식으로 세로 정렬로」
--    「과목하고 세부 과목 위치를 드래그 해서 관리자만 바꿀수 있게」
--  두 번 돌려도 안전하다.
-- ============================================================

-- 과목 다섯 (맨 위 층)
insert into public.site_units (id, parent_id, name, sort) values
  ('과목묶음:고등 과학', null, '고등 과학', 0),
  ('과목묶음:고등 사회', null, '고등 사회', 1),
  ('과목묶음:고등 수학', null, '고등 수학', 2),
  ('과목묶음:고등 영어', null, '고등 영어', 3),
  ('과목묶음:고등 국어', null, '고등 국어', 4)
on conflict (id) do nothing;

-- 옛 과목 넷은 이제 「고등 과학」 의 세부 교과다 (아직 맨 위에 있는 것만 옮긴다)
update public.site_units set parent_id = '과목묶음:고등 과학'
 where id in ('과목:통합과학1', '과목:통합과학2', '과목:물리학', '과목:역학과 에너지')
   and parent_id is null;

-- ---------- 순서 바꾸기 · 옮기기 — 관리자만 ----------
--  p_parent = null  → 과목 순서 (ids 는 전부 지금 맨 위 층이어야 한다)
--  p_parent = 과목  → 그 과목의 세부 교과 순서 (ids 는 전부 지금 세부 교과 층이어야 한다.
--                     다른 과목에 있던 교과가 섞여 있으면 이 과목으로 옮겨 온다)
--  ★ 층을 건너뛰는 옮기기는 막는다 — 과목을 교과 밑에 넣거나, 단원을 과목으로 올리는 일.
--    그러면 고리가 생기거나 트리가 뒤엉킨다.
create or replace function public.site_units_reorder(p_parent text, p_ids text[]) returns void
language plpgsql security definer set search_path = public as $$
declare 틀린것 int;
begin
  if not public.site_is_admin() then raise exception '관리자만 순서를 바꾼다'; end if;
  if p_ids is null or array_length(p_ids, 1) is null then return; end if;
  if (select count(distinct x) from unnest(p_ids) x) <> array_length(p_ids, 1) then
    raise exception '같은 것이 두 번 들어왔다'; end if;

  if p_parent is null then
    select count(*) into 틀린것 from unnest(p_ids) x
      left join public.site_units u on u.id = x
     where u.id is null or u.parent_id is not null;
    if 틀린것 > 0 then raise exception '과목 층이 아닌 것이 섞였다'; end if;
  else
    if not exists (select 1 from public.site_units where id = p_parent and parent_id is null) then
      raise exception '과목이 아닌 곳으로는 못 옮긴다'; end if;
    select count(*) into 틀린것 from unnest(p_ids) x
      left join public.site_units u on u.id = x
      left join public.site_units p on p.id = u.parent_id
     where u.id is null or u.parent_id is null or p.parent_id is not null;
    if 틀린것 > 0 then raise exception '세부 교과 층이 아닌 것이 섞였다'; end if;
  end if;

  update public.site_units u set parent_id = p_parent, sort = x.ord - 1
    from unnest(p_ids) with ordinality as x(id, ord)
   where u.id = x.id;
end $$;
revoke execute on function public.site_units_reorder(text, text[]) from public, anon;
grant  execute on function public.site_units_reorder(text, text[]) to authenticated;

select (select count(*) from public.site_units where parent_id is null) as 과목수,
       (select string_agg(name, ' · ' order by sort) from public.site_units where parent_id is null) as 과목,
       (select string_agg(name, ' · ' order by sort) from public.site_units where parent_id = '과목묶음:고등 과학') as 고등과학교과,
       (select count(*) from public.site_units) as 단원전체,
       (select count(*) from public.site_posts) as 글수;
