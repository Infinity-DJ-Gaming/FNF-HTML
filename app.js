// Friday Night Funkin Tutorial, Weeks 1–7, Weekend 1 and Sky Reborn — independent browser engine. See NOTICE.

// ---- core.mjs ----
// Original browser engine. Charts are interpreted from classic FNF v0.2.7.1.
const SONGS = [
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
const WEEKS=[{id:0,name:'TUTORIAL',songs:['tutorial']},{id:1,name:'DADDY DEAREST',songs:['bopeebo','fresh','dadbattle']},{id:2,name:'SPOOKY MONTH',songs:['spookeez','south','monster']},{id:3,name:'PICO',songs:['pico','philly-nice','blammed']},{id:4,name:'MOMMY MUST MURDER',songs:['satin-panties','high','milf']},{id:5,name:'RED SNOW',songs:['cocoa','eggnog','winter-horrorland']},{id:6,name:'HATING SIMULATOR FT. MOAWLING',songs:['senpai','roses','thorns']}];
const DIFFICULTIES=['Easy','Normal','Hard'];
const DEFAULT_SETTINGS=Object.freeze({volume:0.7,sfxVolume:0.7,downscroll:false,middlescroll:false,ghostTapping:true,offset:0,scrollSpeed:1,practice:false,botplay:false,reducedMotion:false,backgroundDim:0,keys:['KeyA','KeyS','KeyW','KeyD'],keys6:['KeyS','KeyD','KeyF','KeyJ','KeyK','KeyL'],keyMode:4,touchLayout:'auto'});
const HIT_WINDOW=166;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function readJSON(text){return JSON.parse(text.replace(/\0/g,'').trim());}
function parseChart(data){
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
function beatAt(chart,time){let tempo=chart.tempos[0];for(const t of chart.tempos){if(t.time>time)break;tempo=t;}return tempo.beat+(time-tempo.time)*tempo.bpm/60000;}
function bpmAt(chart,time){let bpm=chart.bpm;for(const t of chart.tempos){if(t.time>time)break;bpm=t.bpm;}return bpm;}
function dancePeriod(bpm){return bpm>=150?2:1;}
function judgement(delta){const a=Math.abs(delta);if(a>HIT_WINDOW)return null;if(a<=45)return {name:'sick',score:350,weight:1};if(a<=90)return {name:'good',score:200,weight:0.75};if(a<=135)return {name:'bad',score:100,weight:0.5};return {name:'shit',score:50,weight:0.25};}
function nearestNote(notes,lane,time){let found=null;for(const n of notes){if(n.time>time+HIT_WINDOW)break;if(!n.player||n.hit||n.missed||n.lane!==lane||Math.abs(n.time-time)>HIT_WINDOW)continue;if(!found||Math.abs(n.time-time)<Math.abs(found.time-time))found=n;}return found;}
function makeStats(){return {score:0,combo:0,maxCombo:0,misses:0,hits:0,weight:0,health:1,judgements:{sick:0,good:0,bad:0,shit:0},offsets:[],holdTicks:0};}
function applyHit(stats,delta){const j=judgement(delta);if(!j)return null;stats.hits++;stats.combo++;stats.maxCombo=Math.max(stats.maxCombo,stats.combo);stats.score+=j.score;stats.weight+=j.weight;stats.health=clamp(stats.health+0.023,0,2);stats.judgements[j.name]++;stats.offsets.push(delta);return j;}
function applyMiss(stats){stats.misses++;stats.combo=0;stats.score-=10;stats.health=clamp(stats.health-0.12,0,2);}
function accuracy(stats){return stats.hits+stats.misses?stats.weight/(stats.hits+stats.misses)*100:100;}
function rank(stats){const a=accuracy(stats);return stats.misses===0&&stats.hits>0?'FC':a>=95?'S':a>=90?'A':a>=80?'B':a>=70?'C':'D';}
function normalizeSettings(raw={}){
  const s={...DEFAULT_SETTINGS};for(const k of ['downscroll','middlescroll','ghostTapping','practice','botplay','reducedMotion'])if(typeof raw[k]==='boolean')s[k]=raw[k];
  for(const [k,min,max] of [['volume',0,1],['sfxVolume',0,1],['offset',-300,300],['scrollSpeed',0.5,3],['backgroundDim',0,0.8]])if(Number.isFinite(raw[k]))s[k]=clamp(raw[k],min,max);
  if(Array.isArray(raw.keys)&&raw.keys.length===4&&new Set(raw.keys).size===4&&raw.keys.every(k=>/^Key[A-Z]$|^Digit\d$|^Semicolon$|^Quote$|^Comma$|^Period$|^Slash$|^Bracket(Left|Right)$/.test(k)))s.keys=[...raw.keys];else s.keys=[...DEFAULT_SETTINGS.keys];s.keyMode=raw.keyMode===6?6:4;s.touchLayout=['auto','on','off'].includes(raw.touchLayout)?raw.touchLayout:'auto';s.keys6=Array.isArray(raw.keys6)&&raw.keys6.length===6&&new Set(raw.keys6).size===6&&raw.keys6.every(k=>/^Key[A-Z]$|^Digit\d$|^Semicolon$|^Quote$|^Comma$|^Period$|^Slash$|^Bracket(Left|Right)$/.test(k))?[...raw.keys6]:[...DEFAULT_SETTINGS.keys6];return s;
}


// ---- story-flow.mjs ----
// Native story sequences run once on entry; retries and editor tests go straight to countdown.
function songIntro(id,{story=false,retry=false,editor=false,character='bf',variant=null}={}){if(retry||editor)return null;if(id==='winter-horrorland')return id;return (story&&['senpai','roses','thorns'].includes(id)||(character==='pico'||variant==='pico')&&['senpai','roses'].includes(id))?id:null;}
function songOutro(id,{variant=null}={}){return id==='eggnog'&&variant==='erect'?'eggnog-erect-outro':null;}
function pixelStage(choice){return /^school(?:Evil)?(?:Erect)?$/.test(choice?.stage||'')||Object.values(choice?.characters||{}).some(id=>/-pixel(?:-|$)/.test(id||''));}

function rosesFade(id,{story=false,variant=null,time=0}={}){if(id!=='roses'||!story||variant==='pico'||variant==='erect')return{red:0,hud:1};return{red:Math.max(0,Math.min(1,(time-90000)/2000)),hud:1-Math.max(0,Math.min(1,(time-90000)/1500))};}


// ---- builtin-audio.mjs ----
// Vocal stems in the built-in catalog are already aligned to their native vocal offsets.
// An alternate instrumental may add a shared extra vocal offset (Roses: +4000/-4000).
function builtinTrackOffsets(record,instrumental=null){const offsets=record?.metadataOffsets||{},inst=Number(offsets.instrumental)||0;if(!instrumental)return[inst,inst];const alternate=Number(offsets.altInstrumentals?.[instrumental])||0,values=Object.values(offsets.altVocals?.[instrumental]||{}).map(Number).filter(Number.isFinite),vocal=values.length&&values.every(v=>v===values[0])?values[0]:0;return[inst+alternate,inst+alternate+vocal];}


// ---- rhythm.mjs ----
const SIX_DIRECTIONS=[0,2,3,0,1,3];
const SIX_KEYS=['KeyS','KeyD','KeyF','KeyJ','KeyK','KeyL'];
function chartForSixKeys(chart){
 if(chart.laneCount===6)return structuredClone(chart);
 const result={...chart,laneCount:6},notes=[],occupied=new Map();
 for(const [i,n] of chart.notes.entries()){const pair=n.lane===0?[0,3]:n.lane===3?[2,5]:n.lane===2?[1]:[4],lane=pair[Math.floor(n.time/Math.max(1,60000/bpmAt(chart,n.time)))%pair.length],copy={...n,lane,originalLane:n.lane,generated:false};notes.push(copy);}
 for(const n of notes){const key=Number(n.player)+':'+n.lane;if(!occupied.has(key))occupied.set(key,[]);occupied.get(key).push([n.time,n.time+n.length]);}
 const available=(lane,time,player)=>!(occupied.get(Number(player)+':'+lane)||[]).some(([start,end])=>time>=start-95&&time<=end+95);
 for(const [i,n] of chart.notes.entries()){if(i%3!==0||n.length>0)continue;const step=15000/bpmAt(chart,n.time),time=Math.round((n.time+Math.max(110,step))*1000)/1000;if(time>=chart.chartEnd-100)continue;const choices=i%2?[3,5,0,2]:[0,2,3,5],lane=choices.find(l=>available(l,time,n.player));if(lane===undefined)continue;notes.push({time,lane,player:n.player,length:0,originalLane:SIX_DIRECTIONS[lane],generated:true});const key=Number(n.player)+':'+lane;if(!occupied.has(key))occupied.set(key,[]);occupied.get(key).push([time,time]);}
 notes.sort((a,b)=>a.time-b.time||a.lane-b.lane||Number(a.player)-Number(b.player));result.notes=notes;return result;
}
function partnerDanceFrame(beat,bpm,{halfLength=15,fps=24,period=1}={}){const counter=Math.floor(Math.max(0,beat)/period),elapsed=((beat%period+period)%period)*60000/bpm;return (counter%2)*halfLength+Math.min(halfLength-1,Math.floor(elapsed*fps/1000));}
function nativeFacing(flipX,player=false){return player?!Boolean(flipX):Boolean(flipX);}
function laneAtPoint(x,left,width,count){return Math.max(0,Math.min(count-1,Math.floor((x-left)/Math.max(1,width)*count)));}


// ---- chart-tools.mjs ----
const cloneChart=value=>structuredClone(value);
function validateChart(input){
  const data=typeof input==='string'?readJSON(input):cloneChart(input);const song=data.song&&typeof data.song==='object'?data.song:data;
  if(!song||!Array.isArray(song.notes))throw new Error('Expected a classic FNF chart with a song.notes array.');
  if(song.notes.length>20000)throw new Error('This chart has too many sections (maximum 20,000).');
  song.song=String(song.song||'Untitled').slice(0,100);song.bpm=clamp(Number(song.bpm)||100,1,999);song.speed=clamp(Number(song.speed)||1,0.1,10);song.needsVoices=song.needsVoices!==false;song.player1=String(song.player1||'bf');song.player2=String(song.player2||'dad');
  song.keyCount=song.keyCount===6?6:4;const columns=song.keyCount*2;let count=0;for(const section of song.notes){section.lengthInSteps=clamp(Number(section.lengthInSteps)||16,0.000001,128);section.mustHitSection=!!section.mustHitSection;section.changeBPM=!!section.changeBPM;section.bpm=clamp(Number(section.bpm)||song.bpm,1,999);section.altAnim=!!section.altAnim;section.typeOfSection=0;if(!Array.isArray(section.sectionNotes))section.sectionNotes=[];section.sectionNotes=section.sectionNotes.filter(n=>Array.isArray(n)&&Number.isFinite(n[0])&&Number.isInteger(n[1])&&n[1]>=0&&n[1]<columns).map(n=>[Math.max(0,n[0]),n[1],Math.max(0,Number(n[2])||0),...(n.length>3?[String(n[3]).slice(0,80),...n.slice(4)]:[])]);count+=section.sectionNotes.length;}
  if(count>100000)throw new Error('This chart has too many notes (maximum 100,000).');if(!song.notes.length)song.notes.push(blankSection());return {song};
}
function blankSection(player=true){return {sectionNotes:[],lengthInSteps:16,mustHitSection:player,bpm:100,changeBPM:false,altAnim:false,typeOfSection:0};}
function sectionTimes(raw){return parseChart(raw).sections;}
function retimeChart(before,after){const old=sectionTimes(before),next=sectionTimes(after);for(const event of after.song.events||[]){const index=old.findIndex(section=>event.t>=section.start&&event.t<section.end);if(index>=0&&next[index])event.t=next[index].start+(event.t-old[index].start)*old[index].bpm/next[index].bpm;}after.song.notes.forEach((s,i)=>{if(!old[i]||!next[i])return;for(const note of s.sectionNotes){note[0]=Math.max(0,next[i].start+(note[0]-old[i].start)*old[i].bpm/next[i].bpm);note[2]=Math.max(0,note[2]*old[i].bpm/next[i].bpm);}});}
function copySectionNotes(raw,from,to,{replace=false}={}){const timing=sectionTimes(raw),source=raw.song.notes[from],target=raw.song.notes[to];if(!source||!target)throw new Error('Section does not exist.');const copied=source.sectionNotes.map(n=>[timing[to].start+(n[0]-timing[from].start)*timing[from].bpm/timing[to].bpm,n[1],n[2]*timing[from].bpm/timing[to].bpm,...n.slice(3)]);target.sectionNotes=replace?copied:[...target.sectionNotes,...copied];return copied;}
function exportChart(raw){const out=validateChart(raw);for(const s of out.song.notes)s.sectionNotes.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);return JSON.stringify(out,null,2);}

function insertChartSection(raw,index){const timing=sectionTimes(raw),at=timing[index];if(!at)throw Error('Section does not exist.');const duration=16*15000/at.bpm,section=blankSection(raw.song.notes[index].mustHitSection);section.bpm=at.bpm;section.changeBPM=(index?timing[index-1].bpm:raw.song.bpm)!==at.bpm;for(let i=index;i<raw.song.notes.length;i++)for(const note of raw.song.notes[i].sectionNotes)note[0]+=duration;for(const event of raw.song.events||[])if(event.t>=at.start)event.t+=duration;raw.song.notes.splice(index,0,section);return at.start;}
function deleteChartSection(raw,index){if(raw.song.notes.length<=1)throw Error('Keep at least one section.');const timing=sectionTimes(raw),at=timing[index];if(!at)throw Error('Section does not exist.');const duration=at.end-at.start,nextBpm=timing[index+1]?.bpm;raw.song.notes.splice(index,1);for(let i=index;i<raw.song.notes.length;i++)for(const note of raw.song.notes[i].sectionNotes)note[0]=Math.max(0,note[0]-duration);if(raw.song.notes[index]&&nextBpm!==undefined){raw.song.notes[index].bpm=nextBpm;raw.song.notes[index].changeBPM=nextBpm!==(index?timing[index-1].bpm:raw.song.bpm);}raw.song.events=(raw.song.events||[]).filter(event=>event.t<at.start||event.t>=at.end);for(const event of raw.song.events)if(event.t>=at.end)event.t-=duration;return Math.min(at.start,sectionTimes(raw).at(-1).end);}


// ---- assets.mjs ----
const RELEASE_WEBP = new Set(["SKYR_CHAR_BF_CANDY","SKYR_CHAR_DARNELL_BLAZIN_SKY","SKYR_CHAR_GF_CRUCIFIED","SKYR_CHAR_NENE_WIFEFOREVER","SKYR_CHAR_PICO_SKY","SKYR_CHAR_PLUSHBOOMBOX_CHRISTMAS","SKYR_CHAR_SCENECORESKY","SKYR_CHAR_SCENECORESKY_SHOOTIN","SKYR_CHAR_SKY","SKYR_CHAR_SKYANXIOUS","SKYR_CHAR_SKYMANIFEST","SKYR_CHAR_SKYMANIFEST_WET","SKYR_CHAR_SKYMINI","SKYR_CHAR_SKY_BLAZIN","SKYR_CHAR_SKY_CAR","SKYR_CHAR_SKY_CHRISTMAS","SKYR_CHAR_SKY_DARK","SKYR_CHAR_SKY_PLAYABLE","SKYR_CHAR_SKY_PLUSH","SKYR_FX_THESHIFTDARKERECT_BLURRYCUTOUT","SKYR_FX_THESHIFTDARKERECT_BOYFRIENDCUTOUT","SKYR_FX_THESHIFTDARK_BLURRYCUTOUT","SKYR_FX_THESHIFTDARK_BOYFRIENDCUTOUT","SKYR_STAGE_SHARED_IMAGES_PHILLYBLAZINERECT_SKYBLURERECT","SKYR_STAGE_SHARED_IMAGES_PHILLYBLAZINERECT_STREETBLURERECT","SKYR_STAGE_SHARED_IMAGES_SHIFT_CARDBOARD_BFCARDBOARD","SKYR_STAGE_SHARED_IMAGES_SHIFT_CARDBOARD_BFCARDBOARD_BLURRY","SKYR_STAGE_SHARED_IMAGES_SHIFT_ERECT_SEAMLESSHEARTS","SKYR_STAGE_SHARED_IMAGES_SHIFT_MANIFEST_GIYGAS","SKYR_STAGE_SHARED_IMAGES_SHIFT_MANIFEST_MANIFESTFLOOR","SKYR_STAGE_SHARED_IMAGES_SHIFT_MANIFEST_MANIFESTROCKET","SKYR_STAGE_SHARED_IMAGES_SHIFT_MANIFEST_MANIFESTWALL","SKYR_STAGE_SHARED_IMAGES_SKYPLAYABLE_SKY_MATERIALIZE","W7W1_BF_HOLDING_GF","W7W1_DARNELL_BLAZIN","W7W1_FX_MISTMID","W7W1_FX_PHILLYSKYBOX","W7W1_FX_PICOBLAZINDEATHCONFIRM","W7W1_FX_SPRAYCAN","W7W1_FX_SPRAYPAINTEXPLOSION","W7W1_FX_SPRAYPAINTEXPLOSIONEZ","W7W1_FX_TANKMANKILLED1","W7W1_GF_TANKMEN","W7W1_NENE_TANKMEN","W7W1_OTIS_SPEAKER","W7W1_PICO_BLAZIN","W7W1_PICO_HOLDING_NENE","W7W1_PICO_PLAYABLE","W7W1_PICO_SPEAKER","W7W1_STORY_NENE","W7W1_TANKMAN","W7W1_TANKMAN_BLOODY","W7W1_WEEK7_IMAGES_CITYRUINS2","W7W1_WEEK7_IMAGES_ERECT_BG","W7W1_WEEK7_IMAGES_ERECT_SNIPER","W7W1_WEEK7_IMAGES_SMOKELEFT","W7W1_WEEK7_IMAGES_SMOKERIGHT","W7W1_WEEKEND1_IMAGES_PHILLYBLAZIN_STREETBLUR","W7W1_WEEKEND1_IMAGES_PHILLYSTREETS_ERECT_PAPER","W7W1_WEEKEND1_IMAGES_PHILLYSTREETS_ERECT_PHILLYFOREGROUND","W7W1_WEEKEND1_IMAGES_PHILLYSTREETS_PHILLYFOREGROUND","W7W1_WEEKEND1_IMAGES_PHILLYSTREETS_PHILLYSMOG"]);

class Assets {
  constructor(){this.images={};this.atlases={};this.groups=new Map();this.pending=new Map();this.lazyNames=new Set();}
  async load(progress){const response=await fetch('atlases.json');if(!response.ok)throw new Error('Could not load sprite index');this.atlases=await response.json();const extraResponse=await fetch('extra-images.json');const extras=extraResponse.ok?await extraResponse.json():[];const names=[...new Set([...Object.keys(this.atlases),...extras,'menuBG','menuBGBlue','menuBGMagenta','menuDesat','stageback','stagefront','stagecurtains','iconGrid','ready','set','go','sick','good','bad','shit'])],boot=new Set(['menuBG','menuBGBlue','menuBGMagenta','menuDesat','iconGrid','ready','set','go','sick','good','bad','shit','alphabet','NOTE_assets','FNF_main_menu_assets','campaign_menu_UI_assets','campaign_menu_UI_characters','gfDanceTitle','logoBumpin','titleEnter','STORY_SPOOKY','STORY_PICO','STORY_MOM','W56_storyparents','W56_storysenpai','HEALTH_bf','HEALTH_pico','HEALTH_dad','HEALTH_gf','HEALTH_spooky','HEALTH_monster','HEALTH_mom']);this.lazyNames=new Set(names.filter(name=>!boot.has(name)));let count=0;await Promise.all(names.filter(name=>boot.has(name)).map(async name=>{await this.ensure([name]);progress(++count/boot.size);}));
    try{await document.fonts.load('24px VCR');}catch{}
  }
  async ensure(names){await Promise.all([...new Set(names)].filter(Boolean).map(async name=>{if(this.images[name])return;if(!this.pending.has(name)){const promise=(async()=>{const img=new Image();img.src=`${name}.${RELEASE_WEBP.has(name)?'webp':'png'}`;await img.decode();this.images[name]=img;})();this.pending.set(name,promise);promise.finally(()=>this.pending.delete(name)).catch(()=>{});}return this.pending.get(name);}));}
  releaseUnused(names){const keep=new Set(names);for(const name of this.lazyNames)if(!keep.has(name))delete this.images[name];}
  frames(atlas,prefix){const key=atlas+'|'+prefix;if(!this.groups.has(key))this.groups.set(key,(this.atlases[atlas]||[]).filter(f=>f.name?.startsWith(prefix)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})));return this.groups.get(key);}
  frame(atlas,prefix,index=0){const f=this.frames(atlas,prefix);return f[Math.max(0,Math.min(f.length-1,Math.floor(index)))];}
  draw(ctx,atlas,frame,x,y,scale=1,alpha=1){if(!frame)return;const img=this.images[atlas];if(!img)return;ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(img,frame.sourceX??frame.x,frame.sourceY??frame.y,frame.sourceWidth??frame.width,frame.sourceHeight??frame.height,x-(frame.frameX||0)*scale,y-(frame.frameY||0)*scale,frame.width*scale,frame.height*scale);ctx.restore();}
  anim(ctx,atlas,prefix,x,y,scale,time,{fps=24,loop=true,alpha=1}={}){const f=this.frames(atlas,prefix);if(!f.length)return;const index=Math.floor(Math.max(0,time)*fps/1000);this.draw(ctx,atlas,f[loop?index%f.length:Math.min(index,f.length-1)],x,y,scale,alpha);}
  image(ctx,name,x,y,width,height,alpha=1){const img=this.images[name];if(!img)return;ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(img,x,y,width??img.width,height??img.height);ctx.restore();}
  // Original hand-drawn alphabet, matching the classic Freeplay and pause menus.
  letters(ctx,text,x,y,scale=1,{align='left',alpha=1}={}){const glyphs=[...text.toUpperCase()].map(c=>c===' '?null:this.frame('alphabet',c+' bold'));const width=glyphs.reduce((sum,g)=>sum+(g?g.width+3:32)*scale,0);let dx=x-(align==='center'?width/2:align==='right'?width:0);for(let i=0;i<glyphs.length;i++){const f=glyphs[i];if(f)this.draw(ctx,'alphabet',f,dx,y,scale,alpha);dx+=(f?f.width+3:32)*scale;}return width;}
}


// ---- audio.mjs ----
class AudioEngine {
  constructor(settings){this.settings=settings;this.cache=new Map();this.effects=new Map();this.sources=[];this.menu=null;this.menuFile='';this.position=0;this.running=false;this.ctx=null;this.buffers=null;this.trackOffsets=[];this.trackRoles=[];this.musicURLs=new Set();this.allowVoices=true;}
  async unlock(){
    if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=256;this.analyser.minDecibels=-65;this.analyser.maxDecibels=-25;this.analyser.smoothingTimeConstant=0.72;this.analyser.connect(this.master);this.frequencyData=new Uint8Array(this.analyser.frequencyBinCount);this.music=this.ctx.createGain();this.music.connect(this.analyser);this.voices=this.ctx.createGain();this.voices.connect(this.analyser);this.fx=this.ctx.createGain();this.fx.connect(this.master);this.updateVolume();}
    if(this.ctx.state==='suspended')await this.ctx.resume();
  }
  updateVolume(){if(this.master){this.master.gain.value=this.settings.volume;this.fx.gain.value=this.settings.sfxVolume;this.music.gain.value=1;this.voices.gain.value=this.allowVoices?1:0;}if(this.menu)this.menu.volume=this.settings.volume*0.8;}
  async load(url){if(!this.cache.has(url)){const promise=(async()=>{await this.unlock();const r=await fetch(url);if(!r.ok)throw new Error(`Audio unavailable: ${url}`);return this.ctx.decodeAudioData(await r.arrayBuffer());})();this.cache.set(url,promise);promise.catch(()=>this.cache.delete(url));}return this.cache.get(url);}
  playMenu(file='freakyMenu'){
    if(this.menuFile===file&&this.menu){this.menu.play().catch(()=>{});return;}
    this.stopMenu();this.menuFile=file;this.menu=new Audio(`${file}.ogg`);this.menu.loop=true;this.menu.volume=this.settings.volume*0.8;this.menu.play().catch(()=>{});
  }
  stopMenu(){if(this.menu){this.menu.pause();this.menu.currentTime=0;}this.menu=null;this.menuFile='';}
  async sfx(name,volume=1){try{await this.unlock();const buffer=await this.load(`${name}.ogg`);const s=this.ctx.createBufferSource(),g=this.ctx.createGain();s.buffer=buffer;g.gain.value=volume;s.connect(g);g.connect(this.fx);s.onended=()=>{s.disconnect();g.disconnect();};s.start();}catch(e){console.warn('Sound effect could not play',name,e.message);}}
  async prepare(file){await this.unlock();this.buffers=await Promise.all(['Inst','Voices'].map(n=>this.load(`${file}_${n}.ogg`)));return this.buffers[0].duration*1000;}
  async warmEffects(){await Promise.all(['intro1','intro2','intro3','introGo','missnote1','missnote2','missnote3','scrollMenu','confirmMenu','cancelMenu','fnf_loss_sfx','thunder_1','thunder_2'].map(n=>this.load(`${n}.ogg`).catch(()=>null)));}
  trimSongs(keep=[]){for(const url of keep)this.musicURLs.add(url);const songs=[...this.musicURLs].filter(k=>this.cache.has(k));let remaining=songs.length;for(const key of songs)if(remaining>Math.max(2,keep.length)&&!keep.includes(key)){this.cache.delete(key);this.musicURLs.delete(key);remaining--;}}
  spectrum(){if(this.analyser&&this.running)this.analyser.getByteFrequencyData(this.frequencyData);return this.frequencyData||new Uint8Array(128);}
  start(position=0){
    this.stopSources();this.stopMenu();this.position=position;this.clockStart=this.ctx.currentTime;this.running=true;this.voices.gain.cancelScheduledValues(this.ctx.currentTime);this.voices.gain.value=this.allowVoices?1:0;
    this.sources=this.buffers.map((buffer,i)=>{const s=this.ctx.createBufferSource();s.buffer=buffer;s.connect(i===0||this.trackRoles[i]==='opponent'&&this.allowVoices?this.music:this.voices);const trackOffset=(this.trackOffsets[i]||0)/1000,relative=position/1000-trackOffset,delay=Math.max(0,-relative),offset=Math.max(0,relative);if(offset<buffer.duration)s.start(this.ctx.currentTime+delay,offset);return s;});
  }
  time(){return this.running?this.position+(this.ctx.currentTime-this.clockStart)*1000:this.position;}
  pause(){if(!this.running)return;this.position=this.time();this.running=false;this.stopSources();}
  resume(){this.start(this.position);}
  stopSources(){for(const s of this.sources){try{s.stop();}catch{}s.disconnect();}this.sources=[];}
  stop(){this.position=0;this.running=false;this.stopSources();}
  muteVoices(muted){if(this.voices)this.voices.gain.setTargetAtTime(muted||!this.allowVoices?0:1,this.ctx.currentTime,0.015);}
}


// ---- zip.mjs ----
// Lazy, read-only ZIP access. Files remain Blobs; archives are never extracted to disk.
const ZIP_LIMITS={archive:1024*1024*1024,entry:128*1024*1024,directory:32*1024*1024,entries:50000};
const ZIP_CRC_TABLE=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function zipCRC32(bytes){let crc=0xffffffff;for(const b of bytes)crc=ZIP_CRC_TABLE[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function zipSafePath(value){const path=String(value).replaceAll('\\','/');if(!path||path.startsWith('/')||/^[a-z]:/i.test(path)||path.includes('\0')||path.split('/').some(p=>p==='..'))throw new Error('Unsafe path in ZIP archive.');return path.split('/').filter(p=>p&&p!=='.').join('/');}
const ZIP_MIME={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',ogg:'audio/ogg',mp3:'audio/mpeg',wav:'audio/wav',mp4:'video/mp4',json:'application/json',xml:'application/xml'};
async function zipReadLimited(stream,limit){const reader=stream.getReader(),chunks=[];let length=0;while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw new Error('ZIP entry expands beyond its declared size.');}chunks.push(value);}const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;}
class ZipArchive {
  constructor(blob){this.blob=blob;this.entries=new Map();this.casePaths=new Map();this.urls=new Map();this.jsonCache=new Map();}
  static async open(blob){
    if(!(blob instanceof Blob))throw new Error('Choose a ZIP or FNFC file.');if(blob.size>ZIP_LIMITS.archive)throw new Error('This ZIP is larger than the 1 GiB browser import limit.');
    const zip=new ZipArchive(blob),tailStart=Math.max(0,blob.size-65557),tail=new Uint8Array(await blob.slice(tailStart).arrayBuffer()),view=new DataView(tail.buffer);let end=-1;
    for(let i=tail.length-22;i>=0;i--)if(view.getUint32(i,true)===0x06054b50&&i+22+view.getUint16(i+20,true)<=tail.length){end=i;break;}
    if(end<0)throw new Error('This file is not a complete ZIP archive.');if(view.getUint16(end+4,true)||view.getUint16(end+6,true))throw new Error('Multi-part ZIP archives are not supported.');
    let count=view.getUint16(end+10,true),size=view.getUint32(end+12,true),offset=view.getUint32(end+16,true);
    if(count===65535||size===0xffffffff||offset===0xffffffff){const locatorOffset=tailStart+end-20;if(locatorOffset<0)throw new Error('Invalid ZIP64 archive.');const locator=new DataView(await blob.slice(locatorOffset,locatorOffset+20).arrayBuffer());if(locator.getUint32(0,true)!==0x07064b50)throw new Error('ZIP64 directory is missing.');const recordOffset=Number(locator.getBigUint64(8,true)),record=new DataView(await blob.slice(recordOffset,recordOffset+56).arrayBuffer());if(record.getUint32(0,true)!==0x06064b50)throw new Error('Invalid ZIP64 directory.');count=Number(record.getBigUint64(32,true));size=Number(record.getBigUint64(40,true));offset=Number(record.getBigUint64(48,true));}
    if(!Number.isSafeInteger(offset)||count>ZIP_LIMITS.entries||size>ZIP_LIMITS.directory||offset+size>blob.size)throw new Error('ZIP directory is too large or invalid.');
    const directory=new Uint8Array(await blob.slice(offset,offset+size).arrayBuffer()),dv=new DataView(directory.buffer),decoder=new TextDecoder();zip.signature=zipCRC32(directory).toString(16)+'-'+blob.size;
    let cursor=0;for(let n=0;n<count;n++){
      if(cursor+46>directory.length||dv.getUint32(cursor,true)!==0x02014b50)throw new Error('Corrupt ZIP directory.');const flags=dv.getUint16(cursor+8,true),method=dv.getUint16(cursor+10,true),crc=dv.getUint32(cursor+16,true),nameLength=dv.getUint16(cursor+28,true),extraLength=dv.getUint16(cursor+30,true),commentLength=dv.getUint16(cursor+32,true);let compressed=dv.getUint32(cursor+20,true),uncompressed=dv.getUint32(cursor+24,true),local=dv.getUint32(cursor+42,true);const extraStart=cursor+46+nameLength,extraEnd=extraStart+extraLength;if(extraEnd+commentLength>directory.length)throw new Error('Corrupt ZIP filename.');
      if(compressed===0xffffffff||uncompressed===0xffffffff||local===0xffffffff){let p=extraStart;while(p+4<=extraEnd){const id=dv.getUint16(p,true),len=dv.getUint16(p+2,true);p+=4;if(id===1){let q=p;if(uncompressed===0xffffffff){uncompressed=Number(dv.getBigUint64(q,true));q+=8;}if(compressed===0xffffffff){compressed=Number(dv.getBigUint64(q,true));q+=8;}if(local===0xffffffff)local=Number(dv.getBigUint64(q,true));break;}p+=len;}}
      const original=decoder.decode(directory.subarray(cursor+46,cursor+46+nameLength)),path=zipSafePath(original);cursor=extraEnd+commentLength;if(original.endsWith('/'))continue;if(flags&1)throw new Error('Encrypted ZIP entries are not supported.');if(uncompressed>ZIP_LIMITS.entry||local+compressed>blob.size)throw new Error(`ZIP entry is too large or invalid: ${path}`);if(zip.casePaths.has(path.toLowerCase()))throw new Error(`ZIP contains duplicate file paths: ${path}`);
      zip.entries.set(path,{path,method,flags,crc,compressed,uncompressed,local});zip.casePaths.set(path.toLowerCase(),path);
    }
    return zip;
  }
  find(path){return this.casePaths.get(String(path).replaceAll('\\','/').toLowerCase())||null;}
  suffix(path){const ending=String(path).toLowerCase();return [...this.entries.keys()].find(p=>p.toLowerCase().endsWith(ending))||null;}
  async bytes(path,{max=ZIP_LIMITS.entry}={}){
    path=this.find(path)||path;const entry=this.entries.get(path);if(!entry)throw new Error('Missing ZIP asset: '+path);if(entry.uncompressed>max)throw new Error('ZIP asset is too large: '+path);const local=new DataView(await this.blob.slice(entry.local,entry.local+30).arrayBuffer());if(local.getUint32(0,true)!==0x04034b50)throw new Error('Invalid ZIP entry header.');const start=entry.local+30+local.getUint16(26,true)+local.getUint16(28,true),compressed=this.blob.slice(start,start+entry.compressed);let data;
    if(entry.method===0)data=new Uint8Array(await compressed.arrayBuffer());else if(entry.method===8){let inflater;try{inflater=new DecompressionStream('deflate-raw');}catch{throw new Error('This browser cannot decompress this ZIP. Use an updated Chromium, Firefox or Safari browser.');}data=await zipReadLimited(compressed.stream().pipeThrough(inflater),Math.min(max,entry.uncompressed));}else throw new Error(`Unsupported ZIP compression method ${entry.method}.`);
    if(data.length!==entry.uncompressed||zipCRC32(data)!==entry.crc)throw new Error('ZIP integrity check failed: '+path);return data;
  }
  async json(path){if(!this.jsonCache.has(path))this.jsonCache.set(path,this.bytes(path,{max:16*1024*1024}).then(bytes=>JSON.parse(new TextDecoder().decode(bytes).replace(/^\uFEFF/,'').replace(/\0+$/,''))));return this.jsonCache.get(path);}
  async text(path){return new TextDecoder().decode(await this.bytes(path,{max:16*1024*1024}));}
  async url(path){const actual=this.find(path)||path;if(!this.urls.has(actual)){const bytes=await this.bytes(actual),ext=actual.split('.').at(-1).toLowerCase();this.urls.set(actual,URL.createObjectURL(new Blob([bytes],{type:ZIP_MIME[ext]||'application/octet-stream'})));}return this.urls.get(actual);}
  dispose(){for(const url of this.urls.values())URL.revokeObjectURL(url);this.urls.clear();this.jsonCache.clear();}
}


// ---- vslice.mjs ----
// Public V-Slice song metadata/chart format, adapted without executing mod scripts.
function vsliceLevels(metadata,chart){const requested=metadata.playData?.difficulties;return (Array.isArray(requested)&&requested.length?requested:Object.keys(chart.notes||{})).filter(name=>Array.isArray(chart.notes?.[name]));}
function vsliceToClassic(metadata,chart,difficulty,{durationMs=0}={}){
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


// ---- mod-visuals.mjs ----
function modAssetPath(zip,item,asset,extension){const [library,relative]=String(asset).includes(':')?String(asset).split(':',2):['',String(asset)],name=relative.replace(/^\/+/,''),ext=name.toLowerCase().endsWith('.'+extension)?'':'.'+extension;for(const candidate of [`${item.root}${library?library+'/':''}images/${name}${ext}`,`${item.root}images/${name}${ext}`,`${item.root}shared/images/${name}${ext}`,`${item.root}assets/${library?library+'/':''}images/${name}${ext}`,`${item.root}${name}${ext}`]){const found=zip.find(candidate);if(found)return found;}return zip.suffix('/images/'+name+ext)||zip.suffix('/'+name+ext);}
function modDataPath(zip,item,type,id){for(const candidate of [`${item.root}data/${type}/${id}.json`,`${item.root}assets/data/${type}/${id}.json`]){const found=zip.find(candidate);if(found)return found;}return zip.suffix(`/data/${type}/${id}.json`);}
async function modImage(zip,path){const img=new Image();img.src=await zip.url(path);await img.decode();if(img.width*img.height>64*1024*1024)throw new Error('Image exceeds the 64 megapixel browser texture limit.');return img;}
function modXMLFrames(xml){if(/<!DOCTYPE/i.test(xml))throw new Error('Unsupported XML document type.');const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.querySelector('parsererror'))throw new Error('Invalid sprite XML.');return [...doc.querySelectorAll('SubTexture')].map(el=>{const out={};for(const attr of el.attributes)out[attr.name]=attr.name==='name'?attr.value:Number(attr.value);return out;}).filter(f=>f.name&&f.width>0&&f.height>0);}
const MOD_IDENTITY=[1,0,0,1,0,0];
function modMatrixMultiply(p,q){const[a,b,c,d,x,y]=p,[e,f,g,h,u,v]=q;return[a*e+c*f,b*e+d*f,a*g+c*h,b*g+d*h,a*u+c*v+x,b*u+d*v+y];}
function modElementMatrix(el){if(Array.isArray(el.MX))return el.MX;const m=el.M3D;if(m)return[m.m00??m[0]??1,m.m01??m[1]??0,m.m10??m[4]??0,m.m11??m[5]??1,m.m30??m[12]??0,m.m31??m[13]??0];return MOD_IDENTITY;}
class ModAnimate {
  constructor(data,pages){this.data=data;this.pages=pages;this.symbols=new Map((data.SD?.S||[]).map(s=>[s.SN,s.TL]));this.root=data.AN?.TL||data.TL;this.cache=new Map();this.labels=[];for(const layer of this.root?.L||[])for(const f of layer.FR||[])if(f.N)this.labels.push({name:f.N,start:f.I,length:f.DU||1});this.width=500;this.height=500;this.bounds=null;}
  duration(tl){let duration=1;for(const l of tl.L||[])for(const f of l.FR||[])duration=Math.max(duration,f.I+(f.DU||1));return duration;}
  commands(prefix,time,fps=24,loop=false,indices=null){const label=this.labels.find(l=>l.name===prefix)||this.labels.find(l=>l.name.toLowerCase().startsWith(String(prefix).toLowerCase())),symbol=this.symbols.get(prefix),tl=symbol||this.root;if(!tl)return[];const start=symbol?0:label?.start||0,length=symbol?this.duration(symbol):label?.length||this.duration(tl),offset=Math.floor(Math.max(0,time)*fps/1000),index=start+(indices?.length?indices[loop?offset%indices.length:Math.min(indices.length-1,offset)]:(loop?offset%length:Math.min(length-1,offset))),key=(symbol?prefix:'root')+':'+index;if(this.cache.has(key))return this.cache.get(key);const commands=[];
    const walk=(timeline,frame,matrix,alpha,depth)=>{if(depth>30||commands.length>5000)return;for(const layer of [...(timeline.L||[])].reverse()){const fr=(layer.FR||[]).find(f=>f.I<=frame&&frame<f.I+(f.DU||1));if(!fr)continue;for(const el of fr.E||[]){if(el.SI){const si=el.SI,sub=this.symbols.get(si.SN);if(!sub)continue;const duration=this.duration(sub),offset=(si.FF||0)+(si.LP==='SF'?0:frame-fr.I),childFrame=si.LP==='LP'?offset%duration:Math.min(offset,duration-1);walk(sub,childFrame,modMatrixMultiply(matrix,modElementMatrix(si)),alpha*(si.C?.AM??si.C?.A??1),depth+1);}else if(el.ASI){const a=el.ASI,s=this.pages.sprites.get(a.N);if(s)commands.push({matrix:modMatrixMultiply(matrix,modElementMatrix(a)),sprite:s,alpha});}}}};
    walk(tl,index,MOD_IDENTITY,1,0);if(commands.length>5000)throw new Error('Animate frame is too complex for this browser player.');this.cache.set(key,commands);return commands;
  }
  measure(prefix){const commands=this.commands(prefix,0),points=[];for(const c of commands){const s=c.sprite,[a,b,d,e,x,y]=c.matrix,w=s.rotated?s.h:s.w,h=s.rotated?s.w:s.h;for(const [u,v] of [[0,0],[w,0],[0,h],[w,h]])points.push([a*u+d*v+x,b*u+e*v+y]);}if(points.length){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);this.bounds={x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};this.width=this.bounds.w;this.height=this.bounds.h;}}
  draw(ctx,prefix,time,fps,loop,indices=null){ctx.save();if(this.bounds)ctx.translate(-this.bounds.x,-this.bounds.y);for(const c of this.commands(prefix,time,fps,loop,indices)){const s=c.sprite;ctx.save();ctx.globalAlpha*=c.alpha;ctx.transform(...c.matrix);if(s.rotated){ctx.translate(0,s.w);ctx.rotate(-Math.PI/2);}ctx.drawImage(s.image,s.x,s.y,s.w,s.h,0,0,s.w,s.h);ctx.restore();}ctx.restore();}
}
async function modAnimateLoad(zip,item,asset){const animationPath=modAssetPath(zip,item,asset+'/Animation','json');if(!animationPath)return null;const folder=animationPath.slice(0,animationPath.lastIndexOf('/')+1),mapPaths=[...zip.entries.keys()].filter(p=>p.startsWith(folder)&&/^spritemap\d+\.json$/i.test(p.slice(folder.length))),sprites=new Map();for(const mapPath of mapPaths){const map=await zip.json(mapPath),imagePath=zip.find(mapPath.replace(/\.json$/i,'.png'));if(!imagePath)continue;const image=await modImage(zip,imagePath);for(const item of map.ATLAS?.SPRITES||[]){const s=item.SPRITE||item;sprites.set(s.name,{...s,image});}}if(!sprites.size)return null;return new ModAnimate(await zip.json(animationPath),{sprites});}
async function loadModVisuals(zip,item,assets,key){const result={characters:{},stage:null,report:[]},chars=item.metadata.playData?.characters||{},resources=new Map();
 async function loadResource(asset,renderType){const id=asset+'|'+renderType;if(resources.has(id))return resources.get(id);const promise=(async()=>{if(/animateatlas/i.test(renderType||'')){const animate=await modAnimateLoad(zip,item,asset);if(!animate)throw Error('Animate files are missing');return {animate,atlas:null};}const png=modAssetPath(zip,item,asset,'png'),xml=modAssetPath(zip,item,asset,'xml');if(!png||!xml)throw Error('PNG/XML atlas is missing');const image=await modImage(zip,png),frames=modXMLFrames(await zip.text(xml)),atlas='mod/'+key+'/resource'+resources.size;assets.images[atlas]=image;assets.atlases[atlas]=frames;return {animate:null,atlas,frames};})();resources.set(id,promise);return promise;}
 for(const role of ['player','opponent','girlfriend']){const id=chars[role];if(!id)continue;const path=modDataPath(zip,item,'characters',id);if(!path)continue;try{const meta=await zip.json(path);if(!meta.assetPath)continue;const config={id,meta,role,animations:meta.animations||[],scale:Number(meta.scale)||1,globalOffsets:meta.offsets||[0,0],width:400,height:500,animate:null,atlas:null,resources:{}};const unique=[{assetPath:meta.assetPath,renderType:meta.renderType},...config.animations.filter(a=>a.assetPath)];for(const animation of unique){const asset=animation.assetPath||meta.assetPath,type=animation.renderType||meta.renderType;try{config.resources[asset+'|'+type]=await loadResource(asset,type);}catch(e){result.report.push(id+': animation asset '+asset+' could not load ('+e.message+').');}}
  const base=config.resources[meta.assetPath+'|'+meta.renderType];if(!base)throw Error('Base character artwork is missing');Object.assign(config,base);const idle=config.animations.find(a=>a.name==='idle'||a.name==='danceLeft')||config.animations[0];if(base.animate){base.animate.measure(idle?.prefix||'idle');config.width=base.animate.width;config.height=base.animate.height;}else{const first=base.frames.find(f=>f.name.startsWith(idle?.prefix||''))||base.frames[0];config.width=first?.frameWidth||first?.width||400;config.height=first?.frameHeight||first?.height||500;}result.characters[role]=config;
 }catch(e){result.report.push(id+': custom character fallback used ('+e.message+').');}}
  const stageId=item.metadata.playData?.stage,stagePath=stageId?modDataPath(zip,item,'stages',stageId):null;if(stagePath){try{const metadata=await zip.json(stagePath),props=[];for(const [i,prop] of (metadata.props||[]).entries()){if(String(prop.assetPath||'').startsWith('#')){props.push({...prop,solid:prop.assetPath});continue;}const png=modAssetPath(zip,item,prop.assetPath,'png');if(!png){result.report.push(`Stage prop ${prop.name||i}: image is missing.`);continue;}const image=await modImage(zip,png),name=`mod/${key}/prop${i}`;assets.images[name]=image;const loaded={...prop,image:name,atlas:null};const xml=modAssetPath(zip,item,prop.assetPath,'xml');if(xml){assets.atlases[name]=modXMLFrames(await zip.text(xml));loaded.atlas=name;}props.push(loaded);}result.stage={metadata,props:props.sort((a,b)=>(a.zIndex||0)-(b.zIndex||0))};}catch(e){result.report.push(`Custom stage fallback used (${e.message}).`);}}
  return result;
}
function drawModCharacter(ctx,assets,config,{x,y,scale=0.65,direction='idle',animation=null,time=0,beat=0,bopBeats=1,player=false}={}){
 const dance=config.animations.some(a=>a.name==='danceLeft')?(Math.floor(Math.max(0,beat)/Math.max(0.00001,bopBeats))%2?'danceRight':'danceLeft'):'idle',requested=animation||(direction==='idle'?dance:'sing'+direction),anim=config.animations.find(a=>a.name===requested)||config.animations.find(a=>a.name===requested.replace('miss',''))||config.animations.find(a=>a.name===dance)||config.animations.find(a=>a.name==='idle')||config.animations[0]||{prefix:'idle'},asset=anim.assetPath||config.meta.assetPath,type=anim.renderType||config.meta.renderType,resource=config.resources?.[asset+'|'+type]||config,s=scale*config.scale,offset=anim.offsets||[0,0],global=config.globalOffsets||[0,0],fps=anim.frameRate||24,flip=nativeFacing(config.meta.flipX,player);
 ctx.save();ctx.translate(x-config.width*s/2-(global[0]||0)*s-offset[0]*s,y-config.height*s-(global[1]||0)*s-offset[1]*s);ctx.scale(s,s);if(flip){ctx.translate(config.width,0);ctx.scale(-1,1);}if(anim.flipX){ctx.translate(config.width,0);ctx.scale(-1,1);}if(anim.flipY){ctx.translate(0,config.height);ctx.scale(1,-1);}
 const indices=anim.frameIndices;if(resource.animate)resource.animate.draw(ctx,anim.prefix||anim.name,time,fps,!!anim.looped,indices);else{const frames=assets.frames(resource.atlas,anim.prefix||anim.name),offsetIndex=Math.floor(Math.max(0,time)*fps/1000),list=indices?.length?indices:frames.map((_,i)=>i),index=list[anim.looped?offsetIndex%list.length:Math.min(list.length-1,offsetIndex)];assets.draw(ctx,resource.atlas,frames[index]||frames[0],0,0,1);}ctx.restore();
}
function drawModStageProps(ctx,assets,stage,{foreground=false,time=0,worldScale=0.72,originX=180,originY=-20,pan=0}={}){if(!stage)return;for(const prop of stage.props){if(((prop.zIndex||0)>=350)!==foreground)continue;const pos=prop.position||[0,0],scale=Array.isArray(prop.scale)?prop.scale:[Number(prop.scale)||1,Number(prop.scale)||1],alpha=prop.alpha??1;ctx.save();ctx.globalAlpha*=alpha;const x=originX+pos[0]*worldScale-pan*(prop.scroll?.[0]??1),y=originY+pos[1]*worldScale;if(prop.solid){ctx.fillStyle=prop.solid;ctx.fillRect(x,y,scale[0]*worldScale,scale[1]*worldScale);}else if(prop.atlas){const anim=prop.animations?.find(a=>a.name===prop.startingAnimation)||prop.animations?.[0];assets.anim(ctx,prop.atlas,anim?.prefix||'',x,y,worldScale*scale[0],time,{fps:anim?.frameRate||24,loop:anim?.looped!==false});}else{const image=assets.images[prop.image];assets.image(ctx,prop.image,x,y,image.width*worldScale*scale[0],image.height*worldScale*scale[1]);}ctx.restore();}}


// ---- mods.mjs ----
const MOD_EVENTS=new Set(['FocusCamera','ZoomCamera','PlayAnimation','SetCameraBop','ScrollSpeed','SetTargetBopSpeed','SetHealthIcon']);
const MOD_EXTENSIONS=['ogg','mp3','wav'];
const MOD_ESCAPE=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function modRequest(request){return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
class ModLibrary {
  constructor(){this.records=[];this.archives=new Map();this.visuals=new Map();this.db=null;this.sessionOnly=false;}
  async init(){try{this.db=await new Promise((resolve,reject)=>{const request=indexedDB.open('fnf-browser-mods',1);request.onupgradeneeded=()=>request.result.createObjectStore('mods',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});this.records=await modRequest(this.db.transaction('mods').objectStore('mods').getAll());}catch{this.sessionOnly=true;}return this.songs();}
  async save(record){if(this.db){try{await new Promise((resolve,reject)=>{const tx=this.db.transaction('mods','readwrite');tx.objectStore('mods').put(record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});return true;}catch{this.sessionOnly=true;return false;}}return false;}
  async archive(record){if(!this.archives.has(record.id))this.archives.set(record.id,ZipArchive.open(record.blob));return this.archives.get(record.id);}
  findAudio(zip,root,songId,stem,near=''){for(const folder of [`${root}songs/${songId}/`,`${root}assets/songs/${songId}/`,near,root])for(const ext of MOD_EXTENSIONS){const found=zip.find(folder+stem+'.'+ext);if(found)return found;}return null;}
  async importFile(file,onProgress=()=>{}){
    onProgress('Reading ZIP directory…');const zip=await ZipArchive.open(file),id='zip-'+zip.signature;let manifest={};const manifestPath=zip.suffix('_polymod_meta.json');if(manifestPath){try{manifest=await zip.json(manifestPath);}catch(e){throw new Error('The mod manifest is invalid: '+e.message);}}
    const record={id,title:String(manifest.title||manifest.name||file.name.replace(/\.(zip|fnfc)$/i,'')),description:String(manifest.description||''),author:String(manifest.author||manifest.contributors?.map(c=>c.name).join(', ')||'Unknown'),version:String(manifest.mod_version||manifest.version||''),enabled:true,created:Date.now(),blob:file,size:file.size,items:[],report:[],scriptCount:0};
    const metadataPaths=[...zip.entries.keys()].filter(p=>/[^/]+-metadata(?:-[^/]+)?\.json$/i.test(p));record.scriptCount=[...zip.entries.keys()].filter(p=>/\.(hxc|hxs|hx|dll|exe|so|dylib)$/i.test(p)).length;
    if(record.scriptCount)record.report.push(`${record.scriptCount} script/native-code files are present. This player loads their song data and assets but does not execute Haxe scripts or native extensions.`);
    let done=0;for(const metadataPath of metadataPaths){onProgress(`Reading song metadata ${++done}/${metadataPaths.length}…`);const m=metadataPath.match(/^(.*\/)?(.+)-metadata(?:-(.+))?\.json$/i);if(!m)continue;const folder=m[1]||'',songId=m[2],variation=m[3]||'default',marker=metadataPath.toLowerCase().indexOf('data/songs/'),root=marker>=0?metadataPath.slice(0,marker):folder,chartPath=zip.find(folder+songId+'-chart'+(variation==='default'?'':'-'+variation)+'.json');
      if(!chartPath){record.report.push(`${songId}/${variation}: chart file is missing.`);continue;}
      let metadata,chart;try{metadata=await zip.json(metadataPath);chart=await zip.json(chartPath);}catch(e){record.report.push(`${songId}: invalid song JSON (${e.message}).`);continue;}
      if(metadata.timeFormat&&metadata.timeFormat!=='ms'){record.report.push(`${songId}: timeFormat "${metadata.timeFormat}" is not supported.`);continue;}const levels=vsliceLevels(metadata,chart);if(!levels.length){record.report.push(`${songId}: no playable difficulty arrays.`);continue;}
      const chars=metadata.playData?.characters||{},instId=chars.instrumental||'',inst=this.findAudio(zip,root,songId,'Inst'+(instId?'-'+instId:''),folder)||this.findAudio(zip,root,songId,'Inst'+(variation!=='default'?'-'+variation:''),folder)||this.findAudio(zip,root,songId,'Inst',folder);
      if(!inst){record.report.push(`${songId}/${variation}: instrumental audio is missing.`);continue;}
      const style=metadata.playData?.noteStyle;if(style&&!['funkin','normal'].includes(style))record.report.push(songId+': custom note style "'+style+'" uses the included arrow graphics.');
      if(levels.some(l=>chart.notes[l].some(n=>n.d>=8)))record.report.push(songId+': notes beyond the two standard strumlines are not playable in this browser.');
      const unknownEvents=[...new Set((chart.events||[]).map(e=>e.e).filter(e=>e&&!MOD_EVENTS.has(e)))],noteKinds=[...new Set(levels.flatMap(l=>chart.notes[l].map(n=>n.k).filter(Boolean)))];if(unknownEvents.length)record.report.push(`${songId}: custom events not implemented: ${unknownEvents.join(', ')}.`);if(noteKinds.length)record.report.push(`${songId}: custom note kinds are kept in exports; scripted mechanics are not run (${noteKinds.join(', ')}).`);
      record.items.push({key:songId+':'+variation,songId,variation,root,folder,metadataPath,chartPath,metadata,levels,instrumental:inst,defaultInstId:instId,name:String(metadata.songName||songId)+(variation==='default'?'':` (${variation})`),bpm:Number(metadata.timeChanges?.[0]?.bpm)||100,noteCounts:Object.fromEntries(levels.map(l=>[l,chart.notes[l].length])),unknownEvents,noteKinds});
    }
    if(!record.items.length)record.report.push('No playable V-Slice songs were found. Expected <song>-metadata.json, matching <song>-chart.json and an instrumental audio file.');
    if(record.items.length&&!record.report.length)record.report.push('Song charts, audio and supported visual assets are compatible.');this.archives.set(id,Promise.resolve(zip));const previous=this.records.find(r=>r.id===id);if(previous)record.created=previous.created;this.records=this.records.filter(r=>r.id!==id);this.records.push(record);onProgress('Saving this mod in your browser…');const persisted=await this.save(record);if(!persisted)record.report.push('Browser storage is unavailable or full; this mod is available for this session only.');return record;
  }
  songs(){return this.records.filter(r=>r.enabled).sort((a,b)=>a.created-b.created).flatMap(record=>record.items.map(item=>({id:`mod/${record.id}/${item.key}`,name:item.name,bpm:item.bpm,week:'MOD',mod:{recordId:record.id,itemKey:item.key},difficulties:item.levels,opponent:item.metadata.playData?.characters?.opponent||'dad',stage:item.metadata.playData?.stage||'mainStage',artist:item.metadata.artist||record.author,file:'mod'})));}
  item(song){const record=this.records.find(r=>r.id===song.mod.recordId),item=record?.items.find(i=>i.key===song.mod.itemKey);if(!record||!item)throw new Error('This mod is no longer enabled.');return {record,item};}
  choice(song,level,instrumental='default'){const {record,item}=this.item(song);if(!item.levels.includes(level))throw new Error('This mod has no '+level+' difficulty.');return {id:song.id,name:item.name,bpm:item.bpm,level,character:item.metadata.playData?.characters?.player?.includes('pico')?'pico':'bf',characters:item.metadata.playData?.characters||{},stage:item.metadata.playData?.stage||'mainStage',album:item.metadata.playData?.album||'volume1',chartUrl:`mod:${record.id}/${item.key}/${level}`,mod:{recordId:record.id,itemKey:item.key,instrumental},previewStart:item.metadata.playData?.previewStart??15000,previewEnd:item.metadata.playData?.previewEnd??45000,ratings:item.metadata.playData?.ratings||{}};}
  resolve(choice){const record=this.records.find(r=>r.id===choice.mod?.recordId),item=record?.items.find(i=>i.key===choice.mod?.itemKey);if(!record||!item)throw new Error('Mod data is unavailable.');return {record,item};}
  async chart(choice){const {record,item}=this.resolve(choice),zip=await this.archive(record);return vsliceToClassic(item.metadata,await zip.json(item.chartPath),choice.level);}
  instrumentals(song){const {item}=this.item(song);return ['default',...(item.metadata.playData?.characters?.altInstrumentals||[])];}
  async audioSources(choice){const {record,item}=this.resolve(choice),zip=await this.archive(record),chars=item.metadata.playData?.characters||{},selected=choice.mod.instrumental,alternate=selected&&selected!=='default',instId=alternate?selected:item.defaultInstId;let instrumental=alternate?this.findAudio(zip,item.root,item.songId,'Inst-'+instId,item.folder):item.instrumental;if(!instrumental)throw new Error('The selected instrumental is not included in this ZIP.');const offsets=item.metadata.offsets||{},useAlternateOffsets=alternate||!!instId&&(Object.hasOwn(offsets.altInstrumentals||{},instId)||Object.hasOwn(offsets.altVocals||{},instId)),baseOffset=useAlternateOffsets?(offsets.altInstrumentals?.[instId]??offsets.instrumental??0):(offsets.instrumental||0),paths=[instrumental],trackOffsets=[Number(baseOffset)||0];
    for(const side of ['player','opponent']){const ids=Array.isArray(chars[side+'Vocals'])?chars[side+'Vocals']:[chars[side]|| (side==='player'?'bf':'dad')];for(const original of ids){let char=original,found=null;while(char&&!found){for(const suffix of [item.variation==='default'?'':'-'+item.variation,'']){found=this.findAudio(zip,item.root,item.songId,'Voices-'+char+suffix,item.folder);if(found)break;}char=char.includes('-')?char.slice(0,char.lastIndexOf('-')):'';}if(found&&!paths.includes(found)){paths.push(found);const extra=useAlternateOffsets?(offsets.altVocals?.[instId]?.[original]??0):(offsets.vocals?.[original]??0);trackOffsets.push((Number(baseOffset)||0)+(Number(extra)||0));}}}
    if(paths.length===1){const combined=this.findAudio(zip,item.root,item.songId,'Voices'+(item.variation==='default'?'':'-'+item.variation),item.folder)||this.findAudio(zip,item.root,item.songId,'Voices',item.folder);if(combined){paths.push(combined);trackOffsets.push(Number(baseOffset)||0);}}
    return {urls:await Promise.all(paths.map(p=>zip.url(p))),offsets:trackOffsets};
  }
  async getVisuals(choice,assets){const key=choice.mod.recordId+'/'+choice.mod.itemKey+JSON.stringify(choice.visualOverrides||{});if(!this.visuals.has(key)){const {record,item}=this.resolve(choice);this.visuals.set(key,this.archive(record).then(zip=>loadModVisuals(zip,choice.visualOverrides?{...item,metadata:{...item.metadata,playData:{...item.metadata.playData,characters:choice.visualOverrides.characters,stage:choice.visualOverrides.stage}}}:item,assets,key)).then(result=>{for(const line of result.report)if(!record.report.includes(line))record.report.push(line);return result;}));}return this.visuals.get(key);}
  async enable(id,value){const r=this.records.find(r=>r.id===id);if(!r)return;r.enabled=value;await this.save(r);}
  async remove(id){const r=this.records.find(r=>r.id===id);this.records=this.records.filter(r=>r.id!==id);if(this.db)await new Promise((resolve,reject)=>{const tx=this.db.transaction('mods','readwrite');tx.objectStore('mods').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});const archive=await this.archives.get(id);archive?.dispose();this.archives.delete(id);for(const key of this.visuals.keys())if(key.startsWith(id+'/'))this.visuals.delete(key);return r;}
}
class ModManager {
  constructor(library,{onExit,onChange}={}){this.library=library;this.onExit=onExit;this.onChange=onChange;this.visible=false;this.busy=false;this.selectedId=null;this.root=document.createElement('section');this.root.id='mod-manager';this.root.hidden=true;this.root.setAttribute('aria-label','Mods');document.querySelector('#game').append(this.root);document.addEventListener('keydown',e=>{if(this.visible&&e.code==='Escape'){e.preventDefault();this.close();}});}
  open(){this.visible=true;this.root.hidden=false;this.render();}
  close(){if(this.busy){this.setStatus('Please wait for the current import to finish.');return;}this.visible=false;this.root.hidden=true;this.onExit?.();}
  setStatus(text){const node=this.root.querySelector('.mods-status');if(node)node.textContent=text;}
  render(){const records=this.library.records;this.root.innerHTML=`<header><h1>MODS</h1><label class="mods-import">IMPORT V-SLICE ZIP<input id="mod-zip-input" type="file" accept=".zip,.fnfc,application/zip"></label><button id="mods-back">BACK / ESC</button></header><p class="mods-intro">Import songs, charts, audio, Sparrow/Animate characters and stages from V-Slice ZIPs. Files stay in this browser. Haxe scripts and native extensions do not run here; each import includes a compatibility report.</p><div class="mods-content"><div class="mods-list">${records.length?records.map(r=>`<button class="mods-item ${r.id===this.selectedId?'selected':''}" data-mod="${MOD_ESCAPE(r.id)}"><strong>${MOD_ESCAPE(r.title)}</strong><span>${r.items.length} song variations · ${r.enabled?'ENABLED':'DISABLED'}</span></button>`).join(''):'<p>No mods imported yet.<br>Choose a .zip or .fnfc file to begin.</p>'}</div><article class="mods-detail"></article></div><footer class="mods-status" role="status">${this.library.sessionOnly?'Session storage only. Imported mods are available until this page closes.':'Imported mods are saved locally and restored when you reopen the game.'}</footer>`;this.root.querySelector('#mods-back').onclick=()=>this.close();this.root.querySelectorAll('[data-mod]').forEach(b=>b.onclick=()=>{this.selectedId=b.dataset.mod;this.render();});this.root.querySelector('#mod-zip-input').onchange=async e=>{const file=e.target.files[0];if(!file)return;this.busy=true;this.root.querySelector('.mods-import').classList.add('busy');try{const record=await this.library.importFile(file,text=>this.setStatus(text));this.selectedId=record.id;this.onChange?.();this.render();this.setStatus(`Imported ${record.title}: ${record.items.length} song variations. Read the compatibility report before playing.`);}catch(error){this.setStatus('Import failed: '+error.message);}finally{this.busy=false;this.root.querySelector('.mods-import')?.classList.remove('busy');}};
    const selected=records.find(r=>r.id===this.selectedId)||records.at(-1),detail=this.root.querySelector('.mods-detail');if(!selected){detail.innerHTML='<h2>V-SLICE ZIP IMPORT</h2><p>Supported: standard ZIP/FNFC packages, nested mod folders, multiple songs and variations, all declared chart difficulties, BPM changes, split vocals, audio offsets, common camera/animation events, custom characters and stage images.</p><p>Custom script-defined mechanics, shaders and native engine extensions are listed in the compatibility report.</p>';return;}
    detail.innerHTML=`<h2>${MOD_ESCAPE(selected.title)}</h2><p>${MOD_ESCAPE(selected.description)}</p><p>${MOD_ESCAPE(selected.author)} ${selected.version?' · '+MOD_ESCAPE(selected.version):''} · ${(selected.size/1048576).toFixed(1)} MiB</p><div class="mods-actions"><button data-toggle>${selected.enabled?'DISABLE':'ENABLE'}</button><button data-remove>REMOVE FROM BROWSER</button></div><h3>SONGS</h3><ul>${selected.items.map(i=>`<li>${MOD_ESCAPE(i.name)} <small>${MOD_ESCAPE(i.levels.join(' / '))}</small></li>`).join('')||'<li>No playable songs.</li>'}</ul><h3>COMPATIBILITY REPORT</h3><ul>${selected.report.map(line=>`<li>${MOD_ESCAPE(line)}</li>`).join('')}</ul>`;detail.querySelector('[data-toggle]').onclick=async()=>{await this.library.enable(selected.id,!selected.enabled);this.onChange?.();this.render();};detail.querySelector('[data-remove]').onclick=async()=>{await this.library.remove(selected.id);this.selectedId=null;this.onChange?.();this.render();};
  }
}


// ---- song-events.mjs ----
const EVENT_SCHEMAS={FocusCamera:{char:0,x:0,y:0,duration:4,ease:'CLASSIC',easeDir:'InOut'},ZoomCamera:{zoom:1,duration:4,ease:'linear',easeDir:'InOut',mode:'direct',widescreenScaleX:0,widescreenScaleY:0},PlayAnimation:{target:'boyfriend',anim:'idle',force:false},ScrollSpeed:{scroll:1,duration:4,ease:'linear',easeDir:'InOut',strumline:'both',absolute:false},SetCameraBop:{intensity:1,rate:4,offset:0},SetTargetBopSpeed:{target:'boyfriend',rate:1},SetHealthIcon:{char:0,id:'bf',shouldBop:true,scale:1,flipX:false,isPixel:false,offsetX:0,offsetY:0}};
const EVT_NUMBER=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
function eventEase(ease='linear',dir='InOut',t=0){t=Math.max(0,Math.min(1,t));const name=String(ease).toLowerCase();if(['instant','classic'].includes(name))return t;const mode=name.endsWith('inout')?'inout':name.endsWith('out')?'out':name.endsWith('in')?'in':String(dir).toLowerCase(),kind=name.replace(/inout$|out$|in$/,'');
 const bounce=x=>{const n=7.5625,d=2.75;if(x<1/d)return n*x*x;if(x<2/d){x-=1.5/d;return n*x*x+0.75;}if(x<2.5/d){x-=2.25/d;return n*x*x+0.9375;}x-=2.625/d;return n*x*x+0.984375;};
 const base=x=>{if(kind==='sine')return 1-Math.cos(x*Math.PI/2);if(kind==='quad')return x*x;if(kind==='cube'||kind==='cubic')return x*x*x;if(kind==='quart')return x**4;if(kind==='quint')return x**5;if(kind==='expo')return x===0?0:2**(10*x-10);if(kind==='circ')return 1-Math.sqrt(1-x*x);if(kind==='back')return 2.70158*x*x*x-1.70158*x*x;if(kind==='elastic')return x===0||x===1?x:-(2**(10*x-10))*Math.sin((x*10-10.75)*(2*Math.PI/3));if(kind==='bounce')return 1-bounce(1-x);if(kind==='smoothstep')return x*x*(3-2*x);if(kind==='smootherstep')return x*x*x*(x*(x*6-15)+10);return x;};return mode==='out'?1-base(1-t):mode==='inout'?(t<0.5?base(t*2)/2:1-base((1-t)*2)/2):base(t);
}
function eventRole(target){return ['bf','boyfriend','player',0].includes(target)?'player':['gf','girlfriend','partner',2].includes(target)?'girlfriend':['dad','opponent',1].includes(target)?'opponent':String(target||'player');}
function applyEventTweens(game,time){for(const [name,field] of [['zoomTween','eventZoom'],['scrollTween','eventScroll'],['scrollPlayerTween','eventScrollPlayer'],['scrollOpponentTween','eventScrollOpponent'],['focusXTween','eventFocusX'],['focusYTween','eventFocusY']]){const tween=game[name];if(!tween)continue;const progress=tween.end===tween.start?1:Math.max(0,Math.min(1,(time-tween.start)/(tween.end-tween.start))),eased=eventEase(tween.ease,tween.dir,progress);game[field]=tween.from+(tween.to-tween.from)*eased;if(progress===1)game[name]=null;}}
function updateChartEvents(game,time,{bpm=100,animate=()=>{}}={}){const events=game.chart.events||[];game.eventIndex??=0;game.eventBop??={};while(game.eventIndex<events.length&&events[game.eventIndex].t<=time){const event=events[game.eventIndex++];applyEventTweens(game,event.t);const defaults=EVENT_SCHEMAS[event.e]||{},raw=event.v&&typeof event.v==='object'?event.v:{char:event.v},v={...defaults,...raw},localBpm=game.chart.tempos?.findLast(t=>t.time<=event.t)?.bpm||bpm,duration=String(v.ease).toUpperCase()==='INSTANT'?0:Math.max(0,EVT_NUMBER(v.duration,4))*15000/localBpm;
 const tween=(name,field,target,fallback=1)=>{game[name]={start:event.t,end:event.t+duration,from:game[field]??fallback,to:target,ease:v.ease,dir:v.easeDir};};
 if(event.e==='FocusCamera'){game.eventFocusRole=v.char===-1?'position':eventRole(v.char);game.eventFocus=game.eventFocusRole==='player';tween('focusXTween','eventFocusX',EVT_NUMBER(v.x,0),0);tween('focusYTween','eventFocusY',EVT_NUMBER(v.y,0),0);}
 if(event.e==='ZoomCamera'){tween('zoomTween','eventZoom',Math.max(0.25,Math.min(4,EVT_NUMBER(v.zoom,1)*(v.mode==='stage'?(game.stageZoom||1):1))));game.widescreenScale=[EVT_NUMBER(v.widescreenScaleX,0),EVT_NUMBER(v.widescreenScaleY,0)];}
 if(event.e==='ScrollSpeed'){const target=Math.max(0.05,EVT_NUMBER(v.scroll,1))/(v.absolute?game.chart.speed:1);if(v.strumline==='both'||!v.strumline){tween('scrollTween','eventScroll',target);tween('scrollPlayerTween','eventScrollPlayer',target);tween('scrollOpponentTween','eventScrollOpponent',target);}else if(v.strumline==='player')tween('scrollPlayerTween','eventScrollPlayer',target);else tween('scrollOpponentTween','eventScrollOpponent',target);}
 if(event.e==='SetCameraBop'){game.bopRate=Math.max(0,EVT_NUMBER(v.rate,4));game.bopIntensity=Math.max(0,Math.min(5,EVT_NUMBER(v.intensity,1)));game.bopOffset=EVT_NUMBER(v.offset,0);}
 if(event.e==='SetTargetBopSpeed')game.eventBop[eventRole(v.target)]=Math.max(0,EVT_NUMBER(v.rate,1));
 if(event.e==='PlayAnimation')animate(v.target,String(v.anim||'idle'),event.t,!!v.force);
 if(event.e==='AnimationSuffixEvent'){game.animationSuffix??={};const role=eventRole(v.target),prior=game.animationSuffix[role]||{};game.animationSuffix[role]={idle:v.onIdle?String(v.suffix||''):prior.idle,sing:v.onSing===false?'':String(v.suffix||'')};}
 if(event.e==='EnableMask'){game.stageMask=true;game.animationSuffix??={};game.animationSuffix.opponent={idle:'-bloody',sing:'-bloody'};}
 if(event.e==='SetHealthIcon'){game.eventHealthIcon??={};game.eventHealthIcon[v.char===0?'player':'opponent']=String(v.id||'bf');game.healthIconOptions??={};game.healthIconOptions[v.char===0?'player':'opponent']=v;}
 }applyEventTweens(game,time);}


// ---- editor.mjs ----

const STEP=44,CELL=52,LEFT=38,TOP=42,GRID=8*CELL;
const ED_DIRECTIONS=['LEFT','DOWN','UP','RIGHT'];
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
class ChartEditor {
  constructor({audio,assets,onExit,onTest,loadOriginal,prepareAudio}){Object.assign(this,{audio,assets,onExit,onTest,loadOriginal,prepareAudio});this.visible=false;this.raw=null;this.original=null;this.index=0;this.diff=1;this.section=0;this.tab='song';this.snap=16;this.selected=null;this.history=[];this.future=[];this.clipboard=null;this.position=0;this.playing=false;this.loop=false;this.follow=true;this.metronome=false;this.hitsounds=false;this.lastBeat=-1;this.lastSoundTime=0;this.instVolume=1;this.voiceVolume=1;this.customAudio={};this.root=document.createElement('section');this.root.id='chart-editor';this.root.hidden=true;this.root.setAttribute('aria-label','Chart editor');document.querySelector('#game').append(this.root);document.addEventListener('keydown',e=>{if(this.visible)this.keydown(e);});}
  async open(index,diff,raw,{keep=false}={}){
    const generation=this.generation=(this.generation||0)+1;this.index=index;this.diff=diff;this.visible=true;this.root.hidden=false;this.audio.stop();this.audio.stopMenu();
    if(!keep||!this.raw){this.original=validateChart(raw);this.raw=cloneChart(this.original);try{const saved=localStorage.getItem(this.storageKey());if(saved)this.raw=validateChart(saved);}catch{}this.section=0;this.position=0;this.selected=null;this.history=[];this.future=[];}
    this.timing=sectionTimes(this.raw);this.playing=false;this.build();this.renderPanel();this.renderTimeline();this.status('Loading song audio…');
    try{this.duration=await (this.prepareAudio?this.prepareAudio(index,diff):this.audio.prepare(SONGS[index].file));this.baseBuffers=[...this.audio.buffers];this.status('Ready. Changes autosave locally.');}catch(e){this.status('Audio could not load: '+e.message);}
    if(generation!==this.generation||!this.visible)return;this.draw(performance.now());this.frame=setInterval(()=>this.draw(performance.now()),1000/60);
  }
  storageKey(){return `fnf-week1:editor:${SONGS[this.index].id}:${this.character==='pico'?'pico:':''}${this.diff}`;}
  status(message){if(this.statusNode)this.statusNode.textContent=message;}
  build(){
    this.lanes=this.raw.song.keyCount===6?6:4;this.columns=this.lanes*2;this.gridWidth=this.columns*CELL;this.availableLevels=this.getLevels?.()||DIFFICULTIES.map((name,index)=>({name,index}));this.root.innerHTML=`<header class="ed-header"><strong>CHART EDITOR</strong><span>${escapeHTML(SONGS[this.index].name)} · ${DIFFICULTIES[this.diff]}</span><button data-action="play">▶ Play</button><button data-action="stop">■ Stop</button><button data-action="test">Test chart ↵</button><button data-action="export">Export JSON</button><label class="ed-file">Import JSON<input id="ed-import" type="file" accept=".json,application/json"></label><button data-action="exit" class="ed-exit">Back / 7</button></header><div class="ed-main"><section class="ed-workspace"><div class="ed-transport"><button data-action="prev">◀</button><label>Section <input id="ed-section" type="number" min="1" value="${this.section+1}"></label><span id="ed-total"></span><button data-action="next">▶</button><button data-action="add-section">+ Section</button><label>Snap <select id="ed-snap">${[4,8,12,16,24,32,48,64,96,192].map(v=>`<option value="${v}" ${v===this.snap?'selected':''}>1/${v}</option>`).join('')}<option value="0">None</option></select></label><button data-action="undo" title="Ctrl+Z">↶</button><button data-action="redo" title="Ctrl+Y">↷</button></div><div class="ed-timeline"><input id="ed-seek" type="range" min="0" max="100" step="1" value="0" aria-label="Song playhead"><output id="ed-clock">0:00.000</output></div><div class="ed-grid-scroll"><canvas id="ed-grid" width="${LEFT+this.gridWidth+18}" height="${TOP+16*STEP+24}" tabindex="0" aria-label="Note grid. Click to add or delete a note, Control click to select, Alt click to seek."></canvas></div><div class="ed-grid-help">CLICK: ADD / DELETE · CTRL CLICK: SELECT · RIGHT CLICK: DELETE · SHIFT: UNSNAPPED · ALT CLICK: SEEK</div></section><aside class="ed-sidebar"><nav class="ed-tabs"><button data-tab="song">Song</button><button data-tab="section">Section</button><button data-tab="note">Note</button></nav><div id="ed-panel"></div><div class="ed-preview-options"><label><input id="ed-loop" type="checkbox" ${this.loop?'checked':''}> Loop section</label><label><input id="ed-follow" type="checkbox" ${this.follow?'checked':''}> Follow playhead</label><label><input id="ed-metronome" type="checkbox" ${this.metronome?'checked':''}> Metronome</label><label><input id="ed-hitsounds" type="checkbox" ${this.hitsounds?'checked':''}> Note clicks</label></div><p class="ed-shortcuts">SPACE play/pause · A/D section (Shift ×4) · W/S scrub · Q/E sustain · R reset section (Shift song) · TAB panels · ENTER playtest · 7 exit<br>Ctrl Z/Y undo/redo · Ctrl S export</p></aside></div><footer class="ed-footer" role="status"></footer>`;
    this.grid=this.root.querySelector('#ed-grid');this.gctx=this.grid.getContext('2d',{alpha:false});this.statusNode=this.root.querySelector('.ed-footer');
    this.root.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>this.action(b.dataset.action)));
    this.root.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{this.tab=b.dataset.tab;this.renderPanel();}));
    this.root.querySelector('#ed-section').addEventListener('change',e=>this.goSection(Number(e.target.value)-1));
    this.root.querySelector('#ed-snap').addEventListener('change',e=>this.snap=Number(e.target.value));
    this.root.querySelector('#ed-seek').addEventListener('input',e=>this.seek(Number(e.target.value)));
    for(const key of ['loop','follow','metronome','hitsounds'])this.root.querySelector('#ed-'+key).addEventListener('change',e=>this[key]=e.target.checked);
    this.grid.addEventListener('pointerdown',e=>this.gridClick(e));this.grid.addEventListener('contextmenu',e=>e.preventDefault());
    this.grid.addEventListener('wheel',e=>{if(e.ctrlKey&&this.selected){e.preventDefault();this.changeSustain(Math.sign(-e.deltaY));}else if(!e.shiftKey){e.preventDefault();this.seek(this.position+Math.sign(e.deltaY)*60000/this.timing[this.section].bpm/4);}},{passive:false});
    this.root.querySelector('#ed-import').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const raw=validateChart(await file.text());this.mutate(()=>{this.raw=raw;this.section=0;this.selected=null;});this.seek(0);this.status(`Imported ${file.name}. Press Test chart to play it.`);}catch(err){this.status('Import failed: '+err.message);}e.target.value='';});
  }
  current(){return this.raw.song.notes[this.section];}
  field(label,name,value,type='number',extra=''){return `<label class="ed-field">${label}<input data-field="${name}" type="${type}" value="${escapeHTML(value)}" ${extra}></label>`;}
  checkbox(label,name,value){return `<label class="ed-check"><input data-field="${name}" type="checkbox" ${value?'checked':''}>${label}</label>`;}
  renderPanel(){
    if(!this.visible)return;const panel=this.root.querySelector('#ed-panel'),song=this.raw.song,s=this.current();this.root.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===this.tab));
    if(this.tab==='song')panel.innerHTML=`<h3>Song</h3>${this.field('Name','song',song.song,'text')}${this.field('BPM','bpm',song.bpm,'number','min="1" max="999" step="1"')}${this.field('Scroll speed','speed',song.speed,'number','min="0.1" max="10" step="0.1"')}${this.checkbox('Has voice track','needsVoices',song.needsVoices)}${this.field('Player character','player1',song.player1,'text')}${this.field('Opponent character','player2',song.player2,'text')}<label class="ed-field">Instrumental volume<input data-audio="inst" type="range" min="0" max="1" step="0.05" value="${this.instVolume}"></label><label class="ed-field">Vocal volume<input data-audio="voices" type="range" min="0" max="1" step="0.05" value="${this.voiceVolume}"></label><label class="ed-file">Load instrumental<input data-audio-file="0" type="file" accept="audio/*"></label><label class="ed-file">Load vocals<input data-audio-file="1" type="file" accept="audio/*"></label><div class="ed-action-row"><button data-action="reload-audio">Reload audio</button><button data-action="reload-json">Reload original JSON</button><button data-action="autosave">Load autosave</button><button data-action="clear-song">Clear all notes</button></div><p>Character names and alternate animations are preserved in exported charts. Playtests use the selected song’s included or imported character assets.</p>`;
    if(this.tab==='section')panel.innerHTML=`<h3>Section ${this.section+1}</h3>${this.field('Length in steps','lengthInSteps',s.lengthInSteps,'number','min="1" max="128" step="1"')}${this.checkbox('Must hit section (player turn)','mustHitSection',s.mustHitSection)}${this.checkbox('Change BPM here','changeBPM',s.changeBPM)}${this.field('Section BPM','sectionBpm',s.bpm||song.bpm,'number','min="1" max="999"')}${this.checkbox('Alternate animation','altAnim',s.altAnim)}<label class="ed-field">Copy from section<input id="ed-copy-from" type="number" value="${Math.max(1,this.section)}" min="1" max="${song.notes.length}"></label><div class="ed-action-row"><button data-action="copy-from">Copy notes from…</button><button data-action="copy">Copy section</button><button data-action="paste">Paste section</button><button data-action="swap">Swap sides</button><button data-action="mirror">Mirror directions</button><button data-action="clear-section">Clear section</button><button data-action="delete-section">Delete section</button><button data-action="insert-section">Insert section</button></div><p>Changing BPM retimes notes to preserve their beat positions. Swap sides moves notes between the two four-lane halves.</p>`;
    if(this.tab==='note'){const n=this.selected;panel.innerHTML=`<h3>Note</h3>${n?`${this.field('Timestamp (ms)','noteTime',n[0],'number','min="0" step="1"')}<label class="ed-field">Lane<select data-field="noteLane">${Array.from({length:this.columns},(_,i)=>`<option value="${i}" ${n[1]===i?'selected':''}>${i<this.lanes?'Left':'Right'} · ${(this.lanes===6?['LEFT','UP','RIGHT','LEFT','DOWN','RIGHT']:ED_DIRECTIONS)[i%this.lanes]}</option>`).join('')}</select></label>${this.field('Sustain (ms)','noteLength',n[2],'number','min="0" step="1"')}${this.field('Note type (optional)','noteType',n[3]||'','text')}<div class="ed-action-row"><button data-action="sustain-minus">− Sustain (Q)</button><button data-action="sustain-plus">+ Sustain (E)</button><button data-action="delete-note">Delete note</button><button data-action="clone-note">Duplicate + beat</button></div><p>Ctrl-click a note to select it. Q / E changes its sustain by half a step. Ctrl + wheel also changes sustain.</p>`:'<p>No note selected. Ctrl-click a note in the grid to edit its timestamp, lane, sustain and type.</p>'}`;}
    panel.querySelectorAll('[data-field]').forEach(el=>{let previous=el.type==='checkbox'?el.checked:el.value;const update=e=>{const current=el.type==='checkbox'?el.checked:el.value;if(current===previous||(e.type==='input'&&el.type==='number'&&current===''))return;previous=current;const key=el.dataset.field,value=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;this.editField(key,value);};el.addEventListener('input',update);el.addEventListener('change',update);});
    panel.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>this.action(el.dataset.action)));
    panel.querySelectorAll('[data-audio]').forEach(el=>el.addEventListener('input',()=>{if(el.dataset.audio==='inst')this.instVolume=Number(el.value);else this.voiceVolume=Number(el.value);this.applyVolumes();}));
    panel.querySelectorAll('[data-audio-file]').forEach(el=>el.addEventListener('change',async()=>{const file=el.files[0];if(!file)return;this.pause();try{await this.audio.unlock();const buffer=await this.audio.ctx.decodeAudioData(await file.arrayBuffer());const index=Number(el.dataset.audioFile);this.customAudio[index]=buffer;this.audio.buffers[index]=buffer;if(index===0)this.duration=buffer.duration*1000;this.status(`Loaded ${file.name}. Audio stays in this editor session; export JSON saves only the chart.`);}catch(e){this.status('Could not decode audio: '+e.message);}}));
  }
  editField(key,value){const songFields=['song','bpm','speed','needsVoices','player1','player2'];const retime=['bpm','lengthInSteps','changeBPM','sectionBpm'].includes(key);this.mutate(()=>{if(songFields.includes(key))this.raw.song[key]=value;else if(key==='sectionBpm')this.current().bpm=clamp(value||100,1,999);else if(key==='noteTime'&&this.selected)this.selected[0]=Math.max(0,value||0);else if(key==='noteLane'&&this.selected)this.selected[1]=clamp(Number(value)||0,0,this.columns-1);else if(key==='noteLength'&&this.selected)this.selected[2]=Math.max(0,value||0);else if(key==='noteType'&&this.selected)this.selected[3]=String(value);else this.current()[key]=value;if(key==='bpm')this.raw.song.bpm=clamp(value||100,1,999);if(key==='speed')this.raw.song.speed=clamp(value||1,0.1,10);if(key==='lengthInSteps')this.current().lengthInSteps=clamp(Math.round(value)||16,1,128);},retime,false);}
  snapshot(){return {raw:cloneChart(this.raw),section:this.section,position:this.position};}
  mutate(action,retime=false,refresh=true){const before=this.snapshot();this.history.push(before);if(this.history.length>80)this.history.shift();this.future=[];action();if(retime)retimeChart(before.raw,this.raw);this.timing=sectionTimes(this.raw);this.section=clamp(this.section,0,this.raw.song.notes.length-1);this.renderTimeline();if(refresh)this.renderPanel();this.saveDraft();}
  undo(redo=false){const from=redo?this.future:this.history,to=redo?this.history:this.future;if(!from.length){this.status('Nothing to '+(redo?'redo.':'undo.'));return;}to.push(this.snapshot());const state=from.pop();this.raw=state.raw;this.section=state.section;this.position=state.position;this.selected=null;this.timing=sectionTimes(this.raw);this.renderTimeline();this.renderPanel();this.saveDraft();}
  saveDraft(){clearTimeout(this.saveTimer);const key=this.storageKey(),data=exportChart(this.raw);this.saveTimer=setTimeout(()=>{try{localStorage.setItem(key,data);if(this.visible)this.status(`Autosaved · ${this.raw.song.notes.reduce((n,s)=>n+s.sectionNotes.length,0)} notes · ${this.raw.song.notes.length} sections`);}catch(e){this.status('Could not autosave: '+e.message);}},250);}
  renderTimeline(){if(!this.visible)return;const steps=this.current().lengthInSteps,height=TOP+steps*STEP+24;if(this.grid.height!==height)this.grid.height=height;this.root.querySelector('#ed-section').value=this.section+1;this.root.querySelector('#ed-section').max=this.raw.song.notes.length;this.root.querySelector('#ed-total').textContent='/ '+this.raw.song.notes.length;const end=Math.max(this.duration||0,this.timing.at(-1).end);this.root.querySelector('#ed-seek').max=end;}
  goSection(index){this.pause();if(index>=this.raw.song.notes.length){this.mutate(()=>{while(index>=this.raw.song.notes.length)this.raw.song.notes.push(blankSection());});}this.section=clamp(index,0,this.raw.song.notes.length-1);this.selected=null;this.position=this.timing[this.section].start;this.renderTimeline();this.renderPanel();this.root.querySelector('.ed-grid-scroll').scrollTop=0;}
  seek(time){const resume=this.playing;this.pause();this.position=clamp(time,0,this.duration||this.timing.at(-1).end);const found=this.timing.findIndex(s=>this.position>=s.start&&this.position<s.end);if(found>=0&&found!==this.section){this.section=found;this.selected=null;this.renderTimeline();this.renderPanel();}if(resume)this.play();}
  applyVolumes(){if(this.audio.music)this.audio.music.gain.value=this.instVolume;if(this.audio.voices)this.audio.voices.gain.value=this.raw.song.needsVoices?this.voiceVolume:0;}
  play(){if(!this.audio.buffers){this.status('Audio is still loading.');return;}this.audio.start(Math.min(this.position,Math.max(0,(this.duration||1)-1)));this.applyVolumes();this.playing=true;this.lastBeat=-1;this.lastSoundTime=this.position;this.root.querySelector('[data-action="play"]').textContent='Ⅱ Pause';}
  pause(){if(this.playing){this.position=this.audio.time();this.audio.pause();}this.playing=false;const b=this.root.querySelector('[data-action="play"]');if(b)b.textContent='▶ Play';}
  async action(action){
    if(action==='play'){if(this.playing)this.pause();else this.play();return;}
    if(action==='stop'){this.pause();this.position=this.timing[this.section].start;return;}
    if(action==='prev'){this.goSection(this.section-1);return;}if(action==='next'){this.goSection(this.section+1);return;}
    if(action==='undo'||action==='redo'){this.undo(action==='redo');return;}
    if(action==='exit'){this.close();this.onExit();return;}
    if(action==='test'){this.pause();const raw=cloneChart(this.raw);this.close();this.onTest(raw,this.index,this.diff,this.customAudio);return;}
    if(action==='export'){this.download();return;}
    if(action==='reload-audio'){this.pause();this.customAudio={};this.duration=await (this.prepareAudio?this.prepareAudio(this.index,this.diff):this.audio.prepare(SONGS[this.index].file));this.baseBuffers=[...this.audio.buffers];this.status('Original audio reloaded.');return;}
    if(action==='reload-json'){this.mutate(()=>{this.raw=cloneChart(this.original);this.section=0;this.selected=null;});this.seek(0);this.status('Original chart restored. Undo can recover your draft.');return;}
    if(action==='autosave'){try{const draft=localStorage.getItem(this.storageKey());if(!draft)throw new Error('No saved draft.');this.mutate(()=>{this.raw=validateChart(draft);this.section=0;this.selected=null;});this.seek(0);this.status('Autosave loaded.');}catch(e){this.status(e.message);}return;}
    if(action==='copy'){const time=this.timing[this.section];this.clipboard={section:cloneChart(this.current()),start:time.start,bpm:time.bpm};this.status('Section copied.');return;}
    if(action==='paste'){if(!this.clipboard){this.status('Copy a section first.');return;}this.mutate(()=>{const clip=this.clipboard,t=this.timing[this.section];this.current().sectionNotes.push(...clip.section.sectionNotes.map(n=>[t.start+(n[0]-clip.start)*clip.bpm/t.bpm,n[1],n[2]*clip.bpm/t.bpm,...n.slice(3)]));});return;}
    if(action==='copy-from'){const source=Number(this.root.querySelector('#ed-copy-from').value)-1;if(!this.raw.song.notes[source]){this.status('That source section does not exist.');return;}this.mutate(()=>copySectionNotes(this.raw,source,this.section));return;}
    if(action==='add-section'){this.mutate(()=>this.raw.song.notes.push(blankSection()));this.goSection(this.raw.song.notes.length-1);return;}
    if(action==='insert-section'){this.pause();const start=this.timing[this.section].start;this.mutate(()=>{insertChartSection(this.raw,this.section);this.selected=null;});this.position=start;return;}
    if(action==='delete-section'){if(this.raw.song.notes.length===1){this.status('Keep at least one section. Clear it instead.');return;}this.pause();this.mutate(()=>{deleteChartSection(this.raw,this.section);this.selected=null;});this.seek(this.timing[this.section].start);return;}
    if(action==='clear-section'){this.mutate(()=>{this.current().sectionNotes=[];this.selected=null;});return;}
    if(action==='clear-song'){this.mutate(()=>{for(const s of this.raw.song.notes)s.sectionNotes=[];this.selected=null;});return;}
    if(action==='swap'){this.mutate(()=>{for(const n of this.current().sectionNotes)n[1]=(n[1]+this.lanes)%this.columns;});return;}
    if(action==='mirror'){this.mutate(()=>{for(const n of this.current().sectionNotes)n[1]=Math.floor(n[1]/this.lanes)*this.lanes+(this.lanes-1-n[1]%this.lanes);});return;}
    if(action==='sustain-minus'||action==='sustain-plus'){this.changeSustain(action==='sustain-plus'?1:-1);return;}
    if(action==='delete-note'&&this.selected){this.mutate(()=>{this.current().sectionNotes=this.current().sectionNotes.filter(n=>n!==this.selected);this.selected=null;});return;}
    if(action==='clone-note'&&this.selected){this.mutate(()=>{const n=cloneChart(this.selected);n[0]+=60000/this.timing[this.section].bpm;this.current().sectionNotes.push(n);this.selected=n;});}
  }
  changeSustain(direction){if(!this.selected)return;const halfStep=60000/this.timing[this.section].bpm/8;this.mutate(()=>this.selected[2]=Math.max(0,Math.round((this.selected[2]+halfStep*direction)*1000)/1000));}
  gridClick(e){this.grid.focus();const rect=this.grid.getBoundingClientRect(),x=(e.clientX-rect.left)*this.grid.width/rect.width,y=(e.clientY-rect.top)*this.grid.height/rect.height;if(y<TOP||y>=this.grid.height-24)return;const timing=this.timing[this.section],stepMs=60000/timing.bpm/4,rawStep=(y-TOP)/STEP;const snap=e.shiftKey||!this.snap?0:16/this.snap;const step=snap?Math.floor(rawStep/snap)*snap:rawStep;const time=timing.start+step*stepMs;if(e.altKey||x<LEFT){this.seek(time);return;}if(x>=LEFT+this.gridWidth)return;const lane=clamp(Math.floor((x-LEFT)/CELL),0,this.columns-1);const existing=this.current().sectionNotes.find(n=>n[1]===lane&&Math.abs((n[0]-timing.start)/stepMs-rawStep)<0.48);
    if(existing&&(e.ctrlKey||e.metaKey)){this.selected=existing;this.tab='note';this.renderPanel();return;}if(e.button===2||existing){if(existing)this.mutate(()=>{this.current().sectionNotes=this.current().sectionNotes.filter(n=>n!==existing);if(this.selected===existing)this.selected=null;});return;}
    this.mutate(()=>{const note=[Math.round(time*1000)/1000,lane,0];this.current().sectionNotes.push(note);if(e.ctrlKey||e.metaKey)this.current().sectionNotes.push([note[0],(lane+this.lanes)%this.columns,0]);this.selected=note;});
  }
  download(){const data=exportChart(this.raw);const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;const suffix=this.diff<3?['-easy','','-hard'][this.diff]:'-'+DIFFICULTIES[this.diff].toLowerCase();link.download=this.raw.song.song.toLowerCase().replace(/[^a-z0-9_-]+/g,'-')+suffix+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),5000);this.status('Exported classic FNF JSON.');}
  keydown(e){const input=/INPUT|TEXTAREA|SELECT/.test(e.target.tagName);if(input&&e.code!=='Escape')return;if(e.code==='Tab'){e.preventDefault();const tabs=['charting','events','note','section','song'];this.tab=tabs[(tabs.indexOf(this.tab)+(e.shiftKey?4:1))%5];this.renderPanel();return;}if(e.ctrlKey||e.metaKey){if(e.code==='KeyZ'){e.preventDefault();this.undo(e.shiftKey);return;}if(e.code==='KeyY'){e.preventDefault();this.undo(true);return;}if(e.code==='KeyS'){e.preventDefault();this.download();return;}return;}
    const handled=['Space','Enter','Escape','Digit7','KeyA','KeyD','KeyW','KeyS','KeyQ','KeyE','KeyR','Delete'];if(!handled.includes(e.code))return;e.preventDefault();if(e.repeat&&!['KeyW','KeyS','KeyQ','KeyE'].includes(e.code))return;if(e.code==='Space')this.action('play');if(e.code==='Enter')this.action('test');if(e.code==='Escape'||e.code==='Digit7')this.action('exit');if(e.code==='KeyA')this.goSection(this.section-(e.shiftKey?4:1));if(e.code==='KeyD')this.goSection(this.section+(e.shiftKey?4:1));if(e.code==='KeyQ')this.changeSustain(-1);if(e.code==='KeyE')this.changeSustain(1);if(e.code==='KeyW'||e.code==='KeyS')this.seek(this.position+(e.code==='KeyW'?-1:1)*60000/this.timing[this.section].bpm/(e.shiftKey?1:4));if(e.code==='KeyR'){this.pause();this.seek(e.shiftKey?0:this.timing[this.section].start);}if(e.code==='Delete')this.action('delete-note');}
  clickTone(accent=false){const a=this.audio,osc=a.ctx.createOscillator(),gain=a.ctx.createGain();osc.frequency.value=accent?1200:700;gain.gain.setValueAtTime(0.075,a.ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,a.ctx.currentTime+0.035);osc.connect(gain);gain.connect(a.fx);osc.start();osc.stop(a.ctx.currentTime+0.04);}
  draw(timestamp){if(!this.visible)return;const g=this.gctx,t=this.timing[this.section],s=this.current(),stepMs=60000/t.bpm/4;
    if(this.playing){this.position=this.audio.time();if(this.loop&&this.position>=t.end){this.position=t.start;this.audio.start(this.position);this.applyVolumes();}else if(this.position>=this.duration){this.pause();this.position=0;}else if(this.follow){const found=this.timing.findIndex(s=>this.position>=s.start&&this.position<s.end);if(found>=0&&found!==this.section){this.section=found;this.selected=null;this.renderTimeline();this.renderPanel();return;}}
      if(this.metronome){const beat=Math.floor(beatAt(parseChart(this.raw),this.position));if(beat!==this.lastBeat){this.lastBeat=beat;this.clickTone(beat%4===0);}}
      if(this.hitsounds){if(s.sectionNotes.some(n=>n[0]>this.lastSoundTime&&n[0]<=this.position))this.clickTone();this.lastSoundTime=this.position;}
    }
    g.fillStyle='#1a1d25';g.fillRect(0,0,this.grid.width,this.grid.height);g.font='12px VCR, monospace';g.textAlign='center';g.textBaseline='middle';
    for(let lane=0;lane<this.columns;lane++){g.fillStyle=lane<this.lanes?'#302f3e':'#293747';g.fillRect(LEFT+lane*CELL,TOP,CELL,s.lengthInSteps*STEP);g.fillStyle='#d4d6df';g.fillText((this.lanes===6?['LEFT','UP','RIGHT','LEFT','DOWN','RIGHT']:ED_DIRECTIONS)[lane%this.lanes].slice(0,1),LEFT+lane*CELL+CELL/2,23);}
    for(let step=0;step<=s.lengthInSteps;step++){const y=TOP+step*STEP;g.strokeStyle=step%4===0?'#a4a7b2':'#555763';g.lineWidth=step%4===0?2:1;g.beginPath();g.moveTo(LEFT,y);g.lineTo(LEFT+this.gridWidth,y);g.stroke();g.fillStyle=step%4===0?'#fff':'#777';g.fillText(String(step),18,y);}
    for(let lane=0;lane<=this.columns;lane++){g.strokeStyle=lane===this.lanes?'#f4d15b':'#666875';g.lineWidth=lane===4?3:1;g.beginPath();g.moveTo(LEFT+lane*CELL,TOP);g.lineTo(LEFT+lane*CELL,this.grid.height-24);g.stroke();}
    const notePrefix=this.lanes===6?['purple0','green0','red0','purple0','blue0','red0']:['purple0','blue0','green0','red0'];for(const n of s.sectionNotes){const y=TOP+(n[0]-t.start)/stepMs*STEP,x=LEFT+n[1]*CELL;if(y<TOP-30||y>this.grid.height)continue;if(n[2]>0){g.fillStyle=['#c24b99','#00ffff','#12fa05','#f9393f'][n[1]%4];g.fillRect(x+CELL/2-4,y+16,8,n[2]/stepMs*STEP);}const f=this.assets.frame('NOTE_assets',notePrefix[n[1]%this.lanes]);this.assets.draw(g,'NOTE_assets',f,x+3,y-3,0.28);if(n===this.selected){g.strokeStyle='#fff';g.lineWidth=3;g.strokeRect(x+1,y-4,CELL-2,44);}}
    const py=TOP+(this.position-t.start)/stepMs*STEP;if(py>=TOP&&py<this.grid.height){g.fillStyle='#ff564f';g.fillRect(LEFT,py,this.gridWidth,3);g.fillStyle='#fff';g.fillText('▶',18,py);}
    const clock=this.root.querySelector('#ed-clock'),seek=this.root.querySelector('#ed-seek');seek.value=this.position;clock.textContent=`${Math.floor(this.position/60000)}:${(this.position/1000%60).toFixed(3).padStart(6,'0')} · ${t.bpm} BPM`;
  }
  close(){this.pause();this.generation=(this.generation||0)+1;this.visible=false;this.root.hidden=true;clearInterval(this.frame);this.audio.stop();this.audio.updateVolume();this.saveDraft();}
}


// ---- native-editor.mjs ----
const NE_ESCAPE=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function installNativeEditor(Editor,{loadRaw,onDifficulty,characterChoices,stageChoices}){
 const oldBuild=Editor.prototype.build,oldPanel=Editor.prototype.renderPanel,oldEdit=Editor.prototype.editField,oldAction=Editor.prototype.action,oldDraw=Editor.prototype.draw,oldOpen=Editor.prototype.open;
 Editor.prototype.open=async function(...args){clearInterval(this.frame);return oldOpen.apply(this,args);};
 Editor.prototype.build=function(){oldBuild.call(this);this.root.classList.add('native-editor');const tabs=this.root.querySelector('.ed-tabs');tabs.innerHTML=['charting','events','note','section','song'].map(name=>`<button data-tab="${name}">${name[0].toUpperCase()+name.slice(1)}</button>`).join('');tabs.querySelectorAll('button').forEach(button=>button.onclick=()=>{this.tab=button.dataset.tab;this.renderPanel();});this.selectedEvent=null;};
 const choices=(items,current)=>[...new Set([current,...items].filter(Boolean))].map(item=>`<option value="${NE_ESCAPE(item)}" ${item===current?'selected':''}>${NE_ESCAPE(item)}</option>`).join('');
 Editor.prototype.bindNativeFields=function(panel){panel.querySelectorAll('[data-field]').forEach(el=>{let before=el.type==='checkbox'?el.checked:el.value;const change=()=>{const raw=el.type==='checkbox'?el.checked:el.value;if(raw===before)return;before=raw;this.editField(el.dataset.field,el.type==='number'?Number(raw):raw);};el.onchange=change;if(el.type!=='number'&&el.tagName!=='SELECT')el.oninput=change;});panel.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>this.action(button.dataset.action));};
 Editor.prototype.renderPanel=function(){if(!this.visible)return;const panel=this.root.querySelector('#ed-panel'),song=this.raw.song;this.root.querySelectorAll('[data-tab]').forEach(button=>button.classList.toggle('active',button.dataset.tab===this.tab));
  if(this.tab==='note'||this.tab==='section'){oldPanel.call(this);if(this.tab==='note'&&this.selected){const label=document.createElement('label');label.className='ne-stacked';label.textContent='Note parameters (JSON)';const input=document.createElement('textarea');input.rows=3;input.value=JSON.stringify(this.selected[4]??{});input.onchange=()=>{try{const value=JSON.parse(input.value);this.mutate(()=>this.selected[4]=value);this.status('Note parameters updated.');}catch(error){this.status('Invalid note parameters: '+error.message);}};label.append(input);panel.append(label);}return;}
  if(this.tab==='song'){
   const characters=characterChoices(),stages=stageChoices();panel.innerHTML=`<div class="ne-song-top"><div>${this.field('Name','song',song.song,'text')}${this.checkbox('Has voice track','needsVoices',song.needsVoices)}${this.field('Song BPM','bpm',song.bpm,'number','min="1" max="999" step="1"')}${this.field('Song Speed','speed',song.speed,'number','min="0.1" max="10" step="0.1"')}${this.field('Song Offset','offset',song.offset||0,'number','step="1"')}<label class="ed-field">Difficulty<select id="ne-difficulty">${this.availableLevels.map(level=>`<option value="${level.index}" ${level.index===this.diff?'selected':''}>${NE_ESCAPE(level.name)}</option>`).join('')}</select></label></div><div class="ne-buttons"><button data-action="export">Save</button><button data-action="save-events">Save Events</button><button data-action="reload-audio">Reload Audio</button><button data-action="reload-json">Reload JSON</button><button data-action="autosave">Load Autosave</button><label class="ed-file">Load Events<input id="ne-events-import" type="file" accept=".json"></label></div></div>${[['Boyfriend','player1',song.player1||'bf'],['Girlfriend','gfVersion',song.gfVersion??song.player3??'gf'],['Opponent','player2',song.player2||'dad']].map(([label,key,value])=>`<label class="ne-stacked">${label}<select data-field="${key}">${choices([...characters,'none'],value)}</select></label>`).join('')}<label class="ne-stacked">Stage<select data-field="stage">${choices(stages,song.stage||'mainStage')}</select></label>${this.field('Note Texture','noteTexture',song.noteTexture||'NOTE_assets','text')}${this.field('Note Splashes Texture','noteSplashTexture',song.noteSplashTexture||'','text')}<button data-action="change-notes">Change Notes</button>`;
   this.bindNativeFields(panel);panel.querySelector('#ne-difficulty').onchange=async e=>{this.pause();this.saveDraft();const next=Number(e.target.value);try{const raw=await loadRaw(this.index,next);onDifficulty(next);await this.open(this.index,next,raw);}catch(error){this.status('Could not load difficulty: '+error.message);}};this.bindEventsImport(panel.querySelector('#ne-events-import'));return;
  }
  if(this.tab==='charting'){
   panel.innerHTML=`<h3>Charting</h3><div class="ed-action-row"><button data-action="play">${this.playing?'Pause':'Play'}</button><button data-action="test">Test Chart</button><button data-action="undo">Undo</button><button data-action="redo">Redo</button></div><label class="ed-field">Instrumental volume<input id="ne-inst" type="range" min="0" max="1" step="0.05" value="${this.instVolume}"></label><label class="ed-field">Vocal volume<input id="ne-voices" type="range" min="0" max="1" step="0.05" value="${this.voiceVolume}"></label>${['loop','follow','metronome','hitsounds'].map(key=>`<label class="ed-check"><input data-charting="${key}" type="checkbox" ${this[key]?'checked':''}>${{loop:'Loop section',follow:'Follow playhead',metronome:'Metronome',hitsounds:'Note clicks'}[key]}</label>`).join('')}<label class="ed-field">Grid mode<select id="ne-grid-mode"><option value="4" ${song.keyCount!==6?'selected':''}>4K</option><option value="6" ${song.keyCount===6?'selected':''}>6K</option></select></label><label class="ed-file">Load instrumental<input data-ne-audio="0" type="file" accept="audio/*"></label><label class="ed-file">Load vocals<input data-ne-audio="1" type="file" accept="audio/*"></label><p>Space: audio · Enter: playtest<br>A/D: section · W/S: scrub<br>Q/E: sustain · Ctrl Z/Y: undo/redo<br>Ctrl-click: select · Shift: unsnapped</p>`;
   panel.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>this.action(button.dataset.action));panel.querySelectorAll('[data-charting]').forEach(el=>el.onchange=()=>{this[el.dataset.charting]=el.checked;const existing=this.root.querySelector('#ed-'+el.dataset.charting);if(existing)existing.checked=el.checked;});panel.querySelector('#ne-inst').oninput=e=>{this.instVolume=Number(e.target.value);this.applyVolumes();};panel.querySelector('#ne-voices').oninput=e=>{this.voiceVolume=Number(e.target.value);this.applyVolumes();};panel.querySelector('#ne-grid-mode').onchange=e=>{const next=Number(e.target.value);this.mutate(()=>{const previous=this.raw.song.keyCount||4;for(const section of this.raw.song.notes)for(const note of section.sectionNotes)note[1]=Math.floor(note[1]/previous)*next+Math.min(next-1,note[1]%previous);this.raw.song.keyCount=next;});this.build();this.renderTimeline();this.renderPanel();};
   panel.querySelectorAll('[data-ne-audio]').forEach(input=>input.onchange=async()=>{const file=input.files[0];if(!file)return;this.pause();try{await this.audio.unlock();const buffer=await this.audio.ctx.decodeAudioData(await file.arrayBuffer()),index=Number(input.dataset.neAudio);this.customAudio[index]=buffer;this.audio.buffers[index]=buffer;if(index===0)this.duration=buffer.duration*1000;this.status('Loaded '+file.name);}catch(error){this.status(error.message);}});return;
  }
  if(this.tab==='events')this.renderEventsPanel(panel);
 };
 Editor.prototype.renderEventsPanel=function(panel){const events=this.raw.song.events||[],selected=this.selectedEvent&&events.includes(this.selectedEvent)?this.selectedEvent:null,id=selected?.e||this.eventDraftId||'FocusCamera',value=selected?.v&&typeof selected.v==='object'?selected.v:{...EVENT_SCHEMAS[id]},defaults=EVENT_SCHEMAS[id]||{};
  panel.innerHTML=`<h3>Events (${events.length})</h3><label class="ed-field">Timestamp (ms)<input id="ne-event-time" type="number" min="0" step="1" value="${selected?.t??Math.round(this.position)}"></label><label class="ne-stacked">Event<select id="ne-event-id">${choices([...Object.keys(EVENT_SCHEMAS),...events.map(e=>e.e)],id)}</select></label><div id="ne-event-values">${Object.entries({...defaults,...value}).map(([key,val])=>`<label class="ed-field">${NE_ESCAPE(key)}${typeof val==='boolean'?`<input data-event-value="${NE_ESCAPE(key)}" type="checkbox" ${val?'checked':''}>`:`<input data-event-value="${NE_ESCAPE(key)}" type="${typeof val==='number'?'number':'text'}" step="any" value="${NE_ESCAPE(typeof val==='object'?JSON.stringify(val):val)}">`}</label>`).join('')}</div><label class="ne-stacked">Raw value JSON<textarea id="ne-event-json" rows="3">${NE_ESCAPE(JSON.stringify(selected?.v??value))}</textarea></label><div class="ed-action-row"><button data-ne-event="add">Add</button><button data-ne-event="update" ${selected?'':'disabled'}>Update</button><button data-ne-event="delete" ${selected?'':'disabled'}>Delete</button><button data-ne-event="duplicate" ${selected?'':'disabled'}>Duplicate</button><button data-action="save-events">Save Events</button><label class="ed-file">Load Events<input id="ne-events-import" type="file" accept=".json"></label></div><div class="ne-events-list">${events.map((event,index)=>`<button data-event-index="${index}" class="${event===selected?'active':''}">${Math.round(event.t)} · ${NE_ESCAPE(event.e)}</button>`).join('')}</div>`;
  panel.querySelector('#ne-event-id').onchange=e=>{this.selectedEvent=null;this.eventDraftId=e.target.value;this.renderPanel();};panel.querySelectorAll('[data-event-index]').forEach(button=>button.onclick=()=>{this.selectedEvent=events[Number(button.dataset.eventIndex)];this.eventDraftId=this.selectedEvent.e;this.renderPanel();});
  panel.querySelectorAll('[data-event-value]').forEach(input=>input.oninput=()=>{const values={};for(const el of panel.querySelectorAll('[data-event-value]'))values[el.dataset.eventValue]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;panel.querySelector('#ne-event-json').value=JSON.stringify(values);});
  panel.querySelectorAll('[data-ne-event]').forEach(button=>button.onclick=()=>{try{const action=button.dataset.neEvent;if(action==='delete'){this.mutate(()=>{this.raw.song.events=events.filter(e=>e!==selected);this.selectedEvent=null;});return;}const event={t:Math.max(0,Number(panel.querySelector('#ne-event-time').value)||0),e:panel.querySelector('#ne-event-id').value,v:JSON.parse(panel.querySelector('#ne-event-json').value)};this.mutate(()=>{this.raw.song.events??=[];if(action==='update')Object.assign(selected,event);else{if(action==='duplicate')event.t+=15000/this.timing[this.section].bpm;this.raw.song.events.push(event);this.selectedEvent=event;}this.raw.song.events.sort((a,b)=>a.t-b.t);});}catch(error){this.status('Invalid event JSON: '+error.message);}});panel.querySelector('[data-action="save-events"]').onclick=()=>this.action('save-events');this.bindEventsImport(panel.querySelector('#ne-events-import'));
 };
 Editor.prototype.bindEventsImport=function(input){if(!input)return;input.onchange=async()=>{const file=input.files[0];if(!file)return;try{const data=JSON.parse(await file.text()),events=Array.isArray(data)?data:data.events||data.song?.events;if(!Array.isArray(events)||events.some(e=>!Number.isFinite(e.t)||typeof e.e!=='string'))throw Error('Expected timestamped V-Slice events.');this.mutate(()=>{this.raw.song.events=structuredClone(events).sort((a,b)=>a.t-b.t);this.selectedEvent=null;});this.status('Loaded '+events.length+' events.');}catch(error){this.status('Events import failed: '+error.message);}};};
 Editor.prototype.editField=function(key,value){if(['offset','gfVersion','player3','stage','noteTexture','noteSplashTexture'].includes(key)){this.mutate(()=>this.raw.song[key]=value,false,false);return;}return oldEdit.call(this,key,value);};
 Editor.prototype.action=async function(action){if(action==='save-events'){const url=URL.createObjectURL(new Blob([JSON.stringify({events:this.raw.song.events||[]},null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=(this.raw.song.song||'song').replace(/[^a-z0-9_-]/gi,'-')+'-events.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),5000);this.status('Events exported.');return;}if(action==='change-notes'){this.status('Note texture changes apply to the next playtest when that atlas is included or imported.');return;}return oldAction.call(this,action);};
 Editor.prototype.draw=function(timestamp){oldDraw.call(this,timestamp);if(!this.visible)return;const t=this.timing[this.section],g=this.gctx,stepMs=15000/t.bpm;for(const event of this.raw.song.events||[]){if(event.t<t.start||event.t>=t.end)continue;const y=42+(event.t-t.start)/stepMs*44;g.fillStyle=event===this.selectedEvent?'#fff':'#f4cb31';g.beginPath();g.moveTo(10,y-5);g.lineTo(17,y);g.lineTo(10,y+5);g.lineTo(3,y);g.closePath();g.fill();}};
}


// ---- modern-freeplay.mjs ----
// Modern freeplay presentation, using the user's locally installed FNF artwork.
// This module is independent of game state. draw() returns semantic click targets.
const DIGITS=['ZERO','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE'];
const IMAGE_NAMES=['bg','capsule','selector','letters','highscore','normal','easy','hard','fav','dad','bficon','album','albumtitle','digits','smallnumbers','clear','rank','inst','bpm','difficulty','pink','glow','dot','sparkle','dj','erect','nightmare','album3','album3title','album4','album4title','picoicon','bgpico','bfportrait','picoportrait','charselectbg','charselectselector','bfnametag','piconametag','picodj','spookyicon','monstericon','album2','album2title','momicon','gficon','expansion1','expansion1title','expansion2','expansion2title','parentsicon','senpaiicon','spiriticon'];
function label(ctx,str,x,y,size=24,color='#fff',align='left',outline=2){ctx.save();ctx.font=`${size}px VCR,monospace`;ctx.textAlign=align;ctx.textBaseline='top';ctx.lineJoin='round';ctx.lineWidth=outline*2;ctx.strokeStyle='#10101c';if(outline)ctx.strokeText(str,x,y);ctx.fillStyle=color;ctx.fillText(str,x,y);ctx.restore();}

class ModernFreeplay {
  constructor(base='modern-'){this.base=base;this.images={};this.atlases={};this.groups=new Map();this.ready=false;this.previousSelection=null;this.selectionAt=0;this.idleCanvases=new Map();}
  async load(progress=()=>{}){let complete=0;const response=await fetch(this.base+'pack.json');if(!response.ok)throw new Error('Could not load modern freeplay artwork');const pack=await response.json();this.atlases=pack.atlases;this.dj=pack.dj;this.picoDJ=pack.picoDJ;await Promise.all(IMAGE_NAMES.map(async n=>{const img=new Image();img.src=pack.images[n];await img.decode();this.images[n]=img;progress(++complete/IMAGE_NAMES.length);}));
    // Precompose the 14 idle frames once. Freeplay animates one compact bitmap per frame.
    for(let index=17;index<31;index++){const off=document.createElement('canvas');off.width=405;off.height=452;const context=off.getContext('2d');context.translate(0,-268);this.drawDJFrame(context,index);this.idleCanvases.set(index,off);}this.tintedDigits=document.createElement('canvas');this.tintedDigits.width=this.images.digits.width;this.tintedDigits.height=this.images.digits.height;const tint=this.tintedDigits.getContext('2d');tint.drawImage(this.images.digits,0,0);tint.globalCompositeOperation='source-in';tint.fillStyle='#75efff';tint.fillRect(0,0,this.tintedDigits.width,this.tintedDigits.height);this.ready=true;return this;
  }
  frames(name,prefix){const key=name+'|'+prefix;if(!this.groups.has(key))this.groups.set(key,(this.atlases[name]||[]).filter(f=>f.name.startsWith(prefix)));return this.groups.get(key);}
  sprite(ctx,name,prefix,x,y,scale=1,index=0,alpha=1){const list=this.frames(name,prefix),f=list[((Math.floor(index)%list.length)+list.length)%list.length];if(!f)return;ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(this.images[name],f.x,f.y,f.width,f.height,x-(f.frameX||0)*scale,y-(f.frameY||0)*scale,f.width*scale,f.height*scale);ctx.restore();}
  image(ctx,name,x,y,w,h,alpha=1){const img=this.images[name];if(!img)return;ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(img,x,y,w??img.width,h??img.height);ctx.restore();}
  albumImage(album){return this.skyAlbums?.[album]&&this.images[album]?album:({volume2:'album2',volume3:'album3',volume4:'album4',expansion1:'expansion1',expansion2:'expansion2'}[album]||'album');}
  number(ctx,value,x,y,scale=1,{align='left',pad=0,small=false}={}){const name=small?'smallnumbers':'digits',str=String(Math.max(0,Math.round(Number(value)||0))).padStart(pad,'0');const glyphs=[...str].map(c=>this.frames(name,DIGITS[Number(c)])[0]);const width=glyphs.reduce((s,g)=>s+(g?.width||40)*scale,0);let dx=x-(align==='right'?width:align==='center'?width/2:0);for(const f of glyphs){if(f){ctx.drawImage(small?this.images[name]:this.tintedDigits,f.x,f.y,f.width,f.height,dx,y,f.width*scale,f.height*scale);dx+=f.width*scale;}}return width;}
  drawDJFrame(ctx,index,pico=false){const sky=this.character==='sky'&&this.skyDJ,commands=(sky?.timeline||(pico?this.picoDJ:this.dj)).frames[index]||[];ctx.save();if(sky?.timeline?.stageMatrix)ctx.transform(...sky.timeline.stageMatrix);for(const command of commands){const [x,y,w,h]=command.r;ctx.save();ctx.globalAlpha*=command.a??1;ctx.transform(...command.m);ctx.drawImage(sky?.image||(pico?this.images.picodj:this.images.dj),x,y,w,h,0,0,w,h);ctx.restore();}ctx.restore();}
  drawDJ(ctx,time,reducedMotion,animation='idle'){
    let localTime=time;if(!reducedMotion&&animation==='idle'){if(time<708)animation='intro';else if(time-this.selectionAt>80000){animation='watchingTV';localTime=time-this.selectionAt-80000;}else if(time-this.selectionAt>45000){animation='afk';localTime=time-this.selectionAt-45000;}}
    const pico=this.character==='pico',sky=this.character==='sky'&&this.skyDJ,data=sky?.timeline||(pico?this.picoDJ:this.dj);const [start,length]=data.labels[animation]||data.labels.idle,index=start+(reducedMotion?0:['intro','characterSelect','confirm'].includes(animation)?Math.min(length-1,Math.floor(localTime*24/1000)):Math.floor(localTime*24/1000)%length);const key=sky?'sky:'+index:pico?'pico:'+index:index;let cached=this.idleCanvases.get(key);if(!cached&&(pico||sky)&&animation==='idle'){cached=document.createElement('canvas');cached.width=435;cached.height=460;const c=cached.getContext('2d');c.translate(0,-260);this.drawDJFrame(c,index,pico);this.idleCanvases.set(key,cached);}if(cached)ctx.drawImage(cached,0,sky||pico?260:268);else this.drawDJFrame(ctx,index,pico);
  }
  arrow(ctx,x,y,right=false){ctx.save();ctx.translate(x,y);if(right)ctx.scale(-1,1);ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-10,25);ctx.lineTo(12,50);ctx.lineTo(12,37);ctx.lineTo(2,25);ctx.lineTo(12,13);ctx.closePath();ctx.lineJoin='miter';ctx.lineWidth=9;ctx.strokeStyle='#000';ctx.stroke();ctx.fillStyle='#22d1e4';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#d7fdff';ctx.stroke();ctx.restore();}
  capsule(ctx,{song,x,y,selected,time,difficulty,favorite,record,previewing}){const scale=0.82;const prefix=selected?'mp3 capsule w backing0':'mp3 capsule w backing NOT SELECTED';const capsule=this.character==='sky'&&this.frames('skyCapsule',prefix).length?'skyCapsule':'capsule';this.sprite(ctx,capsule,prefix,x,y,scale,selected?Math.floor(time/90)%8:0,selected?1:0.8);
    if(song.id!=='random'){ctx.save();ctx.imageSmoothingEnabled=false;const icon=this.characterIcons?.[song.opponent];this.sprite(ctx,icon|| (song.opponent?.includes('parents')?'parentsicon':song.opponent?.includes('senpai')?'senpaiicon':song.opponent==='spirit'?'spiriticon':song.opponent?.includes('mom')?'momicon':song.opponent==='gf'?'gficon':song.opponent?.includes('pico')?'picoicon':song.opponent?.includes('spooky')?'spookyicon':song.opponent?.includes('monster')?'monstericon':'dad'),selected?'confirm-hold':'idle',x-2,y+28,1.65);ctx.restore();}
    label(ctx,song.name,x+65,y+23,27,selected?'#e9ffff':'#a1b0b9','left',2);
    if(song.id!=='random'){this.image(ctx,'bpm',x+62,y+83,28,16,selected?0.9:0.55);label(ctx,String(song.bpm||100),x+94,y+84,16,selected?'#8c97a0':'#4b5460','left',0);const week=typeof song.week==='number'?(song.week?'WEEK '+song.week:'TUTORIAL'):song.week==='weekend1'?'WEEKEND 1':song.week==='sky'?'SKY REBORN':'MOD';label(ctx,week,x+203,y+84,16,selected?'#8c97a0':'#4b5460','left',0);this.image(ctx,'difficulty',x+350,y+83,65,16,selected?0.8:0.45);if(record)label(ctx,record.rank||'',x+434,y+32,23,'#52f1f8','center',2);}
    if(favorite)this.sprite(ctx,'fav','favorite heart',x+443,y+17,0.65,0);
    if(selected&&previewing){for(let i=0;i<4;i++){const height=6+(Math.sin(time/110+i*1.6)+1)*8;ctx.fillStyle='#67f0fa';ctx.fillRect(x+430+i*8,y+58-height,5,height);}}
  }
  draw(ctx,state={}){
    const {time=0,difficulty=1,records={},favorites=[],filter='all',search='',sort='default',songs=[],previewing=false,reducedMotion=false,character='bf',album='volume1'}=state;this.character=character;
    if(!this.ready){ctx.fillStyle='#000';ctx.fillRect(0,0,1280,720);label(ctx,'LOADING FREEPLAY…',640,340,32,'#fff','center');return [];}
    const targets=[],add=(id,labelText,x,y,w,h,action,value)=>targets.push({id,label:labelText,x,y,w,h,action,value});
    let selectedSong=state.selectedSong;if(typeof selectedSong==='number')selectedSong=songs[selectedSong]?.id;selectedSong=selectedSong?.id||selectedSong||songs[0]?.id||'random';
    if(this.previousSelection!==selectedSong){this.previousSelection=selectedSong;this.selectionAt=time;}
    const song=songs.find(s=>s.id===selectedSong),record=records[selectedSong]||null;const favSet=new Set(favorites instanceof Set?[...favorites]:favorites);
    ctx.save();ctx.fillStyle='#171629';ctx.fillRect(0,0,1280,720);this.image(ctx,character==='sky'?'skyBg':character==='pico'?'bgpico':'bg',342,64,1043,656);
    ctx.fillStyle='#ffda55';ctx.beginPath();ctx.moveTo(0,64);ctx.lineTo(395,64);ctx.lineTo(555,720);ctx.lineTo(0,720);ctx.closePath();ctx.fill();
    ctx.save();ctx.beginPath();ctx.moveTo(0,64);ctx.lineTo(395,64);ctx.lineTo(555,720);ctx.lineTo(0,720);ctx.closePath();ctx.clip();
    if(character==='pico')this.backingCard?.drawPicoCard(ctx,time,{reducedMotion});if(character==='sky'){this.image(ctx,'skyCard',0,64,570,656);for(const [i,name] of ['skyClouds','skyHeads','skyLines','skyAurora'].entries()){const offset=reducedMotion?0:time/(58+i*22)%555;this.image(ctx,name,-offset,64,555,656,.7);this.image(ctx,name,555-offset,64,555,656,.7);}}const phrases=['MORE WAYS THAN ONE','BOYFRIEND','IT\'S PERFECTLY NORMAL','HOTTEST TRACKS','MORE WAYS THAN ONE','BOYFRIEND'];
    if(character==='bf')phrases.forEach((p,i)=>{const offset=reducedMotion?0:(time/45*(i%2?1:-1))%330;label(ctx,p,offset-145,162+i*74,39,i%2?'#f4a04f':'#fff19b','left',0);label(ctx,p,offset+440,162+i*74,39,i%2?'#f4a04f':'#fff19b','left',0);});ctx.restore();
    // Album panel and dotted arc are behind the song capsules and DJ.
    ctx.save();ctx.strokeStyle='#edf3f6';ctx.lineWidth=4;ctx.lineCap='round';ctx.setLineDash([0,20]);ctx.beginPath();ctx.arc(1106,505,255,-2.2,0.9);ctx.stroke();ctx.restore();
    const albumImage=this.albumImage(album),albumTitle=albumImage+'title';const albumAngle=reducedMotion?0.17:0.17+Math.sin(time/2500)*0.025;ctx.save();ctx.translate(1100,458);ctx.rotate(albumAngle);this.image(ctx,albumImage,-142,-142,284,284);ctx.restore();
    this.sprite(ctx,albumTitle,'idle',978,570,0.85,Math.floor(time/110));
    add('fp-album','Album: '+(this.skyAlbums?.[album]?.name||'Friday Night Funkin OST'),950,290,330,350,'album',album);
    this.drawDJ(ctx,time,reducedMotion,state.djAnimation||'idle');
    const rows=[{id:'random',name:'Random'},...songs];let selectedIndex=rows.findIndex(s=>s.id===selectedSong);if(selectedIndex<0)selectedIndex=1;
    const originY=297-selectedIndex*118;
    ctx.save();ctx.beginPath();ctx.rect(350,142,610,500);ctx.clip();rows.forEach((s,i)=>{const y=originY+i*118,x=374+Math.max(0,i-selectedIndex+1)*15;if(y<-90||y>700)return;const active=s.id===selectedSong;this.capsule(ctx,{song:s,x,y,selected:active,time:time-this.selectionAt,difficulty,favorite:favSet.has(s.id),record:records[s.id],previewing:active&&previewing});if(y>=140&&y+109<=648)add('fp-song-'+s.id,s.id==='random'?'Play a random song':`Select ${s.name}`,x,y,502,107,'song',s.id);});ctx.restore();
    if(!songs.length)label(ctx,'NO SONGS MATCH',635,318,25,'#efffff','center');
    // Header, difficulty label, alphabet/favorites tabs and high score use the original artwork.
    ctx.fillStyle='#000';ctx.fillRect(0,0,1280,64);label(ctx,'FREEPLAY',8,11,38,'#fff','left',0);label(ctx,this.skyAlbums?.[album]?'SKY REBORN':'OFFICIAL OST',1270,11,38,'#fff','right',0);
    if(difficulty>4)label(ctx,state.difficultyLabel||'CUSTOM',200,95,30,'#111','center',0);const diff=['easy','normal','hard','erect','nightmare'][difficulty]||'normal',img=this.images[diff];if(diff==='nightmare')this.sprite(ctx,'nightmare','idle',66,80,1.12,Math.floor(time/60));else if(difficulty<=4)this.image(ctx,diff,70,80,Math.min(250,img.width*1.12),80);this.arrow(ctx,33,85);this.arrow(ctx,352,85,true);
    add('fp-diff-prev','Previous difficulty',9,75,55,85,'difficulty',-1);add('fp-diff-next','Next difficulty',327,75,55,85,'difficulty',1);
    const tabs=[{value:'numbers',prefix:'#',label:'#',w:43},{value:'favorites',prefix:'fav',label:'Favorites',w:48},{value:'all',prefix:'ALL',label:'All songs',w:64},{value:'a-d',text:'A-D',label:'Songs A through D',w:70},{value:'e-l',text:'E-L',label:'Songs E through L',w:70},{value:'m-r',text:'M-R',label:'Songs M through R',w:72},{value:'s-z',text:'S-Z',label:'Songs S through Z',w:72}];let tabX=400;
    for(const tab of tabs){const active=filter===tab.value||filter==='all'&&tab.value==='all';if(active){ctx.fillStyle='#0008';ctx.fillRect(tabX-4,73,tab.w+5,58);}if(tab.prefix)this.sprite(ctx,'letters',tab.prefix+' instance',tabX,80,tab.value==='all'?0.72:0.63,0,active?1:0.7);else label(ctx,tab.text,tabX+2,89,24,active?'#fff':'#aaa','left',2);add('fp-filter-'+tab.value,tab.label,tabX-5,73,tab.w,62,'filter',tab.value);tabX+=tab.w+6;}
    this.sprite(ctx,'highscore','highscore small instance',866,73,1.06,reducedMotion?0:Math.floor(time/80));this.number(ctx,record?.score||0,1226,133,0.87,{align:'right',pad:7});
    this.image(ctx,'clear',1175,71,103,50);label(ctx,`${record?Math.floor(record.accuracy||0):0}%`,1263,94,21,'#fff','right',0);
    if(song&&favSet.has(song.id))this.sprite(ctx,'fav','favorite heart',1131,167,0.6,0);
    add('fp-favorite','Toggle favorite for selected song',1169,170,100,50,'favorite',selectedSong);
    const detail=record?`${(record.accuracy||0).toFixed(2)}%  •  ${record.rank||'D'}  •  ${record.misses||0} MISSES`:'NO SCORE YET';label(ctx,detail,1258,213,17,'#d4e8f5','right',2);
    // The controls sit in the same low black band as the native game.
    ctx.fillStyle='#000d';ctx.fillRect(0,665,1280,55);label(ctx,'ESC BACK',17,684,18,'#fff','left',0);label(ctx,'SPACE PREVIEW   F FAVORITE   7 CHART EDITOR',1270,684,17,'#c6d4df','right',0);
    label(ctx,search?`SEARCH: ${search}`:'SEARCH SONGS  [CTRL+F]',434,638,18,'#dbeef4','left',2);add('fp-search','Search songs',420,623,430,40,'search');
    label(ctx,`SORT: ${String(sort).toUpperCase()}`,865,638,18,'#dbeef4','left',2);add('fp-sort','Change sort order',850,623,320,40,'sort');
    add('fp-back','Back to main menu',0,665,160,55,'back');
    add('fp-preview',previewing?'Stop song preview':'Preview selected song',1065,628,200,35,'preview',selectedSong);
    ctx.restore();return targets;
  }
}

function modernLabel(...args){return label(...args);}


// ---- abot.mjs ----
const ABOT_COLUMN_X=[0,59,115,181,235,287,338],ABOT_COLUMN_Y=[0,-8,-11.5,-11.9,-11.4,-6.7,0.3];
function drawABot(ctx,assets,audio,{neneX,neneY,scale=0.57,time=0,bodyX=null,bodyY=null}={}){
  const x=bodyX??neneX+(-95+4)*scale,y=bodyY??neneY+(384-89+2)*scale,spectrum=audio.spectrum();ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  if(assets.images.ABOT_SCREEN)assets.image(ctx,'ABOT_SCREEN',150,28,485,285);else{ctx.fillStyle='#070d0b';ctx.fillRect(174,47,460,265);}
  // Native seven-column A-Bot display, driven by the same 256-point FFT as its game implementation.
  for(let i=0;i<7;i++){const lo=Math.floor(Math.pow(i/7,1.7)*110)+1,hi=Math.max(lo+1,Math.floor(Math.pow((i+1)/7,1.7)*110));let energy=0;for(let j=lo;j<hi;j++)energy+=spectrum[j]||0;const level=energy/(hi-lo)/255,quantized=Math.round(level*6);if(!quantized)continue;const frame=5-clamp(quantized-1,0,5);if(assets.atlases.ABOT_VIZ)assets.draw(ctx,'ABOT_VIZ',assets.frame('ABOT_VIZ',`viz${i+1}0`,frame),207+ABOT_COLUMN_X[i],82+ABOT_COLUMN_Y[i]);else{ctx.fillStyle='#39ed73';ctx.fillRect(205+i*54,270-level*190,38,level*190);}}
  assets.image(ctx,'ABOT',0,0,812,357);ctx.restore();
}


// ---- touch-controls.mjs ----
class TouchControls {
 constructor(root,{active,lanes,onPress,onRelease}){this.active=active;this.lanes=lanes;this.onPress=onPress;this.onRelease=onRelease;this.pointers=new Map();this.surface=document.createElement('div');this.surface.id='touch-lanes';this.surface.hidden=true;this.surface.setAttribute('aria-label','Swipe note lanes');root.append(this.surface);
  this.surface.addEventListener('pointerdown',e=>{if(!this.active())return;e.preventDefault();this.surface.setPointerCapture(e.pointerId);this.move(e,true);});
  this.surface.addEventListener('pointermove',e=>{if(this.pointers.has(e.pointerId)){e.preventDefault();this.move(e);}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])this.surface.addEventListener(type,e=>this.release(e.pointerId));
  window.addEventListener('blur',()=>this.clear());
 }
 move(event,first=false){const r=this.surface.getBoundingClientRect(),next=laneAtPoint(event.clientX,r.left,r.width,this.lanes()),before=this.pointers.get(event.pointerId);if(before===next&&!first)return;if(before!==undefined){this.pointers.delete(event.pointerId);if(![...this.pointers.values()].includes(before))this.onRelease(before);}this.pointers.set(event.pointerId,next);this.surface.dataset.lastLane=next;this.surface.dataset.presses=Number(this.surface.dataset.presses||0)+1;if(before!==undefined)this.surface.dataset.swipes=Number(this.surface.dataset.swipes||0)+1;this.surface.dataset.activePointers=this.pointers.size;this.onPress(next);}
 release(id){const lane=this.pointers.get(id);if(lane===undefined)return;this.pointers.delete(id);this.surface.dataset.activePointers=this.pointers.size;if(![...this.pointers.values()].includes(lane))this.onRelease(lane);}
 clear(){for(const id of [...this.pointers.keys()])this.release(id);}
 update(enabled,count){this.surface.hidden=!enabled;if(!enabled)this.clear();if(this.surface.dataset.lanes!==String(count)){this.surface.dataset.lanes=count;this.surface.style.setProperty('--touch-count',count);this.surface.innerHTML=Array.from({length:count},(_,i)=>`<span aria-hidden="true" data-lane="${i}"></span>`).join('');}for(const el of this.surface.children)el.classList.toggle('held',[...this.pointers.values()].includes(Number(el.dataset.lane)));}
}


// ---- transitions.mjs ----
class SceneTransitions {
  constructor(){this.canvas=document.createElement('canvas');this.canvas.width=1280;this.canvas.height=720;this.ctx=this.canvas.getContext('2d');this.active=false;}
  begin(source,from,to,{reducedMotion=false,now=performance.now()}={}){if(reducedMotion||from==='editor'||to==='editor'||from==='mods'||to==='mods'||from==='character'||to==='character'){this.active=false;return;}this.ctx.drawImage(source,0,0);this.started=now;this.duration=['play','paused'].includes(from)&&['play','paused'].includes(to)?150:480;this.active=true;this.kind=['story','play','loading','results'].includes(to)?'curtain':'slide';}
  draw(ctx,now){if(!this.active)return;const p=Math.min(1,(now-this.started)/this.duration);if(p>=1){this.active=false;return;}const eased=1-Math.pow(1-p,3);ctx.save();if(this.kind==='slide'){ctx.globalAlpha=1-eased;ctx.drawImage(this.canvas,-eased*95,0);ctx.globalAlpha=(1-p)*0.3;ctx.fillStyle='#090a19';ctx.fillRect(0,0,1280,720);}else{const edge=eased*1600;ctx.beginPath();ctx.moveTo(edge-320,0);ctx.lineTo(1280,0);ctx.lineTo(1280,720);ctx.lineTo(edge,720);ctx.closePath();ctx.clip();ctx.drawImage(this.canvas,0,0);ctx.fillStyle='#000';ctx.fillRect(edge-320,0,45,720);}ctx.restore();}
}


// ---- character-select.mjs ----
// Native character-select scene, extracted from the user's installed game.
// Replays original Animate timelines and spotlight video, with original music.
// Parent integration: stop other menu music, await load(), begin({character}),
// draw(ctx,{now: performance.now()}), route move/choose/confirm/cancel actions,
// and consumeResult() to return to that character's freeplay intro.
const CS_CLAMP=(v,a,b)=>Math.min(b,Math.max(a,v));
const CS_EXPO=t=>t>=1?1:1-Math.pow(2,-10*CS_CLAMP(t,0,1));
const CS_BACK=t=>2.70158*t*t*t-1.70158*t*t;
const CS_SLOTS={3:'pico',4:'bf',7:'sky'};
const CS_PARTNER={bf:'gfChill',pico:'neneChill'};
const CS_PLAYER={bf:'bfChill',pico:'picoChill',sky:'skyChill',locked:'lockedChill'};

class CharacterSelect {
  constructor(base='charselect-'){
    this.base=base;this.ready=false;this.images={};this.animations={};this.atlases={};this.phase='inactive';this.slot=4;this.character='bf';this.original='bf';this.phaseAt=0;this.changedAt=-10000;this.deniedAt=-10000;this.deselectAt=-10000;this.previous=null;this.result=null;this.volume=0.7;this.reducedMotion=false;this.cursorX=560;this.cursorY=248;this.trailX=560;this.trailY=248;this.lastTime=0;this.sounds={};this.music=null;this.video=null;this.lastCommand='';
  }
  async load(progress=()=>{}){
    if(this.ready)return this;
    const response=await fetch(this.base+'charselect-pack.json');if(!response.ok)throw new Error('Character select assets could not load');const pack=await response.json();this.animations=pack.animations;this.atlases=pack.atlases;this.timing=pack.timing;
    const entries=Object.entries(pack.images);let complete=0;
    await Promise.all(entries.map(async([name,url])=>{const img=new Image();img.src=url;await img.decode();this.images[name]=img;progress(++complete/entries.length);}));
    for(const name of ['CS_Lights','CS_confirm','CS_select','CS_locked','static-loop','stayFunky-intro','stayFunky']){const el=new Audio(this.base+name+'.ogg');el.preload='auto';this.sounds[name]=el;el.load();}
    this.sounds['static-loop'].loop=true;this.sounds.stayFunky.loop=true;
    this.video=document.createElement('video');this.video.src=this.base+'introSelect.mp4';this.video.preload='auto';this.video.playsInline=true;this.video.setAttribute('playsinline','');this.video.onended=()=>{if(this.phase==='video')this.reveal(performance.now());};this.video.load();
    this.tintedCursors={};for(const color of ['#ffff00','#3c74f7','#3ebbff']){const off=document.createElement('canvas');off.width=this.images.cursor.width;off.height=this.images.cursor.height;const c=off.getContext('2d');c.drawImage(this.images.cursor,0,0);c.globalCompositeOperation='source-in';c.fillStyle=color;c.fillRect(0,0,off.width,off.height);this.tintedCursors[color]=off;}
    this.ready=true;return this;
  }
  begin({character='bf',volume=0.7,reducedMotion=false,playIntro=true,now=performance.now()}={}){
    this.stop();this.original=character in CS_PLAYER&&character!=='locked'?character:'bf';this.character=this.original;this.slot=Number(Object.keys(CS_SLOTS).find(slot=>CS_SLOTS[slot]===this.character));this.volume=CS_CLAMP(volume,0,1);this.reducedMotion=reducedMotion;this.phaseAt=now;this.changedAt=now-10000;this.deniedAt=-10000;this.deselectAt=-10000;this.previous=null;this.result=null;this.lastTime=now;this.cursorX=this.targetCursor().x;this.cursorY=this.targetCursor().y;this.trailX=this.cursorX;this.trailY=this.cursorY;
    if(playIntro&&!reducedMotion&&this.video){this.phase='video';this.video.currentTime=0;this.video.volume=this.volume;this.video.play().catch(()=>{if(this.phase==='video')this.reveal(performance.now());});}else this.reveal(now);
    return this;
  }
  reveal(now=performance.now()){
    if(this.video)this.video.pause();this.phase='reveal';this.phaseAt=now;this.themeAt=now;this.effect('CS_Lights',0.9);this.playTheme();
  }
  playTheme(){
    const intro=this.sounds['stayFunky-intro'],loop=this.sounds.stayFunky;if(!intro||!loop)return;
    intro.pause();loop.pause();intro.currentTime=0;loop.currentTime=0;intro.playbackRate=loop.playbackRate=1;intro.volume=loop.volume=this.volume;
    intro.onended=()=>{if(['reveal','choose','confirm'].includes(this.phase)){this.music=loop;loop.play().catch(()=>{});}};
    this.music=intro;intro.play().catch(()=>{this.music=loop;loop.play().catch(()=>{});});
  }
  effect(name,scale=1){const a=this.sounds[name];if(!a)return;a.pause();try{a.currentTime=0;}catch{}a.volume=CS_CLAMP(this.volume*scale,0,1);a.play().catch(()=>{});}
  setVolume(volume){this.volume=CS_CLAMP(volume,0,1);if(this.music&&!['confirm','exit'].includes(this.phase))this.music.volume=this.volume;}
  targetCursor(){const col=this.slot%3-1,row=Math.floor(this.slot/3)-1;return{x:110*col+640-this.images.cursor.width/2-16,y:110*row+360-this.images.cursor.height/2-48};}
  move(dx,dy,now=performance.now()){
    if(!['choose','reveal'].includes(this.phase))return false;
    let x=this.slot%3,y=Math.floor(this.slot/3);x=(x+dx+3)%3;y=(y+dy+3)%3;return this.choose(y*3+x,now);
  }
  choose(slot,now=performance.now(),acceptIfSame=false){
    if(!['choose','reveal'].includes(this.phase))return false;slot=CS_CLAMP(Math.round(slot),0,8);if(slot===this.slot){if(acceptIfSame)return this.confirm(now);return true;}
    const before=this.character;this.slot=slot;this.character=CS_SLOTS[slot]||'locked';this.deniedAt=-10000;this.deselectAt=-10000;this.effect('CS_select',0.7);
    if(before!==this.character){this.previous=before;this.changedAt=now;if(this.character==='locked'){const s=this.sounds['static-loop'];s.volume=this.volume*0.3;s.play().catch(()=>{});}else this.sounds['static-loop']?.pause();}
    return true;
  }
  confirm(now=performance.now()){
    if(this.phase==='video'){this.reveal(now);return true;}
    if(!['choose','reveal'].includes(this.phase))return false;
    if(this.character==='locked'){this.deniedAt=now;this.effect('CS_locked',0.9);return false;}
    this.phase='confirm';this.phaseAt=now;this.effect('CS_confirm',0.9);this.sounds['static-loop']?.pause();return true;
  }
  cancel(now=performance.now()){
    if(this.phase==='video'){this.reveal(now);return true;}
    if(this.phase==='confirm'){this.phase='choose';this.phaseAt=now;this.deselectAt=now;if(this.music){this.music.playbackRate=1;this.music.volume=this.volume;}return true;}
    if(['choose','reveal'].includes(this.phase)){this.cancelled=true;this.startExit(now);return true;}return false;
  }
  handleKey(code,now=performance.now()){
    if(code==='ArrowLeft'||code==='KeyA')return this.move(-1,0,now);
    if(code==='ArrowRight'||code==='KeyD')return this.move(1,0,now);
    if(code==='ArrowUp'||code==='KeyW')return this.move(0,-1,now);
    if(code==='ArrowDown'||code==='KeyS')return this.move(0,1,now);
    if(code==='Enter'||code==='Space')return this.confirm(now);
    if(code==='Escape'||code==='Backspace')return this.cancel(now);return false;
  }
  startExit(now){this.exitPose=this.phase==='confirm'?'select':'idle';this.phase='exit';this.phaseAt=now;this.sounds['static-loop']?.pause();}
  update(now){
    const elapsed=now-this.phaseAt;
    if(this.phase==='reveal'&&elapsed>=this.timing.reveal){this.phase='choose';this.phaseAt=now;}
    if(this.phase==='confirm'){
      const t=CS_CLAMP(elapsed/this.timing.confirm,0,1);if(this.music){this.music.volume=this.volume*(1-t*t);try{this.music.playbackRate=Math.max(0.1,1-0.9*CS_CLAMP(elapsed/1000,0,1));}catch{}}
      if(elapsed>=this.timing.confirm)this.startExit(now);
    }
    if(this.phase==='exit'){
      const exitElapsed=now-this.phaseAt,t=CS_CLAMP(exitElapsed/this.timing.exit,0,1);if(this.music)this.music.volume=this.volume*(1-t)*0.15;if(exitElapsed>=this.timing.exit){const cancelled=!!this.cancelled,selected=cancelled?this.original:this.character;this.stop();this.phase='complete';this.result={character:selected,cancelled};}
    }
    const step=CS_CLAMP((now-this.lastTime)/1000,0,0.1);const target=this.targetCursor();const l=1-Math.pow(0.01,step/0.1),trail=1-Math.pow(0.01,step/0.3);this.cursorX+=(target.x-this.cursorX)*l;this.cursorY+=(target.y-this.cursorY)*l;this.trailX+=(target.x-this.trailX)*trail;this.trailY+=(target.y-this.trailY)*trail;this.lastTime=now;
  }
  consumeResult(){const result=this.result;this.result=null;return result;}
  stop(){for(const a of Object.values(this.sounds)){a.pause();a.onended=null;try{a.currentTime=0;a.playbackRate=1;}catch{}}this.video?.pause();this.music=null;this.cancelled=false;this.phase='inactive';}
  frameIndex(name,label,time,loop=true){const a=this.animations[name];if(!a)return 0;const[start,length]=a.labels[label]||[0,a.frames.length];const index=Math.floor(Math.max(0,time)*Number(a.fps||24)/1000);return start+(loop?index%Math.max(1,length):Math.min(length-1,index));}
  animation(ctx,name,label,time,{x=0,y=0,scale=1,loop=true,alpha=1,index=null}={}){
    const data=this.animations[name],image=this.images[name];if(!data||!image)return;
    const commands=data.frames[index??this.frameIndex(name,label,time,loop)]||[];ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.globalAlpha*=alpha;
    if(name==='skyChill'&&data.stageMatrix)ctx.transform(...data.stageMatrix);
    for(const command of commands){const[sx,sy,w,h]=command.r;ctx.save();ctx.globalAlpha*=command.a??1;ctx.transform(...command.m);ctx.drawImage(image,sx,sy,w,h,0,0,w,h);ctx.restore();}ctx.restore();
  }
  image(ctx,name,x,y,scale=1,alpha=1){const image=this.images[name];if(!image)return;ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(image,x,y,image.width*scale,image.height*scale);ctx.restore();}
  sprite(ctx,name,prefix,x,y,scale=1,time=0,loop=true){const list=(this.atlases[name]||[]).filter(f=>f.name.startsWith(prefix));if(!list.length)return;const index=Math.floor(time*24/1000),f=list[loop?index%list.length:Math.min(index,list.length-1)];ctx.drawImage(this.images[name],f.x,f.y,f.width,f.height,x-(f.frameX||0)*scale,y-(f.frameY||0)*scale,f.width*scale,f.height*scale);}
  player(ctx,character,now,phase){
    const atlas=CS_PLAYER[character],elapsed=now-this.phaseAt,changed=now-this.changedAt;
    if(phase==='confirm'||phase==='exit'&&this.exitPose==='select'){this.animation(ctx,atlas,'select',phase==='confirm'?elapsed:this.timing.confirm+elapsed,{loop:false});return;}
    if(character==='locked'&&now-this.deniedAt<4/24*1000){this.animation(ctx,atlas,'cannot select Label',now-this.deniedAt,{loop:false});return;}
    if(now-this.deselectAt<1000){const first=this.animations[atlas].labels.deselect?.[1]||2,duration=first/24*1000;this.animation(ctx,atlas,now-this.deselectAt<duration?'deselect':'deselect loop start',now-this.deselectAt<duration?now-this.deselectAt:now-this.deselectAt-duration,{loop:true});return;}
    if(changed<0.8*1000){const length=(this.animations[atlas]?.labels.slidein?.[1]||8)/24*1000;this.animation(ctx,atlas,changed<length?'slidein':'slidein idle point',changed<length?changed:changed-length,{loop:false});return;}
    // Native BF/Pico idles play once at each 90 BPM beat, holding their last
    // frame until the next beat instead of cycling the five-frame head bob.
    const beatPhase=Math.max(0,now-this.themeAt)%666.666667;
    this.animation(ctx,atlas,'idle',character==='locked'?now:beatPhase,{loop:character==='locked'});
  }
  draw(ctx,{now=performance.now(),reducedMotion=this.reducedMotion,volume=this.volume}={}){
    if(!this.ready){ctx.fillStyle='#000';ctx.fillRect(0,0,1280,720);return[];}this.setVolume(volume);this.update(now);const targets=[];
    if(this.phase==='video'){
      ctx.fillStyle='#000';ctx.fillRect(0,0,1280,720);if(this.video.readyState>=2)ctx.drawImage(this.video,0,0,1280,720);
      targets.push({id:'cs-skip-video',label:'Skip spotlight introduction',x:0,y:0,w:1280,h:720,action:'skip'});return targets;
    }
    if(this.phase==='complete'||this.phase==='inactive'){ctx.fillStyle='#000';ctx.fillRect(0,0,1280,720);return targets;}
    const elapsed=now-this.phaseAt,enter=this.phase==='reveal'?1-CS_EXPO(elapsed/1500):0,exit=this.phase==='exit'?CS_BACK(CS_CLAMP(elapsed/800,0,1)):0;
    const cameraY=reducedMotion?0:150*(enter+exit),panelIn=this.phase==='reveal'?1-CS_EXPO(elapsed/1000):0,panelY=(reducedMotion?0:panelIn+exit)*200;
    const selectedColumn=this.slot%3-1,selectedRow=Math.floor(this.slot/3)-1,panX=reducedMotion?0:selectedColumn*6,panY=reducedMotion?0:selectedRow*6;
    ctx.save();ctx.fillStyle='#122329';ctx.fillRect(0,0,1280,720);ctx.translate(-panX,cameraY-panY);
    this.image(ctx,'bg',-153+panX*0.9,-140+panY*0.9);this.animation(ctx,'crowd','',now,{x:panX*0.7,y:panY*0.7});this.animation(ctx,'charSelectStage','',now,{x:-2,y:1});this.image(ctx,'curtains',-212-panX*0.4,-99-panY*0.4);
    this.image(ctx,'light',800,250);this.image(ctx,'light',180,240);
    const partner=CS_PARTNER[this.character];if(partner){let label=(this.phase==='confirm'||this.phase==='exit'&&this.exitPose==='select')?'confirm':now-this.deselectAt<1000?'deselect':'idle';const partnerTime=label==='confirm'?now-this.phaseAt:label==='deselect'?now-this.deselectAt:Math.max(0,now-this.themeAt)%1333.333334;this.animation(ctx,partner,label,partnerTime,{loop:label==='confirm'});}
    if(this.previous&&now-this.changedAt<100){this.animation(ctx,CS_PLAYER[this.previous],'slideout',now-this.changedAt,{loop:false});}
    this.player(ctx,this.character,now,this.phase);
    this.animation(ctx,'charSelectSpeakers','',now,{x:-10-panX*0.8,y:-panY*0.8,scale:1.05});
    ctx.save();ctx.globalCompositeOperation='multiply';this.image(ctx,'foreground',-125,170);ctx.restore();ctx.restore();
    // Header and center choice panel remain fixed to the camera like the native UI.
    ctx.save();ctx.translate(0,panelY);ctx.save();ctx.globalCompositeOperation='multiply';this.animation(ctx,'barThing','',now,{scale:1});ctx.restore();
    ctx.save();ctx.globalCompositeOperation='lighter';this.sprite(ctx,'blur','CHOOSE vertical offset instance 1',419,-65,1,now);this.sprite(ctx,'backing','CHOOSE horizontal offset instance 1',423,-17,1,now);ctx.restore();this.image(ctx,'choose',426,-13);
    const name=this.images[this.character+'Name']||this.images.lockedName;const nameScale=0.77;ctx.drawImage(name,1008-name.width*nameScale/2,100-name.height*nameScale/2,name.width*nameScale,name.height*nameScale);
    for(let i=0;i<9;i++){
      const x=450+(i%3)*107,y=120+Math.floor(i/3)*127;const character=CS_SLOTS[i];
      if(character==='sky'){if(this.images.skyIcon)ctx.drawImage(this.images.skyIcon,0,0,this.images.skyIcon.height,this.images.skyIcon.height,x+20,y+22,80,80);}
      else if(character){const atlas=character==='bf'?'bfIcon':'picoIcon',list=this.atlases[atlas]||[],prefix=i===this.slot?'idle':'idle';const frame=list.find(f=>f.name.toLowerCase().startsWith(prefix))||list[0];if(frame){ctx.save();ctx.imageSmoothingEnabled=false;const b=i===this.slot&&!reducedMotion?1+Math.max(0,1-(now/666.666%1)*4)*0.04:1;const scale=128/(frame.frameWidth||frame.width)*b;ctx.drawImage(this.images[atlas],frame.x,frame.y,frame.width,frame.height,x-(frame.frameX||0)*scale,y-(frame.frameY||0)*scale,frame.width*scale,frame.height*scale);ctx.restore();}}
      else {const animation=i===this.slot?(now-this.deniedAt<500?'clicked':'selected'):'idle';this.animation(ctx,'lock',animation,animation==='clicked'?now-this.deniedAt:now,{x:x-238.75,y:y-148.6});}
      if(['choose','reveal'].includes(this.phase))targets.push({id:'cs-slot-'+i,label:character?`Choose ${{bf:'Boyfriend',pico:'Pico',sky:'Sky'}[character]}`:'Locked character slot',x:x+12,y:y+12,w:98,h:106,action:'slot',value:i});
    }
    const cursorAlpha=this.phase==='exit'?1-CS_CLAMP(elapsed/800,0,1):1;ctx.globalAlpha=cursorAlpha;
    if(this.phase==='confirm'||this.phase==='exit')this.sprite(ctx,'confirmCursor','cursor ACCEPTED instance 1',this.cursorX-2,this.cursorY-4,1,this.phase==='confirm'?elapsed:1500+elapsed);
    else {ctx.save();ctx.globalCompositeOperation='screen';ctx.drawImage(this.tintedCursors['#3c74f7'],this.trailX,this.trailY);ctx.drawImage(this.tintedCursors['#3ebbff'],(this.trailX+this.cursorX)/2,(this.trailY+this.cursorY)/2);ctx.restore();ctx.drawImage(this.tintedCursors['#ffff00'],this.cursorX,this.cursorY);if(now-this.deniedAt<500)this.sprite(ctx,'deniedCursor','cursor DENIED instance 1',this.cursorX-2,this.cursorY-4,1,now-this.deniedAt,false);}
    ctx.restore();
    if(this.phase==='exit'){
      const t=CS_CLAMP(elapsed/800,0,1);ctx.save();ctx.globalAlpha=t*t;ctx.fillStyle='#084a9a';ctx.fillRect(0,0,1280,720);ctx.restore();const g=ctx.createLinearGradient(0,720*(1-t)-120,0,720*(1-t)+160);g.addColorStop(0,'#000');g.addColorStop(1,'#0000');ctx.fillStyle=g;ctx.fillRect(0,0,1280,720);
    }else if(this.phase==='reveal'&&!reducedMotion){const t=CS_CLAMP(elapsed/800,0,1);ctx.save();ctx.globalAlpha=(1-t)*(1-t);ctx.fillStyle='#0c326f';ctx.fillRect(0,0,1280,720);ctx.restore();}
    if(['choose','reveal'].includes(this.phase)){
      targets.push({id:'cs-confirm',label:this.character==='locked'?'Locked character':'Confirm '+({bf:'Boyfriend',pico:'Pico',sky:'Sky'}[this.character]),x:830,y:170,w:390,h:430,action:'confirm'});
      targets.push({id:'cs-back',label:'Return to previous character',x:0,y:655,w:210,h:65,action:'back'});
    }
    return targets;
  }
}


// ---- native-content.mjs ----
class NativeContent {
 constructor(assets,audio){this.assets=assets;this.audio=audio;this.data={stages:{},characters:{},reuse:{}};this.tintCache=new Map();}
 async load(){const response=await fetch('native-content.json');if(response.ok)this.data=await response.json();return this;}
 stage(choice){return this.data.stages[choice.stage];}
 character(id,player=false){const mapped=this.data.characterIds?.[id];if(mapped&&this.data.characters[mapped])return this.data.characters[mapped];const name=id==='bf-car'?'BF_CAR':id==='mom-car'||id==='mom'?'MOM_CAR':id==='gf-car'?'GF_CAR':id==='gf'||id==='gf-extended'?'GF_EXTENDED':id==='nene'?'NENE_EXTENDED':id==='pico'&&!player?'PICO_OPPONENT':null;return name?this.data.characters[name]:null;}
 required(choice){const stage=this.stage(choice),names=new Set();if(stage)for(const prop of stage.props)if(prop.assetId)names.add(prop.assetId);const chars=choice.characters||{player:choice.character==='pico'?'pico-playable':'bf',girlfriend:choice.character==='pico'?'nene':'gf',opponent:choice.opponent||'dad'};for(const role of ['player','opponent','girlfriend']){const config=this.character(chars[role],role==='player');if(config)names.add(config.atlasName);const icon=this.data.iconAssets?.[chars[role]];if(icon)names.add(icon);}if(choice.character==='pico')names.add('NENE_EXTENDED');if(choice.opponent==='gf')names.add('GF_EXTENDED');if(chars.girlfriend==='nene-pixel')for(const layer of this.data.pixelABot?.layers||[])names.add(layer.assetId);return [...names];}
 drawCharacter(ctx,id,actor,{x,y,scale=0.65,time=0,beat=0,bpm=100,period=1,player=false,animation=null,animationTime=null,suffix=null,globalOffsets=true}={}){const config=this.character(id,player);if(!config)return false;const aliases=config.animationMap||{},idle=!actor||actor.direction==='idle'||time>actor.until,forced=actor?.forced&&time<actor.forced.until?actor.forced:null,dance=aliases.danceLeft?period===0?'danceLeft':(Math.floor(Math.max(0,beat)/Math.max(period,0.000001))%2?'danceRight':'danceLeft'):'idle',base=idle?dance:'sing'+actor.direction,variant=idle?suffix?.idle:suffix?.sing,requested=animation||forced?.name||(variant&&aliases[base+variant]?base+variant:base),alias=aliases[requested]||aliases[requested.replace(/miss|-alt|-sad|-censor/g,'')]||aliases[dance]||aliases.idle||Object.values(aliases)[0];if(!alias)return false;
 const frames=this.assets.frames(config.atlasName,alias.normalPrefix||alias.prefix);if(!frames.length)return false;const fps=alias.fps||24,indices=alias.frameIndices?.length?alias.frameIndices:frames.map((_,i)=>i),phase=animationTime??(forced?time-forced.since:idle?(period===0?0:((beat%period+period)%period)*60000/bpm):time-actor.since),offset=Math.floor(Math.max(0,phase)*fps/1000),index=indices[alias.looped?offset%indices.length:Math.min(indices.length-1,offset)],size=config.logicalIdleSize||config.logicalSize||[500,500],s=scale*(config.metadata?.scale||1),global=globalOffsets&&config.globalOffsets||[0,0];
 ctx.save();if(config.pixel||config.metadata?.isPixel)ctx.imageSmoothingEnabled=false;ctx.translate(x-size[0]*s/2+(global[0]||0)*s,y-size[1]*s+(global[1]||0)*s);if(!config.orientationBaked&&nativeFacing(config.nativeFlipX,player)){ctx.translate(size[0]*s,0);ctx.scale(-1,1);}this.assets.draw(ctx,config.atlasName,frames[index]||frames[0],0,0,s);ctx.restore();return true;
 }
 updateStage(game,time){const stage=this.stage(game.choice);if(!stage||time<0)return;const beat=Math.floor(game.beat);game.stageState??={lastBeat:-1,trainAt:-999999,carAt:-999999};const state=game.stageState;if(state.lastBeat!==beat){state.lastBeat=beat;if(game.choice.stage.startsWith('philly')&&beat>8&&beat%8===4&&time-state.trainAt>22000&&Math.random()<0.3){state.trainAt=time;this.audio.sfx('train_passes',0.45);}if(game.choice.stage.startsWith('limo')&&time-state.carAt>8000&&Math.random()<0.1){state.carAt=time;this.audio.sfx(Math.random()<0.5?'carPass0':'carPass1',0.6);}}}
 partnerOverride(game,time,id){const age=time-(game.stageState?.trainAt??-999999);if(age>=4700&&age<12000)return {animation:id==='nene'?'hairBlowNormal':'hairBlow',animationTime:age-4700};if(age>=12000&&age<13250)return {animation:id==='nene'?'hairFallNormal':'hairFall',animationTime:age-12000};return {};}
 drawProp(ctx,prop,game,{time,pan=0,worldScale=0.8,originX=40,originY=-70}={}){const assets=this.assets,img=assets.images[prop.assetId];if(!img&&!prop.solid&&!String(prop.assetPath||'').startsWith('#'))return;const pos=[...(prop.position||[0,0])],state=game.stageState||{},trainAge=time-(state.trainAt??-999999),carAge=time-(state.carAt??-999999);if(prop.name==='train'){if(trainAge<4700||trainAge>15000)return;pos[0]=2000-(trainAge-4700)*1.1;}if(prop.name==='fastCar'){if(carAge<0||carAge>1500)return;pos[0]=-2000+carAge*12;}const scale=Array.isArray(prop.scale)?prop.scale:[prop.scale||1,prop.scale||1],x=originX+pos[0]*worldScale-pan*(prop.scroll?.[0]??1),y=originY+pos[1]*worldScale,forced=game.propAnimations?.[prop.name],period=game.eventBop?.[prop.name]??prop.danceEvery??0;
 if(game.choice.baseSong==='blazin'&&['skyAdditive','lightning','foregroundMultiply','additionalLighten'].includes(prop.name)&&time-(game.lastStrike??-10000)>95)return;
 if(prop.name==='scriptedSky'&&(prop.velocityX||prop.scrollXPerSecond)&&img){
   const w=(prop.size?.[0]||img.width)*worldScale*scale[0],h=(prop.size?.[1]||img.height)*worldScale*scale[1],offset=(x+Math.max(0,time)*(prop.velocityX||prop.scrollXPerSecond)/1000*worldScale)%w;
   for(let i=-1;i<Math.ceil(1280/w)+1;i++)assets.image(ctx,prop.assetId,offset+i*w,y,w,h);
   return;
 }
 ctx.save();ctx.globalAlpha*=prop.alpha??1;if(prop.pixel||prop.isPixel)ctx.imageSmoothingEnabled=false;
 const blend=String(prop.blendMode||'').toLowerCase();
 if(blend==='add')ctx.globalCompositeOperation='lighter';else if(['multiply','overlay','screen','darken','lighten','difference'].includes(blend))ctx.globalCompositeOperation=blend;
 if(prop.solid||String(prop.assetPath||'').startsWith('#')){ctx.fillStyle=prop.solid||prop.assetPath;ctx.fillRect(x,y,scale[0]*worldScale,scale[1]*worldScale);ctx.restore();return;}if(prop.name==='lights'){ctx.globalAlpha*=0.25+0.65*(1-(game.beat%4)/4);ctx.globalCompositeOperation='screen';}
 if(assets.atlases[prop.assetId]){const choices=prop.animations||[],dance=period?Math.floor(game.beat/period)%2?'danceRight':'danceLeft':prop.startingAnimation,anim=choices.find(a=>a.name===(forced&&time<forced.until?forced.name:dance))||choices.find(a=>a.name===prop.startingAnimation)||choices[0]||{},frames=assets.frames(prop.assetId,anim.prefix||''),indices=anim.frameIndices?.length?anim.frameIndices:frames.map((_,i)=>i),elapsed=forced&&time<forced.until?time-forced.since:period?((game.beat%period+period)%period)*60000/bpmAt(game.chart,time):time,offset=Math.floor(Math.max(0,elapsed)*(anim.frameRate||24)/1000),index=indices[period||anim.looped===false?Math.min(indices.length-1,offset):offset%indices.length];assets.draw(ctx,prop.assetId,frames[index]||frames[0],x,y,worldScale*scale[0]);}
 else assets.image(ctx,prop.assetId,x,y,(this.data.stageAssets[prop.assetId]?.logicalSize?.[0]||img.width)*worldScale*scale[0],(this.data.stageAssets[prop.assetId]?.logicalSize?.[1]||img.height)*worldScale*scale[1]);ctx.restore();}
}


// ---- pixel-ui.mjs ----

const PIXEL_DIRECTIONS=['left','down','up','right'];
class PixelUI {
  constructor(assets,audio,data){this.assets=assets;this.audio=audio;this.data=data;}
  style(){return this.data().pixelNoteStyleAssets||{};}
  required(choice){if(!pixelStage(choice))return[];return [...new Set(Object.values(this.style()).map(v=>v.assetId).filter(Boolean))];}
  sounds(){return Object.values(this.style()).map(v=>v.audioFile?.split('/').at(-1)?.replace(/\.ogg$/,'')).filter(Boolean);}
  note(ctx,lane,x,y,scale,state,time,alpha,aspect=1){
    const style=this.style(),def=state==='note'?style.note:style.noteStrumline;if(!def)return false;
    const key=PIXEL_DIRECTIONS[lane]+({static:'Static',press:'Press',confirm:'Confirm'}[state]||'');
    const prefix=def.data?.[key]?.prefix;if(!prefix)return false;
    const frames=this.assets.frames(def.assetId,prefix);if(!frames.length)return false;
    const cursor=Math.floor(Math.max(0,time)*24/1000),frame=frames[state==='confirm'?Math.min(frames.length-1,cursor):state==='press'?cursor%frames.length:0];
    const size=(def.scale||6)*scale/.7,w=(frame.frameWidth||frame.width)*size,h=(frame.frameHeight||frame.height)*size;
    ctx.save();ctx.translate(x+56,y+56);ctx.scale(1,aspect);ctx.imageSmoothingEnabled=false;this.assets.draw(ctx,def.assetId,frame,-w/2,-h/2,size,alpha);ctx.restore();return true;
  }
  hold(ctx,lane,x,start,end,alpha,scale,aspect=1){
    const def=this.style().holdNote,img=this.assets.images[def?.assetId];if(!img)return false;
    const sx=lane*img.width/4,sw=img.width/4,sh=img.height/2,size=(def.scale||6)*scale/.7,w=sw*size,length=Math.abs(end-start),cap=Math.min(length,sh*size*aspect);
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha*=alpha;ctx.translate(x,start);ctx.scale(1,end>=start?1:-1);
    if(length>cap)ctx.drawImage(img,sx,0,sw,sh,-w/2,0,w,length-cap);ctx.drawImage(img,sx,sh,sw,sh,-w/2,length-cap,w,cap);ctx.restore();return true;
  }
  countdownSound(beat){return this.style()[{[-4]:'countdownThree',[-3]:'countdownTwo',[-2]:'countdownOne',[-1]:'countdownGo'}[beat]]?.audioFile?.split('/').at(-1)?.replace(/\.ogg$/,'');}
  countdown(ctx,beat){const def=this.style()[{[-3]:'countdownTwo',[-2]:'countdownOne',[-1]:'countdownGo'}[beat]],img=this.assets.images[def?.assetId];if(!img)return false;const s=def.scale||6;ctx.save();ctx.imageSmoothingEnabled=false;this.assets.image(ctx,def.assetId,(1280-img.width*s)/2,(720-img.height*s)/2,img.width*s,img.height*s);ctx.restore();return true;}
  rating(ctx,name,combo,y,alpha){
    const def=this.style()['judgement'+name[0]?.toUpperCase()+name.slice(1)],img=this.assets.images[def?.assetId];if(!img)return false;
    const s=def.scale||4.2;ctx.save();ctx.globalAlpha*=alpha;ctx.imageSmoothingEnabled=false;this.assets.image(ctx,def.assetId,640-img.width*s/2,y,img.width*s,img.height*s);
    const digits=String(combo).padStart(3,'0').split('').map(n=>this.style()['comboNumber'+n]),width=digits.reduce((sum,v)=>sum+(this.assets.images[v?.assetId]?.width||0)*s+4,0);let x=640-width/2;
    for(const digit of digits){const image=this.assets.images[digit?.assetId];if(image){this.assets.image(ctx,digit.assetId,x,y+62,image.width*s,image.height*s);x+=image.width*s+4;}}
    ctx.restore();return true;
  }
  abot(ctx,character,position,{scale=.62,time=0,beat=0,bpm=100,focusPlayer=true}={}){
    const data=this.data(),def=data.pixelABot,config=data.characters[data.characterIds?.[character]];if(!def||!config)return false;
    const size=config.logicalIdleSize||[75,74],global=config.globalOffsets||[0,0],nativeScale=config.metadata?.scale||6;
    const left=position[0]-size[0]*nativeScale*scale/2+global[0]*nativeScale*scale,top=position[1]-size[1]*nativeScale*scale+global[1]*nativeScale*scale,bodyX=left+def.bodyFromNene[0]*scale,bodyY=top+def.bodyFromNene[1]*scale;
    ctx.save();ctx.imageSmoothingEnabled=false;
    for(const layer of def.layers){
      const [nsx,nsy]=layer.scale||[6,6],s=nsx*scale,sy=nsy*scale,x=bodyX+layer.positionFromBody[0]*scale,y=bodyY+layer.positionFromBody[1]*scale;
      if(layer.name==='viz'){
        const spectrum=this.audio.spectrum();for(let band=0;band<7;band++){let energy=0;for(let j=band*15;j<band*15+15;j++)energy+=spectrum[j]||0;const level=Math.min(5,Math.max(0,5-Math.round(energy/15/255*5))),frame=this.assets.frame(layer.assetId,'viz'+(band+1)+'0',level);if(frame)this.assets.draw(ctx,layer.assetId,frame,x+band*54*scale-(nsx-1)*frame.frameWidth*scale/2,y-(nsy-1)*frame.frameHeight*scale/2,s);}continue;
      }
      const animation=layer.name==='head'?(focusPlayer?'toright':'toleft'):Math.floor(Math.max(0,beat))%2?'danceRight':'danceLeft',prefix=layer.animations?.[animation]||Object.values(layer.animations||{})[0],frames=prefix?this.assets.frames(layer.assetId,prefix):[],elapsed=((beat%1+1)%1)*60000/bpm,frame=frames[Math.min(frames.length-1,Math.floor((layer.name==='head'?time:elapsed)*24/1000))]||frames[0];
      if(frame)this.assets.draw(ctx,layer.assetId,frame,x-(nsx-1)*(frame.frameWidth||frame.width)*scale/2,y-(nsy-1)*(frame.frameHeight||frame.height)*scale/2,s);
      else{const img=this.assets.images[layer.assetId];if(img)this.assets.image(ctx,layer.assetId,x-(nsx-1)*img.width*scale/2,y-(nsy-1)*img.height*scale/2,img.width*s,img.height*sy);}
    }
    ctx.restore();return true;
  }
}


// ---- story-intros.mjs ----
// Replays the installed 0.8.6 dialogue data and native pixel atlases.
// Parent draws its stage first, then draw(ctx,{now}); parent starts countdown at done=true.
const STORY_INTRO_CLAMP=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const STORY_INTRO_STEP=(x,n)=>Math.floor(STORY_INTRO_CLAMP(x)*n)/n;
function storyIntroColor(value){const v=String(value||'#000000').replace('#','');return v.length===8?{rgb:'#'+v.slice(2),alpha:parseInt(v.slice(0,2),16)/255}:{rgb:'#'+v,alpha:1};}
function storyIntroSubtitles(source){const time=t=>{const [h,m,ss]=t.split(':');return(Number(h)*3600+Number(m)*60+Number(ss.replace(',','.')))*1000;};return String(source||'').trim().split(/\r?\n\s*\r?\n/).flatMap(block=>{const lines=block.split(/\r?\n/),index=lines.findIndex(line=>line.includes('-->'));if(index<0)return[];const [a,b]=lines[index].split('-->').map(s=>s.trim());return[{start:time(a),end:time(b),text:lines.slice(index+1).join(' ')}];});}

class StoryIntros {
  constructor(base='story-intros-'){
    this.base=base;this.ready=false;this.done=true;this.phase='inactive';this.images={};this.groups=new Map();this.sounds={};this.textPool=[];this.volume=0.7;this.cameraZoom=1;this.cameraFocus=null;this.hudAlpha=1;
  }
  async load(songId){
    if(this.ready){if(songId==='eggnog-erect-outro')await this.loadEggnog();if(songId.endsWith('-sky'))await this.loadSky();return this;}
    if(this.loading){await this.loading;if(songId==='eggnog-erect-outro')await this.loadEggnog();if(songId.endsWith('-sky'))await this.loadSky();return this;}
    this.loading=(async()=>{
      const response=await fetch(this.base+'pack.json');if(!response.ok)throw new Error('Story intro assets could not load');
      this.pack=await response.json();
      await Promise.all(Object.entries(this.pack.images).map(async([name,url])=>{const image=new Image();image.src=url;await image.decode();this.images[name]=image;}));
      if(typeof FontFace!=='undefined'){try{const font=new FontFace('StoryPixel',`url(${this.pack.font})`);await font.load();document.fonts.add(font);}catch{}}
      for(const [name,data] of Object.entries(this.pack.audio)){const audio=new Audio(this.base+data.file);audio.preload='auto';audio.load();this.sounds[name]=audio;}
      for(let i=0;i<6;i++){const audio=new Audio(this.base+this.pack.audio.pixelText.file);audio.preload='auto';audio.load();this.textPool.push(audio);}
      this.ready=true;return this;
    })();
    try{await this.loading;if(songId==='eggnog-erect-outro')await this.loadEggnog();if(songId.endsWith('-sky'))await this.loadSky();return this;}catch(error){this.loading=null;throw error;}
  }
  async loadSky(){
    if(this.skyLoaded)return;
    const response=await fetch('assets/expanded/dialogue-pack.json');
    if(!response.ok)throw new Error('Sky dialogue assets could not load');
    const pack=await response.json();
    await Promise.all(Object.entries(pack.images).map(async([name,url])=>{const image=new Image();image.src=url;await image.decode();this.images[name]=image;}));
    for(const key of ['conversations','speakers','atlases'])Object.assign(this.pack[key],pack[key]);
    this.skyLoaded=true;
  }
  async loadEggnog(){
    if(this.pack.eggnog)return;
    if(this.eggnogLoading)return this.eggnogLoading;
    this.eggnogLoading=(async()=>{const response=await fetch(this.base+'eggnog-pack.json');if(!response.ok)throw new Error('Eggnog Erect cutscene assets could not load');const pack=await response.json();await Promise.all(Object.entries(pack.images).map(async([name,url])=>{const image=new Image();image.src=url;await image.decode();this.images[name]=image;}));for(const [name,data] of Object.entries(pack.audio)){const audio=new Audio(this.base+data.file);audio.preload='auto';audio.load();this.sounds[name]=audio;}this.pack.eggnog=pack;})();
    try{await this.eggnogLoading;}catch(error){this.eggnogLoading=null;throw error;}
  }
  static shouldPlay(songId,{story=true,character='bf',variation='',retry=false,charting=false}={}){
    if(songId==='eggnog-erect-outro')return !charting;
    if(retry||charting)return false;
    if(['senpai-sky','roses-sky','thorns-sky'].includes(songId))return true;
    if(songId==='winter-horrorland')return true;
    if(!['senpai','roses','thorns'].includes(songId))return false;
    return story||((character==='pico'||variation==='pico')&&songId!=='thorns');
  }
  begin(songId,{now=performance.now(),volume=0.7,reducedMotion=false,character='bf',variation='',story=true,retry=false,charting=false,censored=false,cameraStart=[1000,400],cameraStartZoom=0.8,subtitles=true}={}){
    this.stop();this.songId=songId;this.volume=STORY_INTRO_CLAMP(volume);this.reducedMotion=reducedMotion;this.started=now;this.phaseAt=now;this.lastNow=now;this.done=true;
    if(!StoryIntros.shouldPlay(songId,{story,character,variation,retry,charting}))return false;
    if(!this.ready)throw new Error('Call await storyIntros.load(songId) before begin().');
    const pico=character==='pico'||variation==='pico';this.conversationId=songId+(pico&&songId!=='thorns'?'-pico':'')+(censored&&songId==='roses'?'-censored':'');
    this.conversation=this.pack.conversations[this.conversationId]||null;this.pages=[];
    for(const [entryIndex,entry] of (this.conversation?.dialogue||[]).entries())for(let part=0;part<(entry.text||[]).length;part++)this.pages.push({entry,entryIndex,part,prefix:entry.text.slice(0,part).join(''),text:entry.text.slice(0,part+1).join('')});
    this.pageIndex=0;this.done=false;this.phase=songId.startsWith('roses')?'dialogue':'intro';this.typedChars=0;this.forcedFull=false;this.lastBlip=-9999;this.deathPlayed=false;this.lightsPlayed=false;this.music=null;this.musicId='';this.cameraZoom=1;this.cameraFocus=null;this.hudAlpha=0;
    this.hideActors=[];this.hideProps=[];
    if(songId==='eggnog-erect-outro'){
      if(!this.pack.eggnog)throw new Error('Call await storyIntros.load("eggnog-erect-outro") first.');
      this.phase='eggnog-outro';this.introDuration=16000;this.cameraStart=cameraStart;this.cameraStartZoom=cameraStartZoom;this.showSubtitles=subtitles;this.subtitleEntries=storyIntroSubtitles(this.pack.eggnog.subtitles);this.hideActors=['opponent'];this.hideProps=['santa'];this.skipArmedAt=null;this.skipTextAt=null;this.shotPlayed=false;this.effect('santa_emotion');return true;
    }
    if(songId.startsWith('roses')){this.effect('ANGRY_TEXT_BOX');this.startDialogue(now);}
    else if(songId==='winter-horrorland')this.introDuration=100+(this.pack.audio.Lights_Turn_On.durationMs||4643);
    else if(songId==='thorns')this.introDuration=reducedMotion?250:2100+(this.pack.audio.Senpai_Dies.durationMs||7333)+1600;
    else this.introDuration=reducedMotion?250:2250;
    return true;
  }
  effect(name,gain=1){const audio=this.sounds[name];if(!audio)return;try{audio.pause();audio.currentTime=0;audio.volume=this.volume*STORY_INTRO_CLAMP(gain);audio.play().catch(()=>{});}catch{}}
  setMusic(name,now){
    if(this.musicId===name&&this.music)return;
    if(this.music){this.music.pause();this.music.currentTime=0;}
    this.musicId=name;this.music=this.sounds[name]||null;this.musicAt=now;
    if(this.music){this.music.loop=!!this.conversation?.music?.looped;this.music.volume=0;this.music.currentTime=0;this.music.play().catch(()=>{});}
  }
  startDialogue(now){
    if(!this.conversation||!this.pages.length){this.finish();return;}
    this.phase='dialogue';this.phaseAt=now;this.dialogueAt=now;this.cameraZoom=1;this.cameraFocus=null;
    this.setMusic(this.conversation.music?.asset||'',now);this.startPage(now,true);
  }
  frames(atlas,prefix){const key=atlas+'|'+prefix;if(!this.groups.has(key))this.groups.set(key,(this.pack.atlases[atlas]||[]).filter(frame=>frame.name.startsWith(prefix)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})));return this.groups.get(key);}
  animation(meta,name){return meta?.animations?.find(anim=>anim.name===name)||meta?.animations?.find(anim=>anim.name==='idle')||meta?.animations?.[0];}
  animationDuration(meta,name){const animation=this.animation(meta,name);if(!animation)return 0;return (animation.frameIndices?.length||this.frames(meta.atlas,animation.prefix).length)/(animation.frameRate||24)*1000;}
  startPage(now,first=false){
    const previous=this.page,page=this.pages[this.pageIndex];this.page=page;this.forcedFull=false;this.typedChars=page.prefix.length;this.lineAt=now;
    const box=this.pack.boxes[page.entry.box],sameEntry=previous?.entryIndex===page.entryIndex;
    this.boxAnimation=first?(page.entry.boxAnimation||'enter'):sameEntry?'speaking':'click';this.boxAt=now;
    this.typingAt=now+(sameEntry?0:this.animationDuration(box,this.boxAnimation));this.speakerAt=this.typingAt;
    this.completedAt=null;
    if(page.entry.box==='roses'&&!sameEntry)this.effect('textboxClick',0.6);
    // Original Senpai/Pico conversation pauses the music for the bewildered portrait.
    if(['senpai-pico','senpai-sky'].includes(this.conversationId)){
      if(page.entry.speaker==='senpai-bwuh')this.setMusic('',now);
      else if(['senpai','sky-pixel'].includes(page.entry.speaker)&&!this.music)this.setMusic('Lunchbox',now);
    }
  }
  currentText(now){
    if(!this.page)return'';const page=this.page,delay=Math.max(1,(page.entry.speed??1)*50),count=this.forcedFull?page.text.length:page.prefix.length+Math.floor(Math.max(0,now-this.typingAt)/delay);
    return page.text.slice(0,Math.min(page.text.length,count));
  }
  advance(now=performance.now()){
    this.update(now);
    if(this.done)return;
    if(this.phase==='eggnog-outro'){
      if(this.skipArmedAt===null){this.skipArmedAt=now+500;this.skipTextAt=now;}
      else if(now>=this.skipArmedAt){this.phase='eggnog-skip';this.phaseAt=now;this.sounds.santa_emotion?.pause();this.sounds.santa_shot_n_falls?.pause();}
      return;
    }
    if(this.phase==='eggnog-skip')return;
    if(this.phase==='intro')return;
    if(this.phase==='outro'){this.finish();return;}
    if(this.currentText(now).length<this.page.text.length){this.forcedFull=true;this.typingAt=Math.min(this.typingAt,now);return;}
    if(this.pageIndex+1<this.pages.length){this.pageIndex++;this.startPage(now);}
    else{this.phase='outro';this.phaseAt=now;this.boxAnimation='exit';this.boxAt=now;}
  }
  skip(now=performance.now()){this.finish();}
  finish(){this.stop();this.done=true;this.phase='complete';}
  stop(){for(const audio of [...Object.values(this.sounds),...this.textPool]){audio.pause();try{audio.currentTime=0;}catch{}}this.music=null;this.musicId='';this.phase='inactive';this.done=true;this.cameraZoom=1;this.cameraFocus=null;this.hudAlpha=1;this.hideActors=[];this.hideProps=[];}
  update(now=performance.now()){
    this.lastNow=now;if(this.done)return;
    if(this.phase==='eggnog-outro'||this.phase==='eggnog-skip'){
      const elapsed=now-this.started;
      const expo=t=>t>=1?1:1-Math.pow(2,-10*STORY_INTRO_CLAMP(t)),quad=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,quart=t=>t<.5?8*t*t*t*t:1-Math.pow(-2*t+2,4)/2;
      let x=this.cameraStart[0]+(-100-this.cameraStart[0])*expo(elapsed/2800),y=this.cameraStart[1]+(400-this.cameraStart[1])*expo(elapsed/2800),zoom=this.cameraStartZoom+(.73-this.cameraStartZoom)*quad(STORY_INTRO_CLAMP(elapsed/2000));
      if(elapsed>=2800){const p=quart(STORY_INTRO_CLAMP((elapsed-2800)/9000));x=-100-150*p;y=400;zoom=.73+.06*quad(STORY_INTRO_CLAMP((elapsed-2800)/9000));}
      if(elapsed>=12830){const p=expo((elapsed-12830)/5000);x=-250+10*p;y=400+80*p;}
      if(this.reducedMotion){x=-170;y=430;zoom=.72;}
      this.cameraFocus=[x,y];this.cameraZoom=zoom;
      if(elapsed>=11375&&!this.shotPlayed&&this.phase==='eggnog-outro'){this.shotPlayed=true;this.effect('santa_shot_n_falls');}
      if((this.phase==='eggnog-skip'&&now-this.phaseAt>=500)||elapsed>=16000)this.finish();
      return;
    }
    if(this.phase==='intro'){
      const elapsed=now-this.started;
      if(this.songId==='winter-horrorland'){
        this.cameraZoom=this.reducedMotion?1:2.5;this.cameraFocus=this.reducedMotion?null:[400,-2050];
        if(elapsed>=100&&!this.lightsPlayed){this.lightsPlayed=true;this.effect('Lights_Turn_On');}
      }
      if(this.songId==='thorns'&&!this.reducedMotion&&elapsed>=2100&&!this.deathPlayed){this.deathPlayed=true;this.effect('Senpai_Dies');}
      if(elapsed>=this.introDuration){if(this.songId==='winter-horrorland')this.finish();else this.startDialogue(now);}
      return;
    }
    const fadeMs=(this.conversation?.music?.fadeTime||0)*1000;
    let musicGain=fadeMs?STORY_INTRO_CLAMP((now-this.musicAt)/fadeMs):1;
    if(this.phase==='outro'){
      const duration=(this.conversation?.outro?.fadeTime??1)*1000;musicGain*=1-STORY_INTRO_CLAMP((now-this.phaseAt)/duration);
      if(now-this.phaseAt>=duration){this.finish();return;}
    }
    if(this.music)this.music.volume=this.volume*musicGain;
    if(this.phase==='dialogue'&&now>=this.typingAt){
      const text=this.currentText(now),count=text.length;
      if(count>this.typedChars&&now-this.lastBlip>32&&!this.forcedFull&&/\S/.test(text.at(-1)||'')){
        const audio=this.textPool[(this.blipIndex=(this.blipIndex||0)+1)%this.textPool.length];if(audio){try{audio.pause();audio.currentTime=0;audio.volume=this.volume*0.6;audio.play().catch(()=>{});}catch{}}this.lastBlip=now;
      }
      this.typedChars=count;
      if(count===this.page.text.length&&this.completedAt===null){this.completedAt=now;this.boxAnimation='sentenceEnd';this.boxAt=now;}
    }
  }
  drawSprite(ctx,atlas,frame,x,y,scale=1,{flipX=false,flipY=false,alpha=1}={}){
    if(!frame||!this.images[atlas])return;ctx.save();ctx.globalAlpha*=alpha;ctx.imageSmoothingEnabled=false;
    if(flipX||flipY){ctx.translate(x+(flipX?(frame.frameWidth||frame.width)*scale:0),y+(flipY?(frame.frameHeight||frame.height)*scale:0));ctx.scale(flipX?-1:1,flipY?-1:1);x=0;y=0;}
    ctx.drawImage(this.images[atlas],frame.x,frame.y,frame.width,frame.height,x-(frame.frameX||0)*scale,y-(frame.frameY||0)*scale,frame.width*scale,frame.height*scale);ctx.restore();
  }
  drawAnimation(ctx,meta,name,time,x,y,scale){
    const anim=this.animation(meta,name);if(!anim)return;const frames=this.frames(meta.atlas,anim.prefix),indices=anim.frameIndices||frames.map((_,i)=>i);if(!indices.length)return;
    const cursor=Math.floor(Math.max(0,time)*(anim.frameRate||24)/1000),index=indices[anim.looped?cursor%indices.length:Math.min(indices.length-1,cursor)],offset=anim.offsets||[0,0];this.drawSprite(ctx,meta.atlas,frames[index],x+offset[0],y+offset[1],scale,{flipX:!!meta.flipX!==!!anim.flipX,flipY:!!meta.flipY!==!!anim.flipY});
  }
  drawIntro(ctx,now){
    const elapsed=now-this.started;
    if(this.songId==='winter-horrorland'){if(elapsed<100){ctx.fillStyle='#000';ctx.fillRect(0,0,1280,720);}return;}
    if(this.reducedMotion){ctx.fillStyle=`rgba(0,0,0,${1-STORY_INTRO_CLAMP(elapsed/250)})`;ctx.fillRect(0,0,1280,720);return;}
    if(['senpai','senpai-sky','thorns-sky'].includes(this.songId)){ctx.fillStyle=`rgba(0,0,0,${elapsed<250?1:1-STORY_INTRO_STEP((elapsed-250)/2000,12)})`;ctx.fillRect(0,0,1280,720);return;}
    if(this.songId==='thorns'){
      const deathAt=2100,deathEnd=deathAt+(this.pack.audio.Senpai_Dies.durationMs||7333),whiteAt=deathAt+3200;
      if(elapsed>=deathEnd){ctx.fillStyle=`rgba(0,0,0,${1-STORY_INTRO_STEP((elapsed-deathEnd)/1400,6)})`;ctx.fillRect(0,0,1280,720);return;}
      ctx.fillStyle=elapsed>=whiteAt+1400?'#fff':'#ff1b31';ctx.fillRect(0,0,1280,720);
      if(elapsed<whiteAt+1400){const frames=this.frames('senpaiCrazy','Senpai Pre Explosion instance 1'),frame=frames[Math.min(frames.length-1,Math.floor(Math.max(0,elapsed-deathAt)*24/1000))],scale=6,fw=(frame?.frameWidth||frame?.width||1)*scale,fh=(frame?.frameHeight||frame?.height||1)*scale;this.drawSprite(ctx,'senpaiCrazy',frame,(1280-fw)/2+fw/5,(720-fh)/2,scale,{alpha:Math.min(1,Math.floor(elapsed/300)*0.15)});}
      if(elapsed>=whiteAt&&elapsed<whiteAt+1400){ctx.fillStyle=`rgba(255,255,255,${STORY_INTRO_STEP((elapsed-whiteAt)/1400,8)})`;ctx.fillRect(0,0,1280,720);}
      if(elapsed>=whiteAt+1400){ctx.fillStyle=`rgba(0,0,0,${STORY_INTRO_STEP((elapsed-whiteAt-1400)/800,8)})`;ctx.fillRect(0,0,1280,720);}
    }
  }
  drawEggnog(ctx,now){
    ctx.imageSmoothingEnabled=true;
    const elapsed=now-this.started,[cx,cy]=this.cameraFocus||[-100,400],zoom=this.cameraZoom;
    ctx.save();ctx.translate(640,360);ctx.scale(zoom,zoom);ctx.translate(-cx,-cy);
    for(const id of ['parentsCutscene','santaCutscene']){const animation=this.pack.eggnog.animations[id],index=Math.min(animation.frames.length-1,Math.floor(Math.max(0,elapsed)*animation.fps/1000)),position=animation.position,bounds=animation.bounds;ctx.save();ctx.translate(position[0]-bounds[0],position[1]-bounds[1]);for(const command of animation.frames[index]){ctx.save();ctx.globalAlpha*=command.a??1;ctx.transform(...command.m);const [x,y,w,h]=command.r;if(command.rotated){ctx.translate(0,w);ctx.rotate(-Math.PI/2);}ctx.drawImage(this.images[id],x,y,w,h,0,0,w,h);ctx.restore();}ctx.restore();}ctx.restore();
    if(this.showSubtitles){const subtitle=this.subtitleEntries.find(s=>elapsed>=s.start&&elapsed<s.end);if(subtitle){ctx.font='26px VCR,monospace';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillStyle='#000b';const width=ctx.measureText(subtitle.text).width;ctx.fillRect(640-width/2-14,633,width+28,43);ctx.fillStyle='#fff';ctx.fillText(subtitle.text,640,670);ctx.textAlign='left';}}
    let black=elapsed>=15000?STORY_INTRO_CLAMP((elapsed-15000)/1000):0;if(this.phase==='eggnog-skip')black=Math.max(black,STORY_INTRO_CLAMP((now-this.phaseAt)/500));if(black){ctx.fillStyle=`rgba(0,0,0,${black})`;ctx.fillRect(0,0,1280,720);}
    if(this.skipTextAt!==null&&this.phase!=='eggnog-skip'){ctx.save();ctx.globalAlpha=STORY_INTRO_CLAMP((now-this.skipTextAt)/500);ctx.font='26px VCR,monospace';ctx.textAlign='right';ctx.strokeStyle='#000';ctx.lineWidth=4;ctx.strokeText('Skip [ENTER / TAP]',1240,640);ctx.fillStyle='#fff';ctx.fillText('Skip [ENTER / TAP]',1240,640);ctx.restore();}
  }
  wrapText(ctx,text,width){const lines=[];let line='';for(const word of text.split(' ')){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>width){lines.push(line);line=word;}else line=next;}lines.push(line);return lines;}
  draw(ctx,{now=performance.now(),volume=this.volume}={}){
    this.volume=STORY_INTRO_CLAMP(volume);this.update(now);if(this.done)return[];ctx.save();ctx.imageSmoothingEnabled=false;
    if(this.phase==='eggnog-outro'||this.phase==='eggnog-skip'){this.drawEggnog(ctx,now);ctx.restore();return[{id:'eggnog-advance',label:'Skip cutscene',x:0,y:0,w:1280,h:720,action:'advance'}];}
    if(this.phase==='intro'){this.drawIntro(ctx,now);ctx.font='20px monospace';ctx.textAlign='right';ctx.strokeStyle='#000';ctx.lineWidth=4;ctx.strokeText('ESC / TAP TO SKIP',1255,35);ctx.fillStyle='#fff';ctx.fillText('ESC / TAP TO SKIP',1255,35);ctx.restore();return[{id:'intro-skip',label:'Skip cutscene',x:1070,y:12,w:190,h:60,action:'skip'}];}
    const outro=this.phase==='outro',outroMs=(this.conversation.outro?.fadeTime??1)*1000,outroAlpha=outro?1-STORY_INTRO_STEP((now-this.phaseAt)/outroMs,8):1;ctx.globalAlpha=outroAlpha;
    const backdrop=storyIntroColor(this.conversation.backdrop?.color),backdropFade=(this.conversation.backdrop?.fadeTime??0)*1000,fade=backdropFade?STORY_INTRO_STEP((now-this.dialogueAt)/backdropFade,10):1;
    ctx.fillStyle=backdrop.rgb;ctx.save();ctx.globalAlpha*=backdrop.alpha*fade;ctx.fillRect(0,0,1280,720);ctx.restore();
    const entry=this.page.entry,speaker=this.pack.speakers[entry.speaker],box=this.pack.boxes[entry.box];
    if(speaker&&now>=this.typingAt){const first=(this.pack.atlases[speaker.atlas]||[])[0],x=640-(first?.frameWidth||first?.width||0)/2+(speaker.offsets?.[0]||0),y=360-(first?.frameHeight||first?.height||0)/2+(speaker.offsets?.[1]||0);this.drawAnimation(ctx,speaker,entry.speakerAnimation||'talk',now-this.speakerAt,x,y,speaker.scale||1);}
    let boxAnimation=this.boxAnimation,boxTime=now-this.boxAt;
    if(!outro&&this.completedAt!==null&&boxTime>=this.animationDuration(box,'sentenceEnd')){boxTime-=this.animationDuration(box,'sentenceEnd');boxAnimation='idle';}
    else if(!outro&&now>=this.typingAt&&this.completedAt===null){boxAnimation='speaking';boxTime=now-this.typingAt;}
    this.drawAnimation(ctx,box,boxAnimation,boxTime,640+(box.offsets?.[0]||0),360+(box.offsets?.[1]||0),box.scale||1);
    if(!outro&&now>=this.typingAt){const style=box.text||{},text=this.currentText(now),size=style.size||32,x=640+(box.offsets?.[0]||0)+(style.offsets?.[0]||0),y=360+(box.offsets?.[1]||0)+(style.offsets?.[1]||0);ctx.font=`${size}px StoryPixel, monospace`;ctx.textBaseline='top';const lines=this.wrapText(ctx,text,style.width||800),shadow=storyIntroColor(style.shadowColor||'#00000000');for(const [i,line] of lines.entries()){if((style.shadowWidth??2)>0&&shadow.alpha){ctx.fillStyle=shadow.rgb;ctx.fillText(line,x+(style.shadowWidth??2),y+i*size*1.22+(style.shadowWidth??2));}ctx.fillStyle=storyIntroColor(style.color||'#000').rgb;ctx.fillText(line,x,y+i*size*1.22);}}
    ctx.font='18px monospace';ctx.fillStyle='#fff';ctx.strokeStyle='#000';ctx.lineWidth=4;const hint=outro?'':`${speaker?.name||entry.speaker}  ·  ENTER / TAP: CONTINUE     ESC: SKIP`;ctx.strokeText(hint,24,686);ctx.fillText(hint,24,686);ctx.restore();
    return[{id:'dialogue-advance',label:now<this.typingAt||this.currentText(now).length<this.page.text.length?'Complete dialogue text':'Next dialogue line',x:0,y:0,w:1280,h:720,action:'advance'},{id:'dialogue-skip',label:'Skip dialogue',x:1070,y:10,w:200,h:64,action:'skip'}];
  }
}


// ---- native-extras.mjs ----
// Full native character symbol trees, Pico gun backing card, and Erect stage.
// These helpers draw only; parent retains all input, score and scene state.
const NE_CLAMP=(v,a,b)=>Math.min(b,Math.max(a,v));
class NativeExtras {
  constructor(base='native-extras-'){this.base=base;this.packs={};this.images={};this.groups=new Map();this.gunType='base';this.gunChangedAt=0;this.lastCardTime=-1;}
  async load(kind='characters'){
    if(this.packs[kind])return this;const filename={characters:'native-character-extras.json',picoCard:'native-pico-card.json',erectStage:'native-week1-erect-stage.json'}[kind];const response=await fetch(this.base+filename);if(!response.ok)throw new Error('Native visual pack unavailable: '+filename);const pack=await response.json(),images={};
    await Promise.all(Object.entries(pack.images).map(async([id,url])=>{const image=new Image();image.src=url;await image.decode();images[id]=image;}));this.packs[kind]=pack;this.images[kind]=images;return this;
  }
  frames(kind,name,prefix=''){const key=kind+'|'+name+'|'+prefix;if(!this.groups.has(key))this.groups.set(key,(this.packs[kind]?.atlases?.[name]||[]).filter(f=>f.name.startsWith(prefix)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})));return this.groups.get(key);}
  sprite(ctx,kind,name,frame,x,y,sx=1,sy=sx){if(!frame)return;const image=this.images[kind]?.[name];if(!image)return;ctx.drawImage(image,frame.sourceX??frame.x,frame.sourceY??frame.y,frame.sourceWidth??frame.width,frame.sourceHeight??frame.height,x-(frame.frameX||0)*sx,y-(frame.frameY||0)*sy,frame.width*sx,frame.height*sy);}
  image(ctx,kind,name,x,y,sx=1,sy=sx){const image=this.images[kind]?.[name];if(image)ctx.drawImage(image,x,y,image.width*sx,image.height*sy);}
  commands(ctx,image,commands){for(const command of commands||[]){const[x,y,w,h]=command.r,[dw,dh]=command.d||[w,h];ctx.save();ctx.globalAlpha*=command.a??1;ctx.transform(...command.m);if(command.rotated){ctx.translate(0,dw);ctx.rotate(-Math.PI/2);}ctx.drawImage(image,x,y,w,h,0,0,dw,dh);ctx.restore();}}
  hasCharacterAnimation(character,animation){return !!this.packs.characters?.characters[character]?.animations[animation];}
  drawCharacter(ctx,character,animation,{x,y,scale=1,time=0,beat=0,bpm=120,player=false,globalOffsets=true,loop=null,period=1}={}){
    const pack=this.packs.characters,meta=pack?.characters[character];if(!meta)return false;
    if(animation==='idle'&&!meta.animations.idle)animation=Math.floor(beat)%2===0?'danceLeft':'danceRight';
    if(animation==='cheer'&&!meta.animations.cheer&&meta.animations.combo50)animation='combo50';
    const def=meta.animations[animation]||meta.animations.idle||meta.animations.danceLeft;if(!def)return false;
    const timeline=pack.timelines[def.timeline],main=pack.timelines[(meta.animations.idle||meta.animations.danceLeft).timeline],bounds=timeline.bounds||[0,0,0,0],mainBounds=main.bounds||[0,0,0,0];
    if(animation==='danceLeft'||animation==='danceRight')time=period===0?0:((beat%period+period)%period)*60000/bpm;
    let index=Math.floor(Math.max(0,time)*def.fps/1000);const shouldLoop=loop??def.looped;index=shouldLoop?index%def.frames.length:Math.min(def.frames.length-1,index);const frame=def.frames[index],flip=player?!meta.flipX:!!meta.flipX,offset=globalOffsets?meta.globalOffsets:[0,0];
    ctx.save();ctx.translate(x+offset[0]*scale,y+offset[1]*scale);ctx.scale(scale*(flip?-1:1),scale);ctx.translate(-mainBounds[2]/2,-mainBounds[3]);ctx.translate(-bounds[0]-def.offsets[0],-bounds[1]-def.offsets[1]);this.commands(ctx,this.images.characters[def.timeline],timeline.frames[frame]);ctx.restore();return true;
  }
  tile(ctx,name,x,y,spacing=0,{flipX=false,alpha=1}={}){
    const image=this.images.picoCard[name];if(!image)return;const step=image.width+spacing,start=((x%step)+step)%step-step;ctx.save();ctx.globalAlpha*=alpha;
    for(let dx=start;dx<1280;dx+=step){ctx.save();if(flipX){ctx.translate(dx+image.width,y);ctx.scale(-1,1);ctx.drawImage(image,0,0);}else ctx.drawImage(image,dx,y);ctx.restore();}ctx.restore();
  }
  drawPicoCard(ctx,time,{reducedMotion=false,confirmAge=null,clip=true}={}){
    const pack=this.packs.picoCard;if(!pack)return false;
    ctx.save();if(clip){ctx.beginPath();ctx.moveTo(0,64);ctx.lineTo(395,64);ctx.lineTo(555,720);ctx.lineTo(0,720);ctx.closePath();ctx.clip();}ctx.fillStyle='#98a2f3';ctx.fillRect(0,0,1280,720);
    const t=reducedMotion?0:time/1000;
    this.tile(ctx,'lowerLoop',t*110,200,20,{flipX:true,alpha:.39});this.tile(ctx,'lowerLoop',-t*110,406,20);
    ctx.save();ctx.globalAlpha=.4;ctx.globalCompositeOperation='multiply';this.image(ctx,'picoCard','blueBar',0,239,2.5,1);ctx.restore();
    const top=this.frames('picoCard','topLoop','base')[0],progress=Math.abs((-t*220)%((top?.frameWidth||top?.width||2109)+20));
    if(time<this.lastCardTime){this.gunType='base';this.gunChangedAt=0;}this.lastCardTime=time;
    const list=this.frames('picoCard','topLoop',this.gunType==='base'?'base':this.gunType+' info'),finished=time-this.gunChangedAt>=list.length/24*1000;
    if(finished&&!reducedMotion){const next=progress>=500&&progress<=700?'sniper':progress>=700&&progress<=1300?'rifle':progress>=1450&&progress<=2000?'rocket launcher':progress<=300?'uzi':this.gunType;if(next!==this.gunType){this.gunType=next;this.gunChangedAt=time;}}
    const gunFrames=this.frames('picoCard','topLoop',this.gunType==='base'?'base':this.gunType+' info'),frame=gunFrames[Math.min(gunFrames.length-1,Math.floor((time-this.gunChangedAt)*24/1000))]||top;
    if(frame){const step=(frame.frameWidth||frame.width)+20,start=((-t*220%step)+step)%step-step;for(let x=start;x<1280;x+=step)this.sprite(ctx,'picoCard','topLoop',frame,x,80);}
    this.tile(ctx,'middleLoop',t*220,346,15);
    const pulse=reducedMotion?0.2:Math.pow(1-(t*102/60%1),4);ctx.save();ctx.globalAlpha=pulse;this.image(ctx,'picoCard','glow',-300,330);ctx.restore();
    if(confirmAge!==null){const data=pack.animations.confirm,frame=Math.min(data.frames.length-1,Math.floor(confirmAge*24/1000)),b=data.bounds||[0,0,0,0];ctx.save();ctx.translate(-120-b[0],55-b[1]);this.commands(ctx,this.images.picoCard.confirm,data.frames[frame]);ctx.restore();}ctx.restore();return true;
  }
  drawErectStage(ctx,time,{pan=0,foreground=false,offset=[240,-35],scale=.75}={}){
    const pack=this.packs.erectStage;if(!pack)return false;
    const props=[...pack.metadata.props].sort((a,b)=>a.zIndex-b.zIndex);
    for(const p of props){if((p.zIndex>=3000)!==foreground)continue;const position=p.position||[0,0],s=Array.isArray(p.scale)?p.scale:[p.scale??1,p.scale??1],scroll=p.scroll||[1,1],x=offset[0]+position[0]*scale-pan*scroll[0],y=offset[1]+position[1]*scale;
      ctx.save();ctx.globalAlpha=p.alpha??1;
      if(p.assetPath.startsWith('#')){ctx.fillStyle=p.assetPath;ctx.fillRect(x,y,s[0]*scale,s[1]*scale);ctx.restore();continue;}
      if(p.animations?.length){const anim=p.animations.find(a=>a.name===p.startingAnimation)||p.animations[0],frames=this.frames('erectStage',p.name,anim.prefix),f=frames[Math.floor(Math.max(0,time)*(anim.frameRate||24)/1000)%frames.length];this.sprite(ctx,'erectStage',p.name,f,x,y,s[0]*scale,s[1]*scale);}else this.image(ctx,'erectStage',p.name,x,y,s[0]*scale,s[1]*scale);ctx.restore();
    }return true;
  }
}


// ---- expanded-content.mjs ----
const EXPANDED_BASE = 'assets/expanded/';
const EXPANDED_WEEKS = [
  {id:7, name:'TANKMAN FT. JOHNNYUTAH', songs:['ugh','guns','stress'], color:'#f9cf51', character:'bf'},
  {id:'weekend1', name:'DUE DEBTS', songs:['darnell','lit-up','2hot','blazin'], color:'#413cae', character:'pico'},
  {id:'sky', name:'BFSWIFEFOREVER', songs:['wife-forever','sky','manifest'], color:'#52bfff', character:'bf'}
];

function playerIdentity(id='') {
  return id.startsWith('sky')?'sky':id.startsWith('pico')?'pico':'bf';
}

class ExpandedContent {
  constructor() {
    this.songs = new Map();
    this.media = {};
  }

  async load() {
    const response = await fetch(EXPANDED_BASE+'songs.json');
    if (!response.ok) throw new Error('The expanded song catalogue could not be loaded.');
    for (const record of await response.json()) {
      if (!this.songs.has(record.baseSong)) this.songs.set(record.baseSong, []);
      this.songs.get(record.baseSong).push(record);
    }
  }

  entries(existing) {
    const seen = new Set(existing.map(song=>song.id));
    const result = [];
    for (const id of [...EXPANDED_WEEKS.flatMap(week=>week.songs), ...this.songs.keys()]) {
      if (seen.has(id)) continue;
      seen.add(id);
      const records=this.songs.get(id)||[];
      const entry = records.find(record=>record.variant==='classic')||records[0];
      if (entry) result.push({...entry,id,opponent:entry.characters.opponent});
    }
    return result;
  }

  levels(id, character) {
    return [...new Set((this.songs.get(id)||[])
      .filter(record=>record.character===character)
      .flatMap(record=>record.difficulties))];
  }

  instrumentals(id,character,level){
    const record=this.choice(id,character,level,'default');
    return ['default',...(record?.characters.altInstrumentals||[]).filter(id=>this.songs.get(record.baseSong)?.some(variant=>variant.variant===id))];
  }

  choice(id, character, level, instrumental) {
    const records = this.songs.get(id);
    if (!records) return null;
    const matches = records.filter(record=>record.character===character);
    const preferred = matches.find(record=>record.variant==='classic'&&record.difficulties.includes(level)) ||
      matches.find(record=>record.difficulties.includes(level));
    // When browsing an unavailable entry, provide its default metadata for the UI.
    const record = preferred || matches[0] || records[0];
    if (!record) return null;
    const actual = record.charts[level]?level:record.charts.normal?'normal':record.difficulties[0];
    const alternative = record.characters.altInstrumentals?.includes(instrumental)&&records.find(item=>item.variant===instrumental);
    const tracks = record.tracks.map((track,index)=>index===0&&alternative?alternative.tracks[0]:track);
    return {...record,level:actual,opponent:record.characters.opponent,noteStyle:record.playData.noteStyle,
      chartUrl:EXPANDED_BASE+record.charts[actual], audioUrls:tracks.map(track=>EXPANDED_BASE+track.file),
      audioRoles:tracks.map(track=>track.role), audioOffsets:tracks.map(track=>track.offset)};
  }
}


// ---- sky-ui.mjs ----

async function expandedImage(file) {
  const image=new Image();
  image.src=EXPANDED_BASE+file;
  await image.decode();
  return image;
}

async function expandedJSON(file) {
  const response=await fetch(EXPANDED_BASE+file);
  if(!response.ok)throw new Error('Sky Reborn asset unavailable: '+file);
  return response.json();
}

async function loadExpandedAnimation(asset) {
  const [image,timeline]=await Promise.all([expandedImage(asset.image),expandedJSON(asset.timeline)]);
  return {image,timeline};
}

class SkyGallery {
  constructor() {
    this.index=0;
    this.picture=null;
  }

  async begin(data,volume) {
    this.data=data;
    this.music=new Audio(EXPANDED_BASE+data.music);
    this.music.volume=volume;
    this.music.loop=true;
    this.music.play().catch(()=>{});
    [this.logo,this.background]=await Promise.all([expandedImage(data.logo),expandedImage(data.backgrounds[this.index%data.backgrounds.length])]);
    await this.select(0);
  }

  async select(delta) {
    if(!this.data)return;
    const index=this.index=(this.index+delta+this.data.items.length)%this.data.items.length;
    const item=this.data.items[index];
    this.picture=null;
    try{
      const picture=await expandedImage(item.image);
      if(index===this.index)this.picture=picture;
    }catch{}
  }

  stop() {
    this.music?.pause();
    this.music=null;
  }
}


// ---- expanded-cutscenes.mjs ----

const EXPANDED_SCENES={
  'darnell-alley':{duration:10000,audio:'darnell-alley.ogg',poses:[[2000,'player','intro1'],[5000,'opponent','lightCan'],[6000,'player','cock'],[6400,'opponent','kickCan'],[6900,'opponent','kneeCan'],[7100,'player','shoot'],[7900,'opponent','laughCutscene'],[8200,'girlfriend','laughCutscene']]},
  'stress-pico-outro':{duration:13333,audio:'stress-pico-outro.ogg',captions:'stress-pico-outro.srt',poses:[[0,'opponent','stressPicoEnding',11000],[7333,'player','laughCutscene',3600]],fadeOut:11250},
  'wife-stage':{duration:13500,audio:'extra-wifeFunniCutscene.ogg',animations:['wifeBf','wifeSky'],pictures:['wifeBackdrop','wifeHearts'],fadeOut:8000},
  'moderato-stage':{duration:4000,audio:'extra-skyMaterializeSfx.ogg',audioAt:1300,animations:['materializeSky']},
  'week7-sky-stage':{duration:9700,audio:'extra-tankmanCutscene.ogg',animations:['fallingSky'],fadeIn:1600},
  'stress-sky-stage':{duration:10500,audio:'extra-stressSkyIntro.ogg',poses:[[0,'opponent','hehPrettyGood',2400],[3300,'girlfriend','shoot1',450]]}
};

async function expandedCaptions(file){
  const response=await fetch(EXPANDED_BASE+file);
  if(!response.ok)return [];
  const text=await response.text(),seconds=raw=>raw.replace(',','.').split(':').reduce((time,value)=>time*60+Number(value),0);
  return text.split(/\r?\n\r?\n/).flatMap(block=>{
    const lines=block.split(/\r?\n/),index=lines.findIndex(line=>line.includes('-->'));
    if(index<0)return [];
    const [start,end]=lines[index].split(/\s+-->\s+/);
    return [{start:seconds(start),end:seconds(end.trim().split(/\s+/)[0]),text:lines.slice(index+1).map(line=>line.replace(/<[^>]+>/g,''))}];
  });
}

function expandedIntro(choice,{story=false,retry=false,editor=false}={}) {
  if (retry||editor) return null;
  if (choice.variant==='sky'&&['senpai','roses','thorns'].includes(choice.baseSong)) return choice.baseSong+'-sky';
  if (choice.baseSong==='stress'&&choice.variant==='pico') return 'stressPicoCutscene';
  if (!story) return null;
  return {ugh:'ughCutscene',guns:'gunsCutscene',stress:choice.character==='pico'?'stressPicoCutscene':'stressCutscene',
    darnell:'darnellCutscene','wife-forever':'wifeforeverCutscene',sky:'skyCutscene',manifest:'manifestCutscene'}[choice.baseSong];
}

function expandedOutro(choice,story) {
  if(choice.baseSong==='stress'&&choice.variant==='pico')return 'stress-pico-outro';
  if (!story) return null;
  return {'2hot':'2hotCutscene',blazin:'blazinCutscene',manifest:'skyEndCredits'}[choice.baseSong];
}

function expandedStageIntro(choice,story){
  if(choice.variant==='sky')return {moderato:'moderato-stage',ugh:'week7-sky-stage',guns:'week7-sky-stage',stress:'stress-sky-stage'}[choice.baseSong];
  if(story)return {'wife-forever':'wife-stage',darnell:'darnell-alley'}[choice.baseSong];
}

class ExpandedCutscenes {
  constructor() {
    this.media = {};
    this.current = null;
  }

  async load() {
    const response = await fetch(EXPANDED_BASE+'cutscenes.json');
    if (response.ok) this.media = await response.json();
  }

  begin(id,{volume=0.7,misses=0,extraArt={}}={}) {
    const entry = this.media[id]||EXPANDED_SCENES[id];
    if (!entry) return null;
    this.stop(false);
    const current = {id,entry,phase:'loading',volume,cues:[],at:performance.now(),skipAt:0};
    const result = new Promise(resolve=>{current.resolve=resolve;});
    this.current=current;
    if(entry.duration&&!entry.file){
      current.phase='script';
      current.art={};
      current.poses=[...entry.poses||[]];
      if(entry.audio){current.jingle=new Audio(EXPANDED_BASE+entry.audio);current.jingle.volume=volume;}
      this.loadCaptions(current);
      Promise.all([...(entry.animations||[]).map(async name=>current.art[name]=await loadExpandedAnimation(extraArt[name])),
        ...(entry.pictures||[]).map(async name=>current.art[name]=await expandedImage(extraArt[name]))]).catch(()=>{});
    }else if (id==='skyEndCredits') {
      current.phase='ending';
      const suffix=misses<25?'good':'bad';
      current.ending=new Image();
      current.ending.src=EXPANDED_BASE+'ending-'+suffix+'.webp';
      current.jingle=new Audio(EXPANDED_BASE+'ending-'+suffix+'.ogg');
      current.jingle.volume=volume;
      current.jingle.play().catch(()=>{});
    } else this.play();
    return result;
  }

  play() {
    const current=this.current;
    if (!current) return;
    if (current.video) {
      current.video.play().then(()=>{current.phase='video';}).catch(()=>{current.phase='blocked';});
      return;
    }
    current.jingle?.pause();
    const video=document.createElement('video');
    video.playsInline=true;
    video.preload='auto';
    video.volume=current.volume;
    video.onplaying=()=>{current.phase='video';};
    video.onended=()=>this.stop(true);
    video.onerror=()=>{current.phase='error';};
    video.src=EXPANDED_BASE+current.entry.file;
    current.video=video;
    current.phase='loading';
    current.at=performance.now();
    video.play().catch(error=>{if(error.name==='NotAllowedError')current.phase='blocked';});
    this.loadCaptions(current);
  }

  loadCaptions(current){
    if(current.entry.captions)expandedCaptions(current.entry.captions).then(cues=>current.cues=cues).catch(()=>{});
  }

  drawAnimation(ctx,asset,time,x,y,scale,loop=false){
    if(!asset?.timeline)return;
    const {timeline,image}=asset,count=timeline.frames.length,at=Math.floor(Math.max(0,time)*timeline.fps/1000);
    const frame=timeline.frames[loop?at%count:Math.min(count-1,at)];
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    for(const command of frame){
      const [sx,sy,w,h]=command.r;
      ctx.save();ctx.globalAlpha*=command.a??1;ctx.transform(...command.m);
      if(command.rotated){ctx.translate(0,w);ctx.rotate(-Math.PI/2);}
      ctx.drawImage(image,sx,sy,w,h,0,0,w,h);ctx.restore();
    }
    ctx.restore();
  }

  drawScript(ctx,current,elapsed,stage,pose){
    if(current.jingle&&!current.soundStarted&&elapsed>=(current.entry.audioAt||0)){
      current.soundStarted=true;current.jingle.play().catch(()=>{});
    }
    while(current.poses.length&&current.poses[0][0]<=elapsed)pose(...current.poses.shift());
    stage(elapsed);
    const {art,id,entry}=current;
    if(id==='wife-stage'){
      if(art.wifeBackdrop)ctx.drawImage(art.wifeBackdrop,0,0,1280,720);
      if(elapsed<4200)this.drawAnimation(ctx,art.wifeBf,elapsed,365,100,.8);
      else{
        this.drawAnimation(ctx,art.wifeSky,elapsed-4200,120,10,.82,true);
        if(art.wifeHearts){ctx.save();ctx.globalAlpha=.3;ctx.drawImage(art.wifeHearts,0,0,1280,720);ctx.restore();}
      }
    }
    if(id==='moderato-stage'&&elapsed>=1300)this.drawAnimation(ctx,art.materializeSky,elapsed-1300,790,245,.7);
    if(id==='week7-sky-stage'&&elapsed<3900)this.drawAnimation(ctx,art.fallingSky,elapsed,760,220,.72);
    const fade=Math.max(0,1-elapsed/(entry.fadeIn||800),entry.fadeOut?(elapsed-entry.fadeOut)/1800:0);
    if(fade){ctx.fillStyle='rgba(0,0,0,'+Math.min(1,fade)+')';ctx.fillRect(0,0,1280,720);}
  }

  advance(skip=false,now=performance.now()) {
    const current=this.current;
    if (!current) return;
    if (current.phase==='ending'||current.phase==='blocked'&&!skip) {
      this.play();
      return;
    }
    if (current.id==='skyEndCredits'&&current.phase==='video'&&now-current.skipAt>2000) {
      current.skipAt=now;
      return;
    }
    this.stop(true);
  }

  stop(complete=false) {
    const current=this.current;
    if (!current) return;
    this.current=null;
    if(current.video){
      current.video.onended=current.video.onerror=current.video.onplaying=null;
      current.video.pause();
      current.video.removeAttribute('src');
      current.video.load();
    }
    current.jingle?.pause();
    current.resolve(complete);
  }

  draw(ctx,now,{stage=()=>{},pose=()=>{}}={}) {
    const current=this.current;
    if (!current) return '';
    const {video,ending,phase,cues}=current;
    const elapsed=now-current.at;
    if(phase==='script'&&elapsed>=current.entry.duration){this.stop(true);return '';}
    ctx.fillStyle='#000';
    ctx.fillRect(0,0,1280,720);
    const frame=phase==='ending'?ending:video;
    const width=frame?.videoWidth||frame?.naturalWidth,height=frame?.videoHeight||frame?.naturalHeight;
    if(width&&height&&(frame===ending||video.readyState>=2)){
      const scale=Math.min(1280/width,720/height);
      ctx.drawImage(frame,(1280-width*scale)/2,(720-height*scale)/2,width*scale,height*scale);
    }
    if(phase==='script')this.drawScript(ctx,current,elapsed,stage,pose);
    const seconds=phase==='video'?video.currentTime:phase==='script'?elapsed/1000:-1;
    const subtitles=cues.find(cue=>cue.start<=seconds&&cue.end>seconds)?.text||[];
    ctx.save();
    ctx.textAlign='center';ctx.font='23px VCR, monospace';ctx.lineWidth=6;ctx.lineJoin='round';
    for(const [index,line] of subtitles.entries()){
      const y=641-(subtitles.length-index-1)*29;
      ctx.strokeStyle='#000';ctx.strokeText(line,640,y);ctx.fillStyle='#fff';ctx.fillText(line,640,y);
    }
    const prompt=phase==='ending'?'ENTER TO CONTINUE':phase==='blocked'?'TAP OR PRESS ENTER TO PLAY':phase==='error'?'VIDEO UNAVAILABLE   /   ENTER TO CONTINUE':
      phase==='loading'?'LOADING CUTSCENE   /   ESC TO SKIP':now-current.skipAt<2000?'PRESS AGAIN TO SKIP CREDITS':'ENTER OR ESC TO SKIP';
    ctx.font='19px VCR, monospace';ctx.strokeText(prompt,640,694);ctx.fillStyle='#fff';ctx.fillText(prompt,640,694);ctx.restore();
    return subtitles.join(' ');
  }
}


// ---- expanded-gameplay.mjs ----
const EXPANDED_NOTE_POSES={ugh:'ugh',hehprettygood:'hehPrettyGood',skyughnote:'ugh',skyheynote:'hey',
  lightcan:'lightCan',kneecan:'kneeCan',kickcan:'kickCan',cockgun:'cock',firegun:'shoot'};
const FIGHT_POSES={block:'block',dodge:'dodge',hithigh:'hitHigh',hitlow:'hitLow',hitspin:'hitSpin',
  idle:'idle',taunt:'taunt',fakeout:'fakeout',reversefakeout:'fakeout',tauntforce:'taunt'};

function expandedNote(game,note,time,actors,playSound,miss=false){
  const side=note.player?'player':'opponent',rival=note.player?'opponent':'player';
  const kind=String(note.kind||'').toLowerCase(),special=kind.replace(/^weekend-1-/,'');
  const force=(role,name,length=430)=>{
    if(name)actors[role].forced={name,since:time,until:time+length,lock:true};
  };
  if(game.choice.baseSong==='blazin'){
    const punch=side=>{const options=['punchHigh1','punchHigh2','punchLow1','punchLow2'].filter(pose=>pose!==game.lastPunch);const name=options[Math.floor(Math.random()*options.length)];game.lastPunch=name;force(side,name);return name;};
    if(kind==='blazinpunchrandomizenote'||miss){
      const attacker=miss?'opponent':Math.random()<0.5?side:rival,defender=attacker==='player'?'opponent':'player';
      const attack=punch(attacker),hit=attack.startsWith('punchLow')?'hitLow':'hitHigh';
      const responses=['block','dodge',hit].filter(pose=>pose!==game.lastDefense);
      const defense=miss?hit:responses[Math.floor(Math.random()*responses.length)];game.lastDefense=defense;
      force(defender,defense);game.fightLead=attacker;game.lastStrike=time;
    }else if(special.includes('uppercut')){
      const attacker=special.startsWith('darnell')?'opponent':'player';
      const prepare=special.endsWith('prep');force(attacker,prepare?'uppercutPrep':'uppercut',700);
      if(!prepare){force(attacker==='player'?'opponent':'player','uppercutHit',650);game.lastStrike=time;}
      game.fightLead=attacker;
    }else if(special.startsWith('punch')){
      force(side,(special.startsWith('punchlow')?'punchLow':'punchHigh')+(special.endsWith('spin')?2:1));
      force(rival,special.endsWith('blocked')?'block':special.endsWith('dodged')?'dodge':special.endsWith('spin')?'hitSpin':special.startsWith('punchlow')?'hitLow':'hitHigh');
      game.lastStrike=time;game.fightLead=side;
    }else{
      force(side,FIGHT_POSES[special]||(special.startsWith('block')?'block':special.startsWith('dodge')?'dodge':null));
    }
    return;
  }
  if(game.choice.baseSong==='2hot'&&game.choice.variant!=='sky'){
    if(special==='lightcan'){game.can={lit:time,thrown:null,shot:null};playSound('W7W1_Darnell_Lighter',.6);}
    if(['kickcan','kneecan'].includes(special)&&game.can){game.can.thrown=time;playSound('W7W1_Kick_Can_UP',.5);}
    if(special==='cockgun'&&!miss){game.cockedAt=time;playSound('W7W1_Gun_Prep',.65);}
    if(special==='firegun'){
      if(game.can)game.can.shot=time;
      if(miss||time-(game.cockedAt??-9999)>1200){game.stats.health=Math.max(0,game.stats.health-.18);force('player','hit',520);playSound('W7W1_Pico_Bonk',.65);}
      else playSound('W7W1_shot'+(1+Math.floor(Math.random()*4)),.65);
    }
  }
  if(!miss)force(side,EXPANDED_NOTE_POSES[special],kind==='hehprettygood'?930:410);
}

function drawExpandedRain(ctx,time,intensity=1){
  ctx.save();ctx.strokeStyle='rgba(175,210,255,.22)';ctx.lineWidth=1.35;ctx.beginPath();
  for(let i=0;i<84;i++){
    const t=time*.8,x=((i*173-t*.21)%1450+1450)%1450-70,y=((i*123+t*(.9+i%4*.12))%830+830)%830-45;
    const size=(13+i%6*4)*intensity;
    ctx.moveTo(x,y);ctx.lineTo(x-size*.25,y+size);
  }
  ctx.stroke();ctx.restore();
}


// ---- native-results.mjs ----
// Native V-Slice result artwork and timelines. Assets come from the user's game.
// UI/game-state integration belongs to the caller; draw() returns click targets.
const NR_DIGITS=['ZERO','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE'];
const NR_CLAMP=(n,a,b)=>Math.min(b,Math.max(a,n));
const NR_QUART=t=>1-Math.pow(1-NR_CLAMP(t,0,1),4);
const NR_FONT='AaBbCcDdEeFfGgHhiIJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz:1234567890().-';
const NR_RANKKEY={PERFECT_GOLD:'PERFECT',PERFECT:'PERFECT',EXCELLENT:'EXCELLENT',GREAT:'GREAT',GOOD:'GOOD',SHIT:'LOSS'};

function nativeResultTallies(stats={}){
  const source=stats.tallies||stats,judgements=source.judgements||stats.judgements||{};
  const sick=Number(source.sick??judgements.sick)||0,good=Number(source.good??judgements.good)||0,bad=Number(source.bad??judgements.bad)||0,shit=Number(source.shit??judgements.shit)||0,missed=Number(source.missed??source.misses)||0;
  const totalNotesHit=Number(source.totalNotesHit??source.hits)||(sick+good+bad+shit);
  return{sick,good,bad,shit,missed,totalNotesHit,totalNotes:Number(source.totalNotes)||(totalNotesHit+missed),maxCombo:Number(source.maxCombo)||0,score:Number(stats.score??source.score)||0};
}
function nativeCompletion(stats){const t=nativeResultTallies(stats);return t.totalNotes?NR_CLAMP((t.sick+t.good-t.missed)/t.totalNotes,0,1):0;}
function nativeResultRank(stats){const t=nativeResultTallies(stats);if(!t.totalNotes)return null;if(t.sick===t.totalNotes)return'PERFECT_GOLD';const c=nativeCompletion(t);return c===1?'PERFECT':c>=0.9?'EXCELLENT':c>=0.8?'GREAT':c>=0.6?'GOOD':'SHIT';}

class NativeResults {
  constructor(base='native-results-'){
    this.base=base;this.ui=null;this.images={};this.animations={};this.atlases={};this.groups=new Map();this.packCache=new Map();this.rankImageNames=[];this.ready=false;this.started=false;this.music=null;this.introMusic=null;this.audio={};this.lastTick=-1;this.lastCue=0;this.extraCues=new Set();this.tinted=new Map();
  }
  async loadCommon(progress=()=>{}){
    if(this.ui)return this;const response=await fetch(this.base+'nr-ui.json');if(!response.ok)throw new Error('Native result UI unavailable');this.ui=await response.json();this.atlases={...this.ui.atlases};let done=0;const entries=Object.entries(this.ui.images);
    await Promise.all(entries.map(async([name,url])=>{const image=new Image();image.src=url;await image.decode();this.images[name]=image;progress(++done/entries.length);}));return this;
  }
  async prepare(stats,{character='bf',rank=null,progress=()=>{}}={}){
    await this.loadCommon(progress);rank=rank||nativeResultRank(stats)||'SHIT';let pack;
    if(character==='sky'&&this.sky){
      const configs=this.sky.results.configs[rank],images={},animations={};
      for(const {id} of configs){
        const entry=this.sky.results.animationAssets[id];
        images[id]=EXPANDED_BASE+entry.image;
        animations[id]=await expandedJSON(entry.timeline);
      }
      pack={images,animations,atlases:{}};
    }else{
      character=character==='pico'?'pico':'bf';
      const filename=this.ui.packs[character+':'+rank];
      if(!this.packCache.has(filename)){const r=await fetch(this.base+filename);if(!r.ok)throw new Error('Native rank animation unavailable: '+filename);this.packCache.set(filename,await r.json());}
      pack=this.packCache.get(filename);
    }
    // Keep only this rank's decoded bitmaps. Cached JSON is small, and other
    // rank bitmaps must not add hundreds of MB to an active gameplay session.
    for(const name of this.rankImageNames)delete this.images[name];this.rankImageNames=Object.keys(pack.images);this.animations=pack.animations;this.atlases={...this.ui.atlases,...pack.atlases};this.groups.clear();
    await Promise.all(Object.entries(pack.images).map(async([name,url])=>{const image=new Image();image.src=url;await image.decode();this.images[name]=image;}));
    this.preparedCharacter=character;this.preparedRank=rank;this.ready=true;return this;
  }
  begin({stats={},title='',difficulty='normal',character=this.preparedCharacter||'bf',rank=this.preparedRank,naughty=false,isNewHighscore=false,practice=false,autoplay=false,volume=0.7,reducedMotion=false,now=performance.now(),easterEgg='random'}={}){
    this.stop();this.stats=nativeResultTallies(stats);this.rank=rank||nativeResultRank(this.stats)||'SHIT';this.character=character==='sky'&&this.sky?'sky':character==='pico'?'pico':'bf';this.completion=nativeCompletion(this.stats);this.title=title;this.difficulty=String(difficulty).toLowerCase();this.isNewHighscore=!!isNewHighscore;this.practice=practice;this.autoplay=autoplay;this.volume=volume;this.reducedMotion=reducedMotion;this.startAt=now;this.started=true;this.lastTick=-1;this.extraCues.clear();this.configs=this.character==='sky'?this.sky.results.configs[this.rank]:(this.ui.configs[this.character][this.rank]||[]).filter(c=>c.filter==='both'||(naughty?c.filter==='naughty':c.filter==='safe')).sort((a,b)=>(a.zIndex||500)-(b.zIndex||500));this.timings=this.ui.timing[this.rank];
    this.picoGoodIntro=easterEgg==='fat-gf'?'intro fat gf':easterEgg==='cass'?'intro cass':easterEgg==='normal'?'intro':Math.random()<0.05?'intro fat gf':Math.random()<0.2?'intro cass':'intro';return this;
  }
  stop(){for(const a of [this.music,this.introMusic,...Object.values(this.audio)])if(a){a.pause();try{a.currentTime=0;a.playbackRate=1;}catch{}}this.music=null;this.introMusic=null;this.started=false;this.musicStarted=false;}
  releaseRankImages(){this.stop();for(const name of this.rankImageNames)delete this.images[name];this.rankImageNames=[];this.animations={};this.ready=false;}
  cue(name,volume=1){let a=this.audio[name];if(!a){a=new Audio(this.base+'nr-'+name+'.ogg');a.preload='auto';this.audio[name]=a;}a.pause();try{a.currentTime=0;}catch{}a.volume=NR_CLAMP(this.volume*volume,0,1);a.play().catch(()=>{});}
  playMusic(){
    if(this.musicStarted)return;this.musicStarted=true;
    if(this.character==='sky'){
      const id=this.sky.player.results.music[this.rank],track=this.sky.results.music[id];
      const main=new Audio(EXPANDED_BASE+track.file);main.loop=true;main.volume=this.volume;this.music=main;main.play().catch(()=>{});return;
    }
    const id=this.ui.music[this.character][this.rank],files=new Set(this.ui.media.map(m=>m.file));const main=new Audio(this.base+'nr-'+id+'.ogg');main.loop=true;main.preload='auto';main.volume=NR_CLAMP(this.volume,0,1);this.music=main;
    if(files.has('nr-'+id+'-intro.ogg')){const intro=new Audio(this.base+'nr-'+id+'-intro.ogg');intro.volume=main.volume;intro.onended=()=>{if(this.started)main.play().catch(()=>{});};this.introMusic=intro;intro.play().catch(()=>main.play().catch(()=>{}));}else main.play().catch(()=>{});
  }
  frames(name,prefix){const key=name+'|'+prefix;if(!this.groups.has(key))this.groups.set(key,(this.atlases[name]||[]).filter(f=>f.name.startsWith(prefix)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})));return this.groups.get(key);}
  sprite(ctx,name,prefix,x,y,scale=1,time=0,{loop=false,index=null,alpha=1,color=null}={}){
    const list=this.frames(name,prefix);if(!list.length)return;const i=index??Math.floor(Math.max(0,time)*24/1000),f=list[loop?i%list.length:Math.min(list.length-1,Math.max(0,i))];if(!f)return;
    ctx.save();ctx.globalAlpha*=alpha;const dx=x-(f.frameX||0)*scale,dy=y-(f.frameY||0)*scale;
    if(color){const key=name+'|'+f.name+'|'+color;let bitmap=this.tinted.get(key);if(!bitmap){bitmap=document.createElement('canvas');bitmap.width=f.width;bitmap.height=f.height;const c=bitmap.getContext('2d');c.drawImage(this.images[name],f.x,f.y,f.width,f.height,0,0,f.width,f.height);c.globalCompositeOperation='multiply';c.fillStyle=color;c.fillRect(0,0,f.width,f.height);c.globalCompositeOperation='destination-in';c.drawImage(this.images[name],f.x,f.y,f.width,f.height,0,0,f.width,f.height);this.tinted.set(key,bitmap);}ctx.drawImage(bitmap,dx,dy,f.width*scale,f.height*scale);}else ctx.drawImage(this.images[name],f.x,f.y,f.width,f.height,dx,dy,f.width*scale,f.height*scale);ctx.restore();
  }
  image(ctx,name,x,y,scale=1,alpha=1){const image=this.images[name];if(!image)return;ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(image,x,y,image.width*scale,image.height*scale);ctx.restore();}
  bitmapText(ctx,value,x,y,{scale=1,angle=0,alpha=1}={}){
    const image=this.images.tardlingSpritesheet;if(!image)return;const columns=Math.floor(image.width/49);ctx.save();ctx.translate(x,y);ctx.rotate(angle*Math.PI/180);ctx.globalAlpha*=alpha;let dx=0;
    for(const c of String(value)){const i=NR_FONT.indexOf(c);if(i>=0)ctx.drawImage(image,(i%columns)*49,Math.floor(i/columns)*61,49,61,dx,0,49*scale,61*scale);dx+=34*scale;}ctx.restore();return dx;
  }
  tally(ctx,value,x,y,color='#fff',scale=1){for(const digit of String(Math.max(0,Math.round(value)))){this.sprite(ctx,'tallieNumber',digit+' small',x,y,scale,0,{color});x+=43*scale;}}
  percent(ctx,value,x,y,{small=false,alpha=1,flash=false}={}){
    const str=String(NR_CLAMP(Math.floor(value),0,100));ctx.save();ctx.globalAlpha*=alpha;this.image(ctx,small?'clearPercent_clearPercentTextSmall':'clearPercent_clearPercentText',x+(small?40:0),y);
    const offset=str.length===1?1:str.length===3?-1:0;
    for(let i=0;i<str.length;i++){const variant=str.length===3?i>=1:true,name=small?'clearPercent_clearPercentNumberSmall':variant?'clearPercent_clearPercentNumberRight':'clearPercent_clearPercentNumberLeft',dx=x+(i+offset)*(small?32:72)+(small?-24:0),dy=y+(small?(i+offset)*-4:72);this.sprite(ctx,name,'number '+str[i]+' 0',dx,dy,1,0,{color:flash?'#fff':null});}ctx.restore();
  }
  animationFrame(data,config,elapsed){
    const fps=Number(data.fps)||24;let start=0,length=data.frames.length,loopStart=config.loopFrame??null,loopLength=data.frames.length-(loopStart||0);
    let label=config.startFrameLabel;
    if(config.scriptClass==='PicoGoodResults')label=this.picoGoodIntro;
    if(label&&data.labels[label]){[start,length]=data.labels[label];}
    if(config.loopFrameLabel&&data.labels[config.loopFrameLabel]){[loopStart,loopLength]=data.labels[config.loopFrameLabel];}
    if(config.scriptClass==='PicoGoodResults'){[loopStart,loopLength]=data.labels.loop||[41,175];}
    const raw=Math.floor(elapsed*fps/1000);
    if(raw<length)return start+raw;
    if(config.looped===false)return start+length-1;
    if(loopStart!==null)return loopStart+(raw-length)%Math.max(1,loopLength);
    return start+(raw%length);
  }
  characterAnimation(ctx,config,elapsed){
    if(elapsed<0)return;const name=config.id,image=this.images[name];if(!image)return;const[x,y]=config.offsets||[0,0],scale=config.scale??1;
    if(config.renderType==='sparrow'){const all=this.frames(name,''),raw=Math.floor(elapsed*24/1000),index=raw<all.length?raw:(config.loopFrame||0)+(raw-all.length)%Math.max(1,all.length-(config.loopFrame||0));this.sprite(ctx,name,'',x,y,scale,elapsed,{index});return;}
    const data=this.animations[name];if(!data)return;const index=this.animationFrame(data,config,elapsed),commands=data.frames[index]||[];
    for(const command of commands){
      const[sx,sy,w,h]=command.r;ctx.save();ctx.globalAlpha*=command.a??1;
      if(command.flash){ctx.fillStyle=command.flash;ctx.fillRect(0,0,1280,720);ctx.restore();continue;}
      const bounds=data.bounds||[0,0,0,0];if(this.character==='sky'&&data.stageMatrix)ctx.transform(...data.stageMatrix);else{ctx.translate(x+(1-scale)*bounds[2]/2,y+(1-scale)*bounds[3]/2);ctx.scale(scale,scale);ctx.translate(-bounds[0],-bounds[1]);}ctx.transform(...command.m);
      if(command.rotated){ctx.translate(0,w);ctx.rotate(-Math.PI/2);}
      ctx.drawImage(image,sx,sy,w,h,0,0,w,h);ctx.restore();
    }
  }
  draw(ctx,{now=performance.now(),reducedMotion=this.reducedMotion,volume=this.volume,hints=false}={}){
    if(!this.ready||!this.started){ctx.fillStyle='#000';ctx.fillRect(0,0,1280,720);return[];}this.volume=NR_CLAMP(volume,0,1);if(this.music)this.music.volume=this.volume;if(this.introMusic)this.introMusic.volume=this.volume;
    const elapsed=Math.max(0,now-this.startAt),frame=elapsed*24/1000,timing=this.timings,characterAt=timing.character/24*1000,rankAt=timing.flash/24*1000;
    if(elapsed>=timing.music/24*1000)this.playMusic();
    const g=ctx.createLinearGradient(0,0,0,720);g.addColorStop(0,'#fecc5c');g.addColorStop(1,'#fdc05c');ctx.fillStyle=g;ctx.fillRect(0,0,1280,720);
    if(elapsed>=rankAt){
      const key=NR_RANKKEY[this.rank],horizontal=this.images['rankText_rankScroll'+key],vertical=this.images['rankText_rankText'+key],age=(elapsed-rankAt)/1000;
      ctx.save();ctx.rotate(-3.8*Math.PI/180);for(let row=0;row<12;row++){const offset=reducedMotion?0:age*(row%2?-7:7);for(let x=-horizontal.width+(offset%horizontal.width);x<1600;x+=horizontal.width+10)ctx.drawImage(horizontal,x,60+67.5*row);}ctx.restore();
      if(reducedMotion||age>0.25||Math.floor(age*12)%2===0){const offset=reducedMotion?0:Math.max(0,age-1.25)*80;for(let y=100-offset%(vertical.height+30)-vertical.height;y<720;y+=vertical.height+30)ctx.drawImage(vertical,1236,y);}
    }
    // Large cleared percentage counts from target minus 36, then fades away.
    if(frame>=37){const target=Math.floor(this.completion*100),phase=NR_CLAMP((elapsed-37/24*1000)/(58/24*1000),0,1),value=Math.round(Math.max(0,target-36)+(target-Math.max(0,target-36))*NR_QUART(phase));const finish=95/24*1000,fade=1-NR_CLAMP((elapsed-finish-750)/500,0,1);
      if(fade>0)this.percent(ctx,value,830,290,{alpha:fade,flash:elapsed>=finish&&elapsed<finish+400&&!reducedMotion});
      if(value!==this.lastTick&&phase<1){this.lastTick=value;this.cue('scrollMenu',0.25);}if(phase>=1&&!this.extraCues.has('tally-done')){this.extraCues.add('tally-done');this.cue('confirmMenu',0.7);}
    }
    // Character layers are the original full nested symbol trees, with their
    // native offsets, delays, initial labels and loop points.
    if(elapsed>=characterAt)for(const config of this.configs){const age=elapsed-characterAt-(config.delay||0)*1000;this.characterAnimation(ctx,config,reducedMotion?Math.min(age,500):age);if(age>=0&&config.sound&&!this.extraCues.has(config.sound)){this.extraCues.add(config.sound);this.cue(config.sound.split(':').pop(),0.7);}}
    if(frame>=8)this.sprite(ctx,'soundSystem','sound system',-15,-180,1,reducedMotion?10000:elapsed-8/24*1000);
    // Black title ribbon is rotated -3.8 degrees in the native bitmap.
    const topT=NR_QUART((elapsed-3/24*1000)/(7/24*1000));ctx.save();ctx.translate(-15,-148*(1-topT));ctx.rotate(-3.8*Math.PI/180);ctx.fillStyle='#000';ctx.fillRect(0,-100,1300,248);ctx.restore();
    if(frame>=10){
      const titlePhase=NR_QUART((elapsed-900)/500),scroll=reducedMotion?0:Math.max(0,elapsed-3500)*0.055;ctx.save();ctx.beginPath();ctx.rect(500,0,780,148);ctx.clip();this.bitmapText(ctx,this.title,530-scroll,97+100*(1-titlePhase),{angle:-4.4});ctx.restore();
      const diff=this.images['diff_'+this.difficulty]?'diff_'+this.difficulty:'diff_normal';this.image(ctx,diff,555,122+90*(1-NR_QUART((elapsed-800)/500)));if(elapsed>=characterAt)this.percent(ctx,Math.floor(this.completion*100),940,117,{small:true});
    }
    if(frame>=6)this.sprite(ctx,'results','results instance 1',-200,-10,1,reducedMotion?10000:elapsed-6/24*1000);
    if(frame>=21)this.sprite(ctx,'ratingsPopin','Categories',-135,135,1,reducedMotion?10000:elapsed-21/24*1000);
    if(frame>=36)this.sprite(ctx,'scorePopin','tally score',-180,515,1,reducedMotion?10000:elapsed-36/24*1000);
    const counters=[['totalNotesHit',375,150,'#fff'],['maxCombo',375,200,'#fff'],['sick',230,277,'#89e59e'],['good',210,331,'#89c9e5'],['bad',190,385,'#e6cf8a'],['shit',220,439,'#e68c8a'],['missed',260,493,'#c68ae6']];
    counters.forEach(([key,x,y,color],i)=>{const p=NR_QUART((elapsed-(1200+i*300))/500);if(elapsed>=1200+i*300)this.tally(ctx,Math.round(this.stats[key]*p),x-(this.stats.totalNotesHit>=1000&&i<2?30:0),y,color);});
    if(frame>=37){const str=String(Math.max(0,Math.min(9999999999,Math.round(this.stats.score)))),first=10-str.length;
      for(let i=0;i<str.length;i++){const age=elapsed-37/24*1000-(first+i-1)/24*1000;if(age<0)continue;let digit=Number(str[i]);if(!reducedMotion&&age<41/24*1000)digit=Math.floor(age*24)%10;else if(!reducedMotion&&age<64/24*1000)digit=Math.floor(Number(str[i])*NR_QUART((age-41/24*1000)/(23/24*1000)));const shuffle=age<64/24*1000?4:Math.max(0,age-64/24*1000);this.sprite(ctx,'score-digital-numbers',NR_DIGITS[digit]+' DIGITAL',70+65*(first+i),610,1,shuffle);}
    }
    if(this.isNewHighscore&&elapsed>=timing.highscore/24*1000)this.sprite(ctx,'highscoreNew','highscoreAnim0',44,557,1,reducedMotion?10000:elapsed-timing.highscore/24*1000);
    if(!reducedMotion){let flash=frame>=37&&frame<42?1-(frame-37)/5:0;if(elapsed>=rankAt&&elapsed<rankAt+14/24*1000)flash=Math.max(flash,1-(elapsed-rankAt)/(14/24*1000));if(flash>0){ctx.save();ctx.globalAlpha=flash;ctx.fillStyle='#fff1b4';ctx.fillRect(0,0,1280,720);ctx.restore();}}
    if(hints){ctx.save();ctx.font='18px VCR,monospace';ctx.fillStyle='#000b';ctx.fillRect(0,690,1280,30);ctx.fillStyle='#fff';ctx.fillText('ENTER: CONTINUE     R: PLAY AGAIN',15,712);if(this.practice||this.autoplay){ctx.textAlign='right';ctx.fillStyle='#ffde54';ctx.fillText('PRACTICE / AUTOPLAY — SCORE NOT SAVED',1265,712);}ctx.restore();}
    return[{id:'native-results-continue',label:'Continue from results',x:0,y:0,w:800,h:720,action:'continue'},{id:'native-results-replay',label:'Replay song',x:800,y:625,w:480,h:95,action:'replay'}];
  }
}


// ---- game.mjs ----

const canvas=document.querySelector('#screen'),ctx=canvas.getContext('2d',{alpha:false});
const buttonLayer=document.querySelector('#buttons'),announcement=document.querySelector('#announcement');
const storage={get(k,f){try{return JSON.parse(localStorage.getItem('fnf-week1:'+k))??f;}catch{return f;}},set(k,v){try{localStorage.setItem('fnf-week1:'+k,JSON.stringify(v));}catch{}}};
const settings=normalizeSettings(storage.get('settings',{}));
if(!storage.get('settings',null)&&matchMedia('(prefers-reduced-motion: reduce)').matches)settings.reducedMotion=true;
const assets=new Assets(),audio=new AudioEngine(settings),chartCache=new Map();
let chartEditor=null;
const nativeContent=new NativeContent(assets,audio),nativeExtras=new NativeExtras(),nativeResults=new NativeResults();
const storyIntros=new StoryIntros();let introWaiter=null,introAnnouncement='';
const pixelUI=new PixelUI(assets,audio,()=>nativeContent.data);
const modernFreeplay=new ModernFreeplay(),characterSelect=new CharacterSelect(),sceneTransitions=new SceneTransitions(),modLibrary=new ModLibrary();
installNativeEditor(ChartEditor,{loadRaw:(index,diff)=>rawChoice(songChoice(index,diff)),onDifficulty:value=>difficulty=value,characterChoices:()=>['bf','pico-playable','dad','gf','spooky','monster','pico','mom-car','bf-car','gf-car',...Object.keys(nativeContent.data.characterIds||{}),...modLibrary.records.flatMap(r=>r.items.flatMap(i=>Object.values(i.metadata.playData?.characters||{}).filter(v=>typeof v==='string')))],stageChoices:()=>['mainStage','mainStageErect','spookyMansion','spookyMansionErect','phillyTrain','phillyTrainErect','limoRide','limoRideErect',...Object.keys(nativeContent.data.stages),...modLibrary.songs().map(s=>s.stage)]});
modernFreeplay.backingCard=nativeExtras;
const expandedContent=new ExpandedContent(),expandedCutscenes=new ExpandedCutscenes(),skyGallery=new SkyGallery();
let skyMenu=null,skySelectLoad=null,skyDJLoad=null,skySecret='';
async function loadExpandedMenu(){
  const menu=await expandedJSON('menu.json');skyMenu=menu.sky;nativeResults.sky=skyMenu;
  const storyImages=[];
  for(const week of EXPANDED_WEEKS){Object.assign(week,menu.weeks[week.id]);storyImages.push(week.storyProp,week.titleImage,week.storyPlayer,week.storyPartner);}
  modernFreeplay.characterIcons={};
  for(const [id,{name,atlas}] of Object.entries(menu.icons)){modernFreeplay.characterIcons[id]=name;modernFreeplay.atlases[name]=atlas;}
  await assets.ensure([...storyImages,...Object.values(modernFreeplay.characterIcons)]);
  for(const name of storyImages.filter(Boolean))assets.lazyNames.delete(name);
  for(const name of Object.values(modernFreeplay.characterIcons)){modernFreeplay.images[name]=assets.images[name];assets.lazyNames.delete(name);}
  modernFreeplay.skyAlbums=skyMenu.albums;
}
async function loadSkySelection(){
  if(!skySelectLoad)skySelectLoad=(async()=>{
    const [chill,name]=await Promise.all([loadExpandedAnimation(skyMenu.charSelect.chill),expandedImage(skyMenu.charSelect.nameTag),assets.ensure(['HEALTH_SKY-PLAYABLE'])]);
    characterSelect.animations.skyChill=chill.timeline;
    characterSelect.images.skyChill=chill.image;
    characterSelect.images.skyName=name;
    characterSelect.images.skyIcon=assets.images['HEALTH_SKY-PLAYABLE'];
  })().catch(error=>{skySelectLoad=null;throw error;});
  return skySelectLoad;
}
function loadSkyDJ(){
  if(!skyDJLoad)skyDJLoad=(async()=>{
    modernFreeplay.skyDJ=await loadExpandedAnimation(skyMenu.freeplay.dj);
    const map={skyBg:'freeplay/freeplayBGsky',skyCard:'freeplay/backingCards/sky/backingGradient',skyClouds:'freeplay/backingCards/sky/cloudsScrolling',skyHeads:'freeplay/backingCards/sky/boyfriendHeads',skyLines:'freeplay/backingCards/sky/backCardLines',skyAurora:'freeplay/backingCards/sky/auroraBlu',skyCapsule:skyMenu.style.capsuleAsset};
    await Promise.all(Object.entries(map).map(async([id,path])=>{
      const entry=skyMenu.freeplay.assets[path];if(!entry)return;
      modernFreeplay.images[id]=await expandedImage(entry.image);
      if(entry.atlas)modernFreeplay.atlases[id]=await expandedJSON(entry.atlas);
    }));
  })().catch(error=>{skyDJLoad=null;console.warn(error);});
  return skyDJLoad;
}
function loadSkyAlbum(id){
  const album=skyMenu?.albums[id];if(!album||modernFreeplay.albumPending?.has(id))return;
  modernFreeplay.albumPending??=new Set();modernFreeplay.albumPending.add(id);
  const {assets:albumAssets}=skyMenu.freeplay;
  const art=albumAssets[album.albumArtAsset],title=albumAssets[album.albumTitleAsset];
  if(art)expandedImage(art.image).then(image=>modernFreeplay.images[id]=image).catch(()=>{});
  if(title)Promise.all([expandedImage(title.image),expandedJSON(title.atlas)]).then(([image,atlas])=>{modernFreeplay.images[id+'title']=image;modernFreeplay.atlases[id+'title']=atlas;}).catch(()=>{});
}
function openSkyGallery(){stopPreview();audio.stopMenu();enter('gallery');skyGallery.begin(skyMenu.gallery,settings.volume).catch(error=>announce(error.message));}
function drawSkyGallery(){
  rect(0,0,1280,720,'#201030');if(skyGallery.background)ctx.drawImage(skyGallery.background,0,0,1280,720);rect(0,0,1280,720,'#16051b6b');const item=skyGallery.data?.items[skyGallery.index],picture=skyGallery.picture;
  if(skyGallery.logo)ctx.drawImage(skyGallery.logo,18,12,222,91);
  if(picture){const scale=Math.min(1040/picture.naturalWidth,485/picture.naturalHeight);const w=picture.naturalWidth*scale,h=picture.naturalHeight*scale;ctx.drawImage(picture,640-w/2,105+(485-h)/2,w,h);}
  if(item&&!skyGallery.hideText){text(item.title,640,598,23,'#fff','center');ctx.save();ctx.font='18px VCR,monospace';ctx.textAlign='center';ctx.fillStyle='#fbbfff';ctx.fillText(item.description||'',640,652,1130);ctx.restore();text((skyGallery.index+1)+' / '+skyGallery.data.items.length,1250,24,20,'#fff','right');}
  text('<',54,334,50);text('>',1210,334,50);newButton('gallery-prev','Previous gallery artwork',0,230,110,230,()=>skyGallery.select(-1));newButton('gallery-next','Next gallery artwork',1170,230,110,230,()=>skyGallery.select(1));footer('LEFT / RIGHT: BROWSE    ESC: BACK');
}
function launchSkySecret(){const index=SONGS.findIndex(song=>song.id==='sky-lyrics');if(index<0)return;audio.sfx('confirmMenu');difficulty=2;startSong(index,false,false,null,{character:'bf'});}
async function runExpandedSequence(id){
  const generation=loadGeneration,current=game;
  const result=expandedCutscenes.begin(id,{volume:settings.volume,misses:game.stats.misses,extraArt:skyMenu.cutsceneExtras});
  if(!result)return true;
  enter('cutscene');announce('Cutscene. Press Enter or Escape to skip.');
  return await result&&generation===loadGeneration&&current===game;
}
function drawExpandedSequence(){
  const offset=game.completed?game.time:0;
  const subtitles=expandedCutscenes.draw(ctx,frameTime,{stage:elapsed=>{game.beat=beatAt(game.chart,elapsed);drawStage(offset+elapsed);},
    pose:(at,role,name,duration=950)=>{const actor=role==='player'?actorBF:role==='opponent'?actorDad:actorGF;actor.forced={name,since:offset+at,until:offset+at+duration,lock:true};}});
  canvas.dataset.dialogue=subtitles;
  newButton('cutscene-next','Continue or skip cutscene',0,0,1280,720,()=>expandedCutscenes.advance(false));
}

WEEKS.push(...EXPANDED_WEEKS);
function songCaptions(choice){
  if(choice.variant==='sky'){
    const paths=skyMenu.cutsceneExtras.webvtt;
    return paths['data/songs/'+choice.baseSong+'/subtitles/song-lyrics-sky.srt']||
      (choice.baseSong==='stress'?paths['data/subtitles/skyplayable/stress-sky.srt']:null);
  }
  if(choice.baseSong==='sky-lyrics')return skyMenu.cutsceneExtras.webvtt['data/songs/sky-lyrics/subtitles/song-lyrics.srt'];
  if(choice.baseSong==='stress')return choice.variant==='pico'?'stress-pico-subtitles.srt':'stress-subtitles.srt';
  return null;
}
const builtinSongs=[...SONGS];let storyWeek=0,characterOpening=false,characterExitAt=0,modsReturn='menu';
function refreshMods(){SONGS.splice(0,SONGS.length,...builtinSongs,...modLibrary.songs());for(const song of SONGS)for(const level of song.mod?song.difficulties:[])if(!DIFFICULTIES.some(d=>d.toLowerCase()===level))DIFFICULTIES.push(level[0].toUpperCase()+level.slice(1));songIndex=Math.min(songIndex,SONGS.length-1);chartCache.clear();}
const modManager=new ModManager(modLibrary,{onExit:()=>{enter(modsReturn,modsReturn==='menu'?4:songIndex);canvas.focus();},onChange:refreshMods});
function openMods(){modsReturn=scene==='freeplay'?'freeplay':'menu';stopPreview();audio.stop();audio.stopMenu();enter('mods');modManager.open();}
function availableDifficulties(index=songIndex,character=fp.character){
  const song=SONGS[index];
  if(!song)return [];
  if(song.mod)return character==='sky'?[]:song.difficulties.map(level=>DIFFICULTIES.findIndex(name=>name.toLowerCase()===level));
  const levels=expandedContent.levels(song.id,character);
  if(levels.length||song.source||character==='sky')return DIFFICULTIES.flatMap((name,i)=>levels.includes(name.toLowerCase())?[i]:[]);
  const variants=variantCatalog.filter(variant=>variant.baseSong===song.id);
  if(character==='pico')return variants.some(variant=>variant.variant==='pico')?[0,1,2]:[];
  return variants.some(variant=>variant.variant==='erect')?[0,1,2,3,4]:[0,1,2];
}
function storyCharacter(){return WEEKS[storyWeek].character||'bf';}
function storyDifficulties(){return [0,1,2].filter(diff=>WEEKS[storyWeek].songs.every(id=>availableDifficulties(SONGS.findIndex(song=>song.id===id),storyCharacter()).includes(diff)));}
function normalizeDifficulty(index=songIndex,character=fp.character){
  const available=availableDifficulties(index,character);
  if(!available.includes(difficulty))difficulty=available.includes(1)?1:available[0]??1;
}
function weekStart(){return SONGS.findIndex(s=>s.id===WEEKS[storyWeek].songs[0]);}
async function beginCharacterSelection(){if(characterOpening||scene!=='freeplay')return;characterOpening=true;characterExitAt=performance.now();stopPreview();audio.stopMenu();try{await characterSelect.load();await loadSkySelection();const wait=Math.max(0,450-(performance.now()-characterExitAt));if(wait)await new Promise(r=>setTimeout(r,wait));if(scene!=='freeplay')return;enter('character');characterSelect.begin({character:fp.character,volume:settings.volume,reducedMotion:settings.reducedMotion,now:performance.now()});}catch(e){announce(e.message);audio.playMenu();}finally{characterOpening=false;}}
const fp={selectedId:'bopeebo',filter:'all',search:'',sort:'default',favorites:new Set(storage.get('favorites',[])),previewing:false,previewAt:0,previewEnd:45000,previewGeneration:0,previewTimer:null,character:playerIdentity(storage.get('character','bf')),instrumental:'default'};
let variantCatalog=[],baseSongCatalog=[];
let viewportWidth=1280,viewportAspect=1;
function viewAspect(){return viewportAspect;}
function mobileActive(){return settings.touchLayout==='on'||settings.touchLayout!=='off'&&(matchMedia('(pointer: coarse)').matches||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));}
function laneCount(){return game&&['play','paused','results','gameover'].includes(scene)?game.laneCount:settings.keyMode;}
function laneDirection(lane){return laneCount()===6?SIX_DIRECTIONS[lane]:lane;}
function playKeys(){return laneCount()===6?settings.keys6:settings.keys;}
function laneLabel(lane){return DIRECTIONS[laneDirection(lane)]+(laneCount()===6?' '+(lane+1):'');}
const touchControls=new TouchControls(document.querySelector('#game'),{active:()=>scene==='play'&&mobileActive(),lanes:laneCount,onPress:lane=>{held.add('touch'+lane);pressLane(lane);},onRelease:lane=>held.delete('touch'+lane)});
function toggleKeyMode(){settings.keyMode=settings.keyMode===6?4:6;saveSettings();stopPreview();announce(settings.keyMode+' key mode');}
function songChoice(index=songIndex,diff=difficulty,character=fp.character,instrumental=fp.instrumental){
 const song=SONGS[index],level=DIFFICULTIES[diff]?.toLowerCase()||'normal';if(song.mod)return modLibrary.choice(song,level,instrumental);
 const expanded=expandedContent.choice(song.id,character,level,instrumental);
 if(expanded&&(song.source||expandedContent.levels(song.id,character).length))return expanded;
 const kind=character==='pico'?'pico':diff>=3?'erect':null,variant=variantCatalog.find(v=>v.baseSong===song.id&&v.variant===kind),base=baseSongCatalog.find(v=>v.id===song.id),common={opponent:song.opponent||'dad',stage:song.stage||'mainStage',week:song.week??1,noteStyle:base?.playData?.noteStyle,characters:base?.characters||{player:'bf',opponent:song.opponent||'dad',girlfriend:'gf'}};
 if(variant&&variant.charts[level])return {...common,...variant,character,level,chartUrl:''+variant.charts[level],rawData:variant.chartData?.[level],audioUrls:[''+variant.instrumental,''+variant.voices]};
 const suffix=['-easy','','-hard'][Math.min(diff,2)],alternate=instrumental==='pico'?variantCatalog.find(v=>v.baseSong===song.id&&v.variant==='pico'):null;
 return {...common,id:song.id,name:song.name,bpm:song.bpm,character:'bf',level,chartUrl:`${song.id}${suffix}.json`,rawData:base?.chartData?.[level],audioUrls:[alternate?''+alternate.instrumental:`${song.file}_Inst.ogg`,`${song.file}_Voices.ogg`],audioOffsets:builtinTrackOffsets(base,alternate?'pico':null),previewStart:base?.previewStart||12000,previewEnd:base?.previewEnd||36000,album:base?.album||(song.week===2?'volume2':'volume1')};
}

async function rawChoice(choice){if(choice.mod)return modLibrary.chart(choice);if(choice.rawData)return structuredClone(choice.rawData);const response=await fetch(choice.chartUrl);if(!response.ok)throw new Error('The song chart could not be loaded.');return readJSON(await response.text());}
async function prepareChoice(choice){const request=audio.prepareGeneration=(audio.prepareGeneration||0)+1;await audio.unlock();const sources=choice.mod?await modLibrary.audioSources(choice):{urls:choice.audioUrls,offsets:choice.audioOffsets||choice.audioUrls.map(()=>0)},buffers=await Promise.all(sources.urls.map(url=>audio.load(url)));if(request===audio.prepareGeneration){audio.buffers=buffers;audio.trackOffsets=sources.offsets;audio.trackRoles=choice.audioRoles||[];audio.trimSongs(sources.urls);}return buffers[0].duration*1000+(sources.offsets[0]||0);}

function scoreKey(index,character=fp.character,diff=difficulty){if(settings.keyMode===6)return `score6:${SONGS[index].id}:${character}:${DIFFICULTIES[diff]}`;return character==='bf'&&diff<3?`score:${SONGS[index].id}:${diff}`:`score:${SONGS[index].id}:${character}:${DIFFICULTIES[diff]}`;}
const DIRECTIONS=['LEFT','DOWN','UP','RIGHT'],COLORS=['#c24b99','#00ffff','#12fa05','#f9393f'];
const NOTE_PREFIX=['purple0','blue0','green0','red0'];
const BF_OFFSETS={idle:[-5,0],LEFT:[12,-6],DOWN:[-10,-50],UP:[-29,27],RIGHT:[-38,-7]};
const DAD_OFFSETS={idle:[0,0],LEFT:[-10,10],DOWN:[0,-30],UP:[-6,50],RIGHT:[0,27]};
let scene='title',sceneAt=performance.now(),selected=0,difficulty=1,songIndex=0,story=false,storyTotal=0,storyStats=[],game=null;
let pendingAnimationFrame=null,renderWatchdog=null,fallbackUntil=0;
function scheduleFrame(){if(pendingAnimationFrame===null)pendingAnimationFrame=requestAnimationFrame(t=>{pendingAnimationFrame=null;tick(t);});}
let buttons=[],buttonSignature='',frameTime=0,lastFrame=0,flash=0,transition=0,errorText='',loadGeneration=0;
const buttonNodes=new Map(),buttonData=new Map();
let held=new Set(),laneFlashes=[0,0,0,0,0,0],opponentFlashes=[0,0,0,0,0,0],rebind=-1,pointerLanes=new Map(),lastPointer=null;
let actorBF={direction:'idle',since:0,until:0},actorDad={direction:'idle',since:0,until:0},actorGF={direction:'idle',since:0,until:0};
let menuBeat=-1,menuScroll=0,optionScroll=0,lastCountdown=-99,calibration=[],calibrationAt=0,calibrationPlaying=false;
const OPTIONS=[
  {key:'keyMode',label:'Note mode',type:'mode',description:'4K original charts or 6K with extra notes. 6K: LEFT, UP, RIGHT, LEFT, DOWN, RIGHT.'},
  {key:'touchLayout',label:'Mobile touch layout',type:'touch',description:'Auto detects a phone/tablet. Wide swipe lanes, centered player notes and miniature opponent notes.'},
  {key:'volume',label:'Master volume',type:'range',min:0,max:1,step:0.05,description:'Volume for music, vocals and sound effects.'},
  {key:'sfxVolume',label:'Sound effects',type:'range',min:0,max:1,step:0.05,description:'Menu sounds, countdown and missed-note sounds.'},
  {key:'downscroll',label:'Downscroll',type:'toggle',description:'Notes move down toward receptors at the bottom.'},
  {key:'middlescroll',label:'Centered notes',type:'toggle',description:'Center your four lanes and hide opponent notes.'},
  {key:'ghostTapping',label:'Ghost tapping',type:'toggle',description:'Pressing a key with no nearby note does not count as a miss.'},
  {key:'offset',label:'Note offset',type:'range',min:-300,max:300,step:5,description:'Shift the chart clock in milliseconds. Positive values make notes earlier.'},
  {key:'scrollSpeed',label:'Scroll speed',type:'range',min:0.5,max:3,step:0.1,description:'Multiply the chart scroll speed without changing the music.'},
  {key:'backgroundDim',label:'Stage dim',type:'range',min:0,max:0.8,step:0.1,description:'Darken the stage behind the notes.'},
  {key:'reducedMotion',label:'Reduced motion',type:'toggle',description:'Disable camera bumps, flashes and menu bounce.'},
  {key:'practice',label:'Practice mode',type:'toggle',description:'Keep playing when health reaches zero. Scores are not saved.'},
  {key:'botplay',label:'Autoplay',type:'toggle',description:'Watch the computer play your notes. Scores are not saved.'},
  {key:'controls',label:'Key bindings',type:'action',description:'Change the four note keys. Arrow keys always work.'},
  {key:'calibrate',label:'Calibrate timing',type:'action',description:'Tap Space to the metronome to estimate your timing offset.'},
  {key:'reset',label:'Reset settings',type:'action',description:'Restore default controls, volume and gameplay settings.'}
];

function announce(text){announcement.textContent=text;}
function saveSettings(){storage.set('settings',settings);audio.updateVolume();}
function text(str,x,y,size=24,color='#fff',align='left',stroke=3){ctx.save();ctx.translate(x,y);ctx.scale(1,viewAspect());x=0;y=0;ctx.font=`${size}px VCR, monospace`;ctx.textAlign=align;ctx.textBaseline='top';ctx.lineWidth=stroke*2;ctx.lineJoin='round';ctx.strokeStyle='#000';if(stroke)ctx.strokeText(str,x,y);ctx.fillStyle=color;ctx.fillText(str,x,y);ctx.restore();}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function letters(str,x,y,scale=1,options={}){assets.letters(ctx,str,x,y,scale,options);}
function image(name,x,y,w,h,alpha){assets.image(ctx,name,x,y,w,h,alpha);}
function atlasFrame(atlas,prefix,x,y,scale=1,index=0,alpha=1){assets.draw(ctx,atlas,assets.frame(atlas,prefix,index),x,y,scale,alpha);}
function animation(atlas,prefix,x,y,scale=1,time=frameTime-sceneAt,options={}){assets.anim(ctx,atlas,prefix,x,y,scale,time,options);}
function centerSprite(atlas,prefix,cx,y,scale=1,time=frameTime-sceneAt,options={}){const f=assets.frame(atlas,prefix);if(!f)return;animation(atlas,prefix,cx-(f.frameWidth||f.width)*scale/2,y,scale,time,options);}
function newButton(id,label,x,y,w,h,action,extra={}){buttons.push({id,label,x,y,w,h,action,...extra});}
function syncButtons(){
  const ids=new Set(buttons.map(b=>b.id));for(const [id,node] of buttonNodes)if(!ids.has(id)){node.remove();buttonNodes.delete(id);buttonData.delete(id);}
  for(const b of buttons){buttonData.set(b.id,b);let el=buttonNodes.get(b.id);if(!el){el=document.createElement('button');el.className='hitbox';el.dataset.id=b.id;
      el.addEventListener('click',e=>{const current=buttonData.get(b.id);if(!current||current.lane!==undefined)return;e.preventDefault();audio.unlock().catch(()=>{});current.action();canvas.focus({preventScroll:true});});
      el.addEventListener('focus',()=>{const current=buttonData.get(b.id);if(current?.select!==undefined&&selected!==current.select){selected=current.select;audio.sfx('scrollMenu',0.5);}});
      el.addEventListener('pointerdown',e=>{const current=buttonData.get(b.id);if(current?.lane===undefined)return;e.preventDefault();el.setPointerCapture(e.pointerId);pointerLanes.set(e.pointerId,current.lane);held.add('touch'+current.lane);pressLane(current.lane);});
      const release=e=>{const lane=pointerLanes.get(e.pointerId);if(lane!==undefined){held.delete('touch'+lane);pointerLanes.delete(e.pointerId);}};el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);
      buttonNodes.set(b.id,el);buttonLayer.append(el);
    }
    if(el.getAttribute('aria-label')!==b.label)el.setAttribute('aria-label',b.label);const layout=`left:${b.x/12.8}%;top:${b.y/7.2}%;width:${b.w/12.8}%;height:${b.h/7.2}%;`;if(el.dataset.layout!==layout){el.style.cssText=layout;el.dataset.layout=layout;}
  }
}
function enter(next,index=0){if(scene==='cutscene'&&next!=='cutscene')expandedCutscenes.stop(false);if(scene==='gallery'&&next!=='gallery')skyGallery.stop();if(scene==='intro'&&next!=='intro'){storyIntros.stop();if(introWaiter){introWaiter.resolve(false);introWaiter=null;}}if(scene==='results'&&next!=='results')nativeResults.stop();sceneTransitions.begin(canvas,scene,next,{reducedMotion:settings.reducedMotion});if(scene==='freeplay'&&next!=='freeplay')stopPreview();scene=next;sceneAt=performance.now();selected=index;rebind=-1;transition=0;buttonSignature='';held.clear();pointerLanes.clear();touchControls.clear();if(next==='freeplay'){songIndex=SONGS[index]?index:songIndex;const list=freeplaySongs();if(!list.includes(SONGS[songIndex])&&list.length)songIndex=SONGS.indexOf(list[0]);fp.selectedId=list.includes(SONGS[songIndex])?SONGS[songIndex].id:'random';if(fp.character==='sky')loadSkyDJ();normalizeDifficulty();fp.previewTimer=setTimeout(schedulePreview,0);}if(next==='story'&&!storyDifficulties().includes(difficulty))difficulty=1;if(!['play','loading','gameover','paused','results','result-loading','editor','mods','character','intro','cutscene','gallery'].includes(next))audio.playMenu();announce(next==='menu'?'Main menu. Story mode, Freeplay, Donate and credits, Options.':next==='freeplay'?`Freeplay. ${SONGS[songIndex].name}. ${DIFFICULTIES[difficulty]}.`:next==='story'?`Story mode. Week ${WEEKS[storyWeek].id}: ${WEEKS[storyWeek].name}. ${DIFFICULTIES[difficulty]}.`:next==='settings'?'Options. Use up and down to select, left and right to change.':next==='controls'?'Key bindings. Select a direction and press Enter to change its key.':next);}
function back(){if(scene==='cutscene'){expandedCutscenes.advance(true);return;}if(scene==='gallery'){enter('menu');return;}if(scene==='intro'){storyIntros.skip(performance.now());return;}if(rebind>=0){rebind=-1;return;}audio.sfx('cancelMenu');if(scene==='character'){characterSelect.cancel(performance.now());return;}if(scene==='album'||scene==='instrumental'){enter('freeplay',songIndex);return;}if(scene==='play'){pauseGame();return;}if(scene==='paused'){resumeGame();return;}if(scene==='gameover'){exitSong();return;}if(scene==='results'){enter(story?'story':'freeplay',story?0:songIndex);return;}if(scene==='settings'){saveSettings();enter('menu',3);return;}if(scene==='controls'||scene==='calibrate'){calibrationPlaying=false;enter('settings',OPTIONS.findIndex(o=>o.key===(scene==='controls'?'controls':'calibrate')));return;}if(scene==='credits'){enter('menu',2);return;}if(scene==='loading'){loadGeneration++;audio.stop();enter(story?'story':'freeplay');return;}if(scene==='menu'){enter('title');return;}if(scene==='title')return;enter('menu',scene==='freeplay'?1:0);}
function menuBackground(name='menuBG',tint=null){const img=assets.images[name];const scale=Math.max(1280/img.width,720/img.height)*1.1;image(name,(1280-img.width*scale)/2,(720-img.height*scale)/2,img.width*scale,img.height*scale);if(tint){ctx.save();ctx.globalCompositeOperation='multiply';rect(0,0,1280,720,tint);ctx.restore();}}
function footer(hint='ARROWS: SELECT    ENTER: CONFIRM    ESC: BACK'){text(hint,22,688,19,'#fff','left',2);newButton('back','Back',0,665,140,55,back);}
function difficultyControl(x,y){const name=DIFFICULTIES[difficulty].toUpperCase();atlasFrame('campaign_menu_UI_assets','arrow left',x,y+2,0.65);const f=assets.frame('campaign_menu_UI_assets',name);if(f)atlasFrame('campaign_menu_UI_assets',name,x+52+(190-f.width*0.7)/2,y,0.7);atlasFrame('campaign_menu_UI_assets','arrow right',x+254,y+2,0.65);newButton('difficulty-left','Previous difficulty',x-12,y-12,62,72,()=>changeDifficulty(-1));newButton('difficulty-right','Next difficulty',x+240,y-12,70,72,()=>changeDifficulty(1));}
function changeDifficulty(delta){const list=scene==='freeplay'?availableDifficulties():storyDifficulties();if(!list.length)return;difficulty=list[(Math.max(0,list.indexOf(difficulty))+delta+list.length)%list.length];audio.sfx('scrollMenu',0.6);if(scene==='freeplay')schedulePreview();announce(DIFFICULTIES[difficulty]);}

function bestFor(index=songIndex,character=fp.character,diff=difficulty){return storage.get(scoreKey(index,character,diff),null);}
function openMenuChoice(){audio.sfx('confirmMenu');const choice=selected;if(choice===0)enter('story');else if(choice===1)enter('freeplay',songIndex);else if(choice===2)enter('credits');else if(choice===3)enter('settings');else if(choice===4)openMods();else if(choice===5)openSkyGallery();}
function drawTitle(){
  rect(0,0,1280,720,'#000');const beat=(audio.menu?.currentTime||((frameTime-sceneAt)/1000))*102/60;const phase=(beat%1)*60000/102;
  const gfFrames=assets.frames('gfDanceTitle','gfDance');const gfIndex=Math.floor(beat)%2===0?[30,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14]:[15,16,17,18,19,20,21,22,23,24,25,26,27,28,29];
  assets.draw(ctx,'gfDanceTitle',gfFrames[gfIndex[Math.min(15,Math.floor(phase/1000*24))]],512,50,1);
  animation('logoBumpin','logo bumpin',-150,-100,1,settings.reducedMotion?0:phase,{loop:false});
  centerSprite('titleEnter','Press Enter to Begin',640,576,0.73,frameTime-sceneAt);
  newButton('begin','Press Enter to begin',0,0,1280,672,()=>{audio.sfx('confirmMenu');enter('menu');});
}
function drawMenu(){
  menuBackground('menuBG');const items=['story mode','freeplay','donate','options'];
  items.forEach((name,i)=>{const active=selected===i;const prefix=name+(active?' white':' basic');const f=assets.frame('FNF_main_menu_assets',prefix);const scale=active?0.93:0.85;const y=28+i*124;centerSprite('FNF_main_menu_assets',prefix,640,y,scale,settings.reducedMotion?0:frameTime-sceneAt);newButton('main-'+i,name==='donate'?'Donate and credits':name,640-(f?.width||500)*scale/2-20,y-8,(f?.width||500)*scale+40,130,()=>{selected=i;openMenuChoice();},{select:i});});
  letters('mods',640,544,0.87,{align:'center',alpha:selected===4?1:0.65});newButton('main-4','Mods',360,525,560,110,()=>{selected=4;openMods();},{select:4});
  if(skyMenu){text('SKY GALLERY',1248,603,24,selected===5?'#fff':'#fbb4f6','right');newButton('main-5','Sky Reborn gallery',965,571,305,70,()=>{selected=5;openSkyGallery();},{select:5});}
  text('WEEKS 1–7 / WEEKEND 1 / SKY REBORN',12,692,16);text('ARROWS + ENTER',1260,692,16,'#fff','right');
}
function drawStory(){const week=WEEKS[storyWeek];
 rect(0,0,1280,720,'#000');rect(0,58,1280,378,week.color||'#f9cf51');text('WEEK SCORE: '+storage.get('week:'+week.id+':'+difficulty,0),16,16,28);text(week.name,1260,16,30,'#aaa','right');
 const beat=(audio.menu?.currentTime||0)*102/60,phase=(beat%1)*588;
 if(week.storyProp)animation(week.storyProp,week.storyPrefix||'idle',110,92,0.82,settings.reducedMotion?0:phase,{loop:false});else if(week.id===5)animation('W56_storyparents','idle',100,70,0.9,settings.reducedMotion?0:phase,{loop:false});else if(week.id===6)animation('W56_storysenpai','idle',160,100,1,settings.reducedMotion?0:phase,{loop:false});else if(week.id===3)animation('STORY_PICO','idle',160,100,1,settings.reducedMotion?0:phase,{loop:false});else if(week.id===4)animation('STORY_MOM','idle',160,75,0.77,settings.reducedMotion?0:phase,{loop:false});else if(week.id===0)animation('campaign_menu_UI_characters','GF Dancing Beat WHITE',160,100,0.48,settings.reducedMotion?0:phase,{loop:false});else if(week.id===2)animation('STORY_SPOOKY','Story Spooky idle',150,90,1,settings.reducedMotion?0:phase,{loop:false});else animation('campaign_menu_UI_characters','Dad idle dance BLACK LINE',150,74,0.46,settings.reducedMotion?0:phase,{loop:false});
 if(week.storyPlayer)animation(week.storyPlayer,'idle',588,155,0.92,phase,{loop:false});else animation('campaign_menu_UI_characters','BF idle dance white',596,210,0.48,settings.reducedMotion?0:phase,{loop:false});const gf=assets.frames('campaign_menu_UI_characters','GF Dancing Beat WHITE');if(week.storyPartner)animation(week.storyPartner,'idle',928,68,0.9,phase+(Math.floor(beat)%2)*600,{loop:false});else if(week.id!==0)assets.draw(ctx,'campaign_menu_UI_characters',gf[(Math.floor(beat)%2?15:0)+Math.min(14,Math.floor(phase/1000*24))],930,110,0.48);
 if(week.titleImage)image(week.titleImage,196,458,265,94);else if(week.id===0||typeof week.id==='string')letters(week.id===0?'tutorial':week.id==='weekend1'?'weekend 1':'sky reborn',325,473,0.6,{align:'center'});else{letters('week',295,473,0.85,{align:'center'});text(String(week.id),420,474,53);}newButton('story-week','Play Week '+week.id+': '+week.name,90,448,580,115,()=>startSong(weekStart(),true));
 const trackTop=week.songs.length>3?551:573;text('TRACKS',325,trackTop,27,'#e557a3','center');week.songs.forEach((id,i)=>text(SONGS.find(s=>s.id===id).name.toUpperCase(),325,trackTop+32+i*22,23,'#e557a3','center',0));difficultyControl(850,494);
 newButton('week-prev','Previous week',0,440,90,120,()=>navigate(-1));newButton('week-next','Next week',675,440,90,120,()=>navigate(1));text('<',38,486,36);text('>',707,486,36);text('ENTER TO PLAY',996,578,23,'#aaa','center');newButton('story-play','Start Week '+week.id,810,567,375,70,()=>startSong(weekStart(),true));footer('UP / DOWN: WEEK    LEFT / RIGHT: DIFFICULTY    ENTER: START');
}

function drawFreeplay(){
  const songs=freeplaySongs().map(s=>{const choice=songChoice(SONGS.indexOf(s));return {...s,bpm:choice.bpm||s.bpm,opponent:choice.opponent||s.opponent};}),records=Object.fromEntries(SONGS.map((s,i)=>[s.id,bestFor(i)]));loadSkyAlbum(songChoice().album);const targets=modernFreeplay.draw(ctx,{time:characterOpening?frameTime-characterExitAt:frameTime-sceneAt,djAnimation:characterOpening?'characterSelect':'idle',selectedSong:fp.selectedId,difficulty,difficultyLabel:DIFFICULTIES[difficulty],records,favorites:fp.favorites,filter:fp.filter,search:fp.search,sort:fp.sort,songs,previewing:fp.previewing,reducedMotion:settings.reducedMotion,character:fp.character,album:songChoice().album});
  for(const target of targets)newButton(target.id,target.label,target.x,target.y,target.w,target.h,()=>freeplayAction(target.action,target.value));
  text(settings.keyMode+'K [6]',530,686,16,'#fff','left',0);newButton('fp-mode','Switch 4K / 6K mode',510,670,145,48,toggleKeyMode);text('TAB: CHARACTER',180,686,16,'#fff','left',0);newButton('fp-mods','Import and manage mods',390,670,120,48,openMods);text('M: MODS',392,686,16,'#fff','left',0);newButton('fp-character',`Choose character, current ${({bf:'Boyfriend',pico:'Pico',sky:'Sky'}[fp.character])}`,155,670,225,48,beginCharacterSelection);newButton('fp-instrumental',`Instrumental: ${fp.instrumental}`,15,165,310,50,()=>enter('instrumental'));
  text(`I: INST ${fp.instrumental.toUpperCase()}`,18,181,17,'#111','left',0);
  if(fp.previewing&&audio.running&&audio.time()>Math.min((audio.buffers?.[0]?.duration||80)*1000-100,fp.previewEnd))audio.start(fp.previewAt);
}
function freeplaySongs(){let list=SONGS.filter(s=>{if(s.hidden||!availableDifficulties(SONGS.indexOf(s)).length)return false;if(fp.search&&!s.name.toLowerCase().includes(fp.search.toLowerCase()))return false;if(fp.filter==='favorites')return fp.favorites.has(s.id);if(fp.filter==='numbers')return /^\d/.test(s.name);if(fp.filter==='all')return true;const [a,z]=fp.filter.split('-');const first=s.name[0].toLowerCase();return first>=a&&first<=z;});if(fp.sort==='title')list.sort((a,b)=>a.name.localeCompare(b.name));if(fp.sort==='bpm')list.sort((a,b)=>a.bpm-b.bpm);if(fp.sort==='score')list.sort((a,b)=>(bestFor(SONGS.indexOf(b))?.score||0)-(bestFor(SONGS.indexOf(a))?.score||0));return list;}
function freeplayRows(){return [{id:'random'},...freeplaySongs()];}
function selectFreeplay(id){fp.selectedId=id;const index=SONGS.findIndex(s=>s.id===id);if(index>=0){songIndex=index;normalizeDifficulty();}audio.sfx('scrollMenu',0.5);schedulePreview();announce(id==='random'?'Random song':SONGS[index]?.name||'No song');}
function stopPreview(){clearTimeout(fp.previewTimer);fp.previewGeneration++;if(fp.previewing){audio.stop();fp.previewing=false;}}
function schedulePreview(){stopPreview();if(scene==='freeplay'&&fp.selectedId!=='random')fp.previewTimer=setTimeout(()=>{if(scene==='freeplay')previewSong();},650);}
async function previewSong(){if(scene!=='freeplay'||fp.selectedId==='random')return;stopPreview();const generation=fp.previewGeneration;const index=SONGS.findIndex(s=>s.id===fp.selectedId);if(index<0)return;try{audio.stopMenu();const choice=songChoice(index);await prepareChoice(choice);if(scene!=='freeplay'||generation!==fp.previewGeneration)return;fp.previewAt=Math.min(choice.previewStart||15000,audio.buffers[0].duration*1000/3);fp.previewEnd=choice.previewEnd||45000;audio.allowVoices=true;audio.start(fp.previewAt);audio.music.gain.value=0.7;audio.voices.gain.value=0.7;fp.previewing=true;}catch(e){announce('Preview unavailable: '+e.message);}}
function playFreeplay(){const songs=freeplaySongs();if(!songs.length){announce('No songs match this filter.');return;}let index=fp.selectedId==='random'?SONGS.indexOf(songs[Math.floor(Math.random()*songs.length)]):SONGS.findIndex(s=>s.id===fp.selectedId);if(index<0)index=SONGS.indexOf(songs[0]);stopPreview();startSong(index,false);}
function toggleFavorite(){if(fp.selectedId==='random')return;fp.favorites.has(fp.selectedId)?fp.favorites.delete(fp.selectedId):fp.favorites.add(fp.selectedId);storage.set('favorites',[...fp.favorites]);audio.sfx('confirmMenu',0.45);if(!freeplaySongs().some(s=>s.id===fp.selectedId))selectFreeplay(freeplaySongs()[0]?.id||'random');announce('Favorites updated.');}
function freeplayAction(action,value){if(action==='song'){if(fp.selectedId===value)playFreeplay();else selectFreeplay(value);}if(action==='difficulty'){changeDifficulty(value);schedulePreview();}if(action==='filter'){fp.filter=value;selectFreeplay(freeplaySongs()[0]?.id||'random');}if(action==='favorite')toggleFavorite();if(action==='search')showSearch();if(action==='sort'){const values=['default','title','bpm','score'];fp.sort=values[(values.indexOf(fp.sort)+1)%values.length];audio.sfx('scrollMenu',0.4);}if(action==='preview'){if(fp.previewing){stopPreview();audio.playMenu();}else previewSong();}if(action==='album'){stopPreview();enter('album');}if(action==='back')back();}
function showSearch(){let panel=document.querySelector('#freeplay-search');if(!panel){panel=document.createElement('form');panel.id='freeplay-search';panel.innerHTML='<label for="freeplay-search-input">SEARCH SONGS</label><input id="freeplay-search-input" type="search" placeholder="Song title…" autocomplete="off"><button type="submit">Done</button><button type="button" data-clear>Clear</button>';document.querySelector('#game').append(panel);panel.addEventListener('submit',e=>{e.preventDefault();panel.hidden=true;canvas.focus();});panel.querySelector('[data-clear]').addEventListener('click',()=>{panel.querySelector('input').value='';fp.search='';selectFreeplay(freeplaySongs()[0]?.id||'random');});panel.querySelector('input').addEventListener('input',e=>{fp.search=e.target.value;selectFreeplay(freeplaySongs()[0]?.id||'random');});}panel.hidden=false;panel.querySelector('input').value=fp.search;panel.querySelector('input').focus();}
function chooseCharacter(index){fp.character=index?'pico':'bf';difficulty=1;storage.set('character',fp.character);enter('freeplay',songIndex);schedulePreview();}
function drawCharacterSelect(){const now=performance.now(),targets=characterSelect.draw(ctx,{now,volume:settings.volume,reducedMotion:settings.reducedMotion});for(const t of targets)newButton('cs-'+t.id,t.label,t.x,t.y,t.w,t.h,()=>{if(t.action==='slot')characterSelect.choose(t.value,now,true);else if(t.action==='back')characterSelect.cancel(now);else characterSelect.confirm(now);});const result=characterSelect.consumeResult();if(result){characterSelect.stop();fp.character=result.character;storage.set('character',fp.character);difficulty=1;if(!freeplaySongs().some(s=>s.id===SONGS[songIndex].id)){const first=freeplaySongs()[0];if(first)songIndex=SONGS.indexOf(first);}enter('freeplay',songIndex);}}

function instrumentalOptions(){
  const song=SONGS[songIndex],choice=songChoice();
  if(song.mod)return modLibrary.instrumentals(song);
  if(choice.source)return expandedContent.instrumentals(song.id,fp.character,choice.level);
  return variantCatalog.some(v=>v.baseSong===song.id&&v.variant==='pico')?['default','pico']:['default'];
}
function drawInstrumental(){menuBackground('menuBGBlue');rect(180,100,920,500,'#000d');letters('instrumental',640,135,1,{align:'center'});instrumentalOptions().forEach((value,i)=>{const y=260+i*75;text((selected===i?'> ':'')+value.toUpperCase(),640,y,30,selected===i?'#80e9fa':'#aaa','center');newButton('instrument-'+i,value,250,y-15,780,65,()=>{fp.instrumental=value;enter('freeplay',songIndex);},{select:i});});footer();}

function drawAlbum(){const id=songChoice().album,album=skyMenu.albums[id];menuBackground('menuBGBlue');rect(100,55,1080,580,'#000c');text(album?.name||'FRIDAY NIGHT FUNKIN OST',640,92,36,'#fff','center');text(album?.artists?.join(' / ')||'KAWAI SPRITE',640,153,21,'#ffdb5f','center');modernFreeplay.image(ctx,modernFreeplay.albumImage(id),145,240,290,290);freeplaySongs().filter(s=>songChoice(SONGS.indexOf(s)).album===id).slice(0,6).forEach((song,i)=>{text(song.name,520,228+i*58,26);text('PREVIEW / PLAY',1080,233+i*58,17,'#8ceafa','right');newButton('album-song-'+i,`Preview ${song.name}`,490,214+i*58,620,55,()=>{enter('freeplay',SONGS.indexOf(song));selectFreeplay(song.id);previewSong();});});footer();}
function optionValue(o){const v=settings[o.key];if(o.type==='mode')return v+'K';if(o.type==='touch')return v.toUpperCase();if(o.type==='toggle')return v?'ON':'OFF';if(o.key==='volume'||o.key==='sfxVolume'||o.key==='backgroundDim')return `${Math.round(v*100)}%`;if(o.key==='offset')return `${v>0?'+':''}${v} MS`;if(o.key==='scrollSpeed')return v.toFixed(1)+'X';return '>';} 
function changeOption(delta=1){const o=OPTIONS[selected];if(o.type==='mode'){toggleKeyMode();return;}if(o.type==='touch'){const list=['auto','on','off'];settings.touchLayout=list[(list.indexOf(settings.touchLayout)+delta+3)%3];}else if(o.type==='toggle')settings[o.key]=!settings[o.key];else if(o.type==='range')settings[o.key]=Math.round(clamp(settings[o.key]+o.step*delta,o.min,o.max)*100)/100;else {if(o.key==='controls')enter('controls');if(o.key==='calibrate'){calibration=[];calibrationAt=audio.ctx?.currentTime||0;calibrationPlaying=false;enter('calibrate');}if(o.key==='reset'){Object.assign(settings,normalizeSettings(DEFAULT_SETTINGS));saveSettings();announce('Default settings restored.');}return;}saveSettings();audio.sfx('scrollMenu',0.35);announce(`${o.label}: ${optionValue(o)}`);}
function drawSettings(){
  menuBackground('menuDesat','#cf8ba8');rect(0,0,1280,125,'#000b');letters('options',640,28,1.1,{align:'center'});text('UP / DOWN: SELECT    LEFT / RIGHT: CHANGE    ENTER: TOGGLE',640,109,18,'#fff','center');
  const first=clamp(selected-3,0,OPTIONS.length-7);optionScroll+=(first*67-optionScroll)*Math.min(1,(frameTime-lastFrame)*0.016);if(settings.reducedMotion)optionScroll=first*67;
  ctx.save();ctx.beginPath();ctx.rect(0,148,1280,466);ctx.clip();OPTIONS.forEach((o,i)=>{const y=155+i*67-optionScroll;if(y<85||y>630)return;const active=i===selected;if(active)rect(115,y-7,1050,62,'#0007');text((active?'> ':'  ')+o.label.toUpperCase(),150,y+6,30,active?'#fff':'#ddd');text(optionValue(o),1108,y+6,30,active?'#ffdf62':'#bbb','right');if(y>=147&&y+55<=615){newButton('option-'+i,`${o.label}: ${optionValue(o)}`,120,y-5,850,61,()=>{selected=i;changeOption(1);},{select:i});if(o.type==='range')newButton('option-minus-'+i,`Decrease ${o.label}`,985,y-5,74,61,()=>{selected=i;changeOption(-1);});newButton('option-plus-'+i,`Increase or toggle ${o.label}`,1060,y-5,100,61,()=>{selected=i;changeOption(1);});}});ctx.restore();
  rect(0,626,1280,94,'#000c');text(OPTIONS[selected].description,640,643,21,'#fff','center');text('ESC: BACK  /  SETTINGS SAVE AUTOMATICALLY',640,688,18,'#aaa','center');newButton('options-back','Back to main menu',0,675,210,45,back);
}
function keyLabel(code){return code.replace('Key','').replace('Digit','').replace('Semicolon',';').replace('Quote',"'").replace('Comma',',').replace('Period','.').replace('Slash','/').replace('BracketLeft','[').replace('BracketRight',']');}
function drawControls(){menuBackground('menuDesat','#7ba8c4');letters('controls',640,25,1.1,{align:'center'});text(settings.keyMode+'K KEY BINDINGS',640,122,25,'#fff','center');const keys=playKeys();keys.forEach((code,i)=>{const y=190+i*(settings.keyMode===6?65:86);if(selected===i)rect(250,y-7,780,61,'#0008');drawNote(i,340,y-12,0.32,'static');text(laneLabel(i),445,y+3,27);text(rebind===i?'PRESS A KEY…':keyLabel(code),930,y+3,28,rebind===i?'#ffdf62':'#fff','right');newButton('bind-'+i,'Bind '+laneLabel(i)+', currently '+keyLabel(code),250,y-7,780,61,()=>{selected=i;rebind=i;announce('Press a key. Escape cancels.');},{select:i});});footer('ESC: BACK / CANCEL       ENTER: REBIND');}

function drawCalibration(){menuBackground('menuDesat','#87bfc0');letters('calibrate',640,45,1,{align:'center'});text('TAP SPACE WITH THE BEAT',640,162,32,'#fff','center');text('Listen to at least eight beats. Enter applies the estimate.',640,217,23,'#ddd','center');const elapsed=audio.ctx?audio.ctx.currentTime-calibrationAt:0;const phase=(elapsed%0.5)/0.5;ctx.beginPath();ctx.arc(640,372,80+(calibrationPlaying?(1-phase)*18:0),0,Math.PI*2);ctx.fillStyle=calibrationPlaying&&phase<0.15?'#fff':'#e957ac';ctx.fill();text(calibrationPlaying?'TAP':'START',640,354,35,'#fff','center');if(calibration.length){const estimate=Math.round(calibration.reduce((a,b)=>a+b,0)/calibration.length);text(`${calibration.length} TAPS   /   OFFSET: ${estimate>0?'+':''}${estimate} MS`,640,522,28,'#fff','center');}newButton('tap','Tap to calibrate',490,280,300,210,calibrationTap);newButton('cal-apply','Apply calibration',390,560,500,70,applyCalibration);text('ENTER: APPLY     ESC: CANCEL',640,597,25,'#fff','center');footer('SPACE: TAP');}
function calibrationTap(){if(!calibrationPlaying){audio.menu?.pause();calibrationAt=audio.ctx.currentTime+0.5;calibrationPlaying=true;calibration=[];gameCalBeat=-1;return;}const elapsed=(audio.ctx.currentTime-calibrationAt)*1000;if(elapsed<0)return;const nearest=Math.round(elapsed/500)*500;calibration.push(clamp(Math.round(nearest-elapsed),-250,250));if(calibration.length>24)calibration.shift();}
function applyCalibration(){if(calibration.length<8){announce('Tap at least eight beats first.');return;}settings.offset=clamp(Math.round(calibration.reduce((a,b)=>a+b,0)/calibration.length/5)*5,-300,300);saveSettings();calibrationPlaying=false;enter('settings',OPTIONS.findIndex(o=>o.key==='offset'));}
let gameCalBeat=-1;
function drawCredits(){menuBackground('menuBGMagenta');rect(60,30,1160,652,'#000b');letters('friday night funkin',640,60,0.88,{align:'center'});text('THE ORIGINAL CREW',640,180,28,'#ff79b9','center');[['ninjamuffin99','Programming'],['PhantomArcade + evilsk8r','Art + animation'],['Kawai Sprite','Music']].forEach(([name,job],i)=>{text(name,640,238+i*78,32,'#fff','center');text(job,640,274+i*78,21,'#aaa','center');});text('Independent browser recreation — Tutorial and Weeks 1–6.',640,505,21,'#fff','center');text('Original art, music and charts credited to their creators.',640,539,21,'#bbb','center');text('SUPPORT THE ORIGINAL GAME',640,593,29,'#ffdc60','center');newButton('support','Support the original game on itch.io',330,575,620,68,()=>window.open('https://ninja-muffin24.itch.io/funkin','_blank','noopener,noreferrer'));footer();}

async function getChart(index,diff,character=fp.character){const choice=songChoice(index,diff,character),key=choice.chartUrl;if(!chartCache.has(key))chartCache.set(key,rawChoice(choice).then(parseChart));return chartCache.get(key);}
async function startSong(index,isStory=false,continueStory=false,override=null,entry={}){
  const generation=++loadGeneration;songIndex=index;story=isStory;const character=isStory?storyCharacter():entry.character||fp.character;normalizeDifficulty(index,character);if(!continueStory){storyTotal=0;storyStats=[];}audio.stop();audio.stopMenu();enter('loading');errorText='';announce(`Loading ${SONGS[index].name}. ${DIFFICULTIES[difficulty]}.`);
  try{await audio.unlock();let choice=songChoice(index,difficulty,character,isStory?'default':fp.instrumental);if(override?.raw){const raw=override.raw.song;choice={...choice,character:playerIdentity(raw.player1||choice.character),opponent:raw.player2||choice.opponent,stage:raw.stage||choice.stage,characters:{...choice.characters,player:raw.player1||choice.characters?.player,opponent:raw.player2||choice.characters?.opponent,girlfriend:raw.gfVersion??raw.player3??choice.characters?.girlfriend}};choice.visualOverrides={characters:choice.characters,stage:choice.stage};choice.noteTexture=raw.noteTexture;}let [chart,originalDuration,modVisuals]=await Promise.all([override?Promise.resolve(parseChart(override.raw)):getChart(index,difficulty,character),prepareChoice(choice),choice.mod?modLibrary.getVisuals(choice,assets):Promise.resolve(null),audio.warmEffects(),prepareSceneAssets(choice)]);if(generation!==loadGeneration)return;
    if(override?.audio){for(const i of [0,1])if(override.audio[i])audio.buffers[i]=override.audio[i];if(override.audio[1])audio.buffers.length=2;}audio.allowVoices=override?.raw?.song?.needsVoices!==false;const extraOffset=Number(override?.raw?.song?.offset)||0;if(extraOffset)audio.trackOffsets=audio.trackOffsets.map(offset=>offset+extraOffset);const duration=originalDuration+extraOffset;
    if(settings.keyMode===6)chart=chartForSixKeys(chart);const notes=chart.notes.map(n=>({...n,hit:false,missed:false,holdDone:0,holdBroken:false,started:false}));game={chart,notes,duration,modVisuals,speakerIndex:0,laneCount:chart.laneCount||4,eventIndex:0,eventFocus:null,eventZoom:1,eventScroll:1,eventBop:{},lastLightning:-30,lightningAt:-99999,lightningDelay:8,stats:{...makeStats(),totalNotes:notes.filter(n=>n.player).length},opponentIndex:0,scanIndex:0,startTime:-60000/chart.bpm*5,time:-60000/chart.bpm*5,beat:-6,lastBeat:-6,rating:null,particles:[],completed:false,chartPlayer:chart.sections[0]?.player||false,practice:settings.practice,botplay:settings.botplay,custom:!!override,override,choice,character:choice.character,frameTimes:[]};
    const captionFile=songCaptions(choice);
    if(captionFile){const current=game;expandedCaptions(captionFile).then(cues=>{if(game===current)game.captions=cues;}).catch(()=>{});}
    if(choice.charts?.picospeaker){
      const shots=await expandedJSON(choice.charts.picospeaker);
      if(generation!==loadGeneration)return;
      game.speakerNotes=shots.song.modernNotes.slice().sort((a,b)=>a.t-b.t);
    }
    actorBF={direction:'idle',since:0,until:0};actorDad={direction:'idle',since:0,until:0};actorGF={direction:'idle',since:0,until:0};held.clear();laneFlashes.fill(0);opponentFlashes.fill(0);lastCountdown=-99;const context={story:isStory,retry:entry.retry,editor:!!override,character:choice.character,variant:choice.variant};const extra=expandedIntro(choice,context);if(extra&&!extra.endsWith('-sky')){if(!await runExpandedSequence(extra)||generation!==loadGeneration)return;}const stageIntro=!entry.retry&&!override&&expandedStageIntro(choice,isStory);if(stageIntro&&(!await runExpandedSequence(stageIntro)||generation!==loadGeneration))return;for(const actor of [actorBF,actorDad,actorGF])actor.forced=null;game.beat=-6;const intro=extra?.endsWith('-sky')?extra:songIntro(SONGS[index].id,{story:isStory,retry:entry.retry,editor:!!override,character:choice.character,variant:choice.variant});if(intro){const complete=await runStorySequence(intro);if(!complete||generation!==loadGeneration)return;if(intro==='winter-horrorland')game.hudFadeAt=performance.now();}enter('play');audio.start(game.startTime);announce(`${SONGS[index].name}. ${DIFFICULTIES[difficulty]}. Get ready.`);
  }catch(e){if(generation!==loadGeneration)return;errorText=e.message;announce('Loading failed. '+e.message);console.error(e);}
}
async function openChartEditor(){
  if(scene==='editor'||scene==='loading')return;if(scene==='play')audio.pause();audio.stop();audio.stopMenu();loadGeneration++;const index=scene==='freeplay'?songIndex:songIndex;
  if(!chartEditor)chartEditor=new ChartEditor({audio,assets,onExit:()=>{game=null;enter('freeplay',songIndex);},onTest:(raw,index,diff,customAudio)=>{difficulty=diff;startSong(index,false,false,{raw,audio:customAudio});},loadOriginal:getChart,prepareAudio:(index,diff)=>prepareChoice(songChoice(index,diff))});
  chartEditor.getLevels=()=>availableDifficulties(index).map(index=>({index,name:DIFFICULTIES[index]}));const keep=game?.custom&&chartEditor.index===index&&chartEditor.diff===difficulty;enter('editor');announce('Chart editor. Space plays audio, Enter tests the chart, 7 returns to freeplay.');
  try{const raw=await rawChoice(songChoice(index));chartEditor.character=fp.character;await chartEditor.open(index,difficulty,raw,{keep});}catch(e){errorText=e.message;enter('freeplay',index);announce('Could not open editor: '+e.message);}
}
function pauseGame(){if(scene!=='play'||!game)return;audio.pause();enter('paused');audio.sfx('scrollMenu',0.5);announce('Paused. Resume, Restart Song, or Exit to Menu.');}
function resumeGame(){if(scene!=='paused'||!game)return;enter('play');audio.resume();}
function exitSong(){loadGeneration++;audio.stop();audio.stopMenu();game=null;enter(story?'story':'freeplay',story?0:songIndex);}
function retrySong(){if(game?.retryAt)return;if(game?.choice.baseSong==='sky'&&game.choice.variant==='erect'&&Math.random()<.08){launchSkySecret();return;}const override=game?.override,death=deathConfig();audio.stopMenu();if(scene==='gameover'&&death.pixel){game.retryAt=frameTime;const generation=loadGeneration;audio.playMenu(death.pixel.confirmMusic.split('/').at(-1).replace(/\.ogg$/,''));setTimeout(()=>{if(scene==='gameover'&&generation===loadGeneration)startSong(songIndex,story,story,override,{retry:true});},1000);return;}startSong(songIndex,story,story,override,{retry:true});}
function animateActor(actor,lane,time,miss=false){if(actor.forced?.lock&&time<actor.forced.until)return;if(actor.forced&&!actor.forced.lock)actor.forced=null;actor.direction=DIRECTIONS[laneDirection(lane)]+(miss?'miss':'');actor.since=time;actor.until=time+Math.max(150,60000/(game?.chart.bpm||100)*0.65);}
function animateNote(actor,note,time,miss=false){if(String(note.kind).toLowerCase()==='noanim'||actor.forced?.lock&&time<actor.forced.until)return;animateActor(actor,note.lane,time,miss);if(!miss&&(String(note.kind).toLowerCase()==='skyaltnote'||String(note.kind).toLowerCase()==='mom'||note.altAnim))actor.direction+='-alt';else if(!miss&&String(note.kind).toLowerCase()==='censor')actor.direction+='-censor';}
function laneHeld(lane){const keys=playKeys(),arrow=['ArrowLeft','ArrowDown','ArrowUp','ArrowRight'][laneDirection(lane)];return held.has(keys[lane])||laneCount()===4&&held.has(arrow)||held.has('touch'+lane);}

function laneFromCode(code){const bound=playKeys().indexOf(code);if(bound>=0)return bound;const direction=['ArrowLeft','ArrowDown','ArrowUp','ArrowRight'].indexOf(code);return direction<0?-1:settings.keyMode===6?SIX_DIRECTIONS.indexOf(direction):direction;}

function noteSpecial(note,actor,time){if(note.kind)expandedNote(game,note,time,{player:actorBF,opponent:actorDad},(sound,gain)=>audio.sfx(sound,gain));if(/^(hey!?|cheer)$/i.test(String(note.kind||'')))actor.forced={name:String(note.kind).toLowerCase().startsWith('hey')?'hey':'cheer',since:time,until:time+60000/bpmAt(game.chart,time),lock:true};}
function hit(note,time,auto=false){note.hit=true;note.started=true;const delta=time-note.time;const j=applyHit(game.stats,delta);if(!j)return;laneFlashes[note.lane]=frameTime+145;animateNote(actorBF,note,time);noteSpecial(note,actorBF,time);audio.muteVoices(false);game.rating={name:j.name,since:frameTime,combo:game.stats.combo,delta};if(j.name==='sick'&&!settings.reducedMotion){for(let i=0;i<7;i++)game.particles.push({x:laneX(note.lane,true)+55,y:receptorY()+55,vx:(Math.random()-0.5)*220,vy:(Math.random()-0.5)*220,life:0.35,color:COLORS[laneDirection(note.lane)]});}}
function miss(note,time){if(note?.missed)return;if(note)note.missed=true;applyMiss(game.stats);audio.muteVoices(true);game.rating={name:'miss',since:frameTime,combo:0,delta:0};if(note){animateNote(actorBF,note,time,true);if(note.kind)expandedNote(game,note,time,{player:actorBF,opponent:actorDad},(sound,gain)=>audio.sfx(sound,gain),true);}audio.sfx('missnote'+(1+Math.floor(Math.random()*3)),0.12);}
function pressLane(lane){if(scene!=='play'||!game)return;const time=audio.time()+settings.offset;if(time<-HIT_WINDOW)return;laneFlashes[lane]=frameTime+80;if(game.botplay)return;const note=nearestNote(game.notes,lane,time);if(note)hit(note,time);else if(!settings.ghostTapping&&time>0)miss(null,time);}
function updateSongEvents(time){updateChartEvents(game,time,{bpm:bpmAt(game.chart,time),animate:(target,name,since,lock)=>{const role=['bf','boyfriend','player'].includes(target)?'player':['gf','girlfriend','partner'].includes(target)?'girlfriend':['dad','opponent'].includes(target)?'opponent':null;if(!role){game.propAnimations??={};game.propAnimations[target]={name,since,until:since+1500};return;}const actor=role==='player'?actorBF:role==='opponent'?actorDad:actorGF;actor.forced={name,prefix:name,since,until:since+1200,lock};audio.muteVoices(false);}});nativeContent.updateStage(game,time);}
function updateGame(dt){
  if(!game)return;const time=game.time=audio.time()+settings.offset;const beat=beatAt(game.chart,time);game.beat=beat;updateSongEvents(time);
  const count=Math.floor(time/(60000/game.chart.bpm));if(time<0&&count!==lastCountdown){lastCountdown=count;const sound={[-4]:'intro3',[-3]:'intro2',[-2]:'intro1',[-1]:'introGo'}[count];if(sound)audio.sfx(pixelStage(game.choice)?pixelUI.countdownSound(count)||sound:sound,0.7);}
  while(game.speakerNotes?.[game.speakerIndex]?.t<=time){
    const shot=game.speakerNotes[game.speakerIndex++],lane=shot.d%4;
    actorGF.forced={name:'shoot'+(lane+1),since:shot.t,until:shot.t+260,lock:true};
    game.lastShot={time:shot.t,lane};
  }
  const currentBeat=Math.floor(beat);if(currentBeat!==game.lastBeat){
    if(game.choice.baseSong==='sky')game.eventBop.girlfriend??=2;
    if(game.choice.baseSong==='blazin'&&currentBeat>=10&&currentBeat%19===0&&!settings.reducedMotion){game.lastStrike=time;audio.sfx('W7W1_Lightning'+(1+currentBeat%3),.37);}game.lastBeat=currentBeat;if(!settings.reducedMotion&&currentBeat>=0&&game.bopRate!==0&&(currentBeat-(game.bopOffset||0))%(game.bopRate||4)===0)game.cameraBump=0.013*(game.bopIntensity??1);if(actorBF.until<time)actorBF.direction='idle';if(actorDad.until<time)actorDad.direction='idle';}
  if(SONGS[songIndex].week===2&&Math.floor(beat)!==game.lightningBeat){game.lightningBeat=Math.floor(beat);if((SONGS[songIndex].id==='spookeez'&&Math.floor(beat)===4)||(beat>game.lastLightning+game.lightningDelay&&Math.random()<0.1)){game.lightningAt=time;game.lastLightning=beat;game.lightningDelay=8+Math.random()*16;if(Math.floor(beat)!==4)audio.sfx(Math.random()<0.5?'thunder_1':'thunder_2',0.7);}}
  game.cameraBump=Math.max(0,(game.cameraBump||0)-dt*0.045);
  const section=game.chart.sections.find(s=>time>=s.start&&time<s.end);if(section)game.chartPlayer=section.player;
  const notes=game.notes;for(let i=game.scanIndex;i<notes.length;i++){const n=notes[i];if(n.time>time+HIT_WINDOW)break;
    if(!n.player){if(!n.hit&&n.time<=time){n.hit=true;opponentFlashes[n.lane]=frameTime+160;animateNote(actorDad,n,time);noteSpecial(n,actorDad,time);actorDad.until=Math.max(actorDad.until,n.time+n.length);if(!game.choice.audioRoles)audio.muteVoices(false);}continue;}
    if(!n.hit&&!n.missed){if(game.botplay&&n.time<=time)hit(n,n.time,true);else if(time-n.time>HIT_WINDOW)miss(n,time);}
    if(n.hit&&n.length>0&&!n.holdBroken){const elapsed=clamp(time-n.time,0,n.length);const tick=60000/game.chart.bpm/4;const covered=Math.floor(elapsed/tick);if(time>n.time+80&&time<n.time+n.length-40&&!laneHeld(n.lane)&&!game.botplay){n.holdBroken=true;missHold(n,time);}else if(covered>n.holdDone&&(laneHeld(n.lane)||game.botplay)){game.stats.score+=(covered-n.holdDone)*10;game.stats.holdTicks+=covered-n.holdDone;game.stats.health=clamp(game.stats.health+(covered-n.holdDone)*0.004,0,2);n.holdDone=covered;laneFlashes[n.lane]=frameTime+80;animateNote(actorBF,n,time);}}
  }
  while(game.scanIndex<notes.length&&notes[game.scanIndex].time+notes[game.scanIndex].length<time-300)game.scanIndex++;
  for(const p of game.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}game.particles=game.particles.filter(p=>p.life>0);
  if(game.stats.health<=0&&!game.practice&&!game.botplay){gameOver();return;}
  if(audio.time()>=game.duration-35&&!game.completed)finishSong();
}
function missHold(note,time){applyMiss(game.stats);audio.muteVoices(true);game.rating={name:'miss',since:frameTime,combo:0,delta:0};}
async function runStorySequence(id){const generation=loadGeneration,current=game;if(scene!=='loading')enter('loading');await storyIntros.load(id);if(generation!==loadGeneration||current!==game)return false;storyIntros.begin(id,{now:performance.now(),volume:settings.volume,reducedMotion:settings.reducedMotion,story,character:game.character,variation:game.choice.variant||'',charting:game.custom,cameraStart:[850,500],cameraStartZoom:.8});if(storyIntros.done)return true;introAnnouncement='';enter('intro');return new Promise(resolve=>introWaiter={resolve,generation,current});}
function drawStorySequence(){storyIntros.update(frameTime);const elapsed=frameTime-sceneAt,stageTime=Math.max(0,game.time)+elapsed;game.beat=beatAt(game.chart,stageTime);ctx.save();const focus=storyIntros.cameraFocus;if(focus){const stage=nativeContent.stage(game.choice),worldScale=stage?.view?.scale??.8,ox=stage?.view?.x??40,oy=stage?.view?.y??-70;ctx.translate(640,360);ctx.scale(storyIntros.cameraZoom/worldScale,storyIntros.cameraZoom/worldScale);ctx.translate(-(ox+worldScale*focus[0]),-(oy+worldScale*focus[1]));}drawStage(stageTime);ctx.restore();const targets=storyIntros.draw(ctx,{now:frameTime,volume:settings.volume});for(const target of targets)newButton(target.id,target.label,target.x,target.y,target.w,target.h,()=>storyIntros[target.action](performance.now()));const shown=storyIntros.phase==='dialogue'?storyIntros.currentText(frameTime):'';canvas.dataset.dialogue=shown;canvas.dataset.dialogueLine=String(storyIntros.pageIndex??0);canvas.dataset.introPhase=storyIntros.phase;if(storyIntros.phase==='dialogue'){const full=storyIntros.page?.text||'';if(full!==introAnnouncement){introAnnouncement=full;announce(full);}}if(storyIntros.done&&introWaiter){const waiting=introWaiter;introWaiter=null;waiting.resolve(waiting.generation===loadGeneration&&waiting.current===game);}}
function deathConfig(){const id=game?.choice.characters?.player,character=nativeContent.character(id,true),pixel=nativeContent.data.uiPixelGameover?.[id],first=character?.animationMap?.firstDeath;return{id,character,pixel,duration:first?(first.frameIndices?.length||first.frameCount||24)/(first.fps||24)*1000:game?.character==='pico'?2000:1200};}
function gameOver(){audio.stop();const death=deathConfig();const specific=death.id==='pico-blazin'?'W7W1_fnf_loss_sfx-pico-gutpunch':death.id==='pico-holding-nene'?'W7W1_fnf_loss_sfx-pico-and-nene':null;audio.sfx(specific||(death.pixel?death.pixel.lossSound.split('/').at(-1).replace(/\.ogg$/,''):'fnf_loss_sfx'));enter('gameover');setTimeout(()=>{if(scene==='gameover'&&!game.retryAt)audio.playMenu(death.pixel?death.pixel.loopMusic.split('/').at(-1).replace(/\.ogg$/,''):'gameOver');},death.pixel?death.duration:1200);announce('Game over. Enter to retry. Escape for menu.');}
async function finishSong(){
  game.completed=true;audio.stop();const finishedGame=game,generation=loadGeneration,extra=game.custom?null:expandedOutro(game.choice,story);if(extra&&(!await runExpandedSequence(extra)||finishedGame!==game||generation!==loadGeneration))return;const outro=game.custom?null:songOutro(SONGS[songIndex].id,{story,variant:game.choice.variant});if(outro){try{const complete=await runStorySequence(outro);if(!complete||finishedGame!==game||generation!==loadGeneration)return;}catch(error){console.error(error);announce('Cutscene could not load: '+error.message);}}const s=game.stats;const legitimate=!game.practice&&!game.botplay&&!game.custom;
  if(legitimate){const old=bestFor(songIndex,game.character,difficulty);if(!old||s.score>old.score){game.newHighscore=true;storage.set(scoreKey(songIndex,game.character,difficulty),{score:s.score,accuracy:accuracy(s),rank:rank(s),misses:s.misses});}}
  if(story){storyTotal+=s.score;storyStats.push(structuredClone(s));const list=WEEKS[storyWeek].songs,i=list.indexOf(SONGS[songIndex].id);if(i<list.length-1){startSong(SONGS.findIndex(s=>s.id===list[i+1]),true,true);return;}if(legitimate&&storyTotal>storage.get('week:'+WEEKS[storyWeek].id+':'+difficulty,0))storage.set('week:'+WEEKS[storyWeek].id+':'+difficulty,storyTotal);}
  const resultStats=story?combinedStats():game.stats;resultStats.score=story?storyTotal:game.stats.score;enter('result-loading');try{await nativeResults.prepare(resultStats,{character:game.character});if(scene!=='result-loading')return;nativeResults.begin({stats:resultStats,title:story?WEEKS[storyWeek].name:SONGS[songIndex].name,difficulty:DIFFICULTIES[difficulty],character:game.character,isNewHighscore:!!game.newHighscore,practice:game.practice,autoplay:game.botplay,volume:settings.volume,reducedMotion:settings.reducedMotion});}catch(error){console.error(error);announce('Results artwork could not load: '+error.message);}enter('results');announce(`${story?'Week '+WEEKS[storyWeek].id:SONGS[songIndex].name} complete. Score ${story?storyTotal:s.score}. Accuracy ${accuracy(s).toFixed(2)} percent.`);
}
function laneX(lane,player){const count=laneCount();if(mobileActive())return player?lane*1280/count+(1280/count-112)/2:22+lane*38;if(settings.middlescroll||game?.choice.baseSong==='blazin')return player?(1280-count*112)/2+lane*112:-600;const spacing=count===6?88:112;return (player?(count===6?696:732):(count===6?40:92))+lane*spacing;}

function receptorY(){return mobileActive()||settings.downscroll?565:50;}

function gameplayNoteAtlas(){const name=game?.choice?.noteTexture;return name&&assets.images[name]&&assets.atlases[name]?name:'NOTE_assets';}
function drawNote(lane,x,y,scale=0.7,state='note',time=0,alpha=1){lane=laneDirection(lane);if(game&&pixelStage(game.choice)&&pixelUI.note(ctx,lane,x,y,scale,state,time,alpha,viewAspect()))return;let prefix=NOTE_PREFIX[lane];if(state==='static')prefix='arrow'+DIRECTIONS[lane];if(state==='press')prefix=DIRECTIONS[lane].toLowerCase()+' press';if(state==='confirm')prefix=DIRECTIONS[lane].toLowerCase()+' confirm';const atlas=gameplayNoteAtlas(),f=assets.frames(atlas,prefix);if(!f.length)return;const frame=f[state==='confirm'?clamp(Math.floor(time/1000*24),0,f.length-1):0];const fw=(frame.frameWidth||frame.width)*scale,fh=(frame.frameHeight||frame.height)*scale;ctx.save();ctx.translate(x+56,y+56);ctx.scale(1,viewAspect());assets.draw(ctx,atlas,frame,-fw/2,-fh/2,scale,alpha);ctx.restore();}
function drawHold(lane,x,start,end,alpha,scale=0.7){lane=laneDirection(lane);if(pixelStage(game?.choice)&&pixelUI.hold(ctx,lane,x,start,end,alpha,scale,viewAspect()))return;
  const atlas=gameplayNoteAtlas(),names=['purple','blue','green','red'],body=assets.frame(atlas,names[lane]+' hold piece'),tip=assets.frame(atlas,lane===0?'pruple end hold':names[lane]+' hold end');if(!body||!tip)return;
  const direction=end>=start?1:-1,length=Math.abs(end-start),img=assets.images[atlas],width=body.width*scale,cap=Math.min(tip.height*scale*viewAspect(),length);
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,start);ctx.scale(1,direction);if(length>cap)ctx.drawImage(img,body.x,body.y,body.width,body.height,-width/2,0,width,length-cap);ctx.drawImage(img,tip.x,tip.y,tip.width,tip.height,-width/2,length-cap,width,cap);ctx.restore();
}
function icon(character,x,y,scale=0.65,losing=false,flip=false,options={}){const id=String(character).split('-')[0],native=assets.images[nativeContent.data.iconAssets?.[character]]||assets.images['HEALTH_'+character]||assets.images['HEALTH_'+id],img=native||assets.images.iconGrid,index=(character==='dad'?12:character==='spooky'?2:character==='monster'?19:character==='pico'?4:0)+(losing?1:0),size=native?img.height:150,sx=native?Math.min(losing?size:0,img.width-size):(index%10)*150,sy=native?0:Math.floor(index/10)*150;scale*=(options?.scale??1)*(native?150/size:1);x+=options?.offsetX||0;y+=options?.offsetY||0;flip=flip!==!!options?.flipX;ctx.save();if(native&&size<100)ctx.imageSmoothingEnabled=false;if(flip){ctx.translate(x+size*scale,y);ctx.scale(-1,1);ctx.drawImage(img,sx,sy,size,size,0,0,size*scale,size*scale);}else ctx.drawImage(img,sx,sy,size,size,x,y,size*scale,size*scale);ctx.restore();}
function drawActor(name,actor,x,y,scale,time){const dims=name==='PICO'?[500,500]:name==='BOYFRIEND'?[412,412]:name.startsWith('SPOOKY')?[492,549]:name==='MONSTER'?[426,637]:[426,767];ctx.save();ctx.translate(x+dims[0]*scale/2,y+dims[1]*scale);ctx.scale(1,viewAspect());drawActorRaw(name,actor,-dims[0]*scale/2,-dims[1]*scale,scale,time);ctx.restore();}
function drawActorRaw(name,actor,x,y,scale,time){const bf=name==='BOYFRIEND',idle=actor.direction==='idle'||time>actor.until,direction=idle?'idle':actor.direction;
 const prefix=name==='PICO'?(idle?'Pico idle':'Pico '+direction.replace('miss','')+(direction.endsWith('miss')?'miss':'0')):name.startsWith('SPOOKY')?(idle?'Spooky idle':'Spooky '+direction.replace('miss','')):name==='MONSTER'?(idle?'Monster idle0':'Monster '+direction.replace('miss','')+'0'):bf?(idle?'BF idle dance':'BF NOTE '+direction.replace('miss','')+(direction.endsWith('miss')?' MISS':'0')):(idle?'Dad idle dance':'Dad Sing Note '+direction);
 const offsets=name==='PICO'?[19,1]:name.startsWith('SPOOKY')||name==='MONSTER'?[0,0]:(bf?BF_OFFSETS:DAD_OFFSETS)[direction.replace('miss','')]||[0,0],bpm=bpmAt(game.chart,time),period=game.eventBop[bf||name==='PICO'?'player':'opponent']??dancePeriod(bpm),phase=idle?period===0?0:((game.beat%period+period)%period)*60000/bpm:Math.max(0,time-actor.since);
 if(actor.forced&&time<actor.forced.until){const semantic=actor.forced.name||actor.forced.prefix,map=name==='PICO'?{hey:'Pico HEY',cheer:'Pico HEY'}:name.startsWith('SPOOKY')?{hey:'Spooky cheer',cheer:'Spooky cheer'}:bf?{hey:'BF HEY!!',cheer:'BF HEY!!'}:{},special=map[semantic]||semantic;if(assets.frames(name,special).length){animation(name,special,x,y,scale,time-actor.forced.since,{loop:false});return;}}
 if(bf&&time-game.lightningAt>=0&&time-game.lightningAt<550){animation('BF_FEAR','BF scared',x,y,scale,time-game.lightningAt,{loop:false});return;}
 animation(name,prefix,x-offsets[0]*scale,y-offsets[1]*scale,scale,settings.reducedMotion&&idle?0:phase,{loop:false});
}

function drawSceneCharacter(role,actor,position,time,stageScale=null){ctx.save();ctx.translate(position[0],position[1]);ctx.scale(1,viewAspect());const drawn=drawSceneCharacterRaw(role,actor,[0,0],time,stageScale);ctx.restore();return drawn;}
function drawSceneCharacterRaw(role,actor,position,time,stageScale=null){const declared=game.choice.characters?.[role],id=role==='girlfriend'&&(!declared&&game.choice.opponent==='gf'||declared==='none')?'none':declared||(role==='player'?game.character==='pico'?'pico-playable':'bf':role==='girlfriend'?game.character==='pico'?'nene':'gf':game.choice.opponent||'dad');if(!id||id==='none')return role==='girlfriend';actor=actor||(role==='girlfriend'?actorGF:null);const config=game.modVisuals?.characters[role],bpm=bpmAt(game.chart,time),period=game.eventBop[role]??(role==='girlfriend'?1:dancePeriod(bpm)),idle=!actor||actor.direction==='idle'||time>actor.until,forced=actor?.forced&&time<actor.forced.until?actor.forced:null;
 if(config){drawModCharacter(ctx,assets,config,{x:position[0],y:position[1],scale:role==='girlfriend'?0.62:0.65,direction:idle?'idle':actor.direction,animation:forced?.name,time:forced?time-forced.since:idle?period===0?0:((game.beat%period+period)%period)*60000/bpm:time-actor.since,beat:game.beat,bopBeats:period,player:role==='player'});return true;}
 const options={x:position[0],y:position[1],scale:stageScale??(role==='girlfriend'?0.62:role==='player'?0.66:0.7),time,beat:game.beat,bpm,period,player:role==='player',suffix:game.animationSuffix?.[role],...role==='girlfriend'?nativeContent.partnerOverride(game,time,id):{}};
 if(id==='nene-pixel'&&role==='girlfriend')pixelUI.abot(ctx,id,position,{scale:0.62,time,beat:game.beat,bpm,focusPlayer:game.eventFocus??game.chartPlayer});
 if(id==='nene-christmas'&&role==='girlfriend'){const c=nativeContent.character(id),size=c.logicalIdleSize,g=c.globalOffsets||[0,0],s=0.62,left=position[0]-size[0]*s/2+g[0]*s,top=position[1]-size[1]*s+g[1]*s;drawABot(ctx,assets,audio,{bodyX:left-95*s,bodyY:top+384*s,scale:s,time});}
 if(id==='nene'&&role==='girlfriend'){const neneX=position[0]-195.3,neneY=position[1]-405.5;drawABot(ctx,assets,audio,{neneX,neneY,scale:0.62,time});}
 if(['otis-speaker','nene-tankmen'].includes(id)){
   const c=nativeContent.character(id),s=options.scale,size=c?.logicalIdleSize||[500,400],g=c?.globalOffsets||[0,0];
   if(id==='otis-speaker')drawABot(ctx,assets,audio,{bodyX:position[0]-size[0]*s/2+(170+g[0])*s,bodyY:position[1]-size[1]*s+(455+g[1])*s,scale:s,time});
   else drawABot(ctx,assets,audio,{neneX:position[0]-size[0]*s/2+g[0]*s,neneY:position[1]-size[1]*s+g[1]*s,scale:s,time});
 }
 const nativeId=id==='bf'?'bf':id==='pico-playable'||id==='pico'?'pico':id==='gf'||id==='gf-dark'?'gf':id==='nene'?'nene':!nativeContent.character(id,role==='player')&&role==='player'?(game.character==='pico'?'pico':'bf'):!nativeContent.character(id)&&role==='girlfriend'?'gf':null;
 if(nativeId&&nativeExtras.packs.characters&&!(forced&&nativeContent.character(id,role==='player')?.animationMap?.[forced.name]&&!nativeExtras.hasCharacterAnimation(nativeId,forced.name))){let name=forced?.name||(!idle?'sing'+actor.direction:nativeExtras.hasCharacterAnimation(nativeId,'idle')?'idle':Math.floor(Math.max(0,game.beat)/Math.max(period,0.000001))%2?'danceRight':'danceLeft');if((nativeId==='bf'||nativeId==='gf')&&time-game.lightningAt>=0&&time-game.lightningAt<550)name='scared';if(period===0&&idle)name=nativeExtras.hasCharacterAnimation(nativeId,'idle')?'idle':'danceLeft';if(role==='opponent'&&nativeId==='pico')name=name.replace('LEFT','temporary').replace('RIGHT','LEFT').replace('temporary','RIGHT');const phase=name==='scared'&&time-game.lightningAt<550?time-game.lightningAt:forced?time-forced.since:idle?period===0?0:((game.beat%period+period)%period)*60000/bpm:time-actor.since;ctx.save();if(id==='gf-dark')ctx.filter='brightness(0.25)';const drawn=nativeExtras.drawCharacter(ctx,nativeId,name,{x:position[0],y:position[1],scale:role==='girlfriend'?0.62:role==='player'?0.66:0.7,time:phase,beat:game.beat,bpm,period,player:role==='player'});ctx.restore();if(drawn)return true;}
 return nativeContent.drawCharacter(ctx,id,actor,options);
}
function drawExpandedStage(time){rect(0,0,1280,720,game.choice.stage==='tankmanBattlefield'?'#ec9a03':'#19131b');const stage=nativeContent.stage(game.choice),fight=game.choice.baseSong==='blazin',scale=stage.view?.scale??0.8,originX=stage.view?.x??40,originY=stage.view?.y??-70,bump=scene==='intro'?1:(game.eventZoom||1)+(game.cameraBump||0),pan=scene==='intro'?0:settings.reducedMotion?0:(game.cameraX=(game.cameraX||0)+(((game.eventFocusRole==='girlfriend'?0:game.eventFocus??game.chartPlayer?18:-18)+(game.eventFocusX||0)*0.12)-(game.cameraX||0))*0.05);ctx.save();if(pixelStage(game.choice))ctx.imageSmoothingEnabled=false;ctx.translate(640,360);ctx.scale(bump,bump);ctx.translate(-640,-360);const layers=stage.props.map(prop=>({z:prop.zIndex||0,prop}));for(const [role,key] of [['girlfriend','gf'],['opponent','dad'],['player','bf']]){const meta=stage.characters[key];if(meta)layers.push({z:fight&&role===game.fightLead?3500:meta.zIndex||0,role,actorScale:meta.scale?scale*meta.scale:null,position:[originX+meta.position[0]*scale-pan,originY+meta.position[1]*scale]});}layers.sort((a,b)=>a.z-b.z);for(const layer of layers){if(scene==='intro'&&(layer.role&&storyIntros.hideActors?.includes(layer.role)||layer.prop&&storyIntros.hideProps?.includes(layer.prop.name)))continue;if(layer.prop)nativeContent.drawProp(ctx,layer.prop,game,{time,pan,worldScale:scale,originX,originY});else if(!drawSceneCharacter(layer.role,layer.role==='player'?actorBF:layer.role==='opponent'?actorDad:actorGF,layer.position,time,layer.actorScale)){if(layer.role==='player'){const pico=game.character==='pico',s=pico?0.64:0.66;drawActor(pico?'PICO':'BOYFRIEND',actorBF,layer.position[0]-(pico?500:412)*s/2,layer.position[1]-(pico?500:412)*s,s,time);}}}ctx.restore();if(settings.backgroundDim)rect(0,0,1280,720,'rgba(0,0,0,'+settings.backgroundDim+')');}
async function prepareSceneAssets(choice){const week=SONGS[songIndex].week,modern=choice.variant==='erect'||choice.character==='pico'||choice.stage?.endsWith('Erect'),needed=new Set([...nativeContent.required(choice),...pixelUI.required(choice)]);if(choice.baseSong==='2hot'&&choice.variant!=='sky')for(const name of ['W7W1_FX_SPRAYCAN','W7W1_FX_SPRAYPAINTEXPLOSION'])needed.add(name);if(choice.noteTexture&&assets.atlases[choice.noteTexture])needed.add(choice.noteTexture);for(const name of [choice.character==='pico'?'PICO':'BOYFRIEND','BF_FEAR','DADDY_DEAREST','GF_FEAR'])needed.add(name);if((choice.character==='pico'||['nene-tankmen','otis-speaker'].includes(choice.characters?.girlfriend))&&!pixelStage(choice))for(const name of ['ABOT','ABOT_SCREEN','ABOT_VIZ'])needed.add(name);if(week===2||choice.stage?.startsWith('spooky')){if(modern)needed.add('GF_DARK');for(const name of modern?['SPOOKY_DARK','MONSTER','week2-bgDark','week2-bgLight','week2-stairsDark','week2-stairsLight','WEEK2_TREES']:['SPOOKY','MONSTER','HALLOWEEN'])needed.add(name);}else if(!nativeContent.stage(choice)&&!modern)for(const name of ['stageback','stagefront','stagecurtains'])needed.add(name);for(const name of ['GF_EXTENDED','NENE_EXTENDED'])needed.delete(name);if(choice.character!=='pico')needed.delete('PICO');assets.releaseUnused(needed);await Promise.all([assets.ensure([...needed]),nativeExtras.load('characters'),modern&&week!==2&&!nativeContent.stage(choice)?nativeExtras.load('erectStage'):Promise.resolve()]);if(pixelStage(choice))await Promise.all([...pixelUI.sounds(),...(Object.values(nativeContent.data.uiPixelGameover||{}).map(v=>v.lossSound.split('/').at(-1).replace(/\.ogg$/,'')))].map(name=>audio.load(''+name+'.ogg').catch(()=>null)));if(choice.stage?.startsWith('philly')||choice.stage?.startsWith('limo'))await Promise.all(['train_passes','carPass0','carPass1'].map(name=>audio.load(''+name+'.ogg').catch(()=>null)));}
function drawStage(time){if(nativeContent.stage(game.choice)){drawExpandedStage(time);return;}
 rect(0,0,1280,720,'#19131b');ctx.save();const bump=(game.eventZoom||1)+(game.cameraBump||0);ctx.translate(640,360);ctx.scale(bump,bump);ctx.translate(-640,-360);
 const follow=game.eventFocusRole==='girlfriend'?0:(game.eventFocus??game.chartPlayer)?1:-1;game.cameraX=(game.cameraX||0)+(follow*18+(game.eventFocusX||0)*0.12-(game.cameraX||0))*0.025;const pan=settings.reducedMotion?0:game.cameraX,week2=SONGS[songIndex].week===2,modern=game.choice.variant==='erect'||game.character==='pico'||game.choice.stage?.endsWith('Erect'),custom=game.modVisuals,beat=game.beat,bpm=bpmAt(game.chart,time),phase=((beat%2+2)%2)*60000/bpm,flashAge=time-game.lightningAt;
 if(custom?.stage)drawModStageProps(ctx,assets,custom.stage,{time,pan});
 else if(week2){if(modern){const light=flashAge>=0&&flashAge<1600?Math.max(0,1-flashAge/1600):0;animation('WEEK2_TREES','bgtrees',180-pan*0.8,2,0.75,time,{fps:5,loop:true});image('week2-bgDark',-390-pan,-200,1838,938);if(light)image('week2-bgLight',-390-pan,-200,1838,938,light);}else animation('HALLOWEEN',flashAge>=0&&flashAge<1250?'Halloween lightning':'Halloween idle',-276-pan,-459,0.8,flashAge>=0&&flashAge<1250?flashAge:time,{fps:24,loop:flashAge<0||flashAge>=1250});}
 else if(modern){nativeExtras.drawErectStage(ctx,time,{pan});}else{image('stageback',-234-pan*0.9,-185,1707,960);image('stagefront',-270-pan*0.9,466,1848,305);}
 const positions=week2?(modern?{dad:[316,614],bf:[967,629],gf:[646,565]}:{dad:[346,637],bf:[831,653],gf:[641,575]}):modern?{dad:[270,629],bf:[973,644],gf:[616,576]}:{dad:[324,609],bf:[1043,639],gf:[688,553]};
 if(SONGS[songIndex].id==='tutorial'||game.choice.opponent==='gf')positions.dad=[...positions.gf];
 const originalStageChars=custom?.stage?.metadata.characters,stageChars=originalStageChars?{opponent:originalStageChars.opponent||originalStageChars.dad,player:originalStageChars.player||originalStageChars.bf,girlfriend:originalStageChars.girlfriend||originalStageChars.gf}:null;for(const role of ['opponent','player','girlfriend'])if(stageChars?.[role]?.position){const p=stageChars[role].position;positions[role==='opponent'?'dad':role==='player'?'bf':'gf']=[180+p[0]*0.72,-20+p[1]*0.72];}
 const drawCustom=(role,actor,position)=>drawSceneCharacter(role,actor,[position[0]-pan,position[1]],time);
 if(!drawCustom('girlfriend',null,positions.gf)){if(game.character==='pico'){const scale=0.62,neneX=positions.gf[0]-195.3-pan,neneY=positions.gf[1]-405.5;drawABot(ctx,assets,audio,{neneX,neneY,scale,time});assets.draw(ctx,'NENE',assets.frame('NENE','Nene idle',settings.reducedMotion?0:partnerDanceFrame(beat,bpm)),neneX,neneY,scale);}else if(modern||week2){const atlas=modern?'GF_DARK':'GF_MODERN',prefix=(modern?'GF dark':'GF modern')+(flashAge>=0&&flashAge<550?' scared':' idle');if(flashAge>=0&&flashAge<550)animation(atlas,prefix,positions.gf[0]-698*0.62/2-pan,positions.gf[1]-637*0.62,0.62,flashAge,{loop:false});else assets.draw(ctx,atlas,assets.frame(atlas,prefix,settings.reducedMotion?0:partnerDanceFrame(beat,bpm)),positions.gf[0]-698*0.62/2-pan,positions.gf[1]-637*0.62,0.62);}else{const frames=assets.frames('GF_assets','GF Dancing Beat0'),idx=settings.reducedMotion?0:partnerDanceFrame(beat,bpm);assets.draw(ctx,'GF_assets',frames[idx],472-pan,158,0.62);}}
 if(!drawCustom('opponent',actorDad,positions.dad)){const id=game.choice.opponent||SONGS[songIndex].opponent||'dad',name=id.includes('monster')?'MONSTER':id.includes('spooky')?(modern?'SPOOKY_DARK':'SPOOKY'):'DADDY_DEAREST',s=name==='DADDY_DEAREST'?0.71:0.7,w=name==='MONSTER'?426:name.startsWith('SPOOKY')?492:426,h=name==='MONSTER'?637:name.startsWith('SPOOKY')?549:767;drawActor(name,actorDad,positions.dad[0]-w*s/2-pan,positions.dad[1]-h*s,s,time);}
 if(!drawCustom('player',actorBF,positions.bf)){const pico=game.character==='pico',s=pico?0.64:0.66;drawActor(pico?'PICO':'BOYFRIEND',actorBF,positions.bf[0]-(pico?500:412)*s/2-pan,positions.bf[1]-(pico?500:412)*s,s,time);}
 if(custom?.stage)drawModStageProps(ctx,assets,custom.stage,{foreground:true,time,pan});else if(week2&&modern){image('week2-stairsDark',754.5-pan,-203.75,862.5,937.5);if(flashAge>=0&&flashAge<1600)image('week2-stairsLight',754.5-pan,-203.75,862.5,937.5,Math.max(0,1-flashAge/1600));}else if(!week2&&modern)nativeExtras.drawErectStage(ctx,time,{pan,foreground:true});else if(!week2&&!modern)image('stagecurtains',-250-pan*1.3,-175,1770,624);
 ctx.restore();if(settings.backgroundDim)rect(0,0,1280,720,`rgba(0,0,0,${settings.backgroundDim})`);
}

function drawGameplay(){
 if(!game)return;const time=game.time,mobile=mobileActive(),down=mobile||settings.downscroll,count=laneCount(),y=receptorY(),sign=down?-1:1,speed=0.45*game.chart.speed*settings.scrollSpeed,playerScale=mobile?(count===6?Math.min(1.4,Math.max(0.85,48*1280/viewportWidth/160)):Math.min(1.7,Math.max(1.02,64*1280/viewportWidth/160))):count===6?0.55:0.7;
 drawStage(time);if(/^philly(?:Streets|Blazin)/.test(game.choice.stage||'')&&!settings.reducedMotion)drawExpandedRain(ctx,Math.max(0,time),game.choice.baseSong==='blazin'?1.15:.8);
 if(game.can){const can=game.can,age=time-(can.thrown??can.lit),shot=time-(can.shot??Infinity);if(shot<600&&age<1800){const f=assets.frame('W7W1_FX_SPRAYCAN',''),x=can.thrown?435+Math.min(470,age*.63):440,y=can.thrown?458-Math.sin(Math.min(1,age/1000)*Math.PI)*175:510;if(shot>=0){animation('W7W1_FX_SPRAYPAINTEXPLOSION','',x-110,y-130,.65,shot,{loop:false,alpha:1-shot/600});}else if(f){ctx.save();ctx.translate(x,y);if(can.thrown)ctx.rotate(age*.012);assets.draw(ctx,'W7W1_FX_SPRAYCAN',f,-16,-18,.45);ctx.restore();}}}
 const shiftFade=story&&({'wife-forever':336,sky:292,manifest:424}[game.choice.baseSong]);
 if(shiftFade&&game.beat>=shiftFade)rect(0,0,1280,720,'rgba(0,0,0,'+clamp((game.beat-shiftFade)*300/2000,0,1)+')');
 if(game.choice.baseSong==='sky'&&game.choice.variant==='erect'&&game.beat>=224&&game.beat<352){const gradient=ctx.createRadialGradient(640,360,170,640,360,730);gradient.addColorStop(0,'#0000');gradient.addColorStop(1,'#000c');ctx.fillStyle=gradient;ctx.fillRect(0,0,1280,720);}
 const storyFade=rosesFade(SONGS[songIndex].id,{story,variant:game.choice.variant,time});if(storyFade.red)rect(0,0,1280,720,'rgba(255,27,49,'+storyFade.red+')');ctx.save();ctx.globalAlpha*=storyFade.hud*(game.hudFadeAt?clamp((frameTime-game.hudFadeAt)/2000,0,1):1);if(pixelStage(game.choice))ctx.imageSmoothingEnabled=false;if(settings.middlescroll&&!mobile)rect((1280-count*112)/2,0,count*112,720,'#0003');
 const activeCaption=game.captions?.find(cue=>cue.start<=time/1000&&cue.end>time/1000);
 if(activeCaption)activeCaption.text.forEach((line,i)=>text(line,640,down?124+i*26:590+i*26,22,'#fff','center',2));
 const hiddenOpponent=game.choice.baseSong==='blazin'||!mobile&&settings.middlescroll;
 const notePosition=n=>{const scale=mobile&&!n.player?0.2:1,scroll=n.player?(game.eventScrollPlayer??game.eventScroll??1):(game.eventScrollOpponent??game.eventScroll??1),target=mobile&&!n.player?20:y;return target+(n.time-time)*speed*scroll*(mobile&&!n.player?1:sign)*scale;};
 const miniClip=()=>{ctx.beginPath();ctx.rect(0,0,270,130);ctx.clip();};
 // Render the two strumlines separately so the miniature opponent lane has its own clip and speed.
 for(const player of [false,true]){if(!player&&hiddenOpponent)continue;ctx.save();if(!player&&mobile)miniClip();else{ctx.beginPath();ctx.rect(0,0,1280,720);ctx.clip();}
  for(let i=game.scanIndex;i<game.notes.length;i++){const n=game.notes[i];if(n.player!==player)continue;const pos=notePosition(n);if(n.time>time+6000)break;if(n.length>0&&!(n.hit&&time>n.time+n.length)){const scroll=n.player?(game.eventScrollPlayer??game.eventScroll??1):(game.eventScrollOpponent??game.eventScroll??1),target=mobile&&!player?20:y,end=target+(n.time+n.length-time)*speed*scroll*(mobile&&!player?1:sign)*(mobile&&!player?0.2:1),start=n.hit&&!n.holdBroken?target+56:pos+56;if(Math.max(start,end+56)>-100&&Math.min(start,end+56)<820)drawHold(n.lane,laneX(n.lane,player)+56,start,end+56,n.missed||n.holdBroken?0.25:player?0.72:0.4,mobile&&!player?0.22:playerScale);}}
  for(let lane=0;lane<count;lane++){const until=(player?laneFlashes:opponentFlashes)[lane],confirm=until>frameTime,press=player&&laneHeld(lane);drawNote(lane,laneX(lane,player),mobile&&!player?20:y,mobile&&!player?0.22:playerScale,confirm?'confirm':press?'press':'static',confirm?145-(until-frameTime):0,player?1:0.7);}
  for(let i=game.scanIndex;i<game.notes.length;i++){const n=game.notes[i];if(n.time>time+6000)break;if(n.player!==player||n.hit||n.missed)continue;const pos=notePosition(n);if(pos<-180||pos>850)continue;drawNote(n.lane,laneX(n.lane,player),pos,mobile&&!player?0.22:playerScale,'note',0,player?1:0.7);}
  ctx.restore();}
 for(const p of game.particles){ctx.globalAlpha=clamp(p.life/0.35,0,1);rect(p.x-4,p.y-4,8,8,p.color);}ctx.globalAlpha=1;
 if(game.rating){const r=game.rating,age=(frameTime-r.since)/1000;if(age<0.7){const alpha=clamp((0.7-age)*4,0,1),rise=settings.reducedMotion?0:age*35;ctx.save();ctx.globalAlpha=alpha;if(pixelStage(game.choice)&&r.name!=='miss'&&pixelUI.rating(ctx,r.name,r.combo,290-rise,alpha)){}else if(r.name==='miss')text('MISS',640,310-rise,40,'#d271eb','center');else{const img=assets.images[r.name];image(r.name,640-img.width*0.52/2,290-rise,img.width*0.52,img.height*0.52);text(String(r.combo).padStart(3,'0'),640,356-rise,35,'#fff','center');}ctx.restore();}}
 const healthY=down?32:650;rect(338,healthY,604,22,'#000');rect(343,healthY+5,594,12,'#ff0000');const hp=game.stats.health/2;rect(343+594*(1-hp),healthY+5,594*hp,12,'#66ff33');const boundary=343+594*(1-hp),pulse=settings.reducedMotion?1:1+Math.max(0,1-(game.beat%1)*4)*0.1;icon(game.eventHealthIcon?.opponent||game.choice.opponent||'dad',boundary-90*pulse,healthY-28,0.5*pulse,game.stats.health>1.6,false,game.healthIconOptions?.opponent);icon(game.eventHealthIcon?.player||game.choice.characters?.player||(game.character==='pico'?'pico':'bf'),boundary-10,healthY-28,0.5*pulse,game.stats.health<0.4,true,game.healthIconOptions?.player);
 text(mobile?'Score '+game.stats.score+' · Miss '+game.stats.misses+' · '+accuracy(game.stats).toFixed(1)+'%':'Score: '+game.stats.score+'  |  Misses: '+game.stats.misses+'  |  Accuracy: '+accuracy(game.stats).toFixed(2)+'%',640,down?83:690,mobile?Math.max(19,11*1280/viewportWidth):19,'#fff','center',2);
 const remaining=Math.max(0,Math.ceil((game.duration-audio.time())/1000));text(Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0'),640,down?5:12,18,'#fff','center',2);text(SONGS[songIndex].name+' - '+DIFFICULTIES[difficulty]+' / '+count+'K',15,mobile?695:down?690:14,mobile?14:16,'#ddd','left',2);
 if(game.practice||game.botplay)text(game.botplay?'BOTPLAY':'PRACTICE MODE',640,down?115:172,25,'#fff','center');const beatms=60000/game.chart.bpm;if(time<0){const name={[-3]:'ready',[-2]:'set',[-1]:'go'}[Math.floor(time/beatms)];if(name&&!(pixelStage(game.choice)&&pixelUI.countdown(ctx,Math.floor(time/beatms)))){const img=assets.images[name];image(name,640-img.width*0.65/2,360-img.height*0.65/2,img.width*0.65,img.height*0.65);}}
 if(!mobile)for(let lane=0;lane<count;lane++)newButton('lane-'+lane,laneLabel(lane)+' note ('+keyLabel(playKeys()[lane])+')',laneX(lane,true),180,count===6?88:112,440,()=>{}, {lane});
 newButton('pause','Pause game',1180,0,100,88,pauseGame);text('II',1248,18,27,'#fff','center',2);ctx.restore();
}

function drawPaused(){drawGameplay();buttons=[];rect(0,0,1280,720,'#000b');text(SONGS[songIndex].name,1255,22,32,'#fff','right');text(DIFFICULTIES[difficulty],1255,65,25,'#ddd','right');['resume','restart song','exit to menu'].forEach((label,i)=>{const y=202+i*130;letters(label,selected===i?160:110,y,1.04,{alpha:selected===i?1:0.55});newButton('pause-'+i,label,90,y-18,950,105,()=>{selected=i;choosePaused();},{select:i});});footer('UP / DOWN: SELECT      ENTER: CONFIRM      ESC: RESUME');}
function choosePaused(){if(selected===0)resumeGame();if(selected===1)retrySong();if(selected===2)exitSong();}
function drawGameOver(){rect(0,0,1280,720,'#000');const elapsed=frameTime-sceneAt,pico=game?.character==='pico',death=deathConfig(),deathTime=death.duration;ctx.save();if(death.character?.animationMap?.firstDeath){nativeContent.drawCharacter(ctx,death.id,null,{x:640,y:620,scale:pixelStage(game.choice)?0.85:0.86,time:elapsed,player:true,globalOffsets:game.choice.baseSong!=='blazin',animation:game.retryAt?'deathConfirm':elapsed<deathTime?'firstDeath':'deathLoop',animationTime:game.retryAt?frameTime-game.retryAt:elapsed<deathTime?elapsed:elapsed-deathTime});}else animation(pico?'PICO':'BOYFRIEND',pico?(elapsed<deathTime?'Pico dies':'Pico Dead Loop'):(elapsed<deathTime?'BF dies':'BF Dead Loop'),pico?425:485,210,0.86,elapsed<deathTime?elapsed:elapsed-deathTime,{loop:elapsed>=deathTime});ctx.restore();if(elapsed>1100){if(!death.pixel)letters('retry',640,100,1.4,{align:'center'});text('ENTER TO RETRY',640,618,30,'#fff','center');text('ESC TO RETURN',640,669,20,'#999','center');newButton('retry','Retry song',0,0,1280,640,retrySong);newButton('gameover-exit','Return to menu',380,648,520,70,exitSong);}}

function drawResults(){if(nativeResults.started){const targets=nativeResults.draw(ctx,{now:frameTime,volume:settings.volume,hints:true});for(const target of targets)newButton(target.id,target.label,target.x,target.y,target.w,target.h,()=>{if(target.action==='replay')startSong(story?weekStart():songIndex,story);else enter(story?'story':'freeplay',story?0:songIndex);});return;}menuBackground('menuBGBlue');rect(95,40,1090,635,'#000c');letters(story?'week clear':'song clear',640,69,1.05,{align:'center'});text(story?'WEEK '+WEEKS[storyWeek].id+' — '+WEEKS[storyWeek].name:SONGS[songIndex].name.toUpperCase(),640,168,30,'#ffde5e','center');const stats=story?combinedStats():game.stats;const rows=[['SCORE',story?storyTotal:stats.score],['ACCURACY',accuracy(stats).toFixed(2)+'%'],['MAX COMBO',stats.maxCombo],['MISSES',stats.misses],['RANK',rank(stats)]];rows.forEach(([label,value],i)=>{text(label,320,235+i*56,29,'#bbb');text(String(value),960,235+i*56,32,'#fff','right');});text(`SICK ${stats.judgements.sick}    GOOD ${stats.judgements.good}    BAD ${stats.judgements.bad}    SHIT ${stats.judgements.shit}`,640,537,20,'#ddd','center');if(game.practice||game.botplay)text('PRACTICE / AUTOPLAY — SCORE NOT SAVED',640,581,20,'#ffda60','center');text('ENTER: CONTINUE     R: PLAY AGAIN',640,624,25,'#fff','center');newButton('results-continue','Continue to song selection',170,600,625,70,()=>{audio.stopMenu();enter(story?'story':'freeplay',story?0:songIndex);});newButton('results-replay','Play again',840,600,300,70,()=>startSong(story?weekStart():songIndex,story));}
function combinedStats(){const all=makeStats();all.health=1;all.hits=0;all.misses=0;all.weight=0;all.totalNotes=0;for(const s of storyStats){all.totalNotes+=s.totalNotes||s.hits+s.misses;all.score+=s.score;all.hits+=s.hits;all.misses+=s.misses;all.weight+=s.weight;all.maxCombo=Math.max(all.maxCombo,s.maxCombo);for(const k in all.judgements)all.judgements[k]+=s.judgements[k];}return all;}
function drawLoading(){rect(0,0,1280,720,'#000');letters(errorText?'oops':'loading',640,270,1.4,{align:'center'});text(errorText||`${SONGS[songIndex].name.toUpperCase()}  /  ${DIFFICULTIES[difficulty].toUpperCase()}`,640,420,26,'#fff','center');if(errorText){text('ENTER: RETRY     ESC: BACK',640,500,24,'#ff8dc8','center');newButton('load-retry','Retry loading song',200,450,880,120,()=>startSong(songIndex,story,story));}else text('GETTING THE STAGE READY'+'.'.repeat(Math.floor(frameTime/300)%4),640,483,20,'#888','center');newButton('load-back','Cancel loading',0,650,220,70,back);text('ESC: BACK',24,686,20);}

function navigate(delta){if(scene==='gallery'){skyGallery.select(delta);return;}if(scene==='story'){storyWeek=(storyWeek+delta+WEEKS.length)%WEEKS.length;if(!storyDifficulties().includes(difficulty))difficulty=1;audio.sfx('scrollMenu',0.5);return;}if(scene==='freeplay'){const rows=freeplayRows(),i=rows.findIndex(s=>s.id===fp.selectedId);selectFreeplay(rows[(i+delta+rows.length)%rows.length].id);return;}const length=scene==='menu'?6:scene==='settings'?OPTIONS.length:scene==='controls'?settings.keyMode:scene==='paused'?3:scene==='instrumental'?instrumentalOptions().length:1;selected=(selected+delta+length)%length;audio.sfx('scrollMenu',0.5);announce(scene==='settings'?`${OPTIONS[selected].label}: ${optionValue(OPTIONS[selected])}`:'');}
function confirm(){if(scene==='title'){audio.sfx('confirmMenu');enter('menu');}else if(scene==='menu')openMenuChoice();else if(scene==='story')startSong(weekStart(),true);else if(scene==='freeplay')playFreeplay();else if(scene==='character')chooseCharacter(selected);else if(scene==='instrumental'){fp.instrumental=instrumentalOptions()[selected]||'default';enter('freeplay',songIndex);}else if(scene==='settings')changeOption(1);else if(scene==='controls'){rebind=selected;announce('Press a new key. Escape cancels.');}else if(scene==='calibrate')applyCalibration();else if(scene==='paused')choosePaused();else if(scene==='gameover')retrySong();else if(scene==='results'){audio.stopMenu();enter(story?'story':'freeplay',story?0:songIndex);}else if(scene==='loading'&&errorText)startSong(songIndex,story,story);}
document.addEventListener('keydown',async e=>{
  if(scene==='editor'||scene==='mods')return;
  if(scene==='cutscene'&&['Enter','Space','Escape','Backspace'].includes(e.code)){e.preventDefault();if(!e.repeat)expandedCutscenes.advance(e.code==='Escape'||e.code==='Backspace');return;}
  if(scene==='gallery'&&e.code==='Tab'){e.preventDefault();skyGallery.hideText=!skyGallery.hideText;return;}
  if(scene==='gallery'&&['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)){e.preventDefault();if(!e.repeat)skyGallery.select(['ArrowLeft','KeyA'].includes(e.code)?-1:1);return;}
  if(scene==='menu'&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&/^Key[A-Z]$/.test(e.code)){skySecret=(skySecret+e.code.at(-1)).slice(-3);if(skySecret==='SKY'){e.preventDefault();skySecret='';launchSkySecret();return;}}
  if(scene==='intro'&&['Enter','Space','Escape','Backspace'].includes(e.code)){e.preventDefault();if(!e.repeat){if(e.code==='Escape'||e.code==='Backspace')storyIntros.skip(performance.now());else storyIntros.advance(performance.now());}return;}
  if(scene==='character'){e.preventDefault();if(!e.repeat)characterSelect.handleKey(e.code,performance.now());return;}
  if((scene==='menu'||scene==='freeplay')&&e.code==='KeyM'){e.preventDefault();openMods();return;}
  if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)){if(e.code==='Escape'){const panel=document.querySelector('#freeplay-search');if(panel)panel.hidden=true;canvas.focus();}return;}
  if(scene==='freeplay'&&e.ctrlKey&&e.code==='KeyF'){e.preventDefault();showSearch();return;}
  if(scene==='freeplay'&&e.code==='Tab'){e.preventDefault();beginCharacterSelection();return;}
  if(scene==='freeplay'&&e.code==='Digit6'){e.preventDefault();toggleKeyMode();return;}
  if(scene==='freeplay'&&e.code==='KeyI'){e.preventDefault();enter('instrumental',Math.max(0,instrumentalOptions().indexOf(fp.instrumental)));return;}
  if(scene==='freeplay'&&e.code==='KeyF'){e.preventDefault();toggleFavorite();return;}
  if(scene==='freeplay'&&e.code==='Space'){e.preventDefault();if(fp.previewing){stopPreview();audio.playMenu();}else previewSong();return;}
  if(scene==='freeplay'&&(e.code==='Home'||e.code==='End')){e.preventDefault();const rows=freeplayRows();selectFreeplay(rows[e.code==='Home'?0:rows.length-1].id);return;}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.code==='Tab')return;
  const controlled=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Escape','Space','Backspace','KeyW','KeyA','KeyS','KeyD',...settings.keys,...settings.keys6];if(controlled.includes(e.code)||rebind>=0)e.preventDefault();
  if(e.repeat)return;
  if(!audio.ctx||audio.ctx.state==='suspended')audio.unlock().then(()=>{if(!['play','paused','loading','gameover','results','character','mods','intro','cutscene','gallery'].includes(scene))audio.playMenu();}).catch(()=>{});
  if(rebind>=0){if(e.code==='Escape'){rebind=-1;return;}if(e.code==='Digit7'){announce('7 is reserved for the chart editor.');return;}const keyField=settings.keyMode===6?'keys6':'keys',candidate=[...settings[keyField]];const old=candidate[rebind],existing=candidate.indexOf(e.code);if(existing>=0)candidate[existing]=old;candidate[rebind]=e.code;const normalized=normalizeSettings({...settings,[keyField]:candidate});if(normalized[keyField][rebind]===e.code){settings[keyField]=candidate;saveSettings();announce('Key saved.');rebind=-1;audio.sfx('confirmMenu',0.5);}else announce('Use a letter, number or punctuation key.');return;}
  if(e.code==='Digit7'&&['play','paused','freeplay','story','results'].includes(scene)){e.preventDefault();openChartEditor();return;}
  held.add(e.code);
  if(e.code==='Escape'||e.code==='Backspace'){back();return;}
  if(e.code==='KeyF'&&!(scene==='play'&&laneFromCode(e.code)>=0)){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('#game').requestFullscreen();}catch{}return;}
  if(e.code==='Digit0'&&!(scene==='play'&&laneFromCode(e.code)>=0)){settings.volume=settings.volume?0:0.7;saveSettings();return;}
  if(e.code==='Minus'||e.code==='Equal'){settings.volume=clamp(settings.volume+(e.code==='Equal'?0.1:-0.1),0,1);saveSettings();return;}
  if(scene==='play'){if(e.code==='Enter'){pauseGame();return;}const lane=laneFromCode(e.code);if(lane>=0)pressLane(lane);return;}
  if(scene==='calibrate'&&e.code==='Space'){calibrationTap();return;}
  if(scene==='results'&&e.code==='KeyR'){startSong(story?weekStart():songIndex,story);return;}
  if(e.code==='Enter'||e.code==='Space'){confirm();return;}
  if(e.code==='ArrowUp'||e.code==='KeyW')navigate(-1);
  if(e.code==='ArrowDown'||e.code==='KeyS')navigate(1);
  if(e.code==='ArrowLeft'||e.code==='KeyA'){if(scene==='story'||scene==='freeplay')changeDifficulty(-1);else if(scene==='settings')changeOption(-1);else if(scene==='character'||scene==='instrumental')navigate(-1);}
  if(e.code==='ArrowRight'||e.code==='KeyD'){if(scene==='story'||scene==='freeplay')changeDifficulty(1);else if(scene==='settings')changeOption(1);else if(scene==='character'||scene==='instrumental')navigate(1);}
});
document.addEventListener('keyup',e=>held.delete(e.code));
window.addEventListener('blur',()=>{held.clear();if(scene==='play')pauseGame();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&scene==='play')pauseGame();});
let gallerySwipe=null;
canvas.addEventListener('pointerdown',event=>{canvas.focus({preventScroll:true});if(scene==='gallery'){gallerySwipe=event.clientX;canvas.setPointerCapture(event.pointerId);}});
canvas.addEventListener('pointerup',event=>{if(scene==='gallery'&&gallerySwipe!==null&&Math.abs(event.clientX-gallerySwipe)>50)skyGallery.select(Math.sign(gallerySwipe-event.clientX));gallerySwipe=null;});
canvas.addEventListener('pointercancel',()=>gallerySwipe=null);
document.querySelector('#game').addEventListener('wheel',e=>{if(scene==='settings'||scene==='freeplay'){e.preventDefault();if(Math.abs(e.deltaY)>5)navigate(Math.sign(e.deltaY));}},{passive:false});
function tick(timestamp){const bounds=canvas.getBoundingClientRect();viewportWidth=Math.max(1,bounds.width);viewportAspect=viewportWidth/Math.max(1,bounds.height)/(1280/720);touchControls.update(scene==='play'&&mobileActive(),laneCount());frameTime=timestamp;const dt=clamp((timestamp-(lastFrame||timestamp))/1000,0,0.1);buttons=[];
  if(scene==='editor'||scene==='mods'){syncButtons();canvas.dataset.scene=scene;lastFrame=timestamp;scheduleFrame();return;}
  if(scene==='play'&&game&&lastFrame&&game.time>1000){game.frameTimes.push(timestamp-lastFrame);if(game.frameTimes.length>180)game.frameTimes.shift();}
  if(game&&Math.floor(timestamp/1000)!==Math.floor(lastFrame/1000)){const times=[...game.frameTimes].sort((a,b)=>a-b);canvas.dataset.frameP95=String(Math.round(times[Math.floor(times.length*0.95)]||0));canvas.dataset.frameMax=String(Math.round(times.at(-1)||0));canvas.dataset.character=game.character;canvas.dataset.level=game.choice.level;canvas.dataset.bpm=String(bpmAt(game.chart,game.time));canvas.dataset.lanes=String(game.laneCount);canvas.dataset.mobile=String(mobileActive());}
  if(scene==='play')updateGame(dt);
  if(scene==='calibrate'&&calibrationPlaying){const beat=Math.floor((audio.ctx.currentTime-calibrationAt)/0.5);if(beat>=0&&beat!==gameCalBeat){gameCalBeat=beat;const osc=audio.ctx.createOscillator(),gain=audio.ctx.createGain();osc.frequency.value=beat%4===0?1100:800;gain.gain.setValueAtTime(0.3,audio.ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,audio.ctx.currentTime+0.07);osc.connect(gain);gain.connect(audio.fx);osc.start();osc.stop(audio.ctx.currentTime+0.075);}}
  ctx.clearRect(0,0,1280,720);switch(scene){case'title':drawTitle();break;case'menu':drawMenu();break;case'story':drawStory();break;case'freeplay':drawFreeplay();break;case'character':drawCharacterSelect();break;case'instrumental':drawInstrumental();break;case'album':drawAlbum();break;case'settings':drawSettings();break;case'controls':drawControls();break;case'calibrate':drawCalibration();break;case'credits':drawCredits();break;case'loading':drawLoading();break;case'result-loading':rect(0,0,1280,720,'#000');letters('results',640,300,1.4,{align:'center'});break;case'intro':drawStorySequence();break;case'cutscene':drawExpandedSequence();break;case'gallery':drawSkyGallery();break;case'play':drawGameplay();break;case'paused':drawPaused();break;case'gameover':drawGameOver();break;case'results':drawResults();break;}
  sceneTransitions.draw(ctx,timestamp);if(transition>0){transition=Math.max(0,transition-dt);rect(0,0,1280,720,`rgba(0,0,0,${transition/0.22})`);}syncButtons();if(Math.floor(timestamp/250)!==Math.floor(lastFrame/250)){canvas.dataset.scene=scene;canvas.dataset.song=SONGS[songIndex].id;canvas.dataset.time=String(Math.round(game?.time||0));canvas.dataset.score=String(game?.stats.score||0);canvas.dataset.misses=String(game?.stats.misses||0);canvas.dataset.duration=String(Math.round(game?.duration||0));canvas.dataset.audioState=audio.ctx?.state||'idle';canvas.dataset.mode=game?.botplay?'autoplay':game?.practice?'practice':'standard';}lastFrame=timestamp;scheduleFrame();
}
async function boot(){const status=document.querySelector('#boot-status'),progress=document.querySelector('#boot-progress'),retry=document.querySelector('#boot-retry');try{retry.hidden=true;await Promise.all([nativeContent.load(),nativeExtras.load('picoCard'),assets.load(n=>{progress.value=Math.round(n*65);}),modernFreeplay.load(n=>{if(n===1)progress.value=100;}),fetch('variant-catalog.json').then(r=>r.json()).then(c=>{variantCatalog=c.variants;baseSongCatalog=c.baseSongs||[];if(!DIFFICULTIES.includes('Erect'))DIFFICULTIES.push('Erect','Nightmare');})]);await Promise.all([expandedContent.load(),expandedCutscenes.load(),loadExpandedMenu()]);for(const song of expandedContent.entries(builtinSongs))if(!builtinSongs.some(old=>old.id===song.id))builtinSongs.push(song);await modLibrary.init();refreshMods();for(const [atlas,frames] of Object.entries(assets.atlases)){for(const prefix of new Set(frames.filter(f=>f.name).map(f=>f.name.replace(/\d+$/,''))))assets.frames(atlas,prefix);}document.querySelector('#boot').hidden=true;canvas.focus();scheduleFrame();if(!renderWatchdog)renderWatchdog=setInterval(()=>{const now=performance.now();if(!document.hidden){const gap=now-lastFrame;if(gap>40)fallbackUntil=now+1500;if(gap>14&&now<fallbackUntil)tick(now);}},16);announce('Friday Night Funkin. Press Enter to begin.');}catch(e){console.error(e);status.textContent='Could not load the game. Serve this folder over HTTP and try again.';retry.hidden=false;retry.onclick=boot;}}
boot();

