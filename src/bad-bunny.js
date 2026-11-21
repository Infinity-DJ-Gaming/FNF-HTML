import {renderProfiler} from './render-profiler.js?v=52a31721d8bc6d';
export const isBadBunny=choice=>choice?.source==='bad-bunny';

export function bunnyIntro(choice){
  if(!isBadBunny(choice)||choice.baseSong!=='celoso')return null;
  return {duration:6300,fadeIn:1000,
    poses:[[3700,'opponent','hey',2300],[4900,'player','hey',1400]],
    view:{camera:[[0,['position',700,-100,1.1]],[0,['position',700,-100,.8],1500,'circOut'],
      [1800,['opponent',0,0,.8],2400,'quartInOut'],[3900,['player',0,0,.8],1800,'expoInOut']]},
    voiceLines:[{at:300,name:'BB_intro'}]};
}

export function bunnyBop(pattern,step){
  const patterns={reggaeton:[8,{0:2,3:.6,4:.6,6:1}],reggaeton_build_up:[16,{0:2,4:.6,8:1,12:.6}],
    trap:[32,{0:1.5,16:1.5,4:.6,20:.6,8:2,24:2,12:.2,13:.2,27:1.8}],alterno:[8,{0:3,3:1,6:1}],
    'palmas-piano':[16,{0:2,10:.8}],'one-weak':[16,{0:1.2,4:.8,8:.8,12:.8}],
    'one-strong':[16,{0:2,4:1.1,8:1.1,12:1.1}],'one-equal-strong':[4,{0:2}],
    'one-every-other':[8,{0:1.1,4:1.6}],'one-just-every-other':[8,{4:1.6}],'four-weak':[16,{0:.6}]};
  const p=patterns[pattern];return p?p[1][step%p[0]]||0:0;
}

export function updateBunny(game,time,art,{motion=true}={}){
  if(!isBadBunny(game.choice))return;
  const state=game.bunny??={cue:0,step:-1,pattern:null,dolphins:{}};
  const step=Math.floor(game.beat*4),cues=art.cues[game.choice.baseSong]||[];
  while(cues[state.cue]?.step<=step){
    const cue=cues[state.cue++];
    if('pattern' in cue)state.pattern=cue.pattern;
    if('alternate' in cue)state.alternate=cue.alternate;
    if(cue.dolphin)state.dolphins[cue.dolphin.name]={at:time,x:cue.dolphin.x};
    if(cue.fade)state.fadeAt=time;
  }
  if(state.step===step)return;
  const previous=state.step;state.step=step;
  if(step<0)return;
  if(step%4===0&&previous<step&&Math.random()<.1){
    const name=time-(state.dolphins.dolphin?.at??-1e6)>1000?'dolphin':'dolphin-fg';
    if(time-(state.dolphins[name]?.at??-1e6)>1000)
      state.dolphins[name]={at:time,x:name==='dolphin'?-400+Math.random()*1800:-2138+Math.random()*1100};
  }
  if(state.pattern!=null){
    game.bopRate=0;
    if(motion){const intensity=bunnyBop(state.pattern,step);if(intensity)game.cameraBump=.015*intensity;}
  }else game.bopRate=4;
}

export function bunnyProp(prop,game,time,assets){
  if(!isBadBunny(game.choice))return prop;
  if(['dolphin','dolphin-fg'].includes(prop.name)){
    const cue=game.bunny?.dolphins[prop.name],frames=assets.frames(prop.assetId,'Jump');
    if(!cue||time<cue.at||(time-cue.at)*.024>=frames.length)return null;
    return {...prop,position:[cue.x,prop.position[1]],animationTime:time-cue.at,
      animations:prop.animations.map(a=>({...a,looped:false}))};
  }
  return prop;
}

// Map the original texture into the display framebuffer. UVs still sample the
// full-resolution source; offscreen fragments are clipped by the GPU.
export function shaderQuad(matrix,x,y,width,height,time,name,targetWidth,targetHeight,vertices=new Float32Array(24)){
  const angle=name==='sun'?Math.max(0,time)/1000*3*Math.PI/180:0,c=Math.cos(angle),s=Math.sin(angle);
  const corners=[[0,0],[1,0],[0,1],[0,1],[1,0],[1,1]];
  for(let index=0;index<corners.length;index++){
    const [u,v]=corners[index],dx=(u-.5)*width,dy=(v-.5)*height;
    const px=x+width/2+dx*c-dy*s,py=y+height/2+dx*s+dy*c;
    const screenX=matrix.a*px+matrix.c*py+matrix.e,screenY=matrix.b*px+matrix.d*py+matrix.f;
    vertices.set([screenX/targetWidth*2-1,1-screenY/targetHeight*2,u,v],index*4);
  }
  return vertices;
}

const PLAIN_FRAGMENT='void main(){gl_FragColor=texture2D(bitmap,openfl_TextureCoordv);}';
const multiply=(p,q)=>({a:p.a*q.a+p.c*q.b,b:p.b*q.a+p.d*q.b,c:p.a*q.c+p.c*q.d,d:p.b*q.c+p.d*q.d,e:p.a*q.e+p.c*q.f+p.e,f:p.b*q.e+p.d*q.f+p.f});

export class BunnyShaders{
  constructor(){this.programs=new Map();this.pipelines=new Map();this.textures=new WeakMap();this.plainRenderers=new WeakMap();this.surface=null;this.resizes=0;this.vertices=new Float32Array(24);this.batching=false;}
  context(){
    if(this.surface)return this.surface;
    const canvas=document.createElement('canvas');
    const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true});
    if(!gl)throw Error('WebGL unavailable');
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,this.vertices.byteLength,gl.DYNAMIC_DRAW);
    this.surface={canvas,gl,buffer};return this.surface;
  }
  prepare(stage,assets,sources){
    for(const prop of stage.props){
      const image=assets.images[prop.assetId];
      if(!image)continue;
      if(sources[prop.name])this.renderer(prop.name,sources[prop.name],image);
      else if((prop.zIndex||0)<100){
        const rig=assets.rigs.loaded.get(prop.assetId);
        if(rig)for(const image of rig.images)this.plain(image);
        else this.plain(image);
      }
    }
    this.surface?.gl.flush();
  }
  renderer(name,source,image){
    if(this.programs.has(name))return this.programs.get(name);
    try{const renderer=this.create(source,image);this.programs.set(name,renderer);return renderer;}
    catch(error){console.warn('Bad Bunny '+name+' shader could not initialize:',error.message);this.programs.set(name,false);return false;}
  }
  plain(image){
    if(!this.plainRenderers.has(image))this.plainRenderers.set(image,this.create(PLAIN_FRAGMENT,image));
    return this.plainRenderers.get(image);
  }
  size(ctx){
    const {canvas,gl}=this.context();
    if(canvas.width!==ctx.canvas.width||canvas.height!==ctx.canvas.height){
      canvas.width=ctx.canvas.width;canvas.height=ctx.canvas.height;
      gl.viewport(0,0,canvas.width,canvas.height);this.resizes++;
    }
    gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  }
  begin(ctx){
    try{
      this.size(ctx);const {gl}=this.context();
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);this.batching=true;return true;
    }catch{return false;}
  }
  present(ctx){
    ctx.save();ctx.globalAlpha=1;ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(this.surface.canvas,0,0);ctx.restore();
  }
  end(ctx){if(this.batching){this.batching=false;this.present(ctx);}}
  paint(renderer,vertices,time,alpha){
    const {gl,buffer}=this.context();
    gl.useProgram(renderer.program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,vertices);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,16,0);
    gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,16,8);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,renderer.texture);
    gl.uniform1f(renderer.clock,Math.max(0,time)/2000);gl.uniform1f(renderer.opacity,alpha);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
  image(ctx,image,matrix,x,y,width,height,alpha,sx=0,sy=0,sw=image.width,sh=image.height){
    const {canvas}=this.context(),vertices=shaderQuad(matrix,x,y,width,height,0,'plain',canvas.width,canvas.height,this.vertices);
    for(let i=0;i<6;i++){vertices[i*4+2]=(sx+vertices[i*4+2]*sw)/image.width;vertices[i*4+3]=(sy+vertices[i*4+3]*sh)/image.height;}
    this.paint(this.plain(image),vertices,0,alpha);
  }
  drawProp(ctx,prop,game,assets,{x,y,width,height,scale,time}){
    if(!this.batching)return false;
    const rig=assets.rigs.loaded.get(prop.assetId),matrix=ctx.getTransform();
    if(!rig){this.image(ctx,assets.images[prop.assetId],matrix,x,y,width,height,ctx.globalAlpha);return true;}
    const animation=prop.animations?.[0]||{},frames=assets.frames(prop.assetId,animation.prefix||'');
    const frame=frames[Math.min(frames.length-1,Math.floor(Math.max(0,prop.animationTime??time)*(animation.frameRate||24)/1000))];
    const parts=rig.frames[frame?.name];if(!parts)return true;
    const base=multiply(matrix,{a:scale,b:0,c:0,d:scale,e:x,f:y});
    for(const index of parts){
      const [page,sx,sy,w,h,rotated,a,b,c,d,tx,ty,opacity]=rig.parts[index];
      let transform=multiply(base,{a,b,c,d,e:tx,f:ty});
      if(rotated)transform=multiply(transform,{a:0,b:-1,c:1,d:0,e:0,f:w});
      const crop=rig.partImages?.[index],image=crop||rig.images[page];
      this.image(ctx,image,transform,0,0,w,h,ctx.globalAlpha*opacity,crop?0:sx,crop?0:sy,w,h);
    }
    return true;
  }
  draw(ctx,prop,image,{x,y,width,height,time,source}){
    const name=prop.name;
    if(!['sky','sun','water'].includes(name)||!source)return false;
    const renderer=this.renderer(name,source,image);if(!renderer)return false;
    const profiled=renderProfiler.begin(),{canvas,gl}=this.context();
    // Camera zooms change quad vertices, never the framebuffer allocation.
    this.size(ctx);
    const vertices=shaderQuad(ctx.getTransform(),x,y,width,height,time,name,canvas.width,canvas.height,this.vertices);
    if(!this.batching){gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);}
    this.paint(renderer,vertices,time,ctx.globalAlpha);
    if(!this.batching)this.present(ctx);
    renderProfiler.end('shader-'+name,profiled);return true;
  }
  create(source,image){
    const {gl}=this.context();
    const compile=(kind,code)=>{
      const shader=gl.createShader(kind);gl.shaderSource(shader,code);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;
    };
    let pipeline=this.pipelines.get(source);
    if(!pipeline){
    const program=gl.createProgram();
    gl.attachShader(program,compile(gl.VERTEX_SHADER,'attribute vec2 position; attribute vec2 textureCoordinate; varying vec2 openfl_TextureCoordv; void main(){openfl_TextureCoordv=textureCoordinate;gl_Position=vec4(position,0.,1.);}'));
    const fragment=source.replace('#pragma header','').replaceAll('flixel_texture2D','texture2D').replace(/}\s*$/,'gl_FragColor.a*=layerOpacity;}');
    gl.attachShader(program,compile(gl.FRAGMENT_SHADER,'precision highp float; uniform sampler2D bitmap; uniform float layerOpacity; varying vec2 openfl_TextureCoordv;\n'+fragment));
    gl.bindAttribLocation(program,0,'position');gl.bindAttribLocation(program,1,'textureCoordinate');
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    gl.uniform1i(gl.getUniformLocation(program,'bitmap'),0);
    pipeline={program,clock:gl.getUniformLocation(program,'iTime'),opacity:gl.getUniformLocation(program,'layerOpacity')};
    this.pipelines.set(source,pipeline);
    }
    let texture=this.textures.get(image);
    if(!texture){
    texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);this.textures.set(image,texture);
    }
    return {...pipeline,texture};
  }
}
