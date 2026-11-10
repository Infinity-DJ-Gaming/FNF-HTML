import {EXPANDED_BASE} from './expanded-content.js';

export async function expandedImage(file) {
  const image=new Image();
  image.src=EXPANDED_BASE+file;
  await image.decode();
  return image;
}

export async function expandedJSON(file) {
  const response=await fetch(EXPANDED_BASE+file);
  if(!response.ok)throw new Error('Sky Reborn asset unavailable: '+file);
  return response.json();
}

export async function loadExpandedAnimation(asset) {
  const [image,timeline]=await Promise.all([expandedImage(asset.image),expandedJSON(asset.timeline)]);
  return {image,timeline};
}

export class SkyGallery {
  constructor() {
    this.index=0;
    this.picture=null;
  }

  async begin(data,volume) {
    this.data=data;
    this.music=new Audio(EXPANDED_BASE+data.music);
    this.music.volume=volume;
    this.music.loop=true;
    this.music.play().catch(()=>{});
    [this.logo,this.background]=await Promise.all([expandedImage(data.logo),expandedImage(data.backgrounds[this.index%data.backgrounds.length])]);
    await this.select(0);
  }

  async select(delta) {
    if(!this.data)return;
    const index=this.index=(this.index+delta+this.data.items.length)%this.data.items.length;
    const item=this.data.items[index];
    this.picture=null;
    try{
      const picture=await expandedImage(item.image);
      if(index===this.index)this.picture=picture;
    }catch{}
  }

  stop() {
    this.music?.pause();
    this.music=null;
  }
}
