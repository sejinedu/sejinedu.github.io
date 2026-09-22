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
      런처로그인: !!(표 && 표.서버표)
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
    return 나;
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
    if (별명.length < 2 || 별명.length > 20) throw new Error("별명은 두 글자에서 스무 글자까지다");
    if (!(await 표챙기기())) throw new Error("로그인이 풀렸다. 다시 들어와라");
    try {
      await 부르기("/rest/v1/site_members?user_id=eq." + encodeURIComponent(표.user.id),
        { 방법: "PATCH", 몸: { nickname: 별명 }, 머리: { Prefer: "return=minimal" } });
    } catch (오류) {
      if (오류.값 && 오류.값.code === "23505") throw new Error("누가 벌써 쓰는 별명이다. 다른 걸 골라라");
      throw 오류;
    }
    await 나읽기();
    return 상태();
  }

  async function 나가기() {
    // ★ 런처에서 물려받은 로그인은 여기서 못 끊는다 — 끊으면 런처까지 로그아웃된다
    if (표 && 표.서버표) throw new Error("이 화면은 런처 로그인을 쓴다. 로그아웃은 런처에서 해라");
    try { if (표) await 부르기("/auth/v1/logout", { 방법: "POST" }); } catch (오류) { /* 서버가 몰라도 여기선 지운다 */ }
    표 = null; 나 = null; 서랍쓰기(null); 알리기();
  }

  function 듣기(ㅎ) { 듣는이.add(ㅎ); return () => 듣는이.delete(ㅎ); }

  // 저장소에 쓰는 다른 파일(댓글·글)이 표를 붙여 부를 수 있게 내준다
  async function 표붙여부르기(길, 거리) {
    await 표챙기기();
    return 부르기(길, 거리);
  }

  // ---------- 처음 켤 때 ----------
  //   형 컴퓨터 화면이면 런처 로그인을 먼저 물려받는다. 아니면 이 브라우저에 담긴 로그인.
  if (window.주인인가) {
    서버표받기().then(됐나 => { if (됐나) 나읽기(); else { 표 = 서랍읽기(); if (표) 나읽기(); } });
  } else {
    표 = 서랍읽기();
    if (표) 나읽기();
  }

  return { 상태, 비번로그인, 가입하기, 가입확인, 번호받기, 번호넣기, 별명정하기, 나가기, 나읽기, 듣기, 부르기: 표붙여부르기 };
})();
window.회원 = 회원;
