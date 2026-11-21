import {clamp} from './core.js?v=52a31721d8bc6d';
import {eventEase} from './song-events.js?v=52a31721d8bc6d';

export const isSkyRedux=choice=>choice?.source==='sky-redux';

export function reduxIntro(choice,flashing=true,censored=false){
  if(!isSkyRedux(choice)||choice.variant==='pico')return null;
  const song=choice.reduxSong;
  if(song.endsWith('-c')){
    const id=song.slice(0,-2);
    return {dialogue:'redux-dialogue-'+id+(censored&&id==='manifest'?'-censored':'')};
  }
  const file={'wife-forever':'wf',sky:'sky',manifest:'manifest'}[song];
  return {file:'SRX_'+file+(flashing?'':'-nonflashing')+'.mp4'};
}

export function reduxEnding(rank,original){
  const prefix=original?'classic':'redux';
  const kind=rank==='PERFECT_GOLD'?'nut':['PERFECT','EXCELLENT'].includes(rank)?'good':rank==='SHIT'&&!original?'worst':'bad';
  return {image:prefix+'-end-'+kind,track:kind==='nut'?'manifest':kind==='good'?'goodEnding':'badEnding'};
}

function atBeat(chart,beat){
  const tempo=chart.tempos.findLast(entry=>entry.beat<=beat)||chart.tempos[0];
  return tempo.time+(beat-tempo.beat)*60000/tempo.bpm;
}

export function reduxStageFrame(choice,chart,time){
  if(!isSkyRedux(choice))return null;
  if(choice.reduxSong==='manifest'){
    const switchAt=atBeat(chart,466),switched=time>=switchAt;
    return {switched,stage:switched?'redux-mani-redux-2':choice.stage,
      flash:switched?clamp(1-(time-switchAt)/500,0,1):0,
      fade:clamp((time-atBeat(chart,837.5))/3000,0,1)};
  }
  if(choice.reduxSong==='sky'){
    const pico=choice.variant==='pico',at190=atBeat(chart,190),at320=atBeat(chart,320),at390=atBeat(chart,390);
    let bubble=null;
    if(pico)for(const [kind,start,stop] of [['pico',392,414],['sky',418,455]]){
      const age=time-atBeat(chart,start),alpha=clamp(1-(time-atBeat(chart,stop))/1500,0,1);
      if(age>=0&&alpha>0)bubble={kind,age,alpha};
    }
    return {messy:eventEase('circInOut','InOut',(time-at190)/3500)
      * (1-eventEase('circInOut','InOut',(time-at320)/3500)),
      fadeClean:eventEase('quadOut','Out',(time-at390)/(pico?25000:28000)),bubble,
      glareAt:pico?atBeat(chart,392):null};
  }
  return {};
}

export function reduxProp(prop,frame){
  if(frame?.messy==null||['shiftback','backTexture'].includes(prop.name))return prop;
  const alpha=prop.name.endsWith('Mad')?frame.messy:(1-frame.messy)*(1-frame.fadeClean);
  return {...prop,alpha};
}

export function reduxStereoPosition(anchor,config,stageScale,actorScale=stageScale){
  const [width,height]=config.logicalIdleSize;
  const [ox,oy]=config.globalOffsets||[0,0];
  const scale=actorScale*(config.metadata.scale||1);
  return [anchor[0]+(ox-width/2)*scale-200*stageScale,
    anchor[1]+(oy-height)*scale+348*stageScale];
}
