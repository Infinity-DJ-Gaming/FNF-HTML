import {beatAt,bpmAt} from './core.js';
export const SIX_DIRECTIONS=[0,2,3,0,1,3];
export const SIX_KEYS=['KeyS','KeyD','KeyF','KeyJ','KeyK','KeyL'];
export function chartForSixKeys(chart){
 if(chart.laneCount===6)return structuredClone(chart);
 const result={...chart,laneCount:6},notes=[],occupied=new Map();
 for(const [i,n] of chart.notes.entries()){const pair=n.lane===0?[0,3]:n.lane===3?[2,5]:n.lane===2?[1]:[4],lane=pair[Math.floor(n.time/Math.max(1,60000/bpmAt(chart,n.time)))%pair.length],copy={...n,lane,originalLane:n.lane,generated:false};notes.push(copy);}
 for(const n of notes){const key=Number(n.player)+':'+n.lane;if(!occupied.has(key))occupied.set(key,[]);occupied.get(key).push([n.time,n.time+n.length]);}
 const available=(lane,time,player)=>!(occupied.get(Number(player)+':'+lane)||[]).some(([start,end])=>time>=start-95&&time<=end+95);
 for(const [i,n] of chart.notes.entries()){if(i%3!==0||n.length>0)continue;const step=15000/bpmAt(chart,n.time),time=Math.round((n.time+Math.max(110,step))*1000)/1000;if(time>=chart.chartEnd-100)continue;const choices=i%2?[3,5,0,2]:[0,2,3,5],lane=choices.find(l=>available(l,time,n.player));if(lane===undefined)continue;notes.push({time,lane,player:n.player,length:0,originalLane:SIX_DIRECTIONS[lane],generated:true});const key=Number(n.player)+':'+lane;if(!occupied.has(key))occupied.set(key,[]);occupied.get(key).push([time,time]);}
 notes.sort((a,b)=>a.time-b.time||a.lane-b.lane||Number(a.player)-Number(b.player));result.notes=notes;return result;
}
export function partnerDanceFrame(beat,bpm,{halfLength=15,fps=24,period=1}={}){const counter=Math.floor(Math.max(0,beat)/period),elapsed=((beat%period+period)%period)*60000/bpm;return (counter%2)*halfLength+Math.min(halfLength-1,Math.floor(elapsed*fps/1000));}
export function nativeFacing(flipX,player=false){return player?!Boolean(flipX):Boolean(flipX);}
export function laneAtPoint(x,left,width,count){return Math.max(0,Math.min(count-1,Math.floor((x-left)/Math.max(1,width)*count)));}

export function holdProgress(chart,note,time,held){
  const releaseTime=note.time+note.length*0.75;
  if(!held&&time<releaseTime)return {broken:true,complete:false,ticks:note.holdDone||0};
  const complete=time>=releaseTime;
  const until=complete?note.time+note.length:Math.max(note.time,time);
  const ticks=Math.floor((beatAt(chart,until)-beatAt(chart,note.time))*4+1e-6);
  return {broken:false,complete,ticks};
}
