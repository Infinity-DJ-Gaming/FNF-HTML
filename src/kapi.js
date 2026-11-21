import {clamp} from './core.js?v=52a31721d8bc6d';

export const isKapi=choice=>choice?.source==='arcade-showdown';
export const KAPI_LANGUAGES={english:'',spanish:'-es',portuguese:'-pt',russian:'-ru'};

export function kapiDialogue(id,language){
  return id+(KAPI_LANGUAGES[language]||'');
}

export function kapiIntro(choice){
  if(!isKapi(choice)||choice.variant==='erect')return null;
  const song=choice.kapiSong;
  if(!['dpz_wocky','dpz_beathoven','dpz_hairball','dpz_nyaw'].includes(song))return null;
  return {dialogue:choice.variant==='pico'?null:'kapi-dialogue-'+song,stomp:song==='dpz_hairball'};
}

export const isPyoro=choice=>isKapi(choice)&&choice.kapiSong==='dpz_pyoro';
export function kapiPadPosition(choice,id,position){
  if(!isKapi(choice)||!['dpz_kapi','dpz_kapi-angry'].includes(id)||!choice.stage?.startsWith('dpz_kapiArcade'))
    return position;
  // The pad is part of the character sheet. Move the character and pad as one.
  return [position[0],position[1]+102];
}
const cityCues=[512,768,1024,1408,1792];

export function kapiStageProp(prop,choice,beat,time,art){
  if(!isKapi(choice))return prop;
  if(choice.kapiSong==='dpz_wocky'&&prop.name==='lilguys')return null;
  if(isPyoro(choice)){
    const step=beat*4;
    if(/^st[1-5]$/.test(prop.name)&&step<cityCues[Number(prop.name[2])-1])return null;
    if(prop.name==='BG'&&step>=1292){
      const index=Math.min(3,Math.floor((step-1292)/2));
      return {...prop,assetId:art.pyoroBackgrounds[index]};
    }
  }
  if(choice.stage==='dpz_kapiArcadeNew'){
    const dark=choice.kapiSong==='dpz_scratch-post'&&beat>=144&&beat<360;
    if(prop.name==='BG-dark'&&!dark||prop.name==='BG'&&dark)return null;
    if(prop.name==='DVD'){
      const bounce=(range,rate)=>range*(1-Math.abs(Math.max(0,time)*rate%2-1));
      return {...prop,position:[prop.position[0]+bounce(180,.0008),prop.position[1]+bounce(132,.0011)]};
    }
  }
  if(prop.name==='lights'&&prop.animations?.length>1){
    const index=Math.floor(Math.max(0,beat))%prop.animations.length;
    const animation=prop.animations[index];
    return {...prop,animations:[animation],startingAnimation:animation.name,danceEvery:1};
  }
  return prop;
}

export function kapiPresentation(choice,beat,bpm){
  if(isPyoro(choice)){
    const msPerBeat=60000/bpm;
    return {
      hideOpponent:true,
      hud:clamp((beat-32)*msPerBeat/5200,0,1),
      blackout:1-clamp((beat-8)*msPerBeat/1200,0,1),
      flash:.232*Math.max(0,...cityCues.map(cue=>beat*4<cue?0:1-(beat-cue/4)*msPerBeat/600)),
    };
  }
  return {blackout:choice?.kapiSong==='dpz_nyaw'&&choice.variant!=='erect'&&beat>=437?1:0};
}

export function kapiReceptor(style,lane,state){
  const dir=['left','down','up','right'][lane],entry=state==='note'?style.note:style.noteStrumline;
  const key=state==='note'?dir:dir+state[0].toUpperCase()+state.slice(1);
  return entry?.data?.[key]?{entry,animation:entry.data[key]}:null;
}

export function noteAnimationFrame(frames,animation,elapsed){
  const index=Math.floor(Math.max(0,elapsed)*(animation.frameRate||24)/1000);
  return frames[animation.looped?index%frames.length:Math.min(frames.length-1,index)];
}
