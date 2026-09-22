// ============================================================
//  저장소 자료 — 단원과 글을 새 저장소(세도비 Supabase)에서 받는다  (2026-09-22)
// ============================================================
//
//  ★ 이 판부터 **진짜는 저장소다.** js/단원.js · 자료/영상목록.js 는 비상용이다.
//    선생님이 사이트에서 올린 영상이 바로 모두에게 보이려면 이래야 한다.
//
//  ★★ 저장소를 못 부르면(인터넷·서버 탈) 조용히 옛 파일로 뜬다.
//     강의가 안 보이는 것보다 조금 옛 목록이라도 보이는 게 낫다 — 애들 보는 쪽은 멈추면 안 된다.
//     그때는 window.저장소가원본 이 false 로 남고, 올리기 단추도 안 뜬다.
//
//  ★ 여기서 받은 것을 옛 모양(첫단원나무 · 붙인영상묶음)으로 바꿔 끼운다.
//    그래서 나무.js · 영상창고.js · 앱.js 는 어디서 왔는지 몰라도 그대로 돈다.
//
//  ★ 읽기는 공개 창(site_units · site_posts_view)이라 로그인이 필요 없다.

window.저장소가원본 = false;
window.저장소준비 = (async () => {
  const 주소 = "https://burwsvkcaiqfiymdptex.supabase.co/rest/v1/";
  const 공개열쇠 = "sb_publishable_Yxaq9Rbth3NUmcREMwlbSg_qaXpoLVy";
  const 받기 = async 길 => {
    const ㄷ = await fetch(주소 + 길, { headers: { apikey: 공개열쇠 }, cache: "no-store" });
    if (!ㄷ.ok) throw new Error(길.split("?")[0] + " → " + ㄷ.status);
    return ㄷ.json();
  };
  const 시작 = Date.now();
  try {
    const [단원들, 글들] = await Promise.all([
      받기("site_units?select=id,parent_id,name,sort&order=sort.asc,created_at.asc"),
      받기("site_posts_view?select=id,unit_id,title,body,youtube_id,created_at,author_id,author_name&order=created_at.asc")
    ]);
    if (!Array.isArray(단원들) || !단원들.length) throw new Error("단원이 비어 왔다");
    // ★ 부트로더는 4초만 기다린다. 그 뒤에 온 답은 버린다 — 이미 옛 파일로 떴는데
    //   반쯤 바꿔 끼우면 목록과 나무가 서로 다른 데서 온 것이 된다.
    if (Date.now() - 시작 > 3800) throw new Error("너무 늦게 왔다");

    // 줄 목록 → 나무
    const 마디들 = new Map(단원들.map(ㄷ => [ㄷ.id, { 아이디: ㄷ.id, 이름: ㄷ.name }]));
    const 뿌리 = [];
    단원들.forEach(ㄷ => {
      const 나 = 마디들.get(ㄷ.id);
      const 위 = ㄷ.parent_id && 마디들.get(ㄷ.parent_id);
      if (위) (위.아래 = 위.아래 || []).push(나);
      else 뿌리.push(나);
    });

    window.첫단원나무 = 뿌리;
    window.붙인영상묶음 = {
      시각: Date.now(),
      목록: 글들.map(ㄱ => ({
        고유: ㄱ.id,               // 글 번호 — 지우기·댓글이 이걸로 찾는다
        단원아이디: ㄱ.unit_id || "",
        강사: ㄱ.author_name || "",
        제목: ㄱ.title || "",
        아이디: ㄱ.youtube_id || "",
        본문: ㄱ.body || "",
        글쓴이: ㄱ.author_id,
        올린때: ㄱ.created_at
      }))
    };
    window.저장소가원본 = true;
  } catch (오류) {
    console.warn("저장소를 못 불러 옛 파일로 뜬다 —", 오류.message);
  }
})();
