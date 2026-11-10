export class AudioEngine {
  constructor(settings){this.settings=settings;this.cache=new Map();this.effects=new Map();this.sources=[];this.menu=null;this.menuFile='';this.position=0;this.running=false;this.ctx=null;this.buffers=null;this.trackOffsets=[];this.trackRoles=[];this.musicURLs=new Set();this.allowVoices=true;}
  async unlock(){
    if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=256;this.analyser.minDecibels=-65;this.analyser.maxDecibels=-25;this.analyser.smoothingTimeConstant=0.72;this.analyser.connect(this.master);this.frequencyData=new Uint8Array(this.analyser.frequencyBinCount);this.music=this.ctx.createGain();this.music.connect(this.analyser);this.voices=this.ctx.createGain();this.voices.connect(this.analyser);this.fx=this.ctx.createGain();this.fx.connect(this.master);this.updateVolume();}
    if(this.ctx.state==='suspended')await this.ctx.resume();
  }
  updateVolume(){if(this.master){this.master.gain.value=this.settings.volume;this.fx.gain.value=this.settings.sfxVolume;this.music.gain.value=1;this.voices.gain.value=this.allowVoices?1:0;}if(this.menu)this.menu.volume=this.settings.volume*0.8;}
  async load(url){if(!this.cache.has(url)){const promise=(async()=>{await this.unlock();const r=await fetch(url);if(!r.ok)throw new Error(`Audio unavailable: ${url}`);return this.ctx.decodeAudioData(await r.arrayBuffer());})();this.cache.set(url,promise);promise.catch(()=>this.cache.delete(url));}return this.cache.get(url);}
  playMenu(file='freakyMenu',{loop=true}={}){
    if(this.menuFile===file&&this.menu){this.menu.play().catch(()=>{});return;}
    this.stopMenu();this.menuFile=file;this.menu=new Audio(`${file}.ogg`);this.menu.loop=loop;this.menu.volume=this.settings.volume*0.8;this.menu.play().catch(()=>{});
  }
  stopMenu(){if(this.menu){this.menu.pause();this.menu.currentTime=0;}this.menu=null;this.menuFile='';}
  async sfx(name,volume=1){try{await this.unlock();const buffer=await this.load(`${name}.ogg`);const s=this.ctx.createBufferSource(),g=this.ctx.createGain();s.buffer=buffer;g.gain.value=volume;s.connect(g);g.connect(this.fx);s.onended=()=>{s.disconnect();g.disconnect();};s.start();}catch(e){console.warn('Sound effect could not play',name,e.message);}}
  async prepare(file){await this.unlock();this.buffers=await Promise.all(['Inst','Voices'].map(n=>this.load(`${file}_${n}.ogg`)));return this.buffers[0].duration*1000;}
  async warmEffects(){await Promise.all(['intro1','intro2','intro3','introGo','missnote1','missnote2','missnote3','scrollMenu','confirmMenu','cancelMenu','fnf_loss_sfx','thunder_1','thunder_2'].map(n=>this.load(`${n}.ogg`).catch(()=>null)));}
  startPreview(buffers,offsets,startMs,endMs){
    this.stopPreview();
    const rate=this.ctx.sampleRate;
    const duration=buffers[0].duration+(offsets[0]||0)/1000;
    if(duration<=0)return false;
    const requestedStart=Number.isFinite(startMs)?Math.max(0,startMs/1000):0;
    const start=requestedStart<duration-.25?requestedStart:0;
    const requestedEnd=Number.isFinite(endMs)?Math.min(duration,endMs/1000):duration;
    const end=Math.min(start+30,requestedEnd-start>=.25?requestedEnd:duration);
    const length=Math.max(1,Math.floor((end-start)*rate));
    const mixed=this.ctx.createBuffer(2,length,rate);
    let peak=0;
    for(let channel=0;channel<2;channel++){
      const samples=mixed.getChannelData(channel);
      for(const [index,buffer] of buffers.entries()){
        const source=buffer.getChannelData(Math.min(channel,buffer.numberOfChannels-1));
        const offset=Math.round((start-(offsets[index]||0)/1000)*rate);
        const first=Math.max(0,-offset),last=Math.min(length,source.length-offset);
        for(let i=first;i<last;i++)samples[i]+=source[i+offset];
      }
      const fade=Math.min(Math.round(rate*.03),Math.floor(length/2));
      for(let i=0;i<fade;i++){
        const gain=i/fade;
        samples[i]*=gain;
        samples[length-1-i]*=gain;
      }
      for(const sample of samples)peak=Math.max(peak,Math.abs(sample));
    }
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),now=this.ctx.currentTime;
    source.buffer=mixed;
    source.loop=true;
    gain.gain.setValueAtTime(0,now);
    gain.gain.linearRampToValueAtTime(.55/Math.max(1,peak),now+.04);
    source.connect(gain);
    gain.connect(this.master);
    source.onended=()=>{source.disconnect();gain.disconnect();};
    this.preview={source,gain};
    source.start(now);
    return true;
  }
  stopPreview(){
    if(!this.preview)return;
    const {source,gain}=this.preview,now=this.ctx.currentTime;
    this.preview=null;
    if(gain.gain.cancelAndHoldAtTime)gain.gain.cancelAndHoldAtTime(now);
    else{const value=gain.gain.value;gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(value,now);}
    gain.gain.linearRampToValueAtTime(0,now+.03);
    source.stop(now+.035);
  }
  trimSongs(keep=[]){for(const url of keep)this.musicURLs.add(url);const songs=[...this.musicURLs].filter(k=>this.cache.has(k));let remaining=songs.length;for(const key of songs)if(remaining>Math.max(2,keep.length)&&!keep.includes(key)){this.cache.delete(key);this.musicURLs.delete(key);remaining--;}}
  spectrum(){if(this.analyser&&this.running)this.analyser.getByteFrequencyData(this.frequencyData);return this.frequencyData||new Uint8Array(128);}
  start(position=0){
    this.stopSources();this.stopPreview();this.stopMenu();this.position=position;this.clockStart=this.ctx.currentTime;this.running=true;this.music.gain.value=1;this.voices.gain.cancelScheduledValues(this.ctx.currentTime);this.voices.gain.value=this.allowVoices?1:0;
    this.sources=this.buffers.map((buffer,i)=>{const s=this.ctx.createBufferSource();s.buffer=buffer;s.connect(i===0||this.trackRoles[i]==='opponent'&&this.allowVoices?this.music:this.voices);const trackOffset=(this.trackOffsets[i]||0)/1000,relative=position/1000-trackOffset,delay=Math.max(0,-relative),offset=Math.max(0,relative);if(offset<buffer.duration)s.start(this.ctx.currentTime+delay,offset);return s;});
  }
  time(){return this.running?this.position+(this.ctx.currentTime-this.clockStart)*1000:this.position;}
  pause(){if(!this.running)return;this.position=this.time();this.running=false;this.stopSources();}
  resume(){this.start(this.position);}
  stopSources(){for(const s of this.sources){try{s.stop();}catch{}s.disconnect();}this.sources=[];}
  stop(){this.position=0;this.running=false;this.stopSources();}
  muteVoices(muted){if(this.voices)this.voices.gain.setTargetAtTime(muted||!this.allowVoices?0:1,this.ctx.currentTime,0.015);}
}
