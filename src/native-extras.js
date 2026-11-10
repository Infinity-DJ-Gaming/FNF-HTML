// Full native character symbol trees, Pico gun backing card, and Erect stage.
// These helpers draw only; parent retains all input, score and scene state.
const NE_CLAMP=(v,a,b)=>Math.min(b,Math.max(a,v));
export class NativeExtras {
  constructor(base='native-extras-'){this.base=base;this.packs={};this.images={};this.groups=new Map();this.gunType='base';this.gunChangedAt=0;this.lastCardTime=-1;}
  async load(kind='characters'){
    if(this.packs[kind])return this;const filename={characters:'native-character-extras.json',picoCard:'native-pico-card.json',erectStage:'native-week1-erect-stage.json'}[kind];const response=await fetch(this.base+filename);if(!response.ok)throw new Error('Native visual pack unavailable: '+filename);const pack=await response.json(),images={};
    await Promise.all(Object.entries(pack.images).map(async([id,url])=>{const image=new Image();image.src=url;await image.decode();images[id]=image;}));this.packs[kind]=pack;this.images[kind]=images;return this;
  }
  frames(kind,name,prefix=''){const key=kind+'|'+name+'|'+prefix;if(!this.groups.has(key))this.groups.set(key,(this.packs[kind]?.atlases?.[name]||[]).filter(f=>f.name.startsWith(prefix)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})));return this.groups.get(key);}
  sprite(ctx,kind,name,frame,x,y,sx=1,sy=sx){if(!frame)return;const image=this.images[kind]?.[name];if(!image)return;ctx.drawImage(image,frame.sourceX??frame.x,frame.sourceY??frame.y,frame.sourceWidth??frame.width,frame.sourceHeight??frame.height,x-(frame.frameX||0)*sx,y-(frame.frameY||0)*sy,frame.width*sx,frame.height*sy);}
  image(ctx,kind,name,x,y,sx=1,sy=sx){const image=this.images[kind]?.[name];if(image)ctx.drawImage(image,x,y,image.width*sx,image.height*sy);}
  commands(ctx,image,commands){for(const command of commands||[]){const[x,y,w,h]=command.r,[dw,dh]=command.d||[w,h];ctx.save();ctx.globalAlpha*=command.a??1;ctx.transform(...command.m);if(command.rotated){ctx.translate(0,dw);ctx.rotate(-Math.PI/2);}ctx.drawImage(image,x,y,w,h,0,0,dw,dh);ctx.restore();}}
  hasCharacterAnimation(character,animation){return !!this.packs.characters?.characters[character]?.animations[animation];}
  drawCharacter(ctx,character,animation,{x,y,scale=1,time=0,beat=0,bpm=120,player=false,globalOffsets=true,loop=null,period=1}={}){
    const pack=this.packs.characters,meta=pack?.characters[character];if(!meta)return false;
    if(animation==='idle'&&!meta.animations.idle)animation=Math.floor(beat)%2===0?'danceLeft':'danceRight';
    if(animation==='cheer'&&!meta.animations.cheer&&meta.animations.combo50)animation='combo50';
    const def=meta.animations[animation]||meta.animations.idle||meta.animations.danceLeft;if(!def)return false;
    const timeline=pack.timelines[def.timeline],main=pack.timelines[(meta.animations.idle||meta.animations.danceLeft).timeline],bounds=timeline.bounds||[0,0,0,0],mainBounds=main.bounds||[0,0,0,0];
    if(animation==='danceLeft'||animation==='danceRight')time=period===0?0:((beat%period+period)%period)*60000/bpm;
    let index=Math.floor(Math.max(0,time)*def.fps/1000);const shouldLoop=loop??def.looped;index=shouldLoop?index%def.frames.length:Math.min(def.frames.length-1,index);const frame=def.frames[index],flip=player?!meta.flipX:!!meta.flipX,offset=globalOffsets?meta.globalOffsets:[0,0];
    ctx.save();ctx.translate(x+offset[0]*scale,y+offset[1]*scale);ctx.scale(scale*(flip?-1:1),scale);ctx.translate(-mainBounds[2]/2,-mainBounds[3]);ctx.translate(-bounds[0]-def.offsets[0],-bounds[1]-def.offsets[1]);this.commands(ctx,this.images.characters[def.timeline],timeline.frames[frame]);ctx.restore();return true;
  }
  tile(ctx,name,x,y,spacing=0,{flipX=false,alpha=1}={}){
    const image=this.images.picoCard[name];if(!image)return;const step=image.width+spacing,start=((x%step)+step)%step-step;ctx.save();ctx.globalAlpha*=alpha;
    for(let dx=start;dx<1280;dx+=step){ctx.save();if(flipX){ctx.translate(dx+image.width,y);ctx.scale(-1,1);ctx.drawImage(image,0,0);}else ctx.drawImage(image,dx,y);ctx.restore();}ctx.restore();
  }
  drawPicoCard(ctx,time,{reducedMotion=false,confirmAge=null,clip=true}={}){
    const pack=this.packs.picoCard;if(!pack)return false;
    ctx.save();if(clip){ctx.beginPath();ctx.moveTo(0,64);ctx.lineTo(395,64);ctx.lineTo(555,720);ctx.lineTo(0,720);ctx.closePath();ctx.clip();}ctx.fillStyle='#98a2f3';ctx.fillRect(0,0,1280,720);
    const t=reducedMotion?0:time/1000;
    this.tile(ctx,'lowerLoop',t*110,200,20,{flipX:true,alpha:.39});this.tile(ctx,'lowerLoop',-t*110,406,20);
    ctx.save();ctx.globalAlpha=.4;ctx.globalCompositeOperation='multiply';this.image(ctx,'picoCard','blueBar',0,239,2.5,1);ctx.restore();
    const top=this.frames('picoCard','topLoop','base')[0],progress=Math.abs((-t*220)%((top?.frameWidth||top?.width||2109)+20));
    if(time<this.lastCardTime){this.gunType='base';this.gunChangedAt=0;}this.lastCardTime=time;
    const list=this.frames('picoCard','topLoop',this.gunType==='base'?'base':this.gunType+' info'),finished=time-this.gunChangedAt>=list.length/24*1000;
    if(finished&&!reducedMotion){const next=progress>=500&&progress<=700?'sniper':progress>=700&&progress<=1300?'rifle':progress>=1450&&progress<=2000?'rocket launcher':progress<=300?'uzi':this.gunType;if(next!==this.gunType){this.gunType=next;this.gunChangedAt=time;}}
    const gunFrames=this.frames('picoCard','topLoop',this.gunType==='base'?'base':this.gunType+' info'),frame=gunFrames[Math.min(gunFrames.length-1,Math.floor((time-this.gunChangedAt)*24/1000))]||top;
    if(frame){const step=(frame.frameWidth||frame.width)+20,start=((-t*220%step)+step)%step-step;for(let x=start;x<1280;x+=step)this.sprite(ctx,'picoCard','topLoop',frame,x,80);}
    this.tile(ctx,'middleLoop',t*220,346,15);
    const pulse=reducedMotion?0.2:Math.pow(1-(t*102/60%1),4);ctx.save();ctx.globalAlpha=pulse;this.image(ctx,'picoCard','glow',-300,330);ctx.restore();
    if(confirmAge!==null){const data=pack.animations.confirm,frame=Math.min(data.frames.length-1,Math.floor(confirmAge*24/1000)),b=data.bounds||[0,0,0,0];ctx.save();ctx.translate(-120-b[0],55-b[1]);this.commands(ctx,this.images.picoCard.confirm,data.frames[frame]);ctx.restore();}ctx.restore();return true;
  }
  drawErectStage(ctx,time,{pan=0,foreground=false,offset=[240,-35],scale=.75}={}){
    const pack=this.packs.erectStage;if(!pack)return false;
    const props=[...pack.metadata.props].sort((a,b)=>a.zIndex-b.zIndex);
    for(const p of props){if((p.zIndex>=3000)!==foreground)continue;const position=p.position||[0,0],s=Array.isArray(p.scale)?p.scale:[p.scale??1,p.scale??1],scroll=p.scroll||[1,1],x=offset[0]+position[0]*scale-pan*scroll[0],y=offset[1]+position[1]*scale;
      ctx.save();ctx.globalAlpha=p.alpha??1;
      if(p.assetPath.startsWith('#')){ctx.fillStyle=p.assetPath;ctx.fillRect(x,y,s[0]*scale,s[1]*scale);ctx.restore();continue;}
      if(p.animations?.length){const anim=p.animations.find(a=>a.name===p.startingAnimation)||p.animations[0],frames=this.frames('erectStage',p.name,anim.prefix),f=frames[Math.floor(Math.max(0,time)*(anim.frameRate||24)/1000)%frames.length];this.sprite(ctx,'erectStage',p.name,f,x,y,s[0]*scale,s[1]*scale);}else this.image(ctx,'erectStage',p.name,x,y,s[0]*scale,s[1]*scale);ctx.restore();
    }return true;
  }
}
