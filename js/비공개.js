// ============================================================
//  비공개 글 · 게시글 비밀번호  (2026-09-23 · 사용자가 정함)
// ============================================================
//
//  사용자가 정한 것:
//    「각 선생님은 자신의 게시글에 비밀번호를 부여할수 있게 하라. 로그인하고 내 닉네임 누르면
//      드롭바 뜨는곳에 게시글 비밀번호 메뉴를 만들어라. 비번은 4글자다.」
//    「일반 회원들은 비공개된 게시글을 읽기 위해서는 비밀번호를 입력 해야 한다.」
//    「선생님은 게시판 자신의 글에 공개버튼을 누르면 비공개 공개 바뀌게 하라.」
//    → 계획에 「추천대로」: 숫자 네 자리 · 로그인 안 한 손님도 비번만 맞으면 본다
//
//  ★★★ 막는 건 저장소다 (db/6 비공개 글.sql). 읽는 창은 비공개 글의 영상 번호를 아예 안 준다.
//     여기는 비번을 받아 site_open_post 에 넘기고, 받은 영상 번호를 목록에 채워 넣을 뿐이다.
//  ★ 선생님마다 비번이 하나다. 그 선생님 비공개 글 전부에 같은 비번이 걸린다.
//  ★ 한 번 맞히면 이 창(탭)을 닫기 전까지 그 선생님 글은 다시 안 묻는다 (sessionStorage).
//  ★ 비번 칸은 type=text 에 글자 가리기다 — type=password 로 두면 크롬이 저장된 개인 비번을
//    멋대로 채운다 (홈페이지 지침 2-22, 2026-09-23 에 실제로 밟음).

// ---------- 작은 물음 창 — 비번 · 단원 이름 같은 한 칸짜리 (단원관리.js 도 쓴다) ----------
//  모양은 로그인 창 것(연결막 · 연결창)을 그대로 빌린다. 새 모양을 만들지 않는다.
window.물음창 = function 물음창({ 제목, 설명, 칸이름, 값 = "", 자리글 = "", 숫자넷 = false, 하기글 = "확인", 넣으면 }) {
  return new Promise(풀기 => {
    const 막 = document.createElement("div");
    막.className = "연결막 물음막";
    막.innerHTML =
      '<div class="연결창 물음창" role="dialog" aria-modal="true">' +
        '<h2 class="연결제목"></h2><p class="연결단원"></p>' +
        '<label class="연결칸"><span class="연결이름"></span><input type="text" spellcheck="false"></label>' +
        '<p class="연결말"></p>' +
        '<div class="연결단추줄"><button class="연결취소" type="button">닫기</button>' +
        '<button class="연결하기" type="button"></button></div>' +
      '</div>';
    막.querySelector(".연결제목").textContent = 제목 || "";
    막.querySelector(".연결단원").textContent = 설명 || "";
    막.querySelector(".연결이름").textContent = 칸이름 || "";
    const 칸 = 막.querySelector("input");
    const 말 = 막.querySelector(".연결말");
    const 하기 = 막.querySelector(".연결하기");
    하기.textContent = 하기글;
    칸.value = 값; 칸.placeholder = 자리글;
    if (숫자넷) {
      칸.className = "비번칸";
      칸.inputMode = "numeric"; 칸.maxLength = 4; 칸.autocomplete = "off";
      칸.setAttribute("autocomplete", "off"); 칸.setAttribute("data-lpignore", "true");
      칸.name = "게시글번호-" + Date.now();          // 이름이 매번 달라야 브라우저가 채울 게 없다
    } else {
      칸.maxLength = 100; 칸.autocomplete = "off";
    }
    let 도는중 = false;
    const 닫기 = 결과 => { 막.remove(); document.removeEventListener("keydown", 키); 풀기(결과); };
    const 말하기 = (글, 결) => { 말.textContent = 글 || ""; 말.style.color = 결 === "탈" ? "#e08b96" : 결 === "됨" ? "var(--악센트)" : ""; };
    async function 누름() {
      if (도는중) return;
      const 넣은것 = 칸.value.trim();
      if (숫자넷 && !/^[0-9]{4}$/.test(넣은것)) { 말하기("숫자 네 자리를 넣어라", "탈"); 칸.focus(); return; }
      if (!넣은것) { 말하기("비었다", "탈"); 칸.focus(); return; }
      도는중 = true; 하기.disabled = true; 말하기("…");
      try {
        const ㄹ = 넣으면 ? await 넣으면(넣은것) : { 됐나: true };
        if (ㄹ && ㄹ.됐나) { 말하기(ㄹ.말 || "됐다", "됨"); setTimeout(() => 닫기(ㄹ.값 !== undefined ? ㄹ.값 : 넣은것), ㄹ.말 ? 450 : 0); return; }
        말하기((ㄹ && ㄹ.말) || "안 됐다", "탈");
        if (숫자넷) 칸.value = "";
        칸.focus();
      } catch (오류) {
        말하기(String(오류 && 오류.message || 오류), "탈");
      } finally { 도는중 = false; 하기.disabled = false; }
    }
    const 키 = ㄴ => { if (ㄴ.key === "Escape") 닫기(null); };
    document.addEventListener("keydown", 키);
    칸.addEventListener("keydown", ㄴ => { if (ㄴ.key === "Enter") { ㄴ.preventDefault(); 누름(); } });
    if (숫자넷) 칸.addEventListener("input", () => {
      칸.value = 칸.value.replace(/\D/g, "").slice(0, 4);
      if (칸.value.length === 4) 누름();             // 네 자리가 차면 저절로 넘어간다
    });
    하기.addEventListener("click", 누름);
    막.querySelector(".연결취소").addEventListener("click", () => 닫기(null));
    막.addEventListener("click", ㄴ => { if (ㄴ.target === 막) 닫기(null); });
    document.body.appendChild(막);
    setTimeout(() => { 칸.focus(); 칸.select(); }, 30);
  });
};

const 비공개 = (() => {
  const 빈것 = { 열기: async () => false, 다시받기: async () => null, 바꾸기() {}, 비번정하기: async () => false, 비번있나: async () => false, 내것인가: () => false };
  if (!window.회원) return 빈것;

  // ---------- 맞힌 비번 기억 (이 탭만) ----------
  const 서랍열쇠 = "세진과학.게시글비번.v1";
  const 기억읽기 = () => { try { return JSON.parse(sessionStorage.getItem(서랍열쇠) || "{}") || {}; } catch (오류) { return {}; } };
  const 기억쓰기 = (글쓴이, 번호) => {
    try { const ㄱ = 기억읽기(); if (번호) ㄱ[글쓴이] = 번호; else delete ㄱ[글쓴이]; sessionStorage.setItem(서랍열쇠, JSON.stringify(ㄱ)); }
    catch (오류) { /* 개인 창이면 못 담는다 — 매번 묻는다 */ }
  };

  const 날시각 = ㅅ => { const ㄷ = new Date(ㅅ); return String(ㄷ.getHours()).padStart(2, "0") + ":" + String(ㄷ.getMinutes()).padStart(2, "0"); };
  const 선생님인가 = ㅅ => ㅅ.들어왔나 && (ㅅ.등급 === "teacher" || ㅅ.등급 === "admin");
  // 이 글의 공개/비공개를 내가 바꿀 수 있나 — 쓴 선생님 · 관리자 (저장소도 똑같이 막는다)
  function 내것인가(ㅇ) {
    const ㅅ = 회원.상태();
    if (!window.저장소가원본 || !ㅇ || !ㅇ.고유 || !ㅅ.들어왔나) return false;
    return ㅅ.등급 === "admin" || (ㅅ.등급 === "teacher" && !!ㅇ.글쓴이 && ㅇ.글쓴이 === ㅅ.이름표);
  }

  // ---------- 비번 있나 · 정하기 ----------
  let 있나기억 = null;           // 로그인이 바뀌면 지운다
  회원.듣기(() => { 있나기억 = null; });
  async function 비번있나() {
    if (!선생님인가(회원.상태())) return false;
    if (있나기억 !== null) return 있나기억;
    try { 있나기억 = !!(await 회원.부르기("/rest/v1/rpc/site_has_pin", { 방법: "POST", 몸: {} })); }
    catch (오류) { 있나기억 = false; }
    return 있나기억;
  }

  async function 비번정하기() {
    if (!선생님인가(회원.상태())) return false;
    const 있다 = await 비번있나();
    const 됨 = await 물음창({
      제목: "게시글 비밀번호",
      설명: 있다
        ? "비밀번호가 이미 정해져 있다. 새로 넣으면 바뀐다 — 내 비공개 글 전부에 새 비밀번호가 걸린다."
        : "숫자 네 자리. 비공개로 올린 내 글을 학생이 열 때 이 번호를 넣는다.",
      칸이름: 있다 ? "새 비밀번호 (숫자 네 자리)" : "비밀번호 (숫자 네 자리)",
      자리글: "0000", 숫자넷: true, 하기글: "정하기",
      넣으면: async 번호 => {
        await 회원.부르기("/rest/v1/rpc/site_set_pin", { 방법: "POST", 몸: { p_pin: 번호 } });
        있나기억 = true;
        return { 됐나: true, 말: "정했다" };
      }
    });
    return 됨 !== null;
  }

  // ---------- 비공개 글 열기 ----------
  async function 부름(ㅇ, 번호) {
    return 회원.부르기("/rest/v1/rpc/site_open_post", { 방법: "POST", 몸: { p_post: ㅇ.고유, p_pin: 번호 || null } });
  }
  function 채우기(ㅇ, ㄹ) {
    ㅇ.아이디 = ㄹ.youtube_id || "";
    ㅇ.본문 = ㄹ.body || "";
    ㅇ.열린댓글 = Array.isArray(ㄹ.comments) ? ㄹ.comments : [];
    if (ㄹ.captions && ㅇ.아이디 && window.자막 && 자막.넣기) 자막.넣기(ㅇ.아이디, ㄹ.captions);
  }

  async function 열기(ㅇ) {
    if (!ㅇ || !ㅇ.고유) return false;
    // ① 이 탭에서 이미 맞힌 비번이 있으면 조용히 먼저 넣어 본다
    const 기억 = 기억읽기()[ㅇ.글쓴이 || ""];
    if (기억) {
      try {
        const ㄹ = await 부름(ㅇ, 기억);
        if (ㄹ && ㄹ.됐나) { 채우기(ㅇ, ㄹ); return true; }
        if (ㄹ && !ㄹ.잠김) 기억쓰기(ㅇ.글쓴이 || "", null);      // 선생님이 비번을 바꿨다
      } catch (오류) { /* 아래에서 물어본다 */ }
    }
    // ② 물어본다
    const 됨 = await 물음창({
      제목: "🔒 비공개 강의",
      설명: "「" + (ㅇ.강사 || "선생님") + "」 선생님이 비밀번호를 걸어 둔 강의다. 선생님께 받은 번호를 넣어라.",
      칸이름: "비밀번호 (숫자 네 자리)", 자리글: "0000", 숫자넷: true, 하기글: "열기",
      넣으면: async 번호 => {
        const ㄹ = await 부름(ㅇ, 번호);
        if (ㄹ && ㄹ.됐나) { 채우기(ㅇ, ㄹ); 기억쓰기(ㅇ.글쓴이 || "", 번호); return { 됐나: true }; }
        if (ㄹ && ㄹ.잠김) return { 됐나: false, 말: "너무 많이 틀렸다. " + (ㄹ.풀림 ? 날시각(ㄹ.풀림) + " 에 " : "10분 뒤에 ") + "다시 해라." };
        if (ㄹ && ㄹ.남은 !== undefined) return { 됐나: false, 말: "틀렸다 — " + ㄹ.남은 + "번 더 틀리면 10분 동안 잠긴다." };
        return { 됐나: false, 말: (ㄹ && ㄹ.왜) || "못 열었다" };
      }
    });
    return 됨 !== null;
  }

  // 댓글을 새로 받을 때 — 기억해 둔 비번으로 다시 부른다 (쓴 선생님 · 관리자는 비번 없이 된다)
  async function 다시받기(ㅇ) {
    try {
      const ㄹ = await 부름(ㅇ, 기억읽기()[ㅇ.글쓴이 || ""]);
      if (ㄹ && ㄹ.됐나) { 채우기(ㅇ, ㄹ); return ㄹ; }
    } catch (오류) {}
    return null;
  }

  // ---------- 게시판 딱지 — 공개 ↔ 비공개 ----------
  async function 바꾸기(ㅇ) {
    if (!내것인가(ㅇ)) return;
    const 비공개로 = !ㅇ.비공개;
    // 비번 없이 비공개로는 못 간다 (저장소도 막는다). 관리자가 남의 글을 잠글 때는 그 선생님 비번이 있어야 한다.
    const ㅅ = 회원.상태();
    if (비공개로 && ㅇ.글쓴이 === ㅅ.이름표 && !(await 비번있나())) {
      if (!(await 비번정하기())) return;
    }
    try {
      await 회원.부르기("/rest/v1/site_posts?id=eq." + ㅇ.고유, {
        방법: "PATCH", 몸: { is_private: 비공개로 }, 머리: { Prefer: "return=minimal" }
      });
      ㅇ.비공개 = 비공개로;
      ㅇ.잠김 = false;                                 // 내 글이니 나한테는 안 잠긴다
      try { 쪽지(비공개로 ? "🔒 비공개로 바꿨다" : "공개로 바꿨다"); } catch (오류) {}
      try { 격자그리기(); } catch (오류) {}
    } catch (오류) {
      const ㄱ = String(오류.message || 오류);
      alert(/비밀번호를 먼저/.test(ㄱ) ? "그 선생님이 게시글 비밀번호를 아직 안 정했다 — 비공개로 못 바꾼다." : "못 바꿨다 — " + ㄱ);
    }
  }

  // ---------- 로그인하면 내 비공개 글을 다시 받는다 ----------
  //  ★ 처음 목록은 손님 자격으로 받는다 — 그래서 선생님 자기 비공개 글도 잠긴 채로 온다.
  //    로그인이 확인되면 내 표로 다시 받아서 영상 번호를 채워 넣는다.
  let 받은이 = null;
  async function 새로받기() {
    const ㅅ = 회원.상태();
    const 누구 = ㅅ.들어왔나 ? (ㅅ.이름표 || "") + "|" + (ㅅ.등급 || "") : "";
    if (!window.저장소가원본 || !ㅅ.들어왔나 || !ㅅ.이름표 || 누구 === 받은이) return;
    if (!(window.동영상목록 || []).some(ㅇ => ㅇ.잠김)) { 받은이 = 누구; return; }
    받은이 = 누구;
    try {
      const 줄들 = await 회원.부르기("/rest/v1/site_posts_view?select=id,body,youtube_id,is_private,locked&is_private=is.true");
      let 바뀜 = false;
      (줄들 || []).forEach(ㄱ => {
        const ㅇ = window.동영상목록.find(ㅁ => ㅁ.고유 === ㄱ.id);
        if (!ㅇ || ㄱ.locked || !ㅇ.잠김) return;
        ㅇ.아이디 = ㄱ.youtube_id || ""; ㅇ.본문 = ㄱ.body || ""; ㅇ.잠김 = false; 바뀜 = true;
      });
      if (바뀜) { try { 격자그리기(); } catch (오류) {} }
    } catch (오류) { 받은이 = null; }
  }
  회원.듣기(() => { 새로받기(); try { if (document.querySelector(".글표")) 격자그리기(); } catch (오류) {} });
  새로받기();

  return { 열기, 다시받기, 바꾸기, 비번정하기, 비번있나, 내것인가 };
})();
window.비공개 = 비공개;
