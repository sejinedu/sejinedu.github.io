// ============================================================
//  선생 관리 — 학원 원장 · 「초대」 권한이 있는 사람  (2026-09-24 · 로그인 화면 규격, 런처와 같게)
// ============================================================
//
//  사장님: 「로그인 구성은 홈피와 런처가 동일하게」 — 런처 드롭바에 있는 「선생 관리」 를 홈피에도 둔다.
//  ★ 규칙은 서버가 건다 (지침서 `2단계 표-학원.sql`). 여기는 학원_목록 · 학원_초대 · 학원_정지 · 학원_빼기 ·
//    학원_묶음목록 · 학원_묶음저장 · 학원_만들기 를 부르는 화면일 뿐이다. 런처 ui/계정.js 선생 관리와 같은 꼴이다.
//  ★ 학원이 없는 선생님 등급 이상이면 「학원 만들기」 로 연다.
//  ★ 맡은 반 · 지정 반은 **강사 폴더 id** 다. 폴더 목록은 런처(이 컴퓨터의 학생관리 자료)만 안다 —
//    홈피에서는 id 를 글로 넣는다. 고르기가 편한 건 런처 쪽이다.

const 선생관리 = (() => {
  const 칸 = document.getElementById("선생관리");
  if (!칸 || !window.회원) return { 열기() {}, 닫기() {} };

  const 만들기 = (태그, 이름, 글) => { const ㄱ = document.createElement(태그); if (이름) ㄱ.className = 이름; if (글 != null) ㄱ.textContent = 글; return ㄱ; };
  const 알림 = 글 => { try { 쪽지(글); } catch (오류) {} };
  const 학원 = () => (회원.상태().학원) || null;

  function 권한요약(권 = {}) {
    const ㄱ = [];
    ㄱ.push({ 자기: "자기 반", 지정: "지정 반 " + ((권.반들 || []).length) + "개", 전체: "전체 반" }[권.반범위 || "자기"] || "자기 반");
    if (권.학생고치기) ㄱ.push("학생 고치기");
    if (권.문제만들기) ㄱ.push("문제 만들기");
    if (권.문제지우기) ㄱ.push("문제 지우기");
    if (권.디자인편집) ㄱ.push("디자인 " + (권.디자인편집 === "전체" ? "전체" : (권.디자인편집 || []).join("·")));
    if (권.초대) ㄱ.push("초대");
    return ㄱ.join(" · ");
  }

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
    let 목록 = [], 묶음 = [];
    try {
      [목록, 묶음] = await Promise.all([회원.학원부르기("학원_목록"), 회원.학원부르기("학원_묶음목록").catch(() => [])]);
    } catch (오류) {
      머리그리기("선생 관리");
      칸.appendChild(만들기("p", "회원말 탈", "못 불러왔다 — " + 오류.message));
      return;
    }
    선생그리기(Array.isArray(목록) ? 목록 : [], Array.isArray(묶음) ? 묶음 : []);
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
  function 선생그리기(목록, 묶음) {
    const 학 = 학원();
    머리그리기("선생 관리", (학.학원이름 || "학원") + " · " + (학.원장인가 ? "원장" : (학.소속이름 || "")));
    const 말 = 말줄();
    const 표 = 만들기("div", "글표 회원표 선생표");
    표.innerHTML = '<div class="글표머리"><span class="칸제목">이름</span><span class="칸메일">메일</span><span class="칸소속">소속</span>' +
                   '<span class="칸반">맡은 반</span><span class="칸권한">권한</span><span class="칸상태">상태</span><span class="칸단추"></span></div>';
    목록.forEach(사람 => {
      const 원장줄 = 사람.소속이름 === "원장";
      const 줄 = 만들기("div", "글표줄 회원줄");
      const 이름칸 = 만들기("span", "칸제목");
      이름칸.appendChild(만들기("span", "글제목", 사람.닉네임 || (사람.들어왔나 ? "(닉네임 없음)" : "(아직 안 들어옴)")));
      줄.append(이름칸, 만들기("span", "칸메일", 사람.메일 || ""), 만들기("span", "칸소속", 사람.소속이름 || ""),
        만들기("span", "칸반", 원장줄 ? "전체" : (사람.강사id || "—")),
        만들기("span", "칸권한", 원장줄 ? "전부" : 권한요약(사람.권한 || {})),
        만들기("span", "칸상태", 사람.상태 || ""));
      const 단추칸 = 만들기("span", "칸단추");
      if (!원장줄) {
        const 단 = (글, 누르면, 결) => { const ㄷ = 만들기("button", "선생작은단추" + (결 ? " " + 결 : ""), 글); ㄷ.type = "button"; ㄷ.addEventListener("click", 누르면); 단추칸.appendChild(ㄷ); };
        단("권한", () => 틀그리기(사람));
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
    const 초대단 = 만들기("button", "선생큰단추", "선생님 초대"); 초대단.type = "button";
    const 틀자리 = 만들기("div");
    칸.append(초대단, 틀자리);
    초대단.addEventListener("click", () => 틀그리기(null));

    // 초대 · 권한 바꾸기 틀 — 런처 ui/계정.js 와 같은 칸
    function 틀그리기(사람) {
      const 권 = (사람 && 사람.권한) || {};
      const 틀 = 만들기("div", "선생틀 선생폼");
      const 줄 = (머리, ...것) => { const ㄱ = 만들기("div", "선생줄"); ㄱ.appendChild(만들기("span", "선생줄머리", 머리)); 것.filter(Boolean).forEach(ㄴ => ㄱ.appendChild(ㄴ)); 틀.appendChild(ㄱ); return ㄱ; };
      const 입력 = (자리글, 값, 종류 = "text") => { const ㄱ = document.createElement("input"); ㄱ.type = 종류; ㄱ.placeholder = 자리글; ㄱ.value = 값 || ""; ㄱ.autocomplete = "off"; return ㄱ; };
      const 고름 = (이름, 값, 글, 켬) => { const 라 = document.createElement("label"); const ㄱ = document.createElement("input"); ㄱ.type = "radio"; ㄱ.name = 이름; ㄱ.value = 값; ㄱ.checked = !!켬; 라.append(ㄱ, document.createTextNode(" " + 글)); return 라; };
      const 켬칸 = (키, 글) => { const 라 = document.createElement("label"); const ㄱ = document.createElement("input"); ㄱ.type = "checkbox"; ㄱ.dataset.키 = 키; ㄱ.checked = !!권[키]; 라.append(ㄱ, document.createTextNode(" " + 글)); return 라; };

      const 메일칸 = 입력("선생님 메일", 사람 && 사람.메일, "email"); if (사람) 메일칸.disabled = true;
      const 소속칸 = 입력("소속 이름 (선생님 · 팀장 · 실장 · 부원장…)", (사람 && 사람.소속이름) || "선생님");
      const 묶음고르기 = document.createElement("select"); 묶음고르기.className = "단원고르개";
      묶음고르기.appendChild(new Option("(묶음 불러오기)", ""));
      묶음.forEach(ㅁ => 묶음고르기.appendChild(new Option(ㅁ.이름, ㅁ.이름)));
      묶음고르기.addEventListener("change", () => {
        const ㅁ = 묶음.find(ㄱ => ㄱ.이름 === 묶음고르기.value); if (!ㅁ) return;
        틀그리기({ ...(사람 || {}), 메일: 메일칸.value, 소속이름: ㅁ.이름, 강사id: 반칸.value, 권한: ㅁ.권한 });
      });
      const 반칸 = 입력("맡은 반 — 강사 폴더 id (예: teacher2 · 없으면 비워 둔다)", 사람 && 사람.강사id);
      const 범위 = 권.반범위 || "자기";
      const 지정반칸 = 입력("지정한 반 id — 쉼표로 (예: teacher1, teacher3)", (권.반들 || []).join(", "));
      const 디자인값 = 권.디자인편집 === "전체" ? "전체" : (Array.isArray(권.디자인편집) && 권.디자인편집.length ? "지정" : "안함");
      const 과목칸 = 입력("과목 (예: 통과2/, 수학2/ — 쉼표로)", Array.isArray(권.디자인편집) ? 권.디자인편집.join(", ") : "");

      줄("메일", 메일칸);
      줄("소속", 소속칸, 묶음.length ? 묶음고르기 : null);
      줄("맡은 반", 반칸);
      줄("학생 보는 범위", 고름("반범위", "자기", "자기 반", 범위 === "자기"), 고름("반범위", "지정", "지정한 반", 범위 === "지정"), 고름("반범위", "전체", "전체 반", 범위 === "전체"), 지정반칸);
      줄("권한", 켬칸("학생고치기", "보는 반 학생 고치기"), 켬칸("문제만들기", "문제 만들기 · 고치기"), 켬칸("문제지우기", "문제 지우기"), 켬칸("초대", "선생 초대 · 권한 주기"));
      줄("디자인 편집", 고름("디자인", "안함", "안 함(읽기만)", 디자인값 === "안함"), 고름("디자인", "전체", "전체 과목", 디자인값 === "전체"), 고름("디자인", "지정", "지정 과목", 디자인값 === "지정"), 과목칸);

      const 쉼표 = ㄱ => String(ㄱ || "").split(",").map(ㄴ => ㄴ.trim()).filter(Boolean);
      function 모으기() {
        const 권한 = { 반범위: (틀.querySelector("input[name=반범위]:checked") || {}).value || "자기" };
        if (권한.반범위 === "지정") 권한.반들 = 쉼표(지정반칸.value);
        틀.querySelectorAll("input[data-키]").forEach(ㄱ => { if (ㄱ.checked) 권한[ㄱ.dataset.키] = true; });
        const 디 = (틀.querySelector("input[name=디자인]:checked") || {}).value;
        if (디 === "전체") 권한.디자인편집 = "전체";
        if (디 === "지정") 권한.디자인편집 = 쉼표(과목칸.value);
        return { 메일: 메일칸.value.trim(), 소속이름: 소속칸.value.trim() || "선생님", 강사id: 반칸.value.trim() || null, 권한 };
      }
      const 맞추기 = () => {
        지정반칸.hidden = (틀.querySelector("input[name=반범위]:checked") || {}).value !== "지정";
        과목칸.hidden = (틀.querySelector("input[name=디자인]:checked") || {}).value !== "지정";
      };
      틀.addEventListener("change", 맞추기);

      const 틀말 = 만들기("p", "회원말");
      const 단줄 = 만들기("div", "선생단추줄");
      const 큰 = (글, 누르면, 결) => { const ㄷ = 만들기("button", 결 ? "선생큰단추" : "선생작은단추", 글); ㄷ.type = "button"; ㄷ.addEventListener("click", 누르면); 단줄.appendChild(ㄷ); };
      큰(사람 ? "저장" : "초대하기", async () => {
        const 것 = 모으기();
        if (!사람 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(것.메일)) { 틀말.textContent = "메일을 다시 봐라"; 틀말.className = "회원말 탈"; return; }
        try {
          await 회원.학원부르기("학원_초대", { p_메일: 것.메일, p_소속이름: 것.소속이름, p_권한: 것.권한, p_강사id: 것.강사id });
          알림(사람 ? "권한을 바꿨다" : "초대했다 — 카톡으로 알려 줘라");
          열기();
        } catch (오류) { 틀말.textContent = "못 했다 — " + 오류.message; 틀말.className = "회원말 탈"; }
      }, true);
      if (학.원장인가) 큰("이 조합을 묶음으로 저장", async () => {
        const 것 = 모으기();
        try { await 회원.학원부르기("학원_묶음저장", { p_이름: 것.소속이름, p_권한: 것.권한 }); 알림("「" + 것.소속이름 + "」 묶음을 저장했다"); }
        catch (오류) { 틀말.textContent = "못 했다 — " + 오류.message; 틀말.className = "회원말 탈"; }
      });
      큰("카톡 글 복사", async () => {
        const 것 = 모으기();
        const 글 = "[" + (학.학원이름 || "학원") + "] 선생님 초대\n" +
          "1) 세도비 런처 설치: https://pub-cdafc1e706964b9c84ebcdd306dd79f0.r2.dev/launcher/sedobi-setup.exe\n" +
          "2) 런처 오른쪽 위 「로그인」 → 「회원 가입」 → 이 메일로 가입: " + 것.메일 + "\n" +
          "   (이미 계정이 있으면 그 메일로 로그인)\n" +
          "3) 로그인하면 저절로 " + (학.학원이름 || "학원") + " 에 들어온다.";
        try { await navigator.clipboard.writeText(글); 알림("카톡에 붙여 넣을 글을 복사했다"); }
        catch (오류) { 틀말.textContent = "복사를 못 했다 — " + 오류.message; 틀말.className = "회원말 탈"; }
      });
      틀.append(단줄, 틀말);
      맞추기();
      틀자리.replaceChildren(틀);
      틀.scrollIntoView({ block: "nearest" });
      (사람 ? 소속칸 : 메일칸).focus();
    }
  }

  // 로그아웃하면 닫는다
  회원.듣기(ㅅ => { if (!칸.hidden && !ㅅ.들어왔나) { 닫기(); try { 홈으로(); } catch (오류) {} } });

  return { 열기, 닫기 };
})();
window.선생관리 = 선생관리;
