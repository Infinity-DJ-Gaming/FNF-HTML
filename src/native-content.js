import {bpmAt} from './core.js';
import {nativeFacing} from './rhythm.js';
import {officialRequiredAssets} from './official-polish.js';
import {naughtyAnimation} from './preferences.js';
import {drawSkyAnimation} from './sky-polish.js';
import {loadExpandedAnimation} from './sky-ui.js';

const PICO_BASE_LABELS={idle:'Idle',singLEFT:'Left',singDOWN:'Down',singUP:'Up',singRIGHT:'Right'};
const PICO_ACTION_LABELS={intro1:'Pissed Off',intro2:'Shoot and Return',cock:'Gun Reload',shoot:'Shoot',
  shootMISS:'Hit',hey:'Hey',cheer:'Cheer',singLEFTmiss:'Left Miss',singDOWNmiss:'Down Miss',singUPmiss:'Up Miss',singRIGHTmiss:'Right Miss'};
export class NativeContent {
 constructor(assets,audio){this.assets=assets;this.audio=audio;this.data={stages:{},characters:{},reuse:{}};this.tintCache=new Map();}
 async load(){const response=await fetch('native-content.json');if(response.ok)this.data=await response.json();return this;}
 async prepare(choice){
   if((choice.characters?.player||choice.character)!=='pico-playable'&&choice.characters?.player!=='pico'&&choice.character!=='pico')return;
   if(!this.picoLoading)this.picoLoading=Promise.all(['weekend-pico-basic','weekend-pico'].map(name=>loadExpandedAnimation({
     image:name+'.png',timeline:name+'-timeline.json',
   }))).then(art=>this.picoArt=art).catch(()=>{this.picoLoading=null;});
   await this.picoLoading;
 }
 stage(choice){return this.data.stages[choice.stage];}
 character(id,player=false){const mapped=this.data.characterIds?.[id];if(mapped&&this.data.characters[mapped])return this.data.characters[mapped];const name=id==='bf-car'?'BF_CAR':id==='mom-car'||id==='mom'?'MOM_CAR':id==='gf-car'?'GF_CAR':id==='gf'||id==='gf-extended'?'GF_EXTENDED':id==='nene'?'NENE_EXTENDED':id==='pico'&&!player?'PICO_OPPONENT':null;return name?this.data.characters[name]:null;}
 required(choice){const stage=this.stage(choice),names=new Set(officialRequiredAssets(choice));if(stage)for(const prop of stage.props)if(prop.assetId)names.add(prop.assetId);const chars=choice.characters||{player:choice.character==='pico'?'pico-playable':'bf',girlfriend:choice.character==='pico'?'nene':'gf',opponent:choice.opponent||'dad'};for(const role of ['player','opponent','girlfriend']){const config=this.character(chars[role],role==='player');if(config)names.add(config.atlasName);const icon=this.data.iconAssets?.[chars[role]];if(icon)names.add(icon);}if(choice.character==='pico')names.add('NENE_EXTENDED');if(choice.opponent==='gf')names.add('GF_EXTENDED');if(chars.girlfriend==='nene-pixel')for(const layer of this.data.pixelABot?.layers||[])names.add(layer.assetId);return [...names];}
 drawCharacter(ctx,id,actor,{x,y,scale=0.65,time=0,beat=0,bpm=100,period=1,player=false,animation=null,animationTime=null,suffix=null,globalOffsets=true,naughtyness=true}={}){const config=this.character(id,player);if(!config)return false;const aliases=config.animationMap||{},idle=!actor||actor.direction==='idle'||time>actor.until,forced=actor?.forced&&time<actor.forced.until?actor.forced:null,dance=aliases.danceLeft?period===0?'danceLeft':(Math.floor(Math.max(0,beat)/Math.max(period,0.000001))%2?'danceRight':'danceLeft'):'idle',base=idle?dance:'sing'+actor.direction,variant=idle?suffix?.idle:suffix?.sing,requested=naughtyAnimation(id,animation||forced?.name||(variant&&aliases[base+variant]?base+variant:base),naughtyness,aliases),alias=aliases[requested]||aliases[requested.replace(/miss|-alt|-sad|-censor/g,'')]||aliases[dance]||aliases.idle||Object.values(aliases)[0];if(!alias)return false;
 const frames=this.assets.frames(config.atlasName,alias.normalPrefix||alias.prefix);if(!frames.length)return false;const fps=alias.fps||24,indices=alias.frameIndices?.length?alias.frameIndices:frames.map((_,i)=>i),phase=animationTime??(forced?time-forced.since:idle?(period===0?0:((beat%period+period)%period)*60000/bpm):time-actor.since),offset=Math.floor(Math.max(0,phase)*fps/1000),index=indices[alias.looped?offset%indices.length:Math.min(indices.length-1,offset)],size=config.logicalIdleSize||config.logicalSize||[500,500],s=scale*(config.metadata?.scale||1),global=globalOffsets&&config.globalOffsets||[0,0];
 const picoLabel=PICO_BASE_LABELS[requested]||PICO_ACTION_LABELS[requested];
 if(id==='pico-playable'&&this.picoArt&&picoLabel){
   // Both native sheets share a baseline, including the gun and miss poses.
   ctx.save();
   ctx.translate(x,y);
   if(nativeFacing(config.nativeFlipX,player))ctx.scale(-1,1);
   drawSkyAnimation(ctx,this.picoArt[PICO_BASE_LABELS[requested]?0:1],phase,-223*s,-475.4*s,{scale:s,label:picoLabel});
   ctx.restore();
   return true;
 }
 ctx.save();if(config.pixel||config.metadata?.isPixel)ctx.imageSmoothingEnabled=false;ctx.translate(x-size[0]*s/2+(global[0]||0)*s,y-size[1]*s+(global[1]||0)*s);if(!config.orientationBaked&&nativeFacing(config.nativeFlipX,player)){ctx.translate(size[0]*s,0);ctx.scale(-1,1);}this.assets.draw(ctx,config.atlasName,frames[index]||frames[0],0,0,s);ctx.restore();return true;
 }
 updateStage(game,time){const stage=this.stage(game.choice);if(!stage||time<0)return;const beat=Math.floor(game.beat);game.stageState??={lastBeat:-1,trainAt:-999999,carAt:-999999};const state=game.stageState;if(state.lastBeat!==beat){state.lastBeat=beat;if(game.choice.stage.startsWith('phillyTrain')&&beat>8&&beat%8===4&&time-state.trainAt>22000&&Math.random()<0.3){state.trainAt=time;this.audio.sfx('train_passes',0.45);}if(game.choice.stage.startsWith('limo')&&time-state.carAt>8000&&Math.random()<0.1){state.carAt=time;this.audio.sfx(Math.random()<0.5?'carPass0':'carPass1',0.6);}}}
 partnerOverride(game,time,id){const age=time-(game.stageState?.trainAt??-999999);if(age>=4700&&age<12000)return {animation:id==='nene'?'hairBlowNormal':'hairBlow',animationTime:age-4700};if(age>=12000&&age<13250)return {animation:id==='nene'?'hairFallNormal':'hairFall',animationTime:age-12000};return {};}
 drawProp(ctx,prop,game,{time,pan=0,worldScale=0.8,originX=40,originY=-70}={}){const assets=this.assets,img=assets.images[prop.assetId];if(!img&&!prop.solid&&!String(prop.assetPath||'').startsWith('#'))return;const pos=[...(prop.position||[0,0])],state=game.stageState||{},trainAge=time-(state.trainAt??-999999),carAge=time-(state.carAt??-999999);if(prop.name==='train'){if(trainAge<4700||trainAge>15000)return;pos[0]=2000-(trainAge-4700)*1.1;}if(prop.name==='fastCar'){if(carAge<0||carAge>1500)return;pos[0]=-2000+carAge*12;}const scale=Array.isArray(prop.scale)?prop.scale:[prop.scale||1,prop.scale||1],x=originX+pos[0]*worldScale-pan*(prop.scroll?.[0]??1),y=originY+pos[1]*worldScale,forced=game.propAnimations?.[prop.name],period=game.eventBop?.[prop.name]??prop.danceEvery??0;
 if(game.choice.baseSong==='blazin'&&['skyAdditive','lightning','foregroundMultiply','additionalLighten'].includes(prop.name)&&time-(game.lastStrike??-10000)>95)return;
 if(prop.name==='scriptedSky'&&(prop.velocityX||prop.scrollXPerSecond)&&img){
   const w=(prop.size?.[0]||img.width)*worldScale*scale[0],h=(prop.size?.[1]||img.height)*worldScale*scale[1],offset=(x+Math.max(0,time)*(prop.velocityX||prop.scrollXPerSecond)/1000*worldScale)%w;
   for(let i=-1;i<Math.ceil(1280/w)+1;i++)assets.image(ctx,prop.assetId,offset+i*w,y,w,h);
   return;
 }
 ctx.save();ctx.globalAlpha*=prop.alpha??1;if(prop.pixel||prop.isPixel)ctx.imageSmoothingEnabled=false;
 const blend=String(prop.blendMode||'').toLowerCase();
 if(blend==='add')ctx.globalCompositeOperation='lighter';else if(['multiply','overlay','screen','darken','lighten','difference'].includes(blend))ctx.globalCompositeOperation=blend;
 if(prop.solid||String(prop.assetPath||'').startsWith('#')){ctx.fillStyle=prop.solid||prop.assetPath;ctx.fillRect(x,y,scale[0]*worldScale,scale[1]*worldScale);ctx.restore();return;}if(prop.name==='lights'){ctx.globalAlpha*=0.25+0.65*(1-(game.beat%4)/4);ctx.globalCompositeOperation='screen';}
 if(assets.atlases[prop.assetId]){const choices=prop.animations||[],dance=period?Math.floor(game.beat/period)%2?'danceRight':'danceLeft':prop.startingAnimation,anim=choices.find(a=>a.name===(forced&&time<forced.until?forced.name:dance))||choices.find(a=>a.name===prop.startingAnimation)||choices[0]||{},frames=assets.frames(prop.assetId,anim.prefix||''),indices=anim.frameIndices?.length?anim.frameIndices:frames.map((_,i)=>i),elapsed=forced&&time<forced.until?time-forced.since:period?((game.beat%period+period)%period)*60000/bpmAt(game.chart,time):time,offset=Math.floor(Math.max(0,elapsed)*(anim.frameRate||24)/1000),index=indices[period||anim.looped===false?Math.min(indices.length-1,offset):offset%indices.length];assets.draw(ctx,prop.assetId,frames[index]||frames[0],x,y,worldScale*scale[0]);}
 else assets.image(ctx,prop.assetId,x,y,(this.data.stageAssets[prop.assetId]?.logicalSize?.[0]||img.width)*worldScale*scale[0],(this.data.stageAssets[prop.assetId]?.logicalSize?.[1]||img.height)*worldScale*scale[1]);ctx.restore();}
}
