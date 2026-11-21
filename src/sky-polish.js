import {drawSprite,withSpriteFilter} from './sprite-rendering.js?v=52a31721d8bc6d';
import {rollSecret} from './sky-effects.js?v=52a31721d8bc6d';
import {EXPANDED_BASE} from './expanded-content.js?v=52a31721d8bc6d';
import {expandedImage,expandedJSON,loadExpandedAnimation} from './sky-ui.js?v=52a31721d8bc6d';

const TUTORIAL_SOUND='extra-tutorialSfx.ogg';
const TUTORIAL_START_BEAT=6;
const TUTORIAL_GRAB_MS=10/24*1000;
const TUTORIAL_END_MS=7500;
const TAU=Math.PI*2;
const clamp01=value=>Math.max(0,Math.min(1,value));
const modulo=(value,period)=>((value%period)+period)%period;
const isManifest=choice=>/^theShiftManifest(?:Erect)?$/i.test(choice?.stage||'');
const isManifestPico=choice=>choice?.baseSong==='manifest'&&choice.variant==='pico';
const isTutorial=choice=>choice?.baseSong==='tutorial'&&choice.variant==='sky';
const MANIFEST_AUDIO=['runYoPockets','waterThrow','waterSplat','demonAngry','skyYell','flexatone',
  'cupHittinTheGround','steamyHiss','picoRaspberry'];
let packPromise;

export function loadSkyPolishPack(){
  if(!packPromise)packPromise=expandedJSON('sky-polish.json').catch(error=>{packPromise=null;throw error;});
  return packPromise;
}

export function drawSkyAnimation(ctx,asset,time,x,y,{scale=1,label,loop=false,normalize=false}={}){
  if(!asset?.timeline||!asset.image)return;
  const {timeline,image}=asset;
  const [first,length]=timeline.labels[label]||[0,timeline.frames.length];
  if(!length)return;
  const frameIndex=Math.floor(Math.max(0,time)*(timeline.fps||24)/1000);
  const commands=timeline.frames[first+(loop?frameIndex%length:Math.min(length-1,frameIndex))];
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(scale,scale);
  if(normalize)ctx.translate(-timeline.bounds[0],-timeline.bounds[1]);
  for(const command of commands){
    const [sx,sy,w,h]=command.r;
    ctx.save();
    ctx.globalAlpha*=command.a??1;
    ctx.transform(...command.m);
    if(command.rotated){ctx.translate(0,w);ctx.rotate(-Math.PI/2);}
    drawSprite(ctx,image,sx,sy,w,h,0,0,w,h);
    ctx.restore();
  }
  ctx.restore();
}

const labelBoundsCache=new WeakMap();

export function skyAnimationBounds(asset,label){
  const timeline=asset?.timeline;
  if(!timeline)return null;
  let cache=labelBoundsCache.get(timeline);
  if(!cache)labelBoundsCache.set(timeline,cache=new Map());
  if(cache.has(label))return cache.get(label);
  const [first,length]=timeline.labels[label]||[0,timeline.frames.length];
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const frame of timeline.frames.slice(first,first+length)){
    for(const {m:[a,b,c,d,x,y],r:[,,width,height],rotated,a:alpha} of frame){
      if(alpha===0)continue;
      const w=rotated?height:width,h=rotated?width:height;
      left=Math.min(left,x+Math.min(0,a*w)+Math.min(0,c*h));
      right=Math.max(right,x+Math.max(0,a*w)+Math.max(0,c*h));
      top=Math.min(top,y+Math.min(0,b*w)+Math.min(0,d*h));
      bottom=Math.max(bottom,y+Math.max(0,b*w)+Math.max(0,d*h));
    }
  }
  const bounds=Number.isFinite(left)?[left,top,right-left,bottom-top]:null;
  cache.set(label,bounds);
  return bounds;
}

export function drawCenteredSkyAnimation(ctx,asset,time,label,maxScale,loop=false){
  const bounds=skyAnimationBounds(asset,label);
  if(!bounds)return;
  const [left,top,width,height]=bounds;
  const scale=Math.min(maxScale,1140/width,660/height);
  drawSkyAnimation(ctx,asset,time,640-(left+width/2)*scale,360-(top+height/2)*scale,{label,scale,loop});
}

function atlasFrame(asset,time,fps){
  return asset.frames[Math.floor(time*fps/1000)%asset.frames.length];
}

function drawAtlasFrame(ctx,asset,frame,x,y,scaleX,scaleY=scaleX){
  drawSprite(ctx,asset.image,frame.x,frame.y,frame.width,frame.height,
    x-(frame.frameX||0)*scaleX,y-(frame.frameY||0)*scaleY,frame.width*scaleX,frame.height*scaleY);
}

function startSound(audio,buffer,gain=1){
  if(!audio?.ctx||!buffer)return;
  const source=audio.ctx.createBufferSource();
  source.buffer=buffer;
  const level=audio.ctx.createGain();
  level.gain.value=Math.min(1,gain);
  source.connect(level);
  level.connect(audio.fx);
  source.onended=()=>{source.disconnect();level.disconnect();};
  source.start();
}

export function beatTime(chart,beat){
  const tempo=chart.tempos.findLast(change=>change.beat<=beat);
  return tempo.time+(beat-tempo.beat)*60000/tempo.bpm;
}

export class SkyPolish {
  async prepare(choice,audio){
    if(isManifest(choice)&&!this.manifestPromise){
      this.manifestPromise=(async()=>{
        const pack=await loadSkyPolishPack();
        const items=await Promise.all(Object.entries(pack.manifest).map(async ([name,data])=>
          [name,{...data,image:await expandedImage(data.image)}]));
        this.manifest=Object.fromEntries(items);
      })().catch(error=>{this.manifestPromise=null;throw error;});
    }
    if(isTutorial(choice)&&!this.tutorialPromise){
      this.tutorialPromise=(async()=>{
        const pack=await loadSkyPolishPack();
        [this.tutorial,this.tutorialSound]=await Promise.all([
          loadExpandedAnimation(pack.tutorial),
          audio?.load(EXPANDED_BASE+TUTORIAL_SOUND).catch(()=>null),
        ]);
      })().catch(error=>{this.tutorialPromise=null;throw error;});
    }
    if(isManifestPico(choice)&&!this.manifestPicoPromise){
      this.manifestPicoPromise=(async()=>{
        const pack=await loadSkyPolishPack();
        const [props,sounds]=await Promise.all([
          Promise.all(['manifestCup','manifestWater','manifestFried'].map(async name=>{
            const item=pack[name];
            return [name,{...item,image:await expandedImage(item.image)}];
          })),
          Promise.all(MANIFEST_AUDIO.map(async name=>[name,await audio?.load(EXPANDED_BASE+pack.audio[name]).catch(()=>null)])),
        ]);
        this.manifestPico=Object.fromEntries(props);
        this.manifestSounds=Object.fromEntries(sounds);
      })().catch(error=>{this.manifestPicoPromise=null;throw error;});
    }
    if(isManifest(choice))await this.manifestPromise;
    if(isTutorial(choice))await this.tutorialPromise;
    if(isManifestPico(choice))await this.manifestPicoPromise;
  }

  stageLayers(game){
    if(!isManifest(game.choice)||!this.manifest)return [];
    const effects=[{z:-1000,skyEffect:'black'},{z:15,skyEffect:'laser'},
      {z:18,skyEffect:'wall'},{z:500,skyEffect:'foregroundLaser'}];
    if(game.choice.stage.endsWith('Erect'))effects.push({z:1,skyEffect:'giygas'});
    if(game.skyManifestAt!=null&&this.manifestPico){
      effects.push({z:315,skyEffect:'manifestCup'},{z:320,skyEffect:'manifestWater'});
      if(game.skyManifestDead)effects.push({z:315,skyEffect:'manifestFried'});
    }
    return effects;
  }

  drawEffect(ctx,effect,game,{time=0,pan=0,worldScale=0.72,originX=65,originY=-70,mobile=false,reducedMotion=false}={}){
    const seconds=Math.max(0,time)/1000;
    const motion=reducedMotion?0:seconds;
    const erect=game.choice.stage.endsWith('Erect');
    const draw=()=>{
      if(effect==='black'){
        ctx.fillStyle='#000';
        ctx.fillRect(-1280,-720,3840,2160);
      }else if(effect==='laser'||effect==='foregroundLaser'){
        const asset=this.manifest.laser,frame=atlasFrame(asset,motion*1000,24);
        const front=effect==='foregroundLaser',width=frame.frameWidth||frame.width,height=frame.frameHeight||frame.height;
        const swing=Math.sin(motion*4)*(erect?200:100);
        const worldX=front?1602-2*swing:1+swing;
        const angle=(1+(front?-1:1)*Math.sin(motion*2)*10)*(front?2:1);
        ctx.translate(originX+(worldX+width/2)*worldScale-pan,originY+(-500+height/2)*worldScale);
        ctx.rotate(angle*TAU/360);
        if(front)ctx.globalCompositeOperation='lighter';
        const scaleX=worldScale*(front?0.4:1),scaleY=4*worldScale;
        drawAtlasFrame(ctx,asset,frame,-width*scaleX/2,-height*scaleY/2,scaleX,scaleY);
      }else if(effect==='wall'){
        const asset=this.manifest.wall,frame=atlasFrame(asset,motion*1000,12);
        const width=frame.width*worldScale,height=frame.height*worldScale;
        const firstY=modulo(originY-150*worldScale-motion*2000*worldScale,height);
        ctx.globalAlpha*=0.5;
        ctx.globalCompositeOperation='lighter';
        ctx.imageSmoothingEnabled=false;
        const left=modulo(640-width/2-pan,width)-width;
        for(let x=left;x<1280;x+=width)for(let y=firstY-height;y<720;y+=height){
          drawSprite(ctx,asset.image,frame.x,frame.y,frame.width,frame.height,x,y,width,height);
        }
      }else if(effect==='giygas'){
        const asset=this.manifest.giygas,frame=atlasFrame(asset,motion*1000,12);
        const scale=6*worldScale,width=frame.width*scale,height=frame.height*scale;
        const firstX=modulo(originX-pan+motion*50*worldScale,width);
        const firstY=modulo(originY-500*worldScale,height);
        ctx.globalAlpha*=0.3;
        ctx.globalCompositeOperation='lighter';
        ctx.imageSmoothingEnabled=false;
        for(let x=firstX-width;x<1280;x+=width){
          for(let y=firstY-height;y<720;y+=height)drawSprite(ctx,asset.image,frame.x,frame.y,frame.width,frame.height,x,y,width,height);
        }
      }else{
        const elapsed=time-game.skyManifestAt,asset=this.manifestPico[effect];
        if(effect==='manifestCup'&&elapsed>=1850&&elapsed<5400){
          const frameIndex=Math.min(asset.frames.length-1,Math.floor((elapsed-1850)*24/1000));
          const flicker=elapsed>=2400&&!reducedMotion&&Math.floor((elapsed-2400)/60)%2===1;
          if(!flicker)drawAtlasFrame(ctx,asset,asset.frames[frameIndex],originX+1036*worldScale-pan,originY+780*worldScale,worldScale);
        }else if(effect==='manifestWater'&&elapsed>=700&&elapsed<1500){
          const frameIndex=Math.min(asset.frames.length-1,Math.floor((elapsed-700)*24/1000));
          ctx.globalAlpha*=.5;
          ctx.globalCompositeOperation='lighter';
          drawAtlasFrame(ctx,asset,asset.frames[frameIndex],originX+36*worldScale-pan,originY+400*worldScale,worldScale);
        }else if(effect==='manifestFried'&&game.skyManifestDead){
          const frame=atlasFrame(asset,Math.max(0,elapsed-3760),24);
          withSpriteFilter(ctx,'brightness(.88) contrast(1.12)',()=>{
            drawAtlasFrame(ctx,asset,frame,originX+35*worldScale-pan,originY+740*worldScale,worldScale);
          },{x:3,y:-3,color:'#b21a27'});
        }
      }
    };
    ctx.save();
    try {
      if(erect&&mobile&&effect!=='black')withSpriteFilter(ctx,'hue-rotate(-97deg)',draw);
      else draw();
    } finally {
      ctx.restore();
    }
  }

  drawProp(ctx,game,prop,draw,{time=0,mobile=false,worldScale=0.72,originY=-70,reducedMotion=false}={}){
    if(isManifest(game.choice)){
      const {name}=prop;
      if(name==='rocket'&&!prop.alpha||name==='crucifixBlock'&&game.choice.variant==='pico')return;
      if(name==='gradientTop'||name==='gradientBottom'){
        ctx.save();
        ctx.globalCompositeOperation='lighter';
        if(name==='gradientBottom'){
          const y=originY+prop.position[1]*worldScale;
          const height=1339*worldScale*(prop.scale?.[1]||1);
          ctx.translate(0,2*y+height);
          ctx.scale(1,-1);
        }
        if(mobile&&game.choice.stage.endsWith('Erect'))withSpriteFilter(ctx,'hue-rotate(-97deg)',draw);
        else draw();
        ctx.restore();
        return;
      }
    }
    const lighting=this.tutorialLighting(game,time,reducedMotion);
    if(lighting===1||(prop.zIndex||0)>299){draw();return;}
    ctx.save();
    ctx.filter='brightness('+lighting+')';
    draw();
    ctx.restore();
  }

  drawActor(ctx,game,role,draw,{time=0,mobile=false}={}){
    if(role==='player'&&this.tutorialHidesPlayer(game,time))return true;
    if(role==='opponent'&&game.skyManifestDead)return true;
    if(!isManifest(game.choice))return draw();
    const color=mobile&&game.choice.stage.endsWith('Erect')?'#6633f5':'#b21a27';
    const x=role==='player'?-3:role==='opponent'?3:0;
    return withSpriteFilter(ctx,'brightness(.88) contrast(1.12) saturate(1.12)',draw,{x,y:-3,color});
  }

  updateTutorial(game,time,{audio,finish}){
    if(!isTutorial(game.choice)||game.custom||game.beat<TUTORIAL_START_BEAT&&game.skyTutorialAt==null)return false;
    if(game.skyTutorialAt==null){
      // Convert the exact cue beat through the active tempo segment.
      game.skyTutorialAt=beatTime(game.chart,TUTORIAL_START_BEAT);
      game.duration=Math.min(game.duration,game.skyTutorialAt+TUTORIAL_END_MS);
      game.forcedResultRank='SHIT';
      startSound(audio,this.tutorialSound);
    }
    const elapsed=time-game.skyTutorialAt;
    if(elapsed>=TUTORIAL_GRAB_MS&&!game.skyTutorialMuted){
      game.skyTutorialMuted=true;
      audio.stopSources();
    }
    if(elapsed>=TUTORIAL_END_MS&&!game.completed)finish();
    return true;
  }

  updateManifest(game,time,{audio,actors,random=Math.random}){
    if(!isManifestPico(game.choice)||game.custom||game.beat<148)return;
    game.skyManifestBlock=game.beat<168;
    if(game.beat>=160&&game.skyManifestAt==null){
      game.skyManifestAt=beatTime(game.chart,160);
      game.skyManifestLiquid=rollSecret(game.secretChance,.1,random)?'boiling':'water';
      const boiling=game.skyManifestLiquid==='boiling';
      game.skyManifestCues=[
        [0,'runYoPockets','player','cupThrow',1700],
        [700,'waterThrow','opponent',boiling?null:'drenched',1900,2],
        [1000,'waterSplat','opponent',boiling?'burning':'angry',boiling?800:1600],
        [1000,'demonAngry'],
        [1800,'flexatone',null,null,0,.71],[1850,'cupHittinTheGround'],
      ];
      if(boiling)game.skyManifestCues.push([1000,'skyYell'],[1800,null,'opponent','falling',1960],[2350,'steamyHiss']);
      game.skyManifestCues.sort((a,b)=>a[0]-b[0]);
    }
    if(game.skyManifestAt!=null){
      const elapsed=time-game.skyManifestAt;
      while(game.skyManifestCues[0]?.[0]<=elapsed){
        const [offset,sound,role,animation,duration,gain]=game.skyManifestCues.shift();
        if(sound)startSound(audio,this.manifestSounds?.[sound],gain);
        if(animation)actors[role].forced={name:animation,since:game.skyManifestAt+offset,until:game.skyManifestAt+offset+duration,lock:true};
        if(animation==='drenched'){
          game.animationSuffix??={};
          game.animationSuffix.opponent={idle:'-wet',sing:'-wet'};
        }
      }
      if(elapsed>=3760&&game.skyManifestLiquid==='boiling')game.skyManifestDead=true;
    }
    if(game.beat>=292&&!game.skyManifestRaspberry){
      game.skyManifestRaspberry=true;
      startSound(audio,this.manifestSounds?.picoRaspberry);
    }
    audio.muteRole('player',game.skyManifestBlock);
    audio.muteRole('opponent',game.beat>=160&&(game.skyManifestBlock||game.skyManifestLiquid==='boiling'));
  }

  tutorialHidesPlayer(game,time){
    return game.skyTutorialAt!=null&&time-game.skyTutorialAt>=TUTORIAL_GRAB_MS;
  }

  tutorialLighting(game,time,reducedMotion=false){
    if(reducedMotion||game.skyTutorialAt==null)return 1;
    const elapsed=time-game.skyTutorialAt-TUTORIAL_GRAB_MS;
    if(elapsed<0||elapsed>=1450)return 1;
    if(elapsed<1000/24)return 0.067;
    return 0.133+0.867*clamp01((elapsed-1000/24)/1400);
  }

  drawTutorial(ctx,game,time,playerPosition,{stageScale=0.72,reducedMotion=false}={}){
    if(game.skyTutorialAt==null||!this.tutorial)return;
    const elapsed=time-game.skyTutorialAt;
    if(elapsed<0||elapsed>=2000)return;
    const [x,y]=playerPosition;
    const clock=reducedMotion?Math.max(TUTORIAL_GRAB_MS,elapsed):elapsed;
    // The grabbed Sky pose in frame 10 is centered at (-180, 148) at the feet.
    drawSkyAnimation(ctx,this.tutorial,clock,x+180*stageScale,y-148*stageScale,
      {scale:stageScale,label:'Hell Drag'});
  }

  manifestFade(game,time,reducedMotion=false){
    if(game.choice.baseSong!=='manifest'||game.choice.variant!=='erect')return 0;
    return 1-clamp01(time/(reducedMotion?800:12000));
  }
}
