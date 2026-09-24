// ============================================================
//  회원 — 가입 · 로그인 · 별명 · 등급  (2026-09-22 · 사용자가 정함)
// ============================================================
//
//  사용자가 정한 것:
//    「회원 가입이 있다」 · 「아이디는 그냥 세도비로 통합한다」
//    등급: 일반 회원 · 선생님 · 관리자
//
//  ★ 세도비 계정 그대로다. 런처에 로그인하던 그 메일로 여기서도 들어온다.
//  ★ 비밀번호가 없다 — 메일로 온 여섯 자리 번호를 넣는다. 런처와 같은 방식이다.
//    처음 온 메일이면 그 자리에서 가입이 된다. 「가입」 과 「로그인」 이 한 길이다.
//  ★ 보는 것은 로그인 없이 된다 (배틀넷 작전 307행 — 애들 보는 쪽을 막지 마라).
//    로그인은 댓글·올리기 같은 「쓰는 일」 을 할 때만 필요하다.
//
//  ★★ 권한은 여기서 안 막는다. 저장소(RLS)가 막는다 — db/1 회원·단원·글·댓글.sql.
//     여기 등급은 **단추를 보일지 말지**에만 쓴다. 화면을 속여도 저장소가 거절한다.
//
//  ★ 공개 열쇠(publishable)만 쓴다. 이건 원래 밖에 보여도 되는 열쇠다.
//    Secret key 는 이 파일에도, 이 저장소 어디에도 들어오지 않는다.

const 회원 = (() => {
  const 주소 = "https://burwsvkcaiqfiymdptex.supabase.co";
  const 공개열쇠 = "sb_publishable_Yxaq9Rbth3NUmcREMwlbSg_qaXpoLVy";
  const 서랍열쇠 = "세진과학.로그인.v1";

  let 표 = null;          // { access_token, refresh_token, expires_at, user: { id, email } }
  let 나 = null;          // { public_id, nickname, role }
  let 채널 = null;        // rpc 채널_목록 답 — { 목록:[{주인, 이름, 내것, 소속이름, 강사id, 권한, 상태, 정지, 주인닉네임, 초대한이}], 앱자격, 메일, 닉네임 }
  const 듣는이 = new Set();

  // ---------- 서랍 (이 브라우저에만) ----------
  //  ★ 로그인 표는 이 기기 것이다. 원래 그렇다 — 기기마다 따로 로그인한다.
  //    자료(글·댓글)는 저장소에 있으니 새 기기에서도 로그인만 하면 다 나온다.
  function 서랍읽기() {
    try { return JSON.parse(localStorage.getItem(서랍열쇠) || "null"); } catch (오류) { return null; }
  }
  function 서랍쓰기(ㄱ) {
    try {
      if (ㄱ) localStorage.setItem(서랍열쇠, JSON.stringify(ㄱ));
      else localStorage.removeItem(서랍열쇠);
    } catch (오류) { /* 개인 창이면 못 담는다 — 이번 창에서만 로그인이 산다 */ }
  }

  function 알리기() { 듣는이.forEach(ㅎ => { try { ㅎ(상태()); } catch (오류) {} }); }
  function 상태() {
    return {
      들어왔나: !!표,
      메일: 표 && 표.user ? 표.user.email : "",
      별명: 나 ? 나.nickname : null,
      등급: 나 ? 나.role : (표 ? "member" : null),
      이름표: 나 ? 나.public_id : null,
      추천별명: (표 && 표.user && 표.user.이름) || "",
      런처로그인: !!(표 && 표.서버표),
      채널: 채널 || null          // 채널_목록 답 (없으면 null) — 로그인 화면 규격 「이름 칸 빨간 점 · 드롭바 머리 · 초대 관리」
    };
  }

  // ---------- 서버에 묻기 ----------
  async function 부르기(길, { 방법 = "GET", 몸, 표붙임 = true, 머리 = {} } = {}) {
    const 머리들 = { apikey: 공개열쇠, "Content-Type": "application/json", ...머리 };
    if (표붙임 && 표) 머리들.Authorization = "Bearer " + 표.access_token;
    const ㄷ = await fetch(주소 + 길, { method: 방법, headers: 머리들, body: 몸 ? JSON.stringify(몸) : undefined });
    const 글 = await ㄷ.text();
    let 값 = null;
    try { 값 = 글 ? JSON.parse(글) : null; } catch (오류) { 값 = 글; }
    if (!ㄷ.ok) {
      const 말 = (값 && (값.msg || 값.message || 값.error_description || 값.error)) || ("서버가 " + ㄷ.status + " 로 답했다");
      const 탈 = new Error(말); 탈.상태 = ㄷ.status; 탈.값 = 값;
      throw 탈;
    }
    return 값;
  }

  function 표담기(ㄹ) {
    표 = {
      access_token: ㄹ.access_token,
      refresh_token: ㄹ.refresh_token,
      expires_at: ㄹ.expires_at || Math.floor(Date.now() / 1000) + (ㄹ.expires_in || 3600),
      user: ㄹ.user ? { id: ㄹ.user.id, email: ㄹ.user.email } : (표 && 표.user)
    };
    서랍쓰기(표);
  }

  // ★★★ 형 컴퓨터(8777) 화면은 **런처 로그인을 물려받는다** (2026-09-22 · 사용자가 정함)
  //   「로그인은 세도비 런처 로그인 아이디 비번이랑 같은 거라고」
  //   8777 서버가 런처 로그인을 들고 있다. 화면은 서버한테 짧은 출입증만 받아 쓴다.
  //   ★ 새로고침표는 안 받는다 — 화면이 새로 받으면 런처 쪽 표가 무효가 된다. 새로 받는 건 서버 몫.
  async function 서버표받기() {
    if (!window.주인인가) return false;
    try {
      const ㄷ = await fetch("/로그인/표", { cache: "no-store" });
      if (!ㄷ.ok) return false;
      const ㄱ = await ㄷ.json();
      if (!ㄱ.됐나 || !ㄱ.토큰) return false;
      표 = { access_token: ㄱ.토큰, expires_at: Math.floor(Date.now() / 1000) + (ㄱ.남은초 || 600),
             user: { id: ㄱ.누구, email: ㄱ.메일 }, 서버표: true };
      return true;
    } catch (오류) { return false; }
  }

  // ★ 낡은 표는 스스로 새로 받는다. 못 받으면 그때 로그아웃이다.
  async function 표챙기기() {
    if (!표) return false;
    if (표.expires_at - 60 > Date.now() / 1000) return true;
    if (표.서버표) { if (await 서버표받기()) return true; 표 = null; 나 = null; 알리기(); return false; }
    try {
      표담기(await 부르기("/auth/v1/token?grant_type=refresh_token",
        { 방법: "POST", 몸: { refresh_token: 표.refresh_token }, 표붙임: false }));
      return true;
    } catch (오류) {
      표 = null; 나 = null; 서랍쓰기(null); 알리기();
      return false;
    }
  }

  async function 나읽기() {
    if (!(await 표챙기기())) return null;
    try {
      const ㄹ = await 부르기("/rest/v1/rpc/site_me", { 방법: "POST", 몸: {} });
      나 = (Array.isArray(ㄹ) && ㄹ[0]) || null;
    } catch (오류) { 나 = null; }
    알리기();
    await 채널읽기();
    return 나;
  }

  // ★ 채널 (2026-09-24 · 로그인 화면 규격 「채널 판」 — 런처와 같게)
  //   가입한 누구나 제 채널이 있다(처음 부를 때 서버가 만든다). 남의 초대는 「받기」 를 눌러야 들어간다.
  //   ★ 채널에 들어와도 홈피 등급은 **안 오른다** — 홈피 글·영상은 관리자가 회원 관리에서 준다. 그래서 site_me 를 다시 안 읽는다.
  async function 채널읽기() {
    if (!표) { 채널 = null; return; }
    try {
      const ㄹ = await 부르기("/rest/v1/rpc/" + encodeURIComponent("채널_목록"), { 방법: "POST", 몸: {} });
      채널 = ㄹ && Array.isArray(ㄹ.목록) ? ㄹ : null;
    } catch (오류) { 채널 = null; }          // 채널 표가 없는 저장소여도 로그인은 그대로 산다
    알리기();
  }
  // 등급 · 받은 초대 빨간 점 — 다른 곳에서 바뀌어도(관리자가 등급을 바꾸거나, 런처·다른 기기에서 초대가 와도) 새로고침 없이 받아 온다
  //   창을 다시 볼 때 + 보고 있는 동안 1분마다 (30초 안에는 다시 안 묻는다). 나읽기 가 site_me(등급) → 채널_목록 차례로 읽는다.
  //   (2026-09-25 사용자: 「여기서 등급 바꿔도 바로 실시간으로 선생님, 일반회원 안바뀐다」)
  //   ★ 바뀐 게 있을 때만 알린다 — 알리면 게시판·댓글이 다시 그려진다(댓글 쓰던 칸이 날아갈 수 있다)
  let 채널읽은때 = 0;
  async function 채널다시() {
    if (!표 || Date.now() - 채널읽은때 < 30000) return;
    채널읽은때 = Date.now();
    if (!(await 표챙기기())) return;
    const 앞 = JSON.stringify([나, 채널]);
    let 새나 = 나, 새채널 = 채널;
    try { const ㄹ = await 부르기("/rest/v1/rpc/site_me", { 방법: "POST", 몸: {} }); 새나 = (Array.isArray(ㄹ) && ㄹ[0]) || 나; } catch (오류) {}
    try { const ㄹ = await 부르기("/rest/v1/rpc/" + encodeURIComponent("채널_목록"), { 방법: "POST", 몸: {} }); if (ㄹ && Array.isArray(ㄹ.목록)) 새채널 = ㄹ; } catch (오류) {}
    if (!표) return;                                   // 묻는 사이에 로그아웃했다
    if (JSON.stringify([새나, 새채널]) === 앞) return;
    나 = 새나; 채널 = 새채널; 알리기();
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) 채널다시(); });
  window.addEventListener("focus", 채널다시);
  setInterval(() => { if (!document.hidden) 채널다시(); }, 60000);

  // 채널 쪽 부름 — 이름이 한글이라 주소에 넣을 때 싼다 (초대관리.js · 회원관리.js 가 쓴다)
  function 학원부르기(이름, 몸 = {}) {
    return 표붙여부르기("/rest/v1/rpc/" + encodeURIComponent(이름), { 방법: "POST", 몸 });
  }

  // ★ 비밀번호 바꾸기 (로그인 화면 규격 — 「비밀번호 찾기: … 번호로 들어가기 → 새 비밀번호 정하기」 · 드롭바 「비밀번호 바꾸기」)
  async function 비밀번호바꾸기(새비번) {
    if (String(새비번 || "").length < 8) throw new Error("비밀번호는 여덟 자 이상으로 해라");
    if (!(await 표챙기기())) throw new Error("로그인이 풀렸다. 다시 들어와라");
    try {
      await 부르기("/auth/v1/user", { 방법: "PUT", 몸: { password: 새비번 } });
    } catch (오류) {
      if (/reauth|nonce/i.test(오류.message)) throw new Error("로그인한 지 오래돼서 확인이 더 필요하다 — 로그아웃했다가 다시 들어와서 바꿔라");
      if (/same|different from the old/i.test(오류.message)) throw new Error("지금 비밀번호와 같다. 다른 걸로 해라");
      throw 오류;
    }
  }

  // ---------- 밖의 문 — 구글 로그인 (2026-09-23 · 사용자가 정함) ----------
  //   「1,2,3 모두 진행 시켜라」 — 구글로 한 번에 들어오는 길.
  //   ★ 왜 넣나: 메일로 번호 보내는 길은 한 시간에 서른 통까지다. 반 애들이 한꺼번에
  //     가입하면 거기서 막힌다. 구글 문은 그 한도를 안 탄다.
  //   ★ 단추는 **저장소에서 그 문을 열어 놨을 때만** 뜬다 (/auth/v1/settings 가 알려 준다).
  //     그래서 여기 코드는 미리 있어도 화면에는 아무것도 안 생긴다 — 열쇠를 넣는 날 저절로 뜬다.
  //   ★ 카카오도 같은 자리에 쓴다. 나중에 카카오를 열면 단추가 저절로 하나 더 생긴다.
  const 밖의문이름 = { google: "구글", kakao: "카카오" };
  let 열린문 = null;                                   // 한 번만 묻고 기억한다
  async function 밖의문들() {
    if (열린문) return 열린문;
    if (window.주인인가) return (열린문 = []);          // 형 컴퓨터 화면은 런처 로그인을 쓴다
    try {
      const ㄹ = await 부르기("/auth/v1/settings", { 표붙임: false });
      열린문 = Object.keys(밖의문이름).filter(ㅁ => ㄹ && ㄹ.external && ㄹ.external[ㅁ]);
    } catch (오류) { 열린문 = []; }
    return 열린문;
  }
  function 밖으로가기(어디) {
    // 돌아올 자리는 지금 이 쪽 — 주소 뒤에 붙은 것(#)은 떼고 간다
    const 돌아올곳 = location.origin + location.pathname;
    location.href = 주소 + "/auth/v1/authorize?provider=" + encodeURIComponent(어디) +
                    "&redirect_to=" + encodeURIComponent(돌아올곳);
  }

  // 밖의 문에서 돌아오면 주소 뒤(#)에 출입증이 붙어 온다. 받아 담고 **주소는 곧바로 지운다**
  // (남겨 두면 그 주소를 복사해 보내는 순간 남이 내 계정으로 들어온다)
  let 밖의탈 = "";
  function 주소에온표() {
    const 뒤 = String(location.hash || "").replace(/^#/, "");
    if (!/(^|&)access_token=|(^|&)error/.test(뒤)) return null;
    const ㄱ = new URLSearchParams(뒤);
    try { history.replaceState(null, "", location.pathname + location.search); } catch (오류) { location.hash = ""; }
    if (ㄱ.get("error") || ㄱ.get("error_description")) {
      밖의탈 = ㄱ.get("error_description") || ㄱ.get("error");
      return null;
    }
    if (!ㄱ.get("access_token")) return null;
    return { access_token: ㄱ.get("access_token"), refresh_token: ㄱ.get("refresh_token"),
             expires_in: Number(ㄱ.get("expires_in") || 3600) };
  }

  // 구글 문으로 온 표에는 사람이 안 딸려 온다 — 누구인지 따로 묻는다
  async function 사람읽기() {
    try {
      const ㄹ = await 부르기("/auth/v1/user");
      if (ㄹ && ㄹ.id) {
        const ㅁ = ㄹ.user_metadata || {};
        표.user = { id: ㄹ.id, email: ㄹ.email, 이름: ㅁ.full_name || ㅁ.name || "" };   // 구글이 알려 준 이름 — 닉네임 칸에 미리 넣어 준다
        서랍쓰기(표);
      }
    } catch (오류) { /* 못 물어도 표는 살아 있다. 저장소가 누구인지 안다 */ }
  }

  // ---------- 밖에서 쓰는 것 ----------
  // ★ 로그인과 가입은 따로다 (2026-09-22 · 사용자가 정함 — 「로그인은 로그인이고 가입은 가입이지」)
  //   로그인: 이미 있는 계정만. 없는 메일이면 「가입부터」 라고 말한다.
  //   가입:   새 계정을 만든다.
  async function 번호받기(메일, 가입인가) {
    메일 = String(메일 || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(메일)) throw new Error("메일 주소를 다시 봐라");
    try {
      await 부르기("/auth/v1/otp", { 방법: "POST", 몸: { email: 메일, create_user: !!가입인가 }, 표붙임: false });
    } catch (오류) {
      if (!가입인가 && /signups? not allowed|not found|user not found/i.test(오류.message))
        throw new Error("가입 안 된 메일이다. 처음이면 「가입」 을 눌러라");
      throw 오류;
    }
    return 메일;
  }

  // ★ 런처와 같은 메일 · 비밀번호로 들어온다 (2026-09-22 · 사용자가 정함)
  //   「로그인은 세도비 런처 로그인 아이디 비번이랑 같은 거라고」
  async function 비번로그인(메일, 비번) {
    메일 = String(메일 || "").trim();
    if (!메일 || !비번) throw new Error("메일과 비밀번호를 넣어라");
    try {
      표담기(await 부르기("/auth/v1/token?grant_type=password", {
        방법: "POST", 몸: { email: 메일, password: 비번 }, 표붙임: false
      }));
    } catch (오류) {
      if (/invalid login|invalid_credentials|invalid grant/i.test(오류.message)) throw new Error("메일이나 비밀번호가 틀렸다");
      if (/not confirmed/i.test(오류.message)) throw new Error("가입 확인이 안 끝났다. 메일로 온 번호를 넣어라");
      throw 오류;
    }
    await 나읽기();
    return 상태();
  }

  // 가입 — 메일 · 비밀번호를 받고, 메일로 온 여섯 자리 번호로 확인한다
  async function 가입하기(메일, 비번) {
    메일 = String(메일 || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(메일)) throw new Error("메일 주소를 다시 봐라");
    if (String(비번 || "").length < 8) throw new Error("비밀번호는 여덟 자 이상으로 해라");
    const ㄹ = await 부르기("/auth/v1/signup", { 방법: "POST", 몸: { email: 메일, password: 비번 }, 표붙임: false });
    // 이미 있는 메일이면 서버가 빈 사람을 돌려준다 (누가 가입했는지 새지 않게)
    if (ㄹ && ㄹ.user && Array.isArray(ㄹ.user.identities) && ㄹ.user.identities.length === 0)
      throw new Error("이미 가입된 메일이다. 「로그인」 으로 들어가라");
    if (ㄹ && ㄹ.access_token) { 표담기(ㄹ); await 나읽기(); return { 바로됨: true }; }
    return { 바로됨: false };
  }

  async function 가입확인(메일, 번호) {
    번호 = String(번호 || "").replace(/\D/g, "");
    if (번호.length !== 6) throw new Error("여섯 자리 번호를 넣어라");
    표담기(await 부르기("/auth/v1/verify", {
      방법: "POST", 몸: { type: "signup", email: String(메일).trim(), token: 번호 }, 표붙임: false
    }));
    await 나읽기();
    return 상태();
  }

  async function 번호넣기(메일, 번호) {
    번호 = String(번호 || "").replace(/\D/g, "");
    if (번호.length !== 6) throw new Error("여섯 자리 번호를 넣어라");
    표담기(await 부르기("/auth/v1/verify", {
      방법: "POST", 몸: { type: "email", email: String(메일).trim(), token: 번호 }, 표붙임: false
    }));
    await 나읽기();
    return 상태();
  }

  async function 별명정하기(별명) {
    별명 = String(별명 || "").trim().replace(/\s+/g, " ");
    if (별명.length < 2 || 별명.length > 20) throw new Error("닉네임은 두 글자에서 스무 글자까지다");
    if (!(await 표챙기기())) throw new Error("로그인이 풀렸다. 다시 들어와라");
    try {
      await 부르기("/rest/v1/site_members?user_id=eq." + encodeURIComponent(표.user.id),
        { 방법: "PATCH", 몸: { nickname: 별명 }, 머리: { Prefer: "return=minimal" } });
    } catch (오류) {
      if (오류.값 && 오류.값.code === "23505") throw new Error("이미 쓰는 닉네임이다. 다른 걸 골라라");
      throw 오류;
    }
    await 나읽기();
    return 상태();
  }

  async function 나가기() {
    // ★ 런처에서 물려받은 로그인은 여기서 못 끊는다 — 끊으면 런처까지 로그아웃된다
    if (표 && 표.서버표) throw new Error("이 화면은 런처 로그인을 쓴다. 로그아웃은 런처에서 해라");
    // ★★ scope=local — 이 브라우저 세션만 끊는다 (2026-09-23).
    //    그냥 부르면 기본이 「전체(global)」 라서 **같은 계정의 런처 로그인까지 같이 죽는다.**
    //    사용자가 정한 것: 「홈피는 홈피대로 로그인 로그아웃. 런처도 런처만 로그인 로그아웃」
    // 런처가 로그인 중이면 그 세션은 건너뛴다 — 안 그러면 방금 나갔는데 런처 덕에 바로 다시 들어온다
    //   ★ 표를 지우기 **전에** 적는다. 지운 뒤에 적으면 그 틈에 창 초점이 돌아와 다시 들어와 버린다
    try { await 런처세션건너뛰기(); } catch (오류) {}
    try { if (표) await 부르기("/auth/v1/logout?scope=local", { 방법: "POST" }); } catch (오류) { /* 서버가 몰라도 여기선 지운다 */ }
    표 = null; 나 = null; 채널 = null; 서랍쓰기(null); 알리기();
  }

  // ---------- 런처로 로그인하면 홈피도 로그인 (2026-09-23 · 사용자가 정함, 런처 방과 맞춤) ----------
  //   「홈피는 홈피대로 로그인 로그아웃. 런처도 런처만 로그인 로그아웃. 대신 런처를 로그인하면 홈피도 로그인되게」
  //
  //   런처(이 컴퓨터)가 http://127.0.0.1:8779/hompi-pass 에서 **한 번 쓰면 끝나는 입장권(token_hash)** 을 준다.
  //   사이트는 그걸 저장소 /auth/v1/verify 에 내고 **제 몫의 로그인**을 받는다 — 그 뒤로는 런처와 따로 산다.
  //   ★ 런처 토큰 · 새로고침표는 안 온다. 입장권뿐이다 (런처 쪽 홈피다리.js · 서버함수 site-handoff).
  //
  //   ★★ 아무 컴퓨터에서나 부르면 안 된다 — 크롬이 「이 사이트가 로컬 네트워크의 기기에 접근하려 합니다」 를
  //      **학생 화면에도** 묻는다. 그래서 **런처가 켠 적이 있는 브라우저에서만** 부른다:
  //      켜기.vbs 가 https://sejinedu.github.io/#launcher 로 연다 → 그 표시를 한 번 보면 이 브라우저에 적어 둔다.
  //   ★ 로그인 안 돼 있을 때만 부른다. 못 닿으면(런처 꺼짐) 조용히 그대로 — 평소 로그인 화면.
  //   ★ 사이트에서 로그아웃하면 그때의 런처 세션을 「건너뛸 것」 으로 적는다 → 런처가 **새로 로그인하기 전까지**
  //     다시 자동으로 안 들어온다. 런처가 로그아웃해도 사이트는 그대로다.
  const 런처기기열쇠 = "세진과학.런처기기.v1";
  const 건너뛸열쇠 = "세진과학.건너뛸런처세션.v1";
  const 받은런처열쇠 = "세진과학.받은런처세션.v1";
  const 런처주소 = "http://127.0.0.1:8779/hompi-pass";
  const 담긴값 = ㅋ => { try { return localStorage.getItem(ㅋ) || ""; } catch (오류) { return ""; } };
  const 담기 = (ㅋ, ㄱ) => { try { if (ㄱ) localStorage.setItem(ㅋ, ㄱ); else localStorage.removeItem(ㅋ); } catch (오류) {} };
  const 런처기기인가 = () => !window.주인인가 && location.origin === "https://sejinedu.github.io" && 담긴값(런처기기열쇠) === "1";

  // 켜기.vbs 가 붙인 #launcher — 보면 적어 두고 주소에서 뗀다
  //   ★ 런처의 「회원 관리」·「게시글 비밀번호」 는 #member-admin · #post-pin 으로 연다 (로그인 화면 규격)
  //     — 런처가 연 것이니 이것도 「런처 있는 기기」 표시로 친다. 그 화면은 로그인이 되면 로그인창.js 가 연다.
  let 런처가켰나 = false;
  let 처음할일 = "";
  {
    const ㅁ = /^#(launcher|member-admin|post-pin)$/.exec(location.hash || "");
    if (ㅁ) {
      런처가켰나 = true;
      처음할일 = ㅁ[1] === "launcher" ? "" : ㅁ[1];
      if (!window.주인인가) 담기(런처기기열쇠, "1");
      try { history.replaceState(null, "", location.pathname + location.search); } catch (오류) { location.hash = ""; }
    }
  }

  async function 런처에묻기() {
    const 끊개 = new AbortController();
    const 시계 = setTimeout(() => 끊개.abort(), 2500);
    try {
      const ㄷ = await fetch(런처주소, { headers: { "x-sedobi-hompi": "1" }, cache: "no-store", signal: 끊개.signal });
      if (!ㄷ.ok && ㄷ.status !== 429) return null;
      return await ㄷ.json();
    } catch (오류) { return null; }                    // 런처 없음 · 꺼짐 · 크롬이 막음 — 조용히
    finally { clearTimeout(시계); }
  }

  let 마지막물음 = 0;
  async function 런처로들어오기() {
    if (표 || !런처기기인가()) return false;
    if (Date.now() - 마지막물음 < 15000) return false;  // 런처가 10초 안에 또 물으면 429 를 준다
    마지막물음 = Date.now();
    const ㄹ = await 런처에묻기();
    if (!ㄹ || !ㄹ.로그인 || !ㄹ.세션 || !ㄹ.token_hash) return false;
    if (ㄹ.세션 === 담긴값(건너뛸열쇠)) return false;  // 여기서 로그아웃한 그 런처 세션 — 안 들어간다
    if (표) return false;                              // 묻는 사이 다른 길로 들어왔다
    try {
      const 답 = await 부르기("/auth/v1/verify", { 방법: "POST", 몸: { type: "magiclink", token_hash: ㄹ.token_hash }, 표붙임: false });
      if (!답 || !답.access_token) return false;
      표담기(답);
      if (!표.user || !표.user.id) await 사람읽기();
      담기(받은런처열쇠, ㄹ.세션);
      담기(건너뛸열쇠, "");
      await 나읽기();
      return true;
    } catch (오류) { return false; }
  }

  async function 런처세션건너뛰기() {
    if (!런처기기인가()) return;
    let 세션 = 담긴값(받은런처열쇠);
    if (!세션) { const ㄹ = await 런처에묻기(); if (ㄹ && ㄹ.로그인 && ㄹ.세션) 세션 = ㄹ.세션; }
    if (세션) 담기(건너뛸열쇠, 세션);
    담기(받은런처열쇠, "");
  }

  // 창에 다시 들어올 때도 한 번 — 런처를 나중에 켜고 로그인해도 따라 들어온다
  document.addEventListener("visibilitychange", () => { if (!document.hidden) 런처로들어오기(); });
  window.addEventListener("focus", () => 런처로들어오기());

  function 듣기(ㅎ) { 듣는이.add(ㅎ); return () => 듣는이.delete(ㅎ); }

  // 저장소에 쓰는 다른 파일(댓글·글)이 표를 붙여 부를 수 있게 내준다
  async function 표붙여부르기(길, 거리) {
    await 표챙기기();
    return 부르기(길, 거리);
  }

  // ---------- 처음 켤 때 ----------
  //   ① 구글 문에서 막 돌아온 길이면 그 표가 먼저다
  //   ② 형 컴퓨터 화면이면 런처 로그인을 물려받는다
  //   ③ 그 밖에는 이 브라우저에 담긴 로그인
  const 밖에서온표 = 주소에온표();
  let 밖에서왔나 = !!밖에서온표;
  if (밖에서온표) {
    표담기(밖에서온표);
    사람읽기().then(나읽기);
  } else if (window.주인인가) {
    서버표받기().then(됐나 => { if (됐나) 나읽기(); else { 표 = 서랍읽기(); if (표) 나읽기(); } });
  } else {
    표 = 서랍읽기();
    if (표) 나읽기();
    else 런처로들어오기();                            // 런처가 켠 적 있는 브라우저에서만 묻는다
  }
  // 런처가 처음 켜 준 날 — 크롬이 묻는 창을 미리 알려 준다
  if (런처가켰나 && !처음할일 && !표) setTimeout(() => {
    try { 쪽지("크롬이 「로컬 네트워크 기기 접근」 을 물으면 「허용」 — 런처 로그인을 이어받는 길이다"); } catch (오류) {}
  }, 800);

  return { 상태, 비번로그인, 가입하기, 가입확인, 번호받기, 번호넣기, 별명정하기, 나가기, 나읽기, 듣기,
           밖의문들, 밖으로가기, 밖의문이름, 밖에서왔나: () => 밖에서왔나, 밖의탈: () => 밖의탈,
           비밀번호바꾸기, 채널읽기, 학원부르기,
           처음할일: () => 처음할일, 할일끝: () => { 처음할일 = ""; },
           부르기: 표붙여부르기 };
})();
window.회원 = 회원;
