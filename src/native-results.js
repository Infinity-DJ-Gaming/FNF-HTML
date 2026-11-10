// Native V-Slice result artwork and timelines. Assets come from the user's game.
import {EXPANDED_BASE} from './expanded-content.js';
import {expandedJSON} from './sky-ui.js';
// UI/game-state integration belongs to the caller; draw() returns click targets.
const NR_DIGITS=['ZERO','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE'];
const NR_CLAMP=(n,a,b)=>Math.min(b,Math.max(a,n));
const NR_QUART=t=>1-Math.pow(1-NR_CLAMP(t,0,1),4);
const NR_FONT='AaBbCcDdEeFfGgHhiIJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz:1234567890().-';
const NR_RANKKEY={PERFECT_GOLD:'PERFECT',PERFECT:'PERFECT',EXCELLENT:'EXCELLENT',GREAT:'GREAT',GOOD:'GOOD',SHIT:'LOSS'};

export function nativeResultTallies(stats={}){
  const source=stats.tallies||stats,judgements=source.judgements||stats.judgements||{};
  const sick=Number(source.sick??judgements.sick)||0,good=Number(source.good??judgements.good)||0,bad=Number(source.bad??judgements.bad)||0,shit=Number(source.shit??judgements.shit)||0,missed=Number(source.missed??source.misses)||0;
  const totalNotesHit=Number(source.totalNotesHit??source.hits)||(sick+good+bad+shit);
  return{sick,good,bad,shit,missed,totalNotesHit,totalNotes:Number(source.totalNotes)||(totalNotesHit+missed),maxCombo:Number(source.maxCombo)||0,score:Number(stats.score??source.score)||0};
}
export function nativeCompletion(stats){const t=nativeResultTallies(stats);return t.totalNotes?NR_CLAMP((t.sick+t.good-t.missed)/t.totalNotes,0,1):0;}
export function nativeResultRank(stats){const t=nativeResultTallies(stats);if(!t.totalNotes)return null;if(t.sick===t.totalNotes)return'PERFECT_GOLD';const c=nativeCompletion(t);return c===1?'PERFECT':c>=0.9?'EXCELLENT':c>=0.8?'GREAT':c>=0.6?'GOOD':'SHIT';}

export class NativeResults {
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
