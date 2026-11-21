import {beatAt,bpmAt,clamp,HIT_WINDOW} from './core.js?v=52a31721d8bc6d';
import {EXPANDED_BASE} from './expanded-content.js?v=52a31721d8bc6d';

export const isQtRewired=choice=>choice?.source==='qt-rewired';
export function qtRequiredArt(choice,art){
  const names=[...(art.stickers[choice.playData.stickerPack]||[])];
  if(choice.baseSong.startsWith('obliterated'))names.push(art.dodged,...Object.values(art.warning).map(clip=>clip.name),...Object.values(art.saw).map(clip=>clip.name));
  if(choice.stage==='qtStage')names.push(art.transform.name);
  if(choice.stage==='qtStagePico')names.push(art.bus.name,art.luckyPlush);
  if(choice.stage==='qtStageCityErect')for(const pack of [art.erectDance,art.caramelDance])names.push(...Object.values(pack).map(clip=>clip.name));
  if(choice.stage==='recordingStudio')names.push(...Object.values(art.collabEnd));
  return names;
}

export function qtSounds(choice){
  if(!isQtRewired(choice))return [];
  if(choice.baseSong==='go-go-go')return ['QTR_gameplay_collabClapClap','QTR_gameplay_collabSongEnd'];
  if(choice.variant==='pico')return ['QTR_gameplay_motorcycle'];
  if(!choice.baseSong.startsWith('obliterated'))return [];
  return [
    ...[1,2,3].flatMap(n=>['QTR_sawblades_alerts_alert-'+n,'QTR_sawblades_attacks_attack-'+n]),
    ...(choice.variant==='erect'?['QTR_gameplay_introObliteratedErect','QTR_gameplay_endingObliteratedErect']:[]),
  ];
}

export function createQtGameplay(choice,chart){
  if(!isQtRewired(choice))return null;
  const attacks=[], cues=[];
  for(const event of chart.events){
    if(event.e!=='sawKB')continue;
    const value=event.v?.num_sawblades;
    const count=({Single:1,Double:2,Triple:3})[value]||Number(value)||1;
    const beat=60000/bpmAt(chart,event.t);
    const theme=count===2?2:1;
    cues.push({at:event.t,label:'alert '+theme+' beat 1',sound:'alert-1',beat},
      {at:event.t+beat,label:'alert '+theme+' beat 2',sound:'alert-'+(count===2?2:1),beat});
    if(count===3)cues.push({at:event.t+2*beat,label:'alert 2 attack 1',sound:'attack-1',beat},
      {at:event.t+3*beat,label:'alert 2 attack 1',sound:'attack-1',beat});
    for(let i=0;i<count;i++){
      const at=event.t+((count===3?4:2)+i)*beat;
      attacks.push({at,index:i,done:false,lead:beat});
      const label=count===1?'alert 1 attack':i===0?'alert 2 attack 1':'alert 2 attack 2';
      cues.push({at,label,sound:'attack-'+(i+1),beat,attack:true});
    }
  }
  attacks.sort((a,b)=>a.at-b.at);
  cues.sort((a,b)=>a.at-b.at);
  let videos=[];
  if(choice.baseSong.startsWith('obliterated')){
    if(choice.variant==='erect'){
      videos=[{at:149673,end:153800,file:'obliteratedErectMid'},{at:153800,end:Infinity,file:'obliteratedErectEdit'}];
    }else{
      const start=chart.events.find(e=>e.e==='cutsceneVideo'),end=chart.events.find(e=>e.e==='cutsceneVideoOut');
      if(start&&end)videos=[{at:start.t,end:end.t,file:'cutscene'}];
    }
  }
  return {attacks,cues,attackIndex:0,cueIndex:0,events:chart.events.filter(e=>['changeStage','blackIn','fadeStart'].includes(e.e)),
    visualIndex:0,videos,stagePhase:'Killer',phaseAt:0,lastTrafficBeat:-1,studio:choice.stage==='recordingStudio',
    erectKiller:choice.stage==='qtStageObliteratedErect',erectCity:choice.stage==='qtStageCityErect',
    nextCarDirection:1,carChance:.1,luckyPlush:Math.random()<.05,gangnam:Math.random()<.05};
}

const caramelCues=[[222,'part1'],[239,'part2'],[256,'jump'],[271,'part3'],[272,'bop'],
  [280,'part4'],[288,'part5'],[296,'part6'],[347,'end']];
export function qtDancePose(game,art,time){
  const beat=Math.floor(game.beat);
  if(game.choice.stage!=='qtStageCityErect'||beat<222||beat>=351)return null;
  const side=beat%2?'right':'left';
  let [at,key]=caramelCues.findLast(([at])=>at<=beat);
  if(game.qt.gangnam||key==='bop'){at=beat;key=side;}
  const clip=(game.qt.gangnam?art.erectDance:art.caramelDance)[key];
  const tempo=game.chart.tempos.findLast(entry=>entry.beat<=at)||game.chart.tempos[0];
  const start=tempo.time+(at-tempo.beat)*60000/tempo.bpm;
  return {clip,frame:Math.floor((time-start)*clip.fps/1000)};
}

export function dodgeQt(game,time,force){
  const qt=game.qt;
  const attack=qt?.attacks.slice(qt.attackIndex).find(a=>!a.done&&Math.abs(a.at-time)<=HIT_WINDOW);
  if(!attack)return false;
  attack.done=true;
  game.stats.health=clamp(game.stats.health+.20,0,2);
  qt.dodgedAt=time;
  force('player','dodge-'+(attack.index%2),time,false);
  return true;
}

function preloadOriginalVideo(qt){
  if(qt.originalVideo)return;
  const controller=new AbortController();
  const request={controller};
  qt.originalVideo=request;
  Promise.all([1,2].map(async part=>{
    const response=await fetch(EXPANDED_BASE+'QTR_cutscene-original-'+part+'.bin',{signal:controller.signal});
    if(!response.ok)throw new Error('The original Obliterated video could not load.');
    return response.arrayBuffer();
  })).then(parts=>{
    if(qt.originalVideo===request)request.url=URL.createObjectURL(new Blob(parts,{type:'video/mp4'}));
  }).catch(error=>{if(error.name!=='AbortError'){request.failed=true;console.warn(error);}});
}

function unloadVideoElement(qt){
  const video=qt.video?.element;
  if(!video)return;
  video.pause();
  video.removeAttribute('src');
  video.load();
  qt.video=null;
}

function updateVideo(qt,time,rate){
  if(qt.videos[0]?.file==='cutscene'&&time>=0&&!qt.originalVideo&&!qt.originalVideoFinished){
    preloadOriginalVideo(qt);
  }
  const current=qt.videos.find(clip=>time>=clip.at&&time<clip.end)
    ||qt.videos.find(clip=>time>=clip.at-3500&&time<clip.at);
  if(!current&&qt.originalVideo&&time>=qt.videos[0].end){
    closeQtVideo(qt);
    qt.originalVideoFinished=true;
  }
  if(qt.video?.clip!==current){
    unloadVideoElement(qt);
    const original=current?.file==='cutscene'?qt.originalVideo:null;
    if(current&&(!original||original.url||original.failed)){
      const element=document.createElement('video');
      element.preload='auto';
      element.muted=true;
      element.playsInline=true;
      element.src=original?.url||EXPANDED_BASE+'QTR_'+current.file+'.mp4';
      qt.video={clip:current,element};
    }
  }
  if(!qt.video||time<qt.video.clip.at)return;
  const video=qt.video.element,at=(time-qt.video.clip.at)/1000;
  if(video.error||video.ended)return;
  video.playbackRate=rate;
  if(video.readyState>=2&&!video.seeking&&Math.abs(video.currentTime-at)>.22&&at<video.duration)video.currentTime=at;
  if(video.paused&&!video.ended&&!qt.video.starting){
    const active=qt.video;
    active.starting=true;
    video.play().catch(()=>{}).finally(()=>{active.starting=false;});
  }
}

export function closeQtVideo(qt){
  if(!qt)return;
  unloadVideoElement(qt);
  if(qt.originalVideo){
    qt.originalVideo.controller.abort();
    if(qt.originalVideo.url)URL.revokeObjectURL(qt.originalVideo.url);
    qt.originalVideo=null;
  }
}

export function updateQt(game,time,{mode,sound,force,reducedMotion=false,songTime=time}){
  const qt=game.qt;
  if(!qt)return;
  while(qt.events[qt.visualIndex]?.t<=time){
    const event=qt.events[qt.visualIndex++];
    if(event.e==='changeStage'){qt.stagePhase=event.v.char;qt.phaseAt=event.t;}
    if(event.e==='blackIn')qt.blackIn=event.t;
    if(event.e==='fadeStart')qt.fadeStart=event.t;
  }
  if(qt.erectKiller&&songTime>=0){
    const beat=beatAt(game.chart,songTime);
    if(!qt.erectOpened){qt.erectOpened=true;sound('QTR_gameplay_introObliteratedErect',1);}
    if(!qt.erectReleased&&beat>=8.5){
      qt.erectReleased=true;
      force('opponent','intro-erect',time,true);
    }
    if(!qt.erectEnded&&beat>=456){qt.erectEnded=true;sound('QTR_gameplay_endingObliteratedErect',1);}
  }
  if(time>=0){
    const beat=Math.floor(game.beat);
    const newBeat=beat!==qt.lastTrafficBeat;
    if(newBeat)qt.lastTrafficBeat=beat;
    if(newBeat&&qt.studio){
      if(beat===110)sound('QTR_gameplay_collabClapClap',1);
      if(beat===286)sound('QTR_gameplay_collabSongEnd',1);
    }
    if(newBeat&&!reducedMotion&&game.choice?.stage==='qtStagePico'){
      if(beat===242&&Math.random()<.05)qt.busAt=time;
      if(time>=(qt.busAt??-Infinity)+18875&&time>=(qt.car?.at??-Infinity)+(qt.car?.duration??0)&&Math.random()<.1){
        const variant=Math.floor(Math.random()*4);
        qt.car={at:time,variant,direction:qt.nextCarDirection,duration:[3250,3900,2600,1875][variant]};
        qt.nextCarDirection*=-1;
        if(variant===3)sound('QTR_gameplay_motorcycle',.8);
      }
    }
    if(newBeat&&!reducedMotion&&game.choice?.stage==='qtStageCityErect'&&beat%4===0){
      if(Math.random()<qt.carChance){
        const variant=1+Math.floor(Math.random()*2);
        qt.car={at:time,variant,duration:2000,y:1150+Math.random()*150};
        qt.carChance=.1;
        sound('carPass'+(variant-1),.7);
      }else qt.carChance+=.1;
    }
  }
  if(mode!=='disabled'){
    while(qt.cues[qt.cueIndex]?.at<=time){
      qt.warning=qt.cues[qt.cueIndex++];
      sound('QTR_sawblades_'+(qt.warning.attack?'attacks_':'alerts_')+qt.warning.sound,.8);
      if(qt.warning.attack)force('girlfriend','dodge',qt.warning.at,false);
    }
    while(qt.attacks[qt.attackIndex]?.at<=time){
      const attack=qt.attacks[qt.attackIndex];
      if(game.botplay&&!attack.done)dodgeQt(game,attack.at,force);
      if(!attack.done&&time<=attack.at+HIT_WINDOW)break;
      if(!attack.done){
        game.stats.health=mode==='instakill'?0:Math.max(0,game.stats.health-1);
        qt.sawDeath=game.stats.health<=0;
        force('player','sawHit-'+(attack.index%2),time,true);
      }
      qt.lastAttack=attack;
      qt.attackIndex++;
    }
  }else{
    qt.warning=null;
    while(qt.cues[qt.cueIndex]?.at<=time)qt.cueIndex++;
    while(qt.attacks[qt.attackIndex]?.at<=time)qt.attackIndex++;
  }
  if(qt.videos.length)updateVideo(qt,songTime,game.modifiers.rate);
  if(qt.erectKiller&&qt.video?.clip.file==='obliteratedErectEdit'&&qt.video.element.ended&&!qt.erectFinalPose){
    qt.erectFinalPose=true;
    force('opponent','tsundere',time,true);
  }
}

export function qtPresentation(qt,beat,time){
  if(!qt)return {};
  const unit=(at,duration)=>clamp((time-at)/duration,0,1);
  if(qt.erectKiller){
    const blackout=time<12500?1-unit(0,12500):
      time<178545?unit(147900,1773):time<189600?1-unit(178545,9500):unit(189600,4650);
    const hud=time<148300?clamp((beat-28)/5,0,1):
      time<152300?1-unit(148300,1800):time<179200?unit(152300,2900):1-unit(179200,5000);
    return {blackout,hud,hideOpponent:time>=152220,centerPlayer:time>=152220};
  }
  if(qt.erectCity){
    const flash=[116840,202490,226380].findLast(at=>at<=time);
    return {hideFeedback:beat>=222&&beat<355||beat>=480&&beat<543,
      opponentAlpha:beat>=221&&beat<348||beat>=478&&beat<544?.3:1,
      flash:flash==null?0:.3*(1-unit(flash,1400))};
  }
  const clip=qt.videos[0];
  if(clip&&qt.fadeStart!=null&&time<clip.end){
    return {hud:1-unit(qt.fadeStart,3000),playerAlpha:1-.33*unit(clip.at,2000)};
  }
  return {};
}

const studioDark=beat=>beat<16||beat>=111&&beat<176||beat>=239&&beat<272;
export function qtProp(prop,qt,time,flashes,{art,elapsed=0,outro=false,reducedMotion=false,beat=0}={}){
  if(!qt)return prop;
  const phase=qt.stagePhase;
  if(qt.studio&&prop.name.endsWith('Dark'))return {...prop,alpha:studioDark(beat)?1:0};
  if(prop.floatY&&!reducedMotion){
    const [frequency,amplitude]=prop.floatY;
    return {...prop,position:[prop.position[0],prop.position[1]+Math.sin(time*frequency/1000)*amplitude]};
  }
  const age=time-(qt.car?.at??-Infinity),onRoad=!reducedMotion&&age>=0&&age<qt.car?.duration;
  if(prop.name==='randomCars'){
    if(!onRoad)return {...prop,alpha:0};
    const progress=(1-Math.cos(Math.PI*age/qt.car.duration))/2;
    const x=qt.car.direction>0?-600+3000*progress:2400-3000*progress;
    return {...prop,alpha:1,startingAnimation:'car-'+qt.car.variant,animationTime:0,flipX:qt.car.direction<0,
      position:[x,prop.position[1]+Math.sin(age/50)*1.5]};
  }
  if(prop.name.startsWith('erectTraffic')){
    return onRoad&&prop.name==='erectTraffic'+qt.car.variant
      ?{...prop,alpha:1,position:[-12600+age*14,qt.car.y]}:prop;
  }
  if(prop.name==='lucky'&&qt.luckyPlush&&art)return {...prop,assetId:art.luckyPlush};
  if(outro){
    const spot=clamp((elapsed-2260)/1100,0,1),red=clamp((elapsed-12000)/700,0,1);
    if(prop.name==='spotLight')return {...prop,alpha:spot*(1-red)};
    if(prop.name==='redScreen')return {...prop,alpha:red};
    if(prop.name==='blackScreen')return {...prop,alpha:spot};
    if(prop.name==='lightOverlay')return {...prop,alpha:1-spot};
  }
  if(prop.name==='blackScreenVideo'){
    const hiding=qt.fadeStart!=null&&time<(qt.videos[0]?.end??0);
    return {...prop,alpha:hiding?clamp((time-qt.fadeStart)/3000,0,1):0};
  }
  if(prop.name==='blackScreenR')return {...prop,alpha:qt.blackIn!=null?1:0};
  if(prop.name==='warningScreen')return {...prop,alpha:phase==='Red'?(flashes?.55+.45*Math.cos((time-qt.phaseAt)*Math.PI/500):.55):0};
  if(prop.name==='blueScreen')return {...prop,alpha:phase==='Blue'?1:0};
  if(prop.name==='tvStaticLeft'||prop.name==='tvStaticRight')return {...prop,alpha:phase==='Killer'?1:0};
  if(['tvLights','tvShine','TVFrontShine'].includes(prop.name)&&phase==='Red'){
    return {...prop,alpha:flashes?.5+.5*Math.cos((time-qt.phaseAt)*Math.PI/500):.6,
      startingAnimation:prop.animations?.some(anim=>anim.name==='Red')?'Red':prop.startingAnimation};
  }
  if(prop.animations?.some(a=>a.name===phase))return {...prop,startingAnimation:phase};
  return prop;
}

export function qtScene(choice,kind,lang='english',zoom){
  if(!isQtRewired(choice))return null;
  const scene=qtSceneDetails(choice,kind,lang,zoom);
  return scene&&{...scene,syncedAudio:true};
}

function qtSceneDetails(choice,kind,lang,stageZoom){
  const line=(at,name,captions)=>({at,name:'QTR_'+name,captions:captions&&'QTR_'+lang+'_'+captions+'.srt'});
  const hi=at=>line(at,'gameplay_countdown_'+lang+'_hi_cutie','hi-cutie');
  const zoom=stageZoom??(choice.variant==='erect'?.585:choice.variant==='pico'?.69:.8);
  const point=(x,y,multiplier=1)=>['position',x,y,zoom*multiplier];
  const focus=(role,x=0,y=0,multiplier=1)=>[role,x,y,zoom*multiplier];
  const greeting=[[0,focus('opponent',0,-235)],[0,focus('opponent',0,0,1.1875),2750,'expoOut']];
  if(choice.baseSong==='blissful'){
    if(kind==='outro'&&choice.variant==='erect')return {
      duration:14000,fadeIn:0,fadeOut:9300,fadeOutDuration:2000,audio:'QTR_outroSong-erect.ogg',audioGain:.2,
      view:{camera:[[0,point(510,923,1.20),2700,'quartInOut'],[2350,point(538,923,1.08),2000,'expoOut'],
        [4650,point(538,923,1.16),800,'quartIn'],[4950,point(538,923,1.12),2200,'expoOut'],
        [5750,point(538,923),1400,'expoOut'],[6400,point(1040,931),2100,'quartInOut'],[8400,point(1040,320),2900,'quartIn']]},
      voiceLines:[line(0,'gameplay_cutsceneSfx_'+lang+'_bf_qt_erect_ending','cutsceneErect_showoff'),
        line(7942,'gameplay_cutsceneSfx_english_bf_bf_erect_shoulder_swish')],
      poses:[[458,'opponent','erectEnding'],[7958,'player','shoulderSwish']],
    };
    if(kind==='outro'&&choice.variant==='classic')return {
      duration:17500,fadeIn:0,fadeOut:15700,fadeOutDuration:1,transform:true,flash:{at:13000,duration:2000,color:'255,255,255',opacity:1,hold:700},
      view:{camera:[[0,['position',860,500,.68]],[1000,['opponent',0,0,.68],2550,'quadInOut']]},
      voiceLines:[line(1000,'qtsfx')],
    };
    if(kind!=='intro')return null;
    if(choice.variant==='erect')return {
      duration:9800,fadeIn:2750,audio:'QTR_introSong-erect.ogg',audioGain:.2,
      view:{camera:[[0,point(538,500,1.08)],[0,point(538,923,1.08),3400,'expoOut'],
        [2590,point(510,923,1.16),3000,'expoOut'],[3483,point(1090,931,1.3),2600,'quartInOut'],
        [5700,point(1040,931,1.16),800,'elasticOut'],[6250,point(510,923,1.16),2500,'quartInOut'],
        [8400,focus('opponent'),4500,'quartInOut']]},
      voiceLines:[line(900,'gameplay_cutsceneSfx_'+lang+'_bf_qt_erect_intro_1','cutsceneErect_alright-cutie'),
        line(4341,'gameplay_cutsceneSfx_english_bf_bf_erect_yeah'),
        line(7100,'gameplay_cutsceneSfx_'+lang+'_bf_qt_erect_intro_2','cutsceneErect_well-see')],
      poses:[[0,'opponent','erectIntro1',900,0],[900,'opponent','erectIntro1'],
        [4341,'player','superHey'],[6000,'opponent','erectIntro2']],
      flash:{at:5740,duration:1400,color:'255,155,246',opacity:.3},
    };
    if(choice.variant==='pico')return {
      duration:11000,fadeIn:2750,audio:'QTR_introSong-pico.ogg',audioGain:.1,bpm:103,
      view:{camera:[...greeting,[3500,focus('player',100,0,1.1875),3000,'quadInOut'],
        [6350,focus('player',100,0,1.25),1500,'quadInOut']]},
      voiceLines:[hi(980),line(4150,'gameplay_cutsceneSfx_pico_introCutscene_picoWave')],
      poses:[[0,'opponent','still',500],[500,'opponent','intro'],[3500,'player','introbl']],
    };
    if(choice.variant==='2021')return null;
    return {
      duration:4000,fadeIn:2750,audio:'QTR_introSong-default.ogg',audioGain:.1,bpm:130,view:{camera:greeting},
      voiceLines:[hi(1090)],poses:[[0,'opponent','still',500],[500,'opponent','intro']],
    };
  }
  if(choice.baseSong==='go-go-go'){
    if(kind==='outro')return {duration:6300,fadeIn:0,collabEnd:true,horse:Math.random()<.005};
    const times=lang==='spanish'?[20,1550,3035]:[0,1240,2900];
    const names=['cg5-line-1','qt-line-1','cg5-line-2'];
    return {duration:lang==='spanish'?5700:5450,view:{camera:[[0,focus('opponent',0,0,1.18)],
      [times[1],focus('player',0,0,1.18),650,'quadInOut'],[times[2],focus('opponent',0,0,1.18),700,'quadInOut']]},
      voiceLines:names.map((name,i)=>line(times[i],'gameplay_introGoGoGo_'+lang+'_'+name,'introGoGoGo_'+name)),
      poses:[[0,'opponent','singUP',1100],[times[1],'player','hey',1500],[times[2],'opponent','singUP',1800]]};
  }
  return null;
}
