// ============================================================
//  본문 · 댓글 — 상세 화면 아래  (2026-09-22 · 사용자가 정함)
// ============================================================
//
//  사용자가 정한 것:
//    「댓글은 가입한 사람은 누구나 쓸수 있다」
//    「일반 회원은 영상 보고, 댓글, 자기가 쓴 댓글 지우기」
//    「관리자는 … 모든걸 지우기」
//
//  ★ 권한은 저장소가 막는다. 여기서 단추를 숨기는 건 보기 좋으라고다.
//  ★ 글(site_posts)은 글 번호로 찾는다(저장소에서 온 영상). 옛 파일로 뜬 날에는 유튜브 아이디로.
//    그 뒤에 8777 로 붙인 영상은 아직 글이 없다 — 그러면 댓글 칸만 조용히 안 뜬다.
//    (⑦단계에서 올리기를 새 저장소로 옮기면 없어진다)
//  ★ 남이 쓴 글은 반드시 textContent 로 넣는다. innerHTML 로 넣으면 댓글에 심은 글이 돈다.

const 댓글 = (() => {
  const 칸 = document.getElementById("댓글칸");
  const 본문칸 = document.getElementById("글본문");
  if (!칸 || !window.회원) return { 열기() {}, 닫기() {} };

  let 지금글 = null;        // { id, body }
  let 목록 = [];
  let 차례번호 = 0;         // 늦게 온 답이 새 화면을 덮지 않게

  const 만들기 = (태그, 이름, 글) => {
    const ㄱ = document.createElement(태그);
    if (이름) ㄱ.className = 이름;
    if (글 != null) ㄱ.textContent = 글;
    return ㄱ;
  };
  const 때글 = ㅅ => {
    const ㄷ = new Date(ㅅ);
    const 초 = (Date.now() - ㄷ) / 1000;
    if (초 < 60) return "방금";
    if (초 < 3600) return Math.floor(초 / 60) + "분 전";
    if (초 < 86400) return Math.floor(초 / 3600) + "시간 전";
    return ㄷ.getFullYear() + "." + String(ㄷ.getMonth() + 1).padStart(2, "0") + "." + String(ㄷ.getDate()).padStart(2, "0");
  };

  async function 열기(영상) {
    const 내차례 = ++차례번호;
    지금글 = null; 목록 = [];
    칸.hidden = true; 본문칸.hidden = true;
    const 아이디 = (영상 && 영상.아이디 || "").trim();
    if (!아이디) return;
    try {
      // ★ 저장소에서 온 영상이면 글 번호(고유)로 곧장 찾는다. 옛 파일에서 온 것이면 유튜브 아이디로.
      const 글번호 = /^[0-9a-f-]{36}$/.test(영상.고유 || "") ? 영상.고유 : "";
      const 글들 = await 회원.부르기("/rest/v1/site_posts_view?select=id,body,author_id,title&" +
        (글번호 ? "id=eq." + 글번호 : "youtube_id=eq." + encodeURIComponent(아이디) + "&order=created_at.asc&limit=1"));
      if (내차례 !== 차례번호) return;
      지금글 = (글들 && 글들[0]) || null;
      if (!지금글) return;                       // 아직 글이 없는 영상
      본문칸.textContent = 지금글.body || "";
      본문칸.hidden = !지금글.body;
      await 목록읽기(내차례);
    } catch (오류) {
      if (내차례 !== 차례번호) return;
      칸.hidden = false;
      칸.replaceChildren(만들기("p", "댓글말 탈", "댓글을 못 불러왔다 — " + 오류.message));
    }
  }

  async function 목록읽기(내차례 = 차례번호) {
    if (!지금글) return;
    const ㄹ = await 회원.부르기("/rest/v1/site_comments_view?select=id,body,created_at,author_id,author_name&post_id=eq." +
                               지금글.id + "&order=created_at.asc");
    if (내차례 !== 차례번호) return;
    목록 = Array.isArray(ㄹ) ? ㄹ : [];
    그리기();
  }

  function 그리기(말, 결) {
    if (!지금글) { 칸.hidden = true; return; }
    const ㅅ = 회원.상태();
    칸.hidden = false;
    칸.replaceChildren();

    // ★ 글 지우기 — 선생님은 제 글만, 관리자는 전부 (2026-09-22 · 사용자가 정함)
    const 내글 = ㅅ.이름표 && 지금글.author_id === ㅅ.이름표;
    if ((내글 && ㅅ.등급 === "teacher") || ㅅ.등급 === "admin") {
      const 줄 = 만들기("div", "글손질");
      const 지 = 만들기("button", "글지우기", "이 글 지우기");
      지.type = "button";
      지.addEventListener("click", () => 글지우기(내글));
      줄.appendChild(지);
      칸.appendChild(줄);
    }

    칸.appendChild(만들기("h2", "댓글머리", "댓글 " + 목록.length));

    // 쓰는 자리
    if (ㅅ.들어왔나) {
      const 틀 = 만들기("div", "댓글쓰기");
      const 칸글 = document.createElement("textarea");
      칸글.id = "댓글글"; 칸글.maxLength = 2000; 칸글.rows = 2;
      칸글.placeholder = (ㅅ.별명 || "회원") + " 이름으로 댓글을 단다";
      const 단 = 만들기("button", "댓글달기", "등록");
      단.type = "button";
      단.addEventListener("click", () => 달기(칸글, 단));
      칸글.addEventListener("keydown", ㄴ => {
        if (ㄴ.key === "Enter" && (ㄴ.ctrlKey || ㄴ.metaKey)) { ㄴ.preventDefault(); 달기(칸글, 단); }
      });
      틀.append(칸글, 단);
      칸.appendChild(틀);
    } else {
      const 틀 = 만들기("div", "댓글로그인");
      틀.appendChild(만들기("span", "", "로그인하면 댓글을 쓸 수 있다"));
      const 단 = 만들기("button", "댓글달기", "로그인");
      단.type = "button";
      단.addEventListener("click", () => document.getElementById("로그인단추").click());
      틀.appendChild(단);
      칸.appendChild(틀);
    }
    if (말) 칸.appendChild(만들기("p", "댓글말" + (결 ? " " + 결 : ""), 말));

    // 목록
    const 목 = 만들기("ul", "댓글목록");
    목록.forEach(ㄷ => {
      const 줄 = 만들기("li", "댓글줄");
      const 머리 = 만들기("div", "댓글줄머리");
      머리.appendChild(만들기("b", "댓글이름", ㄷ.author_name));
      머리.appendChild(만들기("span", "댓글때", 때글(ㄷ.created_at)));
      const 내것 = ㅅ.이름표 && ㄷ.author_id === ㅅ.이름표;
      if (내것 || ㅅ.등급 === "admin") {
        const 지 = 만들기("button", "댓글지우기", "지우기");
        지.type = "button";
        지.addEventListener("click", () => 지우기(ㄷ, 내것));
        머리.appendChild(지);
      }
      줄.appendChild(머리);
      줄.appendChild(만들기("p", "댓글글", ㄷ.body));
      목.appendChild(줄);
    });
    칸.appendChild(목);
  }

  async function 달기(칸글, 단) {
    const 글 = 칸글.value.trim();
    if (!글) { 칸글.focus(); return; }
    단.disabled = true;
    try {
      await 회원.부르기("/rest/v1/site_comments", {
        방법: "POST", 몸: { post_id: 지금글.id, body: 글 }, 머리: { Prefer: "return=minimal" }
      });
      await 목록읽기();
    } catch (오류) {
      그리기("못 달았다 — " + 오류.message, "탈");
    }
  }

  async function 지우기(ㄷ, 내것) {
    const 물음 = 내것 ? "이 댓글을 지울까?" : "「" + ㄷ.author_name + "」 의 댓글을 지울까? (관리자)";
    if (!confirm(물음)) return;
    try {
      await 회원.부르기("/rest/v1/site_comments?id=eq." + ㄷ.id, { 방법: "DELETE", 머리: { Prefer: "return=minimal" } });
      await 목록읽기();
      if (목록.some(ㄱ => ㄱ.id === ㄷ.id)) 그리기("못 지웠다 — 지울 권한이 없다", "탈");
    } catch (오류) {
      그리기("못 지웠다 — " + 오류.message, "탈");
    }
  }

  async function 글지우기(내글) {
    const 물음 = "「" + (지금글.title || "이 글") + "」 을 지울까?\n댓글도 같이 지워진다. 되돌릴 수 없다." +
                (내글 ? "" : "\n(관리자 — 남의 글이다)");
    if (!confirm(물음)) return;
    const 번호 = 지금글.id;
    try {
      await 회원.부르기("/rest/v1/site_posts?id=eq." + 번호, { 방법: "DELETE", 머리: { Prefer: "return=minimal" } });
      const 남은것 = await 회원.부르기("/rest/v1/site_posts_view?select=id&id=eq." + 번호);
      if (Array.isArray(남은것) && 남은것.length) { 그리기("못 지웠다 — 지울 권한이 없다", "탈"); return; }
      window.동영상목록 = (window.동영상목록 || []).filter(ㅇ => ㅇ.고유 !== 번호);
      try { 홈으로(); } catch (오류) { location.reload(); }
    } catch (오류) {
      그리기("못 지웠다 — " + 오류.message, "탈");
    }
  }

  function 닫기() {
    차례번호++;
    지금글 = null; 목록 = [];
    칸.hidden = true; 칸.replaceChildren();
    본문칸.hidden = true; 본문칸.textContent = "";
  }

  // 로그인하거나 나가면 쓰는 자리·지우기 단추를 다시 그린다
  회원.듣기(() => { if (지금글) 그리기(); });

  return { 열기, 닫기 };
})();
window.댓글 = 댓글;
