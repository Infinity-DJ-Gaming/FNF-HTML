import {renderProfiler} from './render-profiler.js?v=52a31721d8bc6d';
const RIG_BASE='assets/expanded/qt-hd/';

export class NativeRigs {
  constructor(){
    this.index={};
    this.loaded=new Map();
    this.sheets=new Map();
    this.loading=new Map();
    this.crops=new Map();
  }

  loadSheet(file){
    if(!this.sheets.has(file)){
      const image=new Image();
      image.src=RIG_BASE+file;
      const pending=image.decode().then(()=>image);
      this.sheets.set(file,pending);
      pending.catch(()=>{if(this.sheets.get(file)===pending)this.sheets.delete(file);});
    }
    return this.sheets.get(file);
  }

  async load(name){
    const response=await fetch(RIG_BASE+this.index[name],{cache:'no-cache'});
    if(!response.ok)throw new Error('Could not load original sprite data for '+name);
    const rig=await response.json();
    this.loading.set(name,rig);
    try{
      rig.images=await Promise.all(rig.sources.map(file=>this.loadSheet(file)));
      await this.prepareCrops(rig);
      this.loaded.set(name,rig);
      return rig.images[0];
    }finally{this.loading.delete(name);}
  }

  async prepareCrops(rig){
    rig.cropKeys=new Array(rig.parts.length);
    rig.partImages=new Array(rig.parts.length);
    const jobs=[];
    for(const [index,part] of rig.parts.entries()){
      const [page,x,y,width,height]=part,image=rig.images[page];
      if(image.width*image.height<=8*1024*1024)continue;
      const key=[rig.sources[page],x,y,width,height].join(':');
      rig.cropKeys[index]=key;
      jobs.push(async()=>{
        let entry=this.crops.get(key);
        if(!entry){
          entry={width,height,bitmap:null};
          this.crops.set(key,entry);
          entry.pending=(async()=>{
            let bitmap;
            if(typeof createImageBitmap==='function')bitmap=await createImageBitmap(image,x,y,width,height);
            else{
              bitmap=document.createElement('canvas');bitmap.width=width;bitmap.height=height;
              bitmap.getContext('2d').drawImage(image,x,y,width,height,0,0,width,height);
            }
            if(this.crops.get(key)!==entry){bitmap.close?.();return null;}
            entry.bitmap=bitmap;return bitmap;
          })().catch(()=>null);
        }
        rig.partImages[index]=await entry.pending;
      });
    }
    // Prepare exact source-pixel crops during loading rather than on a note hit.
    let cursor=0;
    await Promise.all(Array.from({length:Math.min(4,jobs.length)},async()=>{
      while(cursor<jobs.length)await jobs[cursor++]();
    }));
  }

  release(keep){
    for(const name of this.loaded.keys())if(!keep.has(name))this.loaded.delete(name);
    const rigs=[...this.loaded.values(),...this.loading.values()];
    const used=new Set(rigs.flatMap(rig=>rig.sources));
    for(const name of this.sheets.keys())if(!used.has(name))this.sheets.delete(name);
    const usedCrops=new Set(rigs.flatMap(rig=>rig.cropKeys||[]));
    for(const [key,entry] of this.crops)if(!usedCrops.has(key)){
      entry.bitmap?.close?.();this.crops.delete(key);
    }
  }

  draw(ctx,name,frame,x,y,scale){
    const rig=this.loaded.get(name),ids=rig?.frames[frame];
    if(!ids)return false;
    const profiled=renderProfiler.begin();
    ctx.save();
    ctx.translate(x,y);
    ctx.scale(scale,scale);
    for(const index of ids){
      const [page,sx,sy,width,height,rotated,a,b,c,d,tx,ty,opacity]=rig.parts[index];
      ctx.save();
      ctx.transform(a,b,c,d,tx,ty);
      ctx.globalAlpha*=opacity;
      if(rotated){
        ctx.translate(0,width);
        ctx.rotate(-Math.PI/2);
      }
      const crop=rig.partImages?.[index];
      if(crop)ctx.drawImage(crop,0,0,width,height,0,0,width,height);
      else ctx.drawImage(rig.images[page],sx,sy,width,height,0,0,width,height);
      ctx.restore();
    }
    ctx.restore();
    renderProfiler.end('sprites',profiled);
    return true;
  }
}
