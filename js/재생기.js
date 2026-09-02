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

  // ★ 사람이 ESC 나 폰 몸짓으로 전체화면을 빠져나갈 때도 뒤처리를 한다 (2026-09-02)
  //   안 그러면 「전체화면중」 표가 남아서 화면이 안 굴러간다.
  ["fullscreenchange", "webkitfullscreenchange"].forEach(이름 => {
    document.addEventListener(이름, () => {
      const 아직 = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!아직 && !통.classList.contains("가짜전체화면")) {
        통.classList.remove("가로눕히기");
        document.body.classList.remove("전체화면중");
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
    전체화면() {
      const 지금전체 = !!(document.fullscreenElement || document.webkitFullscreenElement) ||
                      통.classList.contains("가짜전체화면");

      if (지금전체) {
        통.classList.remove("가짜전체화면", "가로눕히기");
        document.body.classList.remove("전체화면중");
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
        .then(() => { document.body.classList.add("전체화면중"); 가로로돌리기(); })
        .catch(() => {
          // ★ 아이폰처럼 못 키워 주는 자리 — CSS 로 꽉 채운다
          통.classList.add("가짜전체화면");
          document.body.classList.add("전체화면중");
          가로로돌리기();
        });
    },

    // 자막이 시간을 받아 가는 자리
    시간듣기(ㄷ) { 듣는이들.push(ㄷ); },
    시간그만듣기(ㄷ) { 듣는이들 = 듣는이들.filter(ㅇ => ㅇ !== ㄷ); }
  };
})();
