'use strict';
/* =========================================================
   ХОД ВРАГОВ
   ========================================================= */
function pickTarget(m){
  if(G.lures&&G.lures.length&&!m.boss&&!m.elite){const l=G.lures.filter(x=>G.round<=x.until&&dist(m.c,m.r,x.c,x.r)<=m.mv*2+3).sort((a,b)=>dist(m.c,m.r,a.c,a.r)-dist(m.c,m.r,b.c,b.r))[0];if(l)return {c:l.c,r:l.r,lure:l,d:{n:'приманку'}};}
  const hs=G.heroes.filter(h=>h.alive);if(G.npc&&G.npc.alive&&G.npc.freed)hs.push(G.npc);if(!hs.length)return null;
  const tank=hs.find(h=>h.id==='tank'&&h.taunt);
  if(tank&&dist(m.c,m.r,tank.c,tank.r)<=m.mv+m.rng+3)return tank;
  const pd=x=>dist(m.c,m.r,x.c,x.r)-(x.npc?2:0)-(x.items&&x.items.includes('c_crown')?3:0);
  hs.sort((a,b)=>pd(a)-pd(b)||a.hp-b.hp);
  return hs[0];
}
function monReach(m){
  const dm=new Map([[key(m.c,m.r),0]]),q=[[m.c,m.r]];
  while(q.length){const [c,r]=q.shift();const d=dm.get(key(c,r));if(d>=m.mv)continue;
    for(const [x,y] of nb(c,r)){const k=key(x,y);if(dm.has(k))continue;const cl=cellOf(x,y);
      if(cl.block||(cl.token&&!m.hunter)||cl.dragon||heroAt(x,y)||monsterAt(x,y)||npcAt(x,y))continue;dm.set(k,d+1);q.push([x,y]);}}
  return dm;
}
function chooseDest(m,t,rand){
  const dm=monReach(m);let best=null,bs=1e9;
  const cur=dist(m.c,m.r,t.c,t.r);
  dm.forEach((steps,k)=>{
    const [c,r]=k.split(',').map(Number);if(m.hunter&&cellOf(c,r).token)return;const d=dist(c,r,t.c,t.r);
    const s=Math.max(0,d-m.rng)*10+steps+(rand?Math.random()*0.5:(c*7+r)*0.0001);
    if(s<bs){bs=s;best=[c,r,d];}
  });
  if(best&&(best[2]<cur||(best[2]<=m.rng&&cur>m.rng))&&(best[0]!==m.c||best[1]!==m.r))return best;
  return null;
}
function moveToward(m,t){const b=chooseDest(m,t,true);if(b){m.c=b[0];m.r=b[1];enterCell(m,false);}}
/* намерения врагов: что сделает монстр в свой ход (для подсказки на карте) */
function computeIntents(){
  for(const m of G.monsters){
    m.int=null;if(!m.alive||m.boss)continue;const b=monB(m);if(!b)continue;
    if(m.stun){m.int={k:'stun'};continue;}
    const lairR=m.lair||b.lair;if(lairR&&!m.aggro&&!(m.hit&&m.hit.size)){m.int={k:'sleep'};continue;}
    const t=pickTarget(m);if(!t)continue;
    if(b.summon&&m.cd<=0&&G.monsters.filter(x=>x.alive&&x.id===(typeof b.summon==='string'?b.summon:'skel')&&x.summoned).length<(b.sumMax||2)){m.int={k:'summon'};continue;}
    if(b.nova&&m.hp<=m.max/2&&(m.ncd||0)<=0){m.int={k:'summon'};continue;}
    if(b.web&&(m.wcd||0)<=0&&G.heroes.some(h=>h.alive&&dist(h.c,h.r,m.c,m.r)<=4)){m.int={k:'summon'};continue;}
    if(b.healer){const w=G.monsters.filter(x=>x.alive&&x!==m&&!x.boss&&x.hp<x.max&&dist(m.c,m.r,x.c,x.r)<=3)[0];if(w){m.int={k:'heal',tc:w.c,tr:w.r};continue;}}
    let dc=m.c,dr=m.r;
    if(dist(m.c,m.r,t.c,t.r)>m.rng&&!m.root){const d=chooseDest(m,t,false);if(d){dc=d[0];dr=d[1];}}
    const inR=dist(dc,dr,t.c,t.r)<=m.rng;
    let dmg=t.lure?0:Math.max(1,Math.round(m.atk+.5-(b.pierce?0:st(t,'def'))));if(t.block)dmg=0;
    m.int={k:inR?(m.rng>1?'ranged':'melee'):'move',dc,dr,tc:t.c,tr:t.r,dmg:inR?dmg:0};
  }
}
function monTick(m){
  if(G.weather==='rain')m.burn=0;
  if(m.burn>0){m.burn--;m.hp-=2;pop(m,'ОГОНЬ -2','#f80');log(m.n+' горит (−2 HP).');if(m.hp<=0){killMon(m,null);return false;}}
  if(m.bleed>0){m.bleed--;m.hp-=1;pop(m,'КРОВЬ -1','#f55');log(m.n+' истекает кровью (−1 HP).');if(m.hp<=0){killMon(m,null);return false;}}
  return true;
}
async function monsterAct(m){
  if(!monTick(m))return;
  if(MON[m.id]&&MON[m.id].key&&m.elite&&m.aggro&&bossPhase(m)){await sleep(500);return;}
  if(m.id==='spiderqueen'&&m.ph>=2){G.heroes.filter(h=>h.alive&&dist(h.c,h.r,m.c,m.r)<=1).forEach(h=>{h.poison=Math.max(h.poison||0,2);pop(h,'ЯД','#8ae850');});}
  const rooted=m.root;m.root=false;
  if(m.stun){m.stun=false;log(m.n+' оглушён и пропускает ход.');return;}
  const b=monB(m);
  const lairR=m.lair||b.lair;
  if(lairR&&!m.aggro){const near=G.heroes.some(h=>h.alive&&dist(h.c,h.r,m.c,m.r)<=lairR);if(!near&&!m.hit.size)return;m.aggro=true;log(m.n+' поднимается с трона!');sfx('roar');}
  if(b.regen&&m.hp<m.max){m.hp=Math.min(m.max,m.hp+b.regen);pop(m,'+'+b.regen);}
  const t=pickTarget(m);if(!t)return;
  if(b.nova&&m.hp<=m.max/2){
    if((m.ncd||0)>0)m.ncd--;
    else{m.ncd=2;sfx('boom');fxQ({burst:'boom',c:m.c,r:m.r});log(m.n+' выпускает Ледяной взрыв!');pop(m,'ВЗРЫВ','#9df');
      G.heroes.filter(h=>h.alive&&dist(h.c,h.r,m.c,m.r)<=2).forEach(h=>{hitHero(h,4,m,{pierce:true});if(h.alive){h.chill=1;pop(h,'ХОЛОД','#9df');}});
      await sleep(300);return;}
  }
  if(b.web){
    if((m.wcd||0)>0)m.wcd--;
    else{const tg=G.heroes.filter(h=>h.alive&&dist(h.c,h.r,m.c,m.r)<=4).sort((a,c)=>dist(a.c,a.r,m.c,m.r)-dist(c.c,c.r,m.c,m.r)).slice(0,2);
      if(tg.length){m.wcd=m.ph>=2?1:2;sfx('arrow');log(m.n+' плюёт липкой паутиной!');tg.forEach(h=>{shoot(m,h,'magic');hitHero(h,2,m,{pierce:true});if(h.alive){h.chill=1;pop(h,'ПАУТИНА','#ddd');}});await sleep(300);return;}}
  }
  if(b.summon){
    if(m.cd>0)m.cd--;
    else if(G.monsters.filter(x=>x.alive&&x.id===(typeof b.summon==='string'?b.summon:'skel')&&x.summoned).length<(b.sumMax||2)){
      const sid=typeof b.summon==='string'?b.summon:'skel';const f=freeNear(m.c,m.r);
      if(f){const s=spawnMon(sid,f[0],f[1]);s.xp=0;s.summoned=true;m.cd=2;log(m.n+' призывает: '+MON[sid].n+'!');sfx('summon');fxQ({burst:'spawn',c:s.c,r:s.r});return;}
    }
  }
  if(b.healer){const w=G.monsters.filter(x=>x.alive&&x!==m&&!x.boss&&x.hp<x.max&&dist(m.c,m.r,x.c,x.r)<=3).sort((a,c)=>a.hp/a.max-c.hp/c.max)[0];
    if(w){const g=Math.min(b.healer,w.max-w.hp);w.hp+=g;pop(w,'+'+g,'#8f8');sfx('heal');log(m.n+' лечит '+w.n+' на '+g+' HP.');return;}}
  const sc=m.c,sr=m.r;
  if(dist(m.c,m.r,t.c,t.r)>m.rng){if(rooted)log(m.n+' пригвождён и не может двигаться.');else{moveToward(m,t);await sleep(120);}}
  if(t.lure){if(dist(m.c,m.r,t.c,t.r)<=1){G.lures=G.lures.filter(x=>x!==t.lure);log(m.n+' раздирает приманку.');pop(m,'ЧАВК','#ff8a7a');}return;}
  if(dist(m.c,m.r,t.c,t.r)<=m.rng){
    let atk=m.atk+rnd(0,1);if(b.rage&&m.hp<=m.max/2)atk+=1;
    if(b.charge&&(m.c!==sc||m.r!==sr)){atk+=2;log(m.n+' бьёт с разбега!');}
    log(m.n+' атакует '+t.d.n+'.');sfx(m.rng>1?'arrow':'claw');
    if(dist(m.c,m.r,t.c,t.r)>1)shoot(m,t,b.chill?'ice':(b.pierce||b.summon)?'magic':'arrow');
    else fxQ({burst:'lunge',c:m.c,r:m.r,tc:t.c,tr:t.r});
    const tl=b.sweep?G.heroes.filter(x=>x.alive&&dist(x.c,x.r,m.c,m.r)<=1):[t];if(!tl.length)tl.push(t);
    if(b.sweep&&tl.length>1)log(m.n+' бьёт всеми головами!');
    for(const tt of tl){
      if(!tt.alive)continue;
      const d=hitHero(tt,atk,m,{pierce:!!b.pierce});
      if(b.bleed&&d>0&&tt.alive){tt.bleed=Math.max(tt.bleed||0,b.bleed);log(tt.d.n+' истекает кровью!');pop(tt,'КРОВЬ','#f55');}
      if(b.chill&&d>0&&tt.alive){tt.chill=1;log(tt.d.n+' промерзает: −1 ОД в следующем раунде.');pop(tt,'ХОЛОД','#9df');}
      if(b.poison&&d>0&&tt.alive){tt.poison=Math.max(tt.poison||0,b.poison+1);sfx('poison');log(tt.d.n+' отравлен!');pop(tt,'ЯД');}
      if(b.burn&&d>0&&tt.alive){tt.burn=Math.max(tt.burn||0,2);sfx('fire');log(tt.d.n+' загорается!');pop(tt,'ГОРИТ','#f80');}
      if(b.drain&&d>0&&m.alive&&m.hp<m.max){const g=Math.min(d,m.max-m.hp);m.hp+=g;pop(m,'+'+g,'#f66');}
    }
  }
}
async function monstersPhase(){
  for(const m of G.monsters.filter(x=>x.alive&&!x.boss)){
    if(!m.alive)continue;
    await monsterAct(m);ui();
    if(checkEnd())return;
    await sleep(200);
  }
  if(G.dragon&&G.dragon.alive){await dragonTurn();ui();if(checkEnd())return;}
  newRound();
}
async function dragonTurn(){
  const d=G.dragon,enr=d.hp<=d.max/2;
  log('--- Ход Дракона ---');
  if(!d.ph2&&d.hp<=d.max*.25){d.ph2=true;phaseAnnounce(d,'ПОСЛЕДНИЙ ВЗДОХ','Дракон в агонии: лава растекается, огонь бьёт по троим');await sleep(500);}
  if(d.ph2){shuffle(G.grid.flat().filter(c=>!c.block&&!c.dragon&&!c.terr&&!heroAt(c.c,c.r)&&!monsterAt(c.c,c.r))).slice(0,3).forEach(c=>{c.terr='lava';fxQ({burst:'fire',c:c.c,r:c.r});});log('Лава растекается по логову!');}
  if(G.tele){
    log('Пламя обрушивается на отмеченные гексы!');sfx('boom');G.tele.cells.forEach(k=>{const [c,r]=k.split(',').map(Number);fxQ({burst:'boom',c,r});});
    G.tele.flash=performance.now();
    for(const h of G.heroes.filter(x=>x.alive)){if(G.tele.cells.has(key(h.c,h.r))){hitHero(h,8+d.bonus,d,{half:true});if(h.alive){h.burn=2;pop(h,'ГОРИТ','#f80');}}}
    await sleep(600);G.tele=null;ui();
    if(checkEnd())return;
  }
  const adj=G.heroes.filter(h=>h.alive&&mdist(h,d)<=1);
  const taunter=adj.find(h=>h.taunt);
  if(adj.length){
    if(adj.length>=2&&Math.random()<0.5){
      log('Дракон хлещет хвостом!');sfx('tail');adj.forEach(h=>{if(h.alive)hitHero(h,6+d.bonus,d);});
    }else{
      const t=taunter||adj.slice().sort((a,b)=>a.hp-b.hp)[0];
      log('Дракон бьёт когтями '+t.d.n+'!');sfx('claw');hitHero(t,d.atk+rnd(0,1)+d.bonus-1,d);
      if(enr){const rest=adj.filter(h=>h.alive);if(rest.length){const t2=pick(rest);log('В ярости Дракон бьёт снова!');hitHero(t2,d.atk+rnd(0,1)+d.bonus-1,d);}}
    }
  }
  if((!adj.length||enr)&&G.monsters.filter(m=>m.alive&&m.id==='whelp').length<(enr?3:2)){
    const spots=shuffle(G.grid.flat().filter(c=>!c.block&&!c.dragon&&!c.token&&!heroAt(c.c,c.r)&&!monsterAt(c.c,c.r)&&dist(c.c,c.r,d.c,d.r)<=3));
    if(spots[0]){const w=spawnMon('whelp',spots[0].c,spots[0].r);log('Дракон рычит и призывает дракончика!');sfx('roar');}
  }
  await sleep(300);
  if(checkEnd())return;
  // новая телеграфируемая атака
  const alive=G.heroes.filter(h=>h.alive);
  if(alive.length){
    const score=h=>alive.filter(x=>dist(x.c,x.r,h.c,h.r)<=1).length+Math.random()*.5;
    const order=alive.slice().sort((a,b)=>score(b)-score(a));
    const tg=[order[0]];if(enr&&order.length>2)tg.push(order[order.length-1]);if(d.ph2&&order.length>3)tg.push(order[1]);
    const cells=new Set();
    tg.forEach(h=>{cells.add(key(h.c,h.r));nb(h.c,h.r).forEach(([x,y])=>cells.add(key(x,y)));});
    G.tele={cells,flash:0};
    sfx('inhale');log('Дракон вдыхает огонь! Отмеченные гексы вспыхнут в конце раунда — уходите!');
  }
}
function armTimer(){G.deadline=(NET.role==='host'&&NET.started&&NET.timer>0)?Date.now()+NET.timer*1000:0;}
function newRound(){
  G.round++;G.ready={};G.undo=null;armTimer();if(G.lures)G.lures=G.lures.filter(x=>G.round<=x.until);
  G.heroes.forEach(h=>{
    h.block=h.guard=h.taunt=false;h.xpFlag=false;h.rage=0;if(h.bless>0)h.bless--;
    if(h.alive&&h.items.includes('c_blade')&&h.hp>1){h.hp--;pop(h,'ПРОКЛЯТИЕ -1','#c58bff');}
    if(h.alive){
      const rg=itemFx(h,'regen');if(rg&&h.hp<st(h,'maxhp')){h.hp=Math.min(st(h,'maxhp'),h.hp+rg);pop(h,'+'+rg);}
      h.ap=st(h,'ap')+(h.haste?1:0);h.haste=false;
      if(hasRelic('moonstone')&&h.hp<st(h,'maxhp')){h.hp++;pop(h,'+1');}
      if(h.chill){h.ap=Math.max(0,h.ap-1);h.chill=0;}
      if(h.poison>0){h.poison--;h.hp-=1;pop(h,'ЯД -1');sfx('poison');log(h.d.n+' страдает от яда.');if(h.hp<=0)killHero(h);}
      if(G.weather==='rain')h.burn=0;
      if(h.alive&&h.burn>0){h.burn--;h.hp-=2;pop(h,'ОГОНЬ -2','#f80');sfx('fire');log(h.d.n+' горит (−2 HP).');if(h.hp<=0)killHero(h);}
      if(h.alive&&h.bleed>0){h.bleed--;h.hp-=1;pop(h,'КРОВЬ -1','#f55');log(h.d.n+' истекает кровью (−1 HP).');if(h.hp<=0)killHero(h);}
    }
  });
  G.heroes.filter(p=>p.alive&&hasPerk(p,'halo')).forEach(p=>G.heroes.forEach(x=>{if(x.alive&&dist(p.c,p.r,x.c,x.r)<=2&&x.hp<st(x,'maxhp'))healHero(p,x,2);}));
  alarmTick();huntTick();holdTick();hasteTick();
  G.busy=false;
  if(!checkEnd()){log('— Раунд '+G.round+' —');sfx('round');}
  ui();
}
async function endRound(){
  if(G.busy||G.over)return;
  G.busy=true;G.mode=null;G.undo=null;ui();
  if(G.heroes.some(h=>h.alive&&isAI(h))){await aiPhase();if(checkEnd()||G.over)return;}
  if(G.npc&&G.npc.alive&&G.npc.freed){npcMove();ui();await sleep(200);}
  log('— Ход врагов —');sfx('drum');
  await monstersPhase();
}
