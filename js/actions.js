'use strict';
/* =========================================================
   ДВИЖЕНИЕ
   ========================================================= */
function reach(h,maxSteps){
  const dm=new Map([[key(h.c,h.r),0]]),q=[[h.c,h.r]];
  while(q.length){
    const [c,r]=q.shift();const d=dm.get(key(c,r));if(d>=maxSteps)continue;
    for(const [x,y] of nb(c,r)){
      const k=key(x,y);const cl=cellOf(x,y);
      if(cl.block||cl.token||cl.dragon||monsterAt(x,y)||npcAt(x,y)||(cl.trap&&cl.trap.seen))continue;
      const nd=d+(cl.terr==='slow'?2:1);if(nd>maxSteps||(dm.has(k)&&dm.get(k)<=nd))continue;
      dm.set(k,nd);if(cl.terr!=='lava'&&cl.terr!=='acid')q.push([x,y]);
    }
  }
  return dm;
}
function moveHero(h,c,r,noFree){
  const adj=(noFree||h.id==='rogue')?[]:G.monsters.filter(m=>m.alive&&!m.big&&m.rng===1&&!m.stun&&mdist(h,m)<=1);
  h.c=c;h.r=r;sfx(noFree?'whoosh':'step');pickupHere(h);enterCell(h,true);scoutTraps(h);npcCheckFree(h);holdStart();
  for(const m of adj){
    if(!h.alive)break;
    if(dist(h.c,h.r,m.c,m.r)>1){log(m.n+' бьёт вдогонку!');hitHero(h,m.atk+rnd(0,1),m,{pierce:false});}
  }
}
function enterCell(u,hero){
  const cl=cellOf(u.c,u.r);if(!cl)return;
  if(!hero&&cl.htrap&&u.alive&&!u.boss){cl.htrap=false;sfx('trap');fxQ({burst:'kill',c:u.c,r:u.r});u.hp-=5;pop(u,'КАПКАН -5','#ffd23f');log(u.n+' попадает в капкан!');if(!ccImmune(u))u.root=true;if(u.hp<=0){killMon(u,null);return;}}
  if(hero&&cl.portal&&G.room&&!G.room.won&&u.alive&&!G.over){if(!isAI(u))promptRoom(u,cl);else if(G.callTo&&!inRoom(u.c))enterRoom(u,cl);}
  if(hero&&cl.rexit&&G.room&&u.alive)leaveRoom(u);
  if(cl.terr==='acid'&&hero){u.poison=Math.max(u.poison||0,2);pop(u,'ЯД','#8ae850');sfx('poison');log(u.d.n+' ступает в кислоту и отравляется!');}
  if(cl.terr==='lava'&&!u.boss){u.burn=Math.max(u.burn||0,2);pop(u,'ГОРИТ','#f80');sfx('fire');log((hero?u.d.n:u.n)+' ступает в лаву и загорается!');}
  if(hero&&cl.trap&&!cl.trap.seen){cl.trap=null;sfx('trap');pop(u,'ЛОВУШКА','#f55');log('Скрытая ловушка! '+u.d.n+' получает 4 урона и кровотечение.');hitHero(u,4,null,{pierce:true});if(u.alive)u.bleed=Math.max(u.bleed||0,2);}
}
function scoutTraps(h){
  const r=hasRelic('lantern')?3:h.id==='archer'?2:1;let n=0;
  G.grid.flat().forEach(cl=>{if(cl.trap&&!cl.trap.seen&&dist(h.c,h.r,cl.c,cl.r)<=r){cl.trap.seen=true;n++;}});
  if(n){log(h.d.n+' замечает '+(n>1?n+' ловушки':'ловушку')+' рядом!');pop(h,'!','#f55');}
}
function explodeBarrel(h,cell){
  if(!cell.barrel)return;
  cell.barrel=false;cell.block=false;cell.deco=null;
  sfx('boom');fxQ({burst:'boom',c:cell.c,r:cell.r});pop(cell,'БУМ!','#f80');log('Бочка с порохом взрывается!');
  const around=nb(cell.c,cell.r);
  G.monsters.filter(m=>m.alive&&!m.boss&&cellsOf(m).some(([c,r])=>dist(c,r,cell.c,cell.r)<=1)).forEach(m=>{if(m.alive)dmgMon(h,m,5+(hasRelic('powder')?3:0),{pierce:1,burn:2,noproj:1});});
  G.heroes.filter(x=>x.alive&&dist(x.c,x.r,cell.c,cell.r)<=1).forEach(x=>{hitHero(x,5+(hasRelic('powder')?3:0),null,{pierce:true});if(x.alive){x.burn=Math.max(x.burn||0,2);}});
  around.forEach(([c,r])=>{const n=cellOf(c,r);if(n&&n.barrel)explodeBarrel(h,n);});
}
function atExit(){return hasExit()&&G.heroes.filter(h=>h.alive&&!h.temp&&!h.pet).every(h=>cellOf(h.c,h.r).zone==='exit');}

/* =========================================================
   ДЕЙСТВИЯ ГЕРОЯ
   ========================================================= */
const selHero=()=>G.heroes.find(h=>h.id===G.sel);
function doAttack(h,m){
  vsay(h,'atk',.45);
  h.ap-=1;
  dmgMon(h,m,st(h,'atk')+roll(),{magic:h.id==='mage'});
  afterAction();
}
function doExplore(h,cell){
  h.ap-=1;revealToken(h,cell);afterAction();
}
function doMove(h,cell,cost){
  h.ap-=cost;moveHero(h,cell.c,cell.r);afterAction();
}
function afterAction(){
  if(!REMOTE)G.mode=null;
  checkEnd();ui();
}
function revealToken(h,cell){
  const t=cell.token;cell.token=null;
  const pos={c:cell.c,r:cell.r};
  if(cell.poi)log('Осматриваем: '+cell.poi.n+'...');
  switch(t.t){
    case 'monster':{const m=maybeAffix(spawnMon(t.m,cell.c,cell.r));log('Из фишки выходит: '+m.n+'!');sfx('spawn');fxQ({burst:'spawn',c:cell.c,r:cell.r});pop(m,'!');break;}
    case 'item':giveItem(h,t.it,cell);break;
    case 'key':{if(G.endless){const g=evGold(18+G.depth*2);sfx('key');log('Тайник! Найдено '+g+' золота.');pop(pos,'+'+g+' з','#ffd23f');G.heroes.forEach(x=>{if(x.alive)gainXP(x,1);});}else{G.keys++;sfx('key');log('КЛЮЧ найден! Ключей: '+G.keys+'/'+KEYS_NEEDED+'. Печать Дракона ослабла.');pop(pos,'КЛЮЧ');}
      if(t.guard){const f=freeNear(cell.c,cell.r);if(f){const m=spawnMon(t.guard,f[0],f[1]);log('Хранитель пробуждается: '+m.n+'!');sfx('spawn');}}
      break;}
    case 'event':
      if(t.e==='trap'){log('Ловушка! '+h.d.n+' получает 3 урона.');pop(h,'ЛОВУШКА');h.hp-=3;sfx('trap');if(h.hp<=0)killHero(h);}
      else if(t.e==='spring'){log('Целебный родник! Герои рядом восстанавливают 4 HP.');G.heroes.filter(x=>x.alive&&dist(x.c,x.r,cell.c,cell.r)<=3).forEach(x=>{const b=x.hp;x.hp=Math.min(st(x,'maxhp'),x.hp+4);pop(x,'+'+(x.hp-b));});sfx('heal');}
      else if(t.e==='ambush'){log('Засада!');sfx('spawn');const pool=AMB_POOL[G.loc]||AMB_POOL[4];for(let i=0;i<2;i++){const f=freeNear(h.c,h.r);if(f){maybeAffix(spawnMon(pick(pool),f[0],f[1]));}}}
      else if(t.e==='chest')openChest(h,cell,t);
      else if(EXTRA_EV.includes(t.e)||t.e==='treasure')openEvent(t.e,h,cell);
      else if(t.e==='shrine'){log('Древнее святилище: '+h.d.n+' получает 2 опыта.');gainXP(h,2);sfx('shrine');}
      else{log('Пусто. Только ветер и пыль.');sfx('wind');}
      break;
  }
}






/* --- Туман войны (опция перед забегом) --- */
function fogRadius(){return (G.weather==='night'||G.weather==='fog'?2:3)+(hasRelic('lantern')?1:0);}
function fogUpdate(){
  if(!G.fog||!G.grid){G.vis=null;return;}
  const R=fogRadius(),v=new Set();G.seen=G.seen||{};
  const eyes=G.heroes.filter(h=>h.alive);if(G.npc&&G.npc.alive&&G.npc.freed)eyes.push(G.npc);
  for(const row of G.grid)for(const c of row){if(c.void)continue;
    if(eyes.some(h=>dist(h.c,h.r,c.c,c.r)<=R)){const k=key(c.c,c.r);v.add(k);G.seen[k]=1;}}
  (G.exitCells||[]).forEach(([c,r])=>{G.seen[key(c,r)]=1;});
  G.vis=v;
}
const fogOK=m=>!G.fog||!G.vis||cellsOf(m).some(([c,r])=>G.vis.has(key(c,r)));
const fogCellVis=(c,r)=>!G.fog||!G.vis||G.vis.has(key(c,r));

/* --- Договоры перед забегом: риск ради награды --- */
const PACTS={
 blood:{n:'Кровавый договор',d:'Монстры на 25% крепче, но золота в 1,5 раза больше.'},
 iron:{n:'Железный договор',d:'Монстры бьют на 1 сильнее, но на каждом привале — лишняя реликвия.'},
 haste:{n:'Договор спешки',d:'С 6-го раунда каждые 3 раунда на локацию прибывает враг, но опыта на 50% больше.'},
 glass:{n:'Стеклянный договор',d:'У героев на 20% меньше максимального HP, но они бьют на 1 сильнее.'}
};
const pact=k=>!!(G.pacts&&G.pacts.includes(k));
const WEATHER={rain:{n:'Ливень',ic:'🌧',d:'Дальность атак на 3+ гекса меньше на 1, огонь гаснет — горение не держится.'},fog:{n:'Туман',ic:'🌫',d:'Все атаки и выстрелы — не дальше 2 гексов.'},night:{n:'Ночь',ic:'🌙',d:'Темно; враги бьют на 1 сильнее, зато золота на 30% больше.'}};
function choosePacts(then){
  const sel=new Set(NET.pacts||[]);
  const draw=()=>openModal('<h1>Договоры и условия</h1><p><b>Туман войны</b>: '+(NET.fog?'<b style="color:var(--gold)">включён</b>':'выключен')+' — карта открывается только вокруг героев, враги вне видимости скрыты.</p><p>Договоры можно брать любые — или ни одного. Каждый делает забег опаснее, но и награда больше.</p>'+
    Object.keys(PACTS).map(k=>'<p>'+(sel.has(k)?'★ ':'— ')+'<b>'+PACTS[k].n+'</b>: '+PACTS[k].d+'</p>').join(''),
    [...Object.keys(PACTS).map(k=>({t:(sel.has(k)?'★ ':'')+PACTS[k].n,fn:()=>{if(sel.has(k))sel.delete(k);else sel.add(k);draw();}})),
     {t:'Туман войны: '+(NET.fog?'вкл':'выкл'),fn:()=>{NET.fog=!NET.fog;draw();}},
     {t:'ДАЛЕЕ ▶',fn:()=>{NET.pacts=[...sel];then();}}],true);
  draw();
}
function hasteTick(){
  if(!pact('haste')||G.loc===ARENA||G.horde||G.round<6||G.round%3)return;
  const L=LOCS[G.loc];const pool=(L.mon||[]).filter(id=>MON[id]&&MON[id].mv>=1&&!MON[id].split&&MON[id].hp<=16);if(!pool.length)return;
  const c=shuffle(G.grid.flat().filter(c=>!c.block&&!c.zone&&!c.token&&!inRoom(c.c)&&!c.vault&&!heroAt(c.c,c.r)&&!monsterAt(c.c,c.r)&&!npcAt(c.c,c.r)&&G.heroes.every(h=>!h.alive||dist(h.c,h.r,c.c,c.r)>=5)))[0];
  if(!c)return;const m=maybeAffix(spawnMon(pick(pool),c.c,c.r));m.aggro=true;fxQ({burst:'spawn',c:c.c,r:c.r});log('Договор спешки: прибыл ещё один враг — '+m.n+'.');
}


/* --- Фазы боссов: меняют тактику по мере ранения --- */
function phaseAnnounce(m,title,sub){sfx('roar');fxQ({burst:'shake',mag:6});fxQ({burst:'boom',c:m.c,r:m.r});pop(m,title,'#ff8a7a');log('★ '+m.n+': '+title+' — '+sub);showBanner(title,sub);chronEv(m.n+': '+title+'.');}
function spawnNear(m,id,n,summoned){let k=0;for(let i=0;i<n;i++){const f=freeNear(m.c,m.r);if(!f)break;const s=spawnMon(id,f[0],f[1]);s.aggro=true;if(summoned){s.summoned=true;s.xp=0;}fxQ({burst:'spawn',c:f[0],r:f[1]});k++;}return k;}
function bossPhase(m){
  const f=m.hp/m.max;m.ph=m.ph||0;
  if(m.id==='icequeen'){
    if(m.ph<1&&f<=.6){m.ph=1;phaseAnnounce(m,'ЛЕДЯНОЙ ТРОН РУШИТСЯ','холод сковывает героев, из осколков встают духи');
      G.heroes.filter(h=>h.alive&&dist(h.c,h.r,m.c,m.r)<=4).forEach(h=>{h.chill=1;pop(h,'ХОЛОД','#9df');});spawnNear(m,'icespirit',2,true);return true;}
    if(m.ph<2&&f<=.25){m.ph=2;phaseAnnounce(m,'ЛЕДЯНАЯ БРОНЯ','королева покрывается льдом: +2 ЗАЩ и восстановление');m.def+=2;m.mods=Object.assign({},m.mods||{},{regen:3});return true;}
  }
  if(m.id==='hydra'){
    if(m.ph<1&&f<=.66){m.ph=1;phaseAnnounce(m,'ГОЛОВА ОТРЫВАЕТСЯ','отрубленная голова живёт сама по себе');spawnNear(m,'hydrahead',1,false);return false;}
    if(m.ph<2&&f<=.33){m.ph=2;phaseAnnounce(m,'ГОЛОВЫ ОТРАСТАЮТ','ещё одна голова на свободе, Гидра лечится быстрее');spawnNear(m,'hydrahead',1,false);m.mods=Object.assign({},m.mods||{},{regen:5});return false;}
  }
  if(m.id==='spiderqueen'){
    if(m.ph<1&&f<=.6){m.ph=1;phaseAnnounce(m,'КЛАДКА ЛОПАЕТСЯ','из коконов выползают паучата');spawnNear(m,'spider',3,true);return true;}
    if(m.ph<2&&f<=.3){m.ph=2;phaseAnnounce(m,'ЯДОВИТАЯ ЯРОСТЬ','паутина чаще, вокруг королевы ядовитое облако');m.wcd=0;return false;}
  }
  return false;
}

/* --- Охотник: появляется посреди локации и преследует отряд --- */
function huntTick(){
  const H=G.hunt;if(!H||H.spawned||G.over)return;
  if(!H.warned&&G.round>=H.at-1){H.warned=true;sfx('roar');log('Вдалеке трубит рог: отряд выследил Охотник! Он появится в следующем раунде.');showBanner('Вас выследили!','Охотник появится в следующем раунде');return;}
  if(G.round<H.at)return;
  const alive=G.heroes.filter(h=>h.alive&&!inRoom(h.c));if(!alive.length)return;
  const edge=c=>c.c<=1||c.r<=0||c.r>=G.rows-1||(G.room?c.c>=G.room.c0-2:c.c>=G.cols-2);
  const cand=G.grid.flat().filter(c=>!c.block&&!c.zone&&!c.token&&!c.terr&&!c.portal&&!inRoom(c.c)&&!c.vault&&!monsterAt(c.c,c.r)&&!npcAt(c.c,c.r)&&alive.every(h=>dist(h.c,h.r,c.c,c.r)>=6));
  const pool=cand.filter(edge).length?cand.filter(edge):cand;if(!pool.length)return;
  const c=pick(pool);H.spawned=true;
  const m=spawnMon('stalker',c.c,c.r);m.elite=true;m.hunter=true;m.aggro=true;m.xp=m.xp+2*Math.min(2,LOC_TIER[G.loc]||0);
  sfx('spawn');fxQ({burst:'spawn',c:c.c,r:c.r});pop(m,'ОХОТНИК','#ff8a7a');
  log('Появился Охотник! Он идёт по следу отряда — убейте его, пока он не перебил вас по одному.');showBanner('Охотник','Он преследует отряд по всей карте');
}


/* --- Сокровищница: решётка открыта, пока кто-то стоит на рычаге --- */
function addVault(L){
  const st=G.startCells[0],ex=G.exitCells[0];
  const ringOf=c=>G.grid.flat().filter(x=>dist(x.c,x.r,c.c,c.r)===2),inOf=c=>G.grid.flat().filter(x=>dist(x.c,x.r,c.c,c.r)<=1);
  const cands=shuffle(G.grid.flat().filter(c=>c.c>=2&&c.r>=2&&c.c<=G.cols-3&&c.r<=G.rows-3&&dist(c.c,c.r,st[0],st[1])>=4&&dist(c.c,c.r,ex[0],ex[1])>=3));
  for(const C of cands){
    const ring=ringOf(C),inner=inOf(C);
    if(ring.length!==12||[...ring,...inner].some(x=>x.zone||x.poi||x.portal||x.hold||monsterAt(x.c,x.r)))continue;
    const doors=shuffle(ring.filter(x=>nb(x.c,x.r).some(([a,b])=>{const q=cellOf(a,b);return q&&dist(a,b,C.c,C.r)===3&&!q.block&&!q.zone;})));
    if(!doors.length)continue;const D=doors[0];
    const save=[...ring,...inner].map(x=>({x,block:x.block,deco:x.deco,token:x.token,terr:x.terr,trap:x.trap,barrel:x.barrel}));
    ring.forEach(x=>{if(x!==D){x.block=true;x.deco=L.deco;x.token=null;x.barrel=false;x.terr=null;x.trap=null;}});
    inner.forEach(x=>{x.block=false;x.deco=null;x.token=null;x.terr=null;x.trap=null;x.barrel=false;x.vault=true;});
    D.block=true;D.deco='gate';D.token=null;D.terr=null;D.trap=null;D.barrel=false;D.door=true;
    // связность снаружи: всё, что не стена и не сокровищница, достижимо от старта (дверь считаем открытой)
    D.block=false;const f=floodFrom(st[0],st[1]);D.block=true;
    const cut=G.grid.flat().filter(x=>!x.block&&!x.vault&&x!==D&&!f.has(key(x.c,x.r)));
    const ok=f.has(key(ex[0],ex[1]))&&cut.every(x=>!x.token&&!x.poi&&!x.zone&&!x.portal&&!x.hold&&!x.loot&&!monsterAt(x.c,x.r));
    if(ok)cut.forEach(x=>{x.block=true;x.deco=L.deco;x.terr=null;x.trap=null;});
    const lever=shuffle(G.grid.flat().filter(x=>!x.block&&!x.zone&&!x.token&&!x.poi&&!x.vault&&!x.terr&&!x.portal&&!x.hold&&f.has(key(x.c,x.r))&&dist(x.c,x.r,D.c,D.r)>=4&&dist(x.c,x.r,D.c,D.r)<=8))[0];
    if(!ok||!lever){save.forEach(o=>{Object.assign(o.x,{block:o.block,deco:o.deco,token:o.token,terr:o.terr,trap:o.trap,barrel:o.barrel});delete o.x.vault;delete o.x.door;});continue;}
    lever.lever=true;
    nb(D.c,D.r).forEach(([a,b])=>{const q=cellOf(a,b);if(q&&!q.vault&&!q.block&&q.token&&q.token.t!=='portal')q.token=null;});
    C.token={t:'event',e:'chest'};
    const tier=Math.min(2,LOC_TIER[G.loc]||0);const pool=tier>=1?GEN2:GEN1;
    inner.filter(x=>x!==C).slice(0,2).forEach(x=>dropLoot(x.c,x.r,pick(pool)));
    G.vault={door:[D.c,D.r],lever:[lever.c,lever.r],open:false};
    return true;
  }
  return false;
}
function updateDoors(){
  const V=G.vault;if(!V)return;const d=cellOf(V.door[0],V.door[1]);if(!d)return;
  const on=!!heroAt(V.lever[0],V.lever[1])||npcAt(V.lever[0],V.lever[1]);
  const busy=!!heroAt(d.c,d.r)||!!monsterAt(d.c,d.r)||npcAt(d.c,d.r);
  const open=on||(V.open&&busy);
  if(open===V.open)return;
  V.open=open;d.block=!open;d.deco=open?null:'gate';
  sfx(open?'clang':'block');log(open?'Рычаг опущен — решётка сокровищницы поднимается!':'Рычаг отпущен — решётка опускается.');
}

/* --- Эскорт: пленник следует за отрядом, враги охотятся на него --- */
const capAt=(c,r)=>!!(G.room&&G.room.captive&&!G.room.captive.freed&&G.room.captive.c===c&&G.room.captive.r===r);
const npcAt=(c,r)=>!!(G.npc&&G.npc.alive&&G.npc.c===c&&G.npc.r===r)||capAt(c,r);
const escortOn=()=>!!(G.npc&&G.npc.alive&&G.obj&&G.obj.type==='escort'&&!G.obj.done&&!G.obj.fail);
function freeCaptive(h){
  const K=G.room&&G.room.captive;if(!K||K.freed||!h||!h.alive||dist(h.c,h.r,K.c,K.r)>1)return;
  K.freed=true;chronEv('Из клетки освобождён '+HDEF[K.id].n+'.');
  const own=G.heroes.filter(x=>!x.temp);const lv=Math.max(1,Math.min(5,Math.round(own.reduce((a,x)=>a+x.lv,0)/Math.max(1,own.length))));
  const a={id:K.id,d:HDEF[K.id],lv,xp:lv>1?XPT[lv-2]:0,hp:1,alive:true,c:K.c,r:K.r,ap:0,items:[],block:false,guard:false,taunt:false,haste:false,poison:0,burn:0,bleed:0,chill:0,reviveUsed:false,xpFlag:false,perks:{},temp:true};
  a.hp=st(a,'maxhp');G.heroes.push(a);NET.owners[K.id]='AI';
  sfx('revive');fxQ({burst:'level',c:K.c,r:K.r});pop(a,'СВОБОДЕН','#9fe0ff');
  log(h.d.n+' освобождает пленника! '+a.d.n+' (ур.'+lv+') сражается вместе с отрядом до конца локации.');showBanner(a.d.n+' с вами!','Союзник под управлением ИИ — до конца локации');
}
function npcCheckFree(h){
  freeCaptive(h);
  const n=G.npc;if(!n||!n.alive||n.freed||!h||!h.alive||dist(h.c,h.r,n.c,n.r)>1)return;
  n.freed=true;sfx('key');pop(n,'СВОБОДЕН','#9fe0ff');fxQ({burst:'level',c:n.c,r:n.r});
  log(h.d.n+' ломает клетку! Пленник идёт за отрядом — доведите его до выхода живым.');showBanner('Пленник освобождён','Доведите его до выхода');
}
const npcNearExit=()=>!!(G.npc&&G.npc.alive&&G.exitCells.some(([c,r])=>dist(c,r,G.npc.c,G.npc.r)<=1));
function npcMove(){
  const n=G.npc;if(!n||!n.alive||!n.freed)return;
  const alive=G.heroes.filter(h=>h.alive&&!inRoom(h.c));if(!alive.length)return;
  const exitMode=alive.some(h=>cellOf(h.c,h.r).zone==='exit');
  const goal=(c,r)=>exitMode?Math.min(...G.exitCells.map(([x,y])=>dist(c,r,x,y))):Math.max(0,Math.min(...alive.map(h=>dist(c,r,h.c,h.r)))-1);
  if(goal(n.c,n.r)===0)return;
  const dm=new Map([[key(n.c,n.r),0]]),q=[[n.c,n.r]];
  while(q.length){const [c,r]=q.shift();const d=dm.get(key(c,r));if(d>=3)continue;
    for(const [x,y] of nb(c,r)){const k=key(x,y);if(dm.has(k))continue;const cl=cellOf(x,y);
      if(cl.block||cl.token||cl.dragon||heroAt(x,y)||monsterAt(x,y)||cl.terr==='lava'||cl.terr==='acid')continue;dm.set(k,d+1);q.push([x,y]);}}
  let best=null,bs=goal(n.c,n.r)*10;
  dm.forEach((d,k)=>{const [c,r]=k.split(',').map(Number);const sc=goal(c,r)*10+d;if(sc<bs){bs=sc;best=[c,r];}});
  if(best){n.c=best[0];n.r=best[1];enterCell(n,false);log('Пленник идёт за отрядом.');}
}
function escortFail(){
  const o=G.obj;if(o&&o.type==='escort'&&!o.done&&!o.fail){o.fail=true;sfx('defeat');log('✗ Пленник погиб. Цель провалена.');showBanner('Пленник погиб','Цель провалена');}
}


/* --- История партии: статистика героев и яркие моменты забега --- */
function chron(h,k,v){
  if(!h||!h.d||h.npc||!G.chron)return;
  const c=G.chron.h[h.id]||(G.chron.h[h.id]={n:h.d.n,spr:h.d.spr,dmg:0,kills:0,heal:0,taken:0,downs:0});c.n=h.d.n;c.spr=h.d.spr;c[k]=(c[k]||0)+v;
}
function chronEv(t){if(!G.chron)return;G.chron.ev.push({r:G.round,l:G.loc===HORDE_LOC&&G.horde?'Волна '+G.horde.wave:G.endless?'Этаж '+G.depth:(LOCS[G.loc]||{}).n||'',t});if(G.chron.ev.length>60)G.chron.ev.shift();}
function chronHtml(){
  const C=G.chron;if(!C)return '';const H=Object.entries(C.h);if(!H.length)return '';
  const best=(k)=>{const b=H.filter(([,x])=>x[k]>0).sort((a,b)=>b[1][k]-a[1][k])[0];return b?b[1].n:null;};
  const titles=[['kills','Мясник','больше всех убил'],['dmg','Разрушитель','нанёс больше всех урона'],['heal','Целитель','больше всех вылечил'],['taken','Стена','принял больше всех ударов'],['downs','Невезучий','чаще всех падал']]
    .map(([k,t,d])=>{const n=best(k);return n?'<span class="chip" data-tip="'+d+'">'+t+': '+esc(n)+'</span>':'';}).join('');
  let h='<h2>История партии</h2><div class="sum">'+titles+'</div><table class="rec"><tr><th>Герой</th><th>Урон</th><th>Убито</th><th>Вылечено</th><th>Получено</th><th>Падений</th></tr>'+
    H.map(([,x])=>'<tr><td style="text-align:left"><img src="'+sprURL(x.spr)+'" style="width:20px;height:20px;image-rendering:pixelated;vertical-align:middle"> '+esc(x.n)+'</td><td>'+x.dmg+'</td><td>'+x.kills+'</td><td>'+x.heal+'</td><td>'+x.taken+'</td><td>'+x.downs+'</td></tr>').join('')+'</table>';
  if(C.ev.length)h+='<h2>Яркие моменты</h2><ul>'+C.ev.slice(-14).map(e=>'<li><span style="color:var(--mid)">'+esc(e.l)+', раунд '+e.r+':</span> '+esc(e.t)+'</li>').join('')+'</ul>';
  return h;
}

/* --- Сундуки: замок по классу героя, рунная головоломка, мимики --- */
const chestTier=()=>Math.min(2,LOC_TIER[G.loc]||0)+(G.endless?Math.min(2,Math.floor((G.depth-1)/4)):0)+(G.horde?1:0);
function chestReward(h,cell,q){
  // q: 0 — жалкая добыча (половина золота), 1 — обычная, 2 — хорошая (+предмет), 3 — отличная (+редкий предмет и бонус)
  const tier=chestTier();
  const base=(10+6*tier)*(q===0?.5:q===3?1.7:1);
  const g=evGold(Math.round(base*D().gold));
  const pos={c:cell.c,r:cell.r};pop(pos,'+'+g+' з','#ffd23f');sfx('key');fxQ({burst:q>=2?'level':'gold',c:cell.c,r:cell.r});
  let txt='Сундук открыт: +'+g+' золота';
  if(q>=2){const it=Math.random()<.22?pick(CURSED):pick(tier>=1?GEN2:GEN1);giveItem(h,it,cell);txt+=' и предмет «'+ITEMS[it].n+'»';}
  if(q>=3){const it=pick(['amulet','trollheart','vampring','feather','chain','axe','elixir']);giveItem(h,it,cell);txt+=', а ещё редкость: «'+ITEMS[it].n+'»';}
  log(txt+'.');
}
function mimicAttack(h,cell,calm){
  const m=spawnMon('mimic',cell.c,cell.r);m.aggro=true;sfx('spawn');fxQ({burst:'spawn',c:cell.c,r:cell.r});pop(m,'МИМИК!','#ff8a7a');
  m.hp=m.max=Math.round(m.hp*(1+.12*chestTier()));m.atk+=Math.floor(chestTier()/2);
  if(calm){m.stun=true;log('МИМИК! Но '+h.d.n+' заметил подвох вовремя — враг ошеломлён.');}
  else{log('Это был МИМИК! Сундук оживает и кусает '+h.d.n+'.');hitHero(h,m.atk,m,{pierce:false});}
}
function openChest(h,cell,t){
  if(t.mimic==null)t.mimic=Math.random()<.13;
  if(!t.kind)t.kind=Math.random()<.4?'rune':'lock';
  const kind=t.kind,rune=kind==='rune';
  if(isAI(h)){ // союзник-ИИ: без окон, специалист вскрывает наверняка, остальные ломают силой
    if(t.mimic){mimicAttack(h,cell,h.id==='rogue');return;}
    const spec=(h.id==='rogue'&&!rune)||((h.id==='mage'||h.id==='priest'||h.id==='paladin')&&rune);
    const p=Math.max(.3,Math.min(.9,.35+.1*st(h,'atk')));
    if(spec||Math.random()<p){log(h.d.n+' (ИИ) '+(spec?'вскрывает сундук.':'выламывает крышку.'));chestReward(h,cell,spec?2:1);}
    else{log('Крышка не поддаётся, содержимое побилось. '+h.d.n+' (ИИ) ушибается.');sfx('trap');hitHero(h,2,null,{pierce:true});chestReward(h,cell,0);}
    return;}
  const finish=()=>{closeModal();ui();};
  const trigger=(how)=>{ // возвращает true, если сундук оказался мимиком
    if(!t.mimic)return false;closeModal();mimicAttack(h,cell,how==='rogue');ui();return true;};
  const reopen=()=>{cell.token=t;};
  const opts=[];
  if(h.id==='rogue'&&!rune)opts.push({t:'Вскрыть отмычкой (Разбойник)',fn:()=>{if(trigger('rogue'))return;closeModal();const ok=Math.random()<.92;log(ok?h.d.n+' ловко вскрывает замок.':'Отмычка сломалась, но замок поддался.');chestReward(h,cell,ok?2:1);ui();}});
  if((h.id==='mage'||h.id==='priest')&&rune)opts.push({t:'Снять печать ('+h.d.n+')',fn:()=>{if(trigger('mage'))return;closeModal();log(h.d.n+' рассеивает руническую печать.');chestReward(h,cell,2);ui();}});
  if(h.id==='paladin'&&rune)opts.push({t:'Очистить светом (Паладин)',fn:()=>{if(trigger('x'))return;closeModal();const ok=Math.random()<.8;log(ok?'Священный свет гасит печать.':'Свет гасит печать не до конца.');chestReward(h,cell,ok?2:1);ui();}});
  opts.push({t:'Головоломка: рунные символы',fn:()=>{if(trigger('x'))return;closeModal();runePuzzle(h,chestTier(),ok=>{
      if(ok){log(h.d.n+' подбирает верный порядок рун!');chestReward(h,cell,3);}
      else{log('Руны вспыхнули и погасли. Печать заклинило — добыча пострадала.');pop(h,'ПРОВАЛ','#f66');sfx('trap');chestReward(h,cell,0);}
      ui();});}});
  const p=Math.max(.3,Math.min(.9,.35+.1*st(h,'atk')));
  opts.push({t:'Выломать силой ('+Math.round(p*100)+'%)',fn:()=>{if(trigger('x'))return;closeModal();
    if(Math.random()<p){log(h.d.n+' выламывает крышку.');chestReward(h,cell,1);}
    else{log('Крышка не поддаётся, содержимое побилось. '+h.d.n+' ушибается.');sfx('trap');hitHero(h,2,null,{pierce:true});chestReward(h,cell,0);}
    ui();}});
  opts.push({t:'Оставить',fn:()=>{closeModal();reopen();log('Вы оставляете сундук закрытым.');ui();}});
  openModal('<h1>Запертый сундук</h1><p>'+(rune?'На крышке мерцает <b style="color:#c58bff">рунная печать</b>.':'Крышку держит <b style="color:var(--gold)">кованый замок</b>.')+' Открывает: <b>'+h.d.n+'</b>.</p>'+
    '<p style="color:var(--mid)">'+(rune?'Печать снимут Маг и Жрец, свет Паладина может её погасить.':'Замок вскроет Разбойник.')+' Головоломка даёт лучшую награду, но ошибка испортит добычу. Грубая сила — дёшево, но рискованно. Иногда сундуки оказываются мимиками!</p>',opts);
}
const RUNES=[['◆','#6ed2ff'],['▲','#ff8a7a'],['●','#8af58a'],['■','#ffd23f'],['✦','#d8a8ff'],['☾','#ffffff']];
function runePuzzle(h,tier,done){
  const len=3+Math.min(2,Math.floor(tier/2)+(tier>=1?1:0));  // 3..5
  const seq=Array.from({length:len},()=>rnd(0,RUNES.length-1));
  let pos=0,miss=0,over=false;
  openModal('<h1>Рунная печать</h1><p id="rp">Запомните порядок рун…</p><div id="rseq" style="display:flex;gap:10px;justify-content:center;font-size:40px;min-height:56px;margin:10px 0"></div><div id="rdots" style="text-align:center;letter-spacing:6px;color:var(--gold)"></div><div class="row" id="rbtns" style="justify-content:center"></div>',[],true);
  window.__rune={seq:seq.slice(),click:i=>clickRune(i)};
  const box=$('#rseq'),info=$('#rp'),btns=$('#rbtns'),dots=$('#rdots');
  const showDots=()=>{dots.textContent=seq.map((_,i)=>i<pos?'●':'○').join(' ')+(miss?'   ошибок: '+miss+'/2':'');};
  const finish=ok=>{if(over)return;over=true;window.__rune=null;setTimeout(()=>{closeModal();done(ok);},ok?500:700);};
  function clickRune(i){
    if(over||!btns.children.length)return;
    if(i===seq[pos]){pos++;sfx('click');if(pos>=seq.length){info.textContent='Верно! Печать сломана.';sfx('key');finish(true);}}
    else{miss++;sfx('trap');info.textContent=miss>=2?'Печать заклинило…':'Не та руна! Ещё одна ошибка — и провал.';if(miss>=2)finish(false);}
    showDots();
  }
  // показ последовательности
  const step=window.FAST?10:700;
  seq.forEach((r,k)=>{setTimeout(()=>{if(over)return;box.innerHTML='<span style="color:'+RUNES[r][1]+'">'+RUNES[r][0]+'</span>';sfx('click');},step*(k+1));setTimeout(()=>{if(!over)box.innerHTML='';},step*(k+1)+Math.round(step*.7));});
  setTimeout(()=>{if(over)return;info.textContent='Повторите порядок рун (можно ошибиться один раз).';
    RUNES.forEach(([ch,col],i)=>{const b=document.createElement('button');b.className='btn';b.style.cssText='font-size:30px;width:64px;height:58px;color:'+col;b.textContent=ch;b.onclick=()=>clickRune(i);btns.appendChild(b);});
    showDots();},step*(len+1)+100);
}


/* --- Питомцы: приручённый зверь идёт с отрядом (слабее героев, без умений) --- */
const PETS={
 wolf:{n:'Волк-спутник',spr:'wolf',hp:12,atk:3,def:0,ap:2,spd:1,role:'Питомец: быстрый и кусачий.'},
 boar:{n:'Кабан-спутник',spr:'boar',hp:15,atk:3,def:1,ap:2,spd:0,role:'Питомец: крепкий, принимает удары.'},
 bat:{n:'Ручная мышь',spr:'bat',hp:7,atk:2,def:0,ap:3,spd:2,role:'Питомец: хрупкий, но очень быстрый.'},
 toad:{n:'Жаба-спутник',spr:'toad',hp:10,atk:3,def:0,ap:2,spd:1,role:'Питомец: прыгучий болотный друг.'},
 spider:{n:'Паучок-спутник',spr:'spider',hp:9,atk:3,def:0,ap:2,spd:1,role:'Питомец: юркий охотник катакомб.'},
 plaguerat:{n:'Ручная крыса',spr:'plaguerat',hp:6,atk:2,def:0,ap:3,spd:2,role:'Питомец: маленькая, но быстрая.'}
};
const PET_POOL={1:['wolf','boar','bat'],2:['bat','boar'],3:['wolf','bat'],5:['toad','boar'],6:['spider','plaguerat']};
function makePet(kind,c,r){
  const P=PETS[kind],tier=Math.min(2,LOC_TIER[G.loc]||0);
  const pd={n:P.n,spr:P.spr,hp:P.hp+3*tier,atk:P.atk+(tier>=2?1:0),def:P.def,ap:P.ap,rng:1,spd:P.spd,abil:[],lv:{},role:P.role};
  return {id:'pet',pet:true,kind,pd,d:pd,lv:1,xp:0,hp:pd.hp,alive:true,c,r,ap:0,items:[],block:false,guard:false,taunt:false,haste:false,poison:0,burn:0,bleed:0,chill:0,reviveUsed:false,xpFlag:false,perks:{}};
}
function adoptPet(kind,cell){
  const old=G.heroes.find(x=>x.pet);if(old)G.heroes=G.heroes.filter(x=>x!==old);
  const f=freeNear(cell.c,cell.r)||[cell.c,cell.r];
  const p=makePet(kind,f[0],f[1]);G.heroes.push(p);chronEv(p.d.n+' присоединяется к отряду.');NET.owners.pet='AI';
  sfx('heal');fxQ({burst:'level',c:p.c,r:p.r});pop(p,'ДРУГ','#8af58a');
  log((old?old.d.n+' уходит в лес. ':'')+p.d.n+' присоединяется к отряду! Он ходит сам (ИИ) и переходит с вами между локациями, пока жив.');ui();
}

/* --- Случайные события с выбором --- */
const EXTRA_EV=['merchant','altar','prisoner','riddle','gambler','campfire','beast'];
const AMB_POOL={1:['goblin','wolf','goblin','bat','boar'],2:['orc','ghost','orc','cultist','gargoyle'],3:['yeti','icespirit','frostspider','wolf'],4:['orc','wraith','gargoyle'],5:['toad','leech','croc','wisp','toad'],6:['plaguerat','acidslime','scorpion','zombie','plaguerat']};
function ambushAt(h,n){
  const pool=AMB_POOL[G.loc]||AMB_POOL[4];
  sfx('spawn');for(let i=0;i<n;i++){const f=freeNear(h.c,h.r);if(f){const m=maybeAffix(spawnMon(pick(pool),f[0],f[1]));fxQ({burst:'spawn',c:f[0],r:f[1]});pop(m,'!');}}
}
function evGold(g){g=Math.round(g*(pact('blood')?1.5:1)*(G.weather==='night'?1.3:1)*(G.heroes&&G.heroes.some(h=>h.alive&&h.items.some(id=>ITEMS[id].greed))?1.4:1)*(hasRelic('goldtooth')?1.5:1)*(G.endless?1+.06*(G.depth-1):1));G.gold+=g;return g;}
function openRelicChoice(n,title,intro){
  const ids=pickRelics(n);if(!ids.length){const g=evGold(30);log('Реликвий больше нет — получено '+g+' золота.');ui();return;}
  openModal('<h1>'+title+'</h1><p>'+intro+'</p><div class="shop">'+ids.map(id=>'<div class="item"><div class="ih"><img class="ic" src="'+RICON[id]+'"><div><b>'+RELICS[id].n+'</b><div class="ty">Реликвия</div></div></div><div class="ds">'+RELICS[id].d+'</div></div>').join('')+'</div>',
    ids.map(id=>({t:'Взять: '+RELICS[id].n,fn:()=>{closeModal();giveRelic(id);}})));
}
/* --- Цели локаций --- */
const OBJ={
 leader:{n:'Убить вожака',d:'На карте засел усиленный Вожак (красное свечение). Убейте его.'},
 hunt:{n:'Охота',d:'Убейте нужное число врагов.'},
 treasure:{n:'Найти сокровище',d:'Одна из фишек «?» скрывает сундук с сокровищами.'},
 hold:{n:'Оборона',d:'Найдите древний тотем и удержите его: когда герой встанет рядом с ним, начнётся натиск врагов. Каждый раунд, когда хотя бы один герой стоит у тотема, засчитывается.'},
 escort:{n:'Спасти пленника',d:'Найдите пленника (он в клетке), подойдите к нему вплотную, чтобы освободить, и доведите до выхода живым. Враги будут охотиться на него.'},
 alarm:{n:'Тревога',d:'Дойдите до выхода за отведённое число раундов, иначе придёт подкрепление врага.'}
};
function rollObjective(){
  const L=LOCS[G.loc];const t=G.forceObj||pick(['leader','hunt','treasure','alarm','escort','hold']);G.npc=null;
  const o=G.obj={type:t,done:false,fail:false,prog:0,goal:t==='hunt'?rnd(6,9)+(G.endless?Math.floor(G.depth/3):0):1,limit:t==='alarm'?rnd(11,15):0};
  const empty=()=>shuffle(G.grid.flat().filter(c=>!c.block&&!c.zone&&!c.token&&!c.poi&&!c.barrel&&!inRoom(c.c)&&!c.vault&&!monsterAt(c.c,c.r)&&dist(c.c,c.r,G.startCells[0][0],G.startCells[0][1])>=7));
  if(t==='leader'){
    const base=pick(L.mon.filter(id=>MON[id]&&MON[id].hp>=6&&MON[id].mv>=1&&!MON[id].split));const c=empty()[0];
    if(c){const m=spawnMon(base,c.c,c.r);m.hp=m.max=Math.round(m.hp*2.4);m.atk+=2;m.def+=1;m.n='Вожак: '+m.n;m.elite=true;m.leader=true;m.lair=5;m.xp=m.xp*3+3;}
    else o.type='hunt',o.goal=7;
  }else if(t==='treasure'){const c=empty()[0];if(c)c.token={t:'event',e:'treasure'};else{o.type='hunt';o.goal=7;}}
  else if(t==='escort'){
    const ex=G.exitCells[0];const c=empty().filter(x=>dist(x.c,x.r,ex[0],ex[1])>=4)[0]||empty()[0];
    if(c){
      const hp=12+4*Math.min(2,LOC_TIER[G.loc]||0)+(G.endless?Math.floor(G.depth/2):0);
      G.npc={npc:true,id:'npc',c:c.c,r:c.r,hp,alive:true,freed:false,items:[],lv:1,perks:{},block:false,poison:0,burn:0,bleed:0,chill:0,
        d:{n:'Пленник',hp,atk:0,def:0,ap:0,rng:1,spr:'captive',abil:[],lv:{}}};
      const pool=L.mon.filter(id=>MON[id]&&MON[id].mv>=1&&!MON[id].split&&MON[id].hp<=14);
      for(let i=0;i<2;i++){const f=freeNear(c.c,c.r);if(f){const m=spawnMon(pick(pool),f[0],f[1]);m.n='Стражник: '+m.n;}}
    }else{o.type='hunt';o.goal=7;}
  }
  else if(t==='hold'){
    const ok=x=>nb(x.c,x.r).every(([a,b])=>{const q=cellOf(a,b);return q&&!q.block&&!q.zone&&!q.poi;})&&nb(x.c,x.r).length===6;
    const c=empty().filter(ok)[0];
    if(c){o.goal=4+Math.min(1,LOC_TIER[G.loc]||0);o.active=false;o.at=[c.c,c.r];
      [c,...nb(c.c,c.r).map(([a,b])=>cellOf(a,b))].forEach(q=>{q.hold=true;q.token=null;q.terr=null;q.trap=null;});
      c.block=true;c.deco='totem';
    }else{o.type='hunt';o.goal=7;}
  }
}
const holdHere=()=>G.heroes.some(h=>h.alive&&!h.temp&&cellOf(h.c,h.r)&&cellOf(h.c,h.r).hold);
function holdStart(){
  const o=G.obj;if(!o||o.type!=='hold'||o.active||o.done||!holdHere())return;
  o.active=true;sfx('roar');log('Тотем пробуждается — враги идут на штурм! Держите точку '+o.goal+' раунда.');showBanner('Оборона!','Держите тотем '+o.goal+' раунда');holdWave();
}
function holdTick(){
  const o=G.obj;if(!o||o.type!=='hold'||o.done||o.fail)return;
  if(!o.active){holdStart();return;}
  if(holdHere()){o.prog++;pop({c:o.at[0],r:o.at[1]},'ДЕРЖИМ '+o.prog+'/'+o.goal,'#ffd23f');log('Тотем удержан: '+o.prog+'/'+o.goal+'.');}
  else log('У тотема никого нет — раунд не засчитан.');
  if(o.prog>=o.goal){o.prog=o.goal;objDone();return;}
  holdWave();
}
function holdWave(){
  const o=G.obj,L=LOCS[G.loc];const pool=(L.mon||[]).filter(id=>MON[id]&&MON[id].mv>=1&&!MON[id].split&&MON[id].hp<=16);if(!pool.length)return;
  const n=2+(D().mon>=2?1:0);
  const cand=shuffle(G.grid.flat().filter(c=>!c.block&&!c.zone&&!c.token&&!c.hold&&!inRoom(c.c)&&!c.vault&&!monsterAt(c.c,c.r)&&!heroAt(c.c,c.r)&&!npcAt(c.c,c.r)&&dist(c.c,c.r,o.at[0],o.at[1])>=6));
  for(let i=0;i<n&&cand[i];i++){const c=cand[i];const m=maybeAffix(spawnMon(pick(pool),c.c,c.r));m.aggro=true;fxQ({burst:'spawn',c:c.c,r:c.r});}
  sfx('spawn');
}
function objText(){
  const o=G.obj;if(!o)return null;const d=OBJ[o.type];
  const prog=o.type==='hunt'?o.prog+'/'+o.goal:o.type==='alarm'&&!o.done?'раунд '+G.round+'/'+o.limit:o.type==='hold'&&!o.done?(o.active?'раунд '+o.prog+'/'+o.goal:'найти тотем'):o.type==='escort'&&!o.done&&!o.fail&&G.npc?(G.npc.freed?'HP '+Math.max(0,G.npc.hp)+'/'+G.npc.d.hp:'найти'):'';
  return {n:d.n,prog,st:o.done?'ok':o.fail?'bad':'',d:d.d+(o.type==='hunt'?' Нужно: '+o.goal+'.':o.type==='alarm'?' Лимит: '+o.limit+' раундов.':'')};
}
function objDone(){
  const o=G.obj;o.done=true;chronEv('Цель «'+OBJ[o.type].n+'» выполнена.');const g=evGold(25+(G.endless?G.depth*3:0));
  log('★ ЦЕЛЬ ВЫПОЛНЕНА: «'+OBJ[o.type].n+'»! +'+g+' золота и реликвия на привале.');showBanner('Цель выполнена!','+'+g+' золота · реликвия ждёт на привале');sfx('victory');G.relicPending=(G.relicPending||0)+1;
}
function objProgress(k){
  const o=G.obj;if(!o||o.done||o.fail)return;
  if(k==='kill'&&o.type==='hunt')o.prog++;
  else if(k==='leader'&&o.type==='leader')o.prog=1;
  else if(k==='treasure'&&o.type==='treasure')o.prog=1;
  else if(k==='exit'&&o.type==='alarm'&&G.round<=o.limit)o.prog=1;
  else if(k==='escort'&&o.type==='escort')o.prog=1;
  else return;
  if(o.prog>=o.goal)objDone();
}
function alarmTick(){
  const o=G.obj;if(!o||o.type!=='alarm'||o.done)return;
  if(G.round>o.limit){
    if(!o.fail){o.fail=true;log('ТРЕВОГА! Враги почуяли отряд — подкрепление прибывает каждый раунд!');showBanner('ТРЕВОГА!','Подкрепление врага на подходе');sfx('roar');}
    const c=shuffle(G.grid.flat().filter(c=>!c.block&&!c.zone&&!c.token&&!inRoom(c.c)&&!c.vault&&!heroAt(c.c,c.r)&&!monsterAt(c.c,c.r)&&G.heroes.every(h=>!h.alive||dist(h.c,h.r,c.c,c.r)>=5)))[0];
    if(c){const L=LOCS[G.loc];const m=maybeAffix(spawnMon(pick(L.mon.filter(id=>MON[id]&&!MON[id].split&&MON[id].hp<=14)),c.c,c.r));fxQ({burst:'spawn',c:c.c,r:c.r});log('Подкрепление: '+m.n+'.');}
  }
}
function openEvent(k,h,cell){
  const done=()=>{closeModal();ui();};
  const leave=txt=>({t:txt||'Уйти',fn:()=>{log('Вы уходите, не рискуя.');done();}});
  if(k==='campfire'){
    sfx('heal');log('Костёр путников! Герои рядом отдыхают: +30% HP, статусы сняты.');
    G.heroes.filter(x=>x.alive&&dist(x.c,x.r,cell.c,cell.r)<=3).forEach(x=>{const b=x.hp;x.hp=Math.min(st(x,'maxhp'),x.hp+Math.ceil(st(x,'maxhp')*.3));x.poison=x.burn=x.bleed=x.chill=0;pop(x,'+'+(x.hp-b));});
    return;}
  if(k==='treasure'){
    const g=evGold(rnd(35,55));pop({c:cell.c,r:cell.r},'+'+g+' з','#ffd23f');sfx('key');fxQ({burst:'level',c:cell.c,r:cell.r});log('СОКРОВИЩЕ! Найдено '+g+' золота и редкий предмет.');
    giveItem(h,pick(['amulet','trollheart','vampring','feather','chain','axe','elixir']),cell);objProgress('treasure');return;}
  if(k==='merchant'){
    const rel=pickRelics(1)[0];const its=shuffle([...GEN1,...GEN2,'potion','elixir'].filter(id=>canUse(h,id))).slice(0,2);
    const offers=[];if(rel)offers.push({t:'relic',id:rel,price:55});its.forEach(id=>offers.push({t:'item',id,price:priceOf(id)}));
    const show=()=>{
      openModal('<h1>Странствующий торговец</h1><p>«Лучшие товары — только для храбрых!» Покупает <b>'+h.d.n+'</b>. Золото отряда: <b style="color:var(--gold)">'+G.gold+'</b></p><div class="shop">'+offers.map(o=>{
        const nm=o.t==='relic'?RELICS[o.id].n:ITEMS[o.id].n,ds=o.t==='relic'?RELICS[o.id].d:ITEMS[o.id].d,ic=o.t==='relic'?RICON[o.id]:ICON[o.id];
        return '<div class="item"><div class="ih"><img class="ic" src="'+ic+'"><div><b>'+nm+'</b><div class="ty">'+(o.t==='relic'?'Реликвия':ITEMS[o.id].type)+'</div></div><span class="chip gold pr"><i class="coin"></i>'+o.price+'</span></div><div class="ds">'+ds+'</div></div>';}).join('')+'</div>',
        [...offers.map((o,i)=>({t:'Купить: '+(o.t==='relic'?RELICS[o.id].n:ITEMS[o.id].n)+' ('+o.price+' з)',fn:()=>{
          if(G.gold<o.price){log('Не хватает золота.');sfx('trap');return;}
          if(o.t==='item'&&h.items.length>=3){log(h.d.n+': нет места в сумке.');return;}
          G.gold-=o.price;offers.splice(i,1);if(o.t==='relic')giveRelic(o.id);else{takeItem(h,o.id);log(h.d.n+' покупает: '+ITEMS[o.id].n+'.');}
          if(offers.length)show();else done();}})),{t:'Закончить',fn:done}]);};
    log('Странствующий торговец раскладывает товар.');sfx('item');show();return;}
  if(k==='altar'){
    openModal('<h1>Проклятый алтарь</h1><p>Над древним камнем пульсирует тёмный огонь. Голос шепчет: «Дай крови — получишь силу».</p><p>Жертва: <b>'+h.d.n+'</b> потеряет 5 HP, а отряд выберет одну из реликвий.</p>',
      [{t:'Принести жертву (−5 HP)',fn:()=>{if(h.hp<=5){log(h.d.n+' слишком слаб для жертвы.');sfx('trap');return;}h.hp-=5;pop(h,'-5');sfx('hurt');fxQ({burst:'kill',c:h.c,r:h.r});log(h.d.n+' отдаёт кровь алтарю.');closeModal();openRelicChoice(2,'Дар алтаря','Алтарь предлагает на выбор:');}},leave()]);
    return;}
  if(k==='prisoner'){
    openModal('<h1>Пленник</h1><p>В клетке сидит оборванный человек: «Освободи меня, добрый путник! Я щедро заплачу».</p><p style="color:var(--mid)">Может, он и правда благодарен. А может, это приманка...</p>',
      [{t:'Освободить',fn:()=>{if(Math.random()<.55){const g=evGold(rnd(15,25));const it=pick(GEN1);log('Пленник благодарен: даёт '+g+' золота и предмет.');sfx('key');giveItem(h,it,cell);pop(cell,'+'+g+' з','#ffd23f');}else{log('Это была ловушка! «Пленник» свистит — со всех сторон бегут разбойники!');ambushAt(h,2);}done();}},leave('Оставить')]);
    return;}
  if(k==='beast'){
    const pool=PET_POOL[G.loc]||PET_POOL[1];const kind=pick(pool);const P=PETS[kind];const old=G.heroes.find(x=>x.pet&&x.alive);
    const pot=G.heroes.find(x=>x.alive&&!x.pet&&x.items.some(id=>id==='potion'||id==='elixir'));
    const adopt=()=>{closeModal();adoptPet(kind,cell);};
    const opts=[];
    if(pot)opts.push({t:'Перевязать: зелье ('+pot.d.n+')',fn:()=>{const i=pot.items.findIndex(id=>id==='potion'||id==='elixir');pot.items.splice(i,1);log(pot.d.n+' отдаёт зелье раненому зверю.');adopt();}});
    if(h.hp>4)opts.push({t:'Перевязать своей кровью (−4 HP '+h.d.n+')',fn:()=>{h.hp-=4;pop(h,'-4');sfx('hurt');adopt();}});
    opts.push(leave('Оставить'));
    openModal('<h1>Раненый зверь</h1><p>В зарослях скулит раненый зверь: <b>'+P.n.replace('-спутник','').replace('Ручная ','')+'</b>. Если перевязать его, он пойдёт за отрядом.</p><p style="color:var(--mid)">Питомец слабее героев ('+(P.hp+3*Math.min(2,LOC_TIER[G.loc]||0))+' HP, атака '+P.atk+'), ходит сам и переходит с вами между локациями, пока жив. Погибший питомец не воскрешается.'+(old?' <b>У вас уже есть '+old.d.n+' — новый зверь его заменит.</b>':'')+'</p>',opts);
    return;}
  if(k==='riddle'){
    const outs=shuffle([
      {n:'сокровищницу',f:()=>{const g=evGold(rnd(20,35));log('Дверь открывает сокровищницу: +'+g+' золота.');sfx('item');pop(h,'+'+g+' з','#ffd23f');}},
      {n:'целебный источник',f:()=>{G.heroes.forEach(x=>{if(x.alive){const b=x.hp;x.hp=Math.min(st(x,'maxhp'),x.hp+6);pop(x,'+'+(x.hp-b));}});sfx('heal');log('За дверью целебный источник: все герои +6 HP.');}},
      {n:'тайник',f:()=>{log('За дверью тайник с предметом.');giveItem(h,pick([...GEN1,...GEN2]),cell);}},
      {n:'логово',f:()=>{log('За дверью — логово! Враги нападают!');ambushAt(h,3);}},
      {n:'ловушку',f:()=>{log('Ловушка! '+h.d.n+' получает 5 урона.');h.hp-=5;pop(h,'-5');sfx('trap');if(h.hp<=0)killHero(h);}},
      {n:'алтарь знаний',f:()=>{G.heroes.forEach(x=>gainXP(x,2));sfx('shrine');log('Алтарь знаний: все герои получают 2 опыта.');}}]).slice(0,3);
    openModal('<h1>Три двери</h1><p>В стене три одинаковые двери. На камне надпись: «Одна — награда, другая — беда, третья — как повезёт».</p>',
      [0,1,2].map(i=>({t:'Дверь '+(i+1),fn:()=>{outs[i].f();done();}})));
    return;}
  if(k==='gambler'){
    const bet=(sum,win,pr)=>({t:'Ставка '+sum+' з (шанс '+Math.round(pr*100)+'%, приз '+win+' з)',fn:()=>{
      if(G.gold<sum){log('Не хватает золота.');sfx('trap');return;}G.gold-=sum;
      if(Math.random()<pr){G.gold+=win;log('Кости благосклонны! Выигрыш: '+win+' з.');sfx('key');pop(h,'+'+win+' з','#ffd23f');}else{log('Кости не повезли: −'+sum+' з.');sfx('trap');pop(h,'-'+sum+' з','#f66');}
      done();}});
    openModal('<h1>Игрок в кости</h1><p>Бородатый гном трясёт стаканом: «Сыграем, герои? Золото любит смелых!» Золото отряда: <b style="color:var(--gold)">'+G.gold+'</b></p>',[bet(10,20,.5),bet(25,70,.4),leave('Отказаться')]);
    return;}
}

/* --- Способности и предметы: единая схема целей --- */
function specRange(h,spec){return spec.rng==='weapon'?st(h,'rng'):spec.rng==='melee'?1:spec.rng;}
function validTargets(h,spec){
  const v=new Map();
  if(spec.t==='enemy'){const r=specRange(h,spec);G.monsters.filter(m=>m.alive&&mdist(h,m)<=r&&fogOK(m)).forEach(m=>cellsOf(m).forEach(([c,rr])=>v.set(key(c,rr),m)));}
  else if(spec.t==='ally'){const r=specRange(h,spec);G.heroes.filter(x=>x.alive&&dist(h.c,h.r,x.c,x.r)<=r).forEach(x=>v.set(key(x.c,x.r),x));}
  else if(spec.t==='dead'){const r=specRange(h,spec);G.heroes.filter(x=>!x.alive&&dist(h.c,h.r,x.c,x.r)<=r).forEach(x=>v.set(key(x.c,x.r),x));}
  else if(spec.t==='hex'){const dm=reach(h,spec.steps);dm.forEach((d,k)=>{const [c,r]=k.split(',').map(Number);if(d>0&&!heroAt(c,r))v.set(k,cellOf(c,r));});}
  return v;
}
function startSpec(h,spec,ref){
  if(G.busy||G.over||!h.alive||!mine(h))return;
  if(h.ap<spec.cost)return;
  if(spec.once&&h.reviveUsed){log('Уже использовано на этой локации.');return;}
  if(spec.t==='self'){act(ref.slot!=null?{c:'item',h:h.id,slot:ref.slot}:{c:'abil',h:h.id,id:ref.id});return;}
  const v=validTargets(h,spec);
  if(!v.size){log('Нет подходящих целей.');return;}
  G.mode={spec,ref,h,valid:v};ui();
}
function execSpec(h,spec,tgt,ref){
  if(ref&&ref.id)vsay(h,'atk',.7);
  h.ap-=spec.cost;
  spec.run(h,tgt);
  if(ref&&ref.slot!=null&&spec.consume){h.items.splice(ref.slot,1);}
  afterAction();
}
