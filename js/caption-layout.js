/* One authored frame for preview, upload and website: 1920x1080, CC 48px.
 * Measured on the user's actual YouTube reference 9AEsTOZ9IIo at 13:08,
 * fontSize=0: 48px at 1920x1080 and 24px at 960x540 (2026-09-10).
 * Cropping changes the picture inside this frame, never the caption scale.
 * Dimensions are CSS pixels. Browser zoom/DPR must not be applied twice.
 */
(function(root){
 'use strict';
 function contentRect(width,height,videoWidth,videoHeight){
  if(![width,height,videoWidth,videoHeight].every(n=>Number.isFinite(n)&&n>0))return {x:0,y:0,width:0,height:0};
  const scale=Math.min(width/videoWidth,height/videoHeight),w=videoWidth*scale,h=videoHeight*scale;
  return {x:(width-w)/2,y:(height-h)/2,width:w,height:h};
 }
 const reference=Object.freeze({width:1920,height:1080,fontSize:48});
 function frameRect(width,height){return contentRect(width,height,reference.width,reference.height);}
 function frameFontSize(width,height,percent=100){
  return frameRect(width,height).width/reference.width*reference.fontSize*percent/100;
 }
 const api={contentRect,reference,frameRect,frameFontSize};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.CaptionLayout=api;
})(typeof globalThis==='object'?globalThis:this);
