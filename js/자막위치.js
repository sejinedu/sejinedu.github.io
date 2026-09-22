// ============================================================
//  자막 위치 — 영상편집 프로그램이 정한 높이를 따른다  (2026-09-22)
// ============================================================
//  ★ 원본은 세도비 영상편집 app/ui/site-caption-position.js 다. 그대로 옮겨 왔다.
//    전에는 영상편집이 자막 파일 끝에 이 코드를 붙여 보냈다. 이제 자막이 저장소로 오니
//    코드가 안 따라온다 — 그래서 여기 한 벌 두고, 자막에 「화면.bottom_percent」 가 있을 때 싣는다.
//  ★ 원본이 바뀌면 여기도 같이 바꿔라.

// Included in generated caption documents. Uses the site's public caption API.
(()=>{
 if(window.sedobiCaptionPosition||typeof 자막==='undefined')return;
 const layer=document.getElementById('자막층');if(!layer?.parentElement)return;
 window.sedobiCaptionPosition=true;let frame=0,activeRows=null,manual=false;
 function paint(){
  frame=0;const rows=자막.줄들();
  if(rows!==activeRows){activeRows=rows;manual=false;}
  const doc=Object.values(window.자막모음||{}).find(d=>d.줄===rows);
  const percent=doc?.화면?.bottom_percent;
  if(manual||!Number.isFinite(percent)){layer.style.removeProperty('bottom');return;}
  const host=layer.parentElement,w=host.clientWidth,h=host.clientHeight;
  const fh=Math.min(h,w*9/16),y=(h-fh)/2;
  const bottom=y+Math.min(fh*Math.max(0,Math.min(90,percent))/100,Math.max(0,fh-layer.offsetHeight));
  const value=bottom+'px';if(layer.style.bottom!==value)layer.style.bottom=value;
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(paint);}
 new MutationObserver(schedule).observe(layer,{childList:true,subtree:true,characterData:true});
 const resize=new ResizeObserver(schedule);resize.observe(layer);resize.observe(layer.parentElement);
 const change=자막.높이바꾸기;
 if(change)자막.높이바꾸기=function(...args){manual=true;const result=change.apply(this,args);schedule();return result;};
 schedule();
})();
