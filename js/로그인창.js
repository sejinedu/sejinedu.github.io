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
  const 말   = document.getElementById("로그인말");
  const 바꾸기 = document.getElementById("로그인바꾸기");
  const 하기 = document.getElementById("로그인하기");
  const 취소 = document.getElementById("로그인취소");
  if (!단추 || !막) return;

  const 등급이름 = { admin: "관리자", teacher: "선생님", member: "일반 회원" };
  let 걸음 = "로그인";   // 로그인 · 번호로그인 · 번호로그인확인 · 가입 · 가입확인 · 별명 · 나
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
      제목.textContent = "로그인";
      설명.textContent = "세도비 런처에 넣는 메일과 비밀번호를 넣어라.";
      보일칸("메일", "비번"); 하기.textContent = "로그인";
      건너가기([["회원 가입", "가입"], ["비밀번호 찾기", "번호로그인"]]);
      setTimeout(() => (메일.value ? 비번 : 메일).focus(), 30);
    } else if (걸음 === "번호로그인") {
      제목.textContent = "비밀번호 찾기";
      설명.textContent = "가입한 메일을 넣으면 여섯 자리 번호를 보낸다. 번호를 넣으면 바로 들어간다.";
      보일칸("메일"); 하기.textContent = "번호 받기";
      건너가기([["로그인으로 돌아가기", "로그인"]]);
      setTimeout(() => 메일.focus(), 30);
    } else if (걸음 === "번호로그인확인" || 걸음 === "가입확인") {
      제목.textContent = 걸음 === "가입확인" ? "회원 가입 — 메일 확인" : "비밀번호 찾기";
      설명.textContent = 받은메일 + " 로 여섯 자리 번호를 보냈다. 메일함(스팸함도)을 봐라.";
      보일칸("번호"); 하기.textContent = "확인";
      건너가기([["메일 다시 쓰기", 걸음 === "가입확인" ? "가입" : "번호로그인"]]);
      번호.value = "";
      setTimeout(() => 번호.focus(), 30);
    } else if (걸음 === "가입") {
      제목.textContent = "회원 가입";
      설명.textContent = "메일과 새 비밀번호(여덟 자 이상)를 정해라. 메일로 확인 번호가 간다.";
      보일칸("메일", "비번"); 하기.textContent = "가입하기";
      건너가기([["로그인으로 돌아가기", "로그인"]]);
      setTimeout(() => 메일.focus(), 30);
    } else if (걸음 === "별명") {
      제목.textContent = "닉네임 정하기";
      설명.textContent = "댓글에 쓸 닉네임을 정해라.";
      보일칸("별명"); 하기.textContent = "정하기"; 취소.textContent = "나중에";
      건너가기([]);
      별명.value = ㅅ.별명 || "";
      setTimeout(() => 별명.focus(), 30);
    } else {
      제목.textContent = ㅅ.별명 || "내 계정";
      설명.textContent = (등급이름[ㅅ.등급] || "일반 회원") + " · " + ㅅ.메일;
      보일칸(); 건너가기([]);
      하기.textContent = "로그아웃";
      하기.hidden = !!ㅅ.런처로그인;          // 런처 로그인은 런처에서 끊는다
    }
    if (걸음 !== "나") 하기.hidden = false;
  }

  function 열기(처음걸음) {
    말하기("");
    const ㅅ = 회원.상태();
    if (!ㅅ.들어왔나) 걸음보이기(처음걸음 || "로그인");
    else if (!ㅅ.별명) 걸음보이기("별명");
    else 걸음보이기("나");
    막.hidden = false;
  }
  function 닫기() { 막.hidden = true; 도는중 = false; 하기.disabled = false; 칸들.비번[1].value = ""; }

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
        await 들어온뒤();
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
  function 계정메뉴열기() {
    const ㅅ = 회원.상태();
    계정메뉴.replaceChildren();
    const 머리 = document.createElement("div");
    머리.className = "계정머리";
    const 이름 = document.createElement("b"); 이름.textContent = (ㅅ.별명 || "닉네임 없음");
    const 등급 = document.createElement("span"); 등급.className = "계정등급"; 등급.textContent = 등급이름[ㅅ.등급] || "일반 회원";
    const 메일 = document.createElement("div"); 메일.className = "계정메일"; 메일.textContent = ㅅ.메일 || "";
    머리.append(이름, 등급, 메일);
    계정메뉴.appendChild(머리);
    const 줄 = (글, 누르면, 결) => {
      const ㄷ = document.createElement("button");
      ㄷ.type = "button"; ㄷ.setAttribute("role", "menuitem");
      ㄷ.className = "계정줄" + (결 ? " " + 결 : "");
      ㄷ.textContent = 글;
      ㄷ.addEventListener("click", ㄴ => { ㄴ.stopPropagation(); 계정메뉴닫기(); 누르면(); });
      계정메뉴.appendChild(ㄷ);
    };
    const 금 = () => { const ㄱ = document.createElement("div"); ㄱ.className = "계정금"; 계정메뉴.appendChild(ㄱ); };
    금();
    줄("닉네임 바꾸기", () => { 말하기(""); 걸음보이기("별명"); 제목.textContent = "닉네임 바꾸기"; 설명.textContent = "댓글과 글쓴이 자리에 이 이름이 나온다."; 취소.textContent = "닫기"; 막.hidden = false; });
    if (ㅅ.등급 === "admin" && window.회원관리) 줄("회원 관리", () => 회원관리.열기());
    if (!ㅅ.런처로그인) { 금(); 줄("로그아웃", async () => { await 회원.나가기(); }, "빨강"); }
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
    단추.textContent = ㅅ.들어왔나 ? (ㅅ.별명 || "별명 정하기") : "로그인";
    단추.classList.toggle("들어옴", !!ㅅ.들어왔나);
    if (가입단) 가입단.hidden = true;          // ★ 머리줄 「가입」 은 없앴다 — 로그인 창 안 「회원 가입」 으로
    document.body.classList.toggle("회원", !!ㅅ.들어왔나);
    document.body.dataset.등급 = ㅅ.들어왔나 ? (ㅅ.등급 || "member") : "";
  }
  회원.듣기(단추칠하기);
  단추칠하기(회원.상태());
})();
