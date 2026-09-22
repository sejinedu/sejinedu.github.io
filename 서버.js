// ============================================================
//  세진 과학 — 작은 웹 서버 + 자막 공장
// ============================================================
//
//  ★★★ 왜 이게 필요한가 (2026-09-01 에 밟은 것)
//
//  index.html 을 그냥 두 번 눌러서 열면 주소가 file:// 이 된다.
//  그 상태에서는 유튜브가 영상 끼워넣기를 거부한다 — 「오류 153」.
//  그래서 이 서버로 http://localhost 로 띄운다.
//
//  ★★★ 자막 공장 (2026-09-02)
//
//  브라우저는 제 힘으로 컴퓨터 프로그램을 못 돌린다. 막혀 있다.
//  그런데 이 서버는 사용자 컴퓨터에서 도니까 돌릴 수 있다.
//  ⇒ 브라우저가 서버한테 부탁하고, 서버가 자막만들기/자막.py 를 돌린다.
//
//  ★ 폴더 자리를 코드에 박지 않는다 — __dirname 을 쓴다 (지침서 8절 34번).

const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const 뿌리 = __dirname;
const 포트 = Number(process.env.SEJIN_TEST_PORT) || 8777;     // ★ 시험할 때만 다른 문을 쓴다. 평소엔 늘 8777
const 자막폴더 = path.join(뿌리, "자막");
const 만들기폴더 = path.join(뿌리, "자막만들기");
const 자료폴더 = path.join(뿌리, "자료");
const 길이파일 = path.join(자료폴더, "길이.json");

// ============================================================
//  영상 길이 (썸네일 오른쪽 아래에 뜨는 그것)
// ============================================================
//
//  유튜브 oEmbed 로는 길이를 못 가져온다. 제목까지밖에 안 준다.
//  그래서 yt-dlp 한테 「내려받지 말고 정보만」 물어본다 — 한 편에 2초쯤.
//  ★ 한 번 알아낸 것은 파일에 적어 둔다. 두 번 묻지 않는다.

let 길이들 = {};
try { 길이들 = JSON.parse(fs.readFileSync(길이파일, "utf8")); } catch (오류) { 길이들 = {}; }

let 적을까 = null;
function 길이적어두기() {
  clearTimeout(적을까);
  적을까 = setTimeout(() => {
    try {
      fs.mkdirSync(자료폴더, { recursive: true });
      fs.writeFileSync(길이파일, JSON.stringify(길이들, null, 1), "utf8");
    } catch (오류) { console.error("길이를 못 적었다:", 오류.message); }
  }, 800);
}

const 알아보는중 = new Set();

function 길이알아오기(것들) {
  const 물을것 = 것들.filter(ㅇ => !(ㅇ in 길이들) && !알아보는중.has(ㅇ));
  if (!물을것.length) return;
  물을것.forEach(ㅇ => 알아보는중.add(ㅇ));

  // ★ 한 번에 다 물어본다. 한 편씩 부르면 프로세스가 여러 개 뜬다.
  const ㅍ = spawn("python",
    ["-m", "yt_dlp", "--skip-download", "--no-warnings", "--ignore-errors",
     "--print", "%(id)s|%(duration)s", "--"].concat(물을것),
    { cwd: 만들기폴더, windowsHide: true,
      env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONIOENCODING: "utf-8" } });

  let 남은글 = "";
  ㅍ.stdout.on("data", 덩어리 => {
    남은글 += 덩어리.toString("utf8");
    const 줄들 = 남은글.split("\n");
    남은글 = 줄들.pop();
    줄들.forEach(ㄹ => {
      const ㅁ = ㄹ.trim().split("|");
      if (ㅁ.length === 2 && 아이디맞나(ㅁ[0])) {
        const 초 = parseInt(ㅁ[1], 10);
        if (초 > 0) { 길이들[ㅁ[0]] = 초; 길이적어두기(); }
      }
    });
  });

  // 못 알아낸 것도 다시 물어볼 수 있게 풀어 준다
  const 풀기 = () => 물을것.forEach(ㅇ => 알아보는중.delete(ㅇ));
  ㅍ.on("close", 풀기);
  ㅍ.on("error", 풀기);
}


const 종류 = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2", ".mp4": "video/mp4",
  ".srt": "text/plain; charset=utf-8", ".txt": "text/plain; charset=utf-8"
};

// ============================================================
//  자막 만드는 일감
// ============================================================

const 일감 = new Map();     // 영상아이디 → { 상태, 진행, 글, 시작한때, 프로세스 }

// ★★★ 한 번에 하나만 굽는다 (2026-09-02 · 사용자가 「이미 있는 것도 자동으로」 라고 정함)
//   자막 만들기는 그래픽카드를 통째로 쓴다. 여러 개를 한꺼번에 돌리면
//   서로 자리를 뺏느라 전부 다 느려지고, 메모리가 모자라면 통째로 터진다.
//   ⇒ 줄을 세워 하나씩 굽는다. 기다리는 것은 「기다림」 으로 알려 준다.
const 줄 = [];              // 차례를 기다리는 영상아이디들
let 도는것 = null;          // 지금 굽고 있는 영상아이디

// ★ 아이디를 엄격히 검사한다. 이걸 안 하면 남이 아무 명령이나 넣을 수 있다.
//   (localhost 만 듣지만, 그래도 밖에서 온 글을 그대로 프로그램에 넘기지 않는다)
const 아이디맞나 = ㄱ => typeof ㄱ === "string" && /^[A-Za-z0-9_-]{11}$/.test(ㄱ);

const 초로 = 글 => {
  const ㅁ = 글.split(":").map(Number);
  if (ㅁ.length === 3) return ㅁ[0] * 3600 + ㅁ[1] * 60 + ㅁ[2];
  if (ㅁ.length === 2) return ㅁ[0] * 60 + ㅁ[1];
  return 0;
};

function 자막있나(아이디) {
  return fs.existsSync(path.join(자막폴더, 아이디 + ".js"));
}

function 만들기시작(아이디) {
  const 앞것 = 일감.get(아이디);
  if (앞것 && (앞것.상태 === "도는중" || 앞것.상태 === "기다림")) return 앞것;

  const 칸 = { 상태: "기다림", 진행: 0, 글: "차례 기다리는 중", 전체초: 0, 넣은때: Date.now() };
  일감.set(아이디, 칸);
  줄.push(아이디);
  줄돌리기();
  return 칸;
}

function 줄돌리기() {
  if (도는것) return;                       // 지금 굽는 게 있으면 끝날 때까지 둔다
  const 다음 = 줄.shift();
  if (!다음) return;

  // 기다리는 사이에 자막이 생겼거나(딴 데서 만들었거나) 취소됐으면 건너뛴다
  const 칸 = 일감.get(다음);
  if (!칸 || 칸.상태 !== "기다림") return 줄돌리기();
  if (자막있나(다음)) {
    칸.상태 = "끝"; 칸.진행 = 100; 칸.글 = "다 됐다";
    return 줄돌리기();
  }

  도는것 = 다음;
  진짜굽기(다음, 칸);
}

function 진짜굽기(아이디, 칸) {
  칸.상태 = "도는중"; 칸.진행 = 1; 칸.글 = "시작하는 중"; 칸.시작한때 = Date.now();

  // ★ shell 을 안 쓴다. 인자를 배열로 넘겨야 이상한 글자가 명령으로 안 새어 든다.
  //
  // ★★★ -u 를 빼면 게이지가 안 움직인다 (2026-09-02 에 밟음)
  //   파이썬은 화면이 아닌 곳으로 글을 내보낼 때 모아 뒀다가 한꺼번에 뱉는다.
  //   그러면 2시간짜리를 굽는 16분 동안 진행률이 1% 에 멈춰 있는다.
  //   -u 는 「모으지 말고 그때그때 내보내라」 는 뜻이다.
  const ㅍ = spawn("python", ["-u", "자막.py", 아이디], {
    cwd: 만들기폴더,
    windowsHide: true,                     // ★ 검은 창을 사용자 화면에 띄우지 않는다 (지침서 2-3)
    env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONIOENCODING: "utf-8" }
  });
  칸.프로세스 = ㅍ;

  const 읽기 = 덩어리 => {
    const 글 = 덩어리.toString("utf8");

    // 전체 길이 —  "   제목  (2:14:17)"
    const ㄱ = 글.match(/\((\d+:\d{2}:\d{2})\)/);
    if (ㄱ && !칸.전체초) 칸.전체초 = 초로(ㄱ[1]);

    if (글.includes("[소리 받는 중]")) { 칸.글 = "소리 받는 중"; 칸.진행 = 3; }
    if (글.includes("[받아적는 중]")) { 칸.글 = "받아적는 중"; 칸.진행 = Math.max(칸.진행, 8); }
    if (글.includes("[말 시작 재는 중]")) { 칸.글 = "말 시작 맞추는 중"; 칸.진행 = 96; }

    // 진행 —  "   ... 1:32:25 까지"
    const ㄴ = [...글.matchAll(/\.\.\.\s*(\d+:\d{2}:\d{2})\s*까지/g)].pop();
    if (ㄴ && 칸.전체초) {
      const 지난 = 초로(ㄴ[1]);
      칸.진행 = Math.min(95, 8 + Math.round((지난 / 칸.전체초) * 87));
      칸.글 = "받아적는 중";
    }

    if (글.includes("[끝났다]")) { 칸.진행 = 99; 칸.글 = "마무리 중"; }
    // ★★★ 「[막힘]」 한 줄만 잡으면 안 된다 (2026-09-02 에 밟음)
    //   무엇이 없는지는 그 다음 줄들에 있고, 그것이 따로 떨어져서 온다.
    //   ⇒ [막힘] 을 본 뒤로는 오는 것을 계속 이어 붙인다.
    if (칸.막힘중 || 글.includes("[막힘]")) {
      칸.막힘중 = true;
      칸.막힘글 = ((칸.막힘글 || "") + 글).slice(0, 400);
    }
  };

  ㅍ.stdout.on("data", 읽기);
  ㅍ.stderr.on("data", 덩어리 => { 칸.끝말 = (칸.끝말 || "") + 덩어리.toString("utf8"); });

  // ★ 어느 쪽으로 끝나든 반드시 다음 차례를 부른다. 안 그러면 줄이 영영 안 움직인다.
  let 치웠나 = false;
  const 치우기 = () => {
    if (치웠나) return;
    치웠나 = true;
    칸.프로세스 = null;
    if (도는것 === 아이디) 도는것 = null;
    줄돌리기();
  };

  ㅍ.on("error", 오류 => {
    칸.상태 = "터짐";
    칸.글 = "python 을 못 돌렸다 — 깔려 있는지 봐라";
    칸.자세히 = String(오류.message).slice(0, 300);
    치우기();
  });

  ㅍ.on("close", 코드 => {
    if (칸.상태 !== "터짐") {
      if (코드 === 0 && 자막있나(아이디)) {
        칸.상태 = "끝"; 칸.진행 = 100; 칸.글 = "다 됐다";
      } else {
        칸.상태 = "터짐";
        칸.진행 = 0;
        칸.글 = 칸.막힘글 ? 칸.막힘글.split("\n").map(ㄹ => ㄹ.trim()).filter(Boolean).slice(0, 4).join("  ") : ("자막을 못 만들었다 (코드 " + 코드 + ")");
        칸.자세히 = (칸.끝말 || "").slice(-400);
      }
    }
    치우기();
  });

  return 칸;
}

function 상태내기(아이디) {
  if (자막있나(아이디)) {
    const 칸 = 일감.get(아이디);
    if (!칸 || 칸.상태 !== "도는중") return { 상태: "있음", 진행: 100, 글: "자막 있음" };
  }
  const 칸 = 일감.get(아이디);
  if (!칸) return { 상태: "없음", 진행: 0, 글: "자막 없음" };

  if (칸.상태 === "기다림") {
    const 자리 = 줄.indexOf(아이디) + 1;
    return { 상태: "기다림", 진행: 0,
             글: 자리 > 0 ? ("차례 기다리는 중 · " + 자리 + "번째") : "차례 기다리는 중" };
  }
  return { 상태: 칸.상태, 진행: 칸.진행, 글: 칸.글, 자세히: 칸.자세히 || "" };
}

function 답하기(res, 것) {
  const 글 = JSON.stringify(것);
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(글);
}

// ============================================================
//  로그인 — **올리는 쪽에만** 건다 (2026-09-11 · 2단계 규격)
// ============================================================
//
//  사용자가 정한 것:
//    「홈페이지 방은 **애들 보는 사이트**가 있고 **내가 업로드 하는 사이트**가 따로 있다」
//
//    애들 보는 쪽 (sejinedu.github.io)   → 로그인 없음. 그대로. 건드리지 마라.
//    내가 올리는 쪽 (이 서버)            → 여기에만 건다.
//
//  ★ 그래서 **보기는 안 막는다.** 이 서버로 열어도 화면은 그대로 뜬다 —
//    애들이 보는 것과 같은 화면을 미리 볼 수 있어야 하니까.
//    막는 것은 **자료를 바꾸거나 밖으로 내보내는 길**뿐이다.
//
//  ★ 앱에 로그인 **화면은 안 만든다** (규격 60행). 런처가 켤 때 환경변수로 넘긴다.
//    여기는 **없으면 멈추는** 것만 한다.
//
//  ★★ 왜 「올리기」 를 막는 게 핵심인가 —
//    그건 공개 사이트에 밀어 올리는 길이다. **되돌릴 수 없다.**
//    누가 켰는지 모르는 채로 학생들이 보는 사이트가 바뀌면 안 된다.

const 로그인 = {
  토큰: process.env.SEDOBI_TOKEN || "",
  메일: process.env.SEDOBI_EMAIL || "",
  누구: process.env.SEDOBI_UID || "",
  새로고침표: process.env.SEDOBI_REFRESH || "",
};

// ============================================================
//  ★★★ 토큰이 낡았으면 **스스로 새로 받는다** (2026-09-13)
// ============================================================
//
//  사용자: 「지금 로그인이 되어 있는데 왜이러냐? 고쳐라」
//
//  무슨 일이 있었나 —
//    로그인은 멀쩡히 되어 있었다(`세션.json` 이 있다). 그런데 그 안의 **출입증(토큰)만
//    1.7일 전에 낡았다.** 런처가 켤 때 그걸 새로 안 받고 그대로 넘겨서,
//    내가 「로그인이 만료됐다」 며 올리기를 막아 버렸다.
//
//  ★ 이건 **막을 일이 아니다.** 사용자는 로그인해 있고, 새 출입증을 받을
//    **새로고침표도 갖고 있다.** 그냥 받아 오면 되는 일이었다.
//    남의 방(런처)이 고쳐 주기를 기다리는 동안 사용자가 일을 못 하면 안 된다.
//
//  ★ 그래도 **문지기를 무르게 하지는 않는다.** 새로 받는 데 실패하면
//    그때는 진짜로 로그아웃이니 그대로 막는다.
//
//  어디서 재료를 얻나
//    ① 런처가 넘긴 환경변수 (SEDOBI_REFRESH · SEDOBI_SUPABASE_URL · …ANON)
//    ② 없으면 런처가 적어 둔 `%LOCALAPPDATA%\sedobi\세션.json`
//    ③ 그래도 없으면 `API 키\supabase.txt` 의 **PUBLISHABLE_KEY 만** 읽는다
//       (규격: 「앱·런처에 박아도 된다. 자물쇠는 RLS 가 건다」)
//       ★ SECRET_KEY 는 **읽지도 않는다.**

const 세션파일 = path.join(process.env.LOCALAPPDATA || "", "sedobi", "세션.json");
//  ★ 열쇠 폴더가 옮겨졌다 (2026-09-17 · 런처 방 실측) — 두 자리를 차례로 본다
const 열쇠파일 = [
  path.join("C:", "구글 드라이브", "0 세도비", "API 키", "supabase.txt"),
  path.join(process.env.USERPROFILE || "", "OneDrive", "6 기타", "API 키", "supabase.txt"),
].find(ㄱ => { try { return fs.statSync(ㄱ).isFile(); } catch (오류) { return false; } }) || "";

function 글하나읽기(길) {
  try { return fs.readFileSync(길, "utf8"); } catch (오류) { return ""; }
}

function 세션읽기() {
  try { return JSON.parse(글하나읽기(세션파일) || "{}"); } catch (오류) { return {}; }
}

//  ★ 열쇠 파일에서 **그 한 줄만** 꺼낸다. 다른 줄은 안 본다.
function 열쇠에서(이름) {
  const 글 = 글하나읽기(열쇠파일);
  for (const 줄 of 글.split(/\r?\n/)) {
    if (줄.trim().startsWith("#")) continue;          // 주석 줄은 건너뛴다
    const ㅈ = 줄.indexOf("=");
    if (ㅈ > 0 && 줄.slice(0, ㅈ).trim() === 이름) return 줄.slice(ㅈ + 1).trim();
  }
  return "";
}

async function 토큰새로받기() {
  const ㅅ = 세션읽기();
  const 표 = 로그인.새로고침표 || ㅅ.새로고침표 || "";
  const 주소 = process.env.SEDOBI_SUPABASE_URL || 열쇠에서("PROJECT_URL");
  const 열쇠 = process.env.SEDOBI_SUPABASE_ANON || 열쇠에서("PUBLISHABLE_KEY");
  if (!표 || !주소 || !열쇠) return { 됐나: false, 왜: "새로 받을 재료가 없다" };
  try {
    const ㄷ = await fetch(주소.replace(/\/+$/, "") + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { "apikey": 열쇠, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: 표 }),
    });
    if (!ㄷ.ok) return { 됐나: false, 왜: "서버가 거절했다 (" + ㄷ.status + ")" };
    const ㄱ = await ㄷ.json();
    if (!ㄱ || !ㄱ.access_token) return { 됐나: false, 왜: "새 토큰이 안 왔다" };
    로그인.토큰 = ㄱ.access_token;
    if (ㄱ.refresh_token) 로그인.새로고침표 = ㄱ.refresh_token;
    if (ㄱ.user && ㄱ.user.email) 로그인.메일 = ㄱ.user.email;
    if (ㄱ.user && ㄱ.user.id) 로그인.누구 = ㄱ.user.id;
    //  ★ 런처가 적어 둔 자리에 되돌려 준다 — 다음에 켤 때 딴 앱도 새 것을 쓴다
    try {
      const 새것 = Object.assign({}, ㅅ, {
        토큰: 로그인.토큰,
        새로고침표: 로그인.새로고침표 || ㅅ.새로고침표,
        만료: ㄱ.expires_at || ㅅ.만료,
      });
      fs.writeFileSync(세션파일, JSON.stringify(새것, null, 1), "utf8");
    } catch (오류) { /* 못 적어도 이번 판은 돈다 */ }
    return { 됐나: true };
  } catch (오류) {
    return { 됐나: false, 왜: "인터넷이 안 된다" };
  }
}

//  ★★★ 「있나」 가 아니라 「살아 있나」 로 본다 (2026-09-11 · 런처 세션이 짚어 줬다)
//
//    런처는 **가진 토큰을 그대로 넘긴다.** 그게 만료된 것일 수 있다.
//    있나 없나만 보면 **만료된 토큰으로도 통과**해 버린다 —
//    그러면 사용자가 「종일 로그아웃인 줄 몰랐다」 던 그 일이 그대로 다시 난다.
//
//  ★ 인터넷을 안 쓴다. 토큰(JWT) 안에 만료 시각(exp)이 들어 있어서 **혼자 알 수 있다.**
//    서버를 부르면 느리고, 인터넷이 없을 때 못 켜는 일이 생긴다.
//  ★ JWT 가 아니면 판단하지 않고 통과시킨다 — 남의 방식이 바뀌어도 여기서 막히면 안 된다.
function 토큰살펴보기(토큰) {
  if (!토큰) return { 산다: false, 왜: "로그인 안 됨" };
  const 조각 = String(토큰).split(".");
  if (조각.length !== 3) return { 산다: true, 왜: "" };      // JWT 가 아니다 — 못 가린다
  try {
    const 속글 = Buffer.from(조각[1].replace(/-/g, "+").replace(/_/g, "/"), "base64")
      .toString("utf8");
    const 속 = JSON.parse(속글);
    if (!속.exp) return { 산다: true, 왜: "" };
    const 남은 = 속.exp * 1000 - Date.now();
    if (남은 <= 0) return { 산다: false, 왜: "로그인이 만료됐다 (다시 로그인해야 한다)" };
    return { 산다: true, 왜: "", 남은분: Math.round(남은 / 60000) };
  } catch (오류) {
    return { 산다: true, 왜: "" };                            // 못 읽으면 막지 않는다
  }
}

const 로그인했나 = () => 토큰살펴보기(로그인.토큰).산다;

//  ★ 켤 때 한 번, 그리고 낡았을 때마다 새로 받아 본다.
//    받는 동안 두 번 겹쳐 부르지 않게 한 번만 돈다.
let 새로받는중 = null;
async function 로그인챙기기() {
  if (로그인했나()) return true;
  //  환경변수에 아무것도 안 왔으면 런처가 적어 둔 세션이라도 본다
  if (!로그인.토큰) {
    const ㅅ = 세션읽기();
    if (ㅅ.토큰) {
      로그인.토큰 = ㅅ.토큰;
      로그인.메일 = 로그인.메일 || ㅅ.이메일 || "";
      로그인.누구 = 로그인.누구 || ㅅ.uid || "";
      로그인.새로고침표 = 로그인.새로고침표 || ㅅ.새로고침표 || "";
      if (로그인했나()) return true;
    }
  }
  if (!새로받는중) 새로받는중 = 토큰새로받기().finally(() => { 새로받는중 = null; });
  const ㄱ = await 새로받는중;
  return Boolean(ㄱ && ㄱ.됐나);
}

//  자료를 바꾸거나 밖으로 내보내는 길 — 로그인이 있어야 한다
const 잠글길 = new Set(["/올리기", "/단원나무", "/영상목록", "/영상/길이", "/자막/만들기",
  "/유튜브/허락", "/유튜브/목록", "/유튜브/가져오기"]);

function 로그인막힘(res, 길) {
  res.writeHead(401, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify({
    됐나: false,
    로그인안됨: true,
    글: "로그인이 안 됐다. 런처(세도비)에서 「세진 과학」 을 눌러 켜야 로그인된다.",
    막힌길: 길,
  }));
}

// ============================================================
//  서버
// ============================================================

const 서버 = http.createServer((req, res) => {
  let 주소;
  try { 주소 = new URL(req.url, "http://localhost"); }
  catch (오류) { res.writeHead(400); return res.end("bad"); }

  // ★★★ 여기서 서버가 통째로 죽었다 (2026-09-03 · 내가 잡았다)
  //
  //   decodeURIComponent 는 **주소가 조금만 이상해도 던진다** —
  //   퍼센트 하나 잘못 붙은 주소가 오면 URIError 가 나고,
  //   여기는 try 밖이라 **서버 프로세스가 그대로 죽는다.**
  //
  //   ⇒ 그러면 사용자의 「업데이트」 단추가 아무 말 없이 안 먹는다.
  //     지침서: 「재설치하세요」 는 답이 아니다 — 짜임이 틀린 것이다.
  //     지나가는 주소 하나가 단추를 죽일 수 있으면 안 된다.
  //
  //   ⇒ 못 읽는 주소는 **날것 그대로** 쓰고 넘어간다. 어차피 아래에서
  //     아는 길하고만 견주니까, 모르는 길은 그냥 404 로 떨어진다.
  let 길;
  try { 길 = decodeURIComponent(주소.pathname); }
  catch (오류) { 길 = 주소.pathname; }

  // ---- 로그인 문지기 ----
  //   ★ 보기는 안 막는다. **바꾸거나 내보내는 길**만 막는다.
  //   ★ 「/자막/상태」 는 그냥 물어보는 것이라 안 막는다 — 막으면 화면이 헛돈다.
  //   ★ 낡았으면 **먼저 새로 받아 본다.** 그래도 안 되면 그때 막는다 (2026-09-13).
  if (잠글길.has(길)) {
    return void 로그인챙기기().then(됐나 => {
      if (!됐나) return 로그인막힘(res, 길);
      나머지처리(req, res, 주소, 길);
    }).catch(() => 로그인막힘(res, 길));
  }

  // ---- 로그인 상태 알려 주기 ----
  //   화면이 이걸 물어서 「지금 로그인 안 됨」 을 크게 띄운다.
  if (길 === "/로그인") {
    return void 로그인챙기기().then(() => {
      const 살핀것 = 토큰살펴보기(로그인.토큰);
      답하기(res, {
        로그인했나: 살핀것.산다,
        메일: 로그인.메일,
        누구: 로그인.누구,
        왜: 살핀것.왜,
        남은분: 살핀것.남은분,
        글: 살핀것.산다
          ? "로그인됨"
          : (살핀것.왜.indexOf("만료") >= 0
            ? "로그인이 만료됐다 — 새로 받아 봤지만 안 됐다. 런처(세도비)에서 다시 로그인해라."
            : "지금 로그인 안 됨 — 고치고 올리는 건 막혀 있다. 런처(세도비)에서 켜면 로그인된다."),
      });
    }).catch(() => 답하기(res, { 로그인했나: false, 글: "로그인을 확인하지 못했다" }));
  }

  나머지처리(req, res, 주소, 길);
});

//  ★ 위에서 로그인을 챙긴 뒤 이어서 하는 일 — 원래 하던 그대로다.
function 나머지처리(req, res, 주소, 길) {

  // ---- 유튜브 → 홈페이지 가져오기 (2026-09-22) — 아래 「유튜브 가져오기」 풀이 ----
  if (길.startsWith("/유튜브/")) return 유튜브길(req, res, 길);

  // ---- 자막 공장 ----
  if (길 === "/자막/상태" || 길 === "/자막/만들기") {
    const 아이디 = 주소.searchParams.get("v") || "";
    if (!아이디맞나(아이디)) return 답하기(res, { 상태: "터짐", 진행: 0, 글: "영상 아이디가 이상하다" });

    if (길 === "/자막/만들기") {
      if (자막있나(아이디)) return 답하기(res, { 상태: "있음", 진행: 100, 글: "이미 있다" });
      만들기시작(아이디);
    }
    return 답하기(res, 상태내기(아이디));
  }

  // ============================================================
  //  영상 목록 굳히기 — 브라우저 서랍에만 있던 것을 파일로 내려 적는다
  // ============================================================
  //
  //  사용자가 정한 것 (2026-09-02):
  //    「내가 이 웹사이트 주소만 주면 여기 들어올수 있게 한다」
  //
  //  ★★★ 왜 있나 — 두 가지가 한꺼번에 걸려 있었다.
  //    ① 붙인 영상 서른한 편이 사용자 크롬의 localStorage 에만 있었다.
  //      크롬을 청소하면 통째로 날아간다. 백업이 없었다.
  //    ② 남한테 주소를 줘도 그 사람 브라우저 서랍은 비어 있다.
  //      화면도 자막도 다 되는데 영상이 한 편도 안 보인다.
  //
  //  ⇒ 목록을 파일(자료/영상목록.js)로 내려 적는다.
  //    파일이 진짜 목록이고, 브라우저 서랍은 거울이다.
  //    ★ 서버가 없는 자리(파일만 올려 둔 곳)에서도 파일이 있으니 그대로 보인다.
  if (길 === "/영상목록") {
    if (req.method !== "POST") { res.writeHead(405); return res.end("POST 만 받는다"); }
    let 몸통 = "";
    req.on("data", ㅈ => {
      몸통 += ㅈ;
      if (몸통.length > 4 * 1024 * 1024) { req.destroy(); }   // 너무 크면 끊는다
    });
    req.on("end", () => {
      let 것;
      try { 것 = JSON.parse(몸통); } catch (오류) { return 답하기(res, { 됐나: false, 왜: "글이 깨졌다" }); }
      if (!것 || !Array.isArray(것.목록)) return 답하기(res, { 됐나: false, 왜: "목록이 없다" });
      const 낼글 =
        "// 이 파일은 화면이 저절로 적는다. 손으로 고치지 마라.\n" +
        "// 붙인 영상 목록 — 서버.js 의 /영상목록 이 적는다 (2026-09-02).\n" +
        "// 파일이 진짜 목록이고 브라우저 서랍은 거울이다.\n" +
        "window.붙인영상묶음 = " +
        JSON.stringify({ 시각: 것.시각 || Date.now(), 목록: 것.목록 }, null, 1) + ";\n";
      const 자리 = path.join(__dirname, "자료", "영상목록.js");
      try {
        fs.mkdirSync(path.dirname(자리), { recursive: true });
        fs.writeFileSync(자리, 낼글, "utf8");
        // ★ 새 저장소로도 넘긴다 — 영상편집의 「홈페이지에 연결하기」 가 여기로 온다 (2026-09-22)
        //   답은 기다리지 않는다. 못 넘기면 켤 때 · 다음 연결 때 다시 넘긴다.
        글넘기기(것.목록).then(() => 자막넘기기()).catch(오류 => console.log("저장소로 못 넘겼다 —", 오류.message));
        return 답하기(res, { 됐나: true, 몇개: 것.목록.length });
      } catch (오류) {
        return 답하기(res, { 됐나: false, 왜: String(오류.message || 오류) });
      }
    });
    return;
  }

  // ---- 학생 사이트로 내보내기 ----
  //
  //  ★★★ 사용자가 정한 것 (2026-09-03):
  //    「여기서는 내가 수정 할껀데, 그럼 그게 학생 사이트에도 바로 적용되는거 아님?」
  //
  //  ★ 여기서 고친 것은 이 컴퓨터의 파일에만 남는다.
  //    학생이 보는 사이트로 넘기려면 깃허브에 올려야 한다.
  //    그 일을 사람이 할 수는 없다 — 단추 하나로 끝나야 한다 (지침서 0절).
  //
  //  ★ 하는 일 세 가지 —
  //    ① 판 번호를 0.01 올린다 (안 올리면 학생 브라우저가 옛 파일을 그대로 쓴다)
  //    ② 바뀐 것을 전부 담아 적는다
  //    ③ 깃허브로 밀어 올린다
  if (길 === "/올리기") {
    if (req.method !== "POST") { res.writeHead(405); return res.end("POST 만 받는다"); }

    // ① 판 올리기
    const 판자리 = path.join(__dirname, "js", "판.js");
    let 새판 = "";
    try {
      const 옛글 = fs.readFileSync(판자리, "utf8");
      const ㅁ = 옛글.match(/window\.판\s*=\s*"(\d+)\.(\d+)"/);
      if (!ㅁ) return 답하기(res, { 됐나: false, 왜: "판 번호를 못 읽었다" });
      const 큰 = Number(ㅁ[1]);
      const 작 = Number(ㅁ[2]) + 1;
      새판 = 작 >= 100 ? (큰 + 1) + ".00" : 큰 + "." + String(작).padStart(2, "0");
      fs.writeFileSync(판자리, 옛글.replace(ㅁ[0], 'window.판 = "' + 새판 + '"'), "utf8");
    } catch (오류) {
      return 답하기(res, { 됐나: false, 왜: "판을 못 올렸다: " + (오류.message || 오류) });
    }

    // ②③ 담아 적고 밀어 올리기
    const 깃 = (인자들) => new Promise((풀기) => {
      const ㅍ = spawn("git", 인자들, { cwd: __dirname, windowsHide: true });
      let 나온글 = "";
      ㅍ.stdout.on("data", ㄷ => 나온글 += ㄷ);
      ㅍ.stderr.on("data", ㄷ => 나온글 += ㄷ);
      ㅍ.on("close", ㅋ => 풀기({ 값: ㅋ, 글: 나온글 }));
      ㅍ.on("error", ㅇ => 풀기({ 값: -1, 글: String(ㅇ.message || ㅇ) }));
    });

    (async () => {
      const ㄱ = await 깃(["add", "-A"]);
      if (ㄱ.값 !== 0) return 답하기(res, { 됐나: false, 왜: "담기 실패: " + ㄱ.글.slice(0, 300) });

      const ㄴ = await 깃(["commit", "-m", "화면에서 고친 것을 올린다 (v" + 새판 + ")"]);
      // 고친 게 없으면 commit 이 1 을 낸다 — 그건 잘못이 아니다
      const 고친게없나 = /nothing to commit|변경 사항 없음/.test(ㄴ.글);
      if (ㄴ.값 !== 0 && !고친게없나) {
        return 답하기(res, { 됐나: false, 왜: "적기 실패: " + ㄴ.글.slice(0, 300) });
      }

      const ㄷ = await 깃(["push", "origin", "HEAD"]);
      if (ㄷ.값 !== 0) return 답하기(res, { 됐나: false, 왜: "올리기 실패: " + ㄷ.글.slice(0, 300) });

      return 답하기(res, { 됐나: true, 판: 새판, 고친게없나 });
    })();
    return;
  }

  // ---- 단원 나무 굳히기 ----
  //
  //  ★★★ 왜 있나 (2026-09-02 · 사용자가 폰에서 잡음)
  //    「폰에서 움직이다가 단원 순서가 바뀌었는데 그대로다?
  //      컴퓨터 화면하고 폰 화면이 단원 목록이 차이가 난다?」
  //    단원 나무도 브라우저 서랍에만 있어서 기기마다 따로 놀았다.
  //    영상 목록과 똑같은 병이라 똑같이 고친다 — 파일이 진짜다.
  if (길 === "/단원나무") {
    if (req.method !== "POST") { res.writeHead(405); return res.end("POST 만 받는다"); }
    let 몸통2 = "";
    req.on("data", ㅈ => {
      몸통2 += ㅈ;
      if (몸통2.length > 8 * 1024 * 1024) req.destroy();
    });
    req.on("end", () => {
      let 것;
      try { 것 = JSON.parse(몸통2); } catch (오류) { return 답하기(res, { 됐나: false, 왜: "글이 깨졌다" }); }
      if (!것 || !Array.isArray(것.나무)) return 답하기(res, { 됐나: false, 왜: "나무가 없다" });
      const 낼글 =
        "// 이 파일은 화면이 저절로 적는다. 손으로 고치지 마라.\n" +
        "// 단원 나무 — 서버.js 의 /단원나무 가 적는다 (2026-09-02).\n" +
        "// ★ 여기 있는 것이 진짜다. 브라우저 서랍은 주인 것만 거울로 쓴다.\n" +
        "window.첫단원나무 = " + JSON.stringify(것.나무, null, 1) + ";\n";
      const 자리 = path.join(__dirname, "js", "단원.js");
      try {
        fs.writeFileSync(자리, 낼글, "utf8");
        return 답하기(res, { 됐나: true, 몇개: 것.나무.length });
      } catch (오류) {
        return 답하기(res, { 됐나: false, 왜: String(오류.message || 오류) });
      }
    });
    return;
  }

  // ---- 이 서버가 어디까지 할 줄 아나 ----
  //  ★ 화면(판.js)만 새로 받고 서버는 옛것이 돌고 있을 수 있다.
  //    옛 서버는 줄을 못 세운다 ⇒ 자동으로 시키면 여러 개가 한꺼번에 굽는다.
  //    그래서 화면이 먼저 물어보고, 못 세우면 자동으로 안 시킨다.
  if (길 === "/자막/판") {
    return 답하기(res, { 판: 4, 줄세우기: true, 길이알려주나: true, 목록굳히기: true,
                        기다리는수: 줄.length, 굽는중: 도는것 || "" });
  }

  // ---- 영상 길이 ----
  //  아는 것은 바로 준다. 모르는 것은 뒤에서 알아보고, 화면이 조금 뒤에 다시 묻는다.
  if (길 === "/영상/길이") {
    const 것들 = (주소.searchParams.get("v") || "").split(",").filter(아이디맞나).slice(0, 60);
    길이알아오기(것들);
    const 답 = {};
    것들.forEach(ㅇ => { if (ㅇ in 길이들) 답[ㅇ] = 길이들[ㅇ]; });
    return 답하기(res, 답);
  }

  // ---- 여러 개 한꺼번에 물어보기 ----
  if (길 === "/자막/여럿") {
    const 것들 = (주소.searchParams.get("v") || "").split(",").filter(아이디맞나).slice(0, 60);
    const 답 = {};
    것들.forEach(ㅇ => { 답[ㅇ] = 상태내기(ㅇ); });
    return 답하기(res, 답);
  }

  // ---- 파일 ----
  let 이름 = 길;
  if (이름 === "/") 이름 = "/index.html";
  const 자리 = path.join(뿌리, 이름);
  if (!자리.startsWith(뿌리)) { res.writeHead(403); return res.end("no"); }

  fs.readFile(자리, (오류, 내용) => {
    if (오류) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("없다: " + 이름);
    }
    res.writeHead(200, {
      "Content-Type": 종류[path.extname(자리).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(내용);
  });
}

서버.on("error", 오류 => {
  if (오류.code === "EADDRINUSE") process.exit(0);   // 이미 떠 있으면 조용히 물러난다
  console.error(오류);
  process.exit(1);
});

// ★★★ 이미 켜져 있으면 조용히 물러난다 (2026-09-02 · 사용자가 정함)
//   「바탕화면 것 더블클릭하면 졸라 늦게 창이 나온다」 를 고치면서 생긴 짝이다.
//   켜기.vbs 가 이제 「켜져 있나?」 를 먼저 안 물어보고 그냥 켜라고 던진다.
//   물어보는 데만 4초가 걸렸기 때문이다 (재 봤다: 4,005 밀리초).
//   그래서 두 번째로 켜지는 일이 생기는데, 그때 시끄럽게 죽으면 안 된다.
서버.on("error", 오류 => {
  if (오류.code === "EADDRINUSE") {
    console.log("이미 켜져 있다. 그대로 둔다.");
    process.exit(0);
  }
  throw 오류;
});

서버.listen(포트, "127.0.0.1", () => {
  console.log("세진 과학 — http://127.0.0.1:" + 포트);
  console.log("자막 공장 준비됨");
});

// ============================================================
//  자리 살피기 — 다른 컴퓨터에서 켜면 여기가 비켜 준다  (2026-09-22 · 런처 v0.67)
// ============================================================
//
//  사장님이 정한 것 (런처 방이 전함):
//    「런처를 끝내면 런처만 끝나고 앱은 안 끝나게.
//      다른 컴퓨터에서 해당 앱을 키면 그때 해당 앱이 꺼지게」
//
//  ★ 런처가 꺼져 있어도 이 서버는 산다. 그러니 자리는 **여기서 스스로** 살핀다.
//  ★ 3초마다 device_ping 을 부른다 — 맥박도 겸한다. 옛 서버면(404) device_alive.
//    토큰 없이 공개 열쇠만 쓴다 (몇 시간 켜 둔 서버는 토큰이 죽어 있을 수 있다).
//  ★ 답이 false 일 때만 비킨다. true · 못 물음(인터넷 끊김 등)은 그대로 둔다 —
//    인터넷이 잠깐 끊겼다고 서버가 꺼지면 안 된다.
//  ★ 비킬 때: 굽던 자막을 멈추고(반쯤 구운 건 다음에 처음부터) → device_handed 로 「다 넘겼다」 → 끈다.
//    적는 일(단원·영상목록·자막 파일)은 모두 그 자리에서 끝나는 것이라 따로 저장할 게 없다.
//  ★ 옛 런처라 SEDOBI_DEVICE 가 안 왔으면 아무것도 안 한다.
(function 자리살피기() {
  const 기기 = process.env.SEDOBI_DEVICE || "";
  const 누구 = process.env.SEDOBI_UID || "";
  const 주소 = String(process.env.SEDOBI_SUPABASE_URL || "").replace(/\/+$/, "");
  const 열쇠 = process.env.SEDOBI_SUPABASE_ANON || "";
  if (!기기 || !누구 || !주소 || !열쇠) return;

  const 머리 = { apikey: 열쇠, "Content-Type": "application/json" };
  const 몸 = JSON.stringify({ p_owner: 누구, p_device: 기기 });
  let 비키는중 = false;

  async function 물어보기() {
    try {
      let 답 = await fetch(주소 + "/rest/v1/rpc/device_ping", { method: "POST", headers: 머리, body: 몸 });
      if (답.status === 404) 답 = await fetch(주소 + "/rest/v1/rpc/device_alive", { method: "POST", headers: 머리, body: 몸 });
      if (!답.ok) return "모름";
      return (await 답.json()) === false ? "쫓겨났다" : "살았다";
    } catch (오류) { return "모름"; }
  }

  async function 비키기(까닭) {
    if (비키는중) return;
    비키는중 = true;
    console.log("자리를 넘긴다 — " + 까닭);
    for (const [, 칸] of 일감) {
      if (칸.프로세스) { try { 칸.프로세스.kill(); } catch (오류) {} }
    }
    try {
      await fetch(주소 + "/rest/v1/rpc/device_handed", { method: "POST", headers: 머리, body: 몸 });
    } catch (오류) { /* 못 알려도 서버가 맥박이 끊긴 걸 보고 10초 뒤 넘긴 걸로 친다 */ }
    서버.close();
    setTimeout(() => process.exit(0), 300);
  }

  const 시계 = setInterval(async () => {
    if (비키는중) return;
    if ((await 물어보기()) === "쫓겨났다") { clearInterval(시계); 비키기("다른 컴퓨터에서 켰다"); }
  }, 3000);

  // 닫으라는 신호에는 묻지 않고 비킨다
  ["SIGINT", "SIGTERM", "SIGBREAK"].forEach(ㅅ => process.on(ㅅ, () => 비키기("닫으라는 신호")));
})();

// ============================================================
//  저장소 다리 — 영상편집 · 자막 공장이 적은 것을 새 저장소로 넘긴다  (2026-09-22)
// ============================================================
//
//  사용자가 정한 것:
//    「루트는 유튜브에서 홈피로, 영상 편집프로그램에서 홈피로 가는거다」
//
//  ★ 왜 여기서 하나 — 영상편집의 「홈페이지에 연결하기」 는 이 서버(8777)에 적는다.
//    그런데 v2.65 부터 홈페이지는 파일이 아니라 **저장소**를 읽는다. 그래서 연결해도 안 떴다.
//    영상편집은 따로 배포하는 큰 앱이라 건드리지 않고, 받는 쪽인 여기서 저장소로 넘긴다.
//
//  ★ 넘기는 것 둘
//    ① 글 — 목록에 있는데 저장소에 없는 영상. 한 번 넘긴 것은 적어 두고 다시 안 넘긴다
//       (관리자가 사이트에서 지운 글이 켤 때마다 되살아나면 안 된다).
//    ② 자막 — 자막 폴더(자막/*.js)에서 새로 생기거나 바뀐 것. 저장소에 적는 순간 사이트에 뜬다.
//       ★ 그래서 자막 때문에 「올리기」 를 누를 일이 없어진다.
//  ★ 로그인한 사람(선생님 · 관리자) 이름으로 넘긴다. 권한은 저장소가 막는다.
//  ★ 못 넘기면 조용히 적어 두고 다음 때 다시 한다. 파일은 그대로 남는다.

const 넘긴글파일 = path.join(만들기폴더, ".저장소로넘긴글.json");
const 넘긴자막파일 = path.join(만들기폴더, ".저장소로넘긴자막.json");
const 읽어둔것 = 길 => { try { return JSON.parse(fs.readFileSync(길, "utf8")); } catch (오류) { return {}; } };
const 적어둔다 = (길, 것) => { try { fs.writeFileSync(길, JSON.stringify(것, null, 1), "utf8"); } catch (오류) {} };

function 저장소재료() {
  const 주소 = (process.env.SEDOBI_SUPABASE_URL || 열쇠에서("PROJECT_URL") || "https://burwsvkcaiqfiymdptex.supabase.co").replace(/\/+$/, "");
  let 열쇠 = process.env.SEDOBI_SUPABASE_ANON || 열쇠에서("PUBLISHABLE_KEY");
  if (!열쇠) {                 // 홈페이지 화면에 박아 둔 공개 열쇠 (밖에 보여도 되는 열쇠다)
    const ㅁ = 글하나읽기(path.join(뿌리, "js", "회원.js")).match(/sb_publishable_[A-Za-z0-9_-]+/);
    열쇠 = ㅁ ? ㅁ[0] : "";
  }
  return { 주소, 열쇠 };
}

async function 저장소부르기(길, { 방법 = "GET", 몸, 머리 = {} } = {}) {
  if (!(await 로그인챙기기())) throw new Error("로그인이 안 됐다");
  const { 주소, 열쇠 } = 저장소재료();
  if (!열쇠) throw new Error("공개 열쇠를 못 찾았다");
  const ㄷ = await fetch(주소 + "/rest/v1/" + 길, {
    method: 방법,
    headers: { apikey: 열쇠, Authorization: "Bearer " + 로그인.토큰, "Content-Type": "application/json", ...머리 },
    body: 몸 === undefined ? undefined : JSON.stringify(몸),
  });
  const 글 = await ㄷ.text();
  if (!ㄷ.ok) throw new Error(ㄷ.status + " " + 글.slice(0, 200));
  return 글 ? JSON.parse(글) : null;
}

let 글넘기는중 = null;
function 글넘기기(목록) {
  if (글넘기는중) return 글넘기는중;
  글넘기는중 = (async () => {
    const 넘긴것 = 읽어둔것(넘긴글파일);
    const 할것 = (목록 || []).filter(ㄱ => ㄱ && 아이디맞나(ㄱ.아이디) && ㄱ.고유 && !넘긴것[ㄱ.고유]);
    if (!할것.length) return 0;
    const 있는글 = new Set((await 저장소부르기("site_posts_view?select=youtube_id")).map(ㄱ => ㄱ.youtube_id));
    const 있는단원 = new Set((await 저장소부르기("site_units?select=id")).map(ㄱ => ㄱ.id));
    let 몇 = 0;
    for (const ㄱ of 할것) {
      if (있는글.has(ㄱ.아이디)) { 넘긴것[ㄱ.고유] = "이미 있음"; continue; }
      if (!있는단원.has(ㄱ.단원아이디)) { console.log("저장소에 없는 단원이라 못 넘긴다 —", ㄱ.제목); continue; }
      await 저장소부르기("site_posts", {
        방법: "POST", 머리: { Prefer: "return=minimal" },
        몸: { title: String(ㄱ.제목 || "제목 없음").slice(0, 200), unit_id: ㄱ.단원아이디, youtube_id: ㄱ.아이디 },
      });
      넘긴것[ㄱ.고유] = new Date().toISOString();
      있는글.add(ㄱ.아이디);
      몇++;
      console.log("저장소로 글을 넘겼다 —", ㄱ.제목);
    }
    적어둔다(넘긴글파일, 넘긴것);
    return 몇;
  })().finally(() => { 글넘기는중 = null; });
  return 글넘기는중;
}

// 자막 파일 → 저장소.  「window.자막모음["아이디"] = {…};」 한 줄만 읽는다 (뒤에 붙은 보조 코드는 안 읽는다)
function 자막파일읽기(파일) {
  const 글 = 글하나읽기(파일);
  const ㅁ = 글.match(/window\.자막모음\[("[A-Za-z0-9_-]{11}")\]\s*=\s*/);
  if (!ㅁ) return null;
  let 뒤 = 글.slice(ㅁ.index + ㅁ[0].length);
  const 끝 = 뒤.indexOf(";\n");
  if (끝 >= 0) 뒤 = 뒤.slice(0, 끝);
  try {
    const 자료 = JSON.parse(뒤.trim().replace(/;\s*$/, ""));
    return Array.isArray(자료.줄) && 자료.줄.length ? { 아이디: JSON.parse(ㅁ[1]), 자료 } : null;
  } catch (오류) { return null; }
}

let 자막넘기는중 = null;
function 자막넘기기() {
  if (자막넘기는중) return 자막넘기는중;
  자막넘기는중 = (async () => {
    const 넘긴것 = 읽어둔것(넘긴자막파일);
    let 이름들 = [];
    try { 이름들 = fs.readdirSync(자막폴더).filter(ㄱ => /^[A-Za-z0-9_-]{11}\.js$/.test(ㄱ)); } catch (오류) { return 0; }
    let 몇 = 0;
    for (const 이름 of 이름들) {
      const 파일 = path.join(자막폴더, 이름);
      let 때 = 0;
      try { 때 = Math.round(fs.statSync(파일).mtimeMs); } catch (오류) { continue; }
      if (넘긴것[이름] === 때) continue;
      const 읽은것 = 자막파일읽기(파일);
      if (!읽은것) continue;
      const 모델 = String(읽은것.자료.모델 || "");
      const 출처 = /편집기|Whisper/.test(모델) ? "editor" : /Qwen/.test(모델) ? "factory" : "site";
      await 저장소부르기("site_captions?on_conflict=youtube_id", {
        방법: "POST", 머리: { Prefer: "resolution=merge-duplicates,return=minimal" },
        몸: { youtube_id: 읽은것.아이디, data: 읽은것.자료, source: 출처 },
      });
      넘긴것[이름] = 때;
      적어둔다(넘긴자막파일, 넘긴것);          // 하나 넘길 때마다 — 중간에 꺼져도 처음부터 다시 안 한다
      몇++;
    }
    if (몇) console.log("저장소로 자막을 넘겼다 —", 몇, "편");
    return 몇;
  })().finally(() => { 자막넘기는중 = null; });
  return 자막넘기는중;
}

// 켤 때 한 번, 그 뒤로 30초마다 — 자막 공장이 다 구운 것도 이렇게 넘어간다
(function 다리돌리기() {
  if (process.env.SEJIN_TEST_PORT) return;      // ★ 시험 서버는 저장소로 아무것도 안 넘긴다
  const 한바퀴 = async () => {
    try {
      const 목록 = (() => {
        const 글 = 글하나읽기(path.join(자료폴더, "영상목록.js"));
        const ㅈ = 글.indexOf("window.붙인영상묶음 = ");
        if (ㅈ < 0) return [];
        try { return JSON.parse(글.slice(ㅈ + "window.붙인영상묶음 = ".length).trim().replace(/;\s*$/, "")).목록 || []; }
        catch (오류) { return []; }
      })();
      await 글넘기기(목록);
      await 자막넘기기();
    } catch (오류) {
      console.log("저장소 다리 —", 오류.message);
    }
  };
  setTimeout(한바퀴, 4000);
  setInterval(한바퀴, 30000);
})();


// ============================================================
//  유튜브 가져오기 — 형 채널 영상 + 올려 둔 완성 자막을 홈페이지로  (2026-09-22)
// ============================================================
//
//  사용자가 정한 것:
//    「이미 유튜브에 있는 영상은 이 홈페이지에 가져 올수 있고,
//      이미 업로드된 완성된 자막 파일을 가져 올수 있게 하라」
//
//  ★ 유튜브는 자막 파일을 채널 주인한테만 준다 → 형 컴퓨터(이 서버)에서만 된다.
//  ★ 유튜브 쪽 일은 자막만들기/유튜브가져오기.py 가 한다 (읽기만. 채널에는 안 쓴다).
//  ★ 「허락」 은 사용자가 단추를 눌렀을 때만 — 그때만 구글 허락 창이 브라우저에 뜬다.
//
//  GET  /유튜브/목록        → 채널 영상들 (사이트에 이미 있나 표시)
//  POST /유튜브/가져오기    { 아이디, 단원, 제목 } → 글 만들고 자막 붙이기
//  POST /유튜브/허락        → 구글 허락 창 (5분 기다린다)

function 유튜브도구(인자들, 기다릴초 = 90) {
  return new Promise(풀기 => {
    const ㅍ = spawn("python", ["-u", "유튜브가져오기.py", ...인자들], {
      cwd: 만들기폴더, windowsHide: true,
      env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONIOENCODING: "utf-8" },
    });
    let 나온글 = "", 탈글 = "";
    const 시계 = setTimeout(() => { try { ㅍ.kill(); } catch (오류) {} }, 기다릴초 * 1000);
    ㅍ.stdout.on("data", ㄷ => { 나온글 += ㄷ.toString("utf8"); });
    ㅍ.stderr.on("data", ㄷ => { 탈글 += ㄷ.toString("utf8"); });
    ㅍ.on("error", 오류 => { clearTimeout(시계); 풀기({ 됐나: false, 왜: "python 을 못 돌렸다 — " + 오류.message }); });
    ㅍ.on("close", () => {
      clearTimeout(시계);
      const 끝줄 = 나온글.trim().split("\n").pop() || "";
      try { 풀기(JSON.parse(끝줄)); }
      catch (오류) { 풀기({ 됐나: false, 왜: (탈글 || 나온글 || "답이 없다").slice(-300) }); }
    });
  });
}

function 몸받기(req) {
  return new Promise(풀기 => {
    let 몸 = "";
    req.on("data", ㄷ => { 몸 += ㄷ; if (몸.length > 64 * 1024) req.destroy(); });
    req.on("end", () => { try { 풀기(JSON.parse(몸 || "{}")); } catch (오류) { 풀기({}); } });
  });
}

let 허락받는중 = false;
async function 유튜브길(req, res, 길) {
  try {
    if (길 === "/유튜브/허락") {
      if (req.method !== "POST") { res.writeHead(405); return res.end(); }
      if (허락받는중) return 답하기(res, { 됐나: false, 왜: "허락 창이 이미 떠 있다 — 브라우저를 봐라" });
      허락받는중 = true;
      try { return 답하기(res, await 유튜브도구(["허락"], 320)); } finally { 허락받는중 = false; }
    }
    if (길 === "/유튜브/목록") {
      const ㄹ = await 유튜브도구(["목록"], 120);
      if (!ㄹ.됐나) return 답하기(res, ㄹ);
      let 있는것 = new Set();
      try { 있는것 = new Set((await 저장소부르기("site_posts_view?select=youtube_id")).map(ㄱ => ㄱ.youtube_id)); } catch (오류) {}
      ㄹ.영상.forEach(ㅇ => { ㅇ.사이트에있나 = 있는것.has(ㅇ.아이디); });
      return 답하기(res, ㄹ);
    }
    if (길 === "/유튜브/가져오기") {
      if (req.method !== "POST") { res.writeHead(405); return res.end(); }
      const { 아이디, 단원, 제목 } = await 몸받기(req);
      if (!아이디맞나(아이디)) return 답하기(res, { 됐나: false, 왜: "영상 아이디가 이상하다" });
      if (!단원) return 답하기(res, { 됐나: false, 왜: "단원을 골라라" });
      const 결과 = { 됐나: true, 글: "", 자막: "" };
      // ① 글 — 이미 있으면 그대로 둔다
      const 있나 = await 저장소부르기("site_posts_view?select=id&youtube_id=eq." + 아이디);
      if (있나.length) 결과.글 = "이미 있다";
      else {
        await 저장소부르기("site_posts", { 방법: "POST", 머리: { Prefer: "return=minimal" },
          몸: { title: String(제목 || "제목 없음").slice(0, 200), unit_id: 단원, youtube_id: 아이디 } });
        결과.글 = "만들었다";
      }
      // ② 자막 — 유튜브에 올려 둔 완성 자막. 없으면 글만 들어간다
      const 자 = await 유튜브도구(["자막", 아이디], 120);
      if (자.됐나) {
        자.자막.제목 = 제목 || "";
        await 저장소부르기("site_captions?on_conflict=youtube_id", { 방법: "POST",
          머리: { Prefer: "resolution=merge-duplicates,return=minimal" },
          몸: { youtube_id: 아이디, data: 자.자막, source: "youtube" } });
        결과.자막 = 자.자막.줄.length + "줄 붙였다";
      } else 결과.자막 = "못 붙였다 — " + 자.왜;
      return 답하기(res, 결과);
    }
    res.writeHead(404); res.end();
  } catch (오류) {
    답하기(res, { 됐나: false, 왜: String(오류.message || 오류).slice(0, 300) });
  }
}
