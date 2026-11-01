// Friday Night Funkin — bundled browser engine. See NOTICE.

// ---- core.mjs ----
// Original browser engine. Charts are interpreted from classic FNF v0.2.7.1.
const SONGS = [
  {id:'bopeebo', name:'Bopeebo', file:'Bopeebo', bpm:100,week:1},
  {id:'fresh', name:'Fresh', file:'Fresh', bpm:120,week:1},
  {id:'dadbattle', name:'Dad Battle', file:'Dadbattle', bpm:180,week:1},
  {id:'spookeez',name:'Spookeez',file:'Spookeez',bpm:150,week:2,opponent:'spooky',stage:'spookyMansion'},
  {id:'south',name:'South',file:'South',bpm:165,week:2,opponent:'spooky',stage:'spookyMansion'},
  {id:'monster',name:'Monster',file:'Monster',bpm:95,week:2,opponent:'monster',stage:'spookyMansion'}
];
const WEEKS=[{id:1,name:'DADDY DEAREST',songs:['bopeebo','fresh','dadbattle']},{id:2,name:'SPOOKY MONTH',songs:['spookeez','south','monster']}];
const DIFFICULTIES=['Easy','Normal','Hard'];
const DEFAULT_SETTINGS=Object.freeze({volume:0.7,sfxVolume:0.7,downscroll:false,middlescroll:false,ghostTapping:true,offset:0,scrollSpeed:1,practice:false,botplay:false,reducedMotion:false,backgroundDim:0,keys:['KeyA','KeyS','KeyW','KeyD']});
const HIT_WINDOW=166;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function readJSON(text){return JSON.parse(text.replace(/\0/g,'').trim());}
function parseChart(data){
  const song=data.song||data;let bpm=Number(song.bpm)||100;let start=0;
  const notes=[],sections=[],tempos=[{time:0,beat:0,bpm}];let beats=0;
  for(const section of song.notes){
    if(section.changeBPM&&Number(section.bpm)>0){bpm=Number(section.bpm);tempos.push({time:start,beat:beats,bpm});}
    const steps=Number(section.lengthInSteps)||16;
    sections.push({start,end:start+steps*60000/bpm/4,player:!!section.mustHitSection,bpm});
    for(const raw of section.sectionNotes||[]){
      const [time,lane,length]=raw;if(!Number.isFinite(time)||!Number.isFinite(lane)||lane<0)continue;
      notes.push({time,lane:lane%4,player:lane>=4?!section.mustHitSection:!!section.mustHitSection,length:Math.max(0,Number(length)||0)});
    }
    start+=steps*60000/bpm/4;beats+=steps/4;
  }
  notes.sort((a,b)=>a.time-b.time||a.lane-b.lane||Number(a.player)-Number(b.player));
  // Editors sometimes emitted identical notes at a section boundary.
  const unique=notes.filter((n,i)=>!notes.slice(Math.max(0,i-8),i).some(p=>p.player===n.player&&p.lane===n.lane&&Math.abs(p.time-n.time)<1));
  let chartEnd=start;for(const n of unique)chartEnd=Math.max(chartEnd,n.time+n.length);
  return {notes:unique,sections,tempos,bpm:Number(song.bpm)||100,speed:Number(song.speed)||1,name:song.song,chartEnd,events:Array.isArray(song.events)?song.events:[]};
}
function beatAt(chart,time){let tempo=chart.tempos[0];for(const t of chart.tempos){if(t.time>time)break;tempo=t;}return tempo.beat+(time-tempo.time)*tempo.bpm/60000;}
function bpmAt(chart,time){let bpm=chart.bpm;for(const t of chart.tempos){if(t.time>time)break;bpm=t.bpm;}return bpm;}
function dancePeriod(bpm){return bpm>=150?2:1;}
function judgement(delta){const a=Math.abs(delta);if(a>HIT_WINDOW)return null;if(a<=45)return {name:'sick',score:350,weight:1};if(a<=90)return {name:'good',score:200,weight:0.75};if(a<=135)return {name:'bad',score:100,weight:0.5};return {name:'shit',score:50,weight:0.25};}
function nearestNote(notes,lane,time){let found=null;for(const n of notes){if(n.time>time+HIT_WINDOW)break;if(!n.player||n.hit||n.missed||n.lane!==lane||Math.abs(n.time-time)>HIT_WINDOW)continue;if(!found||Math.abs(n.time-time)<Math.abs(found.time-time))found=n;}return found;}
function makeStats(){return {score:0,combo:0,maxCombo:0,misses:0,hits:0,weight:0,health:1,judgements:{sick:0,good:0,bad:0,shit:0},offsets:[],holdTicks:0};}
function applyHit(stats,delta){const j=judgement(delta);if(!j)return null;stats.hits++;stats.combo++;stats.maxCombo=Math.max(stats.maxCombo,stats.combo);stats.score+=j.score;stats.weight+=j.weight;stats.health=clamp(stats.health+0.023,0,2);stats.judgements[j.name]++;stats.offsets.push(delta);return j;}
function applyMiss(stats){stats.misses++;stats.combo=0;stats.score-=10;stats.health=clamp(stats.health-0.0475,0,2);}
function accuracy(stats){return stats.hits+stats.misses?stats.weight/(stats.hits+stats.misses)*100:100;}
function rank(stats){const a=accuracy(stats);return stats.misses===0&&stats.hits>0?'FC':a>=95?'S':a>=90?'A':a>=80?'B':a>=70?'C':'D';}
function normalizeSettings(raw={}){
  const s={...DEFAULT_SETTINGS};for(const k of ['downscroll','middlescroll','ghostTapping','practice','botplay','reducedMotion'])if(typeof raw[k]==='boolean')s[k]=raw[k];
  for(const [k,min,max] of [['volume',0,1],['sfxVolume',0,1],['offset',-300,300],['scrollSpeed',0.5,3],['backgroundDim',0,0.8]])if(Number.isFinite(raw[k]))s[k]=clamp(raw[k],min,max);
  if(Array.isArray(raw.keys)&&raw.keys.length===4&&new Set(raw.keys).size===4&&raw.keys.every(k=>/^Key[A-Z]$|^Digit\d$|^Semicolon$|^Quote$|^Comma$|^Period$|^Slash$|^Bracket(Left|Right)$/.test(k)))s.keys=[...raw.keys];else s.keys=[...DEFAULT_SETTINGS.keys];return s;
}


// ---- chart-tools.mjs ----
const cloneChart=value=>structuredClone(value);
function validateChart(input){
  const data=typeof input==='string'?readJSON(input):cloneChart(input);const song=data.song&&typeof data.song==='object'?data.song:data;
  if(!song||!Array.isArray(song.notes))throw new Error('Expected a classic FNF chart with a song.notes array.');
  if(song.notes.length>20000)throw new Error('This chart has too many sections (maximum 20,000).');
  song.song=String(song.song||'Untitled').slice(0,100);song.bpm=clamp(Number(song.bpm)||100,1,999);song.speed=clamp(Number(song.speed)||1,0.1,10);song.needsVoices=song.needsVoices!==false;song.player1=String(song.player1||'bf');song.player2=String(song.player2||'dad');
  let count=0;for(const section of song.notes){section.lengthInSteps=clamp(Number(section.lengthInSteps)||16,0.000001,128);section.mustHitSection=!!section.mustHitSection;section.changeBPM=!!section.changeBPM;section.bpm=clamp(Number(section.bpm)||song.bpm,1,999);section.altAnim=!!section.altAnim;section.typeOfSection=0;if(!Array.isArray(section.sectionNotes))section.sectionNotes=[];section.sectionNotes=section.sectionNotes.filter(n=>Array.isArray(n)&&Number.isFinite(n[0])&&Number.isInteger(n[1])&&n[1]>=0&&n[1]<8).map(n=>[Math.max(0,n[0]),n[1],Math.max(0,Number(n[2])||0),...(n.length>3?[String(n[3]).slice(0,80)]:[])]);count+=section.sectionNotes.length;}
  if(count>100000)throw new Error('This chart has too many notes (maximum 100,000).');if(!song.notes.length)song.notes.push(blankSection());return {song};
}
function blankSection(player=true){return {sectionNotes:[],lengthInSteps:16,mustHitSection:player,bpm:100,changeBPM:false,altAnim:false,typeOfSection:0};}
function sectionTimes(raw){return parseChart(raw).sections;}
function retimeChart(before,after){const old=sectionTimes(before),next=sectionTimes(after);after.song.notes.forEach((s,i)=>{if(!old[i]||!next[i])return;for(const note of s.sectionNotes){note[0]=Math.max(0,next[i].start+(note[0]-old[i].start)*old[i].bpm/next[i].bpm);note[2]=Math.max(0,note[2]*old[i].bpm/next[i].bpm);}});}
function copySectionNotes(raw,from,to,{replace=false}={}){const timing=sectionTimes(raw),source=raw.song.notes[from],target=raw.song.notes[to];if(!source||!target)throw new Error('Section does not exist.');const copied=source.sectionNotes.map(n=>[timing[to].start+(n[0]-timing[from].start)*timing[from].bpm/timing[to].bpm,n[1],n[2]*timing[from].bpm/timing[to].bpm,...n.slice(3)]);target.sectionNotes=replace?copied:[...target.sectionNotes,...copied];return copied;}
function exportChart(raw){const out=validateChart(raw);for(const s of out.song.notes)s.sectionNotes.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);return JSON.stringify(out,null,2);}


// ---- assets.mjs ----
class Assets {
  constructor(){this.images={};this.atlases={};this.groups=new Map();}
  async load(progress){const response=await fetch('atlases.json');if(!response.ok)throw new Error('Could not load sprite index');this.atlases=await response.json();const extraResponse=await fetch('extra-images.json');const extras=extraResponse.ok?await extraResponse.json():[];const names=[...new Set([...Object.keys(this.atlases),...extras,'menuBG','menuBGBlue','menuBGMagenta','menuDesat','stageback','stagefront','stagecurtains','iconGrid','ready','set','go','sick','good','bad','shit'])];let count=0;
    await Promise.all(names.map(async name=>{const img=new Image();img.src=`${name}.png`;await img.decode();this.images[name]=img;progress(++count/names.length);}));
    try{await document.fonts.load('24px VCR');}catch{}
  }
  frames(atlas,prefix){const key=atlas+'|'+prefix;if(!this.groups.has(key))this.groups.set(key,(this.atlases[atlas]||[]).filter(f=>f.name?.startsWith(prefix)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})));return this.groups.get(key);}
  frame(atlas,prefix,index=0){const f=this.frames(atlas,prefix);return f[Math.max(0,Math.min(f.length-1,Math.floor(index)))];}
  draw(ctx,atlas,frame,x,y,scale=1,alpha=1){if(!frame)return;const img=this.images[atlas];ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(img,frame.sourceX??frame.x,frame.sourceY??frame.y,frame.sourceWidth??frame.width,frame.sourceHeight??frame.height,x-(frame.frameX||0)*scale,y-(frame.frameY||0)*scale,frame.width*scale,frame.height*scale);ctx.restore();}
  anim(ctx,atlas,prefix,x,y,scale,time,{fps=24,loop=true,alpha=1}={}){const f=this.frames(atlas,prefix);if(!f.length)return;const index=Math.floor(Math.max(0,time)*fps/1000);this.draw(ctx,atlas,f[loop?index%f.length:Math.min(index,f.length-1)],x,y,scale,alpha);}
  image(ctx,name,x,y,width,height,alpha=1){const img=this.images[name];if(!img)return;ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(img,x,y,width??img.width,height??img.height);ctx.restore();}
  // Original hand-drawn alphabet, matching the classic Freeplay and pause menus.
  letters(ctx,text,x,y,scale=1,{align='left',alpha=1}={}){const glyphs=[...text.toUpperCase()].map(c=>c===' '?null:this.frame('alphabet',c+' bold'));const width=glyphs.reduce((sum,g)=>sum+(g?g.width+3:32)*scale,0);let dx=x-(align==='center'?width/2:align==='right'?width:0);for(let i=0;i<glyphs.length;i++){const f=glyphs[i];if(f)this.draw(ctx,'alphabet',f,dx,y,scale,alpha);dx+=(f?f.width+3:32)*scale;}return width;}
}


// ---- audio.mjs ----
class AudioEngine {
  constructor(settings){this.settings=settings;this.cache=new Map();this.effects=new Map();this.sources=[];this.menu=null;this.menuFile='';this.position=0;this.running=false;this.ctx=null;this.buffers=null;this.trackOffsets=[];this.musicURLs=new Set();}
  async unlock(){
    if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=256;this.analyser.minDecibels=-65;this.analyser.maxDecibels=-25;this.analyser.smoothingTimeConstant=0.72;this.analyser.connect(this.master);this.frequencyData=new Uint8Array(this.analyser.frequencyBinCount);this.music=this.ctx.createGain();this.music.connect(this.analyser);this.voices=this.ctx.createGain();this.voices.connect(this.analyser);this.fx=this.ctx.createGain();this.fx.connect(this.master);this.updateVolume();}
    if(this.ctx.state==='suspended')await this.ctx.resume();
  }
  updateVolume(){if(this.master){this.master.gain.value=this.settings.volume;this.fx.gain.value=this.settings.sfxVolume;this.music.gain.value=1;this.voices.gain.value=1;}if(this.menu)this.menu.volume=this.settings.volume*0.8;}
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
    this.stopSources();this.stopMenu();this.position=position;this.clockStart=this.ctx.currentTime;this.running=true;this.voices.gain.value=1;
    this.sources=this.buffers.map((buffer,i)=>{const s=this.ctx.createBufferSource();s.buffer=buffer;s.connect(i===0?this.music:this.voices);const trackOffset=(this.trackOffsets[i]||0)/1000,relative=position/1000-trackOffset,delay=Math.max(0,-relative),offset=Math.max(0,relative);if(offset<buffer.duration)s.start(this.ctx.currentTime+delay,offset);return s;});
  }
  time(){return this.running?this.position+(this.ctx.currentTime-this.clockStart)*1000:this.position;}
  pause(){if(!this.running)return;this.position=this.time();this.running=false;this.stopSources();}
  resume(){this.start(this.position);}
  stopSources(){for(const s of this.sources){try{s.stop();}catch{}s.disconnect();}this.sources=[];}
  stop(){this.position=0;this.running=false;this.stopSources();}
  muteVoices(muted){if(this.voices)this.voices.gain.setTargetAtTime(muted?0:1,this.ctx.currentTime,0.015);}
}


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
    this.root.innerHTML=`<header class="ed-header"><strong>CHART EDITOR</strong><span>${escapeHTML(SONGS[this.index].name)} · ${DIFFICULTIES[this.diff]}</span><button data-action="play">▶ Play</button><button data-action="stop">■ Stop</button><button data-action="test">Test chart ↵</button><button data-action="export">Export JSON</button><label class="ed-file">Import JSON<input id="ed-import" type="file" accept=".json,application/json"></label><button data-action="exit" class="ed-exit">Back / 7</button></header><div class="ed-main"><section class="ed-workspace"><div class="ed-transport"><button data-action="prev">◀</button><label>Section <input id="ed-section" type="number" min="1" value="${this.section+1}"></label><span id="ed-total"></span><button data-action="next">▶</button><button data-action="add-section">+ Section</button><label>Snap <select id="ed-snap">${[4,8,12,16,24,32,48,64,96,192].map(v=>`<option value="${v}" ${v===this.snap?'selected':''}>1/${v}</option>`).join('')}<option value="0">None</option></select></label><button data-action="undo" title="Ctrl+Z">↶</button><button data-action="redo" title="Ctrl+Y">↷</button></div><div class="ed-timeline"><input id="ed-seek" type="range" min="0" max="100" step="1" value="0" aria-label="Song playhead"><output id="ed-clock">0:00.000</output></div><div class="ed-grid-scroll"><canvas id="ed-grid" width="${LEFT+GRID+18}" height="${TOP+16*STEP+24}" tabindex="0" aria-label="Eight-lane note grid. Click to add or delete a note, Control click to select, Alt click to seek."></canvas></div><div class="ed-grid-help">CLICK: ADD / DELETE · CTRL CLICK: SELECT · RIGHT CLICK: DELETE · SHIFT: UNSNAPPED · ALT CLICK: SEEK</div></section><aside class="ed-sidebar"><nav class="ed-tabs"><button data-tab="song">Song</button><button data-tab="section">Section</button><button data-tab="note">Note</button></nav><div id="ed-panel"></div><div class="ed-preview-options"><label><input id="ed-loop" type="checkbox" ${this.loop?'checked':''}> Loop section</label><label><input id="ed-follow" type="checkbox" ${this.follow?'checked':''}> Follow playhead</label><label><input id="ed-metronome" type="checkbox" ${this.metronome?'checked':''}> Metronome</label><label><input id="ed-hitsounds" type="checkbox" ${this.hitsounds?'checked':''}> Note clicks</label></div><p class="ed-shortcuts">SPACE play/pause · A/D section (Shift ×4) · W/S scrub · Q/E sustain · R reset section (Shift song) · TAB panels · ENTER playtest · 7 exit<br>Ctrl Z/Y undo/redo · Ctrl S export</p></aside></div><footer class="ed-footer" role="status"></footer>`;
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
    if(this.tab==='note'){const n=this.selected;panel.innerHTML=`<h3>Note</h3>${n?`${this.field('Timestamp (ms)','noteTime',n[0],'number','min="0" step="1"')}<label class="ed-field">Lane<select data-field="noteLane">${Array.from({length:8},(_,i)=>`<option value="${i}" ${n[1]===i?'selected':''}>${i<4?'Left':'Right'} · ${ED_DIRECTIONS[i%4]}</option>`).join('')}</select></label>${this.field('Sustain (ms)','noteLength',n[2],'number','min="0" step="1"')}${this.field('Note type (optional)','noteType',n[3]||'','text')}<div class="ed-action-row"><button data-action="sustain-minus">− Sustain (Q)</button><button data-action="sustain-plus">+ Sustain (E)</button><button data-action="delete-note">Delete note</button><button data-action="clone-note">Duplicate + beat</button></div><p>Ctrl-click a note to select it. Q / E changes its sustain by half a step. Ctrl + wheel also changes sustain.</p>`:'<p>No note selected. Ctrl-click a note in the grid to edit its timestamp, lane, sustain and type.</p>'}`;}
    panel.querySelectorAll('[data-field]').forEach(el=>{let previous=el.type==='checkbox'?el.checked:el.value;const update=e=>{const current=el.type==='checkbox'?el.checked:el.value;if(current===previous||(e.type==='input'&&el.type==='number'&&current===''))return;previous=current;const key=el.dataset.field,value=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;this.editField(key,value);};el.addEventListener('input',update);el.addEventListener('change',update);});
    panel.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>this.action(el.dataset.action)));
    panel.querySelectorAll('[data-audio]').forEach(el=>el.addEventListener('input',()=>{if(el.dataset.audio==='inst')this.instVolume=Number(el.value);else this.voiceVolume=Number(el.value);this.applyVolumes();}));
    panel.querySelectorAll('[data-audio-file]').forEach(el=>el.addEventListener('change',async()=>{const file=el.files[0];if(!file)return;this.pause();try{await this.audio.unlock();const buffer=await this.audio.ctx.decodeAudioData(await file.arrayBuffer());const index=Number(el.dataset.audioFile);this.customAudio[index]=buffer;this.audio.buffers[index]=buffer;if(index===0)this.duration=buffer.duration*1000;this.status(`Loaded ${file.name}. Audio stays in this editor session; export JSON saves only the chart.`);}catch(e){this.status('Could not decode audio: '+e.message);}}));
  }
  editField(key,value){const songFields=['song','bpm','speed','needsVoices','player1','player2'];const retime=['bpm','lengthInSteps','changeBPM','sectionBpm'].includes(key);this.mutate(()=>{if(songFields.includes(key))this.raw.song[key]=value;else if(key==='sectionBpm')this.current().bpm=clamp(value||100,1,999);else if(key==='noteTime'&&this.selected)this.selected[0]=Math.max(0,value||0);else if(key==='noteLane'&&this.selected)this.selected[1]=clamp(Number(value)||0,0,7);else if(key==='noteLength'&&this.selected)this.selected[2]=Math.max(0,value||0);else if(key==='noteType'&&this.selected)this.selected[3]=String(value);else this.current()[key]=value;if(key==='bpm')this.raw.song.bpm=clamp(value||100,1,999);if(key==='speed')this.raw.song.speed=clamp(value||1,0.1,10);if(key==='lengthInSteps')this.current().lengthInSteps=clamp(Math.round(value)||16,1,128);},retime,false);}
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
    if(action==='insert-section'){this.pause();const start=this.timing[this.section].start,duration=16*60000/this.timing[this.section].bpm/4;this.mutate(()=>{for(let i=this.section;i<this.raw.song.notes.length;i++)for(const n of this.raw.song.notes[i].sectionNotes)n[0]+=duration;const s=blankSection();s.bpm=this.timing[this.section].bpm;this.raw.song.notes.splice(this.section,0,s);this.selected=null;});this.position=start;return;}
    if(action==='delete-section'){if(this.raw.song.notes.length===1){this.status('Keep at least one section. Clear it instead.');return;}this.pause();const duration=this.timing[this.section].end-this.timing[this.section].start;this.mutate(()=>{this.raw.song.notes.splice(this.section,1);for(let i=this.section;i<this.raw.song.notes.length;i++)for(const n of this.raw.song.notes[i].sectionNotes)n[0]=Math.max(0,n[0]-duration);this.selected=null;});this.seek(this.timing[this.section].start);return;}
    if(action==='clear-section'){this.mutate(()=>{this.current().sectionNotes=[];this.selected=null;});return;}
    if(action==='clear-song'){this.mutate(()=>{for(const s of this.raw.song.notes)s.sectionNotes=[];this.selected=null;});return;}
    if(action==='swap'){this.mutate(()=>{for(const n of this.current().sectionNotes)n[1]=(n[1]+4)%8;});return;}
    if(action==='mirror'){this.mutate(()=>{for(const n of this.current().sectionNotes)n[1]=Math.floor(n[1]/4)*4+(3-n[1]%4);});return;}
    if(action==='sustain-minus'||action==='sustain-plus'){this.changeSustain(action==='sustain-plus'?1:-1);return;}
    if(action==='delete-note'&&this.selected){this.mutate(()=>{this.current().sectionNotes=this.current().sectionNotes.filter(n=>n!==this.selected);this.selected=null;});return;}
    if(action==='clone-note'&&this.selected){this.mutate(()=>{const n=cloneChart(this.selected);n[0]+=60000/this.timing[this.section].bpm;this.current().sectionNotes.push(n);this.selected=n;});}
  }
  changeSustain(direction){if(!this.selected)return;const halfStep=60000/this.timing[this.section].bpm/8;this.mutate(()=>this.selected[2]=Math.max(0,Math.round((this.selected[2]+halfStep*direction)*1000)/1000));}
  gridClick(e){this.grid.focus();const rect=this.grid.getBoundingClientRect(),x=(e.clientX-rect.left)*this.grid.width/rect.width,y=(e.clientY-rect.top)*this.grid.height/rect.height;if(y<TOP||y>=this.grid.height-24)return;const timing=this.timing[this.section],stepMs=60000/timing.bpm/4,rawStep=(y-TOP)/STEP;const snap=e.shiftKey||!this.snap?0:16/this.snap;const step=snap?Math.floor(rawStep/snap)*snap:rawStep;const time=timing.start+step*stepMs;if(e.altKey||x<LEFT){this.seek(time);return;}if(x>=LEFT+GRID)return;const lane=clamp(Math.floor((x-LEFT)/CELL),0,7);const existing=this.current().sectionNotes.find(n=>n[1]===lane&&Math.abs((n[0]-timing.start)/stepMs-rawStep)<0.48);
    if(existing&&(e.ctrlKey||e.metaKey)){this.selected=existing;this.tab='note';this.renderPanel();return;}if(e.button===2||existing){if(existing)this.mutate(()=>{this.current().sectionNotes=this.current().sectionNotes.filter(n=>n!==existing);if(this.selected===existing)this.selected=null;});return;}
    this.mutate(()=>{const note=[Math.round(time*1000)/1000,lane,0];this.current().sectionNotes.push(note);if(e.ctrlKey||e.metaKey)this.current().sectionNotes.push([note[0],(lane+4)%8,0]);this.selected=note;});
  }
  download(){const data=exportChart(this.raw);const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;const suffix=this.diff<3?['-easy','','-hard'][this.diff]:'-'+DIFFICULTIES[this.diff].toLowerCase();link.download=this.raw.song.song.toLowerCase().replace(/[^a-z0-9_-]+/g,'-')+suffix+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),5000);this.status('Exported classic FNF JSON.');}
  keydown(e){const input=/INPUT|TEXTAREA|SELECT/.test(e.target.tagName);if(input&&e.code!=='Escape')return;if(e.code==='Tab'){e.preventDefault();const tabs=['song','section','note'];this.tab=tabs[(tabs.indexOf(this.tab)+(e.shiftKey?2:1))%3];this.renderPanel();return;}if(e.ctrlKey||e.metaKey){if(e.code==='KeyZ'){e.preventDefault();this.undo(e.shiftKey);return;}if(e.code==='KeyY'){e.preventDefault();this.undo(true);return;}if(e.code==='KeyS'){e.preventDefault();this.download();return;}return;}
    const handled=['Space','Enter','Escape','Digit7','KeyA','KeyD','KeyW','KeyS','KeyQ','KeyE','KeyR','Delete'];if(!handled.includes(e.code))return;e.preventDefault();if(e.repeat&&!['KeyW','KeyS','KeyQ','KeyE'].includes(e.code))return;if(e.code==='Space')this.action('play');if(e.code==='Enter')this.action('test');if(e.code==='Escape'||e.code==='Digit7')this.action('exit');if(e.code==='KeyA')this.goSection(this.section-(e.shiftKey?4:1));if(e.code==='KeyD')this.goSection(this.section+(e.shiftKey?4:1));if(e.code==='KeyQ')this.changeSustain(-1);if(e.code==='KeyE')this.changeSustain(1);if(e.code==='KeyW'||e.code==='KeyS')this.seek(this.position+(e.code==='KeyW'?-1:1)*60000/this.timing[this.section].bpm/(e.shiftKey?1:4));if(e.code==='KeyR'){this.pause();this.seek(e.shiftKey?0:this.timing[this.section].start);}if(e.code==='Delete')this.action('delete-note');}
  clickTone(accent=false){const a=this.audio,osc=a.ctx.createOscillator(),gain=a.ctx.createGain();osc.frequency.value=accent?1200:700;gain.gain.setValueAtTime(0.075,a.ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,a.ctx.currentTime+0.035);osc.connect(gain);gain.connect(a.fx);osc.start();osc.stop(a.ctx.currentTime+0.04);}
  draw(timestamp){if(!this.visible)return;const g=this.gctx,t=this.timing[this.section],s=this.current(),stepMs=60000/t.bpm/4;
    if(this.playing){this.position=this.audio.time();if(this.loop&&this.position>=t.end){this.position=t.start;this.audio.start(this.position);this.applyVolumes();}else if(this.position>=this.duration){this.pause();this.position=0;}else if(this.follow){const found=this.timing.findIndex(s=>this.position>=s.start&&this.position<s.end);if(found>=0&&found!==this.section){this.section=found;this.selected=null;this.renderTimeline();this.renderPanel();return;}}
      if(this.metronome){const beat=Math.floor(beatAt(parseChart(this.raw),this.position));if(beat!==this.lastBeat){this.lastBeat=beat;this.clickTone(beat%4===0);}}
      if(this.hitsounds){if(s.sectionNotes.some(n=>n[0]>this.lastSoundTime&&n[0]<=this.position))this.clickTone();this.lastSoundTime=this.position;}
    }
    g.fillStyle='#1a1d25';g.fillRect(0,0,this.grid.width,this.grid.height);g.font='12px VCR, monospace';g.textAlign='center';g.textBaseline='middle';
    for(let lane=0;lane<8;lane++){g.fillStyle=lane<4?'#302f3e':'#293747';g.fillRect(LEFT+lane*CELL,TOP,CELL,s.lengthInSteps*STEP);g.fillStyle='#d4d6df';g.fillText(ED_DIRECTIONS[lane%4].slice(0,1),LEFT+lane*CELL+CELL/2,23);}
    for(let step=0;step<=s.lengthInSteps;step++){const y=TOP+step*STEP;g.strokeStyle=step%4===0?'#a4a7b2':'#555763';g.lineWidth=step%4===0?2:1;g.beginPath();g.moveTo(LEFT,y);g.lineTo(LEFT+GRID,y);g.stroke();g.fillStyle=step%4===0?'#fff':'#777';g.fillText(String(step),18,y);}
    for(let lane=0;lane<=8;lane++){g.strokeStyle=lane===4?'#f4d15b':'#666875';g.lineWidth=lane===4?3:1;g.beginPath();g.moveTo(LEFT+lane*CELL,TOP);g.lineTo(LEFT+lane*CELL,this.grid.height-24);g.stroke();}
    const notePrefix=['purple0','blue0','green0','red0'];for(const n of s.sectionNotes){const y=TOP+(n[0]-t.start)/stepMs*STEP,x=LEFT+n[1]*CELL;if(y<TOP-30||y>this.grid.height)continue;if(n[2]>0){g.fillStyle=['#c24b99','#00ffff','#12fa05','#f9393f'][n[1]%4];g.fillRect(x+CELL/2-4,y+16,8,n[2]/stepMs*STEP);}const f=this.assets.frame('NOTE_assets',notePrefix[n[1]%4]);this.assets.draw(g,'NOTE_assets',f,x+3,y-3,0.28);if(n===this.selected){g.strokeStyle='#fff';g.lineWidth=3;g.strokeRect(x+1,y-4,CELL-2,44);}}
    const py=TOP+(this.position-t.start)/stepMs*STEP;if(py>=TOP&&py<this.grid.height){g.fillStyle='#ff564f';g.fillRect(LEFT,py,GRID,3);g.fillStyle='#fff';g.fillText('▶',18,py);}
    const clock=this.root.querySelector('#ed-clock'),seek=this.root.querySelector('#ed-seek');seek.value=this.position;clock.textContent=`${Math.floor(this.position/60000)}:${(this.position/1000%60).toFixed(3).padStart(6,'0')} · ${t.bpm} BPM`;
  }
  close(){this.pause();this.generation=(this.generation||0)+1;this.visible=false;this.root.hidden=true;clearInterval(this.frame);this.audio.stop();this.audio.updateVolume();this.saveDraft();}
}


// ---- modern-freeplay.mjs ----
// Modern freeplay presentation, using the user's locally installed FNF artwork.
// This module is independent of game state. draw() returns semantic click targets.
const DIGITS=['ZERO','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE'];
const IMAGE_NAMES=['bg','capsule','selector','letters','highscore','normal','easy','hard','fav','dad','bficon','album','albumtitle','digits','smallnumbers','clear','rank','inst','bpm','difficulty','pink','glow','dot','sparkle','dj','erect','nightmare','album3','album3title','album4','album4title','picoicon','bgpico','bfportrait','picoportrait','charselectbg','charselectselector','bfnametag','piconametag','picodj','spookyicon','monstericon','album2','album2title'];
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
  number(ctx,value,x,y,scale=1,{align='left',pad=0,small=false}={}){const name=small?'smallnumbers':'digits',str=String(Math.max(0,Math.round(Number(value)||0))).padStart(pad,'0');const glyphs=[...str].map(c=>this.frames(name,DIGITS[Number(c)])[0]);const width=glyphs.reduce((s,g)=>s+(g?.width||40)*scale,0);let dx=x-(align==='right'?width:align==='center'?width/2:0);for(const f of glyphs){if(f){ctx.drawImage(small?this.images[name]:this.tintedDigits,f.x,f.y,f.width,f.height,dx,y,f.width*scale,f.height*scale);dx+=f.width*scale;}}return width;}
  drawDJFrame(ctx,index,pico=false){const commands=(pico?this.picoDJ:this.dj).frames[index]||[];for(const command of commands){const [x,y,w,h]=command.r;ctx.save();ctx.transform(...command.m);ctx.drawImage(pico?this.images.picodj:this.images.dj,x,y,w,h,0,0,w,h);ctx.restore();}}
  drawDJ(ctx,time,reducedMotion,animation='idle'){
    let localTime=time;if(!reducedMotion&&animation==='idle'){if(time<708)animation='intro';else if(time-this.selectionAt>80000){animation='watchingTV';localTime=time-this.selectionAt-80000;}else if(time-this.selectionAt>45000){animation='afk';localTime=time-this.selectionAt-45000;}}
    const pico=this.character==='pico',data=pico?this.picoDJ:this.dj;const [start,length]=data.labels[animation]||data.labels.idle,index=start+(reducedMotion?0:animation==='intro'?Math.min(length-1,Math.floor(localTime*24/1000)):Math.floor(localTime*24/1000)%length);const key=pico?'pico:'+index:index;let cached=this.idleCanvases.get(key);if(!cached&&pico&&animation==='idle'){cached=document.createElement('canvas');cached.width=405;cached.height=452;const c=cached.getContext('2d');c.translate(0,-268);this.drawDJFrame(c,index,true);this.idleCanvases.set(key,cached);}if(cached)ctx.drawImage(cached,0,268);else this.drawDJFrame(ctx,index,pico);
  }
  arrow(ctx,x,y,right=false){ctx.save();ctx.translate(x,y);if(right)ctx.scale(-1,1);ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-10,25);ctx.lineTo(12,50);ctx.lineTo(12,37);ctx.lineTo(2,25);ctx.lineTo(12,13);ctx.closePath();ctx.lineJoin='miter';ctx.lineWidth=9;ctx.strokeStyle='#000';ctx.stroke();ctx.fillStyle='#22d1e4';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#d7fdff';ctx.stroke();ctx.restore();}
  capsule(ctx,{song,x,y,selected,time,difficulty,favorite,record,previewing}){const scale=0.82;const prefix=selected?'mp3 capsule w backing0':'mp3 capsule w backing NOT SELECTED';this.sprite(ctx,'capsule',prefix,x,y,scale,selected?Math.floor(time/90)%8:0,selected?1:0.8);
    if(song.id!=='random'){ctx.save();ctx.imageSmoothingEnabled=false;this.sprite(ctx,this.character==='pico'?'picoicon':song.opponent?.includes('spooky')?'spookyicon':song.opponent?.includes('monster')?'monstericon':'dad',selected?'confirm-hold':'idle',x-2,y+28,1.65);ctx.restore();}
    label(ctx,song.name,x+65,y+23,27,selected?'#e9ffff':'#a1b0b9','left',2);
    if(song.id!=='random'){this.image(ctx,'bpm',x+62,y+83,28,16,selected?0.9:0.55);label(ctx,String(song.bpm||100),x+94,y+84,16,selected?'#8c97a0':'#4b5460','left',0);label(ctx,song.week==='MOD'?'MOD':'WEEK '+(song.week||1),x+203,y+84,16,selected?'#8c97a0':'#4b5460','left',0);this.image(ctx,'difficulty',x+350,y+83,65,16,selected?0.8:0.45);if(record)label(ctx,record.rank||'',x+434,y+32,23,'#52f1f8','center',2);}
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
    ctx.save();ctx.fillStyle='#171629';ctx.fillRect(0,0,1280,720);this.image(ctx,character==='pico'?'bgpico':'bg',342,64,1043,656);
    ctx.fillStyle='#ffda55';ctx.beginPath();ctx.moveTo(0,64);ctx.lineTo(395,64);ctx.lineTo(555,720);ctx.lineTo(0,720);ctx.closePath();ctx.fill();
    ctx.save();ctx.beginPath();ctx.moveTo(0,64);ctx.lineTo(395,64);ctx.lineTo(555,720);ctx.lineTo(0,720);ctx.closePath();ctx.clip();
    const phrases=['MORE WAYS THAN ONE','BOYFRIEND','IT\'S PERFECTLY NORMAL','HOTTEST TRACKS','MORE WAYS THAN ONE','BOYFRIEND'];
    phrases.forEach((p,i)=>{const offset=reducedMotion?0:(time/45*(i%2?1:-1))%330;label(ctx,p,offset-145,162+i*74,39,i%2?'#f4a04f':'#fff19b','left',0);label(ctx,p,offset+440,162+i*74,39,i%2?'#f4a04f':'#fff19b','left',0);});ctx.restore();
    // Album panel and dotted arc are behind the song capsules and DJ.
    ctx.save();ctx.strokeStyle='#edf3f6';ctx.lineWidth=4;ctx.lineCap='round';ctx.setLineDash([0,20]);ctx.beginPath();ctx.arc(1106,505,255,-2.2,0.9);ctx.stroke();ctx.restore();
    const albumImage=album==='volume2'?'album2':album==='volume3'?'album3':album==='volume4'?'album4':'album',albumTitle=album==='volume2'?'album2title':album==='volume3'?'album3title':album==='volume4'?'album4title':'albumtitle';const albumAngle=reducedMotion?0.17:0.17+Math.sin(time/2500)*0.025;ctx.save();ctx.translate(1100,458);ctx.rotate(albumAngle);this.image(ctx,albumImage,-142,-142,284,284);ctx.restore();
    this.sprite(ctx,albumTitle,'idle',978,570,0.85,Math.floor(time/110));
    add('fp-album','Album: Friday Night Funkin OST Volume 1',950,290,330,350,'album','volume1');
    this.drawDJ(ctx,time,reducedMotion,state.djAnimation||'idle');
    const rows=[{id:'random',name:'Random'},...songs];let selectedIndex=rows.findIndex(s=>s.id===selectedSong);if(selectedIndex<0)selectedIndex=1;
    const originY=297-selectedIndex*118;
    ctx.save();ctx.beginPath();ctx.rect(350,142,610,500);ctx.clip();rows.forEach((s,i)=>{const y=originY+i*118,x=374+Math.max(0,i-selectedIndex+1)*15;if(y<-90||y>700)return;const active=s.id===selectedSong;this.capsule(ctx,{song:s,x,y,selected:active,time:time-this.selectionAt,difficulty,favorite:favSet.has(s.id),record:records[s.id],previewing:active&&previewing});if(y>=140&&y+109<=648)add('fp-song-'+s.id,s.id==='random'?'Play a random song':`Select ${s.name}`,x,y,502,107,'song',s.id);});ctx.restore();
    if(!songs.length)label(ctx,'NO SONGS MATCH',635,318,25,'#efffff','center');
    // Header, difficulty label, alphabet/favorites tabs and high score use the original artwork.
    ctx.fillStyle='#000';ctx.fillRect(0,0,1280,64);label(ctx,'FREEPLAY',8,11,38,'#fff','left',0);label(ctx,'OFFICIAL OST',1270,11,38,'#fff','right',0);
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
  commands(prefix,time,fps=24,loop=false){const label=this.labels.find(l=>l.name===prefix)||this.labels.find(l=>l.name.toLowerCase().startsWith(String(prefix).toLowerCase())),symbol=this.symbols.get(prefix),tl=symbol||this.root;if(!tl)return[];const start=symbol?0:label?.start||0,length=symbol?this.duration(symbol):label?.length||this.duration(tl),offset=Math.floor(Math.max(0,time)*fps/1000),index=start+(loop?offset%length:Math.min(length-1,offset)),key=(symbol?prefix:'root')+':'+index;if(this.cache.has(key))return this.cache.get(key);const commands=[];
    const walk=(timeline,frame,matrix,alpha,depth)=>{if(depth>30||commands.length>5000)return;for(const layer of [...(timeline.L||[])].reverse()){const fr=(layer.FR||[]).find(f=>f.I<=frame&&frame<f.I+(f.DU||1));if(!fr)continue;for(const el of fr.E||[]){if(el.SI){const si=el.SI,sub=this.symbols.get(si.SN);if(!sub)continue;const duration=this.duration(sub),offset=(si.FF||0)+(si.LP==='SF'?0:frame-fr.I),childFrame=si.LP==='LP'?offset%duration:Math.min(offset,duration-1);walk(sub,childFrame,modMatrixMultiply(matrix,modElementMatrix(si)),alpha*(si.C?.AM??si.C?.A??1),depth+1);}else if(el.ASI){const a=el.ASI,s=this.pages.sprites.get(a.N);if(s)commands.push({matrix:modMatrixMultiply(matrix,modElementMatrix(a)),sprite:s,alpha});}}}};
    walk(tl,index,MOD_IDENTITY,1,0);if(commands.length>5000)throw new Error('Animate frame is too complex for this browser player.');this.cache.set(key,commands);return commands;
  }
  measure(prefix){const commands=this.commands(prefix,0),points=[];for(const c of commands){const s=c.sprite,[a,b,d,e,x,y]=c.matrix,w=s.rotated?s.h:s.w,h=s.rotated?s.w:s.h;for(const [u,v] of [[0,0],[w,0],[0,h],[w,h]])points.push([a*u+d*v+x,b*u+e*v+y]);}if(points.length){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);this.bounds={x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};this.width=this.bounds.w;this.height=this.bounds.h;}}
  draw(ctx,prefix,time,fps,loop){ctx.save();if(this.bounds)ctx.translate(-this.bounds.x,-this.bounds.y);for(const c of this.commands(prefix,time,fps,loop)){const s=c.sprite;ctx.save();ctx.globalAlpha*=c.alpha;ctx.transform(...c.matrix);if(s.rotated){ctx.translate(0,s.w);ctx.rotate(-Math.PI/2);}ctx.drawImage(s.image,s.x,s.y,s.w,s.h,0,0,s.w,s.h);ctx.restore();}ctx.restore();}
}
async function modAnimateLoad(zip,item,asset){const animationPath=modAssetPath(zip,item,asset+'/Animation','json');if(!animationPath)return null;const folder=animationPath.slice(0,animationPath.lastIndexOf('/')+1),mapPaths=[...zip.entries.keys()].filter(p=>p.startsWith(folder)&&/^spritemap\d+\.json$/i.test(p.slice(folder.length))),sprites=new Map();for(const mapPath of mapPaths){const map=await zip.json(mapPath),imagePath=zip.find(mapPath.replace(/\.json$/i,'.png'));if(!imagePath)continue;const image=await modImage(zip,imagePath);for(const item of map.ATLAS?.SPRITES||[]){const s=item.SPRITE||item;sprites.set(s.name,{...s,image});}}if(!sprites.size)return null;return new ModAnimate(await zip.json(animationPath),{sprites});}
async function loadModVisuals(zip,item,assets,key){const result={characters:{},stage:null,report:[]},chars=item.metadata.playData?.characters||{};
  for(const role of ['player','opponent','girlfriend']){const id=chars[role];if(!id)continue;const path=modDataPath(zip,item,'characters',id);if(!path)continue;try{const meta=await zip.json(path),asset=meta.assetPath;if(!asset)continue;const config={id,meta,role,animations:meta.animations||[],scale:Number(meta.scale)||1,globalOffsets:meta.offsets||[0,0],width:400,height:500,animate:null,atlas:null};
      if(/animateatlas/.test(meta.renderType||'')){config.animate=await modAnimateLoad(zip,item,asset);if(!config.animate)throw new Error('Animate files are missing');const idle=config.animations.find(a=>a.name==='idle'||a.name==='danceLeft')||config.animations[0];config.animate.measure(idle?.prefix||'idle');config.width=config.animate.width;config.height=config.animate.height;}
      else{const png=modAssetPath(zip,item,asset,'png'),xml=modAssetPath(zip,item,asset,'xml');if(!png||!xml)throw new Error('PNG/XML atlas is missing');const image=await modImage(zip,png),frames=modXMLFrames(await zip.text(xml)),atlas=`mod/${key}/${role}`;assets.images[atlas]=image;assets.atlases[atlas]=frames;config.atlas=atlas;const idle=config.animations.find(a=>a.name==='idle'||a.name==='danceLeft')||config.animations[0],first=frames.find(f=>f.name.startsWith(idle?.prefix||''))||frames[0];config.width=first?.frameWidth||first?.width||400;config.height=first?.frameHeight||first?.height||500;}
      result.characters[role]=config;
    }catch(e){result.report.push(`${id}: custom character fallback used (${e.message}).`);}}
  const stageId=item.metadata.playData?.stage,stagePath=stageId?modDataPath(zip,item,'stages',stageId):null;if(stagePath){try{const metadata=await zip.json(stagePath),props=[];for(const [i,prop] of (metadata.props||[]).entries()){if(String(prop.assetPath||'').startsWith('#')){props.push({...prop,solid:prop.assetPath});continue;}const png=modAssetPath(zip,item,prop.assetPath,'png');if(!png){result.report.push(`Stage prop ${prop.name||i}: image is missing.`);continue;}const image=await modImage(zip,png),name=`mod/${key}/prop${i}`;assets.images[name]=image;const loaded={...prop,image:name,atlas:null};const xml=modAssetPath(zip,item,prop.assetPath,'xml');if(xml){assets.atlases[name]=modXMLFrames(await zip.text(xml));loaded.atlas=name;}props.push(loaded);}result.stage={metadata,props:props.sort((a,b)=>(a.zIndex||0)-(b.zIndex||0))};}catch(e){result.report.push(`Custom stage fallback used (${e.message}).`);}}
  return result;
}
function drawModCharacter(ctx,assets,config,{x,y,scale=0.65,direction='idle',time=0,beat=0,bopBeats=1,player=false}={}){const requested=direction==='idle'?'idle':'sing'+direction,anim=config.animations.find(a=>a.name===requested)||config.animations.find(a=>a.name===requested.replace('miss',''))||config.animations.find(a=>a.name==='idle')||config.animations[0]||{prefix:'idle'},s=scale*config.scale,offset=anim.offsets||[0,0],global=config.globalOffsets||[0,0];ctx.save();ctx.translate(x-config.width*s/2-(global[0]||0)*s-offset[0]*s,y-config.height*s-(global[1]||0)*s-offset[1]*s);ctx.scale(s,s);if(config.meta.flipX&&!config.animate){ctx.translate(config.width,0);ctx.scale(-1,1);}if(config.animate)config.animate.draw(ctx,anim.prefix||anim.name,time,anim.frameRate||24,!!anim.looped);else assets.anim(ctx,config.atlas,anim.prefix||anim.name,0,0,1,time,{fps:anim.frameRate||24,loop:!!anim.looped});ctx.restore();}
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
  async getVisuals(choice,assets){const key=choice.mod.recordId+'/'+choice.mod.itemKey;if(!this.visuals.has(key)){const {record,item}=this.resolve(choice);this.visuals.set(key,this.archive(record).then(zip=>loadModVisuals(zip,item,assets,key)).then(result=>{for(const line of result.report)if(!record.report.includes(line))record.report.push(line);return result;}));}return this.visuals.get(key);}
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
// Browser implementations of the common data-driven V-Slice song events.
function updateChartEvents(game,time,{bpm=100,animate=()=>{}}={}){
 const events=game.chart.events||[];
 while(game.eventIndex<events.length&&events[game.eventIndex].t<=time){const event=events[game.eventIndex++],v=event.v&&typeof event.v==='object'?event.v:{char:event.v},duration=Math.max(0,Number(v.duration)||0)*15000/bpm;
  if(event.e==='FocusCamera')game.eventFocus=[0,'bf','boyfriend','player'].includes(v.char);
  if(event.e==='ZoomCamera'){const target=Math.min(3,Math.max(0.35,Number(v.zoom)||1));game.zoomTween={start:event.t,end:event.t+duration,from:game.eventZoom||1,to:target};}
  if(event.e==='ScrollSpeed'){const scroll=Math.max(0.05,Number(v.scroll)||1),target=v.absolute?scroll/game.chart.speed:scroll;game.scrollTween={start:event.t,end:event.t+duration,from:game.eventScroll||1,to:target};}
  if(event.e==='SetCameraBop'){game.bopRate=Math.max(1,Number(v.rate)||4);game.bopIntensity=Math.min(5,Math.max(0,Number(v.intensity)||0));game.bopOffset=Number(v.offset)||0;}
  if(event.e==='SetTargetBopSpeed'){const role=['bf','boyfriend','player'].includes(v.target)?'player':['gf','girlfriend'].includes(v.target)?'girlfriend':'opponent';game.eventBop[role]=Math.max(0.25,Number(v.rate)||1);}
  if(event.e==='PlayAnimation')animate(v.target,String(v.anim||'idle'),event.t);
  if(event.e==='SetHealthIcon'){game.eventHealthIcon??={};game.eventHealthIcon[v.char===0?'player':'opponent']=String(v.id||'bf');}
 }
 for(const [tweenName,field] of [['zoomTween','eventZoom'],['scrollTween','eventScroll']]){const t=game[tweenName];if(t){const p=t.end===t.start?1:Math.max(0,Math.min(1,(time-t.start)/(t.end-t.start)));game[field]=t.from+(t.to-t.from)*p;if(p===1)game[tweenName]=null;}}
}


// ---- abot.mjs ----
const ABOT_COLUMN_X=[0,59,115,181,235,287,338],ABOT_COLUMN_Y=[0,-8,-11.5,-11.9,-11.4,-6.7,0.3];
function drawABot(ctx,assets,audio,{neneX,neneY,scale=0.57,time=0}={}){
  const x=neneX+(-95+4)*scale,y=neneY+(384-89+2)*scale,spectrum=audio.spectrum();ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  if(assets.images.ABOT_SCREEN)assets.image(ctx,'ABOT_SCREEN',150,28,485,285);else{ctx.fillStyle='#070d0b';ctx.fillRect(174,47,460,265);}
  // Native seven-column A-Bot display, driven by the same 256-point FFT as its game implementation.
  for(let i=0;i<7;i++){const lo=Math.floor(Math.pow(i/7,1.7)*110)+1,hi=Math.max(lo+1,Math.floor(Math.pow((i+1)/7,1.7)*110));let energy=0;for(let j=lo;j<hi;j++)energy+=spectrum[j]||0;const level=energy/(hi-lo)/255,quantized=Math.round(level*6);if(!quantized)continue;const frame=5-clamp(quantized-1,0,5);if(assets.atlases.ABOT_VIZ)assets.draw(ctx,'ABOT_VIZ',assets.frame('ABOT_VIZ',`viz${i+1}0`,frame),207+ABOT_COLUMN_X[i],82+ABOT_COLUMN_Y[i]);else{ctx.fillStyle='#39ed73';ctx.fillRect(205+i*54,270-level*190,38,level*190);}}
  assets.image(ctx,'ABOT',0,0,812,357);ctx.restore();
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
const CS_SLOTS={3:'pico',4:'bf'};
const CS_PARTNER={bf:'gfChill',pico:'neneChill'};
const CS_PLAYER={bf:'bfChill',pico:'picoChill',locked:'lockedChill'};

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
    this.stop();this.original=character==='pico'?'pico':'bf';this.character=this.original;this.slot=this.character==='bf'?4:3;this.volume=CS_CLAMP(volume,0,1);this.reducedMotion=reducedMotion;this.phaseAt=now;this.changedAt=now-10000;this.deniedAt=-10000;this.deselectAt=-10000;this.previous=null;this.result=null;this.lastTime=now;this.cursorX=this.targetCursor().x;this.cursorY=this.targetCursor().y;this.trailX=this.cursorX;this.trailY=this.cursorY;
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
    const name=this.images[this.character==='bf'?'bfName':this.character==='pico'?'picoName':'lockedName'];const nameScale=0.77;ctx.drawImage(name,1008-name.width*nameScale/2,100-name.height*nameScale/2,name.width*nameScale,name.height*nameScale);
    for(let i=0;i<9;i++){
      const x=450+(i%3)*107,y=120+Math.floor(i/3)*127;const character=CS_SLOTS[i];
      if(character){const atlas=character==='bf'?'bfIcon':'picoIcon',list=this.atlases[atlas]||[],prefix=i===this.slot?'idle':'idle';const frame=list.find(f=>f.name.toLowerCase().startsWith(prefix))||list[0];if(frame){ctx.save();ctx.imageSmoothingEnabled=false;const b=i===this.slot&&!reducedMotion?1+Math.max(0,1-(now/666.666%1)*4)*0.04:1;const scale=128/(frame.frameWidth||frame.width)*b;ctx.drawImage(this.images[atlas],frame.x,frame.y,frame.width,frame.height,x-(frame.frameX||0)*scale,y-(frame.frameY||0)*scale,frame.width*scale,frame.height*scale);ctx.restore();}}
      else {const animation=i===this.slot?(now-this.deniedAt<500?'clicked':'selected'):'idle';this.animation(ctx,'lock',animation,animation==='clicked'?now-this.deniedAt:now,{x:x-238.75,y:y-148.6});}
      if(['choose','reveal'].includes(this.phase))targets.push({id:'cs-slot-'+i,label:character?`Choose ${character==='bf'?'Boyfriend':'Pico'}`:'Locked character slot',x:x+12,y:y+12,w:98,h:106,action:'slot',value:i});
    }
    const cursorAlpha=this.phase==='exit'?1-CS_CLAMP(elapsed/800,0,1):1;ctx.globalAlpha=cursorAlpha;
    if(this.phase==='confirm'||this.phase==='exit')this.sprite(ctx,'confirmCursor','cursor ACCEPTED instance 1',this.cursorX-2,this.cursorY-4,1,this.phase==='confirm'?elapsed:1500+elapsed);
    else {ctx.save();ctx.globalCompositeOperation='screen';ctx.drawImage(this.tintedCursors['#3c74f7'],this.trailX,this.trailY);ctx.drawImage(this.tintedCursors['#3ebbff'],(this.trailX+this.cursorX)/2,(this.trailY+this.cursorY)/2);ctx.restore();ctx.drawImage(this.tintedCursors['#ffff00'],this.cursorX,this.cursorY);if(now-this.deniedAt<500)this.sprite(ctx,'deniedCursor','cursor DENIED instance 1',this.cursorX-2,this.cursorY-4,1,now-this.deniedAt,false);}
    ctx.restore();
    if(this.phase==='exit'){
      const t=CS_CLAMP(elapsed/800,0,1);ctx.save();ctx.globalAlpha=t*t;ctx.fillStyle='#084a9a';ctx.fillRect(0,0,1280,720);ctx.restore();const g=ctx.createLinearGradient(0,720*(1-t)-120,0,720*(1-t)+160);g.addColorStop(0,'#000');g.addColorStop(1,'#0000');ctx.fillStyle=g;ctx.fillRect(0,0,1280,720);
    }else if(this.phase==='reveal'&&!reducedMotion){const t=CS_CLAMP(elapsed/800,0,1);ctx.save();ctx.globalAlpha=(1-t)*(1-t);ctx.fillStyle='#0c326f';ctx.fillRect(0,0,1280,720);ctx.restore();}
    if(['choose','reveal'].includes(this.phase)){
      targets.push({id:'cs-confirm',label:this.character==='locked'?'Locked character':'Confirm '+(this.character==='bf'?'Boyfriend':'Pico'),x:830,y:170,w:390,h:430,action:'confirm'});
      targets.push({id:'cs-back',label:'Return to previous character',x:0,y:655,w:210,h:65,action:'back'});
    }
    return targets;
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
const modernFreeplay=new ModernFreeplay(),characterSelect=new CharacterSelect(),sceneTransitions=new SceneTransitions(),modLibrary=new ModLibrary();
const builtinSongs=[...SONGS];let storyWeek=0,characterOpening=false,characterExitAt=0,modsReturn='menu';
function refreshMods(){SONGS.splice(0,SONGS.length,...builtinSongs,...modLibrary.songs());for(const song of SONGS)for(const level of song.difficulties||[])if(!DIFFICULTIES.some(d=>d.toLowerCase()===level))DIFFICULTIES.push(level[0].toUpperCase()+level.slice(1));songIndex=Math.min(songIndex,SONGS.length-1);chartCache.clear();}
const modManager=new ModManager(modLibrary,{onExit:()=>{enter(modsReturn,modsReturn==='menu'?4:songIndex);canvas.focus();},onChange:refreshMods});
function openMods(){modsReturn=scene==='freeplay'?'freeplay':'menu';stopPreview();audio.stop();audio.stopMenu();enter('mods');modManager.open();}
function availableDifficulties(index=songIndex){const song=SONGS[index];if(song.mod)return song.difficulties.map(l=>DIFFICULTIES.findIndex(d=>d.toLowerCase()===l));return fp.character==='bf'&&variantCatalog.some(v=>v.baseSong===song.id&&v.variant==='erect')?[0,1,2,3,4]:[0,1,2];}
function normalizeDifficulty(){const list=availableDifficulties();if(!list.includes(difficulty))difficulty=list.includes(1)?1:list[0];}
function weekStart(){return SONGS.findIndex(s=>s.id===WEEKS[storyWeek].songs[0]);}
async function beginCharacterSelection(){if(characterOpening||scene!=='freeplay')return;characterOpening=true;characterExitAt=performance.now();stopPreview();audio.stopMenu();try{await characterSelect.load();const wait=Math.max(0,450-(performance.now()-characterExitAt));if(wait)await new Promise(r=>setTimeout(r,wait));if(scene!=='freeplay')return;enter('character');characterSelect.begin({character:fp.character,volume:settings.volume,reducedMotion:settings.reducedMotion,now:performance.now()});}catch(e){announce(e.message);audio.playMenu();}finally{characterOpening=false;}}
const fp={selectedId:'bopeebo',filter:'all',search:'',sort:'default',favorites:new Set(storage.get('favorites',[])),previewing:false,previewAt:0,previewEnd:45000,previewGeneration:0,previewTimer:null,character:storage.get('character','bf')==='pico'?'pico':'bf',instrumental:'default'};
let variantCatalog=[],baseSongCatalog=[];
function songChoice(index=songIndex,diff=difficulty,character=fp.character,instrumental=fp.instrumental){
 const song=SONGS[index],level=DIFFICULTIES[diff]?.toLowerCase()||'normal';if(song.mod)return modLibrary.choice(song,level,instrumental);
 const kind=character==='pico'?'pico':diff>=3?'erect':null,variant=variantCatalog.find(v=>v.baseSong===song.id&&v.variant===kind),base=baseSongCatalog.find(v=>v.id===song.id),common={opponent:song.opponent||'dad',stage:song.stage||'mainStage',week:song.week||1};
 if(variant&&variant.charts[level])return {...common,...variant,character,level,chartUrl:''+variant.charts[level],rawData:variant.chartData?.[level],audioUrls:[''+variant.instrumental,''+variant.voices]};
 const suffix=['-easy','','-hard'][Math.min(diff,2)],alternate=instrumental==='pico'?variantCatalog.find(v=>v.baseSong===song.id&&v.variant==='pico'):null;
 return {...common,id:song.id,name:song.name,bpm:song.bpm,character:'bf',level,chartUrl:`${song.id}${suffix}.json`,rawData:base?.chartData?.[level],audioUrls:[alternate?''+alternate.instrumental:`${song.file}_Inst.ogg`,`${song.file}_Voices.ogg`],previewStart:base?.previewStart||12000,previewEnd:base?.previewEnd||36000,album:song.week===2?'volume2':'volume1'};
}

async function rawChoice(choice){if(choice.mod)return modLibrary.chart(choice);if(choice.rawData)return structuredClone(choice.rawData);const response=await fetch(choice.chartUrl);if(!response.ok)throw new Error('The song chart could not be loaded.');return readJSON(await response.text());}
async function prepareChoice(choice){const request=audio.prepareGeneration=(audio.prepareGeneration||0)+1;await audio.unlock();const sources=choice.mod?await modLibrary.audioSources(choice):{urls:choice.audioUrls,offsets:choice.audioUrls.map(()=>0)},buffers=await Promise.all(sources.urls.map(url=>audio.load(url)));if(request===audio.prepareGeneration){audio.buffers=buffers;audio.trackOffsets=sources.offsets;audio.trimSongs(sources.urls);}return buffers[0].duration*1000+(sources.offsets[0]||0);}

function scoreKey(index,character=fp.character,diff=difficulty){return character==='bf'&&diff<3?`score:${SONGS[index].id}:${diff}`:`score:${SONGS[index].id}:${character}:${DIFFICULTIES[diff]}`;}
const DIRECTIONS=['LEFT','DOWN','UP','RIGHT'],COLORS=['#c24b99','#00ffff','#12fa05','#f9393f'];
const NOTE_PREFIX=['purple0','blue0','green0','red0'];
const BF_OFFSETS={idle:[-5,0],LEFT:[12,-6],DOWN:[-10,-50],UP:[-29,27],RIGHT:[-38,-7]};
const DAD_OFFSETS={idle:[0,0],LEFT:[-10,10],DOWN:[0,-30],UP:[-6,50],RIGHT:[0,27]};
let scene='title',sceneAt=performance.now(),selected=0,difficulty=1,songIndex=0,story=false,storyTotal=0,storyStats=[],game=null;
let pendingAnimationFrame=null,renderWatchdog=null,fallbackUntil=0;
function scheduleFrame(){if(pendingAnimationFrame===null)pendingAnimationFrame=requestAnimationFrame(t=>{pendingAnimationFrame=null;tick(t);});}
let buttons=[],buttonSignature='',frameTime=0,lastFrame=0,flash=0,transition=0,errorText='',loadGeneration=0;
const buttonNodes=new Map(),buttonData=new Map();
let held=new Set(),laneFlashes=[0,0,0,0],opponentFlashes=[0,0,0,0],rebind=-1,pointerLanes=new Map(),lastPointer=null;
let actorBF={direction:'idle',since:0,until:0},actorDad={direction:'idle',since:0,until:0};
let menuBeat=-1,menuScroll=0,optionScroll=0,lastCountdown=-99,calibration=[],calibrationAt=0,calibrationPlaying=false;
const OPTIONS=[
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
function text(str,x,y,size=24,color='#fff',align='left',stroke=3){ctx.save();ctx.font=`${size}px VCR, monospace`;ctx.textAlign=align;ctx.textBaseline='top';ctx.lineWidth=stroke*2;ctx.lineJoin='round';ctx.strokeStyle='#000';if(stroke)ctx.strokeText(str,x,y);ctx.fillStyle=color;ctx.fillText(str,x,y);ctx.restore();}
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
function enter(next,index=0){sceneTransitions.begin(canvas,scene,next,{reducedMotion:settings.reducedMotion});if(scene==='freeplay'&&next!=='freeplay')stopPreview();scene=next;sceneAt=performance.now();selected=index;rebind=-1;transition=0;buttonSignature='';held.clear();pointerLanes.clear();if(next==='freeplay'){songIndex=SONGS[index]?index:songIndex;fp.selectedId=SONGS[songIndex].id;normalizeDifficulty();fp.previewTimer=setTimeout(schedulePreview,0);}if(next==='story'&&difficulty>2)difficulty=1;if(!['play','loading','gameover','paused','results','editor','mods','character'].includes(next))audio.playMenu();announce(next==='menu'?'Main menu. Story mode, Freeplay, Donate and credits, Options.':next==='freeplay'?`Freeplay. ${SONGS[songIndex].name}. ${DIFFICULTIES[difficulty]}.`:next==='story'?`Story mode. Week ${WEEKS[storyWeek].id}: ${WEEKS[storyWeek].name}. ${DIFFICULTIES[difficulty]}.`:next==='settings'?'Options. Use up and down to select, left and right to change.':next==='controls'?'Key bindings. Select a direction and press Enter to change its key.':next);}
function back(){if(rebind>=0){rebind=-1;return;}audio.sfx('cancelMenu');if(scene==='character'){characterSelect.cancel(performance.now());return;}if(scene==='album'||scene==='instrumental'){enter('freeplay',songIndex);return;}if(scene==='play'){pauseGame();return;}if(scene==='paused'){resumeGame();return;}if(scene==='gameover'){exitSong();return;}if(scene==='results'){enter(story?'story':'freeplay',story?0:songIndex);return;}if(scene==='settings'){saveSettings();enter('menu',3);return;}if(scene==='controls'||scene==='calibrate'){calibrationPlaying=false;enter('settings',scene==='controls'?11:12);return;}if(scene==='credits'){enter('menu',2);return;}if(scene==='loading'){loadGeneration++;audio.stop();enter(story?'story':'freeplay');return;}if(scene==='menu'){enter('title');return;}if(scene==='title')return;enter('menu',scene==='freeplay'?1:0);}
function menuBackground(name='menuBG',tint=null){const img=assets.images[name];const scale=Math.max(1280/img.width,720/img.height)*1.1;image(name,(1280-img.width*scale)/2,(720-img.height*scale)/2,img.width*scale,img.height*scale);if(tint){ctx.save();ctx.globalCompositeOperation='multiply';rect(0,0,1280,720,tint);ctx.restore();}}
function footer(hint='ARROWS: SELECT    ENTER: CONFIRM    ESC: BACK'){text(hint,22,688,19,'#fff','left',2);newButton('back','Back',0,665,140,55,back);}
function difficultyControl(x,y){const name=DIFFICULTIES[difficulty].toUpperCase();atlasFrame('campaign_menu_UI_assets','arrow left',x,y+2,0.65);const f=assets.frame('campaign_menu_UI_assets',name);if(f)atlasFrame('campaign_menu_UI_assets',name,x+52+(190-f.width*0.7)/2,y,0.7);atlasFrame('campaign_menu_UI_assets','arrow right',x+254,y+2,0.65);newButton('difficulty-left','Previous difficulty',x-12,y-12,62,72,()=>changeDifficulty(-1));newButton('difficulty-right','Next difficulty',x+240,y-12,70,72,()=>changeDifficulty(1));}
function changeDifficulty(delta){const list=scene==='freeplay'?availableDifficulties():[0,1,2];difficulty=list[(Math.max(0,list.indexOf(difficulty))+delta+list.length)%list.length];audio.sfx('scrollMenu',0.6);if(scene==='freeplay')schedulePreview();announce(DIFFICULTIES[difficulty]);}

function bestFor(index=songIndex,character=fp.character,diff=difficulty){return storage.get(scoreKey(index,character,diff),null);}
function openMenuChoice(){audio.sfx('confirmMenu');const choice=selected;if(choice===0)enter('story');else if(choice===1)enter('freeplay',songIndex);else if(choice===2)enter('credits');else if(choice===3)enter('settings');else if(choice===4)openMods();}
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
  text('WEEKS 1 + 2 / BROWSER RECREATION',12,692,16);text('ARROWS + ENTER',1260,692,16,'#fff','right');
}
function drawStory(){const week=WEEKS[storyWeek];
 rect(0,0,1280,720,'#000');rect(0,58,1280,378,'#f9cf51');text('WEEK SCORE: '+storage.get('week:'+week.id+':'+difficulty,0),16,16,28);text(week.name,1260,16,30,'#aaa','right');
 const beat=(audio.menu?.currentTime||0)*102/60,phase=(beat%1)*588;
 if(storyWeek===1)animation('STORY_SPOOKY','Story Spooky idle',150,90,1,settings.reducedMotion?0:phase,{loop:false});else animation('campaign_menu_UI_characters','Dad idle dance BLACK LINE',150,74,0.46,settings.reducedMotion?0:phase,{loop:false});
 animation('campaign_menu_UI_characters','BF idle dance white',596,210,0.48,settings.reducedMotion?0:phase,{loop:false});const gf=assets.frames('campaign_menu_UI_characters','GF Dancing Beat WHITE');assets.draw(ctx,'campaign_menu_UI_characters',gf[(Math.floor(beat)%2?15:0)+Math.min(14,Math.floor(phase/1000*24))],930,110,0.48);
 letters('week',295,473,0.85,{align:'center'});text(String(week.id),420,474,53);newButton('story-week','Play Week '+week.id+': '+week.name,90,448,580,115,()=>startSong(weekStart(),true));
 text('TRACKS',325,573,27,'#e557a3','center');week.songs.forEach((id,i)=>text(SONGS.find(s=>s.id===id).name.toUpperCase(),325,608+i*23,23,'#e557a3','center',0));difficultyControl(850,494);
 newButton('week-prev','Previous week',0,440,90,120,()=>navigate(-1));newButton('week-next','Next week',675,440,90,120,()=>navigate(1));text('<',38,486,36);text('>',707,486,36);text('ENTER TO PLAY',996,578,23,'#aaa','center');newButton('story-play','Start Week '+week.id,810,567,375,70,()=>startSong(weekStart(),true));footer('UP / DOWN: WEEK    LEFT / RIGHT: DIFFICULTY    ENTER: START');
}

function drawFreeplay(){
  const songs=freeplaySongs().map(s=>({...s,bpm:s.mod?s.bpm:songChoice(SONGS.indexOf(s)).bpm})),records=Object.fromEntries(SONGS.map((s,i)=>[s.id,bestFor(i)]));const targets=modernFreeplay.draw(ctx,{time:characterOpening?frameTime-characterExitAt:frameTime-sceneAt,djAnimation:characterOpening?'characterSelect':'idle',selectedSong:fp.selectedId,difficulty,difficultyLabel:DIFFICULTIES[difficulty],records,favorites:fp.favorites,filter:fp.filter,search:fp.search,sort:fp.sort,songs,previewing:fp.previewing,reducedMotion:settings.reducedMotion,character:fp.character,album:songChoice().album});
  for(const target of targets)newButton(target.id,target.label,target.x,target.y,target.w,target.h,()=>freeplayAction(target.action,target.value));
  text('TAB: CHARACTER',180,686,16,'#fff','left',0);newButton('fp-mods','Import and manage mods',390,670,120,48,openMods);text('M: MODS',392,686,16,'#fff','left',0);newButton('fp-character',`Choose character, current ${fp.character==='pico'?'Pico':'Boyfriend'}`,155,670,225,48,beginCharacterSelection);newButton('fp-instrumental',`Instrumental: ${fp.instrumental}`,15,165,310,50,()=>enter('instrumental'));
  text(`I: INST ${fp.instrumental.toUpperCase()}`,18,181,17,'#111','left',0);
  if(fp.previewing&&audio.running&&audio.time()>Math.min((audio.buffers?.[0]?.duration||80)*1000-100,fp.previewEnd))audio.start(fp.previewAt);
}
function freeplaySongs(){let list=SONGS.filter(s=>{if(!s.mod&&fp.character==='pico'&&!variantCatalog.some(v=>v.baseSong===s.id&&v.variant==='pico'))return false;if(fp.search&&!s.name.toLowerCase().includes(fp.search.toLowerCase()))return false;if(fp.filter==='favorites')return fp.favorites.has(s.id);if(fp.filter==='numbers')return /^\d/.test(s.name);if(fp.filter==='all')return true;const [a,z]=fp.filter.split('-');const first=s.name[0].toLowerCase();return first>=a&&first<=z;});if(fp.sort==='title')list.sort((a,b)=>a.name.localeCompare(b.name));if(fp.sort==='bpm')list.sort((a,b)=>a.bpm-b.bpm);if(fp.sort==='score')list.sort((a,b)=>(bestFor(SONGS.indexOf(b))?.score||0)-(bestFor(SONGS.indexOf(a))?.score||0));return list;}
function freeplayRows(){return [{id:'random'},...freeplaySongs()];}
function selectFreeplay(id){fp.selectedId=id;const index=SONGS.findIndex(s=>s.id===id);if(index>=0){songIndex=index;normalizeDifficulty();}audio.sfx('scrollMenu',0.5);schedulePreview();announce(id==='random'?'Random song':SONGS[index]?.name||'No song');}
function stopPreview(){clearTimeout(fp.previewTimer);fp.previewGeneration++;if(fp.previewing){audio.stop();fp.previewing=false;}}
function schedulePreview(){stopPreview();if(scene==='freeplay'&&fp.selectedId!=='random')fp.previewTimer=setTimeout(()=>{if(scene==='freeplay')previewSong();},650);}
async function previewSong(){if(scene!=='freeplay'||fp.selectedId==='random')return;stopPreview();const generation=fp.previewGeneration;const index=SONGS.findIndex(s=>s.id===fp.selectedId);if(index<0)return;try{audio.stopMenu();const choice=songChoice(index);await prepareChoice(choice);if(scene!=='freeplay'||generation!==fp.previewGeneration)return;fp.previewAt=Math.min(choice.previewStart||15000,audio.buffers[0].duration*1000/3);fp.previewEnd=choice.previewEnd||45000;audio.start(fp.previewAt);audio.music.gain.value=0.7;audio.voices.gain.value=0.7;fp.previewing=true;}catch(e){announce('Preview unavailable: '+e.message);}}
function playFreeplay(){const songs=freeplaySongs();if(!songs.length){announce('No songs match this filter.');return;}let index=fp.selectedId==='random'?SONGS.indexOf(songs[Math.floor(Math.random()*songs.length)]):SONGS.findIndex(s=>s.id===fp.selectedId);if(index<0)index=SONGS.indexOf(songs[0]);stopPreview();startSong(index,false);}
function toggleFavorite(){if(fp.selectedId==='random')return;fp.favorites.has(fp.selectedId)?fp.favorites.delete(fp.selectedId):fp.favorites.add(fp.selectedId);storage.set('favorites',[...fp.favorites]);audio.sfx('confirmMenu',0.45);if(!freeplaySongs().some(s=>s.id===fp.selectedId))selectFreeplay(freeplaySongs()[0]?.id||'random');announce('Favorites updated.');}
function freeplayAction(action,value){if(action==='song'){if(fp.selectedId===value)playFreeplay();else selectFreeplay(value);}if(action==='difficulty'){changeDifficulty(value);schedulePreview();}if(action==='filter'){fp.filter=value;selectFreeplay(freeplaySongs()[0]?.id||'random');}if(action==='favorite')toggleFavorite();if(action==='search')showSearch();if(action==='sort'){const values=['default','title','bpm','score'];fp.sort=values[(values.indexOf(fp.sort)+1)%values.length];audio.sfx('scrollMenu',0.4);}if(action==='preview'){if(fp.previewing){stopPreview();audio.playMenu();}else previewSong();}if(action==='album'){stopPreview();enter('album');}if(action==='back')back();}
function showSearch(){let panel=document.querySelector('#freeplay-search');if(!panel){panel=document.createElement('form');panel.id='freeplay-search';panel.innerHTML='<label for="freeplay-search-input">SEARCH SONGS</label><input id="freeplay-search-input" type="search" placeholder="Song title…" autocomplete="off"><button type="submit">Done</button><button type="button" data-clear>Clear</button>';document.querySelector('#game').append(panel);panel.addEventListener('submit',e=>{e.preventDefault();panel.hidden=true;canvas.focus();});panel.querySelector('[data-clear]').addEventListener('click',()=>{panel.querySelector('input').value='';fp.search='';selectFreeplay(freeplaySongs()[0]?.id||'random');});panel.querySelector('input').addEventListener('input',e=>{fp.search=e.target.value;fp.selectedId=freeplaySongs()[0]?.id||'random';});}panel.hidden=false;panel.querySelector('input').value=fp.search;panel.querySelector('input').focus();}
function chooseCharacter(index){fp.character=index?'pico':'bf';difficulty=1;storage.set('character',fp.character);enter('freeplay',songIndex);schedulePreview();}
function drawCharacterSelect(){const now=performance.now(),targets=characterSelect.draw(ctx,{now,volume:settings.volume,reducedMotion:settings.reducedMotion});for(const t of targets)newButton('cs-'+t.id,t.label,t.x,t.y,t.w,t.h,()=>{if(t.action==='slot')characterSelect.choose(t.value,now,true);else if(t.action==='back')characterSelect.cancel(now);else characterSelect.confirm(now);});const result=characterSelect.consumeResult();if(result){characterSelect.stop();fp.character=result.character;storage.set('character',fp.character);difficulty=1;if(!freeplaySongs().some(s=>s.id===SONGS[songIndex].id))songIndex=SONGS.indexOf(freeplaySongs()[0]);enter('freeplay',songIndex);}}

function drawInstrumental(){menuBackground('menuBGBlue');rect(180,100,920,500,'#000d');letters('instrumental',640,135,1,{align:'center'});const song=SONGS[songIndex],list=song.mod?modLibrary.instrumentals(song):variantCatalog.some(v=>v.baseSong===song.id&&v.variant==='pico')?['default','pico']:['default'];list.forEach((value,i)=>{const y=260+i*75;text((selected===i?'> ':'')+value.toUpperCase(),640,y,30,selected===i?'#80e9fa':'#aaa','center');newButton('instrument-'+i,value,250,y-15,780,65,()=>{fp.instrumental=value;enter('freeplay',songIndex);},{select:i});});footer();}

function drawAlbum(){menuBackground('menuBGBlue');rect(100,55,1080,580,'#000c');text('FRIDAY NIGHT FUNKIN OST VOL. 1',640,92,38,'#fff','center');text('KAWAI SPRITE',640,153,25,'#ffdb5f','center');modernFreeplay.image(ctx,'album',145,240,290,290);SONGS.filter(s=>s.week===SONGS[songIndex].week).slice(0,3).forEach((song,i)=>{text(song.name,560,260+i*100,32);text('PREVIEW / PLAY',1080,264+i*100,20,'#8ceafa','right');newButton('album-song-'+i,`Preview ${song.name}`,500,235+i*100,620,80,()=>{enter('freeplay',SONGS.indexOf(song));selectFreeplay(song.id);previewSong();});});footer();}
function optionValue(o){const v=settings[o.key];if(o.type==='toggle')return v?'ON':'OFF';if(o.key==='volume'||o.key==='sfxVolume'||o.key==='backgroundDim')return `${Math.round(v*100)}%`;if(o.key==='offset')return `${v>0?'+':''}${v} MS`;if(o.key==='scrollSpeed')return v.toFixed(1)+'X';return '>';} 
function changeOption(delta=1){const o=OPTIONS[selected];if(o.type==='toggle')settings[o.key]=!settings[o.key];else if(o.type==='range')settings[o.key]=Math.round(clamp(settings[o.key]+o.step*delta,o.min,o.max)*100)/100;else {if(o.key==='controls')enter('controls');if(o.key==='calibrate'){calibration=[];calibrationAt=audio.ctx?.currentTime||0;calibrationPlaying=false;enter('calibrate');}if(o.key==='reset'){Object.assign(settings,normalizeSettings(DEFAULT_SETTINGS));saveSettings();announce('Default settings restored.');}return;}saveSettings();audio.sfx('scrollMenu',0.35);announce(`${o.label}: ${optionValue(o)}`);}
function drawSettings(){
  menuBackground('menuDesat','#cf8ba8');rect(0,0,1280,125,'#000b');letters('options',640,28,1.1,{align:'center'});text('UP / DOWN: SELECT    LEFT / RIGHT: CHANGE    ENTER: TOGGLE',640,109,18,'#fff','center');
  const first=clamp(selected-3,0,OPTIONS.length-7);optionScroll+=(first*67-optionScroll)*Math.min(1,(frameTime-lastFrame)*0.016);if(settings.reducedMotion)optionScroll=first*67;
  ctx.save();ctx.beginPath();ctx.rect(0,148,1280,466);ctx.clip();OPTIONS.forEach((o,i)=>{const y=155+i*67-optionScroll;if(y<85||y>630)return;const active=i===selected;if(active)rect(115,y-7,1050,62,'#0007');text((active?'> ':'  ')+o.label.toUpperCase(),150,y+6,30,active?'#fff':'#ddd');text(optionValue(o),1108,y+6,30,active?'#ffdf62':'#bbb','right');if(y>=147&&y+55<=615){newButton('option-'+i,`${o.label}: ${optionValue(o)}`,120,y-5,850,61,()=>{selected=i;changeOption(1);},{select:i});if(o.type==='range')newButton('option-minus-'+i,`Decrease ${o.label}`,985,y-5,74,61,()=>{selected=i;changeOption(-1);});newButton('option-plus-'+i,`Increase or toggle ${o.label}`,1060,y-5,100,61,()=>{selected=i;changeOption(1);});}});ctx.restore();
  rect(0,626,1280,94,'#000c');text(OPTIONS[selected].description,640,643,21,'#fff','center');text('ESC: BACK  /  SETTINGS SAVE AUTOMATICALLY',640,688,18,'#aaa','center');newButton('options-back','Back to main menu',0,675,210,45,back);
}
function keyLabel(code){return code.replace('Key','').replace('Digit','').replace('Semicolon',';').replace('Quote',"'").replace('Comma',',').replace('Period','.').replace('Slash','/').replace('BracketLeft','[').replace('BracketRight',']');}
function drawControls(){menuBackground('menuDesat','#7ba8c4');letters('controls',640,45,1.1,{align:'center'});text('ARROW KEYS ALWAYS WORK',640,145,24,'#fff','center');DIRECTIONS.forEach((d,i)=>{const y=230+i*86;if(selected===i)rect(250,y-12,780,72,'#0008');drawNote(i,360,y-8,0.4,'static');text(d,445,y+3,32);text(rebind===i?'PRESS A KEY…':keyLabel(settings.keys[i]),930,y+3,32,rebind===i?'#ffdf62':'#fff','right');newButton('bind-'+i,`Bind ${d}, currently ${keyLabel(settings.keys[i])}`,250,y-12,780,72,()=>{selected=i;rebind=i;announce(`Press a key for ${d}. Escape cancels.`);},{select:i});});text('SELECT A DIRECTION AND PRESS ENTER, THEN PRESS YOUR NEW KEY',640,618,21,'#fff','center');footer('ESC: BACK / CANCEL       ENTER: REBIND');}
function drawCalibration(){menuBackground('menuDesat','#87bfc0');letters('calibrate',640,45,1,{align:'center'});text('TAP SPACE WITH THE BEAT',640,162,32,'#fff','center');text('Listen to at least eight beats. Enter applies the estimate.',640,217,23,'#ddd','center');const elapsed=audio.ctx?audio.ctx.currentTime-calibrationAt:0;const phase=(elapsed%0.5)/0.5;ctx.beginPath();ctx.arc(640,372,80+(calibrationPlaying?(1-phase)*18:0),0,Math.PI*2);ctx.fillStyle=calibrationPlaying&&phase<0.15?'#fff':'#e957ac';ctx.fill();text(calibrationPlaying?'TAP':'START',640,354,35,'#fff','center');if(calibration.length){const estimate=Math.round(calibration.reduce((a,b)=>a+b,0)/calibration.length);text(`${calibration.length} TAPS   /   OFFSET: ${estimate>0?'+':''}${estimate} MS`,640,522,28,'#fff','center');}newButton('tap','Tap to calibrate',490,280,300,210,calibrationTap);newButton('cal-apply','Apply calibration',390,560,500,70,applyCalibration);text('ENTER: APPLY     ESC: CANCEL',640,597,25,'#fff','center');footer('SPACE: TAP');}
function calibrationTap(){if(!calibrationPlaying){audio.menu?.pause();calibrationAt=audio.ctx.currentTime+0.5;calibrationPlaying=true;calibration=[];gameCalBeat=-1;return;}const elapsed=(audio.ctx.currentTime-calibrationAt)*1000;if(elapsed<0)return;const nearest=Math.round(elapsed/500)*500;calibration.push(clamp(Math.round(nearest-elapsed),-250,250));if(calibration.length>24)calibration.shift();}
function applyCalibration(){if(calibration.length<8){announce('Tap at least eight beats first.');return;}settings.offset=clamp(Math.round(calibration.reduce((a,b)=>a+b,0)/calibration.length/5)*5,-300,300);saveSettings();calibrationPlaying=false;enter('settings',5);}
let gameCalBeat=-1;
function drawCredits(){menuBackground('menuBGMagenta');rect(60,30,1160,652,'#000b');letters('friday night funkin',640,60,0.88,{align:'center'});text('THE ORIGINAL CREW',640,180,28,'#ff79b9','center');[['ninjamuffin99','Programming'],['PhantomArcade + evilsk8r','Art + animation'],['Kawai Sprite','Music']].forEach(([name,job],i)=>{text(name,640,238+i*78,32,'#fff','center');text(job,640,274+i*78,21,'#aaa','center');});text('Independent browser recreation — Weeks 1 and 2.',640,505,21,'#fff','center');text('Original art, music and charts credited to their creators.',640,539,21,'#bbb','center');text('SUPPORT THE ORIGINAL GAME',640,593,29,'#ffdc60','center');newButton('support','Support the original game on itch.io',330,575,620,68,()=>window.open('https://ninja-muffin24.itch.io/funkin','_blank','noopener,noreferrer'));footer();}

async function getChart(index,diff,character=fp.character){const choice=songChoice(index,diff,character),key=choice.chartUrl;if(!chartCache.has(key))chartCache.set(key,rawChoice(choice).then(parseChart));return chartCache.get(key);}
async function startSong(index,isStory=false,continueStory=false,override=null){
  const generation=++loadGeneration;songIndex=index;story=isStory;if(!continueStory){storyTotal=0;storyStats=[];}audio.stop();audio.stopMenu();enter('loading');errorText='';announce(`Loading ${SONGS[index].name}. ${DIFFICULTIES[difficulty]}.`);
  try{await audio.unlock();const choice=songChoice(index,difficulty,isStory?'bf':fp.character,isStory?'default':fp.instrumental);const [chart,originalDuration,modVisuals]=await Promise.all([override?Promise.resolve(parseChart(override.raw)):getChart(index,difficulty,choice.character),prepareChoice(choice),choice.mod?modLibrary.getVisuals(choice,assets):Promise.resolve(null),audio.warmEffects()]);if(generation!==loadGeneration)return;
    if(override?.audio)for(const i of [0,1])if(override.audio[i])audio.buffers[i]=override.audio[i];const duration=originalDuration;
    const notes=chart.notes.map(n=>({...n,hit:false,missed:false,holdDone:0,holdBroken:false,started:false}));game={chart,notes,duration,modVisuals,eventIndex:0,eventFocus:null,eventZoom:1,eventScroll:1,eventBop:{},lastLightning:-30,lightningAt:-99999,lightningDelay:8,stats:makeStats(),opponentIndex:0,scanIndex:0,startTime:-60000/chart.bpm*5,time:-60000/chart.bpm*5,beat:-6,lastBeat:-6,rating:null,particles:[],completed:false,chartPlayer:chart.sections[0]?.player||false,practice:settings.practice,botplay:settings.botplay,custom:!!override,override,choice,character:choice.character,frameTimes:[]};
    actorBF={direction:'idle',since:0,until:0};actorDad={direction:'idle',since:0,until:0};held.clear();laneFlashes.fill(0);opponentFlashes.fill(0);lastCountdown=-99;enter('play');audio.start(game.startTime);announce(`${SONGS[index].name}. ${DIFFICULTIES[difficulty]}. Get ready.`);
  }catch(e){if(generation!==loadGeneration)return;errorText=e.message;announce('Loading failed. '+e.message);console.error(e);}
}
async function openChartEditor(){
  if(scene==='editor'||scene==='loading')return;if(scene==='play')audio.pause();audio.stop();audio.stopMenu();loadGeneration++;const index=scene==='freeplay'?songIndex:songIndex;
  if(!chartEditor)chartEditor=new ChartEditor({audio,assets,onExit:()=>{game=null;enter('freeplay',songIndex);},onTest:(raw,index,diff,customAudio)=>{difficulty=diff;startSong(index,false,false,{raw,audio:customAudio});},loadOriginal:getChart,prepareAudio:(index,diff)=>prepareChoice(songChoice(index,diff))});
  const keep=game?.custom&&chartEditor.index===index&&chartEditor.diff===difficulty;enter('editor');announce('Chart editor. Space plays audio, Enter tests the chart, 7 returns to freeplay.');
  try{const raw=await rawChoice(songChoice(index));chartEditor.character=fp.character;await chartEditor.open(index,difficulty,raw,{keep});}catch(e){errorText=e.message;enter('freeplay',index);announce('Could not open editor: '+e.message);}
}
function pauseGame(){if(scene!=='play'||!game)return;audio.pause();enter('paused');audio.sfx('scrollMenu',0.5);announce('Paused. Resume, Restart Song, or Exit to Menu.');}
function resumeGame(){if(scene!=='paused'||!game)return;enter('play');audio.resume();}
function exitSong(){loadGeneration++;audio.stop();audio.stopMenu();game=null;enter(story?'story':'freeplay',story?0:songIndex);}
function retrySong(){const override=game?.override;audio.stopMenu();startSong(songIndex,story,story,override);}
function animateActor(actor,lane,time,miss=false){actor.direction=DIRECTIONS[lane]+(miss?'miss':'');actor.since=time;actor.until=time+Math.max(150,60000/(game?.chart.bpm||100)*0.65);}
function laneHeld(lane){return held.has(settings.keys[lane])||held.has('Arrow'+DIRECTIONS[lane][0]+DIRECTIONS[lane].slice(1).toLowerCase())||held.has('touch'+lane);}
function laneFromCode(code){const arrow=['ArrowLeft','ArrowDown','ArrowUp','ArrowRight'].indexOf(code);return arrow>=0?arrow:settings.keys.indexOf(code);}
function hit(note,time,auto=false){note.hit=true;note.started=true;const delta=time-note.time;const j=applyHit(game.stats,delta);if(!j)return;laneFlashes[note.lane]=frameTime+145;animateActor(actorBF,note.lane,time);audio.muteVoices(false);game.rating={name:j.name,since:frameTime,combo:game.stats.combo,delta};if(j.name==='sick'&&!settings.reducedMotion){for(let i=0;i<7;i++)game.particles.push({x:laneX(note.lane,true)+55,y:receptorY()+55,vx:(Math.random()-0.5)*220,vy:(Math.random()-0.5)*220,life:0.35,color:COLORS[note.lane]});}}
function miss(note,time){if(note?.missed)return;if(note)note.missed=true;applyMiss(game.stats);audio.muteVoices(true);game.rating={name:'miss',since:frameTime,combo:0,delta:0};if(note)animateActor(actorBF,note.lane,time,true);audio.sfx('missnote'+(1+Math.floor(Math.random()*3)),0.12);}
function pressLane(lane){if(scene!=='play'||!game)return;const time=audio.time()+settings.offset;if(time<-HIT_WINDOW)return;laneFlashes[lane]=frameTime+80;if(game.botplay)return;const note=nearestNote(game.notes,lane,time);if(note)hit(note,time);else if(!settings.ghostTapping&&time>0)miss(null,time);}
function updateSongEvents(time){updateChartEvents(game,time,{bpm:bpmAt(game.chart,time),animate:(target,prefix,since)=>{const actor=['bf','boyfriend','player'].includes(target)?actorBF:actorDad;actor.forced={prefix,since,until:since+1200};}});}
function updateGame(dt){
  if(!game)return;const time=game.time=audio.time()+settings.offset;const beat=beatAt(game.chart,time);game.beat=beat;updateSongEvents(time);
  const count=Math.floor(time/(60000/game.chart.bpm));if(time<0&&count!==lastCountdown){lastCountdown=count;const sound={[-4]:'intro3',[-3]:'intro2',[-2]:'intro1',[-1]:'introGo'}[count];if(sound)audio.sfx(sound,0.7);}
  const currentBeat=Math.floor(beat);if(currentBeat!==game.lastBeat){game.lastBeat=currentBeat;if(!settings.reducedMotion&&currentBeat>=0&&(currentBeat-(game.bopOffset||0))%(game.bopRate||4)===0)game.cameraBump=0.013*(game.bopIntensity??1);if(actorBF.until<time)actorBF={direction:'idle',since:time,until:time};if(actorDad.until<time)actorDad={direction:'idle',since:time,until:time};}
  if(SONGS[songIndex].week===2&&Math.floor(beat)!==game.lightningBeat){game.lightningBeat=Math.floor(beat);if((SONGS[songIndex].id==='spookeez'&&Math.floor(beat)===4)||(beat>game.lastLightning+game.lightningDelay&&Math.random()<0.1)){game.lightningAt=time;game.lastLightning=beat;game.lightningDelay=8+Math.random()*16;if(Math.floor(beat)!==4)audio.sfx(Math.random()<0.5?'thunder_1':'thunder_2',0.7);}}
  game.cameraBump=Math.max(0,(game.cameraBump||0)-dt*0.045);
  const section=game.chart.sections.find(s=>time>=s.start&&time<s.end);if(section)game.chartPlayer=section.player;
  const notes=game.notes;for(let i=game.scanIndex;i<notes.length;i++){const n=notes[i];if(n.time>time+HIT_WINDOW)break;
    if(!n.player){if(!n.hit&&n.time<=time){n.hit=true;opponentFlashes[n.lane]=frameTime+160;animateActor(actorDad,n.lane,time);actorDad.until=Math.max(actorDad.until,n.time+n.length);audio.muteVoices(false);}continue;}
    if(!n.hit&&!n.missed){if(game.botplay&&n.time<=time)hit(n,n.time,true);else if(time-n.time>HIT_WINDOW)miss(n,time);}
    if(n.hit&&n.length>0&&!n.holdBroken){const elapsed=clamp(time-n.time,0,n.length);const tick=60000/game.chart.bpm/4;const covered=Math.floor(elapsed/tick);if(time>n.time+80&&time<n.time+n.length-40&&!laneHeld(n.lane)&&!game.botplay){n.holdBroken=true;missHold(n,time);}else if(covered>n.holdDone&&(laneHeld(n.lane)||game.botplay)){game.stats.score+=(covered-n.holdDone)*10;game.stats.holdTicks+=covered-n.holdDone;game.stats.health=clamp(game.stats.health+(covered-n.holdDone)*0.004,0,2);n.holdDone=covered;laneFlashes[n.lane]=frameTime+80;animateActor(actorBF,n.lane,time);}}
  }
  while(game.scanIndex<notes.length&&notes[game.scanIndex].time+notes[game.scanIndex].length<time-300)game.scanIndex++;
  for(const p of game.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}game.particles=game.particles.filter(p=>p.life>0);
  if(game.stats.health<=0&&!game.practice&&!game.botplay){gameOver();return;}
  if(audio.time()>=game.duration-35&&!game.completed)finishSong();
}
function missHold(note,time){applyMiss(game.stats);audio.muteVoices(true);game.rating={name:'miss',since:frameTime,combo:0,delta:0};}
function gameOver(){audio.stop();audio.sfx('fnf_loss_sfx');enter('gameover');setTimeout(()=>{if(scene==='gameover')audio.playMenu('gameOver');},1200);announce('Game over. Enter to retry. Escape for menu.');}
function finishSong(){
  game.completed=true;audio.stop();const s=game.stats;const legitimate=!game.practice&&!game.botplay&&!game.custom;
  if(legitimate){const old=bestFor(songIndex,game.character,difficulty);if(!old||s.score>old.score)storage.set(scoreKey(songIndex,game.character,difficulty),{score:s.score,accuracy:accuracy(s),rank:rank(s),misses:s.misses});}
  if(story){storyTotal+=s.score;storyStats.push(structuredClone(s));const list=WEEKS[storyWeek].songs,i=list.indexOf(SONGS[songIndex].id);if(i<list.length-1){startSong(SONGS.findIndex(s=>s.id===list[i+1]),true,true);return;}if(legitimate&&storyTotal>storage.get('week:'+WEEKS[storyWeek].id+':'+difficulty,0))storage.set('week:'+WEEKS[storyWeek].id+':'+difficulty,storyTotal);}
  enter('results');audio.playMenu('breakfast');announce(`${story?'Week '+WEEKS[storyWeek].id:SONGS[songIndex].name} complete. Score ${story?storyTotal:s.score}. Accuracy ${accuracy(s).toFixed(2)} percent.`);
}
function laneX(lane,player){if(settings.middlescroll)return player?416+lane*112:-600;return (player?732:92)+lane*112;}
function receptorY(){return settings.downscroll?565:50;}
function drawNote(lane,x,y,scale=0.7,state='note',time=0,alpha=1){let prefix=NOTE_PREFIX[lane];if(state==='static')prefix='arrow'+DIRECTIONS[lane];if(state==='press')prefix=DIRECTIONS[lane].toLowerCase()+' press';if(state==='confirm')prefix=DIRECTIONS[lane].toLowerCase()+' confirm';const f=assets.frames('NOTE_assets',prefix);if(!f.length)return;const frame=f[state==='confirm'?clamp(Math.floor(time/1000*24),0,f.length-1):0];const fw=(frame.frameWidth||frame.width)*scale,fh=(frame.frameHeight||frame.height)*scale;assets.draw(ctx,'NOTE_assets',frame,x+(112-fw)/2,y+(112-fh)/2,scale,alpha);}
function drawHold(lane,x,start,end,alpha){
  const names=['purple','blue','green','red'],body=assets.frame('NOTE_assets',names[lane]+' hold piece'),tip=assets.frame('NOTE_assets',lane===0?'pruple end hold':names[lane]+' hold end');if(!body||!tip)return;
  const direction=end>=start?1:-1,length=Math.abs(end-start),img=assets.images.NOTE_assets,width=body.width*0.7,cap=Math.min(tip.height*0.7,length);
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,start);ctx.scale(1,direction);if(length>cap)ctx.drawImage(img,body.x,body.y,body.width,body.height,-width/2,0,width,length-cap);ctx.drawImage(img,tip.x,tip.y,tip.width,tip.height,-width/2,length-cap,width,cap);ctx.restore();
}
function icon(character,x,y,scale=0.65,losing=false,flip=false){const img=assets.images.iconGrid,index=(character==='dad'?12:character==='spooky'?2:character==='monster'?19:character==='pico'?4:0)+(losing?1:0),sx=(index%10)*150,sy=Math.floor(index/10)*150;ctx.save();if(flip){ctx.translate(x+150*scale,y);ctx.scale(-1,1);ctx.drawImage(img,sx,sy,150,150,0,0,150*scale,150*scale);}else ctx.drawImage(img,sx,sy,150,150,x,y,150*scale,150*scale);ctx.restore();}
function drawActor(name,actor,x,y,scale,time){const bf=name==='BOYFRIEND',idle=actor.direction==='idle'||time>actor.until,direction=idle?'idle':actor.direction;
 const prefix=name==='PICO'?(idle?'Pico idle':'Pico '+direction.replace('miss','')+(direction.endsWith('miss')?'miss':'0')):name.startsWith('SPOOKY')?(idle?'Spooky idle':'Spooky '+direction.replace('miss','')):name==='MONSTER'?(idle?'Monster idle0':'Monster '+direction.replace('miss','')+'0'):bf?(idle?'BF idle dance':'BF NOTE '+direction.replace('miss','')+(direction.endsWith('miss')?' MISS':'0')):(idle?'Dad idle dance':'Dad Sing Note '+direction);
 const offsets=name==='PICO'?[19,1]:name.startsWith('SPOOKY')||name==='MONSTER'?[0,0]:(bf?BF_OFFSETS:DAD_OFFSETS)[direction.replace('miss','')]||[0,0],bpm=bpmAt(game.chart,time),period=game.eventBop[bf||name==='PICO'?'player':'opponent']||dancePeriod(bpm),phase=idle?((game.beat%period+period)%period)*60000/bpm:Math.max(0,time-actor.since);
 if(actor.forced&&time<actor.forced.until){animation(name,actor.forced.prefix,x,y,scale,time-actor.forced.since,{loop:false});return;}
 if(bf&&time-game.lightningAt>=0&&time-game.lightningAt<550){animation('BF_FEAR','BF scared',x,y,scale,time-game.lightningAt,{loop:false});return;}
 animation(name,prefix,x-offsets[0]*scale,y-offsets[1]*scale,scale,settings.reducedMotion&&idle?0:phase,{loop:false});
}

function drawStage(time){
 rect(0,0,1280,720,'#19131b');ctx.save();const bump=(game.eventZoom||1)+(game.cameraBump||0);ctx.translate(640,360);ctx.scale(bump,bump);ctx.translate(-640,-360);
 const follow=(game.eventFocus??game.chartPlayer)?1:-1;game.cameraX=(game.cameraX||0)+(follow*18-(game.cameraX||0))*0.025;const pan=settings.reducedMotion?0:game.cameraX,week2=SONGS[songIndex].week===2,modern=game.choice.variant==='erect'||game.character==='pico',custom=game.modVisuals,beat=game.beat,bpm=bpmAt(game.chart,time),phase=((beat%2+2)%2)*60000/bpm,flashAge=time-game.lightningAt;
 if(custom?.stage)drawModStageProps(ctx,assets,custom.stage,{time,pan});
 else if(week2){if(modern){const light=flashAge>=0&&flashAge<1600?Math.max(0,1-flashAge/1600):0;animation('WEEK2_TREES','bgtrees',180-pan*0.8,2,0.75,time,{fps:5,loop:true});image('week2-bgDark',-390-pan,-200,1838,938);if(light)image('week2-bgLight',-390-pan,-200,1838,938,light);}else animation('HALLOWEEN',flashAge>=0&&flashAge<1250?'Halloween lightning':'Halloween idle',-276-pan,-459,0.8,flashAge>=0&&flashAge<1250?flashAge:time,{fps:24,loop:flashAge<0||flashAge>=1250});}
 else if(modern){image('erect-bg',-230-pan,-170,1696,866);const server=assets.images['erect-server'];image('erect-server',-130-pan,280,server.width*0.62,server.height*0.62);}else{image('stageback',-234-pan*0.9,-185,1707,960);image('stagefront',-270-pan*0.9,466,1848,305);}
 const positions=week2?(modern?{dad:[316,614],bf:[967,629],gf:[646,565]}:{dad:[346,637],bf:[831,653],gf:[641,575]}):modern?{dad:[270,629],bf:[973,644],gf:[616,576]}:{dad:[324,609],bf:[1043,639],gf:[688,553]};
 const originalStageChars=custom?.stage?.metadata.characters,stageChars=originalStageChars?{opponent:originalStageChars.opponent||originalStageChars.dad,player:originalStageChars.player||originalStageChars.bf,girlfriend:originalStageChars.girlfriend||originalStageChars.gf}:null;for(const role of ['opponent','player','girlfriend'])if(stageChars?.[role]?.position){const p=stageChars[role].position;positions[role==='opponent'?'dad':role==='player'?'bf':'gf']=[180+p[0]*0.72,-20+p[1]*0.72];}
 const drawCustom=(role,actor,position)=>{const config=custom?.characters[role];if(!config)return false;const idle=!actor||actor.direction==='idle'||time>actor.until,p=dancePeriod(bpm);drawModCharacter(ctx,assets,config,{x:position[0]-pan,y:position[1],scale:0.65*(stageChars?.[role]?.scale||1),direction:idle?'idle':actor.direction,time:idle?((beat%p+p)%p)*60000/bpm:time-actor.since,beat,bopBeats:p,player:role==='player'});return true;};
 if(!drawCustom('girlfriend',null,positions.gf)){if(game.character==='pico'){const scale=0.62,neneX=positions.gf[0]-195.3-pan,neneY=positions.gf[1]-405.5;drawABot(ctx,assets,audio,{neneX,neneY,scale,time});animation('NENE','Nene idle',neneX,neneY,scale,settings.reducedMotion?0:phase,{loop:true});}else if(modern||week2){const atlas=modern?'GF_DARK':'GF_MODERN',prefix=(modern?'GF dark':'GF modern')+(flashAge>=0&&flashAge<550?' scared':' idle');animation(atlas,prefix,positions.gf[0]-698*0.62/2-pan,positions.gf[1]-637*0.62,0.62,flashAge>=0&&flashAge<550?flashAge:settings.reducedMotion?0:phase,{loop:true});}else{const frames=assets.frames('GF_assets','GF Dancing Beat0'),idx=(Math.floor(beat)%2===0?0:15)+Math.min(14,Math.floor((phase%(60000/bpm))*24/1000));assets.draw(ctx,'GF_assets',frames[idx],472-pan,158,0.62);}}
 if(!drawCustom('opponent',actorDad,positions.dad)){const id=game.choice.opponent||SONGS[songIndex].opponent||'dad',name=id.includes('monster')?'MONSTER':id.includes('spooky')?(modern?'SPOOKY_DARK':'SPOOKY'):'DADDY_DEAREST',s=name==='DADDY_DEAREST'?0.71:0.7,w=name==='MONSTER'?426:name.startsWith('SPOOKY')?492:426,h=name==='MONSTER'?637:name.startsWith('SPOOKY')?549:767;drawActor(name,actorDad,positions.dad[0]-w*s/2-pan,positions.dad[1]-h*s,s,time);}
 if(!drawCustom('player',actorBF,positions.bf)){const pico=game.character==='pico',s=pico?0.64:0.66;drawActor(pico?'PICO':'BOYFRIEND',actorBF,positions.bf[0]-(pico?500:412)*s/2-pan,positions.bf[1]-(pico?500:412)*s,s,time);}
 if(custom?.stage)drawModStageProps(ctx,assets,custom.stage,{foreground:true,time,pan});else if(week2&&modern){image('week2-stairsDark',754.5-pan,-203.75,862.5,937.5);if(flashAge>=0&&flashAge<1600)image('week2-stairsLight',754.5-pan,-203.75,862.5,937.5,Math.max(0,1-flashAge/1600));}else if(!week2&&!modern)image('stagecurtains',-250-pan*1.3,-175,1770,624);
 ctx.restore();if(settings.backgroundDim)rect(0,0,1280,720,`rgba(0,0,0,${settings.backgroundDim})`);
}

function drawGameplay(){
  if(!game)return;const time=game.time;drawStage(time);const y=receptorY(),sign=settings.downscroll?-1:1,speed=0.45*game.chart.speed*settings.scrollSpeed*(game.eventScroll||1);
  if(settings.middlescroll)rect(405,0,470,720,'#0003');
  // Hold tails render below note heads. Clip them at the receptor after a hit.
  ctx.save();ctx.beginPath();ctx.rect(0,0,1280,720);ctx.clip();for(let i=game.scanIndex;i<game.notes.length;i++){const n=game.notes[i];const pos=y+(n.time-time)*speed*sign;if((!settings.downscroll&&pos>850)||(settings.downscroll&&pos<-160))break;if(settings.middlescroll&&!n.player)continue;const end=y+(n.time+n.length-time)*speed*sign;if(n.length>0&&!(n.hit&&time>n.time+n.length)){const start=n.hit&&!n.holdBroken?y+56:pos+56,finish=end+56;if(Math.max(start,finish)>-100&&Math.min(start,finish)<820)drawHold(n.lane,laneX(n.lane,n.player)+56,start,finish,n.missed||n.holdBroken?0.25:n.player?0.72:0.52);}}ctx.restore();
  for(const player of [false,true]){if(!player&&settings.middlescroll)continue;for(let lane=0;lane<4;lane++){const until=(player?laneFlashes:opponentFlashes)[lane];const confirm=until>frameTime;const press=player&&laneHeld(lane);drawNote(lane,laneX(lane,player),y,0.7,confirm?'confirm':press?'press':'static',confirm?145-(until-frameTime):0,player?1:0.8);}}
  for(let i=game.scanIndex;i<game.notes.length;i++){const n=game.notes[i];const pos=y+(n.time-time)*speed*sign;if((!settings.downscroll&&pos>850)||(settings.downscroll&&pos<-160))break;if(n.hit||n.missed||(!n.player&&settings.middlescroll)||pos<-160||pos>850)continue;drawNote(n.lane,laneX(n.lane,n.player),pos,0.7,'note',0,n.player?1:0.85);}
  for(const p of game.particles){ctx.globalAlpha=clamp(p.life/0.35,0,1);rect(p.x-4,p.y-4,8,8,p.color);}ctx.globalAlpha=1;
  if(game.rating){const r=game.rating,age=(frameTime-r.since)/1000;if(age<0.7){const alpha=clamp((0.7-age)*4,0,1),rise=settings.reducedMotion?0:age*35;ctx.save();ctx.globalAlpha=alpha;if(r.name==='miss')text('MISS',640,310-rise,40,'#d271eb','center');else{const img=assets.images[r.name];image(r.name,640-img.width*0.52/2,290-rise,img.width*0.52,img.height*0.52);text(String(r.combo).padStart(3,'0'),640,356-rise,35,'#fff','center');}ctx.restore();}}
  const healthY=settings.downscroll?27:650;rect(338,healthY,604,22,'#000');rect(343,healthY+5,594,12,'#ff0000');const hp=game.stats.health/2;rect(343+594*(1-hp),healthY+5,594*hp,12,'#66ff33');const boundary=343+594*(1-hp),pulse=settings.reducedMotion?1:1+Math.max(0,1-(game.beat%1)*4)*0.1;icon(game.eventHealthIcon?.opponent||game.choice.opponent||'dad',boundary-90*pulse,healthY-42,0.6*pulse,game.stats.health>1.6);icon(game.eventHealthIcon?.player||(game?.character==='pico'?'pico':'bf'),boundary-10,healthY-42,0.6*pulse,game.stats.health<0.4,true);
  text(`Score: ${game.stats.score}  |  Misses: ${game.stats.misses}  |  Accuracy: ${accuracy(game.stats).toFixed(2)}%`,640,settings.downscroll?7:690,19,'#fff','center',2);
  if(time>=0){const remaining=Math.max(0,Math.ceil((game.duration-audio.time())/1000));text(`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`,640,settings.downscroll?678:12,18,'#fff','center',2);}
  text(`${SONGS[songIndex].name} - ${DIFFICULTIES[difficulty]}`,15,settings.downscroll?690:14,16,'#ddd','left',2);
  if(game.practice||game.botplay)text(game.botplay?'BOTPLAY':'PRACTICE MODE',640,settings.downscroll?85:172,25,'#fff','center');
  const beatms=60000/game.chart.bpm;if(time<0){const count=Math.floor(time/beatms);const name={[-3]:'ready',[-2]:'set',[-1]:'go'}[count];if(name){const img=assets.images[name];const alpha=settings.reducedMotion?1:clamp(1-(time/beatms-count)*0.8,0,1);image(name,640-img.width*0.65/2,360-img.height*0.65/2,img.width*0.65,img.height*0.65,alpha);}}
  // Full-height transparent touch lanes preserve the original game screen.
  for(let lane=0;lane<4;lane++)newButton('lane-'+lane,`${DIRECTIONS[lane]} note (${keyLabel(settings.keys[lane])})`,laneX(lane,true),180,112,440,()=>{}, {lane});
  newButton('pause','Pause game',1180,0,100,70,pauseGame);text('II',1248,18,27,'#fff','center',2);
}
function drawPaused(){drawGameplay();buttons=[];rect(0,0,1280,720,'#000b');text(SONGS[songIndex].name,1255,22,32,'#fff','right');text(DIFFICULTIES[difficulty],1255,65,25,'#ddd','right');['resume','restart song','exit to menu'].forEach((label,i)=>{const y=202+i*130;letters(label,selected===i?160:110,y,1.04,{alpha:selected===i?1:0.55});newButton('pause-'+i,label,90,y-18,950,105,()=>{selected=i;choosePaused();},{select:i});});footer('UP / DOWN: SELECT      ENTER: CONFIRM      ESC: RESUME');}
function choosePaused(){if(selected===0)resumeGame();if(selected===1)retrySong();if(selected===2)exitSong();}
function drawGameOver(){rect(0,0,1280,720,'#000');const elapsed=frameTime-sceneAt,pico=game?.character==='pico',deathTime=pico?2000:1200;ctx.save();animation(pico?'PICO':'BOYFRIEND',pico?(elapsed<deathTime?'Pico dies':'Pico Dead Loop'):(elapsed<deathTime?'BF dies':'BF Dead Loop'),pico?425:485,210,0.86,elapsed<deathTime?elapsed:elapsed-deathTime,{loop:elapsed>=deathTime});ctx.restore();if(elapsed>1100){letters('retry',640,100,1.4,{align:'center'});text('ENTER TO RETRY',640,618,30,'#fff','center');text('ESC TO RETURN',640,669,20,'#999','center');newButton('retry','Retry song',0,0,1280,640,retrySong);newButton('gameover-exit','Return to menu',380,648,520,70,exitSong);}}
function drawResults(){menuBackground('menuBGBlue');rect(95,40,1090,635,'#000c');letters(story?'week clear':'song clear',640,69,1.05,{align:'center'});text(story?'WEEK '+WEEKS[storyWeek].id+' — '+WEEKS[storyWeek].name:SONGS[songIndex].name.toUpperCase(),640,168,30,'#ffde5e','center');const stats=story?combinedStats():game.stats;const rows=[['SCORE',story?storyTotal:stats.score],['ACCURACY',accuracy(stats).toFixed(2)+'%'],['MAX COMBO',stats.maxCombo],['MISSES',stats.misses],['RANK',rank(stats)]];rows.forEach(([label,value],i)=>{text(label,320,235+i*56,29,'#bbb');text(String(value),960,235+i*56,32,'#fff','right');});text(`SICK ${stats.judgements.sick}    GOOD ${stats.judgements.good}    BAD ${stats.judgements.bad}    SHIT ${stats.judgements.shit}`,640,537,20,'#ddd','center');if(game.practice||game.botplay)text('PRACTICE / AUTOPLAY — SCORE NOT SAVED',640,581,20,'#ffda60','center');text('ENTER: CONTINUE     R: PLAY AGAIN',640,624,25,'#fff','center');newButton('results-continue','Continue to song selection',170,600,625,70,()=>{audio.stopMenu();enter(story?'story':'freeplay',story?0:songIndex);});newButton('results-replay','Play again',840,600,300,70,()=>startSong(story?weekStart():songIndex,story));}
function combinedStats(){const all=makeStats();all.health=1;all.hits=0;all.misses=0;all.weight=0;for(const s of storyStats){all.score+=s.score;all.hits+=s.hits;all.misses+=s.misses;all.weight+=s.weight;all.maxCombo=Math.max(all.maxCombo,s.maxCombo);for(const k in all.judgements)all.judgements[k]+=s.judgements[k];}return all;}
function drawLoading(){rect(0,0,1280,720,'#000');letters(errorText?'oops':'loading',640,270,1.4,{align:'center'});text(errorText||`${SONGS[songIndex].name.toUpperCase()}  /  ${DIFFICULTIES[difficulty].toUpperCase()}`,640,420,26,'#fff','center');if(errorText){text('ENTER: RETRY     ESC: BACK',640,500,24,'#ff8dc8','center');newButton('load-retry','Retry loading song',200,450,880,120,()=>startSong(songIndex,story,story));}else text('GETTING THE STAGE READY'+'.'.repeat(Math.floor(frameTime/300)%4),640,483,20,'#888','center');newButton('load-back','Cancel loading',0,650,220,70,back);text('ESC: BACK',24,686,20);}

function navigate(delta){if(scene==='story'){storyWeek=(storyWeek+delta+WEEKS.length)%WEEKS.length;audio.sfx('scrollMenu',0.5);return;}if(scene==='freeplay'){const rows=freeplayRows(),i=rows.findIndex(s=>s.id===fp.selectedId);selectFreeplay(rows[(i+delta+rows.length)%rows.length].id);return;}const length=scene==='menu'?5:scene==='settings'?OPTIONS.length:scene==='controls'?4:scene==='paused'?3:scene==='character'||scene==='instrumental'?2:1;selected=(selected+delta+length)%length;audio.sfx('scrollMenu',0.5);announce(scene==='settings'?`${OPTIONS[selected].label}: ${optionValue(OPTIONS[selected])}`:'');}
function confirm(){if(scene==='title'){audio.sfx('confirmMenu');enter('menu');}else if(scene==='menu')openMenuChoice();else if(scene==='story')startSong(weekStart(),true);else if(scene==='freeplay')playFreeplay();else if(scene==='character')chooseCharacter(selected);else if(scene==='instrumental'){fp.instrumental=selected?'pico':'default';enter('freeplay',songIndex);}else if(scene==='settings')changeOption(1);else if(scene==='controls'){rebind=selected;announce('Press a new key. Escape cancels.');}else if(scene==='calibrate')applyCalibration();else if(scene==='paused')choosePaused();else if(scene==='gameover')retrySong();else if(scene==='results'){audio.stopMenu();enter(story?'story':'freeplay',story?0:songIndex);}else if(scene==='loading'&&errorText)startSong(songIndex,story,story);}
document.addEventListener('keydown',async e=>{
  if(scene==='editor'||scene==='mods')return;
  if(scene==='character'){e.preventDefault();if(!e.repeat)characterSelect.handleKey(e.code,performance.now());return;}
  if((scene==='menu'||scene==='freeplay')&&e.code==='KeyM'){e.preventDefault();openMods();return;}
  if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)){if(e.code==='Escape'){const panel=document.querySelector('#freeplay-search');if(panel)panel.hidden=true;canvas.focus();}return;}
  if(scene==='freeplay'&&e.ctrlKey&&e.code==='KeyF'){e.preventDefault();showSearch();return;}
  if(scene==='freeplay'&&e.code==='Tab'){e.preventDefault();beginCharacterSelection();return;}
  if(scene==='freeplay'&&e.code==='KeyI'){e.preventDefault();enter('instrumental',fp.instrumental==='pico'?1:0);return;}
  if(scene==='freeplay'&&e.code==='KeyF'){e.preventDefault();toggleFavorite();return;}
  if(scene==='freeplay'&&e.code==='Space'){e.preventDefault();if(fp.previewing){stopPreview();audio.playMenu();}else previewSong();return;}
  if(scene==='freeplay'&&(e.code==='Home'||e.code==='End')){e.preventDefault();const rows=freeplayRows();selectFreeplay(rows[e.code==='Home'?0:rows.length-1].id);return;}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.code==='Tab')return;
  const controlled=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Escape','Space','Backspace','KeyW','KeyA','KeyS','KeyD',...settings.keys];if(controlled.includes(e.code)||rebind>=0)e.preventDefault();
  if(e.repeat)return;
  if(!audio.ctx||audio.ctx.state==='suspended')audio.unlock().then(()=>{if(!['play','paused','loading','gameover','results','character','mods'].includes(scene))audio.playMenu();}).catch(()=>{});
  if(rebind>=0){if(e.code==='Escape'){rebind=-1;return;}if(e.code==='Digit7'){announce('7 is reserved for the chart editor.');return;}const candidate=[...settings.keys];const old=candidate[rebind],existing=candidate.indexOf(e.code);if(existing>=0)candidate[existing]=old;candidate[rebind]=e.code;const normalized=normalizeSettings({...settings,keys:candidate});if(normalized.keys[rebind]===e.code){settings.keys=candidate;saveSettings();announce('Key saved.');rebind=-1;audio.sfx('confirmMenu',0.5);}else announce('Use a letter, number or punctuation key.');return;}
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
canvas.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}));
document.querySelector('#game').addEventListener('wheel',e=>{if(scene==='settings'||scene==='freeplay'){e.preventDefault();if(Math.abs(e.deltaY)>5)navigate(Math.sign(e.deltaY));}},{passive:false});
function tick(timestamp){frameTime=timestamp;const dt=clamp((timestamp-(lastFrame||timestamp))/1000,0,0.1);buttons=[];
  if(scene==='editor'||scene==='mods'){syncButtons();canvas.dataset.scene=scene;lastFrame=timestamp;scheduleFrame();return;}
  if(scene==='play'&&game&&lastFrame&&game.time>1000){game.frameTimes.push(timestamp-lastFrame);if(game.frameTimes.length>180)game.frameTimes.shift();}
  if(game&&Math.floor(timestamp/1000)!==Math.floor(lastFrame/1000)){const times=[...game.frameTimes].sort((a,b)=>a-b);canvas.dataset.frameP95=String(Math.round(times[Math.floor(times.length*0.95)]||0));canvas.dataset.frameMax=String(Math.round(times.at(-1)||0));canvas.dataset.character=game.character;canvas.dataset.level=game.choice.level;canvas.dataset.bpm=String(game.chart.bpm);}
  if(scene==='play')updateGame(dt);
  if(scene==='calibrate'&&calibrationPlaying){const beat=Math.floor((audio.ctx.currentTime-calibrationAt)/0.5);if(beat>=0&&beat!==gameCalBeat){gameCalBeat=beat;const osc=audio.ctx.createOscillator(),gain=audio.ctx.createGain();osc.frequency.value=beat%4===0?1100:800;gain.gain.setValueAtTime(0.3,audio.ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,audio.ctx.currentTime+0.07);osc.connect(gain);gain.connect(audio.fx);osc.start();osc.stop(audio.ctx.currentTime+0.075);}}
  ctx.clearRect(0,0,1280,720);switch(scene){case'title':drawTitle();break;case'menu':drawMenu();break;case'story':drawStory();break;case'freeplay':drawFreeplay();break;case'character':drawCharacterSelect();break;case'instrumental':drawInstrumental();break;case'album':drawAlbum();break;case'settings':drawSettings();break;case'controls':drawControls();break;case'calibrate':drawCalibration();break;case'credits':drawCredits();break;case'loading':drawLoading();break;case'play':drawGameplay();break;case'paused':drawPaused();break;case'gameover':drawGameOver();break;case'results':drawResults();break;}
  sceneTransitions.draw(ctx,timestamp);if(transition>0){transition=Math.max(0,transition-dt);rect(0,0,1280,720,`rgba(0,0,0,${transition/0.22})`);}syncButtons();if(Math.floor(timestamp/250)!==Math.floor(lastFrame/250)){canvas.dataset.scene=scene;canvas.dataset.song=SONGS[songIndex].id;canvas.dataset.time=String(Math.round(game?.time||0));canvas.dataset.score=String(game?.stats.score||0);canvas.dataset.misses=String(game?.stats.misses||0);canvas.dataset.duration=String(Math.round(game?.duration||0));canvas.dataset.audioState=audio.ctx?.state||'idle';canvas.dataset.mode=game?.botplay?'autoplay':game?.practice?'practice':'standard';}lastFrame=timestamp;scheduleFrame();
}
async function boot(){const status=document.querySelector('#boot-status'),progress=document.querySelector('#boot-progress'),retry=document.querySelector('#boot-retry');try{retry.hidden=true;await Promise.all([assets.load(n=>{progress.value=Math.round(n*65);}),modernFreeplay.load(n=>{if(n===1)progress.value=100;}),fetch('variant-catalog.json').then(r=>r.json()).then(c=>{variantCatalog=c.variants;baseSongCatalog=c.baseSongs||[];if(!DIFFICULTIES.includes('Erect'))DIFFICULTIES.push('Erect','Nightmare');})]);await modLibrary.init();refreshMods();for(const [atlas,frames] of Object.entries(assets.atlases)){for(const prefix of new Set(frames.filter(f=>f.name).map(f=>f.name.replace(/\d+$/,''))))assets.frames(atlas,prefix);}document.querySelector('#boot').hidden=true;canvas.focus();scheduleFrame();if(!renderWatchdog)renderWatchdog=setInterval(()=>{const now=performance.now();if(!document.hidden){const gap=now-lastFrame;if(gap>40)fallbackUntil=now+1500;if(gap>14&&now<fallbackUntil)tick(now);}},16);announce('Friday Night Funkin. Press Enter to begin.');}catch(e){console.error(e);status.textContent='Could not load the game. Serve this folder over HTTP and try again.';retry.hidden=false;retry.onclick=boot;}}
boot();

