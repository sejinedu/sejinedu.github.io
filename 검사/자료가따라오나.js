// ============================================================
//  검사 — **새 컴퓨터에서 로그인하면 자료가 따라오나**
//  (2026-09-11 · 2단계 규격의 잣대를 그대로 잰다)
// ============================================================
//
//  조교가 못 박은 것:
//    「캐시를 다 지우고 로그인하면 자료가 돌아오나 — 이 검사가 없어서
//      세 자리가 규격을 어긴 채 조용히 굴러갔다.」
//
//  ★ 이 홈페이지는 자료를 **파일**에 둔다. 브라우저 서랍(localStorage)은 거울일 뿐이다.
//    그 파일들이 깃에 들어가고 GitHub Pages 로 올라가면 그게 곧 서버다.
//    그래서 잣대는 이것 하나다 —
//
//        **드라이브 없이, 로그인 없이, 인터넷만으로 자료가 다 나오나?**
//
//  ★★ 왜 검사로 못 박나 — 조용히 깨지기 때문이다.
//     ① 누가 `.gitignore` 에 자료 파일을 넣으면 → 서버에서 사라진다
//     ② 누가 localStorage 를 원본으로 바꾸면 → 그 컴퓨터에서만 되는 앱이 된다
//     둘 다 화면에서는 멀쩡해 보인다. **그 컴퓨터에는 캐시가 남아 있으니까.**
//
//  쓰는 법
//      node 검사/자료가따라오나.js
//      node 검사/자료가따라오나.js --집만     ← 인터넷 없이 파일만 본다

const fs = require("fs");
const path = require("path");
const 집 = path.join(__dirname, "..");
const 집만 = process.argv.includes("--집만");
const 사이트 = "https://sejinedu.github.io";

//  ★ 이 셋이 사용자가 화면에서 고치는 **진짜 자료**다.
//    하나라도 서버에서 안 나오면 새 컴퓨터에서 그만큼 잃는다.
const 꼭있어야할것 = [
  { 길: "js/단원.js", 뭐: "단원 나무 (화면에서 고치는 그것)", 최소: 1000 },
  { 길: "자료/영상목록.js", 뭐: "강의 목록", 최소: 500 },
  { 길: "자료/길이.json", 뭐: "영상 길이", 최소: 100 },
  { 길: "js/판.js", 뭐: "판 번호", 최소: 100 },
];

//  ★ 켜고 올리는 데 필요한 것 — 2026-09-11 에 깃에 넣었다.
//    이게 빠지면 새 컴퓨터에서 **보이기는 하는데 못 고친다.**
const 고치려면있어야할것 = ["켜기.vbs", "서버.js", "올리기.bat"];

let 탈 = 0;
const 틀렸다 = (ㄱ) => { console.log("  ★ " + ㄱ); 탈++; };
const 됐다 = (ㄱ) => console.log("     " + ㄱ);

function 자막몇편() {
  try {
    return fs.readdirSync(path.join(집, "자막")).filter(ㄱ => ㄱ.endsWith(".js")).length;
  } catch (오류) { return 0; }
}

async function 받아보기(길) {
  const 주소 = 사이트 + "/" +길.split("/").map(encodeURIComponent).join("/");
  const ㄷ = await fetch(주소, { redirect: "follow" });
  const 글 = ㄷ.ok ? await ㄷ.text() : "";
  return { 됐나: ㄷ.ok, 상태: ㄷ.status, 크기: Buffer.byteLength(글) };
}

(async function () {
  console.log("=".repeat(66));
  console.log(" ① 자료 파일이 집에 있나");
  console.log("=".repeat(66));
  for (const ㄱ of 꼭있어야할것) {
    const ㅂ = path.join(집, ㄱ.길);
    if (!fs.existsSync(ㅂ)) { 틀렸다(`${ㄱ.길} 가 없다 — ${ㄱ.뭐}`); continue; }
    const 크기 = fs.statSync(ㅂ).size;
    if (크기 < ㄱ.최소) 틀렸다(`${ㄱ.길} 가 너무 작다 (${크기}바이트) — 비었을 수 있다`);
    else 됐다(`${ㄱ.길.padEnd(22)} ${String(크기).padStart(7)}바이트  ${ㄱ.뭐}`);
  }
  const 몇편 = 자막몇편();
  if (몇편 < 1) 틀렸다("자막이 한 편도 없다");
  else 됐다(`자막 ${몇편}편`);

  console.log();
  console.log("=".repeat(66));
  console.log(" ② 자료가 깃에 들어가나 — 안 들어가면 새 컴퓨터에 안 따라온다");
  console.log("=".repeat(66));
  const { execFileSync } = require("child_process");
  const 무시되나 = (ㄱ) => {
    try {
      execFileSync("git", ["check-ignore", "-q", ㄱ], { cwd: 집, stdio: "ignore" });
      return true;                       // 끝값 0 = 무시된다
    } catch (오류) { return false; }
  };
  for (const ㄱ of 꼭있어야할것.map(ㅁ => ㅁ.길).concat(고치려면있어야할것)) {
    if (무시되나(ㄱ)) 틀렸다(`${ㄱ} 가 .gitignore 에 걸려 있다 — 새 컴퓨터에 안 따라온다`);
    else 됐다(`${ㄱ.padEnd(22)} 깃이 받는다`);
  }
  //  ★ 열쇠는 거꾸로 — **반드시 막혀 있어야** 한다
  if (!무시되나("자막만들기/유튜브열쇠.json"))
    틀렸다("자막만들기/유튜브열쇠.json 이 안 막혔다 — 공개 저장소에 열쇠가 샌다");
  else 됐다("자막만들기/유튜브열쇠.json   막혀 있다 (이건 이래야 맞다)");

  console.log();
  console.log("=".repeat(66));
  console.log(" ③ 브라우저 서랍은 **거울**이어야 한다 — 원본이면 안 된다");
  console.log("=".repeat(66));
  //  ★ 원본이 파일이라는 약속이 코드에 적혀 있나. 이게 뒤집히면 그 컴퓨터에서만 되는 앱이 된다.
  const 나무글 = fs.readFileSync(path.join(집, "js", "단원.js"), "utf8").slice(0, 400);
  if (!/여기 있는 것이 진짜/.test(나무글))
    틀렸다("js/단원.js 머리의 「여기 있는 것이 진짜다」 약속이 사라졌다 — 원본이 바뀌었나 봐라");
  else 됐다("js/단원.js 가 스스로 「여기 있는 것이 진짜다」 라고 적고 있다");

  if (집만) {
    console.log("\n(--집만 이라 인터넷 검사는 건너뛴다)");
  } else {
    console.log();
    console.log("=".repeat(66));
    console.log(" ④ ★ 진짜 잣대 — 드라이브도 로그인도 없이 서버에서 나오나");
    console.log("=".repeat(66));
    for (const ㄱ of 꼭있어야할것) {
      try {
        const ㄹ = await 받아보기(ㄱ.길);
        if (!ㄹ.됐나) 틀렸다(`${사이트}/${ㄱ.길} → ${ㄹ.상태}`);
        else if (ㄹ.크기 < ㄱ.최소) 틀렸다(`${ㄱ.길} 가 서버에서 너무 작게 온다 (${ㄹ.크기}바이트)`);
        else 됐다(`${ㄱ.길.padEnd(22)} 200  ${String(ㄹ.크기).padStart(7)}바이트`);
      } catch (오류) {
        console.log(`     (인터넷을 못 쓴다 — ${ㄱ.길} 은 건너뛴다: ${오류.message})`);
      }
    }
  }

  console.log();
  console.log("=".repeat(66));
  if (탈 === 0) {
    console.log(" 다 됐다 — 새 컴퓨터에서 클론만 하면 자료가 따라온다.");
  } else {
    console.log(` ★ 걸린 것 ${탈}개 — 위를 봐라. 새 컴퓨터에서 그만큼 잃는다.`);
  }
  console.log("=".repeat(66));
  process.exit(탈 === 0 ? 0 : 1);
})();
