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
const 포트 = 8777;
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
};

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

//  자료를 바꾸거나 밖으로 내보내는 길 — 로그인이 있어야 한다
const 잠글길 = new Set(["/올리기", "/단원나무", "/영상목록", "/영상/길이", "/자막/만들기"]);

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
  if (잠글길.has(길) && !로그인했나()) return 로그인막힘(res, 길);

  // ---- 로그인 상태 알려 주기 ----
  //   화면이 이걸 물어서 「지금 로그인 안 됨」 을 크게 띄운다.
  if (길 === "/로그인") {
    const 살핀것 = 토큰살펴보기(로그인.토큰);
    return 답하기(res, {
      로그인했나: 살핀것.산다,
      메일: 로그인.메일,
      누구: 로그인.누구,
      왜: 살핀것.왜,
      남은분: 살핀것.남은분,
      글: 살핀것.산다
        ? "로그인됨"
        : (살핀것.왜.indexOf("만료") >= 0
          ? "로그인이 만료됐다 — 고치고 올리는 건 막혀 있다. 런처(세도비)에서 다시 로그인해라."
          : "지금 로그인 안 됨 — 고치고 올리는 건 막혀 있다. 런처(세도비)에서 켜면 로그인된다."),
    });
  }

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
});

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
