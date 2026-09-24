// ============================================================
//  회원 관리 — 관리자만. 등급(권한) 바꾸기  (2026-09-23 · 사용자가 정함)
// ============================================================
//
//  사용자가 정한 것:
//    「이제 권한 설정하는 기능도 만들어야 한다」
//    「관리자는 … 등급 조절 및 모든게 가능」 (관리자는 형 하나 — 다른 사람은 관리자로 못 올린다)
//
//  ★ 게시판과 같은 짜임이다 — 첫 줄 등급 탭, 둘째 줄 제목, 표, 아래 검색.
//  ★ 명단(메일 포함)과 등급 바꾸기는 저장소가 관리자만 허락한다 (site_admin_members · site_set_role).
//    여기서 단추를 숨기는 건 보기 좋으라고고, 몰래 불러도 저장소가 거절한다.
//  ★ 자기 등급은 못 바꾼다 — 관리자를 잃으면 되돌릴 사람이 없다 (저장소도 막는다).
//  ★ 「학원」 탭 (2026-09-24 · 로그인 화면 규격 「홈피 등급과 앱 자격은 따로」) — 학원관리_목록 · 학원관리_정지.
//    누구나 스스로 원장이 되어 학원을 만들 수 있게 됐다 → 관리자가 학원을 보고 막을 자리. 저장은 학원마다 1GB.

const 회원관리 = (() => {
  const 칸 = document.getElementById("회원관리");
  if (!칸 || !window.회원) return { 열기() {}, 닫기() {} };

  const 등급이름 = { admin: "관리자", teacher: "선생님", member: "일반 회원" };
  let 명단 = [];
  let 학원들 = [];      // 학원관리_목록 — 학원·이름·원장메일·원장닉네임·인원·저장MB·정지·만든때
  let 탭 = "";          // "" 전체 · admin · teacher · member
  let 찾을말 = "";

  const 만들기 = (태그, 이름, 글) => { const ㄱ = document.createElement(태그); if (이름) ㄱ.className = 이름; if (글 != null) ㄱ.textContent = 글; return ㄱ; };
  const 날 = ㅅ => { const ㄷ = new Date(ㅅ); return ㄷ.getFullYear() + "." + String(ㄷ.getMonth() + 1).padStart(2, "0") + "." + String(ㄷ.getDate()).padStart(2, "0"); };

  async function 열기() {
    const ㅅ = 회원.상태();
    if (ㅅ.등급 !== "admin") return;
    // 다른 화면은 치운다
    try { 격자로(); } catch (오류) {}
    document.getElementById("격자보기").hidden = true;
    칸.hidden = false;
    window.scrollTo({ top: 0 });
    칸.replaceChildren(만들기("p", "회원말", "명단을 받는 중…"));
    try {
      [명단, 학원들] = await Promise.all([
        회원.부르기("/rest/v1/rpc/site_admin_members", { 방법: "POST", 몸: {} }).then(ㄹ => ㄹ || []),
        회원.학원부르기("학원관리_목록").then(ㄹ => Array.isArray(ㄹ) ? ㄹ : [], () => [])]);   // 학원 표가 없어도 회원 관리는 산다
      그리기();
    } catch (오류) {
      칸.replaceChildren(만들기("p", "회원말 탈", "명단을 못 받았다 — " + 오류.message));
    }
  }

  function 닫기() { 칸.hidden = true; 칸.replaceChildren(); }

  function 그리기(말, 결) {
    const 나 = 회원.상태();
    칸.replaceChildren();

    // 첫 줄 — 등급 탭 (게시판의 세부 과목 탭과 같은 모양 · 같은 자리)
    const 띠 = 만들기("nav", "교과띠");
    const 셈 = 등급 => 명단.filter(ㅁ => !등급 || ㅁ.role === 등급).length;
    [["", "전체"], ["admin", "관리자"], ["teacher", "선생님"], ["member", "일반 회원"], ["학원", "학원"]].forEach(([값, 글]) => {
      const ㄷ = 만들기("button", "메뉴칸" + (탭 === 값 ? " 켜짐" : ""), 글 + " " + (값 === "학원" ? 학원들.length : 셈(값)));
      ㄷ.type = "button";
      ㄷ.addEventListener("click", () => { 탭 = 값; 그리기(); });
      띠.appendChild(ㄷ);
    });
    const 머리 = 만들기("div", "목록머리");
    머리.appendChild(띠);
    칸.appendChild(머리);

    // 둘째 줄 — 제목
    const 윗줄 = 만들기("div", "판윗줄");
    const 길 = 만들기("div", "길줄"); 길.appendChild(만들기("span", "", "회원 관리"));
    if (탭 === "학원") 길.append(만들기("span", "길사이", "›"), 만들기("span", "", "학원"));
    윗줄.appendChild(길);
    칸.appendChild(윗줄);
    if (말) 칸.appendChild(만들기("p", "회원말" + (결 ? " " + 결 : ""), 말));
    if (탭 === "학원") return 학원그리기();

    // 표
    const 표 = 만들기("div", "글표 회원표");
    표.innerHTML = '<div class="글표머리"><span class="칸번호">번호</span><span class="칸제목">닉네임</span>' +
                   '<span class="칸메일">메일</span><span class="칸작성일">가입일</span><span class="칸등급">등급</span></div>';
    const 말찾기 = 찾을말.trim().toLowerCase();
    const 보일것 = 명단
      .map((ㅁ, ㅅ) => ({ ...ㅁ, 번호: 명단.length - ㅅ }))          // 명단은 새 가입이 위 — 번호는 가입 차례
      .filter(ㅁ => (!탭 || ㅁ.role === 탭) &&
        (!말찾기 || (ㅁ.nickname || "").toLowerCase().includes(말찾기) || (ㅁ.email || "").toLowerCase().includes(말찾기)));
    보일것.forEach(ㅁ => {
      const 줄 = 만들기("div", "글표줄 회원줄");
      줄.appendChild(만들기("span", "칸번호", String(ㅁ.번호)));
      const 이름칸 = 만들기("span", "칸제목");
      이름칸.appendChild(만들기("span", "글제목", ㅁ.nickname || "(닉네임 없음)"));
      if (ㅁ.public_id === 나.이름표) 이름칸.appendChild(만들기("span", "글딱지", "나"));
      줄.appendChild(이름칸);
      줄.appendChild(만들기("span", "칸메일", ㅁ.email || ""));
      줄.appendChild(만들기("span", "칸작성일", 날(ㅁ.created_at)));
      const 등급칸 = 만들기("span", "칸등급");
      if (ㅁ.role === "admin" || ㅁ.public_id === 나.이름표) {
        // ★ 관리자(형) 자리는 못 바꾼다
        등급칸.appendChild(만들기("span", "등급고정", 등급이름[ㅁ.role] || ㅁ.role));
      } else {
        const 고르개 = document.createElement("select");
        고르개.className = "단원고르개 등급고르개";
        고르개.setAttribute("aria-label", (ㅁ.nickname || "회원") + " 등급");
        [["member", "일반 회원"], ["teacher", "선생님"]].forEach(([값, 글]) => 고르개.appendChild(new Option(글, 값)));
        고르개.value = ㅁ.role;
        고르개.addEventListener("change", () => 등급바꾸기(ㅁ, 고르개));
        등급칸.appendChild(고르개);
      }
      줄.appendChild(등급칸);
      표.appendChild(줄);
    });
    if (!보일것.length) 표.appendChild(만들기("div", "글표빔", 말찾기 ? "찾는 회원이 없다" : "회원이 없다"));
    칸.appendChild(표);

    // 아래 — 검색
    const 아랫줄 = 만들기("div", "판아랫줄");
    const 틀 = document.createElement("form");
    틀.className = "판찾기";
    틀.innerHTML = '<input type="search" placeholder="닉네임 · 메일 찾기" aria-label="회원 찾기"><button type="submit">검색</button>';
    const 입력 = 틀.querySelector("input");
    입력.value = 찾을말;
    틀.addEventListener("submit", ㄴ => { ㄴ.preventDefault(); 찾을말 = 입력.value; 그리기(); });
    아랫줄.appendChild(틀);
    칸.appendChild(아랫줄);
  }

  // 학원 표 — 학원 · 원장 · 인원 · 저장 · 만든 날 · 상태 · 정지 단추
  function 학원그리기() {
    const 표 = 만들기("div", "글표 회원표 학원표");
    표.innerHTML = '<div class="글표머리"><span class="칸제목">학원</span><span class="칸메일">원장</span><span class="칸인원">인원</span>' +
                   '<span class="칸저장">저장</span><span class="칸작성일">만든 날</span><span class="칸상태">상태</span><span class="칸단추"></span></div>';
    학원들.forEach(ㅎ => {
      const 줄 = 만들기("div", "글표줄 회원줄");
      const 이름칸 = 만들기("span", "칸제목"); 이름칸.appendChild(만들기("span", "글제목", ㅎ.이름 || "(이름 없음)"));
      const 원장칸 = 만들기("span", "칸메일", [ㅎ.원장닉네임, ㅎ.원장메일].filter(Boolean).join(" · "));
      const MB = Number(ㅎ.저장MB) || 0;
      const 저장칸 = 만들기("span", "칸저장" + (MB >= 1024 ? " 넘침" : ""), (MB >= 1024 ? (MB / 1024).toFixed(2) + " GB" : MB + " MB") + " / 1 GB");
      const 단추칸 = 만들기("span", "칸단추");
      const ㄷ = 만들기("button", "선생작은단추" + (ㅎ.정지 ? "" : " 빨강"), ㅎ.정지 ? "정지 풀기" : "정지"); ㄷ.type = "button";
      ㄷ.addEventListener("click", () => 학원정지(ㅎ, ㄷ));
      단추칸.appendChild(ㄷ);
      줄.append(이름칸, 원장칸, 만들기("span", "칸인원", (ㅎ.인원 || 0) + "명"), 저장칸,
        만들기("span", "칸작성일", ㅎ.만든때 ? 날(ㅎ.만든때) : ""), 만들기("span", "칸상태" + (ㅎ.정지 ? " 정지됨" : ""), ㅎ.정지 ? "정지" : "활성"), 단추칸);
      표.appendChild(줄);
    });
    if (!학원들.length) 표.appendChild(만들기("div", "글표빔", "아직 학원이 없다"));
    칸.appendChild(표);
  }

  async function 학원정지(ㅎ, ㄷ) {
    const 정지 = !ㅎ.정지;
    if (정지 && !confirm("「" + (ㅎ.이름 || "학원") + "」 을 정지할까?\n그 학원 사람은 런처 앱을 못 쓰고 학원 자료도 안 보인다. 자료는 지워지지 않는다.")) return;
    ㄷ.disabled = true;
    try {
      await 회원.학원부르기("학원관리_정지", { p_학원: ㅎ.학원, p_정지: 정지 });
      ㅎ.정지 = 정지;
      그리기("「" + (ㅎ.이름 || "학원") + "」 → " + (정지 ? "정지" : "정지 풀림"), "됨");
    } catch (오류) {
      그리기("못 했다 — " + 오류.message, "탈");
    }
  }

  async function 등급바꾸기(ㅁ, 고르개) {
    const 새것 = 고르개.value;
    if (새것 === ㅁ.role) return;
    const 이름 = ㅁ.nickname || ㅁ.email || "이 회원";
    if (!confirm("「" + 이름 + "」 을 " + 등급이름[새것] + " (으)로 바꿀까?" +
                 (새것 === "teacher" ? "\n선생님은 영상을 올리고 제 글을 지울 수 있다." : "\n일반 회원은 글을 못 올린다."))) {
      고르개.value = ㅁ.role; return;
    }
    고르개.disabled = true;
    try {
      await 회원.부르기("/rest/v1/rpc/site_set_role", { 방법: "POST", 몸: { p_public_id: ㅁ.public_id, p_role: 새것 } });
      ㅁ.role = 새것;
      그리기("「" + 이름 + "」 → " + 등급이름[새것], "됨");
    } catch (오류) {
      고르개.value = ㅁ.role;
      그리기("못 바꿨다 — " + 오류.message, "탈");
    }
  }

  // 로그아웃하거나 관리자가 아니게 되면 닫는다
  회원.듣기(ㅅ => { if (!칸.hidden && ㅅ.등급 !== "admin") { 닫기(); try { 홈으로(); } catch (오류) {} } });

  return { 열기, 닫기 };
})();
window.회원관리 = 회원관리;
