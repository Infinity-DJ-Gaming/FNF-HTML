import {eventEase} from './song-events.js?v=52a31721d8bc6d';

export const EXTRA_EVENT_SCHEMAS={
  'extra-events-cameraFadeEvent':{color:0,duration:4,shouldFadeIn:false,applyToHud:false},
  'extra-events-cameraFlashEvent':{color:12,duration:4,applyToHud:false},
  'extra-events-cameraShakeEvent':{intensityCamGame:.02,intensityCamHUD:.01,duration:4,direction:2},
  'extra-events-cameraRotateEvent':{angleCamGame:10,angleCamHUD:10,duration:4,ease:'linear',easeDir:'In'},
  'extra-events-vignEvent':{intensity:1,duration:4,ease:'linear',easeDir:'In'},
  'extra-events-movePlayerStrumlineEvent':{direction:'center',duration:4,ease:'linear',easeDir:'In',hideOpponentSL:true,offSetX:0},
  'extra-events-playSoundEvent':{audioName:'',vol:1},
  'extra-events-trackVolumeEvent':{track:1,volume:1},
  'extra-events-countDownEvent':{startFrom:0,soundOnly:false,speed:1},
  'extra-events-addLyricsEvent':{text:'',text2nd:'',textColor:12,textColor2nd:12,font:'vcr',font2nd:'vcr',
    fontSize:32,fontSize2nd:32,isBehindStrumLines:true,isBehindStrumLines2nd:true,isItalic:false,isBold:false,
    hasAntiAliasing:true,isCentered:false,isCentered2nd:false,opacity:1,letterSpacing:0,textBorderColor:0,borderSize:1.25},
};
const colors=['#000000','#0000ff','#a52a2a','#00ffff','#808080','#008000','#00ff00','#ff00ff','#ffa500','#800080','#ff0000','transparent','#ffffff','#ffff00','#ed026f'];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
export const extraColor=value=>colors[value]||(/^#[\da-f]{6}$/i.test(value)?value:'#000000');
export const extensionPackage=(manifest,paths)=>{
  const id=String(manifest.id||'').toLowerCase(),title=String(manifest.title||manifest.name||'').toLowerCase();
  if(id==='extra-events'||title==='extra events'||paths.some(path=>path.endsWith('/events/cameraShakeEvent.hxc')))return 'extra-events';
  if(id==='duplicatevariationshandler'||title.includes('duplicate variations handler')||paths.some(path=>path.endsWith('/HandleDupeSongs.hxc')))return 'duplicate-variations';
  return null;
};

function tween(state,field,to,at,duration,ease='linear',dir='In',fallback=0){
  state.tweens[field]={from:state[field]??fallback,to,at,end:at+duration,ease,dir};
}
export function updateExtraTweens(state,time){
  if(!state)return;
  for(const [field,t] of Object.entries(state.tweens)){
    const progress=t.end===t.at?1:clamp((time-t.at)/(t.end-t.at),0,1);
    state[field]=t.from+(t.to-t.from)*eventEase(t.ease,t.dir,progress);
    if(progress>=1)delete state.tweens[field];
  }
}
export function applyExtraEvent(game,event,{bpm=100,sound=()=>{},options={}}={}){
  const schema=EXTRA_EVENT_SCHEMAS[event.e];
  if(!schema)return false;
  const option={'extra-events-cameraRotateEvent':'extraRotate','extra-events-cameraShakeEvent':'extraShake',
    'extra-events-vignEvent':'extraVignette','extra-events-addLyricsEvent':'extraLyrics','extra-events-countDownEvent':'extraCountdown'}[event.e];
  if(option&&options[option]===false)return true;
  const state=game.extraEvents??={tweens:{},gameAngle:0,hudAngle:0,vignette:0,volumes:{}};
  updateExtraTweens(state,event.t);
  const v={...schema,...event.v},duration=v.ease==='INSTANT'?0:Math.max(0,number(v.duration,4))*15000/bpm;
  const animate=(field,to,fallback)=>tween(state,field,to,event.t,duration,v.ease,v.easeDir,fallback);
  switch(event.e){
    case 'extra-events-cameraFadeEvent':
      state.fade={at:event.t,end:event.t+duration,color:extraColor(v.color),in:!!v.shouldFadeIn,hud:!!v.applyToHud};break;
    case 'extra-events-cameraFlashEvent':
      state.flash={at:event.t,end:event.t+duration,color:extraColor(v.color),hud:!!v.applyToHud};break;
    case 'extra-events-cameraShakeEvent':
      state.shake={at:event.t,end:event.t+duration,game:number(v.intensityCamGame),hud:number(v.intensityCamHUD),direction:number(v.direction,2)};break;
    case 'extra-events-cameraRotateEvent':
      animate('gameAngle',number(v.angleCamGame));animate('hudAngle',number(v.angleCamHUD));break;
    case 'extra-events-vignEvent':animate('vignette',clamp(number(v.intensity),0,10));break;
    case 'extra-events-movePlayerStrumlineEvent':
      animate('strumX',({center:416,left:92,right:732}[v.direction]??416)+number(v.offSetX),game.extraStrumBase??732);
      animate('opponentX',v.hideOpponentSL?-600:92,92);break;
    case 'extra-events-playSoundEvent':sound(String(v.audioName),clamp(number(v.vol,1),0,1));break;
    case 'extra-events-trackVolumeEvent':{
      const roles=number(v.track)===3?['player','opponent','instrumental']:[['player','opponent','instrumental'][number(v.track)]];
      for(const role of roles)if(role)state.volumes[role]=clamp(number(v.volume,1),0,1);
      break;
    }
    case 'extra-events-addLyricsEvent':state.lyrics=v;break;
    case 'extra-events-countDownEvent':
      state.countdown={at:event.t,first:clamp(number(v.startFrom),0,3),interval:60000/bpm*([.5,1,2][v.speed]||1),soundOnly:!!v.soundOnly,last:-1};
      break;
  }
  updateExtraTweens(state,event.t);
  return true;
}

export function updateExtraEvents(game,time,{countdown=()=>{}}={}){
  const state=game.extraEvents;
  if(!state)return;
  updateExtraTweens(state,time);
  const cue=state.countdown;
  if(cue){
    const step=cue.first+Math.floor((time-cue.at)/cue.interval);
    if(step<4&&step>cue.last){cue.last=step;countdown(step);}
  }
}

export function extraCameraTransform(ctx,state,time,hud,reducedMotion,options={}){
  if(!state||reducedMotion)return;
  const angle=options.extraRotate===false||hud&&options.extraRotateHUD===false?0:(hud?state.hudAngle:state.gameAngle)||0,shake=state.shake;
  let x=0,y=0;
  if(options.extraShake!==false&&shake&&time>=shake.at&&time<shake.end){
    const intensity=hud?shake.hud:shake.game;
    if(shake.direction!==1)x=Math.sin(time*.149)*1280*intensity;
    if(shake.direction!==0)y=Math.cos(time*.173)*720*intensity;
  }
  ctx.translate(640+x,360+y);ctx.rotate(angle*Math.PI/180);ctx.translate(-640,-360);
}

export function drawExtraOverlay(ctx,state,time,{hud=false,flashing=true,downscroll=false,lyrics=true,vignette=true}={}){
  if(!state)return;
  ctx.save();
  for(const [kind,effect] of [['fade',state.fade],['flash',state.flash]]){
    if(!effect||effect.hud!==hud||time<effect.at||kind==='flash'&&!flashing)continue;
    const progress=clamp((time-effect.at)/Math.max(1,effect.end-effect.at),0,1);
    ctx.globalAlpha=kind==='flash'||effect.in?1-progress:progress;
    ctx.fillStyle=effect.color;ctx.fillRect(0,0,1280,720);
  }
  ctx.globalAlpha=1;
  if(vignette&&!hud&&state.vignette>0){
    const gradient=ctx.createRadialGradient(640,360,100,640,360,740);
    gradient.addColorStop(0,'#0000');gradient.addColorStop(1,`rgba(0,0,0,${clamp(state.vignette*.4,0,1)})`);
    ctx.fillStyle=gradient;ctx.fillRect(0,0,1280,720);
  }
  const v=state.lyrics;
  if(v&&lyrics){
    for(const second of [false,true]){
      const suffix=second?'2nd':'',behind=v['isBehindStrumLines'+suffix]??true;
      if(hud===behind)continue;
      const text=String(v[second?'text2nd':'text']||'');if(!text)continue;
      const size=clamp(number(v['fontSize'+suffix],32),1,160),center=v['isCentered'+suffix];
      const y=center?360+(second?size+8:0):downscroll?138+(second?size+8:0):600+(second?size+8:0);
      ctx.globalAlpha=clamp(number(v.opacity,1),0,1);ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font=`${v.isItalic?'italic ':''}${v.isBold?'bold ':''}${size}px ${v['font'+suffix]==='vcr'?'VCR, monospace':'Arial, sans-serif'}`;
      ctx.lineWidth=number(v.borderSize,1.25)*2;ctx.strokeStyle=extraColor(v.textBorderColor);
      ctx.fillStyle=extraColor(v['textColor'+suffix]);
      if('letterSpacing' in ctx)ctx.letterSpacing=number(v.letterSpacing)+'px';
      if(ctx.lineWidth)ctx.strokeText(text,640,y,1200);ctx.fillText(text,640,y,1200);
    }
  }
  ctx.restore();
}

export async function prepareExtraEventSounds(choice,chart,library,audio){
  const names=[...new Set((chart.events||[]).filter(e=>e.e==='extra-events-playSoundEvent').map(e=>e.v?.audioName).filter(Boolean))];
  const sounds=new Map();
  const archives=[];
  if(choice.mod){const {record,item}=library.resolve(choice);archives.push({zip:await library.archive(record),root:item.root});}
  // Engine extensions can supply sounds to a different imported song pack.
  for(const record of [...library.records].reverse()){
    if(record.enabled&&record.extension==='extra-events')archives.push({zip:await library.archive(record),root:record.root||''});
  }
  for(const name of names){
    let url;
    for(const {zip,root} of archives){
      const [libraryId,relative]=String(name).includes(':')?String(name).split(':',2):['',String(name)];
      const safe=relative.replace(/\.(ogg|mp3|wav)$/i,'');
      const path=[...(libraryId?[libraryId+'/sounds/']:[]),'sounds/','shared/sounds/','assets/shared/sounds/']
        .flatMap(folder=>['ogg','mp3','wav'].map(ext=>root+folder+safe+'.'+ext)).map(path=>zip.find(path)).find(Boolean);
      if(path){url=await zip.url(path);break;}
    }
    if(!url)url=choice.eventSounds?.[name]&&'assets/expanded/'+choice.eventSounds[name];
    if(url){const buffer=await audio.load(url).catch(()=>null);if(buffer)sounds.set(name,buffer);}
  }
  return sounds;
}
