// ============================================================
//  유튜브 채널에서 가져오기 — 영상 + 올려 둔 완성 자막  (2026-09-22 · 사용자가 정함)
// ============================================================
//
//  사용자가 정한 것:
//    「이미 유튜브에 있는 영상은 이 홈페이지에 가져 올수 있고,
//      이미 업로드된 완성된 자막 파일을 가져 올수 있게 하라」
//
//  ★ 형 컴퓨터(8777) 화면에서만 뜬다. 유튜브는 자막 파일을 채널 주인한테만 준다.
//    일은 서버.js 의 /유튜브/… 가 한다. 여기는 고르고 누르는 자리다.
//  ★ 유튜브 허락이 낡았으면 「유튜브 허락 받기」 단추가 뜬다. 누르면 그때만 구글 창이 뜬다.

(() => {
  const 여는단추 = document.getElementById("유튜브에서단추");
  const 막 = document.getElementById("유튜브막");
  if (!여는단추 || !막 || !window.주인인가) return;
  const 단원칸 = document.getElementById("유튜브단원");
  const 목록칸 = document.getElementById("유튜브목록");
  const 다보기 = document.getElementById("유튜브다보기");
  const 말 = document.getElementById("유튜브말");
  const 하기 = document.getElementById("유튜브하기");
  const 허락 = document.getElementById("유튜브허락");
  const 닫기단 = document.getElementById("유튜브닫기");

  let 영상들 = [];
  let 도는중 = false;

  // 선생님 · 관리자로 로그인했을 때만 단추를 보인다 (올리기와 같은 조건)
  const 칠하기 = ㅅ => { 여는단추.hidden = !(window.저장소가원본 && ㅅ.들어왔나 && (ㅅ.등급 === "teacher" || ㅅ.등급 === "admin")); };
  if (window.회원) { 회원.듣기(칠하기); 칠하기(회원.상태()); }

  function 말하기(글, 결) {
    말.textContent = 글 || "";
    말.style.color = 결 === "탈" ? "#e08b96" : 결 === "됨" ? "var(--악센트)" : "";
  }

  function 단원채우기() {
    단원칸.replaceChildren(new Option("— 단원을 골라라 —", ""));
    (function 걷기(가지, 깊이) {
      (가지 || []).forEach(ㅁ => {
        단원칸.appendChild(new Option("  ".repeat(깊이) + (깊이 ? "└ " : "") + ㅁ.이름, ㅁ.아이디));
        걷기(ㅁ.아래, 깊이 + 1);
      });
    })(나무.목록, 0);
    try { if (typeof 고른아이디 !== "undefined" && 고른아이디) 단원칸.value = 고른아이디; } catch (오류) {}
  }

  function 목록그리기() {
    목록칸.replaceChildren();
    const 보일것 = 영상들.filter(ㅇ => 다보기.checked || !ㅇ.사이트에있나);
    if (!보일것.length) {
      const ㄱ = document.createElement("li");
      ㄱ.className = "유튜브빔";
      ㄱ.textContent = 영상들.length ? "사이트에 없는 영상이 없다 — 다 가져왔다" : "";
      목록칸.appendChild(ㄱ);
      return;
    }
    보일것.forEach(ㅇ => {
      const 줄 = document.createElement("li");
      줄.className = "유튜브줄" + (ㅇ.사이트에있나 ? " 있음" : "");
      const 틀 = document.createElement("label");
      const 칸 = document.createElement("input");
      칸.type = "checkbox"; 칸.value = ㅇ.아이디; 칸.disabled = !!ㅇ.사이트에있나;
      const 사진 = document.createElement("img");
      사진.src = "https://i.ytimg.com/vi/" + ㅇ.아이디 + "/default.jpg"; 사진.alt = ""; 사진.loading = "lazy";
      const 글 = document.createElement("span");
      글.className = "유튜브글";
      글.textContent = ㅇ.제목;
      const 잔 = document.createElement("span");
      잔.className = "유튜브잔";
      잔.textContent = (ㅇ.올린때 || "").slice(0, 10) + (ㅇ.공개 === "unlisted" ? " · 일부 공개" : ㅇ.공개 === "private" ? " · 비공개" : "") +
                       (ㅇ.사이트에있나 ? " · 이미 있음" : "");
      글.appendChild(잔);
      const 결과 = document.createElement("span");
      결과.className = "유튜브결과";
      결과.dataset.아이디 = ㅇ.아이디;
      틀.append(칸, 사진, 글);
      줄.append(틀, 결과);
      목록칸.appendChild(줄);
    });
  }

  async function 목록받기() {
    말하기("유튜브 채널을 읽는 중…");
    허락.hidden = true;
    영상들 = [];
    목록그리기();
    try {
      const ㄹ = await (await fetch("/유튜브/목록", { cache: "no-store" })).json();
      if (!ㄹ.됐나) {
        const 허락탈 = /허락/.test(ㄹ.왜 || "");
        허락.hidden = !허락탈;
        return 말하기((ㄹ.왜 || "못 읽었다") + (허락탈 ? " — 아래 「유튜브 허락 받기」 를 눌러라" : ""), "탈");
      }
      영상들 = ㄹ.영상 || [];
      const 없는것 = 영상들.filter(ㅇ => !ㅇ.사이트에있나).length;
      말하기("「" + (ㄹ.채널 || "채널") + "」 영상 " + 영상들.length + "편 · 사이트에 없는 것 " + 없는것 + "편");
      목록그리기();
    } catch (오류) {
      말하기("8777 서버에 못 닿았다 — 세진 과학을 다시 켜라", "탈");
    }
  }

  async function 허락받기() {
    허락.disabled = true;
    말하기("브라우저에 구글 허락 창이 떴다. 세진 과학 채널 계정을 고르고 「허용」 을 눌러라. (5분 기다린다)");
    try {
      const ㄹ = await (await fetch("/유튜브/허락", { method: "POST" })).json();
      if (ㄹ.됐나) { 말하기("허락 받았다", "됨"); await 목록받기(); }
      else 말하기("허락을 못 받았다 — " + (ㄹ.왜 || ""), "탈");
    } catch (오류) { 말하기("허락을 못 받았다 — " + 오류.message, "탈"); }
    finally { 허락.disabled = false; }
  }

  async function 가져오기() {
    if (도는중) return;
    const 고른것 = [...목록칸.querySelectorAll("input[type=checkbox]:checked")].map(ㄱ => ㄱ.value);
    if (!고른것.length) return 말하기("가져올 영상을 골라라", "탈");
    if (!단원칸.value) { 단원칸.focus(); return 말하기("과목과 세부 과목을 골라라", "탈"); }
    도는중 = true; 하기.disabled = true;
    let 된것 = 0;
    for (const [ㅈ, 아이디] of 고른것.entries()) {
      const 영상 = 영상들.find(ㅇ => ㅇ.아이디 === 아이디);
      const 자리 = 목록칸.querySelector('.유튜브결과[data-아이디="' + 아이디 + '"]');
      말하기("가져오는 중… " + (ㅈ + 1) + " / " + 고른것.length);
      if (자리) 자리.textContent = "가져오는 중…";
      try {
        const ㄹ = await (await fetch("/유튜브/가져오기", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 아이디, 단원: 단원칸.value, 제목: 영상 ? 영상.제목 : "" })
        })).json();
        if (ㄹ.됐나) { 된것++; if (영상) 영상.사이트에있나 = true; }
        if (자리) 자리.textContent = ㄹ.됐나 ? "글 " + ㄹ.글 + " · 자막 " + ㄹ.자막 : "못 했다 — " + ㄹ.왜;
      } catch (오류) {
        if (자리) 자리.textContent = "못 했다 — " + 오류.message;
      }
    }
    도는중 = false; 하기.disabled = false;
    말하기(된것 + "편 가져왔다. 닫으면 목록에 뜬다.", "됨");
    막.dataset.바뀜 = 된것 ? "1" : "";
  }

  function 열기() {
    const 과목칸 = document.getElementById("유튜브과목");
    let 지금단원 = "";
    try { 지금단원 = (typeof 고른아이디 !== "undefined" && 고른아이디) || ""; } catch (오류) {}
    if (과목칸 && window.과목단원고르개) 과목단원고르개(과목칸, document.getElementById("유튜브세부"), 단원칸, 지금단원); else 단원채우기();
    막.hidden = false;
    목록받기();
  }
  function 닫기() {
    막.hidden = true;
    if (막.dataset.바뀜) location.reload();       // 새 글·자막을 저장소에서 다시 받는다
  }

  여는단추.addEventListener("click", () => {
    const 올리기막 = document.getElementById("올리기막");
    if (올리기막) 올리기막.hidden = true;
    열기();
  });
  다보기.addEventListener("change", 목록그리기);
  하기.addEventListener("click", 가져오기);
  허락.addEventListener("click", 허락받기);
  닫기단.addEventListener("click", 닫기);
  막.addEventListener("click", ㄴ => { if (ㄴ.target === 막 && !도는중) 닫기(); });
})();
