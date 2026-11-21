import {applyOfficialCanNote} from './official-polish.js?v=52a31721d8bc6d';

const EXPANDED_NOTE_POSES={ugh:'ugh',hehprettygood:'hehPrettyGood',skyughnote:'ugh',skyheynote:'hey',
  lightcan:'lightCan',kneecan:'kneeCan',kickcan:'kickCan',cockgun:'cock',firegun:'shoot'};
const FIGHT_POSES={block:'block',dodge:'dodge',hithigh:'hitHigh',hitlow:'hitLow',hitspin:'hitSpin',
  idle:'idle',taunt:'taunt',fakeout:'fakeout',reversefakeout:'fakeout',tauntforce:'taunt'};

export function expandedNote(game,note,time,actors,playSound,miss=false,animationDuration=()=>0){
  const side=note.player?'player':'opponent',rival=note.player?'opponent':'player';
  const kind=String(note.kind||'').toLowerCase(),special=kind.replace(/^weekend-1-/,'');
  const force=(role,name,length=430)=>{
    if(name)actors[role].forced={name,since:time,until:time+length,lock:true};
  };
  if(game.choice.baseSong==='blazin'){
    const punch=side=>{const options=['punchHigh1','punchHigh2','punchLow1','punchLow2'].filter(pose=>pose!==game.lastPunch);const name=options[Math.floor(Math.random()*options.length)];game.lastPunch=name;force(side,name);return name;};
    if(kind==='blazinpunchrandomizenote'||miss){
      const attacker=miss?'opponent':Math.random()<0.5?side:rival,defender=attacker==='player'?'opponent':'player';
      const attack=punch(attacker),hit=attack.startsWith('punchLow')?'hitLow':'hitHigh';
      const responses=['block','dodge',hit].filter(pose=>pose!==game.lastDefense);
      const defense=miss?hit:responses[Math.floor(Math.random()*responses.length)];game.lastDefense=defense;
      force(defender,defense);game.fightLead=attacker;game.lastStrike=time;
    }else if(special.includes('uppercut')){
      const attacker=special.startsWith('darnell')?'opponent':'player';
      const prepare=special.endsWith('prep');force(attacker,prepare?'uppercutPrep':'uppercut',700);
      if(!prepare){force(attacker==='player'?'opponent':'player','uppercutHit',650);game.lastStrike=time;}
      game.fightLead=attacker;
    }else if(special.startsWith('punch')){
      force(side,(special.startsWith('punchlow')?'punchLow':'punchHigh')+(special.endsWith('spin')?2:1));
      force(rival,special.endsWith('blocked')?'block':special.endsWith('dodged')?'dodge':special.endsWith('spin')?'hitSpin':special.startsWith('punchlow')?'hitLow':'hitHigh');
      game.lastStrike=time;game.fightLead=side;
    }else if(/^(block|dodge|hit)(high|low|spin)$/.test(special)){
      const jab=special.endsWith('low')?'punchLow':'punchHigh';
      const variant=game.lastPunch===jab+'1'?2:1;
      game.lastPunch=jab+variant;
      force(rival,game.lastPunch);
      force(side,FIGHT_POSES[special]||special.replace(/(high|low|spin)$/,''));
      game.fightLead=rival;
      game.lastStrike=time;
    }else{
      force(side,FIGHT_POSES[special]||(special.startsWith('block')?'block':special.startsWith('dodge')?'dodge':null));
    }
    return;
  }
  if(applyOfficialCanNote(game,special,time,actors,playSound,miss))return;
  if(miss)return;
  if(special==='hehprettygood'||special==='vampheynote'){
    const name=special==='hehprettygood'?'hehPrettyGood':'hey';
    const length=animationDuration(side,name);
    if(length>0&&!(actors[side].forced?.name===name&&time<actors[side].forced.until)){
      const since=note.player?time:note.time;
      actors[side].forced={name,since,until:since+length,lock:true};
    }
    return;
  }
  force(side,EXPANDED_NOTE_POSES[special],410);
}

export function drawExpandedRain(ctx,time,intensity=1){
  ctx.save();ctx.strokeStyle='rgba(175,210,255,.22)';ctx.lineWidth=1.35;ctx.beginPath();
  for(let i=0;i<84;i++){
    const t=time*.8,x=((i*173-t*.21)%1450+1450)%1450-70,y=((i*123+t*(.9+i%4*.12))%830+830)%830-45;
    const size=(13+i%6*4)*intensity;
    ctx.moveTo(x,y);ctx.lineTo(x-size*.25,y+size);
  }
  ctx.stroke();ctx.restore();
}
