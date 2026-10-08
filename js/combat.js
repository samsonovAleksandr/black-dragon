'use strict';
/* =========================================================
   ОПЫТ / УРОВНИ
   ========================================================= */
function gainXP(h,n){
  if(!h.alive||n<=0||h.lv>=5||h.pet)return;
  if(pact('haste'))n=Math.ceil(n*1.5);
  h.xp+=n;
  while(h.lv<5&&h.xp>=XPT[h.lv-1]){
    h.lv++;const g=h.d.lv[h.lv];
    const bonusHp=(g&&g.hp)||0;h.hp=Math.min(st(h,'maxhp'),h.hp+bonusHp);
    sfx('level');h._vt=0;vsay(h,'lvl');pop(h,'УРОВЕНЬ '+h.lv+'!');chronEv(h.d.n+' достигает '+h.lv+' уровня.');
    log(h.d.n+' достигает уровня '+h.lv+'! '+lvText(h.d.lv[h.lv])+(g&&g.pick?' — выберите умение на карточке героя!':''));
  }
}

/* =========================================================
   УРОН, ЛЕЧЕНИЕ, СМЕРТЬ
   ========================================================= */
/* --- Тактические бонусы: фланг, оглушённый враг, поджог + стрела --- */
function dirIdx(a,b){return DIRS[a.r&1].findIndex(([dc,dr])=>a.c+dc===b.c&&a.r+dr===b.r);}
function markMon(h,m){if(m&&m.alive&&!m.boss){m.mark={by:h.id,until:G.round+1};pop(m,'МЕТКА','#ffd23f');}}
function comboBonus(h,m,o){
  if(o.noproj||!h.d)return [0,[]];
  let b=0;const t=[];
  const dd=mdist(h,m);
  if(dd<=1&&!m.big){
    const i=dirIdx(m,h);
    if(i>=0){const [dc,dr]=DIRS[m.r&1][(i+3)%6];const ally=heroAt(m.c+dc,m.r+dr);if(ally&&ally!==h&&ally.alive){b+=2;t.push('ФЛАНГ');}}
  }
  if(m.stun&&!m.boss){b+=2;t.push('ОГЛУШЁН');}
  if(m.mark&&m.mark.by!==h.id&&G.round<=m.mark.until){b+=3;t.push('МЕТКА');m.mark=null;}
  if(m.burn>0&&dd>1&&!o.magic&&!o.burn&&h.id==='archer'){b+=2;t.push('ПОДЖОГ');}
  return [b,t];
}
function dmgMon(h,m,raw,o={}){
  const [cb,ct]=comboBonus(h,m,o);if(cb){raw+=cb;pop({c:m.c,r:m.r+0},ct.join('+')+' +'+cb,'#ffe27a');log('Комбо: '+ct.join(' + ')+' (+'+cb+' урона).');}
  let d=m.def;if(o.magic)d=Math.max(0,d-1);if(o.pierce)d=0;
  const dmg=Math.max(1,raw-d);
  if(mdist(h,m)>1&&!o.noproj)shoot(h,m,o.burn?'fire':(o.magic||h.id==='mage')?'magic':'arrow');
  else if(!o.noproj)fxQ({burst:'lunge',c:h.c,r:h.r,tc:m.c,tr:m.r});
  m.hp-=dmg;m.hit.add(h.id);pop(m,'-'+dmg);chron(h,'dmg',dmg);
  if(m.affix==='thorns'&&h.alive&&mdist(h,m)<=1&&!o.noproj){log('Шипы ранят '+h.d.n+'.');hitHero(h,2,null,{pierce:true});}sfx(o.magic||h.id==='mage'?'zap':h.id==='archer'?'arrow':'slash');
  log(h.d.n+' → '+m.n+': '+dmg+' урона'+(m.hp>0?' ('+m.hp+' HP осталось)':'')+'.');
  if(m.hp>0&&!m.boss){if(hasRelic('venom')&&!o.noproj)m.bleed=Math.max(m.bleed||0,2);if(o.burn)m.burn=Math.max(m.burn||0,o.burn);if(o.bleed)m.bleed=Math.max(m.bleed||0,o.bleed);if(hasPerk(h,'venom')&&!o.noproj)m.bleed=Math.max(m.bleed||0,2);}
  if(m.hp<=0)killMon(m,h);
  return dmg;
}
function pushMon(h,m){
  if(m.boss||m.big||!m.alive)return;
  const i=dirIdx(h,m);if(i<0)return;
  const [dc,dr]=DIRS[m.r&1][i];const tc=m.c+dc,tr=m.r+dr;const cl=inb(tc,tr)?cellOf(tc,tr):null;
  const hurt=(u,n,txt)=>{u.hp-=n;pop(u,txt||('-'+n));if(u.hp<=0){if(u.d)killHero(u);else killMon(u,h);}};
  if(!cl||cl.block||cl.dragon||cl.token){
    if(cl&&cl.barrel){explodeBarrel(h,cl);return;}
    sfx('clang');log(m.n+' врезается в препятствие (−3).');hurt(m,3,'ВРЕЗАЛСЯ -3');return;}
  const other=heroAt(tc,tr)||monsterAt(tc,tr);
  if(other){sfx('clang');log(m.n+' сталкивается с '+(other.d&&other.d.n?other.d.n:other.n)+' (−2 обоим).');hurt(m,2,'УДАР -2');if(other.hp>0)hurt(other,2,'УДАР -2');return;}
  m.c=tc;m.r=tr;pop(m,'ОТБРОШЕН','#9df');sfx('whoosh');
  if(cl.terr==='lava'){log(m.n+' отброшен в лаву!');hurt(m,3,'ЛАВА -3');if(m.alive)enterCell(m,false);}
  else enterCell(m,false);
}
function aoeMon(h,m,raw,o){
  const tg=[m,...G.monsters.filter(x=>x.alive&&x!==m&&cellsOf(x).some(([c,r])=>cellsOf(m).some(([a,b])=>dist(a,b,c,r)<=1)))];
  tg.forEach(x=>{if(x.alive)dmgMon(h,x,raw,o);});
}
function killMon(m,killer){
  m.alive=false;G.stats.kills++;chron(killer,'kills',1);if(m.elite&&MON[m.id]&&MON[m.id].key)chronEv((killer&&killer.d?killer.d.n+' добивает':'Повержен')+' мини-босса: '+m.n+'.');else if(m.hunter)chronEv('Охотник повержен'+(killer&&killer.d?' — удар '+killer.d.n:'')+'.');else if(m.id==='dragon')chronEv('ДРАКОН ПОВЕРЖЕН'+(killer&&killer.d?' — последний удар: '+killer.d.n:'')+'!');META.s.kills++;if(META.s.kills%10===0)saveMeta();ach('first_blood');fxQ({burst:'kill',c:m.c,r:m.r,spr:m.spr,big:!!m.big});
  if(m.leader)objProgress('leader');else if(!m.summoned&&m.xp>0)objProgress('kill');
  log(m.n+' повержен!');sfx('kill');
  if(m.xp>0&&!m.summoned){const g=Math.max(1,Math.round((m.xp*2+rnd(0,2))*D().gold*(pact('blood')?1.5:1)*(hasRelic('goldtooth')?1.5:1)*(G.endless?1+.06*(G.depth-1):1)));G.gold+=g;pop({c:m.c,r:m.r},'+'+g+' з','#ffd23f');}
  const vamp=killer&&killer.d?(hasPerk(killer,'bloodlust')?2:0)+itemFx(killer,'vamp'):0;
  if(vamp&&killer.alive&&killer.hp<st(killer,'maxhp')){const b=killer.hp;killer.hp=Math.min(st(killer,'maxhp'),killer.hp+vamp);pop(killer,'+'+(killer.hp-b),'#f66');log('Вампиризм: '+killer.d.n+' +'+(killer.hp-b)+' HP.');}
  if(m.xp>0){G.heroes.forEach(h=>{if(m.hit.has(h.id))gainXP(h,m.xp+(h===killer?1:0)+(hasRelic('warbook')?1:0));});}
  if(hasRelic('chalice')&&killer&&killer.d)G.heroes.forEach(x=>{if(x.alive&&dist(x.c,x.r,killer.c,killer.r)<=1&&x.hp<st(x,'maxhp')){x.hp++;pop(x,'+1','#f66');}});
  if(m.hunter){const gg=evGold(Math.round((30+10*Math.min(2,LOC_TIER[G.loc]||0))*D().gold));pop({c:m.c,r:m.r},'+'+gg+' з','#ffd23f');const it=Math.random()<.4?pick(CURSED):pick(['amulet','trollheart','vampring','feather','chain','axe','elixir']);dropLoot(m.c,m.r,it);log('Охотник повержен! Награда за голову: +'+gg+' золота, на земле — '+ITEMS[it].n+'.');showBanner('Охотник повержен','+'+gg+' золота и трофей');}
  if(G.exped&&!G.exped.bossDead&&m.elite&&m.id===G.exped.boss){G.exped.bossDead=true;showBanner('Хозяин логова повержен','Выход открыт — соберите отряд на светлых гексах');log('★ Хозяин логова повержен! Выход из края открыт.');}
  if(G.chapter&&!G.over&&m.id===CHAPTERS[G.chapter.id].boss&&!nextOpts().length){setTimeout(chapterWin,600);}
  if(m.id==='mimic'){const gg=evGold(Math.round((14+6*chestTier())*D().gold));pop({c:m.c,r:m.r},'+'+gg+' з','#ffd23f');dropLoot(m.c,m.r,pick(chestTier()>=1?GEN2:GEN1));log('Мимик выронил настоящую добычу: +'+gg+' золота и предмет на земле.');}
  if(m.def_&&0){}
  const base=MON[m.id];
  if(base&&base.explode){sfx('boom');fxQ({burst:'boom',c:m.c,r:m.r});log(m.n+' взрывается!');pop(m,'БУМ','#f80');G.heroes.filter(h=>h.alive&&dist(h.c,h.r,m.c,m.r)<=1).forEach(h=>hitHero(h,base.explode,null,{pierce:true}));}
  if(base&&base.split){[freeNear(m.c,m.r),freeNear(m.c,m.r)].forEach(p=>{if(p)spawnMon('slimelet',p[0],p[1]);});}
  if(m.elite&&base&&base.key){ach(({icequeen:'queen',hydra:'hydra',spiderqueen:'spider'})[m.id]||'queen');if(G.endless||G.horde||G.rush){G.relicPending=(G.relicPending||0)+1;sfx('key');pop(m,'РЕЛИКВИЯ','#ffd23f');log(m.n+' — мини-босс побеждён! Реликвия ждёт на привале.');}else{G.keys++;sfx('key');pop(m,'КЛЮЧ','#ffd23f');log(m.n+' — мини-босс побеждён! Выпал КЛЮЧ: '+G.keys+'/'+KEYS_NEEDED+'.');}
    const rare=pick(['amulet','feather','trollheart','vampring']);dropLoot(m.c,m.r,rare);log('Добыча мини-босса: '+ITEMS[rare].n+' лежит на земле.');}
  if(m.id==='dragon'){G.tele=null;if(G.endless)bossCleared();else victory();}
}
function bossCleared(){
  G.floorClear=true;const g=evGold(40+G.depth*4);G.relicPending=(G.relicPending||0)+1;sfx('victory');fxQ({burst:'confetti',c:0,r:0});
  log('★ ЭТАЖ '+G.depth+': БОСС ПОВЕРЖЕН! +'+g+' золота, реликвия ждёт на привале. Дальше — выход!');showBanner('Босс повержен!','Выход открыт: соберитесь на светлых гексах');
  const dc=G.grid.flat().filter(c=>c.dragon);dc.forEach(c=>{c.dragon=false;c.zone='exit';});G.exitCells=dc.map(c=>[c.c,c.r]);
}

/* --- Элитные модификаторы обычных врагов --- */
const AFFIX={
 venom:{n:'Яд',d:'удары отравляют',col:0x52bb4e,css:'#8af58a',mods:{poison:1}},
 fire:{n:'Огонь',d:'удары поджигают',col:0xff8a20,css:'#ffb060',mods:{burn:1}},
 armor:{n:'Броня',d:'+2 ЗАЩ и больше HP — бейте магией или пробивающими ударами',col:0xa0b4d0,css:'#c8d4e8'},
 vamp:{n:'Вампир',d:'лечится нанесённым уроном',col:0xd03050,css:'#ff7a90',mods:{drain:1}},
 swift:{n:'Скорость',d:'ходит на 2 гекса дальше',col:0xffe27a,css:'#ffe27a'},
 frost:{n:'Лёд',d:'удары промораживают (−1 ОД)',col:0x66deef,css:'#9df',mods:{chill:1}},
 thorns:{n:'Шипы',d:'ударивший его в ближнем бою получает 2 урона',col:0xc08050,css:'#e0a070'},
 regen:{n:'Живучесть',d:'восстанавливает 2 HP за ход',col:0x8ae850,css:'#b8f080',mods:{regen:2}}
};
const monB=m=>m.mods?Object.assign({},MON[m.id],m.mods):MON[m.id];
function applyAffix(m,k){
  const A=AFFIX[k];if(!A)return m;
  m.affix=k;m.mods=Object.assign({},A.mods||{});
  let mx=Math.round(m.max*1.15);if(k==='armor'){m.def+=2;mx=Math.round(mx*1.3);}
  if(k==='swift')m.mv+=2;
  m.hp=m.max=mx;m.xp=Math.round(m.xp*1.5)+1;m.n=m.n+' ['+A.n+']';
  return m;
}
function maybeAffix(m){
  if(!m||m.boss||m.elite||m.summoned||!MON[m.id]||!MON[m.id].xp||m.id==='mimic'||m.affix)return m;
  const tier=Math.min(2,LOC_TIER[G.loc]||0)+(G.endless?Math.floor((G.depth-1)/3):0)+(G.horde?Math.floor((G.horde.wave-1)/3):0);
  const ch=Math.min(.45,.08+.05*tier+(G.diff==='hard'?.07:G.diff==='easy'?-.04:0));
  if(Math.random()<ch){applyAffix(m,pick(Object.keys(AFFIX)));pop(m,AFFIX[m.affix].n.toUpperCase(),AFFIX[m.affix].css);}
  return m;
}
function spawnMon(id,c,r){
  const b=MON[id];
  const hp=Math.max(1,Math.round(b.hp*D().hp*DS().hp*(hasRelic('crown')?1.15:1)*(pact('blood')?1.25:1))),atk=Math.max(1,b.atk+(b.xp?D().atk+DS().atk+(pact('iron')?1:0):0));
  const m={id,n:b.n,hp,max:hp,atk:atk+(G.weather==='night'&&b.xp?1:0),def:b.def,mv:b.mv,rng:G.weather==='fog'?Math.min(b.rng,2):G.weather==='rain'&&b.rng>=3?b.rng-1:b.rng,xp:b.xp,spr:b.spr,d:b.d,alive:true,c,r,hit:new Set(),stun:false,cd:0};
  G.monsters.push(m);return m;
}
function healHero(h,t,amount,isSpell){
  const b=t.hp;t.hp=Math.min(st(t,'maxhp'),t.hp+amount);const got=t.hp-b;chron(h,'heal',got);
  pop(t,'+'+got,'#fff');sfx('heal');log((h.d.n)+' лечит '+t.d.n+' на '+got+' HP.');
  if(isSpell&&got>=3&&!h.xpFlag){h.xpFlag=true;gainXP(h,1);}
}
function reviveHero(t,frac){
  let c=t.c,r=t.r;
  if(heroAt(c,r)||monsterAt(c,r)){const f=freeNear(c,r);if(f){c=f[0];r=f[1];}}
  t.c=c;t.r=r;t.alive=true;t.hp=Math.max(1,Math.ceil(st(t,'maxhp')*frac));t.ap=0;t.block=t.guard=t.taunt=false;t.poison=0;
  sfx('revive');pop(t,'ВОСКРЕС');log(t.d.n+' возвращается к жизни с '+t.hp+' HP!');
}
function killHero(h){
  if(h.npc){h.hp=0;h.alive=false;sfx('death');pop(h,'ПАЛ');log('Пленник погибает!');escortFail();return;}
  if(h.pet){h.hp=0;h.alive=false;h.ap=0;h._vt=0;vsay(h,'die');sfx('death');pop(h,'ПАЛ');log(h.d.n+' погибает. Питомцы не воскрешаются.');return;}
  if(hasPerk(h,'faith')&&!h.faith){h.faith=true;h.hp=1;h.alive=true;pop(h,'ВЕРА','#fff8c0');fxQ({burst:'level',c:h.c,r:h.r});sfx('revive');log(h.d.n+' удерживается на грани силой веры!');return;}
  if(hasRelic('phoenix')&&!G.phxUsed){G.phxUsed=true;h.hp=Math.max(1,Math.ceil(st(h,'maxhp')*.3));h.alive=true;pop(h,'ВОЗРОЖДЕНИЕ','#ffb060');fxQ({burst:'level',c:h.c,r:h.r});sfx('revive');log('Перо-оберег возрождает: '+h.d.n+'!');return;}
  h.hp=0;h.alive=false;h.ap=0;h.block=h.guard=h.taunt=h.haste=false;G.stats.deaths++;h._vt=0;vsay(h,'die');chron(h,'downs',1);chronEv(h.d.n+' пал в бою.');
  sfx('death');pop(h,'ПАЛ');log(h.d.n+' погибает!');
  if(G.sel===h.id){const n=G.heroes.find(x=>x.alive);if(n)G.sel=n.id;}
}
/* удар по герою (raw — уже с ATK монстра) */
function hitHero(h,raw,src,o={}){
  const tank=G.heroes.find(x=>x.id==='tank'&&x.alive);
  if(tank&&h!==tank&&guardOn(tank)&&dist(tank.c,tank.r,h.c,h.r)<=1){
    log('Танк принимает удар за '+h.d.n+'!');h=tank;
    if(!tank.xpFlag){tank.xpFlag=true;gainXP(tank,1);}
  }
  if(h.block){h.block=false;pop(h,'БЛОК');sfx('block');log(h.d.n+' блокирует удар.');
    if(hasPerk(h,'reflect')&&src&&src.alive&&!src.big&&dist(h.c,h.r,src.c,src.r)<=1){const b=Math.max(1,Math.floor(st(h,'atk')/2));src.hp-=b;src.hit.add(h.id);pop(src,'-'+b);if(src.hp<=0)killMon(src,h);}
    return 0;}
  let d=st(h,'def');if(o.half)d=Math.floor(d/2);
  const dmg=o.pierce?raw:Math.max(1,raw-d);
  h.hp-=dmg;pop(h,'-'+dmg);sfx('hurt');chron(h,'taken',dmg);if(h.hp>0)vsay(h,'hurt',.6);
  const th=h.items.reduce((s,id)=>s+(ITEMS[id].thorns||0),0);
  if(th&&src&&src.alive&&!src.big&&src.rng===1&&dist(h.c,h.r,src.c,src.r)<=1){src.hp-=th;src.hit.add(h.id);pop(src,'-'+th);log('Шипы жалят '+src.n+'.');if(src.hp<=0)killMon(src,h);}
  if(h.hp<=0)killHero(h);
  return dmg;
}

/* =========================================================
   ПРЕДМЕТЫ
   ========================================================= */
const canUse=(h,id)=>!ITEMS[id].cls||ITEMS[id].cls===h.id;
function takeItem(h,id){h.items.push(id);const it=ITEMS[id];if(it.mods&&it.mods.hp>0)h.hp+=it.mods.hp;fixHp(h);sfx('item');pop(h,it.n);
  if(it.curse){pop(h,'ПРОКЛЯТО','#c58bff');log('Предмет «'+it.n+'» проклят! Выбросить или продать его нельзя — очистить можно на привале ('+PURIFY_COST+' з).');}}
function dropLoot(c,r,id){const cell=cellOf(c,r);(cell.loot=cell.loot||[]).push(id);}
// поднять с земли всё, что герою подходит и влезает
function pickupHere(h){
  if(h.pet)return;
  const cell=cellOf(h.c,h.r);if(!cell||!cell.loot||!cell.loot.length||!h.alive)return;
  const left=[];
  for(const id of cell.loot){
    if(canUse(h,id)&&h.items.length<3&&!isCursed(id)){takeItem(h,id);log(h.d.n+' подбирает: '+ITEMS[id].n+'.');}
    else left.push(id);
  }
  if(left.length&&left.length===cell.loot.length&&h.items.length>=3&&left.some(id=>canUse(h,id)))log(h.d.n+': нет места. Выбросьте предмет (✕ на карточке), чтобы подобрать.');
  cell.loot=left;
}
function giveItem(h,id,cell){
  const it=ITEMS[id];
  if(isCursed(id)){dropLoot(cell.c,cell.r,id);sfx('item');pop(cell,it.n,'#c58bff');log('Найден проклятый предмет: «'+it.n+'». Он лежит на земле — поднимите кнопкой на карточке героя, если рискнёте ('+it.d.split(' Нельзя')[0]+').');return;}
  if(canUse(h,id)&&h.items.length<3){takeItem(h,id);log('Найден предмет: '+it.n+' → '+h.d.n+'.');return;}
  dropLoot(cell.c,cell.r,id);sfx('item');pop(cell,it.n,'#ffd23f');
  if(!canUse(h,id))log('Найден предмет: '+it.n+' ('+it.type+'). Он остаётся на земле — '+G.heroes.find(x=>x.id===it.cls).d.n+' может прийти и забрать.');
  else log('Найден предмет: '+it.n+', но у '+h.d.n+' нет места. Он лежит на земле.');
}
function fixHp(h){h.hp=Math.min(h.hp,st(h,'maxhp'));}
