// ============================================================
//  순서 손잡이 — 관리자만 과목·세부 교과를 끌어 옮긴다  (2026-09-22 · 사용자가 정함)
// ============================================================
//
//  사용자가 정한 것:
//    「과목하고 세부 과목 위치를 드래그 해서 관리자만 바꿀수 있게 하라」
//
//  ★ 왼쪽 과목 목록   — 위아래로 끌면 과목 순서가 바뀐다
//  ★ 맨 위 세부 교과 — 좌우로 끌면 교과 순서가 바뀐다
//    세부 교과를 왼쪽 과목 위에 놓으면 그 과목으로 옮겨 간다
//
//  ★ 마우스는 6px 움직이면 끌기가 시작된다. 폰은 **꾹 누른 뒤** 끈다 —
//    그냥 끌면 화면 스크롤과 헷갈린다.
//  ★ 권한은 저장소(site_units_reorder)가 막는다. 관리자가 아니면 여기서 아예 안 잡는다.
//  ★ 끌고 난 뒤 손을 떼면 「눌렀다」 로 치지 않는다 — 과목이 열려 버리면 놀란다.

const 순서손잡이 = (() => {
  const 관리자인가 = () => window.저장소가원본 && window.회원 && 회원.상태().등급 === "admin";
  let 방금끌었나 = 0;

  // 끌고 난 직후의 click 은 삼킨다 (붙잡는 쪽에서 가장 먼저)
  document.addEventListener("click", ㄴ => {
    if (Date.now() - 방금끌었나 < 350) { ㄴ.stopPropagation(); ㄴ.preventDefault(); }
  }, true);

  function 말(글) { try { 쪽지(글); } catch (오류) { console.log(글); } }

  async function 저장(부모, 아이디들) {
    try {
      await 회원.부르기("/rest/v1/rpc/site_units_reorder", {
        방법: "POST", 몸: { p_parent: 부모 || null, p_ids: 아이디들 }
      });
      return true;
    } catch (오류) {
      말("순서를 못 바꿨다 — " + 오류.message);
      return false;
    }
  }

  // 화면이 들고 있는 나무도 같은 모양으로 바꿔 둔다 (다시 받지 않아도 되게)
  function 나무에반영(부모, 아이디들) {
    const 새줄 = 아이디들.map(ㄱ => 나무.찾기(ㄱ)).filter(Boolean);
    // 원래 자리에서 빼고
    새줄.forEach(ㅊ => { const ㅈ = ㅊ.형제.indexOf(ㅊ.마디); if (ㅈ >= 0) ㅊ.형제.splice(ㅈ, 1); });
    // 새 자리에 차례대로
    const 담을곳 = 부모 ? (() => { const ㅍ = 나무.찾기(부모).마디; return (ㅍ.아래 = ㅍ.아래 || []); })() : 나무.목록;
    담을곳.splice(0, 담을곳.length, ...새줄.map(ㅊ => ㅊ.마디).concat(담을곳));
    // concat 으로 붙은 옛것 중 새줄에 있는 것은 이미 뺐으니 겹치지 않는다
  }

  function 다시그리기() {
    try { 왼쪽그리기(); 격자그리기(); } catch (오류) { location.reload(); }
  }

  // ---------- 끌기 한 벌 ----------
  //  항목들: 끌 수 있는 단추들 · 쪽: "세로" | "가로" · 놓으면(차례, 끈것, 놓인곳)
  function 끌기붙이기(항목, 쪽, 놓으면) {
    if (항목.dataset.손잡이) return;
    항목.dataset.손잡이 = "1";
    항목.addEventListener("pointerdown", 시작 => {
      if (!관리자인가() || 시작.button !== 0) return;
      const 손가락 = 시작.pointerType !== "mouse";
      let 끄는중 = false, 그림자 = null, 꾹 = null;
      // 같은 줄에 선 것들 — 왼쪽은 목(ul) 안의 상자들, 위는 그 메뉴 칸의 단추들
      const 형제들 = () => [...(쪽 === "세로" ? 항목.closest("ul") : 항목.parentElement)
        .querySelectorAll(쪽 === "세로" ? ".상자[data-아이디]" : ".메뉴칸[data-아이디]")];
      const 시작하기 = () => {
        끄는중 = true;
        항목.classList.add("끌리는중");
        document.body.classList.add("순서끄는중");
        그림자 = 항목.cloneNode(true);
        그림자.className = (항목.className || "") + " 끌림그림자";
        const ㅂ = 항목.getBoundingClientRect();
        그림자.style.width = ㅂ.width + "px";
        document.body.appendChild(그림자);
        try { 항목.setPointerCapture(시작.pointerId); } catch (오류) {}
      };
      if (손가락) 꾹 = setTimeout(시작하기, 380);

      const 움직임 = ㅁ => {
        const 옆 = ㅁ.clientX - 시작.clientX, 아래 = ㅁ.clientY - 시작.clientY;
        if (!끄는중) {
          if (손가락) { if (Math.hypot(옆, 아래) > 10) { clearTimeout(꾹); 끝(); } return; }
          if (Math.hypot(옆, 아래) < 6) return;
          시작하기();
        }
        ㅁ.preventDefault();
        그림자.style.left = (ㅁ.clientX + 8) + "px";
        그림자.style.top = (ㅁ.clientY + 8) + "px";
        // 어디에 놓이나 표시
        document.querySelectorAll(".놓일자리").forEach(ㄱ => ㄱ.classList.remove("놓일자리", "앞", "뒤"));
        const 밑 = document.elementFromPoint(ㅁ.clientX, ㅁ.clientY);
        const 과녁 = 밑 && 밑.closest("[data-아이디]");
        if (과녁 && 과녁 !== 항목) {
          const ㅂ = 과녁.getBoundingClientRect();
          const 앞인가 = 쪽 === "가로" ? ㅁ.clientX < ㅂ.left + ㅂ.width / 2 : ㅁ.clientY < ㅂ.top + ㅂ.height / 2;
          과녁.classList.add("놓일자리", 앞인가 ? "앞" : "뒤");
        }
      };
      const 놓음 = async ㅁ => {
        clearTimeout(꾹);
        if (!끄는중) return 끝();
        방금끌었나 = Date.now();
        const 과녁 = document.querySelector(".놓일자리");
        const 앞인가 = 과녁 && 과녁.classList.contains("앞");
        끝();
        if (!과녁) return;
        await 놓으면(항목, 과녁, 앞인가, 형제들());
      };
      const 끝 = () => {
        clearTimeout(꾹);
        항목.classList.remove("끌리는중");
        document.body.classList.remove("순서끄는중");
        if (그림자) { 그림자.remove(); 그림자 = null; }
        document.querySelectorAll(".놓일자리").forEach(ㄱ => ㄱ.classList.remove("놓일자리", "앞", "뒤"));
        window.removeEventListener("pointermove", 움직임);
        window.removeEventListener("pointerup", 놓음);
        window.removeEventListener("pointercancel", 끝);
      };
      window.addEventListener("pointermove", 움직임, { passive: false });
      window.addEventListener("pointerup", 놓음);
      window.addEventListener("pointercancel", 끝);
    });
    // 폰에서 꾹 누르면 뜨는 기본 메뉴를 막는다 (관리자만)
    항목.addEventListener("contextmenu", ㄴ => { if (관리자인가()) ㄴ.preventDefault(); });
  }

  const 줄세우기 = (형제들, 끈것, 과녁, 앞인가) => {
    const 차례 = 형제들.map(ㄱ => ㄱ.dataset.아이디).filter(ㄱ => ㄱ !== 끈것.dataset.아이디);
    let 자리 = 차례.indexOf(과녁.dataset.아이디);
    if (자리 < 0) 자리 = 차례.length; else if (!앞인가) 자리++;
    차례.splice(자리, 0, 끈것.dataset.아이디);
    return 차례;
  };

  // ---------- 왼쪽: 과목 순서 ----------
  function 왼쪽(나무칸) {
    나무칸.querySelectorAll(".상자[data-아이디]").forEach(상자 => 끌기붙이기(상자, "세로", async (끈것, 과녁, 앞인가, 형제들) => {
      if (!과녁.closest("#나무칸")) return;              // 과목끼리만
      const 차례 = 줄세우기(형제들, 끈것, 과녁, 앞인가);
      if (await 저장(null, 차례)) { 나무에반영(null, 차례); 다시그리기(); 말("과목 순서를 바꿨다"); }
    }));
  }

  // ---------- 위: 세부 교과 순서 · 다른 과목으로 옮기기 ----------
  function 위메뉴(칸) {
    const 부모 = 칸.dataset.부모 || "";
    칸.querySelectorAll(".메뉴칸[data-아이디]").forEach(단 => 끌기붙이기(단, "가로", async (끈것, 과녁, 앞인가, 형제들) => {
      // 왼쪽 과목 위에 놓았다 → 그 과목으로 옮긴다 (세부 교과일 때만)
      if (과녁.closest("#나무칸")) {
        if (!부모) return;                                    // 과목을 과목 밑으로는 못 넣는다
        const 새부모 = 과녁.dataset.아이디;
        if (새부모 === 부모) return;
        const 새과목 = 나무.찾기(새부모);
        if (!새과목 || 새과목.부모) return;                   // 과목(맨 위)에만 놓인다
        const 차례 = (새과목.마디.아래 || []).map(ㅁ => ㅁ.아이디).concat(끈것.dataset.아이디);
        if (await 저장(새부모, 차례)) {
          나무에반영(새부모, 차례);
          다시그리기();
          말("「" + 끈것.textContent + "」 을 「" + 새과목.마디.이름 + "」 으로 옮겼다");
        }
        return;
      }
      if (!과녁.closest(".머리메뉴, .과목띠")) return;
      const 차례 = 줄세우기(형제들, 끈것, 과녁, 앞인가);
      if (await 저장(부모 || null, 차례)) {
        나무에반영(부모 || null, 차례);
        다시그리기();
        말(부모 ? "세부 교과 순서를 바꿨다" : "과목 순서를 바꿨다");
      }
    }));
  }

  return { 왼쪽, 위메뉴 };
})();
window.순서손잡이 = 순서손잡이;

// 처음 그림은 이 파일보다 먼저 그려졌다 — 손잡이를 지금 붙인다
try {
  과목메뉴그리기();
  if (!트리층인가()) 순서손잡이.왼쪽(document.getElementById("나무칸"));
} catch (오류) { /* 앱이 아직 안 떴으면 다음 그리기 때 붙는다 */ }
