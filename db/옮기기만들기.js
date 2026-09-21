// ============================================================
//  옛 자료 → 새 게시판  (2026-09-22)
//  js/단원.js 의 단원 나무와 자료/영상목록.js 의 영상을 읽어
//  「3 옮기기.sql」 을 만든다. 그 SQL 을 Supabase 에서 한 번 돌리면 된다.
//  ★ 원본 파일은 건드리지 않는다. 두 번 돌려도 겹치지 않는다.
//
//  쓰는 법:  node db/옮기기만들기.js
// ============================================================
const fs = require("fs");
const path = require("path");
const 집 = path.join(__dirname, "..");

global.window = {};
require(path.join(집, "js", "단원.js"));
require(path.join(집, "자료", "영상목록.js"));

const 글자 = (ㄱ) => ㄱ == null ? "null" : "'" + String(ㄱ).replace(/'/g, "''") + "'";

// 단원 — 부모가 먼저 들어가야 하니 위에서부터 차례로
//  ★ 옛 나무에 아이디가 겹친 단원이 있다 (2026-09-22 재 봄: 「위성 에너지」·「관성력」 둘 다
//    u1786375636778387). 그대로 넣으면 뒤엣것이 앞엣것을 덮어 하나가 사라진다.
//    ⇒ 두 번째부터는 「~2」 를 붙여 따로 산다.
const 단원줄 = [];
const 본아이디 = new Map();
(function 걷기(가지, 부모) {
  가지.forEach((ㄴ, ㅅ) => {
    let 아이디 = ㄴ.아이디;
    const 몇번째 = (본아이디.get(ㄴ.아이디) || 0) + 1;
    본아이디.set(ㄴ.아이디, 몇번째);
    if (몇번째 > 1) {
      아이디 = `${ㄴ.아이디}~${몇번째}`;
      console.log(`  겹친 아이디 ${ㄴ.아이디} → ${아이디} (${ㄴ.이름})`);
    }
    단원줄.push(`(${글자(아이디)}, ${글자(부모)}, ${글자(ㄴ.이름)}, ${ㅅ})`);
    if (ㄴ.아래) 걷기(ㄴ.아래, 아이디);
  });
})(window.첫단원나무, null);

// 제목 앞의 날짜를 올린 날로 쓴다 — 「2026년 7월 16일 …」 이나 「2026 7/21 …」
function 날짜(제목, 순번) {
  let ㅁ = 제목.match(/^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/) || 제목.match(/^(\d{4})\s+(\d{1,2})\/(\d{1,2})/);
  if (!ㅁ) return "now()";
  const [, 년, 월, 일] = ㅁ;
  // 같은 날 올린 것끼리는 목록 차례를 지키려고 초를 조금씩 더한다
  return `'${년}-${월.padStart(2, "0")}-${일.padStart(2, "0")} 12:00:00+09'::timestamptz + interval '${순번} seconds'`;
}

const 영상 = window.붙인영상묶음.목록;
const 글줄 = 영상.map((ㅂ, ㅅ) =>
  `  (${글자(ㅂ.단원아이디)}, ${글자(ㅂ.제목)}, ${글자(ㅂ.아이디)}, ${날짜(ㅂ.제목, ㅅ)})`);

const sql = `-- ============================================================
--  옛 자료 옮기기 — 옮기기만들기.js 가 만든다. 손으로 고치지 마라.
--  단원 ${단원줄.length}개 · 글 ${영상.length}개. 글쓴이는 관리자(김세진).
--  두 번 돌려도 안전하다: 단원은 덮어쓰고, 글은 같은 영상이 있으면 건너뛴다.
-- ============================================================
insert into public.site_units (id, parent_id, name, sort) values
${단원줄.join(",\n")}
on conflict (id) do update set parent_id = excluded.parent_id, name = excluded.name, sort = excluded.sort;

insert into public.site_posts (unit_id, title, youtube_id, created_at, updated_at, author)
select v.unit_id, v.title, v.youtube_id, v.at, v.at,
       (select user_id from public.site_members where role = 'admin' order by created_at limit 1)
from (values
${글줄.join(",\n")}
) as v(unit_id, title, youtube_id, at)
where not exists (select 1 from public.site_posts p where p.youtube_id = v.youtube_id);

select (select count(*) from public.site_units) as 단원수,
       (select count(*) from public.site_posts)  as 글수,
       (select count(*) from public.site_posts where unit_id is null) as 단원빈글,
       (select count(*) from public.site_posts_view where author_name = '김세진') as 김세진글;
`;
fs.writeFileSync(path.join(__dirname, "3 옮기기.sql"), sql, "utf8");
console.log(`단원 ${단원줄.length} · 글 ${영상.length} → db/3 옮기기.sql`);
