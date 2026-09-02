/**
 * 세진 과학 — 조회수·좋아요를 모으는 자리
 * ============================================================
 *
 * 사용자가 정한 것 (2026-09-02):
 *   「학생 좋아요·조회수로 강사가 살아남는 판」 을 만들려면
 *   숫자가 한군데 모여야 한다. 지금은 각자 폰에만 쌓인다.
 *
 * ★ 왜 구글 스프레드시트인가
 *   · 형이 이미 구글 계정을 갖고 있다 — 새로 만들 게 없다
 *   · 공짜다. 서버를 켜 둘 필요가 없다
 *   · ★★★ 형이 숫자를 눈으로 볼 수 있다. 표를 열면 그대로 보인다
 *
 * ★ 깔는 법 (한 번만)
 *   1. 구글 드라이브에서 스프레드시트를 하나 만든다 (이름: 세진과학 기록)
 *   2. 위 메뉴 → 확장 프로그램 → Apps Script
 *   3. 거기 있던 글을 다 지우고 이 파일 내용을 붙여넣는다
 *   4. 오른쪽 위 「배포」 → 「새 배포」 → 톱니바퀴 → 「웹 앱」
 *      · 실행 사용자: 나
 *      · 액세스 권한: 모든 사용자
 *   5. 「배포」 를 누르고 나오는 **웹 앱 URL** 을 복사해서 알려 준다
 *
 * ★ 표는 저절로 만들어진다. 손으로 칸을 만들 필요 없다.
 *
 * ★★★ 깔아 둔 자리 (2026-09-02 · 다 끝났다)
 *   · 계정   : tpwls233@gmail.com
 *   · 표     : https://docs.google.com/spreadsheets/d/15isR1dB8NsyrNpdIk_oK8eRHaOl5ryWhp7Vys1MPg_U/edit
 *   · 웹 앱  : https://script.google.com/macros/s/AKfycbxF2_GcR-atVwhTJTZqtYpCDnHfk_MDjuYQ_fhRsT1OuTgFXZYpmxWDXPrwOCdbDoF5/exec
 *   → 이 주소를 js/기록소.js 의 「기록서버」 에 적어 두었다.
 *
 * ★ 글을 고치면 반드시 **배포 → 배포 관리 → 연필 → 버전 「새 버전」 → 배포** 을 다시 해야 바뀜다.
 *   주소는 그대로다 — 새 배포를 만들면 주소가 바뀌니 「연필」 로 고쳐라.
 */

var 표이름 = "기록";

/** 표를 찾고, 없으면 만든다. */
function 표가져오기() {
  var 문서 = SpreadsheetApp.getActiveSpreadsheet();
  var 표 = 문서.getSheetByName(표이름);
  if (!표) {
    표 = 문서.insertSheet(표이름);
    표.appendRow(["영상아이디", "조회", "좋아요", "마지막"]);
    표.setFrozenRows(1);
  }
  return 표;
}

/** 영상아이디 → 줄번호 를 한 번에 읽어 둔다. */
function 자리표만들기(표) {
  var 마지막줄 = 표.getLastRow();
  var 자리 = {};
  if (마지막줄 < 2) return 자리;
  var 값들 = 표.getRange(2, 1, 마지막줄 - 1, 1).getValues();
  for (var ㅈ = 0; ㅈ < 값들.length; ㅈ++) {
    var 아 = String(값들[ㅈ][0] || "").trim();
    if (아) 자리[아] = ㅈ + 2;
  }
  return 자리;
}

function 답하기(것) {
  return ContentService
    .createTextOutput(JSON.stringify(것))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 읽기 — 여러 영상 숫자를 한꺼번에 준다.
 *   GET ?v=아이디1,아이디2,...
 * ★ 하나씩 물어보면 느리다. 격자에 카드가 열 개면 열 번 오간다.
 */
function doGet(ㅇ) {
  var 아이디들 = String((ㅇ && ㅇ.parameter && ㅇ.parameter.v) || "")
    .split(",").map(function (ㄱ) { return ㄱ.trim(); }).filter(Boolean).slice(0, 100);
  var 표 = 표가져오기();
  var 자리 = 자리표만들기(표);
  var 답 = {};
  var 마지막줄 = 표.getLastRow();
  var 온값 = 마지막줄 >= 2 ? 표.getRange(2, 1, 마지막줄 - 1, 3).getValues() : [];
  for (var ㅈ = 0; ㅈ < 아이디들.length; ㅈ++) {
    var 아 = 아이디들[ㅈ];
    var 줄 = 자리[아];
    답[아] = 줄 ? { 조회: Number(온값[줄 - 2][1]) || 0, 좋아요: Number(온값[줄 - 2][2]) || 0 }
                : { 조회: 0, 좋아요: 0 };
  }
  return 답하기(답);
}

/**
 * 쓰기 — 조회 하나 올리기 / 좋아요 올리거나 내리기
 *   POST body: {"할일":"조회","v":"아이디"}
 *   POST body: {"할일":"좋아요","v":"아이디","얼마":1}   (취소는 -1)
 *
 * ★★★ 한꺼번에 여럿이 눌러도 숫자가 어긋나지 않게 자물쇠를 건다.
 *   안 걸면 두 사람이 동시에 눌렀을 때 하나가 사라진다.
 */
function doPost(ㅇ) {
  var 자물쇠 = LockService.getScriptLock();
  try {
    자물쇠.waitLock(8000);
  } catch (오류) {
    return 답하기({ 됐나: false, 왜: "붐빈다. 잠시 뒤 다시" });
  }

  try {
    var 몸통 = {};
    try { 몸통 = JSON.parse((ㅇ && ㅇ.postData && ㅇ.postData.contents) || "{}"); }
    catch (오류) { return 답하기({ 됐나: false, 왜: "글이 깨졌다" }); }

    var 아 = String(몸통.v || "").trim();
    if (!아) return 답하기({ 됐나: false, 왜: "영상 아이디가 없다" });

    var 표 = 표가져오기();
    var 자리 = 자리표만들기(표);
    var 줄 = 자리[아];
    if (!줄) {
      표.appendRow([아, 0, 0, new Date()]);
      줄 = 표.getLastRow();
    }

    var 조회 = Number(표.getRange(줄, 2).getValue()) || 0;
    var 좋아요 = Number(표.getRange(줄, 3).getValue()) || 0;

    if (몸통.할일 === "조회") {
      조회 += 1;
    } else if (몸통.할일 === "좋아요") {
      var 얼마 = Number(몸통.얼마);
      좋아요 = Math.max(0, 좋아요 + (얼마 < 0 ? -1 : 1));
    } else {
      return 답하기({ 됐나: false, 왜: "무슨 일인지 모르겠다" });
    }

    표.getRange(줄, 2, 1, 3).setValues([[조회, 좋아요, new Date()]]);
    return 답하기({ 됐나: true, 조회: 조회, 좋아요: 좋아요 });

  } finally {
    자물쇠.releaseLock();
  }
}
