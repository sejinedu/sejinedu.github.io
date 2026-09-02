// ============================================================
//  단원 나무 — 담아 두기와 고치기를 맡는다
// ============================================================
//
//  처음 값은 js/단원.js (문제 은행에서 옮겨 온 것).
//  화면에서 고치면 그 결과가 브라우저에 저장되고, 다음부터는 저장된 쪽을 쓴다.
//
//  ★ 지금은 「이 브라우저」 에만 남는다. 다른 기기에서는 처음 값으로 보인다.
//    밖에 저장소를 붙이면 불러오기() · 저장() 두 개만 바꿔 끼우면 된다.
//    (지침서 6절 21번 — 같은 일을 두 벌로 만들지 마라)

const 나무 = (() => {

  const 열쇠 = "세진과학.단원나무.v1";
  let 지금 = null;

  const 깊은복사 = ㄱ => JSON.parse(JSON.stringify(ㄱ));

  function 불러오기() {
    try {
      const 담긴것 = localStorage.getItem(열쇠);
      if (담긴것) return JSON.parse(담긴것);
    } catch (오류) {
      // 조용히 넘어가지 않는다 (지침서 7절 25번)
      console.warn("담아 둔 단원이 깨져서 처음 값으로 시작한다", 오류);
    }
    return 깊은복사(window.첫단원나무 || []);
  }

  function 저장() {
    try { localStorage.setItem(열쇠, JSON.stringify(지금)); }
    catch (오류) { console.warn("단원을 못 담았다", 오류); }
  }

  지금 = 불러오기();

  // --- 훑기 ---

  // 아이디로 마디를 찾는다. 부모와 형제 목록까지 같이 준다.
  function 찾기(아이디, 목록 = 지금, 부모 = null) {
    for (let ㅈ = 0; ㅈ < 목록.length; ㅈ++) {
      const ㅁ = 목록[ㅈ];
      if (ㅁ.아이디 === 아이디) return { 마디: ㅁ, 형제: 목록, 자리: ㅈ, 부모 };
      if (ㅁ.아래) {
        const ㅊ = 찾기(아이디, ㅁ.아래, ㅁ);
        if (ㅊ) return ㅊ;
      }
    }
    return null;
  }

  // 뿌리부터 이 마디까지 오는 이름들
  function 길(아이디, 목록 = 지금, 윗길 = []) {
    for (const ㅁ of 목록) {
      const 여기 = [...윗길, ㅁ.이름];
      if (ㅁ.아이디 === 아이디) return 여기;
      if (ㅁ.아래) {
        const ㅊ = 길(아이디, ㅁ.아래, 여기);
        if (ㅊ) return ㅊ;
      }
    }
    return null;
  }

  // 이 마디까지 오는 길에 있는 윗마디들의 아이디 (제 아이디는 빼고)
  // ★ 고른 마디의 윗단원이 접혀 있으면 고른 것이 화면에서 사라진다. 그걸 막는 데 쓴다.
  function 조상들(아이디, 목록 = 지금, 윗것 = []) {
    for (const ㅁ of 목록) {
      if (ㅁ.아이디 === 아이디) return 윗것;
      if (ㅁ.아래) {
        const ㅊ = 조상들(아이디, ㅁ.아래, [...윗것, ㅁ.아이디]);
        if (ㅊ) return ㅊ;
      }
    }
    return null;
  }

  // 나와 내 아래에 달린 모든 아이디
  function 아래아이디들(마디, 담을곳 = []) {
    담을곳.push(마디.아이디);
    (마디.아래 || []).forEach(ㅇ => 아래아이디들(ㅇ, 담을곳));
    return 담을곳;
  }

  function 새아이디(앞 = "n") {
    return 앞 + Math.random().toString(36).slice(2, 10) + (지금.length + Date.now() % 1000);
  }

  // --- 고치기 ---

  function 이름바꾸기(아이디, 새이름) {
    const ㅊ = 찾기(아이디);
    if (!ㅊ) return false;
    새이름 = (새이름 || "").trim();
    if (!새이름) return false;
    ㅊ.마디.이름 = 새이름;
    저장();
    return true;
  }

  // 부모아이디가 null 이면 과목(맨 위)으로 더한다
  function 더하기(부모아이디, 이름) {
    이름 = (이름 || "").trim();
    if (!이름) return null;
    const 새 = { 아이디: 새아이디(부모아이디 ? "n" : "과목"), 이름 };
    if (부모아이디 === null) { 지금.push(새); }
    else {
      const ㅊ = 찾기(부모아이디);
      if (!ㅊ) return null;
      if (!ㅊ.마디.아래) ㅊ.마디.아래 = [];
      ㅊ.마디.아래.push(새);
    }
    저장();
    return 새.아이디;
  }

  function 지우기(아이디) {
    const ㅊ = 찾기(아이디);
    if (!ㅊ) return null;
    const 없앨것 = 아래아이디들(ㅊ.마디);   // 딸린 것까지 알려 준다
    ㅊ.형제.splice(ㅊ.자리, 1);
    저장();
    return 없앨것;
  }

  // 끈것을 목표 옆이나 안으로 옮긴다. 자리 = "위" | "아래" | "안"
  function 옮기기(끈아이디, 목표아이디, 자리) {
    if (끈아이디 === 목표아이디) return false;

    const 끈것 = 찾기(끈아이디);
    if (!끈것) return false;

    // ★ 제 자식 안으로는 못 넣는다. 넣으면 나무가 끊겨서 사라진다.
    if (아래아이디들(끈것.마디).includes(목표아이디)) return false;

    const 목표 = 찾기(목표아이디);
    if (!목표) return false;

    끈것.형제.splice(끈것.자리, 1);            // 먼저 뽑고

    if (자리 === "안") {
      if (!목표.마디.아래) 목표.마디.아래 = [];
      목표.마디.아래.push(끈것.마디);
    } else {
      // 뽑고 나면 자리가 밀릴 수 있으니 다시 잰다
      const 다시 = 찾기(목표아이디);
      const 넣을데 = 다시.자리 + (자리 === "아래" ? 1 : 0);
      다시.형제.splice(넣을데, 0, 끈것.마디);
    }
    저장();
    return true;
  }

  // 맨 위(과목)끼리 자리 바꾸기도 같은 옮기기로 처리된다

  function 처음으로() {
    지금 = 깊은복사(window.첫단원나무 || []);
    저장();
  }

  function 고쳤나() {
    try { return localStorage.getItem(열쇠) !== null; } catch (오류) { return false; }
  }

  return {
    get 목록() { return 지금; },
    찾기, 길, 조상들, 아래아이디들,
    이름바꾸기, 더하기, 지우기, 옮기기, 처음으로, 고쳤나
  };
})();
