// 세진 과학 — 화면 그리기
//   단원 나무   js/나무.js   (처음 값은 js/단원.js)
//   영상 목록   js/동영상.js
//   숫자 저장   js/기록소.js
//
//  화면은 둘이다 (사용자가 정한 것, 2026-09-01):
//    ① 격자  — 단원을 고르면 썸네일이 주르륵
//    ② 보기  — 썸네일을 누르면 유튜브처럼 큰 화면 + 옆에 다음 강의

const 나무칸   = document.getElementById("나무칸");
const 격자보기 = document.getElementById("격자보기");
const 격자칸   = document.getElementById("격자");
const 목록머리 = document.getElementById("목록머리");
const 보기칸   = document.getElementById("보기");
const 화면칸   = document.getElementById("화면칸");
const 지금제목 = document.getElementById("지금제목");
const 지금강사 = document.getElementById("지금강사");
const 지금셈   = document.getElementById("지금셈");
const 지금길   = document.getElementById("지금길");
const 옆목록   = document.getElementById("옆목록");
const 좋아요단추 = document.getElementById("좋아요단추");
const 왼쪽칸   = document.getElementById("왼쪽");
const 뒷막     = document.getElementById("뒷막");
const 끄는것   = document.getElementById("끄는것");

let 고른아이디 = null;      // ★ 하나만 고른다. 겹쳐 고르지 않는다
let 지금영상   = null;
let 지금무리   = [];        // 지금 보고 있는 영상이 속한 묶음

const 셈 = ㅅ => (ㅅ || 0).toLocaleString("ko-KR");

// ★★★ 없는 것을 불러서 통째로 죽는 일을 막는다 (2026-09-02 에 밟음)
//   브라우저가 옛 index.html 을 물고 있으면 새로 늘어난 파일이 안 실려 온다.
//   그걸 그냥 부르면 앱.js 가 첫 줄에서 죽어 화면이 통째로 먹통이 된다 —
//   눌러도 아무 일도 안 나서 원인을 짐작조차 못 한다.
function 있나(이름) {
  try { return typeof window[이름] !== "undefined" || eval("typeof " + 이름) !== "undefined"; }
  catch (오류) { return false; }
}

// ============================================================
//  왼쪽 — 한 층씩 미끄러지며 파고든다
// ============================================================
//
//  사용자가 정한 것 (2026-09-01):
//    「왼쪽에서 통합과학을 누르면 슬라이드되면서 그 자리가 통합과학 단원으로 쫙 펼쳐지라고」
//    「뒤로가기 하면 다시 과목들 나오게 하고」
//
//  ★ 나뭇가지를 펼쳐 늘어놓지 않는다. 한 번에 한 층만 보여 준다.
//    폰에서 트리를 펼치면 줄이 끝없이 길어져서 못 쓴다.

const 층머리칸 = document.getElementById("층머리");
const 미끄럼칸 = document.getElementById("미끄럼");
const 손질줄   = document.getElementById("손질줄");

let 경로 = [];        // 지금 어디까지 들어와 있나 (마디 아이디들)

// ★ 들어가는 층은 하나뿐이다 — 과목 목록 → 그 과목의 단원 전부.
//   (사용자가 정한 것 — 「한번만 들어가라」, 2026-09-01)
//   역학과 에너지는 다섯 층까지 있어서, 층층이 들어가면 뒤로가기만 다섯 번 눌러야 했다.
//   그래서 과목 안으로 한 번 들어가면 그 아래 단원을 들여쓰기로 한꺼번에 편다.

// ★ 처음에는 소단원까지만 펼친다.
//   (사용자가 정한 것 — 「과목 들어갔을 때 디폴트 값은 소단원까지만」, 2026-09-01)
//
//   깊이 0 = 대단원 · 1 = 중단원 · 2 = 소단원 · 3부터는 그 아래
//   소단원(2)의 자식부터는 접어 둔다. 그래야 폰에서 목록이 안 길어진다.
//   꺾쇠를 누르면 그때 펴진다.
const 기본펼침깊이 = 2;
const 접은것 = new Set();      // 손으로 접은 것
const 편것   = new Set();      // 손으로 편 것

function 펼쳐졌나(아이디, 깊이) {
  if (편것.has(아이디)) return true;
  if (접은것.has(아이디)) return false;
  return 깊이 < 기본펼침깊이;
}

function 펴고접기(아이디, 깊이) {
  if (펼쳐졌나(아이디, 깊이)) { 편것.delete(아이디); 접은것.add(아이디); }
  else { 접은것.delete(아이디); 편것.add(아이디); }
}

// 마디를 깊이와 함께 한 줄로 늘어놓는다. 접힌 마디 아래는 건너뛴다.
function 펴기(목록, 깊이, 담을곳) {
  목록.forEach(마디 => {
    담을곳.push({ 마디, 깊이 });
    if (마디.아래 && 마디.아래.length && 펼쳐졌나(마디.아이디, 깊이)) {
      펴기(마디.아래, 깊이 + 1, 담을곳);
    }
  });
  return 담을곳;
}

function 지금층목록() {
  if (경로.length === 0) return 나무.목록.map(마디 => ({ 마디, 깊이: 0 }));
  const ㅊ = 나무.찾기(경로[0]);
  return (ㅊ && ㅊ.마디.아래) ? 펴기(ㅊ.마디.아래, 0, []) : [];
}

function 지금층마디() {
  if (경로.length === 0) return null;
  const ㅊ = 나무.찾기(경로[0]);
  return ㅊ ? ㅊ.마디 : null;
}

// 어느 쪽에서 미끄러져 들어올지 — "안" 은 오른쪽에서, "밖" 은 왼쪽에서
function 왼쪽그리기(어디서) {
  const 마디 = 지금층마디();

  // --- 층 머리 ---
  층머리칸.innerHTML = "";
  if (마디) {
    const 뒤 = document.createElement("button");
    뒤.type = "button";
    뒤.className = "층뒤로";
    뒤.innerHTML = '<span class="뒤화살">‹</span>';
    뒤.append("과목");
    뒤.addEventListener("click", 층나가기);
    층머리칸.appendChild(뒤);

    // ★ 과목 이름도 누를 수 있다 — 그 과목에 딸린 강의를 전부 보여 준다.
    //   (사용자가 정한 것 — 「통합과학2 누르면 하위 전체 영상이 보이게」, 2026-09-02)
    const 이름 = document.createElement("button");
    이름.type = "button";
    이름.className = "층이름" + (고른아이디 === 경로[0] ? " 골랐음" : "");
    이름.textContent = 마디.이름;
    이름.addEventListener("click", () => 고르기(경로[0], true));
    층머리칸.appendChild(이름);
  } else {
    const 이름 = document.createElement("div");
    이름.className = "층이름 뿌리";
    이름.textContent = "과목 선택";
    층머리칸.appendChild(이름);
  }

  // 「과목 추가」 는 맨 위 층에서만 · ★ 그리고 주인일 때만 (2026-09-02)
  손질줄.hidden = 경로.length !== 0 || !주인인가;

  // --- 목록 ---
  const 새목 = 목만들기(지금층목록());
  나무칸.replaceChildren(새목);

  if (어디서) {
    새목.classList.add(어디서 === "안" ? "안에서" : "밖에서");
    // 애니메이션이 끝나면 딱지를 뗀다 — 안 떼면 다음 그리기에서 안 먹는다
    새목.addEventListener("animationend", () => 새목.classList.remove("안에서", "밖에서"), { once: true });
  }
  미끄럼칸.scrollTop = 0;
}

function 목만들기(목록) {
  const 목 = document.createElement("ul");
  목.className = "목";
  const 뿌리층 = 경로.length === 0;

  if (목록.length === 0) {
    const ㅂ = document.createElement("li");
    ㅂ.className = "층빔";
    ㅂ.textContent = "아래에 단원이 없다.";
    목.appendChild(ㅂ);
    return 목;
  }

  목록.forEach(({ 마디, 깊이 }) => {
    const 아래있나 = !!(마디.아래 && 마디.아래.length);

    const 칸 = document.createElement("li");
    칸.className = "칸";

    // ★ 클릭 자리는 글자에 붙은 박스 (사용자가 정한 것)
    const 상자 = document.createElement("div");
    상자.className = "상자" + (뿌리층 ? "" : " 깊이" + Math.min(깊이, 4));
    상자.dataset.아이디 = 마디.아이디;
    if (마디.아이디 === 고른아이디) 상자.classList.add("골랐음");

    // 접기·펴기 꺾쇠 — 과목 안에서, 아래가 있는 마디에만
    if (!뿌리층) {
      const 꺾쇠 = document.createElement("button");
      꺾쇠.type = "button";
      꺾쇠.className = "꺾쇠" + (아래있나 ? "" : " 빔");
      if (아래있나) {
        const 펴졌나 = 펼쳐졌나(마디.아이디, 깊이);
        꺾쇠.textContent = "▾";
        꺾쇠.classList.toggle("접힘", !펴졌나);
        꺾쇠.setAttribute("aria-expanded", 펴졌나 ? "true" : "false");
        꺾쇠.setAttribute("aria-label", 마디.이름 + (펴졌나 ? " 접기" : " 펴기"));
        꺾쇠.addEventListener("click", ㅇ => {
          ㅇ.stopPropagation();
          펴고접기(마디.아이디, 깊이);
          왼쪽그리기();
        });
        꺾쇠.addEventListener("pointerdown", ㅇ => ㅇ.stopPropagation());
      }
      상자.appendChild(꺾쇠);
    }

    const 글 = document.createElement("span");
    글.className = "글";
    글.textContent = 마디.이름;
    상자.appendChild(글);

    const 수 = 영상수(마디);
    if (수 > 0) {
      const 개수 = document.createElement("span");
      개수.className = "개수";
      개수.textContent = 수;
      상자.appendChild(개수);
    }

    // 「더 들어감」 화살표는 과목 층에서만. 그 아래는 더 안 들어간다.
    if (뿌리층 && 아래있나) {
      const 더 = document.createElement("span");
      더.className = "더들어감";
      더.textContent = "›";
      상자.appendChild(더);
    }

    상자.tabIndex = 0;
    상자.setAttribute("role", "button");
    상자.addEventListener("keydown", ㅇ => {
      if (ㅇ.key === "Enter" || ㅇ.key === " ") { ㅇ.preventDefault(); 고르기(마디.아이디, 아래있나); }
    });

    손붙이기(상자, 마디, 아래있나);
    칸.appendChild(상자);
    목.appendChild(칸);
  });

  return 목;
}

// 과목 안으로 — 딱 한 번만 들어간다
function 층들어가기(아이디) {
  경로 = [아이디];
  왼쪽그리기("안");
  상태밀기();
}

// 과목 목록으로 — 「‹ 과목」 은 언제 눌러도 과목 목록으로 간다.
//
// ★★★ history.back() 을 쓰면 안 된다 (2026-09-02 에 밟음)
//   안에서 이것저것 눌러 두면 기록이 여러 겹 쌓여 있다. 그 상태에서 되짚으면
//   과목이 아니라 「바로 앞 단계」 로 가 버린다.
//   사용자가 정한 것 — 「과목 누르면 그냥 바로 전단계가 된다고. 과목으로 안 넘어가고」
//   ⇒ 곧장 과목 층으로 가고, 그 자리를 기록에 새로 심는다.
//     (브라우저 뒤로 단추는 여전히 앞 자리로 돌아간다 — 서로 하는 일이 다르다)
function 층나가기() {
  if (경로.length === 0) return;
  경로 = [];
  왼쪽그리기("밖");
  상태밀기();
}

function 고르기(아이디, 아래있나) {
  고른아이디 = 아이디;
  // ★ 골랐다고 펴지 않는다. 펴고 접는 건 옆 화살표만 한다.
  //   (사용자가 정한 것 — 「소단원은 그 옆에 화살표 눌러야 열리게」, 2026-09-01)
  //   소단원을 누르면 오른쪽에 그 강의가 뜨는 게 목적이지, 목록이 늘어나는 게 아니다.
  격자그리기();
  격자로();

  // ★ 과목 층에서만 들어간다. 안에 들어온 뒤로는 슬라이드하지 않는다.
  //   (사용자가 정한 것 — 「통합과학1 까지 들어왔으면 그 이상 더 슬라이드 하지마」, 2026-09-01)
  if (경로.length === 0 && 아래있나) {
    층들어가기(아이디);
    return;
  }

  왼쪽그리기();
  상태밀기();                     // 뒤로 단추가 되짚을 수 있게

  // ★★★ 영상이 있을 때만 서랍을 닫는다 (2026-09-02 · 사용자가 정함)
  //   「영상 없는 단원 클릭하면 그냥 단원 목록 닫히면서 닫히는데
  //     영상 업는 단원 클릭 되면 그냥 좀 냅둬라」
  //
  //   서랍을 닫는 까닭은 **영상을 보여 주려고**다.
  //   보여 줄 영상이 없는데 닫으면 빈 화면만 남고, 다시 열어야 한다.
  //   ⇒ 볼 게 있을 때만 비켜 준다.
  if (!아래있나) {
    const ㅊ = 나무.찾기(아이디);          // { 마디, 부모 } 로 준다
    const 몇개 = (ㅊ && ㅊ.마디) ? 영상수(ㅊ.마디) : 0;
    if (몇개 > 0) 서랍닫기();
  }
}

function 영상수(마디) {
  const 아이디들 = new Set(나무.아래아이디들(마디));
  return window.동영상목록.filter(ㅇ => 아이디들.has(ㅇ.단원아이디)).length;
}

// ============================================================
//  우클릭 메뉴 — 이름 바꾸기 · 아래에 추가 · 삭제
// ============================================================
//
//  사용자가 정한 것 (2026-09-01):
//    「고치기는 없애라. 단원 우클릭하면 삭제 버튼 나오게 해라」
//  ⇒ 켜고 끄는 「고치기」 단추를 없앴다. 우클릭 하나로 다 한다.
//    폰에는 우클릭이 없으니 꾹 누르는 것도 같이 받는다.

const 맥락메뉴 = document.getElementById("맥락메뉴");

function 메뉴닫기() { 맥락메뉴.hidden = true; 맥락메뉴.innerHTML = ""; }

// 메뉴 하나를 띄운다. 이름표 + [글, 결, 할일] 줄들.
function 메뉴띄우기(이름, 줄들, x, y) {
  맥락메뉴.innerHTML = "";

  const 이름표 = document.createElement("div");
  이름표.className = "메뉴이름";
  이름표.textContent = 이름;
  맥락메뉴.appendChild(이름표);

  줄들.forEach(([글, 결, 할일]) => {
    if (할일 === null) {                    // 누를 수 없는 안내 줄
      const ㅅ = document.createElement("div");
      ㅅ.className = "메뉴안내";
      ㅅ.textContent = 글;
      맥락메뉴.appendChild(ㅅ);
      return;
    }
    const ㅂ = document.createElement("button");
    ㅂ.type = "button";
    ㅂ.className = "메뉴줄" + (결 ? " " + 결 : "");
    ㅂ.textContent = 글;
    ㅂ.addEventListener("click", () => { 메뉴닫기(); 할일(); });
    맥락메뉴.appendChild(ㅂ);
  });

  맥락메뉴.hidden = false;
  const 네 = 맥락메뉴.getBoundingClientRect();
  맥락메뉴.style.left = Math.max(8, Math.min(x, window.innerWidth  - 네.width  - 8)) + "px";
  맥락메뉴.style.top  = Math.max(8, Math.min(y, window.innerHeight - 네.height - 8)) + "px";
}

// ============================================================
//  ★★★ 주인만 고칠 수 있다 (2026-09-02 · 사용자가 정함)
// ============================================================
//
//  「야 이거 편집 제한좀 걸어야 하지 않냐?」
//   올려 둔 사이트는 학생이 본다. 거기서 강의를 지우거나 옮기거나
//   과목을 새로 만들 수 있으면 안 된다. 폰에서 꾹 누르면 메뉴가 떴다.
//
//  ★ 내 컴퓨터에서 연 것만 주인으로 본다.
//    밖에 올린 사이트(sejinedu.github.io)는 **보기만** 된다.
//  ★ 이건 자물쇠가 아니라 실수 막이다. 남의 화면에서 고쳐 봐야
//    그 사람 브라우저에만 남고 형 파일은 안 바뀐다.
//    그래도 학생이 헷갈리게 만들면 안 되니 아예 안 보이게 한다.
//  ★ 판단은 index.html 이 한 번만 한다. 여기서는 받아 쓴다 (지침서 6절 21번).
const 주인인가 = !!window.주인인가;

// ★ 화면(CSS)도 주인인지 알아야 한다.
//   손님한테는 touch-action 을 풀어 줘야 폰에서 스크롤이 된다. (2026-09-02)
if (주인인가) document.body.classList.add("주인");

// ★ 옆으로 쓸어서 서랍을 닫은 바로 그때 (2026-09-02)
//   쓸고 손을 떼면 그 단원이 「눌렸다」 로 잡혀서 같이 골라져 버린다.
//   서랍만 닫히길 바랐는데 화면까지 넘어가면 놀란다. 잠깐 동안은 고르기를 건너뛴다.
let 쓸어닫은때 = 0;

function 메뉴열기(마디, x, y) {
  if (!주인인가) return;                 // ★ 남의 화면에서는 안 뜬다
  메뉴띄우기(마디.이름, [
    ["동영상 링크 연결", "강조", () => 연결창열기(마디)],
    ["이름 바꾸기", "", () => 이름고치기(마디)],
    ["아래에 단원 추가", "", () => 아래더하기(마디)],
    ["삭제", "빨강", () => 마디지우기(마디)]
  ], x, y);
}

// ---------- 영상 카드 우클릭 ----------
//  사용자가 정한 것 (2026-09-01):
//    「동영상 미리보기 화면에서 우클릭하면 드롭바 뜨면서 삭제 할 수 있게」

function 카드메뉴열기(ㅇ, x, y) {
  if (!주인인가) return;                 // ★ 남의 화면에서는 안 뜬다 (2026-09-02)
  const 줄들 = [];

  const 아이디 = (ㅇ.아이디 || "").trim();
  const 자막상태 = (아이디 && 있나("자막공장")) ? 자막공장.상태(아이디) : null;

  if (아이디 && 있나("자막공장") && (!자막상태 || 자막상태.상태 === "없음" || 자막상태.상태 === "터짐")) {
    줄들.push(["자막 만들기", "강조", () => {
      자막공장.만들기(아이디).then(() => 자막자리들고치기());
    }]);
  }

  if (ㅇ.고유) {
    줄들.push(["동영상 수정", "", () => 연결창열기(null, ㅇ)]);
    줄들.push(["삭제", "빨강", () => 영상지우기(ㅇ)]);
  } else {
    // ★ 파일(js/동영상.js)에 적힌 영상은 브라우저가 못 지운다.
    //   조용히 안 되게 두지 말고 왜 안 되는지 적어 준다 (지침서 7절 23·25번).
    줄들.push(["화면에서는 못 지운다 — js\\동영상.js 에 적힌 영상이다", "", null]);
  }

  메뉴띄우기(ㅇ.제목 || "제목 없음", 줄들, x, y);
}

function 영상지우기(ㅇ) {
  const 어디 = 나무.길(ㅇ.단원아이디);
  let 물음 = "「" + (ㅇ.제목 || "제목 없음") + "」 을 목록에서 지운다.";
  if (ㅇ.강사) 물음 += "\n강사: " + ㅇ.강사;
  if (어디) 물음 += "\n단원: " + 어디.join(" › ");
  물음 += "\n\n★ 유튜브 영상 자체는 그대로 있다. 이 목록에서만 빠진다.\n\n지울까?";

  if (!confirm(물음)) return;

  if (!영상창고.지우기(ㅇ.고유)) { 쪽지("못 지웠다"); return; }

  const ㅈ = window.동영상목록.indexOf(ㅇ);
  if (ㅈ >= 0) window.동영상목록.splice(ㅈ, 1);
  if (지금영상 === ㅇ) 격자로();

  왼쪽그리기();          // 단원 옆 개수도 같이 줄어야 한다
  격자그리기();
  쪽지("지웠다");
}

document.addEventListener("pointerdown", ㅇ => {
  if (!맥락메뉴.hidden && !맥락메뉴.contains(ㅇ.target)) 메뉴닫기();
}, true);
document.addEventListener("keydown", ㅇ => {
  if (ㅇ.key === "Escape") { 메뉴닫기(); 서랍닫기(); if (!연결막.hidden) 연결창닫기(); }
});
window.addEventListener("scroll", 메뉴닫기, true);

// ============================================================
//  동영상 링크 연결 창
// ============================================================
//
//  사용자가 정한 것 (2026-09-01):
//    「각 단원 우클릭하면 동영상 링크 연결도 나오게. 클릭하면 새창.
//      새창에는 강사명 입력 칸, 동영상 url 입력 창」
//
//  ★ 붙인 영상은 이 브라우저에만 담긴다. js/동영상.js 는 안 바뀐다.
//    브라우저는 파일을 못 고친다 — 여러 사람이 같이 쓰려면 밖에 저장소가 있어야 한다.

const 연결막   = document.getElementById("연결막");
const 연결단원 = document.getElementById("연결단원");
const 연결강사 = document.getElementById("연결강사");
const 연결제목칸 = document.getElementById("연결제목칸");
const 연결주소 = document.getElementById("연결주소");
const 연결말   = document.getElementById("연결말");
const 연결하기단추 = document.getElementById("연결하기");

let 연결할마디 = null;
let 고칠영상 = null;         // 있으면 「수정」, 없으면 「새로 연결」
let 제목손댔나 = false;      // 사람이 제목을 직접 고쳤으면 덮어쓰지 않는다
let 제목받는중 = null;

// 마디를 주면 새로 붙이기, 영상을 주면 그 영상 고치기.
//  (사용자가 정한 것 — 「동영상 수정도 넣어라. 동영상 넣을 때와 같은 창」, 2026-09-02)
function 연결창열기(마디, 영상) {
  고칠영상 = 영상 || null;
  연결할마디 = 마디 || (영상 ? (나무.찾기(영상.단원아이디) || {}).마디 : null);
  if (!연결할마디) { 쪽지("그 단원을 못 찾았다"); return; }

  연결단원.textContent = (나무.길(연결할마디.아이디) || [연결할마디.이름]).join(" › ");
  document.getElementById("연결제목").textContent = 고칠영상 ? "동영상 수정" : "동영상 링크 연결";
  연결하기단추.textContent = 고칠영상 ? "고치기" : "연결";
  연결하기단추.disabled = false;
  연결말.textContent = "";
  연결말.className = "연결말";

  if (고칠영상) {
    연결강사.value = 고칠영상.강사 || "";
    연결제목칸.value = 고칠영상.제목 || "";
    연결주소.value = "https://youtu.be/" + (고칠영상.아이디 || "");
    제목손댔나 = true;                  // 이미 있는 제목을 덮어쓰지 않는다
  } else {
    연결주소.value = "";
    연결제목칸.value = "";
    제목손댔나 = false;
    // 강사명은 지난번에 넣은 것을 그대로 둔다 — 같은 강사 영상을 여럿 붙일 때 매번 치기 번거롭다
  }

  연결막.hidden = false;
  연결강사.focus();
  연결강사.select();
}

// ★ 주소를 넣으면 유튜브 제목을 받아다 제목 칸에 넣어 준다.
//   사람이 제목을 직접 고쳤으면 덮어쓰지 않는다.
//   (사용자가 정한 것 — 「디폴트 값은 유튜브에 있는 제목과 같다」, 2026-09-02)
연결제목칸.addEventListener("input", () => { 제목손댔나 = 연결제목칸.value.trim() !== ""; });

연결주소.addEventListener("input", () => {
  clearTimeout(제목받는중);
  제목받는중 = setTimeout(async () => {
    if (제목손댔나) return;
    const 아이디 = 영상창고.아이디뽑기(연결주소.value);
    if (!아이디) return;
    연결제목칸.placeholder = "유튜브에서 제목을 받아 오는 중…";
    const 제목 = await 영상창고.제목물어보기(아이디);
    연결제목칸.placeholder = "주소를 넣으면 유튜브 제목이 저절로 들어온다";
    if (!제목목손댔나값()) 연결제목칸.value = 제목 || "";
  }, 400);
});

// 받아 오는 동안 사람이 고쳤을 수도 있다 — 그때는 덮지 않는다
function 제목목손댔나값() { return 제목손댔나; }

function 연결창닫기() {
  연결막.hidden = true;
  연결할마디 = null;
  고칠영상 = null;
}

function 연결말하기(글, 결) {
  연결말.textContent = 글;
  연결말.className = "연결말" + (결 ? " " + 결 : "");
}

async function 연결누름() {
  if (!연결할마디) return;

  const 강사 = 연결강사.value.trim();
  const 주소 = 연결주소.value.trim();

  if (!강사)  { 연결말하기("강사명을 넣어라.", "빨강"); 연결강사.focus(); return; }
  if (!주소)  { 연결말하기("동영상 주소를 넣어라.", "빨강"); 연결주소.focus(); return; }

  const 아이디 = 영상창고.아이디뽑기(주소);
  if (!아이디) {
    // ★ 조용히 안 붙이면 「눌렀는데 아무 일도 안 났다」 가 된다 (지침서 7절 25번)
    연결말하기("유튜브 주소가 아니다. 주소창에 있는 것을 그대로 붙여넣어라.", "빨강");
    연결주소.focus(); 연결주소.select();
    return;
  }

  // 새로 붙일 때만 겹침을 막는다. 고치는 중이면 제 자신이라 걸리면 안 된다.
  if (!고칠영상 && 영상창고.이미있나(연결할마디.아이디, 아이디)) {
    연결말하기("이 단원에 그 영상은 이미 붙어 있다.", "빨강");
    return;
  }

  연결하기단추.disabled = true;
  연결하기단추.textContent = 고칠영상 ? "고치는 중" : "붙이는 중";

  // 제목 칸에 적은 것이 있으면 그것을 쓴다. 비었으면 유튜브 제목을 받아 온다.
  let 제목 = 연결제목칸.value.trim();
  if (!제목) {
    연결말하기("유튜브에서 제목을 받아 오는 중…", "");
    제목 = (await 영상창고.제목물어보기(아이디)) || "";
  }
  제목 = 제목 || "제목 없음";

  // ---- 고치기 ----
  if (고칠영상) {
    if (!영상창고.고치기(고칠영상.고유, { 강사, 제목, 아이디 })) {
      연결말하기("못 고쳤다. 브라우저 저장이 막혀 있다.", "빨강");
      연결하기단추.disabled = false;
      연결하기단추.textContent = "고치기";
      return;
    }
    고칠영상.강사 = 강사;
    고칠영상.제목 = 제목;
    고칠영상.아이디 = 아이디;
    const 보던것 = 지금영상 === 고칠영상;
    연결창닫기();
    왼쪽그리기(); 격자그리기();
    if (보던것) 격자로();          // 영상이 바뀌었으면 재생을 접는다
    쪽지("고쳤다 — " + 제목);
    return;
  }

  // ---- 새로 붙이기 ----
  const 새것 = 영상창고.더하기({ 단원아이디: 연결할마디.아이디, 강사, 제목, 아이디 });

  if (!새것) {
    연결말하기("못 담았다. 브라우저 저장이 막혀 있다.", "빨강");
    연결하기단추.disabled = false;
    연결하기단추.textContent = "연결";
    return;
  }

  window.동영상목록.push(새것);

  const 어디 = 연결할마디.이름;
  연결창닫기();
  왼쪽그리기();
  격자그리기();
  쪽지("「" + 어디 + "」 에 붙였다 — " + 제목);

  // ★ 붙이자마자 자막을 만들기 시작한다
  //   (사용자가 정한 것 — 「업로드 하면 자동으로 자막 만들어지게」, 2026-09-02)
  if (있나("자막공장")) 자막공장.만들기(아이디).then(ㄱ => {
    자막자리들고치기();
    if (ㄱ.상태 === "터짐") 쪽지("자막은 못 만들었다 — " + ㄱ.글);
    else if (ㄱ.상태 === "도는중") 쪽지("자막 만들기 시작했다");
  });
}

연결하기단추.addEventListener("click", 연결누름);
document.getElementById("연결취소").addEventListener("click", 연결창닫기);
연결막.addEventListener("click", ㅇ => { if (ㅇ.target === 연결막) 연결창닫기(); });
[연결강사, 연결제목칸, 연결주소].forEach(칸 => 칸.addEventListener("keydown", ㅇ => {
  ㅇ.stopPropagation();
  if (ㅇ.key === "Enter") { ㅇ.preventDefault(); 연결누름(); }
  if (ㅇ.key === "Escape") { ㅇ.preventDefault(); 연결창닫기(); }
}));

// 글자를 그 자리에서 고친다 (창을 띄우지 않는다 — 지침서 2-22)
function 이름고치기(마디) {
  const 상자 = 나무칸.querySelector('[data-아이디="' + CSS.escape(마디.아이디) + '"]');
  if (!상자) return;
  const 글 = 상자.querySelector(".글");
  const 칸 = document.createElement("input");
  칸.className = "고침칸";
  칸.value = 마디.이름;
  글.replaceWith(칸);
  칸.focus(); 칸.select();

  let 끝났나 = false;
  const 마치기 = 담을까 => {
    if (끝났나) return;
    끝났나 = true;
    if (담을까 && 칸.value.trim() && 칸.value.trim() !== 마디.이름) {
      나무.이름바꾸기(마디.아이디, 칸.value);
      쪽지("이름 바꿨다");
    }
    왼쪽그리기(); 격자그리기();
  };
  칸.addEventListener("keydown", ㅇ => {
    ㅇ.stopPropagation();
    if (ㅇ.key === "Enter") { ㅇ.preventDefault(); 마치기(true); }
    if (ㅇ.key === "Escape") { ㅇ.preventDefault(); 마치기(false); }
  });
  칸.addEventListener("blur", () => 마치기(true));
  칸.addEventListener("pointerdown", ㅇ => ㅇ.stopPropagation());
}

function 아래더하기(마디) {
  const 새아이디 = 나무.더하기(마디.아이디, "새 단원");
  if (!새아이디) return;

  // ★ 층은 「과목」 하나뿐이다. 단원 안으로 들어가면 안 된다.
  //   과목 층에서 더했을 때만 그 과목 안으로 들어간다 — 아니면 새 단원이 안 보인다.
  //   (슬라이드를 한 단계로 줄이면서 이 자리를 안 고쳐 층이 깨졌었다, 2026-09-01)
  if (경로.length === 0) 층들어가기(마디.아이디);
  else 왼쪽그리기();

  const 새마디 = 나무.찾기(새아이디);
  if (새마디) 이름고치기(새마디.마디);
}

function 마디지우기(마디) {
  const 딸린것 = new Set(나무.아래아이디들(마디));
  const 영상 = window.동영상목록.filter(ㅇ => 딸린것.has(ㅇ.단원아이디)).length;
  const 아래수 = 딸린것.size - 1;

  // ★ 되돌릴 수 없는 일이다. 무엇이 같이 없어지는지 재서 보여 준다. (지침서 5절 14·15번)
  let 물음 = "「" + 마디.이름 + "」 을 지운다.";
  if (아래수 > 0) 물음 += "\n아래 단원 " + 아래수 + "개도 같이 없어진다.";
  if (영상 > 0) 물음 += "\n여기 매달린 강의 " + 영상 + "개가 갈 곳을 잃는다.";
  물음 += "\n\n지울까?";

  if (!confirm(물음)) return;
  나무.지우기(마디.아이디);
  if (고른아이디 && 딸린것.has(고른아이디)) 고른아이디 = null;
  // 지운 마디 안에 들어와 있었으면 밖으로 빼낸다 — 안 그러면 빈 층에 갇힌다
  경로 = 경로.filter(ㅇ => !딸린것.has(ㅇ));
  왼쪽그리기(); 격자그리기(); 격자로();
  쪽지("지웠다");
}

document.getElementById("과목추가").addEventListener("click", () => {
  if (!주인인가) return;                 // ★ 남의 화면에서는 안 된다 (2026-09-02)
  const 새아이디 = 나무.더하기(null, "새 과목");
  경로 = [];
  왼쪽그리기();
  const 새마디 = 나무.찾기(새아이디);
  if (새마디) 이름고치기(새마디.마디);
});

// ============================================================
//  한 박스가 셋을 받는다 — 누르기 · 끌기 · 우클릭(꾹)
// ============================================================
//
//  ★ HTML5 의 draggable 은 폰에서 안 먹는다. 포인터로 직접 만든다.
//  ★ 누르기와 끌기를 가르는 기준은 「움직였느냐」 다.
//    6px 넘게 움직이면 끌기, 안 움직이고 떼면 고르기.
//    그래야 따로 「고치기」 를 켜지 않아도 둘 다 된다.

const 끌기시작거리 = 6;
const 꾹누르는시간 = 480;

function 손붙이기(상자, 마디, 아래있나) {
  const 아이디 = 마디.아이디;

  상자.addEventListener("contextmenu", ㅇ => {
    ㅇ.preventDefault();
    메뉴열기(마디, ㅇ.clientX, ㅇ.clientY);
  });

  상자.addEventListener("pointerdown", 시작 => {
    if (시작.button === 2) return;
    if (시작.target.closest(".꺾쇠")) return;     // 꺾쇠는 접기·펴기 전용
    if (시작.target.closest(".고침칸")) return;

    let 끌고있나 = false, 메뉴떴나 = false, 마지막 = null;

    // ★★★ 손님한테는 꾹 누르기 시계를 아예 안 돌린다 (2026-09-02 에 밟음)
    //   전에는 시계는 돌면서 메뉴만 안 떴다. 그래서 천천히 누르면
    //   「메뉴 떴다」 로 쳐 버려서 **고르기가 안 먹었다.** 폰에서 답답해진다.
    const 꾹시계 = 주인인가 ? setTimeout(() => {
      if (끌고있나) return;
      메뉴떴나 = true;
      메뉴열기(마디, 시작.clientX, 시작.clientY);
    }, 꾹누르는시간) : null;

    const 움직임 = ㅇ => {
      if (메뉴떴나) return;
      if (!끌고있나) {
        if (!주인인가) return;                 // ★ 남의 화면에서는 못 끈다 (2026-09-02)
        if (Math.abs(ㅇ.clientY - 시작.clientY) < 끌기시작거리 &&
            Math.abs(ㅇ.clientX - 시작.clientX) < 끌기시작거리) return;
        clearTimeout(꾹시계);
        끌고있나 = true;
        끄는것.textContent = 마디.이름;
        끄는것.hidden = false;
        document.body.classList.add("끄는중");
      }
      끄는것.style.left = ㅇ.clientX + "px";
      끄는것.style.top  = ㅇ.clientY + "px";

      나무칸.querySelectorAll(".상자").forEach(ㅅ => ㅅ.classList.remove("위로", "아래로", "안으로"));
      마지막 = null;

      const 밑 = document.elementFromPoint(ㅇ.clientX, ㅇ.clientY);
      const 목표상자 = 밑 && 밑.closest(".상자");
      if (!목표상자 || !목표상자.dataset.아이디) return;
      const 목표아이디 = 목표상자.dataset.아이디;
      if (목표아이디 === 아이디) return;

      const 네모 = 목표상자.getBoundingClientRect();
      const 비율 = (ㅇ.clientY - 네모.top) / 네모.height;
      const 자리 = 비율 < 0.28 ? "위" : (비율 > 0.72 ? "아래" : "안");
      목표상자.classList.add(자리 === "위" ? "위로" : 자리 === "아래" ? "아래로" : "안으로");
      마지막 = { 아이디: 목표아이디, 자리, 이름: 목표상자.querySelector(".글").textContent };
    };

    const 놓음 = () => {
      clearTimeout(꾹시계);
      window.removeEventListener("pointermove", 움직임);
      window.removeEventListener("pointerup", 놓음);
      window.removeEventListener("pointercancel", 놓음);
      끄는것.hidden = true;
      document.body.classList.remove("끄는중");
      나무칸.querySelectorAll(".상자").forEach(ㅅ => ㅅ.classList.remove("위로", "아래로", "안으로"));

      if (메뉴떴나) return;
      // ★ 옆으로 쓸어서 서랍을 닫은 직후라면 고르지 않는다 (2026-09-02)
      if (Date.now() - 쓸어닫은때 < 450) return;
      if (!끌고있나) { 고르기(아이디, 아래있나); return; }
      if (!마지막) return;

      if (나무.옮기기(아이디, 마지막.아이디, 마지막.자리)) {
        왼쪽그리기(); 격자그리기();
        쪽지(마지막.자리 === "안" ? "「" + 마지막.이름 + "」 안으로 넣었다" : "옮겼다");
      } else {
        // ★ 제 자식 안으로 넣으려 한 것. 조용히 넘어가면 「없어졌다」 가 된다.
        쪽지("거기로는 못 옮긴다 (제 아래 단원이다)");
      }
    };

    window.addEventListener("pointermove", 움직임);
    window.addEventListener("pointerup", 놓음);
    window.addEventListener("pointercancel", 놓음);
  });
}

// ============================================================
//  ① 격자 — 썸네일이 주르륵
// ============================================================

function 지금묶음() {
  if (!고른아이디) return { 목록: [], 머리: "", 아이디: "" };
  const 마디 = 나무.찾기(고른아이디);
  if (!마디) return { 목록: [], 머리: "", 아이디: "" };
  const 딸린것 = new Set(나무.아래아이디들(마디.마디));
  return {
    목록: window.동영상목록.filter(ㅇ => 딸린것.has(ㅇ.단원아이디)),
    머리: (나무.길(고른아이디) || [마디.마디.이름]).join(" › "),
    아이디: 고른아이디
  };
}

// 많이 본 것이 앞으로 — 강사끼리 겨루는 자리다
const 조회순 = 목록 => 목록.slice().sort((ㄱ, ㄴ) =>
  기록소.읽기((ㄴ.아이디 || "").trim()).조회 - 기록소.읽기((ㄱ.아이디 || "").trim()).조회);

function 격자그리기() {
  격자칸.innerHTML = "";
  목록머리.innerHTML = "";

  if (!고른아이디) {
    격자칸.appendChild(안내("왼쪽에서 단원을 고르면 강의가 여기 나온다.",
                            "폰에서는 왼쪽 위 ☰ 를 눌러라."));
    return;
  }

  const 묶음 = 지금묶음();
  지금무리 = 조회순(묶음.목록);

  const 길줄 = document.createElement("div");
  길줄.className = "길줄";
  길줄.textContent = 묶음.머리;
  목록머리.appendChild(길줄);

  const 잔 = document.createElement("div");
  잔.className = "머리잔글";
  const 강사수 = new Set(지금무리.map(ㅇ => ㅇ.강사)).size;
  잔.textContent = "강의 " + 지금무리.length + "개" + (강사수 > 1 ? " · 강사 " + 강사수 + "명" : "");
  목록머리.appendChild(잔);

  if (묶음.아이디) {
    const 아 = document.createElement("div");
    아.className = "단원아이디";
    아.textContent = "단원 아이디  " + 묶음.아이디;
    목록머리.appendChild(아);
  }

  // ★ 오른쪽은 유튜브처럼 「영상만」 둔다.
  //   (사용자가 정한 것 — 「동영상 보이는 부분은 그냥 유튜브처럼 화면만 있는 거다」, 2026-09-01)
  //   단원을 고르는 일은 전부 왼쪽에서 한다.
  if (지금무리.length === 0) {
    격자칸.appendChild(안내("여기에는 아직 올린 강의가 없다.", ""));
    return;
  }

  const 판 = document.createElement("div");
  판.className = "카드판";
  지금무리.forEach(ㅇ => 판.appendChild(카드만들기(ㅇ)));
  격자칸.appendChild(판);

  // 여기 보이는 영상들의 자막 상태를 물어본다 (한 번에)
  const 지금아이디들 = 지금무리.map(ㅇ => (ㅇ.아이디 || "").trim()).filter(Boolean);
  if (있나("자막공장")) 자막공장.물어보기(지금아이디들);
  길이물어보기(지금아이디들);
}

function 카드만들기(ㅇ) {
  const 아이디 = (ㅇ.아이디 || "").trim();
  const 비었나 = 아이디 === "";
  const 숫자 = 기록소.읽기(아이디);

  const 카드 = document.createElement("button");
  카드.type = "button";
  카드.className = "카드" + (비었나 ? " 막힘" : "");

  const 그림 = document.createElement("div");
  그림.className = "카드그림";
  if (비었나) {
    const 없음 = document.createElement("span");
    없음.className = "없음";
    없음.textContent = "유튜브 아이디를 아직 안 넣었다";
    그림.appendChild(없음);
    카드.disabled = true;
  } else {
    const 사진 = document.createElement("img");
    사진.src = "https://i.ytimg.com/vi/" + 아이디 + "/hqdefault.jpg";
    사진.alt = "";
    사진.loading = "lazy";
    // ★★★ 이걸 빼면 카드를 못 끈다 (2026-09-02 에 밟음)
    //   브라우저는 <img> 를 기본으로 「끌 수 있는 그림」 으로 본다.
    //   카드를 끌면 브라우저가 그림을 끌어가 버려서 우리 pointermove 가 끊긴다.
    //   그러면 아무 일도 안 일어난 것처럼 보인다.
    사진.draggable = false;
    그림.appendChild(사진);

    // 영상 길이 딱지 — 오른쪽 아래. 숫자는 나중에 채운다.
    // ★ 카드를 다시 그리지 않고 여기 「안만」 고친다 (클릭 씹힘 방지)
    const 길이딱지 = document.createElement("span");
    길이딱지.className = "영상길이";
    길이딱지.dataset.영상 = 아이디;
    길이딱지.hidden = true;
    그림.appendChild(길이딱지);
    길이딱지칠하기(길이딱지, 아이디);

    카드.addEventListener("click", () => 틀기(ㅇ));
  }

  const 글칸 = document.createElement("div");
  글칸.className = "카드글";

  const 제목 = document.createElement("div");
  제목.className = "카드제목";
  제목.textContent = ㅇ.제목 || "제목 없음";

  const 아래 = document.createElement("div");
  아래.className = "카드아래";
  아래.innerHTML =
    '<span class="강사이름">' + (ㅇ.강사 || "") + '</span>' +
    (비었나 ? "" : '<span>조회 ' + 셈(숫자.조회) + '</span>' +
                   '<span class="하트' + (숫자.내좋아요 ? " 내가" : "") + '">♥ ' + 셈(숫자.좋아요) + '</span>');

  글칸.appendChild(제목);
  글칸.appendChild(아래);

  // 자막이 만들어지는 중이면 게이지를 보여 준다
  // ★ 게이지가 들어갈 자리를 미리 만들어 둔다. 나중에 여기 「안만」 고쳐 그린다.
  //   카드를 통째로 다시 그리면 누르려던 카드가 손 밑에서 사라져 클릭이 씹힌다.
  //   (2026-09-02 — 「동영상이 안 열려」 의 원인이었다)
  if (!비었나) {
    const 자막자리 = document.createElement("div");
    자막자리.className = "자막자리";
    자막자리.dataset.영상 = 아이디;
    글칸.appendChild(자막자리);
    자막자리칠하기(자막자리, 아이디);
  }

  카드.appendChild(그림);
  카드.appendChild(글칸);

  // 우클릭 — 그리고 폰에는 우클릭이 없으니 꾹 누르는 것도 받는다
  카드.addEventListener("contextmenu", ㄴ => {
    ㄴ.preventDefault();
    카드메뉴열기(ㅇ, ㄴ.clientX, ㄴ.clientY);
  });
  카드끌기붙이기(카드, ㅇ);
  return 카드;
}

// ---------- 썸네일 끌어서 다른 단원으로 ----------
//
//  사용자가 정한 것 (2026-09-01):
//    「미리보기 동영상 잡고 드래그해서 다른 단원으로 이동할 수 있게」
//
//  ★ 왼쪽 단원 박스 위에 떨구면 그 단원으로 옮긴다.
//    누르기·꾹누르기(메뉴)·끌기 셋을 한 카드가 다 받는다 — 가르는 기준은 「움직였느냐」다.

function 카드끌기붙이기(카드, ㅇ) {
  // 브라우저가 제 방식으로 끌어가려는 것을 막는다
  카드.addEventListener("dragstart", ㅇ2 => ㅇ2.preventDefault());

  카드.addEventListener("pointerdown", 시작 => {
    if (시작.button === 2) return;

    let 끌고있나 = false, 메뉴떴나 = false, 목표상자 = null;

    // ★ 손님한테는 꾹 누르기·끌기가 없다 — 폰에서 스크롤을 막으면 안 된다 (2026-09-02)
    const 꾹시계 = 주인인가 ? setTimeout(() => {
      if (끌고있나) return;
      메뉴떴나 = true;
      카드메뉴열기(ㅇ, 시작.clientX, 시작.clientY);
    }, 꾹누르는시간) : null;

    const 움직임 = ㅁ => {
      if (메뉴떴나) return;
      if (!끌고있나) {
        if (!주인인가) return;                 // ★ 손님은 못 끈다
        if (Math.abs(ㅁ.clientY - 시작.clientY) < 끌기시작거리 &&
            Math.abs(ㅁ.clientX - 시작.clientX) < 끌기시작거리) return;
        clearTimeout(꾹시계);
        if (!ㅇ.고유) {           // 파일에 적힌 영상은 못 옮긴다
          메뉴떴나 = true;
          쪽지("이 영상은 js\\동영상.js 에 적혀 있어서 화면에서는 못 옮긴다");
          return;
        }
        끌고있나 = true;
        끄는것.textContent = ㅇ.제목 || "영상";
        끄는것.hidden = false;
        document.body.classList.add("끄는중", "영상끄는중");
        // ★ 좁은 화면에서만 서랍을 연다. 넓은 화면에서 열면 뒷막이 화면을 덮어서
        //   그 밑의 단원을 못 짚는다 — 끌어도 아무 데도 안 놓인다. (2026-09-01 에 밟음)
        if (window.innerWidth <= 900) 서랍열기();
      }
      끄는것.style.left = ㅁ.clientX + "px";
      끄는것.style.top  = ㅁ.clientY + "px";

      나무칸.querySelectorAll(".상자").forEach(ㅅ => ㅅ.classList.remove("안으로"));
      목표상자 = null;

      const 밑 = document.elementFromPoint(ㅁ.clientX, ㅁ.clientY);
      const 상자 = 밑 && 밑.closest(".상자");
      if (상자 && 상자.dataset.아이디 && 상자.dataset.아이디 !== ㅇ.단원아이디) {
        상자.classList.add("안으로");
        목표상자 = 상자;
      }
    };

    const 놓음 = () => {
      clearTimeout(꾹시계);
      window.removeEventListener("pointermove", 움직임);
      window.removeEventListener("pointerup", 놓음);
      window.removeEventListener("pointercancel", 놓음);
      끄는것.hidden = true;
      document.body.classList.remove("끄는중", "영상끄는중");
      나무칸.querySelectorAll(".상자").forEach(ㅅ => ㅅ.classList.remove("안으로"));

      if (메뉴떴나 || !끌고있나) return;

      if (!목표상자) { 쪽지("단원 위에 놓아야 옮겨진다"); return; }

      const 새단원 = 목표상자.dataset.아이디;
      if (!영상창고.옮기기(ㅇ.고유, 새단원)) { 쪽지("못 옮겼다"); return; }

      ㅇ.단원아이디 = 새단원;
      const 길 = 나무.길(새단원);
      왼쪽그리기(); 격자그리기();
      쪽지("「" + (길 ? 길[길.length - 1] : "그 단원") + "」 으로 옮겼다");
    };

    window.addEventListener("pointermove", 움직임);
    window.addEventListener("pointerup", 놓음);
    window.addEventListener("pointercancel", 놓음);
  });
}

// ---------- 영상 길이 딱지 ----------
//  사용자가 정한 것 (2026-09-02): 「썸네일 우측 하단에 영상 시간 뜨게」

const 길이창고 = {};          // 영상아이디 → 초
let 길이물은적 = 0;           // 몇 번이나 다시 물었나 (모르는 게 남아 있을 때만 다시 묻는다)
let 길이시계 = null;

function 초를시각으로(초) {
  초 = Math.round(초);
  const ㅅ = Math.floor(초 / 3600);
  const ㅂ = Math.floor((초 % 3600) / 60);
  const ㅊ = 초 % 60;
  const 두자리 = ㄴ => (ㄴ < 10 ? "0" + ㄴ : "" + ㄴ);
  return ㅅ > 0 ? (ㅅ + ":" + 두자리(ㅂ) + ":" + 두자리(ㅊ)) : (ㅂ + ":" + 두자리(ㅊ));
}

function 길이딱지칠하기(딱지, 아이디) {
  const 초 = 길이창고[아이디];
  if (!초) { 딱지.hidden = true; return; }
  딱지.textContent = 초를시각으로(초);
  딱지.hidden = false;
}

function 길이딱지들고치기() {
  document.querySelectorAll(".영상길이").forEach(딱지 => 길이딱지칠하기(딱지, 딱지.dataset.영상));
}

// ★★★ 서버 없이 열어도 시간 딱지가 나오게 (2026-09-02 · 사용자가 정함)
//   「내가 이 웹사이트 주소만 주면 여기 들어올수 있게 한다」
//   밖에 올린 사이트에는 서버가 없다. 그러면 /영상/길이 를 물어볼 데가 없어서
//   썸네일 밑 시간 딱지가 하나도 안 뜬다.
//   ⇒ 서버가 알아 둔 것을 자료/길이.json 에 담아 같이 올린다. 그걸 먼저 읽는다.
//   ★ 딱 한 번만 읽는다. 없어도 그냥 넘어간다 — 딱지만 안 뜰 뿐이다.
let 길이파일읽었나 = false;

async function 길이파일읽기() {
  if (길이파일읽었나) return;
  길이파일읽었나 = true;
  try {
    const ㄷ = await fetch("자료/길이.json?v=" + window.판);
    if (!ㄷ.ok) return;
    const 답 = await ㄷ.json();
    let 새것 = 0;
    Object.keys(답).forEach(ㅇ => {
      if (답[ㅇ] > 0 && !길이창고[ㅇ]) { 길이창고[ㅇ] = 답[ㅇ]; 새것++; }
    });
    if (새것) 길이딱지들고치기();
  } catch (오류) { /* 파일이 없는 것뿐이다. 딱지만 안 뜬다 */ }
}

async function 길이물어보기(아이디들) {
  await 길이파일읽기();                       // ★ 파일에 있는 것부터 쓴다
  const 모르는것 = [...new Set(아이디들.filter(ㅇ => ㅇ && !길이창고[ㅇ]))];
  if (!모르는것.length) { 길이물은적 = 0; return; }
  if (location.protocol !== "http:" && location.protocol !== "https:") return;

  try {
    const ㄷ = await fetch("/영상/길이?v=" + 모르는것.join(","), { cache: "no-store" });
    if (!ㄷ.ok) return;                       // 옛 서버면 조용히 넘어간다 — 딱지만 안 뜬다
    const 답 = await ㄷ.json();
    let 새것 = 0;
    Object.keys(답).forEach(ㅇ => { if (답[ㅇ] > 0) { 길이창고[ㅇ] = 답[ㅇ]; 새것++; } });
    if (새것) 길이딱지들고치기();

    // 서버가 뒤에서 알아보는 중이다. 아직 모르는 게 있으면 조금 뒤에 다시 묻는다.
    const 아직 = 모르는것.filter(ㅇ => !길이창고[ㅇ]);
    clearTimeout(길이시계);
    if (아직.length && 길이물은적 < 10) {
      길이물은적++;
      길이시계 = setTimeout(() => 길이물어보기(아직), 2500);
    } else {
      길이물은적 = 0;
    }
  } catch (오류) { /* 서버가 잠깐 안 받는 것뿐이다 */ }
}

// ---------- 자막 만드는 중 게이지 ----------
//  사용자가 정한 것 (2026-09-02): 「자막 생성되는 동안은 게이지가 차도록」

// 자막 자리 하나만 고쳐 그린다. 카드는 안 건드린다.
function 자막자리칠하기(자리, 아이디) {
  if (!있나("자막공장")) { 자리.innerHTML = ""; return; }
  const ㄱ = 자막공장.상태(아이디);

  if (!ㄱ || ㄱ.상태 === "있음") { 자리.innerHTML = ""; return; }   // 이미 있으면 아무것도 안 보여 준다

  // 줄 서서 기다리는 중 — 그래픽카드는 하나뿐이라 한 번에 하나씩만 굽는다
  if (ㄱ.상태 === "기다림") {
    let 글칸 = 자리.querySelector(".자막칸.기다림 .자막글");
    if (!글칸) {
      자리.innerHTML = '<div class="자막칸 기다림"><div class="자막글"></div></div>';
      글칸 = 자리.querySelector(".자막글");
    }
    글칸.textContent = "자막 " + ㄱ.글;
    return;
  }

  if (ㄱ.상태 === "도는중") {
    // ★ 이미 게이지가 있으면 숫자만 갈아 끼운다. 통째로 다시 만들지 않는다.
    let 찬것 = 자리.querySelector(".자막찬것");
    if (!찬것) {
      자리.innerHTML =
        '<div class="자막칸 도는중">' +
        '<div class="자막글"></div>' +
        '<div class="자막게이지"><div class="자막찬것"></div></div></div>';
      찬것 = 자리.querySelector(".자막찬것");
    }
    자리.querySelector(".자막글").innerHTML =
      "자막 만드는 중 · " + ㄱ.글 + " <b>" + ㄱ.진행 + "%</b>";
    찬것.style.width = ㄱ.진행 + "%";
    return;
  }

  if (ㄱ.상태 === "터짐") {
    if (!자리.querySelector(".다시단추")) {
      자리.innerHTML = '<div class="자막칸 터짐"><div class="자막글"></div></div>';
      // 막힌 까닭이 고쳐졌을 수 있다. 다시 해 볼 길을 남겨 둔다.
      const 다시 = document.createElement("button");
      다시.type = "button";
      다시.className = "자막만들기단추 다시단추";
      다시.textContent = "다시 만들기";
      다시.addEventListener("click", ㅇ => {
        ㅇ.stopPropagation();
        자막공장.만들기(아이디).then(() => 자막자리들고치기());
      });
      다시.addEventListener("pointerdown", ㅇ => ㅇ.stopPropagation());
      자리.querySelector(".자막칸").appendChild(다시);
    }
    자리.querySelector(".자막글").textContent = "자막 못 만들었다 — " + ㄱ.글;
    return;
  }

  // 없음 — 만들 수 있다고 알려 준다
  if (자리.querySelector(".자막만들기단추")) return;      // 이미 있으면 그대로 둔다
  자리.innerHTML = "";
  const 통 = document.createElement("div");
  통.className = "자막칸 없음";
  const ㅂ = document.createElement("button");
  ㅂ.type = "button";
  ㅂ.className = "자막만들기단추";
  ㅂ.textContent = "자막 만들기";
  ㅂ.addEventListener("click", ㅇ => {
    ㅇ.stopPropagation();
    자막공장.만들기(아이디).then(() => 자막자리들고치기());
  });
  // ★ 카드 누르기·끌기와 겹치지 않게
  ㅂ.addEventListener("pointerdown", ㅇ => ㅇ.stopPropagation());
  통.appendChild(ㅂ);
  자리.appendChild(통);
}

// 화면에 있는 자막 자리를 전부 고쳐 그린다 (카드는 그대로)
function 자막자리들고치기() {
  document.querySelectorAll(".자막자리").forEach(자리 => {
    자막자리칠하기(자리, 자리.dataset.영상);
  });
}

function 안내(글, 잔글) {
  const 통 = document.createElement("p");
  통.className = "빈목록";
  통.textContent = 글;
  if (잔글) {
    const ㅅ = document.createElement("span");
    ㅅ.className = "빈잔글";
    ㅅ.textContent = 잔글;
    통.appendChild(ㅅ);
  }
  return 통;
}

// ============================================================
//  ② 보기 — 유튜브처럼
// ============================================================

function 격자로() {
  보기칸.hidden = true;
  격자보기.hidden = false;
  자막.떼기();
  재생기.끄기();                // ★ 여기서 화면칸도 비운다 — 소리가 계속 나지 않게
  찾기줄.hidden = true;
  찾기칸.value = "";
  찾은것.innerHTML = "";
  지금영상 = null;
}

function 틀기(ㅇ) {
  지금영상 = ㅇ;
  const 아이디 = ㅇ.아이디.trim();

  재생기.틀기(아이디, ㅇ.제목);      // 재생바는 유튜브 것을 그대로 쓴다

  지금제목.textContent = ㅇ.제목 || "";
  document.getElementById("지금강사이름").textContent = ㅇ.강사 || "";
  지금강사.hidden = !ㅇ.강사;         // 강사가 없으면 「강사」 딱지만 덜렁 남지 않게
  const 길 = 나무.길(ㅇ.단원아이디);
  지금길.textContent = 길 ? 길.join(" › ") : "";

  기록소.조회올리기(아이디);
  숫자칠하기();

  격자보기.hidden = true;
  보기칸.hidden = false;
  옆목록그리기();
  상태밀기();                     // 시청 화면도 뒤로 단추로 빠져나올 수 있게
  window.scrollTo({ top: 0, behavior: "smooth" });

  자막붙여보기(아이디);
}

// 자막이 있는 영상이면 붙인다. 없으면 조용히 그냥 영상만 나온다.
// ★ 자막이 뒤늦게 다 구워졌을 때도 이걸 다시 부른다.
function 자막붙여보기(아이디) {
  찾기줄.hidden = true;
  찾은것.innerHTML = "";
  영상밑줄.hidden = true;
  자막.붙이기(아이디).then(묶음 => {
    if (!묶음) return;
    찾기줄.hidden = false;
    찾기셈.textContent = 묶음.줄.length.toLocaleString("ko-KR") + "줄";
    영상밑줄.hidden = false;
    자막단추칠하기();
  });
}

const 영상밑줄 = document.getElementById("영상밑줄");
document.getElementById("전체단추").addEventListener("click", () => 재생기.전체화면());

// ---------- 자막 켜고 끄기 ----------

const 자막끄기단추 = document.getElementById("자막끄기");

function 자막단추칠하기() {
  const 켜짐 = 자막.켜졌나();
  자막끄기단추.textContent = 켜짐 ? "자막 켬" : "자막 끔";
  자막끄기단추.setAttribute("aria-pressed", 켜짐 ? "true" : "false");
  자막끄기단추.classList.toggle("꺼짐", !켜짐);
}

자막끄기단추.addEventListener("click", () => { 자막.켜고끄기(); 자막단추칠하기(); });

// ---------- 자막 크기 ----------

const 자막크기단추 = document.getElementById("자막크기단추");
const 크기판 = document.getElementById("크기판");

자막크기단추.addEventListener("click", ㅇ => {
  ㅇ.stopPropagation();
  크기판.hidden = !크기판.hidden;
  if (!크기판.hidden) 크기판그리기();
});

document.addEventListener("click", ㅇ => {
  if (!크기판.hidden && !크기판.contains(ㅇ.target) && ㅇ.target !== 자막크기단추) 크기판.hidden = true;
});

function 크기판그리기() {
  크기판.innerHTML = "";

  // --- 크기 ---
  const 크기머리 = document.createElement("div");
  크기머리.className = "판머리";
  크기머리.textContent = "자막 크기";
  크기판.appendChild(크기머리);

  const 지금 = 자막.지금크기();
  자막.크기목록().forEach(ㅋ => {
    const 단 = document.createElement("button");
    단.type = "button";
    단.className = "크기줄" + (Math.abs(ㅋ.값 - 지금) < 0.01 ? " 골랐음" : "");
    단.textContent = ㅋ.이름;
    단.style.fontSize = (0.72 + (ㅋ.값 - 0.8) * 0.28) + "rem";   // 고를 때 크기가 눈에 보이게
    단.addEventListener("click", ㅈ => {
      ㅈ.stopPropagation();
      자막.크기바꾸기(ㅋ.값);
      크기판그리기();
    });
    크기판.appendChild(단);
  });

  // --- 밀기 (싱크) ---
  const 밀기머리 = document.createElement("div");
  밀기머리.className = "판머리 위줄";
  밀기머리.textContent = "자막 밀기";
  크기판.appendChild(밀기머리);

  const 밀기줄 = document.createElement("div");
  밀기줄.className = "밀기줄";

  const 만들기 = (글, 할일, 결) => {
    const ㅂ = document.createElement("button");
    ㅂ.type = "button";
    ㅂ.className = "밀기단추" + (결 ? " " + 결 : "");
    ㅂ.textContent = 글;
    ㅂ.addEventListener("click", ㅈ => { ㅈ.stopPropagation(); 할일(); 크기판그리기(); });
    return ㅂ;
  };

  밀기줄.appendChild(만들기("−", () => 자막.밀기바꾸기(자막.지금밀기() - 0.1)));

  const 값 = document.createElement("span");
  값.className = "밀기값";
  const ㅁ = 자막.지금밀기();
  값.textContent = (ㅁ > 0 ? "+" : "") + ㅁ.toFixed(2) + "초";
  밀기줄.appendChild(값);

  밀기줄.appendChild(만들기("+", () => 자막.밀기바꾸기(자막.지금밀기() + 0.1)));
  밀기줄.appendChild(만들기("0", () => 자막.밀기바꾸기(0), "영으로"));

  크기판.appendChild(밀기줄);

  const 귀 = document.createElement("div");
  귀.className = "판귀띔";
  귀.textContent = "자막이 미리 뜨면 +, 늦게 뜨면 −";
  크기판.appendChild(귀);
}

// ---------- 강의 안에서 찾기 ----------

const 찾기줄 = document.getElementById("찾기줄");
const 찾기칸 = document.getElementById("찾기칸");
const 찾기셈 = document.getElementById("찾기셈");
const 찾은것 = document.getElementById("찾은것");

const 시각글 = 초 => {
  초 = Math.floor(초);
  const ㅅ = Math.floor(초 / 3600), ㅂ = Math.floor((초 % 3600) / 60), ㅊ = 초 % 60;
  return (ㅅ ? ㅅ + ":" + String(ㅂ).padStart(2, "0") : ㅂ) + ":" + String(ㅊ).padStart(2, "0");
};

let 찾기시계 = null;
찾기칸.addEventListener("input", () => {
  clearTimeout(찾기시계);
  찾기시계 = setTimeout(찾기, 180);      // 칠 때마다 훑지 않게 잠깐 기다린다
});
찾기칸.addEventListener("keydown", ㅇ => ㅇ.stopPropagation());

function 찾기() {
  const 말 = 찾기칸.value.trim();
  찾은것.innerHTML = "";
  const 줄들 = 자막.줄들();

  if (!말) { 찾기셈.textContent = 줄들.length.toLocaleString("ko-KR") + "줄"; return; }

  const 걸린것 = [];
  for (const ㄱ of 줄들) {
    if (ㄱ.글.includes(말)) 걸린것.push(ㄱ);
    if (걸린것.length >= 80) break;      // 너무 많으면 앞에서 끊는다
  }

  찾기셈.textContent = 걸린것.length === 0
    ? "없다"
    : (걸린것.length >= 80 ? "80개 넘음 (앞 80개만)" : 걸린것.length + "곳");

  걸린것.forEach(ㄱ => {
    const ㅂ = document.createElement("button");
    ㅂ.type = "button";
    ㅂ.className = "찾은줄";

    const 때 = document.createElement("span");
    때.className = "찾은때";
    때.textContent = 시각글(ㄱ.시작);
    ㅂ.appendChild(때);

    const 글 = document.createElement("span");
    글.className = "찾은글";
    // 찾은 말에 표시를 한다
    const ㅈ = ㄱ.글.indexOf(말);
    글.append(ㄱ.글.slice(0, ㅈ));
    const 빛 = document.createElement("mark");
    빛.textContent = ㄱ.글.substr(ㅈ, 말.length);
    글.appendChild(빛);
    글.append(ㄱ.글.slice(ㅈ + 말.length));
    ㅂ.appendChild(글);

    ㅂ.addEventListener("click", () => {
      재생기.뛰기(Math.max(0, ㄱ.시작 - 0.6));
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    찾은것.appendChild(ㅂ);
  });
}

function 숫자칠하기() {
  if (!지금영상) return;
  const 숫자 = 기록소.읽기(지금영상.아이디.trim());
  지금셈.textContent = "조회 " + 셈(숫자.조회);
  좋아요단추.textContent = "♥ " + 셈(숫자.좋아요);
  좋아요단추.setAttribute("aria-pressed", 숫자.내좋아요 ? "true" : "false");
  좋아요단추.classList.toggle("눌림", 숫자.내좋아요);
}

function 옆목록그리기() {
  옆목록.innerHTML = "";
  const 머리 = document.createElement("div");
  머리.className = "옆머리";
  머리.textContent = "같은 단원의 다른 강의";
  옆목록.appendChild(머리);

  const 남은것 = 지금무리.filter(ㅇ => ㅇ !== 지금영상);
  if (남은것.length === 0) {
    const ㅂ = document.createElement("p");
    ㅂ.className = "옆빔";
    ㅂ.textContent = "이 단원에는 이 강의뿐이다.";
    옆목록.appendChild(ㅂ);
    return;
  }

  남은것.forEach(ㅇ => {
    const 아이디 = (ㅇ.아이디 || "").trim();
    const 비었나 = 아이디 === "";
    const 숫자 = 기록소.읽기(아이디);

    const 줄 = document.createElement("button");
    줄.type = "button";
    줄.className = "옆줄" + (비었나 ? " 막힘" : "");

    const 그림 = document.createElement("div");
    그림.className = "옆그림";
    if (비었나) {
      const 없 = document.createElement("span");
      없.className = "없음";
      없.textContent = "아이디 없음";
      그림.appendChild(없);
      줄.disabled = true;
    } else {
      const 사진 = document.createElement("img");
      사진.src = "https://i.ytimg.com/vi/" + 아이디 + "/mqdefault.jpg";
      사진.alt = ""; 사진.loading = "lazy"; 사진.draggable = false;
      그림.appendChild(사진);
      줄.addEventListener("click", () => 틀기(ㅇ));
    }

    const 속 = document.createElement("div");
    속.className = "옆속";
    속.innerHTML =
      '<div class="옆제목"></div>' +
      '<div class="옆아래"><span class="강사이름"></span>' +
      (비었나 ? "" : '<span>조회 ' + 셈(숫자.조회) + '</span>') + '</div>';
    속.querySelector(".옆제목").textContent = ㅇ.제목 || "제목 없음";
    속.querySelector(".강사이름").textContent = ㅇ.강사 || "";

    줄.appendChild(그림);
    줄.appendChild(속);
    옆목록.appendChild(줄);
  });
}

좋아요단추.addEventListener("click", () => {
  if (!지금영상) return;
  기록소.좋아요누르기(지금영상.아이디.trim());
  숫자칠하기();
});

document.getElementById("뒤로").addEventListener("click", () => history.back());

// ============================================================
//  뒤로가기 — 브라우저 뒤로 단추가 먹게 한다
// ============================================================
//
//  사용자가 정한 것 (2026-09-02): 「뒤로가기 버튼 안 먹힌다. 모든 창에서 되게 해라」
//
//  ★ 이 홈페이지는 주소가 안 바뀌는 한 장짜리다. 그래서 브라우저가 「뒤로 갈 데」 를 모른다.
//    화면이 바뀔 때마다 지금 상태를 브라우저 기록에 밀어 넣어 준다.
//    그러면 뒤로 단추가 그 기록을 되짚는다. 폰의 뒤로 제스처도 같이 먹는다.

let 되돌리는중 = false;

function 지금상태() {
  return {
    세진: 1,
    경로: [...경로],
    고른: 고른아이디,
    봄: 지금영상 ? 지금영상.아이디 : null
  };
}

function 상태밀기() {
  if (되돌리는중) return;
  try { history.pushState(지금상태(), ""); } catch (오류) { /* 못 밀어도 화면은 그대로 */ }
}

function 상태입히기(ㅅ) {
  되돌리는중 = true;
  try {
    메뉴닫기(); 연결창닫기(); 서랍닫기();

    경로 = (ㅅ && ㅅ.경로) ? [...ㅅ.경로] : [];
    고른아이디 = ㅅ ? (ㅅ.고른 || null) : null;

    왼쪽그리기();
    격자그리기();

    const 볼것 = ㅅ && ㅅ.봄
      ? window.동영상목록.find(ㅇ => (ㅇ.아이디 || "").trim() === ㅅ.봄)
      : null;
    if (볼것) 틀기(볼것); else 격자로();
  } finally {
    되돌리는중 = false;
  }
}

window.addEventListener("popstate", ㅇ => 상태입히기(ㅇ.state));

// 처음 자리를 기록에 심어 둔다 — 이게 있어야 첫 뒤로가기가 여기로 돌아온다
try { history.replaceState(지금상태(), ""); } catch (오류) {}

// 화면 안의 「뒤로」 단추도 브라우저 기록을 되짚게 한다.
// ★ 따로 움직이면 브라우저 뒤로와 어긋난다 (지침서 6절 21번 — 두 벌 만들지 마라)
function 뒤로가기() { history.back(); }

// ============================================================
//  홈으로 — 맨 위 이름을 누르면
// ============================================================
//
//  사용자가 정한 것 (2026-09-01): 「세진 과학 누르면 그냥 홈 첫화면 나오게 해라」
//  ★ 링크(href)로 두면 파일로 열었을 때 엉뚱한 화면이 떴다. 그래서 단추로 바꿨다.
//  ★ 폭은 안 건드린다 — 사용자가 맞춰 놓은 값이다.

function 홈으로() {
  고른아이디 = null;
  지금영상 = null;
  경로 = [];                 // 맨 위 층(과목 목록)으로
  메뉴닫기(); 서랍닫기();
  격자로();
  왼쪽그리기("밖"); 격자그리기();
  상태밀기();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("홈으로").addEventListener("click", 홈으로);
document.getElementById("동영상보기").addEventListener("click", 홈으로);

// ============================================================
//  사이드바 폭 — 끌어서 조절
// ============================================================
//
//  사용자가 정한 것 (2026-09-01): 「드래그로 좌우 폭 조절 하게 해라」
//  ★ 정한 폭은 브라우저에 담아 둔다. 새로 고쳐도 그대로 남는다.
//  ★ 두 번 누르면 처음 폭으로 돌아간다 — 너무 좁혀 놓고 못 되돌리는 일을 막는다.

const 폭잡이 = document.getElementById("폭잡이");
const 폭열쇠 = "세진과학.왼쪽폭.v1";
const 처음폭 = 290, 가장좁게 = 190, 가장넓게 = 620;

function 폭넣기(값, 담을까) {
  const ㅍ = Math.max(가장좁게, Math.min(가장넓게, Math.round(값)));
  document.documentElement.style.setProperty("--왼쪽폭", ㅍ + "px");
  if (담을까) { try { localStorage.setItem(폭열쇠, String(ㅍ)); } catch (오류) { /* 담기만 실패, 화면은 그대로 */ } }
  return ㅍ;
}

(function 담긴폭쓰기() {
  try {
    const ㄱ = parseInt(localStorage.getItem(폭열쇠), 10);
    if (ㄱ) 폭넣기(ㄱ, false);
  } catch (오류) { /* 못 읽으면 처음 폭 그대로 */ }
})();

폭잡이.addEventListener("pointerdown", 시작 => {
  시작.preventDefault();
  폭잡이.setPointerCapture(시작.pointerId);
  폭잡이.classList.add("잡힘");
  document.body.classList.add("폭조절중");

  const 움직임 = ㅇ => 폭넣기(ㅇ.clientX, false);
  const 놓음 = ㅇ => {
    window.removeEventListener("pointermove", 움직임);
    window.removeEventListener("pointerup", 놓음);
    window.removeEventListener("pointercancel", 놓음);
    폭잡이.classList.remove("잡힘");
    document.body.classList.remove("폭조절중");
    폭넣기(ㅇ.clientX, true);            // 놓을 때 한 번만 담는다
  };
  window.addEventListener("pointermove", 움직임);
  window.addEventListener("pointerup", 놓음);
  window.addEventListener("pointercancel", 놓음);
});

폭잡이.addEventListener("dblclick", () => {
  폭넣기(처음폭, true);
  쪽지("폭을 처음으로 되돌렸다");
});

// 키보드로도 — 화살표로 10px 씩
폭잡이.addEventListener("keydown", ㅇ => {
  const 지금 = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--왼쪽폭"), 10) || 처음폭;
  if (ㅇ.key === "ArrowLeft")  { ㅇ.preventDefault(); 폭넣기(지금 - 10, true); }
  if (ㅇ.key === "ArrowRight") { ㅇ.preventDefault(); 폭넣기(지금 + 10, true); }
});

// ============================================================
//  좁은 화면 서랍
// ============================================================

const 서랍단추 = document.getElementById("서랍단추");
function 서랍열기() { 왼쪽칸.classList.add("열림"); 뒷막.hidden = false; }
function 서랍닫기() { 왼쪽칸.classList.remove("열림"); 뒷막.hidden = true; }
서랍단추.addEventListener("click", () => {
  if (왼쪽칸.classList.contains("열림")) 서랍닫기(); else 서랍열기();
});
뒷막.addEventListener("click", 서랍닫기);

// ★★★ 왼쪽으로 쓸면 서랍이 닫힌다 (2026-09-02 · 사용자가 정함)
//   「과목 선택하고 단원선택 영역을 왼쪽으로 스와이프 하면 왼쪽으로 사라지게 하라고」
//
//   ★ 위아래 스크롤을 잡아먹으면 안 된다. 그래서 옆으로 확실히 더 갔을 때만 닫는다.
//     (가로로 40px 넘게 갔고, 그 움직임이 세로보다 1.5배 이상 클 때)
//   ★ 오른쪽으로 쓸면 아무 일도 없다 — 실수로 닫히는 것만 막으면 된다.
(function 서랍쓸기붙이기() {
  const 옆으로기준 = 40;      // 이만큼은 가야 닫는다
  const 옆세로비 = 1.5;       // 세로보다 이만큼 더 옆으로 가야 한다
  let 첫x = 0, 첫y = 0, 보는중 = false;

  왼쪽칸.addEventListener("pointerdown", ㅇ => {
    if (!왼쪽칸.classList.contains("열림")) return;   // 서랍일 때만
    첫x = ㅇ.clientX; 첫y = ㅇ.clientY; 보는중 = true;
  }, { passive: true });

  왼쪽칸.addEventListener("pointermove", ㅇ => {
    if (!보는중) return;
    const 옆 = ㅇ.clientX - 첫x;
    const 세로 = Math.abs(ㅇ.clientY - 첫y);
    if (옆 < -옆으로기준 && Math.abs(옆) > 세로 * 옆세로비) {
      보는중 = false;
      쓸어닫은때 = Date.now();     // ★ 손 뗄 때 단원이 같이 골라지지 않게
      서랍닫기();
    }
  }, { passive: true });

  ["pointerup", "pointercancel"].forEach(이름 =>
    왼쪽칸.addEventListener(이름, () => { 보는중 = false; }, { passive: true }));

  // ★★★ 오른쪽으로 쓸면 한 층 위로 (2026-09-02 · 사용자가 정함)
  //   「단원 나오는 화면에서 오른쪽 스와이프 하면 과목 선택으로 가게 해라」
  //
  //   ★ 서랍이 열려 있을 때는 안 한다 — 그때 오른쪽 쓸기는 아무 뜻이 없어야 한다.
  //   ★ 맨 위(과목 목록)에서는 갈 데가 없으니 안 한다.
  let 첫x2 = 0, 첫y2 = 0, 보는중2 = false;

  왼쪽칸.addEventListener("pointerdown", ㅇ => {
    if (왼쪽칸.classList.contains("열림")) return;   // 서랍으로 떠 있으면 딴 몸짓이다
    첫x2 = ㅇ.clientX; 첫y2 = ㅇ.clientY; 보는중2 = true;
  }, { passive: true });

  왼쪽칸.addEventListener("pointermove", ㅇ => {
    if (!보는중2) return;
    const 옆 = ㅇ.clientX - 첫x2;
    const 세로 = Math.abs(ㅇ.clientY - 첫y2);
    if (옆 > 옆으로기준 && Math.abs(옆) > 세로 * 옆세로비) {
      보는중2 = false;
      쓸어닫은때 = Date.now();       // 손 뗄 때 단원이 같이 골라지지 않게
      층나가기();                    // 한 층 위로
    }
  }, { passive: true });

  ["pointerup", "pointercancel"].forEach(이름 =>
    왼쪽칸.addEventListener(이름, () => { 보는중2 = false; }, { passive: true }));
})();

// ============================================================
//  업데이트
// ============================================================
//
//  사용자가 정한 것 (2026-09-01):
//    · 화면을 새로 보는 길은 「업데이트 단추」 하나뿐이다
//    · 고치는 쪽은 사용자 화면을 건드리지 않는다
//    · 누르면 게이지가 차고, 다 차면 화면이 바뀐다
//    · 화면이 꺼지면 안 된다
//
//  ★ 사용자가 안 눌렀는데 스스로 새로 고치는 자리를 만들지 마라.

const 시작판 = window.판;
const 업데이트단추 = document.getElementById("업데이트");
const 업막 = document.getElementById("업막");
const 업글 = document.getElementById("업글");
const 찬것 = document.getElementById("찬것");
const 쪽지칸 = document.getElementById("쪽지");

document.getElementById("판표시").textContent = "v" + 시작판;

let 업도는중 = false, 쪽지시계 = null;

function 쪽지(글) {
  쪽지칸.textContent = 글;
  쪽지칸.hidden = false;
  requestAnimationFrame(() => 쪽지칸.classList.add("뜸"));
  clearTimeout(쪽지시계);
  쪽지시계 = setTimeout(() => {
    쪽지칸.classList.remove("뜸");
    setTimeout(() => { 쪽지칸.hidden = true; }, 250);
  }, 2400);
}

const 게이지 = ㅍ => { 찬것.style.width = ㅍ + "%"; };
const 쉬기 = ㅁ => new Promise(ㄱ => setTimeout(ㄱ, ㅁ));

function 판다시읽기() {
  return new Promise(풀기 => {
    const ㅅ = document.createElement("script");
    ㅅ.src = "js/판.js?t=" + Date.now();
    ㅅ.onload  = () => { const 새 = window.판; ㅅ.remove(); 풀기(새); };
    ㅅ.onerror = () => { ㅅ.remove(); 풀기(null); };
    document.head.appendChild(ㅅ);
    setTimeout(() => 풀기(null), 6000);
  });
}

// ★★★ 새 판이 나오면 단추가 스스로 눈에 띈다 (2026-09-02)
//   사용자가 정한 것 — 「업데이트 있으면 단추가 색깔이 찐하던지 반짝거리던지 해서
//   업데이트가 있구나 하고 누르고 싶게 만들어라」
//
//   ★ 화면은 절대 안 건드린다. 단추 하나만 바뀐다.
//     보고 있던 자리도, 틀어놓은 영상도 그대로다. 새로 고치는 건 사용자가 누를 때만.
let 새판알림 = null;

function 새판떴다(새판) {
  if (업데이트단추.classList.contains("새판")) return;
  업데이트단추.classList.add("새판");
  업데이트단추.textContent = "업데이트 v" + 새판;
  업데이트단추.title = "새 판 v" + 새판 + " 이 나왔다. 눌러라.";
}

async function 새판있나보기() {
  if (업도는중) return;
  const 새판 = await 판다시읽기();
  window.판 = 시작판;              // ★ 확인하느라 읽어 온 값을 되돌려 둔다
  if (새판 && 새판 !== 시작판) {
    새판떴다(새판);
    clearInterval(새판알림);       // 한 번 알렸으면 그만 묻는다
    새판알림 = null;
  }
}

// 20초마다 조용히 물어본다. 파일 하나 읽는 것뿐이라 가볍다.
새판알림 = setInterval(새판있나보기, 20000);
setTimeout(새판있나보기, 3000);    // 처음 열고 3초 뒤 한 번

업데이트단추.addEventListener("click", async () => {
  if (업도는중) return;
  업도는중 = true;
  업데이트단추.disabled = true;

  // ★★★ 게이지는 「받을 게 있을 때」 만 띄운다 (2026-09-02)
  //   사용자가 정한 것 — 「업데이트 최신이면 게이지 채우지 말아라」
  //   먼저 조용히 판만 확인하고, 새 판이 있을 때 그때 막을 연다.
  const 새판 = await 판다시읽기();

  if (새판 === 시작판) {
    쪽지("이미 최신이다 (v" + 시작판 + ")");
    업도는중 = false; 업데이트단추.disabled = false;
    return;
  }

  게이지(0);
  업막.hidden = false;
  await 쉬기(30);
  게이지(60);

  if (새판 === null) {
    업글.textContent = "확인을 못 했다. 그냥 새로 받는다";
    게이지(100); await 쉬기(600); location.reload(); return;
  }

  업글.textContent = "v" + 새판 + " 받는 중";
  게이지(100);
  await 쉬기(700);
  location.reload();     // ★ 오직 이 자리에서만 새로 고친다
});

// 자막 만들기가 진행되면 게이지「만」 고쳐 그린다.
// ★★★ 여기서 격자그리기() 를 부르면 안 된다 (2026-09-02 에 밟음)
//   1.5초마다 카드를 통째로 새로 만들게 되고, 누르려던 카드가 손 밑에서 사라져
//   클릭이 씹힌다 — 「동영상이 안 열려」 가 이것이었다.
// ★ 자막공장이 없어도 죽지 않게 감싼다 — 옛 index.html 을 물고 있으면 안 실려 온다.
if (있나("자막공장")) 자막공장.바뀌면알려줘(자막자리들고치기);

// 자막이 다 구워지면, 화면이 갖고 있던 「이 영상은 자막 없더라」 기억을 지운다.
// ★ 이걸 안 하면 자막이 생겨도 새로 고치기 전까지 안 나온다 (2026-09-02 에 밟음).
if (있나("자막공장")) 자막공장.다되면알려줘(아이디 => {
  if (있나("자막")) 자막.잊기(아이디);
  // 지금 그 영상을 보고 있으면 바로 자막을 붙여 준다
  if (있나("자막") && !보기칸.hidden && 지금영상 && 지금영상.아이디.trim() === 아이디) {
    자막붙여보기(아이디);
  }
});

// ============================================================
//  시작
// ============================================================

왼쪽그리기();
격자그리기();

// ★ 파수꾼에게 「앱이 끝까지 돌았다」 고 알린다 (index.html 이 지켜본다)
window.앱다됐다 = true;
