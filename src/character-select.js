// Native character-select scene, extracted from the user's installed game.
// Replays original Animate timelines and spotlight video, with original music.
// Parent integration: stop other menu music, await load(), begin({character}),
// draw(ctx,{now: performance.now()}), route move/choose/confirm/cancel actions,
// and consumeResult() to return to that character's freeplay intro.
const CS_CLAMP=(v,a,b)=>Math.min(b,Math.max(a,v));
const CS_EXPO=t=>t>=1?1:1-Math.pow(2,-10*CS_CLAMP(t,0,1));
const CS_BACK=t=>2.70158*t*t*t-1.70158*t*t;
const CS_SLOTS={3:'pico',4:'bf',7:'sky'};
const CS_PARTNER={bf:'gfChill',pico:'neneChill'};
const CS_PLAYER={bf:'bfChill',pico:'picoChill',sky:'skyChill',locked:'lockedChill'};

export class CharacterSelect {
  constructor(base='charselect-'){
    this.base=base;this.ready=false;this.images={};this.animations={};this.atlases={};this.phase='inactive';this.slot=4;this.character='bf';this.original='bf';this.phaseAt=0;this.changedAt=-10000;this.deniedAt=-10000;this.deselectAt=-10000;this.previous=null;this.result=null;this.volume=0.7;this.reducedMotion=false;this.cursorX=560;this.cursorY=248;this.trailX=560;this.trailY=248;this.lastTime=0;this.sounds={};this.music=null;this.video=null;this.lastCommand='';
  }
  async load(progress=()=>{}){
    if(this.ready)return this;
    const response=await fetch(this.base+'charselect-pack.json');if(!response.ok)throw new Error('Character select assets could not load');const pack=await response.json();this.animations=pack.animations;this.atlases=pack.atlases;this.timing=pack.timing;
    const entries=Object.entries(pack.images);let complete=0;
    await Promise.all(entries.map(async([name,url])=>{const img=new Image();img.src=url;await img.decode();this.images[name]=img;progress(++complete/entries.length);}));
    for(const name of ['CS_Lights','CS_confirm','CS_select','CS_locked','static-loop','stayFunky-intro','stayFunky']){const el=new Audio(this.base+name+'.ogg');el.preload='auto';this.sounds[name]=el;el.load();}
    this.sounds['static-loop'].loop=true;this.sounds.stayFunky.loop=true;
    this.video=document.createElement('video');this.video.src=this.base+'introSelect.mp4';this.video.preload='auto';this.video.playsInline=true;this.video.setAttribute('playsinline','');this.video.onended=()=>{if(this.phase==='video')this.reveal(performance.now());};this.video.load();
    this.tintedCursors={};for(const color of ['#ffff00','#3c74f7','#3ebbff']){const off=document.createElement('canvas');off.width=this.images.cursor.width;off.height=this.images.cursor.height;const c=off.getContext('2d');c.drawImage(this.images.cursor,0,0);c.globalCompositeOperation='source-in';c.fillStyle=color;c.fillRect(0,0,off.width,off.height);this.tintedCursors[color]=off;}
    this.ready=true;return this;
  }
  begin({character='bf',volume=0.7,reducedMotion=false,playIntro=true,now=performance.now()}={}){
    this.stop();this.original=character in CS_PLAYER&&character!=='locked'?character:'bf';this.character=this.original;this.slot=Number(Object.keys(CS_SLOTS).find(slot=>CS_SLOTS[slot]===this.character));this.volume=CS_CLAMP(volume,0,1);this.reducedMotion=reducedMotion;this.phaseAt=now;this.changedAt=now-10000;this.deniedAt=-10000;this.deselectAt=-10000;this.previous=null;this.result=null;this.lastTime=now;this.cursorX=this.targetCursor().x;this.cursorY=this.targetCursor().y;this.trailX=this.cursorX;this.trailY=this.cursorY;
    if(playIntro&&!reducedMotion&&this.video){this.phase='video';this.video.currentTime=0;this.video.volume=this.volume;this.video.play().catch(()=>{if(this.phase==='video')this.reveal(performance.now());});}else this.reveal(now);
    return this;
  }
  reveal(now=performance.now()){
    if(this.video)this.video.pause();this.phase='reveal';this.phaseAt=now;this.themeAt=now;this.effect('CS_Lights',0.9);this.playTheme();
  }
  playTheme(){
    const intro=this.sounds['stayFunky-intro'],loop=this.sounds.stayFunky;if(!intro||!loop)return;
    intro.pause();loop.pause();intro.currentTime=0;loop.currentTime=0;intro.playbackRate=loop.playbackRate=1;intro.volume=loop.volume=this.volume;
    intro.onended=()=>{if(['reveal','choose','confirm'].includes(this.phase)){this.music=loop;loop.play().catch(()=>{});}};
    this.music=intro;intro.play().catch(()=>{this.music=loop;loop.play().catch(()=>{});});
  }
  effect(name,scale=1){const a=this.sounds[name];if(!a)return;a.pause();try{a.currentTime=0;}catch{}a.volume=CS_CLAMP(this.volume*scale,0,1);a.play().catch(()=>{});}
  setVolume(volume){this.volume=CS_CLAMP(volume,0,1);if(this.music&&!['confirm','exit'].includes(this.phase))this.music.volume=this.volume;}
  targetCursor(){const col=this.slot%3-1,row=Math.floor(this.slot/3)-1;return{x:110*col+640-this.images.cursor.width/2-16,y:110*row+360-this.images.cursor.height/2-48};}
  move(dx,dy,now=performance.now()){
    if(!['choose','reveal'].includes(this.phase))return false;
    let x=this.slot%3,y=Math.floor(this.slot/3);x=(x+dx+3)%3;y=(y+dy+3)%3;return this.choose(y*3+x,now);
  }
  choose(slot,now=performance.now(),acceptIfSame=false){
    if(!['choose','reveal'].includes(this.phase))return false;slot=CS_CLAMP(Math.round(slot),0,8);if(slot===this.slot){if(acceptIfSame)return this.confirm(now);return true;}
    const before=this.character;this.slot=slot;this.character=CS_SLOTS[slot]||'locked';this.deniedAt=-10000;this.deselectAt=-10000;this.effect('CS_select',0.7);
    if(before!==this.character){this.previous=before;this.changedAt=now;if(this.character==='locked'){const s=this.sounds['static-loop'];s.volume=this.volume*0.3;s.play().catch(()=>{});}else this.sounds['static-loop']?.pause();}
    return true;
  }
  confirm(now=performance.now()){
    if(this.phase==='video'){this.reveal(now);return true;}
    if(!['choose','reveal'].includes(this.phase))return false;
    if(this.character==='locked'){this.deniedAt=now;this.effect('CS_locked',0.9);return false;}
    this.phase='confirm';this.phaseAt=now;this.effect('CS_confirm',0.9);this.sounds['static-loop']?.pause();return true;
  }
  cancel(now=performance.now()){
    if(this.phase==='video'){this.reveal(now);return true;}
    if(this.phase==='confirm'){this.phase='choose';this.phaseAt=now;this.deselectAt=now;if(this.music){this.music.playbackRate=1;this.music.volume=this.volume;}return true;}
    if(['choose','reveal'].includes(this.phase)){this.cancelled=true;this.startExit(now);return true;}return false;
  }
  handleKey(code,now=performance.now()){
    if(code==='ArrowLeft'||code==='KeyA')return this.move(-1,0,now);
    if(code==='ArrowRight'||code==='KeyD')return this.move(1,0,now);
    if(code==='ArrowUp'||code==='KeyW')return this.move(0,-1,now);
    if(code==='ArrowDown'||code==='KeyS')return this.move(0,1,now);
    if(code==='Enter'||code==='Space')return this.confirm(now);
    if(code==='Escape'||code==='Backspace')return this.cancel(now);return false;
  }
  startExit(now){this.exitPose=this.phase==='confirm'?'select':'idle';this.phase='exit';this.phaseAt=now;this.sounds['static-loop']?.pause();}
  update(now){
    const elapsed=now-this.phaseAt;
    if(this.phase==='reveal'&&elapsed>=this.timing.reveal){this.phase='choose';this.phaseAt=now;}
    if(this.phase==='confirm'){
      const t=CS_CLAMP(elapsed/this.timing.confirm,0,1);if(this.music){this.music.volume=this.volume*(1-t*t);try{this.music.playbackRate=Math.max(0.1,1-0.9*CS_CLAMP(elapsed/1000,0,1));}catch{}}
      if(elapsed>=this.timing.confirm)this.startExit(now);
    }
    if(this.phase==='exit'){
      const exitElapsed=now-this.phaseAt,t=CS_CLAMP(exitElapsed/this.timing.exit,0,1);if(this.music)this.music.volume=this.volume*(1-t)*0.15;if(exitElapsed>=this.timing.exit){const cancelled=!!this.cancelled,selected=cancelled?this.original:this.character;this.stop();this.phase='complete';this.result={character:selected,cancelled};}
    }
    const step=CS_CLAMP((now-this.lastTime)/1000,0,0.1);const target=this.targetCursor();const l=1-Math.pow(0.01,step/0.1),trail=1-Math.pow(0.01,step/0.3);this.cursorX+=(target.x-this.cursorX)*l;this.cursorY+=(target.y-this.cursorY)*l;this.trailX+=(target.x-this.trailX)*trail;this.trailY+=(target.y-this.trailY)*trail;this.lastTime=now;
  }
  consumeResult(){const result=this.result;this.result=null;return result;}
  stop(){for(const a of Object.values(this.sounds)){a.pause();a.onended=null;try{a.currentTime=0;a.playbackRate=1;}catch{}}this.video?.pause();this.music=null;this.cancelled=false;this.phase='inactive';}
  frameIndex(name,label,time,loop=true){const a=this.animations[name];if(!a)return 0;const[start,length]=a.labels[label]||[0,a.frames.length];const index=Math.floor(Math.max(0,time)*Number(a.fps||24)/1000);return start+(loop?index%Math.max(1,length):Math.min(length-1,index));}
  animation(ctx,name,label,time,{x=0,y=0,scale=1,loop=true,alpha=1,index=null}={}){
    const data=this.animations[name],image=this.images[name];if(!data||!image)return;
    const commands=data.frames[index??this.frameIndex(name,label,time,loop)]||[];ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.globalAlpha*=alpha;
    if(name==='skyChill'&&data.stageMatrix)ctx.transform(...data.stageMatrix);
    for(const command of commands){const[sx,sy,w,h]=command.r;ctx.save();ctx.globalAlpha*=command.a??1;ctx.transform(...command.m);ctx.drawImage(image,sx,sy,w,h,0,0,w,h);ctx.restore();}ctx.restore();
  }
  image(ctx,name,x,y,scale=1,alpha=1){const image=this.images[name];if(!image)return;ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(image,x,y,image.width*scale,image.height*scale);ctx.restore();}
  sprite(ctx,name,prefix,x,y,scale=1,time=0,loop=true){const list=(this.atlases[name]||[]).filter(f=>f.name.startsWith(prefix));if(!list.length)return;const index=Math.floor(time*24/1000),f=list[loop?index%list.length:Math.min(index,list.length-1)];ctx.drawImage(this.images[name],f.x,f.y,f.width,f.height,x-(f.frameX||0)*scale,y-(f.frameY||0)*scale,f.width*scale,f.height*scale);}
  player(ctx,character,now,phase){
    const atlas=CS_PLAYER[character],elapsed=now-this.phaseAt,changed=now-this.changedAt;
    if(phase==='confirm'||phase==='exit'&&this.exitPose==='select'){this.animation(ctx,atlas,'select',phase==='confirm'?elapsed:this.timing.confirm+elapsed,{loop:false});return;}
    if(character==='locked'&&now-this.deniedAt<4/24*1000){this.animation(ctx,atlas,'cannot select Label',now-this.deniedAt,{loop:false});return;}
    if(now-this.deselectAt<1000){const first=this.animations[atlas].labels.deselect?.[1]||2,duration=first/24*1000;this.animation(ctx,atlas,now-this.deselectAt<duration?'deselect':'deselect loop start',now-this.deselectAt<duration?now-this.deselectAt:now-this.deselectAt-duration,{loop:true});return;}
    if(changed<0.8*1000){const length=(this.animations[atlas]?.labels.slidein?.[1]||8)/24*1000;this.animation(ctx,atlas,changed<length?'slidein':'slidein idle point',changed<length?changed:changed-length,{loop:false});return;}
    // Native BF/Pico idles play once at each 90 BPM beat, holding their last
    // frame until the next beat instead of cycling the five-frame head bob.
    const beatPhase=Math.max(0,now-this.themeAt)%666.666667;
    this.animation(ctx,atlas,'idle',character==='locked'?now:beatPhase,{loop:character==='locked'});
  }
  draw(ctx,{now=performance.now(),reducedMotion=this.reducedMotion,volume=this.volume}={}){
    if(!this.ready){ctx.fillStyle='#000';ctx.fillRect(0,0,1280,720);return[];}this.setVolume(volume);this.update(now);const targets=[];
    if(this.phase==='video'){
      ctx.fillStyle='#000';ctx.fillRect(0,0,1280,720);if(this.video.readyState>=2)ctx.drawImage(this.video,0,0,1280,720);
      targets.push({id:'cs-skip-video',label:'Skip spotlight introduction',x:0,y:0,w:1280,h:720,action:'skip'});return targets;
    }
    if(this.phase==='complete'||this.phase==='inactive'){ctx.fillStyle='#000';ctx.fillRect(0,0,1280,720);return targets;}
    const elapsed=now-this.phaseAt,enter=this.phase==='reveal'?1-CS_EXPO(elapsed/1500):0,exit=this.phase==='exit'?CS_BACK(CS_CLAMP(elapsed/800,0,1)):0;
    const cameraY=reducedMotion?0:150*(enter+exit),panelIn=this.phase==='reveal'?1-CS_EXPO(elapsed/1000):0,panelY=(reducedMotion?0:panelIn+exit)*200;
    const selectedColumn=this.slot%3-1,selectedRow=Math.floor(this.slot/3)-1,panX=reducedMotion?0:selectedColumn*6,panY=reducedMotion?0:selectedRow*6;
    ctx.save();ctx.fillStyle='#122329';ctx.fillRect(0,0,1280,720);ctx.translate(-panX,cameraY-panY);
    this.image(ctx,'bg',-153+panX*0.9,-140+panY*0.9);this.animation(ctx,'crowd','',now,{x:panX*0.7,y:panY*0.7});this.animation(ctx,'charSelectStage','',now,{x:-2,y:1});this.image(ctx,'curtains',-212-panX*0.4,-99-panY*0.4);
    this.image(ctx,'light',800,250);this.image(ctx,'light',180,240);
    const partner=CS_PARTNER[this.character];if(partner){let label=(this.phase==='confirm'||this.phase==='exit'&&this.exitPose==='select')?'confirm':now-this.deselectAt<1000?'deselect':'idle';const partnerTime=label==='confirm'?now-this.phaseAt:label==='deselect'?now-this.deselectAt:Math.max(0,now-this.themeAt)%1333.333334;this.animation(ctx,partner,label,partnerTime,{loop:label==='confirm'});}
    if(this.previous&&now-this.changedAt<100){this.animation(ctx,CS_PLAYER[this.previous],'slideout',now-this.changedAt,{loop:false});}
    this.player(ctx,this.character,now,this.phase);
    this.animation(ctx,'charSelectSpeakers','',now,{x:-10-panX*0.8,y:-panY*0.8,scale:1.05});
    ctx.save();ctx.globalCompositeOperation='multiply';this.image(ctx,'foreground',-125,170);ctx.restore();ctx.restore();
    // Header and center choice panel remain fixed to the camera like the native UI.
    ctx.save();ctx.translate(0,panelY);ctx.save();ctx.globalCompositeOperation='multiply';this.animation(ctx,'barThing','',now,{scale:1});ctx.restore();
    ctx.save();ctx.globalCompositeOperation='lighter';this.sprite(ctx,'blur','CHOOSE vertical offset instance 1',419,-65,1,now);this.sprite(ctx,'backing','CHOOSE horizontal offset instance 1',423,-17,1,now);ctx.restore();this.image(ctx,'choose',426,-13);
    const name=this.images[this.character+'Name']||this.images.lockedName;const nameScale=0.77;ctx.drawImage(name,1008-name.width*nameScale/2,100-name.height*nameScale/2,name.width*nameScale,name.height*nameScale);
    for(let i=0;i<9;i++){
      const x=450+(i%3)*107,y=120+Math.floor(i/3)*127;const character=CS_SLOTS[i];
      if(character==='sky'){if(this.images.skyIcon)ctx.drawImage(this.images.skyIcon,0,0,this.images.skyIcon.height,this.images.skyIcon.height,x+20,y+22,80,80);}
      else if(character){const atlas=character==='bf'?'bfIcon':'picoIcon',list=this.atlases[atlas]||[],prefix=i===this.slot?'idle':'idle';const frame=list.find(f=>f.name.toLowerCase().startsWith(prefix))||list[0];if(frame){ctx.save();ctx.imageSmoothingEnabled=false;const b=i===this.slot&&!reducedMotion?1+Math.max(0,1-(now/666.666%1)*4)*0.04:1;const scale=128/(frame.frameWidth||frame.width)*b;ctx.drawImage(this.images[atlas],frame.x,frame.y,frame.width,frame.height,x-(frame.frameX||0)*scale,y-(frame.frameY||0)*scale,frame.width*scale,frame.height*scale);ctx.restore();}}
      else {const animation=i===this.slot?(now-this.deniedAt<500?'clicked':'selected'):'idle';this.animation(ctx,'lock',animation,animation==='clicked'?now-this.deniedAt:now,{x:x-238.75,y:y-148.6});}
      if(['choose','reveal'].includes(this.phase))targets.push({id:'cs-slot-'+i,label:character?`Choose ${{bf:'Boyfriend',pico:'Pico',sky:'Sky'}[character]}`:'Locked character slot',x:x+12,y:y+12,w:98,h:106,action:'slot',value:i});
    }
    const cursorAlpha=this.phase==='exit'?1-CS_CLAMP(elapsed/800,0,1):1;ctx.globalAlpha=cursorAlpha;
    if(this.phase==='confirm'||this.phase==='exit')this.sprite(ctx,'confirmCursor','cursor ACCEPTED instance 1',this.cursorX-2,this.cursorY-4,1,this.phase==='confirm'?elapsed:1500+elapsed);
    else {ctx.save();ctx.globalCompositeOperation='screen';ctx.drawImage(this.tintedCursors['#3c74f7'],this.trailX,this.trailY);ctx.drawImage(this.tintedCursors['#3ebbff'],(this.trailX+this.cursorX)/2,(this.trailY+this.cursorY)/2);ctx.restore();ctx.drawImage(this.tintedCursors['#ffff00'],this.cursorX,this.cursorY);if(now-this.deniedAt<500)this.sprite(ctx,'deniedCursor','cursor DENIED instance 1',this.cursorX-2,this.cursorY-4,1,now-this.deniedAt,false);}
    ctx.restore();
    if(this.phase==='exit'){
      const t=CS_CLAMP(elapsed/800,0,1);ctx.save();ctx.globalAlpha=t*t;ctx.fillStyle='#084a9a';ctx.fillRect(0,0,1280,720);ctx.restore();const g=ctx.createLinearGradient(0,720*(1-t)-120,0,720*(1-t)+160);g.addColorStop(0,'#000');g.addColorStop(1,'#0000');ctx.fillStyle=g;ctx.fillRect(0,0,1280,720);
    }else if(this.phase==='reveal'&&!reducedMotion){const t=CS_CLAMP(elapsed/800,0,1);ctx.save();ctx.globalAlpha=(1-t)*(1-t);ctx.fillStyle='#0c326f';ctx.fillRect(0,0,1280,720);ctx.restore();}
    if(['choose','reveal'].includes(this.phase)){
      targets.push({id:'cs-confirm',label:this.character==='locked'?'Locked character':'Confirm '+({bf:'Boyfriend',pico:'Pico',sky:'Sky'}[this.character]),x:830,y:170,w:390,h:430,action:'confirm'});
      targets.push({id:'cs-back',label:'Return to previous character',x:0,y:655,w:210,h:65,action:'back'});
    }
    return targets;
  }
}
