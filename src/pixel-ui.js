import {pixelStage} from './story-flow.js';

const PIXEL_DIRECTIONS=['left','down','up','right'];
export class PixelUI {
  constructor(assets,audio,data){this.assets=assets;this.audio=audio;this.data=data;}
  style(){return this.data().pixelNoteStyleAssets||{};}
  required(choice){if(!pixelStage(choice))return[];return [...new Set(Object.values(this.style()).map(v=>v.assetId).filter(Boolean))];}
  sounds(){return Object.values(this.style()).map(v=>v.audioFile?.split('/').at(-1)?.replace(/\.ogg$/,'')).filter(Boolean);}
  note(ctx,lane,x,y,scale,state,time,alpha,aspect=1){
    const style=this.style(),def=state==='note'?style.note:style.noteStrumline;if(!def)return false;
    const key=PIXEL_DIRECTIONS[lane]+({static:'Static',press:'Press',confirm:'Confirm'}[state]||'');
    const prefix=def.data?.[key]?.prefix;if(!prefix)return false;
    const frames=this.assets.frames(def.assetId,prefix);if(!frames.length)return false;
    const cursor=Math.floor(Math.max(0,time)*24/1000),frame=frames[state==='confirm'?Math.min(frames.length-1,cursor):state==='press'?cursor%frames.length:0];
    const size=(def.scale||6)*scale/.7,w=(frame.frameWidth||frame.width)*size,h=(frame.frameHeight||frame.height)*size;
    ctx.save();ctx.translate(x+56,y+56);ctx.scale(1,aspect);ctx.imageSmoothingEnabled=false;this.assets.draw(ctx,def.assetId,frame,-w/2,-h/2,size,alpha);ctx.restore();return true;
  }
  hold(ctx,lane,x,start,end,alpha,scale,aspect=1){
    const def=this.style().holdNote,img=this.assets.images[def?.assetId];if(!img)return false;
    const sx=lane*img.width/4,sw=img.width/4,sh=img.height/2,size=(def.scale||6)*scale/.7,w=sw*size,length=Math.abs(end-start),cap=Math.min(length,sh*size*aspect);
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha*=alpha;ctx.translate(x,start);ctx.scale(1,end>=start?1:-1);
    if(length>cap)ctx.drawImage(img,sx,0,sw,sh,-w/2,0,w,length-cap);ctx.drawImage(img,sx,sh,sw,sh,-w/2,length-cap,w,cap);ctx.restore();return true;
  }
  countdownSound(beat){return this.style()[{[-4]:'countdownThree',[-3]:'countdownTwo',[-2]:'countdownOne',[-1]:'countdownGo'}[beat]]?.audioFile?.split('/').at(-1)?.replace(/\.ogg$/,'');}
  countdown(ctx,beat){const def=this.style()[{[-3]:'countdownTwo',[-2]:'countdownOne',[-1]:'countdownGo'}[beat]],img=this.assets.images[def?.assetId];if(!img)return false;const s=def.scale||6;ctx.save();ctx.imageSmoothingEnabled=false;this.assets.image(ctx,def.assetId,(1280-img.width*s)/2,(720-img.height*s)/2,img.width*s,img.height*s);ctx.restore();return true;}
  rating(ctx,name,combo,y,alpha){
    const def=this.style()['judgement'+name[0]?.toUpperCase()+name.slice(1)],img=this.assets.images[def?.assetId];if(!img)return false;
    const s=def.scale||4.2;ctx.save();ctx.globalAlpha*=alpha;ctx.imageSmoothingEnabled=false;this.assets.image(ctx,def.assetId,640-img.width*s/2,y,img.width*s,img.height*s);
    const digits=(combo==null?'':String(combo).padStart(3,'0')).split('').map(n=>this.style()['comboNumber'+n]),width=digits.reduce((sum,v)=>sum+(this.assets.images[v?.assetId]?.width||0)*s+4,0);let x=640-width/2;
    for(const digit of digits){const image=this.assets.images[digit?.assetId];if(image){this.assets.image(ctx,digit.assetId,x,y+62,image.width*s,image.height*s);x+=image.width*s+4;}}
    ctx.restore();return true;
  }
  abot(ctx,character,position,{scale=.62,time=0,beat=0,bpm=100,focusPlayer=true}={}){
    const data=this.data(),def=data.pixelABot,config=data.characters[data.characterIds?.[character]];if(!def||!config)return false;
    const size=config.logicalIdleSize||[75,74],global=config.globalOffsets||[0,0],nativeScale=config.metadata?.scale||6;
    const left=position[0]-size[0]*nativeScale*scale/2+global[0]*nativeScale*scale,top=position[1]-size[1]*nativeScale*scale+global[1]*nativeScale*scale,bodyX=left+def.bodyFromNene[0]*scale,bodyY=top+def.bodyFromNene[1]*scale;
    ctx.save();ctx.imageSmoothingEnabled=false;
    for(const layer of def.layers){
      const [nsx,nsy]=layer.scale||[6,6],s=nsx*scale,sy=nsy*scale,x=bodyX+layer.positionFromBody[0]*scale,y=bodyY+layer.positionFromBody[1]*scale;
      if(layer.name==='viz'){
        const spectrum=this.audio.spectrum();for(let band=0;band<7;band++){let energy=0;for(let j=band*15;j<band*15+15;j++)energy+=spectrum[j]||0;const level=Math.min(5,Math.max(0,5-Math.round(energy/15/255*5))),frame=this.assets.frame(layer.assetId,'viz'+(band+1)+'0',level);if(frame)this.assets.draw(ctx,layer.assetId,frame,x+band*54*scale-(nsx-1)*frame.frameWidth*scale/2,y-(nsy-1)*frame.frameHeight*scale/2,s);}continue;
      }
      const animation=layer.name==='head'?(focusPlayer?'toright':'toleft'):Math.floor(Math.max(0,beat))%2?'danceRight':'danceLeft',prefix=layer.animations?.[animation]||Object.values(layer.animations||{})[0],frames=prefix?this.assets.frames(layer.assetId,prefix):[],elapsed=((beat%1+1)%1)*60000/bpm,frame=frames[Math.min(frames.length-1,Math.floor((layer.name==='head'?time:elapsed)*24/1000))]||frames[0];
      if(frame)this.assets.draw(ctx,layer.assetId,frame,x-(nsx-1)*(frame.frameWidth||frame.width)*scale/2,y-(nsy-1)*(frame.frameHeight||frame.height)*scale/2,s);
      else{const img=this.assets.images[layer.assetId];if(img)this.assets.image(ctx,layer.assetId,x-(nsx-1)*img.width*scale/2,y-(nsy-1)*img.height*scale/2,img.width*s,img.height*sy);}
    }
    ctx.restore();return true;
  }
}
