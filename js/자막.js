// ============================================================
//  자막 — 영상 위에 우리가 직접 그린다
// ============================================================
//
//  사용자가 정한 것 (2026-09-01):
//    「유튜브 자막 워낙 구려가지고」 → 우리가 만든 자막을 얹는다
//
//  자막 글은 자막만들기/자막.py 가 4090 으로 받아적어서
//  자막/<영상아이디>.js 에 담아 둔 것을 쓴다.
//
//  ★ 플레이어는 여기서 안 만든다. js/재생기.js 가 가지고 있고,
//    여기는 거기서 시간만 받아 온다 (지침서 6절 21번 — 두 벌 만들지 마라).

const 자막 = (() => {

  const 담긴것 = {};            // 영상아이디 → 묶음
  const 받는중 = {};

  let 지금줄들 = [];
  let 켜짐 = true;
  let 앞선자리 = -1;
  let 듣개 = null;

  const 자막층 = document.getElementById("자막층");

  // 사용자가 정한 것 (2026-09-10): 편집기·유튜브 CC·홈페이지의 기본 크기를 통일한다.
  // 옛 웹/폰 배율은 다른 기준이므로 새 기준에서 보통(100%)부터 시작한다.
  const 크기열쇠 = "세진과학.자막크기.v2";
  const 크기들 = [
    { 값: .75, 이름: "작게 · 75%" },
    { 값: 1, 이름: "보통 · 100%" },
    { 값: 1.25, 이름: "크게 · 125%" },
    { 값: 1.5, 이름: "더 크게 · 150%" },
    { 값: 1.75, 이름: "아주 크게 · 175%" }
  ];
  let 지금크기 = 1;
  let 지금화면 = null;
  let 앞선통폭 = -1, 앞선통높이 = -1;

  function 크기입히기() {
    document.documentElement.style.setProperty("--자막배율", 지금크기);
    //  ★★★ 크기를 고르면 **바로 다시 잰다** (2026-09-04 · 사용자가 잡음)
    //    여태 CSS 변수만 바꿔 놓고 끝냈다. 그런데 글씨 크기는 js 가 직접 박기 때문에
    //    다시 재지 않으면 아무 일도 안 일어난다 — 골라도 그대로였다.
    try { 글씨크기맞추기(true); } catch (오류) { /* 아직 준비가 안 됐으면 그릴 때 잰다 */ }
    앞선자리 = -2;                        // 지금 뜬 자막도 새 크기로 다시 그린다
  }

  (function 담긴크기쓰기() {
    try {
      const ㄱ = parseFloat(localStorage.getItem(크기열쇠));
      // ★ 옛 판에서 담아 둔 값(0.8·1.25 …)은 이제 없는 단계다. 목록에 있는 것만 쓴다.
      if (ㄱ && 크기들.some(ㅋ => Math.abs(ㅋ.값 - ㄱ) < 0.001)) 지금크기 = ㄱ;
    } catch (오류) { /* 못 읽으면 보통으로 */ }
    크기입히기();
  })();

  // ---------- 자막 높이 ----------
  //  사용자가 정한 것 (2026-09-02):
  //    「자막이 너무 위에 있어 자막 위치 조절할수 있게 해봐
  //      그리고 디폴트 값은 폰화면 거의 아래에 붙게해」
  //
  //  ★ 자막 밀기(싱크 맞추기)는 없앴다 — 「자막 밀기는 필요 없을듯 없애라」 (2026-09-02).
  //    받아적을 때 소리를 재서 말 시작에 붙이므로 손으로 맞출 일이 없어졌다.

  const 높이열쇠 = "세진과학.자막높이.v1";
  const 높이들 = [
    { 값: 2,  이름: "맨 아래" },
    { 값: 6,  이름: "아래" },
    { 값: 11, 이름: "조금 위" },
    { 값: 17, 이름: "가운데쯤" },
    { 값: 25, 이름: "위" }
  ];
  //  ★ 기본은 맨 아래에서 한 칸 위 (2026-09-02 · 사용자가 정함)
  //    「위치 올리기는 가장 아래에서 한칸 위를 기본값으로 해줘」
  let 지금높이 = 6;

  function 높이입히기() {
    document.documentElement.style.setProperty("--자막바닥", 지금높이 + "%");
  }

  (function 담긴높이쓰기() {
    try {
      const ㄱ = parseFloat(localStorage.getItem(높이열쇠));
      if (!isNaN(ㄱ) && ㄱ >= 0 && ㄱ <= 40) 지금높이 = ㄱ;
    } catch (오류) { /* 못 읽으면 맨 아래로 */ }
    높이입히기();
  })();

  function 불러오기(아이디) {
    if (담긴것[아이디] !== undefined) return Promise.resolve(담긴것[아이디]);
    if (받는중[아이디]) return 받는중[아이디];

    // ★★★ 자막은 저장소에서 먼저 찾는다 (2026-09-22 · 사용자가 정함)
    //   「루트는 유튜브에서 홈피로, 영상 편집프로그램에서 홈피로」 — 둘 다 저장소에 바로 적는다.
    //   저장소에 없으면(옛 48편) 예전처럼 자막 파일을 읽는다. 저장소가 안 되면 역시 파일로.
    받는중[아이디] = 저장소에서(아이디).then(ㄱ => ㄱ ? (담긴것[아이디] = ㄱ) : 파일에서(아이디));
    return 받는중[아이디];
  }

  async function 저장소에서(아이디) {
    const 창 = window.저장소창구;
    if (!창 || !창.공개열쇠) return null;
    try {
      const ㄷ = await fetch(창.주소 + "site_captions?select=data&youtube_id=eq." + encodeURIComponent(아이디),
                            { headers: { apikey: 창.공개열쇠 }, cache: "no-store" });
      if (!ㄷ.ok) return null;
      const 줄 = (await ㄷ.json())[0];
      const 자료 = 줄 && 줄.data && Array.isArray(줄.data.줄) && 줄.data.줄.length ? 줄.data : null;
      if (자료) {
        // 옛 파일과 같은 자리에도 둔다 — 영상편집의 위치 코드가 여기서 찾는다
        (window.자막모음 = window.자막모음 || {})[아이디] = 자료;
        if (자료.화면 && Number.isFinite(자료.화면.bottom_percent) && !window.sedobiCaptionPosition) 위치코드싣기();
      }
      return 자료;
    } catch (오류) { return null; }
  }

  function 위치코드싣기() {
    if (document.getElementById("자막위치코드")) return;
    const ㅅ = document.createElement("script");
    ㅅ.id = "자막위치코드";
    ㅅ.src = "js/자막위치.js?v=" + window.판;
    document.head.appendChild(ㅅ);
  }

  function 파일에서(아이디) {
    return new Promise(풀기 => {
      const ㅅ = document.createElement("script");
      // ★ .json 이 아니라 .js 인 이유 — 파일로 열어도 막히지 않게 (지침서 7절 25번)
      ㅅ.src = "자막/" + 아이디 + ".js?v=" + window.판;
      ㅅ.onload = () => {
        ㅅ.remove();
        const ㄱ = (window.자막모음 || {})[아이디] || null;
        담긴것[아이디] = ㄱ;
        풀기(ㄱ);
      };
      ㅅ.onerror = () => { ㅅ.remove(); 담긴것[아이디] = null; 풀기(null); };
      document.head.appendChild(ㅅ);
    });
  }

  // 줄이 2천 개쯤 된다. 하나씩 훑지 말고 반으로 갈라 찾는다.
  function 찾을자리(초) {
    let 낮 = 0, 높 = 지금줄들.length - 1, 답 = -1;
    while (낮 <= 높) {
      const 가 = (낮 + 높) >> 1;
      if (지금줄들[가].시작 <= 초) { 답 = 가; 낮 = 가 + 1; } else { 높 = 가 - 1; }
    }
    // ★ 여유를 짧게 준다. 길게 주면 말이 끝났는데도 자막이 남아 다음 줄과 겹쳐 보인다.
    if (답 >= 0 && 초 <= 지금줄들[답].끝 + 0.15) return 답;
    return -1;
  }

  // ★★★ 수식은 KaTeX 로 진짜 수식처럼 그린다 (2026-09-02 · 사용자가 정함)
  //   「라텍스가 이쁜데 나중에 적분이나 시그마 이런것도 해야 되」
  //   ★ 자막 파일에 든 글자는 안 건드린다. 그릴 때만 수식으로 바꾼다 (js/수식.js).
  //   ★ KaTeX 를 못 불러와도 자막은 글자 그대로 나온다. 화면이 죽지 않는다.

  function 감싸기(글) {
    if (typeof 수식 !== "undefined") return 수식.그리기(글);
    return 글.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // 화면 폭에 맞는 의미 단위 줄바꿈은 아래 두줄후보()에서 정한다.

  //  한 줄에 몇 글자나 들어가나 — 자막칸 폭과 글자 크기를 재서 본다.
  //  ★★★ 이걸 안 재면 한 줄에 넉넉히 들어갈 자막까지 둘로 쪼갠다 (2026-09-03 에 밟음).
  //    한글은 글자 하나가 글자 크기와 거의 같은 폭을 먹는다. 조금 넉넉하게 잡는다.
  //  ★★★ **글자를 세지 않는다. 진짜 폭을 잰다.** (2026-09-04 · 사용자가 뿌리를 짚음)
  //
  //    「글자수로 지금 제한 걸고 있냐?」  — 그렇다. 그게 문제였다.
  //
  //    여태 이렇게 했다 —
  //        한 줄 글자 수 = 자막칸 폭 ÷ (글자 크기 × 0.98)
  //      즉 **한글 한 글자 = 글자 크기만큼 넓다** 고 가정했다.
  //      그런데 v = fλ 같은 수식은 KaTeX 가 그려서 **한글보다 훨씬 넓다.**
  //      「v = fλ입니다 그랬을 때 저 v는 음원의 속력이 되는 거고」 는
  //      글자로 31자인데 실제로는 40자쯤 먹는다.
  //      그래서 38 로 잡든 48 로 잡든 계속 어긋났다. 사용자가 열 번 넘게 짚었다.
  //
  //    ⇒ 브라우저는 진짜 폭을 안다. **그려 보고 재면 된다.**
  //      숨은 칸에 똑같은 모양으로 그려서 폭을 재고, 넘치는지 본다.

  function 글씨크기맞추기(꼭) {
    const 통 = 자막층.parentElement;
    const 폭 = 통 ? 통.clientWidth : 0, 높이 = 통 ? 통.clientHeight : 0;
    if (!폭 || !높이) return;
    if (!꼭 && 폭 === 앞선통폭 && 높이 === 앞선통높이) return;
    앞선통폭 = 폭; 앞선통높이 = 높이;
    const 영상 = 지금화면 || {width:16,height:9};
    const 배율 = 지금크기 * (영상.size_percent || 100);
    자막층.style.fontSize = CaptionLayout.frameFontSize(폭,높이,배율) + "px";
  }

  function 화면폭바뀜(꼭) {
    const 전폭 = 앞선통폭, 전높이 = 앞선통높이;
    글씨크기맞추기(꼭);
    if ((꼭 || 전폭 !== 앞선통폭 || 전높이 !== 앞선통높이) && 앞선자리 >= 0) {
      const 자리 = 앞선자리;
      앞선자리 = -2;
      칠하기(자리);  // 일시정지 중에도 기존 줄을 새 폭에 맞춰 다시 접는다.
    }
  }

  try {
    if (window.ResizeObserver && 자막층.parentElement) {
      new ResizeObserver(() => 화면폭바뀜(false)).observe(자막층.parentElement);
      document.fonts.ready.then(() => 화면폭바뀜(true));
    }
    window.addEventListener("resize", () => 화면폭바뀜(true));
    document.addEventListener("fullscreenchange", () => 화면폭바뀜(true));
  } catch (오류) { /* 못 걸어도 그릴 때마다 잰다 */ }

  function 쓸수있는폭() {
    const 통 = 자막층.parentElement;
    const 통폭 = 통 ? 통.clientWidth : 0;
    if (!통폭) return 0;
    const ㅁ = getComputedStyle(자막층);
    const 안쪽 = (parseFloat(ㅁ.paddingLeft) || 0) + (parseFloat(ㅁ.paddingRight) || 0);
    let 몫 = 0.96;
    const ㅊ = ㅁ.maxWidth;
    if (ㅊ && ㅊ.indexOf("%") > 0) 몫 = (parseFloat(ㅊ) || 96) / 100;
    else if (ㅊ && ㅊ.indexOf("px") > 0) return Math.max(0, parseFloat(ㅊ) - 안쪽);
    return Math.max(0, 통폭 * 몫 - 안쪽);
  }

  //  ★ 재는 칸 — 화면 밖에 숨겨 두고 자막과 **똑같은 모양**으로 그린다.
  let 재는칸 = null;
  function 재는칸준비() {
    if (재는칸 && 재는칸.isConnected) return 재는칸;
    재는칸 = document.createElement("div");
    재는칸.setAttribute("aria-hidden", "true");
    const ㅁ = getComputedStyle(자막층);
    재는칸.style.cssText =
      "position:absolute; left:-99999px; top:0; visibility:hidden;" +
      "white-space:nowrap; pointer-events:none;" +
      "font-size:" + ㅁ.fontSize + "; font-weight:" + ㅁ.fontWeight +
      "; font-family:" + ㅁ.fontFamily + "; letter-spacing:" + ㅁ.letterSpacing + ";";
    (자막층.parentElement || document.body).appendChild(재는칸);
    return 재는칸;
  }

  //  이 글을 한 줄로 그리면 몇 픽셀이나 되나 — **진짜로 그려서 잰다**
  function 그리면몇픽셀(글) {
    const ㄱ = 재는칸준비();
    const ㅁ = getComputedStyle(자막층);
    ㄱ.style.fontSize = ㅁ.fontSize;
    ㄱ.style.fontWeight = ㅁ.fontWeight;
    ㄱ.style.fontFamily = ㅁ.fontFamily;
    ㄱ.style.letterSpacing = ㅁ.letterSpacing;
    ㄱ.innerHTML = 감싸기(글);
    return ㄱ.scrollWidth;
  }

  //  한 줄에 들어가나? — 글자 수가 아니라 폭으로 본다
  function 한줄에들어가나(글) {
    const 쓸폭 = 쓸수있는폭();
    if (!쓸폭) return true;                 // 아직 못 재면 손대지 않는다
    //  ★ 2% 여유를 둔다 (2026-09-04). 딱 맞게 재면 안쪽 여백·글자 사이·그림자
    //    같은 자잘한 차이로 내 자와 브라우저 자가 어긋난다. 어긋나는 순간
    //    브라우저가 **아무 데서나** 접는다 — 그게 제일 보기 싫다.
    //    아슬아슬한 줄은 차라리 **내가** 좋은 자리에서 접는 게 낫다.
    return 그리면몇픽셀(글) <= 쓸폭 * 0.98;
  }

  //  문장이 끝나는 자리 — 마침표·물음표·느낌표 뒤 빈칸
  const 문장끝 = /(?<=[.?!])\s+/;

  function 문장들로(글) {
    return 글.split(문장끝).map(ㅅ => ㅅ.trim()).filter(Boolean);
  }

  // 줄 길이보다 의미 연결을 먼저 본다. 수식 내부와 관형어·의존명사 뒤는
  // 접지 않고, 가능한 두 줄 가운데 실제 폭이 고른 쪽을 고른다.
  function 두줄후보(글) {
    const 보호 = [];
    const 수식덩어리 = /[A-Za-z0-9₀-₉⁰-⁹²³×÷−+\-/√∫∑ΣΔθπωλμαβγρ°℃≈≠≤≥∞⃗.,^_=()]+(?: +[A-Za-z0-9₀-₉⁰-⁹²³×÷−+\-/√∫∑ΣΔθπωλμαβγρ°℃≈≠≤≥∞⃗.,^_=()]+)*/g;
    const 연결덩어리 = /(?:(?:그|이|저) (?:다음|때|것|거)[가-힣]*|[가-힣]*(?:럴|런|할|하는|되는|나눈) (?:때|거|것|다음)[가-힣]*|(?:첫|두|세|네|다섯|여섯) 번째|(?:최대 )?(?:정지|운동) 마찰력[가-힣]*|[xyz]축 [xyz]축[가-힣]*|[가-힣]+의 [xyz]성분[가-힣]*)/g;
    for (const 식 of [수식덩어리, 연결덩어리]) {
      let 찾음;
      while ((찾음 = 식.exec(글)) !== null) 보호.push([찾음.index, 찾음.index + 찾음[0].length]);
    }
    const 후보 = [];
    for (const 빈칸 of 글.matchAll(/\s+/g)) {
      const 자리 = 빈칸.index;
      if (보호.some(([앞, 뒤]) => 앞 < 자리 && 자리 < 뒤)) continue;
      const 앞 = 글.slice(0, 자리).trim(), 뒤 = 글.slice(자리).trim();
      if (!앞 || !뒤) continue;
      const 끝말 = 앞.split(/\s+/).pop().replace(/[,.!?]+$/, "");
      // '다 / 하기보다는', '마찰력이라는 게 / 있어요' 같은 고아줄을 피한다.
      if (/^(?:그|이|저|한|두|세|다|좀|더|안|못|또|각|수|게|것|때|첫|가장|이제|그냥)$/.test(끝말)) continue;
      if (/(?:하는|되는|있는|없는|나눈|그린|할|될|이라는|라는)$/.test(끝말)) continue;
      const 앞폭 = 그리면몇픽셀(마침표떼기(앞)), 뒤폭 = 그리면몇픽셀(마침표떼기(뒤));
      const 한도 = 쓸수있는폭() * 0.98;
      if (앞폭 > 한도 || 뒤폭 > 한도) continue;
      const 비율 = Math.min(앞폭, 뒤폭) / Math.max(앞폭, 뒤폭, 1);
      let 점수 = (1 - 비율) * 8;
      if (비율 < 0.3) 점수 += 30;
      if (뒤.split(/\s+/).length === 1) 점수 += 20;
      if (/[.!?]$/.test(앞)) 점수 -= 4;
      else if (/(?:보시면은|다음에|일단|때는|는데|니까|지만|고요)[,.]?$/.test(앞)) 점수 -= 2;
      후보.push({ 줄: [앞, 뒤], 점수 });
    }
    후보.sort((가, 나) => 가.점수 - 나.점수);
    return 후보.length ? 후보[0].줄 : null;
  }

  function 여러줄로(글) {
    if (!글) return null;
    // 문장 수만큼 <br>를 만들지 않는다. 짧은 세 문장도 최대 두 줄에 배치한다.
    if (한줄에들어가나(글)) return null;
    return 두줄후보(글);
  }

  //  ★★★ 화면에 띄울 때만 마침표를 뗀다 (2026-09-04)
  //
  //    사용자: 「야 보통 자막에는 마침표가 없지 않냐?」  — 맞다. 방송 자막에 마침표는 안 쓴다.
  //
  //    ★ 그런데 **속으로는 그대로 갖고 있는다.** 마침표가 문장 끝을 알려주기
  //      때문이다 — 위 문장들로() 가 그걸로 한 줄씩 끊는다. 자료에서 떼 버리면
  //      한 문장 한 줄이 무너진다. 그래서 **맨 마지막, 그리는 순간에만** 뗀다.
  //
  //    ★ 물음표·느낌표는 남긴다. 「좀 어렵죠?」 는 물음표가 있어야 말맛이 산다.
  //      줄 끝 쉼표도 뗀다 — 「이동하는 것,」 처럼 매달려 보이기 때문이다.
  function 마침표떼기(글) {
    const ㄴ = String(글).replace(/[.,]+\s*$/, "").trim();
    return ㄴ || 글;                       // 통째로 지워지면 손대지 않는다
  }

  function 자막그리기(글) {
    글씨크기맞추기(false);
    // 제작 시 글자 수로 넣은 개행은 화면 폭을 알 수 없으므로 다시 배치한다.
    글 = String(글).replace(/\s+/g, " ").trim();
    const 여러쪽 = 여러줄로(글);
    const 한줄 = ㅁ => '<span style="display:inline-block;white-space:nowrap">' + 감싸기(마침표떼기(ㅁ)) + '</span>';
    if (여러쪽) return 여러쪽.map(한줄).join("<br>");
    if (한줄에들어가나(글)) return 한줄(글);
    // 미검토 긴 자막은 숨기거나 글자를 줄이지 않는다. 제작 단계에서 나눠야 한다.
    return 감싸기(마침표떼기(글));
  }

  function 칠하기(자리) {
    if (자리 === 앞선자리) return;
    앞선자리 = 자리;
    if (자리 < 0 || !켜짐) { 자막층.hidden = true; 자막층.textContent = ""; return; }
    // ★ 먼저 보이게 한 다음에 그린다 (2026-09-03)
    //   숨어 있으면 폭이 0 으로 재져서 「한 줄에 들어가나」 를 알 수가 없다.
    자막층.hidden = false;
    자막층.innerHTML = 자막그리기(지금줄들[자리].글);
  }

  function 떼기() {
    if (듣개) { 재생기.시간그만듣기(듣개); 듣개 = null; }
    앞선자리 = -1;
    지금줄들 = [];
    지금화면 = null; 앞선통폭 = -1; 앞선통높이 = -1;
    자막층.hidden = true;
    자막층.textContent = "";
  }

  return {

    // 영상을 튼 뒤에 부른다
    async 붙이기(아이디) {
      떼기();
      // ★★★ KaTeX 를 다 받은 다음에 자막을 붙인다 (2026-09-02 에 밟음)
      //   그냥 불러만 두면 첫 몇 줄이 수식이 아니라 글자로 지나가 버린다.
      //   자막 글 받는 것과 같이 기다리므로 늦어지지 않는다.
      const [묶음] = await Promise.all([
        불러오기(아이디),
        (typeof 수식 !== "undefined") ? 수식.부르기() : Promise.resolve()
      ]);
      if (!묶음 || !묶음.줄 || !묶음.줄.length) return null;   // 자막이 없는 영상
      지금줄들 = 묶음.줄;
      const 화면 = 묶음.화면;
      지금화면 = 화면 && [화면.width,화면.height].every(n=>Number.isFinite(n)&&n>0&&n<=32768)
        ? {width:화면.width,height:화면.height,size_percent:Number.isFinite(화면.size_percent)?Math.max(50,Math.min(200,화면.size_percent)):100} : null;
      글씨크기맞추기(true);

      듣개 = 초 => 칠하기(찾을자리(초));
      재생기.시간듣기(듣개);
      return 묶음;
    },

    떼기,

    // ★★★ 「자막 없더라」 고 기억해 둔 것을 지운다 (2026-09-02 에 밟음)
    //   자막이 만들어지기 전에 그 영상을 한 번 열면 담긴것[아이디] 에 null 이 박힌다.
    //   그 뒤에 자막이 생겨도 다시 안 물어봐서 영영 안 나온다.
    //   ⇒ 자막 공장이 다 구웠다고 알려 주면 이걸 불러 기억을 지운다.
    잊기(아이디) {
      delete 담긴것[아이디];
      delete 받는중[아이디];
      if (window.자막모음) delete window.자막모음[아이디];
    },

    // ★ 비공개 글 자막은 저장소 창으로 못 읽는다 — 비번이 맞으면 site_open_post 가 같이 준다 (2026-09-23).
    //   그걸 여기 미리 넣어 두면 붙이기() 가 저장소에 다시 묻지 않고 바로 쓴다.
    넣기(아이디, 자료) {
      if (!아이디 || !자료 || !Array.isArray(자료.줄) || !자료.줄.length) return;
      담긴것[아이디] = 자료;
      delete 받는중[아이디];
      (window.자막모음 = window.자막모음 || {})[아이디] = 자료;
    },

    켜고끄기(값) {
      켜짐 = (값 === undefined) ? !켜짐 : !!값;
      앞선자리 = -2;                 // 다시 칠하게 만든다
      if (!켜짐) { 자막층.hidden = true; 자막층.textContent = ""; }
      return 켜짐;
    },

    켜졌나() { return 켜짐; },
    줄들() { return 지금줄들; },

    크기목록() { return 크기들; },
    지금크기() { return 지금크기; },
    크기바꾸기(값) {
      if (!크기들.some(크기 => 크기.값 === 값)) return;
      지금크기 = 값;
      크기입히기();
      try { localStorage.setItem(크기열쇠, String(값)); } catch (오류) { /* 담기만 실패 */ }
    },

    높이목록() { return 높이들; },
    지금높이() { return 지금높이; },
    높이바꾸기(값) {
      지금높이 = Math.max(0, Math.min(40, 값));
      높이입히기();
      try { localStorage.setItem(높이열쇠, String(지금높이)); } catch (오류) {}
      return 지금높이;
    }
  };
})();
