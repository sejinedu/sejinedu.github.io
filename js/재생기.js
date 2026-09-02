// ============================================================
//  재생기 — 유튜브 기본 재생바를 그대로 쓴다
// ============================================================
//
//  ★★★ 여기 손대기 전에 읽어라 (2026-09-02 에 두 번 밟았다)
//
//   ① 유튜브 재생바는 마우스를 빼도 늦게 사라진다.
//      끼워 넣은 영상은 「마우스가 나갔다」 는 신호를 못 받아서
//      유튜브가 제 타이머가 끝날 때까지 기다린다. 유튜브 사이트는 1초에 사라진다.
//      그 시간을 바꾸는 옵션은 유튜브가 안 준다.
//
//   ② 그래서 유튜브 바를 끄고(controls=0) 우리 바를 영상 「위」 에 그려 봤다.
//      → 우리 바는 빨리 사라지는데 유튜브가 그리는 것(가운데 정지 표시 등)은
//        못 지워서 늦게까지 남았다. 둘이 따로 놀아 더 이상해졌다. 되돌렸다.
//
//   ③ 그다음 우리 바를 영상 「밑」 에 두는 것도 만들어 봤다가,
//      시키지 않은 짓이라 되돌렸다. 하려면 사용자가 하라고 할 때 한다.
//
//   ⇒ 지금은 영상 안을 전부 유튜브에게 맡긴다. 우리 것은 영상 밖에만 둔다.
//
//  ★ 유튜브 사이트의 둥근 재생바는 못 가져온다.
//    유튜브 사이트 플레이어와 끼워 넣는 플레이어는 유튜브가 만든 다른 물건이다.
//
//  ★ 플레이어를 가진 곳은 여기 하나뿐이다. 자막이 여기서 시간을 받아 간다.
//    두 군데서 만들면 한쪽만 고쳐져서 어긋난다 (지침서 6절 21번).

const 재생기 = (() => {

  const 통     = document.getElementById("영상통");
  const 화면칸 = document.getElementById("화면칸");

  let 플레이어 = null;
  let 시계 = null;
  let 듣는이들 = [];

  // ★★★ 유튜브 자막 죽이기 (2026-09-01 — 「자막 두겹 나오고」)
  //   cc_load_policy=0 만으로는 안 꺼진다. 보는 사람 설정이 「자막 항상 켜기」 면 그대로 나온다.
  //   자막 덩어리는 재생이 시작돼야 올라오므로 몇 번 더 두드린다.
  function 유튜브자막죽이기(p) {
    if (!p) return;
    try { p.unloadModule("captions"); } catch (e) {}
    try { p.unloadModule("cc"); } catch (e) {}
    try { p.setOption("captions", "track", {}); } catch (e) {}
    try { p.setOption("cc", "track", {}); } catch (e) {}
  }
  function 유튜브자막계속죽이기(p) {
    [0, 400, 1200, 2500, 5000].forEach(ㄷ => setTimeout(() => 유튜브자막죽이기(p), ㄷ));
  }

  function 시간알리기() {
    if (!플레이어 || !플레이어.getCurrentTime) return;
    let 지금;
    try { 지금 = 플레이어.getCurrentTime(); } catch (오류) { return; }
    if (typeof 지금 !== "number") return;
    듣는이들.forEach(ㄷ => { try { ㄷ(지금); } catch (오류) {} });
  }

  function 돌리기시작() { 돌리기멈춤(); 시계 = setInterval(시간알리기, 200); }
  function 돌리기멈춤() { if (시계) { clearInterval(시계); 시계 = null; } }

  let API준비 = null;

  // ============================================================
  //  전체화면에서 쓰는 단추들
  // ============================================================
  //
  //  사용자가 정한 것 (2026-09-02, 폰에서 잡아냄):
  //    「전체 화면에서 다시 되돌아 가는 방법이 없다.
  //      화면을 아래로 스와이프 하면 되돌아 가게 해줘 유튜브 처럼」
  //    「이 상황에서 자막 크기를 줄일 방법도 없다」
  //
  //  ★★★ 영상 위에서는 손짓을 못 받는다 (2026-09-02 에 알아냄)
  //    영상은 유튜브 틀(iframe) 이 그린다. 그 위에서 손가락을 움직이면
  //    그 손짓은 **유튜브 안으로 들어가 버리고 우리한테는 안 온다.**
  //    남의 집 안에서 일어난 일이라 우리가 들을 수가 없다.
  //    그래서 「화면 아무 데나 아래로 쓸기」 는 만들 수가 없다.
  //  ⇒ 대신 두 가지를 둔다 —
  //    ① 눈에 보이는 단추 (영상 위에 얹는다. 이건 확실히 눌린다)
  //    ② 우리 자막 위에서 아래로 쓸기 (자막은 우리 것이라 손짓이 온다)
  //  ★ ESC 나 폰 뒤로가기로도 나간다.

  const 단추칸     = document.getElementById("전체화면단추들");
  const 나가기단추 = document.getElementById("전체화면나가기");
  const 작게단추   = document.getElementById("자막작게");
  const 크게단추   = document.getElementById("자막크게");

  // ★ 손잡이는 없앴다 (2026-09-02) — 단추가 자막 하나뿐이라 접었다 펼 게 없다.
  //   「유튜브 조작판은 냅두고 그냥 우리껀 자막 버튼만 하나 심자」

  // ★★★ 영상을 톡 누른 것을 잡아낸다 (2026-09-02 · 사용자가 정함)
  //   「유튜브 조작판이 한번 터치하면 켜지고 다시 터치하면 꺼진다고,
  //     그거에 맞춰 우리 x버튼하고 자막 버튼도 키고 꺼지게 하라는 거다」
  //
  //   ★ 손짓 자체는 못 받는다. 영상은 유튜브 틀 안이고 남의 집이다.
  //   ★★★ 그런데 **눈길(focus)이 그 틀로 넘어가는 것**은 우리가 안다.
  //     영상을 누르면 눈길이 틀로 간다 → 우리 창은 blur 를 받는다.
  //     그때 「지금 눈길이 그 틀에 있나」 를 보면 「영상을 눌렀구나」 를 알 수 있다.
  //   ★ 한 번 넘어가면 그 뒤로는 안 넘어가니, 곧바로 눈길을 되찾아 온다.
  //     그래야 **다음 톡도** 잡힌다. 눈길만 되돌릴 뿐 손짓은 유튜브가 그대로 받는다.
  //   ★ 이건 에두르는 수다. 안 먹는 기기가 있을 수 있다.
  //     그래서 멈췄을 때 뜨는 길도 같이 남겨 둔다 — 아주 갇히지는 않게.

  //  ★★★ 저절로 사라지는 것도 맞춰야 한다 (2026-09-02 · 사용자가 잡음)
  //    「화면 터치 안하고 유튜브 재생 버튼 누르면 … 유튜브 프레임이 한참동안
  //      켜져 있다가 꺼지는데, 그때 자막하고 x 버튼은 안사라진다」
  //    「유튜브 껍데기하고 x와 자막이 뜨는 타이밍을 똑같이 하란 소리야」
  //
  //    유튜브는 이렇게 움직인다 —
  //      · 돌고 있으면 마지막 손짓에서 3초쯤 뒤 조작판이 사라진다
  //      · 멈춰 있으면 조작판이 계속 떠 있다
  //    그대로 흉내 낸다.
  const 저절로사라지는시간 = 3000;
  let 마지막톡 = 0;
  let 사라질시계 = null;

  function 돌고있나() {
    try { return 플레이어 && 플레이어.getPlayerState() === 1; } catch (오류) { return false; }
  }

  function 사라질시계걸기() {
    clearTimeout(사라질시계);
    if (!단추칸 || 단추칸.hidden) return;
    if (!돌고있나()) return;                 // 멈춰 있으면 안 사라진다 (유튜브도 그렇다)
    사라질시계 = setTimeout(() => {
      if (단추칸 && !단추칸.hidden && 돌고있나()) 단추칸.classList.add("쉬는중");
    }, 저절로사라지는시간);
  }

  function 보이기(보일까) {
    if (!단추칸 || 단추칸.hidden) return;
    단추칸.classList.toggle("쉬는중", !보일까);
    if (보일까) 사라질시계걸기();
    else clearTimeout(사라질시계);
  }

  //  ★★★ 어디를 눌렀는지에 따라 다르다 (2026-09-02 · 사용자가 잡아냄)
  //    「그냥 바탕은 바로바로 꺼지고 켜지는데, 가운데 버튼은 느릿하게 꺼져」
  //
  //    우리는 **어디를** 눌렀는지 못 안다. 유튜브 틀 안이라 자리를 못 본다.
  //    ⇒ 「재생 상태가 바뀌었나」 로 가린다 —
  //      · 바뀌었다 → 가운데 재생·정지 단추를 누른 것이다.
  //        그때는 우리가 손대지 않는다. 상태가 바뀌면 발맞추기가 알아서 한다.
  //      · 안 바뀌었다 → 바탕을 누른 것이다. 곧바로 켰다 껐다 한다.
  //    ★ 누른 직후엔 아직 상태가 안 바뀌었을 수 있어 잠깐 기다렸다 본다.
  const 살펴보는틈 = 150;

  function 톡눌렸다() {
    if (!단추칸 || 단추칸.hidden) return;
    let 누를때상태 = -99;
    try { 누를때상태 = 플레이어 ? 플레이어.getPlayerState() : -99; } catch (오류) {}

    setTimeout(() => {
      if (!단추칸 || 단추칸.hidden) return;
      let 지금상태 = -99;
      try { 지금상태 = 플레이어 ? 플레이어.getPlayerState() : -99; } catch (오류) {}
      if (지금상태 !== 누를때상태) return;    // 가운데 단추였다 — 발맞추기에 맡긴다
      보이기(단추칸.classList.contains("쉬는중"));
    }, 살펴보는틈);
  }

  window.addEventListener("blur", () => {
    setTimeout(() => {
      const 지금눈길 = document.activeElement;
      if (!지금눈길 || 지금눈길.tagName !== "IFRAME") return;
      if (!화면칸.contains(지금눈길)) return;

      const 이제 = Date.now();
      if (이제 - 마지막톡 > 260) {      // 한 번 누른 걸 두 번으로 세지 않게
        마지막톡 = 이제;
        톡눌렸다();
      }
      // ★ 눈길을 되찾아야 다음 톡도 잡힌다
      setTimeout(() => { try { window.focus(); } catch (오류) {} }, 0);
    }, 0);
  });

  // 유튜브 상태가 바뀔 때도 맞춘다
  //  · 멈추면 보여 준다 (유튜브 조작판도 그때 떠 있다)
  //  · 다시 돌면 3초 뒤 사라지게 시계를 건다
  function 발맞추기(도나) {
    if (!단추칸 || 단추칸.hidden) return;
    if (!도나) { clearTimeout(사라질시계); 단추칸.classList.remove("쉬는중"); }
    else 사라질시계걸기();
  }

  function 나가기단추보이기() {
    if (!단추칸) return;
    단추칸.hidden = false;
    단추칸.classList.remove("쉬는중");     // 들어갈 때는 보인다
    사라질시계걸기();                      // ★ 그리고 3초 뒤엔 유튜브처럼 사라진다
  }
  function 나가기단추숨기기() {
    if (!단추칸) return;
    단추칸.hidden = true;
    if (자막판) 자막판.hidden = true;
    단추칸.classList.remove("쉬는중");
    clearTimeout(사라질시계);
  }

  // 전체화면 상태인가
  function 전체화면중인가() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement) ||
           통.classList.contains("가짜전체화면") ||
           통.classList.contains("가로눕히기");
  }

  if (나가기단추) 나가기단추.addEventListener("click", ㅇ => {
    ㅇ.stopPropagation();
    if (전체화면중인가()) 전체화면바꾸기();
  });

  // ★ 자막 크기 — 자막 모듈이 가진 목록을 그대로 쓴다. 두 벌로 만들지 않는다.
  function 자막크기옮기기(쪽) {
    if (typeof 자막 === "undefined" || !자막.크기목록) return;
    const 목록 = 자막.크기목록();
    const 지금 = 자막.지금크기();
    let 자리 = 목록.findIndex(ㄱ => Math.abs(ㄱ.값 - 지금) < 0.001);
    if (자리 < 0) 자리 = 1;
    자리 = Math.max(0, Math.min(목록.length - 1, 자리 + 쪽));
    자막.크기바꾸기(목록[자리].값);
  }
  // ★ 자막 높이 — 목록은 자막 모듈이 갖고 있다. 두 벌로 만들지 않는다.
  //   (2026-09-02 · 「자막이 너무 위에 있어 자막 위치 조절할수 있게 해봐」)
  function 자막높이옮기기(쪽) {
    if (typeof 자막 === "undefined" || !자막.높이목록) return;
    const 목록 = 자막.높이목록();
    const 지금 = 자막.지금높이();
    let 자리 = 목록.findIndex(ㄱ => Math.abs(ㄱ.값 - 지금) < 0.01);
    if (자리 < 0) 자리 = 0;
    자리 = Math.max(0, Math.min(목록.length - 1, 자리 + 쪽));
    자막.높이바꾸기(목록[자리].값);
  }
  const 내리기단추 = document.getElementById("자막내리기");
  const 올리기단추 = document.getElementById("자막올리기");
  if (내리기단추) 내리기단추.addEventListener("click", ㅇ => { ㅇ.stopPropagation(); 자막높이옮기기(-1); });
  if (올리기단추) 올리기단추.addEventListener("click", ㅇ => { ㅇ.stopPropagation(); 자막높이옮기기(+1); });

  if (작게단추) 작게단추.addEventListener("click", ㅇ => { ㅇ.stopPropagation(); 자막크기옮기기(-1); });
  if (크게단추) 크게단추.addEventListener("click", ㅇ => { ㅇ.stopPropagation(); 자막크기옮기기(+1); });

  // ★★★ 자막 잠깐 끄기 (2026-09-02 · 사용자가 폰에서 잡음)
  //   「자막 뜬 상태에서 설정 누르면 설정이 자막에 가린다」
  //   유튜브 설정창은 유튜브 틀 **안에서** 뜨고, 우리 자막은 그 틀 **위에** 얹혀 있다.
  //   그러니 우리 자막이 위를 덮는 게 당연하다 — 순서를 바꿀 수가 없다.
  //   ⇒ 잠깐 끌 수 있게 한다. 설정 만지는 동안만 끄면 된다.
  // ★ 자막 단추를 누르면 드롭바 (2026-09-02 · 사용자가 정함)
  //   「자막 버튼 클릭하면 드롭바 생기면서 자막 끄기 켜기 있고,
  //     자막 위치 올리기, 자막 위치 내리기, 뜨게 해줘」
  const 자막메뉴단추 = document.getElementById("자막메뉴단추");
  const 자막판 = document.getElementById("자막판");
  const 껐켰단추 = document.getElementById("자막껐켰");

  function 자막판열기(열까) {
    if (!자막판) return;
    자막판.hidden = !열까;
    if (자막메뉴단추) 자막메뉴단추.textContent = 열까 ? "자막 ▴" : "자막 ▾";
  }

  if (자막메뉴단추) 자막메뉴단추.addEventListener("click", ㅇ => {
    ㅇ.stopPropagation();
    자막판열기(자막판.hidden);
  });

  if (껐켰단추) 껐켰단추.addEventListener("click", ㅇ => {
    ㅇ.stopPropagation();
    if (typeof 자막 === "undefined" || !자막.켜고끄기) return;
    const 켜졌나 = 자막.켜고끄기();
    껐켰단추.textContent = 켜졌나 ? "자막 끄기" : "자막 켜기";
  });

  function 전체화면바꾸기() {
    const 지금전체 = !!(document.fullscreenElement || document.webkitFullscreenElement) ||
                    통.classList.contains("가짜전체화면");

    if (지금전체) {
      통.classList.remove("가짜전체화면", "가로눕히기");
      document.body.classList.remove("전체화면중");
      나가기단추숨기기();
      try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (오류) {}
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      return;
    }

    // ★★★ 가로로 채운다 (2026-09-02 · 사용자가 정함)
    //   「화면 꽉 안찬다 … 그래도 꽉차게 나오게 해라 유튜브는 가능하다」
    //
    //   ① 먼저 폰한테 「가로로 돌려라」 하고 부탁한다.
    //   ② 폰에 회전 잠금이 걸려 있으면 그 부탁이 씹힌다.
    //     그때는 **우리가 직접 화면을 눕힌다** (CSS 로 90도).
    //     유튜브도 이 수를 쓴다. 세로 화면을 꽉 채우게 된다.
    //   ★ 부탁이 먹었는지는 조금 기다렸다가 화면 모양을 보고 판단한다.
    //     lock() 이 성공을 알려 줘도 실제로 안 돌아가는 폰이 있다.
    const 가로로돌리기 = () => {
      try {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock("landscape").catch(() => {});
        }
      } catch (오류) { /* 데스크톱은 원래 안 된다 */ }

      // 화면이 진짜로 가로가 됐나 보고, 아니면 우리가 눕힌다
      const 살펴보기 = () => {
        const 세로다 = window.innerHeight > window.innerWidth;
        const 전체인가 = !!(document.fullscreenElement || document.webkitFullscreenElement) ||
                        통.classList.contains("가짜전체화면") ||
                        통.classList.contains("가로눕히기");
        if (!전체인가) return;
        통.classList.toggle("가로눕히기", 세로다);
      };
      setTimeout(살펴보기, 350);
      setTimeout(살펴보기, 900);      // 늦게 도는 폰도 있다
    };

    const 부탁 = 통.requestFullscreen ? 통.requestFullscreen()
               : (통.webkitRequestFullscreen ? (통.webkitRequestFullscreen(), Promise.resolve())
                                             : Promise.reject());

    Promise.resolve(부탁)
      .then(() => { document.body.classList.add("전체화면중"); 나가기단추보이기(); 가로로돌리기(); })
      .catch(() => {
        // ★ 아이폰처럼 못 키워 주는 자리 — CSS 로 꽉 채운다
        통.classList.add("가짜전체화면");
        document.body.classList.add("전체화면중");
        나가기단추보이기();
        가로로돌리기();
      });
  }

  // ============================================================
  //  자막 단추를 손으로 끌어다 놓는다
  // ============================================================
  //
  //  사용자가 정한 것 (2026-09-02):
  //    「와씨 니가 이 화면을 못보면 너무 빡센데?」
  //
  //  ★★★ 나는 유튜브 틀 안을 못 본다. 남의 집이라 브라우저가 막아 놨다.
  //    로고가 어디 있는지, 스피커가 어디 있는지 모른다.
  //    그래서 자리를 왼쪽·오른쪽으로 몇 번이나 옮기며 사용자를 고생시켰다.
  //  ⇒ 내가 짐작하기를 그만둔다. **사람이 끌어다 놓는다.**
  //    한 번 놓으면 그 자리를 기억한다. 기기마다 달라도 각자 맞추면 된다.
  //  ★ 톡 누르면 드롭바가 열리고, 끌면 자리가 옮겨진다. 6px 이 그 기준이다.

  const 자막통 = document.querySelector(".자막통");
  const 자리열쇠 = "세진과학.자막단추자리.v1";

  function 자리쓰기(왼, 위) {
    if (!자막통) return;
    자막통.style.left = 왼 + "%";
    자막통.style.top = 위 + "%";
    자막통.style.right = "auto";
  }

  (function 담긴자리쓰기() {
    try {
      const ㄱ = JSON.parse(localStorage.getItem(자리열쇠) || "null");
      if (ㄱ && typeof ㄱ.왼 === "number" && typeof ㄱ.위 === "number") 자리쓰기(ㄱ.왼, ㄱ.위);
    } catch (오류) {}
  })();

  if (자막통) (function 끌게하기() {
    const 끌기시작 = 6;
    let 첫x = 0, 첫y = 0, 끌었나 = false, 잡았나 = false;
    let 처음왼 = 0, 처음위 = 0, 통네모 = null;

    자막통.addEventListener("pointerdown", ㅇ => {
      if (!전체화면중인가()) return;
      통네모 = 통.getBoundingClientRect();
      if (!통네모.width || !통네모.height) return;
      첫x = ㅇ.clientX; 첫y = ㅇ.clientY;
      // ★ 지금 자리는 style 에 적힌 값을 그대로 쓴다.
      //   화면에서 재면 돌아간 값이라 뒤섞인다.
      처음왼 = parseFloat(자막통.style.left) || 28;
      처음위 = parseFloat(자막통.style.top) || 1;
      잡았나 = true; 끌었나 = false;
      try { 자막통.setPointerCapture(ㅇ.pointerId); } catch (오류) {}
    });

    자막통.addEventListener("pointermove", ㅇ => {
      if (!잡았나 || !통네모) return;
      const 옆 = ㅇ.clientX - 첫x, 세로 = ㅇ.clientY - 첫y;
      if (!끌었나 && Math.abs(옆) < 끌기시작 && Math.abs(세로) < 끌기시작) return;
      끌었나 = true;
      자막통.classList.add("끄는중");
      if (자막판) 자막판.hidden = true;

      // ★★★ 눕혀 놨으면 화면과 영상의 방향이 다르다 (2026-09-02)
      //   영상통을 90도 돌려 놨으므로, 화면에서 오른쪽으로 민 것은
      //   영상 안에서는 「위로」 민 것이다. 그만큼 돌려서 셈한다.
      //   ★ 통네모(화면에서 잰 크기)는 이미 돌아간 뒤의 크기다.
      //     그래서 눕혔을 때는 가로·세로를 바꿔 나눠야 한다.
      const 눕혔나 = 통.classList.contains("가로눕히기");
      let 밀린왼, 밀린위;
      if (눕혔나) {
        밀린왼 = 세로 / 통네모.height * 100;
        밀린위 = -옆 / 통네모.width * 100;
      } else {
        밀린왼 = 옆 / 통네모.width * 100;
        밀린위 = 세로 / 통네모.height * 100;
      }
      자리쓰기(Math.max(0, Math.min(92, 처음왼 + 밀린왼)),
              Math.max(0, Math.min(92, 처음위 + 밀린위)));
    });

    const 손뗌 = ㅇ => {
      if (!잡았나) return;
      잡았나 = false;
      자막통.classList.remove("끄는중");
      try { 자막통.releasePointerCapture(ㅇ.pointerId); } catch (오류) {}
      if (!끌었나) return;                 // 톡 누른 것 — 드롭바가 알아서 열린다
      const 왼 = parseFloat(자막통.style.left) || 0;
      const 위 = parseFloat(자막통.style.top) || 0;
      try { localStorage.setItem(자리열쇠, JSON.stringify({ 왼, 위 })); } catch (오류) {}
    };
    ["pointerup", "pointercancel"].forEach(이름 => 자막통.addEventListener(이름, 손뗌));

    // 끌었으면 그 눌림으로 드롭바가 열리지 않게 막는다
    자막통.addEventListener("click", ㅇ => { if (끌었나) { ㅇ.stopPropagation(); ㅇ.preventDefault(); } }, true);
  })();

  // 자막 위에서 아래로 쓸면 나간다 (눕혀 놨을 땐 「아래」 가 화면 왼쪽이다)
  (function 자막에서쓸기() {
    const 자막층 = document.getElementById("자막층");
    if (!자막층) return;
    let 첫x = 0, 첫y = 0, 잡았나 = false;

    자막층.addEventListener("pointerdown", ㅇ => {
      첫x = ㅇ.clientX; 첫y = ㅇ.clientY; 잡았나 = true;
    }, { passive: true });

    자막층.addEventListener("pointerup", ㅇ => {
      if (!잡았나) return;
      잡았나 = false;
      if (!전체화면중인가()) return;
      const 옆 = ㅇ.clientX - 첫x, 세로 = ㅇ.clientY - 첫y;
      // 눕혀 놨으면 90도 돌려 놓은 것이라, 보는 사람의 「아래」 는 화면 왼쪽이다
      const 눕혔나 = 통.classList.contains("가로눕히기");
      const 아래로 = 눕혔나 ? -옆 : 세로;
      const 옆으로 = 눕혔나 ? Math.abs(세로) : Math.abs(옆);
      if (아래로 > 60 && 아래로 > 옆으로) 전체화면바꾸기();
    }, { passive: true });
  })();


  // ★ 사람이 ESC 나 폰 몸짓으로 전체화면을 빠져나갈 때도 뒤처리를 한다 (2026-09-02)
  //   안 그러면 「전체화면중」 표가 남아서 화면이 안 굴러간다.
  ["fullscreenchange", "webkitfullscreenchange"].forEach(이름 => {
    document.addEventListener(이름, () => {
      const 아직 = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!아직 && !통.classList.contains("가짜전체화면")) {
        통.classList.remove("가로눕히기");
        document.body.classList.remove("전체화면중");
        나가기단추숨기기();
        try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (오류) {}
      }
    });
  });
  function API불러오기() {
    if (API준비) return API준비;
    API준비 = new Promise(풀기 => {
      if (window.YT && window.YT.Player) return 풀기(true);
      const 앞것 = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (앞것) 앞것(); 풀기(true); };
      const ㅅ = document.createElement("script");
      ㅅ.src = "https://www.youtube.com/iframe_api";
      ㅅ.onerror = () => 풀기(false);
      document.head.appendChild(ㅅ);
      setTimeout(() => 풀기(!!(window.YT && window.YT.Player)), 8000);
    });
    return API준비;
  }

  function 끄기() {
    돌리기멈춤();
    if (플레이어 && 플레이어.destroy) { try { 플레이어.destroy(); } catch (오류) {} }
    플레이어 = null;
    화면칸.replaceChildren();     // ★ 비워야 소리가 계속 나지 않는다
  }

  return {

    async 틀기(아이디, 제목) {
      끄기();

      const 틀 = document.createElement("iframe");
      // ★ controls=1 — 유튜브 재생바를 그대로 쓴다.
      //   enablejsapi=1 은 자막을 시간에 맞추려고 필요하다.
      틀.src = "https://www.youtube-nocookie.com/embed/" + 아이디 +
               // ★ modestbranding 은 뺐다 — 유튜브가 공식 폐기했고 아무 효과가 없다.
               //   문서 확인함: 「이 매개변수는 지원 중단되었으며 효과가 없습니다」 (2026-09-02)
               // ★★★ 유튜브 조작판은 그대로 쓴다 (2026-09-02 · 사용자가 정함)
               //   한때 controls=0 으로 끄고 우리 조작판(재생·재생바·배속)을 만들어 봤다.
               //   그런데 사용자가 「유튜브 조작판은 냅두고 그냥 우리껀 자막 버튼만
               //   하나 심자」 고 정해서 되돌렸다. 우리 것은 자막 하나뿐이다.
               //   ★ CC 단추만 골라 없애는 길은 없다 — 남의 틀 안이라 손을 못 넣는다.
               "?autoplay=1&rel=0&playsinline=1" +
               "&iv_load_policy=3&cc_load_policy=0&enablejsapi=1" +
               // ★★★ 유튜브 자체 전체화면 단추를 없앤다 (2026-09-02 · 사용자가 폰에서 잡음)
               //   「작은 화면에선 자막이 나오는데, 전체화면을 하면 자막이 안나와」
               //   유튜브 전체화면으로 가면 화면이 유튜브 틀 **안으로** 들어간다.
               //   우리 자막은 틀 밖에 얹혀 있어서 딸려 들어가지 못한다. 그래서 사라진다.
               //   ⇒ 유튜브 단추를 없애고, 우리 전체화면만 쓰게 한다.
               //     우리 것은 영상통을 통째로 키우니 자막이 같이 간다.
               "&fs=0" +
               "&origin=" + encodeURIComponent(location.origin);
      틀.title = 제목 || "강의 영상";
      틀.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen";
      틀.allowFullscreen = true;
      화면칸.replaceChildren(틀);

      const 됐나 = await API불러오기();
      if (!됐나) {
        // 자막은 시간에 못 맞추지만 영상은 그대로 나온다
        console.warn("유튜브 API 를 못 불러왔다 — 자막을 시간에 맞출 수 없다");
        return null;
      }

      플레이어 = new YT.Player(틀, {
        events: {
          onReady: ㅇ => { 유튜브자막계속죽이기(ㅇ.target); 돌리기시작(); },
          onStateChange: ㅇ => {
            유튜브자막계속죽이기(ㅇ.target);
            발맞추기(ㅇ.data === 1);       // 1 = 돌고 있다
          },
          onApiChange: ㅇ => 유튜브자막죽이기(ㅇ.target)   // 자막 덩어리가 붙는 바로 그때다
        }
      });
      return 플레이어;
    },

    끄기,

    // 그 시각으로 뛴다 (강의 안에서 찾기가 쓴다)
    뛰기(초) {
      if (!플레이어 || !플레이어.seekTo) return;
      try { 플레이어.seekTo(Math.max(0, 초), true); 플레이어.playVideo(); } catch (오류) {}
    },

    // ============================================================
    //  전체화면 — 폰에서는 가로로 돌려서 꽉 채운다
    // ============================================================
    //
    //  사용자가 정한 것 (2026-09-02, 폰에서 잡아냄):
    //    「전체화면을 하면 자막이 안나와」
    //    「그냥 가로로 회전하면서 폰 화면을 꽉 채워야 하는데 그게 안된다」
    //
    //  ★ 유튜브 자체 전체화면은 안 쓴다 (fs=0 으로 단추를 없앴다).
    //    거기로 가면 화면이 유튜브 틀 안으로 들어가서 우리 자막이 못 따라간다.
    //    영상통을 통째로 키워야 자막이 같이 간다.
    //
    //  ★★★ 아이폰은 영상 말고는 전체화면을 안 시켜 준다.
    //    그래서 안 되면 CSS 로 화면을 꽉 채우는 길을 따로 둔다(가짜전체화면).
    //    둘 다 자막이 따라오므로 보기에는 똑같다.
    전체화면: () => 전체화면바꾸기(),

    // 자막이 시간을 받아 가는 자리
    시간듣기(ㄷ) { 듣는이들.push(ㄷ); },
    시간그만듣기(ㄷ) { 듣는이들 = 듣는이들.filter(ㅇ => ㅇ !== ㄷ); }
  };
})();
