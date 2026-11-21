import {applyHit,HIT_WINDOW} from './core.js?v=52a31721d8bc6d';
import {EXPANDED_BASE} from './expanded-content.js?v=52a31721d8bc6d';

export const isVamp = choice => choice?.source === 'vs-vamp';
export const vampPose = (art,id,name) => art?.cutscenes[(id+'_'+name).replaceAll('-','_')];

export function createVampGameplay(choice, chart, intro=false){
  if(!isVamp(choice))return null;
  const notes=chart.events.filter(e=>e.e==='SpaceBarNote').map(e=>({time:e.t}));
  const state={notes,index:0,stageBeat:-1};
  if(intro&&choice.baseSong==='vivacious'&&choice.variant==='classic'&&typeof document!=='undefined'){
    const video=document.createElement('video');
    video.src=EXPANDED_BASE+'vamp-vivaciousIntro.mp4';
    video.muted=true;
    video.playsInline=true;
    video.preload='auto';
    state.video=video;
  }
  return state;
}

export function vampHit(state, time, stats){
  let best=null,error=Infinity;
  for(let i=state.index;i<state.notes.length;i++){
    const note=state.notes[i], delta=time-note.time;
    if(delta < -HIT_WINDOW)break;
    if(!note.done&&Math.abs(delta)<=HIT_WINDOW&&Math.abs(delta)<error){best=note;error=Math.abs(delta);}
  }
  if(!best)return null;
  best.done=true;
  const judgement=applyHit(stats,time-best.time);
  state.receptor={animation:'confirm',at:time};
  if(judgement?.name==='sick')state.splash=time;
  return {judgement,delta:time-best.time};
}

export function updateVampNotes(state, time, autoplay, hit, miss){
  while(state.index<state.notes.length){
    const note=state.notes[state.index];
    if(!note.done){
      if(autoplay&&time>=note.time)hit(note.time);
      else if(time-note.time>HIT_WINDOW){note.done=true;miss(time);}
      else break;
    }
    state.index++;
  }
}

export function vampStageCue(game,time,sound,random=Math.random){
  const state=game.vamp;
  if(!state||time<0)return;
  const beat=Math.floor(game.beat),stage=game.choice.stage;
  if(state.drop&&time-state.drop.at>=700&&!state.drop.landed){
    state.drop.landed=true;
    sound('VAMP_caveStalactite',.68);
  }
  if(state.stageBeat===beat)return;
  state.stageBeat=beat;
  if(stage==='vampireCastleErect'){
    if(beat%8===4&&random()<.4){
      state.drop={at:time,x:1100*random(),size:1.5+random()*.5};
      sound('VAMP_stalactiteFall',.65);
    }
    if(beat%4===2&&random()<.3)state.blink={at:time,name:'bat'+(1+Math.floor(random()*2))};
  }else if((stage==='vampireCastle'||stage==='vampireCastleEvil')&&time>=(state.nextFlock??4000)){
    state.flock={at:time,y:-100+300*random(),count:3+Math.floor(random()*5)};
    state.nextFlock=time+4500+random()*8000;
    sound('VAMP_vampBats',.25);
  }
}

export function vampSceneActors(id, art){
  if(!art)return null;
  if(id==='vamp-summon')return {camera:[
    [0,['opponent',0,-30,.60]],[500,['opponent',-100,-30,.90],1250,'circIn'],
    [1750,['opponent',-100,-30,.80],750,'circOut'],
  ],actors:[{role:'opponent',art:art.intro,at:500,offset:[-5,15]}]};
  if(id==='vamp-vivacious-outro')return {camera:[
    [0,['opponent',200,0,.70]],[1,['opponent',-100,5,.80],2000,'quadInOut'],
    [5350,['opponent',-100,5,.60],2000,'circOut'],
  ],actors:[
    {role:'opponent',art:art.vamp,at:0,offset:[115,0],grounded:true},
    {role:'player',art:art.bf,at:0,offset:[30,60]},
    {role:'girlfriend',art:art.gf,at:0,offset:[10,0]},
  ]};
  return null;
}

export function vampQuote(choice,lang,random=Math.random){
  if(!isVamp(choice))return null;
  const first=choice.baseSong==='vamp',pico=choice.variant==='pico';
  const streamer=!pico&&random()<.08;
  const group=pico?'pico':streamer?'streamer':first?'vamp':'vivacious';
  const count=pico?9:streamer?(lang==='japanese'?2:4):first?5:18;
  return {name:'VAMP_'+lang+'_vamp-'+group+'-'+(1+Math.floor(random()*count)),
    delay:pico?(first?3000:2500):(first?2500:4500)};
}

export function vampAtmosphere(game,time,art){
  const state=game.vamp;
  if(time<0||!state||!art)return [];
  const layers=[];
  const add=(assetId,position,zIndex,scale,options={})=>layers.push({z:zIndex,prop:{assetId,position,scale,...options}});
  if(state.flock&&time-state.flock.at<14000){
    const elapsed=(time-state.flock.at)/1000;
    for(let i=0;i<state.flock.count;i++){
      add(art.bat,[2000+i*113-elapsed*200,state.flock.y+(i%3)*34+Math.sin(elapsed*5+i)*13],37,.8,
        {scroll:[.3,.3],animations:[{prefix:'bat',looped:true}]});
    }
  }
  if(state.drop&&!state.drop.landed){
    const elapsed=(time-state.drop.at)/1000;
    add(art.stalactite,[state.drop.x,-1000+elapsed*4500*state.drop.size],307,state.drop.size);
  }
  if(game.choice.stage==='vampireBridge'){
    const cadence=15000/(game.chart.bpm||128),step=Math.floor(time/cadence);
    for(let i=Math.max(0,step-36);i<=step;i++){
      const age=(time-i*cadence)/1000,x=((i*2237)%4000)-2000;
      const y=-200+age*(260+(i*61)%130);
      if(y<1100)add(art.snow,[x+age*(40+(i*7)%40),y],360,.5+(i%9)*.05,{scroll:[1.2,1.2]});
    }
  }
  return layers;
}
