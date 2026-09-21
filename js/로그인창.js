// ============================================================
//  로그인 창 — 메일 → 번호 → (처음이면) 별명  (2026-09-22)
// ============================================================
//
//  ★ 한 창에서 세 걸음을 차례로 보여 준다. 걸음마다 칸 하나, 단추 하나.
//  ★ 로그인하면 머리줄 단추가 별명으로 바뀐다. 누르면 「나가기」 를 묻는다.
//  ★ 별명이 없으면 로그인한 뒤에도 이 창이 별명 걸음으로 다시 뜬다 —
//    댓글에 이름 없이 「회원」 으로만 나오면 누가 쓴 건지 모른다.

(() => {
  if (!window.회원) return;

  const 단추 = document.getElementById("로그인단추");
  const 막   = document.getElementById("로그인막");
  const 설명 = document.getElementById("로그인설명");
  const 메일칸 = document.getElementById("메일칸"), 메일 = document.getElementById("로그인메일");
  const 번호칸 = document.getElementById("번호칸"), 번호 = document.getElementById("로그인번호");
  const 별명칸 = document.getElementById("별명칸"), 별명 = document.getElementById("로그인별명");
  const 말   = document.getElementById("로그인말");
  const 하기 = document.getElementById("로그인하기");
  const 취소 = document.getElementById("로그인취소");
  if (!단추 || !막) return;

  const 등급이름 = { admin: "관리자", teacher: "선생님", member: "일반 회원" };
  let 걸음 = "메일";          // 메일 · 번호 · 별명 · 나
  let 받은메일 = "";
  let 도는중 = false;

  function 말하기(글, 결) {
    말.textContent = 글 || "";
    말.style.color = 결 === "탈" ? "#e08b96" : 결 === "됨" ? "var(--악센트)" : "";
  }

  function 걸음보이기(새걸음) {
    걸음 = 새걸음;
    메일칸.hidden = 걸음 !== "메일";
    번호칸.hidden = 걸음 !== "번호";
    별명칸.hidden = 걸음 !== "별명";
    const ㅅ = 회원.상태();
    if (걸음 === "메일") {
      설명.textContent = "세도비 계정 메일을 넣어라. 처음이면 그대로 가입된다.";
      하기.textContent = "번호 받기"; 하기.hidden = false; 취소.textContent = "닫기";
      setTimeout(() => 메일.focus(), 30);
    } else if (걸음 === "번호") {
      설명.textContent = 받은메일 + " 로 여섯 자리 번호를 보냈다. 메일함(스팸함도)을 봐라.";
      하기.textContent = "들어가기"; 취소.textContent = "메일 다시 쓰기";
      번호.value = "";
      setTimeout(() => 번호.focus(), 30);
    } else if (걸음 === "별명") {
      설명.textContent = "처음 왔다. 댓글에 쓸 별명을 정해라.";
      하기.textContent = "정하기"; 취소.textContent = "나중에";
      별명.value = ㅅ.별명 || "";
      setTimeout(() => 별명.focus(), 30);
    } else {
      설명.textContent = (ㅅ.별명 || "이름 없음") + " · " + (등급이름[ㅅ.등급] || "일반 회원") + " · " + ㅅ.메일;
      하기.textContent = "로그아웃"; 취소.textContent = "닫기";
    }
  }

  function 열기() {
    말하기("");
    const ㅅ = 회원.상태();
    if (!ㅅ.들어왔나) 걸음보이기("메일");
    else if (!ㅅ.별명) 걸음보이기("별명");
    else 걸음보이기("나");
    막.hidden = false;
  }
  function 닫기() { 막.hidden = true; 도는중 = false; 하기.disabled = false; }

  async function 누름() {
    if (도는중) return;
    도는중 = true; 하기.disabled = true;
    try {
      if (걸음 === "메일") {
        말하기("보내는 중…");
        받은메일 = await 회원.번호받기(메일.value);
        말하기("");
        걸음보이기("번호");
      } else if (걸음 === "번호") {
        말하기("확인하는 중…");
        const ㅅ = await 회원.번호넣기(받은메일, 번호.value);
        말하기("");
        if (!ㅅ.별명) 걸음보이기("별명");
        else { 말하기("들어왔다", "됨"); setTimeout(닫기, 600); }
      } else if (걸음 === "별명") {
        말하기("정하는 중…");
        await 회원.별명정하기(별명.value);
        말하기("정했다", "됨");
        setTimeout(닫기, 600);
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
    if (/rate limit|too many|seconds/i.test(ㄱ)) return "너무 자주 눌렀다. 1분쯤 있다가 다시 해라. (" + ㄱ + ")";
    if (/expired|invalid|otp/i.test(ㄱ)) return "번호가 틀렸거나 시간이 지났다. 다시 받아라.";
    if (/Failed to fetch|NetworkError/i.test(ㄱ)) return "인터넷이 안 된다. 연결을 보고 다시 해라.";
    if (/Signups not allowed/i.test(ㄱ)) return "지금은 새 가입을 막아 놨다. 선생님께 물어봐라.";
    return ㄱ;
  }

  하기.addEventListener("click", 누름);
  취소.addEventListener("click", () => {
    if (걸음 === "번호") { 말하기(""); 걸음보이기("메일"); } else 닫기();
  });
  막.addEventListener("click", ㄴ => { if (ㄴ.target === 막) 닫기(); });
  [메일, 번호, 별명].forEach(칸 => 칸.addEventListener("keydown", ㄴ => {
    if (ㄴ.key === "Enter") { ㄴ.preventDefault(); 누름(); }
    if (ㄴ.key === "Escape") 닫기();
  }));
  번호.addEventListener("input", () => {
    번호.value = 번호.value.replace(/\D/g, "").slice(0, 6);
    if (번호.value.length === 6) 누름();       // 여섯 자리가 차면 저절로 들어간다
  });
  단추.addEventListener("click", 열기);

  // 머리줄 단추 — 로그인 전엔 「로그인」, 뒤엔 별명
  function 단추칠하기(ㅅ) {
    단추.textContent = ㅅ.들어왔나 ? (ㅅ.별명 || "별명 정하기") : "로그인";
    단추.classList.toggle("들어옴", !!ㅅ.들어왔나);
    document.body.classList.toggle("회원", !!ㅅ.들어왔나);
    document.body.dataset.등급 = ㅅ.들어왔나 ? (ㅅ.등급 || "member") : "";
  }
  회원.듣기(단추칠하기);
  단추칠하기(회원.상태());
})();
