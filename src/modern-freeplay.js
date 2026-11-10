// Modern freeplay presentation, using the user's locally installed FNF artwork.
// This module is independent of game state. draw() returns semantic click targets.
const DIGITS=['ZERO','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE'];
const FP_RANK_BADGES={PERFECT_GOLD:'PERFECT rank GOLD',PERFECT:'PERFECT rank0',EXCELLENT:'EXCELLENT rank',GREAT:'GREAT rank',GOOD:'GOOD rank',SHIT:'LOSS rank'};
const IMAGE_NAMES=['bg','capsule','selector','letters','highscore','normal','easy','hard','fav','dad','bficon','album','albumtitle','digits','smallnumbers','clear','rank','inst','bpm','difficulty','pink','glow','dot','sparkle','dj','erect','nightmare','album3','album3title','album4','album4title','picoicon','bgpico','bfportrait','picoportrait','charselectbg','charselectselector','bfnametag','piconametag','picodj','spookyicon','monstericon','album2','album2title','momicon','gficon','expansion1','expansion1title','expansion2','expansion2title','parentsicon','senpaiicon','spiriticon'];
function label(ctx,str,x,y,size=24,color='#fff',align='left',outline=2){ctx.save();ctx.font=`${size}px VCR,monospace`;ctx.textAlign=align;ctx.textBaseline='top';ctx.lineJoin='round';ctx.lineWidth=outline*2;ctx.strokeStyle='#10101c';if(outline)ctx.strokeText(str,x,y);ctx.fillStyle=color;ctx.fillText(str,x,y);ctx.restore();}

export class ModernFreeplay {
  constructor(base='modern-'){this.base=base;this.images={};this.atlases={};this.groups=new Map();this.ready=false;this.previousSelection=null;this.selectionAt=0;this.idleCanvases=new Map();}
  async load(progress=()=>{}){let complete=0;const response=await fetch(this.base+'pack.json');if(!response.ok)throw new Error('Could not load modern freeplay artwork');const pack=await response.json();this.atlases=pack.atlases;this.dj=pack.dj;this.picoDJ=pack.picoDJ;await Promise.all(IMAGE_NAMES.map(async n=>{const img=new Image();img.src=pack.images[n];await img.decode();this.images[n]=img;progress(++complete/IMAGE_NAMES.length);}));
    // Precompose the 14 idle frames once. Freeplay animates one compact bitmap per frame.
    for(let index=17;index<31;index++){const off=document.createElement('canvas');off.width=405;off.height=452;const context=off.getContext('2d');context.translate(0,-268);this.drawDJFrame(context,index);this.idleCanvases.set(index,off);}this.tintedDigits=document.createElement('canvas');this.tintedDigits.width=this.images.digits.width;this.tintedDigits.height=this.images.digits.height;const tint=this.tintedDigits.getContext('2d');tint.drawImage(this.images.digits,0,0);tint.globalCompositeOperation='source-in';tint.fillStyle='#75efff';tint.fillRect(0,0,this.tintedDigits.width,this.tintedDigits.height);this.ready=true;return this;
  }
  frames(name,prefix){const key=name+'|'+prefix;if(!this.groups.has(key))this.groups.set(key,(this.atlases[name]||[]).filter(f=>f.name.startsWith(prefix)));return this.groups.get(key);}
  sprite(ctx,name,prefix,x,y,scale=1,index=0,alpha=1){const list=this.frames(name,prefix),f=list[((Math.floor(index)%list.length)+list.length)%list.length];if(!f)return;ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(this.images[name],f.x,f.y,f.width,f.height,x-(f.frameX||0)*scale,y-(f.frameY||0)*scale,f.width*scale,f.height*scale);ctx.restore();}
  image(ctx,name,x,y,w,h,alpha=1){const img=this.images[name];if(!img)return;ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(img,x,y,w??img.width,h??img.height);ctx.restore();}
  albumImage(album){return this.skyAlbums?.[album]&&this.images[album]?album:({volume2:'album2',volume3:'album3',volume4:'album4',expansion1:'expansion1',expansion2:'expansion2'}[album]||'album');}
  number(ctx,value,x,y,scale=1,{align='left',pad=0,small=false}={}){const name=small?'smallnumbers':'digits',str=String(Math.max(0,Math.round(Number(value)||0))).padStart(pad,'0');const glyphs=[...str].map(c=>this.frames(name,DIGITS[Number(c)])[0]);const width=glyphs.reduce((s,g)=>s+(g?.width||40)*scale,0);let dx=x-(align==='right'?width:align==='center'?width/2:0);for(const f of glyphs){if(f){ctx.drawImage(small?this.images[name]:this.tintedDigits,f.x,f.y,f.width,f.height,dx,y,f.width*scale,f.height*scale);dx+=f.width*scale;}}return width;}
  drawDJFrame(ctx,index,pico=false){const sky=this.character==='sky'&&this.skyDJ,commands=(sky?.timeline||(pico?this.picoDJ:this.dj)).frames[index]||[];ctx.save();if(sky?.timeline?.stageMatrix)ctx.transform(...sky.timeline.stageMatrix);for(const command of commands){const [x,y,w,h]=command.r;ctx.save();ctx.globalAlpha*=command.a??1;ctx.transform(...command.m);ctx.drawImage(sky?.image||(pico?this.images.picodj:this.images.dj),x,y,w,h,0,0,w,h);ctx.restore();}ctx.restore();}
  drawDJ(ctx,time,reducedMotion,animation='idle'){
    let localTime=time;if(!reducedMotion&&animation==='idle'){if(time<708)animation='intro';else if(time-this.selectionAt>80000){animation='watchingTV';localTime=time-this.selectionAt-80000;}else if(time-this.selectionAt>45000){animation='afk';localTime=time-this.selectionAt-45000;}}
    const pico=this.character==='pico',sky=this.character==='sky'&&this.skyDJ,data=sky?.timeline||(pico?this.picoDJ:this.dj);const [start,length]=data.labels[animation]||data.labels.idle,index=start+(reducedMotion?0:['intro','characterSelect','confirm','fistPump','loss'].includes(animation)?Math.min(length-1,Math.floor(localTime*24/1000)):Math.floor(localTime*24/1000)%length);const key=sky?'sky:'+index:pico?'pico:'+index:index;let cached=this.idleCanvases.get(key);if(!cached&&(pico||sky)&&animation==='idle'){cached=document.createElement('canvas');cached.width=435;cached.height=460;const c=cached.getContext('2d');c.translate(0,-260);this.drawDJFrame(c,index,pico);this.idleCanvases.set(key,cached);}if(cached)ctx.drawImage(cached,0,sky||pico?260:268);else this.drawDJFrame(ctx,index,pico);
  }
  rankBadge(ctx,rank,x,y,scale,time=0,alpha=1){
    const prefix=FP_RANK_BADGES[rank];
    if(!prefix)return;
    const f=this.frames('rank',prefix)[0];
    if(f)this.sprite(ctx,'rank',prefix,x-f.width*scale/2,y-f.height*scale/2,scale,time,alpha);
  }
  drawRankReveal(ctx,reveal,song,age,reducedMotion){
    const settle=Math.min(1,Math.max(0,(age-1150)/700));
    const start=age<500?reveal.oldRank:reveal.rank;
    const scale=reducedMotion?1.1:1.35-.35*settle;
    const slam=age>=500&&age<640&&!reducedMotion?1+2*(1-(age-500)/140)**3:1;
    ctx.save();
    ctx.globalAlpha=1-settle;
    ctx.fillStyle='#050011bd';ctx.fillRect(0,0,1280,720);
    ctx.translate(640-25*settle,360-18*settle);ctx.scale(scale,scale);
    this.capsule(ctx,{song,x:-244,y:-51,selected:true,time:age,previewing:false});
    this.rankBadge(ctx,start,185,-9,1.2*slam,Math.floor(age/45));
    if(age>=600&&age<980&&!reducedMotion){ctx.globalCompositeOperation='lighter';this.sprite(ctx,'sparkle','sparkle Export',140,-58,1.7,Math.floor((age-600)/39),1-(age-600)/380);}
    ctx.restore();
  }
  arrow(ctx,x,y,right=false){ctx.save();ctx.translate(x,y);if(right)ctx.scale(-1,1);ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-10,25);ctx.lineTo(12,50);ctx.lineTo(12,37);ctx.lineTo(2,25);ctx.lineTo(12,13);ctx.closePath();ctx.lineJoin='miter';ctx.lineWidth=9;ctx.strokeStyle='#000';ctx.stroke();ctx.fillStyle='#22d1e4';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#d7fdff';ctx.stroke();ctx.restore();}
  capsule(ctx,{song,x,y,selected,time,difficulty,favorite,record,previewing}){const scale=0.82;const prefix=selected?'mp3 capsule w backing0':'mp3 capsule w backing NOT SELECTED';const capsule=this.character==='sky'&&this.frames('skyCapsule',prefix).length?'skyCapsule':'capsule';this.sprite(ctx,capsule,prefix,x,y,scale,selected?Math.floor(time/90)%8:0,selected?1:0.8);
    if(song.id!=='random'){ctx.save();ctx.imageSmoothingEnabled=false;const icon=this.characterIcons?.[song.opponent];this.sprite(ctx,icon|| (song.opponent?.includes('parents')?'parentsicon':song.opponent?.includes('senpai')?'senpaiicon':song.opponent==='spirit'?'spiriticon':song.opponent?.includes('mom')?'momicon':song.opponent==='gf'?'gficon':song.opponent?.includes('pico')?'picoicon':song.opponent?.includes('spooky')?'spookyicon':song.opponent?.includes('monster')?'monstericon':'dad'),selected?'confirm-hold':'idle',x-2,y+28,1.65);ctx.restore();}
    label(ctx,song.name,x+65,y+23,27,selected?'#e9ffff':'#a1b0b9','left',2);
    if(song.id!=='random'){this.image(ctx,'bpm',x+62,y+83,28,16,selected?0.9:0.55);label(ctx,String(song.bpm||100),x+94,y+84,16,selected?'#8c97a0':'#4b5460','left',0);const week=typeof song.week==='number'?(song.week?'WEEK '+song.week:'TUTORIAL'):song.week==='weekend1'?'WEEKEND 1':song.week==='sky'?'SKY REBORN':'MOD';label(ctx,week,x+203,y+84,16,selected?'#8c97a0':'#4b5460','left',0);this.image(ctx,'difficulty',x+350,y+83,65,16,selected?0.8:0.45);if(record?.nativeRank)this.rankBadge(ctx,record.nativeRank,x+424,y+43,.92,selected?Math.floor(time/50):0);else if(record)label(ctx,record.rank||'',x+434,y+32,23,'#52f1f8','center',2);}
    if(favorite)this.sprite(ctx,'fav','favorite heart',x+443,y+17,0.65,0);
    if(selected&&previewing){for(let i=0;i<4;i++){const height=6+(Math.sin(time/110+i*1.6)+1)*8;ctx.fillStyle='#67f0fa';ctx.fillRect(x+430+i*8,y+58-height,5,height);}}
  }
  draw(ctx,state={}){
    const {time=0,difficulty=1,records={},favorites=[],filter='all',search='',sort='default',songs=[],previewing=false,reducedMotion=false,character='bf',album='volume1'}=state;this.character=character;
    if(!this.ready){ctx.fillStyle='#000';ctx.fillRect(0,0,1280,720);label(ctx,'LOADING FREEPLAY…',640,340,32,'#fff','center');return [];}
    const targets=[],add=(id,labelText,x,y,w,h,action,value)=>targets.push({id,label:labelText,x,y,w,h,action,value});
    let selectedSong=state.selectedSong;if(typeof selectedSong==='number')selectedSong=songs[selectedSong]?.id;selectedSong=selectedSong?.id||selectedSong||songs[0]?.id||'random';
    if(this.previousSelection!==selectedSong){this.previousSelection=selectedSong;this.selectionAt=time;}
    const song=songs.find(s=>s.id===selectedSong),record=records[selectedSong]||null;const favSet=new Set(favorites instanceof Set?[...favorites]:favorites);
    ctx.save();ctx.fillStyle='#171629';ctx.fillRect(0,0,1280,720);this.image(ctx,character==='sky'?'skyBg':character==='pico'?'bgpico':'bg',342,64,1043,656);
    ctx.fillStyle='#ffda55';ctx.beginPath();ctx.moveTo(0,64);ctx.lineTo(395,64);ctx.lineTo(555,720);ctx.lineTo(0,720);ctx.closePath();ctx.fill();
    ctx.save();ctx.beginPath();ctx.moveTo(0,64);ctx.lineTo(395,64);ctx.lineTo(555,720);ctx.lineTo(0,720);ctx.closePath();ctx.clip();
    if(character==='pico')this.backingCard?.drawPicoCard(ctx,time,{reducedMotion});if(character==='sky'){this.image(ctx,'skyCard',0,64,570,656);for(const [i,name] of ['skyClouds','skyHeads','skyLines','skyAurora'].entries()){const offset=reducedMotion?0:time/(58+i*22)%555;this.image(ctx,name,-offset,64,555,656,.7);this.image(ctx,name,555-offset,64,555,656,.7);}}const phrases=['MORE WAYS THAN ONE','BOYFRIEND','IT\'S PERFECTLY NORMAL','HOTTEST TRACKS','MORE WAYS THAN ONE','BOYFRIEND'];
    if(character==='bf')phrases.forEach((p,i)=>{const offset=reducedMotion?0:(time/45*(i%2?1:-1))%330;label(ctx,p,offset-145,162+i*74,39,i%2?'#f4a04f':'#fff19b','left',0);label(ctx,p,offset+440,162+i*74,39,i%2?'#f4a04f':'#fff19b','left',0);});ctx.restore();
    // Album panel and dotted arc are behind the song capsules and DJ.
    ctx.save();ctx.strokeStyle='#edf3f6';ctx.lineWidth=4;ctx.lineCap='round';ctx.setLineDash([0,20]);ctx.beginPath();ctx.arc(1106,505,255,-2.2,0.9);ctx.stroke();ctx.restore();
    const albumImage=this.albumImage(album),albumTitle=albumImage+'title';const albumAngle=reducedMotion?0.17:0.17+Math.sin(time/2500)*0.025;ctx.save();ctx.translate(1100,458);ctx.rotate(albumAngle);this.image(ctx,albumImage,-142,-142,284,284);ctx.restore();
    this.sprite(ctx,albumTitle,'idle',978,570,0.85,Math.floor(time/110));
    add('fp-album','Album: '+(this.skyAlbums?.[album]?.name||'Friday Night Funkin OST'),950,290,330,350,'album',album);
    const reveal=state.rankReveal;
    this.drawDJ(ctx,reveal?.age??time,reducedMotion,reveal?(reveal.rank==='SHIT'?'loss':'fistPump'):state.djAnimation||'idle');
    const rows=[{id:'random',name:'Random'},...songs];let selectedIndex=rows.findIndex(s=>s.id===selectedSong);if(selectedIndex<0)selectedIndex=1;
    const originY=297-selectedIndex*118;
    ctx.save();ctx.beginPath();ctx.rect(350,142,610,500);ctx.clip();rows.forEach((s,i)=>{const y=originY+i*118,x=374+Math.max(0,i-selectedIndex+1)*15;if(y<-90||y>700)return;const active=s.id===selectedSong;this.capsule(ctx,{song:s,x,y,selected:active,time:time-this.selectionAt,difficulty,favorite:favSet.has(s.id),record:records[s.id],previewing:active&&previewing});if(y>=140&&y+109<=648)add('fp-song-'+s.id,s.id==='random'?'Play a random song':`Select ${s.name}`,x,y,502,107,'song',s.id);});ctx.restore();
    if(!songs.length)label(ctx,'NO SONGS MATCH',635,318,25,'#efffff','center');
    if(reveal&&song)this.drawRankReveal(ctx,reveal,song,reveal.age,reducedMotion);
    // Header, difficulty label, alphabet/favorites tabs and high score use the original artwork.
    ctx.fillStyle='#000';ctx.fillRect(0,0,1280,64);label(ctx,'FREEPLAY',8,11,38,'#fff','left',0);label(ctx,this.skyAlbums?.[album]?'SKY REBORN':'OFFICIAL OST',1270,11,38,'#fff','right',0);
    if(difficulty>4)label(ctx,state.difficultyLabel||'CUSTOM',200,95,30,'#111','center',0);const diff=['easy','normal','hard','erect','nightmare'][difficulty]||'normal',img=this.images[diff];if(diff==='nightmare')this.sprite(ctx,'nightmare','idle',66,80,1.12,Math.floor(time/60));else if(difficulty<=4)this.image(ctx,diff,70,80,Math.min(250,img.width*1.12),80);this.arrow(ctx,33,85);this.arrow(ctx,352,85,true);
    add('fp-diff-prev','Previous difficulty',9,75,55,85,'difficulty',-1);add('fp-diff-next','Next difficulty',327,75,55,85,'difficulty',1);
    const tabs=[{value:'numbers',prefix:'#',label:'#',w:43},{value:'favorites',prefix:'fav',label:'Favorites',w:48},{value:'all',prefix:'ALL',label:'All songs',w:64},{value:'a-d',text:'A-D',label:'Songs A through D',w:70},{value:'e-l',text:'E-L',label:'Songs E through L',w:70},{value:'m-r',text:'M-R',label:'Songs M through R',w:72},{value:'s-z',text:'S-Z',label:'Songs S through Z',w:72}];let tabX=400;
    for(const tab of tabs){const active=filter===tab.value||filter==='all'&&tab.value==='all';if(active){ctx.fillStyle='#0008';ctx.fillRect(tabX-4,73,tab.w+5,58);}if(tab.prefix)this.sprite(ctx,'letters',tab.prefix+' instance',tabX,80,tab.value==='all'?0.72:0.63,0,active?1:0.7);else label(ctx,tab.text,tabX+2,89,24,active?'#fff':'#aaa','left',2);add('fp-filter-'+tab.value,tab.label,tabX-5,73,tab.w,62,'filter',tab.value);tabX+=tab.w+6;}
    this.sprite(ctx,'highscore','highscore small instance',866,73,1.06,reducedMotion?0:Math.floor(time/80));this.number(ctx,record?.score||0,1226,133,0.87,{align:'right',pad:7});
    this.image(ctx,'clear',1175,71,103,50);label(ctx,`${record?Math.floor(record.accuracy||0):0}%`,1263,94,21,'#fff','right',0);
    if(song&&favSet.has(song.id))this.sprite(ctx,'fav','favorite heart',1131,167,0.6,0);
    add('fp-favorite','Toggle favorite for selected song',1169,170,100,50,'favorite',selectedSong);
    const detail=record?`${(record.accuracy||0).toFixed(2)}%  •  ${record.rank||'D'}  •  ${record.misses||0} MISSES`:'NO SCORE YET';label(ctx,detail,1258,213,17,'#d4e8f5','right',2);
    // The controls sit in the same low black band as the native game.
    ctx.fillStyle='#000d';ctx.fillRect(0,665,1280,55);label(ctx,'ESC BACK',17,684,18,'#fff','left',0);label(ctx,'SPACE PREVIEW   F FAVORITE   7 CHART EDITOR',1270,684,17,'#c6d4df','right',0);
    label(ctx,search?`SEARCH: ${search}`:'SEARCH SONGS  [CTRL+F]',434,638,18,'#dbeef4','left',2);add('fp-search','Search songs',420,623,430,40,'search');
    label(ctx,`SORT: ${String(sort).toUpperCase()}`,865,638,18,'#dbeef4','left',2);add('fp-sort','Change sort order',850,623,320,40,'sort');
    add('fp-back','Back to main menu',0,665,160,55,'back');
    add('fp-preview',previewing?'Stop song preview':'Preview selected song',1065,628,200,35,'preview',selectedSong);
    ctx.restore();return targets;
  }
}

export function modernLabel(...args){return label(...args);}
