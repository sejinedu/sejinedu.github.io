// ============================================================
//  영상 올리기 — 선생님 · 관리자  (2026-09-22 · 사용자가 정함)
// ============================================================
//
//  사용자가 정한 것:
//    「선생님 회원은 읽기, 영상 올리기, 댓글 쓰기, 자기가 쓴 글 지우기」
//    「관리자는 … 영상 올리기 …」
//    「게시글 생성 시 제목의 기본값을 입력된 유튜브 동영상 제목과 동일하게」
//
//  ★ 제목은 링크를 넣으면 유튜브 제목으로 저절로 채운다.
//    손으로 한 번이라도 고쳤으면 그 뒤로는 안 덮는다 — 고친 게 이긴다.
//  ★ 올리는 권한은 저장소가 막는다. 단추를 숨기는 건 헷갈리지 말라고다.
//  ★ 저장소를 못 불러 옛 파일로 뜬 날에는 단추가 아예 안 뜬다 — 올려도 목록에 안 보이니까.

(() => {
  if (!window.회원) return;
  const 단추 = document.getElementById("영상올리기단추");
  const 막 = document.getElementById("올리기막");
  if (!단추 || !막) return;
  const 주소칸 = document.getElementById("올리기주소");
  const 제목칸 = document.getElementById("올리기제목칸");
  const 단원칸 = document.getElementById("올리기단원");
  const 본문칸 = document.getElementById("올리기본문");
  const 말 = document.getElementById("올리기말");
  const 하기 = document.getElementById("올리기하기");
  const 취소 = document.getElementById("올리기취소");

  let 제목손댔나 = false;
  let 물은아이디 = "";
  let 도는중 = false;

  const 올릴수있나 = ㅅ => window.저장소가원본 && ㅅ.들어왔나 && (ㅅ.등급 === "teacher" || ㅅ.등급 === "admin");
  // ★ 머리줄 「영상 올리기」 단추는 없앴다 (2026-09-22 · 사용자가 정함 — 「영상 올리기 버튼 없애」).
  //   단추는 늘 숨겨 두고 창을 여는 손잡이로만 쓴다. 올리기는 게시판 「글쓰기」 로 한다.
  function 단추칠하기(ㅅ) {
    const 된다 = !!올릴수있나(ㅅ);
    단추.hidden = true;
    단추.dataset.된다 = 된다 ? "1" : "";
    document.querySelectorAll(".글쓰기단추").forEach(ㄱ => { ㄱ.hidden = !된다; });
  }
  회원.듣기(단추칠하기);
  단추칠하기(회원.상태());

  function 말하기(글, 결) {
    말.textContent = 글 || "";
    말.style.color = 결 === "탈" ? "#e08b96" : 결 === "됨" ? "var(--악센트)" : "";
  }

  // 단원 고르는 칸 — 과목부터 끝 단원까지 들여쓰기로
  function 단원칸채우기(고를것) {
    단원칸.replaceChildren();
    const 빈것 = new Option("— 단원을 골라라 —", "");
    단원칸.appendChild(빈것);
    (function 걷기(가지, 깊이) {
      (가지 || []).forEach(ㅁ => {
        const 줄 = new Option("  ".repeat(깊이) + (깊이 ? "└ " : "") + ㅁ.이름, ㅁ.아이디);
        단원칸.appendChild(줄);
        걷기(ㅁ.아래, 깊이 + 1);
      });
    })(나무.목록, 0);
    단원칸.value = 고를것 || "";
  }

  function 열기() {
    말하기("");
    주소칸.value = ""; 제목칸.value = ""; 본문칸.value = "";
    제목손댔나 = false; 물은아이디 = "";
    // 지금 보고 있는 단원이 있으면 그걸 먼저 골라 둔다
    let 지금단원 = "";
    try { 지금단원 = (typeof 고른아이디 !== "undefined" && 고른아이디) || ""; } catch (오류) {}
    const 과목칸 = document.getElementById("올리기과목");
    if (과목칸 && window.과목단원고르개) 과목단원고르개(과목칸, 단원칸, 지금단원);
    else 단원칸채우기(지금단원);
    막.hidden = false;
    setTimeout(() => 주소칸.focus(), 30);
  }
  function 닫기() { 막.hidden = true; }

  async function 제목채우기() {
    const 아이디 = 영상창고.아이디뽑기(주소칸.value);
    if (!아이디) { if (주소칸.value.trim()) 말하기("유튜브 링크가 아닌 것 같다", "탈"); return; }
    if (아이디 === 물은아이디) return;
    물은아이디 = 아이디;
    const 이미 = (window.동영상목록 || []).find(ㅇ => (ㅇ.아이디 || "").trim() === 아이디);
    말하기(이미 ? "★ 이 영상은 벌써 올라가 있다 — 「" + 이미.제목 + "」" : "유튜브에서 제목을 받는 중…", 이미 ? "탈" : "");
    const 제목 = await 영상창고.제목물어보기(아이디);
    if (아이디 !== 물은아이디) return;
    if (!이미) 말하기(제목 ? "" : "제목을 못 받았다. 직접 적어라");
    if (제목 && !제목손댔나) 제목칸.value = 제목;
  }

  async function 올리기() {
    if (도는중) return;
    const 아이디 = 영상창고.아이디뽑기(주소칸.value);
    const 제목 = 제목칸.value.trim();
    if (!아이디) { 말하기("유튜브 링크를 넣어라", "탈"); 주소칸.focus(); return; }
    if (!제목) { 말하기("제목을 적어라", "탈"); 제목칸.focus(); return; }
    if (!단원칸.value) { 말하기("단원을 골라라", "탈"); 단원칸.focus(); return; }
    도는중 = true; 하기.disabled = true; 말하기("올리는 중…");
    try {
      const 새것 = await 회원.부르기("/rest/v1/site_posts?select=id", {
        방법: "POST",
        몸: { title: 제목, unit_id: 단원칸.value, youtube_id: 아이디, body: 본문칸.value },
        머리: { Prefer: "return=representation" }
      });
      const 번호 = 새것 && 새것[0] && 새것[0].id;
      // 방금 올린 것을 읽는 창으로 다시 받아 목록에 끼운다
      const 줄 = (await 회원.부르기("/rest/v1/site_posts_view?select=id,unit_id,title,body,youtube_id,created_at,author_id,author_name&id=eq." + 번호))[0];
      const 영상 = {
        고유: 줄.id, 단원아이디: 줄.unit_id || "", 강사: 줄.author_name || "", 제목: 줄.title,
        아이디: 줄.youtube_id, 본문: 줄.body || "", 글쓴이: 줄.author_id, 올린때: 줄.created_at
      };
      window.동영상목록.push(영상);
      말하기("올렸다", "됨");
      setTimeout(() => {
        닫기();
        try { 격자그리기(); 틀기(영상); } catch (오류) { location.reload(); }
      }, 400);
    } catch (오류) {
      const ㄱ = String(오류.message || 오류);
      말하기(/row-level|permission|42501/i.test(ㄱ) ? "올릴 권한이 없다 — 선생님 등급이어야 한다" : "못 올렸다 — " + ㄱ, "탈");
    } finally {
      도는중 = false; 하기.disabled = false;
    }
  }

  let 시계 = 0;
  주소칸.addEventListener("input", () => { clearTimeout(시계); 시계 = setTimeout(제목채우기, 350); });
  주소칸.addEventListener("paste", () => setTimeout(제목채우기, 30));
  제목칸.addEventListener("input", () => { 제목손댔나 = true; });
  하기.addEventListener("click", 올리기);
  취소.addEventListener("click", 닫기);
  막.addEventListener("click", ㄴ => { if (ㄴ.target === 막) 닫기(); });
  막.addEventListener("keydown", ㄴ => { if (ㄴ.key === "Escape") 닫기(); });
  단추.addEventListener("click", 열기);
})();
