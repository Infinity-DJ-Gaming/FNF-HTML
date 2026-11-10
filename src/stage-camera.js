import {eventEase} from './song-events.js';

const mix = (a,b,t) => a+(b-a)*t;

export function cameraTrack(cues,time,initial,resolve) {
  const sample = (index,at) => {
    if (index<0) return initial;
    const [start,target,duration=0,ease='linear']=cues[index];
    const to=resolve(target);
    if (!duration||at>=start+duration) return to;
    const from=sample(index-1,start);
    const progress=eventEase(ease,'InOut',(at-start)/duration);
    return to.map((value,i)=>mix(from[i],value,progress));
  };
  return sample(cues.findLastIndex(([at])=>at<=time),time);
}

export function actorCameraPoint(position,placement,config,scale) {
  const [x,y]=position;
  const [sx=0,sy=0]=placement.cameraOffsets||[];
  const [cx=0,cy=0]=config?.metadata?.cameraOffsets||[];
  const height=(config?.logicalIdleSize||config?.logicalSize||[450,480])[1];
  return [x+sx+cx,y-height*(config?.metadata?.scale||1)*(placement.scale||1)*scale/2+sy+cy];
}

export function nativeChartCamera(game,time,initial,resolve) {
  const cues=game.stageFocusCues??=(game.chart.events||[]).filter(event=>event.e==='FocusCamera').map(event=>{
    const v=typeof event.v==='object'&&event.v?event.v:{char:event.v};
    const bpm=game.chart.tempos?.findLast(tempo=>tempo.time<=event.t)?.bpm||game.chart.bpm||100;
    const duration=v.ease==='INSTANT'?0:v.ease==='CLASSIC'||!v.ease?210:Math.max(0,v.duration??4)*15000/bpm;
    const roles={'-1':'position',0:'player',1:'opponent',2:'girlfriend',bf:'player',boyfriend:'player',dad:'opponent',gf:'girlfriend',partner:'girlfriend'};
    const role=roles[v.char??0]||v.char;
    const ease=v.ease&&v.ease!=='CLASSIC'?(v.easeDir&&/^(In|Out|InOut)$/i.test(v.easeDir)?(/(?:InOut|In|Out)$/i.test(v.ease)?v.ease:v.ease+v.easeDir):v.ease):'quintOut';
    return [event.t,[role,Number(v.x)||0,Number(v.y)||0],duration,ease];
  });
  return cameraTrack(cues,time,initial,resolve);
}
