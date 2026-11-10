// Original browser engine. Charts are interpreted from classic FNF v0.2.7.1.
export const SONGS = [
  {"id":"cocoa","name":"Cocoa","file":"Cocoa","bpm":100,"week":5,"opponent":"parents-christmas","stage":"mallXmas"},
  {"id":"eggnog","name":"Eggnog","file":"Eggnog","bpm":150,"week":5,"opponent":"parents-christmas","stage":"mallXmas"},
  {"id":"winter-horrorland","name":"Winter Horrorland","file":"Winter-Horrorland","bpm":159,"week":5,"opponent":"monster-christmas","stage":"mallEvil"},
  {"id":"senpai","name":"Senpai","file":"Senpai","bpm":144,"week":6,"opponent":"senpai","stage":"school"},
  {"id":"roses","name":"Roses","file":"Roses","bpm":120,"week":6,"opponent":"senpai-angry","stage":"school"},
  {"id":"thorns","name":"Thorns","file":"Thorns","bpm":190,"week":6,"opponent":"spirit","stage":"schoolEvil"},
  {"id":"tutorial","name":"Tutorial","file":"Tutorial","bpm":100,"week":0,"opponent":"gf","stage":"mainStage"},
  {"id":"pico","name":"Pico","file":"Pico","bpm":150,"week":3,"opponent":"pico","stage":"phillyTrain"},
  {"id":"philly-nice","name":"Philly Nice","file":"Philly-Nice","bpm":175,"week":3,"opponent":"pico","stage":"phillyTrain"},
  {"id":"blammed","name":"Blammed","file":"Blammed","bpm":165,"week":3,"opponent":"pico","stage":"phillyTrain"},
  {"id":"satin-panties","name":"Satin Panties","file":"Satin-Panties","bpm":110,"week":4,"opponent":"mom-car","stage":"limoRide"},
  {"id":"high","name":"High","file":"High","bpm":125,"week":4,"opponent":"mom-car","stage":"limoRide"},
  {"id":"milf","name":"M.I.L.F","file":"Milf","bpm":180,"week":4,"opponent":"mom-car","stage":"limoRide"},
  {id:'bopeebo', name:'Bopeebo', file:'Bopeebo', bpm:100,week:1},
  {id:'fresh', name:'Fresh', file:'Fresh', bpm:120,week:1},
  {id:'dadbattle', name:'Dad Battle', file:'Dadbattle', bpm:180,week:1},
  {id:'spookeez',name:'Spookeez',file:'Spookeez',bpm:150,week:2,opponent:'spooky',stage:'spookyMansion'},
  {id:'south',name:'South',file:'South',bpm:165,week:2,opponent:'spooky',stage:'spookyMansion'},
  {id:'monster',name:'Monster',file:'Monster',bpm:95,week:2,opponent:'monster',stage:'spookyMansion'}
];
SONGS.sort((a,b)=>a.week-b.week);
export const WEEKS=[{id:0,name:'TUTORIAL',songs:['tutorial']},{id:1,name:'DADDY DEAREST',songs:['bopeebo','fresh','dadbattle']},{id:2,name:'SPOOKY MONTH',songs:['spookeez','south','monster']},{id:3,name:'PICO',songs:['pico','philly-nice','blammed']},{id:4,name:'MOMMY MUST MURDER',songs:['satin-panties','high','milf']},{id:5,name:'RED SNOW',songs:['cocoa','eggnog','winter-horrorland']},{id:6,name:'HATING SIMULATOR FT. MOAWLING',songs:['senpai','roses','thorns']}];
export const DIFFICULTIES=['Easy','Normal','Hard'];
export const DEFAULT_SETTINGS=Object.freeze({volume:0.7,sfxVolume:0.7,downscroll:false,middlescroll:false,ghostTapping:true,offset:0,scrollSpeed:1,practice:false,botplay:false,reducedMotion:false,backgroundDim:0,keys:['KeyA','KeyS','KeyW','KeyD'],keys6:['KeyS','KeyD','KeyF','KeyJ','KeyK','KeyL'],keyMode:4,touchLayout:'auto'});
export const HIT_WINDOW=166;
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function readJSON(text){return JSON.parse(text.replace(/\0/g,'').trim());}
export function parseChart(data){
  const song=data.song||data;let bpm=Number(song.bpm)||100;let start=0;
  const laneCount=song.keyCount===6?6:4;const notes=[],sections=[],tempos=[{time:0,beat:0,bpm}];let beats=0;
  for(const section of song.notes){
    if(section.changeBPM&&Number(section.bpm)>0){bpm=Number(section.bpm);tempos.push({time:start,beat:beats,bpm});}
    const steps=Number(section.lengthInSteps)||16;
    sections.push({start,end:start+steps*60000/bpm/4,player:!!section.mustHitSection,bpm});
    for(const raw of section.sectionNotes||[]){
      const [time,lane,length]=raw;if(!Number.isFinite(time)||!Number.isFinite(lane)||lane<0)continue;
      notes.push({time,lane:lane%laneCount,player:lane>=laneCount?!section.mustHitSection:!!section.mustHitSection,length:Math.max(0,Number(length)||0),kind:raw[3]||null,params:raw[4]||null,altAnim:!!section.altAnim});
    }
    start+=steps*60000/bpm/4;beats+=steps/4;
  }
  notes.sort((a,b)=>a.time-b.time||a.lane-b.lane||Number(a.player)-Number(b.player));
  // Editors sometimes emitted identical notes at a section boundary.
  const unique=notes.filter((n,i)=>!notes.slice(Math.max(0,i-8),i).some(p=>p.player===n.player&&p.lane===n.lane&&Math.abs(p.time-n.time)<1));
  let chartEnd=start;for(const n of unique)chartEnd=Math.max(chartEnd,n.time+n.length);
  return {notes:unique,laneCount,sections,tempos,bpm:Number(song.bpm)||100,speed:Number(song.speed)||1,name:song.song,chartEnd,events:Array.isArray(song.events)?song.events:[]};
}
export function beatAt(chart,time){let tempo=chart.tempos[0];for(const t of chart.tempos){if(t.time>time)break;tempo=t;}return tempo.beat+(time-tempo.time)*tempo.bpm/60000;}
export function bpmAt(chart,time){let bpm=chart.bpm;for(const t of chart.tempos){if(t.time>time)break;bpm=t.bpm;}return bpm;}
export function dancePeriod(bpm){return bpm>=150?2:1;}
export function judgement(delta){const a=Math.abs(delta);if(a>HIT_WINDOW)return null;if(a<=45)return {name:'sick',score:350,weight:1};if(a<=90)return {name:'good',score:200,weight:0.75};if(a<=135)return {name:'bad',score:100,weight:0.5};return {name:'shit',score:50,weight:0.25};}
export function nearestNote(notes,lane,time){let found=null;for(const n of notes){if(n.time>time+HIT_WINDOW)break;if(!n.player||n.hit||n.missed||n.lane!==lane||Math.abs(n.time-time)>HIT_WINDOW)continue;if(!found||Math.abs(n.time-time)<Math.abs(found.time-time))found=n;}return found;}
export function makeStats(){return {score:0,combo:0,maxCombo:0,misses:0,hits:0,weight:0,health:1,judgements:{sick:0,good:0,bad:0,shit:0},offsets:[],holdTicks:0};}
export function applyHit(stats,delta){const j=judgement(delta);if(!j)return null;stats.hits++;stats.combo++;stats.maxCombo=Math.max(stats.maxCombo,stats.combo);stats.score+=j.score;stats.weight+=j.weight;stats.health=clamp(stats.health+0.023,0,2);stats.judgements[j.name]++;stats.offsets.push(delta);return j;}
export function applyMiss(stats){stats.misses++;stats.combo=0;stats.score-=10;stats.health=clamp(stats.health-0.12,0,2);}
export function accuracy(stats){return stats.hits+stats.misses?stats.weight/(stats.hits+stats.misses)*100:100;}
export function rank(stats){const a=accuracy(stats);return stats.misses===0&&stats.hits>0?'FC':a>=95?'S':a>=90?'A':a>=80?'B':a>=70?'C':'D';}
export function normalizeSettings(raw={}){
  const s={...DEFAULT_SETTINGS};for(const k of ['downscroll','middlescroll','ghostTapping','practice','botplay','reducedMotion'])if(typeof raw[k]==='boolean')s[k]=raw[k];
  for(const [k,min,max] of [['volume',0,1],['sfxVolume',0,1],['offset',-300,300],['scrollSpeed',0.5,3],['backgroundDim',0,0.8]])if(Number.isFinite(raw[k]))s[k]=clamp(raw[k],min,max);
  if(Array.isArray(raw.keys)&&raw.keys.length===4&&new Set(raw.keys).size===4&&raw.keys.every(k=>/^Key[A-Z]$|^Digit\d$|^Semicolon$|^Quote$|^Comma$|^Period$|^Slash$|^Bracket(Left|Right)$/.test(k)))s.keys=[...raw.keys];else s.keys=[...DEFAULT_SETTINGS.keys];s.keyMode=raw.keyMode===6?6:4;s.touchLayout=['auto','on','off'].includes(raw.touchLayout)?raw.touchLayout:'auto';s.keys6=Array.isArray(raw.keys6)&&raw.keys6.length===6&&new Set(raw.keys6).size===6&&raw.keys6.every(k=>/^Key[A-Z]$|^Digit\d$|^Semicolon$|^Quote$|^Comma$|^Period$|^Slash$|^Bracket(Left|Right)$/.test(k))?[...raw.keys6]:[...DEFAULT_SETTINGS.keys6];return s;
}
