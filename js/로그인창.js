// ============================================================
//  로그인 창 · 가입 창  (2026-09-22 · 사용자가 정함)
// ============================================================
//
//  사용자가 정한 것:
//    「로그인은 로그인이고 가입은 가입이지」
//    「로그인은 세도비 런처 로그인 아이디 비번이랑 같은 거라고」
//
//  ★ 로그인 — 메일 · 비밀번호. 런처에 넣는 그것과 같다.
//  ★ 가입   — 메일 · 비밀번호 → 메일로 온 여섯 자리 번호 → 별명.
//  ★ 로그인하면 머리줄 「로그인」 이 별명으로 바뀌고 「가입」 은 숨는다.
//  ★ 비밀번호를 잊었으면 메일 번호로 들어오는 길이 로그인 창 아래에 있다.

(() => {
  if (!window.회원) return;

  const 단추 = document.getElementById("로그인단추");
  const 가입단 = document.getElementById("가입단추");
  const 막   = document.getElementById("로그인막");
  const 제목 = document.getElementById("로그인제목");
  const 설명 = document.getElementById("로그인설명");
  const 칸들 = {
    메일: [document.getElementById("메일칸"), document.getElementById("로그인메일")],
    비번: [document.getElementById("비번칸"), document.getElementById("로그인비번")],
    번호: [document.getElementById("번호칸"), document.getElementById("로그인번호")],
    별명: [document.getElementById("별명칸"), document.getElementById("로그인별명")],
  };
  const 밖의문칸 = document.getElementById("밖의문");
  const 말   = document.getElementById("로그인말");
  const 바꾸기 = document.getElementById("로그인바꾸기");
  const 하기 = document.getElementById("로그인하기");
  const 취소 = document.getElementById("로그인취소");
  if (!단추 || !막) return;

  const 등급이름 = { admin: "관리자", teacher: "선생님", member: "일반 회원" };

  // ★★ 로그인 화면 규격 (2026-09-24 · 사장님 「로그인 구성은 홈피와 런처가 동일하게」)
  //    원본: 0 세도비 지침서\로그인 화면 규격.md — 런처와 홈피 검사가 이 두 줄을 **글자 그대로** 대조한다.
  //    바꿀 때는 규격 파일부터 고치고 런처 · 홈피를 같이 고친다. 한쪽만 바꾸면 빨강이다.
  const 로그인창차례 = ["로그인", "회원 가입", "비밀번호 찾기"];
  const 드롭바차례 = ["닉네임 바꾸기", "비밀번호 바꾸기", "초대 관리", "회원 관리", "게시글 비밀번호", "로그아웃"];
  const [글로그인, 글가입, 글찾기] = 로그인창차례;

  // 이름 칸 — 「닉네임」 만 (채널 판: 채널은 앱마다 고르니 한 채널을 못 박지 않는다) · 닉네임이 없으면 메일 앞부분
  //   받은 초대가 있으면 빨간 점 — 점은 단추칠하기가 따로 붙인다(글자는 닉네임 그대로)
  function 이름칸글(ㅅ) {
    if (!ㅅ.들어왔나) return 글로그인;
    return ㅅ.별명 || String(ㅅ.메일 || "").split("@")[0] || "회원";
  }
  const 채널줄들 = ㅅ => (ㅅ.채널 && Array.isArray(ㅅ.채널.목록)) ? ㅅ.채널.목록 : [];
  const 받은초대수 = ㅅ => 채널줄들(ㅅ).filter(ㄱ => !ㄱ.내것 && ㄱ.상태 === "초대").length;
  const 계정정지 = ㅅ => ㅅ.등급 !== "admin" && 채널줄들(ㅅ).some(ㄱ => ㄱ.내것 && ㄱ.정지);
  let 새비번제목 = "";
  let 걸음 = "로그인";   // 로그인 · 번호로그인 · 번호로그인확인 · 가입 · 가입확인 · 별명 · 나
  // (「어떻게 쓰나요?」 는 없앴다 — 채널 판: 가입하면 누구나 제 채널이 저절로 생긴다, 2026-09-24)
  let 받은메일 = "";
  let 도는중 = false;

  function 말하기(글, 결) {
    말.textContent = 글 || "";
    말.style.color = 결 === "탈" ? "#e08b96" : 결 === "됨" ? "var(--악센트)" : "";
  }

  // 아래 작은 글씨 — 다른 걸음으로 건너가는 길
  function 건너가기(글들) {
    바꾸기.replaceChildren();
    글들.forEach(([글, 갈곳]) => {
      const ㄱ = document.createElement("button");
      ㄱ.type = "button"; ㄱ.className = "글단추"; ㄱ.textContent = 글;
      ㄱ.addEventListener("click", () => { 말하기(""); 걸음보이기(갈곳); });
      바꾸기.appendChild(ㄱ);
    });
  }

  // ★ 구글 단추 (2026-09-23) — 저장소에서 그 문을 열어 놨을 때만 생긴다.
  //   열쇠를 안 넣었으면 아무것도 안 뜬다. 넣는 날 저절로 뜬다 — 코드는 안 고쳐도 된다.
  const 문그림 = {
    google: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.7-.4-3.9H24v7.1h12.1c-.2 1.8-1.6 4.5-4.5 6.3l6.9 5.3c4.1-3.8 6.6-9.3 6.6-14.8z"/><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.3c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 41.2 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.5 28.5c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 10z"/><path fill="#EA4335" d="M24 10.6c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.4 29.9 2 24 2 15.4 2 8 6.8 4.4 14l7.1 5.5c1.8-5.3 6.7-8.9 12.5-8.9z"/></svg>',
    kakao: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#3C1E1E" d="M24 7C13.5 7 5 13.7 5 22c0 5.3 3.5 10 8.8 12.6l-2.2 8.1c-.2.7.6 1.3 1.2.9l9.6-6.4c.5 0 1.1.1 1.6.1 10.5 0 19-6.7 19-15S34.5 7 24 7z"/></svg>'
  };
  let 문그렸나 = false;
  async function 밖의문칠하기() {
    if (!밖의문칸) return;
    const 보일걸음 = () => 걸음 === "로그인" || 걸음 === "가입";
    if (!보일걸음()) { 밖의문칸.hidden = true; return; }
    if (!문그렸나) {
      const 문들 = await 회원.밖의문들();
      if (!문들.length) { 밖의문칸.hidden = true; return; }
      밖의문칸.replaceChildren();
      문들.forEach(ㅁ => {
        const ㄷ = document.createElement("button");
        ㄷ.type = "button"; ㄷ.className = "밖의문단추 " + ㅁ;
        ㄷ.innerHTML = 문그림[ㅁ] || "";                       // ★ 우리가 넣은 그림이다. 남이 쓴 글이 아니다
        ㄷ.appendChild(document.createTextNode((회원.밖의문이름[ㅁ] || ㅁ) + " 계정으로 계속하기"));
        ㄷ.addEventListener("click", () => { 말하기((회원.밖의문이름[ㅁ] || ㅁ) + " 로 가는 중…"); 회원.밖으로가기(ㅁ); });
        밖의문칸.appendChild(ㄷ);
      });
      const 금 = document.createElement("div"); 금.className = "밖의금";
      금.appendChild(document.createElement("span")).textContent = "또는";
      밖의문칸.appendChild(금);
      문그렸나 = true;
    }
    밖의문칸.hidden = !보일걸음();                              // 묻는 사이에 걸음이 바뀌었을 수 있다
  }

  function 보일칸(...이름들) {
    Object.entries(칸들).forEach(([이름, [틀]]) => { 틀.hidden = !이름들.includes(이름); });
  }

  function 걸음보이기(새걸음) {
    걸음 = 새걸음;
    const ㅅ = 회원.상태();
    const [, 메일] = 칸들.메일, [, 비번] = 칸들.비번, [, 번호] = 칸들.번호, [, 별명] = 칸들.별명;
    비번.autocomplete = 걸음 === "가입" ? "new-password" : "current-password";
    취소.textContent = "닫기";
    if (걸음 === "로그인") {
      제목.textContent = 글로그인;
      설명.textContent = "세도비 런처에 넣는 메일과 비밀번호를 넣어라.";
      보일칸("메일", "비번"); 하기.textContent = 글로그인;
      건너가기([[글가입, "가입"], [글찾기, "번호로그인"]]);
      setTimeout(() => (메일.value ? 비번 : 메일).focus(), 30);
    } else if (걸음 === "번호로그인") {
      제목.textContent = 글찾기;
      설명.textContent = "가입한 메일을 넣으면 여섯 자리 번호를 보낸다. 번호를 넣으면 바로 들어간다.";
      보일칸("메일"); 하기.textContent = "번호 받기";
      건너가기([["로그인으로 돌아가기", "로그인"]]);
      setTimeout(() => 메일.focus(), 30);
    } else if (걸음 === "번호로그인확인" || 걸음 === "가입확인") {
      제목.textContent = 걸음 === "가입확인" ? 글가입 + " — 메일 확인" : 글찾기;
      설명.textContent = 받은메일 + " 로 여섯 자리 번호를 보냈다. 메일함(스팸함도)을 봐라.";
      보일칸("번호"); 하기.textContent = "확인";
      건너가기([["메일 다시 쓰기", 걸음 === "가입확인" ? "가입" : "번호로그인"]]);
      번호.value = "";
      setTimeout(() => 번호.focus(), 30);
    } else if (걸음 === "가입") {
      제목.textContent = 글가입;
      설명.textContent = "메일과 새 비밀번호(여덟 자 이상)를 정해라. 메일로 확인 번호가 간다.";
      보일칸("메일", "비번"); 하기.textContent = "가입하기";
      건너가기([["로그인으로 돌아가기", "로그인"]]);
      setTimeout(() => 메일.focus(), 30);
    } else if (걸음 === "새비번") {
      // 비밀번호 찾기로 들어온 뒤 · 드롭바 「비밀번호 바꾸기」 (로그인 화면 규격)
      제목.textContent = 새비번제목 || "새 비밀번호 정하기";
      설명.textContent = "새 비밀번호(여덟 자 이상)를 넣어라. 런처에도 이 비밀번호로 들어간다.";
      보일칸("비번"); 하기.textContent = "바꾸기"; 취소.textContent = "나중에";
      비번.autocomplete = "new-password"; 비번.value = "";
      건너가기([]);
      setTimeout(() => 비번.focus(), 30);
    } else if (걸음 === "별명") {
      제목.textContent = "닉네임 정하기";
      설명.textContent = "댓글에 쓸 닉네임을 정해라.";
      보일칸("별명"); 하기.textContent = "정하기"; 취소.textContent = "나중에";
      건너가기([]);
      별명.value = ㅅ.별명 || (ㅅ.추천별명 || "").slice(0, 20);      // 구글로 들어왔으면 구글 이름을 미리 넣어 둔다
      setTimeout(() => 별명.focus(), 30);
    } else {
      제목.textContent = ㅅ.별명 || "내 계정";
      설명.textContent = (등급이름[ㅅ.등급] || "일반 회원") + " · " + ㅅ.메일;
      보일칸(); 건너가기([]);
      하기.textContent = "로그아웃";
      하기.hidden = !!ㅅ.런처로그인;          // 런처 로그인은 런처에서 끊는다
    }
    if (걸음 !== "나") 하기.hidden = false;
    밖의문칠하기();
  }

  function 열기(처음걸음) {
    말하기("");
    const ㅅ = 회원.상태();
    if (!ㅅ.들어왔나) 걸음보이기(처음걸음 || "로그인");
    else if (!ㅅ.별명) 걸음보이기("별명");
    else 걸음보이기("나");
    막.hidden = false;
  }
  function 닫기() {
    막.hidden = true; 도는중 = false; 하기.disabled = false; 칸들.비번[1].value = "";
    // 받기 쪽에서 왔다가 로그인 없이 닫으면 잊는다 — 안 그러면 나중에 로그인할 때 뜬금없이 받기 쪽으로 간다
    if (!회원.상태().들어왔나) { try { sessionStorage.removeItem("세진과학.받기로.v1"); } catch (오류) {} }
  }

  async function 들어온뒤() {
    const ㅅ = 회원.상태();
    if (!ㅅ.별명) { 말하기(""); 걸음보이기("별명"); }
    else { 말하기("들어왔다", "됨"); setTimeout(닫기, 500); }
  }

  async function 누름() {
    if (도는중) return;
    도는중 = true; 하기.disabled = true;
    const 메일 = 칸들.메일[1].value, 비번 = 칸들.비번[1].value;
    try {
      if (걸음 === "로그인") {
        말하기("들어가는 중…");
        await 회원.비번로그인(메일, 비번);
        await 들어온뒤();
      } else if (걸음 === "번호로그인") {
        말하기("보내는 중…");
        받은메일 = await 회원.번호받기(메일, false);
        말하기(""); 걸음보이기("번호로그인확인");
      } else if (걸음 === "번호로그인확인") {
        말하기("확인하는 중…");
        await 회원.번호넣기(받은메일, 칸들.번호[1].value);
        말하기(""); 새비번제목 = "새 비밀번호 정하기"; 걸음보이기("새비번");     // 규격: 번호로 들어가기 → 새 비밀번호 정하기
      } else if (걸음 === "새비번") {
        말하기("바꾸는 중…");
        await 회원.비밀번호바꾸기(비번);
        말하기("바꿨다", "됨");
        setTimeout(들어온뒤, 500);
      } else if (걸음 === "가입") {
        말하기("가입하는 중…");
        const ㄹ = await 회원.가입하기(메일, 비번);
        받은메일 = String(메일).trim();
        말하기("");
        if (ㄹ.바로됨) await 들어온뒤(); else 걸음보이기("가입확인");
      } else if (걸음 === "가입확인") {
        말하기("확인하는 중…");
        await 회원.가입확인(받은메일, 칸들.번호[1].value);
        await 들어온뒤();
      } else if (걸음 === "별명") {
        말하기("정하는 중…");
        await 회원.별명정하기(칸들.별명[1].value);
        말하기("정했다", "됨");
        setTimeout(닫기, 500);
      } else {
        await 회원.나가기();
        닫기();
      }
    } catch (오류) {
      말하기(쉬운말(오류), "탈");
    } finally {
      도는중 = false; 하기.disabled = false;
    }
  }

  // 서버 말을 사람 말로 — 흔한 것만 바꾸고 나머지는 그대로 보여 준다 (감추면 왜 안 되는지 모른다)
  function 쉬운말(오류) {
    const ㄱ = String(오류 && 오류.message || 오류);
    if (/rate limit|too many|seconds/i.test(ㄱ)) return "너무 자주 눌렀다. 1분쯤 있다가 다시 해라.";
    if (/expired|invalid.*otp|token has expired/i.test(ㄱ)) return "번호가 틀렸거나 시간이 지났다. 다시 받아라.";
    if (/Failed to fetch|NetworkError/i.test(ㄱ)) return "인터넷이 안 된다. 연결을 보고 다시 해라.";
    if (/password.*(short|characters|weak)/i.test(ㄱ)) return "비밀번호가 너무 쉽다. 여덟 자 이상, 글자와 숫자를 섞어라.";
    // 구글 문에서 돌아올 때 (2026-09-23)
    if (/unsupported provider|oauth (secret|provider)/i.test(ㄱ)) return "구글 로그인이 아직 안 열렸다. 메일과 비밀번호로 들어와라.";
    if (/access_denied|denied|cancel/i.test(ㄱ)) return "구글 쪽에서 취소했다. 다시 하려면 단추를 한 번 더 눌러라.";
    if (/redirect|not allowed for this/i.test(ㄱ)) return "구글에서 돌아올 주소가 안 맞다. 관리자한테 말해라.";
    return ㄱ;
  }

  하기.addEventListener("click", 누름);
  취소.addEventListener("click", 닫기);
  막.addEventListener("click", ㄴ => { if (ㄴ.target === 막) 닫기(); });
  Object.values(칸들).forEach(([, 칸]) => 칸.addEventListener("keydown", ㄴ => {
    if (ㄴ.key === "Enter") { ㄴ.preventDefault(); 누름(); }
    if (ㄴ.key === "Escape") 닫기();
  }));
  칸들.번호[1].addEventListener("input", () => {
    const 칸 = 칸들.번호[1];
    칸.value = 칸.value.replace(/\D/g, "").slice(0, 6);
    if (칸.value.length === 6) 누름();       // 여섯 자리가 차면 저절로 넘어간다
  });
  // ★ 로그인한 뒤에는 이름을 누르면 드롭바 — 닉네임 바꾸기 · 회원 관리(관리자) · 로그아웃 (2026-09-23 · 사용자가 정함)
  const 계정메뉴 = document.getElementById("계정메뉴");
  function 계정메뉴닫기() { if (계정메뉴) 계정메뉴.hidden = true; 단추.setAttribute("aria-expanded", "false"); }
  // ★ 드롭바 — 차례는 드롭바차례 그대로 (로그인 화면 규격). 보이는 조건만 여기서 가린다:
  //   초대 관리 — 누구나(가입하면 제 채널이 있다). 계정이 정지됐으면 안 보인다. 받은 초대가 있으면 옆에 수(글자는 그대로)
  //   회원 관리 — 관리자(admin)만 · 나머지는 늘
  function 알림(글) { try { 쪽지(글); } catch (오류) { alert(글); } }
  function 계정메뉴열기() {
    const ㅅ = 회원.상태();
    계정메뉴.replaceChildren();
    // 머리 — 닉네임 / 내 채널 이름 · 들어간 채널 이름들 (관리자면 「관리자」) / 메일
    const 머리 = document.createElement("div");
    머리.className = "계정머리";
    const 이름 = document.createElement("b"); 이름.textContent = ㅅ.별명 || String(ㅅ.메일 || "").split("@")[0] || "닉네임 없음";
    const 둘째 = document.createElement("span"); 둘째.className = "계정등급";
    const 채널이름들 = 채널줄들(ㅅ).filter(ㄱ => ㄱ.내것 || ㄱ.상태 === "활성").map(ㄱ => ㄱ.이름).filter(Boolean);
    둘째.textContent = ㅅ.등급 === "admin" ? "관리자" : (채널이름들.join(" · ") || (등급이름[ㅅ.등급] || "일반 회원"));
    const 메일 = document.createElement("div"); 메일.className = "계정메일"; 메일.textContent = ㅅ.메일 || "";
    머리.append(이름, 둘째, 메일);
    계정메뉴.appendChild(머리);
    const 금 = () => { const ㄱ = document.createElement("div"); ㄱ.className = "계정금"; 계정메뉴.appendChild(ㄱ); };
    금();
    const 할일 = {
      "닉네임 바꾸기": { 된다: true, 누르면: () => { 말하기(""); 걸음보이기("별명"); 제목.textContent = "닉네임 바꾸기"; 설명.textContent = "댓글 · 글쓴이 · 런처 · 채널 어디서나 이 이름이 나온다."; 취소.textContent = "닫기"; 막.hidden = false; } },
      "비밀번호 바꾸기": { 된다: true, 누르면: () => { 말하기(""); 새비번제목 = "비밀번호 바꾸기"; 걸음보이기("새비번"); 취소.textContent = "닫기"; 막.hidden = false; } },
      "초대 관리": { 된다: !계정정지(ㅅ), 수: 받은초대수(ㅅ), 누르면: () => { if (window.초대관리) 초대관리.열기(); } },
      "회원 관리": { 된다: ㅅ.등급 === "admin", 누르면: () => { if (window.회원관리) 회원관리.열기(); } },
      "게시글 비밀번호": { 된다: true, 누르면: () => {
        if (ㅅ.등급 !== "teacher" && ㅅ.등급 !== "admin") return 알림("게시글 비밀번호는 선생님 등급부터 쓴다");
        if (window.비공개) 비공개.비번정하기();
      } },
      "로그아웃": { 된다: true, 결: "빨강", 누르면: async () => {
        try { await 회원.나가기(); } catch (오류) { 알림(오류.message); }
      } }
    };
    드롭바차례.forEach(글 => {
      const ㄱ = 할일[글];
      if (!ㄱ || !ㄱ.된다) return;
      if (글 === "로그아웃") 금();
      const ㄷ = document.createElement("button");
      ㄷ.type = "button"; ㄷ.setAttribute("role", "menuitem");
      ㄷ.className = "계정줄" + (ㄱ.결 ? " " + ㄱ.결 : "");
      ㄷ.textContent = 글;
      if (ㄱ.수) { const 배지 = document.createElement("span"); 배지.className = "계정배지"; 배지.textContent = String(ㄱ.수); ㄷ.appendChild(배지); }   // 글자는 그대로, 수는 따로
      ㄷ.addEventListener("click", ㄴ => { ㄴ.stopPropagation(); 계정메뉴닫기(); ㄱ.누르면(); });
      계정메뉴.appendChild(ㄷ);
    });
    계정메뉴.hidden = false;
    단추.setAttribute("aria-expanded", "true");
  }
  단추.addEventListener("click", ㄴ => {
    const ㅅ = 회원.상태();
    if (!ㅅ.들어왔나) return 열기("로그인");
    if (!ㅅ.별명) return 열기();            // 닉네임이 없으면 먼저 정하게
    ㄴ.stopPropagation();
    if (계정메뉴 && 계정메뉴.hidden) 계정메뉴열기(); else 계정메뉴닫기();
  });
  document.addEventListener("click", ㄴ => { if (계정메뉴 && !계정메뉴.hidden && !계정메뉴.contains(ㄴ.target)) 계정메뉴닫기(); });
  document.addEventListener("keydown", ㄴ => { if (ㄴ.key === "Escape") 계정메뉴닫기(); });
  if (가입단) 가입단.addEventListener("click", () => 열기("가입"));

  // 머리줄 — 로그인 전엔 「로그인」 「가입」, 뒤엔 별명 하나
  function 단추칠하기(ㅅ) {
    단추.textContent = 이름칸글(ㅅ);                  // 「닉네임」 (로그인 화면 규격 · 채널 판)
    단추.title = ㅅ.들어왔나 ? 단추.textContent : "";
    const 초대수 = ㅅ.들어왔나 ? 받은초대수(ㅅ) : 0;
    if (초대수) {                                      // 받은 초대가 있으면 빨간 점
      const 점 = document.createElement("span"); 점.className = "빨간점"; 점.setAttribute("aria-label", "받은 초대 " + 초대수);
      단추.appendChild(점); 단추.title += " — 받은 초대 " + 초대수;
    }
    단추.classList.toggle("들어옴", !!ㅅ.들어왔나);
    if (가입단) 가입단.hidden = true;          // ★ 머리줄 「가입」 은 없앴다 — 로그인 창 안 「회원 가입」 으로
    document.body.classList.toggle("회원", !!ㅅ.들어왔나);
    document.body.dataset.등급 = ㅅ.들어왔나 ? (ㅅ.등급 || "member") : "";
  }
  회원.듣기(단추칠하기);
  단추칠하기(회원.상태());

  // ★ 런처가 홈피 그 화면을 연다 — #member-admin · #post-pin (로그인 화면 규격)
  //   로그인이 되면(런처에서 이어받든, 손으로 넣든) 그 화면을 바로 연다. 3초 안에 안 되면 로그인 창을 띄운다.
  {
    const 할것 = 회원.처음할일 ? 회원.처음할일() : "";
    if (할것) {
      let 했나 = false;
      const 해보기 = ㅅ => {
        if (했나 || !ㅅ.들어왔나 || !ㅅ.이름표) return;          // 등급까지 읽힌 뒤에
        했나 = true; 회원.할일끝(); 끄기();
        if (할것 === "member-admin") {
          if (ㅅ.등급 === "admin" && window.회원관리) 회원관리.열기();
          else 알림("회원 관리는 관리자만 연다");
        } else if (할것 === "post-pin") {
          if (ㅅ.등급 === "teacher" || ㅅ.등급 === "admin") { if (window.비공개) 비공개.비번정하기(); }
          else 알림("게시글 비밀번호는 선생님 등급부터 쓴다");
        }
      };
      const 끄기 = 회원.듣기(ㅅ => setTimeout(() => 해보기(ㅅ), 0));   // 회원관리 · 비공개 가 다 실린 뒤에
      setTimeout(() => { const ㅅ = 회원.상태(); if (ㅅ.들어왔나) 해보기(ㅅ); else if (!했나) 열기("로그인"); }, 3000);
    }
  }

  // ★ 받기 쪽에서 왔다(#download · #download-join, 회원.js 가 세션 서랍에 적어 둠) — 로그인되면 받기 쪽으로 돌려보낸다
  //   이미 로그인돼 있으면(표가 낡아 홈이 새로 받은 경우) 바로 돌아간다. 1.5초 안에 안 되면 로그인(가입) 창을 띄운다.
  {
    const 받기열쇠 = "세진과학.받기로.v1";
    let 받기로 = ""; try { 받기로 = sessionStorage.getItem(받기열쇠) || ""; } catch (오류) {}
    if (받기로) {
      let 갔나 = false;
      const 가기 = ㅅ => {
        if (갔나 || !ㅅ.들어왔나) return false;
        갔나 = true; try { sessionStorage.removeItem(받기열쇠); } catch (오류) {}
        location.replace("download.html#start");
        return true;
      };
      if (!가기(회원.상태())) {
        const 끄기 = 회원.듣기(ㅅ => { if (가기(ㅅ)) 끄기(); });
        setTimeout(() => {
          if (갔나 || 회원.상태().들어왔나) return;
          열기(받기로 === "download-join" ? "가입" : "로그인");
          말하기("런처는 회원만 받을 수 있다 — 로그인하면 받기 쪽으로 돌아간다");
        }, 1500);
      }
    }
  }

  // ★ 구글 문에서 막 돌아온 화면 (2026-09-23)
  //   처음 온 사람이면 닉네임부터 정하게 띄운다. 이미 정했으면 아무것도 안 띄운다 — 그냥 들어온 것이다.
  if (회원.밖의탈 && 회원.밖의탈()) {
    열기("로그인");
    말하기(쉬운말(회원.밖의탈()), "탈");
  } else if (회원.밖에서왔나 && 회원.밖에서왔나()) {
    const 끄기 = 회원.듣기(ㅅ => {
      if (!ㅅ.들어왔나) return;
      끄기();
      if (!ㅅ.별명) 열기();
    });
  }
})();
