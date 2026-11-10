// Public V-Slice song metadata/chart format, adapted without executing mod scripts.
import {clamp} from './core.js';
export function vsliceLevels(metadata,chart){const requested=metadata.playData?.difficulties;return (Array.isArray(requested)&&requested.length?requested:Object.keys(chart.notes||{})).filter(name=>Array.isArray(chart.notes?.[name]));}
export function vsliceToClassic(metadata,chart,difficulty,{durationMs=0}={}){
  if(metadata.timeFormat&&metadata.timeFormat!=='ms')throw new Error('Only millisecond V-Slice charts are supported.');if(!Array.isArray(chart.notes?.[difficulty]))throw new Error('That difficulty has no chart notes.');
  const changes=(metadata.timeChanges||[{t:0,bpm:100}]).filter(t=>Number.isFinite(t.t)&&Number(t.bpm)>0).map(t=>({t:Math.max(0,t.t),bpm:clamp(Number(t.bpm),1,999)})).sort((a,b)=>a.t-b.t);if(!changes.length)changes.push({t:0,bpm:100});if(changes[0].t>0)changes.unshift({t:0,bpm:changes[0].bpm});
  const tempos=changes.filter((t,i)=>!changes[i+1]||changes[i+1].t!==t.t),notes=chart.notes[difficulty].filter(n=>Number.isFinite(n.t)&&n.t>=0&&Number.isInteger(n.d)&&n.d>=0&&n.d<8).sort((a,b)=>a.t-b.t),events=(chart.events||[]).filter(e=>Number.isFinite(e.t)&&typeof e.e==='string').sort((a,b)=>a.t-b.t);
  let lastNote=0;for(const n of notes)lastNote=Math.max(lastNote,n.t+Math.max(0,Number(n.l)||0));const end=Math.max(durationMs,lastNote+240000/tempos.at(-1).bpm,tempos.at(-1).t+1000),sections=[];let start=0,tempoIndex=0,placed=0,eventIndex=0,player=false;
  while(start<end-0.000001){while(tempoIndex+1<tempos.length&&tempos[tempoIndex+1].t<=start+0.000001)tempoIndex++;const bpm=tempos[tempoIndex].bpm;while(eventIndex<events.length&&events[eventIndex].t<=start+0.000001){const event=events[eventIndex++];if(event.e==='FocusCamera'){const char=typeof event.v==='object'?event.v?.char:event.v;player=char===0||char==='bf'||char==='player';}}
    const finish=Math.min(start+240000/bpm,tempos[tempoIndex+1]?.t??Infinity,end);if(finish<=start)throw new Error('Invalid BPM change sequence.');const section={lengthInSteps:(finish-start)*bpm/15000,sectionNotes:[],mustHitSection:player,changeBPM:sections.length>0&&bpm!==sections.at(-1).bpm,bpm,altAnim:false,typeOfSection:0};
    while(placed<notes.length&&notes[placed].t<finish-0.000001){const n=notes[placed++],isPlayer=n.d<4;section.sectionNotes.push([n.t,n.d%4+(isPlayer===player?0:4),Math.max(0,Number(n.l)||0),...(n.k?[String(n.k)]:[])]);}sections.push(section);start=finish;
    if(sections.length>20000)throw new Error('This chart has too many timing sections.');
  }
  const chars=metadata.playData?.characters||{},speed=typeof chart.scrollSpeed==='object'?chart.scrollSpeed[difficulty]??chart.scrollSpeed.default:chart.scrollSpeed;
  return {song:{song:String(metadata.songName||'Imported song'),bpm:tempos[0].bpm,speed:clamp(Number(speed)||1,0.1,10),needsVoices:true,player1:chars.player||'bf',player2:chars.opponent||'dad',stage:metadata.playData?.stage||'mainStage',notes:sections,events,timeChanges:tempos,modernDifficulty:difficulty,modernOffsets:metadata.offsets||{}},importedFrom:'V-Slice'};
}
