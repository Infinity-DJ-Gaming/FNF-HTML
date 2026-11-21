import {clamp} from './core.js?v=52a31721d8bc6d';
import {eventEase} from './song-events.js?v=52a31721d8bc6d';

export const isDefeat=choice=>choice?.baseSong==='defeat'&&choice?.source==='impostor-week4';
export const changeComboLimit=(current,delta)=>(Math.round(current)+Math.round(delta)+6)%6;
export const isHenryContent=record=>record?.week==='ImpostorWeek9'||record?.id==='ImpostorWeek9'||record?.source==='impostor-week9';
export const campaignUnlocked=(record,henryUnlocked=false)=>!isHenryContent(record)||henryUnlocked;
export const campaignAutoNote=(choice,note)=>['voting-time','monotone-attack'].includes(choice?.baseSong)&&['opponent 2 sing','gf sing'].includes(String(note.kind||'').toLowerCase());
export function henryChoice(option,mobile=false){
  if(!['mic','sock','stare'].includes(option))throw new Error('Unknown Henry choice');
  return {file:'IMP6_henry'+option+(mobile?'-mobile':'')+'.mp4',retry:option!=='mic'};
}
export function remoteScreenRect(prop,size,{scale,originX,originY,pan=0,centerX=640,centerY=360,bump=1}){
  if(prop?.name!=='teleporter'||!size)return null;
  const ps=Array.isArray(prop.scale)?prop.scale:[prop.scale||1,prop.scale||1];
  const x=640+(originX+prop.position[0]*scale-pan-centerX)*bump;
  const y=360+(originY+prop.position[1]*scale-centerY)*bump;
  const w=size[0]*ps[0]*scale*bump,h=size[1]*ps[1]*scale*bump;
  if(x+w<0||x>1280||y+h<0||y>720)return null;
  return {x:x-Math.max(0,44-w)/2,y:y-Math.max(0,44-h)/2,w:Math.max(44,w),h:Math.max(44,h)};
}
export function defeatHealth(game){
  if(game.choice?.baseSong==='victory'){game.stats.health=2;return false;}
  const limit=game.impostor?.comboBreakLimit;
  if(limit==null)return false;
  const failed=game.stats.misses>limit||!!game.modifiers?.instantFail&&game.stats.misses>0;
  game.stats.health=failed?0:1;
  return failed&&!game.practice&&!game.botplay&&!game.modifiers?.noFail;
}
const roleOf=name=>({bf:'player',boyfriend:'player',dad:'opponent',gf:'girlfriend'}[name]||name);
function alphaAt(cue,time){
  if(!cue)return 1;
  const t=clamp((time-cue.at)/Math.max(1,cue.end-cue.at),0,1);
  return cue.from+(cue.to-cue.from)*eventEase(cue.ease,'InOut',t);
}
export function campaignEvent(state,event){
  if(!state)return;
  const v=event.v||{};
  if(event.e==='ChangeCharacter'){
    state.characters[roleOf(v.character)]=String(v.newchar).toLowerCase();
    state.resetActor=roleOf(v.character);
  }
  if(event.e==='ChangeStage'){state.stage=v.stageid;state.props={};}
  if(event.e==='All Character Alpha Changer'){
    state.actorAlpha??={};
    const roles=v.target==='all'||!v.target?['player','opponent','girlfriend']:[roleOf(v.target)];
    for(const role of roles)state.actorAlpha[role]={at:event.t,end:event.t+(v.ease==='INSTANT'?0:Math.max(0,Number(v.duration)||0)*1000),
      from:alphaAt(state.actorAlpha[role],event.t),to:clamp(Number(v.alpha),0,1),ease:v.ease||'linear'};
  }
  if(event.e==='AdjustStageProp'){
    state.props??={};state.props[v.propName]={alpha:clamp(Number(v.alpha),0,1)};
  }
  if(event.e==='Camera Twist')state.twist={at:event.t,intensity:Number(v['Value 1'])||0,amount:Number(v['Value 2'])||0};
  if(event.e==='Pink Toggle'){
    const from=pinkAmount(state,event.t),enabled=from<.999;
    state.pink={at:event.t,end:event.t+Math.max(0,Number(v['Value 1'])||0)*2000,from:enabled?1:from,to:enabled?1:0};
  }
  if(event.e==='Charles Enter')state.charlesEnter=event.t;
}
export function pinkAmount(state,time){
  const cue=state?.pink;if(!cue)return 0;
  return cue.from+(cue.to-cue.from)*eventEase('cube','InOut',clamp((time-cue.at)/Math.max(1,cue.end-cue.at),0,1));
}
export function drawPinkOverlay(ctx,assets,stage,state,time,{beat=0,reducedMotion=false,flashing=true}={}){
  const amount=pinkAmount(state,time);if(amount<=0||!stage)return;
  const age=reducedMotion?0:Math.max(0,time);
  const pulse=flashing&&!reducedMotion?.2+.8*Math.exp(-((beat+1)%2)*60000/Math.max(1,state.bpm||100)/1200):.35;
  ctx.save();
  for(const name of ['vignette2','vignette','hearts']){
    const prop=stage.props.find(p=>p.name===name),id=prop?.assetId,img=assets.images[id];if(!img)continue;
    const alpha=amount*(name==='vignette2'?.3:name==='vignette'?pulse:1);
    const frames=assets.frames(id,prop.animations?.[0]?.prefix||''),frame=frames.length?frames[Math.floor(age*.024)%frames.length]:null;
    const w=frame?.frameWidth||frame?.width||img.width,h=frame?.frameHeight||frame?.height||img.height,s=Math.max(1280/w,720/h);
    if(frame)assets.draw(ctx,id,frame,(1280-w*s)/2,(720-h*s)/2,s,alpha);
    else assets.image(ctx,id,(1280-w*s)/2,(720-h*s)/2,w*s,h*s,alpha);
  }
  ctx.restore();
}
export const campaignActorAlpha=(state,role,time)=>alphaAt(state?.actorAlpha?.[role],time);
export function campaignTwist(ctx,state,beat,reducedMotion){
  if(reducedMotion||!state?.twist?.amount)return;
  const sign=Math.floor(beat)%2?-1:1,t=clamp((beat%1)*2,0,1),v=state.twist;
  const angle=sign*(v.amount+(v.intensity-v.amount)*Math.sqrt(1-(t-1)**2));
  ctx.translate(640,360-6*v.amount*(1-Math.abs((beat%1)*2-1)));ctx.rotate(angle*Math.PI/180);ctx.translate(-640,-360);
}
export function campaignProp(prop,game,time){
  if(!prop)return null;
  const state=game.impostor;
  if(!state)return prop;
  if(prop.name==='teleporter')return {...prop,zIndex:310};
  if(game.choice?.baseSong==='voting-time'&&prop.name==='bajhche')return null;
  if(['heartbeat','pinkwave'].includes(game.choice?.baseSong)&&['hearts','vignette','vignette2'].includes(prop.name))return null;
  if(state.stage==='defeaterect2'&&game.beat*4>=896&&game.beat*4<992&&['bg','bg1','deadonesinveryfarbg','deadonesinbg','deadonesinfg'].includes(prop.name))return null;
  return state.props?.[prop.name]?{...prop,...state.props[prop.name]}:prop;
}
export function campaignActorPosition(game,role,position,time){
  if(game.choice.baseSong==='greatest-plan'&&role==='opponent'&&game.impostor?.charlesEnter!=null){
    const p=eventEase('expo','Out',clamp((time-game.impostor.charlesEnter)/480,0,1));
    return [position[0]+(-800-position[0])*p,position[1]];
  }
  if(game.choice.baseSong==='turbulence'&&role==='opponent'){
    const at=game.chart.tempos.findLast(t=>t.beat<=1207/4)||game.chart.tempos[0];
    const start=at.time+(1207/4-at.beat)*60000/at.bpm;
    return [position[0]+3000*clamp((time-start)/1000,0,1)**4,position[1]];
  }
  if(game.choice.baseSong!=='danger'||role!=='girlfriend')return position;
  const start=game.chart.tempos.reduce((at,tempo)=>tempo.beat<=164?tempo:at,game.chart.tempos[0]);
  const at=start.time+(164-start.beat)*60000/start.bpm;
  const progress=clamp((time-at)/6000,0,1);
  return [position[0]-3000*progress**4,position[1]];
}
export const campaignSilhouette=game=>game.impostor?.stage==='defeaterect2'&&game.beat*4>=896&&game.beat*4<992;
export function campaignSingers(note){
  const kind=String(note.kind||'').toLowerCase();
  if(kind==='opponent 2 sing')return ['extra'];
  if(['gf','gf sing','gfsing'].includes(kind))return ['girlfriend'];
  if(['both','white and black duet'].includes(kind))return [note.player?'player':'opponent','girlfriend'];
  if(['no animation','noanim'].includes(kind))return [];
  return [note.player?'player':'opponent'];
}
export function campaignPose(note){
  const kind=String(note.kind||'').toLowerCase();
  if(kind==='livereaction'&&!note.player)return {name:'liveReaction',lock:false};
  if(kind==='death'&&!note.player)return {name:'death',lock:true};
  if(kind!=='play-anim')return null;
  const params=Object.fromEntries((note.params||[]).map(p=>[p.n??p.name,p.v??p.value]));
  return {name:params.animation||'idle',lock:!!params.force};
}
export function campaignAssets(choice,native){
  const names=new Set();
  for(const stageId of choice.preload?.stages||[])for(const prop of native.stages[stageId]?.props||[])if(prop.assetId)names.add(prop.assetId);
  for(const id of choice.preload?.characters||[]){
    const config=native.characters[native.characterIds[id]];
    if(config)names.add(config.atlasName);
    if(native.iconAssets[id])names.add(native.iconAssets[id]);
  }
  if(isDefeat(choice)){
    const selector=native.impostor.defeatSelector;names.add(selector.arrow);for(const id of selector.dummies)names.add(id);
  }
  if(choice.baseSong==='titular')for(const name of Object.values(native.impostor.henryChoices||{}))names.add(name);
  return [...names];
}
