// ============================================================
//  로그인 화면 규격 대조 — 홈피 쪽  (2026-09-24)
// ============================================================
//  사장님: 「로그인 구성은 홈피와 런처가 동일하게」
//  원본: ..\0 세도비 지침서\로그인 화면 규격.md — 런처 test\검사.js 도 같은 파일을 읽어 맞춘다.
//  ★ 규격 파일의 목록을 **글자 그대로** 읽어 홈피 코드(js/로그인창.js)의 차례와 견준다.
//    한쪽만 바꾸면 여기서 빨강이 난다.
//  쓰는 법:  node 검사/로그인규격.js     (끝값 0 = 통과)

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const 집 = path.join(__dirname, "..");
const 규격길 = path.join(집, "..", "0 세도비 지침서", "로그인 화면 규격.md");
const 규격 = fs.readFileSync(규격길, "utf8").replace(/\r/g, "");
const 창 = fs.readFileSync(path.join(집, "js", "로그인창.js"), "utf8");
const 회원 = fs.readFileSync(path.join(집, "js", "회원.js"), "utf8");

let 통과 = 0, 실패 = 0;
const 봄 = (됐나, 말) => { if (됐나) { 통과++; console.log("  ○ " + 말); } else { 실패++; console.log("  ✗ " + 말); } };
const 같나 = (가, 나) => JSON.stringify(가) === JSON.stringify(나);

// 규격 — 「## 제목」 밑의 첫 목록(- 로 시작하는 줄들)
function 목록(제목) {
  const 줄들 = 규격.split("\n");
  let ㅈ = 줄들.findIndex(ㄱ => ㄱ.trim() === "## " + 제목);
  if (ㅈ < 0) throw new Error("규격에 「" + 제목 + "」 이 없다");
  const 것 = [];
  for (ㅈ++; ㅈ < 줄들.length; ㅈ++) {
    const ㄱ = 줄들[ㅈ];
    if (/^## /.test(ㄱ)) break;
    if (/^- /.test(ㄱ)) 것.push(ㄱ.slice(2).trim());
    else if (것.length && ㄱ.trim() === "") break;          // 첫 목록이 끝났다
  }
  return 것;
}
// 홈피 코드 — const 이름 = [ ... ];
function 코드목록(이름) {
  const ㅁ = new RegExp("const " + 이름 + " = (\\[[^\\]]*\\]);").exec(창);
  if (!ㅁ) throw new Error("js/로그인창.js 에 " + 이름 + " 이 없다");
  return JSON.parse(ㅁ[1]);
}

console.log("로그인 화면 규격 대조 — " + 규격길);

// 1) 드롭바 · 로그인 창 차례
const 규격드롭바 = 목록("드롭바 (이름을 누르면)");
const 규격창 = 목록("로그인 창");
봄(같나(코드목록("드롭바차례"), 규격드롭바), "드롭바 차례가 규격과 같다 — " + 규격드롭바.join(" / "));
봄(같나(코드목록("로그인창차례"), 규격창), "로그인 창 차례가 규격과 같다 — " + 규격창.join(" / "));

// 2) 드롭바 머리 · 보이는 조건이 코드에 있나
봄(/드롭바차례\.forEach/.test(창), "드롭바는 드롭바차례 그대로 그린다 (따로 적은 글자 없음)");
봄(/"회원 관리": \{ 된다: ㅅ\.등급 === "admin"/.test(창), "회원 관리 — 관리자만");
봄(/function 선생관리되나/.test(창) && /원장인가/.test(창) && /권한\.초대/.test(창), "선생 관리 — 원장이거나 「초대」 권한 (학원 없는 선생님 이상은 학원 만들기)");

// 3) 이름 칸 — 「닉네임 · 학원 · 소속」 을 실제로 돌려 본다
const 함수글 = /(function 학원활성[\s\S]*?\n  \}\n)/.exec(창);
const 틀 = { 글로그인: "로그인" };
vm.createContext(틀);
vm.runInContext(창.slice(창.indexOf("function 학원활성"), 창.indexOf("  let 새비번제목")), 틀);
const 이름 = ㅅ => vm.runInContext("이름칸글(" + JSON.stringify(ㅅ) + ")", 틀);
const 학원 = (상태, 원장인가, 소속이름) => ({ 학원: "h1", 학원이름: "세진과학", 원장인가, 소속이름, 상태 });
봄(이름({ 들어왔나: false }) === "로그인", "로그인 전: 「로그인」");
봄(이름({ 들어왔나: true, 별명: "김세진", 메일: "a@b.c" }) === "김세진", "학원 없음: 「닉네임」 만");
봄(이름({ 들어왔나: true, 별명: "김세진", 메일: "a@b.c", 학원: 학원("활성", false, "팀장") }) === "김세진 · 세진과학 · 팀장", "학원 활성: 「닉네임 · 학원 · 소속」");
봄(이름({ 들어왔나: true, 별명: "김세진", 메일: "a@b.c", 학원: 학원("활성", true, "원장") }) === "김세진 · 세진과학 · 원장", "원장: 「닉네임 · 학원 · 원장」");
봄(이름({ 들어왔나: true, 별명: "김세진", 메일: "a@b.c", 학원: 학원("정지", false, "팀장") }) === "김세진", "학원 정지·초대: 학원·소속을 안 붙인다");
봄(이름({ 들어왔나: true, 별명: null, 메일: "tpwls455@gmail.com" }) === "tpwls455", "닉네임이 없으면 메일 앞부분");

// 4) 학원_나 · 앵커 · 비밀번호 찾기 → 새 비밀번호
봄(/학원_나/.test(회원) && /await 학원읽기\(\)/.test(회원), "로그인 · 켤 때 rpc/학원_나 를 부른다");
봄(규격.includes("#member-admin") && /member-admin\|post-pin/.test(회원), "앵커 #member-admin · #post-pin 을 받는다");
봄(/걸음보이기\("새비번"\)/.test(창) && /\/auth\/v1\/user", \{ 방법: "PUT"/.test(회원), "비밀번호 찾기 → 번호로 들어가기 → 새 비밀번호 정하기");
봄(/type: "signup"/.test(회원) && /type: "email"/.test(회원), "가입은 verify type signup · 찾기는 type email");
봄(/글자 수|length < 2 \|\| 별명\.length > 20/.test(회원), "닉네임 두 글자에서 스무 글자");

// 5) 선생 관리 — 규격 「## 선생 관리」 절 (2026-09-24 줄임: 메일 하나 + 카톡 글, 권한은 각 앱에서)
const 선생 = fs.readFileSync(path.join(집, "js", "선생관리.js"), "utf8");
const 선생절 = (() => { const ㅈ = 규격.search(/^## 선생 관리/m); if (ㅈ < 0) return ""; const 뒤 = 규격.slice(ㅈ + 3); const 끝 = 뒤.search(/^## /m); return 끝 < 0 ? 뒤 : 뒤.slice(0, 끝); })();
봄(!!선생절, "규격에 「## 선생 관리」 절이 있다");
const 단추이름 = (/단추 `([^`]+)`/.exec(선생절) || [])[1];
봄(!!단추이름 && 선생.includes('"' + 단추이름 + '"'), "초대 단추 이름이 규격과 같다 — " + 단추이름);
봄(/학원_초대", \{ p_메일: 메일, p_소속이름: "선생님", p_권한: \{ 반범위: "자기" \}, p_강사id: null \}/.test(선생) && 선생절.includes(`'선생님', {"반범위":"자기"}, null`), "새 메일은 학원_초대(메일, 선생님, 자기 반, null)");
봄(/목록\.some\(사람 => [^\n]*=== 메일\)\) \{[\s\S]{0,200}?return;/.test(선생), "이미 명단에 있는 메일은 학원_초대를 다시 안 부른다");
봄(선생절.includes("launcher/sedobi-setup.exe") && 선생.includes("/launcher/sedobi-setup.exe"), "카톡 글에 런처 설치 파일 받는 곳");
봄(!/단\("권한"/.test(선생) && !/p_권한: 것\.권한/.test(선생), "명단에 「권한」 단추가 없다 — 권한은 각 앱에서");

console.log("\n통과 " + 통과 + " / 실패 " + 실패);
process.exit(실패 ? 1 : 0);
