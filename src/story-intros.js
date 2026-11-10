// Replays the installed 0.8.6 dialogue data and native pixel atlases.
// Parent draws its stage first, then draw(ctx,{now}); parent starts countdown at done=true.
const STORY_INTRO_CLAMP=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const STORY_INTRO_STEP=(x,n)=>Math.floor(STORY_INTRO_CLAMP(x)*n)/n;
function storyIntroColor(value){const v=String(value||'#000000').replace('#','');return v.length===8?{rgb:'#'+v.slice(2),alpha:parseInt(v.slice(0,2),16)/255}:{rgb:'#'+v,alpha:1};}
function storyIntroSubtitles(source){const time=t=>{const [h,m,ss]=t.split(':');return(Number(h)*3600+Number(m)*60+Number(ss.replace(',','.')))*1000;};return String(source||'').trim().split(/\r?\n\s*\r?\n/).flatMap(block=>{const lines=block.split(/\r?\n/),index=lines.findIndex(line=>line.includes('-->'));if(index<0)return[];const [a,b]=lines[index].split('-->').map(s=>s.trim());return[{start:time(a),end:time(b),text:lines.slice(index+1).join(' ')}];});}

export class StoryIntros {
  constructor(base='story-intros-'){
    this.base=base;this.ready=false;this.done=true;this.phase='inactive';this.images={};this.groups=new Map();this.sounds={};this.textPool=[];this.volume=0.7;this.cameraZoom=1;this.cameraFocus=null;this.hudAlpha=1;
  }
  async load(songId){
    if(this.ready){if(songId==='eggnog-erect-outro')await this.loadEggnog();if(songId.endsWith('-sky'))await this.loadSky();return this;}
    if(this.loading){await this.loading;if(songId==='eggnog-erect-outro')await this.loadEggnog();if(songId.endsWith('-sky'))await this.loadSky();return this;}
    this.loading=(async()=>{
      const response=await fetch(this.base+'pack.json');if(!response.ok)throw new Error('Story intro assets could not load');
      this.pack=await response.json();
      await Promise.all(Object.entries(this.pack.images).map(async([name,url])=>{const image=new Image();image.src=url;await image.decode();this.images[name]=image;}));
      if(typeof FontFace!=='undefined'){try{const font=new FontFace('StoryPixel',`url(${this.pack.font})`);await font.load();document.fonts.add(font);}catch{}}
      for(const [name,data] of Object.entries(this.pack.audio)){const audio=new Audio(this.base+data.file);audio.preload='auto';audio.load();this.sounds[name]=audio;}
      for(let i=0;i<6;i++){const audio=new Audio(this.base+this.pack.audio.pixelText.file);audio.preload='auto';audio.load();this.textPool.push(audio);}
      this.ready=true;return this;
    })();
    try{await this.loading;if(songId==='eggnog-erect-outro')await this.loadEggnog();if(songId.endsWith('-sky'))await this.loadSky();return this;}catch(error){this.loading=null;throw error;}
  }
  async loadSky(){
    if(this.skyLoaded)return;
    const response=await fetch('assets/expanded/dialogue-pack.json');
    if(!response.ok)throw new Error('Sky dialogue assets could not load');
    const pack=await response.json();
    await Promise.all(Object.entries(pack.images).map(async([name,url])=>{const image=new Image();image.src=url;await image.decode();this.images[name]=image;}));
    for(const key of ['conversations','speakers','atlases'])Object.assign(this.pack[key],pack[key]);
    this.skyLoaded=true;
  }
  async loadEggnog(){
    if(this.pack.eggnog)return;
    if(this.eggnogLoading)return this.eggnogLoading;
    this.eggnogLoading=(async()=>{const response=await fetch(this.base+'eggnog-pack.json');if(!response.ok)throw new Error('Eggnog Erect cutscene assets could not load');const pack=await response.json();await Promise.all(Object.entries(pack.images).map(async([name,url])=>{const image=new Image();image.src=url;await image.decode();this.images[name]=image;}));for(const [name,data] of Object.entries(pack.audio)){const audio=new Audio(this.base+data.file);audio.preload='auto';audio.load();this.sounds[name]=audio;}this.pack.eggnog=pack;})();
    try{await this.eggnogLoading;}catch(error){this.eggnogLoading=null;throw error;}
  }
  static shouldPlay(songId,{story=true,character='bf',variation='',retry=false,charting=false}={}){
    if(songId==='eggnog-erect-outro')return !charting;
    if(retry||charting)return false;
    if(['senpai-sky','roses-sky','thorns-sky'].includes(songId))return true;
    if(songId==='winter-horrorland')return true;
    if(!['senpai','roses','thorns'].includes(songId))return false;
    return story||((character==='pico'||variation==='pico')&&songId!=='thorns');
  }
  begin(songId,{now=performance.now(),volume=0.7,reducedMotion=false,character='bf',variation='',story=true,retry=false,charting=false,censored=false,cameraStart=[1000,400],cameraStartZoom=0.8,subtitles=true}={}){
    this.stop();this.songId=songId;this.volume=STORY_INTRO_CLAMP(volume);this.reducedMotion=reducedMotion;this.started=now;this.phaseAt=now;this.lastNow=now;this.done=true;
    if(!StoryIntros.shouldPlay(songId,{story,character,variation,retry,charting}))return false;
    if(!this.ready)throw new Error('Call await storyIntros.load(songId) before begin().');
    const pico=character==='pico'||variation==='pico';this.conversationId=songId+(pico&&songId!=='thorns'?'-pico':'')+(censored&&['roses','roses-sky'].includes(songId)?'-censored':'');
    this.conversation=this.pack.conversations[this.conversationId]||null;this.pages=[];
    for(const [entryIndex,entry] of (this.conversation?.dialogue||[]).entries())for(let part=0;part<(entry.text||[]).length;part++)this.pages.push({entry,entryIndex,part,prefix:entry.text.slice(0,part).join(''),text:entry.text.slice(0,part+1).join('')});
    this.pageIndex=0;this.done=false;this.phase=songId.startsWith('roses')?'dialogue':'intro';this.typedChars=0;this.forcedFull=false;this.lastBlip=-9999;this.deathPlayed=false;this.lightsPlayed=false;this.music=null;this.musicId='';this.cameraZoom=1;this.cameraFocus=null;this.hudAlpha=0;
    this.hideActors=[];this.hideProps=[];
    if(songId==='eggnog-erect-outro'){
      if(!this.pack.eggnog)throw new Error('Call await storyIntros.load("eggnog-erect-outro") first.');
      this.phase='eggnog-outro';this.introDuration=16000;this.cameraStart=cameraStart;this.cameraStartZoom=cameraStartZoom;this.showSubtitles=subtitles;this.subtitleEntries=storyIntroSubtitles(this.pack.eggnog.subtitles);this.hideActors=['opponent'];this.hideProps=['santa'];this.skipArmedAt=null;this.skipTextAt=null;this.shotPlayed=false;this.effect('santa_emotion');return true;
    }
    if(songId.startsWith('roses')){this.effect('ANGRY_TEXT_BOX');this.startDialogue(now);}
    else if(songId==='winter-horrorland')this.introDuration=100+(this.pack.audio.Lights_Turn_On.durationMs||4643);
    else if(songId==='thorns')this.introDuration=reducedMotion?250:2100+(this.pack.audio.Senpai_Dies.durationMs||7333)+1600;
    else this.introDuration=reducedMotion?250:2250;
    return true;
  }
  effect(name,gain=1){const audio=this.sounds[name];if(!audio)return;try{audio.pause();audio.currentTime=0;audio.volume=this.volume*STORY_INTRO_CLAMP(gain);audio.play().catch(()=>{});}catch{}}
  setMusic(name,now){
    if(this.musicId===name&&this.music)return;
    if(this.music){this.music.pause();this.music.currentTime=0;}
    this.musicId=name;this.music=this.sounds[name]||null;this.musicAt=now;
    if(this.music){this.music.loop=!!this.conversation?.music?.looped;this.music.volume=0;this.music.currentTime=0;this.music.play().catch(()=>{});}
  }
  startDialogue(now){
    if(!this.conversation||!this.pages.length){this.finish();return;}
    this.phase='dialogue';this.phaseAt=now;this.dialogueAt=now;this.cameraZoom=1;this.cameraFocus=null;
    this.setMusic(this.conversation.music?.asset||'',now);this.startPage(now,true);
  }
  frames(atlas,prefix){const key=atlas+'|'+prefix;if(!this.groups.has(key))this.groups.set(key,(this.pack.atlases[atlas]||[]).filter(frame=>frame.name.startsWith(prefix)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})));return this.groups.get(key);}
  animation(meta,name){return meta?.animations?.find(anim=>anim.name===name)||meta?.animations?.find(anim=>anim.name==='idle')||meta?.animations?.[0];}
  animationDuration(meta,name){const animation=this.animation(meta,name);if(!animation)return 0;return (animation.frameIndices?.length||this.frames(meta.atlas,animation.prefix).length)/(animation.frameRate||24)*1000;}
  startPage(now,first=false){
    const previous=this.page,page=this.pages[this.pageIndex];this.page=page;this.forcedFull=false;this.typedChars=page.prefix.length;this.lineAt=now;
    const box=this.pack.boxes[page.entry.box],sameEntry=previous?.entryIndex===page.entryIndex;
    this.boxAnimation=first?(page.entry.boxAnimation||'enter'):sameEntry?'speaking':'click';this.boxAt=now;
    this.typingAt=now+(sameEntry?0:this.animationDuration(box,this.boxAnimation));this.speakerAt=this.typingAt;
    this.completedAt=null;
    if(page.entry.box==='roses'&&!sameEntry)this.effect('textboxClick',0.6);
    // Original Senpai/Pico conversation pauses the music for the bewildered portrait.
    if(['senpai-pico','senpai-sky'].includes(this.conversationId)){
      if(page.entry.speaker==='senpai-bwuh')this.setMusic('',now);
      else if(['senpai','sky-pixel'].includes(page.entry.speaker)&&!this.music)this.setMusic('Lunchbox',now);
    }
  }
  currentText(now){
    if(!this.page)return'';const page=this.page,delay=Math.max(1,(page.entry.speed??1)*50),count=this.forcedFull?page.text.length:page.prefix.length+Math.floor(Math.max(0,now-this.typingAt)/delay);
    return page.text.slice(0,Math.min(page.text.length,count));
  }
  advance(now=performance.now()){
    this.update(now);
    if(this.done)return;
    if(this.phase==='eggnog-outro'){
      if(this.skipArmedAt===null){this.skipArmedAt=now+500;this.skipTextAt=now;}
      else if(now>=this.skipArmedAt){this.phase='eggnog-skip';this.phaseAt=now;this.sounds.santa_emotion?.pause();this.sounds.santa_shot_n_falls?.pause();}
      return;
    }
    if(this.phase==='eggnog-skip')return;
    if(this.phase==='intro')return;
    if(this.phase==='outro'){this.finish();return;}
    if(this.currentText(now).length<this.page.text.length){this.forcedFull=true;this.typingAt=Math.min(this.typingAt,now);return;}
    if(this.pageIndex+1<this.pages.length){this.pageIndex++;this.startPage(now);}
    else{this.phase='outro';this.phaseAt=now;this.boxAnimation='exit';this.boxAt=now;}
  }
  skip(now=performance.now()){this.finish();}
  finish(){this.stop();this.done=true;this.phase='complete';}
  stop(){for(const audio of [...Object.values(this.sounds),...this.textPool]){audio.pause();try{audio.currentTime=0;}catch{}}this.music=null;this.musicId='';this.phase='inactive';this.done=true;this.cameraZoom=1;this.cameraFocus=null;this.hudAlpha=1;this.hideActors=[];this.hideProps=[];}
  update(now=performance.now()){
    this.lastNow=now;if(this.done)return;
    if(this.phase==='eggnog-outro'||this.phase==='eggnog-skip'){
      const elapsed=now-this.started;
      const expo=t=>t>=1?1:1-Math.pow(2,-10*STORY_INTRO_CLAMP(t)),quad=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,quart=t=>t<.5?8*t*t*t*t:1-Math.pow(-2*t+2,4)/2;
      let x=this.cameraStart[0]+(-100-this.cameraStart[0])*expo(elapsed/2800),y=this.cameraStart[1]+(400-this.cameraStart[1])*expo(elapsed/2800),zoom=this.cameraStartZoom+(.73-this.cameraStartZoom)*quad(STORY_INTRO_CLAMP(elapsed/2000));
      if(elapsed>=2800){const p=quart(STORY_INTRO_CLAMP((elapsed-2800)/9000));x=-100-150*p;y=400;zoom=.73+.06*quad(STORY_INTRO_CLAMP((elapsed-2800)/9000));}
      if(elapsed>=12830){const p=expo((elapsed-12830)/5000);x=-250+10*p;y=400+80*p;}
      if(this.reducedMotion){x=-170;y=430;zoom=.72;}
      this.cameraFocus=[x,y];this.cameraZoom=zoom;
      if(elapsed>=11375&&!this.shotPlayed&&this.phase==='eggnog-outro'){this.shotPlayed=true;this.effect('santa_shot_n_falls');}
      if((this.phase==='eggnog-skip'&&now-this.phaseAt>=500)||elapsed>=16000)this.finish();
      return;
    }
    if(this.phase==='intro'){
      const elapsed=now-this.started;
      if(this.songId==='winter-horrorland'){
        this.cameraZoom=this.reducedMotion?1:2.5;this.cameraFocus=this.reducedMotion?null:[400,-2050];
        if(elapsed>=100&&!this.lightsPlayed){this.lightsPlayed=true;this.effect('Lights_Turn_On');}
      }
      if(this.songId==='thorns'&&!this.reducedMotion&&elapsed>=2100&&!this.deathPlayed){this.deathPlayed=true;this.effect('Senpai_Dies');}
      if(elapsed>=this.introDuration){if(this.songId==='winter-horrorland')this.finish();else this.startDialogue(now);}
      return;
    }
    const fadeMs=(this.conversation?.music?.fadeTime||0)*1000;
    let musicGain=fadeMs?STORY_INTRO_CLAMP((now-this.musicAt)/fadeMs):1;
    if(this.phase==='outro'){
      const duration=(this.conversation?.outro?.fadeTime??1)*1000;musicGain*=1-STORY_INTRO_CLAMP((now-this.phaseAt)/duration);
      if(now-this.phaseAt>=duration){this.finish();return;}
    }
    if(this.music)this.music.volume=this.volume*musicGain;
    if(this.phase==='dialogue'&&now>=this.typingAt){
      const text=this.currentText(now),count=text.length;
      if(count>this.typedChars&&now-this.lastBlip>32&&!this.forcedFull&&/\S/.test(text.at(-1)||'')){
        const audio=this.textPool[(this.blipIndex=(this.blipIndex||0)+1)%this.textPool.length];if(audio){try{audio.pause();audio.currentTime=0;audio.volume=this.volume*0.6;audio.play().catch(()=>{});}catch{}}this.lastBlip=now;
      }
      this.typedChars=count;
      if(count===this.page.text.length&&this.completedAt===null){this.completedAt=now;this.boxAnimation='sentenceEnd';this.boxAt=now;}
    }
  }
  drawSprite(ctx,atlas,frame,x,y,scale=1,{flipX=false,flipY=false,alpha=1}={}){
    if(!frame||!this.images[atlas])return;ctx.save();ctx.globalAlpha*=alpha;ctx.imageSmoothingEnabled=false;
    if(flipX||flipY){ctx.translate(x+(flipX?(frame.frameWidth||frame.width)*scale:0),y+(flipY?(frame.frameHeight||frame.height)*scale:0));ctx.scale(flipX?-1:1,flipY?-1:1);x=0;y=0;}
    ctx.drawImage(this.images[atlas],frame.x,frame.y,frame.width,frame.height,x-(frame.frameX||0)*scale,y-(frame.frameY||0)*scale,frame.width*scale,frame.height*scale);ctx.restore();
  }
  drawAnimation(ctx,meta,name,time,x,y,scale){
    const anim=this.animation(meta,name);if(!anim)return;const frames=this.frames(meta.atlas,anim.prefix),indices=anim.frameIndices||frames.map((_,i)=>i);if(!indices.length)return;
    const cursor=Math.floor(Math.max(0,time)*(anim.frameRate||24)/1000),index=indices[anim.looped?cursor%indices.length:Math.min(indices.length-1,cursor)],offset=anim.offsets||[0,0];this.drawSprite(ctx,meta.atlas,frames[index],x+offset[0],y+offset[1],scale,{flipX:!!meta.flipX!==!!anim.flipX,flipY:!!meta.flipY!==!!anim.flipY});
  }
  drawIntro(ctx,now){
    const elapsed=now-this.started;
    if(this.songId==='winter-horrorland'){if(elapsed<100){ctx.fillStyle='#000';ctx.fillRect(0,0,1280,720);}return;}
    if(this.reducedMotion){ctx.fillStyle=`rgba(0,0,0,${1-STORY_INTRO_CLAMP(elapsed/250)})`;ctx.fillRect(0,0,1280,720);return;}
    if(['senpai','senpai-sky','thorns-sky'].includes(this.songId)){ctx.fillStyle=`rgba(0,0,0,${elapsed<250?1:1-STORY_INTRO_STEP((elapsed-250)/2000,12)})`;ctx.fillRect(0,0,1280,720);return;}
    if(this.songId==='thorns'){
      const deathAt=2100,deathEnd=deathAt+(this.pack.audio.Senpai_Dies.durationMs||7333),whiteAt=deathAt+3200;
      if(elapsed>=deathEnd){ctx.fillStyle=`rgba(0,0,0,${1-STORY_INTRO_STEP((elapsed-deathEnd)/1400,6)})`;ctx.fillRect(0,0,1280,720);return;}
      ctx.fillStyle=elapsed>=whiteAt+1400?'#fff':'#ff1b31';ctx.fillRect(0,0,1280,720);
      if(elapsed<whiteAt+1400){const frames=this.frames('senpaiCrazy','Senpai Pre Explosion instance 1'),frame=frames[Math.min(frames.length-1,Math.floor(Math.max(0,elapsed-deathAt)*24/1000))],scale=6,fw=(frame?.frameWidth||frame?.width||1)*scale,fh=(frame?.frameHeight||frame?.height||1)*scale;this.drawSprite(ctx,'senpaiCrazy',frame,(1280-fw)/2+fw/5,(720-fh)/2,scale,{alpha:Math.min(1,Math.floor(elapsed/300)*0.15)});}
      if(elapsed>=whiteAt&&elapsed<whiteAt+1400){ctx.fillStyle=`rgba(255,255,255,${STORY_INTRO_STEP((elapsed-whiteAt)/1400,8)})`;ctx.fillRect(0,0,1280,720);}
      if(elapsed>=whiteAt+1400){ctx.fillStyle=`rgba(0,0,0,${STORY_INTRO_STEP((elapsed-whiteAt-1400)/800,8)})`;ctx.fillRect(0,0,1280,720);}
    }
  }
  drawEggnog(ctx,now){
    ctx.imageSmoothingEnabled=true;
    const elapsed=now-this.started,[cx,cy]=this.cameraFocus||[-100,400],zoom=this.cameraZoom;
    ctx.save();ctx.translate(640,360);ctx.scale(zoom,zoom);ctx.translate(-cx,-cy);
    for(const id of ['parentsCutscene','santaCutscene']){const animation=this.pack.eggnog.animations[id],index=Math.min(animation.frames.length-1,Math.floor(Math.max(0,elapsed)*animation.fps/1000)),position=animation.position,bounds=animation.bounds;ctx.save();ctx.translate(position[0]-bounds[0],position[1]-bounds[1]);for(const command of animation.frames[index]){ctx.save();ctx.globalAlpha*=command.a??1;ctx.transform(...command.m);const [x,y,w,h]=command.r;if(command.rotated){ctx.translate(0,w);ctx.rotate(-Math.PI/2);}ctx.drawImage(this.images[id],x,y,w,h,0,0,w,h);ctx.restore();}ctx.restore();}ctx.restore();
    if(this.showSubtitles){const subtitle=this.subtitleEntries.find(s=>elapsed>=s.start&&elapsed<s.end);if(subtitle){ctx.font='26px VCR,monospace';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillStyle='#000b';const width=ctx.measureText(subtitle.text).width;ctx.fillRect(640-width/2-14,633,width+28,43);ctx.fillStyle='#fff';ctx.fillText(subtitle.text,640,670);ctx.textAlign='left';}}
    let black=elapsed>=15000?STORY_INTRO_CLAMP((elapsed-15000)/1000):0;if(this.phase==='eggnog-skip')black=Math.max(black,STORY_INTRO_CLAMP((now-this.phaseAt)/500));if(black){ctx.fillStyle=`rgba(0,0,0,${black})`;ctx.fillRect(0,0,1280,720);}
    if(this.skipTextAt!==null&&this.phase!=='eggnog-skip'){ctx.save();ctx.globalAlpha=STORY_INTRO_CLAMP((now-this.skipTextAt)/500);ctx.font='26px VCR,monospace';ctx.textAlign='right';ctx.strokeStyle='#000';ctx.lineWidth=4;ctx.strokeText('Skip [ENTER / TAP]',1240,640);ctx.fillStyle='#fff';ctx.fillText('Skip [ENTER / TAP]',1240,640);ctx.restore();}
  }
  wrapText(ctx,text,width){const lines=[];let line='';for(const word of text.split(' ')){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>width){lines.push(line);line=word;}else line=next;}lines.push(line);return lines;}
  draw(ctx,{now=performance.now(),volume=this.volume}={}){
    this.volume=STORY_INTRO_CLAMP(volume);this.update(now);if(this.done)return[];ctx.save();ctx.imageSmoothingEnabled=false;
    if(this.phase==='eggnog-outro'||this.phase==='eggnog-skip'){this.drawEggnog(ctx,now);ctx.restore();return[{id:'eggnog-advance',label:'Skip cutscene',x:0,y:0,w:1280,h:720,action:'advance'}];}
    if(this.phase==='intro'){this.drawIntro(ctx,now);ctx.font='20px monospace';ctx.textAlign='right';ctx.strokeStyle='#000';ctx.lineWidth=4;ctx.strokeText('ESC / TAP TO SKIP',1255,35);ctx.fillStyle='#fff';ctx.fillText('ESC / TAP TO SKIP',1255,35);ctx.restore();return[{id:'intro-skip',label:'Skip cutscene',x:1070,y:12,w:190,h:60,action:'skip'}];}
    const outro=this.phase==='outro',outroMs=(this.conversation.outro?.fadeTime??1)*1000,outroAlpha=outro?1-STORY_INTRO_STEP((now-this.phaseAt)/outroMs,8):1;ctx.globalAlpha=outroAlpha;
    const backdrop=storyIntroColor(this.conversation.backdrop?.color),backdropFade=(this.conversation.backdrop?.fadeTime??0)*1000,fade=backdropFade?STORY_INTRO_STEP((now-this.dialogueAt)/backdropFade,10):1;
    ctx.fillStyle=backdrop.rgb;ctx.save();ctx.globalAlpha*=backdrop.alpha*fade;ctx.fillRect(0,0,1280,720);ctx.restore();
    const entry=this.page.entry,speaker=this.pack.speakers[entry.speaker],box=this.pack.boxes[entry.box];
    if(speaker&&now>=this.typingAt){const first=(this.pack.atlases[speaker.atlas]||[])[0],x=640-(first?.frameWidth||first?.width||0)/2+(speaker.offsets?.[0]||0),y=360-(first?.frameHeight||first?.height||0)/2+(speaker.offsets?.[1]||0);this.drawAnimation(ctx,speaker,entry.speakerAnimation||'talk',now-this.speakerAt,x,y,speaker.scale||1);}
    let boxAnimation=this.boxAnimation,boxTime=now-this.boxAt;
    if(!outro&&this.completedAt!==null&&boxTime>=this.animationDuration(box,'sentenceEnd')){boxTime-=this.animationDuration(box,'sentenceEnd');boxAnimation='idle';}
    else if(!outro&&now>=this.typingAt&&this.completedAt===null){boxAnimation='speaking';boxTime=now-this.typingAt;}
    this.drawAnimation(ctx,box,boxAnimation,boxTime,640+(box.offsets?.[0]||0),360+(box.offsets?.[1]||0),box.scale||1);
    if(!outro&&now>=this.typingAt){const style=box.text||{},text=this.currentText(now),size=style.size||32,x=640+(box.offsets?.[0]||0)+(style.offsets?.[0]||0),y=360+(box.offsets?.[1]||0)+(style.offsets?.[1]||0);ctx.font=`${size}px StoryPixel, monospace`;ctx.textBaseline='top';const lines=this.wrapText(ctx,text,style.width||800),shadow=storyIntroColor(style.shadowColor||'#00000000');for(const [i,line] of lines.entries()){if((style.shadowWidth??2)>0&&shadow.alpha){ctx.fillStyle=shadow.rgb;ctx.fillText(line,x+(style.shadowWidth??2),y+i*size*1.22+(style.shadowWidth??2));}ctx.fillStyle=storyIntroColor(style.color||'#000').rgb;ctx.fillText(line,x,y+i*size*1.22);}}
    ctx.font='18px monospace';ctx.fillStyle='#fff';ctx.strokeStyle='#000';ctx.lineWidth=4;const hint=outro?'':`${speaker?.name||entry.speaker}  ·  ENTER / TAP: CONTINUE     ESC: SKIP`;ctx.strokeText(hint,24,686);ctx.fillText(hint,24,686);ctx.restore();
    return[{id:'dialogue-advance',label:now<this.typingAt||this.currentText(now).length<this.page.text.length?'Complete dialogue text':'Next dialogue line',x:0,y:0,w:1280,h:720,action:'advance'},{id:'dialogue-skip',label:'Skip dialogue',x:1070,y:10,w:200,h:64,action:'skip'}];
  }
}
