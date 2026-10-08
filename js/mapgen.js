'use strict';
/* =========================================================
   ГЕНЕРАЦИЯ КАРТ
   ========================================================= */
function syncWorld(){
  W=G.ww||620;H=G.wh||440;
  try{if(cv&&(cv.width!==W||cv.height!==H)){cv.width=W;cv.height=H;if(typeof fit==='function')fit();}}catch(e){}
}
function makeGrid(cols,rows){
  G.cols=cols;G.rows=rows;
  {const mw0=(cols+0.5)*S3*HS,mh0=(rows-1)*1.5*HS+2*HS;G.ww=Math.max(620,Math.ceil(mw0)+16);G.wh=Math.max(440,Math.ceil(mh0)+28);W=G.ww;H=G.wh;}
  const g=[];for(let r=0;r<rows;r++){g.push([]);for(let c=0;c<cols;c++)g[r].push({c,r,block:false,seed:Math.random(),token:null,zone:null,dragon:false,poi:null,deco:null});}
  G.grid=g;
  const mw=(cols+0.5)*S3*HS,mh=(rows-1)*1.5*HS+2*HS;
  G.ox=(W-mw)/2+S3*HS/2;G.oy=(H-mh)/2+HS+6;
}
function zoneAround(c,r,z,n){
  const cl=[[c,r],...nb(c,r).slice(0,n||3)];
  cl.forEach(([x,y])=>{const cell=cellOf(x,y);cell.zone=z;cell.block=false;});
  return cl;
}
function floodFrom(c,r){
  const seen=new Set([key(c,r)]),q=[[c,r]];
  while(q.length){const [x,y]=q.shift();for(const [a,b] of nb(x,y)){const k=key(a,b);if(seen.has(k)||cellOf(a,b).block)continue;seen.add(k);q.push([a,b]);}}
  return seen;
}
function genField(n){
  const L=G.exped?expedL(n):LOCS[n];
  let startCells,exitCells,reach;
  for(let tries=0;tries<80;tries++){
    makeGrid(L.cols,L.rows);
    startCells=zoneAround(1,L.rows-2,'start');
    exitCells=zoneAround(L.cols-3,1,'exit');
    for(const row of G.grid)for(const cell of row){
      if(cell.zone)continue;
      const ds=dist(cell.c,cell.r,1,L.rows-2),de=dist(cell.c,cell.r,L.cols-3,1);
      if(ds<=1||de<=1)continue;
      cell.block=Math.random()<0.12;
    }
    reach=floodFrom(exitCells[0][0],exitCells[0][1]);
    const total=G.grid.flat().filter(c=>!c.block).length;
    if(startCells.every(([x,y])=>reach.has(key(x,y)))&&reach.size>=total*0.95)break;
  }
  // точки интереса
  const used=new Set();
  const free=(c,r)=>{const cl=cellOf(c,r);return cl&&!cl.zone&&!cl.poi&&reach.has(key(c,r))&&dist(c,r,1,L.rows-2)>=3;};
  const poiTokens=[];
  for(const p of L.poi){
    let c=Math.round((L.cols-1)*p.at[0]),r=Math.round((L.rows-1)*p.at[1]);
    if(!free(c,r)){
      const cand=G.grid.flat().filter(x=>free(x.c,x.r)).sort((a,b)=>dist(a.c,a.r,c,r)-dist(b.c,b.r,c,r));
      ({c,r}=cand[0]);
    }
    const cell=cellOf(c,r);cell.block=false;cell.poi=p;if(p.tok&&p.tok.t==='portal'){cell.portal=true;cell.token=null;cell.poi=Object.assign({},p,{entry:1});}else cell.token=p.tok?Object.assign({},p.tok):null;poiTokens.push(cell);
  }
  // случайные фишки
  const c1=pick(CLASS1),c2=pick(CLASS2);
  const tokens=[];
  {let mons=shuffle(L.mon.slice());const want=Math.max(4,(L.monN||L.mon.length)+D().mon+DS().cnt);
   while(mons.length<want)mons.push(pick(L.mon));mons=mons.slice(0,want);
   if(G.endless){const all=[...LOCS[1].mon,...LOCS[2].mon,...LOCS[3].mon,...LOCS[5].mon,...LOCS[6].mon];const pr=Math.min(.6,.07*(G.depth-1));mons=mons.map(m=>Math.random()<pr?pick(all):m);}
   mons.forEach(m=>tokens.push({t:'monster',m}));}
  const g1=shuffle(GEN1.slice()),g2=shuffle(GEN2.slice()),cc=shuffle((n===1?CLASS1:CLASS2).filter(inSquad));
  L.items.forEach(i=>tokens.push({t:'item',it:i==='*c1'||i==='*c2'?cc.pop():i==='*g1'?g1.pop():i==='*g2'?g2.pop():i}));
  for(let i=0;i<L.keys;i++)tokens.push({t:'key'});
  L.events.forEach(e=>tokens.push({t:'event',e}));
  shuffle(EXTRA_EV.slice()).slice(0,2).forEach(e=>tokens.push({t:'event',e}));
  const cand=shuffle(G.grid.flat().filter(c=>!c.zone&&!c.block&&!c.poi&&reach.has(key(c.c,c.r))&&dist(c.c,c.r,1,L.rows-2)>=3));
  tokens.forEach((t,i)=>{if(cand[i])cand[i].token=t;});
  // *a в POI
  G.grid.flat().forEach(c=>{if(c.token&&c.token.it==='*a')c.token.it=pick(POOL_A);});
  // декор
  G.grid.flat().forEach(c=>{if(c.block)c.deco=L.deco;});
  G.startCells=startCells;G.exitCells=exitCells;
  placeTerrain(L);
  poiTokens.filter(c=>c.poi.boss).forEach(c=>{const f=freeNear(c.c,c.r);if(f){const m=spawnMon(c.poi.boss,f[0],f[1]);m.elite=true;m.home=[c.c,c.r];}});
  G.vault=null;if(!G.rush&&Math.random()<.45)addVault(L);
  if(L.mini&&poiTokens.some(c=>c.portal))addRoomWing(L,L.mini);
}

/* --- Режим «Орда»: одна арена, волны врагов, привал между волнами --- */
const HORDE_POOLS=[
 ['goblin','goblin','wolf','skel','bandit','bat','slime','boar'],
 ['orc','spider','wolf','skel','toad','leech','plaguerat','boar','shaman','bandit'],
 ['orc','dknight','necro','ghost','croc','wisp','zombie','wraith','cultist','gargoyle','scorpion'],
 ['troll','ogre','golem','yeti','icegolem','alchemist','scorpion','dknight','wraith','bogwitch','necro'],
 ['troll','ogre','golem','icegolem','dknight','alchemist','bogwitch','necro','wraith','yeti','icespirit','scorpion']];
const HORDE_BOSSES=['icequeen','hydra','spiderqueen'];
const L0=LOCS[7];
function genHorde(){
  const nh=G.heroes.length,big=nh>=6,cols=big?15:L0.cols,rows=big?12:L0.rows;
  const L=LOCS[HORDE_LOC],cc=Math.floor(cols/2),cr=Math.floor(rows/2);let startCells,reach;
  for(let tries=0;tries<80;tries++){
    makeGrid(cols,rows);startCells=zoneAround(cc,cr,'start',Math.max(3,nh-1));
    for(const row of G.grid)for(const cell of row){if(cell.zone||dist(cell.c,cell.r,cc,cr)<=2)continue;cell.block=Math.random()<0.1;}
    reach=floodFrom(cc,cr);
    const total=G.grid.flat().filter(c=>!c.block).length;
    if(reach.size>=total*0.97)break;
  }
  G.grid.flat().forEach(c=>{if(c.block)c.deco='pillar';});
  G.startCells=startCells;G.exitCells=[];
  const empty=()=>shuffle(G.grid.flat().filter(c=>!c.block&&!c.zone&&dist(c.c,c.r,cc,cr)>=3));
  empty().slice(0,5).forEach(c=>{c.terr='lava';});
  let b=3;
  for(const c of empty()){if(b<=0)break;if(c.terr)continue;c.block=true;const f=floodFrom(cc,cr);
    if(G.grid.flat().every(x=>x.block||f.has(key(x.c,x.r)))){c.barrel=true;c.deco='barrel';b--;}else c.block=false;}
}
function nextWave(){
  const H=G.horde;H.wave++;H.state='fight';const w=H.wave;
  const pool=HORDE_POOLS[Math.min(HORDE_POOLS.length-1,Math.floor((w-1)/3))];
  const boss=w%5===0;
  const hf=.55+.45*G.heroes.length/4;
  const want=Math.min(36,Math.round((3+Math.floor(w*1.3))*hf)+Math.max(0,D().mon)+(boss?-2:0));
  const spots=shuffle(G.grid.flat().filter(c=>!c.block&&!c.zone&&!c.terr&&G.heroes.every(h=>!h.alive||dist(h.c,h.r,c.c,c.r)>=5)))
    .sort((a,b)=>((a.c<=1||a.c>=G.cols-2||a.r<=0||a.r>=G.rows-1)?0:1)-((b.c<=1||b.c>=G.cols-2||b.r<=0||b.r>=G.rows-1)?0:1)||0);
  let n=0;
  const put=(id,bossy)=>{const c=spots.shift();if(!c)return;const m=bossy?spawnMon(id,c.c,c.r):maybeAffix(spawnMon(id,c.c,c.r));m.aggro=true;fxQ({burst:'spawn',c:c.c,r:c.r});if(bossy){m.elite=true;m.home=[c.c,c.r];}n++;};
  if(boss)put(HORDE_BOSSES[(w/5-1)%HORDE_BOSSES.length],true);
  while(n<want&&spots.length)put(pick(pool),false);
  sfx(boss?'roar':'spawn');
  log('=== Волна '+w+(boss?' — БОСС':'')+': врагов '+n+' ===');
  showBanner('Волна '+w+(boss?' — БОСС':''),'Врагов: '+n+' · крепче на '+Math.round((DS().hp-1)*100)+'%');
  G.heroes.forEach(h=>{if(h.alive)h.ap=st(h,'ap')+(hasRelic('clock')?1:0);});
  G.ready={};armTimer();ui();
}
function waveClear(){
  const H=G.horde;if(!H||H.state!=='fight')return;H.state='camp';H.cleared++;chronEv('Волна '+H.wave+' отбита.');
  const g=evGold(15+6*H.wave);sfx('victory');fxQ({burst:'confetti',c:0,r:0});
  G.relicPending=(G.relicPending||0)+(H.wave%3===0?1:0);
  log('★ Волна '+H.wave+' отбита! +'+g+' золота.');showBanner('Волна '+H.wave+' отбита!','+'+g+' золота');
  const out=campRest();openCamp(out);
}
const hordeScore=()=>(G.horde?G.horde.wave*100:0)+G.stats.kills*5+Math.floor((G.gold||0)/5);
function loadHordeRecords(){try{return JSON.parse(localStorage.getItem('bd_horde')||'[]');}catch(e){return [];}}
function saveHordeRecord(r){const a=loadHordeRecords();a.push(r);a.sort((x,y)=>y.score-x.score);a.length=Math.min(a.length,5);try{localStorage.setItem('bd_horde',JSON.stringify(a));}catch(e){}return a;}



/* --- Режим «Экспедиция»: одна большая локация, хозяин логова у выхода --- */
const EXP_THEMES=[1,2,5,3,6];
const EXP_BOSS={3:'icequeen',5:'hydra',6:'spiderqueen'};
function expedL(n){
  const B=LOCS[n],boss=G.exped.boss;
  const poi=B.poi.filter(p=>!p.boss).map(p=>Object.assign({},p,{at:[.06+p.at[0]*.62,p.at[1]]}));
  poi.push({n:'Логово хозяина',spr:'cave',at:[.84,.2],boss});
  const T={};for(const k in (B.terr||{}))T[k]=(B.terr[k]||0)*2+1;
  return Object.assign({},B,{n:'Экспедиция: '+B.n,cols:24,rows:15,poi,monN:(B.monN||10)*2+3,
    items:[...B.items,...B.items,'potion','elixir'],events:[...B.events,...B.events.filter(e=>e!=='ambush')],keys:0,terr:T});
}
function chooseExped(then){
  openModal('<h1>Экспедиция</h1><p>Одна огромная локация — в 2,5 раза больше обычной: вдвое больше врагов, сундуков и событий, подземелье, сокровищница и Охотник. У выхода в дальнем конце — логово хозяина (мини-босс): выход откроется, когда он падёт. Привалов нет — берегите зелья!</p><h2>Выберите край</h2>',
    [...EXP_THEMES.map(n=>({t:LOCS[n].n,fn:()=>{setMode('exped');NET.expTheme=n;then();}})),{t:'Случайный',fn:()=>{setMode('exped');NET.expTheme=null;then();}},{t:'Назад',fn:()=>chooseMode(then)}],true);
}
function expedWin(){
  G.over=true;G.busy=true;sfx('victory');fxQ({burst:'confetti',c:0,r:0});setTimeout(()=>fxQ({burst:'confetti',c:0,r:0}),1400);
  META.s.wins++;META.exped=(META.exped||0)+1;saveMeta();ach('exped');
  openModal('<h1>ЭКСПЕДИЦИЯ ЗАВЕРШЕНА</h1><p>Отряд прошёл весь край «'+LOCS[G.exped.theme].n+'» и сразил хозяина логова. Выжило героев: <b>'+G.heroes.filter(h=>h.alive&&!h.temp&&!h.pet).length+'</b>, раундов: <b>'+G.round+'</b>.</p>'+summaryHtml(),[{t:'Новая экспедиция',fn:()=>{closeModal();newGame();}}]);
}

/* --- Режим «Босс-раш» и сюжетные главы --- */
const RUSH_LIST=['icequeen','hydra','spiderqueen','dragon'];
const RUSH_THEME={icequeen:3,hydra:5,spiderqueen:6};
const RUSH_MINIONS={icequeen:'icespirit',hydra:'toad',spiderqueen:'spider'};
const CHAPTERS={
 caravan:{n:'Пропавший караван',route:[1,5],boss:'hydra',weather:{5:'rain'},obj:{1:'escort'},
   intro:'Торговый караван не дошёл до города. Последний раз его видели у Тёмного леса, а дальше дорога уходит в Гиблые топи. Найдите выжившего возницу и выясните, что случилось.',
   mid:'Возница бормочет о «болоте с тремя головами»: караван утащила в топи Гидра. Её логово — в самой глубине. Под проливным дождём отряд идёт дальше.',
   end:'Гидра повержена. В её логове — обломки фургонов и сундуки с товаром. Караван не вернуть, но дорога через топи снова безопасна.'},
 plague:{n:'Чумной доктор',route:[2,6],boss:'spiderqueen',weather:{6:'fog'},obj:{2:'hold'},
   intro:'Из Мёртвых земель ползёт мор: животные гибнут, колодцы горчат. Местный лекарь говорит, что зараза идёт из старых катакомб, а путь туда стережёт древний тотем.',
   mid:'Тотем удержан, и проход в катакомбы открыт. Из тумана тянет ядом — где-то там, в паучьем гнезде, сидит источник заразы.',
   end:'Королева пауков мертва, её яд больше не отравит землю. Колодцы очистятся к весне, а лекарь обещает сварить для отряда лучшие зелья.'},
 heart:{n:'Ледяное сердце',route:[1,3],boss:'icequeen',weather:{3:'night'},obj:{1:'leader'},
   intro:'Посреди лета в деревне выпал снег. Охотники говорят о вожаке зверей, что бродит по Тёмному лесу с ледяным амулетом на шее. Найдите его.',
   mid:'Амулет вожака холоден, как сама зима, и указывает на север — к Ледяным пещерам. Ночь над ними не кончается.',
   end:'Ледяная королева пала, и её сердце растаяло. Утром над деревней снова светит летнее солнце.'}
};
const modeName=()=>NET.exped?'Экспедиция'+(NET.expTheme?': '+LOCS[NET.expTheme].n:''):NET.chapter?'Глава: '+CHAPTERS[NET.chapter].n:NET.rush?'Босс-раш':NET.horde?'Орда':NET.endless?'Бесконечное подземелье':'Сюжет';
function setMode(k){NET.exped=k==='exped';NET.endless=k==='endless';NET.horde=k==='horde';NET.rush=k==='rush';NET.chapter=k&&CHAPTERS[k]?k:null;}
function chooseChapter(then){
  const done=META.chapters||{};
  openModal('<h1>Сюжетные главы</h1><p>Короткие истории на две локации со своими условиями. Победа — когда повержен главный враг главы.</p>'+
    Object.keys(CHAPTERS).map(k=>{const c=CHAPTERS[k];return '<h2>'+(done[k]?'✓ ':'')+c.n+'</h2><p>'+c.intro+'</p><p style="color:var(--mid)">Путь: '+c.route.map(n=>LOCS[n].n).join(' → ')+'. Главный враг: '+MON[c.boss].n+'.</p>';}).join(''),
    [...Object.keys(CHAPTERS).map(k=>({t:CHAPTERS[k].n,fn:()=>{setMode(k);then();}})),{t:'Назад',fn:()=>chooseMode(then)}],true);
}
function genRush(n,id){
  const L=LOCS[n],cols=13,rows=10,sc=2,sr=5;let start,reach;
  for(let tries=0;tries<80;tries++){
    makeGrid(cols,rows);start=zoneAround(sc,sr,'start',Math.max(3,G.heroes.length-1));
    for(const row of G.grid)for(const c of row){if(c.zone||dist(c.c,c.r,sc,sr)<=2||dist(c.c,c.r,10,4)<=1)continue;c.block=Math.random()<.09;}
    reach=floodFrom(sc,sr);const tot=G.grid.flat().filter(c=>!c.block).length;if(reach.size>=tot*.97&&reach.has(key(10,4)))break;
  }
  G.grid.flat().forEach(c=>{if(c.block)c.deco=L.deco;});
  G.startCells=start;G.exitCells=[];
  const T=L.terr||{};const empty=()=>shuffle(G.grid.flat().filter(c=>!c.block&&!c.zone&&dist(c.c,c.r,sc,sr)>=3&&dist(c.c,c.r,10,4)>=2));
  ['slow','lava','acid'].forEach(k=>{let q=Math.min(5,Math.ceil((T[k]||0)/2));for(const c of empty()){if(q<=0)break;c.terr=k;q--;}});
  const b=spawnMon(id,10,4);b.elite=true;b.aggro=true;b.home=[10,4];
  for(let i=0;i<2;i++){const f=freeNear(10,4);if(f){const m=spawnMon(RUSH_MINIONS[id],f[0],f[1]);m.aggro=true;}}
}
function startRushFight(){
  const R=G.rush,id=R.list[R.i];R.state='fight';
  if(id==='dragon'){G.keys=KEYS_NEEDED;startLoc(ARENA);return;}
  startLoc(RUSH_THEME[id]);
  showBanner('Бой '+(R.i+1)+' из '+R.list.length,MON[id].n);
}
function rushClear(){
  const R=G.rush;if(!R||R.state!=='fight')return;R.state='camp';
  const g=evGold(40+15*R.i);R.i++;
  chronEv('Босс-раш: бой '+R.i+' выигран.');sfx('victory');fxQ({burst:'confetti',c:0,r:0});
  log('★ Бой выигран! +'+g+' золота и реликвия на привале.');
  const out=campRest();openCamp(out);
}
function chapterWin(){
  const C=CHAPTERS[G.chapter.id];G.over=true;G.busy=true;sfx('victory');fxQ({burst:'confetti',c:0,r:0});setTimeout(()=>fxQ({burst:'confetti',c:0,r:0}),1400);
  META.chapters=META.chapters||{};META.chapters[G.chapter.id]=1;META.s.wins++;saveMeta();ach('chapter');
  openModal('<h1>ГЛАВА ПРОЙДЕНА</h1><h2>'+C.n+'</h2><p>'+C.end+'</p>'+summaryHtml(),[{t:'К списку глав',fn:()=>{closeModal();NET.playing=false;goMenu();}},{t:'Сыграть ещё раз',fn:()=>{closeModal();newGame();}}]);
}
function showChapterIntro(){const C=CHAPTERS[G.chapter.id];openModal('<h1>'+C.n+'</h1><p>'+C.intro+'</p><p style="color:var(--mid)">Путь: '+C.route.map(n=>LOCS[n].n).join(' → ')+'. Победа — когда повержен '+MON[C.boss].n+'.</p>',[{t:'В путь!',fn:closeModal}]);}

/* --- Малые локации: вход по фишке-порталу, бой с сильными врагами, возврат на большую карту --- */
const inRoom=(c)=>!!G.room&&c>=G.room.c0;
/* Комната-«крыло»: дорисована справа от основной карты в той же сетке. Отдельная область — ходьба и стрельба между областями невозможны (dist=99). */
function addRoomWing(L,M){
  const mainCols=G.cols,mainRows=G.rows,GAP=1,RC=9,RR=7;
  const c0=mainCols+GAP,total=c0+RC;
  for(let r=0;r<mainRows;r++)for(let c=mainCols;c<total;c++)G.grid[r].push({c,r,block:true,void:true,seed:Math.random(),token:null,zone:null,dragon:false,poi:null,deco:null});
  G.cols=total;
  const r0=Math.max(0,Math.floor((mainRows-RR)/2));
  const sc=c0+1,sr=r0+RR-2,ec=c0+RC-2,er=r0+1;
  for(let tries=0;tries<80;tries++){
    for(let r=r0;r<r0+RR;r++)for(let c=c0;c<c0+RC;c++){const cl=cellOf(c,r);cl.void=false;cl.block=false;cl.room=true;cl.zone=null;cl.deco=null;cl.terr=null;cl.barrel=false;}
    zoneAround(sc,sr,'start');
    for(let r=r0;r<r0+RR;r++)for(let c=c0;c<c0+RC;c++){const cl=cellOf(c,r);if(cl.zone)continue;if(dist2(c,r,sc,sr)<=1||dist2(c,r,ec,er)<=1)continue;cl.block=Math.random()<0.1;}
    cellOf(ec,er).block=false;
    const reach=floodFrom(sc,sr);const tot=G.grid.flat().filter(x=>x.room&&!x.block).length;
    if(reach.has(key(ec,er))&&reach.size>=tot*0.95)break;
  }
  const room=G.grid.flat().filter(x=>x.room);
  room.forEach(x=>{if(x.block)x.deco=L.deco;});
  cellOf(ec,er).rexit=true;
  const empty=()=>shuffle(room.filter(x=>!x.block&&!x.zone&&!x.rexit&&dist2(x.c,x.r,sc,sr)>=3));
  const T=M.terr||{};
  ['slow','lava','acid'].forEach(kind=>{let n=T[kind]||0;for(const sd of empty()){if(n<=0)break;sd.terr=kind;n--;}});
  let b=2;for(const x of empty()){if(b<=0)break;if(x.terr)continue;x.block=true;const f=floodFrom(sc,sr);
    if(room.every(y=>y.block||f.has(key(y.c,y.r)))){x.barrel=true;x.deco='barrel';b--;}else x.block=false;}
  const mw=(total+0.5)*S3*HS;G.ww=Math.max(620,Math.ceil(mw)+16);G.ox=(G.ww-mw)/2+S3*HS/2;
  G.room={c0,r0,cols:RC,rows:RR,n:M.n,d:M.d,mon:M.mon,opened:false,won:false,start:[sc,sr],exit:[ec,er]};
  const cand=HORDER.filter(id=>!(G.heroes||[]).some(h=>h.id===id));
  if(cand.length&&Math.random()<.5){
    const cc=shuffle(room.filter(x=>!x.block&&!x.zone&&!x.rexit&&!x.terr&&!x.barrel&&dist2(x.c,x.r,sc,sr)>=4&&nb(x.c,x.r).some(([a,b])=>{const q=cellOf(a,b);return q&&q.room&&!q.block;})))[0];
    if(cc)G.room.captive={id:pick(cand),c:cc.c,r:cc.r,freed:false};
  }
  syncWorld();
}
function dist2(c1,r1,c2,r2){const a=cube(c1,r1),b=cube(c2,r2);return Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]),Math.abs(a[2]-b[2]));}
function promptRoom(h,cell){
  const R=G.room;if(!R||R.won||G.over)return;
  openModal('<h1>'+(cell.poi?cell.poi.n:R.n)+'</h1><p>'+R.d+'</p><p><b>'+h.d.n+'</b> может войти в подземелье — оно дорисовано справа на карте. Остальные герои продолжают ходить на основной карте, всё идёт в одном раунде. Входить могут и другие герои — каждый, кто встанет на этот гекс.</p><p>Внутри <b style="color:#ff9a8a">сильные враги</b> (на 50% крепче и злее обычных). Награда за зачистку: реликвия, золото, редкий предмет и опыт. Выйти можно в любой момент через гекс «ВЫХОД» внутри.</p>',
    [{t:'Войти ▶',fn:()=>{closeModal();enterRoom(h,cell);}},{t:'Войти и позвать союзников ▶▶',fn:()=>{closeModal();G.callTo={c:cell.c,r:cell.r};log(h.d.n+' зовёт союзников на помощь в подземелье. Они идут к входу.');enterRoom(h,cell);}},{t:'Не сейчас',fn:()=>{closeModal();log('Вы решаете пока не заходить внутрь.');ui();}}]);
}
function enterRoom(h,cell){
  const R=G.room;if(!R||!h||!h.alive||inRoom(h.c))return;
  const spots=G.grid.flat().filter(x=>x.zone==='start'&&x.room&&!heroAt(x.c,x.r)&&!monsterAt(x.c,x.r));
  const f=spots[0]||(()=>{const q=freeNear(R.start[0],R.start[1]);return q?cellOf(q[0],q[1]):null;})();if(!f)return;
  h.c=f.c;h.r=f.r;G.undo=null;G.mode=null;sfx('travel');fxQ({burst:'spawn',c:f.c,r:f.r});
  if(!R.opened){
    R.opened=true;
    const want=4+(D().mon>=2?1:0)+Math.floor(DS().cnt/2);
    let mons=shuffle(R.mon.slice());while(mons.length<want)mons.push(pick(R.mon));mons=mons.slice(0,want);
    const sp=shuffle(G.grid.flat().filter(x=>x.room&&!x.block&&!x.zone&&!x.rexit&&!npcAt(x.c,x.r)&&!x.terr&&!x.barrel&&!heroAt(x.c,x.r)&&dist2(x.c,x.r,R.start[0],R.start[1])>=4));
    mons.forEach((id,i)=>{const c=sp[i];if(!c)return;const m=spawnMon(id,c.c,c.r);m.hp=m.max=Math.round(m.hp*1.5);m.atk+=2;m.def+=1;m.n='Свирепый: '+m.n;m.strong=true;});
    showBanner(R.n,'Сильные враги. Остальной отряд ходит на основной карте.');sfx('roar');
  }
  log(h.d.n+' входит в «'+R.n+'».');ui();
}
function leaveRoom(h){
  const R=G.room;if(!R||!inRoom(h.c))return;
  const en=G.grid.flat().find(x=>x.poi&&x.poi.n&&x.poi.entry);const ec=en||null;
  const q=ec?freeNear(ec.c,ec.r):null;const f=q||(()=>{const all=G.grid.flat().filter(x=>!inRoom(x.c)&&!x.block&&!x.token&&!heroAt(x.c,x.r));return all.length?[all[0].c,all[0].r]:null;})();
  if(!f)return;
  h.c=f[0];h.r=f[1];G.undo=null;sfx('travel');log(h.d.n+' выходит из подземелья.');ui();
}
function winRoom(){
  const R=G.room;if(!R||R.won)return;R.won=true;G.callTo=null;chronEv('Подземелье «'+R.n+'» зачищено.');ach('mini');G.stats.minis=(G.stats.minis||0)+1;if(G.stats.minis>=3)ach('mini3');
  const inside=G.heroes.filter(h=>h.alive&&inRoom(h.c));
  const g=evGold(35+(G.endless?G.depth*3:0));sfx('victory');fxQ({burst:'confetti',c:0,r:0});
  inside.forEach(h=>gainXP(h,3));
  const rare=Math.random()<.3?pick(CURSED):pick(['amulet','trollheart','vampring','chain','axe','elixir']);
  const hh=inside.find(h=>canUse(h,rare))||inside[0];if(hh)giveItem(hh,rare,cellOf(hh.c,hh.r));
  log('★ '+R.n+' зачищено! +'+g+' золота, +3 опыта вошедшим, награда: '+ITEMS[rare].n+'.');
  const en=G.grid.flat().find(x=>x.portal);if(en){en.portal=false;if(en.poi)en.poi=Object.assign({},en.poi,{done:1});}
  const ids=pickRelics(3);
  const back=()=>{closeModal();G.heroes.filter(h=>h.alive&&inRoom(h.c)).forEach(h=>leaveRoom(h));};
  if(!ids.length){openModal('<h1>'+R.n+' зачищено!</h1><p>Золото: <b style="color:var(--gold)">+'+g+'</b>, предмет: '+ITEMS[rare].n+'.</p>',[{t:'Вернуться на карту',fn:back}]);return;}
  openModal('<h1>'+R.n+' зачищено!</h1><p>Золото: <b style="color:var(--gold)">+'+g+'</b>, предмет: '+ITEMS[rare].n+'. Выберите реликвию:</p><div class="shop">'+ids.map(id=>'<div class="item"><div class="ih"><img class="ic" src="'+RICON[id]+'"><div><b>'+RELICS[id].n+'</b><div class="ty">Реликвия</div></div></div><div class="ds">'+RELICS[id].d+'</div></div>').join('')+'</div>',
    ids.map(id=>({t:'Взять: '+RELICS[id].n,fn:()=>{giveRelic(id);back();}})));
}
function placeTerrain(L){
  const T=L.terr||{};
  const empty=()=>shuffle(G.grid.flat().filter(c=>!c.block&&!c.zone&&!c.poi&&!c.token&&!c.terr&&!c.trap&&dist(c.c,c.r,G.startCells[0][0],G.startCells[0][1])>=3));
  ['slow','lava','acid'].forEach(kind=>{let n=T[kind]||0;
    for(const seed of empty()){if(n<=0)break;seed.terr=kind;n--;
      nb(seed.c,seed.r).forEach(([c,r])=>{const x=cellOf(c,r);if(n>0&&x&&!x.block&&!x.zone&&!x.poi&&!x.token&&!x.terr&&Math.random()<.45){x.terr=kind;n--;}});}});
  let b=T.barrel||0;
  for(const c of empty()){if(b<=0)break;
    c.block=true;const ex=G.exitCells[0];const f=floodFrom(ex[0],ex[1]);
    const ok=G.grid.flat().every(x=>x.block||f.has(key(x.c,x.r)));
    if(ok){c.barrel=true;c.deco='barrel';b--;}else c.block=false;}
  empty().slice(0,T.trap||0).forEach(c=>{c.trap={seen:false};});
}
function genArena(){
  const L=LOCS[ARENA];makeGrid(L.cols,L.rows);
  const cc=5,cr=3;
  G.grid.flat().forEach(c=>{if(dist(c.c,c.r,5,4)>5){c.block=true;c.deco='pillar';}});
  const dcells=[[cc,cr],...nb(cc,cr)];
  dcells.forEach(([x,y])=>{const c=cellOf(x,y);c.block=false;c.dragon=true;});
  G.startCells=zoneAround(5,7,'start');
  const spots=shuffle(G.grid.flat().filter(c=>!c.block&&!c.zone&&!c.dragon&&dist(c.c,c.r,cc,cr)>=3&&dist(c.c,c.r,5,7)>=2)).slice(0,6);
  spots.forEach(c=>{c.block=true;c.deco='pillar';});
  shuffle(G.grid.flat().filter(c=>!c.block&&!c.zone&&!c.dragon&&dist(c.c,c.r,cc,cr)>=2)).slice(0,5).forEach(c=>{c.terr='lava';});
  G.exitCells=[];
  const seals=KEYS_NEEDED-G.keys;
  const bossN=G.endless?Math.max(1,Math.round(G.depth/BOSS_EVERY)):0;
  const max=G.endless?Math.round((150+50*(bossN-1))*D().boss*(hasRelic('crown')?1.15:1)):Math.round((DRAGON_HP+SEAL_HP*seals)*D().boss);
  const d={id:'dragon',boss:true,big:true,n:'Дракон',hp:max,max,atk:G.endless?10+Math.floor((bossN-1)/2):10,def:3,bonus:G.endless?Math.floor((bossN-1)/2):Math.floor(seals/2),mv:0,rng:1,xp:0,spr:'dragon',alive:true,c:cc,r:cr,cells:dcells,hit:new Set(),
    d:'Босс. Коготь, хвост, огненное дыхание, призыв дракончиков. Ниже 50% HP — ярость.'};
  G.dragon=d;G.monsters=[d];
}
