/* Shared caption geometry. Dimensions are CSS pixels, never device pixels.
 * YouTube's public captions renderer observed 2026-09-10 uses 16px per
 * 360px of landscape video content height at the default fontSize=0.
 * https://developers.google.com/youtube/iframe_api_reference#onApiChange
 * This is a desktop reference, not an API guarantee of fixed pixel sizes.
 */
(function(root){
 'use strict';
 function contentRect(width,height,videoWidth,videoHeight){
  if(![width,height,videoWidth,videoHeight].every(n=>Number.isFinite(n)&&n>0))return {x:0,y:0,width:0,height:0};
  const scale=Math.min(width/videoWidth,height/videoHeight),w=videoWidth*scale,h=videoHeight*scale;
  return {x:(width-w)/2,y:(height-h)/2,width:w,height:h};
 }
 function fontSize(width,height,videoWidth,videoHeight,percent=100){
  const video=contentRect(width,height,videoWidth,videoHeight);
  if(!video.height)return 0;
  const base=video.height>=video.width?width/(height>width*1.3?480:640)*16:video.height/360*16;
  return base*percent/100;
 }
 const api={contentRect,fontSize};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.CaptionLayout=api;
})(typeof globalThis==='object'?globalThis:this);
