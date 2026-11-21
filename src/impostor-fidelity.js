import {clamp} from './core.js?v=52a31721d8bc6d';

export function impostorHUD(game,time,reducedMotion=false){
  if(!game.impostor)return {alpha:1,y:0,angle:0};
  const song=game.choice.baseSong,step=game.beat*4;
  const alpha=song==='torture'&&step>=1022&&step<1088?0:1;
  if(reducedMotion)return {alpha,y:0,angle:0};
  const bpm=game.chart.tempos?.findLast(t=>t.time<=time)?.bpm||game.chart.bpm;
  const falling=['ejected','double-trouble','turbulence'].includes(song);
  const danger=song==='danger';
  return {alpha,y:falling?Math.sin(time/1000*bpm/60)*15:danger?Math.sin(time/300*bpm/60)*.6:0,
    angle:(falling?Math.sin(time/1200*bpm/60*-1)*1.2:danger?Math.sin(time/350*bpm/60*-1)*.6:0)*Math.PI/180};
}

export function impostorJudgement(choice,age,reducedMotion=false){
  if(reducedMotion||!String(choice?.source||'').startsWith('impostor-'))return [0,0];
  const t=Math.max(0,age);
  if(['ejected','double-trouble'].includes(choice.baseSong))return [0,-300*t*t];
  if(choice.baseSong==='danger')return [-250*t-275*t*t,0];
  if(choice.baseSong==='turbulence')return [700*t+325*t*t,0];
  return [0,0];
}

export const stageActorAlpha=(game,placement)=>game.impostor?clamp(placement?.alpha??1,0,1):1;
export const impostorShader=choice=>!String(choice?.source||'').startsWith('impostor-')?null:
  ['delusion','blackout','neurotic'].includes(choice.baseSong)?'chromatic':choice.baseSong==='boiling-point'?'heatwave':null;

export function drawAnimatedHealthIcon(ctx,assets,atlas,{x,y,scale=1,losing=false,flip=false,time=0}){
  if(!assets.atlases[atlas]?.length)return false;
  const frame=assets.frame(atlas,losing?'losing':'idle',Math.floor(Math.max(0,time)*.024)%Math.max(1,assets.frames(atlas,losing?'losing':'idle').length));
  if(!frame)return false;
  const width=frame.frameWidth||frame.width,height=frame.frameHeight||frame.height,s=150*scale/Math.max(width,height);
  ctx.save();ctx.translate(x,y);if(flip){ctx.translate(150*scale,0);ctx.scale(-1,1);}
  assets.draw(ctx,atlas,frame,(150*scale-width*s)/2,(150*scale-height*s)/2,s);ctx.restore();return true;
}

// One framebuffer at the actual display resolution, retained across camera bops.
// These are the installed mod's fragment programs; no CPU pixel readback or
// reduced-resolution intermediate is used.
export class ImpostorScreenEffects{
  constructor(){this.surface=null;this.failed=false;this.resizes=0;this.programs=new Map();this.distort=null;}
  prepare(choice,art,assets){
    const name=impostorShader(choice);if(!name||this.failed)return;
    try{
      if(!this.surface){
        const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl',{alpha:false,antialias:false});
        if(!gl)throw Error('WebGL unavailable');
        const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,0,1,1,-1,1,1,-1,1,0,0,-1,1,0,0,1,-1,1,1,1,1,1,0]),gl.STATIC_DRAW);
        const texture=gl.createTexture();this.surface={canvas,gl,buffer,texture};this.bindTexture(texture,0);
      }
      if(!this.programs.has(name))this.programs.set(name,this.compile(art.shaders[name]));
      if(name==='heatwave'&&this.distort!==assets.images[art.heatwave]){
        const {gl}=this.surface;this.distortionTexture??=gl.createTexture();this.bindTexture(this.distortionTexture,1);
        this.distort=assets.images[art.heatwave];gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.distort);
      }
    }catch(error){this.failed=true;console.warn('Impostor screen effect unavailable:',error.message);}
  }
  bindTexture(texture,unit){
    const {gl}=this.surface;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);
    for(const edge of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,edge,gl.CLAMP_TO_EDGE);
    for(const filter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,filter,gl.LINEAR);
  }
  compile(source){
    const {gl}=this.surface,program=gl.createProgram();
    const shader=(type,code)=>{const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
    const vertex=shader(gl.VERTEX_SHADER,'attribute vec2 position; attribute vec2 uv; varying vec2 openfl_TextureCoordv; void main(){openfl_TextureCoordv=uv;gl_Position=vec4(position,0.,1.);}');
    const fragment=shader(gl.FRAGMENT_SHADER,'precision highp float; uniform sampler2D bitmap; varying vec2 openfl_TextureCoordv;\n'+source.replace('#pragma header','').replaceAll('flixel_texture2D','texture2D'));
    gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.bindAttribLocation(program,0,'position');gl.bindAttribLocation(program,1,'uv');gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    gl.deleteShader(vertex);gl.deleteShader(fragment);
    gl.useProgram(program);gl.uniform1i(gl.getUniformLocation(program,'bitmap'),0);gl.uniform1i(gl.getUniformLocation(program,'distortTexture'),1);
    gl.uniform1f(gl.getUniformLocation(program,'amount'),1);
    return {program,clock:gl.getUniformLocation(program,'iTime')};
  }
  draw(ctx,game,time,{reducedMotion=false,enabled=true}={}){
    const name=impostorShader(game.choice),renderer=this.programs.get(name);
    if(!enabled||!renderer||this.failed)return false;
    const {canvas,gl,texture,buffer}=this.surface;
    if(canvas.width!==ctx.canvas.width||canvas.height!==ctx.canvas.height){canvas.width=ctx.canvas.width;canvas.height=ctx.canvas.height;gl.viewport(0,0,canvas.width,canvas.height);this.resizes++;}
    gl.useProgram(renderer.program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    for(const [index,offset] of [[0,0],[1,8]]){gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,2,gl.FLOAT,false,16,offset);}
    this.bindTexture(texture,0);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,ctx.canvas);
    if(name==='heatwave')this.bindTexture(this.distortionTexture,1);
    gl.uniform1f(renderer.clock,reducedMotion?0:Math.max(0,time)/1000);gl.drawArrays(gl.TRIANGLES,0,6);
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='copy';ctx.drawImage(canvas,0,0);ctx.restore();return true;
  }
}
