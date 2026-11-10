import {SONGS,WEEKS,bpmAt,dancePeriod,DIFFICULTIES,DEFAULT_SETTINGS,HIT_WINDOW,clamp,readJSON,parseChart,beatAt,nearestNote,makeStats,applyHit,applyMiss,accuracy,rank,normalizeSettings} from './core.js';
import {builtinTrackOffsets} from './builtin-audio.js';
import {songIntro,songOutro,pixelStage,rosesFade} from './story-flow.js';
import {ExpandedContent,EXPANDED_BASE,EXPANDED_WEEKS,playerIdentity} from './expanded-content.js';
import {ExpandedCutscenes,expandedIntro,expandedOutro,expandedStageIntro,expandedCaptions,scriptedCamera} from './expanded-cutscenes.js';
import {SkyGallery,expandedImage,expandedJSON,loadExpandedAnimation} from './sky-ui.js';
import {expandedNote,drawExpandedRain} from './expanded-gameplay.js';
import {PATCH_NOTES} from './patch-notes.js';
import {SkyPolish,drawSkyAnimation} from './sky-polish.js';
import {actorCameraPoint,nativeChartCamera} from './stage-camera.js';
import {officialStageLayout,officialPartnerAnchor,drawOfficialStageFX,officialRequiredSounds,canFire,isOfficialCanNote} from './official-polish.js';
import {PreferencesMenu,normalizePreferences,bindingFor,noteLaneFor,GamepadPoller,tankmanDeathQuote,naughtyAnimation,skyDeathSounds,ComboFeedback,drawDebugDisplay} from './preferences.js';
import {Assets} from './assets.js';
import {AudioEngine} from './audio.js';
import {ChartEditor} from './editor.js';
import {installNativeEditor} from './native-editor.js';
import {chartForSixKeys,SIX_DIRECTIONS,partnerDanceFrame,holdProgress} from './rhythm.js';
import {NativeExtras} from './native-extras.js';
import {NativeResults,nativeResultRank,nativeCompletion} from './native-results.js';
import {StoryIntros} from './story-intros.js';
import {PixelUI} from './pixel-ui.js';
import {NativeContent} from './native-content.js';
import {TouchControls} from './touch-controls.js';
import {ModernFreeplay} from './modern-freeplay.js';
import {CharacterSelect} from './character-select.js';
import {SceneTransitions} from './transitions.js';
import {updateChartEvents} from './song-events.js';
import {drawABot} from './abot.js';
import {ModLibrary,ModManager} from './mods.js';
import {drawModCharacter,drawModStageProps} from './mod-visuals.js';

const canvas=document.querySelector('#screen'),ctx=canvas.getContext('2d',{alpha:false});
const buttonLayer=document.querySelector('#buttons'),announcement=document.querySelector('#announcement');
const storage={get(k,f){try{return JSON.parse(localStorage.getItem('fnf-week1:'+k))??f;}catch{return f;}},set(k,v){try{localStorage.setItem('fnf-week1:'+k,JSON.stringify(v));}catch{}}};
const savedSettings=storage.get('settings',{});
const settings=normalizePreferences(savedSettings,normalizeSettings(savedSettings));
if(!storage.get('settings',null)&&matchMedia('(prefers-reduced-motion: reduce)').matches)settings.reducedMotion=true;
const assets=new Assets(),audio=new AudioEngine(settings),chartCache=new Map(),comboFeedback=new ComboFeedback(settings,audio);
let chartEditor=null;
const nativeContent=new NativeContent(assets,audio),nativeExtras=new NativeExtras(),nativeResults=new NativeResults();
const storyIntros=new StoryIntros(),skyPolish=new SkyPolish();let introWaiter=null,introAnnouncement='';
const pixelUI=new PixelUI(assets,audio,()=>nativeContent.data);
const modernFreeplay=new ModernFreeplay(),characterSelect=new CharacterSelect(),sceneTransitions=new SceneTransitions(),modLibrary=new ModLibrary();
installNativeEditor(ChartEditor,{loadRaw:(index,diff)=>rawChoice(songChoice(index,diff)),onDifficulty:value=>difficulty=value,characterChoices:()=>['bf','pico-playable','dad','gf','spooky','monster','pico','mom-car','bf-car','gf-car',...Object.keys(nativeContent.data.characterIds||{}),...modLibrary.records.flatMap(r=>r.items.flatMap(i=>Object.values(i.metadata.playData?.characters||{}).filter(v=>typeof v==='string')))],stageChoices:()=>['mainStage','mainStageErect','spookyMansion','spookyMansionErect','phillyTrain','phillyTrainErect','limoRide','limoRideErect',...Object.keys(nativeContent.data.stages),...modLibrary.songs().map(s=>s.stage)]});
modernFreeplay.backingCard=nativeExtras;
const expandedContent=new ExpandedContent(),expandedCutscenes=new ExpandedCutscenes(),skyGallery=new SkyGallery();
let patchPage=0,settingsReturn='menu',pendingRankReveal=null,rankReveal=null;
let skyMenu=null,skySelectLoad=null,skyDJLoad=null,skySecret='';
async function loadExpandedMenu(){
  const menu=await expandedJSON('menu.json');skyMenu=menu.sky;nativeResults.sky=skyMenu;
  const storyImages=[];
  for(const week of EXPANDED_WEEKS){Object.assign(week,menu.weeks[week.id]);storyImages.push(week.storyProp,week.titleImage,week.storyPlayer,week.storyPartner);}
  modernFreeplay.characterIcons={};
  for(const [id,{name,atlas}] of Object.entries(menu.icons)){modernFreeplay.characterIcons[id]=name;modernFreeplay.atlases[name]=atlas;}
  await assets.ensure([...storyImages,...Object.values(modernFreeplay.characterIcons)]);
  for(const name of storyImages.filter(Boolean))assets.lazyNames.delete(name);
  for(const name of Object.values(modernFreeplay.characterIcons)){modernFreeplay.images[name]=assets.images[name];assets.lazyNames.delete(name);}
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
function launchSkySecret(){const index=SONGS.findIndex(song=>song.id==='sky-lyrics');if(index<0)return;audio.sfx('confirmMenu');difficulty=2;startSong(index,false,false,null,{character:'bf'});}
async function runExpandedSequence(id){
  const generation=loadGeneration,current=game;
  if(settings.naughtyness===false&&['stressCutscene','stressPicoCutscene'].includes(id))id+='-censored';
  const result=expandedCutscenes.begin(id,{volume:settings.volume,misses:game.stats.misses,extraArt:skyMenu.cutsceneExtras,naughtyness:settings.naughtyness!==false,subtitles:settings.subtitles!==false,sfx:(name,gain)=>audio.sfx(name,gain)});
  if(!result)return true;
  enter('cutscene');announce('Cutscene. Press Enter or Escape to skip.');
  const completed=await result;
  if(!completed||generation!==loadGeneration||current!==game)return false;
  if(id==='sky-pico-stage'&&completed.alternate&&completed.art.sky)game.skyPicoOutcome={art:completed.art.sky,naughtyness:completed.naughtyness};
  if(id==='stress-sky-stage'&&completed.art.sniper)game.stressSniper=completed.art.sniper;
  return true;
}
function drawExpandedSequence(){
  const offset=game.completed?game.time:0;
  const subtitles=expandedCutscenes.draw(ctx,frameTime,{stage:(elapsed,view)=>{game.beat=beatAt(game.chart,elapsed);return drawStage(offset+elapsed,{...view,elapsed,cutsceneId:expandedCutscenes.current?.id});},
    pose:(at,role,name,duration=950)=>{const actor=role==='player'?actorBF:role==='opponent'?actorDad:actorGF;actor.forced={name,since:offset+at,until:offset+at+duration,lock:true};}});
  canvas.dataset.dialogue=subtitles;
  newButton('cutscene-next','Continue or skip cutscene',0,0,1280,720,()=>expandedCutscenes.advance(false));
}

WEEKS.push(...EXPANDED_WEEKS);
function songCaptions(choice){
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
function refreshMods(){SONGS.splice(0,SONGS.length,...builtinSongs,...modLibrary.songs());for(const song of SONGS)for(const level of song.mod?song.difficulties:[])if(!DIFFICULTIES.some(d=>d.toLowerCase()===level))DIFFICULTIES.push(level[0].toUpperCase()+level.slice(1));songIndex=Math.min(songIndex,SONGS.length-1);chartCache.clear();}
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
function viewAspect(){return viewportAspect;}
function mobileActive(){return settings.touchLayout==='on'||settings.touchLayout!=='off'&&(matchMedia('(pointer: coarse)').matches||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));}
function laneCount(){return game&&['play','paused','results','gameover'].includes(scene)?game.laneCount:settings.keyMode;}
function laneDirection(lane){return laneCount()===6?SIX_DIRECTIONS[lane]:lane;}
function playKeys(){return laneCount()===6?settings.keys6:settings.keys;}
function laneLabel(lane){return DIRECTIONS[laneDirection(lane)]+(laneCount()===6?' '+(lane+1):'');}
const touchControls=new TouchControls(document.querySelector('#game'),{active:()=>scene==='play'&&mobileActive(),lanes:laneCount,onPress:lane=>{held.add('touch'+lane);pressLane(lane);},onRelease:lane=>{held.delete('touch'+lane);releaseLane(lane);}});
function toggleKeyMode(){settings.keyMode=settings.keyMode===6?4:6;saveSettings();stopPreview();announce(settings.keyMode+' key mode');}
function songChoice(index=songIndex,diff=difficulty,character=fp.character,instrumental=fp.instrumental){
 const song=SONGS[index],level=DIFFICULTIES[diff]?.toLowerCase()||'normal';if(song.mod)return modLibrary.choice(song,level,instrumental);
 const expanded=expandedContent.choice(song.id,character,level,instrumental);
 if(expanded&&(song.source||expandedContent.levels(song.id,character).length))return expanded;
 const kind=character==='pico'?'pico':diff>=3?'erect':null,variant=variantCatalog.find(v=>v.baseSong===song.id&&v.variant===kind),base=baseSongCatalog.find(v=>v.id===song.id),common={opponent:song.opponent||'dad',stage:song.stage||'mainStage',week:song.week??1,noteStyle:base?.playData?.noteStyle,characters:base?.characters||{player:'bf',opponent:song.opponent||'dad',girlfriend:'gf'}};
 if(variant&&variant.charts[level])return {...common,...variant,character,level,chartUrl:''+variant.charts[level],rawData:variant.chartData?.[level],audioUrls:[''+variant.instrumental,''+variant.voices]};
 const suffix=['-easy','','-hard'][Math.min(diff,2)],alternate=instrumental==='pico'?variantCatalog.find(v=>v.baseSong===song.id&&v.variant==='pico'):null;
 return {...common,id:song.id,name:song.name,bpm:song.bpm,character:'bf',level,chartUrl:`${song.id}${suffix}.json`,rawData:base?.chartData?.[level],audioUrls:[alternate?''+alternate.instrumental:`${song.file}_Inst.ogg`,`${song.file}_Voices.ogg`],audioOffsets:builtinTrackOffsets(base,alternate?'pico':null),previewStart:base?.previewStart||12000,previewEnd:base?.previewEnd||36000,album:base?.album||(song.week===2?'volume2':'volume1')};
}

async function rawChoice(choice){if(choice.mod)return modLibrary.chart(choice);if(choice.rawData)return structuredClone(choice.rawData);const response=await fetch(choice.chartUrl);if(!response.ok)throw new Error('The song chart could not be loaded.');return readJSON(await response.text());}
async function loadChoiceTracks(choice){
  await audio.unlock();
  const sources=choice.mod?await modLibrary.audioSources(choice):{urls:choice.audioUrls,offsets:choice.audioOffsets||choice.audioUrls.map(()=>0)};
  const buffers=await Promise.all(sources.urls.map(url=>audio.load(url)));
  audio.trimSongs(sources.urls);
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
let scene='title',sceneAt=performance.now(),selected=0,difficulty=1,songIndex=0,story=false,storyTotal=0,storyStats=[],game=null;
let pendingAnimationFrame=null,renderWatchdog=null,fallbackUntil=0;
function scheduleFrame(){if(pendingAnimationFrame===null)pendingAnimationFrame=requestAnimationFrame(t=>{pendingAnimationFrame=null;tick(t);});}
let buttons=[],buttonSignature='',frameTime=0,lastFrame=0,flash=0,transition=0,errorText='',loadGeneration=0;
const buttonNodes=new Map(),buttonData=new Map();
let held=new Set(),laneFlashes=[0,0,0,0,0,0],opponentFlashes=[0,0,0,0,0,0],pointerLanes=new Map(),lastPointer=null;
let actorBF={direction:'idle',since:0,until:0},actorDad={direction:'idle',since:0,until:0},actorGF={direction:'idle',since:0,until:0};
let lastCountdown=-99;
function announce(text){announcement.textContent=text;}
function saveSettings(){storage.set('settings',settings);audio.updateVolume();}
const SAVE_PREFIX='fnf-week1:';
const SAVE_FIELDS=/^(settings|favorites|character|(?:score6?|week):[^\u0000-\u001f]{1,200})$/;
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
      for(const [key,value] of entries)storage.set(key,value);
      const next=storage.get('settings',{});resetPreferences(next&&typeof next==='object'?next:{});
      refreshSavedMenuState();announce('Save data imported.');
    }catch(error){announce(error.message);}
  },{once:true});
  input.click();
}
const preferences=new PreferencesMenu({
  settings,assets,save:saveSettings,announce,sfx:(name,gain)=>audio.sfx(name,gain),
  onExit:paused=>{saveSettings();settingsReturn='menu';enter(paused?'paused':'menu',paused?2:3);},
  onLagChange:(active,paused)=>{if(active)audio.stopMenu();else if(!paused)audio.playMenu();},
  exportSave:exportLocalSave,importSave:importLocalSave,
  clearSave:()=>{for(const key of localSaveKeys())localStorage.removeItem(key);resetPreferences();refreshSavedMenuState();announce('Save data cleared.');},
  resetSettings:()=>{resetPreferences();announce('Default settings restored.');},
  capabilities:{rewiredHazards:false,screenshots:true},
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
      el.addEventListener('click',e=>{const current=buttonData.get(b.id);if(!current||current.lane!==undefined)return;e.preventDefault();audio.unlock().catch(()=>{});current.action();canvas.focus({preventScroll:true});});
      el.addEventListener('focus',()=>{const current=buttonData.get(b.id);if(current?.select!==undefined&&selected!==current.select){selected=current.select;audio.sfx('scrollMenu',0.5);}});
      el.addEventListener('pointerdown',e=>{const current=buttonData.get(b.id);if(current?.lane===undefined)return;e.preventDefault();el.setPointerCapture(e.pointerId);pointerLanes.set(e.pointerId,current.lane);held.add('touch'+current.lane);pressLane(current.lane);});
      const release=e=>{const lane=pointerLanes.get(e.pointerId);if(lane!==undefined){pointerLanes.delete(e.pointerId);if(![...pointerLanes.values()].includes(lane)){held.delete('touch'+lane);releaseLane(lane);}}};el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);
      buttonNodes.set(b.id,el);buttonLayer.append(el);
    }
    if(el.getAttribute('aria-label')!==b.label)el.setAttribute('aria-label',b.label);const layout=`left:${b.x/12.8}%;top:${b.y/7.2}%;width:${b.w/12.8}%;height:${b.h/7.2}%;`;if(el.dataset.layout!==layout){el.style.cssText=layout;el.dataset.layout=layout;}
  }
}
function enter(next,index=0){if(scene==='cutscene'&&next!=='cutscene')expandedCutscenes.stop(false);if(scene==='gallery'&&next!=='gallery')skyGallery.stop();if(scene==='intro'&&next!=='intro'){storyIntros.stop();if(introWaiter){introWaiter.resolve(false);introWaiter=null;}}if(scene==='results'&&next!=='results')nativeResults.stop();sceneTransitions.begin(canvas,scene,next,{reducedMotion:settings.reducedMotion});if(scene==='freeplay'&&next!=='freeplay'){stopPreview();finishRankReveal(false);}scene=next;sceneAt=performance.now();selected=index;transition=0;buttonSignature='';held.clear();pointerLanes.clear();touchControls.clear();if(next==='freeplay'){songIndex=SONGS[index]?index:songIndex;const list=freeplaySongs();if(!list.includes(SONGS[songIndex])&&list.length)songIndex=SONGS.indexOf(list[0]);fp.selectedId=list.includes(SONGS[songIndex])?SONGS[songIndex].id:'random';if(fp.character==='sky')loadSkyDJ();normalizeDifficulty();const pending=pendingRankReveal;pendingRankReveal=null;
if(pending&&pending.song===fp.selectedId&&pending.character===fp.character&&pending.level===difficulty)rankReveal={...pending,at:sceneAt,cue:0};
else fp.previewTimer=setTimeout(schedulePreview,0);}if(next==='story'&&!storyDifficulties().includes(difficulty))difficulty=1;if(!(settingsReturn==='paused'&&next==='settings')&&!['play','loading','gameover','paused','results','result-loading','editor','mods','character','intro','cutscene','gallery'].includes(next))audio.playMenu();announce(next==='menu'?'Main menu. Story mode, Freeplay, Donate and credits, Options.':next==='freeplay'?`Freeplay. ${SONGS[songIndex].name}. ${DIFFICULTIES[difficulty]}.`:next==='story'?`Story mode. Week ${WEEKS[storyWeek].id}: ${WEEKS[storyWeek].name}. ${DIFFICULTIES[difficulty]}.`:next==='settings'?'Options. Use up and down to select, left and right to change.':next==='controls'?'Key bindings. Select a direction and press Enter to change its key.':next);}
function back(){if(scene==='cutscene'){expandedCutscenes.advance(true);return;}if(scene==='gallery'||scene==='patch-notes'){enter('menu',scene==='patch-notes'?6:5);return;}if(scene==='intro'){storyIntros.skip(performance.now());return;}audio.sfx('cancelMenu');if(scene==='character'){characterSelect.cancel(performance.now());return;}if(scene==='album'||scene==='instrumental'){enter('freeplay',songIndex);return;}if(scene==='play'){pauseGame();return;}if(scene==='paused'){resumeGame();return;}if(scene==='gameover'){exitSong();return;}if(scene==='results'){enter(story?'story':'freeplay',story?0:songIndex);return;}if(scene==='settings'){preferences.back();return;}if(scene==='credits'){enter('menu',2);return;}if(scene==='loading'){loadGeneration++;audio.stop();enter(story?'story':'freeplay');return;}if(scene==='menu'){enter('title');return;}if(scene==='title')return;enter('menu',scene==='freeplay'?1:0);}
function menuBackground(name='menuBG',tint=null){const img=assets.images[name];const scale=Math.max(1280/img.width,720/img.height)*1.1;image(name,(1280-img.width*scale)/2,(720-img.height*scale)/2,img.width*scale,img.height*scale);if(tint){ctx.save();ctx.globalCompositeOperation='multiply';rect(0,0,1280,720,tint);ctx.restore();}}
function footer(hint='ARROWS: SELECT    ENTER: CONFIRM    ESC: BACK'){text(hint,22,688,19,'#fff','left',2);newButton('back','Back',0,665,140,55,back);}
function difficultyControl(x,y){const name=DIFFICULTIES[difficulty].toUpperCase();atlasFrame('campaign_menu_UI_assets','arrow left',x,y+2,0.65);const f=assets.frame('campaign_menu_UI_assets',name);if(f)atlasFrame('campaign_menu_UI_assets',name,x+52+(190-f.width*0.7)/2,y,0.7);atlasFrame('campaign_menu_UI_assets','arrow right',x+254,y+2,0.65);newButton('difficulty-left','Previous difficulty',x-12,y-12,62,72,()=>changeDifficulty(-1));newButton('difficulty-right','Next difficulty',x+240,y-12,70,72,()=>changeDifficulty(1));}
function changeDifficulty(delta){if(scene==='freeplay')finishRankReveal(false);const list=scene==='freeplay'?availableDifficulties():storyDifficulties();if(!list.length)return;difficulty=list[(Math.max(0,list.indexOf(difficulty))+delta+list.length)%list.length];audio.sfx('scrollMenu',0.6);if(scene==='freeplay')schedulePreview();announce(DIFFICULTIES[difficulty]);}

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
  if(skyMenu&&!settings.skyDisableMenus){text('SKY GALLERY',1248,603,24,selected===5?'#fff':'#fbb4f6','right');newButton('main-5','Sky Reborn gallery',965,571,305,70,()=>{selected=5;openSkyGallery();},{select:5});}
  text('PATCH NOTES',1248,642,24,selected===6?'#fff':'#fbb4f6','right');
  newButton('main-6','Patch notes',1010,624,265,54,()=>{selected=6;openMenuChoice();},{select:6});
  text('WEEKS 1–7 / WEEKEND 1 / SKY REBORN',12,692,16);text('ARROWS + ENTER',1260,692,16,'#fff','right');
}
function drawStory(){const week=WEEKS[storyWeek];
 rect(0,0,1280,720,'#000');rect(0,58,1280,378,week.color||'#f9cf51');text('WEEK SCORE: '+storage.get('week:'+week.id+':'+difficulty,0),16,16,28);text(week.name,1260,16,30,'#aaa','right');
 const beat=(audio.menu?.currentTime||0)*102/60,phase=(beat%1)*588;
 if(week.storyProp)animation(week.storyProp,week.storyPrefix||'idle',110,92,0.82,settings.reducedMotion?0:phase,{loop:false});else if(week.id===5)animation('W56_storyparents','idle',100,70,0.9,settings.reducedMotion?0:phase,{loop:false});else if(week.id===6)animation('W56_storysenpai','idle',160,100,1,settings.reducedMotion?0:phase,{loop:false});else if(week.id===3)animation('STORY_PICO','idle',160,100,1,settings.reducedMotion?0:phase,{loop:false});else if(week.id===4)animation('STORY_MOM','idle',160,75,0.77,settings.reducedMotion?0:phase,{loop:false});else if(week.id===0)animation('campaign_menu_UI_characters','GF Dancing Beat WHITE',160,100,0.48,settings.reducedMotion?0:phase,{loop:false});else if(week.id===2)animation('STORY_SPOOKY','Story Spooky idle',150,90,1,settings.reducedMotion?0:phase,{loop:false});else animation('campaign_menu_UI_characters','Dad idle dance BLACK LINE',150,74,0.46,settings.reducedMotion?0:phase,{loop:false});
 if(week.storyPlayer)animation(week.storyPlayer,'idle',588,155,0.92,phase,{loop:false});else animation('campaign_menu_UI_characters','BF idle dance white',596,210,0.48,settings.reducedMotion?0:phase,{loop:false});const gf=assets.frames('campaign_menu_UI_characters','GF Dancing Beat WHITE');if(week.storyPartner)animation(week.storyPartner,'idle',928,68,0.9,phase+(Math.floor(beat)%2)*600,{loop:false});else if(week.id!==0)assets.draw(ctx,'campaign_menu_UI_characters',gf[(Math.floor(beat)%2?15:0)+Math.min(14,Math.floor(phase/1000*24))],930,110,0.48);
 if(week.titleImage)image(week.titleImage,196,458,265,94);else if(week.id===0||typeof week.id==='string')letters(week.id===0?'tutorial':week.id==='weekend1'?'weekend 1':'sky reborn',325,473,0.6,{align:'center'});else{letters('week',295,473,0.85,{align:'center'});text(String(week.id),420,474,53);}newButton('story-week','Play Week '+week.id+': '+week.name,90,448,580,115,()=>startSong(weekStart(),true));
 const trackTop=week.songs.length>3?551:573;text('TRACKS',325,trackTop,27,'#e557a3','center');week.songs.forEach((id,i)=>text(SONGS.find(s=>s.id===id).name.toUpperCase(),325,trackTop+32+i*22,23,'#e557a3','center',0));difficultyControl(850,494);
 newButton('week-prev','Previous week',0,440,90,120,()=>navigate(-1));newButton('week-next','Next week',675,440,90,120,()=>navigate(1));text('<',38,486,36);text('>',707,486,36);text('ENTER TO PLAY',996,578,23,'#aaa','center');newButton('story-play','Start Week '+week.id,810,567,375,70,()=>startSong(weekStart(),true));footer('UP / DOWN: WEEK    LEFT / RIGHT: DIFFICULTY    ENTER: START');
}

function openSettings(from='menu'){settingsReturn=from;enter('settings');preferences.open({paused:from==='paused'});}
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
  const songs=freeplaySongs().map(s=>{const choice=songChoice(SONGS.indexOf(s));return {...s,bpm:choice.bpm||s.bpm,opponent:choice.opponent||s.opponent};}),records=Object.fromEntries(SONGS.map((s,i)=>[s.id,bestFor(i)]));loadSkyAlbum(songChoice().album);const targets=modernFreeplay.draw(ctx,{rankReveal:updateRankReveal(),time:characterOpening?frameTime-characterExitAt:frameTime-sceneAt,djAnimation:characterOpening?'characterSelect':'idle',selectedSong:fp.selectedId,difficulty,difficultyLabel:DIFFICULTIES[difficulty],records,favorites:fp.favorites,filter:fp.filter,search:fp.search,sort:fp.sort,songs,previewing:fp.previewing,reducedMotion:settings.reducedMotion,character:fp.character,album:songChoice().album});
  for(const target of targets)newButton(target.id,target.label,target.x,target.y,target.w,target.h,()=>freeplayAction(target.action,target.value));
  text(settings.keyMode+'K [6]',530,686,16,'#fff','left',0);newButton('fp-mode','Switch 4K / 6K mode',510,670,145,48,toggleKeyMode);text('TAB: CHARACTER',180,686,16,'#fff','left',0);newButton('fp-mods','Import and manage mods',390,670,120,48,openMods);text('M: MODS',392,686,16,'#fff','left',0);newButton('fp-character',`Choose character, current ${({bf:'Boyfriend',pico:'Pico',sky:'Sky'}[fp.character])}`,155,670,225,48,beginCharacterSelection);newButton('fp-instrumental',`Instrumental: ${fp.instrumental}`,15,165,310,50,()=>enter('instrumental'));
  text(`I: INST ${fp.instrumental.toUpperCase()}`,18,181,17,'#111','left',0);
}
function freeplaySongs(){let list=SONGS.filter(s=>{if(s.hidden||!availableDifficulties(SONGS.indexOf(s)).length)return false;if(fp.search&&!s.name.toLowerCase().includes(fp.search.toLowerCase()))return false;if(fp.filter==='favorites')return fp.favorites.has(s.id);if(fp.filter==='numbers')return /^\d/.test(s.name);if(fp.filter==='all')return true;const [a,z]=fp.filter.split('-');const first=s.name[0].toLowerCase();return first>=a&&first<=z;});if(fp.sort==='title')list.sort((a,b)=>a.name.localeCompare(b.name));if(fp.sort==='bpm')list.sort((a,b)=>a.bpm-b.bpm);if(fp.sort==='score')list.sort((a,b)=>(bestFor(SONGS.indexOf(b))?.score||0)-(bestFor(SONGS.indexOf(a))?.score||0));return list;}
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
function playFreeplay(){if(rankReveal){finishRankReveal();return;}const songs=freeplaySongs();if(!songs.length){announce('No songs match this filter.');return;}let index=fp.selectedId==='random'?SONGS.indexOf(songs[Math.floor(Math.random()*songs.length)]):SONGS.findIndex(s=>s.id===fp.selectedId);if(index<0)index=SONGS.indexOf(songs[0]);stopPreview();startSong(index,false);}
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
function drawSettings(){for(const button of preferences.draw(ctx,frameTime))newButton(button.id,button.label,button.x,button.y,button.w,button.h,button.action);}
function drawCredits(){menuBackground('menuBGMagenta');rect(60,30,1160,652,'#000b');letters('friday night funkin',640,60,0.88,{align:'center'});text('THE ORIGINAL CREW',640,180,28,'#ff79b9','center');[['ninjamuffin99','Programming'],['PhantomArcade + evilsk8r','Art + animation'],['Kawai Sprite','Music']].forEach(([name,job],i)=>{text(name,640,238+i*78,32,'#fff','center');text(job,640,274+i*78,21,'#aaa','center');});text('Independent browser recreation — Tutorial and Weeks 1–6.',640,505,21,'#fff','center');text('Original art, music and charts credited to their creators.',640,539,21,'#bbb','center');text('SUPPORT THE ORIGINAL GAME',640,593,29,'#ffdc60','center');newButton('support','Support the original game on itch.io',330,575,620,68,()=>window.open('https://ninja-muffin24.itch.io/funkin','_blank','noopener,noreferrer'));footer();}

async function getChart(index,diff,character=fp.character){const choice=songChoice(index,diff,character),key=choice.chartUrl;if(!chartCache.has(key))chartCache.set(key,rawChoice(choice).then(parseChart));return chartCache.get(key);}
async function startSong(index,isStory=false,continueStory=false,override=null,entry={}){
  const generation=++loadGeneration;pendingRankReveal=null;songIndex=index;story=isStory;const character=isStory?storyCharacter():entry.character||fp.character;normalizeDifficulty(index,character);if(!continueStory){storyTotal=0;storyStats=[];}audio.stop();audio.stopMenu();enter('loading');errorText='';announce(`Loading ${SONGS[index].name}. ${DIFFICULTIES[difficulty]}.`);
  try{await audio.unlock();let choice=songChoice(index,difficulty,character,isStory?'default':fp.instrumental);if(override?.raw){const raw=override.raw.song;choice={...choice,character:playerIdentity(raw.player1||choice.character),opponent:raw.player2||choice.opponent,stage:raw.stage||choice.stage,characters:{...choice.characters,player:raw.player1||choice.characters?.player,opponent:raw.player2||choice.characters?.opponent,girlfriend:raw.gfVersion??raw.player3??choice.characters?.girlfriend}};choice.visualOverrides={characters:choice.characters,stage:choice.stage};choice.noteTexture=raw.noteTexture;}let [chart,originalDuration,modVisuals]=await Promise.all([override?Promise.resolve(parseChart(override.raw)):getChart(index,difficulty,character),prepareChoice(choice),choice.mod?modLibrary.getVisuals(choice,assets):Promise.resolve(null),audio.warmEffects(),prepareSceneAssets(choice)]);if(generation!==loadGeneration)return;
    if(override?.audio){for(const i of [0,1])if(override.audio[i])audio.buffers[i]=override.audio[i];if(override.audio[1])audio.buffers.length=2;}audio.allowVoices=override?.raw?.song?.needsVoices!==false;const extraOffset=Number(override?.raw?.song?.offset)||0;if(extraOffset)audio.trackOffsets=audio.trackOffsets.map(offset=>offset+extraOffset);const duration=originalDuration+extraOffset;
    if(settings.keyMode===6)chart=chartForSixKeys(chart);comboFeedback.reset();const notes=chart.notes.map(n=>({...n,hit:false,missed:false,holdDone:0,holdBroken:false,started:false}));game={chart,notes,duration,modVisuals,speakerIndex:0,laneCount:chart.laneCount||4,eventIndex:0,eventFocus:null,eventZoom:1,eventScroll:1,eventBop:{},lastLightning:-30,lightningAt:-99999,lightningDelay:8,stats:{...makeStats(),totalNotes:notes.filter(n=>n.player).length},opponentIndex:0,scanIndex:0,startTime:-60000/chart.bpm*5,time:-60000/chart.bpm*5,beat:-6,lastBeat:-6,rating:null,particles:[],completed:false,chartPlayer:chart.sections[0]?.player||false,practice:settings.practice,botplay:settings.botplay,custom:!!override,override,choice,character:choice.character,frameTimes:[]};
    const captionFile=songCaptions(choice);
    if(captionFile){const current=game;expandedCaptions(captionFile).then(cues=>{if(game===current)game.captions=cues;}).catch(()=>{});}
    if(choice.charts?.picospeaker){
      const shots=await expandedJSON(choice.charts.picospeaker);
      if(generation!==loadGeneration)return;
      game.speakerNotes=shots.song.modernNotes.slice().sort((a,b)=>a.t-b.t);
    }
    actorBF={direction:'idle',since:0,until:0};actorDad={direction:'idle',since:0,until:0};actorGF={direction:'idle',since:0,until:0};held.clear();laneFlashes.fill(0);opponentFlashes.fill(0);lastCountdown=-99;const context={story:isStory,retry:entry.retry,editor:!!override,character:choice.character,variant:choice.variant};const extra=expandedIntro(choice,{...context,naughtyness:settings.naughtyness!==false});if(extra&&!extra.endsWith('-sky')){if(!await runExpandedSequence(extra)||generation!==loadGeneration)return;}const stageIntro=!entry.retry&&!override&&expandedStageIntro(choice,isStory);if(stageIntro&&(!await runExpandedSequence(stageIntro)||generation!==loadGeneration))return;for(const actor of [actorBF,actorDad,actorGF])actor.forced=null;game.beat=-6;const intro=extra?.endsWith('-sky')?extra:songIntro(SONGS[index].id,{story:isStory,retry:entry.retry,editor:!!override,character:choice.character,variant:choice.variant});if(intro){const complete=await runStorySequence(intro);if(!complete||generation!==loadGeneration)return;if(intro==='winter-horrorland')game.hudFadeAt=performance.now();}enter('play');audio.start(game.startTime);announce(`${SONGS[index].name}. ${DIFFICULTIES[difficulty]}. Get ready.`);
  }catch(e){if(generation!==loadGeneration)return;errorText=e.message;announce('Loading failed. '+e.message);console.error(e);}
}
async function openChartEditor(){
  if(scene==='editor'||scene==='loading')return;if(scene==='play')audio.pause();audio.stop();audio.stopMenu();loadGeneration++;const index=scene==='freeplay'?songIndex:songIndex;
  if(!chartEditor)chartEditor=new ChartEditor({audio,assets,onExit:()=>{game=null;enter('freeplay',songIndex);},onTest:(raw,index,diff,customAudio)=>{difficulty=diff;startSong(index,false,false,{raw,audio:customAudio});},loadOriginal:getChart,prepareAudio:(index,diff)=>prepareChoice(songChoice(index,diff))});
  chartEditor.getLevels=()=>availableDifficulties(index).map(index=>({index,name:DIFFICULTIES[index]}));const keep=game?.custom&&chartEditor.index===index&&chartEditor.diff===difficulty;enter('editor');announce('Chart editor. Space plays audio, Enter tests the chart, 7 returns to freeplay.');
  try{const raw=await rawChoice(songChoice(index));chartEditor.character=fp.character;await chartEditor.open(index,difficulty,raw,{keep});}catch(e){errorText=e.message;enter('freeplay',index);announce('Could not open editor: '+e.message);}
}
function pauseGame(){if(scene!=='play'||!game||game.skyTutorialAt!=null)return;audio.pause();enter('paused');audio.sfx('scrollMenu',0.5);announce('Paused. Resume, Restart Song, Options, or Exit to Menu.');}
function resumeGame(){if(scene!=='paused'||!game)return;game.holdResumeUntil=audio.time()+settings.offset+150;enter('play');audio.resume();}
function exitSong(){loadGeneration++;audio.stop();audio.stopMenu();game=null;enter(story?'story':'freeplay',story?0:songIndex);}
function retrySong(){if(game?.retryAt)return;if(game?.choice.baseSong==='sky'&&game.choice.variant==='erect'&&Math.random()<.08){launchSkySecret();return;}const override=game?.override,death=deathConfig();audio.stopMenu();if(scene==='gameover'&&(death.pixel||death.sounds)){game.retryAt=frameTime;const generation=loadGeneration;audio.playMenu(death.sounds?.confirm||death.pixel.confirmMusic.split('/').at(-1).replace(/\.ogg$/,''),{loop:false});setTimeout(()=>{if(scene==='gameover'&&generation===loadGeneration)startSong(songIndex,story,story,override,{retry:true});},1000);return;}startSong(songIndex,story,story,override,{retry:true});}
function animateActor(actor,lane,time,miss=false){if(actor.forced?.lock&&time<actor.forced.until)return;if(actor.forced&&!actor.forced.lock)actor.forced=null;actor.direction=DIRECTIONS[laneDirection(lane)]+(miss?'miss':'');actor.since=time;actor.until=time+Math.max(150,60000/(game?.chart.bpm||100)*0.65);}
function animateNote(actor,note,time,miss=false){if(String(note.kind).toLowerCase()==='noanim'||actor.forced?.lock&&time<actor.forced.until)return;animateActor(actor,note.lane,time,miss);if(!miss&&(String(note.kind).toLowerCase()==='skyaltnote'||String(note.kind).toLowerCase()==='mom'||note.altAnim))actor.direction+='-alt';else if(!miss&&String(note.kind).toLowerCase()==='censor')actor.direction+='-censor';}
function laneHeld(lane){
  if(held.has('touch'+lane)||held.has('pad'+lane))return true;
  for(const code of held)if(noteLaneFor(settings,code,laneCount())===lane)return true;
  return false;
}

function laneFromCode(code){return noteLaneFor(settings,code,laneCount());}

function noteSpecial(note,actor,time){if(note.kind)expandedNote(game,note,time,{player:actorBF,opponent:actorDad},(sound,gain)=>audio.sfx(sound,gain));if(/^(hey!?|cheer)$/i.test(String(note.kind||'')))actor.forced={name:String(note.kind).toLowerCase().startsWith('hey')?'hey':'cheer',since:time,until:time+60000/bpmAt(game.chart,time),lock:true};}
function hit(note,time,auto=false){
  if(isOfficialCanNote(game.choice,'firegun')&&note.kind==='weekend-1-firegun'&&!canFire(game,time)){miss(note,time);return;}
  note.hit=true;note.started=true;const delta=time-note.time;const j=applyHit(game.stats,delta);if(!j)return;comboFeedback.hit(note,time,game.stats.combo,bpmAt(game.chart,time),game.botplay);laneFlashes[note.lane]=frameTime+145;animateNote(actorBF,note,time);noteSpecial(note,actorBF,time);audio.muteVoices(false);game.rating={name:j.name,since:frameTime,combo:game.stats.combo,delta};if(j.name==='sick'&&settings.noteSplash!==false&&!settings.reducedMotion){for(let i=0;i<7;i++)game.particles.push({x:laneX(note.lane,true)+55,y:receptorY()+55,vx:(Math.random()-0.5)*220,vy:(Math.random()-0.5)*220,life:0.35,color:COLORS[laneDirection(note.lane)]});}}
function miss(note,time){if(note?.missed)return;if(note)note.missed=true;applyMiss(game.stats);audio.muteVoices(true);game.rating={name:'miss',since:frameTime,combo:0,delta:0};if(note){animateNote(actorBF,note,time,true);if(note.kind)expandedNote(game,note,time,{player:actorBF,opponent:actorDad},(sound,gain)=>audio.sfx(sound,gain),true);}audio.sfx('missnote'+(1+Math.floor(Math.random()*3)),0.12);}
function pressLane(lane){if(scene!=='play'||!game||game.skyTutorialAt!=null||game.skyManifestBlock)return;const time=audio.time()+settings.offset;if(time<-HIT_WINDOW)return;laneFlashes[lane]=frameTime+80;if(game.botplay)return;const note=nearestNote(game.notes,lane,time);if(note)hit(note,time);else if(!settings.ghostTapping&&time>0)miss(null,time);}
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
function releaseLane(lane){
  if(scene!=='play'||!game||game.botplay||lane<0||laneHeld(lane))return;
  const time=audio.time()+settings.offset;
  for(let i=game.scanIndex;i<game.notes.length&&game.notes[i].time<=time+HIT_WINDOW;i++){
    const note=game.notes[i];
    if(note.player&&note.lane===lane)updateHold(note,time,false);
  }
}
function updateSongEvents(time){
  if(game.skyPicoOutcome){
    const muted=game.skyPicoMuted??=new WeakSet();
    for(const [index,source] of audio.sources.entries()){
      if(audio.trackRoles[index]==='opponent'&&!muted.has(source)){source.disconnect();muted.add(source);}
    }
  }
updateChartEvents(game,time,{bpm:bpmAt(game.chart,time),animate:(target,name,since,lock)=>{const role=['bf','boyfriend','player'].includes(target)?'player':['gf','girlfriend','partner'].includes(target)?'girlfriend':['dad','opponent'].includes(target)?'opponent':null;if(!role){game.propAnimations??={};game.propAnimations[target]={name,since,until:since+1500};return;}const actor=role==='player'?actorBF:role==='opponent'?actorDad:actorGF;actor.forced={name,prefix:name,since,until:since+1200,lock};audio.muteVoices(false);}});nativeContent.updateStage(game,time);}
function updateGame(dt){
  if(!game)return;const time=game.time=audio.time()+settings.offset;const beat=beatAt(game.chart,time);game.beat=beat;if(skyPolish.updateTutorial(game,time,{audio,finish:finishSong}))return;updateSongEvents(time);skyPolish.updateManifest(game,time,{audio,actors:{player:actorBF,opponent:actorDad,girlfriend:actorGF}});
  const count=Math.floor(time/(60000/game.chart.bpm));if(time<0&&count!==lastCountdown){lastCountdown=count;const sound={[-4]:'intro3',[-3]:'intro2',[-2]:'intro1',[-1]:'introGo'}[count];if(sound)audio.sfx(pixelStage(game.choice)?pixelUI.countdownSound(count)||sound:sound,0.7);}
  while(game.speakerNotes?.[game.speakerIndex]?.t<=time){
    const shot=game.speakerNotes[game.speakerIndex++],lane=shot.d%4;
    actorGF.forced={name:'shoot'+(lane+1),since:shot.t,until:shot.t+260,lock:true};
    game.lastShot={time:shot.t,lane};
  }
  const currentBeat=Math.floor(beat);if(currentBeat!==game.lastBeat){
    if(game.choice.baseSong==='sky')game.eventBop.girlfriend??=2;
    if(settings.flashingLights!==false&&game.choice.baseSong==='blazin'&&currentBeat>=10&&currentBeat%19===0&&!settings.reducedMotion){game.lastStrike=time;audio.sfx('W7W1_Lightning'+(1+currentBeat%3),.37);}game.lastBeat=currentBeat;if(settings.cameraZooms!==false&&!settings.reducedMotion&&currentBeat>=0&&game.bopRate!==0&&(currentBeat-(game.bopOffset||0))%(game.bopRate||4)===0)game.cameraBump=0.013*(game.bopIntensity??1);if(actorBF.until<time)actorBF.direction='idle';if(actorDad.until<time)actorDad.direction='idle';}
  if(settings.flashingLights!==false&&SONGS[songIndex].week===2&&Math.floor(beat)!==game.lightningBeat){game.lightningBeat=Math.floor(beat);if((SONGS[songIndex].id==='spookeez'&&Math.floor(beat)===4)||(beat>game.lastLightning+game.lightningDelay&&Math.random()<0.1)){game.lightningAt=time;game.lastLightning=beat;game.lightningDelay=8+Math.random()*16;if(Math.floor(beat)!==4)audio.sfx(Math.random()<0.5?'thunder_1':'thunder_2',0.7);}}
  game.cameraBump=Math.max(0,(game.cameraBump||0)-dt*0.045);
  const section=game.chart.sections.find(s=>time>=s.start&&time<s.end);if(section)game.chartPlayer=section.player;
  const notes=game.notes;for(let i=game.scanIndex;i<notes.length;i++){const n=notes[i];if(n.time>time+HIT_WINDOW)break;
    if(!n.player){if(!n.hit&&n.time<=time){n.hit=true;if(game.skyPicoOutcome)continue;opponentFlashes[n.lane]=frameTime+160;animateNote(actorDad,n,time);noteSpecial(n,actorDad,time);actorDad.until=Math.max(actorDad.until,n.time+n.length);if(!game.choice.audioRoles)audio.muteVoices(false);}continue;}
    if(!n.hit&&!n.missed){if(game.botplay&&n.time<=time)hit(n,n.time,true);else if(time-n.time>HIT_WINDOW)miss(n,time);}
    if(n.hit&&n.length>0){const pressed=game.botplay||laneHeld(n.lane);if(pressed||time>=(game.holdResumeUntil??-Infinity))updateHold(n,time,pressed);}
  }
  while(game.scanIndex<notes.length&&notes[game.scanIndex].time+notes[game.scanIndex].length<time-300)game.scanIndex++;
  for(const p of game.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}game.particles=game.particles.filter(p=>p.life>0);
  if(game.stats.health<=0&&!game.practice&&!game.botplay){gameOver();return;}
  if(audio.time()>=game.duration-35&&!game.completed)finishSong();
}
function missHold(note,time){applyMiss(game.stats);audio.muteVoices(true);game.rating={name:'miss',since:frameTime,combo:0,delta:0};}
async function runStorySequence(id){const generation=loadGeneration,current=game;if(scene!=='loading')enter('loading');await storyIntros.load(id);if(generation!==loadGeneration||current!==game)return false;storyIntros.begin(id,{now:performance.now(),volume:settings.volume,reducedMotion:settings.reducedMotion,story,character:game.character,variation:game.choice.variant||'',charting:game.custom,cameraStart:[850,500],cameraStartZoom:.8,censored:settings.naughtyness===false,subtitles:settings.subtitles!==false});if(storyIntros.done)return true;introAnnouncement='';enter('intro');return new Promise(resolve=>introWaiter={resolve,generation,current});}
function drawStorySequence(){storyIntros.update(frameTime);const elapsed=frameTime-sceneAt,stageTime=Math.max(0,game.time)+elapsed;game.beat=beatAt(game.chart,stageTime);ctx.save();const focus=storyIntros.cameraFocus;if(focus){const stage=nativeContent.stage(game.choice),worldScale=stage?.view?.scale??.8,ox=stage?.view?.x??40,oy=stage?.view?.y??-70;ctx.translate(640,360);ctx.scale(storyIntros.cameraZoom/worldScale,storyIntros.cameraZoom/worldScale);ctx.translate(-(ox+worldScale*focus[0]),-(oy+worldScale*focus[1]));}drawStage(stageTime);ctx.restore();const targets=storyIntros.draw(ctx,{now:frameTime,volume:settings.volume});for(const target of targets)newButton(target.id,target.label,target.x,target.y,target.w,target.h,()=>storyIntros[target.action](performance.now()));const shown=storyIntros.phase==='dialogue'?storyIntros.currentText(frameTime):'';canvas.dataset.dialogue=shown;canvas.dataset.dialogueLine=String(storyIntros.pageIndex??0);canvas.dataset.introPhase=storyIntros.phase;if(storyIntros.phase==='dialogue'){const full=storyIntros.page?.text||'';if(full!==introAnnouncement){introAnnouncement=full;announce(full);}}if(storyIntros.done&&introWaiter){const waiting=introWaiter;introWaiter=null;waiting.resolve(waiting.generation===loadGeneration&&waiting.current===game);}}
function deathConfig(){const id=game?.choice.characters?.player,character=nativeContent.character(id,true),pixel=nativeContent.data.uiPixelGameover?.[id],first=character?.animationMap?.firstDeath;return{id,character,pixel,sounds:skyDeathSounds(id,settings.naughtyness!==false),duration:first?(first.frameIndices?.length||first.frameCount||24)/(first.fps||24)*1000:game?.character==='pico'?2000:1200};}
function gameOver(){pendingRankReveal=null;audio.stop();const death=deathConfig();const specific=death.sounds?.loss||(death.id==='pico-blazin'?'W7W1_fnf_loss_sfx-pico-gutpunch':death.id==='pico-holding-nene'?'W7W1_fnf_loss_sfx-pico-and-nene':null);audio.sfx(specific||(death.pixel?death.pixel.lossSound.split('/').at(-1).replace(/\.ogg$/,''):'fnf_loss_sfx'));enter('gameover');const current=game;
  setTimeout(()=>{
    if(scene!=='gameover'||game!==current||game.retryAt)return;
    audio.playMenu(death.sounds?.loop||(death.pixel?death.pixel.loopMusic.split('/').at(-1).replace(/\.ogg$/,''):'gameOver'));
    const quote=tankmanDeathQuote(death.id,game.choice.opponent,settings.naughtyness!==false);
    if(quote)audio.sfx(quote,.78);
  },death.pixel||death.sounds?death.duration:1200);announce('Game over. Enter to retry. Escape for menu.');}
async function finishSong(){
  game.completed=true;audio.stop();const finishedGame=game,generation=loadGeneration,extra=game.custom?null:expandedOutro(game.choice,story,{manifestLiquid:game.skyManifestLiquid});if(extra&&(!await runExpandedSequence(extra)||finishedGame!==game||generation!==loadGeneration))return;const outro=game.custom?null:songOutro(SONGS[songIndex].id,{story,variant:game.choice.variant});if(outro){try{const complete=await runStorySequence(outro);if(!complete||finishedGame!==game||generation!==loadGeneration)return;}catch(error){console.error(error);announce('Cutscene could not load: '+error.message);}}const s=game.stats,forcedRank=game.forcedResultRank;const legitimate=!game.practice&&!game.botplay&&!game.custom;
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
function laneX(lane,player){const count=laneCount();if(mobileActive())return player?lane*1280/count+(1280/count-112)/2:22+lane*38;if(settings.middlescroll||game?.choice.baseSong==='blazin')return player?(1280-count*112)/2+lane*112:-600;const spacing=count===6?88:112;return (player?(count===6?696:732):(count===6?40:92))+lane*spacing;}

function receptorY(){return mobileActive()||settings.downscroll?565:50;}

function gameplayNoteAtlas(){const name=game?.choice?.noteTexture;return name&&assets.images[name]&&assets.atlases[name]?name:'NOTE_assets';}
function drawNote(lane,x,y,scale=0.7,state='note',time=0,alpha=1){lane=laneDirection(lane);if(game&&pixelStage(game.choice)&&pixelUI.note(ctx,lane,x,y,scale,state,time,alpha,viewAspect()))return;let prefix=NOTE_PREFIX[lane];if(state==='static')prefix='arrow'+DIRECTIONS[lane];if(state==='press')prefix=DIRECTIONS[lane].toLowerCase()+' press';if(state==='confirm')prefix=DIRECTIONS[lane].toLowerCase()+' confirm';const skin=gameplayNoteAtlas(),atlas=skin==='NOTE_assets'&&lane===1&&assets.images.NOTE_DOWN_NATIVE?'NOTE_DOWN_NATIVE':skin,f=assets.frames(atlas,prefix);if(!f.length)return;const frame=f[state==='confirm'?clamp(Math.floor(time/1000*24),0,f.length-1):0];const fw=(frame.frameWidth||frame.width)*scale,fh=(frame.frameHeight||frame.height)*scale;ctx.save();ctx.translate(x+56,y+56);ctx.scale(1,viewAspect());assets.draw(ctx,atlas,frame,-fw/2,-fh/2,scale,alpha);ctx.restore();}
function drawHold(lane,x,start,end,alpha,scale=0.7){lane=laneDirection(lane);if(pixelStage(game?.choice)&&pixelUI.hold(ctx,lane,x,start,end,alpha,scale,viewAspect()))return;
  const atlas=gameplayNoteAtlas(),names=['purple','blue','green','red'],body=assets.frame(atlas,names[lane]+' hold piece'),tip=assets.frame(atlas,lane===0?'pruple end hold':names[lane]+' hold end');if(!body||!tip)return;
  const direction=end>=start?1:-1,length=Math.abs(end-start),img=assets.images[atlas],width=body.width*scale,cap=Math.min(tip.height*scale*viewAspect(),length);
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,start);ctx.scale(1,direction);if(length>cap)ctx.drawImage(img,body.x,body.y,body.width,body.height,-width/2,0,width,length-cap);ctx.drawImage(img,tip.x,tip.y,tip.width,tip.height,-width/2,length-cap,width,cap);ctx.restore();
}
function icon(character,x,y,scale=0.65,losing=false,flip=false,options={}){const id=String(character).split('-')[0],native=assets.images[nativeContent.data.iconAssets?.[character]]||assets.images['HEALTH_'+character]||assets.images['HEALTH_'+id],img=native||assets.images.iconGrid,index=(character==='dad'?12:character==='spooky'?2:character==='monster'?19:character==='pico'?4:0)+(losing?1:0),size=native?img.height:150,sx=native?Math.min(losing?size:0,img.width-size):(index%10)*150,sy=native?0:Math.floor(index/10)*150;scale*=(options?.scale??1)*(native?150/size:1);x+=options?.offsetX||0;y+=options?.offsetY||0;flip=flip!==!!options?.flipX;ctx.save();if(native&&size<100)ctx.imageSmoothingEnabled=false;if(flip){ctx.translate(x+size*scale,y);ctx.scale(-1,1);ctx.drawImage(img,sx,sy,size,size,0,0,size*scale,size*scale);}else ctx.drawImage(img,sx,sy,size,size,x,y,size*scale,size*scale);ctx.restore();}
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
  const declared=game.choice.characters?.[role];
  if(declared)return declared;
  if(role==='girlfriend')return game.choice.opponent==='gf'?'none':game.character==='pico'?'nene':'gf';
  return role==='player'?game.character==='pico'?'pico-playable':'bf':game.choice.opponent||'dad';
}
function drawSceneCharacterRaw(role,actor,position,time,stageScale=null,globalOffsets=true){const id=stageCharacterId(role);if(!id||id==='none')return role==='girlfriend';actor=actor||(role==='girlfriend'?actorGF:null);const config=game.modVisuals?.characters[role],bpm=bpmAt(game.chart,time),period=game.eventBop[role]??(role==='girlfriend'?1:dancePeriod(bpm)),idle=!actor||actor.direction==='idle'||time>actor.until,forced=actor?.forced&&time<actor.forced.until?actor.forced:null;
 if(config){drawModCharacter(ctx,assets,config,{x:position[0],y:position[1],scale:role==='girlfriend'?0.62:0.65,direction:idle?'idle':actor.direction,animation:forced?.name,time:forced?time-forced.since:idle?period===0?0:((game.beat%period+period)%period)*60000/bpm:time-actor.since,beat:game.beat,bopBeats:period,player:role==='player'});return true;}
 const options={x:position[0],y:position[1],scale:stageScale??(role==='girlfriend'?0.62:role==='player'?0.66:0.7),time,naughtyness:settings.naughtyness!==false,beat:game.beat,bpm,period,player:role==='player',globalOffsets,suffix:game.animationSuffix?.[role],...role==='girlfriend'?nativeContent.partnerOverride(game,time,id):{}};
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
  const choice=game.choice,stage=nativeContent.stage(choice),fight=choice.baseSong==='blazin',intro=scene==='intro'||!!script;
  rect(0,0,1280,720,choice.stage==='tankmanBattlefield'?'#ec9a03':'#19131b');
  const baseZoom=intro?1:(game.eventZoom||1)+(settings.cameraZooms===false?0:game.cameraBump||0);
  const view=officialStageLayout(game,stage,{
    time,scale:stage.view?.scale??.8,originX:stage.view?.x??40,originY:stage.view?.y??-70,
    pan:0,bump:baseZoom,intro,cutsceneId:script?.camera?null:script?.cutsceneId,elapsed:script?.elapsed,reducedMotion:settings.reducedMotion,
  });
  const {scale,originX,originY}=view,originPan=view.pan||0;
  const worldOptions={time,pan:originPan,worldScale:scale,originX,originY,reducedMotion:settings.reducedMotion,mobile:mobileActive()};
  const project=([x,y])=>[originX+x*scale-originPan,originY+y*scale];
  const deadSniper=game.stressSniper&&!script;
  const skyOutcome=game.skyPicoOutcome&&!script?game.skyPicoOutcome:null;
  const positions={},focusPoints={},layers=stage.props.map(prop=>{
    const shift=script?.propOffsets?.[prop.name]||(deadSniper&&prop.name==='tankBricks'?[0,100]:null);
    return {z:view.propZ?.[prop.name]??prop.zIndex??0,prop:shift?{...prop,position:prop.position.map((v,i)=>v+shift[i])}:prop};
  });
  for(const [role,key] of [['girlfriend','gf'],['opponent','dad'],['player','bf']]){
    const meta=stage.characters[key];
    if(!meta)continue;
    const overrides=view.actors?.[role],offset=script?.actorOffsets?.[role]||[0,0];
    const pos=overrides?.position||project(meta.position);
    const id=stageCharacterId(role),swing=id==='scenecoresky-shootin'&&!settings.reducedMotion;
    const angle=swing?-Math.sin(time*.0025)*Math.PI/18:0;
    const side=swing?-67+Math.sin(time*.00252)*58:0;
    const position=positions[role]=[pos[0]+(offset[0]+side)*scale,pos[1]+offset[1]*scale];
    const config=nativeContent.character(id,role==='player');
    focusPoints[role]=actorCameraPoint(meta.position,meta,config,1);
    const cutActor=script?.actors?.find(entry=>entry.role===role&&entry.asset)||(role==='opponent'&&skyOutcome?{
      asset:skyOutcome.art,label:skyOutcome.naughtyness?'Dead':'Dead Candy',age:time,offset:[-190,-581],loop:true,
    }:null);
    if(cutActor)layers.push({z:(meta.zIndex||0)+1,cutActor,position});
    layers.push({z:fight&&role===game.fightLead?3500:meta.zIndex||0,role,position,angle,
      actorScale:overrides?.actorScale??scale*(meta.scale||1),globalOffsets:overrides?.globalOffsets});
  }
  const propActors=script?.props||(deadSniper?[{prop:'sniper',z:21,asset:deadSniper,label:'Sniper Dead Loop',age:time,offset:[-150,550],scale:1.15,loop:true}]:[]);
  for(const prop of propActors){
    const anchor=stage.props.find(item=>item.name===prop.prop);
    if(anchor&&prop.asset)layers.push({z:prop.z,cutActor:prop,position:project(anchor.position)});
  }
  layers.push(...skyPolish.stageLayers(game));
  const resolve=([role,x,y,zoom])=>{
    const point=role==='position'?[0,0]:focusPoints[role]||[(640-originX+originPan)/scale,(360-originY)/scale];
    const [px,py]=project([point[0]+x,point[1]+y]);
    return zoom==null?[px,py]:[px,py,zoom];
  };
  const shot=script&&scriptedCamera(script,script.elapsed,[640,360,stage.cameraZoom||scale],resolve);
  let [centerX,centerY,zoom]=shot||[640,360,scale*view.bump];
  if(!intro&&!fight&&!settings.reducedMotion){
    if(game.hasStageFocus??=game.chart.events?.some(event=>event.e==='FocusCamera')){
      [centerX,centerY]=nativeChartCamera(game,time,[640,360],resolve);
    }else{
      const side=game.chartPlayer?1:-1,previous=game.cameraX||0;
      game.cameraX=previous+(side*24-previous)*.05;
      centerX+=game.cameraX;
    }
  }
  if(shot&&!game.completed)game.introCamera=shot;
  if(!intro&&game.introCamera&&!settings.reducedMotion&&time<0){
    const t=clamp((time-game.startTime)/Math.max(1,-game.startTime),0,1),ease=t*t*(3-2*t);
    [centerX,centerY,zoom]=[centerX,centerY,zoom].map((v,i)=>game.introCamera[i]+(v-game.introCamera[i])*ease);
  }
  const shake=settings.flashingLights===false||settings.reducedMotion?0:script?.shake||0;
  const bump=zoom/scale;
  const shakeX=shake?Math.sin(time*.131)*1280*shake:0,shakeY=shake?Math.cos(time*.177)*720*shake:0;
  ctx.save();
  if(pixelStage(choice))ctx.imageSmoothingEnabled=false;
  ctx.translate(640+shakeX,360+shakeY);ctx.scale(bump,bump);ctx.translate(-centerX,-centerY);
  for(const layer of layers.sort((a,b)=>a.z-b.z)){
    if(layer.cutActor){
      const {asset,label,age,offset,scale:actorScale=1,loop}=layer.cutActor;
      ctx.save();
      if(script?.cutsceneId==='sky-pico-stage'||skyOutcome)ctx.filter='contrast(1.08) hue-rotate(-27deg)';
      drawSkyAnimation(ctx,asset,age,layer.position[0]+offset[0]*scale,layer.position[1]+offset[1]*scale,{scale:scale*actorScale,label,loop});
      ctx.restore();
      continue;
    }
    if(layer.role&&(skyOutcome&&layer.role==='opponent'||script?.actors?.some(entry=>entry.role===layer.role&&entry.asset)))continue;
    if(layer.role&&(script?.hideActors?.includes(layer.role)||scene==='intro'&&storyIntros.hideActors?.includes(layer.role)))continue;
    if(layer.prop&&(deadSniper&&layer.prop.name==='sniper'||script?.hideProps?.includes(layer.prop.name)||scene==='intro'&&storyIntros.hideProps?.includes(layer.prop.name)))continue;
    if(layer.skyEffect){skyPolish.drawEffect(ctx,layer.skyEffect,game,worldOptions);continue;}
    if(layer.prop){
      const scroll=layer.prop.scroll||[1,1],parallax={...worldOptions,
        originX:originX+(centerX-640)*(1-scroll[0]),originY:originY+(centerY-360)*(1-scroll[1])};
      ctx.save();
      if(script?.propBrightness<1&&(layer.prop.zIndex??0)<300)ctx.filter='brightness('+script.propBrightness+')';
      skyPolish.drawProp(ctx,game,layer.prop,()=>nativeContent.drawProp(ctx,layer.prop,game,parallax),parallax);
      ctx.restore();
      if(layer.prop.name==='spraycanPile')drawOfficialStageFX(ctx,assets,game,stage,view,{time,elapsed:script?.elapsed,cutsceneId:script?.cutsceneId,phase:'pile'});
      continue;
    }
    if(layer.role==='player')skyPolish.drawTutorial(ctx,game,time,layer.position,{stageScale:scale,reducedMotion:settings.reducedMotion});
    const actor=layer.role==='player'?actorBF:layer.role==='opponent'?actorDad:actorGF;
    ctx.save();
    if(layer.angle){
      const [x,y]=layer.position;
      const pivot=y-900*scale;
      ctx.translate(x,pivot);ctx.rotate(layer.angle);ctx.translate(-x,-pivot);
    }
    const drawn=skyPolish.drawActor(ctx,game,layer.role,()=>drawSceneCharacter(layer.role,actor,layer.position,time,layer.actorScale,layer.globalOffsets),worldOptions);
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
    if(!drawn&&layer.role==='player'){
      const pico=game.character==='pico',s=pico?.64:.66,dim=pico?500:412;
      drawActor(pico?'PICO':'BOYFRIEND',actorBF,layer.position[0]-dim*s/2,layer.position[1]-dim*s,s,time);
    }
  }
  drawOfficialStageFX(ctx,assets,game,stage,view,{time,elapsed:script?.elapsed,cutsceneId:script?.cutsceneId,phase:'afterActors'});
  ctx.restore();
  if(settings.backgroundDim)rect(0,0,1280,720,'rgba(0,0,0,'+settings.backgroundDim+')');
  if(script)return {...Object.fromEntries(Object.entries(positions).map(([role,[x,y]])=>[role,[640+(x-centerX)*bump,360+(y-centerY)*bump]])),scale:scale*bump};
}
async function prepareSceneAssets(choice){const week=SONGS[songIndex].week,modern=choice.variant==='erect'||choice.character==='pico'||choice.stage?.endsWith('Erect'),needed=new Set([...nativeContent.required(choice),...pixelUI.required(choice)]);if(choice.noteTexture&&assets.atlases[choice.noteTexture])needed.add(choice.noteTexture);for(const name of [choice.character==='pico'?'PICO':'BOYFRIEND','BF_FEAR','DADDY_DEAREST','GF_FEAR'])needed.add(name);if((choice.character==='pico'||['nene-tankmen','otis-speaker'].includes(choice.characters?.girlfriend))&&!pixelStage(choice))for(const name of ['ABOT','ABOT_SCREEN','ABOT_VIZ'])needed.add(name);if(week===2||choice.stage?.startsWith('spooky')){if(modern)needed.add('GF_DARK');for(const name of modern?['SPOOKY_DARK','MONSTER','week2-bgDark','week2-bgLight','week2-stairsDark','week2-stairsLight','WEEK2_TREES']:['SPOOKY','MONSTER','HALLOWEEN'])needed.add(name);}else if(!nativeContent.stage(choice)&&!modern)for(const name of ['stageback','stagefront','stagecurtains'])needed.add(name);for(const name of ['GF_EXTENDED','NENE_EXTENDED'])needed.delete(name);if(choice.character!=='pico')needed.delete('PICO');assets.releaseUnused(needed);await Promise.all([assets.ensure([...needed]),skyPolish.prepare(choice,audio),nativeContent.prepare(choice),comboFeedback.prepare(),...officialRequiredSounds(choice).map(name=>audio.load(''+name+'.ogg').catch(()=>null)),nativeExtras.load('characters'),modern&&week!==2&&!nativeContent.stage(choice)?nativeExtras.load('erectStage'):Promise.resolve()]);if(pixelStage(choice))await Promise.all([...pixelUI.sounds(),...(Object.values(nativeContent.data.uiPixelGameover||{}).map(v=>v.lossSound.split('/').at(-1).replace(/\.ogg$/,'')))].map(name=>audio.load(''+name+'.ogg').catch(()=>null)));if(choice.stage?.startsWith('philly')||choice.stage?.startsWith('limo'))await Promise.all(['train_passes','carPass0','carPass1'].map(name=>audio.load(''+name+'.ogg').catch(()=>null)));}
function drawStage(time,script=null){if(nativeContent.stage(game.choice))return drawExpandedStage(time,script);
 const week2=SONGS[songIndex].week===2,modern=game.choice.variant==='erect'||game.character==='pico'||game.choice.stage?.endsWith('Erect'),custom=game.modVisuals,beat=game.beat,bpm=bpmAt(game.chart,time),flashAge=time-game.lightningAt;
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
 const drawCustom=(role,actor,position)=>skyPolish.drawActor(ctx,game,role,()=>drawSceneCharacter(role,actor,[position[0]-pan,position[1]],time),{time,mobile:mobileActive()});
 if(!drawCustom('girlfriend',null,positions.gf)){if(game.character==='pico'){const scale=0.62,neneX=positions.gf[0]-195.3-pan,neneY=positions.gf[1]-405.5;drawABot(ctx,assets,audio,{neneX,neneY,scale,time});assets.draw(ctx,'NENE',assets.frame('NENE','Nene idle',settings.reducedMotion?0:partnerDanceFrame(beat,bpm)),neneX,neneY,scale);}else if(modern||week2){const atlas=modern?'GF_DARK':'GF_MODERN',prefix=(modern?'GF dark':'GF modern')+(flashAge>=0&&flashAge<550?' scared':' idle');if(flashAge>=0&&flashAge<550)animation(atlas,prefix,positions.gf[0]-698*0.62/2-pan,positions.gf[1]-637*0.62,0.62,flashAge,{loop:false});else assets.draw(ctx,atlas,assets.frame(atlas,prefix,settings.reducedMotion?0:partnerDanceFrame(beat,bpm)),positions.gf[0]-698*0.62/2-pan,positions.gf[1]-637*0.62,0.62);}else{const frames=assets.frames('GF_assets','GF Dancing Beat0'),idx=settings.reducedMotion?0:partnerDanceFrame(beat,bpm);assets.draw(ctx,'GF_assets',frames[idx],472-pan,158,0.62);}}
 if(!drawCustom('opponent',actorDad,positions.dad)){const id=game.choice.opponent||SONGS[songIndex].opponent||'dad',name=id.includes('monster')?'MONSTER':id.includes('spooky')?(modern?'SPOOKY_DARK':'SPOOKY'):'DADDY_DEAREST',s=name==='DADDY_DEAREST'?0.71:0.7,w=name==='MONSTER'?426:name.startsWith('SPOOKY')?492:426,h=name==='MONSTER'?637:name.startsWith('SPOOKY')?549:767;drawActor(name,actorDad,positions.dad[0]-w*s/2-pan,positions.dad[1]-h*s,s,time);}
 skyPolish.drawTutorial(ctx,game,time,[positions.bf[0]-pan,positions.bf[1]],{stageScale:.66,reducedMotion:settings.reducedMotion});
 const tutorialLight=skyPolish.tutorialLighting(game,time,settings.reducedMotion);
 if(tutorialLight<1)rect(0,0,1280,720,'rgba(0,0,0,'+(1-tutorialLight)+')');
 if(!drawCustom('player',actorBF,positions.bf)){const pico=game.character==='pico',s=pico?0.64:0.66;drawActor(pico?'PICO':'BOYFRIEND',actorBF,positions.bf[0]-(pico?500:412)*s/2-pan,positions.bf[1]-(pico?500:412)*s,s,time);}
 if(custom?.stage)drawModStageProps(ctx,assets,custom.stage,{foreground:true,time,pan});else if(week2&&modern){image('week2-stairsDark',754.5-pan,-203.75,862.5,937.5);if(flashAge>=0&&flashAge<1600)image('week2-stairsLight',754.5-pan,-203.75,862.5,937.5,Math.max(0,1-flashAge/1600));}else if(!week2&&modern)nativeExtras.drawErectStage(ctx,time,{pan,foreground:true});else if(!week2&&!modern)image('stagecurtains',-250-pan*1.3,-175,1770,624);
 ctx.restore();if(settings.backgroundDim)rect(0,0,1280,720,`rgba(0,0,0,${settings.backgroundDim})`);
}

function drawGameplay(){
 if(!game)return;const time=game.time,mobile=mobileActive(),down=mobile||settings.downscroll,count=laneCount(),y=receptorY(),sign=down?-1:1,speed=0.45*game.chart.speed*settings.scrollSpeed,playerScale=mobile?(count===6?Math.min(1.4,Math.max(0.85,48*1280/viewportWidth/160)):Math.min(1.7,Math.max(1.02,64*1280/viewportWidth/160))):count===6?0.55:0.7;
 drawStage(time);if(/^philly(?:Streets|Blazin)/.test(game.choice.stage||'')&&!settings.reducedMotion)drawExpandedRain(ctx,Math.max(0,time),game.choice.baseSong==='blazin'?1.15:.8);
 if(game.skyTutorialMuted)return;
 const manifestFade=skyPolish.manifestFade(game,time,settings.reducedMotion);
 if(manifestFade)rect(0,0,1280,720,'rgba(0,0,0,'+manifestFade+')');
 const shiftFade=story&&({'wife-forever':336,sky:292,manifest:424}[game.choice.baseSong]);
 if(shiftFade&&game.beat>=shiftFade)rect(0,0,1280,720,'rgba(0,0,0,'+clamp((game.beat-shiftFade)*300/2000,0,1)+')');
 if(game.choice.baseSong==='sky'&&game.choice.variant==='erect'&&game.beat>=224&&game.beat<352){const gradient=ctx.createRadialGradient(640,360,170,640,360,730);gradient.addColorStop(0,'#0000');gradient.addColorStop(1,'#000c');ctx.fillStyle=gradient;ctx.fillRect(0,0,1280,720);}
 const storyFade=rosesFade(SONGS[songIndex].id,{story,variant:game.choice.variant,time});if(storyFade.red&&settings.flashingLights!==false)rect(0,0,1280,720,'rgba(255,27,49,'+storyFade.red+')');ctx.save();ctx.globalAlpha*=storyFade.hud*(game.hudFadeAt?clamp((frameTime-game.hudFadeAt)/2000,0,1):1);if(pixelStage(game.choice))ctx.imageSmoothingEnabled=false;if(settings.strumlineBackground>0){
    const x=mobile?0:laneX(0,true)-12,w=mobile?1280:laneX(count-1,true)-x+108;
    rect(x,0,w,720,'rgba(0,0,0,'+settings.strumlineBackground+')');
  }else if(settings.middlescroll&&!mobile)rect((1280-count*112)/2,0,count*112,720,'#0003');
 const activeCaption=settings.subtitles!==false&&game.captions?.find(cue=>cue.start<=time/1000&&cue.end>time/1000);
 if(activeCaption)activeCaption.text.forEach((line,i)=>text(line,640,down?124+i*26:590+i*26,22,'#fff','center',2));
 const hiddenOpponent=game.choice.baseSong==='blazin'||!mobile&&settings.middlescroll;
 const notePosition=n=>{const scale=mobile&&!n.player?0.2:1,scroll=n.player?(game.eventScrollPlayer??game.eventScroll??1):(game.eventScrollOpponent??game.eventScroll??1),target=mobile&&!n.player?20:y;return target+(n.time-time)*speed*scroll*(mobile&&!n.player?1:sign)*scale;};
 const miniClip=()=>{ctx.beginPath();ctx.rect(0,0,270,130);ctx.clip();};
 // Render the two strumlines separately so the miniature opponent lane has its own clip and speed.
 for(const player of [false,true]){if(!player&&hiddenOpponent)continue;ctx.save();if(!player&&mobile)miniClip();else{ctx.beginPath();ctx.rect(0,0,1280,720);ctx.clip();}
  for(let i=game.scanIndex;i<game.notes.length;i++){const n=game.notes[i];if(n.player!==player)continue;const pos=notePosition(n);if(n.time>time+6000)break;if(n.length>0&&!n.holdComplete&&!(n.hit&&time>n.time+n.length)){const scroll=n.player?(game.eventScrollPlayer??game.eventScroll??1):(game.eventScrollOpponent??game.eventScroll??1),target=mobile&&!player?20:y,end=target+(n.time+n.length-time)*speed*scroll*(mobile&&!player?1:sign)*(mobile&&!player?0.2:1),start=n.hit&&!n.holdBroken?target+56:pos+56;if(Math.max(start,end+56)>-100&&Math.min(start,end+56)<820)drawHold(n.lane,laneX(n.lane,player)+56,start,end+56,n.missed||n.holdBroken?0.25:player?0.72:0.4,mobile&&!player?0.22:playerScale);}}
  for(let lane=0;lane<count;lane++){const until=(player?laneFlashes:opponentFlashes)[lane],confirm=until>frameTime,press=player&&laneHeld(lane);drawNote(lane,laneX(lane,player),mobile&&!player?20:y,mobile&&!player?0.22:playerScale,confirm?'confirm':press?'press':'static',confirm?145-(until-frameTime):0,player?1:0.7);}
  for(let i=game.scanIndex;i<game.notes.length;i++){const n=game.notes[i];if(n.time>time+6000)break;if(n.player!==player||n.hit||n.missed)continue;const pos=notePosition(n);if(pos<-180||pos>850)continue;drawNote(n.lane,laneX(n.lane,player),pos,mobile&&!player?0.22:playerScale,'note',0,player?1:0.7);}
  ctx.restore();}
 for(const p of game.particles){ctx.globalAlpha=clamp(p.life/0.35,0,1);rect(p.x-4,p.y-4,8,8,p.color);}ctx.globalAlpha=1;
 comboFeedback.draw(ctx,{time,combo:game.stats.combo,bpm:bpmAt(game.chart,time),pixel:pixelStage(game.choice),botplay:game.botplay,middlescroll:settings.middlescroll,classicCombo:assets.images.combo});
 if(game.rating){const r=game.rating,age=(frameTime-r.since)/1000;if(age<0.7){const alpha=clamp((0.7-age)*4,0,1),rise=settings.reducedMotion?0:age*35;ctx.save();ctx.globalAlpha=alpha;if(pixelStage(game.choice)&&r.name!=='miss'&&pixelUI.rating(ctx,r.name,settings.comboPopup?r.combo:null,290-rise,alpha)){}else if(r.name==='miss')text('MISS',640,310-rise,40,'#d271eb','center');else{const img=assets.images[r.name];image(r.name,640-img.width*0.52/2,290-rise,img.width*0.52,img.height*0.52);if(settings.comboPopup)text(String(r.combo).padStart(3,'0'),640,356-rise,35,'#fff','center');}ctx.restore();}}
 const healthY=down?32:650;rect(338,healthY,604,22,'#000');rect(343,healthY+5,594,12,'#ff0000');const hp=game.stats.health/2;rect(343+594*(1-hp),healthY+5,594*hp,12,'#66ff33');const boundary=343+594*(1-hp),pulse=settings.reducedMotion?1:1+Math.max(0,1-(game.beat%1)*4)*0.1;icon(game.eventHealthIcon?.opponent||game.choice.opponent||'dad',boundary-90*pulse,healthY-28,0.5*pulse,game.stats.health>1.6,false,game.healthIconOptions?.opponent);icon(game.eventHealthIcon?.player||game.choice.characters?.player||(game.character==='pico'?'pico':'bf'),boundary-10,healthY-28,0.5*pulse,game.stats.health<0.4,true,game.healthIconOptions?.player);
 text(mobile?'Score '+game.stats.score+' · Miss '+game.stats.misses+' · '+accuracy(game.stats).toFixed(1)+'%':'Score: '+game.stats.score+'  |  Misses: '+game.stats.misses+'  |  Accuracy: '+accuracy(game.stats).toFixed(2)+'%',640,down?83:690,mobile?Math.max(19,11*1280/viewportWidth):19,'#fff','center',2);
 const remaining=Math.max(0,Math.ceil((game.duration-audio.time())/1000));text(Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0'),640,down?5:12,18,'#fff','center',2);text(SONGS[songIndex].name+' - '+DIFFICULTIES[difficulty]+' / '+count+'K',15,mobile?695:down?690:14,mobile?14:16,'#ddd','left',2);
 if(game.practice||game.botplay)text(game.botplay?'BOTPLAY':'PRACTICE MODE',640,down?115:172,25,'#fff','center');const beatms=60000/game.chart.bpm;if(time<0){const name={[-3]:'ready',[-2]:'set',[-1]:'go'}[Math.floor(time/beatms)];if(name&&!(pixelStage(game.choice)&&pixelUI.countdown(ctx,Math.floor(time/beatms)))){const img=assets.images[name];image(name,640-img.width*0.65/2,360-img.height*0.65/2,img.width*0.65,img.height*0.65);}}
 if(!mobile)for(let lane=0;lane<count;lane++)newButton('lane-'+lane,laneLabel(lane)+' note ('+keyLabel(playKeys()[lane])+')',laneX(lane,true),180,count===6?88:112,440,()=>{}, {lane});
 newButton('pause','Pause game',1180,0,100,88,pauseGame);text('II',1248,18,27,'#fff','center',2);ctx.restore();
}

function drawPaused(){drawGameplay();buttons=[];rect(0,0,1280,720,'#000b');text(SONGS[songIndex].name,1255,22,32,'#fff','right');text(DIFFICULTIES[difficulty],1255,65,25,'#ddd','right');['resume','restart song','options','exit to menu'].forEach((label,i)=>{const y=145+i*125;letters(label,selected===i?160:110,y,1.04,{alpha:selected===i?1:0.55});newButton('pause-'+i,label,90,y-18,950,105,()=>{selected=i;choosePaused();},{select:i});});footer('UP / DOWN: SELECT      ENTER: CONFIRM      ESC: RESUME');}
function choosePaused(){if(selected===0)resumeGame();if(selected===1)retrySong();if(selected===2)openSettings('paused');if(selected===3)exitSong();}
function drawGameOver(){rect(0,0,1280,720,'#000');const elapsed=frameTime-sceneAt,pico=game?.character==='pico',death=deathConfig(),deathTime=death.duration;ctx.save();if(death.character?.animationMap?.firstDeath){nativeContent.drawCharacter(ctx,death.id,null,{x:640,y:620,scale:pixelStage(game.choice)?0.85:0.86,time:elapsed,player:true,globalOffsets:game.choice.baseSong!=='blazin',animation:naughtyAnimation(death.id,game.retryAt?'deathConfirm':elapsed<deathTime?'firstDeath':'deathLoop',settings.naughtyness!==false,death.character.animationMap),animationTime:game.retryAt?frameTime-game.retryAt:elapsed<deathTime?elapsed:elapsed-deathTime});}else animation(pico?'PICO':'BOYFRIEND',pico?(elapsed<deathTime?'Pico dies':'Pico Dead Loop'):(elapsed<deathTime?'BF dies':'BF Dead Loop'),pico?425:485,210,0.86,elapsed<deathTime?elapsed:elapsed-deathTime,{loop:elapsed>=deathTime});ctx.restore();if(elapsed>1100){if(!death.pixel)letters('retry',640,100,1.4,{align:'center'});text('ENTER TO RETRY',640,618,30,'#fff','center');text('ESC TO RETURN',640,669,20,'#999','center');newButton('retry','Retry song',0,0,1280,640,retrySong);newButton('gameover-exit','Return to menu',380,648,520,70,exitSong);}}

function drawResults(){if(nativeResults.started){const targets=nativeResults.draw(ctx,{now:frameTime,volume:settings.volume,hints:true});for(const target of targets)newButton(target.id,target.label,target.x,target.y,target.w,target.h,()=>{if(target.action==='replay')startSong(story?weekStart():songIndex,story);else enter(story?'story':'freeplay',story?0:songIndex);});return;}menuBackground('menuBGBlue');rect(95,40,1090,635,'#000c');letters(story?'week clear':'song clear',640,69,1.05,{align:'center'});text(story?'WEEK '+WEEKS[storyWeek].id+' — '+WEEKS[storyWeek].name:SONGS[songIndex].name.toUpperCase(),640,168,30,'#ffde5e','center');const stats=story?combinedStats():game.stats;const rows=[['SCORE',story?storyTotal:stats.score],['ACCURACY',accuracy(stats).toFixed(2)+'%'],['MAX COMBO',stats.maxCombo],['MISSES',stats.misses],['RANK',rank(stats)]];rows.forEach(([label,value],i)=>{text(label,320,235+i*56,29,'#bbb');text(String(value),960,235+i*56,32,'#fff','right');});text(`SICK ${stats.judgements.sick}    GOOD ${stats.judgements.good}    BAD ${stats.judgements.bad}    SHIT ${stats.judgements.shit}`,640,537,20,'#ddd','center');if(game.practice||game.botplay)text('PRACTICE / AUTOPLAY — SCORE NOT SAVED',640,581,20,'#ffda60','center');text('ENTER: CONTINUE     R: PLAY AGAIN',640,624,25,'#fff','center');newButton('results-continue','Continue to song selection',170,600,625,70,()=>{audio.stopMenu();enter(story?'story':'freeplay',story?0:songIndex);});newButton('results-replay','Play again',840,600,300,70,()=>startSong(story?weekStart():songIndex,story));}
function combinedStats(){const all=makeStats();all.health=1;all.hits=0;all.misses=0;all.weight=0;all.totalNotes=0;for(const s of storyStats){all.totalNotes+=s.totalNotes||s.hits+s.misses;all.score+=s.score;all.hits+=s.hits;all.misses+=s.misses;all.weight+=s.weight;all.maxCombo=Math.max(all.maxCombo,s.maxCombo);for(const k in all.judgements)all.judgements[k]+=s.judgements[k];}return all;}
function drawLoading(){rect(0,0,1280,720,'#000');letters(errorText?'oops':'loading',640,270,1.4,{align:'center'});text(errorText||`${SONGS[songIndex].name.toUpperCase()}  /  ${DIFFICULTIES[difficulty].toUpperCase()}`,640,420,26,'#fff','center');if(errorText){text('ENTER: RETRY     ESC: BACK',640,500,24,'#ff8dc8','center');newButton('load-retry','Retry loading song',200,450,880,120,()=>startSong(songIndex,story,story));}else text('GETTING THE STAGE READY'+'.'.repeat(Math.floor(frameTime/300)%4),640,483,20,'#888','center');newButton('load-back','Cancel loading',0,650,220,70,back);text('ESC: BACK',24,686,20);}

function navigate(delta){if(scene==='patch-notes'){patchPage=(patchPage+delta+PATCH_NOTES.length)%PATCH_NOTES.length;return;}if(scene==='gallery'){skyGallery.select(delta);return;}if(scene==='story'){storyWeek=(storyWeek+delta+WEEKS.length)%WEEKS.length;if(!storyDifficulties().includes(difficulty))difficulty=1;audio.sfx('scrollMenu',0.5);return;}if(scene==='freeplay'){const rows=freeplayRows(),i=rows.findIndex(s=>s.id===fp.selectedId);selectFreeplay(rows[(i+delta+rows.length)%rows.length].id);return;}const length=scene==='menu'?7:scene==='paused'?4:scene==='instrumental'?instrumentalOptions().length:1;selected=(selected+delta+length)%length;if(scene==='menu'&&selected===5&&settings.skyDisableMenus)selected=(selected+delta+length)%length;audio.sfx('scrollMenu',0.5);}
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
  if(scene==='editor'||scene==='mods'||event?.repeat)return;
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
  if(isKey&&scene==='menu'&&/^Key[A-Z]$/.test(code)){
    skySecret=(skySecret+code.at(-1)).slice(-3);
    if(skySecret==='SKY'){stop();skySecret='';launchSkySecret();return;}
  }
  if(isKey&&code==='Digit7'&&['play','paused','freeplay','story','results'].includes(scene)){stop();openChartEditor();return;}
  if(matches('fullscreen')){stop();toggleFullscreen();return;}
  if(matches('screenshot')){stop();preferences.captureScreenshot(canvas).catch(()=>{});return;}
  if(matches('debugDisplay')){
    stop();const values=['Off','Simple','Advanced'];settings.debugDisplay=values[(values.indexOf(settings.debugDisplay)+1)%values.length];saveSettings();return;
  }
  const lane=scene==='play'?noteLaneFor(settings,code,laneCount(),device):-1;
  if(lane>=0){stop();held.add(isKey?code:'pad'+lane);pressLane(lane);return;}
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
document.addEventListener('keyup',event=>{if(held.delete(event.code))releaseLane(laneFromCode(event.code));});
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
function tick(timestamp){const bounds=canvas.getBoundingClientRect();viewportWidth=Math.max(1,bounds.width);viewportAspect=viewportWidth/Math.max(1,bounds.height)/(1280/720);touchControls.update(scene==='play'&&mobileActive(),laneCount());frameTime=timestamp;const dt=clamp((timestamp-(lastFrame||timestamp))/1000,0,0.1);buttons=[];
  if(scene==='editor'||scene==='mods'){syncButtons();canvas.dataset.scene=scene;lastFrame=timestamp;scheduleFrame();return;}
  if(scene==='play'&&game&&lastFrame&&game.time>1000){game.frameTimes.push(timestamp-lastFrame);if(game.frameTimes.length>180)game.frameTimes.shift();}
  if(game&&Math.floor(timestamp/1000)!==Math.floor(lastFrame/1000)){const times=[...game.frameTimes].sort((a,b)=>a-b);canvas.dataset.frameP95=String(Math.round(times[Math.floor(times.length*0.95)]||0));canvas.dataset.frameMax=String(Math.round(times.at(-1)||0));canvas.dataset.character=game.character;canvas.dataset.level=game.choice.level;canvas.dataset.bpm=String(bpmAt(game.chart,game.time));canvas.dataset.lanes=String(game.laneCount);canvas.dataset.mobile=String(mobileActive());}
  gamepads.poll(gamepadInput);if(scene==='play')updateGame(dt);
  ctx.clearRect(0,0,1280,720);switch(scene){case'title':drawTitle();break;case'menu':drawMenu();break;case'story':drawStory();break;case'freeplay':drawFreeplay();break;case'character':drawCharacterSelect();break;case'instrumental':drawInstrumental();break;case'album':drawAlbum();break;case'settings':drawSettings();break;case'credits':drawCredits();break;case'loading':drawLoading();break;case'result-loading':rect(0,0,1280,720,'#000');letters('results',640,300,1.4,{align:'center'});break;case'intro':drawStorySequence();break;case'cutscene':drawExpandedSequence();break;case'gallery':drawSkyGallery();break;case'patch-notes':drawPatchNotes();break;case'play':drawGameplay();break;case'paused':drawPaused();break;case'gameover':drawGameOver();break;case'results':drawResults();break;}
  const interval=timestamp-lastFrame||16.67;
  drawDebugDisplay(ctx,settings,{fps:Math.round(1000/Math.max(1,interval)),frameMs:interval,scene,songTime:game?.time});
  sceneTransitions.draw(ctx,timestamp);if(transition>0){transition=Math.max(0,transition-dt);rect(0,0,1280,720,`rgba(0,0,0,${transition/0.22})`);}syncButtons();if(Math.floor(timestamp/250)!==Math.floor(lastFrame/250)){canvas.dataset.scene=scene;canvas.dataset.song=SONGS[songIndex].id;canvas.dataset.time=String(Math.round(game?.time||0));canvas.dataset.score=String(game?.stats.score||0);canvas.dataset.misses=String(game?.stats.misses||0);canvas.dataset.duration=String(Math.round(game?.duration||0));canvas.dataset.audioState=audio.ctx?.state||'idle';canvas.dataset.preview=fp.previewing?'playing':'idle';canvas.dataset.resultRank=scene==='results'?(nativeResults.rank||''):'';canvas.dataset.mode=game?.botplay?'autoplay':game?.practice?'practice':'standard';}lastFrame=timestamp;scheduleFrame();
}
async function boot(){const status=document.querySelector('#boot-status'),progress=document.querySelector('#boot-progress'),retry=document.querySelector('#boot-retry');try{retry.hidden=true;await Promise.all([nativeContent.load(),nativeExtras.load('picoCard'),assets.load(n=>{progress.value=Math.round(n*65);}),modernFreeplay.load(n=>{if(n===1)progress.value=100;}),fetch('variant-catalog.json').then(r=>r.json()).then(c=>{variantCatalog=c.variants;baseSongCatalog=c.baseSongs||[];if(!DIFFICULTIES.includes('Erect'))DIFFICULTIES.push('Erect','Nightmare');})]);await Promise.all([expandedContent.load(),expandedCutscenes.load(),loadExpandedMenu()]);for(const song of expandedContent.entries(builtinSongs))if(!builtinSongs.some(old=>old.id===song.id))builtinSongs.push(song);await modLibrary.init();refreshMods();for(const [atlas,frames] of Object.entries(assets.atlases)){for(const prefix of new Set(frames.filter(f=>f.name).map(f=>f.name.replace(/\d+$/,''))))assets.frames(atlas,prefix);}document.querySelector('#boot').hidden=true;canvas.focus();audio.playMenu();scheduleFrame();if(!renderWatchdog)renderWatchdog=setInterval(()=>{const now=performance.now();if(!document.hidden){const gap=now-lastFrame;if(gap>40)fallbackUntil=now+1500;if(gap>14&&now<fallbackUntil)tick(now);}},16);announce('Friday Night Funkin. Press Enter to begin.');}catch(e){console.error(e);status.textContent='Could not load the game. Serve this folder over HTTP and try again.';retry.hidden=false;retry.onclick=boot;}}
boot();
