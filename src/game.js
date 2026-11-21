import {renderProfiler} from './render-profiler.js?v=52a31721d8bc6d';
import {collapseDuplicates,duplicateChoices,VariationSelector} from './duplicate-variations.js?v=52a31721d8bc6d';
import {SONGS,WEEKS,bpmAt,dancePeriod,DIFFICULTIES,DEFAULT_SETTINGS,HIT_WINDOW,clamp,readJSON,parseChart,beatAt,nearestNote,makeStats,applyHit,applyMiss,accuracy,rank,normalizeSettings,healthAfterOpponentNote} from './core.js?v=52a31721d8bc6d';
import {builtinTrackOffsets} from './builtin-audio.js?v=52a31721d8bc6d';
import {songIntro,songOutro,pixelStage,rosesFade} from './story-flow.js?v=52a31721d8bc6d';
import {ExpandedContent,EXPANDED_BASE,EXPANDED_WEEKS,playerIdentity} from './expanded-content.js?v=52a31721d8bc6d';
import {ExpandedCutscenes,expandedIntro,expandedOutro,expandedStageIntro,expandedCaptions,scriptedCamera,rollSkyPicoShot,blissfulGreeting} from './expanded-cutscenes.js?v=52a31721d8bc6d';
import {SkyGallery,expandedImage,expandedJSON,loadExpandedAnimation} from './sky-ui.js?v=52a31721d8bc6d';
import {expandedNote,drawExpandedRain} from './expanded-gameplay.js?v=52a31721d8bc6d';
import {PATCH_NOTES} from './patch-notes.js?v=52a31721d8bc6d';
import {rollSecret} from './sky-effects.js?v=52a31721d8bc6d';
import {SkyDetails} from './sky-details.js?v=52a31721d8bc6d';
import {SkyPolish,drawSkyAnimation} from './sky-polish.js?v=52a31721d8bc6d';
import {actorCameraPoint,nativeChartCamera} from './stage-camera.js?v=52a31721d8bc6d';
import {officialStageLayout,officialPartnerAnchor,drawOfficialStageFX,officialRequiredSounds,canFire,isOfficialCanNote,stressSkyPartnerX,stressSkyRunner} from './official-polish.js?v=52a31721d8bc6d';
import {PreferencesMenu,normalizePreferences,bindingFor,noteLaneFor,GamepadPoller,tankmanDeathQuote,naughtyAnimation,skyDeathSounds,ComboFeedback,drawDebugDisplay} from './preferences.js?v=52a31721d8bc6d';
import {Assets} from './assets.js?v=52a31721d8bc6d';
import {AudioEngine} from './audio.js?v=52a31721d8bc6d';
import {ChartEditor} from './editor.js?v=52a31721d8bc6d';
import {installNativeEditor} from './native-editor.js?v=52a31721d8bc6d';
import {chartForSixKeys,SIX_DIRECTIONS,partnerDanceFrame,holdProgress,mobileLaneRegion} from './rhythm.js?v=52a31721d8bc6d';
import {NativeExtras} from './native-extras.js?v=52a31721d8bc6d';
import {NativeResults,nativeResultRank,nativeCompletion,predictedRank} from './native-results.js?v=52a31721d8bc6d';
import {StoryIntros} from './story-intros.js?v=52a31721d8bc6d';
import {PixelUI} from './pixel-ui.js?v=52a31721d8bc6d';
import {NativeContent} from './native-content.js?v=52a31721d8bc6d';
import {isSkyRedux,reduxIntro,reduxEnding,reduxStageFrame,reduxProp,reduxStereoPosition} from './sky-redux.js?v=52a31721d8bc6d';
import {isKapi,isPyoro,kapiIntro,kapiStageProp,kapiPresentation,kapiReceptor,kapiDialogue,kapiPadPosition,noteAnimationFrame} from './kapi.js?v=52a31721d8bc6d';
import {isImpostorWeek,impostorIntro,createImpostorWeek,updateImpostorEvent,impostorCameraPush,impostorFlash,syncImpostorVideo,closeImpostorVideo,impostorAlpha,impostorProp,impostorActorVisible,impostorGroundPosition,impostorLightAnimations} from './impostor.js?v=52a31721d8bc6d';
import {isDefeat,changeComboLimit,defeatHealth,campaignEvent,campaignActorAlpha,campaignTwist,campaignProp,campaignActorPosition,campaignSilhouette,campaignSingers,campaignPose,campaignAssets,campaignUnlocked,campaignAutoNote,henryChoice,remoteScreenRect,drawPinkOverlay} from './impostor-campaign.js?v=52a31721d8bc6d';
import {impostorSkin,impostorPet,restAssets,extraSinger,restEvent,restZoom,restActorOptions,chordTrail,drawChordGhost,drawRestOverlay,drawFinaleHealth,defeatDeathSequence} from './impostor-rest.js?v=52a31721d8bc6d';
import {ImpostorScreenEffects,impostorHUD,impostorJudgement,stageActorAlpha,drawAnimatedHealthIcon} from './impostor-fidelity.js?v=52a31721d8bc6d';
import {isBadBunny,bunnyIntro,updateBunny,bunnyProp} from './bad-bunny.js?v=52a31721d8bc6d';
import {applyExtraEvent,updateExtraEvents,extraCameraTransform,drawExtraOverlay,prepareExtraEventSounds} from './extra-events.js?v=52a31721d8bc6d';
import {TouchControls} from './touch-controls.js?v=52a31721d8bc6d';
import {ModernFreeplay} from './modern-freeplay.js?v=52a31721d8bc6d';
import {CharacterSelect} from './character-select.js?v=52a31721d8bc6d';
import {SceneTransitions} from './transitions.js?v=52a31721d8bc6d';
import {updateChartEvents} from './song-events.js?v=52a31721d8bc6d';
import {drawABot} from './abot.js?v=52a31721d8bc6d';
import {ModLibrary,ModManager} from './mods.js?v=52a31721d8bc6d';
import {drawModCharacter,drawModStageProps} from './mod-visuals.js?v=52a31721d8bc6d';
import {isVamp,createVampGameplay,vampHit,updateVampNotes,vampStageCue,vampSceneActors,vampQuote,vampAtmosphere,vampPose} from './vamp.js?v=52a31721d8bc6d';
import {isQtRewired,createQtGameplay,dodgeQt,updateQt,closeQtVideo,qtProp,qtScene,qtRequiredArt,qtDancePose,qtPresentation,qtSounds} from './qt-rewired.js?v=52a31721d8bc6d';

const canvas=document.querySelector('#screen'),ctx=canvas.getContext('2d',{alpha:false});
const buttonLayer=document.querySelector('#buttons'),announcement=document.querySelector('#announcement');
let savedMenuVersion=0;
const storage={get(k,f){try{return JSON.parse(localStorage.getItem('fnf-week1:'+k))??f;}catch{return f;}},set(k,v){savedMenuVersion++;try{localStorage.setItem('fnf-week1:'+k,JSON.stringify(v));}catch{}}};
window.addEventListener('storage',event=>{if(!event.key||event.key.startsWith('fnf-week1:'))savedMenuVersion++;});
const savedSettings=storage.get('settings',{});
const settings=normalizePreferences(savedSettings,normalizeSettings(savedSettings));
if(!storage.get('settings',null)&&matchMedia('(prefers-reduced-motion: reduce)').matches)settings.reducedMotion=true;
const assets=new Assets(),audio=new AudioEngine(settings),chartCache=new Map(),comboFeedback=new ComboFeedback(settings,audio);
let chartEditor=null;
const impostorScreenEffects=new ImpostorScreenEffects();
const nativeContent=new NativeContent(assets,audio),nativeExtras=new NativeExtras(),nativeResults=new NativeResults();
const storyIntros=new StoryIntros(),skyPolish=new SkyPolish(),skyDetails=new SkyDetails();let introWaiter=null,introAnnouncement='';
const pixelUI=new PixelUI(assets,audio,()=>nativeContent.data);
const variationSelector=new VariationSelector();
const modernFreeplay=new ModernFreeplay(),characterSelect=new CharacterSelect(),sceneTransitions=new SceneTransitions(),modLibrary=new ModLibrary();
installNativeEditor(ChartEditor,{loadRaw:(index,diff)=>rawChoice(songChoice(index,diff)),onDifficulty:value=>difficulty=value,characterChoices:()=>['bf','pico-playable','dad','gf','spooky','monster','pico','mom-car','bf-car','gf-car',...Object.keys(nativeContent.data.characterIds||{}),...modLibrary.records.flatMap(r=>r.items.flatMap(i=>Object.values(i.metadata.playData?.characters||{}).filter(v=>typeof v==='string')))],stageChoices:()=>['mainStage','mainStageErect','spookyMansion','spookyMansionErect','phillyTrain','phillyTrainErect','limoRide','limoRideErect',...Object.keys(nativeContent.data.stages),...modLibrary.songs().map(s=>s.stage)]});
modernFreeplay.backingCard=nativeExtras;
modernFreeplay.healthIcon=id=>{
  if(!id)return null;
  const healthId=nativeContent.character(id)?.metadata?.healthIcon?.id;
  const name=[nativeContent.data.iconAssets?.[id],`HEALTH_${id}`,healthId&&`HEALTH_${healthId}`]
    .find(name=>name&&(assets.images[name]||assets.lazyNames.has(name)));
  if(!name)return null;
  if(assets.images[name])return assets.images[name];
  if(!assets.pending.has(name))assets.ensure([name]).then(()=>assets.lazyNames.delete(name))
    .catch(()=>assets.lazyNames.delete(name));
  return null;
};
modernFreeplay.modIcon=song=>modLibrary.freeplayIcon(song);
const expandedContent=new ExpandedContent(),expandedCutscenes=new ExpandedCutscenes(),skyGallery=new SkyGallery();
let patchPage=0,settingsReturn='menu',pendingRankReveal=null,rankReveal=null;
let skyMenu=null,skySelectLoad=null,skyDJLoad=null,skySecret='';
async function loadExpandedMenu(){
  const menu=await expandedJSON('menu.json');skyMenu=menu.sky;nativeResults.sky=skyMenu;
  const storyImages=[];
  if(menu.vamp){skyMenu.albums.vampvol1=menu.vamp;storyImages.push(menu.vamp.albumArt,menu.vamp.albumTitle,menu.vamp.capsule);}
  const builtInAlbums={...menu.qt?.albums,...menu.redux?.albums,...menu.kapi?.albums,...menu.impostor?.albums,...menu.bunny?.albums};
  if(menu.qt?.plush)storyImages.push(menu.qt.plush);
  if(Object.keys(builtInAlbums).length){
    Object.assign(skyMenu.albums,builtInAlbums);
    storyImages.push(...Object.values(builtInAlbums).flatMap(album=>[album.art,album.title]));
  }
  for(const week of EXPANDED_WEEKS){Object.assign(week,menu.weeks[week.id]);storyImages.push(week.storyProp,week.titleImage,week.storyPlayer,week.storyPartner,week.storyBackground);}
  modernFreeplay.characterIcons={};
  for(const [id,{name,atlas}] of Object.entries(menu.icons)){modernFreeplay.characterIcons[id]=name;modernFreeplay.atlases[name]=atlas;}
  await assets.ensure([...storyImages,...Object.values(modernFreeplay.characterIcons)]);
  for(const name of storyImages.filter(Boolean))assets.lazyNames.delete(name);
  for(const name of Object.values(modernFreeplay.characterIcons)){modernFreeplay.images[name]=assets.images[name];assets.lazyNames.delete(name);}
  if(menu.vamp){
    modernFreeplay.images.vampvol1=assets.images[menu.vamp.albumArt];
    modernFreeplay.images.vampvol1title=assets.images[menu.vamp.albumTitle];
    modernFreeplay.atlases.vampvol1title=assets.atlases[menu.vamp.albumTitle];
    modernFreeplay.images.vampCapsule=assets.images[menu.vamp.capsule];
    modernFreeplay.atlases.vampCapsule=assets.atlases[menu.vamp.capsule];
  }
  for(const [id,album] of Object.entries(builtInAlbums)){
    modernFreeplay.images[id]=assets.images[album.art];
    modernFreeplay.images[id+'title']=assets.images[album.title];
    modernFreeplay.atlases[id+'title']=assets.atlases[album.title];
  }
  modernFreeplay.skyAlbums=skyMenu.albums;
}
async function loadSkySelection(){
  if(!skySelectLoad)skySelectLoad=(async()=>{
    const [chill,name]=await Promise.all([loadExpandedAnimation(skyMenu.charSelect.chill),expandedImage(skyMenu.charSelect.nameTag),assets.ensure(['HEALTH_SKY-PLAYABLE'])]);
    characterSelect.animations.skyChill=chill.timeline;
    characterSelect.images.skyChill=chill.image;
    characterSelect.images.skyName=name;
    characterSelect.images.skyIcon=assets.images['HEALTH_SKY-PLAYABLE'];
  })().catch(error=>{skySelectLoad=null;throw error;});
  return skySelectLoad;
}
function loadSkyDJ(){
  if(!skyDJLoad)skyDJLoad=(async()=>{
    modernFreeplay.skyDJ=await loadExpandedAnimation(skyMenu.freeplay.dj);
    const map={skyBg:'freeplay/freeplayBGsky',skyCard:'freeplay/backingCards/sky/backingGradient',skyClouds:'freeplay/backingCards/sky/cloudsScrolling',skyHeads:'freeplay/backingCards/sky/boyfriendHeads',skyLines:'freeplay/backingCards/sky/backCardLines',skyAurora:'freeplay/backingCards/sky/auroraBlu',skyCapsule:skyMenu.style.capsuleAsset};
    await Promise.all(Object.entries(map).map(async([id,path])=>{
      const entry=skyMenu.freeplay.assets[path];if(!entry)return;
      modernFreeplay.images[id]=await expandedImage(entry.image);
      if(entry.atlas)modernFreeplay.atlases[id]=await expandedJSON(entry.atlas);
    }));
  })().catch(error=>{skyDJLoad=null;console.warn(error);});
  return skyDJLoad;
}
function loadSkyAlbum(id){
  const album=skyMenu?.albums[id];if(!album||modernFreeplay.albumPending?.has(id))return;
  modernFreeplay.albumPending??=new Set();modernFreeplay.albumPending.add(id);
  const {assets:albumAssets}=skyMenu.freeplay;
  const art=albumAssets[album.albumArtAsset],title=albumAssets[album.albumTitleAsset];
  if(art)expandedImage(art.image).then(image=>modernFreeplay.images[id]=image).catch(()=>{});
  if(title)Promise.all([expandedImage(title.image),expandedJSON(title.atlas)]).then(([image,atlas])=>{modernFreeplay.images[id+'title']=image;modernFreeplay.atlases[id+'title']=atlas;}).catch(()=>{});
}
function openSkyGallery(){stopPreview();audio.stopMenu();enter('gallery');skyGallery.begin(skyMenu.gallery,settings.volume).catch(error=>announce(error.message));}
function drawSkyGallery(){
  rect(0,0,1280,720,'#201030');if(skyGallery.background)ctx.drawImage(skyGallery.background,0,0,1280,720);rect(0,0,1280,720,'#16051b6b');const item=skyGallery.data?.items[skyGallery.index],picture=skyGallery.picture;
  if(skyGallery.logo)ctx.drawImage(skyGallery.logo,18,12,222,91);
  if(picture){const scale=Math.min(1040/picture.naturalWidth,485/picture.naturalHeight);const w=picture.naturalWidth*scale,h=picture.naturalHeight*scale;ctx.drawImage(picture,640-w/2,105+(485-h)/2,w,h);}
  if(item&&!skyGallery.hideText){text(item.title,640,598,23,'#fff','center');ctx.save();ctx.font='18px VCR,monospace';ctx.textAlign='center';ctx.fillStyle='#fbbfff';ctx.fillText(item.description||'',640,652,1130);ctx.restore();text((skyGallery.index+1)+' / '+skyGallery.data.items.length,1250,24,20,'#fff','right');}
  text('<',54,334,50);text('>',1210,334,50);newButton('gallery-prev','Previous gallery artwork',0,230,110,230,()=>skyGallery.select(-1));newButton('gallery-next','Next gallery artwork',1170,230,110,230,()=>skyGallery.select(1));footer('LEFT / RIGHT: BROWSE    ESC: BACK');
}
function launchSkySecret(){storage.set('skyLyricsUnlocked',true);const index=SONGS.findIndex(song=>song.id==='sky-lyrics');if(index<0)return;audio.sfx('confirmMenu');difficulty=2;startSong(index,false,false,null,{character:'bf'});}
async function runExpandedSequence(id,script=null){
  const generation=loadGeneration,current=game;
  if(settings.naughtyness===false&&['stressCutscene','stressPicoCutscene'].includes(id))id+='-censored';
  const result=expandedCutscenes.begin(id,{volume:settings.volume,misses:game.stats.misses,script,extraArt:skyMenu.cutsceneExtras,naughtyness:settings.naughtyness!==false,subtitles:settings.subtitles!==false,flashing:settings.flashingLights!==false&& !settings.reducedMotion,audioEngine:audio,alternate:id==='sky-pico-stage'&&rollSkyPicoShot(Math.random,game.secretChance),sfx:(name,gain)=>audio.sfx(name,gain)});
  if(!result)return true;
  enter('cutscene');announce('Cutscene. Press Enter or Escape to skip.');
  const completed=await result;
  if(!completed||generation!==loadGeneration||current!==game)return false;
  if(id==='sky-pico-stage'&&completed.alternate&&completed.art.sky){
    game.skyPicoOutcome={art:completed.art.sky,naughtyness:completed.naughtyness};
    audio.muteRole('opponent',true);
  }
  if(id==='stress-sky-stage'&&completed.art.sniper)game.stressSniper=completed.art.sniper;
  return true;
}
function drawExpandedSequence(){
  const offset=game.completed?game.time:0;
  const subtitles=expandedCutscenes.draw(ctx,frameTime,{stage:(elapsed,view)=>{
    const {id,entry}=expandedCutscenes.current||{},vamp=vampSceneActors(id,nativeContent.data.vamp?.cutscenes);
    game.beat=entry?.bpm?elapsed*entry.bpm/60000:beatAt(game.chart,elapsed);
    if(entry?.reduxEnding){
      const name=entry.reduxEnding,img=assets.images[name],scale=Math.min(1280/img.width,720/img.height);
      image(name,640-img.width*scale/2,360-img.height*scale/2,img.width*scale,img.height*scale,clamp(elapsed/2000,0,1));
      return;
    }
    if(entry?.collabEnd){
      const logos=nativeContent.data.qt.collabEnd;
      const move=clamp((elapsed-1100)/1000,0,1),alpha=clamp((entry.duration-elapsed)/1250,0,1);
      const drawLogo=(name,cx,cy,scale,opacity)=>{
        const image=assets.images[logos[name]],w=image.width*scale,h=image.height*scale;
        assets.image(ctx,logos[name],cx-w/2,cy-h/2,w,h,opacity*alpha);
      };
      drawLogo(entry.horse?'placeholder':'rewiredLogo',640-(entry.horse?0:291*move),360,.6+.32*Math.exp(-elapsed/225),1);
      if(!entry.horse){
        drawLogo('collab',640,360,.55,clamp((elapsed-1450)/700,0,1));
        drawLogo('CG5Logo',1090-145*move,360,.55,clamp((elapsed-1650)/700,0,1));
      }
      if(settings.flashingLights!==false)rect(0,0,1280,720,'rgba(255,255,255,'+clamp(1-elapsed/2000,0,1)+')');
      return;
    }
    return drawStage(offset+elapsed,{...view,...(vamp?{camera:vamp.camera,vampActors:vamp.actors}:{}),elapsed,cutsceneId:id,qtTransform:entry?.transform});
  },
    pose:(at,role,name,duration,speed=1)=>{const actor=role==='player'?actorBF:role==='opponent'?actorDad:actorGF;const length=duration??(nativeContent.animationDuration(stageCharacterId(role),name,role==='player')||950);actor.forced={name,since:offset+at,until:offset+at+length,speed,lock:true};}});
  canvas.dataset.dialogue=subtitles;
  canvas.dataset.cutsceneTime=String(Math.round(expandedCutscenes.current?.elapsed||0));
  newButton('cutscene-next','Continue or skip cutscene',0,0,1280,720,()=>expandedCutscenes.advance(false));
}

WEEKS.push(...EXPANDED_WEEKS);
function songCaptions(choice){
  if(isQtRewired(choice)&&choice.baseSong==='go-go-go')return 'QTR_go-go-go-lyrics.srt';
  if(choice.variant==='sky'){
    const paths=skyMenu.cutsceneExtras.webvtt;
    return paths['data/songs/'+choice.baseSong+'/subtitles/song-lyrics-sky.srt']||
      (choice.baseSong==='stress'?paths['data/subtitles/skyplayable/stress-sky'+(settings.naughtyness===false?'-censored':'')+'.srt']:null);
  }
  if(choice.baseSong==='sky-lyrics')return skyMenu.cutsceneExtras.webvtt['data/songs/sky-lyrics/subtitles/song-lyrics.srt'];
  if(choice.baseSong==='stress')return choice.variant==='pico'?'stress-pico-subtitles.srt':'stress-subtitles.srt';
  return null;
}
const builtinSongs=[...SONGS];let storyWeek=0,characterOpening=false,characterExitAt=0,modsReturn='menu';
function refreshMods(){savedMenuVersion++;SONGS.splice(0,SONGS.length,...builtinSongs,...modLibrary.songs(expandedContent));for(const song of SONGS)for(const level of song.mod?song.difficulties:[])if(!DIFFICULTIES.some(d=>d.toLowerCase()===level))DIFFICULTIES.push(level[0].toUpperCase()+level.slice(1));songIndex=Math.min(songIndex,SONGS.length-1);chartCache.clear();}
const modManager=new ModManager(modLibrary,{onExit:()=>{enter(modsReturn,modsReturn==='menu'?4:songIndex);canvas.focus();},onChange:refreshMods});
function openMods(){modsReturn=scene==='freeplay'?'freeplay':'menu';stopPreview();audio.stop();audio.stopMenu();enter('mods');modManager.open();}
function availableDifficulties(index=songIndex,character=fp.character){
  const song=SONGS[index];
  if(!song)return [];
  if(song.mod)return character==='sky'?[]:song.difficulties.map(level=>DIFFICULTIES.findIndex(name=>name.toLowerCase()===level));
  const levels=expandedContent.levels(song.id,character);
  if(levels.length||song.source||character==='sky')return DIFFICULTIES.flatMap((name,i)=>levels.includes(name.toLowerCase())?[i]:[]);
  const variants=variantCatalog.filter(variant=>variant.baseSong===song.id);
  if(character==='pico')return variants.some(variant=>variant.variant==='pico')?[0,1,2]:[];
  return variants.some(variant=>variant.variant==='erect')?[0,1,2,3,4]:[0,1,2];
}
function storyCharacter(){return WEEKS[storyWeek].character||'bf';}
function storyDifficulties(){return [0,1,2].filter(diff=>WEEKS[storyWeek].songs.every(id=>availableDifficulties(SONGS.findIndex(song=>song.id===id),storyCharacter()).includes(diff)));}
function normalizeDifficulty(index=songIndex,character=fp.character){
  const available=availableDifficulties(index,character);
  if(!available.includes(difficulty))difficulty=available.includes(1)?1:available[0]??1;
}
function weekStart(){return SONGS.findIndex(s=>s.id===WEEKS[storyWeek].songs[0]);}
async function beginCharacterSelection(){if(characterOpening||scene!=='freeplay')return;characterOpening=true;characterExitAt=performance.now();stopPreview();audio.stopMenu();try{await characterSelect.load();await loadSkySelection();const wait=Math.max(0,450-(performance.now()-characterExitAt));if(wait)await new Promise(r=>setTimeout(r,wait));if(scene!=='freeplay')return;enter('character');characterSelect.begin({character:fp.character,volume:settings.volume,reducedMotion:settings.reducedMotion,now:performance.now()});}catch(e){announce(e.message);audio.playMenu();}finally{characterOpening=false;}}
const fp={selectedId:'bopeebo',filter:'all',search:'',sort:'default',favorites:new Set(storage.get('favorites',[])),previewing:false,previewGeneration:0,previewTimer:null,character:playerIdentity(storage.get('character','bf')),instrumental:'default'};
let variantCatalog=[],baseSongCatalog=[];
let viewportWidth=1280,viewportAspect=1;
function updateViewport({width,height}){
  viewportWidth=Math.max(1,width);
  viewportAspect=viewportWidth/Math.max(1,height)/(1280/720);
  const dpr=window.devicePixelRatio||1;
  const density=Math.min(2,Math.max(1,width*dpr/1280,height*dpr/720));
  const drawWidth=Math.round(1280*density),drawHeight=Math.round(720*density);
  if(canvas.width!==drawWidth||canvas.height!==drawHeight){
    canvas.width=drawWidth;
    canvas.height=drawHeight;
  }
}
updateViewport(canvas.getBoundingClientRect());
new ResizeObserver(([entry])=>updateViewport(entry.contentRect)).observe(canvas);
const coarsePointer=matchMedia('(pointer: coarse)');
const mobileDevice=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
function viewAspect(){return viewportAspect;}
function mobileActive(){return settings.touchLayout==='on'||settings.touchLayout!=='off'&&(coarsePointer.matches||mobileDevice);}
function noteInputActive(){return scene==='play'&&!game?.vamp?.video;}
function laneCount(){return game&&['play','paused','results','gameover'].includes(scene)?game.laneCount:settings.keyMode;}
function laneDirection(lane){return laneCount()===6?SIX_DIRECTIONS[lane]:lane;}
function playKeys(){return laneCount()===6?settings.keys6:settings.keys;}
function laneLabel(lane){return DIRECTIONS[laneDirection(lane)]+(laneCount()===6?' '+(lane+1):'');}
const touchControls=new TouchControls(document.querySelector('#game'),{active:()=>noteInputActive()&&mobileActive(),lanes:laneCount,onPress:(lane,at)=>{held.add('touch'+lane);pressLane(lane,at);},onRelease:(lane,at)=>{held.delete('touch'+lane);releaseLane(lane,at);}});
function toggleKeyMode(){settings.keyMode=settings.keyMode===6?4:6;saveSettings();stopPreview();announce(settings.keyMode+' key mode');}
function songChoice(index=songIndex,diff=difficulty,character=fp.character,instrumental=fp.instrumental){
 const song=SONGS[index],level=DIFFICULTIES[diff]?.toLowerCase()||'normal';if(song.mod)return modLibrary.choice(song,level,instrumental);
 const expanded=expandedContent.choice(song.id,character,level,instrumental);
 if(expanded&&(song.source||expandedContent.levels(song.id,character).length)){
   return expanded;
 }
 const kind=character==='pico'?'pico':diff>=3?'erect':null,variant=variantCatalog.find(v=>v.baseSong===song.id&&v.variant===kind),base=baseSongCatalog.find(v=>v.id===song.id),common={opponent:song.opponent||'dad',stage:song.stage||'mainStage',week:song.week??1,noteStyle:base?.playData?.noteStyle,characters:base?.characters||{player:'bf',opponent:song.opponent||'dad',girlfriend:'gf'}};
 if(variant&&variant.charts[level])return {...common,...variant,character,level,chartUrl:''+variant.charts[level],rawData:variant.chartData?.[level],audioUrls:[''+variant.instrumental,''+variant.voices]};
 const suffix=['-easy','','-hard'][Math.min(diff,2)],alternate=instrumental==='pico'?variantCatalog.find(v=>v.baseSong===song.id&&v.variant==='pico'):null;
 return {...common,id:song.id,name:song.name,bpm:song.bpm,character:'bf',level,chartUrl:`${song.id}${suffix}.json`,rawData:base?.chartData?.[level],audioUrls:[alternate?''+alternate.instrumental:`${song.file}_Inst.ogg`,`${song.file}_Voices.ogg`],audioOffsets:builtinTrackOffsets(base,alternate?'pico':null),previewStart:base?.previewStart||12000,previewEnd:base?.previewEnd||36000,album:base?.album||(song.week===2?'volume2':'volume1')};
}

async function rawChoice(choice){if(choice.mod)return modLibrary.chart(choice);if(choice.rawData)return structuredClone(choice.rawData);const response=await fetch(choice.chartUrl);if(!response.ok)throw new Error('The song chart could not be loaded.');return readJSON(await response.text());}
async function prepareExitStickers(choice){
  if(isBadBunny(choice)){
    const names=nativeContent.data.bunny.stickers;
    await assets.ensure(names);return names.map(name=>assets.images[name]);
  }
  if(isImpostorWeek(choice)){
    const names=nativeContent.data.impostor.stickers;
    await assets.ensure(names);
    return names.map(name=>assets.images[name]).filter(Boolean);
  }
  if(isKapi(choice)){
    const names=nativeContent.data.kapi.stickers[choice.character]||nativeContent.data.kapi.stickers.bf;
    await assets.ensure(names);
    return names.map(name=>assets.images[name]).filter(Boolean);
  }
  if(isSkyRedux(choice)){
    const names=nativeContent.data.redux.stickers[choice.playData.stickerPack]||[];
    await assets.ensure(names);
    return names.map(name=>assets.images[name]);
  }
  if(isQtRewired(choice)){
    const names=nativeContent.data.qt.stickers[choice.playData.stickerPack]||[];
    await assets.ensure(names);
    return names.map(name=>assets.images[name]);
  }
  if(!isVamp(choice))return skyDetails.prepareStickers(choice);
  const names=nativeContent.data.vamp[choice.variant==='pico'?'vamp-stickers-pico':'vamp-stickers'];
  await assets.ensure(names);
  return names.map(name=>assets.images[name]);
}
async function loadChoiceTracks(choice){
  await audio.unlock();
  const sources=choice.mod?await modLibrary.audioSources(choice):{urls:choice.audioUrls,offsets:choice.audioOffsets||choice.audioUrls.map(()=>0)};
  const buffers=await Promise.all(sources.urls.map(url=>Array.isArray(url)?audio.loadParts(url):audio.load(url)));
  audio.trimSongs(sources.urls.map(url=>Array.isArray(url)?JSON.stringify(url):url));
  return {...sources,buffers};
}
async function prepareChoice(choice){
  const request=audio.prepareGeneration=(audio.prepareGeneration||0)+1;
  const {buffers,offsets}=await loadChoiceTracks(choice);
  if(request===audio.prepareGeneration){audio.buffers=buffers;audio.trackOffsets=offsets;audio.trackRoles=choice.audioRoles||[];}
  return buffers[0].duration*1000+(offsets[0]||0);
}

function scoreKey(index,character=fp.character,diff=difficulty){if(settings.keyMode===6)return `score6:${SONGS[index].id}:${character}:${DIFFICULTIES[diff]}`;return character==='bf'&&diff<3?`score:${SONGS[index].id}:${diff}`:`score:${SONGS[index].id}:${character}:${DIFFICULTIES[diff]}`;}
const DIRECTIONS=['LEFT','DOWN','UP','RIGHT'],COLORS=['#c24b99','#00ffff','#12fa05','#f9393f'];
const NOTE_PREFIX=['purple0','blue0','green0','red0'];
const BF_OFFSETS={idle:[-5,0],LEFT:[12,-6],DOWN:[-10,-50],UP:[-29,27],RIGHT:[-38,-7]};
const DAD_OFFSETS={idle:[0,0],LEFT:[-10,10],DOWN:[0,-30],UP:[-6,50],RIGHT:[0,27]};
let scene='title',sceneAt=performance.now(),selected=0,difficulty=1,songIndex=0,story=false,storyTotal=0,storyStats=[],storyUsedModifiers=false,game=null;
let pendingAnimationFrame=null,renderWatchdog=null,lastAnimationCallback=0;
function scheduleFrame(){
  if(pendingAnimationFrame!==null)return;
  pendingAnimationFrame=requestAnimationFrame(()=>{
    pendingAnimationFrame=null;
    const now=performance.now();
    const wasStalled=now-lastAnimationCallback>=80;
    lastAnimationCallback=now;
    if(wasStalled&&now-lastFrame<8){scheduleFrame();return;}
    tick(now);
  });
}
let buttons=[],buttonSignature='',frameTime=0,lastFrame=0,flash=0,transition=0,errorText='',loadGeneration=0;
const buttonNodes=new Map(),buttonData=new Map();
let held=new Set(),laneFlashes=[0,0,0,0,0,0],opponentFlashes=[0,0,0,0,0,0],pointerLanes=new Map(),lastPointer=null;
let actorBF={direction:'idle',since:0,until:0},actorDad={direction:'idle',since:0,until:0},actorGF={direction:'idle',since:0,until:0};
let lastCountdown=-99;
let defeatWaiter=null;
let henrySelection=null;
function activateAirshipRemote(){
  if(scene!=='play'||game.impostor?.remoteEntered)return;
  const week=WEEKS.findIndex(week=>week.id==='ImpostorWeek9');
  const index=SONGS.findIndex(song=>song.id===WEEKS[week]?.songs[0]);
  if(week<0||index<0)return;
  game.impostor.remoteEntered=true;
  storage.set('henryUnlocked',true);
  storyWeek=week;held.clear();pointerLanes.clear();
  announce('Teleporter activated. Battling the Boyfriend.');
  startSong(index,true);
}
async function runHenryIntro(){
  if(!await runExpandedSequence('impostor-henry-intro',{file:'IMP6_henry1.mp4'}))return false;
  for(;;){
    enter('henry-select');sceneTransitions.finish();audio.stopMenu();
    const option=await new Promise(resolve=>henrySelection={resolve,game,generation:loadGeneration,index:0,sounds:0,selectedAt:performance.now()});
    if(!option)return false;
    const choice=henryChoice(option,mobileActive());
    if(!await runExpandedSequence('impostor-henry-choice',choice))return false;
    if(!choice.retry)return true;
  }
}
function selectHenryChoice(option){
  if(!henrySelection||frameTime-sceneAt<1500)return;
  const waiter=henrySelection;henrySelection=null;
  enter('loading');sceneTransitions.finish();
  waiter.resolve(waiter.game===game&&waiter.generation===loadGeneration?option:null);
}
function cancelHenrySelection(){
  const waiter=henrySelection;henrySelection=null;waiter?.resolve(null);
  audio.stop();enter(story?'story':'freeplay',story?0:songIndex);
}
function drawHenrySelection(){
  rect(0,0,1280,720,'#000');if(!henrySelection)return;
  const art=nativeContent.data.impostor.henryChoices,age=frameTime-sceneAt,aspect=viewAspect();
  for(const key of ['freeze','gradient']){
    const img=assets.images[art[key]];if(!img)continue;
    const scale=Math.max(1280/img.width,720/(img.height*aspect));
    image(art[key],640-img.width*scale/2,360-img.height*scale*aspect/2,img.width*scale,img.height*scale*aspect);
  }
  const options=[['mic','Microphone','Microphone',-.1,-.05],['sock','Sock puppet','Sock Puppet',.3,-.05],['stare','Stare down','Stare Down',.07,.26]];
  options.forEach(([id,label,prefix,ox,oy],i)=>{
    const appeared=500+i*500;if(age<appeared)return;
    if(henrySelection.sounds<=i){henrySelection.sounds=i+1;audio.sfx('IMP6_'+id,.8);}
    const selected=henrySelection.index===i,frames=assets.frames(art[id],prefix+(selected?' Select':'0000'));
    const frame=frames[Math.min(frames.length-1,Math.floor(Math.max(0,selected?frameTime-henrySelection.selectedAt:0)*.024))]||assets.frames(art[id],prefix)[0];
    if(!frame)return;
    const s=.5,w=(frame.frameWidth||frame.width)*s,h=(frame.frameHeight||frame.height)*s*aspect;
    const progress=clamp((age-appeared)/250,0,1),x=640+1280*ox-w/2,y=360+720*oy-h/2+30*(1-progress);
    ctx.save();ctx.globalAlpha=progress;ctx.translate(x,y);ctx.scale(1,aspect);assets.draw(ctx,art[id],frame,0,0,s);ctx.restore();
    if(age>=1500)newButton('henry-'+id,'Choose '+label,x,y,Math.max(72,w),Math.max(60,h),()=>selectHenryChoice(id),{hover:()=>{if(henrySelection&&henrySelection.index!==i){henrySelection.index=i;henrySelection.selectedAt=frameTime;audio.sfx('IMP6_'+id,.8);}}});
  });
  if(age>=1500){newButton('henry-back','Leave Henry cutscene',0,658,220,62,cancelHenrySelection);text('ESC: BACK',25,685,20);}
}
function runDefeatSelection(){
  game.impostor.comboBreakLimit=5;
  enter('defeat-select');sceneTransitions.finish();
  announce('Defeat. Choose zero to five allowed combo breaks. Left and right to select, Enter to start.');
  return new Promise(resolve=>defeatWaiter={resolve,game,generation:loadGeneration});
}
function changeDefeatLimit(delta){
  game.impostor.comboBreakLimit=changeComboLimit(game.impostor.comboBreakLimit,delta);
  audio.sfx(delta<0?'IMP3_panelAppear':'IMP3_panelDisappear',.5);
  announce(game.impostor.comboBreakLimit+' out of five combo breaks');
}
function confirmDefeatLimit(){
  if(!defeatWaiter)return;
  const waiter=defeatWaiter;defeatWaiter=null;
  audio.sfx('IMP3_amongkill',.9);enter('loading');sceneTransitions.finish();
  setTimeout(()=>waiter.resolve(waiter.game===game&&waiter.generation===loadGeneration),250);
}
function cancelDefeatSelection(){
  const waiter=defeatWaiter;defeatWaiter=null;waiter?.resolve(false);
  audio.stop();enter(story?'story':'freeplay',story?0:songIndex);
}
function drawDefeatSelection(){
  rect(0,0,1280,720,'#000');
  const art=nativeContent.data.impostor.defeatSelector,limit=game.impostor.comboBreakLimit,aspect=viewAspect();
  text(limit+'/5 COMBO BREAKS',640,150,76,'#ff0000','center',3);
  art.dummies.forEach((id,i)=>{
    const img=assets.images[id],x=200+i*150,y=566-(img?.height||0)*aspect;
    if(img)image(id,x,y,img.width,img.height*aspect);
    if(5-i===limit){const arrow=assets.images[art.arrow];if(arrow)image(art.arrow,x,566-166*aspect,arrow.width,arrow.height*aspect);}
    newButton('defeat-limit-'+(5-i),'Allow '+(5-i)+' combo breaks',x-12,385,148,230,()=>{
      if(limit===5-i)confirmDefeatLimit();else changeDefeatLimit((5-i)-limit);
    });
  });
  text(aspect<.8?'TAP TO SELECT. TAP AGAIN TO START.':'LEFT / RIGHT: SELECT    ENTER: START',640,642,aspect<.8?30:23,'#fff','center');
  newButton('defeat-left','Increase allowed combo breaks',10,340,155,265,()=>changeDefeatLimit(1));
  newButton('defeat-right','Decrease allowed combo breaks',1115,340,155,265,()=>changeDefeatLimit(-1));
  text('<',70,480,42);text('>',1207,480,42);
  newButton('defeat-confirm','Start Defeat with '+limit+' combo breaks',330,610,620,70,confirmDefeatLimit);
  newButton('defeat-back','Back to song selection',0,658,220,62,cancelDefeatSelection);text('ESC: BACK',25,685,20);
}
function announce(text){announcement.textContent=text;}
function saveSettings(){storage.set('settings',settings);audio.updateVolume();}
const SAVE_PREFIX='fnf-week1:';
const SAVE_FIELDS=/^(settings|favorites|character|henryUnlocked|skyLyricsUnlocked|(?:score6?|week):[^\u0000-\u001f]{1,200})$/;
function localSaveKeys(){return Object.keys(localStorage).filter(key=>key.startsWith(SAVE_PREFIX)&&SAVE_FIELDS.test(key.slice(SAVE_PREFIX.length)));}
function exportLocalSave(){
  const entries=Object.fromEntries(localSaveKeys().map(key=>[key.slice(SAVE_PREFIX.length),storage.get(key.slice(SAVE_PREFIX.length),null)]));
  const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,entries},null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='fnf-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function resetPreferences(raw={}){
  const next=normalizePreferences(raw,normalizeSettings(raw));
  if(settingsReturn==='paused')for(const key of ['keyMode','practice','botplay'])next[key]=settings[key];
  Object.assign(settings,next);saveSettings();
}
function refreshSavedMenuState(){
  const savedFavorites=storage.get('favorites',[]);
  fp.favorites=new Set(Array.isArray(savedFavorites)?savedFavorites:[]);
  fp.character=playerIdentity(String(storage.get('character','bf')));
}
function importLocalSave(){
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
  input.addEventListener('change',async()=>{
    try{
      const selectedFile=input.files[0];if(!selectedFile)return;
      if(selectedFile.size>5*1024*1024)throw new Error('Save backup is too large.');
      const backup=JSON.parse(await selectedFile.text());
      if(backup.version!==1||!backup.entries||typeof backup.entries!=='object'||Array.isArray(backup.entries))throw new Error('Invalid FNF save backup.');
      const entries=Object.entries(backup.entries).filter(([key,value])=>SAVE_FIELDS.test(key)&&value!==null);
      for(const key of localSaveKeys())localStorage.removeItem(key);
      savedMenuVersion++;
      for(const [key,value] of entries)storage.set(key,value);
      const next=storage.get('settings',{});resetPreferences(next&&typeof next==='object'?next:{});
      refreshSavedMenuState();announce('Save data imported.');
    }catch(error){announce(error.message);}
  },{once:true});
  input.click();
}
const preferences=new PreferencesMenu({
  settings,assets,audio,save:saveSettings,announce,sfx:(name,gain)=>audio.sfx(name,gain),
  onExit:()=>{
    const destination=settingsReturn;
    saveSettings();
    settingsReturn='menu';
    if(destination==='paused')applyPausedModifiers();
    enter(destination,destination==='paused'?2:destination==='freeplay'?songIndex:3);
  },
  onLagChange:(active,paused)=>{
    if(active)audio.stopMenu();
    else if(paused)audio.playMenu(pauseMusic());
    else audio.playMenu();
  },
  exportSave:exportLocalSave,importSave:importLocalSave,
  clearSave:()=>{for(const key of localSaveKeys())localStorage.removeItem(key);savedMenuVersion++;resetPreferences();refreshSavedMenuState();announce('Save data cleared.');},
  resetSettings:()=>{resetPreferences();announce('Default settings restored.');},
  capabilities:{rewiredHazards:true,rewiredLanguage:true,rewiredPlushie:true,screenshots:true},
});
const gamepads=new GamepadPoller();
function text(str,x,y,size=24,color='#fff',align='left',stroke=3){ctx.save();ctx.translate(x,y);ctx.scale(1,viewAspect());x=0;y=0;ctx.font=`${size}px VCR, monospace`;ctx.textAlign=align;ctx.textBaseline='top';ctx.lineWidth=stroke*2;ctx.lineJoin='round';ctx.strokeStyle='#000';if(stroke)ctx.strokeText(str,x,y);ctx.fillStyle=color;ctx.fillText(str,x,y);ctx.restore();}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function letters(str,x,y,scale=1,options={}){assets.letters(ctx,str,x,y,scale,options);}
function image(name,x,y,w,h,alpha){assets.image(ctx,name,x,y,w,h,alpha);}
function atlasFrame(atlas,prefix,x,y,scale=1,index=0,alpha=1){assets.draw(ctx,atlas,assets.frame(atlas,prefix,index),x,y,scale,alpha);}
function animation(atlas,prefix,x,y,scale=1,time=frameTime-sceneAt,options={}){assets.anim(ctx,atlas,prefix,x,y,scale,time,options);}
function centerSprite(atlas,prefix,cx,y,scale=1,time=frameTime-sceneAt,options={}){const f=assets.frame(atlas,prefix);if(!f)return;animation(atlas,prefix,cx-(f.frameWidth||f.width)*scale/2,y,scale,time,options);}
function newButton(id,label,x,y,w,h,action,extra={}){buttons.push({id,label,x,y,w,h,action,...extra});}
function syncButtons(){
  const ids=new Set(buttons.map(b=>b.id));for(const [id,node] of buttonNodes)if(!ids.has(id)){node.remove();buttonNodes.delete(id);buttonData.delete(id);}
  for(const b of buttons){buttonData.set(b.id,b);let el=buttonNodes.get(b.id);if(!el){el=document.createElement('button');el.className='hitbox';el.dataset.id=b.id;
      el.addEventListener('click',e=>{const current=buttonData.get(b.id);if(!current||current.lane!==undefined||current.tapOnDown&&e.detail>0)return;e.preventDefault();audio.unlock().catch(()=>{});current.action(e);canvas.focus({preventScroll:true});});
      el.addEventListener('pointerenter',()=>buttonData.get(b.id)?.hover?.());
      el.addEventListener('focus',()=>{const current=buttonData.get(b.id);if(current?.select!==undefined&&selected!==current.select){selected=current.select;audio.sfx('scrollMenu',0.5);}});
      el.addEventListener('pointerdown',e=>{const current=buttonData.get(b.id);if(current?.tapOnDown){e.preventDefault();if(current.exclusive)e.stopPropagation();current.action(e);canvas.focus({preventScroll:true});return;}if(current?.lane===undefined)return;e.preventDefault();el.setPointerCapture(e.pointerId);pointerLanes.set(e.pointerId,current.lane);held.add('touch'+current.lane);pressLane(current.lane,e.timeStamp);});
      const release=e=>{const lane=pointerLanes.get(e.pointerId);if(lane!==undefined){pointerLanes.delete(e.pointerId);if(![...pointerLanes.values()].includes(lane)){held.delete('touch'+lane);releaseLane(lane,e.timeStamp);}}};el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);
      buttonNodes.set(b.id,el);buttonLayer.append(el);
    }
    if(el.getAttribute('aria-label')!==b.label)el.setAttribute('aria-label',b.label);const layout=`left:${b.x/12.8}%;top:${b.y/7.2}%;width:${b.w/12.8}%;height:${b.h/7.2}%;z-index:${b.zIndex||0};`;if(el.dataset.layout!==layout){el.style.cssText=layout;el.dataset.layout=layout;}
  }
}
function enter(next,index=0){
  if(game?.impostor&&next!=='play'){
    if(['paused','settings'].includes(next))game.impostor.video?.element.pause();
    else if(['menu','freeplay','story','results','gameover','loading','editor'].includes(next))closeImpostorVideo(game.impostor);
  }
  if(game?.qt){
    if(['paused','settings'].includes(next))game.qt.video?.element.pause();
    else if(next!=='play')closeQtVideo(game.qt);
  }
  if(scene==='play'&&next!=='play')game?.vamp?.video?.pause();if(game?.vamp?.video&&['menu','freeplay','story','results','gameover','loading'].includes(next)){game.vamp.video.removeAttribute('src');game.vamp.video.load();game.vamp.video=null;}if(scene==='cutscene'&&next!=='cutscene')expandedCutscenes.stop(false);if(scene==='gallery'&&next!=='gallery')skyGallery.stop();if(scene==='intro'&&next!=='intro'){storyIntros.stop();if(introWaiter){introWaiter.resolve(false);introWaiter=null;}}if(scene==='results'&&next!=='results')nativeResults.stop();sceneTransitions.begin(canvas,scene,next,{reducedMotion:settings.reducedMotion,
  stickers:['play','paused','results','gameover','cutscene'].includes(scene)&&['freeplay','story','menu'].includes(next)?game?.exitStickers||'cards':null});if(scene==='freeplay'&&next!=='freeplay'){stopPreview();finishRankReveal(false);}scene=next;sceneAt=performance.now();selected=index;transition=0;buttonSignature='';held.clear();pointerLanes.clear();touchControls.clear();if(next==='freeplay'){songIndex=SONGS[index]?index:songIndex;const list=freeplaySongs();if(!list.includes(SONGS[songIndex])&&list.length)songIndex=SONGS.indexOf(list[0]);fp.selectedId=list.includes(SONGS[songIndex])?SONGS[songIndex].id:'random';if(fp.character==='sky')loadSkyDJ();normalizeDifficulty();const pending=pendingRankReveal;pendingRankReveal=null;
if(pending&&pending.song===fp.selectedId&&pending.character===fp.character&&pending.level===difficulty)rankReveal={...pending,at:sceneAt+(sceneTransitions.blocking?sceneTransitions.duration:0),cue:0};
else fp.previewTimer=setTimeout(schedulePreview,sceneTransitions.blocking?sceneTransitions.duration:0);}if(next==='story'&&!storyDifficulties().includes(difficulty))difficulty=storyDifficulties().includes(1)?1:storyDifficulties()[0]??1;if(next==='paused')audio.playMenu(pauseMusic());else if(!(settingsReturn==='paused'&&next==='settings')&&!['play','loading','gameover','paused','results','result-loading','editor','mods','character','intro','cutscene','gallery','henry-select'].includes(next))audio.playMenu();announce(next==='menu'?'Main menu. Story mode, Freeplay, Donate and credits, Options.':next==='freeplay'?`Freeplay. ${SONGS[songIndex].name}. ${DIFFICULTIES[difficulty]}.`:next==='story'?`Story mode. Week ${WEEKS[storyWeek].id}: ${WEEKS[storyWeek].name}. ${DIFFICULTIES[difficulty]}.`:next==='settings'?'Options. Use up and down to select, left and right to change.':next==='controls'?'Key bindings. Select a direction and press Enter to change its key.':next);}
function back(){if(scene==='henry-select'){cancelHenrySelection();return;}if(scene==='defeat-select'){cancelDefeatSelection();return;}if(scene==='cutscene'){expandedCutscenes.advance(true);return;}if(scene==='gallery'||scene==='patch-notes'){enter('menu',scene==='patch-notes'?6:5);return;}if(scene==='intro'){storyIntros.skip(performance.now());return;}audio.sfx('cancelMenu');if(scene==='character'){characterSelect.cancel(performance.now());return;}if(scene==='album'||scene==='instrumental'){enter('freeplay',songIndex);return;}if(scene==='play'){pauseGame();return;}if(scene==='paused'){resumeGame();return;}if(scene==='gameover'){exitSong();return;}if(scene==='results'){enter(story?'story':'freeplay',story?0:songIndex);return;}if(scene==='settings'){preferences.back();return;}if(scene==='credits'){enter('menu',2);return;}if(scene==='loading'){loadGeneration++;audio.stop();enter(story?'story':'freeplay');return;}if(scene==='menu'){enter('title');return;}if(scene==='title')return;enter('menu',scene==='freeplay'?1:0);}
function menuBackground(name='menuBG',tint=null){const img=assets.images[name];const scale=Math.max(1280/img.width,720/img.height)*1.1;image(name,(1280-img.width*scale)/2,(720-img.height*scale)/2,img.width*scale,img.height*scale);if(tint){ctx.save();ctx.globalCompositeOperation='multiply';rect(0,0,1280,720,tint);ctx.restore();}}
function footer(hint='ARROWS: SELECT    ENTER: CONFIRM    ESC: BACK'){text(hint,22,688,19,'#fff','left',2);newButton('back','Back',0,665,140,55,back);}
function difficultyControl(x,y){const name=DIFFICULTIES[difficulty].toUpperCase();atlasFrame('campaign_menu_UI_assets','arrow left',x,y+2,0.65);const f=assets.frame('campaign_menu_UI_assets',name);if(f)atlasFrame('campaign_menu_UI_assets',name,x+52+(190-f.width*0.7)/2,y,0.7);atlasFrame('campaign_menu_UI_assets','arrow right',x+254,y+2,0.65);newButton('difficulty-left','Previous difficulty',x-12,y-12,62,72,()=>changeDifficulty(-1));newButton('difficulty-right','Next difficulty',x+240,y-12,70,72,()=>changeDifficulty(1));}
function changeDifficulty(delta){
  if(scene==='freeplay')finishRankReveal(false);
  const list=scene==='freeplay'?freeplayDifficulties():storyDifficulties();
  if(!list.length)return;
  difficulty=list[(Math.max(0,list.indexOf(difficulty))+delta+list.length)%list.length];
  if(scene==='freeplay'){
    const songs=freeplaySongs();
    if(fp.selectedId!=='random'&&!songs.some(song=>song.id===fp.selectedId))selectFreeplay(songs[0]?.id||'random');
    else schedulePreview();
  }
  audio.sfx('scrollMenu',0.6);
  announce(DIFFICULTIES[difficulty]);
}

function bestFor(index=songIndex,character=fp.character,diff=difficulty){return storage.get(scoreKey(index,character,diff),null);}
function openMenuChoice(){audio.sfx('confirmMenu');const choice=selected;if(choice===0)enter('story');else if(choice===1)enter('freeplay',songIndex);else if(choice===2)enter('credits');else if(choice===3)openSettings();else if(choice===4)openMods();else if(choice===5&&!settings.skyDisableMenus)openSkyGallery();else if(choice===6){patchPage=0;enter('patch-notes');}}
function drawTitle(){
  rect(0,0,1280,720,'#000');const beat=(audio.menu?.currentTime||((frameTime-sceneAt)/1000))*102/60;const phase=(beat%1)*60000/102;
  const gfFrames=assets.frames('gfDanceTitle','gfDance');
  const gfIndex=settings.reducedMotion?0:(Math.floor(beat)%2)*15+Math.min(14,Math.floor(phase/1000*24));
  assets.draw(ctx,'gfDanceTitle',gfFrames[gfIndex]||gfFrames[0],512,50,1);
  animation('logoBumpin','logo bumpin',-150,-100,1,settings.reducedMotion?0:phase,{loop:false});
  centerSprite('titleEnter','Press Enter to Begin',640,576,0.73,frameTime-sceneAt);
  newButton('begin','Press Enter to begin',0,0,1280,672,beginFromTitle);
}
function drawMenu(){
  menuBackground('menuBG');const items=['story mode','freeplay','donate','options'];
  items.forEach((name,i)=>{const active=selected===i;const prefix=name+(active?' white':' basic');const f=assets.frame('FNF_main_menu_assets',prefix);const scale=active?0.93:0.85;const y=28+i*124;centerSprite('FNF_main_menu_assets',prefix,640,y,scale,settings.reducedMotion?0:frameTime-sceneAt);newButton('main-'+i,name==='donate'?'Donate and credits':name,640-(f?.width||500)*scale/2-20,y-8,(f?.width||500)*scale+40,130,()=>{selected=i;openMenuChoice();},{select:i});});
  letters('mods',640,544,0.87,{align:'center',alpha:selected===4?1:0.65});newButton('main-4','Mods',360,525,560,110,()=>{selected=4;openMods();},{select:4});
  const plush=nativeContent.data.qt?.plush;
  if(plush&&settings.qtPlushieButton){
    image(plush,34,513,112,136);
    newButton('qt-week','Open the QT: Rewired campaign',24,502,135,152,()=>{
      storyWeek=WEEKS.findIndex(week=>week.id==='QTWeek');
      enter('story');
    });
  }
  if(skyMenu&&!settings.skyDisableMenus){text('SKY GALLERY',1248,603,24,selected===5?'#fff':'#fbb4f6','right');newButton('main-5','Sky Reborn gallery',965,571,305,70,()=>{selected=5;openSkyGallery();},{select:5});}
  text('PATCH NOTES',1248,642,24,selected===6?'#fff':'#fbb4f6','right');
  newButton('main-6','Patch notes',1010,624,265,54,()=>{selected=6;openMenuChoice();},{select:6});
  text("Friday Night Funkin'",1260,692,16,'#fff','right');
}
function drawStory(){const week=WEEKS[storyWeek];
 rect(0,0,1280,720,'#000');rect(0,58,1280,378,week.color||'#f9cf51');text('WEEK SCORE: '+storage.get('week:'+week.id+':'+difficulty,0),16,16,28);text(week.name,1260,16,30,'#aaa','right');
 if(week.storyBackground)image(week.storyBackground,0,58,1280,378);
 const beat=(audio.menu?.currentTime||0)*102/60,phase=(beat%1)*588;
 if(!week.storyBackground){
 if(week.storyProp)animation(week.storyProp,week.storyPrefix||'idle',110,92,week.storyScale??.82,settings.reducedMotion?0:phase,{loop:false});else if(week.id===5)animation('W56_storyparents','idle',100,70,0.9,settings.reducedMotion?0:phase,{loop:false});else if(week.id===6)animation('W56_storysenpai','idle',160,100,1,settings.reducedMotion?0:phase,{loop:false});else if(week.id===3)animation('STORY_PICO','idle',160,100,1,settings.reducedMotion?0:phase,{loop:false});else if(week.id===4)animation('STORY_MOM','idle',160,75,0.77,settings.reducedMotion?0:phase,{loop:false});else if(week.id===0)animation('campaign_menu_UI_characters','GF Dancing Beat WHITE',160,100,0.48,settings.reducedMotion?0:phase,{loop:false});else if(week.id===2)animation('STORY_SPOOKY','Story Spooky idle',150,90,1,settings.reducedMotion?0:phase,{loop:false});else animation('campaign_menu_UI_characters','Dad idle dance BLACK LINE',150,74,0.46,settings.reducedMotion?0:phase,{loop:false});
 if(week.storyPlayer)animation(week.storyPlayer,'idle',588,155,0.92,phase,{loop:false});else animation('campaign_menu_UI_characters','BF idle dance white',596,210,0.48,settings.reducedMotion?0:phase,{loop:false});const gf=assets.frames('campaign_menu_UI_characters','GF Dancing Beat WHITE');if(week.storyPartner)animation(week.storyPartner,'idle',928,68,0.9,phase+(Math.floor(beat)%2)*600,{loop:false});else if(week.id!==0&&!week.hideStoryPartner)assets.draw(ctx,'campaign_menu_UI_characters',gf[(Math.floor(beat)%2?15:0)+Math.min(14,Math.floor(phase/1000*24))],930,110,0.48);
 }
 if(week.titleImage)image(week.titleImage,196,458,265,94);else if(week.id===0||typeof week.id==='string')letters(week.id===0?'tutorial':week.id==='weekend1'?'weekend 1':'sky reborn',325,473,0.6,{align:'center'});else{letters('week',295,473,0.85,{align:'center'});text(String(week.id),420,474,53);}newButton('story-week','Play Week '+week.id+': '+week.name,90,448,580,115,()=>startSong(weekStart(),true));
 const trackTop=week.songs.length>3?551:573;text('TRACKS',325,trackTop,27,'#e557a3','center');week.songs.forEach((id,i)=>text(SONGS.find(s=>s.id===id).name.toUpperCase(),325,trackTop+32+i*22,23,'#e557a3','center',0));difficultyControl(850,494);
 newButton('week-prev','Previous week',0,440,90,120,()=>navigate(-1));newButton('week-next','Next week',675,440,90,120,()=>navigate(1));text('<',38,486,36);text('>',707,486,36);text('ENTER TO PLAY',996,578,23,'#aaa','center');newButton('story-play','Start Week '+week.id,810,567,375,70,()=>startSong(weekStart(),true));footer('UP / DOWN: WEEK    LEFT / RIGHT: DIFFICULTY    ENTER: START');
}

function openSettings(from='menu',page='root'){
  settingsReturn=from;
  enter('settings');
  preferences.open({paused:from==='paused',page});
}
function drawPatchNotes(){
  const page=PATCH_NOTES[patchPage];menuBackground('menuBGMagenta');rect(57,48,1166,617,'#120818ee');
  letters('patch notes',640,75,1,{align:'center'});text(page.title.toUpperCase(),640,163,27,'#ffca53','center');
  page.sections.forEach(([label,description],index)=>{
    const y=224+index*94;text(label.toUpperCase(),105,y,21,'#8cf5fa');
    const words=description.split(' ');let row='',line=0;
    for(const word of words){if(row.length+word.length>105){text(row,105,y+32+line++*22,17,'#eee');row='';}row+=(row?' ':'')+word;}
    if(row)text(row,105,y+32+line*22,17,'#eee');
  });
  text((patchPage+1)+' / '+PATCH_NOTES.length,640,626,20,'#fff','center');
  newButton('patch-prev','Previous patch notes',100,595,220,65,()=>navigate(-1));text('< NEWER',112,626,20);
  newButton('patch-next','Next patch notes',960,595,220,65,()=>navigate(1));text('OLDER >',1164,626,20,'#fff','right');
  footer('LEFT / RIGHT: PAGE    ESC: BACK');
}
const FP_RANK_ORDER=['SHIT','GOOD','GREAT','EXCELLENT','PERFECT','PERFECT_GOLD'];
function storedRank(record){
  if(record?.nativeRank)return record.nativeRank;
  if(!record)return null;
  return record.rank==='FC'&&record.accuracy>=100?'PERFECT_GOLD':record.accuracy>=90?'EXCELLENT':record.accuracy>=80?'GREAT':record.accuracy>=60?'GOOD':'SHIT';
}
function finishRankReveal(preview=true){
  if(!rankReveal)return;
  rankReveal=null;
  if(audio.menu)audio.menu.volume=settings.volume*.8;
  if(preview)schedulePreview();
}
function updateRankReveal(){
  if(!rankReveal)return null;
  const age=frameTime-rankReveal.at;
  if(age<0)return null;
  if(age>=2600){finishRankReveal();return null;}
  if(audio.menu)audio.menu.volume=settings.volume*.8*clamp((age-1500)/850,0,1);
  if(age>=600&&rankReveal.cue===0){
    rankReveal.cue=1;
    audio.sfx('fp-rankin'+(rankReveal.rank==='SHIT'?'bad':rankReveal.rank.startsWith('PERFECT')?'perfect':'normal'),.55);
  }
  if(age>=1100&&rankReveal.cue===1){
    rankReveal.cue=2;
    audio.sfx('fp-'+(rankReveal.rank==='SHIT'?'loss':rankReveal.rank.startsWith('PERFECT')?'perfect':rankReveal.rank.toLowerCase()),.65);
  }
  return {...rankReveal,age};
}
function drawFreeplay(){
  const {songs,records}=freeplayCatalog();
  const album=songChoice().album;
  loadSkyAlbum(album);const targets=modernFreeplay.draw(ctx,{rankReveal:updateRankReveal(),time:characterOpening?frameTime-characterExitAt:frameTime-sceneAt,djAnimation:characterOpening?'characterSelect':'idle',selectedSong:fp.selectedId,difficulty,difficultyLabel:DIFFICULTIES[difficulty],records,favorites:fp.favorites,filter:fp.filter,search:fp.search,sort:fp.sort,songs,previewing:fp.previewing,reducedMotion:settings.reducedMotion,character:fp.character,album});
  for(const target of targets)newButton(target.id,target.label,target.x,target.y,target.w,target.h,()=>freeplayAction(target.action,target.value));
  text(settings.keyMode+'K [6]',530,686,16,'#fff','left',0);newButton('fp-mode','Switch 4K / 6K mode',510,670,145,48,toggleKeyMode);
  text('O: MODIFIERS',650,686,16,'#fff','left',0);
  newButton('fp-modifiers','Modifiers',650,670,155,48,()=>openSettings('freeplay','modifiers'));text('TAB: CHARACTER',180,686,16,'#fff','left',0);newButton('fp-mods','Import and manage mods',390,670,120,48,openMods);text('M: MODS',392,686,16,'#fff','left',0);newButton('fp-character',`Choose character, current ${({bf:'Boyfriend',pico:'Pico',sky:'Sky'}[fp.character])}`,155,670,225,48,beginCharacterSelection);newButton('fp-instrumental',`Instrumental: ${fp.instrumental}`,15,165,310,50,()=>enter('instrumental'));
  text(`I: INST ${fp.instrumental.toUpperCase()}`,18,181,17,'#111','left',0);
}
function freeplayDifficulties(){
  const levels=new Set(SONGS.flatMap((song,i)=>song.hidden?[]:availableDifficulties(i)));
  return DIFFICULTIES.map((_,i)=>i).filter(i=>levels.has(i));
}
let freeplayCache=null;
function freeplayCatalog(){
  const key=JSON.stringify([savedMenuVersion,difficulty,settings.keyMode,fp.character,fp.instrumental,fp.search,fp.filter,fp.sort]);
  if(freeplayCache?.key===key)return freeplayCache;
  const records=Object.fromEntries(SONGS.map((song,i)=>[song.id,bestFor(i)]));
  const lyricsUnlocked=storage.get('skyLyricsUnlocked',false),search=fp.search.toLowerCase();
  const [firstLetter,lastLetter]=fp.filter.split('-');
  let list=SONGS.filter((song,index)=>{
    if(!campaignUnlocked(song,storage.get('henryUnlocked',false)))return false;
    if(song.hidden&&!(song.id==='sky-lyrics'&&lyricsUnlocked))return false;
    if(!availableDifficulties(index).includes(difficulty))return false;
    if(search&&!song.name.toLowerCase().includes(search))return false;
    if(fp.filter==='favorites')return fp.favorites.has(song.id);
    if(fp.filter==='numbers')return /^\d/.test(song.name);
    if(fp.filter==='all')return true;
    const first=song.name[0].toLowerCase();
    return first>=firstLetter&&first<=lastLetter;
  });
  if(modLibrary.extensionEnabled('duplicate-variations'))list=collapseDuplicates(list,song=>songChoice(SONGS.indexOf(song)));
  if(fp.sort==='title')list.sort((a,b)=>a.name.localeCompare(b.name));
  if(fp.sort==='bpm')list.sort((a,b)=>a.bpm-b.bpm);
  if(fp.sort==='score')list.sort((a,b)=>(records[b.id]?.score||0)-(records[a.id]?.score||0));
  const songs=list.map(song=>{
    const choice=songChoice(SONGS.indexOf(song));
    return {...song,name:isKapi(choice)||isImpostorWeek(choice)?choice.name:song.name,bpm:choice.bpm||song.bpm,opponent:choice.opponent||song.opponent};
  });
  return freeplayCache={key,list,songs,records};
}
function freeplaySongs(){return freeplayCatalog().list;}
function freeplayRows(){return [{id:'random'},...freeplaySongs()];}
function selectFreeplay(id){finishRankReveal(false);fp.selectedId=id;const index=SONGS.findIndex(s=>s.id===id);if(index>=0){songIndex=index;normalizeDifficulty();}audio.sfx('scrollMenu',0.5);schedulePreview();announce(id==='random'?'Random song':SONGS[index]?.name||'No song');}
function stopPreview(){clearTimeout(fp.previewTimer);fp.previewGeneration++;audio.stopPreview();fp.previewing=false;}
function schedulePreview(){stopPreview();if(scene==='freeplay'&&fp.selectedId!=='random')fp.previewTimer=setTimeout(previewSong,650);}
async function previewSong(){
  if(scene!=='freeplay'||fp.selectedId==='random'||rankReveal)return;
  stopPreview();
  const generation=fp.previewGeneration,index=SONGS.findIndex(s=>s.id===fp.selectedId);
  if(index<0)return;
  try{
    const choice=songChoice(index),{buffers,offsets}=await loadChoiceTracks(choice);
    if(scene!=='freeplay'||generation!==fp.previewGeneration)return;
    fp.previewing=audio.startPreview(buffers,offsets,choice.previewStart,choice.previewEnd);
    if(fp.previewing)audio.stopMenu();
  }catch(error){if(scene==='freeplay'&&generation===fp.previewGeneration)announce('Preview unavailable: '+error.message);}
}
async function playFreeplay(){if(rankReveal){finishRankReveal();return;}const songs=freeplaySongs();if(!songs.length){announce('No songs match this filter.');return;}let index=fp.selectedId==='random'?SONGS.indexOf(songs[Math.floor(Math.random()*songs.length)]):SONGS.findIndex(s=>s.id===fp.selectedId);if(index<0)index=SONGS.indexOf(songs[0]);stopPreview();
  if(modLibrary.extensionEnabled('duplicate-variations')){
    const eligible=SONGS.filter((song,i)=>availableDifficulties(i).includes(difficulty));
    const candidates=duplicateChoices(eligible,SONGS[index],song=>songChoice(SONGS.indexOf(song)));
    const options=candidates.map(song=>({song,index:SONGS.indexOf(song),label:song.mod?modLibrary.item(song).record.title:(skyMenu.albums[songChoice(SONGS.indexOf(song)).album]?.name||"Friday Night Funkin'"),detail:songChoice(SONGS.indexOf(song)).name}));
    if(options.length>1){
      const selected=await variationSelector.choose(options,{sound:name=>audio.sfx(name),albumFor:option=>{
        if(option.song.mod)return modLibrary.album(option.song);
        const id=songChoice(option.index).album;
        return modernFreeplay.images[modernFreeplay.albumImage(id)]?.src;
      }});
      canvas.focus();
      if(!selected||scene!=='freeplay')return;
      index=selected.index;
    }
  }
  startSong(index,false);}
function toggleFavorite(){if(fp.selectedId==='random')return;fp.favorites.has(fp.selectedId)?fp.favorites.delete(fp.selectedId):fp.favorites.add(fp.selectedId);storage.set('favorites',[...fp.favorites]);audio.sfx('confirmMenu',0.45);if(!freeplaySongs().some(s=>s.id===fp.selectedId))selectFreeplay(freeplaySongs()[0]?.id||'random');announce('Favorites updated.');}
function freeplayAction(action,value){if(action==='song'){if(fp.selectedId===value)playFreeplay();else selectFreeplay(value);}if(action==='difficulty'){changeDifficulty(value);schedulePreview();}if(action==='filter'){fp.filter=value;selectFreeplay(freeplaySongs()[0]?.id||'random');}if(action==='favorite')toggleFavorite();if(action==='search')showSearch();if(action==='sort'){const values=['default','title','bpm','score'];fp.sort=values[(values.indexOf(fp.sort)+1)%values.length];audio.sfx('scrollMenu',0.4);}if(action==='preview'){if(fp.previewing){stopPreview();audio.playMenu();}else previewSong();}if(action==='album'){stopPreview();enter('album');}if(action==='back')back();}
function showSearch(){let panel=document.querySelector('#freeplay-search');if(!panel){panel=document.createElement('form');panel.id='freeplay-search';panel.innerHTML='<label for="freeplay-search-input">SEARCH SONGS</label><input id="freeplay-search-input" type="search" placeholder="Song title…" autocomplete="off"><button type="submit">Done</button><button type="button" data-clear>Clear</button>';document.querySelector('#game').append(panel);panel.addEventListener('submit',e=>{e.preventDefault();panel.hidden=true;canvas.focus();});panel.querySelector('[data-clear]').addEventListener('click',()=>{panel.querySelector('input').value='';fp.search='';selectFreeplay(freeplaySongs()[0]?.id||'random');});panel.querySelector('input').addEventListener('input',e=>{fp.search=e.target.value;selectFreeplay(freeplaySongs()[0]?.id||'random');});}panel.hidden=false;panel.querySelector('input').value=fp.search;panel.querySelector('input').focus();}
function chooseCharacter(index){fp.character=index?'pico':'bf';difficulty=1;storage.set('character',fp.character);enter('freeplay',songIndex);schedulePreview();}
function drawCharacterSelect(){const now=performance.now(),targets=characterSelect.draw(ctx,{now,volume:settings.volume,reducedMotion:settings.reducedMotion});for(const t of targets)newButton('cs-'+t.id,t.label,t.x,t.y,t.w,t.h,()=>{if(t.action==='slot')characterSelect.choose(t.value,now,true);else if(t.action==='back')characterSelect.cancel(now);else characterSelect.confirm(now);});const result=characterSelect.consumeResult();if(result){characterSelect.stop();fp.character=result.character;storage.set('character',fp.character);difficulty=1;if(!freeplaySongs().some(s=>s.id===SONGS[songIndex].id)){const first=freeplaySongs()[0];if(first)songIndex=SONGS.indexOf(first);}enter('freeplay',songIndex);}}

function instrumentalOptions(){
  const song=SONGS[songIndex],choice=songChoice();
  if(song.mod)return modLibrary.instrumentals(song);
  if(choice.source)return expandedContent.instrumentals(song.id,fp.character,choice.level);
  return variantCatalog.some(v=>v.baseSong===song.id&&v.variant==='pico')?['default','pico']:['default'];
}
function drawInstrumental(){menuBackground('menuBGBlue');rect(180,100,920,500,'#000d');letters('instrumental',640,135,1,{align:'center'});instrumentalOptions().forEach((value,i)=>{const y=260+i*75;text((selected===i?'> ':'')+value.toUpperCase(),640,y,30,selected===i?'#80e9fa':'#aaa','center');newButton('instrument-'+i,value,250,y-15,780,65,()=>{fp.instrumental=value;enter('freeplay',songIndex);},{select:i});});footer();}

function drawAlbum(){const id=songChoice().album,album=skyMenu.albums[id];menuBackground('menuBGBlue');rect(100,55,1080,580,'#000c');text(album?.name||'FRIDAY NIGHT FUNKIN OST',640,92,36,'#fff','center');text(album?.artists?.join(' / ')||'KAWAI SPRITE',640,153,21,'#ffdb5f','center');modernFreeplay.image(ctx,modernFreeplay.albumImage(id),145,240,290,290);freeplaySongs().filter(s=>songChoice(SONGS.indexOf(s)).album===id).slice(0,6).forEach((song,i)=>{text(song.name,520,228+i*58,26);text('PREVIEW / PLAY',1080,233+i*58,17,'#8ceafa','right');newButton('album-song-'+i,`Preview ${song.name}`,490,214+i*58,620,55,()=>{enter('freeplay',SONGS.indexOf(song));selectFreeplay(song.id);previewSong();});});footer();}
function keyLabel(code){return String(code||'').replace(/^Key|^Digit/,'').replace(/^Arrow/,'');}
function drawSettings(){for(const button of preferences.draw(ctx,frameTime))newButton(button.id,button.label,button.x,button.y,button.w,button.h,button.action,{tapOnDown:button.id==='tap'||button.id.startsWith('test-')});}
function drawCredits(){menuBackground('menuBGMagenta');rect(60,30,1160,652,'#000b');letters('friday night funkin',640,60,0.88,{align:'center'});text('THE ORIGINAL CREW',640,180,28,'#ff79b9','center');[['ninjamuffin99','Programming'],['PhantomArcade + evilsk8r','Art + animation'],['Kawai Sprite','Music']].forEach(([name,job],i)=>{text(name,640,238+i*78,32,'#fff','center');text(job,640,274+i*78,21,'#aaa','center');});text('Independent browser recreation — Tutorial and Weeks 1–6.',640,505,21,'#fff','center');text('Original art, music and charts credited to their creators.',640,539,21,'#bbb','center');text('SUPPORT THE ORIGINAL GAME',640,593,29,'#ffdc60','center');newButton('support','Support the original game on itch.io',330,575,620,68,()=>window.open('https://ninja-muffin24.itch.io/funkin','_blank','noopener,noreferrer'));footer();}

async function getChart(index,diff,character=fp.character){const choice=songChoice(index,diff,character),key=choice.chartUrl;if(!chartCache.has(key))chartCache.set(key,rawChoice(choice).then(parseChart));return chartCache.get(key);}
async function startSong(index,isStory=false,continueStory=false,override=null,entry={}){
  if(!campaignUnlocked(SONGS[index],storage.get('henryUnlocked',false))){announce('Find the remote in Airship to unlock Henry.');return;}
  const generation=++loadGeneration;pendingRankReveal=null;songIndex=index;story=isStory;const character=isStory?storyCharacter():entry.character||fp.character;normalizeDifficulty(index,character);if(!continueStory){storyTotal=0;storyStats=[];storyUsedModifiers=false;}audio.stop();audio.stopMenu();enter('loading');errorText='';announce(`Loading ${SONGS[index].name}. ${DIFFICULTIES[difficulty]}.`);
  try{await audio.unlock();let choice=songChoice(index,difficulty,character,isStory?'default':fp.instrumental);if(override?.raw){const raw=override.raw.song;choice={...choice,character:playerIdentity(raw.player1||choice.character),opponent:raw.player2||choice.opponent,stage:raw.stage||choice.stage,characters:{...choice.characters,player:raw.player1||choice.characters?.player,opponent:raw.player2||choice.characters?.opponent,girlfriend:raw.gfVersion??raw.player3??choice.characters?.girlfriend}};choice.visualOverrides={characters:choice.characters,stage:choice.stage};choice.noteTexture=raw.noteTexture;}let [chart,originalDuration,modVisuals,exitStickers]=await Promise.all([override?Promise.resolve(parseChart(override.raw)):getChart(index,difficulty,character),prepareChoice(choice),choice.mod?modLibrary.getVisuals(choice,assets):Promise.resolve(null),prepareExitStickers(choice),audio.warmEffects(),prepareSceneAssets(choice,(isStory||settings.freeplayStoryCutscenes)&&!override)]);if(generation!==loadGeneration)return;
    const eventSounds=await prepareExtraEventSounds(choice,chart,modLibrary,audio);
    if(generation!==loadGeneration)return;
    audio.eventVolumes={};
    if(override?.audio){for(const i of [0,1])if(override.audio[i])audio.buffers[i]=override.audio[i];if(override.audio[1])audio.buffers.length=2;}audio.allowVoices=override?.raw?.song?.needsVoices!==false;const extraOffset=Number(override?.raw?.song?.offset)||0;if(extraOffset)audio.trackOffsets=audio.trackOffsets.map(offset=>offset+extraOffset);const duration=originalDuration+extraOffset;
    if(settings.keyMode===6)chart=chartForSixKeys(chart);comboFeedback.reset();const notes=chart.notes.map(n=>({...n,autoSinger:campaignAutoNote(choice,n),hit:false,missed:false,holdDone:0,holdBroken:false,started:false}));game={chart,notes,duration,modVisuals,exitStickers,speakerIndex:0,laneCount:chart.laneCount||4,eventIndex:0,eventFocus:null,eventZoom:1,eventScroll:1,eventBop:{},lastLightning:-30,lightningAt:-99999,lightningDelay:8,stats:{...makeStats(),totalNotes:notes.filter(n=>n.player&&!n.autoSinger).length},opponentIndex:0,scanIndex:0,startTime:-60000/chart.bpm*5,time:-60000/chart.bpm*5,beat:-6,lastBeat:-6,rating:null,particles:[],splashes:[],completed:false,chartPlayer:chart.sections[0]?.player||false,practice:settings.practice,botplay:settings.botplay,custom:!!override,override,choice,character:choice.character,frameTimes:[]};
    game.qt=createQtGameplay(choice,chart);
    game.impostor=createImpostorWeek(choice,chart);
    if(/^impostor-(?:week[6789AB]|lime|finale|extras)$/.test(choice.source||'')){game.cameraZoomIsRelative=true;game.stageZoom=nativeContent.stage(choice)?.cameraZoom||1;}
    if(game.impostor){game.impostor.bpm=chart.bpm;game.impostor.extraActor={direction:'idle',since:0,until:0};const skin=impostorSkin(choice,settings);if(skin){game.impostor.characters.player=skin;game.eventHealthIcon={player:skin};}game.impostor.pet=impostorPet(choice,settings);}
    game.eventSounds=eventSounds;
    if(isBadBunny(choice)||choice.baseSong==='ejected')game.startTime=game.time=0;
    if(game.qt?.erectKiller&&!override)game.startTime=game.time=0;
    game.vamp=createVampGameplay(choice,chart,(isStory||settings.freeplayStoryCutscenes)&&!entry.retry&&!override);
    game.stats.totalNotes+=game.vamp?.notes.length||0;
    game.secretChance=settings.skySecretChance;
    game.skyTomatoDance=choice.baseSong==='wife-forever'&&choice.variant==='pico'&&rollSecret(game.secretChance,.25);
    applySongModifiers();
    audio.mutedRoles=new Set();
    const captionFile=songCaptions(choice);
    if(captionFile){const current=game;expandedCaptions(captionFile).then(cues=>{if(game===current)game.captions=cues;}).catch(()=>{});}
    if(choice.charts?.picospeaker){
      const shots=await expandedJSON(choice.charts.picospeaker);
      if(generation!==loadGeneration)return;
      game.speakerNotes=shots.song.modernNotes.slice().sort((a,b)=>a.t-b.t);
      game.tankmanRunners=game.speakerNotes.filter((_,i)=>i%8===0);
    }
    actorBF={direction:'idle',since:0,until:0};actorDad={direction:'idle',since:0,until:0};actorGF={direction:'idle',since:0,until:0};held.clear();laneFlashes.fill(0);opponentFlashes.fill(0);lastCountdown=-99;const storyCutscenes=isStory||settings.freeplayStoryCutscenes;const context={story:storyCutscenes,retry:entry.retry,editor:!!override,character:choice.character,variant:choice.variant};const extra=expandedIntro(choice,{...context,naughtyness:settings.naughtyness!==false});if(extra&&!extra.endsWith('-sky')){if(!await runExpandedSequence(extra)||generation!==loadGeneration)return;}const stageIntro=!entry.retry&&!override&&expandedStageIntro(choice,storyCutscenes);if(stageIntro&&(!await runExpandedSequence(stageIntro)||generation!==loadGeneration))return;
    if((storyCutscenes||impostorIntro(choice)?.always)&&!entry.retry&&!override){
      if(isImpostorWeek(choice)){
        const impostor=impostorIntro(choice);
        if(impostor?.henry&&!await runHenryIntro())return;
        if(impostor?.file&&!await runExpandedSequence('impostor-intro',impostor))return;
        if(impostor?.dialogue&&!await runStorySequence(impostor.dialogue,true))return;
      }
      const bunny=bunnyIntro(choice);
      if(bunny&&!await runExpandedSequence('bunny-intro',bunny))return;
      const kapi=kapiIntro(choice);
      if(kapi?.stomp){
        const duration=nativeContent.animationDuration(choice.characters.opponent,'ddrStomp')||1800;
        if(!await runExpandedSequence('kapi-hairball-stomp',{
          duration,poses:[[0,'opponent','ddrStomp',duration]],
          view:{camera:[[0,['opponent',80,0,1.2]],[0,['opponent',0,0,1],3000,'quadInOut']]},
          voiceLines:[{at:0,name:'KAP_brokenpad'}],
        }))return;
      }
      if(kapi?.dialogue&&!await runStorySequence(kapiDialogue(kapi.dialogue,settings.kapiLanguage),true))return;
      const redux=reduxIntro(choice,settings.flashingLights!==false,settings.naughtyness===false);
      if(redux?.file&&!await runExpandedSequence('redux-intro',redux))return;
      if(redux?.dialogue&&!await runStorySequence(redux.dialogue,true))return;
      const qtIntro=qtScene(choice,'intro',settings.qtLanguage,nativeContent.stage(choice)?.cameraZoom);
      if(qtIntro&&!await runExpandedSequence('qt-intro',qtIntro))return;
    }
    if(choice.baseSong==='blissful'&&!isQtRewired(choice)&&!override){
      const voice=await audio.load('qt-hi-cutie-'+settings.qtLanguage+'.ogg').catch(()=>null);
      if(generation!==loadGeneration)return;
      const greeting=nativeContent.character(stageCharacterId('opponent'))?.animationMap.intro;
      const wave=nativeContent.character(stageCharacterId('player'),true)?.animationMap.wave;
      if(greeting&&wave){
        const sequence=blissfulGreeting(greeting,wave,voice?voice.duration*1000:1600,()=>audio.playEffect(voice,.9));
        if(!await runExpandedSequence('blissful-greeting',sequence))return;
      }
    }
    for(const actor of [actorBF,actorDad,actorGF])actor.forced=null;game.beat=-6;const intro=extra?.endsWith('-sky')?extra:songIntro(SONGS[index].id,context);if(intro){const complete=await runStorySequence(intro,storyCutscenes);if(!complete||generation!==loadGeneration)return;if(intro==='winter-horrorland')game.hudFadeAt=performance.now();}if(isDefeat(choice)&&!override){if(!await runDefeatSelection()||generation!==loadGeneration)return;}enter('play');audio.start(game.startTime);announce(`${SONGS[index].name}. ${DIFFICULTIES[difficulty]}. Get ready.`);
  }catch(e){if(generation!==loadGeneration)return;errorText=e.message;announce('Loading failed. '+e.message);console.error(e);}
}
async function openChartEditor(){
  if(scene==='editor'||scene==='loading')return;if(scene==='play')audio.pause();audio.stop();audio.stopMenu();loadGeneration++;const index=scene==='freeplay'?songIndex:songIndex;
  if(!chartEditor)chartEditor=new ChartEditor({audio,assets,onExit:()=>{game=null;enter('freeplay',songIndex);},onTest:(raw,index,diff,customAudio)=>{difficulty=diff;startSong(index,false,false,{raw,audio:customAudio});},loadOriginal:getChart,prepareAudio:(index,diff)=>prepareChoice(songChoice(index,diff))});
  chartEditor.getLevels=()=>availableDifficulties(index).map(index=>({index,name:DIFFICULTIES[index]}));const keep=game?.custom&&chartEditor.index===index&&chartEditor.diff===difficulty;enter('editor');announce('Chart editor. Space plays audio, Enter tests the chart, 7 returns to freeplay.');
  try{const raw=await rawChoice(songChoice(index));chartEditor.character=fp.character;await chartEditor.open(index,difficulty,raw,{keep});}catch(e){errorText=e.message;enter('freeplay',index);announce('Could not open editor: '+e.message);}
}
function applySongModifiers(){
  const previous=game.modifiers;
  const next={
    rate:game.custom?1:settings.songRate,
    drain:game.custom?0:settings.healthDrain,
    drainLethality:settings.healthDrainLethality,
    damage:game.custom?1:settings.missDamage,
    instantFail:!game.custom&&settings.instantFail,
    mirror:!game.custom&&settings.mirrorNotes,
    noFail:!game.custom&&settings.noFail,
  };
  if(Boolean(previous?.mirror)!==next.mirror){
    for(const note of game.notes)note.lane=game.laneCount-1-note.lane;
    laneFlashes.fill(0);
    opponentFlashes.fill(0);
  }
  game.modifiers=next;
  game.usedModifiers||=next.rate!==1||next.drain!==0||next.damage!==1||next.instantFail||next.mirror||next.noFail;
  if(story)storyUsedModifiers||=game.usedModifiers;
  audio.songRate=next.rate;
}
function applyPausedModifiers(){
  if(!game)return;
  applySongModifiers();
  game.time=audio.chartTime();
  game.beat=beatAt(game.chart,game.time);
}
function pauseMusic(){
  if(pixelStage(game?.choice))return 'breakfast-pixel';
  return game?.character==='pico'?'breakfast-pico':'breakfast';
}

function pauseGame(){if(scene!=='play'||!game||game.skyTutorialAt!=null)return;audio.pause();enter('paused');audio.sfx('scrollMenu',0.5);announce('Paused. Resume, Restart Song, Options, or Exit to Menu.');}
function resumeGame(){if(scene!=='paused'||!game)return;game.holdResumeUntil=audio.chartTime()+150;enter('play');audio.resume();}
function exitSong(){loadGeneration++;audio.stop();audio.stopMenu();enter(story?'story':'freeplay',story?0:songIndex);game=null;}
function retrySong(){if(game?.retryAt)return;if(game?.choice.baseSong==='sky'&&game.choice.variant==='erect'&&rollSecret(settings.skySecretChance,.08)){launchSkySecret();return;}const override=game?.override,death=deathConfig();audio.stopMenu();if(scene==='gameover'&&(death.pixel||death.sounds)){game.retryAt=frameTime;const generation=loadGeneration;audio.playMenu(death.sounds?.confirm||death.pixel.confirmMusic.split('/').at(-1).replace(/\.ogg$/,''),{loop:false});setTimeout(()=>{if(scene==='gameover'&&generation===loadGeneration)startSong(songIndex,story,story,override,{retry:true});},1000);return;}startSong(songIndex,story,story,override,{retry:true});}
function animateActor(actor,lane,time,miss=false){if(actor.forced?.lock&&time<actor.forced.until)return;if(actor.forced&&!actor.forced.lock)actor.forced=null;actor.direction=DIRECTIONS[laneDirection(lane)]+(miss?'miss':'');actor.since=time;actor.until=time+Math.max(150,60000/(game?.chart.bpm||100)*0.65);}
function finishNativeNotePose(actor,note){
  if(!game.qt&&!game.impostor)return;
  const role=actor===actorBF?'player':actor===actorDad?'opponent':'girlfriend';
  const length=nativeContent.animationDuration(stageCharacterId(role),'sing'+actor.direction,role==='player');
  actor.until=Math.max(actor.until,actor.since+length,note.time+note.length);
}
function animateNote(actor,note,time,miss=false){
  const kind=String(note.kind).toLowerCase();
  if(game.impostor){
    if(!miss)for(const role of campaignSingers(note)){const singer=role==='extra'?game.impostor.extraActor:role==='girlfriend'?actorGF:role==='player'?actorBF:actorDad;chordTrail(game,role,note,singer,stageCharacterId(role));}
    const pose=!miss&&campaignPose(note);
    if(pose){
      const role=actor===actorBF?'player':actor===actorDad?'opponent':'girlfriend';
      const length=nativeContent.animationDuration(stageCharacterId(role),pose.name,role==='player')||600;
      actor.forced={name:pose.name,since:time,until:time+length,lock:pose.lock};return;
    }
    {
      const normalRole=actor===actorBF?'player':actor===actorDad?'opponent':'girlfriend';
      const singers=campaignSingers(note);
      if(singers.length!==1||singers[0]!==normalRole){
        for(const role of singers){const singer=role==='extra'?game.impostor.extraActor:role==='girlfriend'?actorGF:role==='player'?actorBF:actorDad;animateActor(singer,note.lane,time,miss);singer.until=Math.max(singer.until,note.time+note.length);}
        return;
      }
    }
    if(['alt animation','alt','hit'].includes(kind))note={...note,altAnim:true};
  }
  if(kind==='qt-go-go-go-note'&&game.qt){
    const modes=Object.fromEntries((note.params||[]).map(param=>[param.n,param.v]));
    for(const [key,singer,suffixes] of [
      ['cg5Sing',actorDad,['','-lipsync','','-alt']],
      ['ironSing',actorGF,['','','-beautiful','-cool','-go']],
      ['qtSing',actorBF,['','','-alt','']],
    ]){
      const mode=modes[key];
      if(!mode||singer.forced?.lock&&time<singer.forced.until)continue;
      animateActor(singer,note.lane,time,miss);
      singer.direction+=suffixes[mode]||'';
      finishNativeNotePose(singer,note);
    }
    return;
  }
  if(['noanim','no animation'].includes(kind)||actor.forced?.lock&&time<actor.forced.until)return;
  animateActor(actor,note.lane,time,miss);
  if(kind==='caramella')actor.direction+='-caramella';
  else if(!miss&&(kind==='skyaltnote'||kind==='mom'||kind==='altanim'||note.altAnim))actor.direction+='-alt';
  else if(!miss&&kind==='censor')actor.direction+='-censor';
  finishNativeNotePose(actor,note);
}
function laneHeld(lane){
  if(held.has('touch'+lane)||held.has('pad'+lane))return true;
  for(const code of held)if(noteLaneFor(settings,code,laneCount())===lane)return true;
  return false;
}

function laneFromCode(code){return noteLaneFor(settings,code,laneCount());}

function noteSpecial(note,actor,time){if(note.kind)expandedNote(game,note,time,{player:actorBF,opponent:actorDad},(sound,gain)=>audio.sfx(sound,gain),false,(role,name)=>nativeContent.animationDuration(game.choice.characters?.[role],name,role==='player'));if(/^(hey!?|cheer)$/i.test(String(note.kind||'')))actor.forced={name:String(note.kind).toLowerCase().startsWith('hey')?'hey':'cheer',since:time,until:time+60000/bpmAt(game.chart,time),lock:true};}
function hit(note,time,auto=false){
  if(isOfficialCanNote(game.choice,'firegun')&&note.kind==='weekend-1-firegun'&&!canFire(game,time)){miss(note,time);return;}
  note.hit=true;note.started=true;const delta=time-note.time;const j=applyHit(game.stats,delta);if(!j)return;comboFeedback.hit(note,time,game.stats.combo,bpmAt(game.chart,time),game.botplay);laneFlashes[note.lane]=frameTime+145;animateNote(actorBF,note,time);noteSpecial(note,actorBF,time);audio.muteVoices(false);game.rating={name:j.name,since:frameTime,combo:game.stats.combo,delta};if(j.name==='sick'&&settings.noteSplash!==false&&!settings.reducedMotion){game.splashes.push({lane:note.lane,at:frameTime,variant:1+Math.floor(Math.random()*2)});}}
function applyGameplayMiss(){
  const before=game.stats.health;
  applyMiss(game.stats);
  game.stats.health=game.modifiers.instantFail?0:clamp(before-.12*game.modifiers.damage,0,2);
}
function miss(note,time){if(note?.missed)return;if(note)note.missed=true;applyGameplayMiss();audio.muteVoices(true);game.rating={name:'miss',since:frameTime,combo:0,delta:0};if(note){animateNote(actorBF,note,time,true);if(note.kind)expandedNote(game,note,time,{player:actorBF,opponent:actorDad},(sound,gain)=>audio.sfx(sound,gain),true);}audio.sfx('missnote'+(1+Math.floor(Math.random()*3)),0.12);}
function pressLane(lane,eventAt){if(scene!=='play'||!game||game.skyTutorialAt!=null||game.skyManifestBlock||game.skyDanceLock||game.skyDetails?.block)return;const time=audio.chartTime(eventAt);if(time<-HIT_WINDOW)return;laneFlashes[lane]=frameTime+80;if(game.botplay)return;const note=nearestNote(game.notes,lane,time);const pyoroGhost=isPyoro(game.choice)&&(game.beat<64||game.beat>=320&&game.beat<384);if(note)hit(note,time);else if(!settings.ghostTapping&&!pyoroGhost&&time>0)miss(null,time);}
function updateHold(note,time,pressed){
  if(!note.hit||note.length<=0||note.holdBroken||note.holdComplete)return;
  const progress=holdProgress(game.chart,note,time,pressed);
  if(progress.broken){note.holdBroken=true;missHold(note,time);return;}
  const gained=Math.max(0,progress.ticks-note.holdDone);
  if(gained>0){
    game.stats.score+=gained*10;
    game.stats.holdTicks+=gained;
    game.stats.health=clamp(game.stats.health+gained*.004,0,2);
    note.holdDone=progress.ticks;
    if(pressed){laneFlashes[note.lane]=frameTime+80;animateNote(actorBF,note,time);}
  }
  note.holdComplete=progress.complete;
}
function hitVampMiddle(time,manual=false){
  const state=game?.vamp;
  if(!state?.notes.length||manual&&(scene!=='play'||game.botplay)||time < -HIT_WINDOW)return;
  if(manual)state.receptor={animation:'press',at:time};
  const hit=vampHit(state,time,game.stats);
  if(hit?.judgement){
    const id=stageCharacterId('player'),name=Math.random()<2/3?'hey':'cheer';
    const modPose=vampPose(nativeContent.data.vamp,id,name);
    const nativePose=nativeExtras.packs.characters?.characters[id]?.animations[name];
    const duration=modPose ? modPose.frames*1000/24
      : nativePose ? nativePose.frames.length*1000/nativePose.fps
      : nativeContent.animationDuration(id,name,true);
    if(duration)actorBF.forced={name,since:time,until:time+duration,lock:false};
    game.rating={name:hit.judgement.name,since:frameTime,combo:game.stats.combo,delta:hit.delta};
    audio.sfx('VAMP_bloodNoteDodge',.55);
  }else if(manual&&!settings.ghostTapping&&time>0&&!mobileActive()){
    vampMissDamage();
    audio.sfx('missnote1',.18);
  }
}
function vampMissDamage(){
  const health=game.stats.health;
  applyGameplayMiss();
  game.stats.health=Math.min(game.stats.health,Math.max(0,health-.24*game.modifiers.damage));
  game.stats.score-=10;
  return health;
}
function missVampMiddle(time){
  const state=game.vamp,health=vampMissDamage();
  state.bloodPhase=time-(state.bloodAt??-Infinity)<5000?Math.min(3,(state.bloodPhase||0)+1):1;
  state.bloodAt=time;
  if(state.bloodPhase===3){state.drainAt=time;state.drainDuration=health>1?3500:6000;}
  animateActor(actorBF,Math.floor(Math.random()*laneCount()),time,true);
  game.rating={name:'miss',since:frameTime,combo:0,delta:0};
  audio.sfx('VAMP_bloodNote',.7);
}
function releaseLane(lane,eventAt){
  if(scene!=='play'||!game||game.botplay||lane<0||laneHeld(lane))return;
  const time=audio.chartTime(eventAt);
  for(let i=game.scanIndex;i<game.notes.length&&game.notes[i].time<=time+HIT_WINDOW;i++){
    const note=game.notes[i];
    if(note.player&&note.lane===lane)updateHold(note,time,false);
  }
}
function forceStagePose(role,name,since,lock){
  const actor=role==='player'?actorBF:role==='opponent'?actorDad:actorGF;
  const id=stageCharacterId(role);
  const duration=nativeContent.animationDuration(id,name,role==='player')
    ||(isVamp(game.choice)?vampPose(nativeContent.data.vamp,id,name)?.frames*1000/24:0)
    ||(name==='pointing'?69*1000/24:1200);
  actor.forced={name,prefix:name,since,until:since+duration,lock};
  if(game.qt){
    const suffix={preDance:'-alt','preDance-erect':'-erect',huh:id==='nene-qt'?'-alt':null,hey:'',cheer:''}[name];
    if(suffix!=null){
      game.animationSuffix??={};
      game.animationSuffix[role]={idle:suffix,dance:!!suffix};
    }
  }
}
function updateSongEvents(time){
updateChartEvents(game,time,{bpm:bpmAt(game.chart,time),
  onEvent:event=>{
    const bpm=bpmAt(game.chart,event.t);
    if(game.impostor){
      updateImpostorEvent(game.impostor,event,bpm);
      campaignEvent(game.impostor,event);restEvent(game,event,bpm);
      if(event.e==='ChangeCharacter'&&game.impostor.resetActor!=='girlfriend'){game.eventHealthIcon??={};game.eventHealthIcon[game.impostor.resetActor]=event.v.newchar.toLowerCase();}
      if(event.e==='ChangeStage'&&/^impostor-(lime|finale|extras)$/.test(game.choice.source)){game.eventZoom=1;game.zoomTween=null;for(const actor of [actorBF,actorDad,actorGF]){actor.forced=null;actor.direction='idle';actor.until=event.t;}}
      if(game.cameraZoomIsRelative&&event.e==='ChangeStage')game.stageZoom=nativeContent.data.stages[event.v.stageid]?.cameraZoom||game.stageZoom;
      if(game.impostor.resetActor){
        const role=game.impostor.resetActor,actor=role==='player'?actorBF:role==='opponent'?actorDad:actorGF;
        actor.forced=null;actor.direction='idle';actor.until=event.t;delete game.impostor.resetActor;
      }
      if(event.e==='LightsDownEvent'){
        const suffix=event.v.type==='in'?'-alt':'';
        game.animationSuffix??={};
        for(const role of ['player','opponent'])game.animationSuffix[role]={idle:suffix};
      }
    }
    applyExtraEvent(game,event,{bpm,options:settings,sound:(name,volume)=>audio.playEffect(game.eventSounds.get(name),volume)});
  },
  animate:(target,name,since,lock)=>{if(game.impostor&&['mom','mommy'].includes(String(target).toLowerCase())){game.impostor.extraActor.forced={name,since,until:since+(nativeContent.animationDuration(extraSinger(game.choice)?.id||'madgus',name)||1500),lock};return;}const role=['bf','boyfriend','player'].includes(target)?'player':['gf','girlfriend','partner'].includes(target)?'girlfriend':['dad','opponent'].includes(target)?'opponent':null;if(!role){game.propAnimations??={};game.propAnimations[target]={name,since,until:since+1500};return;}if(game.choice.baseSong==='wife-forever'&&game.choice.variant==='pico'&&!game.skyTomatoDance&&
    ['caramelTransition','tomatoThrow','tomatoHit'].includes(name))return;
  skyDetails.chartPose(game,role,name);
  forceStagePose(role,name,since,lock);audio.muteVoices(false);}});
  updateExtraEvents(game,time,{countdown:step=>settings.extraCountdown!==false&&audio.sfx(['intro3','intro2','intro1','introGo'][step])});
  audio.setEventVolumes(game.extraEvents?.volumes);
  updateBunny(game,time,nativeContent.data.bunny,{motion:settings.cameraZooms!==false&&!settings.reducedMotion});
  nativeContent.updateStage(game,time);
}
function updateGame(dt){
  if(!game)return;const time=game.time=audio.chartTime();const beat=beatAt(game.chart,time);game.beat=beat;if(skyPolish.updateTutorial(game,time,{audio,finish:finishSong}))return;updateSongEvents(time);skyPolish.updateManifest(game,time,{audio,actors:{player:actorBF,opponent:actorDad,girlfriend:actorGF}});
  skyDetails.update(game,time,{player:actorBF,opponent:actorDad,girlfriend:actorGF});
  syncImpostorVideo(game.impostor,time,game.modifiers.rate);
  if(isPyoro(game.choice)&&beat>=1281/4&&!game.pyoroDanced){
    game.pyoroDanced=true;
    forceStagePose('player','lilDance',time,true);
  }
  if(game.qt)updateQt(game,time,{mode:settings.qtSawbladeMode,sound:(name,gain)=>audio.sfx(name,gain),force:forceStagePose,reducedMotion:settings.reducedMotion,songTime:audio.time()});
  if(isSkyRedux(game.choice)){
    game.reduxFrame=reduxStageFrame(game.choice,game.chart,time);
    if(!game.reduxGlare&&game.reduxFrame.glareAt!=null&&time>=game.reduxFrame.glareAt){
      game.reduxGlare=true;
      forceStagePose('girlfriend','glare transition',game.reduxFrame.glareAt,true);
    }
  }
  const countdownTime=audio.time();
  if(game.vamp){
    updateVampNotes(game.vamp,time,game.botplay,hitVampMiddle,missVampMiddle);
    if(!settings.reducedMotion)vampStageCue(game,time,(name,gain)=>audio.sfx(name,gain));
    const drain=game.vamp.drainAt==null?0:.5*clamp(1-(time-game.vamp.drainAt)/game.vamp.drainDuration,0,1);
    if(drain&&!game.practice&&!game.botplay)game.stats.health=Math.max(0,game.stats.health-drain*dt);
    const video=game.vamp.video,at=countdownTime/1000;
    if(video&&!video.error&&at>=0&&beat<32){
      video.playbackRate=game.modifiers.rate;
      if(video.readyState>=2&&!video.seeking&&Math.abs(video.currentTime-at)>.18)video.currentTime=at;
      if(video.paused&&!video.ended&&!game.vamp.startingVideo){
        game.vamp.startingVideo=true;video.play().catch(()=>{}).finally(()=>{if(game?.vamp?.video===video)game.vamp.startingVideo=false;});
      }
    }else if(video&&(video.error||beat>=32)){video.pause();video.removeAttribute('src');video.load();game.vamp.video=null;}
  }
  const count=Math.floor(countdownTime/(60000/game.chart.bpm));
  if(countdownTime<0&&count!==lastCountdown){
    lastCountdown=count;
    const sound={[-4]:'intro3',[-3]:'intro2',[-2]:'intro1',[-1]:'introGo'}[count];
    if(sound)audio.sfx(isKapi(game.choice)?count===-1?'KAP_introGO':'KAP_introTick':
      pixelStage(game.choice)?pixelUI.countdownSound(count)||sound:sound,.7);
  }
  while(game.speakerNotes?.[game.speakerIndex]?.t<=time){
    const shot=game.speakerNotes[game.speakerIndex++],lane=shot.d%4;
    const shotDuration=stageCharacterId('girlfriend')==='scenecoresky-shootin'?625:260;
    actorGF.forced={name:'shoot'+(lane+1),since:shot.t,until:shot.t+shotDuration,lock:true};
    game.lastShot={time:shot.t,lane};
  }
  const currentBeat=Math.floor(beat);if(currentBeat!==game.lastBeat){
    if(game.choice.baseSong==='sky')game.eventBop.girlfriend??=2;
    if(settings.flashingLights!==false&&game.choice.baseSong==='blazin'&&currentBeat>=10&&currentBeat%19===0&&!settings.reducedMotion){game.lastStrike=time;audio.sfx('W7W1_Lightning'+(1+currentBeat%3),.37);}game.lastBeat=currentBeat;if(settings.cameraZooms!==false&&!settings.reducedMotion&&currentBeat>=0&&game.bopRate!==0&&(currentBeat-(game.bopOffset||0))%(game.bopRate||4)===0)game.cameraBump=0.013*(game.bopIntensity??1);if(actorBF.until<time)actorBF.direction='idle';if(actorDad.until<time)actorDad.direction='idle';}
  if(settings.flashingLights!==false&&SONGS[songIndex].week===2&&Math.floor(beat)!==game.lightningBeat){game.lightningBeat=Math.floor(beat);if((SONGS[songIndex].id==='spookeez'&&Math.floor(beat)===4)||(beat>game.lastLightning+game.lightningDelay&&Math.random()<0.1)){game.lightningAt=time;game.lastLightning=beat;game.lightningDelay=8+Math.random()*16;if(Math.floor(beat)!==4)audio.sfx(Math.random()<0.5?'thunder_1':'thunder_2',0.7);}}
  game.cameraBump=Math.max(0,(game.cameraBump||0)-dt*0.045);
  const section=game.chart.sections.find(s=>time>=s.start&&time<s.end);if(section)game.chartPlayer=section.player;
  const notes=game.notes;for(let i=game.scanIndex;i<notes.length;i++){const n=notes[i];if(n.time>time+HIT_WINDOW)break;
    if(n.autoSinger){if(!n.hit&&n.time<=time){n.hit=true;n.started=true;animateNote(actorDad,n,time);}continue;}
    if(!n.player){if(!n.hit&&n.time<=time){n.hit=true;if(game.skyPicoOutcome||game.skyManifestDead||(game.skyManifestLiquid==='boiling'&&game.beat>=160))continue;if(!game.practice&&!game.botplay)game.stats.health=healthAfterOpponentNote(game.stats.health,game.modifiers.drain,game.modifiers.drainLethality);opponentFlashes[n.lane]=frameTime+160;animateNote(actorDad,n,time);noteSpecial(n,actorDad,time);actorDad.until=Math.max(actorDad.until,n.time+n.length);if(!game.choice.audioRoles)audio.muteVoices(false);}continue;}
    if(!n.hit&&!n.missed){
      if((game.skyManifestBlock||game.skyDanceLock||game.skyDetails?.block)&&n.time<=time){n.missed=true;game.stats.totalNotes--;continue;}
      if(game.botplay&&n.time<=time)hit(n,n.time,true);else if(time-n.time>HIT_WINDOW)miss(n,time);}
    if(n.hit&&n.length>0){const pressed=game.botplay||laneHeld(n.lane);if(pressed||time>=(game.holdResumeUntil??-Infinity))updateHold(n,time,pressed);}
  }
  while(game.scanIndex<notes.length&&notes[game.scanIndex].time+notes[game.scanIndex].length<time-300)game.scanIndex++;
  for(const p of game.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}game.particles=game.particles.filter(p=>p.life>0);
  if(defeatHealth(game)||game.stats.health<=0&&!game.practice&&!game.botplay&&!game.modifiers.noFail){gameOver();return;}
  if(Math.min(audio.time(),time)>=game.duration-35&&!game.completed)finishSong();
}
function missHold(note,time){applyGameplayMiss();audio.muteVoices(true);game.rating={name:'miss',since:frameTime,combo:0,delta:0};}
async function runStorySequence(id,storyCutscene=story){const generation=loadGeneration,current=game;if(scene!=='loading')enter('loading');await storyIntros.load(id);if(generation!==loadGeneration||current!==game)return false;storyIntros.begin(id,{now:performance.now(),volume:settings.volume,reducedMotion:settings.reducedMotion,story:storyCutscene,character:game.character,variation:game.choice.variant||'',charting:game.custom,cameraStart:[850,500],cameraStartZoom:.8,censored:settings.naughtyness===false,subtitles:settings.subtitles!==false});if(storyIntros.done)return true;introAnnouncement='';enter('intro');return new Promise(resolve=>introWaiter={resolve,generation,current});}
function drawStorySequence(){storyIntros.update(frameTime);const elapsed=frameTime-sceneAt,stageTime=Math.max(0,game.time)+elapsed;game.beat=beatAt(game.chart,stageTime);ctx.save();const focus=storyIntros.cameraFocus;if(focus){const stage=nativeContent.stage(game.choice),worldScale=stage?.view?.scale??.8,ox=stage?.view?.x??40,oy=stage?.view?.y??-70;ctx.translate(640,360);ctx.scale(storyIntros.cameraZoom/worldScale,storyIntros.cameraZoom/worldScale);ctx.translate(-(ox+worldScale*focus[0]),-(oy+worldScale*focus[1]));}drawStage(stageTime);ctx.restore();const targets=storyIntros.draw(ctx,{now:frameTime,volume:settings.volume});for(const target of targets)newButton(target.id,target.label,target.x,target.y,target.w,target.h,()=>storyIntros[target.action](performance.now()));const shown=storyIntros.phase==='dialogue'?storyIntros.currentText(frameTime):'';canvas.dataset.dialogue=shown;canvas.dataset.dialogueLine=String(storyIntros.pageIndex??0);canvas.dataset.introPhase=storyIntros.phase;if(storyIntros.phase==='dialogue'){const full=storyIntros.page?.text||'';if(full!==introAnnouncement){introAnnouncement=full;announce(full);}}if(storyIntros.done&&introWaiter){const waiting=introWaiter;introWaiter=null;waiting.resolve(waiting.generation===loadGeneration&&waiting.current===game);}}
function deathConfig(){
  const combust=isVamp(game?.choice)&&game.choice.baseSong!=='vamp'&&settings.naughtyness!==false;
  const pico=game?.choice.variant==='pico',id=combust?(pico?'vamp-death-pico':'vamp-death-bf'):game?stageCharacterId('player'):null;
  const character=nativeContent.character(id,true),pixel=nativeContent.data.uiPixelGameover?.[id];
  const suffix=game.impostor?.ballDeath&&character?.animationMap?.['firstDeath-balls']?'-balls':game?.qt?.sawDeath&&character?.animationMap?.['firstDeath-saw']?'-saw':'';
  const first=character?.animationMap?.['firstDeath'+suffix];
  const sounds=combust?{loss:'VAMP_fnf_loss_sfx-combust'+(pico?'-pico':''),loop:'gameOver',confirm:'gameOverEnd'}:
    id==='dpz_kapi_bf'?{loss:'KAP_fnf_loss_sfx-newKapi',loop:'KAP_gameOver-newKapi',confirm:'KAP_gameOverEnd-newKapi'}:
    isBadBunny(game?.choice)?{loss:'fnf_loss_sfx',loop:'BB_gameOver-ftbb',confirm:'BB_gameOverEnd-ftbb'}:
    isImpostorWeek(game?.choice)?{loss:game.impostor?.deathPlayed?'IMPR_fnf_loss_sfx-defeat'+(game.impostor.ballDeath?'ballz':''):'fnf_loss_sfx',loop:'IMP_gameOver-sus',confirm:'IMP_gameOverEnd-sus'}:
    skyDeathSounds(id,settings.naughtyness!==false);
  return{id,character,pixel,sounds,suffix,duration:first?(first.frameIndices?.length||first.frameCount||24)/(first.fps||24)*1000:game?.character==='pico'?2000:1200};
}
function gameOver(){
  const sequence=game.impostor&&!game.impostor.deathPlayed&&defeatDeathSequence(game.choice);
  if(sequence){game.impostor.deathPlayed=true;game.impostor.ballDeath=settings.naughtyness!==false&&Math.random()<.1;game.completed=true;audio.stop();const current=game,generation=loadGeneration;runExpandedSequence('impostor-defeat-kill',sequence).then(done=>{if(done&&game===current&&generation===loadGeneration){game.completed=false;gameOver();}});return;}
  pendingRankReveal=null;audio.stop();const death=deathConfig();const specific=death.sounds?.loss||(death.id==='pico-blazin'?'W7W1_fnf_loss_sfx-pico-gutpunch':death.id==='pico-holding-nene'?'W7W1_fnf_loss_sfx-pico-and-nene':null);audio.sfx(specific||(death.pixel?death.pixel.lossSound.split('/').at(-1).replace(/\.ogg$/,''):'fnf_loss_sfx'));enter('gameover');const current=game;
  setTimeout(()=>{
    if(scene!=='gameover'||game!==current||game.retryAt)return;
    audio.playMenu(death.sounds?.loop||(death.pixel?death.pixel.loopMusic.split('/').at(-1).replace(/\.ogg$/,''):'gameOver'));
    const quote=tankmanDeathQuote(death.id,game.choice.opponent,settings.naughtyness!==false);
    if(quote)audio.sfx(quote,.78);
  },death.pixel||death.sounds?death.duration:1200);
  const vamp=vampQuote(game.choice,settings.vampLanguage);
  if(vamp)setTimeout(async()=>{
    if(scene!=='gameover'||game!==current||game.retryAt)return;
    const voice=await audio.load(''+vamp.name+'.ogg').catch(()=>null);
    if(!voice||scene!=='gameover'||game!==current||game.retryAt)return;
    const menu=audio.menu;
    if(menu)menu.volume=settings.volume*.14;
    audio.playEffect(voice,.9);
    setTimeout(()=>{if(menu&&audio.menu===menu)audio.updateVolume();},voice.duration*1000);
  },vamp.delay);
  if(game.qt){
    const cast=game.choice.baseSong==='go-go-go'?'qt/cg5':game.character==='pico'?'pico':'bf';
    const line=1+Math.floor(Math.random()*(cast==='bf'?7:6)),lang=settings.qtLanguage;
    const folder=cast.replace('/','_'),stem=cast==='qt/cg5'?'CG5Gameover':'qtGameover';
    const captions=cast==='qt/cg5'?'qt_cg5':cast+'-qt';
    const at=Math.max(1300,death.duration);
    setTimeout(()=>{
      if(scene!=='gameover'||game!==current||game.retryAt)return;
      audio.sfx('QTR_qtgameover_'+lang+'_'+folder+'_'+stem+'-'+line,.9);
      if(settings.subtitles!==false){
        expandedCaptions('QTR_'+lang+'_gameover_'+captions+'_gameover-line-'+line+'.srt')
          .then(cues=>{if(game===current)game.qt.deathCaptions={at,cues};}).catch(()=>{});
      }
    },at);
  }
  announce('Game over. Enter to retry. Escape for menu.');}
async function finishSong(){
  closeQtVideo(game.qt);
  closeImpostorVideo(game.impostor);
  if(isImpostorWeek(game.choice)&&game.choice.baseSong==='armed'&&!game.custom&&(story||settings.freeplayStoryCutscenes)){game.completed=true;audio.stop();if(!await runExpandedSequence('impostor-henry-outro',{file:'IMP6_henryend.mp4'}))return;}
  if(isImpostorWeek(game.choice)&&game.choice.baseSong==='meltdown'&&!game.custom&&(story||settings.freeplayStoryCutscenes)){
    game.completed=true;
    audio.stop();
    if(!await runExpandedSequence('impostor-meltdown-outro',{file:'IMP_meltdown_afterscene.mp4'}))return;
  }
  if(!game.custom&&game.choice.kapiSong==='dpz_fuzzy-distortion'){
    game.completed=true;
    audio.stop();
    if(!await runStorySequence(kapiDialogue('kapi-dialogue-dpz_fuzzy-distortion-end',settings.kapiLanguage),true))return;
  }
  if(!game.custom&&(story||settings.freeplayStoryCutscenes)){
    if(isSkyRedux(game.choice)){
      game.completed=true;
      audio.stop();
      const reduxSong=game.choice.reduxSong;
      if(reduxSong==='sky-c'&&!await runStorySequence('redux-dialogue-sky-end',true))return;
      if(story&&reduxSong.startsWith('manifest')){
        const current=game,generation=loadGeneration;
        const ending=reduxEnding(nativeResultRank(combinedStats(game.stats)),reduxSong.endsWith('-c'));
        const still=nativeContent.data.redux.endings[ending.image];
        await assets.ensure([still]);
        if(game!==current||generation!==loadGeneration)return;
        if(!await runExpandedSequence('redux-ending',{duration:Infinity,fadeIn:0,reduxEnding:still,
          audio:'SRX_END_'+ending.track+'.ogg'}))return;
      }
    }
    const sequence=qtScene(game.choice,'outro',settings.qtLanguage,nativeContent.stage(game.choice)?.cameraZoom);
    if(sequence){
      game.completed=true;
      audio.stop();
      if(!await runExpandedSequence('qt-outro',sequence))return;
    }
  }
  game.completed=true;audio.stop();const finishedGame=game,generation=loadGeneration,extra=game.custom?null:expandedOutro(game.choice,story||isVamp(game.choice)&&settings.freeplayStoryCutscenes,{manifestLiquid:game.skyManifestLiquid});if(extra&&(!await runExpandedSequence(extra)||finishedGame!==game||generation!==loadGeneration))return;const outro=game.custom?null:songOutro(SONGS[songIndex].id,{story,variant:game.choice.variant});if(outro){try{const complete=await runStorySequence(outro);if(!complete||finishedGame!==game||generation!==loadGeneration)return;}catch(error){console.error(error);announce('Cutscene could not load: '+error.message);}}const s=game.stats,forcedRank=game.forcedResultRank;const legitimate=!game.practice&&!game.botplay&&!game.custom&&!game.usedModifiers&&(!story||!storyUsedModifiers);
  if(legitimate){
    const old=bestFor(songIndex,game.character,difficulty),oldRank=storedRank(old),newRank=forcedRank||nativeResultRank(s);
    const improved=!!newRank&&FP_RANK_ORDER.indexOf(newRank)>FP_RANK_ORDER.indexOf(oldRank);
    game.newHighscore=!forcedRank&&(!old||s.score>old.score);
    if(game.newHighscore||improved){
      const record=game.newHighscore?{score:s.score,accuracy:accuracy(s),rank:rank(s),misses:s.misses}:{...old};
      record.nativeRank=improved?newRank:oldRank;
      record.completion=improved?(forcedRank?0:nativeCompletion(s)*100):old?.completion??old?.accuracy??0;
      storage.set(scoreKey(songIndex,game.character,difficulty),record);
    }
    if(improved&&!story)pendingRankReveal={song:SONGS[songIndex].id,level:difficulty,character:game.character,rank:newRank,oldRank};
  }
  if(story){storyTotal+=s.score;storyStats.push(structuredClone(s));const list=WEEKS[storyWeek].songs,i=list.indexOf(SONGS[songIndex].id);if(i<list.length-1){startSong(SONGS.findIndex(s=>s.id===list[i+1]),true,true);return;}if(legitimate&&storyTotal>storage.get('week:'+WEEKS[storyWeek].id+':'+difficulty,0))storage.set('week:'+WEEKS[storyWeek].id+':'+difficulty,storyTotal);}
  const resultStats=story?combinedStats():game.stats;resultStats.score=story?storyTotal:game.stats.score;enter('result-loading');try{await nativeResults.prepare(resultStats,{character:game.character,rank:forcedRank});if(scene!=='result-loading')return;nativeResults.begin({stats:resultStats,title:story?WEEKS[storyWeek].name:SONGS[songIndex].name,difficulty:DIFFICULTIES[difficulty],character:game.character,rank:forcedRank||nativeResultRank(resultStats),naughty:settings.naughtyness!==false,isNewHighscore:!!game.newHighscore,practice:game.practice,autoplay:game.botplay,volume:settings.volume,reducedMotion:settings.reducedMotion});}catch(error){console.error(error);announce('Results artwork could not load: '+error.message);}enter('results');announce(`${story?'Week '+WEEKS[storyWeek].id:SONGS[songIndex].name} complete. Score ${story?storyTotal:s.score}. Accuracy ${accuracy(s).toFixed(2)} percent.`);
}
function laneX(lane,player){
  if(!mobileActive()&&game?.extraEvents&&Number.isFinite(game.extraEvents[player?'strumX':'opponentX']))return game.extraEvents[player?'strumX':'opponentX']+lane*(laneCount()===6?88:112);
  const count=laneCount(),middle=player&&game?.vamp?.notes.length?(lane<count/2?-1:1)*(mobileActive()?26:42):0;if(mobileActive()){
  if(!player)return 22+lane*38;
  const {left,stride}=mobileLaneRegion(count);
  return left+(lane+.5)*stride-56+middle;
 }if(settings.middlescroll||isPyoro(game?.choice)||game?.choice.baseSong==='blazin'||game?.qt?.erectKiller&&game.time>=152220){
   const spacing=count===6?88:112;
   return player?(1280-count*spacing)/2+lane*spacing+middle:-600;
 }const spacing=count===6?88:112;return (player?(count===6?654:687):(count===6?40:92))+lane*spacing+middle+(player&&!middle?(count===6?42:45):0);}

function receptorY(){return mobileActive()||settings.downscroll?565:50;}

function gameplayNoteAtlas(){const name=game?.choice?.noteTexture;return name&&assets.images[name]&&assets.atlases[name]?name:'NOTE_assets';}
function customModNoteStyle(){
  if(isKapi(game?.choice))return nativeContent.data.kapi.notes[game.choice.noteStyle];
  if(isImpostorWeek(game?.choice))return pixelStage(game.choice)?null:nativeContent.data.impostor.notes;
  return null;
}
function drawNote(lane,x,y,scale=0.7,state='note',time=0,alpha=1){
 lane=laneDirection(lane);
 const style=customModNoteStyle(),appearance=style&&kapiReceptor(style,lane,state);
 if(appearance){
   const {entry,animation}=appearance,frames=assets.frames(entry.atlas,animation.prefix);
   if(frames.length){
     const age=state==='note'?Math.max(0,game.time):time;
     const frame=noteAnimationFrame(frames,animation,age);
     const s=scale/.7*(entry.scale||.7);
     ctx.save();
     ctx.translate(x+56,y+56);
     ctx.scale(1,viewAspect());
     if(entry.isPixel)ctx.imageSmoothingEnabled=false;
     assets.draw(ctx,entry.atlas,frame,-(frame.frameWidth||frame.width)*s/2,-(frame.frameHeight||frame.height)*s/2,s,alpha);
     ctx.restore();
     return;
   }
 }
 if(game&&pixelStage(game.choice)&&pixelUI.note(ctx,lane,x,y,scale,state,time,alpha,viewAspect()))return;let prefix=NOTE_PREFIX[lane];if(state==='static')prefix='arrow'+DIRECTIONS[lane];if(state==='press')prefix=DIRECTIONS[lane].toLowerCase()+' press';if(state==='confirm')prefix=DIRECTIONS[lane].toLowerCase()+' confirm';const redux=isSkyRedux(game?.choice)&&nativeContent.data.redux.notes[game.choice.noteStyle],dir=['Left','Down','Up','Right'][lane];
 if(redux)prefix=(state==='note'?'note':state)+dir;
 const skin=gameplayNoteAtlas(),atlas=redux?(state==='note'?redux.note:redux.noteStrumline):skin==='NOTE_assets'&&lane===1&&assets.images.NOTE_DOWN_NATIVE?'NOTE_DOWN_NATIVE':skin,f=assets.frames(atlas,prefix);if(!f.length)return;const frame=f[state==='confirm'?clamp(Math.floor(time/1000*24),0,f.length-1):0];const fw=(frame.frameWidth||frame.width)*scale,fh=(frame.frameHeight||frame.height)*scale;ctx.save();ctx.translate(x+56,y+56);ctx.scale(1,viewAspect());assets.draw(ctx,atlas,frame,-fw/2,-fh/2,scale,alpha);ctx.restore();}
function drawHold(lane,x,start,end,alpha,scale=0.7){lane=laneDirection(lane);if(pixelStage(game?.choice)&&pixelUI.hold(ctx,lane,x,start,end,alpha,scale,viewAspect()))return;
  const kapi=customModNoteStyle()?.holdNote;
  const native=assets.images[kapi?.atlas];
  if(native){
    const tile=native.width/8,s=scale/.7*kapi.scale,width=tile*s,length=Math.abs(end-start);
    const cap=Math.min(native.height*s,length),sourceX=lane*tile*2;
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.translate(x,start);
    ctx.scale(1,end>=start?1:-1);
    if(kapi.isPixel)ctx.imageSmoothingEnabled=false;
    if(length>cap)ctx.drawImage(native,sourceX,0,tile,native.height,-width/2,0,width,length-cap);
    ctx.drawImage(native,sourceX+tile,0,tile,native.height,-width/2,length-cap,width,cap);
    ctx.restore();
    return;
  }
  const redux=isSkyRedux(game?.choice)&&nativeContent.data.redux.notes[game.choice.noteStyle];
  if(redux){
    const img=assets.images[redux.holdNote],laneWidth=img.width/4,w=Math.floor(laneWidth/2),sx=Math.round(lane*laneWidth);
    const length=Math.abs(end-start),cap=Math.min(img.height*scale,length),width=w*scale;
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,start);ctx.scale(1,end>=start?1:-1);
    if(length>cap)ctx.drawImage(img,sx,1,w,Math.floor(img.height/3),-width/2,0,width,length-cap);
    ctx.drawImage(img,sx+w,0,w,img.height,-width/2,length-cap,width,cap);
    ctx.restore();return;
  }
  const atlas=gameplayNoteAtlas(),names=['purple','blue','green','red'],body=assets.frame(atlas,names[lane]+' hold piece'),tip=assets.frame(atlas,lane===0?'pruple end hold':names[lane]+' hold end');if(!body||!tip)return;
  const direction=end>=start?1:-1,length=Math.abs(end-start),img=assets.images[atlas],width=body.width*scale,cap=Math.min(tip.height*scale*viewAspect(),length);
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,start);ctx.scale(1,direction);if(length>cap)ctx.drawImage(img,body.x,body.y,body.width,body.height,-width/2,0,width,length-cap);ctx.drawImage(img,tip.x,tip.y,tip.width,tip.height,-width/2,length-cap,width,cap);ctx.restore();
}
function icon(character,x,y,scale=0.65,losing=false,flip=false,options={}){if(drawAnimatedHealthIcon(ctx,assets,nativeContent.data.iconAssets?.[character],{x:x+(options?.offsetX||0),y:y+(options?.offsetY||0),scale:scale*(options?.scale??1),losing,flip:flip!==!!options?.flipX,time:game?.time||frameTime}))return;const id=String(character).split('-')[0],native=assets.images[nativeContent.data.iconAssets?.[character]]||assets.images['HEALTH_'+character]||assets.images['HEALTH_'+id],img=native||assets.images.iconGrid,index=(character==='dad'?12:character==='spooky'?2:character==='monster'?19:character==='pico'?4:0)+(losing?1:0),size=native?img.height:150,sx=native?Math.min(losing?size:0,img.width-size):(index%10)*150,sy=native?0:Math.floor(index/10)*150;scale*=(options?.scale??1)*(native?150/size:1);x+=options?.offsetX||0;y+=options?.offsetY||0;flip=flip!==!!options?.flipX;ctx.save();if(native&&size<100)ctx.imageSmoothingEnabled=false;if(flip){ctx.translate(x+size*scale,y);ctx.scale(-1,1);ctx.drawImage(img,sx,sy,size,size,0,0,size*scale,size*scale);}else ctx.drawImage(img,sx,sy,size,size,x,y,size*scale,size*scale);ctx.restore();}
function drawActor(name,actor,x,y,scale,time){const dims=name==='PICO'?[500,500]:name==='BOYFRIEND'?[412,412]:name.startsWith('SPOOKY')?[492,549]:name==='MONSTER'?[426,637]:[426,767];ctx.save();ctx.translate(x+dims[0]*scale/2,y+dims[1]*scale);ctx.scale(1,viewAspect());drawActorRaw(name,actor,-dims[0]*scale/2,-dims[1]*scale,scale,time);ctx.restore();}
function drawActorRaw(name,actor,x,y,scale,time){const bf=name==='BOYFRIEND',idle=actor.direction==='idle'||time>actor.until,direction=idle?'idle':actor.direction;
 const prefix=name==='PICO'?(idle?'Pico idle':'Pico '+direction.replace('miss','')+(direction.endsWith('miss')?'miss':'0')):name.startsWith('SPOOKY')?(idle?'Spooky idle':'Spooky '+direction.replace('miss','')):name==='MONSTER'?(idle?'Monster idle0':'Monster '+direction.replace('miss','')+'0'):bf?(idle?'BF idle dance':'BF NOTE '+direction.replace('miss','')+(direction.endsWith('miss')?' MISS':'0')):(idle?'Dad idle dance':'Dad Sing Note '+direction);
 const offsets=name==='PICO'?[19,1]:name.startsWith('SPOOKY')||name==='MONSTER'?[0,0]:(bf?BF_OFFSETS:DAD_OFFSETS)[direction.replace('miss','')]||[0,0],bpm=bpmAt(game.chart,time),period=game.eventBop[bf||name==='PICO'?'player':'opponent']??dancePeriod(bpm),phase=idle?period===0?0:((game.beat%period+period)%period)*60000/bpm:Math.max(0,time-actor.since);
 if(actor.forced&&time<actor.forced.until){const semantic=actor.forced.name||actor.forced.prefix,map=name==='PICO'?{hey:'Pico HEY',cheer:'Pico HEY'}:name.startsWith('SPOOKY')?{hey:'Spooky cheer',cheer:'Spooky cheer'}:bf?{hey:'BF HEY!!',cheer:'BF HEY!!'}:{},special=map[semantic]||semantic;if(assets.frames(name,special).length){animation(name,special,x,y,scale,time-actor.forced.since,{loop:false});return;}}
 if(bf&&time-game.lightningAt>=0&&time-game.lightningAt<550){animation('BF_FEAR','BF scared',x,y,scale,time-game.lightningAt,{loop:false});return;}
 animation(name,prefix,x-offsets[0]*scale,y-offsets[1]*scale,scale,settings.reducedMotion&&idle?0:phase,{loop:false});
}

function drawSceneCharacter(role,actor,position,time,stageScale=null,globalOffsets=true){ctx.save();ctx.translate(position[0],position[1]);ctx.scale(1,viewAspect());const drawn=drawSceneCharacterRaw(role,actor,[0,0],time,stageScale,globalOffsets);ctx.restore();return drawn;}
function stageCharacterId(role){
  if(game.impostor?.characters[role])return game.impostor.characters[role];
  if(role==='opponent'&&game.reduxFrame?.switched)return 'redux-modsky-goat';
  const declared=game.choice.characters?.[role];
  if(declared)return declared;
  if(role==='girlfriend')return game.choice.opponent==='gf'?'none':game.character==='pico'?'nene':'gf';
  return role==='player'?game.character==='pico'?'pico-playable':'bf':game.choice.opponent||'dad';
}
function drawSceneCharacterRaw(role,actor,position,time,stageScale=null,globalOffsets=true){const id=stageCharacterId(role);if(!id||id==='none')return role==='girlfriend';actor=actor||(role==='girlfriend'?actorGF:null);const config=game.modVisuals?.characters[role],bpm=bpmAt(game.chart,time),period=game.eventBop[role]??(role==='girlfriend'?1:dancePeriod(bpm)),idle=!actor||actor.direction==='idle'||time>actor.until,forced=actor?.forced&&time<actor.forced.until?actor.forced:null;
 if(config){drawModCharacter(ctx,assets,config,{x:position[0],y:position[1],scale:role==='girlfriend'?0.62:0.65,direction:idle?'idle':actor.direction,animation:forced?.name,time:forced?time-forced.since:idle?period===0?0:((game.beat%period+period)%period)*60000/bpm:time-actor.since,beat:game.beat,bopBeats:period,player:role==='player'});return true;}
 const options={...restActorOptions(game,role,time),x:position[0],y:position[1],scale:stageScale??(role==='girlfriend'?0.62:role==='player'?0.66:0.7),time,naughtyness:settings.naughtyness!==false,beat:game.beat,bpm,period,player:role==='player',globalOffsets,suffix:game.animationSuffix?.[role],animationRemap:impostorLightAnimations(game.impostor,role),...role==='girlfriend'?nativeContent.partnerOverride(game,time,id):{}};
 if(isBadBunny(game.choice)&&role==='player'&&idle&&!forced&&!game.bunny?.alternate)options.animation='idle';
 if(id==='ghost-gf-intro')options.animationTime=Math.max(0,time-game.impostor.ghostAt);
 if(game.qt?.erectKiller&&role==='opponent'&&!game.qt.erectReleased){
   options.animation='intro-erect';
   options.animationTime=0;
 }
 if(role==='player'&&forced&&isVamp(game.choice)){
   const name=forced.name;
   const art=vampPose(nativeContent.data.vamp,id,name);
   if(art&&(name!=='fuckyouu'||settings.naughtyness!==false)){
     const [l,t,r,b]=art.bounds,[ox,oy]=art.offsets||[0,0],s=options.scale;
     const idx=clamp(Math.floor((time-forced.since)*.024),0,art.frames-1);
     ctx.save();ctx.translate(position[0],position[1]);if(id.startsWith('pico'))ctx.scale(-1,1);
     atlasFrame(art.name,art.prefix,((l-r)/2-ox)*s,(-b+t-oy)*s,s,idx);ctx.restore();return true;
   }
 }
 if(id==='nene-pixel'&&role==='girlfriend')pixelUI.abot(ctx,id,position,{scale:0.62,time,beat:game.beat,bpm,focusPlayer:game.eventFocus??game.chartPlayer});
 if(role==='girlfriend'){
   const pack=nativeExtras.packs.characters;
   const nene=pack?.characters.nene;
   const animation=nene?.animations.idle||nene?.animations.danceLeft;
   const bounds=id==='nene'?pack?.timelines[animation?.timeline]?.bounds:null;
   const anchor=officialPartnerAnchor(id,nativeContent.character(id),position,options.scale,{bounds,globalOffsets});
   if(anchor)drawABot(ctx,assets,audio,{...anchor,time});
 }
 const nativeId=id==='pico-playable'&&nativeContent.picoArt?null:id==='bf'?'bf':id==='pico-playable'||id==='pico'?'pico':id==='gf'||id==='gf-dark'?'gf':id==='nene'?'nene':!nativeContent.character(id,role==='player')&&role==='player'?(game.character==='pico'?'pico':'bf'):!nativeContent.character(id)&&role==='girlfriend'?'gf':null;
 if(nativeId&&nativeExtras.packs.characters&&!(forced&&nativeContent.character(id,role==='player')?.animationMap?.[forced.name]&&!nativeExtras.hasCharacterAnimation(nativeId,forced.name))){let name=forced?.name||(!idle?'sing'+actor.direction:nativeExtras.hasCharacterAnimation(nativeId,'idle')?'idle':Math.floor(Math.max(0,game.beat)/Math.max(period,0.000001))%2?'danceRight':'danceLeft');if((nativeId==='bf'||nativeId==='gf')&&time-game.lightningAt>=0&&time-game.lightningAt<550)name='scared';if(period===0&&idle)name=nativeExtras.hasCharacterAnimation(nativeId,'idle')?'idle':'danceLeft';if(role==='opponent'&&nativeId==='pico')name=name.replace('LEFT','temporary').replace('RIGHT','LEFT').replace('temporary','RIGHT');const phase=name==='scared'&&time-game.lightningAt<550?time-game.lightningAt:forced?time-forced.since:idle?period===0?0:((game.beat%period+period)%period)*60000/bpm:time-actor.since;ctx.save();if(id==='gf-dark')ctx.filter='brightness(0.25)';const drawn=nativeExtras.drawCharacter(ctx,nativeId,name,{x:position[0],y:position[1],scale:options.scale,time:phase,beat:game.beat,bpm,period,player:role==='player',globalOffsets});ctx.restore();if(drawn)return true;}
 return nativeContent.drawCharacter(ctx,id,actor,options);
}
function drawExpandedStage(time,script=null){
  const choice=game.impostor?.stage?{...game.choice,stage:game.impostor.stage}:game.choice,stage=nativeContent.stage(game.reduxFrame?.stage?{stage:game.reduxFrame.stage}:choice),fight=choice.baseSong==='blazin',intro=scene==='intro'||!!script;
  rect(0,0,1280,720,/^impostor-(lime|finale|extras)$/.test(choice.source)||isDefeat(choice)||game.impostor?.lights==='in'?'#000':choice.stage==='tankmanBattlefield'?'#ec9a03':'#19131b');
  const baseZoom=intro?1:(game.eventZoom||1)+(settings.cameraZooms===false||settings.reducedMotion?0:
    (game.cameraBump||0)+impostorCameraPush(game.impostor,time)+restZoom(game,time));
  const view=officialStageLayout(game,stage,{
    time,scale:stage.view?.scale??.8,originX:stage.view?.x??40,originY:stage.view?.y??-70,
    pan:0,bump:baseZoom,intro,cutsceneId:script?.camera?null:script?.cutsceneId,elapsed:script?.elapsed,reducedMotion:settings.reducedMotion,
  });
  const {scale,originX,originY}=view,originPan=view.pan||0;
  const worldOptions={time,pan:originPan,worldScale:scale,originX,originY,reducedMotion:settings.reducedMotion,mobile:mobileActive()};
  const project=([x,y])=>[originX+x*scale-originPan,originY+y*scale];
  const deadSniper=script?null:game.stressSniper;
  const skyOutcome=script?null:game.skyPicoOutcome;
  const positions={},focusPoints={},layers=stage.props.map(item=>{
    const initial=kapiStageProp(item,choice,game.beat,time,nativeContent.data.kapi);
    const prop=initial&&campaignProp(impostorProp(bunnyProp(initial,game,time,assets),game.impostor,time),game,time);
    if(!prop)return null;
    // Native Animate assets retain their Stage transform in the artwork. The
    // packed background frames use a normalized origin, so restore that offset.
    const tankmanOffset=choice.stage==='tankmanBattlefieldErect'?{sniper:[119.83,583.74],guy:[1645.305,643.7861]}[prop.name]:null;
    const authored=script?.propOffsets?.[prop.name]||(deadSniper&&prop.name==='tankBricks'?[0,100]:null);
    const shift=tankmanOffset&&authored?tankmanOffset.map((v,i)=>v+authored[i]):tankmanOffset||authored;
    const show=script?.showProps?.includes(prop.name)||prop.name==='rocket'&&choice.variant==='pico'&&scene!=='cutscene';
    const adjusted=game.qt?qtProp(prop,game.qt,time,settings.flashingLights!==false&&!settings.reducedMotion,{
      art:nativeContent.data.qt,elapsed:script?.elapsed,outro:script?.qtTransform,beat:game.beat,
      reducedMotion:settings.reducedMotion,
    }):reduxProp(prop,game.reduxFrame);
    const positioned=shift?{...adjusted,position:prop.position.map((v,i)=>v+shift[i])}:adjusted;
    const blink=game.vamp?.blink;
    if(blink&&blink.name===prop.name&&time-blink.at<110)return {z:prop.zIndex,prop:{...positioned,startingAnimation:'blink'}};
    return {z:view.propZ?.[prop.name]??prop.zIndex??0,prop:show?{...positioned,alpha:1}:positioned};
  }).filter(Boolean);
  if(game.qt&&choice.stage==='qtStagePico'){
    const clip=nativeContent.data.qt.bus;
    const age=time-(game.qt.busAt??Infinity);
    const [left,top]=clip.bounds;
    layers.push({z:12,prop:{name:'qtBus',assetId:clip.name,position:[-656+left,-30+top],
      animationTime:age>=0?age:0,animations:[{prefix:clip.prefix,frameRate:clip.fps,looped:false}]}});
  }
  if(game.impostor?.saxAt!=null){
    const age=time-game.impostor.saxAt;
    layers.push({z:400,prop:{name:'toogusSax',assetId:nativeContent.data.impostor.sax,position:[-550+age*.15,275],
      startingAnimation:'bop',animations:[{name:'bop',prefix:'Cyan Dancy',looped:true}],animationTime:age}});
  }
  for(const [role,key] of [['girlfriend','gf'],['opponent','dad'],['player','bf']]){
    if(!impostorActorVisible(game.impostor,role))continue;
    if(Object.hasOwn(choice.characters||{},role)&&!choice.characters[role])continue;
    if(isPyoro(choice)&&role!=='player')continue;
    if(game.qt?.studio&&role==='girlfriend'&&game.beat<111)continue;
    const meta=stage.characters[key];
    if(!meta||meta.position.some(v=>!Number.isFinite(v)||Math.abs(v)>(role==='girlfriend'?8000:100000)))continue;
    const id=stageCharacterId(role);if(role==='girlfriend'&&['invisigf','nothing','none'].includes(id))continue;const swing=id==='scenecoresky-shootin'&&!settings.reducedMotion;
    const config=nativeContent.character(id,role==='player');
    const centered=id==='scenecoresky-shootin'&&choice.baseSong==='stress'&&choice.variant==='sky'&&choice.stage==='tankmanBattlefieldErect';
    const authoredPosition=centered?[stressSkyPartnerX(stage,config),meta.position[1]]:kapiPadPosition(choice,id,meta.position);
    const worldPosition=campaignActorPosition(game,role,impostorGroundPosition(choice,role,authoredPosition,config,stage.characters.bf.position[1],meta.scale||1),time);
    const overrides=view.actors?.[role],offset=script?.actorOffsets?.[role]||[0,0];
    const pos=overrides?.position||project(worldPosition);
    const angle=swing?-Math.sin(time*.0025)*Math.PI/18:0;
    const side=swing?(centered?0:-67)+Math.sin(time*.00252)*58:0;
    const lift=overrides?.lift||0;
    const position=positions[role]=[pos[0]+(offset[0]+side)*scale,pos[1]+offset[1]*scale-lift];
    focusPoints[role]=actorCameraPoint(worldPosition,meta,config,1);
    if(lift)focusPoints[role][1]-=lift/scale;
    const cutActor=script?.actors?.find(entry=>entry.role===role&&entry.asset)||(role==='opponent'&&skyOutcome?{
      asset:skyOutcome.art,label:skyOutcome.naughtyness?'Dead':'Dead Candy',age:time,offset:[-190,-581],loop:true,
    }:null);
    if(cutActor)layers.push({z:(meta.zIndex||0)+1,cutActor,position});
    const vampActor=script?.vampActors?.find(entry=>entry.role===role&&entry.art);
    layers.push({z:fight&&role===game.fightLead?3500:meta.zIndex||0,role,position,angle,
      alpha:stageActorAlpha(game,meta),actorScale:overrides?.actorScale??scale*(meta.scale||1),globalOffsets:overrides?.globalOffsets,vampActor});
    if(id==='redux-gf-redux'&&config&&nativeContent.data.redux?.stereo&&!script?.hideActors?.includes(role)){
      layers.push({z:(meta.zIndex||0)-1,stereo:nativeContent.data.redux.stereo,
        position:reduxStereoPosition(position,config,scale,overrides?.actorScale??scale*(meta.scale||1))});
    }
  }
  const extra=extraSinger(choice);if(extra)layers.push({z:(stage.characters.bf.zIndex||300)+extra.zOffset,extraActor:extra.id,position:project(stage.characters.bf.position.map((p,i)=>p+extra.offset[i]))});
  if(game.impostor?.pet&&positions.player)layers.push({z:(stage.characters.bf.zIndex||300)+1,pet:game.impostor.pet,position:[positions.player[0]+95*scale,positions.player[1]+15*scale]});
  const propActors=script?.props||(deadSniper?[{prop:'sniper',z:21,asset:deadSniper,label:'Sniper Dead Loop',age:time,offset:[-150,550],scale:1.15,loop:true}]:[]);
  for(const prop of propActors){
    const anchor=stage.props.find(item=>item.name===prop.prop);
    if(anchor&&prop.asset)layers.push({z:prop.z,cutActor:prop,position:project(anchor.position)});
  }
  layers.push(...skyPolish.stageLayers(game));
  if(!intro&&!settings.reducedMotion)layers.push(...vampAtmosphere(game,time,nativeContent.data.vamp));
  if(choice.stage==='theShiftDarkErect')layers.push({z:50,angerBackdrop:true});
  if(!intro&&game.tankmanRunners?.length)layers.push({z:30,tankmanRunners:true});
  const resolve=([role,x,y,zoom])=>{
    const point=role==='position'?[0,0]:focusPoints[role]||[(640-originX+originPan)/scale,(360-originY)/scale];
    const [px,py]=project([point[0]+x,point[1]+y]);
    return zoom==null?[px,py]:[px,py,zoom];
  };
  const shot=script&&scriptedCamera(script,script.elapsed,script.duringPlay&&game.stageCamera||[640,360,stage.cameraZoom||scale],resolve);
  let [centerX,centerY,zoom]=shot||[640,360,scale*view.bump];
  if(!intro&&!fight&&!settings.reducedMotion){
    if(game.hasStageFocus??=game.chart.events?.some(event=>event.e==='FocusCamera')){
      [centerX,centerY]=nativeChartCamera(game,time,[640,360],resolve);
      if(game.impostor?.noteFollow){
        const actor=game.eventFocusRole==='player'?actorBF:game.eventFocusRole==='opponent'?actorDad:null;
        const direction=actor?.until>=time?actor.direction.replace('miss',''):'idle';
        const [nx,ny]=({LEFT:[-1,0],RIGHT:[1,0],UP:[0,-1],DOWN:[0,1]})[direction]||[0,0];
        centerX+=nx*game.impostor.noteFollow*scale;
        centerY+=ny*game.impostor.noteFollow*scale;
      }
    }else{
      const side=game.chartPlayer?1:-1,previous=game.cameraX||0;
      game.cameraX=previous+(side*24-previous)*.05;
      centerX+=game.cameraX;
    }
  }
  if(!intro)game.stageCamera=[centerX,centerY,zoom];
  if(shot&&!script?.duringPlay&&!game.completed)game.introCamera=shot;
  if(!intro&&game.introCamera&&!settings.reducedMotion&&time<0){
    const t=clamp((time-game.startTime)/Math.max(1,-game.startTime),0,1),ease=t*t*(3-2*t);
    [centerX,centerY,zoom]=[centerX,centerY,zoom].map((v,i)=>game.introCamera[i]+(v-game.introCamera[i])*ease);
  }
  const shotAge=time-(game.lastShot?.time??-Infinity);
  const scenecoreShake=!intro&&stageCharacterId('girlfriend')==='scenecoresky-shootin'&&shotAge>=0&&shotAge<100?.004:0;
  const dropAge=time-(game.vamp?.drop?.at??-Infinity);
  const shake=settings.flashingLights===false||settings.reducedMotion?0:script?.shake||scenecoreShake||(dropAge>=700&&dropAge<1200?.004:0);
  const bump=zoom/scale;
  if(scene==='play'&&!game.impostor?.remoteEntered&&/^airshipRoom/.test(choice.stage)){
    const remote=stage.props.find(p=>p.name==='teleporter'),size=nativeContent.data.stageAssets[remote?.assetId]?.logicalSize;
    const hitbox=remoteScreenRect(remote,size,{scale,originX,originY,pan:originPan,centerX,centerY,bump});
    if(hitbox)newButton('airship-remote','Press the Airship remote',hitbox.x,hitbox.y,hitbox.w,hitbox.h,activateAirshipRemote,{tapOnDown:true,exclusive:true,zIndex:10});
  }

  const shakeX=shake?Math.sin(time*.131)*1280*shake:0,shakeY=shake?Math.cos(time*.177)*720*shake:0;
  const screenTransform=ctx.getTransform();
  ctx.save();
  if(pixelStage(choice))ctx.imageSmoothingEnabled=false;
  ctx.translate(640+shakeX,360+shakeY);ctx.scale(bump,bump);ctx.translate(-centerX,-centerY);
  let backgroundBatch=false,backgroundFinished=false;
  try {
  for(const layer of layers.sort((a,b)=>a.z-b.z)){
    if(isBadBunny(choice)&&!backgroundFinished){
      if(layer.prop&&layer.z<100){
        if(!backgroundBatch){backgroundBatch=nativeContent.bunnyShaders.begin(ctx);if(!backgroundBatch)backgroundFinished=true;}
      }else{
        nativeContent.bunnyShaders.end(ctx);backgroundBatch=false;backgroundFinished=true;
      }
    }
    if(layer.extraActor||layer.pet){ctx.save();ctx.translate(layer.position[0],layer.position[1]);ctx.scale(1,viewAspect());nativeContent.drawCharacter(ctx,layer.extraActor||layer.pet,layer.extraActor?game.impostor.extraActor:null,{x:0,y:0,scale,time,beat:game.beat,bpm:bpmAt(game.chart,time),globalOffsets:!layer.pet});ctx.restore();continue;}
    if(layer.stereo){
      const tempo=game.chart.tempos.findLast(tempo=>tempo.time<=time)||game.chart.tempos[0];
      const phase=settings.reducedMotion||time<0?0:(game.beat%1)*60000/tempo.bpm;
      assets.anim(ctx,layer.stereo,'stereo boom',...layer.position,scale,phase,{loop:false});
      continue;
    }
    if(layer.cutActor){
      const {asset,label,age,offset,scale:actorScale=1,loop}=layer.cutActor;
      ctx.save();
      if(script?.cutsceneId==='sky-pico-stage'||skyOutcome)ctx.filter='contrast(1.08) hue-rotate(-27deg)';
      try{drawSkyAnimation(ctx,asset,age,layer.position[0]+offset[0]*scale,layer.position[1]+offset[1]*scale,{scale:scale*actorScale,label,loop});}
      finally{ctx.restore();}
    if(script?.smoke?.art&&layer.cutActor.asset===script.actors[0].asset){
      const {art,age}=script.smoke,frames=art.frames,frame=frames[Math.floor(age*.024)%frames.length];
      if(frame){
        ctx.save();
        ctx.globalCompositeOperation='lighter';
        ctx.globalAlpha=.4*clamp(age/500,0,1)*clamp((3950-age)/2000,0,1);
        ctx.drawImage(art.image,frame.x,frame.y,frame.width,frame.height,
          layer.position[0]-110*scale,layer.position[1]-550*scale,frame.width*scale,frame.height*scale);
        ctx.restore();
      }
    }
      continue;
    }
    if(layer.role&&layer.alpha===0)continue;
    if(layer.role&&(skyOutcome&&layer.role==='opponent'||script?.actors?.some(entry=>entry.role===layer.role&&entry.asset)))continue;
    if(layer.role&&(script?.hideActors?.includes(layer.role)||scene==='intro'&&storyIntros.hideActors?.includes(layer.role)))continue;
    if(layer.prop&&(deadSniper&&layer.prop.name==='sniper'||(choice.baseSong==='sky-mobile'&&layer.prop.name==='babyGradient'||choice.stage==='theShiftDarkErect'&&choice.baseSong!=='sky-lyrics'&&layer.prop.name==='lyricsSign')||script?.hideProps?.includes(layer.prop.name)||scene==='intro'&&storyIntros.hideProps?.includes(layer.prop.name)))continue;
    if(layer.tankmanRunners){
      drawTankmanRunners(game,time,scale,project);
      continue;
    }
    if(layer.angerBackdrop||['black','wall','giygas'].includes(layer.skyEffect)){
      ctx.save();
      ctx.setTransform(screenTransform);
      if(layer.angerBackdrop)skyDetails.drawBackdrop(ctx,game,settings.reducedMotion?0:time);
      else skyPolish.drawEffect(ctx,layer.skyEffect,game,worldOptions);
      ctx.restore();
      continue;
    }
    if(layer.skyEffect){skyPolish.drawEffect(ctx,layer.skyEffect,game,worldOptions);continue;}
    if(layer.prop){
      const scroll=layer.prop.scroll||[1,1],parallax={...worldOptions,
        originX:originX+(centerX-640)*(1-scroll[0]),originY:originY+(centerY-360)*(1-scroll[1])};
      ctx.save();
      if(script?.duringPlay&&layer.prop.name==='miniShift')ctx.globalAlpha*=1-.75*script.fade;
      if(script?.propBrightness<1&&(layer.prop.zIndex??0)<300)ctx.filter='brightness('+script.propBrightness+')';
      skyPolish.drawProp(ctx,game,layer.prop,()=>nativeContent.drawProp(ctx,layer.prop,game,parallax),parallax);
      ctx.restore();
      if(layer.prop.name==='spraycanPile')drawOfficialStageFX(ctx,assets,game,stage,view,{time,elapsed:script?.elapsed,cutsceneId:script?.cutsceneId,phase:'pile'});
      continue;
    }
    if(layer.vampActor){
      const {art,offset,at,grounded}=layer.vampActor;
      const index=clamp(Math.floor((script.elapsed-at)*.024),0,art.frames-1);
      const [x,y]=layer.position,[l,t,r,b]=art.bounds;
      const firstFrame=grounded&&assets.frame(art.name,art.prefix);
      const baseline=firstFrame?firstFrame.height-(firstFrame.frameY||0):b-t;
      atlasFrame(art.name,art.prefix,x+((l-r)/2+offset[0])*scale,y+(offset[1]-baseline)*scale,scale,index);
      continue;
    }
    if(layer.role==='opponent'&&game.qt){
      const art=nativeContent.data.qt,[x,y]=layer.position;
      if(script?.qtTransform){
        const clip=art.transform,s=layer.actorScale;
        atlasFrame(clip.name,clip.prefix,x-(clip.bounds[2]-clip.bounds[0])*s/2,y-(clip.bounds[3]-clip.bounds[1])*s,s,Math.floor(script.elapsed*clip.fps/1000));
        continue;
      }
      const dance=!intro&&qtDancePose(game,art,time);
      if(dance){
        const {clip,frame}=dance,s=layer.actorScale;
        atlasFrame(clip.name,clip.prefix,x-(clip.bounds[2]-clip.bounds[0])*s/2,y-(clip.bounds[3]-clip.bounds[1])*s,s,frame);
        continue;
      }
    }
    if(layer.role==='player')skyPolish.drawTutorial(ctx,game,time,layer.position,{stageScale:scale,reducedMotion:settings.reducedMotion});
    const actor=layer.role==='player'?actorBF:layer.role==='opponent'?actorDad:actorGF;
    drawChordGhost(ctx,nativeContent,game,layer.role,layer.position,layer.actorScale,time,viewAspect(),settings.reducedMotion);
    ctx.save();
    ctx.globalAlpha*=(layer.alpha??1)*campaignActorAlpha(game.impostor,layer.role,time);
    if(campaignSilhouette(game)&&layer.role!=='girlfriend')ctx.filter='brightness(0) saturate(100%) invert(16%) sepia(100%) saturate(7481%) hue-rotate(359deg)';
    if(layer.angle){
      const [x,y]=layer.position;
      const pivot=y-900*scale;
      ctx.translate(x,pivot);ctx.rotate(layer.angle);ctx.translate(-x,-pivot);
    }
    if(script?.duringPlay&&layer.role==='player')ctx.globalAlpha*=1-script.fade;
    if(layer.role==='girlfriend'&&stageCharacterId('girlfriend')==='scenecoresky-shootin'){
      skyDetails.drawScenecoreShot(ctx,game.lastShot,layer.position,time,layer.actorScale,nativeContent.character('scenecoresky-shootin'),settings.flashingLights!==false);
    }
    const drawn=skyPolish.drawActor(ctx,game,layer.role,()=>skyDetails.drawSpecialPose(ctx,game,actor,layer.role,layer.position,time,layer.actorScale)||drawSceneCharacter(layer.role,actor,layer.position,time,layer.actorScale,layer.globalOffsets),worldOptions);
    if(layer.role==='girlfriend'&&script?.muzzle?.art){
      const {art,age}=script.muzzle,frame=art.frames[Math.floor(age*.024)];
      if(frame){
        const [x,y]=layer.position;
        ctx.save();
        if(age<84&&settings.flashingLights!==false)ctx.globalCompositeOperation='lighter';
        ctx.drawImage(art.image,frame.x,frame.y,frame.width,frame.height,
          x+(-363-(frame.frameX||0))*scale,y+(-715-(frame.frameY||0))*scale,frame.width*scale,frame.height*scale);
        ctx.restore();
      }
    }
    ctx.restore();
    if(layer.role==='opponent')skyDetails.drawScream(ctx,game,actor,layer.position,time,scale);
    if(!drawn&&layer.role==='player'){
      const pico=game.character==='pico',s=pico?.64:.66,dim=pico?500:412;
      drawActor(pico?'PICO':'BOYFRIEND',actorBF,layer.position[0]-dim*s/2,layer.position[1]-dim*s,s,time);
    }
  }
  const bubble=game.reduxFrame?.bubble;
  if(bubble&&positions.player&&!intro){
    const atlas=nativeContent.data.redux.bubbles[bubble.kind],age=bubble.age;
    const length=assets.frames(atlas,'bubble').length*1000/24;
    const [x,y]=positions.player;
    assets.anim(ctx,atlas,age<length?'bubble':'loop',x+60*scale,y-620*scale,scale,
      age<length?age:age-length,{loop:age>=length,alpha:bubble.alpha});
  }
  drawOfficialStageFX(ctx,assets,game,stage,view,{time,elapsed:script?.elapsed,cutsceneId:script?.cutsceneId,phase:'afterActors'});
  } finally {if(backgroundBatch)nativeContent.bunnyShaders.end(ctx);ctx.restore();}
  if(settings.backgroundDim)rect(0,0,1280,720,'rgba(0,0,0,'+settings.backgroundDim+')');
  return {...Object.fromEntries(Object.entries(positions).filter(([role])=>role!=='girlfriend'||stageActorAlpha(game,stage.characters.gf)>0).map(([role,[x,y]])=>[role,[640+shakeX+(x-centerX)*bump,360+shakeY+(y-centerY)*bump]])),scale:scale*bump};
}
function drawTankmanRunners(game,time,worldScale,project){
  const atlas='NATIVE_TANKMAN_RUNNER';
  const erect=game.choice.stage==='tankmanBattlefieldErect';
  const skyMix=erect&&game.choice.variant==='sky';
  const running=assets.frames(atlas,'tankman running');
  for(const [i,shot] of game.tankmanRunners.entries()){
    const age=time-shot.t;
    const staging=skyMix?stressSkyRunner(shot,i,age):null;
    if(skyMix?!staging:age< -2100||age>430)continue;
    const right=shot.d%4<2;
    const prefix=age<0?'tankman running':i%2?'John Shot 1':'John Shot 2';
    const frames=age<0?running:assets.frames(atlas,prefix);
    if(!frames.length)continue;
    const frame=frames[age<0?Math.floor((age+2100)*.024)%frames.length:Math.min(frames.length-1,Math.floor(age*.024))];
    const [x,y]=project(staging?[staging.x,staging.y]:[right?500+Math.min(0,age)*.85:820-Math.min(0,age)*.85,erect?819:705+i%5*16]);
    const scale=worldScale*(staging?.scale??(erect?.56:.45));
    ctx.save();ctx.translate(x,y);ctx.scale((staging?.flip??right)?-1:1,1);
    const foot=staging&&age<0?432:frame.frameHeight||frame.height;
    assets.draw(ctx,atlas,frame,-(frame.frameWidth||frame.width)*scale/2,-foot*scale,scale);
    ctx.restore();
  }
}

async function prepareSceneAssets(choice,cutscenes=false){const week=/^spookyMansion/.test(choice.stage)?2:SONGS[songIndex].week,modern=choice.variant==='erect'||choice.character==='pico'||choice.stage?.endsWith('Erect'),needed=new Set([...nativeContent.required(choice),...pixelUI.required(choice),pixelStage(choice)?'NATIVE_SPLASH_PIXEL':'NATIVE_SPLASH','combo']);
if(isImpostorWeek(choice)){
  const art=nativeContent.data.impostor;
  for(const name of [...campaignAssets(choice,nativeContent.data),...restAssets(choice,nativeContent.data,settings)])needed.add(name);
  if(choice.baseSong==='sussus-toogus')needed.add(art.sax);
  for(const entry of Object.values(art.notes))needed.add(entry.atlas);
  for(const asset of Object.values(art.countdown))needed.add(asset);
  needed.add(art.reactor);
  if(choice.baseSong==='sabotage'){
    for(const character of ['ghost-gf-intro','ghost-gf'])
      needed.add(nativeContent.character(character)?.atlasName);
  }
}
if(isKapi(choice)){
  const art=nativeContent.data.kapi;
  for(const entry of Object.values(art.notes[choice.noteStyle]||{}))needed.add(entry.atlas);
  if(isPyoro(choice))for(const asset of art.pyoroBackgrounds)needed.add(asset);
  else needed.add(art.countdown);
}
if(choice.charts?.picospeaker)needed.add('NATIVE_TANKMAN_RUNNER');if(choice.noteTexture&&assets.atlases[choice.noteTexture])needed.add(choice.noteTexture);if(isDefeat(choice))await audio.load('IMPR_edefeat.ogg').catch(()=>null);for(const name of [choice.character==='pico'?'PICO':'BOYFRIEND','BF_FEAR','DADDY_DEAREST','GF_FEAR'])needed.add(name);if((choice.character==='pico'||['nene-tankmen','otis-speaker'].includes(choice.characters?.girlfriend))&&!pixelStage(choice))for(const name of ['ABOT','ABOT_SCREEN','ABOT_VIZ'])needed.add(name);if(week===2||choice.stage?.startsWith('spooky')){if(modern)needed.add('GF_DARK');for(const name of modern?['SPOOKY_DARK','MONSTER','week2-bgDark','week2-bgLight','week2-stairsDark','week2-stairsLight','WEEK2_TREES']:['SPOOKY','MONSTER','HALLOWEEN'])needed.add(name);}else if(!nativeContent.stage(choice)&&!modern)for(const name of ['stageback','stagefront','stagecurtains'])needed.add(name);for(const name of ['GF_EXTENDED','NENE_EXTENDED'])needed.delete(name);if(choice.character!=='pico')needed.delete('PICO');if(isQtRewired(choice))for(const name of qtRequiredArt(choice,nativeContent.data.qt))needed.add(name);if(isSkyRedux(choice)){
  const art=nativeContent.data.redux;
  if(choice.characters?.girlfriend==='redux-gf-redux'&&art.stereo)needed.add(art.stereo);
  for(const name of Object.values(art.notes[choice.noteStyle]||{}))needed.add(name);
  if(choice.reduxSong==='sky'&&choice.variant==='pico')for(const name of Object.values(art.bubbles))needed.add(name);
  if(choice.reduxSong==='manifest')for(const name of nativeContent.required({...choice,stage:'redux-mani-redux-2',
    characters:{...choice.characters,opponent:'redux-modsky-goat'}}))needed.add(name);
}if(isVamp(choice)){const art=nativeContent.data.vamp;for(const id of [art.bat,art.snow,art.stalactite,art.strum,art.note,art.splash,art.blood1,art.blood2,art.blood3,art.blood4,...Object.entries(art.cutscenes).filter(([name])=>name.startsWith(choice.characters.player.replaceAll('-','_')+'_')||cutscenes&&choice.variant==='classic'&&(choice.baseSong==='vamp'?name==='intro':choice.baseSong==='vivacious'&&['bf','gf','vamp'].includes(name))).map(([,clip])=>clip.name),...(choice.baseSong==='vamp'?[]:[nativeContent.character(choice.variant==='pico'?'vamp-death-pico':'vamp-death-bf').atlasName]),...art['vamp-stickers'],...art['vamp-stickers-pico']])needed.add(id);}assets.releaseUnused(needed);await Promise.all([assets.ensure([...needed]),skyPolish.prepare(choice,audio),skyDetails.prepare(choice,audio),nativeContent.prepare(choice),comboFeedback.prepare(),...[...officialRequiredSounds(choice),...qtSounds(choice)].map(name=>audio.load(''+name+'.ogg').catch(()=>null)),nativeExtras.load('characters'),modern&&week!==2&&!nativeContent.stage(choice)?nativeExtras.load('erectStage'):Promise.resolve()]);nativeContent.prepareEffects(choice);impostorScreenEffects.prepare(choice,nativeContent.data.impostor,assets);if(pixelStage(choice))await Promise.all([...pixelUI.sounds(),...(Object.values(nativeContent.data.uiPixelGameover||{}).map(v=>v.lossSound.split('/').at(-1).replace(/\.ogg$/,'')))].map(name=>audio.load(''+name+'.ogg').catch(()=>null)));if(choice.stage?.startsWith('philly')||choice.stage?.startsWith('limo'))await Promise.all(['train_passes','carPass0','carPass1'].map(name=>audio.load(''+name+'.ogg').catch(()=>null)));}
function drawStage(time,script=null){if(nativeContent.stage(game.choice))return drawExpandedStage(time,script);
 const week2=SONGS[songIndex].week===2||/^spookyMansion/.test(game.choice.stage),modern=game.choice.variant==='erect'||game.character==='pico'||game.choice.stage?.endsWith('Erect'),custom=game.modVisuals,beat=game.beat,bpm=bpmAt(game.chart,time),flashAge=time-game.lightningAt;
 const positions=week2?(modern?{dad:[316,614],bf:[967,629],gf:[646,565]}:{dad:[346,637],bf:[831,653],gf:[641,575]}):modern?{dad:[270,629],bf:[973,644],gf:[616,576]}:{dad:[324,609],bf:[1043,639],gf:[688,553]};
 if(SONGS[songIndex].id==='tutorial'||game.choice.opponent==='gf')positions.dad=[...positions.gf];
 const originalStageChars=custom?.stage?.metadata.characters,stageChars=originalStageChars?{opponent:originalStageChars.opponent||originalStageChars.dad,player:originalStageChars.player||originalStageChars.bf,girlfriend:originalStageChars.girlfriend||originalStageChars.gf}:null;for(const role of ['opponent','player','girlfriend'])if(stageChars?.[role]?.position){const p=stageChars[role].position;positions[role==='opponent'?'dad':role==='player'?'bf':'gf']=[180+p[0]*0.72,-20+p[1]*0.72];}
 const bump=(game.eventZoom||1)+(settings.cameraZooms===false?0:game.cameraBump||0);
 let center=[640,360],pan=0;
 if(scene!=='intro'&&!script&&!settings.reducedMotion){
   if(game.hasStageFocus??=game.chart.events?.some(event=>event.e==='FocusCamera')){
     center=nativeChartCamera(game,time,center,([role,x,y])=>{
       if(role==='position')return [180+x*.72,-20+y*.72];
       const position=positions[{opponent:'dad',player:'bf',girlfriend:'gf'}[role]];
       if(!position)return [640+x*.72,360+y*.72];
       const placement=stageChars?.[role];
       if(placement){
         const point=actorCameraPoint(placement.position,placement,nativeContent.character(stageCharacterId(role),role==='player'),1);
         return [180+(point[0]+x)*.72,-20+(point[1]+y)*.72];
       }
       return [640+(position[0]-640)*.28+x*.72,360+(position[1]-550)*.36+y*.72];
     });
   }else{
     const target=game.chartPlayer?18:-18;
     pan=game.cameraX=(game.cameraX||0)+(target-(game.cameraX||0))*.025;
   }
 }
 rect(0,0,1280,720,'#19131b');ctx.save();ctx.translate(640,360);ctx.scale(bump,bump);ctx.translate(-center[0],-center[1]);
 if(custom?.stage)drawModStageProps(ctx,assets,custom.stage,{time,pan});
 else if(week2){if(modern){const light=flashAge>=0&&flashAge<1600?Math.max(0,1-flashAge/1600):0;animation('WEEK2_TREES','bgtrees',180-pan*0.8,2,0.75,time,{fps:5,loop:true});image('week2-bgDark',-390-pan,-200,1838,938);if(light)image('week2-bgLight',-390-pan,-200,1838,938,light);}else animation('HALLOWEEN',flashAge>=0&&flashAge<1250?'Halloween lightning':'Halloween idle',-276-pan,-459,0.8,flashAge>=0&&flashAge<1250?flashAge:time,{fps:24,loop:flashAge<0||flashAge>=1250});}
 else if(modern){nativeExtras.drawErectStage(ctx,time,{pan});}else{image('stageback',-234-pan*0.9,-185,1707,960);image('stagefront',-270-pan*0.9,466,1848,305);}
 if(week2&&modern){
   ctx.save();
   const light=flashAge>=0&&flashAge<1600?1-flashAge/1600:0;
   ctx.filter='brightness('+(.42+light*.58)+')';
 }
 const drawCustom=(role,actor,position)=>skyPolish.drawActor(ctx,game,role,()=>drawSceneCharacter(role,actor,[position[0]-pan,position[1]],time),{time,mobile:mobileActive()});
 if(!drawCustom('girlfriend',null,positions.gf)){if(game.character==='pico'){const scale=0.62,neneX=positions.gf[0]-195.3-pan,neneY=positions.gf[1]-405.5;drawABot(ctx,assets,audio,{neneX,neneY,scale,time});assets.draw(ctx,'NENE',assets.frame('NENE','Nene idle',settings.reducedMotion?0:partnerDanceFrame(beat,bpm)),neneX,neneY,scale);}else if(modern||week2){const atlas=modern?'GF_DARK':'GF_MODERN',prefix=(modern?'GF dark':'GF modern')+(flashAge>=0&&flashAge<550?' scared':' idle');if(flashAge>=0&&flashAge<550)animation(atlas,prefix,positions.gf[0]-698*0.62/2-pan,positions.gf[1]-637*0.62,0.62,flashAge,{loop:false});else assets.draw(ctx,atlas,assets.frame(atlas,prefix,settings.reducedMotion?0:partnerDanceFrame(beat,bpm)),positions.gf[0]-698*0.62/2-pan,positions.gf[1]-637*0.62,0.62);}else{const frames=assets.frames('GF_assets','GF Dancing Beat0'),idx=settings.reducedMotion?0:partnerDanceFrame(beat,bpm);assets.draw(ctx,'GF_assets',frames[idx],472-pan,158,0.62);}}
 if(!drawCustom('opponent',actorDad,positions.dad)){const id=game.choice.opponent||SONGS[songIndex].opponent||'dad',name=id.includes('monster')?'MONSTER':id.includes('spooky')?(modern?'SPOOKY_DARK':'SPOOKY'):'DADDY_DEAREST',s=name==='DADDY_DEAREST'?0.71:0.7,w=name==='MONSTER'?426:name.startsWith('SPOOKY')?492:426,h=name==='MONSTER'?637:name.startsWith('SPOOKY')?549:767;drawActor(name,actorDad,positions.dad[0]-w*s/2-pan,positions.dad[1]-h*s,s,time);}
 skyPolish.drawTutorial(ctx,game,time,[positions.bf[0]-pan,positions.bf[1]],{stageScale:.66,reducedMotion:settings.reducedMotion});
 const tutorialLight=skyPolish.tutorialLighting(game,time,settings.reducedMotion);
 if(tutorialLight<1)rect(0,0,1280,720,'rgba(0,0,0,'+(1-tutorialLight)+')');
 if(!drawCustom('player',actorBF,positions.bf)){const pico=game.character==='pico',s=pico?0.64:0.66;drawActor(pico?'PICO':'BOYFRIEND',actorBF,positions.bf[0]-(pico?500:412)*s/2-pan,positions.bf[1]-(pico?500:412)*s,s,time);}
 if(week2&&modern)ctx.restore();
 if(custom?.stage)drawModStageProps(ctx,assets,custom.stage,{foreground:true,time,pan});else if(week2&&modern){image('week2-stairsDark',754.5-pan,-203.75,862.5,937.5);if(flashAge>=0&&flashAge<1600)image('week2-stairsLight',754.5-pan,-203.75,862.5,937.5,Math.max(0,1-flashAge/1600));}else if(!week2&&modern)nativeExtras.drawErectStage(ctx,time,{pan,foreground:true});else if(!week2&&!modern)image('stagecurtains',-250-pan*1.3,-175,1770,624);
 ctx.restore();if(settings.backgroundDim)rect(0,0,1280,720,`rgba(0,0,0,${settings.backgroundDim})`);
 const project=([x,y])=>[640+(x-pan-center[0])*bump,360+(y-center[1])*bump];
 return {girlfriend:project(positions.gf),player:project(positions.bf),opponent:project(positions.dad),scale:.66*bump};
}

function drawSongFeedback(time,stage){
 const [speakerX,speakerY]=stage.girlfriend||[640,435];
 const anchor=[clamp(speakerX,132,1148),clamp(speakerY-(stage.scale||.7)*165,145,520)];
 comboFeedback.draw(ctx,{time,combo:game.stats.combo,bpm:bpmAt(game.chart,time),pixel:pixelStage(game.choice),botplay:game.botplay,middlescroll:settings.middlescroll,classicCombo:assets.images.combo,anchor,popupMovement:impostorJudgement(game.choice,(time-comboFeedback.popupAt)/1000,settings.reducedMotion)});
 if(!game.rating)return;
 const r=game.rating,age=(frameTime-r.since)/1000;
 const movement=impostorJudgement(game.choice,age,settings.reducedMotion);
 if(age>=.7)return;
 const alpha=clamp((.7-age)*4,0,1),x=anchor[0]+movement[0],baseY=anchor[1]+movement[1],y=baseY-(settings.reducedMotion?0:age*35);
 ctx.save();
 if(pixelStage(game.choice)&&r.name!=='miss'&&pixelUI.rating(ctx,r.name,settings.comboPopup?r.combo:null,y,alpha,x)){
   ctx.restore();
   return;
 }
 ctx.globalAlpha*=alpha;
 if(r.name==='miss')text('MISS',x,y+20,40,'#d271eb','center');
 else {
   const img=assets.images[r.name],scale=.52;
   image(r.name,x-img.width*scale/2,y,img.width*scale,img.height*scale);
   if(settings.comboPopup)text(String(r.combo).padStart(3,'0'),x,y+56,35,'#fff','center');
 }
 ctx.restore();
}

function drawCountdownPrompt(beat){
  if(isKapi(game.choice)){
    if(isPyoro(game.choice)||beat< -4||beat> -1)return;
    const name=nativeContent.data.kapi.countdown;
    const animation={[-4]:'start',[-3]:'step1',[-2]:'step2',[-1]:'step3'}[beat];
    const elapsed=Math.max(0,audio.time()-beat*60000/game.chart.bpm);
    assets.anim(ctx,name,animation,28,-17,.52,elapsed,{loop:false});
    return;
  }
  const impostor=isImpostorWeek(game.choice)?nativeContent.data.impostor.countdown:null;
  const name=impostor?.[{[-3]:'Two',[-2]:'One',[-1]:'Go'}[beat]]||{[-3]:'ready',[-2]:'set',[-1]:'go'}[beat];
  if(!name||(pixelStage(game.choice)&&pixelUI.countdown(ctx,beat)))return;
  const img=assets.images[name];
  image(name,640-img.width*.65/2,360-img.height*.65/2,img.width*.65,img.height*.65);
}

function drawQtGameplay(time,songTime,placement,mobile,presentation){
  const qt=game.qt,art=nativeContent.data.qt;
  const playing=qt.video&&songTime>=qt.video.clip.at&&!qt.video.element.ended&&qt.video.element.readyState>=2;
  if(presentation.blackout)rect(0,0,1280,720,'rgba(0,0,0,'+presentation.blackout+')');
  if(playing)ctx.drawImage(qt.video.element,0,0,1280,720);
  if(qt.studio&&[15,111,175,239].includes(Math.floor(game.beat)))rect(0,0,1280,720,'#000');
  if(qt.blackIn!=null&&time>=qt.blackIn)rect(0,0,1280,720,'#000');
  if(settings.qtSawbladeMode==='disabled')return;
  const warning=qt.warning;
  const age=time-(warning?.at??-Infinity);
  const attack=art.saw['saw anim attack'];
  const last=qt.lastAttack;
  const imminent=last&&time-last.at<attack.frames*1000/attack.fps?last:qt.attacks[qt.attackIndex];
  const clip=warning&&art.warning[warning.label];
  if(!playing&&warning&&age<Math.max(warning.beat,clip?clip.frames*1000/clip.fps:0)){
    if(!warning.attack)rect(0,0,1280,720,'rgba(0,0,0,.26)');
    if(!settings.reducedMotion&&settings.flashingLights!==false){
      if(clip){
        const frame=assets.frame(clip.name,clip.prefix,Math.floor(age*clip.fps/1000)),scale=mobile?.66:.87;
        if(frame)assets.draw(ctx,clip.name,frame,
          640-frame.frameWidth*scale/2,315-frame.frameHeight*scale/2,scale);
      }
    }
  }
  if(!playing&&imminent&&time>=imminent.at-imminent.lead&&time<imminent.at+attack.frames*1000/attack.fps&&placement?.player&&placement?.opponent){
    const clip=art.saw[time<imminent.at?'saw anim alert':'saw anim attack'];
    if(clip){
      const s=placement.scale*.63,[px,py]=placement.player,[dx,dy]=placement.opponent;
      const progress=clamp((time-imminent.at+220)/260,0,1);
      const x=dx+(px-dx)*progress,y=dy+(py-dy)*progress-170;
      const [l,t,r,b]=clip.bounds;
      const clipStart=time<imminent.at?imminent.at-imminent.lead:imminent.at;
      atlasFrame(clip.name,clip.prefix,x-(r-l)*s/2,y-(b-t)*s/2,s,Math.floor((time-clipStart)*clip.fps/1000));
    }
  }
  if(mobile&&scene==='play'&&qt.attacks.length){
    rect(1085,268,180,54,'#140f22cb');
    text('DODGE',1175,282,24,'#fff','center',2);
    newButton('qt-dodge','Dodge the sawblade',1060,245,220,100,
      event=>dodgeQt(game,audio.chartTime(event?.timeStamp),forceStagePose),{tapOnDown:true,exclusive:true});
  }
  const dodgedAge=time-(qt.dodgedAt??-Infinity);
  if(dodgedAge<650&&assets.images[art.dodged]){
    const badge=assets.images[art.dodged],s=.45,x=640-badge.width*s/2;
    image(art.dodged,x,365-dodgedAge*.04,badge.width*s,badge.height*s,clamp((650-dodgedAge)/270,0,1));
  }
}

function drawGameplay(){
 if(!game)return;const time=game.time,mobile=mobileActive(),down=mobile||settings.downscroll,count=laneCount(),y=receptorY(),sign=down?-1:1,speed=0.45*game.chart.speed*settings.scrollSpeed,playerScale=mobile?(count===6?.52:.58):count===6?0.55:0.7;
 const songTime=audio.time(),countdownBeat=Math.floor(songTime/(60000/game.chart.bpm));
 const qtp=qtPresentation(game.qt,game.beat,songTime);
 const impostorVideo=game.impostor?.video;
 if(impostorVideo&&time>=impostorVideo.at&&time<impostorVideo.end&&impostorVideo.element.readyState>=2){
   rect(0,0,1280,720,'#000');
   ctx.drawImage(impostorVideo.element,0,0,1280,720);
   newButton('pause','Pause game',1180,0,100,88,pauseGame);
   return;
 }
 const vampIntro=game.vamp?.video;
 if(vampIntro&&!vampIntro.error&&game.beat<32){
   rect(0,0,1280,720,'#000');
   if(countdownBeat===-1)drawCountdownPrompt(countdownBeat);
   else if(songTime>=0&&vampIntro.readyState>=2)ctx.drawImage(vampIntro,0,0,1280,720);
   newButton('pause','Pause game',1180,0,100,88,pauseGame);
   return;
 }
 ctx.save();extraCameraTransform(ctx,game.extraEvents,time,false,settings.reducedMotion,settings);campaignTwist(ctx,game.impostor,game.beat,settings.reducedMotion);
 const placement=drawStage(time,skyDetails.mobileView(game,time,settings.reducedMotion||settings.cameraZooms===false));
 ctx.restore();
 drawRestOverlay(ctx,assets,nativeContent.data,game,time,{flashing:settings.flashingLights!==false,reducedMotion:settings.reducedMotion});
 drawExtraOverlay(ctx,game.extraEvents,time,{flashing:settings.flashingLights!==false,downscroll:down,lyrics:settings.subtitles!==false&&settings.extraLyrics!==false,vignette:settings.extraVignette!==false});
 if(/^philly(?:Streets|Blazin)/.test(game.choice.stage||'')&&!settings.reducedMotion)drawExpandedRain(ctx,Math.max(0,time),game.choice.baseSong==='blazin'?1.15:.8);
  const kapi=kapiPresentation(game.choice,game.beat,game.chart.bpm),style=customModNoteStyle();
 if(game.bunny?.fadeAt!=null){
   rect(0,0,1280,720,`rgba(0,0,0,${clamp((time-game.bunny.fadeAt)/1500,0,1)})`);
 }
 if(game.impostor?.fadeAt!=null){
   const opacity=clamp((time-game.impostor.fadeAt)/1000,0,1);
   rect(0,0,1280,720,`rgba(0,0,0,${opacity})`);
   if(opacity>=1)return;
 }
 if(game.impostor?.lightFlash&&settings.flashingLights!==false&&!settings.reducedMotion){
   const cue=game.impostor.lightFlash;
   ctx.save();ctx.globalAlpha=clamp(1-(time-cue.at)/cue.duration,0,1);
   ctx.fillStyle=cue.color;ctx.fillRect(0,0,1280,720);ctx.restore();
 }
 if(game.impostor&&settings.flashingLights!==false&&!settings.reducedMotion){
   const opacity=impostorFlash(game.impostor,time);
   if(opacity>0){
     const atlas=nativeContent.data.impostor.reactor,frame=assets.frame(atlas,'idle');
     if(frame){
       const scale=Math.max(1280/frame.width,720/frame.height);
       assets.draw(ctx,atlas,frame,(1280-frame.width*scale)/2,(720-frame.height*scale)/2,scale,opacity);
     }
   }
 }
 if(kapi.blackout)rect(0,0,1280,720,`rgba(0,0,0,${kapi.blackout})`);
 if(kapi.flash&&settings.flashingLights!==false&&!settings.reducedMotion)rect(0,0,1280,720,`rgba(255,238,0,${kapi.flash})`);
 if(game.qt)drawQtGameplay(time,songTime,placement,mobile,qtp);
 if(game.reduxFrame?.flash&&settings.flashingLights!==false&&!settings.reducedMotion)
   rect(0,0,1280,720,'rgba(255,255,255,'+game.reduxFrame.flash+')');
 if(game.reduxFrame?.fade)rect(0,0,1280,720,'rgba(0,0,0,'+game.reduxFrame.fade+')');
 skyDetails.drawForeground(ctx,game,time,settings.reducedMotion||settings.flashingLights===false);
 if(game.skyTutorialMuted)return;
 if(!game.qt?.studio&&!qtp.hideFeedback)drawSongFeedback(time,placement);
 impostorScreenEffects.draw(ctx,game,time,{reducedMotion:settings.reducedMotion});
 const manifestFade=skyPolish.manifestFade(game,time,settings.reducedMotion);
 if(manifestFade)rect(0,0,1280,720,'rgba(0,0,0,'+manifestFade+')');
 const shiftFade=story&&({'wife-forever':336,sky:292,manifest:424}[game.choice.baseSong]);
 if(shiftFade&&game.beat>=shiftFade)rect(0,0,1280,720,'rgba(0,0,0,'+clamp((game.beat-shiftFade)*300/2000,0,1)+')');
 if(game.choice.baseSong==='sky'&&game.choice.variant==='erect'&&game.beat>=224&&game.beat<352){const gradient=ctx.createRadialGradient(640,360,170,640,360,730);gradient.addColorStop(0,'#0000');gradient.addColorStop(1,'#000c');ctx.fillStyle=gradient;ctx.fillRect(0,0,1280,720);}
 const storyFade=rosesFade(SONGS[songIndex].id,{story,variant:game.choice.variant,time});if(storyFade.red&&settings.flashingLights!==false)rect(0,0,1280,720,'rgba(255,27,49,'+storyFade.red+')');ctx.save();
 extraCameraTransform(ctx,game.extraEvents,time,true,settings.reducedMotion,settings);campaignTwist(ctx,game.impostor,game.beat,settings.reducedMotion);
 const nativeHUD=impostorHUD(game,time,settings.reducedMotion);ctx.globalAlpha*=impostorAlpha(game.impostor,'hud',time)*nativeHUD.alpha;
 ctx.translate(640,360+nativeHUD.y);ctx.rotate(nativeHUD.angle);ctx.translate(-640,-360);
 if(game.impostor?.lights==='final')ctx.globalAlpha=0;
 const hudBump=mobile||settings.reducedMotion||settings.cameraZooms===false?0:(game.cameraBump||0)*.65+restZoom(game,time,true);
 if(hudBump){ctx.translate(640,360);ctx.scale(1+hudBump,1+hudBump);ctx.translate(-640,-360);}
 ctx.globalAlpha*=storyFade.hud*(game.hudFadeAt?clamp((frameTime-game.hudFadeAt)/2000,0,1):1);if(pixelStage(game.choice))ctx.imageSmoothingEnabled=false;if(settings.strumlineBackground>0){
    const x=mobile?0:laneX(0,true)-12,w=mobile?1280:laneX(count-1,true)-x+108;
    rect(x,0,w,720,'rgba(0,0,0,'+settings.strumlineBackground+')');
  }else if(settings.middlescroll&&!mobile)rect((1280-count*112)/2,0,count*112,720,'#0003');
 const activeCaption=settings.subtitles!==false&&game.captions?.find(cue=>cue.start<=time/1000&&cue.end>time/1000);
 if(activeCaption)activeCaption.text.forEach((line,i)=>text(line,640,down?124+i*26:590+i*26,22,'#fff','center',2));
 const hiddenOpponent=isBadBunny(game.choice)||kapi.hideOpponent||game.qt?.studio||qtp.hideOpponent||game.choice.baseSong==='blazin'||!mobile&&settings.middlescroll;
 const notePosition=n=>{const scale=mobile&&!n.player?0.2:1,scroll=n.player?(game.eventScrollPlayer??game.eventScroll??1):(game.eventScrollOpponent??game.eventScroll??1),target=mobile&&!n.player?20:y;return target+(n.time-time)*speed*scroll*(mobile&&!n.player?1:sign)*scale;};
 const miniClip=()=>{ctx.beginPath();ctx.rect(0,0,270,130);ctx.clip();};
 // Render the two strumlines separately so the miniature opponent lane has its own clip and speed.
 for(const player of [false,true]){if(!player&&hiddenOpponent)continue;const laneAlpha=impostorAlpha(game.impostor,'notes',time)*(player?(qtp.playerAlpha??(game.qt?.erectKiller?qtp.hud:1)):.7*(qtp.opponentAlpha??qtp.hud??1));ctx.save();if(!player&&mobile)miniClip();else{ctx.beginPath();ctx.rect(0,0,1280,720);ctx.clip();}
  for(let i=game.scanIndex;i<game.notes.length;i++){const n=game.notes[i];if(n.player!==player)continue;const pos=notePosition(n);if(n.time>time+6000)break;if(n.length>0&&!n.holdComplete&&!(n.hit&&time>n.time+n.length)){const scroll=n.player?(game.eventScrollPlayer??game.eventScroll??1):(game.eventScrollOpponent??game.eventScroll??1),target=mobile&&!player?20:y,end=target+(n.time+n.length-time)*speed*scroll*(mobile&&!player?1:sign)*(mobile&&!player?0.2:1),start=n.hit&&!n.holdBroken?target+56:pos+56;if(Math.max(start,end+56)>-100&&Math.min(start,end+56)<820)drawHold(n.lane,laneX(n.lane,player)+56,start,end+56,(n.missed||n.holdBroken?.25:player?.72:.4)*(n.autoSinger?.3:1)*laneAlpha/(player?1:.7),mobile&&!player?0.22:playerScale);}}
  for(let lane=0;lane<count;lane++){const until=(player?laneFlashes:opponentFlashes)[lane],confirm=until>frameTime,press=player&&laneHeld(lane);drawNote(lane,laneX(lane,player),mobile&&!player?20:y,mobile&&!player?0.22:playerScale,confirm?'confirm':press?'press':'static',confirm?145-(until-frameTime):0,laneAlpha);}
  for(let i=game.scanIndex;i<game.notes.length;i++){const n=game.notes[i];if(n.time>time+6000)break;if(n.player!==player||n.hit||n.missed)continue;const pos=notePosition(n);if(pos<-180||pos>850)continue;drawNote(n.lane,laneX(n.lane,player),pos,mobile&&!player?0.22:playerScale,'note',0,laneAlpha*(n.autoSinger?.3:1));}
  ctx.restore();}
 if(game.vamp?.notes.length){
   const art=nativeContent.data.vamp,cx=(laneX(count/2-1,true)+laneX(count/2,true))/2+56,cy=y+56;
   const state=game.vamp,s=.65*(mobile?.76:1),receptor=state.receptor;
   const drawCenter=(name,frame,px,py,scale)=>{
     if(frame)assets.draw(ctx,name,frame,px-(frame.frameWidth||frame.width)*scale/2,py-(frame.frameHeight||frame.height)*scale/2,scale);
   };
   let frame=assets.frame(art.strum,'strum');
   if(receptor){
     const index=Math.floor(Math.max(0,time-receptor.at)*.024);
     const frames=assets.frames(art.strum,receptor.animation);
     if(receptor.animation==='confirm'&&index<frames.length)frame=frames[index];
     if(receptor.animation==='press'&&index<4)frame=frames[Math.min(index,frames.length-1)];
   }
   if(frame){
     // The confirm frames are cut from a larger glow. Center the visible
     // frame instead of applying the offsets meant for its stage origin.
     const centered={...frame,frameX:0,frameY:0};
     assets.draw(ctx,art.strum,centered,cx-frame.width*s/2,cy-frame.height*s/2,s);
   }
   const note=assets.images[art.note];
   if(note){
     const width=note.width*s,height=note.height*s;
     for(let i=state.index;i<state.notes.length;i++){
       const n=state.notes[i],py=cy+(n.time-time)*speed*(game.eventScrollPlayer??game.eventScroll??1)*sign;
       if((down&&py<-height)||(!down&&py>720+height))break;
       if(!n.done&&py>=-height&&py<720+height)image(art.note,cx-width/2,py-height/2,width,height);
     }
   }
   if(!settings.reducedMotion&&settings.noteSplash!==false&&time-state.splash<210)
     drawCenter(art.splash,assets.frame(art.splash,'',Math.floor((time-state.splash)*.024)),cx,cy,s);
   if(mobile)newButton('vamp-middle','Tap the VS. Vamp middle note',cx-47,cy-54,94,112,
     ev=>hitVampMiddle(audio.chartTime(ev?.timeStamp),true),{tapOnDown:true,exclusive:true});
   const bloodAge=time-state.bloodAt;
   if(settings.flashingLights!==false&&bloodAge>=0&&bloodAge<5000){
     const fade=1-bloodAge/5000;
     for(let i=1;i<=Math.min(4,state.bloodPhase+1);i++){
       const img=assets.images[art['blood'+i]];
       if(img)image(art['blood'+i],i%2?0:1280-img.width*.65,i<=2?0:720-img.height*.65,img.width*.65,img.height*.65,fade*.7);
     }
   }
 }
 const splashAtlas=pixelStage(game.choice)?'NATIVE_SPLASH_PIXEL':'NATIVE_SPLASH';
 game.splashes=game.splashes.filter(splash=>{
   const custom=style?.noteSplash;
   if(custom){
     const lane=laneDirection(splash.lane),key=['left','down','up','right'][lane]+'Splashes';
     const animation=custom.data[key]?.[splash.variant-1]||custom.data[key]?.[0];
     const index=Math.floor((frameTime-splash.at)*(custom.data.framerateDefault||24)/1000);
     const frame=animation&&assets.frames(custom.atlas,animation.prefix)[index];
     if(!frame)return false;
     const scale=(custom.scale??.7)*playerScale/.7;
     ctx.save();
     if(custom.isPixel)ctx.imageSmoothingEnabled=false;
     const centerX=laneX(splash.lane,true)+56,centerY=y+56;
     assets.draw(ctx,custom.atlas,frame,centerX-(frame.frameWidth||frame.width)*scale/2,
       centerY-(frame.frameHeight||frame.height)*scale/2,scale,custom.alpha??1);
     ctx.restore();
     return true;
   }
   const color=['purple','blue','green','red'][laneDirection(splash.lane)];
   const prefix=splashAtlas==='NATIVE_SPLASH_PIXEL'?color+splash.variant:'note impact '+splash.variant+(color==='blue'&&splash.variant===1?'  ':' ')+color;
   const frames=assets.frames(splashAtlas,prefix),index=Math.floor((frameTime-splash.at)*.024);
   const frame=frames[index];
   if(!frame)return false;
   const scale=splashAtlas==='NATIVE_SPLASH_PIXEL'?1.85:playerScale*.86;
   assets.draw(ctx,splashAtlas,frame,laneX(splash.lane,true)+56-(frame.frameWidth||frame.width)*scale/2,y+56-(frame.frameHeight||frame.height)*scale/2,scale);
   return true;
 });
 ctx.save();ctx.globalAlpha*=(qtp.hud??1)*(kapi.hud??1)*impostorAlpha(game.impostor,'health',time);
 if(!drawFinaleHealth(ctx,assets,nativeContent.data,game,{down,aspect:viewAspect(),icon})){
 if(game.choice.baseSong!=='victory'&&game.impostor?.comboBreakLimit==null){const healthY=down?32:650;rect(338,healthY,604,22,'#000');rect(343,healthY+5,594,12,'#ff0000');const hp=game.stats.health/2;rect(343+594*(1-hp),healthY+5,594*hp,12,'#66ff33');const boundary=343+594*(1-hp),pulse=settings.reducedMotion?1:1+Math.max(0,1-(game.beat%1)*4)*0.1;icon(game.eventHealthIcon?.opponent||game.choice.opponent||'dad',boundary-90*pulse,healthY-28,0.5*pulse,game.stats.health>1.6,false,game.healthIconOptions?.opponent);icon(game.eventHealthIcon?.player||game.choice.characters?.player||(game.character==='pico'?'pico':'bf'),boundary-10,healthY-28,0.5*pulse,game.stats.health<0.4,true,game.healthIconOptions?.player);}
 else if(game.impostor?.comboBreakLimit!=null)text(`COMBO BREAKS: ${game.stats.misses}/${game.impostor.comboBreakLimit}`,640,down?42:650,24,'#ff3030','center',2);
 }
 const rankLabel=predictedRank(story?combinedStats(game.stats):game.stats,game.forcedResultRank);
 text(mobile?'Score '+game.stats.score+' · Miss '+game.stats.misses+' · '+accuracy(game.stats).toFixed(1)+'% | '+rankLabel:'Score: '+game.stats.score+'  |  Misses: '+game.stats.misses+'  |  Accuracy: '+accuracy(game.stats).toFixed(2)+'%  |  Rank: '+rankLabel,640,down?83:690,mobile?Math.max(19,11*1280/viewportWidth):19,game.choice.baseSong==='victory'?'#3fa9f5':game.choice.baseSong==='finale'?(game.beat*4>=272?'#e02f6e':'#ff0000'):'#fff','center',2);
 const remaining=Math.max(0,Math.ceil((game.duration-audio.time())/(1000*game.modifiers.rate)));text(Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0'),640,down?5:12,18,'#fff','center',2);text(SONGS[songIndex].name+' - '+DIFFICULTIES[difficulty]+' / '+count+'K',15,mobile?695:down?690:14,mobile?14:16,'#ddd','left',2);
 if(game.practice||game.botplay)text(game.botplay?'BOTPLAY':'PRACTICE MODE',640,down?115:172,25,'#fff','center');drawCountdownPrompt(countdownBeat);ctx.restore();
 if(qtp.flash&&settings.flashingLights!==false&&!settings.reducedMotion)rect(0,0,1280,720,'rgba(255,155,246,'+qtp.flash+')');
 if(!mobile)for(let lane=0;lane<count;lane++)newButton('lane-'+lane,laneLabel(lane)+' note ('+keyLabel(playKeys()[lane])+')',laneX(lane,true),180,count===6?88:112,440,()=>{}, {lane});
 newButton('pause','Pause game',1180,0,100,88,pauseGame);text('II',1248,18,27,'#fff','center',2);ctx.restore();
 drawRestOverlay(ctx,assets,nativeContent.data,game,time,{hud:true,flashing:settings.flashingLights!==false,reducedMotion:settings.reducedMotion});
 drawPinkOverlay(ctx,assets,nativeContent.stage(game.choice),game.impostor,time,{beat:game.beat,reducedMotion:settings.reducedMotion,flashing:settings.flashingLights!==false});
 drawExtraOverlay(ctx,game.extraEvents,time,{hud:true,flashing:settings.flashingLights!==false,downscroll:down,lyrics:settings.subtitles!==false&&settings.extraLyrics!==false,vignette:settings.extraVignette!==false});
 const extraCount=game.extraEvents?.countdown;
 if(extraCount&&!extraCount.soundOnly&&settings.extraCountdown!==false){
   const step=extraCount.first+Math.floor((time-extraCount.at)/extraCount.interval);
   if(step>=0&&step<4)drawCountdownPrompt(step-4);
 }
 drawSongCredits(time);
}

function drawPaused(){drawGameplay();buttons=[];rect(0,0,1280,720,'#000b');text(SONGS[songIndex].name,1255,22,32,'#fff','right');text(DIFFICULTIES[difficulty],1255,65,25,'#ddd','right');['resume','restart song','options','exit to menu'].forEach((label,i)=>{const y=145+i*125;letters(label,selected===i?160:110,y,1.04,{alpha:selected===i?1:0.55});newButton('pause-'+i,label,90,y-18,950,105,()=>{selected=i;choosePaused();},{select:i});});footer('UP / DOWN: SELECT      ENTER: CONFIRM      ESC: RESUME');}
function choosePaused(){if(selected===0)resumeGame();if(selected===1)retrySong();if(selected===2)openSettings('paused');if(selected===3)exitSong();}
let nativeCredits={};
function drawSongCredits(time){
  const age=time-game.startTime;
  if(age<0||age>4900)return;
  const choice=game.choice,id=choice.baseSong||SONGS[songIndex].id;
  const credits=nativeCredits[id+':'+(choice.variant||'')]||nativeCredits[id]||{};
  const progress=settings.reducedMotion?1:clamp(Math.min(age/480,(4900-age)/450),0,1);
  const x=1280-390*(1-(1-progress)**3),y=game.choice.baseSong==='blazin'?164:184;
  const values=[(choice.name||SONGS[songIndex].name)+' ('+DIFFICULTIES[difficulty]+')',...(choice.artist||credits.artist?['Artist · '+(choice.artist||credits.artist)]:[]),
    ...(choice.charter||credits.charter?['Charter · '+(choice.charter||credits.charter)]:[])];
  ctx.save();ctx.translate(x,y);ctx.fillStyle='#111c';ctx.fillRect(0,0,390,45+30*(values.length-1));
  ctx.fillStyle='#d470c4';ctx.fillRect(0,0,5,45+30*(values.length-1));
  ctx.font='21px VCR, monospace';ctx.fillStyle='#fff';ctx.textBaseline='top';
  values.forEach((value,index)=>ctx.fillText(value,14,15+30*index,362));ctx.restore();
}

function drawGameOver(){rect(0,0,1280,720,'#000');const elapsed=frameTime-sceneAt,pico=game?.character==='pico',death=deathConfig(),deathTime=death.duration;ctx.save();if(death.character?.animationMap?.firstDeath){nativeContent.drawCharacter(ctx,death.id,null,{x:640,y:620,scale:pixelStage(game.choice)?0.85:0.86,time:elapsed,player:true,globalOffsets:game.choice.baseSong!=='blazin',animation:naughtyAnimation(death.id,(game.retryAt?'deathConfirm':elapsed<deathTime?'firstDeath':'deathLoop')+death.suffix,settings.naughtyness!==false,death.character.animationMap),animationTime:game.retryAt?frameTime-game.retryAt:elapsed<deathTime?elapsed:elapsed-deathTime});}else animation(pico?'PICO':'BOYFRIEND',pico?(elapsed<deathTime?'Pico dies':'Pico Dead Loop'):(elapsed<deathTime?'BF dies':'BF Dead Loop'),pico?425:485,210,0.86,elapsed<deathTime?elapsed:elapsed-deathTime,{loop:elapsed>=deathTime});ctx.restore();const qtCaption=game.qt?.deathCaptions;if(settings.subtitles!==false&&qtCaption){const at=(elapsed-qtCaption.at)/1000;const cue=qtCaption.cues.find(line=>line.start<=at&&line.end>at);cue?.text.forEach((line,i)=>text(line,640,540+i*26,22,'#fff','center',2));}if(elapsed>1100){if(!death.pixel)letters('retry',640,100,1.4,{align:'center'});text('ENTER TO RETRY',640,618,30,'#fff','center');text('ESC TO RETURN',640,669,20,'#999','center');newButton('retry','Retry song',0,0,1280,640,retrySong);newButton('gameover-exit','Return to menu',380,648,520,70,exitSong);}}

function drawResults(){if(nativeResults.started){const targets=nativeResults.draw(ctx,{now:frameTime,volume:settings.volume,hints:true});for(const target of targets)newButton(target.id,target.label,target.x,target.y,target.w,target.h,()=>{if(target.action==='replay')startSong(story?weekStart():songIndex,story);else enter(story?'story':'freeplay',story?0:songIndex);});return;}menuBackground('menuBGBlue');rect(95,40,1090,635,'#000c');letters(story?'week clear':'song clear',640,69,1.05,{align:'center'});text(story?'WEEK '+WEEKS[storyWeek].id+' — '+WEEKS[storyWeek].name:SONGS[songIndex].name.toUpperCase(),640,168,30,'#ffde5e','center');const stats=story?combinedStats():game.stats;const rows=[['SCORE',story?storyTotal:stats.score],['ACCURACY',accuracy(stats).toFixed(2)+'%'],['MAX COMBO',stats.maxCombo],['MISSES',stats.misses],['RANK',rank(stats)]];rows.forEach(([label,value],i)=>{text(label,320,235+i*56,29,'#bbb');text(String(value),960,235+i*56,32,'#fff','right');});text(`SICK ${stats.judgements.sick}    GOOD ${stats.judgements.good}    BAD ${stats.judgements.bad}    SHIT ${stats.judgements.shit}`,640,537,20,'#ddd','center');if(game.practice||game.botplay)text('PRACTICE / AUTOPLAY — SCORE NOT SAVED',640,581,20,'#ffda60','center');text('ENTER: CONTINUE     R: PLAY AGAIN',640,624,25,'#fff','center');newButton('results-continue','Continue to song selection',170,600,625,70,()=>{audio.stopMenu();enter(story?'story':'freeplay',story?0:songIndex);});newButton('results-replay','Play again',840,600,300,70,()=>startSong(story?weekStart():songIndex,story));}
function combinedStats(current){const all=makeStats();all.health=1;all.hits=0;all.misses=0;all.weight=0;all.totalNotes=0;for(const s of current?[...storyStats,current]:storyStats){all.totalNotes+=s.totalNotes||s.hits+s.misses;all.score+=s.score;all.hits+=s.hits;all.misses+=s.misses;all.weight+=s.weight;all.maxCombo=Math.max(all.maxCombo,s.maxCombo);for(const k in all.judgements)all.judgements[k]+=s.judgements[k];}return all;}
function drawLoading(){rect(0,0,1280,720,'#000');letters(errorText?'oops':'loading',640,270,1.4,{align:'center'});text(errorText||`${SONGS[songIndex].name.toUpperCase()}  /  ${DIFFICULTIES[difficulty].toUpperCase()}`,640,420,26,'#fff','center');if(errorText){text('ENTER: RETRY     ESC: BACK',640,500,24,'#ff8dc8','center');newButton('load-retry','Retry loading song',200,450,880,120,()=>startSong(songIndex,story,story));}else text('GETTING THE STAGE READY'+'.'.repeat(Math.floor(frameTime/300)%4),640,483,20,'#888','center');newButton('load-back','Cancel loading',0,650,220,70,back);text('ESC: BACK',24,686,20);}

function navigate(delta){if(scene==='patch-notes'){patchPage=(patchPage+delta+PATCH_NOTES.length)%PATCH_NOTES.length;return;}if(scene==='gallery'){skyGallery.select(delta);return;}if(scene==='story'){do{storyWeek=(storyWeek+delta+WEEKS.length)%WEEKS.length;}while(!campaignUnlocked(WEEKS[storyWeek],storage.get('henryUnlocked',false)));if(!storyDifficulties().includes(difficulty))difficulty=storyDifficulties().includes(1)?1:storyDifficulties()[0]??1;audio.sfx('scrollMenu',0.5);return;}if(scene==='freeplay'){const rows=freeplayRows(),i=rows.findIndex(s=>s.id===fp.selectedId);selectFreeplay(rows[(i+delta+rows.length)%rows.length].id);return;}const length=scene==='menu'?7:scene==='paused'?4:scene==='instrumental'?instrumentalOptions().length:1;selected=(selected+delta+length)%length;if(scene==='menu'&&selected===5&&settings.skyDisableMenus)selected=(selected+delta+length)%length;audio.sfx('scrollMenu',0.5);}
function confirm(){if(scene==='title')beginFromTitle();else if(scene==='menu')openMenuChoice();else if(scene==='story')startSong(weekStart(),true);else if(scene==='freeplay')playFreeplay();else if(scene==='character')chooseCharacter(selected);else if(scene==='instrumental'){fp.instrumental=instrumentalOptions()[selected]||'default';enter('freeplay',songIndex);}else if(scene==='paused')choosePaused();else if(scene==='gameover')retrySong();else if(scene==='results'){audio.stopMenu();enter(story?'story':'freeplay',story?0:songIndex);}else if(scene==='loading'&&errorText)startSong(songIndex,story,story);}
function beginFromTitle(){
  if(settings.autoFullscreen&&!document.fullscreenElement)document.querySelector('#game').requestFullscreen?.().catch(()=>{});
  audio.sfx('confirmMenu');enter('menu');
}
function toggleFullscreen(){
  const action=document.fullscreenElement?document.exitFullscreen?.():document.querySelector('#game').requestFullscreen?.();
  action?.catch(()=>{});
}
function runInput(code,device,event=null){
  const isKey=device==='keyboard',matches=action=>bindingFor(settings,action,code,device);
  const stop=()=>event?.preventDefault();
  if(scene==='settings'){
    if(isKey)preferences.keydown(event);else preferences.gamepad(code,true);
    return;
  }
  if(scene==='henry-select'){
    stop();if(event?.repeat)return;
    if(matches('back'))cancelHenrySelection();
    else if(matches('accept'))selectHenryChoice(['mic','sock','stare'][henrySelection.index]);
    else if(matches('uiLeft')||matches('uiUp')){henrySelection.index=(henrySelection.index+2)%3;henrySelection.selectedAt=frameTime;audio.sfx('scrollMenu',.5);}
    else if(matches('uiRight')||matches('uiDown')){henrySelection.index=(henrySelection.index+1)%3;henrySelection.selectedAt=frameTime;audio.sfx('scrollMenu',.5);}
    return;
  }
  if(scene==='defeat-select'){
    stop();if(event?.repeat)return;
    if(matches('back'))cancelDefeatSelection();
    else if(matches('accept'))confirmDefeatLimit();
    else if(matches('uiLeft'))changeDefeatLimit(1);
    else if(matches('uiRight'))changeDefeatLimit(-1);
    return;
  }
  if(sceneTransitions.blocking||scene==='editor'||scene==='mods'||event?.repeat)return;
  if(event&&/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)){
    if(code==='Escape'){const panel=document.querySelector('#freeplay-search');if(panel)panel.hidden=true;canvas.focus();}
    return;
  }
  if(scene==='freeplay'&&isKey&&event?.ctrlKey&&code==='KeyF'){stop();showSearch();return;}
  if(event?.ctrlKey||event?.metaKey||event?.altKey)return;
  if(scene==='cutscene'||scene==='intro'){
    if(matches('back')||matches('cutsceneAdvance')||matches('accept')){
      stop();const skip=matches('back');
      if(scene==='cutscene')expandedCutscenes.advance(skip);
      else if(skip)storyIntros.skip(performance.now());else storyIntros.advance(performance.now());
    }
    return;
  }
  if(scene==='character'){
    if(isKey)stop();
    const now=performance.now();
    if(matches('back'))characterSelect.cancel(now);
    else if(matches('accept'))characterSelect.confirm(now);
    else if(matches('uiLeft'))characterSelect.move(-1,0,now);
    else if(matches('uiRight'))characterSelect.move(1,0,now);
    else if(matches('uiUp'))characterSelect.move(0,-1,now);
    else if(matches('uiDown'))characterSelect.move(0,1,now);
    return;
  }
  if(isKey&&['menu','freeplay'].includes(scene)&&/^Key[A-Z]$/.test(code)){
    skySecret=(skySecret+code.at(-1)).slice(-3);
    if(skySecret==='SKY'){stop();skySecret='';launchSkySecret();return;}
  }
  if(isKey&&code==='Digit7'&&['play','paused','freeplay','story','results'].includes(scene)){stop();openChartEditor();return;}
  if(matches('fullscreen')){stop();toggleFullscreen();return;}
  if(matches('screenshot')){stop();preferences.captureScreenshot(canvas).catch(()=>{});return;}
  if(matches('debugDisplay')){
    stop();const values=['Off','Simple','Advanced'];settings.debugDisplay=values[(values.indexOf(settings.debugDisplay)+1)%values.length];saveSettings();return;
  }
  if(noteInputActive()&&game?.qt?.attacks.length&&settings.qtSawbladeMode!=='disabled'&&matches('dodge')){
    stop();dodgeQt(game,audio.chartTime(event?.timeStamp),forceStagePose);return;
  }
  if(noteInputActive()&&game?.vamp?.notes.length&&isKey&&code===settings.vampKey){stop();hitVampMiddle(audio.chartTime(event?.timeStamp),true);return;}
  const lane=noteInputActive()?noteLaneFor(settings,code,laneCount(),device):-1;
  if(lane>=0){stop();held.add(isKey?code:'pad'+lane);pressLane(lane,event?.timeStamp);return;}
  if(matches('volumeMute')){stop();settings.volume=settings.volume?0:.7;saveSettings();return;}
  if(matches('volumeUp')||matches('volumeDown')){stop();settings.volume=clamp(settings.volume+(matches('volumeUp')?.1:-.1),0,1);saveSettings();return;}
  if(scene==='play'){
    if(matches('pause')||matches('back')){stop();pauseGame();}
    else if(matches('reset')&&!game.skyTutorialAt){stop();gameOver();}
    return;
  }
  if(scene==='gallery'&&isKey&&code==='Tab'){stop();skyGallery.hideText=!skyGallery.hideText;return;}
  if((scene==='menu'||scene==='freeplay')&&isKey&&code==='KeyM'){stop();openMods();return;}
  if(scene==='freeplay'){
    if(matches('characterSelect')){stop();beginCharacterSelection();return;}
    if(matches('favorite')){stop();toggleFavorite();return;}
    if(matches('jumpTop')||matches('jumpBottom')){stop();const rows=freeplayRows();selectFreeplay(rows[matches('jumpTop')?0:rows.length-1].id);return;}
    if(matches('freeplayLeft')||matches('freeplayRight')){stop();changeDifficulty(matches('freeplayLeft')?-1:1);return;}
    if(isKey&&code==='Digit6'){stop();toggleKeyMode();return;}
    if(isKey&&code==='KeyO'){stop();openSettings('freeplay','modifiers');return;}
    if(isKey&&code==='KeyI'){stop();enter('instrumental',Math.max(0,instrumentalOptions().indexOf(fp.instrumental)));return;}
    if(isKey&&code==='Space'){stop();if(fp.previewing){stopPreview();audio.playMenu();}else previewSong();return;}
  }
  if(scene==='results'&&matches('reset')){stop();startSong(story?weekStart():songIndex,story);return;}
  if(matches('back')){stop();back();return;}
  if(matches('accept')){stop();confirm();return;}
  if(matches('uiUp')||matches('uiDown')){stop();navigate(matches('uiUp')?-1:1);return;}
  if(matches('uiLeft')||matches('uiRight')){
    stop();const delta=matches('uiLeft')?-1:1;
    if(scene==='story'||scene==='freeplay')changeDifficulty(delta);
    else if(['instrumental','patch-notes','gallery'].includes(scene))navigate(delta);
  }
  if(scene==='title')audio.playMenu();
}
document.addEventListener('keydown',event=>runInput(event.code,'keyboard',event));
document.addEventListener('keyup',event=>{if(held.delete(event.code))releaseLane(laneFromCode(event.code),event.timeStamp);});
function gamepadInput(code,pressed){
  if(pressed){runInput(code,'gamepad');return;}
  if(scene!=='play')return;
  const lane=noteLaneFor(settings,code,laneCount(),'gamepad');
  if(lane>=0&&held.delete('pad'+lane))releaseLane(lane);
}
window.addEventListener('blur',()=>{held.clear();if(scene==='play'&&settings.autoPause!==false)pauseGame();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&scene==='play'&&settings.autoPause!==false)pauseGame();});
let gallerySwipe=null;
canvas.addEventListener('pointerdown',event=>{canvas.focus({preventScroll:true});if(scene==='title')audio.playMenu();if(scene==='gallery'){gallerySwipe=event.clientX;canvas.setPointerCapture(event.pointerId);}});
canvas.addEventListener('pointerup',event=>{if(scene==='gallery'&&gallerySwipe!==null&&Math.abs(event.clientX-gallerySwipe)>50)skyGallery.select(Math.sign(gallerySwipe-event.clientX));gallerySwipe=null;});
canvas.addEventListener('pointermove',event=>preferences.trackPointer(canvas,event.clientX,event.clientY));
canvas.addEventListener('pointercancel',()=>gallerySwipe=null);
document.querySelector('#game').addEventListener('wheel',e=>{if(scene==='settings'||scene==='freeplay'){e.preventDefault();if(Math.abs(e.deltaY)>5){const delta=Math.sign(e.deltaY);if(scene==='settings')preferences.wheel(delta);else navigate(delta);}}},{passive:false});
function tick(timestamp){touchControls.update(noteInputActive()&&mobileActive(),laneCount());frameTime=timestamp;const dt=clamp((timestamp-(lastFrame||timestamp))/1000,0,0.1);buttons=[];
  if(scene==='editor'||scene==='mods'){syncButtons();canvas.dataset.scene=scene;lastFrame=timestamp;scheduleFrame();return;}
  if(scene==='play'&&game&&lastFrame&&game.time>1000){game.frameTimes.push(timestamp-lastFrame);if(game.frameTimes.length>180)game.frameTimes.shift();}
  if(game&&Math.floor(timestamp/1000)!==Math.floor(lastFrame/1000)){const times=[...game.frameTimes].sort((a,b)=>a-b);canvas.dataset.frameP95=String(Math.round(times[Math.floor(times.length*0.95)]||0));canvas.dataset.frameMax=String(Math.round(times.at(-1)||0));canvas.dataset.character=game.character;canvas.dataset.level=game.choice.level;canvas.dataset.bpm=String(bpmAt(game.chart,game.time));canvas.dataset.lanes=String(game.laneCount);canvas.dataset.mobile=String(mobileActive());}
  gamepads.poll(gamepadInput);if(scene==='play')updateGame(dt);
  const renderStarted=renderProfiler.begin();
  ctx.setTransform(canvas.width/1280,0,0,canvas.height/720,0,0);ctx.imageSmoothingQuality='high';ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';ctx.clearRect(0,0,1280,720);switch(scene){case'title':drawTitle();break;case'menu':drawMenu();break;case'story':drawStory();break;case'freeplay':drawFreeplay();break;case'character':drawCharacterSelect();break;case'instrumental':drawInstrumental();break;case'album':drawAlbum();break;case'settings':drawSettings();break;case'credits':drawCredits();break;case'loading':drawLoading();break;case'result-loading':rect(0,0,1280,720,'#000');letters('results',640,300,1.4,{align:'center'});break;case'intro':drawStorySequence();break;case'cutscene':drawExpandedSequence();break;case'gallery':drawSkyGallery();break;case'patch-notes':drawPatchNotes();break;case'defeat-select':drawDefeatSelection();break;case'henry-select':drawHenrySelection();break;case'play':drawGameplay();break;case'paused':drawPaused();break;case'gameover':drawGameOver();break;case'results':drawResults();break;}
  renderProfiler.end('render',renderStarted);
  if(renderProfiler.enabled&&Math.floor(timestamp/1000)!==Math.floor(lastFrame/1000))canvas.dataset.renderProfile=JSON.stringify(renderProfiler.snapshot());
  const interval=timestamp-lastFrame||16.67;
  drawDebugDisplay(ctx,settings,{fps:Math.round(1000/Math.max(1,interval)),frameMs:interval,scene,songTime:game?.time});
  sceneTransitions.draw(ctx,timestamp,(name,gain)=>audio.sfx(name,gain));if(sceneTransitions.blocking)buttons=[];if(transition>0){transition=Math.max(0,transition-dt);rect(0,0,1280,720,`rgba(0,0,0,${transition/0.22})`);}syncButtons();if(Math.floor(timestamp/250)!==Math.floor(lastFrame/250)){canvas.dataset.scene=scene;canvas.dataset.song=SONGS[songIndex].id;canvas.dataset.time=String(Math.round(game?.time||0));canvas.dataset.score=String(game?.stats.score||0);canvas.dataset.misses=String(game?.stats.misses||0);canvas.dataset.duration=String(Math.round(game?.duration||0));canvas.dataset.audioState=audio.ctx?.state||'idle';canvas.dataset.preview=fp.previewing?'playing':'idle';canvas.dataset.comboBreakLimit=String(game?.impostor?.comboBreakLimit??'');canvas.dataset.activeStage=game?.impostor?.stage||game?.choice.stage||'';canvas.dataset.resultRank=scene==='results'?(nativeResults.rank||''):'';canvas.dataset.mode=game?.botplay?'autoplay':game?.practice?'practice':'standard';}lastFrame=timestamp;scheduleFrame();
}
async function boot(){const status=document.querySelector('#boot-status'),progress=document.querySelector('#boot-progress'),retry=document.querySelector('#boot-retry');try{retry.hidden=true;await Promise.all([nativeContent.load(),nativeExtras.load('picoCard'),assets.load(n=>{progress.value=Math.round(n*65);}),modernFreeplay.load(n=>{if(n===1)progress.value=100;}),fetch('variant-catalog.json').then(r=>r.json()).then(c=>{variantCatalog=c.variants;baseSongCatalog=c.baseSongs||[];if(!DIFFICULTIES.includes('Erect'))DIFFICULTIES.push('Erect','Nightmare');})]);await Promise.all([expandedContent.load(),expandedCutscenes.load(),loadExpandedMenu(),expandedJSON('song-credits.json').then(data=>nativeCredits=data).catch(()=>{})]);nativeContent.validateQtSongs([...expandedContent.songs.values()].flat());for(const song of expandedContent.entries(builtinSongs))if(!builtinSongs.some(old=>old.id===song.id))builtinSongs.push(song);await modLibrary.init();refreshMods();for(const [atlas,frames] of Object.entries(assets.atlases)){for(const prefix of new Set(frames.filter(f=>f.name).map(f=>f.name.replace(/\d+$/,''))))assets.frames(atlas,prefix);}document.querySelector('#boot').hidden=true;canvas.focus();audio.playMenu();scheduleFrame();if(!renderWatchdog)renderWatchdog=setInterval(()=>{
  const now=performance.now();
  if(!document.hidden&&now-lastAnimationCallback>=80&&now-lastFrame>=14)tick(now);
},16);announce('Friday Night Funkin. Press Enter to begin.');}catch(e){console.error(e);status.textContent='Could not load the game. Serve this folder over HTTP and try again.';retry.hidden=false;retry.onclick=boot;}}
boot();
