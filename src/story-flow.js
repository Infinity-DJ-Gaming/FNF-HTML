// Native story sequences run once on entry; retries and editor tests go straight to countdown.
export function songIntro(id,{story=false,retry=false,editor=false,character='bf',variant=null}={}){if(retry||editor)return null;if(id==='winter-horrorland')return id;return (story&&['senpai','roses','thorns'].includes(id)||(character==='pico'||variant==='pico')&&['senpai','roses'].includes(id))?id:null;}
export function songOutro(id,{variant=null}={}){return id==='eggnog'&&variant==='erect'?'eggnog-erect-outro':null;}
export function pixelStage(choice){return /^school(?:Evil)?(?:Erect)?$/.test(choice?.stage||'')||Object.values(choice?.characters||{}).some(id=>/-pixel(?:-|$)/.test(id||''));}

export function rosesFade(id,{story=false,variant=null,time=0}={}){if(id!=='roses'||!story||variant==='pico'||variant==='erect')return{red:0,hud:1};return{red:Math.max(0,Math.min(1,(time-90000)/2000)),hud:1-Math.max(0,Math.min(1,(time-90000)/1500))};}
