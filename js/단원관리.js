// ============================================================
//  과목 · 세부 과목 · 단원 추가 — 관리자만  (2026-09-23 · 사용자가 정함)
// ============================================================
//
//  사용자가 정한 것:
//    「야 이제 관리자는 과목을 추가, 세부 과목 추가, 단원 추가 이런거 할수 있게 해라」
//    → 계획에 「추천대로」: 이름 바꾸기는 우클릭 · 지우기는 글이 하나도 없는 칸만
//
//  ★ 어디에 붙나
//    과목 줄 끝        「＋」                       → 새 과목
//    세부 과목 탭 끝    「＋」                       → 고른 과목 밑에 새 세부 과목
//    단원 드롭바 맨 끝  「＋ 단원 추가…」             → 지금 고른 단원(없으면 세부 과목) 밑에 새 단원
//    탭 · 과목 우클릭   이름 바꾸기 · 지우기
//    단원 드롭바 우클릭  지금 고른 단원의 이름 바꾸기 · 지우기
//  ★ 권한은 저장소가 막는다 — site_units 는 「관리자만 쓴다」 (db/1),
//    글이 있는 칸은 못 지운다 (db/6 site_단원지우기검사). 화면은 단추만 숨긴다.
//  ★ 앱.js 는 안 고친다. 그리는 함수 셋(과목메뉴그리기 · 교과띠그리기 · 길줄만들기)을
//    감싸서, 그린 뒤에 관리자 단추만 덧붙인다. 관리자가 아니면 아무것도 안 붙는다.

(() => {
  if (!window.회원 || typeof 나무 === "undefined") return;
  const 관리자인가 = () => !!window.저장소가원본 && 회원.상태().등급 === "admin";
  const 새아이디 = 앞 => 앞 + ":" + (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));
  const 알림 = 글 => { try { 쪽지(글); } catch (오류) {} };

  function 다시그리기() {
    try { 과목메뉴그리기(); } catch (오류) {}
    try { 격자그리기(); } catch (오류) {}
  }

  // ---------- 저장소에 쓰기 ----------
  async function 추가(부모아이디, 무엇) {
    if (!관리자인가()) return;
    const 부모 = 부모아이디 ? 나무.찾기(부모아이디) : null;
    const 이름 = await 물음창({
      제목: 무엇 + " 추가",
      설명: 부모 ? "「" + 부모.마디.이름 + "」 밑에 새 " + 무엇 + "을 만든다." : "맨 위 과목 줄에 새 과목을 만든다.",
      칸이름: 무엇 + " 이름", 자리글: 무엇 === "과목" ? "예) 중등 과학" : 무엇 === "세부 과목" ? "예) 물리학Ⅰ" : "예) 1. 힘과 운동",
      하기글: "만들기",
      넣으면: async 이름 => {
        const 형제 = 부모 ? (부모.마디.아래 || []) : 나무.목록;
        if (형제.some(ㅁ => ㅁ.이름 === 이름)) return { 됐나: false, 말: "같은 이름이 벌써 있다" };
        const 아이디 = 새아이디(부모 ? "단원" : "과목");
        await 회원.부르기("/rest/v1/site_units", {
          방법: "POST", 몸: { id: 아이디, parent_id: 부모아이디 || null, name: 이름, sort: 형제.length },
          머리: { Prefer: "return=minimal" }
        });
        나무.더하기(부모아이디 || null, 이름, 아이디);
        return { 됐나: true, 값: 아이디 };
      }
    });
    if (!이름) return;
    const 아이디 = 이름;                              // 넣으면() 이 새 아이디를 값으로 돌려준다
    알림(무엇 + " 을 만들었다");
    // 만든 곳으로 데려간다 — 안 그러면 어디 생겼는지 모른다
    try {
      if (무엇 === "과목") 과목고르기(아이디);
      else if (무엇 === "세부 과목") 교과고르기(아이디);
      else { 고른아이디 = 아이디; 다시그리기(); 상태밀기(); }
    } catch (오류) { 다시그리기(); }
  }

  async function 이름바꾸기(아이디) {
    if (!관리자인가()) return;
    const ㅊ = 나무.찾기(아이디);
    if (!ㅊ) return;
    const 됨 = await 물음창({
      제목: "이름 바꾸기", 설명: "「" + ㅊ.마디.이름 + "」 의 새 이름", 칸이름: "새 이름", 값: ㅊ.마디.이름, 하기글: "바꾸기",
      넣으면: async 이름 => {
        if (이름 === ㅊ.마디.이름) return { 됐나: true };
        await 회원.부르기("/rest/v1/site_units?id=eq." + encodeURIComponent(아이디), {
          방법: "PATCH", 몸: { name: 이름 }, 머리: { Prefer: "return=minimal" }
        });
        나무.이름바꾸기(아이디, 이름);
        return { 됐나: true };
      }
    });
    if (됨 !== null) { 다시그리기(); 알림("이름을 바꿨다"); }
  }

  async function 지우기(아이디) {
    if (!관리자인가()) return;
    const ㅊ = 나무.찾기(아이디);
    if (!ㅊ) return;
    // ★ 글이 있는 칸 · 아래 칸이 있는 칸은 못 지운다. 먼저 재서 왜 안 되는지 말해 준다.
    const 딸린 = new Set(나무.아래아이디들(ㅊ.마디));
    const 글수 = (window.동영상목록 || []).filter(ㅇ => 딸린.has(ㅇ.단원아이디)).length;
    const 아래수 = (ㅊ.마디.아래 || []).length;
    if (글수) { alert("「" + ㅊ.마디.이름 + "」 에 글이 " + 글수 + "개 있다.\n글이 있는 칸은 못 지운다 — 글을 먼저 다른 데로 옮기거나 지워라."); return; }
    if (아래수) { alert("「" + ㅊ.마디.이름 + "」 밑에 칸이 " + 아래수 + "개 있다.\n아래 칸부터 지워라."); return; }
    if (!confirm("「" + ㅊ.마디.이름 + "」 을 지울까?\n비어 있는 칸이다. 되돌릴 수 없다.")) return;
    try {
      await 회원.부르기("/rest/v1/site_units?id=eq." + encodeURIComponent(아이디), { 방법: "DELETE", 머리: { Prefer: "return=minimal" } });
      const 남은것 = await 회원.부르기("/rest/v1/site_units?select=id&id=eq." + encodeURIComponent(아이디));
      if (Array.isArray(남은것) && 남은것.length) { alert("못 지웠다 — 지울 권한이 없다"); return; }
    } catch (오류) { alert("못 지웠다 — " + 오류.message); return; }
    나무.지우기(아이디);
    // 지운 칸 안에 서 있었으면 한 층 위로 나온다
    try {
      if (경로.includes(아이디)) {
        const 위 = ㅊ.부모 ? ㅊ.부모.아이디 : null;
        if (!위) 홈으로();
        else if (!나무.찾기(위).부모) 과목고르기(위);
        else 교과고르기(위);
      } else if (고른아이디 === 아이디) { 고른아이디 = ㅊ.부모 ? ㅊ.부모.아이디 : null; 다시그리기(); }
      else 다시그리기();
    } catch (오류) { 다시그리기(); }
    알림("지웠다");
  }

  function 우클릭메뉴(아이디, x, y) {
    const ㅊ = 나무.찾기(아이디);
    if (!ㅊ) return;
    메뉴띄우기(ㅊ.마디.이름, [
      ["이름 바꾸기", "", () => 이름바꾸기(아이디)],
      ["지우기", "빨강", () => 지우기(아이디)]
    ], x, y);
  }

  // ---------- 「＋」 단추 ----------
  function 더하기단추(글, 누르면, 설명) {
    const ㄷ = document.createElement("button");
    ㄷ.type = "button";
    ㄷ.className = "메뉴칸 추가칸";
    ㄷ.textContent = 글;
    ㄷ.title = 설명;
    ㄷ.setAttribute("aria-label", 설명);
    ㄷ.addEventListener("click", ㄴ => { ㄴ.preventDefault(); ㄴ.stopPropagation(); 누르면(); });
    return ㄷ;
  }

  // ① 과목 줄
  const 원래과목메뉴 = window.과목메뉴그리기;
  if (typeof 원래과목메뉴 === "function") {
    window.과목메뉴그리기 = function () {
      const ㄹ = 원래과목메뉴.apply(this, arguments);
      if (관리자인가()) ["머리과목", "과목띠"].forEach(자리 => {
        const 칸 = document.getElementById(자리);
        if (칸 && !칸.querySelector(".추가칸")) 칸.appendChild(더하기단추("＋", () => 추가(null, "과목"), "과목 추가"));
      });
      return ㄹ;
    };
  }

  // ② 세부 과목 탭 (홈 화면의 강사 탭에는 안 붙는다 — 부모가 없다)
  const 원래교과띠 = window.교과띠그리기;
  if (typeof 원래교과띠 === "function") {
    window.교과띠그리기 = function () {
      const 띠 = 원래교과띠.apply(this, arguments);
      if (띠 && 띠.dataset && 띠.dataset.부모 && 관리자인가())
        띠.appendChild(더하기단추("＋", () => 추가(띠.dataset.부모, "세부 과목"), "세부 과목 추가"));
      return 띠;
    };
  }

  // ③ 단원 드롭바
  const 원래길줄 = window.길줄만들기;
  if (typeof 원래길줄 === "function") {
    window.길줄만들기 = function () {
      const 줄 = 원래길줄.apply(this, arguments);
      if (!줄 || !관리자인가()) return 줄;
      const 교과 = 경로[1] ? 나무.찾기(경로[1]) : null;
      if (!교과) return 줄;
      const 고르개 = 줄.querySelector(".단원고르개");
      if (!고르개) {
        // 단원이 하나도 없는 세부 과목 — 드롭바가 안 생긴다. 그 자리에 「＋ 단원」 을 둔다
        const 사이 = document.createElement("span"); 사이.className = "길사이"; 사이.textContent = "›";
        const ㄷ = 더하기단추("＋ 단원", () => 추가(교과.마디.아이디, "단원"), "단원 추가");
        ㄷ.classList.add("길추가");
        줄.append(사이, ㄷ);
        return 줄;
      }
      const 앞값 = 고르개.value;
      고르개.appendChild(new Option("＋ 단원 추가…", "__단원추가__"));
      // ★ 앱.js 의 change 가 먼저 돌면 「__단원추가__」 를 단원으로 알고 그린다.
      //   바깥(줄)에서 붙잡는 단계(capture)로 먼저 가로채 막는다.
      줄.addEventListener("change", ㄴ => {
        if (ㄴ.target !== 고르개 || 고르개.value !== "__단원추가__") return;
        ㄴ.stopPropagation();
        고르개.value = 앞값;
        추가(앞값 || 교과.마디.아이디, "단원");
      }, true);
      // 우클릭 — 지금 고른 단원
      고르개.addEventListener("contextmenu", ㄴ => {
        const 아이디 = 고르개.value;
        if (!아이디 || 아이디 === 교과.마디.아이디 || 아이디 === "__단원추가__") return;
        ㄴ.preventDefault();
        우클릭메뉴(아이디, ㄴ.clientX, ㄴ.clientY);
      });
      return 줄;
    };
  }

  // ④ 과목 · 세부 과목 우클릭 — 이름 바꾸기 · 지우기
  document.addEventListener("contextmenu", ㄴ => {
    if (!관리자인가()) return;
    const 단 = ㄴ.target.closest("#머리과목 .메뉴칸[data-아이디], #과목띠 .메뉴칸[data-아이디], .교과띠[data-부모] .메뉴칸[data-아이디]");
    if (!단) return;
    ㄴ.preventDefault();
    우클릭메뉴(단.dataset.아이디, ㄴ.clientX, ㄴ.clientY);
  });

  // 로그인 · 등급이 바뀌면 단추를 다시 붙이거나 뗀다
  let 앞관리자 = false;
  회원.듣기(() => {
    const 지금 = 관리자인가();
    if (지금 === 앞관리자) return;
    앞관리자 = 지금;
    다시그리기();
  });
  if (관리자인가()) { 앞관리자 = true; 다시그리기(); }
})();
