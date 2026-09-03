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
  //  ★★★ 사라지는 때가 자리마다 다르다 (2026-09-02 · 사용자가 재 줬다)
  //    「처음 전체 화면이 뜨고 사라질때는 너가 1초정도 더 늦게 사라지고,
  //      가운데 재생 버튼 누르고 사라질때는 너가 1초 정도 먼저 사라진다」
  //    ⇒ 사용자가 눈으로 잰 값 그대로 맞춘다.
  const 들어갈때사라짐 = 2000;   // 전체화면 들어갈 때 — 1초 앞당김
  const 재생눌렀을때   = 4000;   // 가운데 재생 단추 — 1초 늦춤
  const 톡눌렀을때     = 4000;   // 바탕 톡 — 1초 늦춤 (「자막은 한 1초 빨리 사라진다」)
  let 마지막톡 = 0;
  let 사라질시계 = null;

  // ★★★ 유튜브 껍데기가 지금 떠 있나 — 우리가 따로 세어 둔다 (2026-09-02 · 사용자가 잡음)
  //   「자막 드롭바를 키고 조정하다가 유튜브 버튼들은 사라지지.
  //     설정을 마치고 다시 화면을 터치하면 유튜브 버튼은 켜지고 자막 버튼은 사라진다.
  //     이다음부터는 엇박자로 나온다」
  //
  //   ★★★ 까닭 — 상태가 둘로 갈라졌다.
  //     드롭바를 여는 동안 유튜브는 제 껍데기를 감췄는데,
  //     우리 단추는 「만지는 중이니 붙잡아 둬라」 라서 그대로 떠 있었다.
  //     그 뒤로 우리 단추는 「보임」, 유튜브는 「감춤」 — 서로 반대다.
  //     그 상태에서 톡 누르면 유튜브는 켜지고 우리는 꺼진다. 계속 어긋난다.
  //
  //   ⇒ 우리 단추가 보이느냐와 **따로**, 유튜브가 떠 있을 것 같은 상태를 세어 둔다.
  //     드롭바 때문에 우리 단추를 붙잡아 둬도 이 셈은 유튜브를 따라 계속 간다.
  //     톡 누르면 이 셈을 뒤집고, 우리 단추는 이 셈을 따른다. 그러면 안 어긋난다.
  let 유튜브떠있나 = true;

  function 돌고있나() {
    try { return 플레이어 && 플레이어.getPlayerState() === 1; } catch (오류) { return false; }
  }

  function 드롭바열렸나() { return !!(자막판 && !자막판.hidden); }

  function 드롭바접기() {
    if (자막판) { 자막판.hidden = true; if (자막메뉴단추) 자막메뉴단추.textContent = "자막 ▾"; }
  }

  // 세어 둔 것을 화면에 입힌다
  //  ★ 드롭바를 만지는 중이면 유튜브가 꺼져 있어도 우리 단추는 붙잡아 둔다.
  //    (「드롭바 조정할때는 버튼 사라지지 않게 해줘」)
  function 입히기() {
    if (!단추칸 || 단추칸.hidden) return;
    const 보일까 = 유튜브떠있나 || 드롭바열렸나();
    단추칸.classList.toggle("쉬는중", !보일까);
    if (!보일까) 드롭바접기();
  }

  function 사라질시계걸기(얼마) {
    clearTimeout(사라질시계);
    if (!단추칸 || 단추칸.hidden) return;
    // ★ 시계는 무조건 건다. 울릴 때 그때 도는지 보고 정한다 (2026-09-02 에 밟음).
    //   전체화면으로 넘어가는 순간엔 유튜브가 상태를 잠깐 흐리게 답한다.
    사라질시계 = setTimeout(() => {
      if (!돌고있나()) return;          // 멈춰 있으면 유튜브도 안 감춘다
      유튜브떠있나 = false;              // ★ 드롭바를 만지는 중이어도 이 셈은 내려간다
      입히기();
    }, 얼마 || 톡눌렀을때);
  }

  function 보이기(보일까, 얼마) {
    유튜브떠있나 = !!보일까;
    입히기();
    if (보일까) 사라질시계걸기(얼마);
    else clearTimeout(사라질시계);
  }

  //  ★ 톡 누르면 곧바로 켰다 껐다 (2026-09-02 · 사용자가 정함)
  //    「그냥 화면 아무데나 클릭하면 버튼 바로 생기고 바로 사라지게 해라」
  //    전에는 「가운데 단추였나」 를 가리려고 0.15초 기다렸다. 그게 엇박자를 냈다.
  //    이제 기다리지 않는다. 가운데 단추였을 때는 발맞추기가 뒤이어 바로잡는다.
  function 톡눌렸다() {
    if (!단추칸 || 단추칸.hidden) return;
    // ★ 우리 단추가 보이느냐가 아니라 **유튜브가 떠 있느냐**를 뒤집는다.
    //   그래야 드롭바 때문에 우리만 떠 있던 뒤에도 박자가 안 어긋난다.
    보이기(!유튜브떠있나, 톡눌렀을때);
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
    // ★★★ 멈출 때 셈도 같이 올려 둔다 (2026-09-03 · 사용자가 잡음)
    //   「일시정지 버튼 누르고 화면 누르면 유튜브 바만 사라지고 니꺼는 안없어지거든?」
    //
    //   ★ 까닭 — 여기서 단추만 보이게 하고 「유튜브가 떠 있다」 는 셈은 안 올렸다.
    //     그래서 셈은 「꺼짐」, 화면은 「켜짐」 으로 갈라졌다.
    //     그 상태에서 톡 누르면 셈이 꺼짐→켜짐 으로 뒤집혀 우리 단추는 그대로 남고,
    //     유튜브만 저 혼자 사라졌다.
    //   ⇒ 멈출 때 셈도 「켜짐」 으로 맞춰 둔다. 그러면 톡 누를 때 같이 사라진다.
    if (!도나) { clearTimeout(사라질시계); 유튜브떠있나 = true; 입히기(); }
    else 보이기(true, 재생눌렀을때);        // 가운데 재생을 누른 것 — 1초 늦게 사라진다
  }

  function 나가기단추보이기() {
    if (!단추칸) return;
    단추칸.hidden = false;
    단추칸.classList.remove("쉬는중");     // 들어갈 때는 보인다
    사라질시계걸기(들어갈때사라짐);        // ★ 들어갈 때는 조금 빨리 사라진다
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
    // ★★★ 열려 있는 동안에도 **셈은 계속 간다** (2026-09-02 에 밟음)
    //   시계를 멈춰 두면 유튜브만 껍데기를 감추고 우리 셈은 「떠 있다」 로 남는다.
    //   그러면 다시 갈라진다. 셈은 유튜브를 따라가고, 화면만 붙잡아 둔다.
    //   ⇒ 닫는 순간 지금 셈을 그대로 입힌다 —
    //     보는 사이 유튜브가 이미 감췄으면 닫자마자 같이 사라진다. 그게 맞다.
    if (열까) 사라질시계걸기(톡눌렀을때);
    else 입히기();
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

  // ============================================================
  //  전체화면으로 — **돌면서** 커지고, 돌면서 작아진다
  // ============================================================
  //
  //  사용자가 정한 것 (2026-09-02):
  //    「전체화면으로 넘어갈때 회전하면서 스므스 하게 움직이게 해.
  //      그리고 반대로 작아질때도.」
  //
  //  ★ 전에는 전체화면에 들어간 뒤 다시 툭 하고 누웠다. 두 번 움직이니 끊겨 보였다.
  //    ⇒ 작은 화면의 영상 자리를 먼저 재 두고, 거기서부터 **한 동작으로** 이어 붙인다.
  //
  //  ★★★ CSS 바뀜으로는 안 된다.
  //    누울 때 상자가 position:fixed 로 갈아타서 자리가 통째로 바뀐다.
  //    그래서 앞뒤 그림을 직접 적어 주는 길(Web Animations)로 간다.

  const 돌기시간 = 320;
  const 돌기결  = "cubic-bezier(.2,.7,.2,1)";
  let 돌기움직임 = null;
  let 눕기전자리 = null;      // 전체화면 가기 전, 영상이 앉아 있던 자리

  // ============================================================
  //  눕힌 틀을 폰 화면에 **딱** 맞춘다
  // ============================================================
  //
  //  사용자가 정한 것 (2026-09-03):
  //    「야 그냥 폰 좌우폭에 딱 못마추냐?」
  //
  //  ★ CSS 의 100dvh·100dvw 는 브라우저마다 조금씩 다르게 답한다.
  //    그래서 지금 화면을 **직접 재서** px 로 박는다. 그러면 어긋날 자리가 없다.
  //  ★ 눕혀 놓으면 가로·세로가 맞바뀐다 —
  //    틀의 가로(=화면의 세로) · 틀의 세로(=화면의 가로).
  //  ★ 손가락으로 화면을 벌려 놨을 수도 있다. 그때는 visualViewport 가 진짜 값을 안다.

  //   손올림 … 보는 사람 기준 위(+) / 아래(−)   … 폰으로는 좌우
  //   손넓힘 … 보는 사람 기준 위아래 길이       … 폰으로는 좌우 폭
  //   손길이 … 보는 사람 기준 좌우 길이         … 폰으로는 위아래 폭
  //  ★★★ 사용자가 폰에서 손으로 맞춘 값이다 (2026-09-03) — 「올림 14 · 위아래 0 · 좌우 0」
  const 손올림 = 14, 손넓힘 = 0, 손길이 = 0;

  function 눕힘자리맞추기() {
    if (!통.classList.contains("가로눕히기")) {
      ["width", "height", "left", "top"].forEach(ㄱ => 통.style.removeProperty(ㄱ));
      return;
    }
    const ㅂ = window.visualViewport;
    const 폭   = Math.round(ㅂ ? ㅂ.width  : window.innerWidth);
    const 높이 = Math.round(ㅂ ? ㅂ.height : window.innerHeight);
    if (!폭 || !높이) return;
    const 왼끝 = Math.round(ㅂ ? ㅂ.offsetLeft : 0);
    const 위끝 = Math.round(ㅂ ? ㅂ.offsetTop  : 0);

    통.style.width  = (높이 + 손길이) + "px";   // 틀의 가로 = 화면의 세로
    통.style.height = (폭 + 손넓힘) + "px";     // 틀의 세로 = 화면의 가로
    통.style.left   = (왼끝 + 폭 / 2 + 손올림) + "px";
    통.style.top    = (위끝 + 높이 / 2) + "px";
  }


  function 이따가자리맞추기() {
    requestAnimationFrame(() => requestAnimationFrame(눕힘자리맞추기));
  }
  window.addEventListener("resize", 이따가자리맞추기);
  window.addEventListener("orientationchange", 이따가자리맞추기);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", 이따가자리맞추기);
    window.visualViewport.addEventListener("scroll", 이따가자리맞추기);
  }

  function 돌기멈추기() {
    if (!돌기움직임) return;
    try { 돌기움직임.cancel(); } catch (오류) {}
    돌기움직임 = null;
  }

  function 눕는움직임(들어가나, 끝나면) {
    const 끝 = () => { if (typeof 끝나면 === "function") 끝나면(); };
    const 자리 = 눕기전자리;
    const 폭 = 통.offsetWidth, 높이 = 통.offsetHeight;
    if (!통.animate || !자리 || !자리.width || !폭 || !높이) { 끝(); return; }

    const 가운데x = window.innerWidth / 2, 가운데y = window.innerHeight / 2;
    const 옆 = (자리.left + 자리.width / 2) - (가운데x + 폭 / 2);
    const 위 = (자리.top + 자리.height / 2) - (가운데y + 높이 / 2);
    const 가로배 = Math.max(.02, 자리.width / 폭);
    const 세로배 = Math.max(.02, 자리.height / 높이);

    const 작게 = "translate(" + 옆 + "px, " + 위 + "px) rotate(0deg) scale(" + 가로배 + ", " + 세로배 + ")";
    const 크게 = "translate(" + (-폭 / 2) + "px, " + (-높이 / 2) + "px) rotate(90deg) scale(1, 1)";

    돌기멈추기();
    let 한번 = false;
    const 마침 = () => { if (한번) return; 한번 = true; 끝(); };
    try {
      const ㅁ = 통.animate(
        들어가나 ? [{ transform: 작게 }, { transform: 크게 }]
                 : [{ transform: 크게 }, { transform: 작게 }],
        { duration: 돌기시간, easing: 돌기결, fill: 들어가나 ? "none" : "forwards" }
      );
      돌기움직임 = ㅁ;
      ㅁ.finished.then(마침, 마침);
      setTimeout(마침, 돌기시간 + 120);
    } catch (오류) { 마침(); }
  }

  function 전체화면바꾸기() {
    const 지금전체 = !!(document.fullscreenElement || document.webkitFullscreenElement) ||
                    통.classList.contains("가짜전체화면");

    if (지금전체) {
      // ★ 누워 있었으면 돌면서 작아진 다음에 벗긴다
      const 누웠나 = 통.classList.contains("가로눕히기");
      let 끝냈나 = false;
      const 마무리 = () => {
        if (끝냈나) return; 끝냈나 = true;
        돌기멈추기();
        통.classList.remove("가짜전체화면", "가로눕히기");
        눕힘자리맞추기();                        // ★ 박아 둔 자리를 지운다
        document.body.classList.remove("전체화면중");
        나가기단추숨기기();
        try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (오류) {}
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      };
      if (누웠나) 눕는움직임(false, 마무리);
      else 마무리();
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
        const 이미 = 통.classList.contains("가로눕히기");
        if (세로다 === 이미) return;              // 바뀔 게 없으면 건드리지 않는다
        통.classList.toggle("가로눕히기", 세로다);
        눕힘자리맞추기();                        // ★ 재서 딱 맞춘다
        if (세로다) 눕는움직임(true);            // 눕는 순간을 한 동작으로 이어 붙인다
      };
      setTimeout(살펴보기, 140);
      setTimeout(살펴보기, 420);
      setTimeout(살펴보기, 900);      // 늦게 도는 폰도 있다
    };

    // ★ 눈금은 키우기 전에 재 둔다. 뒤에 재면 이미 커진 자리가 나온다.
    눕기전자리 = 통.getBoundingClientRect();

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

  // ============================================================
  //  아래로 쓸면 손을 따라 밀리다가 작아진다
  // ============================================================
  //
  //  사용자가 정한 것 (2026-09-03):
  //    「전체화면에서 화면을 아래로 스와이프 하면 다시 작아지게 해줘
  //      유튜브 처럼 말이야. 약간 아래로 밀리다가 작아지는거
  //      내 손의 움직임을 따라가면서」
  //
  //  ★★★ 영상 위 손짓은 못 받는다. 유튜브 틀 안이고 남의 집이다 (지침 2-10).
  //    그래서 **우리 것인 자리**에서만 받는다 — 위쪽 띠(쓸기칸)와 자막층.
  //    유튜브 재생바와 가운데 단추는 안 덮는다.
  //
  //  ★ 눕혀 놨으면 보는 사람의 「아래」 는 화면 왼쪽이다. 그만큼 돌려서 센다.

  // ============================================================
  //  글쇠(키보드)로 다루기 — 웹에서 쓴다
  // ============================================================
  //
  //  사용자가 정한 것 (2026-09-03):
  //    「야 웹에서 재생바가 키보드 안먹는다」
  //
  //  ★ 까닭 — 글쇠는 유튜브 틀이 아니라 **우리 페이지**가 받는다.
  //    유튜브는 제 틀에 눈길(focus)이 있을 때만 글쇠를 듣는다. 그래서 아무 일도 없었다.
  //  ⇒ 우리가 받아서 대신 눌러 준다.
  //  ★ 글 쓰는 칸(강의 안에서 찾기 등)에 눈길이 있으면 건드리지 않는다.

  //  ★ 유튜브 틀에 눈길을 넘긴다 (웹에서만 뜻이 있다)
  function 눈길넘기기() {
    try {
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      const 틀 = 화면칸 && 화면칸.querySelector("iframe");
      if (틀 && 틀.focus) 틀.focus();
    } catch (오류) {}
  }

  //  영상통 어디를 눌러도 눈길을 넘긴다 — 덮개가 눌림을 먹어도 이건 통한다
  통.addEventListener("pointerdown", 눈길넘기기, true);

  function 글쓰는중인가() {
    const ㄴ = document.activeElement;
    if (!ㄴ) return false;
    const 이름 = (ㄴ.tagName || "").toUpperCase();
    return 이름 === "INPUT" || 이름 === "TEXTAREA" || ㄴ.isContentEditable;
  }

  function 뛰어넘기(초) {
    if (!플레이어 || !플레이어.getCurrentTime || !플레이어.seekTo) return;
    try {
      const 지금 = 플레이어.getCurrentTime() || 0;
      플레이어.seekTo(Math.max(0, 지금 + 초), true);
    } catch (오류) {}
  }

  //  ★ 웹에서는 우리가 안 끼어든다 — 유튜브 본래 글쇠를 그대로 쓴다 (2026-09-03)
  //    「웹은 그냥 유튜브 오리지날로 냅둬」
  const 마우스자리 = (() => {
    try { return window.matchMedia("(hover: hover) and (pointer: fine)").matches; }
    catch (오류) { return false; }
  })();

  document.addEventListener("keydown", ㅇ => {
    if (마우스자리) return;
    if (!플레이어) return;
    if (글쓰는중인가()) return;
    if (ㅇ.ctrlKey || ㅇ.altKey || ㅇ.metaKey) return;

    const 글쇠 = ㅇ.key;
    let 먹었나 = true;

    if (글쇠 === " " || 글쇠 === "Spacebar" || 글쇠 === "k" || 글쇠 === "K") 재생껐켰();
    else if (글쇠 === "ArrowRight") 뛰어넘기(5);
    else if (글쇠 === "ArrowLeft")  뛰어넘기(-5);
    else if (글쇠 === "l" || 글쇠 === "L") 뛰어넘기(10);
    else if (글쇠 === "j" || 글쇠 === "J") 뛰어넘기(-10);
    else if (글쇠 === "f" || 글쇠 === "F") 전체화면바꾸기();
    else if (글쇠 === "m" || 글쇠 === "M") {
      try { 플레이어.isMuted && 플레이어.isMuted() ? 플레이어.unMute() : 플레이어.mute(); }
      catch (오류) {}
    }
    else if (글쇠 === "ArrowUp" || 글쇠 === "ArrowDown") {
      try {
        const 지금 = 플레이어.getVolume ? 플레이어.getVolume() : 100;
        const 새것 = Math.max(0, Math.min(100, 지금 + (글쇠 === "ArrowUp" ? 5 : -5)));
        if (플레이어.setVolume) 플레이어.setVolume(새것);
      } catch (오류) {}
    }
    else 먹었나 = false;

    if (먹었나) { ㅇ.preventDefault(); ㅇ.stopPropagation(); }
  });

  //  톡 누르면 재생/정지
  function 재생껐켰() {
    if (!플레이어) return;
    try {
      const 상태 = 플레이어.getPlayerState ? 플레이어.getPlayerState() : -9;
      if (상태 === 1) 플레이어.pauseVideo();
      else 플레이어.playVideo();
    } catch (오류) {}
  }

  (function 아래로쓸어닫기() {
    const 쓸기칸 = document.getElementById("쓸기칸");
    const 자막층 = document.getElementById("자막층");
    const 닫는거리 = 90;      // 이만큼 밀면 닫는다
    const 끌기시작 = 8;

    function 그리기(옆, 세로, 배) {
      if (통.classList.contains("가로눕히기")) {
        const 폭 = 통.offsetWidth, 높이 = 통.offsetHeight;
        통.style.transform = "translate(" + (-폭 / 2 + 옆) + "px, " + (-높이 / 2 + 세로) +
                             "px) rotate(90deg) scale(" + 배 + ")";
      } else {
        통.style.transform = "translate(" + 옆 + "px, " + 세로 + "px) scale(" + 배 + ")";
      }
    }
    function 그림지우기() { 통.style.transform = ""; 통.style.transition = ""; }

    function 붙이기(요소) {
      if (!요소) return;
      let 첫x = 0, 첫y = 0, 잡았나 = false, 끌었나 = false, 잡은것 = null;

      요소.addEventListener("pointerdown", ㅇ => {
        첫x = ㅇ.clientX; 첫y = ㅇ.clientY; 잡았나 = true; 끌었나 = false;
        // ★ 실제로 눌린 조각에 손가락을 붙들어 둔다 (쓸기칸 자체는 손짓을 안 받는다)
        잡은것 = (ㅇ.target && ㅇ.target.setPointerCapture) ? ㅇ.target : 요소;
        try { 잡은것.setPointerCapture(ㅇ.pointerId); } catch (오류) {}
      });

      요소.addEventListener("pointermove", ㅇ => {
        if (!잡았나) return;
        const 전체다 = 전체화면중인가();
        const 눕혔나 = 통.classList.contains("가로눕히기");
        const 옆 = ㅇ.clientX - 첫x, 세로 = ㅇ.clientY - 첫y;
        const 아래로 = 눕혔나 ? -옆 : 세로;
        const 옆으로 = 눕혔나 ? Math.abs(세로) : Math.abs(옆);
        // ★ 작은 화면에서는 **위로 끌어도** 커진다 (2026-09-03 · 사용자가 정함)
        //   「작은 띠는 위로 끌어도 전체화면 되게 해줘」
        // ★ 전체화면에서도 **위로 쓸어도** 작아진다 (2026-09-03 · 사용자가 정함)
        //   「지금 영역에서 위로 쓸었을때도 전체화면 및 축소 되게 해줘」
        const 민만큼 = 전체다 ? Math.abs(아래로) : Math.abs(세로);
        const 다른쪽 = 전체다 ? 옆으로 : Math.abs(옆);
        if (!끌었나) {
          if (민만큼 < 끌기시작 || 민만큼 < 다른쪽) return;
          끌었나 = true;
          통.style.transition = "none";
        }
        if (전체다) {
          // 전체화면 — 밀수록 작아진다
          const 길이 = 눕혔나 ? window.innerWidth : window.innerHeight;
          const 배 = Math.max(.70, 1 - (Math.abs(아래로) / Math.max(1, 길이)) * 0.7);
          그리기(옆, 세로, 배);
        } else {
          // ★ 작은 화면 — 밀수록 **커진다** (2026-09-03 · 사용자가 정함)
          //   「작은 화면 아래로 끌어내리면 이것도 확대 되게 해줘」
          const 배 = 1 + Math.min(0.14, Math.abs(세로) / 700);
          그리기(옆 * 0.35, 세로 * 0.35, 배);
        }
      });

      const 손뗌 = ㅇ => {
        if (!잡았나) return;
        잡았나 = false;
        try { (잡은것 || 요소).releasePointerCapture(ㅇ.pointerId); } catch (오류) {}
        // ★ 그냥 톡 누른 것이면 아무 일도 안 한다 (2026-09-03 · 사용자가 정함)
        //   「터치 하면 그냥 재생바 사라져야 하는데」 — 탭은 유튜브 몫이다.
        //   우리 띠는 좁으니 여기서 톡 누른 건 그냥 흘려보낸다.
        if (!끌었나) return;
        끌었나 = false;
        const 눕혔나 = 통.classList.contains("가로눕히기");
        const 옆 = ㅇ.clientX - 첫x, 세로 = ㅇ.clientY - 첫y;
        const 아래로 = 눕혔나 ? -옆 : 세로;

        // 많이 밀었으면 — 전체화면이면 닫고, 작은 화면이면 키운다
        //  ★ 작은 화면은 위로 끌어도 된다. 어느 쪽이든 많이 끌면 커진다.
        const 민만큼 = 전체화면중인가() ? Math.abs(아래로) : Math.abs(세로);
        if (민만큼 > 닫는거리) { 그림지우기(); 전체화면바꾸기(); return; }

        // 덜 밀었으면 제자리로 스르륵 돌아간다
        통.style.transition = "transform .2s ease";
        그리기(0, 0, 1);
        setTimeout(그림지우기, 230);
      };
      ["pointerup", "pointercancel"].forEach(이름 => 요소.addEventListener(이름, 손뗌));
    }

    붙이기(쓸기칸);
    붙이기(자막층);
  })();


  // ★ 사람이 ESC 나 폰 몸짓으로 전체화면을 빠져나갈 때도 뒤처리를 한다 (2026-09-02)
  //   안 그러면 「전체화면중」 표가 남아서 화면이 안 굴러간다.
  ["fullscreenchange", "webkitfullscreenchange"].forEach(이름 => {
    document.addEventListener(이름, () => {
      const 아직 = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!아직 && !통.classList.contains("가짜전체화면")) {
        통.classList.remove("가로눕히기");
        눕힘자리맞추기();
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

      // ★★★ 웹에서는 유튜브 틀에 눈길을 준다 (2026-09-03 · 사용자가 정함)
      //   「웹에서 유튜브 틀로해」 「키보드가 안먹어. 원래는 먹었는데」
      //
      //   ★★★ 왜 안 먹게 됐나 — 우리 쓸기 덮개가 영상 위를 덮고 있다.
      //     영상을 눌러도 그 눌림을 덮개가 먹으니 **유튜브 틀이 눈길을 못 받는다.**
      //     유튜브는 제 틀에 눈길이 있을 때만 글쇠를 듣는다. 그래서 죽어 버렸다.
      //   ⇒ 영상 언저리를 누르면 **우리가 눈길을 유튜브한테 넘겨준다.**
      //   ★ 폰은 안 한다 — 손으로 만지는 자리라 눈길이 의미가 없다.
      try {
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          [300, 1200].forEach(ㄷ => setTimeout(눈길넘기기, ㄷ));
        }
      } catch (오류) {}

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
