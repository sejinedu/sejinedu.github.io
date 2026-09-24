// ============================================================
//  선생 관리 — 학원 원장 · 「초대」 권한이 있는 사람  (2026-09-24 · 로그인 화면 규격, 런처와 같게)
// ============================================================
//
//  사장님: 「로그인 구성은 홈피와 런처가 동일하게」 — 런처 드롭바에 있는 「선생 관리」 를 홈피에도 둔다.
//  ★ 규칙은 서버가 건다 (지침서 `2단계 표-학원.sql`). 여기는 학원_목록 · 학원_초대 · 학원_정지 · 학원_빼기 ·
//    학원_만들기 를 부르는 화면일 뿐이다. 초대는 메일 하나 — 권한은 각 앱에서 정한다.
//  ★ 학원이 없는 선생님 등급 이상이면 「학원 만들기」 로 연다.

const 선생관리 = (() => {
  const 칸 = document.getElementById("선생관리");
  if (!칸 || !window.회원) return { 열기() {}, 닫기() {} };

  const 만들기 = (태그, 이름, 글) => { const ㄱ = document.createElement(태그); if (이름) ㄱ.className = 이름; if (글 != null) ㄱ.textContent = 글; return ㄱ; };
  const 알림 = 글 => { try { 쪽지(글); } catch (오류) {} };
  const 학원 = () => (회원.상태().학원) || null;

  // ★ 초대는 메일 하나 + 런처 받는 곳 카톡 글 뿐이다 (2026-09-24 사용자:
  //   「너무 복잡한데? 그냥 메일, 그리고 세도비 런처 파일링만 보내주는걸로 해라. 각 권한은 각 앱에서 권한 설정 할수 있게 해」)
  //   소속 · 맡은 반 · 권한은 여기서 안 정한다 — 각 앱(런처 쪽)이 정한다. 초대할 때는 가장 좁은 권한(자기 반)만 준다.
  const 런처받는곳 = "https://pub-cdafc1e706964b9c84ebcdd306dd79f0.r2.dev/launcher/sedobi-setup.exe";
  const 메일꼴 = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function 머리그리기(글, 부제) {
    칸.replaceChildren();
    const 머리 = 만들기("div", "목록머리");
    const 띠 = 만들기("nav", "교과띠");
    const 탭 = 만들기("button", "메뉴칸 켜짐", "선생 관리"); 탭.type = "button";
    띠.appendChild(탭); 머리.appendChild(띠); 칸.appendChild(머리);
    const 윗줄 = 만들기("div", "판윗줄");
    const 길 = 만들기("div", "길줄"); 길.appendChild(만들기("span", "", 글));
    if (부제) { const 사이 = 만들기("span", "길사이", "›"); 길.append(사이, 만들기("span", "", 부제)); }
    윗줄.appendChild(길); 칸.appendChild(윗줄);
  }
  const 말줄 = () => { const ㄱ = 만들기("p", "회원말"); 칸.appendChild(ㄱ); return (글, 결) => { ㄱ.textContent = 글 || ""; ㄱ.className = "회원말" + (결 ? " " + 결 : ""); }; };

  async function 열기() {
    const ㅅ = 회원.상태();
    if (!ㅅ.들어왔나) return;
    try { 격자로(); } catch (오류) {}
    try { if (window.회원관리) 회원관리.닫기(); } catch (오류) {}
    document.getElementById("격자보기").hidden = true;
    칸.hidden = false;
    window.scrollTo({ top: 0 });
    머리그리기("선생 관리");
    칸.appendChild(만들기("p", "회원말", "불러오는 중…"));
    await 회원.학원읽기();
    const 학 = 학원();
    if (!학 || 학.상태 !== "활성") return 학원만들기그리기();
    if (!(학.원장인가 || (학.권한 && 학.권한.초대))) {
      머리그리기("선생 관리");
      칸.appendChild(만들기("p", "회원말 탈", "선생 관리는 원장이나 「초대」 권한이 있는 사람만 연다."));
      return;
    }
    let 목록 = [];
    try {
      목록 = await 회원.학원부르기("학원_목록");
    } catch (오류) {
      머리그리기("선생 관리");
      칸.appendChild(만들기("p", "회원말 탈", "못 불러왔다 — " + 오류.message));
      return;
    }
    선생그리기(Array.isArray(목록) ? 목록 : []);
  }
  function 닫기() { 칸.hidden = true; 칸.replaceChildren(); }

  // ---------- 학원 만들기 ----------
  function 학원만들기그리기() {
    머리그리기("선생 관리", "학원 만들기");
    const ㅅ = 회원.상태();
    if (ㅅ.등급 !== "teacher" && ㅅ.등급 !== "admin") {
      칸.appendChild(만들기("p", "회원말 탈", "학원은 선생님 등급부터 만든다."));
      return;
    }
    칸.appendChild(만들기("p", "선생풀이", "아직 학원이 없다. 학원을 만들면 원장이 되고, 선생님을 초대할 수 있다.\n지금 쓰는 학생 · 문제 · 디자인 자료가 그대로 학원 자료가 된다."));
    const 틀 = 만들기("div", "선생틀");
    const 이름칸 = document.createElement("input"); 이름칸.type = "text"; 이름칸.maxLength = 40; 이름칸.placeholder = "학원 이름 (예: 세진과학)";
    const 단 = 만들기("button", "선생큰단추", "학원 만들기"); 단.type = "button";
    틀.append(이름칸, 단); 칸.appendChild(틀);
    const 말 = 말줄();
    단.addEventListener("click", async () => {
      if (!이름칸.value.trim()) { 말("학원 이름을 넣어라", "탈"); 이름칸.focus(); return; }
      단.disabled = true; 말("만드는 중…");
      try { await 회원.학원부르기("학원_만들기", { p_이름: 이름칸.value.trim() }); await 회원.학원읽기(); 알림("학원을 만들었다"); 열기(); }
      catch (오류) { 말("못 만들었다 — " + 오류.message, "탈"); 단.disabled = false; }
    });
    setTimeout(() => 이름칸.focus(), 30);
  }

  // ---------- 선생님 목록 ----------
  function 선생그리기(목록) {
    const 학 = 학원();
    머리그리기("선생 관리", (학.학원이름 || "학원") + " · " + (학.원장인가 ? "원장" : (학.소속이름 || "")));
    const 말 = 말줄();
    const 표 = 만들기("div", "글표 회원표 선생표");
    표.innerHTML = '<div class="글표머리"><span class="칸제목">이름</span><span class="칸메일">메일</span><span class="칸소속">소속</span>' +
                   '<span class="칸상태">상태</span><span class="칸단추"></span></div>';
    목록.forEach(사람 => {
      const 원장줄 = 사람.소속이름 === "원장";
      const 줄 = 만들기("div", "글표줄 회원줄");
      const 이름칸 = 만들기("span", "칸제목");
      이름칸.appendChild(만들기("span", "글제목", 사람.닉네임 || (사람.들어왔나 ? "(닉네임 없음)" : "(아직 안 들어옴)")));
      줄.append(이름칸, 만들기("span", "칸메일", 사람.메일 || ""), 만들기("span", "칸소속", 사람.소속이름 || ""), 만들기("span", "칸상태", 사람.상태 || ""));
      const 단추칸 = 만들기("span", "칸단추");
      if (!원장줄) {
        const 단 = (글, 누르면, 결) => { const ㄷ = 만들기("button", "선생작은단추" + (결 ? " " + 결 : ""), 글); ㄷ.type = "button"; ㄷ.addEventListener("click", 누르면); 단추칸.appendChild(ㄷ); };
        단(사람.상태 === "정지" ? "정지 풀기" : "정지", async () => {
          try { await 회원.학원부르기("학원_정지", { p_메일: 사람.메일, p_정지: 사람.상태 !== "정지" }); 열기(); }
          catch (오류) { 말("못 했다 — " + 오류.message, "탈"); }
        });
        단("빼기", async () => {
          if (!confirm(사람.메일 + " 을(를) 학원에서 뺄까?\n그 사람이 만든 자료는 학원에 그대로 남는다.")) return;
          try { await 회원.학원부르기("학원_빼기", { p_메일: 사람.메일 }); 열기(); }
          catch (오류) { 말("못 뺐다 — " + 오류.message, "탈"); }
        }, "빨강");
      }
      줄.appendChild(단추칸);
      표.appendChild(줄);
    });
    if (!목록.length) 표.appendChild(만들기("div", "글표빔", "아직 아무도 없다"));
    칸.appendChild(표);

    // 초대 — 메일 한 칸 · 단추 하나
    const 틀 = 만들기("div", "선생틀 선생폼");
    틀.appendChild(만들기("p", "선생풀이", "선생님 초대 — 메일만 넣으면 된다. 누르면 런처 받는 곳이 적힌 카톡 글이 복사된다.\n권한은 각 앱에서 정한다."));
    const 줄 = 만들기("div", "선생틀");
    const 메일칸 = document.createElement("input"); 메일칸.type = "email"; 메일칸.placeholder = "선생님 메일"; 메일칸.autocomplete = "off";
    const 초대단 = 만들기("button", "선생큰단추", "초대하고 카톡 글 복사"); 초대단.type = "button";
    줄.append(메일칸, 초대단);
    const 틀말 = 만들기("p", "회원말");
    const 글상자 = 만들기("pre", "선생카톡"); 글상자.hidden = true;
    const 다시단 = 만들기("button", "선생작은단추", "다시 복사"); 다시단.type = "button"; 다시단.hidden = true;
    틀.append(줄, 틀말, 글상자, 다시단);
    칸.appendChild(틀);

    const 카톡글 = 메일 => "[" + (학.학원이름 || "학원") + "] 선생님 초대\n" +
      "1) 세도비 런처 설치: " + 런처받는곳 + "\n" +
      "2) 런처 오른쪽 위 「로그인」 → 「회원 가입」 → 이 메일로 가입: " + 메일 + "\n" +
      "   (이미 계정이 있으면 그 메일로 로그인)\n" +
      "3) 로그인하면 저절로 " + (학.학원이름 || "학원") + " 에 들어온다.";
    const 틀말쓰기 = (글, 결) => { 틀말.textContent = 글; 틀말.className = "회원말" + (결 ? " " + 결 : ""); };
    async function 복사() {
      try { await navigator.clipboard.writeText(글상자.textContent); 틀말쓰기("복사했다 — 카톡에 붙여 넣어라"); }
      catch (오류) { 틀말쓰기("복사를 못 했다 — 아래 글을 직접 긁어 가라", "탈"); }
    }
    다시단.addEventListener("click", 복사);
    초대단.addEventListener("click", async () => {
      const 메일 = 메일칸.value.trim().toLowerCase();
      if (!메일꼴.test(메일)) { 틀말쓰기("메일을 다시 봐라", "탈"); 메일칸.focus(); return; }
      글상자.textContent = 카톡글(메일);
      // ★ 이미 명단에 있으면 초대를 다시 보내지 않는다 — 앱에서 정해 둔 권한을 덮어쓰면 안 된다
      if (목록.some(사람 => String(사람.메일 || "").toLowerCase() === 메일)) {
        글상자.hidden = false; 다시단.hidden = false;
        await 복사(); 틀말쓰기("이미 명단에 있다 — 카톡 글만 복사했다");
        return;
      }
      초대단.disabled = true; 틀말쓰기("초대하는 중…");
      try {
        await 회원.학원부르기("학원_초대", { p_메일: 메일, p_소속이름: "선생님", p_권한: { 반범위: "자기" }, p_강사id: null });
      } catch (오류) { 틀말쓰기("못 했다 — " + 오류.message, "탈"); 초대단.disabled = false; return; }
      글상자.hidden = false; 다시단.hidden = false;
      await 복사();
      알림("초대했다 — 카톡에 붙여 넣어라");
      // 명단을 새로 받되 방금 복사한 글은 남긴다
      try { 목록 = await 회원.학원부르기("학원_목록"); } catch (오류) {}
      const 남길글 = 글상자.textContent;
      선생그리기(Array.isArray(목록) ? 목록 : []);
      const 새글 = 칸.querySelector(".선생카톡"); if (새글) { 새글.textContent = 남길글; 새글.hidden = false; }
      const 새다시 = [...칸.querySelectorAll(".선생폼 .선생작은단추")].pop(); if (새다시) 새다시.hidden = false;
      const 새말 = 칸.querySelector(".선생폼 .회원말"); if (새말) 새말.textContent = "초대했다 — 복사한 글을 카톡에 붙여 넣어라";
    });
    메일칸.addEventListener("keydown", 이 => { if (이.key === "Enter") 초대단.click(); });
  }

  // 로그아웃하면 닫는다
  회원.듣기(ㅅ => { if (!칸.hidden && !ㅅ.들어왔나) { 닫기(); try { 홈으로(); } catch (오류) {} } });

  return { 열기, 닫기 };
})();
window.선생관리 = 선생관리;
