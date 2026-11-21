import {clamp} from './core.js?v=52a31721d8bc6d';
import {eventEase} from './song-events.js?v=52a31721d8bc6d';

export const IMPOSTOR_SKINS={none:'None',amongbf:'BF Crewmate',bfairship:'Airship BF',bfpolus:'Polus BF',bfsauce:'Chef BF','black-playable':'Mini Black','red-playable':'Mini Red','green-playable':'Mini Green',dripbf:'Drippy BF','stick-bf':'Stickmin BF','ghost-bf':'Ghost BF'};
export const IMPOSTOR_PETS={nothing:'Nothing',crab:'Crab',dog:'Dog',elliepet:'Ellie Pet',frankendog:'Franken Dog',ham:'Ham','hamster-pet':'Hamster',minicrewmate:'Mini Crewmate',snowball:'Snowball',stickmin:'Stickmin',tomong:'Tomong',ufo:'UFO'};
const exclusions=new Set(['torture','spookpostor','christmas','chipping','chippin','identity-crisis','greatest-plan','monotone-attack','defeat','finale','turbulence','ejected','danger','sussy-bussy','rivals','chewmate','ow','sussus-nuzzus','esculent','who','triple-trouble','double-trouble','monochrome','pretender']);
const skinExclusions=new Set([...exclusions,'sauces-moogus','meltdown','lights-down','double-kill','boiling-point','tomongus-tuesday']);
const inPack=choice=>String(choice?.source||'').startsWith('impostor-');
export const impostorSkin=(choice,settings)=>inPack(choice)&&choice.character==='bf'&&!skinExclusions.has(choice.baseSong)&&settings.impostorSkin!=='none'&&Object.hasOwn(IMPOSTOR_SKINS,settings.impostorSkin)?settings.impostorSkin:null;
export const impostorPet=(choice,settings)=>inPack(choice)&&!exclusions.has(choice.baseSong)&&settings.impostorPet!=='nothing'&&Object.hasOwn(IMPOSTOR_PETS,settings.impostorPet)?settings.impostorPet:null;
export function restAssets(choice,native,settings){
 const names=new Set();
 for(const id of [impostorSkin(choice,settings),impostorPet(choice,settings)]){
  const key=native.characterIds[id];if(key)names.add(key);if(native.iconAssets[id])names.add(native.iconAssets[id]);
 }
 if(choice.baseSong==='boiling-point'&&native.impostor.heatwave)names.add(native.impostor.heatwave);
 if(choice.baseSong==='finale')for(const id of Object.values(native.impostor.finaleArt||{}))names.add(id);
 return [...names];
}
export const extraSinger=choice=>choice?.baseSong==='voting-time'?{id:'madgus',offset:[-100,-100],zOffset:-200}:choice?.baseSong==='monotone-attack'?{id:'biddle',offset:[100,-150],zOffset:-1}:null;
export function restEvent(game,event,bpm){
 const state=game.impostor;if(!state)return;
 const v=event.v||{};
 if(event.e==='CameraZoom')state.zoomPulse={at:event.t,duration:Math.max(1,Number(v.value2)*1000||500),to:Number(v.value1)||1};
 if(event.e==='Add Camera Zoom'){
  state.addZoom={at:event.t,game:Number(v.value1)||.015,hud:Number(v.value2)||.03};
 }
 if(event.e==='Image Flash')state.imageFlash=event.t;
 if(event.e==='CinematicBarsEvent')state.bars={at:event.t,end:event.t+(v.tweenBars===false?0:Math.max(0,Number(v.time)||0)*15000/bpm),from:barsSize(state,event.t),to:clamp(Number(v.size)||0,0,1)*360,ease:v.tweenEase||'linear',color:'#'+(v.hexcolor||'000000')};
 if(event.e==='FinaleFlashback'){
  const type=Number(v.Type)||0;
  if(type<3)state.flashback={type,at:event.t};
  else if(state.flashback)state.flashback.end=event.t;
 }
}
export function barsSize(state,time){
 const cue=state?.bars;if(!cue)return 0;
 return cue.from+(cue.to-cue.from)*eventEase(cue.ease,'InOut',clamp((time-cue.at)/Math.max(1,cue.end-cue.at),0,1));
}
export function restZoom(game,time,hud=false){
 const state=game.impostor;if(!state)return 0;
 const bump=state.addZoom,age=bump?time-bump.at:Infinity;
 let amount=age>=0&&age<600?bump[hud?'hud':'game']*(1-age/600):0;
 const pulse=state.zoomPulse;
 if(!hud&&pulse){
  const p=(time-pulse.at)/pulse.duration;
  if(p>=0&&p<2){const strength=p<1?eventEase('circ','Out',p):1-eventEase('circ','Out',p-1);amount+=(pulse.to/(game.stageZoom||1)-(game.eventZoom||1))*strength;}
 }
 return amount;
}
export function restActorOptions(game,role,time){
 if(game.choice.baseSong==='drippypop'&&role==='girlfriend'&&game.beat<=283)return {animation:'idle-alt',animationTime:Math.max(0,(game.beat%1)*60000/game.chart.bpm)};
 return {};
}
export function chordTrail(game,role,note,actor,id){
 const state=game.impostor;if(!state||!['player','opponent','girlfriend'].includes(role))return;
 state.chords??={};state.ghosts??={};const previous=state.chords[role];
 if(previous&&previous.time===note.time&&previous.lane!==note.lane&&previous.kind===note.kind){state.ghosts[role]={id,at:game.time,lane:previous.lane,actor:{...actor,forced:null,until:game.time+750}};}
 state.chords[role]={time:note.time,lane:note.lane,kind:note.kind};
}
export function drawChordGhost(ctx,native,game,role,position,scale,time,aspect,reducedMotion){
 const ghost=game.impostor?.ghosts?.[role],age=ghost?time-ghost.at:Infinity;if(reducedMotion||age<0||age>=750)return;
 const p=eventEase('quad','Out',age/750),offset=[[-40,0],[0,40],[0,-40],[40,0]][ghost.lane%4];
 ctx.save();ctx.globalAlpha*=1-p;ctx.translate(position[0]+offset[0]*scale*p,position[1]+offset[1]*scale*p);ctx.scale(1,aspect);
 native.drawCharacter(ctx,ghost.id,ghost.actor,{x:0,y:0,scale,time,beat:game.beat,bpm:game.chart.bpm,player:role==='player'});ctx.restore();
}
export function drawRestOverlay(ctx,assets,native,game,time,{hud=false,flashing=true,reducedMotion=false}={}){
 const state=game.impostor;if(!state)return;
 ctx.save();
 if(!hud&&state.flashback){
  const cue=state.flashback,end=cue.end==null?-Infinity:time-cue.end;
  if(end<1200){
   const id=native.impostor.finaleArt?.flashback,prefix=['finaleFlashback moog','finaleFlashback toog','finaleFlashback doog'][cue.type],frame=assets.frame(id,prefix);
   if(frame){const w=frame.frameWidth||frame.width,h=frame.frameHeight||frame.height,s=Math.max(1280/w,720/h);assets.draw(ctx,id,frame,(1280-w*s)/2,(720-h*s)/2,s,.5);}
  }
  if(flashing&&end>=0&&end<1800){ctx.globalAlpha=end<1200?end/1200:1-(end-1200)/600;ctx.fillStyle=end<1200?'#fff':'#f00';ctx.fillRect(0,0,1280,720);}
 }
 if(hud){
  const size=barsSize(state,time);if(size){ctx.fillStyle=state.bars.color;ctx.fillRect(0,0,1280,size);ctx.fillRect(0,720-size,1280,size);}
  const age=time-(state.imageFlash??-Infinity);if(flashing&&!reducedMotion&&age>=0&&age<800){ctx.globalAlpha=1-age/800;ctx.fillStyle='#fff';ctx.fillRect(0,0,1280,720);}
 }
 ctx.restore();
}
export function drawFinaleHealth(ctx,assets,native,game,{down=false,aspect=1,icon}={}){
 if(!game.impostor||game.choice.baseSong!=='finale')return false;
 if(game.beat*4<272)return true;
 const art=native.impostor.finaleArt,red=assets.images[art.healthRed],blue=assets.images[art.healthBlue];if(!red||!blue)return true;
 const s=.6,w=red.width*s,h=red.height*s*aspect,x=640-w/2,y=down?720-530-h:530;
 const boundary=clamp(19+1160-game.stats.health*580,0,red.width),draw=(id,left,right)=>{
  ctx.save();ctx.beginPath();ctx.rect(x+left*s,y,(right-left)*s,h);ctx.clip();
  if(down){ctx.translate(0,y*2+h);ctx.scale(1,-1);}assets.image(ctx,id,x,y,w,h);ctx.restore();
 };
 draw(art.healthRed,0,boundary);draw(art.healthBlue,boundary,red.width);
 const healthY=down?32:650;
 icon?.(game.eventHealthIcon?.opponent||game.choice.opponent,x-90,healthY-88-(game.stats.health>1.6?22:0)+(down?40:0),.8,game.stats.health>1.6,false);
 icon?.(game.eventHealthIcon?.player||game.choice.characters.player,x+w/1.4+40,healthY-28,.5,game.stats.health<.4,true);
 return true;
}
export function defeatDeathSequence(choice){
 if(choice.baseSong!=='defeat'||!['bf-defeat-normal','bf-defeat-scared'].includes(choice.characters.player))return null;
 return {duration:3400,fadeIn:0,poses:[[0,'opponent','kill1',1800],[1800,'opponent','kill2',900],[2700,'opponent','kill3',700]],voiceLines:[{at:0,name:'IMPR_edefeat'}],view:{camera:[[0,['position',550,500,.65]],[1800,['position',750,450,.5]]]}};
}
