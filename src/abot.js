import {clamp} from './core.js';
const ABOT_COLUMN_X=[0,59,115,181,235,287,338],ABOT_COLUMN_Y=[0,-8,-11.5,-11.9,-11.4,-6.7,0.3];
export function drawABot(ctx,assets,audio,{neneX,neneY,scale=0.57,time=0,bodyX=null,bodyY=null}={}){
  const x=bodyX??neneX+(-95+4)*scale,y=bodyY??neneY+(384-89+2)*scale,spectrum=audio.spectrum();ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  if(assets.images.ABOT_SCREEN)assets.image(ctx,'ABOT_SCREEN',150,28,485,285);else{ctx.fillStyle='#070d0b';ctx.fillRect(174,47,460,265);}
  // Native seven-column A-Bot display, driven by the same 256-point FFT as its game implementation.
  for(let i=0;i<7;i++){const lo=Math.floor(Math.pow(i/7,1.7)*110)+1,hi=Math.max(lo+1,Math.floor(Math.pow((i+1)/7,1.7)*110));let energy=0;for(let j=lo;j<hi;j++)energy+=spectrum[j]||0;const level=energy/(hi-lo)/255,quantized=Math.round(level*6);if(!quantized)continue;const frame=5-clamp(quantized-1,0,5);if(assets.atlases.ABOT_VIZ)assets.draw(ctx,'ABOT_VIZ',assets.frame('ABOT_VIZ',`viz${i+1}0`,frame),207+ABOT_COLUMN_X[i],82+ABOT_COLUMN_Y[i]);else{ctx.fillStyle='#39ed73';ctx.fillRect(205+i*54,270-level*190,38,level*190);}}
  assets.image(ctx,'ABOT',0,0,812,357);ctx.restore();
}
