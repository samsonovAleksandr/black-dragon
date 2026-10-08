'use strict';
/* =========================================================
   ИИ-СОЮЗНИКИ
   ========================================================= */
async function aiPhase(){
  log('— Ход союзников (ИИ) —');
  for(const h of G.heroes.filter(x=>x.alive&&isAI(x))){
    h.aiExp=0;h.aiHaste=0;h.aiRally=0;h.aiBless=0;
    const l=pendingPick(h);if(l){h.perks=h.perks||{};h.perks[l]=0;const o=h.d.lv[l].pick[0];if(o.ap)h.ap+=o.ap;log(h.d.n+' (ИИ) выбирает: «'+o.n+'».');}
    for(let i=0;i<8&&h.alive&&h.ap>0&&!G.over;i++){
      let did=false;try{did=aiStep(h);}catch(e){console.error(e);}
      if(!did)break;ui();await sleep(380);
    }
  }
}
const aiFoes=()=>G.monsters.filter(m=>m.alive&&fogOK(m)&&!((m.lair||(MON[m.id]&&MON[m.id].lair))&&!m.aggro));
function aiUse(h,id,tgt){
  const sp=ABIL[id];if(!sp||!habils(h).includes(id)||h.ap<sp.cost||(sp.once&&h.reviveUsed))return false;
  if(sp.t==='self'){execSpec(h,sp,null,{id});return true;}
  const v=validTargets(h,sp);const t=tgt&&[...v.entries()].find(([k,x])=>x===tgt||(tgt.c!=null&&k===key(tgt.c,tgt.r)));
  if(!t)return false;execSpec(h,sp,t[1],{id});return true;
}
// применить предмет по id: цель — объект (монстр/герой) или null для self
function aiItemOn(h,id,tgt){
  const slot=h.items.indexOf(id);if(slot<0)return false;
  const sp=ITEMS[id].use;if(!sp||h.ap<sp.cost)return false;
  if(sp.t==='self'){execSpec(h,sp,null,{slot});return true;}
  const v=validTargets(h,sp);let t=null;
  v.forEach(x=>{if(x===tgt)t=x;});
  if(!t)return false;execSpec(h,sp,t,{slot});return true;
}
const aiHas=(h,id)=>h.items.includes(id);
const aiNear=(a,b)=>dist(a.c,a.r,b.c,b.r);
const aiHurtFrac=x=>x.hp/st(x,'maxhp');
function aiSafe(h){
  const foes=aiFoes(),allies=G.heroes.filter(x=>x.alive);
  return !foes.some(m=>allies.some(a=>mdist(a,m)<=4))&&aiHurtFrac(h)>=.5;
}
// ближайший к герою «?» в радиусе 1 от него
const aiSkipTok=c=>c.token&&c.token.t==='portal'||c.token&&c.token.t==='event'&&EXTRA_EV.includes(c.token.e)&&c.token.e!=='campfire';
const aiAdjToken=h=>nb(h.c,h.r).map(([c,r])=>cellOf(c,r)).find(c=>c&&c.token&&!aiSkipTok(c));
function aiStep(h){
  const foes=aiFoes(),rng=st(h,'rng'),mx=st(h,'maxhp');
  const allies=G.heroes.filter(x=>x.alive);
  const humans=allies.filter(x=>!isAI(x));
  const inFight=foes.some(m=>allies.some(a=>mdist(a,m)<=5));
  // 1. уйти из-под огня Дракона
  if(G.tele&&G.tele.cells.has(key(h.c,h.r))&&aiMove(h,'safe'))return true;
  // 2. воскрешение
  const deadNear=G.heroes.find(x=>!x.alive&&dist(h.c,h.r,x.c,x.r)<=2);
  if(deadNear){
    if(aiUse(h,'revive',deadNear))return true;
    const dn1=G.heroes.find(x=>!x.alive&&dist(h.c,h.r,x.c,x.r)<=1);
    if(dn1&&aiHas(h,'feather')&&aiItemOn(h,'feather',dn1))return true;
  }
  // 3. лечение: Маг лечит охотно; в бою — порог выше
  if(h.id==='mage'){
    const lim=inFight?.75:.99;
    const hurt=allies.filter(x=>aiHurtFrac(x)<=lim&&aiNear(h,x)<=3).sort((a,b)=>aiHurtFrac(a)-aiHurtFrac(b));
    if(hurt.length>=2&&hurt.filter(x=>aiHurtFrac(x)<=.7).length>=2&&aiUse(h,'massheal'))return true;
    if(hurt[0]&&(inFight?hurt[0].hp<=st(hurt[0],'maxhp')-3:st(hurt[0],'maxhp')-hurt[0].hp>=3)&&aiUse(h,'heal',hurt[0]))return true;
  }
  if(h.id==='priest'){
    const lim=inFight?.75:.99;
    const near=allies.filter(x=>aiNear(h,x)<=2);
    const sick=near.filter(x=>(x.poison||x.burn||x.bleed)&&aiHurtFrac(x)<.95).sort((a,b)=>aiHurtFrac(a)-aiHurtFrac(b))[0];
    if(sick&&aiUse(h,'cleanse',sick))return true;
    const hurt=near.filter(x=>aiHurtFrac(x)<=lim).sort((a,b)=>aiHurtFrac(a)-aiHurtFrac(b));
    if(hurt[0]&&(inFight?hurt[0].hp<=st(hurt[0],'maxhp')-3:st(hurt[0],'maxhp')-hurt[0].hp>=3)&&aiUse(h,'mend',hurt[0]))return true;
    const weak=allies.filter(x=>x!==h&&aiNear(h,x)<=3&&aiHurtFrac(x)<=.4&&!x.block&&foes.some(m=>mdist(x,m)<=m.mv+m.rng+1))[0];
    if(inFight&&weak&&h.ap>=2&&aiUse(h,'ward',weak))return true;
  }
  if(h.id==='paladin'){
    const hurt=allies.filter(x=>x!==h&&aiNear(h,x)<=1&&aiHurtFrac(x)<=.5).sort((a,b)=>aiHurtFrac(a)-aiHurtFrac(b))[0];
    if(hurt&&aiUse(h,'layhands',hurt))return true;
    if(aiHurtFrac(h)<=.4&&aiUse(h,'layhands',h))return true;
  }
  // 4. зелья: себе и раненым соседям
  const cure=x=>aiHurtFrac(x)<=.4||(x.poison&&aiHurtFrac(x)<=.7);
  const woundedAdj=allies.filter(x=>cure(x)&&aiNear(h,x)<=1).sort((a,b)=>aiHurtFrac(a)-aiHurtFrac(b))[0];
  if(woundedAdj){
    for(const id of ['antidote','potion','elixir']){
      if(id==='antidote'&&!woundedAdj.poison)continue;
      if(aiHas(h,id)&&aiItemOn(h,id,woundedAdj))return true;}
  }
  if(h.id==='tank'&&aiHurtFrac(h)<=.35&&aiUse(h,'second'))return true;
  // 5. Танк прикрывает раненых союзников
  if(h.id==='tank'&&inFight&&!h.taunt&&allies.some(x=>x!==h&&aiHurtFrac(x)<=.5)&&foes.some(m=>mdist(h,m)<=m.mv+m.rng+2)&&aiUse(h,'taunt'))return true;
  // 6. бой
  const inR=foes.filter(m=>mdist(h,m)<=rng);
  const adj=foes.filter(m=>mdist(h,m)<=1).length;
  if(inR.length){
    const mk=x=>x.mark&&x.mark.by!==h.id&&G.round<=x.mark.until?1:0;
    const t=inR.slice().sort((a,b)=>(mk(b)-mk(a))||(a.hp-b.hp)||(a.boss?1:-1))[0];
    const clus=m=>foes.filter(x=>x!==m&&cellsOf(x).some(([c,r])=>cellsOf(m).some(([a,b])=>dist(a,b,c,r)<=1))).length;
    const tough=m=>m.boss||m.elite||m.hp>=10||m.def>=2;
    const reserve=(h.id==='tank'&&allies.length>1)?1:0;
    // предметы
    const bigFoe=inR.filter(tough).sort((a,b)=>b.hp-a.hp)[0];
    if(h.ap-1>=reserve){
      if(adj>=1&&(h.id==='sword'||h.id==='tank')&&aiHas(h,'ragepot')&&h.ap>=3&&aiItemOn(h,'ragepot'))return true;
      if(aiHas(h,'stormrune')&&foes.filter(m=>mdist(h,m)<=2).length>=2&&aiItemOn(h,'stormrune'))return true;
      if(aiHas(h,'bomb')){const b=inR.find(m=>clus(m)>=1||m.def>=3);if(b&&aiItemOn(h,'bomb',b))return true;}
      if(aiHas(h,'icerune')){const d=inR.filter(m=>!ccImmune(m)&&m.atk>=5&&!m.stun).sort((a,b)=>b.atk-a.atk)[0];if(d&&aiItemOn(h,'icerune',d))return true;}
      if(aiHas(h,'scroll')&&bigFoe&&aiItemOn(h,'scroll',bigFoe))return true;
    }
    // умения
    const tries={
      sword:[t.hp<=t.max/2&&'execute',adj>=2&&'whirl',mdist(h,t)<=1&&'power'],
      tank:[adj>=2&&'quake',mdist(h,t)<=1&&!ccImmune(t)&&'bash'],
      archer:[inR.length>=3&&'volley',t.def>=2&&'aimed','triple',!ccImmune(t)&&t.mv>=3&&'pin'],
      mage:[clus(t)>=1&&'fireball',!ccImmune(t)&&t.atk>=4&&'frost','fireball'],
      priest:['smite'],
      rogue:[(t.stun||t.root)&&'backstab',adj>=2&&'smoke',mdist(h,t)<=1&&'backstab',t.hp<=t.max/2&&'execute'],
      paladin:[mdist(h,t)<=1&&!ccImmune(t)&&t.atk>=5&&'judge',mdist(h,t)<=1&&'holystrike']}[h.id]||[];
    for(const id of tries){if(!id)continue;const sp=ABIL[id];if(!sp||h.ap-sp.cost<reserve)continue;if(aiUse(h,id,sp.t==='self'?null:t))return true;}
    if(h.ap-1>=reserve){doAttack(h,t);return true;}
  }
  // 6б. Разбойник кидает ножи издалека, Паладин поднимает отряд, Жрец благословляет
  if(h.id==='rogue'&&!inR.length&&h.ap>=2){const f=foes.filter(m=>mdist(h,m)<=3).sort((a,b)=>mdist(h,a)-mdist(h,b))[0];if(f&&aiUse(h,'knives',f))return true;}
  if(h.id==='paladin'&&inFight&&h.ap>=3&&!h.aiRally&&allies.filter(x=>x!==h&&aiNear(h,x)<=3).length>=2&&foes.some(m=>mdist(h,m)<=m.mv+m.rng+1)){h.aiRally=1;if(aiUse(h,'rally'))return true;}
  if(h.id==='priest'&&inFight&&h.ap>=2&&!h.aiBless&&habils(h).includes('bless')){
    const tg=allies.filter(x=>x!==h&&aiNear(h,x)<=3&&!(x.bless>0)).sort((a,b)=>st(b,'atk')-st(a,'atk'))[0];
    if(tg){h.aiBless=1;if(aiUse(h,'bless',tg))return true;}
  }
  // 7. Маг ускоряет самого полезного бойца, когда нечего больше делать
  if(h.id==='mage'&&inFight&&h.ap>=2&&!h.aiHaste&&habils(h).includes('haste')){
    const tg=allies.filter(x=>x!==h&&aiNear(h,x)<=3&&x.id!=='mage'&&!x.haste).sort((a,b)=>st(b,'atk')-st(a,'atk'))[0];
    if(tg){h.aiHaste=1;if(aiUse(h,'haste',tg))return true;}
  }
  // 8. защита последним ОД
  if(h.id==='tank'&&h.ap<=1&&foes.some(m=>mdist(h,m)<=4)){
    if(!guardOn(h)&&allies.some(x=>x!==h&&aiNear(h,x)<=1)&&aiUse(h,'guard'))return true;
    if(!h.taunt&&aiUse(h,'taunt'))return true;
  }
  if(h.id==='sword'&&h.ap<=1&&!h.block&&foes.some(m=>mdist(h,m)<=1)&&aiUse(h,'block'))return true;
  // 9. открыть «?» рядом — только в спокойной обстановке и недалеко от игрока
  if(!h.pet&&aiSafe(h)&&h.ap>=1&&(h.aiExp||0)<1){
    const tk=aiAdjToken(h);
    if(tk&&(!humans.length||Math.min(...humans.map(x=>aiNear(x,tk)))<=7)){h.aiExp++;log(h.d.n+' (ИИ) открывает фишку.');doExplore(h,tk);return true;}
  }
  // 9б. зов в подземелье: идём к входу пешком
  if(G.callTo&&G.room&&!G.room.won&&!inRoom(h.c)&&!h.pet&&!foes.some(m=>mdist(h,m)<=2)&&aiCallMove(h))return true;
  // 10. движение
  return aiMove(h,foes.length&&(G.dragon||foes.some(m=>allies.some(a=>mdist(a,m)<=6)))?'fight':'follow');
}
function aiCallMove(h){
  const T=G.callTo,fd=new Map([[key(T.c,T.r),0]]),q=[[T.c,T.r]];
  while(q.length){const [x,y]=q.shift();const d=fd.get(key(x,y));for(const [a,b] of nb(x,y)){const k=key(a,b),cl=cellOf(a,b);if(fd.has(k)||!cl||cl.block||cl.void||inRoom(a))continue;fd.set(k,d+1);q.push([a,b]);}}
  const cur=fd.get(key(h.c,h.r));if(cur==null)return false;
  const spd=st(h,'spd'),dm=reach(h,h.ap*spd);let best=null;
  dm.forEach((d,k)=>{if(!d)return;const [c,r]=k.split(',').map(Number);const cl=cellOf(c,r);if(heroAt(c,r)||cl.terr==='lava'||cl.terr==='acid'||(G.tele&&G.tele.cells.has(k)))return;
    const f=fd.get(k);if(f==null||f>=cur)return;const cost=Math.ceil(d/spd);if(!best||f<best.f||(f===best.f&&cost<best.cost))best={c,r,f,cost};});
  if(!best)return false;
  doMove(h,cellOf(best.c,best.r),best.cost);return true;
}
function aiMove(h,mode){
  const spd=st(h,'spd'),rng=st(h,'rng');const dm=reach(h,h.ap*spd);
  const foes=aiFoes();const humans=G.heroes.filter(x=>x.alive&&!isAI(x));
  const ok=(c,r)=>{const cl=cellOf(c,r);return !heroAt(c,r)&&cl.terr!=='lava'&&cl.terr!=='acid'&&!(G.tele&&G.tele.cells.has(key(c,r)));};
  const cand=[];dm.forEach((d,k)=>{if(!d)return;const [c,r]=k.split(',').map(Number);if(ok(c,r))cand.push({c,r,cost:Math.ceil(d/spd)});});
  if(!cand.length)return false;
  const fd=(c,r)=>foes.length?Math.min(...foes.map(m=>{let b=99;for(const [x,y] of cellsOf(m))b=Math.min(b,dist(c,r,x,y));return b;})):99;
  let score,cur;
  if(mode==='safe'){score=o=>o.cost*2+Math.abs(fd(o.c,o.r)-rng);cur=1e9;}
  else if(mode==='fight'){
    const want=rng>1?Math.max(2,rng):1;
    score=o=>{const d=fd(o.c,o.r);return (d>rng?(d-rng)*10:0)+Math.abs(d-want)*2+(h.ap-o.cost<1?6:0)+o.cost;};
    const d0=fd(h.c,h.r);cur=(d0>rng?(d0-rng)*10:0)+Math.abs(d0-want)*2;
  }else{
    const loot=cand.filter(o=>{const cl=cellOf(o.c,o.r);return cl.loot&&h.items.length<3&&cl.loot.some(id=>canUse(h,id)&&ITEMS[id].cls===h.id);});
    if(loot.length){loot.sort((a,b)=>a.cost-b.cost);const o=loot[0];doMove(h,cellOf(o.c,o.r),o.cost);return true;}
    if(!h.pet&&aiSafe(h)&&(h.aiExp||0)<1&&h.ap>=2){
      const toks=G.grid.flat().filter(c=>c.token&&!aiSkipTok(c)&&(!humans.length||Math.min(...humans.map(x=>dist(x.c,x.r,c.c,c.r)))<=5)&&!(c.poi&&c.poi.boss));
      if(toks.length){
        const spots=[];toks.forEach(tk=>nb(tk.c,tk.r).forEach(([c,r])=>{const o=cand.find(x=>x.c===c&&x.r===r);if(o&&o.cost<=h.ap-1)spots.push({o,d:dist(h.c,h.r,tk.c,tk.r)});}));
        if(spots.length){spots.sort((a,b)=>a.o.cost-b.o.cost||a.d-b.d);const o=spots[0].o;doMove(h,cellOf(o.c,o.r),o.cost);return true;}
      }
    }
    const exitOn=humans.some(x=>cellOf(x.c,x.r).zone==='exit')||(!humans.length&&G.exitCells.length);
    if(exitOn){const ex=G.exitCells.filter(([c,r])=>!heroAt(c,r)||(h.c===c&&h.r===r));
      if(cellOf(h.c,h.r).zone==='exit')return false;
      score=o=>Math.min(...ex.map(([c,r])=>dist(o.c,o.r,c,r)))*5+o.cost;cur=Math.min(...ex.map(([c,r])=>dist(h.c,h.r,c,r)))*5;}
    else{if(!humans.length)return false;
      const L=humans.map(x=>x);const ld=(c,r)=>Math.min(...L.map(x=>dist(c,r,x.c,x.r)));
      if(ld(h.c,h.r)<=2)return false;
      score=o=>Math.abs(ld(o.c,o.r)-1.5)*4+o.cost;cur=Math.abs(ld(h.c,h.r)-1.5)*4;}
  }
  cand.forEach(o=>o.s=score(o));cand.sort((a,b)=>a.s-b.s);
  const best=cand[0];if(!best||best.s>=cur)return false;
  doMove(h,cellOf(best.c,best.r),best.cost);return true;
}
