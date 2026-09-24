// ============================================================
//  초대 관리 — 받은 초대 · 들어간 채널 · 내 채널  (2026-09-24 · 로그인 화면 규격 「채널 판」, 런처와 같게)
// ============================================================
//
//  사장님: 「초대 개념을 개편한다. 1. 가입은 그냥 개별로 한다. 2. 그래서 각각 자신만의 개별 세도비 프로그램들을 갖는거야.
//          3. 그리고 각 개인은 사람을 초대한다. 그럼 초대 받은 사람에 초대한 사람의 채널로 들어가는 … 5. 각 개인의 프로그램은 독립적」
//        → 「3번은 앱마다 선택할 수 있게 해라 … 그리고 개인이 자신의 채널에 있는 사람들 탈퇴 시킬수도 있게 만들고」
//  ★ 누구나 연다 — 가입하면 제 채널이 저절로 생긴다. 계정(내 채널)이 정지됐으면 막는다(관리자는 늘).
//  ★ 초대는 「받기」 를 눌러야 들어간다. 어느 채널로 앱을 열지는 런처가 앱마다 묻는다 — 홈피는 받고·거절하고·나가기만.
//  ★ 규칙은 서버가 건다 (지침서 `3단계 표-채널.sql`). 여기는 채널_목록 · 채널_받기 · 채널_거절 · 채널_나가기 ·
//    학원_이름바꾸기 · 학원_목록 · 학원_초대 · 학원_정지 · 학원_빼기 를 부르는 화면일 뿐이다(관리 함수는 p_주인 없이 = 내 채널).
//  ★ 권한은 각 앱에서 정한다 (학원_권한고치기) — 여기서는 초대할 때 가장 좁은 권한(자기 반)만 준다.

const 초대관리 = (() => {
  const 칸 = document.getElementById("초대관리");
  if (!칸 || !window.회원) return { 열기() {}, 닫기() {} };

  const 만들기 = (태그, 이름, 글) => { const ㄱ = document.createElement(태그); if (이름) ㄱ.className = 이름; if (글 != null) ㄱ.textContent = 글; return ㄱ; };
  const 알림 = 글 => { try { 쪽지(글); } catch (오류) {} };
  // 카톡 글은 exe 주소가 아니라 받기 쪽 — 「Windows의 PC 보호 → 추가 정보 → 실행」 안내가 거기 있다 (규격, 2026-09-24)
  const 런처받는곳 = "https://sejinedu.github.io/download.html";
  const 메일꼴 = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function 머리그리기() {
    칸.replaceChildren();
    const 머리 = 만들기("div", "목록머리");
    const 띠 = 만들기("nav", "교과띠");
    const 탭 = 만들기("button", "메뉴칸 켜짐", "초대 관리"); 탭.type = "button";
    띠.appendChild(탭); 머리.appendChild(띠); 칸.appendChild(머리);
    const 윗줄 = 만들기("div", "판윗줄");
    const 길 = 만들기("div", "길줄"); 길.appendChild(만들기("span", "", "초대 관리"));
    윗줄.appendChild(길); 칸.appendChild(윗줄);
  }
  const 말줄 = () => { const ㄱ = 만들기("p", "회원말"); 칸.appendChild(ㄱ); return (글, 결) => { ㄱ.textContent = 글 || ""; ㄱ.className = "회원말" + (결 ? " " + 결 : ""); }; };
  const 채널글 = ㄱ => (ㄱ.이름 || "채널") + (ㄱ.주인닉네임 ? " (" + ㄱ.주인닉네임 + ")" : "");

  async function 열기() {
    const ㅅ = 회원.상태();
    if (!ㅅ.들어왔나) return;
    try { 격자로(); } catch (오류) {}
    try { if (window.회원관리) 회원관리.닫기(); } catch (오류) {}
    document.getElementById("격자보기").hidden = true;
    칸.hidden = false;
    window.scrollTo({ top: 0 });
    머리그리기();
    칸.appendChild(만들기("p", "회원말", "불러오는 중…"));
    await 회원.채널읽기();
    const 새상태 = 회원.상태();
    if (!새상태.채널) { 머리그리기(); 칸.appendChild(만들기("p", "회원말 탈", "채널을 못 불러왔다 — 잠시 뒤에 다시 열어라.")); return; }
    const 줄들 = 새상태.채널.목록 || [];
    const 내것 = 줄들.find(ㄱ => ㄱ.내것);
    if (내것 && 내것.정지 && 새상태.등급 !== "admin") { 머리그리기(); 칸.appendChild(만들기("p", "회원말 탈", "계정이 정지됐다 — 관리자에게 물어라.")); return; }
    let 명단 = [];
    try { const ㄹ = await 회원.학원부르기("학원_목록"); 명단 = Array.isArray(ㄹ) ? ㄹ : []; } catch (오류) {}
    그리기(줄들, 내것, 명단);
  }
  function 닫기() { 칸.hidden = true; 칸.replaceChildren(); }

  function 절(제목) {
    const 틀 = 만들기("section", "초대절");
    틀.appendChild(만들기("h3", "초대절제목", 제목));
    칸.appendChild(틀);
    return 틀;
  }
  function 줄단추(단추칸, 글, 누르면, 결) {
    const ㄷ = 만들기("button", (결 === "큰" ? "선생큰단추" : "선생작은단추") + (결 === "빨강" ? " 빨강" : ""), 글); ㄷ.type = "button";
    ㄷ.addEventListener("click", async () => { ㄷ.disabled = true; try { await 누르면(); } finally { ㄷ.disabled = false; } });
    단추칸.appendChild(ㄷ); return ㄷ;
  }

  function 그리기(줄들, 내것, 명단) {
    머리그리기();
    const 말 = 말줄();
    const 해보기 = async (일, 됐을때) => {
      try { await 일(); if (됐을때) 알림(됐을때); 열기(); }
      catch (오류) { 말("못 했다 — " + 오류.message, "탈"); }
    };

    // ---------- 받은 초대 ----------
    const 받은 = 줄들.filter(ㄱ => !ㄱ.내것 && ㄱ.상태 === "초대");
    if (받은.length) {
      const 틀 = 절("받은 초대 " + 받은.length);
      받은.forEach(ㄱ => {
        const 줄 = 만들기("div", "초대줄");
        줄.appendChild(만들기("span", "초대줄글", 채널글(ㄱ) + " — " + [ㄱ.소속이름, ㄱ.초대한이].filter(Boolean).join(" · ")));
        const 단추칸 = 만들기("span", "초대줄단추");
        줄단추(단추칸, "받기", () => 해보기(() => 회원.학원부르기("채널_받기", { p_주인: ㄱ.주인 }), "「" + (ㄱ.이름 || "채널") + "」 에 들어갔다"), "큰");
        줄단추(단추칸, "거절", async () => {
          if (!confirm("「" + 채널글(ㄱ) + "」 초대를 거절할까?")) return;
          await 해보기(() => 회원.학원부르기("채널_거절", { p_주인: ㄱ.주인 }), "초대를 거절했다");
        });
        줄.appendChild(단추칸); 틀.appendChild(줄);
      });
    }

    // ---------- 들어간 채널 ----------
    const 들어간 = 줄들.filter(ㄱ => !ㄱ.내것 && ㄱ.상태 !== "초대");
    if (들어간.length) {
      const 틀 = 절("들어간 채널");
      들어간.forEach(ㄱ => {
        const 줄 = 만들기("div", "초대줄");
        줄.appendChild(만들기("span", "초대줄글", 채널글(ㄱ) + " — " + (ㄱ.소속이름 || "") + (ㄱ.상태 === "정지" ? " · 정지됨" : "")));
        const 단추칸 = 만들기("span", "초대줄단추");
        줄단추(단추칸, "나가기", async () => {
          if (!confirm("「" + 채널글(ㄱ) + "」 에서 나갈까?\n그 채널 앱을 못 연다. 다시 들어가려면 초대를 또 받아야 한다.")) return;
          await 해보기(() => 회원.학원부르기("채널_나가기", { p_주인: ㄱ.주인 }), "채널에서 나왔다");
        }, "빨강");
        줄.appendChild(단추칸); 틀.appendChild(줄);
      });
    }

    // ---------- 내 채널 ----------
    const 틀 = 절("내 채널");
    const 이름줄 = 만들기("div", "선생틀");
    const 이름칸 = document.createElement("input"); 이름칸.type = "text"; 이름칸.maxLength = 40; 이름칸.placeholder = "내 채널 이름"; 이름칸.value = (내것 && 내것.이름) || "";
    이름줄.appendChild(이름칸);
    줄단추(이름줄, "이름 바꾸기", async () => {
      const 새이름 = 이름칸.value.trim();
      if (!새이름) { 말("채널 이름을 넣어라", "탈"); 이름칸.focus(); return; }
      await 해보기(() => 회원.학원부르기("학원_이름바꾸기", { p_이름: 새이름 }), "채널 이름을 「" + 새이름 + "」 (으)로 바꿨다");
    });
    틀.appendChild(이름줄);

    const 내메일 = String(회원.상태().메일 || "").toLowerCase();
    const 표 = 만들기("div", "글표 회원표 선생표");
    표.innerHTML = '<div class="글표머리"><span class="칸제목">이름</span><span class="칸메일">메일</span><span class="칸소속">소속</span>' +
                   '<span class="칸상태">상태</span><span class="칸단추"></span></div>';
    명단.forEach(사람 => {
      const 주인줄 = 사람.소속이름 === "원장" || String(사람.메일 || "").toLowerCase() === 내메일;
      const 줄 = 만들기("div", "글표줄 회원줄");
      const 이름 = 만들기("span", "칸제목");
      이름.appendChild(만들기("span", "글제목", 사람.닉네임 || (사람.들어왔나 ? "(닉네임 없음)" : "(아직 안 받음)")));
      줄.append(이름, 만들기("span", "칸메일", 사람.메일 || ""), 만들기("span", "칸소속", 사람.소속이름 || ""), 만들기("span", "칸상태", 사람.상태 || ""));
      const 단추칸 = 만들기("span", "칸단추");
      if (!주인줄) {
        줄단추(단추칸, 사람.상태 === "정지" ? "정지 풀기" : "정지",
          () => 해보기(() => 회원.학원부르기("학원_정지", { p_메일: 사람.메일, p_정지: 사람.상태 !== "정지" })));
        줄단추(단추칸, "탈퇴시키기", async () => {
          if (!confirm(사람.메일 + " 을(를) 내 채널에서 탈퇴시킬까?\n그 사람이 만든 자료는 채널에 그대로 남는다.")) return;
          await 해보기(() => 회원.학원부르기("학원_빼기", { p_메일: 사람.메일 }), "탈퇴시켰다");
        }, "빨강");
      }
      줄.appendChild(단추칸);
      표.appendChild(줄);
    });
    if (!명단.length) 표.appendChild(만들기("div", "글표빔", "아직 아무도 없다"));
    틀.appendChild(표);

    // 초대 — 메일 한 칸 · 단추 하나
    const 폼 = 만들기("div", "선생틀 선생폼");
    폼.appendChild(만들기("p", "선생풀이", "초대 — 메일만 넣으면 된다. 누르면 런처 받는 곳이 적힌 카톡 글이 복사된다.\n받은 사람이 「받기」 를 눌러야 들어온다. 권한은 각 앱에서 정한다."));
    const 폼줄 = 만들기("div", "선생틀");
    const 메일칸 = document.createElement("input"); 메일칸.type = "email"; 메일칸.placeholder = "초대할 사람 메일"; 메일칸.autocomplete = "off";
    const 초대단 = 만들기("button", "선생큰단추", "초대하고 카톡 글 복사"); 초대단.type = "button";
    폼줄.append(메일칸, 초대단);
    const 폼말 = 만들기("p", "회원말");
    const 글상자 = 만들기("pre", "선생카톡"); 글상자.hidden = true;
    const 다시단 = 만들기("button", "선생작은단추", "다시 복사"); 다시단.type = "button"; 다시단.hidden = true;
    폼.append(폼줄, 폼말, 글상자, 다시단);
    틀.appendChild(폼);

    const 채널이름 = (내것 && 내것.이름) || "내 채널";
    const 카톡글 = 메일 => "[" + 채널이름 + "] 세도비 채널 초대\n" +
      "1) 세도비 런처 받기: " + 런처받는곳 + "\n" +
      "2) 로그인(없으면 회원 가입) — 이 메일로: " + 메일 + "\n" +
      "3) 로그인한 뒤 이름 → 「초대 관리」 → 받은 초대에서 「받기」\n" +
      "4) 앱을 누르면 채널을 골라 연다";
    const 폼말쓰기 = (글, 결) => { 폼말.textContent = 글; 폼말.className = "회원말" + (결 ? " " + 결 : ""); };
    async function 복사() {
      try { await navigator.clipboard.writeText(글상자.textContent); 폼말쓰기("복사했다 — 카톡에 붙여 넣어라"); }
      catch (오류) { 폼말쓰기("복사를 못 했다 — 아래 글을 직접 긁어 가라", "탈"); }
    }
    다시단.addEventListener("click", 복사);
    초대단.addEventListener("click", async () => {
      const 메일 = 메일칸.value.trim().toLowerCase();
      if (!메일꼴.test(메일)) { 폼말쓰기("메일을 다시 봐라", "탈"); 메일칸.focus(); return; }
      if (메일 === 내메일) { 폼말쓰기("내 메일이다 — 다른 사람 메일을 넣어라", "탈"); return; }
      글상자.textContent = 카톡글(메일);
      // ★ 이미 명단에 있으면 초대를 다시 보내지 않는다 — 앱에서 정해 둔 권한을 덮어쓰면 안 된다
      if (명단.some(사람 => String(사람.메일 || "").toLowerCase() === 메일)) {
        글상자.hidden = false; 다시단.hidden = false;
        await 복사(); 폼말쓰기("이미 명단에 있다 — 카톡 글만 복사했다");
        return;
      }
      초대단.disabled = true; 폼말쓰기("초대하는 중…");
      try {
        await 회원.학원부르기("학원_초대", { p_메일: 메일, p_소속이름: "선생님", p_권한: { 반범위: "자기" }, p_강사id: null });
      } catch (오류) { 폼말쓰기("못 했다 — " + 오류.message, "탈"); 초대단.disabled = false; return; }
      글상자.hidden = false; 다시단.hidden = false;
      await 복사();
      알림("초대했다 — 카톡에 붙여 넣어라");
      // 명단에 새 줄을 넣되 방금 복사한 글은 남긴다
      명단 = 명단.concat([{ 메일, 닉네임: null, 소속이름: "선생님", 상태: "초대", 들어왔나: false }]);
      const 남길글 = 글상자.textContent;
      그리기(줄들, 내것, 명단);
      const 새폼 = 칸.querySelector(".선생폼");
      if (새폼) {
        const 새글 = 새폼.querySelector(".선생카톡"); 새글.textContent = 남길글; 새글.hidden = false;
        [...새폼.querySelectorAll(".선생작은단추")].pop().hidden = false;
        const 새말 = 새폼.querySelector(".회원말"); 새말.textContent = "초대했다 — 복사한 글을 카톡에 붙여 넣어라";
        새폼.scrollIntoView({ block: "nearest" });
      }
    });
    메일칸.addEventListener("keydown", 이 => { if (이.key === "Enter") 초대단.click(); });
  }

  // 로그아웃하면 닫는다
  회원.듣기(ㅅ => { if (!칸.hidden && !ㅅ.들어왔나) { 닫기(); try { 홈으로(); } catch (오류) {} } });

  return { 열기, 닫기 };
})();
window.초대관리 = 초대관리;
