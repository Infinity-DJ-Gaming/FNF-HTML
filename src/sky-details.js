import {expandedImage,loadExpandedAnimation} from './sky-ui.js?v=52a31721d8bc6d';
import {beatTime,drawSkyAnimation,loadSkyPolishPack} from './sky-polish.js?v=52a31721d8bc6d';
import {EXPANDED_BASE} from './expanded-content.js?v=52a31721d8bc6d';

import {drawRepeatingEffect,makeRepeatingEffect,rollSecret} from './sky-effects.js?v=52a31721d8bc6d';

const mobileSounds=[[1000,'wooshSound'],[3050,'smokinSound'],[3050,'puffySound'],[5000,'wobbly',.4]];
const candyNames=['taco','packofSkittles','popTart','lollipop','jollyRancher'];
const clamp=value=>Math.max(0,Math.min(1,value));
const fract=value=>value-Math.floor(value);

export class SkyDetails {
  async prepare(choice,audio){
    if(choice.characters?.girlfriend==='scenecoresky-shootin'){
      this.flashLoading??=loadSkyPolishPack().then(async pack=>{
        const asset=pack.scenecoreFlashes;
        this.flashes={...asset,image:await expandedImage(asset.image)};
      }).catch(error=>{this.flashLoading=null;console.warn(error);});
      await this.flashLoading;
    }
    const mobile=choice.baseSong==='sky-mobile';
    if(mobile&&!this.mobileLoading){
      this.mobileLoading=loadSkyPolishPack().then(async pack=>{
        const [sky,smoke,sounds]=await Promise.all([
          loadExpandedAnimation(pack.mobileSky),
          expandedImage(pack.mobileSmoke.image),
          Promise.all(mobileSounds.map(async ([,name])=>[name,await audio.load(EXPANDED_BASE+pack.audio[name]).catch(()=>null)])),
        ]);
        this.mobile={sky,smoke:{...pack.mobileSmoke,image:smoke},sounds:Object.fromEntries(sounds)};
      }).catch(error=>{this.mobileLoading=null;console.warn(error);});
    }
    if(!choice.stage?.startsWith('theShift'))return;
    if(!this.loading){
      this.loading=(async()=>{
        const pack=await loadSkyPolishPack();
        this.art=Object.fromEntries(await Promise.all(['angerTile','sceneHearts','angryVignette','candyGradient','tacoGradient',...candyNames]
          .filter(key=>pack[key]).map(async key=>[key,await expandedImage(pack[key])])));
        this.repeat=Object.fromEntries(await Promise.all([['angerTile',.8],['sceneHearts',1]]
          .filter(([key])=>this.art[key]).map(async ([key,scale])=>[key,await makeRepeatingEffect(this.art[key],scale)])));
        this.scream={...pack.scream,image:await expandedImage(pack.scream.image)};
        [this.gesture,this.cup]=await Promise.all([loadExpandedAnimation(pack.bfGesture),loadExpandedAnimation(pack.picoCup)]);
        this.audio=audio;
        this.sounds=Object.fromEntries(await Promise.all(['tomatoThrow','tomatoSplat','boyfriendHawk']
          .filter(name=>pack.audio[name]).map(async name=>[name,await audio.load(EXPANDED_BASE+pack.audio[name]).catch(()=>null)])));
      })().catch(error=>{this.loading=null;console.warn(error);});
    }
    await Promise.all([this.loading,mobile?this.mobileLoading:null]);
  }

  async prepareStickers(choice){
    const set=choice.source==='sky-reborn'?
      (choice.baseSong==='scenecore'?'sky-sticker-set-allegro':choice.variant==='sky'?'sky-sticker-set-sky':choice.character==='pico'?'sky-sticker-set-pico':'sky-sticker-set'):
      (choice.baseSong==='tutorial'?'bonus-tutorial':choice.week==='weekend1'?'bonus-weekend1':choice.character==='pico'?'standard-pico':'standard-bf');
    if(!this.stickers?.[set]){
      this.stickers??={};
      this.stickers[set]=loadSkyPolishPack().then(pack=>Promise.all((pack.stickers[set]||[]).map(expandedImage))).catch(()=>[]);
    }
    return this.stickers[set];
  }

  update(game,time,actors,random=Math.random){
    if(game.custom)return;
    if(game.beat<0)return;
    if(game.choice.baseSong==='sky-mobile'&&this.mobile&&game.beat>=256){
      game.skyMobileAt??=beatTime(game.chart,256);
      game.skyMobileSound??=0;
      const elapsed=time-game.skyMobileAt;
      while(mobileSounds[game.skyMobileSound]?.[0]<=elapsed){
        const [,name,gain]=mobileSounds[game.skyMobileSound++];
        this.playSound(name,gain,this.mobile.sounds);
      }
    }
    if(!game.choice.stage?.startsWith('theShift'))return;
    const {choice,beat}=game;
    const state=game.skyDetails??={beat:-1,at:{},anger:0};
    const cue=(key,at,action)=>{
      if(beat>=at&&state.at[key]===undefined){state.at[key]=time;action();}
    };
    const force=(role,name,duration)=>{actors[role].forced={name,since:time,until:time+duration,lock:true};};
    const suffix=(role,value)=>{
      game.animationSuffix??={};
      game.animationSuffix[role]={idle:value,sing:value};
    };
    const sound=name=>this.playSound(name);
    if(choice.baseSong==='wife-forever'){
      state.block=choice.variant==='classic'&&choice.characters.player==='bf-candy'&&beat>=72&&beat<104;
      if(choice.characters.player==='bf-candy'){
        cue('catch',92,()=>suffix('player','-candy'));
        cue('toss',200,()=>{force('player','candyflip',875);suffix('player','-lollipop');});
        cue('spit',336,()=>{force('player','candyspit',900);sound('boyfriendHawk');suffix('player','');});
      }
    }
    if(Math.floor(beat)!==state.beat){
      state.beat=Math.floor(beat);
      if(!state.cardboardFell&&['theShift','theShiftDark'].includes(choice.stage)&&rollSecret(game.secretChance,choice.stage==='theShift'?.0005:.0025,random)){
        state.cardboardFell=true;
        game.propAnimations??={};
        game.propAnimations.boyfriendCutout={name:'fall',since:time,until:Infinity};
      }
    }
    if(choice.baseSong==='sky'||choice.baseSong==='sky-lyrics'){
      const pose=actors.opponent.forced;
      if(pose&&['yell','mad','flabbergasted','scream','bothered'].includes(pose.name)&&state.pose!==pose.since){
        state.pose=pose.since;state.anger=Math.min(1,state.anger+.12);
      }
    }
  }

  mobileView(game,time,reducedMotion){
    if(game.skyMobileAt==null||!this.mobile)return null;
    const elapsed=time-game.skyMobileAt;
    const loop=elapsed>=12000;
    return {
      elapsed,duringPlay:true,
      camera:reducedMotion?null:[[0,['opponent',0,30,.9],1500,'sineOut']],
      actors:[{role:'opponent',asset:this.mobile.sky,label:loop?'high loop':'smoke',
        age:Math.max(0,elapsed-(loop?12000:1000)),offset:[-208,-620],loop}],
      smoke:elapsed>=3050&&elapsed<7000?{art:this.mobile.smoke,age:elapsed-3050}:null,
      fade:clamp((elapsed-3050)/8000),
    };
  }

  playSound(name,gain=1,sounds=this.sounds){
    const buffer=sounds?.[name],audio=this.audio;
    if(!buffer||!audio?.ctx)return;
    const source=audio.ctx.createBufferSource();
    source.buffer=buffer;
    const level=audio.ctx.createGain();
    level.gain.value=gain;
    source.connect(level);
    level.connect(audio.fx);
    source.onended=()=>{source.disconnect();level.disconnect();};
    source.start();
  }

  chartPose(game,role,name){
    if(game.choice.baseSong==='blissful'&&game.choice.source!=='qt-rewired'){
      if(name==='preDance'){
        game.animationSuffix??={};
        game.animationSuffix[role]={idle:role==='player'?'-caramel':'-alt',dance:true};
        if(role==='player')game.skyDanceLock=true;
      }else if(name==='hey'&&role==='player'||['idle','cheer'].includes(name)&&role==='opponent'){
        if(role==='player')game.skyDanceLock=false;
        if(game.animationSuffix)delete game.animationSuffix[role];
      }
    }
    if(!game.choice.stage?.startsWith('theShift'))return;
    if(role==='opponent'&&name==='caramelTransition'){
      game.animationSuffix??={};
      game.animationSuffix.opponent={idle:'-caramel'};
    }
    if(role==='girlfriend'&&name==='tomatoThrow')this.playSound('tomatoThrow');
    if(role==='opponent'&&name==='tomatoHit'){
      game.animationSuffix??={};
      game.animationSuffix.opponent={idle:'-tomato',sing:'-tomato'};
      this.playSound('tomatoSplat');
    }
  }

  drawScenecoreShot(ctx,shot,position,time,scale,config,flashing){
    if(!this.flashes||!shot||!config)return;
    const age=time-shot.time;
    if(age<0)return;
    const index=Math.floor(age*.024),frame=this.flashes.lanes[shot.lane][index];
    if(!frame?.width||!frame.height)return;
    // Can nozzles in the normalized character poses and matching attachment
    // points in the native, untrimmed four-direction effect frames.
    const [nozzleX,nozzleY]=[[10,698],[796,675],[46,789],[786,769]][shot.lane];
    const [flashX,flashY]=[[290,216],[88,358],[376,260],[306,332]][shot.lane];
    const [width,height]=config.logicalIdleSize,[globalX,globalY]=config.globalOffsets;
    const effectScale=.66;
    const x=position[0]+(-width/2+globalX+nozzleX-(flashX+(frame.frameX||0))*effectScale)*scale;
    const y=position[1]+(-height+globalY+nozzleY-(flashY+(frame.frameY||0))*effectScale)*scale;
    ctx.save();
    if(index<2&&flashing)ctx.globalCompositeOperation='lighter';
    ctx.drawImage(this.flashes.image,frame.x,frame.y,frame.width,frame.height,x,y,frame.width*scale*effectScale,frame.height*scale*effectScale);
    ctx.restore();
  }

  drawSpecialPose(ctx,game,actor,role,position,time,scale){
    const pose=actor?.forced;
    if(role!=='player'||!pose||time<pose.since||time>=pose.until)return false;
    const gesture=pose.name==='pointing',cup=pose.name==='cupThrow'||pose.name==='raspberry';
    const asset=gesture?this.gesture:cup?this.cup:null;
    if(!asset)return false;
    const label=gesture?'Gesture':pose.name==='cupThrow'?'Cup Throw':'Raspberry';
    drawSkyAnimation(ctx,asset,time-pose.since,position[0]-(gesture?183:235)*scale,
      position[1]-(gesture?425:472)*scale,{scale,label,normalize:true});
    return true;
  }

  drawBackdrop(ctx,game,time){
    if(game.choice.stage!=='theShiftDarkErect'||!this.repeat?.angerTile)return;
    const offset=Math.max(0,time)*.075;
    ctx.save();ctx.globalAlpha=.25;ctx.globalCompositeOperation='multiply';
    // Bilinear filtering keeps the moving texture sharp without triggering
    // Canvas's expensive high-quality downsampler for a full-screen pass.
    ctx.imageSmoothingQuality='low';
    drawRepeatingEffect(ctx,this.repeat.angerTile,offset,offset);
    ctx.restore();
  }

  drawForeground(ctx,game,time,reduced){
    if(!this.art||reduced)return;
    const {beat,choice}=game;
    if(choice.baseSong==='wife-forever'&&beat>=72&&beat<136){
      const taco=choice.variant==='erect';
      const gradient=this.art[taco?'tacoGradient':'candyGradient'];
      const opacity=clamp(Math.min(beat-72,136-beat)/3);
      ctx.save();
      ctx.globalAlpha=opacity*.2;
      if(gradient)ctx.drawImage(gradient,0,0,1280,720);
      const pool=(taco?['taco']:candyNames.slice(1)).filter(name=>this.art[name]);
      if(pool.length){
        for(let i=0;i<20;i++){
          const art=this.art[pool[i%pool.length]],phase=fract(time*.00036+i*.137);
          const x=fract(i*.618035)*1280,y=phase*850-75;
          const w=56+i%6*8,h=w*art.height/art.width;
          ctx.save();ctx.globalAlpha=opacity*.71;ctx.translate(x,y);ctx.rotate(time*.002+i);
          ctx.drawImage(art,-w/2,-h/2,w,h);ctx.restore();
        }
      }
      ctx.restore();
    }
    if(choice.stage==='theShiftScenecore'&&this.repeat?.sceneHearts){
      ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.3;
      ctx.imageSmoothingQuality='low';
      drawRepeatingEffect(ctx,this.repeat.sceneHearts,time*.125,time*.125);
      ctx.restore();
    }
    if(this.art.angryVignette&&game.skyDetails?.anger){
      ctx.save();ctx.globalAlpha=game.skyDetails.anger;
      ctx.imageSmoothingQuality='low';
      ctx.drawImage(this.art.angryVignette,0,0,1280,720);ctx.restore();
    }
  }

  drawScream(ctx,game,actor,position,time,scale){
    if(actor.forced?.name!=='scream'||time<actor.forced.since||time>=actor.forced.until||!this.scream?.frames.length)return;
    const {frames,image}=this.scream;
    const f=frames[Math.floor((time-actor.forced.since)*.024)%frames.length];
    ctx.drawImage(image,f.x,f.y,f.width,f.height,position[0]+20*scale,position[1]-530*scale,f.width*scale,f.height*scale);
  }
}
