import {clamp} from './core.js?v=52a31721d8bc6d';
import {EXPANDED_BASE} from './expanded-content.js?v=52a31721d8bc6d';

export const isImpostorWeek=choice=>String(choice?.source||'').startsWith('impostor-');
const introVideos={'sussus-moogus':'polus1',sabotage:'polus2',meltdown:'polus3'};
const lightAnimations={on:{idle:'idle','idle-alt':'idle'},off:{idle:'idle-alt','idle-alt':'idle-alt'}};
for(const direction of ['LEFT','DOWN','UP','RIGHT'])for(const miss of ['','miss']){
  const name='sing'+direction+miss;
  for(const input of [name,name+'-alt']){
    lightAnimations.on[input]=name+'-alt';
    lightAnimations.off[input]=name;
  }
}

export function impostorLightAnimations(state,role){
  if(!state?.lights||!['player','opponent'].includes(role))return null;
  // The installed Lights Down character files reverse the singing aliases:
  // sing*-alt contains lit art, while sing* contains the dark outline art.
  return lightAnimations[state.lights==='in'?'off':'on'];
}

export function impostorIntro(choice){
  if(choice.baseSong==='finale')return {file:'IMPR_finale.mp4',always:true};
  if(choice.baseSong==='titular')return {henry:true};
  const nextVideos={delusion:'grey',pretender:'pinkwave','voting-time':'voting-time',turbulence:'turbulence',armed:'armed'};
  if(nextVideos[choice.baseSong])return {file:'IMP6_'+nextVideos[choice.baseSong]+'.mp4',...(choice.baseSong==='delusion'?{dialogue:'impostor-dialogue-delusion'}:{})};
  if(['heartbeat','pinkwave'].includes(choice.baseSong))return {dialogue:'impostor-dialogue-'+choice.baseSong};
  if(['mando','oversight','danger','boiling-point'].includes(choice.baseSong))return {
    file:'IMP3_'+(choice.baseSong==='boiling-point'?'boiling':choice.baseSong)+'.mp4',
    ...(['mando','oversight'].includes(choice.baseSong)?{dialogue:'impostor-dialogue-'+choice.baseSong}:{}),
  };
  if(['dlow','ashes','magmatic'].includes(choice.baseSong))return {dialogue:'impostor-dialogue-'+choice.baseSong};
  if(['sussus-toogus','lights-down','reactor'].includes(choice.baseSong))return {
    ...(choice.baseSong==='sussus-toogus'?{file:'IMP2_toogus.mp4'}:{}),dialogue:'impostor-dialogue-'+choice.baseSong};
  const video=introVideos[choice.baseSong];
  if(!video||choice.variant==='pico')return null;
  return {file:`IMP_${video}.mp4`,dialogue:'impostor-dialogue-'+choice.baseSong};
}

export function createImpostorWeek(choice,chart){
  if(!isImpostorWeek(choice))return null;
  const state={beep:null,characters:{},noteFollow:0};
  const cue=chart.events?.find(event=>event.e==='PlayVideo'&&['meltdown','ejected','who'].includes(event.v?.path));
  if(cue){
    const element=document.createElement('video');
    element.muted=true;
    element.playsInline=true;
    element.preload='auto';
    element.src=EXPANDED_BASE+(cue.v.path==='who'?'IMPR_who.mp4':cue.v.path==='ejected'?'IMP2_ejected.mp4':'IMP_meltdown.mp4');
    const end=cue.v.path==='who'?cue.t+8850:cue.v.path==='ejected'?chart.events.find(event=>event.e==='extra-events-cameraFlashEvent')?.t:
      chart.events.find(event=>event.e==='extra-events-cameraFadeEvent')?.t;
    state.video={element,at:cue.t,end:end??cue.t+4000};
  }
  return state;
}

export function updateImpostorEvent(state,event,bpm=100){
  const value=event.v||{};
  if(event.e==='FocusCamera')state.noteFollow=value.noteFollow?Number(value.noteOffset)||20:0;
  if(event.e==='Reactor Beep')state.beep={at:event.t,alpha:clamp(Number(value.value??.4),0,.65),zoom:Number(value.zoomAmount??.015)};
  if(event.e==='ChangeCharacter'&&value.character==='gf'&&['ghost-gf','ghost-gf-intro'].includes(value.newchar)){
    state.characters.girlfriend=value.newchar;
    state.ghostAt=event.t;
  }
  if(event.e==='Toogus Sax')state.saxAt=event.t;
  if(event.e==='LightsDownEvent'){
    state.lights=value.type;
    state.lightFlash={at:event.t,color:value.type==='in'?'white':'black',duration:value.type==='in'?500:600};
  }
  if(event.e==='HUDFadeEvent'){
    const field=['hud','health','notes'][value.hud||0];
    state.fades??={};
    state.fades[field]={at:event.t,end:event.t+(value.duration||0)*15000/bpm,
      from:impostorAlpha(state,field,event.t),to:value.shouldFadeIn?1:0};
  }
}

export function impostorAlpha(state,field,time){
  const fade=state?.fades?.[field];
  if(!fade)return 1;
  return fade.from+(fade.to-fade.from)*clamp((time-fade.at)/Math.max(1,fade.end-fade.at),0,1);
}

export function impostorProp(prop,state,time){
  if(!prop)return null;
  if(state?.lights==='in'&&['mirabg','mirafloor','miratable'].includes(prop.name))return null;
  return prop;
}

export function impostorActorVisible(state,role){
  return !(state?.lights==='in'&&role==='girlfriend'||state?.lights==='final'&&role!=='opponent');
}

export function impostorGroundPosition(choice,role,position,config,groundY,actorScale=1){
  if(!isImpostorWeek(choice)||['ejected','monotoneejected','airship','airshiperect','turbulence','charles','pretender','warehouse','warehouse_roze','finalem'].includes(choice.stage)||role==='girlfriend')return position;
  // Converted Sparrow sheets contain transparent padding below their declared
  // idle hitbox. Keep one idle baseline so singing poses retain their offsets.
  const correction=(config?.groundOffset||0)*(config?.metadata?.scale||1)*actorScale;
  return [position[0],(role==='opponent'?groundY:position[1])-correction];
}

export function impostorCameraPush(state,time){
  const beep=state?.beep;
  if(!beep)return 0;
  return beep.zoom*clamp(1-Math.abs(time-beep.at-400)/400,0,1);
}

export function impostorFlash(state,time){
  return state?.beep?state.beep.alpha*clamp(1-(time-state.beep.at)/600,0,1):0;
}

export function syncImpostorVideo(state,time,rate){
  const video=state?.video;
  if(!video||time<video.at)return;
  const {element}=video;
  if(time>=video.end||element.error){
    closeImpostorVideo(state);
    return;
  }
  element.playbackRate=rate;
  const position=(time-video.at)/1000;
  if(element.readyState>=2&&!element.seeking&&Math.abs(element.currentTime-position)>.16)
    element.currentTime=position;
  if(element.paused&&!element.ended&&!video.starting){
    video.starting=true;
    element.play().catch(()=>{}).finally(()=>{video.starting=false;});
  }
}

export function closeImpostorVideo(state){
  if(!state?.video)return;
  const {element}=state.video;
  state.video=null;
  element.pause();
  element.removeAttribute('src');
  element.load();
}
