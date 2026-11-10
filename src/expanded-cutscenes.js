import {EXPANDED_BASE} from './expanded-content.js';
import {expandedImage,expandedJSON,loadExpandedAnimation} from './sky-ui.js';
import {drawSkyAnimation,loadSkyPolishPack} from './sky-polish.js';
import {cameraTrack} from './stage-camera.js';
import {eventEase} from './song-events.js';

const EXPANDED_SCENES={
  'darnell-alley':{duration:10000,audio:'darnell-alley.ogg',audioAt:700,fadeIn:2000,fadeInAt:1000,
    poses:[[0,'player','intro1',6000],[5000,'opponent','lightCan',1400],[6000,'player','cock',1100],[6400,'opponent','kickCan',500],
      [6900,'opponent','kneeCan',460],[7100,'player','intro2',2900],[7900,'opponent','laughCutscene',2100],[8200,'girlfriend','laughCutscene',1800]],
    effects:[[5000,'W7W1_Darnell_Lighter'],[6000,'W7W1_Gun_Prep'],[6400,'W7W1_Kick_Can_UP'],
      [6900,'W7W1_Kick_Can_FORWARD'],[7100,'W7W1_shot'],[7900,'W7W1_darnell_laugh',.6],[8200,'W7W1_nene_laugh',.6]]},
  'stress-pico-outro':{duration:13333,audio:'stress-pico-outro.ogg',captions:'stress-pico-outro.srt',poses:[[0,'opponent','stressPicoEnding',11000],[7333,'player','laughCutscene',3600]],fadeOut:11250},
  'wife-stage':{duration:13500,audio:'extra-wifeFunniCutscene.ogg',animations:['wifeBf','wifeSky'],pictures:['wifeBackdrop','wifeHearts'],fadeIn:1000,fadeOut:8000,fadeOutDuration:3000},
  'moderato-stage':{duration:4000,audio:'extra-skyMaterializeSfx.ogg',atlases:['materializeSky']},
  'sky-pico-stage':{polish:true,animations:['pico','sky'],fadeIn:1000,fadeInAt:1100}
};

const sceneCaption=(song,naughtyness)=>'subtitles-data-subtitles-skyplayable-'+song+'-sky'+(naughtyness?'':'-censored')+'.srt';
const clamp01=value=>Math.max(0,Math.min(1,value));

function skyStageScene(id,{naughtyness,subtitles,alternate}) {
  if(id==='ugh-sky-stage'||id==='guns-sky-stage'){
    const guns=id==='guns-sky-stage',song=guns?'guns':'ugh';
    return {
      polish:true,duration:guns?7000:9000,fadeIn:2000,
      audio:guns?'extra-tankmanCutscene-alt.ogg':'extra-tankmanCutscene.ogg',audioGain:.14,
      animations:['tankman'],
      captions:subtitles?sceneCaption(song,naughtyness):null,captionOffset:3500,
      poses:[[2050,'player','fall',5650],[3500,'opponent',guns?'sky insult2':'sky insult',guns?3000:4200],[7700,'player','danceLeft',1200]],
      sounds:[[0,'fall'],[3500,song+(naughtyness?'':'Clean')]],
    };
  }
  if(id==='stress-sky-stage'){
    return {
      polish:true,duration:naughtyness?20500:15500,fadeIn:2000,
      audio:naughtyness?'extra-stressSkyIntro.ogg':'extra-stressSkyIntro-censored.ogg',
      captions:subtitles?sceneCaption('stress',naughtyness):null,animations:['sniper','tankman'],atlases:['muzzleFlash'],
      poses:[[0,'opponent','stress sky anim 1',15500],[8800,'girlfriend','shoot1',600],
        ...(naughtyness?[[14300,'girlfriend','laugh',1200],[15500,'opponent','stress sky anim 2',5000]]:[])],
      sounds:naughtyness?[[15500,'stressEnding']]:[],
    };
  }
  if(id==='sky-pico-stage'){
    const impact=alternate?(naughtyness?'BOOM':'BOOMpretty'):'gunSfx1';
    return {...EXPANDED_SCENES[id],duration:alternate?11800:9800,
      sounds:[[0,'skyCutsceneMusic'],[2100,'skyHuh'],[3600,'picoPluh',.7],
        [4900,'blinkSfx'],[5100,'blinkSfx'],[5700,'scramblingSfx'],[5700,'upPole',.6],
        [7100,impact],...(alternate?[[7200,'neneLaugh'],[8830,'skyFallin']]:[[7100,'freddyFazbearNoseSfx']])],
      poses:alternate?[[7100,'girlfriend','laughCutscene',4600]]:[],
    };
  }
  if(id==='manifest-pico-outro'){
    return {polish:true,duration:naughtyness?12500:6400,fadeIn:0,
      fadeOut:naughtyness?8000:null,fadeOutDuration:2000,atlases:naughtyness?['manifestGuts']:[],
      poses:[[0,'opponent','pressGadget',2460],[2050,'girlfriend','guh',1200],
        [2460,'opponent','gadgetAurafarm',10040],
        [3250,'girlfriend','neneScramble',1250]],
      sounds:[[0,'gadgetGrabSfx'],[2050,'gadgetClickSfx'],[2350,'danganronpaJingle'],
        [2350,'fuckedUpPercs'],[3250,'blastoffScream'],[4500,'neneExplodes'],
        ...(naughtyness?[[6700,'chunkletDrop'],[8000,'goreDrops']]:[])],
    };
  }
  return EXPANDED_SCENES[id];
}

const skyPicoCamera=[
  [0,['opponent',-100,50,1]],
  [2100,['player',0,50,.9],2000,'quadInOut'],
  [5700,['girlfriend',0,125,.7],500,'quintOut'],
  [7100,['opponent',0,0,.5],1000,'quintOut'],
];
const week7FallCamera=[
  [0,['player',210,200,.55],2200,'circOut'],
  [3500,['opponent',-170,0,1],2340,'quintOut'],
];
const stressSkyCamera=[
  [0,['opponent',100,0,1],2000,'circOut'],
  [3000,['opponent',300,0,.75],1500,'circOut'],
  [8000,['opponent',300,0,.6],1500,'cubeOut'],
  [8800,['opponent',300,0,.7]],
  [8800,['opponent',300,0,.6],1500,'cubeOut'],
];
const darnellCamera=[
  [0,['player',365,65,1.3]],
  [2000,['opponent',100,0,.66],2500,'quadInOut'],
  [6000,['opponent',180,0,.66],400,'backOut'],
  [7100,['opponent',100,0,.66],1000,'quadInOut'],
];

function scriptStageView(id,elapsed,{art,alternate,naughtyness}){
  const hiddenPair=['player','opponent'];
  if(id==='darnell-alley')return {camera:darnellCamera};
  if(id==='sky-pico-stage'){
    const skyCue=elapsed>=7100?7100:elapsed>=5700?5700:1100;
    const impact=alternate?7050:7100,picoCue=elapsed>=impact?impact:elapsed>=5700?5700:1100;
    const skyLabel=skyCue===1100?'Point':skyCue===5700?'Scramble':alternate?naughtyness?'Blammed':'Blammed Candy':'Dodge';
    const picoLabel=picoCue===1100?'Inspect':picoCue===5700?'Up Pole':alternate?'Shoot Real':'Shoot Fake';
    return {
      camera:alternate?[...skyPicoCamera,[8830,['opponent',0,0,.55],1000,'expoOut']]:skyPicoCamera,
      hideActors:hiddenPair,
      actors:[
        {role:'opponent',asset:art.sky,label:skyLabel,age:elapsed-skyCue,offset:[-190,-581]},
        {role:'player',asset:art.pico,label:picoLabel,age:elapsed-picoCue,offset:[-222,-474]},
      ],
    };
  }
  if(id==='ugh-sky-stage'||id==='guns-sky-stage'){
    const guns=id==='guns-sky-stage';
    const extra=guns?[[4200,['opponent',-170,0,1.1],800,'circOut'],[5150,['opponent',-170,0,1.2],800,'circOut']]
      :[[6450,['opponent',-170,0,1.1],1000,'circOut']];
    const landing=elapsed-2150;
    let zoom;
    if(elapsed<2150)zoom=.55+.7*eventEase('expoIn','In',elapsed/2200);
    else if(elapsed<3500)zoom=1+.25*(1-eventEase('circOut','Out',landing/770));
    return {
      camera:[...week7FallCamera,...extra],zoom,
      shake:landing>=0&&landing<300?.02*(1-landing/300):0,
      propBrightness:landing>=0?.13+.87*clamp01(landing/1400):1,
      hideActors:elapsed<2050?['player']:[],
      actors:elapsed>=3500&&elapsed<(guns?6500:8917)?[
        {role:'opponent',asset:art.tankman,label:guns?'Sky Shit Insult':'Sky Hair Insult',age:elapsed-3500,offset:[390,-334]},
      ]:[],
    };
  }
  if(id==='stress-sky-stage'){
    const shot=elapsed-8800;
    const rise=eventEase('circOut','Out',(elapsed-8000)/500);
    const camera=naughtyness?[...stressSkyCamera,[14300,['girlfriend',0,0,1],1000,'circOut'],
      [15500,['opponent',300,0,.6],2000,'circOut']]:stressSkyCamera;
    return {
      camera,hideActors:elapsed<8000?['girlfriend']:[],actorOffsets:{girlfriend:[0,-1000*(1-rise)]},
      hideProps:shot>=0?['sniper']:[],propOffsets:{tankBricks:[0,100]},
      propBrightness:shot>=0?.13+.87*clamp01(shot/1400):1,
      shake:shot>=0&&shot<400?.01*(1-shot/400):0,
      actors:[{role:'opponent',asset:art.tankman,label:elapsed<15500?'Cutscene Anim':'Suck Cock',
        age:elapsed-(elapsed<15500?0:15500),offset:[390,-334]}],
      muzzle:shot>=0&&shot<250?{age:shot,art:art.muzzleFlash}:null,
      props:shot<0?[]:[{prop:'sniper',z:21,asset:art.sniper,label:shot<166/24*1000?'Sniper Dies':'Sniper Dead Loop',
        age:shot<166/24*1000?shot:shot-166/24*1000,offset:[-150,550],scale:1.15,loop:shot>=166/24*1000}],
    };
  }
  if(id==='moderato-stage')return {camera:[[0,['opponent',550,300,.8]],[1300,['opponent',550,300,.7],500,'circOut']],hideActors:['player']};
  if(id==='manifest-pico-outro'){
    const rise=clamp01((elapsed-3250)/1200);
    const lift=rise===0?0:1090*Math.pow(2,10*(rise-1));
    return {camera:[[0,['opponent',-100,50,.5]],[2050,['girlfriend',0,50,.6],550,'quadOut'],
      [3250,['girlfriend',0,-50,.6],700,'quadOut'],[8000,['girlfriend',0,100,.5],1000,'quadOut']],
      actorOffsets:{girlfriend:[0,-lift]},hideActors:elapsed>=4450?['girlfriend']:[]};
  }
  return {};
}

export function scriptedCamera(view,time,initial,resolve){
  if(!view.camera)return null;
  const [x,y,zoom]=cameraTrack(view.camera,time,initial,resolve);
  return [x,y,view.zoom??zoom];
}

export async function expandedCaptions(file){
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

export function expandedIntro(choice,{story=false,retry=false,editor=false}={}) {
  if (retry||editor) return null;
  if (choice.variant==='sky'&&['senpai','roses','thorns'].includes(choice.baseSong)) return choice.baseSong+'-sky';
  if (choice.baseSong==='stress'&&choice.variant==='pico') return 'stressPicoCutscene';
  if (!story) return null;
  return {ugh:'ughCutscene',guns:'gunsCutscene',stress:choice.character==='pico'?'stressPicoCutscene':'stressCutscene',
    darnell:'darnellCutscene','wife-forever':'wifeforeverCutscene',sky:'skyCutscene',manifest:'manifestCutscene'}[choice.baseSong];
}

export function expandedOutro(choice,story,{manifestLiquid='water'}={}) {
  if(choice.baseSong==='stress'&&choice.variant==='pico')return 'stress-pico-outro';
  if(choice.baseSong==='manifest'&&choice.variant==='pico'&&manifestLiquid!=='boiling')return 'manifest-pico-outro';
  if (!story) return null;
  return {'2hot':'2hot-alley-outro',blazin:'blazinCutscene',manifest:'skyEndCredits'}[choice.baseSong];
}

export function expandedStageIntro(choice,story){
  if(choice.baseSong==='sky'&&choice.variant==='pico')return 'sky-pico-stage';
  if(choice.variant==='sky')return {moderato:'moderato-stage',ugh:'ugh-sky-stage',guns:'guns-sky-stage',stress:'stress-sky-stage'}[choice.baseSong];
  if(story)return {'wife-forever':'wife-stage',darnell:'darnell-alley'}[choice.baseSong];
}

export class ExpandedCutscenes {
  constructor() {
    this.media = {};
    this.current = null;
  }

  async load() {
    const response = await fetch(EXPANDED_BASE+'cutscenes.json');
    if (response.ok) this.media = await response.json();
  }

  begin(id,{volume=0.7,misses=0,extraArt={},naughtyness=false,subtitles=true,alternate=Math.random()<.1,sfx=()=>{}}={}) {
    const entry = id==='2hot-alley-outro'&&this.media['2hotCutscene']
      ?{...this.media['2hotCutscene'],stageBeforeVideo:6000}
      :this.media[id]||skyStageScene(id,{naughtyness,subtitles,alternate});
    if (!entry) return null;
    this.stop(false);
    const current = {id,entry,phase:'loading',volume,cues:[],at:performance.now(),skipAt:null,naughtyness,subtitles,alternate,sfx};
    if(entry.stageBeforeVideo)current.poses=[[2000,'player','intro1',4000],[2500,'opponent','pissed',3500]];
    const result = new Promise(resolve=>{current.resolve=resolve;});
    this.current=current;
    if(entry.duration&&!entry.file){
      current.phase='script-loading';
      current.art={};
      current.poses=[...entry.poses||[]];
      current.effects=[...entry.effects||[]];
      current.sounds=[];
      if(entry.audio)current.sounds.push({at:entry.audioAt||0,audio:this.newAudio(entry.audio,volume*(entry.audioGain??1))});
      this.loadCaptions(current);
      this.loadScriptArt(current,extraArt);
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

  newAudio(file,volume){
    const audio=new Audio(EXPANDED_BASE+file);
    audio.preload='auto';
    audio.volume=Math.min(1,volume);
    return audio;
  }

  async loadScriptArt(current,extraArt){
    const {entry,art}=current;
    try{
      const polish=entry.polish?await loadSkyPolishPack():null;
      for(const [at,name,gain=1] of entry.sounds||[])current.sounds.push({at,audio:this.newAudio(polish.audio[name],current.volume*gain)});
      current.sounds.sort((a,b)=>a.at-b.at);
      await Promise.all([
        ...(entry.animations||[]).map(async name=>art[name]=await loadExpandedAnimation(extraArt[name]||polish?.[name])),
        ...(entry.pictures||[]).map(async name=>art[name]=await expandedImage(extraArt[name])),
        ...(entry.atlases||[]).map(async name=>{
          const item=extraArt[name]||polish?.[name];
          const [image,frames]=await Promise.all([expandedImage(item.image),item.frames||expandedJSON(item.atlas)]);
          art[name]={image,frames};
        }),
      ]);
      if(current.id==='wife-stage')current.wifeLabel=['Hearts','Roses','Freaky','Hearts','Roses','Freaky','Adorable'][Math.floor(Math.random()*7)];
    }catch(error){
      console.warn('A cutscene asset could not load',error);
    }
    if(this.current===current){current.at=performance.now();current.phase='script';}
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
    if(current.subtitles&&current.entry.captions)expandedCaptions(current.entry.captions).then(cues=>current.cues=cues).catch(()=>{});
  }

  drawScript(ctx,current,elapsed,stage,pose){
    for(const sound of current.sounds){
      if(!sound.started&&elapsed>=sound.at){
        sound.started=true;
        sound.audio.play().catch(()=>{});
      }
    }
    while(current.effects[0]?.[0]<=elapsed){
      const [,name,gain=1]=current.effects.shift();
      current.sfx(name==='W7W1_shot'?name+(1+Math.floor(Math.random()*4)):name,gain);
    }
    while(current.poses.length&&current.poses[0][0]<=elapsed)pose(...current.poses.shift());
    const positions=stage(elapsed,{id:current.id,...scriptStageView(current.id,elapsed,current)})||{};
    const {art,id,entry}=current;
    if(id==='wife-stage'){
      if(art.wifeBackdrop)ctx.drawImage(art.wifeBackdrop,0,0,1280,720);
      if(elapsed<4200)drawSkyAnimation(ctx,art.wifeBf,elapsed,365,100,{scale:.8,label:'intro'});
      else{
        drawSkyAnimation(ctx,art.wifeSky,elapsed-4200,120,10,{scale:.82,loop:true,label:current.wifeLabel});
        if(art.wifeHearts){
          ctx.save();
          ctx.globalAlpha=.3;
          ctx.globalCompositeOperation='lighter';
          const picture=art.wifeHearts,x=elapsed*.05%picture.width,y=elapsed*.05%picture.height;
          for(let tx=x-picture.width;tx<1280;tx+=picture.width)for(let ty=y-picture.height;ty<720;ty+=picture.height)ctx.drawImage(picture,tx,ty);
          ctx.restore();
        }
      }
    }
    if(id==='moderato-stage'&&elapsed>=1300&&art.materializeSky){
      const {image,frames}=art.materializeSky;
      const [x,y]=positions.player||[930,650],scale=positions.scale||.7;
      const index=Math.min(frames.length-1,Math.floor((elapsed-1300)*24/1000));
      const frame=frames[index],width=frame.frameWidth||frame.width,height=frame.frameHeight||frame.height;
      ctx.save();
      ctx.translate(x,y);ctx.scale(-scale,scale);
      ctx.filter='brightness(.82) contrast(.85) saturate(.8) hue-rotate(-20deg)';
      ctx.drawImage(image,frame.x,frame.y,frame.width,frame.height,-width/2-(frame.frameX||0),-height-(frame.frameY||0),frame.width,frame.height);
      ctx.restore();
    }
    if(id==='manifest-pico-outro'&&art.manifestGuts&&elapsed>=6500){
      const {image,frames}=art.manifestGuts;
      const [x,y]=positions.girlfriend||[655,405],scale=positions.scale||.72;
      const prefix=elapsed>=8000?'raining chunklets0':'falling chunklet0',start=elapsed>=8000?8000:6500;
      const selected=frames.filter(frame=>frame.name.startsWith(prefix));
      const frame=selected[Math.min(selected.length-1,Math.floor((elapsed-start)*24/1000))];
      if(frame)ctx.drawImage(image,frame.x,frame.y,frame.width,frame.height,
        x-(frame.frameX||0)*scale-frame.width*scale/2,y-(frame.frameY||0)*scale-370,
        frame.width*scale,frame.height*scale);
    }
    const fadeIn=entry.fadeIn===0?0:1-(elapsed-(entry.fadeInAt||0))/(entry.fadeIn||800);
    const fade=Math.max(0,fadeIn,entry.fadeOut?(elapsed-entry.fadeOut)/(entry.fadeOutDuration||1800):0);
    if(fade){ctx.fillStyle='rgba(0,0,0,'+Math.min(1,fade)+')';ctx.fillRect(0,0,1280,720);}
  }

  advance(skip=false,now=performance.now()) {
    const current=this.current;
    if (!current) return;
    if(current.phase==='ending'){
      current.phase='ending-fade';
      current.at=now;
      return;
    }
    if(current.phase==='ending-fade')return;
    if(current.phase==='blocked'&&!skip) {
      this.play();
      return;
    }
    if(current.id==='skyEndCredits'&&current.phase==='video'){
      if(current.skipAt===null){current.skipAt=now;return;}
      if(now-current.skipAt<500)return;
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
    for(const sound of current.sounds||[])sound.audio.pause();
    current.resolve(complete?current:false);
  }

  draw(ctx,now,{stage=()=>{},pose=()=>{}}={}) {
    const current=this.current;
    if (!current) return '';
    const {video,ending,phase,cues}=current;
    const elapsed=now-current.at;
    if(phase==='ending-fade'&&elapsed>=1000){this.play();return '';}
    if(phase==='script'&&elapsed>=current.entry.duration){this.stop(true);return '';}
    ctx.fillStyle='#000';
    ctx.fillRect(0,0,1280,720);
    const frame=phase==='ending'||phase==='ending-fade'?ending:video;
    const width=frame?.videoWidth||frame?.naturalWidth,height=frame?.videoHeight||frame?.naturalHeight;
    const liveStage=phase==='video'&&video.currentTime*1000<(current.entry.stageBeforeVideo||0);
    if(liveStage){
      const stageTime=video.currentTime*1000;
      while(current.poses.length&&current.poses[0][0]<=stageTime)pose(...current.poses.shift());
      stage(stageTime,{id:current.id});
    }else if(width&&height&&(frame===ending||video.readyState>=2)){
      const scale=Math.min(1280/width,720/height);
      ctx.drawImage(frame,(1280-width*scale)/2,(720-height*scale)/2,width*scale,height*scale);
    }
    if(phase==='script')this.drawScript(ctx,current,elapsed,stage,pose);
    if(phase==='ending-fade'){ctx.fillStyle='rgba(0,0,0,'+clamp01(elapsed/1000)+')';ctx.fillRect(0,0,1280,720);}
    const seconds=phase==='video'?video.currentTime:phase==='script'?(elapsed-(current.entry.captionOffset||0))/1000:-1;
    const subtitles=cues.find(cue=>cue.start<=seconds&&cue.end>seconds)?.text||[];
    ctx.save();
    ctx.textAlign='center';ctx.font='23px VCR, monospace';ctx.lineWidth=6;ctx.lineJoin='round';
    for(const [index,line] of subtitles.entries()){
      const y=641-(subtitles.length-index-1)*29;
      ctx.strokeStyle='#000';ctx.strokeText(line,640,y);ctx.fillStyle='#fff';ctx.fillText(line,640,y);
    }
    const prompt=phase==='ending'?'ENTER TO CONTINUE':phase==='blocked'?'TAP OR PRESS ENTER TO PLAY':phase==='error'?'VIDEO UNAVAILABLE   /   ENTER TO CONTINUE':
      ['loading','script-loading'].includes(phase)?'LOADING CUTSCENE   /   ESC TO SKIP':current.skipAt!==null?'PRESS AGAIN TO SKIP CREDITS':'ENTER OR ESC TO SKIP';
    ctx.font='19px VCR, monospace';ctx.strokeText(prompt,640,694);ctx.fillStyle='#fff';ctx.fillText(prompt,640,694);ctx.restore();
    return subtitles.join(' ');
  }
}
