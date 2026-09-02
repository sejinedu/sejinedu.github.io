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
    // ★ 조작판도 같은 시계로 고친다. 시계를 두 개 돌리지 않는다 (지침서 6절 21번).
    if (typeof 조작판고치기 === "function") 조작판고치기();
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

  // ★★★ 손잡이 하나로 폈다 접었다 (2026-09-02 · 사용자가 정함)
  //   「니가 만든거는 안없어져」
  //   「요기능도 쓸때가 있으니까 냅두고, 니가 만든건 이거랑 안겹치게 만들고
  //     한번 터치하면 생기고 다시 터치하면 사라지게 해」
  //
  //   ★ 유튜브 아이콘(소리·자막·설정)은 그대로 둔다. 쓸 데가 있다고 했다.
  //     그래서 자리를 **왼쪽 가운데**로 옮겼다 — 유튜브가 거기는 안 쓴다.
  //   ★ 평소에는 작은 손잡이(가) 하나만 있다. 누르면 펴지고 다시 누르면 접힌다.
  //     아주 없애지는 않는다 — 없애면 되부를 길이 없어 갇힌다.
  //   ★ 영상 위의 손짓은 유튜브 틀이 삼켜서 우리한테 안 온다.
  //     그래서 「영상을 누르면 같이 사라지게」 는 만들 수가 없다. 손잡이로 대신한다.

  const 손잡이 = document.getElementById("단추손잡이");

  function 펼치기(펼까) {
    if (!단추칸) return;
    단추칸.classList.toggle("펼침", 펼까);
    if (!펼까) 자막판열기(false);          // 접으면 드롭바도 같이 닫는다
    if (손잡이) 손잡이.setAttribute("aria-label", 펼까 ? "자막 손질 닫기" : "자막 손질 열기");
  }

  if (손잡이) 손잡이.addEventListener("click", ㅇ => {
    ㅇ.stopPropagation();
    펼치기(!단추칸.classList.contains("펼침"));
  });

  function 나가기단추보이기() {
    if (!단추칸) return;
    단추칸.hidden = false;
    펼치기(false);              // ★ 처음에는 접힌 채로. 손잡이만 보인다.
  }
  function 나가기단추숨기기() {
    if (!단추칸) return;
    단추칸.hidden = true;
    펼치기(false);
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
  //  우리가 만든 조작판 — 유튜브 것 대신이다
  // ============================================================
  //
  //  사용자가 정한 것 (2026-09-02):
  //    「없앨수 있으면 없애자. 그리고 해당 기능들 니가 새로 만들어.
  //      일단 cc는 확실히 필요 없고 배속 기능 화질 기능 따로 만들어」
  //
  //  ★★★ 화질은 못 만든다. 유튜브가 setPlaybackQuality 를 폐기했다.
  //    불러도 무시하고 저희가 알아서 정한다. 남의 집 물건이라 어쩔 수 없다.
  //  ★ 배속은 유튜브가 열어 뒀다 (setPlaybackRate).

  const 조작판   = document.getElementById("조작판");
  const 재생정지 = document.getElementById("재생정지");
  const 진행바   = document.getElementById("진행바");
  const 지금시각 = document.getElementById("지금시각");
  const 전체시각 = document.getElementById("전체시각");
  const 배속단추 = document.getElementById("배속단추");
  const 배속판   = document.getElementById("배속판");
  const 몸짓층   = document.getElementById("몸짓층");

  let 끄는중 = false;          // 재생바를 손으로 잡고 있나

  function 시각글로(초) {
    초 = Math.max(0, Math.floor(초 || 0));
    const ㅅ = Math.floor(초 / 3600), ㅂ = Math.floor((초 % 3600) / 60), ㅊ = 초 % 60;
    return (ㅅ ? ㅅ + ":" + String(ㅂ).padStart(2, "0") : ㅂ) + ":" + String(ㅊ).padStart(2, "0");
  }

  function 조작판고치기() {
    if (!플레이어 || !조작판 || 조작판.hidden) return;
    let 지금 = 0, 전체 = 0, 상태 = -1;
    try {
      지금 = 플레이어.getCurrentTime() || 0;
      전체 = 플레이어.getDuration() || 0;
      상태 = 플레이어.getPlayerState();
    } catch (오류) { return; }
    if (재생정지) {
      const 돌고있나 = (상태 === 1);
      재생정지.textContent = 돌고있나 ? "❚❚" : "▶";
      재생정지.setAttribute("aria-label", 돌고있나 ? "일시정지" : "재생");
    }
    if (지금시각) 지금시각.textContent = 시각글로(지금);
    if (전체시각) 전체시각.textContent = 시각글로(전체);
    if (진행바 && !끄는중 && 전체 > 0) 진행바.value = String(Math.round(지금 / 전체 * 1000));
  }

  // 조작판 펴고 접기
  function 조작판열기(열까) {
    if (!조작판) return;
    조작판.hidden = !열까;
    if (열까) 조작판고치기();
    if (!열까 && 배속판) 배속판.hidden = true;
  }

  if (재생정지) 재생정지.addEventListener("click", ㅇ => {
    ㅇ.stopPropagation();
    if (!플레이어) return;
    try {
      const 상태 = 플레이어.getPlayerState();
      if (상태 === 1) 플레이어.pauseVideo(); else 플레이어.playVideo();
    } catch (오류) {}
    setTimeout(조작판고치기, 120);
  });

  if (진행바) {
    진행바.addEventListener("pointerdown", () => { 끄는중 = true; });
    const 놓기 = () => {
      if (!끄는중) return;
      끄는중 = false;
      if (!플레이어) return;
      try {
        const 전체 = 플레이어.getDuration() || 0;
        if (전체 > 0) 플레이어.seekTo(전체 * (Number(진행바.value) / 1000), true);
      } catch (오류) {}
    };
    ["pointerup", "pointercancel"].forEach(이름 => 진행바.addEventListener(이름, 놓기));
    진행바.addEventListener("change", 놓기);
    진행바.addEventListener("click", ㅇ => ㅇ.stopPropagation());
  }

  // ---------- 배속 ----------
  const 배속들 = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  function 배속판그리기() {
    if (!배속판) return;
    배속판.innerHTML = "";
    let 지금배속 = 1;
    try { 지금배속 = 플레이어 ? (플레이어.getPlaybackRate() || 1) : 1; } catch (오류) {}
    배속들.forEach(ㅂ => {
      const 단 = document.createElement("button");
      단.type = "button";
      단.className = "배속칸" + (Math.abs(ㅂ - 지금배속) < 0.01 ? " 골랐음" : "");
      단.textContent = ㅂ + "×";
      단.addEventListener("click", ㅇ => {
        ㅇ.stopPropagation();
        try { if (플레이어) 플레이어.setPlaybackRate(ㅂ); } catch (오류) {}
        if (배속단추) 배속단추.textContent = ㅂ + "×";
        배속판.hidden = true;
      });
      배속판.appendChild(단);
    });
  }

  if (배속단추) 배속단추.addEventListener("click", ㅇ => {
    ㅇ.stopPropagation();
    if (!배속판) return;
    if (배속판.hidden) { 배속판그리기(); 배속판.hidden = false; }
    else 배속판.hidden = true;
  });

  // ============================================================
  //  영상 위 손짓
  // ============================================================
  //
  //  사용자가 정한 것 (2026-09-02):
  //    「전체화면에서 동영상을 꾹누르고 아래로 스와이프하면 작아지게도 해줘」
  //
  //  ★ 유튜브 조작판을 껐기 때문에 이제 이 층이 손짓을 받을 수 있다.
  //    켜져 있을 때는 유튜브 틀이 다 삼켜서 아무것도 못 받았다.
  //  · 짧게 누르면 조작판을 폈다 접는다
  //  · 꾹 누르고 아래로 쓸면 전체화면에서 나간다
  //    (눕혀 놨을 땐 보는 사람의 「아래」 가 화면 왼쪽이다)

  if (몸짓층) (function 손짓받기() {
    const 꾹시간 = 320;        // 이만큼 누르고 있으면 「꾹」
    const 나갈거리 = 70;       // 아래로 이만큼 쓸면 나간다
    let 첫x = 0, 첫y = 0, 첫때 = 0, 꾹인가 = false, 잡았나 = false, 움직였나 = false;
    let 꾹시계 = null;

    몸짓층.addEventListener("pointerdown", ㅇ => {
      첫x = ㅇ.clientX; 첫y = ㅇ.clientY; 첫때 = Date.now();
      잡았나 = true; 꾹인가 = false; 움직였나 = false;
      clearTimeout(꾹시계);
      꾹시계 = setTimeout(() => { if (!움직였나) 꾹인가 = true; }, 꾹시간);
    }, { passive: true });

    몸짓층.addEventListener("pointermove", ㅇ => {
      if (!잡았나) return;
      const 옆 = ㅇ.clientX - 첫x, 세로 = ㅇ.clientY - 첫y;
      if (Math.abs(옆) > 8 || Math.abs(세로) > 8) 움직였나 = true;
      if (!꾹인가 || !전체화면중인가()) return;

      // 눕혀 놨으면 보는 사람의 「아래」 는 화면 왼쪽이다
      const 눕혔나 = 통.classList.contains("가로눕히기");
      const 아래로 = 눕혔나 ? -옆 : 세로;
      const 옆으로 = 눕혔나 ? Math.abs(세로) : Math.abs(옆);
      if (아래로 > 나갈거리 && 아래로 > 옆으로) {
        잡았나 = false;
        clearTimeout(꾹시계);
        전체화면바꾸기();
      }
    }, { passive: true });

    const 손뗌 = () => {
      if (!잡았나) return;
      잡았나 = false;
      clearTimeout(꾹시계);
      // 짧게 톡 누른 것이면 조작판을 폈다 접는다
      if (!움직였나 && Date.now() - 첫때 < 꾹시간) 조작판열기(조작판.hidden);
    };
    ["pointerup", "pointercancel"].forEach(이름 =>
      몸짓층.addEventListener(이름, 손뗌, { passive: true }));
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
               // ★★★ 유튜브 조작판을 끈다 (2026-09-02 · 사용자가 정함)
               //   「없앨수 있으면 없애자. 그리고 해당 기능들 니가 새로 만들어.
               //     일단 cc는 확실히 필요 없고 배속 기능 화질 기능 따로 만들어」
               //   ⇒ 위 제목줄·아이콘이 다 사라진다. 대신 재생·재생바·배속을 우리가 만든다.
               //   ★ 화질은 못 만든다 — 유튜브가 setPlaybackQuality 를 폐기했다.
               //     불러도 무시하고 저희가 알아서 정한다. 남의 집 물건이라 어쩔 수 없다.
               //   ★ 이걸 켜야 영상 위 손짓을 우리가 받을 수 있다 (몸짓층).
               "?autoplay=1&rel=0&playsinline=1&controls=0&disablekb=1" +
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
      if (조작판) 조작판.hidden = true;        // 새 영상은 조작판 접힌 채로 시작

      const 됐나 = await API불러오기();
      if (!됐나) {
        // 자막은 시간에 못 맞추지만 영상은 그대로 나온다
        console.warn("유튜브 API 를 못 불러왔다 — 자막을 시간에 맞출 수 없다");
        return null;
      }

      플레이어 = new YT.Player(틀, {
        events: {
          onReady: ㅇ => { 유튜브자막계속죽이기(ㅇ.target); 돌리기시작(); },
          onStateChange: ㅇ => 유튜브자막계속죽이기(ㅇ.target),
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
