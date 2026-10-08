'use strict';
/* =========================================================
   МУЛЬТИПЛЕЕР (комнаты через свой сервер WebSocket, хост — авторитет)
   ========================================================= */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pname=id=>(NET.players[id]&&NET.players[id].name)||'—';
const ownerOf=h=>NET.owners[h.id]||(NET.freeAI?'AI':'H');
const isAI=h=>ownerOf(h)==='AI';
const mine=h=>NET.role==='solo'?!isAI(h):ownerOf(h)===NET.me;
const ownTag=h=>isAI(h)?' <span style="color:#8ad8ff">[ИИ]</span>':NET.role==='solo'?'':' <span style="color:var(--gold)">['+esc(pname(ownerOf(h)))+']</span>';
function bc(m){for(const id in NET.conns){const c=NET.conns[id];if(c&&c.open){try{c.send(m);}catch(e){}}}}

/* --- команды игроков (выполняются на хосте) --- */
function act(cmd){
  if(NET.role==='guest'){if(NET.conn&&NET.conn.open)NET.conn.send({t:'cmd',cmd});}
  else runCmd(cmd,'H');
}
function needList(){return [...new Set(G.heroes.filter(h=>h.alive).map(ownerOf))].filter(p=>p!=='AI'&&!(NET.players[p]&&NET.players[p].off));}
function maybeEndRound(){if(G.busy||G.over||!NET.started)return;const need=needList();if(need.length&&need.every(p=>G.ready[p]))endRound();}
function runSpec(h,spec,ref,cmd){
  if(h.ap<spec.cost||(spec.once&&h.reviveUsed))return;
  if(spec.t==='self'){execSpec(h,spec,null,ref);return;}
  const t=validTargets(h,spec).get(key(cmd.tx,cmd.ty));
  if(t)execSpec(h,spec,t,ref);
}
function runCmd(cmd,who){
  if(G.over||NET.gmodal)return;
  if(G.camp){campCmd(cmd,who);return;}
  if(cmd.c==='end'){
    if(G.busy||(NET.players[who]&&NET.players[who].spec))return;
    G.ready[who]=!G.ready[who];
    const need=needList();
    if(need.every(p=>G.ready[p]))endRound();else ui();
    return;
  }
  if(G.busy)return;
  if(cmd.c==='next'){goNext();return;}
  const h=G.heroes.find(x=>x.id===cmd.h);
  if(!h||!h.alive||ownerOf(h)!==who)return;
  REMOTE=who!=='H';
  const keepUndo=cmd.c==='mv'||cmd.c==='undo';if(!keepUndo)G.undo=null;
  try{
    switch(cmd.c){
      case 'undo':{const u=G.undo;if(!u||u.h!==h.id)break;G.undo=null;h.c=u.c;h.r=u.r;h.ap=u.ap;sfx('whoosh');log(h.d.n+' отменяет ход.');afterAction();break;}
      case 'atk':{const bc=cellOf(cmd.x,cmd.y);if(bc&&bc.barrel&&h.ap>=1&&dist(h.c,h.r,bc.c,bc.r)<=st(h,'rng')){h.ap-=1;explodeBarrel(h,bc);afterAction();break;}
        const m=monsterAt(cmd.x,cmd.y);if(m&&h.ap>=1&&mdist(h,m)<=st(h,'rng')&&fogOK(m))doAttack(h,m);break;}
      case 'exp':{const cell=cellOf(cmd.x,cmd.y);if(cell&&cell.token&&h.ap>=1&&dist(h.c,h.r,cell.c,cell.r)<=1)doExplore(h,cell);break;}
      case 'mv':{const cell=cellOf(cmd.x,cmd.y);if(!cell||heroAt(cell.c,cell.r))break;const spd=st(h,'spd');const d=reach(h,h.ap*spd).get(key(cell.c,cell.r));
        if(d>0){const cost=Math.ceil(d/spd);if(h.ap>=cost){const pre={h:h.id,c:h.c,r:h.r,ap:h.ap,ll:G.log.length};G.undo=pre;doMove(h,cell,cost);
          if(G.log.length!==pre.ll||!h.alive)G.undo=null;ui();}}break;}
      case 'abil':{if(!habils(h).includes(cmd.id))break;runSpec(h,ABIL[cmd.id],{id:cmd.id},cmd);break;}
      case 'drop':{const id=h.items[cmd.slot];if(!id)break;if(isCursed(id)){log('«'+ITEMS[id].n+'» проклят и не снимается. Очистите его на привале.');sfx('trap');break;}h.items.splice(cmd.slot,1);fixHp(h);dropLoot(h.c,h.r,id);log(h.d.n+' кладёт на землю: '+ITEMS[id].n+'.');sfx('item');afterAction();break;}
      case 'take':{const cell=cellOf(h.c,h.r);const id=cell.loot&&cell.loot[cmd.i];if(!id||!canUse(h,id)||h.items.length>=3)break;cell.loot.splice(cmd.i,1);takeItem(h,id);log(h.d.n+' подбирает: '+ITEMS[id].n+'.');afterAction();break;}
      case 'perk':{const g=h.d.lv[cmd.lv];if(!g||!g.pick||cmd.lv>h.lv||perkOf(h,cmd.lv)||!g.pick[cmd.o])break;
        h.perks=h.perks||{};h.perks[cmd.lv]=cmd.o;const o=g.pick[cmd.o];if(o.ap)h.ap+=o.ap;
        sfx('level');pop(h,o.n);log(h.d.n+' выбирает: «'+o.n+'». '+o.d);afterAction();break;}
      case 'item':{const id=h.items[cmd.slot];const sp=id&&ITEMS[id].use;if(sp)runSpec(h,sp,{slot:cmd.slot},cmd);break;}
    }
  }finally{REMOTE=false;}
}

/* --- снимок состояния --- */
function makeSnap(){
  return {
    loc:G.loc,round:G.round,keys:G.keys,busy:G.busy,over:G.over,cols:G.cols,rows:G.rows,ox:G.ox,oy:G.oy,ww:G.ww,wh:G.wh,
    grid:G.grid.map(row=>row.map(c=>({b:c.block,d:c.deco,s:c.seed,z:c.zone,dr:c.dragon,p:c.poi?{n:c.poi.n,spr:c.poi.spr}:null,t:c.token?1:0,lt:c.loot&&c.loot.length?c.loot:undefined,tr:c.terr||undefined,br:c.barrel?1:undefined,pt:c.portal?1:undefined,hd:c.hold?1:undefined,ht:c.htrap?1:undefined,lv:c.lever?1:undefined,dr2:c.door?1:undefined,vd:c.void?1:undefined,rm:c.room?1:undefined,rx:c.rexit?1:undefined,tp:c.trap&&c.trap.seen?1:undefined}))),
    heroes:G.heroes.map(h=>{const {d,...rest}=h;return rest;}),
    monsters:G.monsters.map(m=>{const {hit,...rest}=m;return rest;}),
    dragon:G.dragon?G.monsters.indexOf(G.dragon):-1,
    tele:G.tele?[...G.tele.cells]:null,exitCells:G.exitCells,startCells:G.startCells,stats:G.stats,
    log:G.log.slice(-80),ready:G.ready||{},owners:NET.owners,players:NET.players,ext:{gold:G.gold,diff:G.diff,camp:G.camp,relics:G.relics,relicPending:G.relicPending,obj:G.obj,endless:G.endless,depth:G.depth,floorClear:G.floorClear,room:G.room||null,undo:G.undo?{h:G.undo.h}:null,daily:G.daily||null,horde:G.horde||null,rush:G.rush||null,chapter:G.chapter||null,exped:G.exped||null,lures:G.lures||[],fog:!!G.fog,seen:G.fog?G.seen:null,weather:G.weather||null,vault:G.vault||null,pacts:G.pacts||[],trackVar:G.trackVar||0,npc:G.npc||null,tleft:G.deadline?Math.max(0,Math.round((G.deadline-Date.now())/1000)):0,timer:NET.timer||0},freeAI:!!NET.freeAI
  };
}
function sendSnap(to){
  if(NET.role!=='host'||!NET.started||!G.grid)return;
  const s=makeSnap();
  if(to){to.send({t:'snap',s});return;}
  s.fq=NET.fq;s.sq=NET.sq;s.pq=NET.pq||[];NET.fq=[];NET.sq=[];NET.pq=[];
  bc({t:'snap',s});
}
function schedSnap(){
  if(NET.role!=='host'||!NET.started||NET.bq)return;
  NET.bq=setTimeout(()=>{NET.bq=0;sendSnap();},30);
}
function applySnap(s){
  const old=G;
  const ng={loc:s.loc,round:s.round,keys:s.keys,busy:s.busy,over:s.over,cols:s.cols,rows:s.rows,ox:s.ox,oy:s.oy,ww:s.ww,wh:s.wh,log:s.log,stats:s.stats,ready:s.ready,
    exitCells:s.exitCells,startCells:s.startCells,fx:old.fx||[],hover:old.hover||null,mode:null,sel:old.sel||'sword',tele:null,monsters:[],dragon:null,hl:null};
  ng.grid=s.grid.map((row,r)=>row.map((c,x)=>({c:x,r,block:c.b,deco:c.d,seed:c.s,zone:c.z,dragon:c.dr,poi:c.p,token:c.t?{hidden:true}:null,loot:c.lt||null,terr:c.tr||null,barrel:!!c.br,portal:!!c.pt,hold:!!c.hd,htrap:!!c.ht,lever:!!c.lv,door:!!c.dr2,void:!!c.vd,room:!!c.rm,rexit:!!c.rx,trap:c.tp?{seen:true}:null})));
  ng.heroes=s.heroes.map(h=>Object.assign(h,{d:HDEF[h.id]||h.pd}));
  if(!ng.heroes.some(h=>h.id===ng.sel))ng.sel=ng.heroes[0].id;
  ng.monsters=s.monsters.map(m=>Object.assign(m,{hit:new Set()}));
  ng.dragon=s.dragon>=0?ng.monsters[s.dragon]:null;
  if(s.tele)ng.tele={cells:new Set(s.tele),flash:0};
  Object.assign(ng,s.ext||{});ng.showInt=old.showInt;ng.deadline=(s.ext&&s.ext.tleft)?Date.now()+s.ext.tleft*1000:0;if(s.ext)NET.timer=s.ext.timer||0;
  if(old.loc!==s.loc&&s.loc>0&&LOC_SUB[s.loc])showBanner(LOCS[s.loc].n,LOC_SUB[s.loc]);
  G=ng;syncWorld();NET.owners=s.owners;NET.players=s.players;NET.freeAI=s.freeAI;
  if(old.mode){const h=G.heroes.find(x=>x.id===old.mode.h.id);if(h)G.mode={spec:old.mode.spec,ref:old.mode.ref,h,valid:new Map()};}
  if(!NET.selInit){NET.selInit=true;const m=G.heroes.find(h=>h.alive&&mine(h));if(m)G.sel=m.id;}
  const now=performance.now();
  (s.pq||[]).forEach(addProj);
  (s.fq||[]).forEach(f=>{const p=hc(f.c,f.r);G.fx.push({x:p.x,y:p.y-10,txt:f.txt,col:f.col,t:now});popFx(f.c,f.r,f.txt);});
  (s.sq||[]).slice(0,6).forEach(n=>{if(typeof n==='string')sfx(n,true);});
  ui();
}

/* --- лобби --- */
function sendLobby(){
  bc({t:'lobby',players:NET.players,owners:NET.owners,started:NET.started,code:NET.code,diff:NET.diff||'normal',freeAI:!!NET.freeAI,endless:!!NET.endless,horde:!!NET.horde,rush:!!NET.rush,exped:!!NET.exped,expTheme:NET.expTheme||null,chapter:NET.chapter||null,squad:squad(),timer:NET.timer||0,pacts:NET.pacts||[],fog:!!NET.fog});
  if(NET.lobby)showLobby();
}
function claim(hero,who){
  if(!HDEF[hero]||!squad().includes(hero))return;
  if(NET.players[who]&&NET.players[who].spec)return;
  const o=NET.owners[hero];
  if(!o)NET.owners[hero]=who;else if(o===who)delete NET.owners[hero];
  sendLobby();if(NET.started)ui();
}
function copyLink(t){
  try{if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t);return true;}}catch(e){}
  try{const a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;left:-999px;top:0';document.body.appendChild(a);a.focus();a.select();const ok=document.execCommand('copy');a.remove();return ok;}catch(e){return false;}
}
function closeLobby(){NET.lobby=false;closeModal();}
function showLobby(){
  NET.lobby=true;
  const isHost=NET.role==='host';
  const link=location.href.split('#')[0]+'#room='+NET.code;
  let html='<h1>Комната '+esc(NET.code)+'</h1>';
  if(isHost)html+='<p>Ссылка для друзей (игра должна быть выложена в интернет):</p><p><b style="word-break:break-all;user-select:all">'+esc(link)+'</b></p>';
  html+=(NET.fog?'<p>Туман войны: <b>включён</b></p>':'')+((NET.pacts||[]).length?'<p>Договоры: <b>'+NET.pacts.map(k=>PACTS[k].n).join(', ')+'</b></p>':'')+(NET.timer?'<p>Таймер раунда: <b>'+NET.timer+' с</b> — когда время выйдет, раунд закроется сам (неготовые игроки пропускают остаток хода).</p>':'')+'<p>Режим: <b>'+modeName()+'</b></p><p>Сложность: <b>'+DIFF[NET.diff||'normal'].n+'</b> — '+DIFF[NET.diff||'normal'].d+'</p>';
  html+='<h2>Игроки</h2><ul>'+Object.keys(NET.players).map(id=>'<li>'+esc(pname(id))+(id===NET.me?' (вы)':'')+(id==='H'?' — хост':'')+(NET.players[id]&&NET.players[id].spec?' — зритель':'')+(NET.players[id]&&NET.players[id].off?' — нет связи':'')+'</li>').join('')+'</ul>';
  html+=NET.spec?'<h2>Вы — зритель</h2><p>Вы видите игру, но героями не управляете. Можно пользоваться фразами и метками.</p>':'<h2>Герои — нажмите, чтобы взять или освободить</h2><p>Свободных героев ведёт: <b>'+(NET.freeAI?'ИИ':'хост')+'</b>.</p>';
  const btns=(NET.spec?[]:squad()).map(id=>{const o=NET.owners[id];const nm=HDEF[id].n;
    const t=o?nm+' — '+pname(o)+(o===NET.me?' [освободить]':''):nm+' — свободен [взять]';
    return {t,fn:()=>{if(isHost)claim(id,'H');else NET.conn.send({t:'claim',hero:id});}};});
  if(isHost){
    btns.push({t:'Скопировать ссылку',fn:e=>{if(copyLink(link))e.target.textContent='Скопировано ✓';else window.prompt('Скопируйте ссылку (Ctrl+C):',link);}});
    if(!NET.started)btns.push({t:'Отряд: '+squad().map(id=>HDEF[id].n).join(', ')+' ▸',fn:()=>chooseSquad(()=>{NET.owners={};sendLobby();showLobby();})});
    if(!NET.started)btns.push({t:'Туман войны: '+(NET.fog?'вкл':'выкл')+' ▸',fn:()=>{NET.fog=!NET.fog;sendLobby();}});
    if(!NET.started)btns.push({t:'Договоры: '+((NET.pacts||[]).length||'нет')+' ▸',fn:()=>choosePacts(()=>{sendLobby();showLobby();})});
    if(!NET.started)btns.push({t:'Режим: '+modeName()+' ▸',fn:()=>{const order=[null,'endless','horde','rush','exped',...Object.keys(CHAPTERS)];const cur=NET.chapter||(NET.exped?'exped':NET.rush?'rush':NET.horde?'horde':NET.endless?'endless':null);const nx=order[(order.indexOf(cur)+1)%order.length];setMode(nx);if(!NET.horde&&squad().length>4){NET.squad=SQUAD0;NET.owners={};}sendLobby();}});
    if(!NET.started)btns.push({t:'Сложность: '+DIFF[NET.diff||'normal'].n+' ▸',fn:()=>{NET.diff=DORDER[(DORDER.indexOf(NET.diff||'normal')+1)%3];sendLobby();}});
    btns.push({t:'Таймер раунда: '+(NET.timer?NET.timer+' с':'выкл')+' ▸',fn:()=>{const o=[0,60,90,120];NET.timer=o[(o.indexOf(NET.timer||0)+1)%o.length];if(NET.started)armTimer();sendLobby();if(NET.started)ui();}});
    btns.push({t:'Свободные герои: '+(NET.freeAI?'ИИ':'хост')+' ▸',fn:()=>{NET.freeAI=!NET.freeAI;sendLobby();if(NET.started)ui();}});
    btns.push(NET.started?{t:'Закрыть',fn:closeLobby}:{t:'НАЧАТЬ ИГРУ',fn:startMP});
    btns.push({t:'Закрыть комнату',fn:askQuit});
  }else{
    if(NET.started)btns.push({t:'Закрыть',fn:closeLobby});else html+='<p>Ждём, пока хост начнёт игру...</p>';
    btns.push({t:'Выйти из комнаты',fn:askQuit});
  }
  openModal(html,btns,true);
}
function startMP(){
  NET.started=true;NET.gmodal=false;NET.lobby=false;closeModal();
  newGame();if(G.chapter)setTimeout(showChapterIntro,300);
  sendLobby();
}
function netTop(){
  const solo=NET.role==='solo';
  const need=needList();
  const rd=G.ready||{};
  const mineReady=!!rd[NET.me];
  let s='';
  if(NET.spec){return '<span class="chip" data-tip="Вы наблюдаете за игрой. Героями управляют другие игроки.">👁 Зритель</span><button class="btn" data-act="lobby">Игроки</button><button class="btn" data-act="say">Фразы</button>';}
  if(!solo)s+='<span class="chip">Готовы '+need.filter(p=>rd[p]).length+'/'+need.length+'</span>';
  s+='<button class="btn'+(mineReady?' act':' primary')+'" data-act="end" '+(G.busy?'disabled':'')+'>'+(solo?'Конец раунда':(mineReady?'Отменить готовность':'Готов (конец раунда)'))+'</button>';
  if(!solo)s+='<button class="btn" data-act="lobby">Игроки</button><button class="btn" data-act="say">Фразы</button>';
  return s;
}

/* --- соединение --- */
function netError(msg){
  const btns=[{t:'В меню',fn:()=>{location.reload();}}];
  openModal('<h1>Нет связи</h1><p>'+esc(msg)+'</p>',btns,true);
}
function saveName(){const v=($('#pname')&&$('#pname').value.trim())||'Игрок';NET.myName=v.slice(0,14);try{localStorage.setItem('bd_name',NET.myName);}catch(e){}}
function dropPlayer(id){
  if(!NET.conns[id]&&!NET.players[id])return;
  delete NET.conns[id];
  if(NET.started&&NET.players[id]&&NET.toks[id]){NET.players[id].off=true;sendLobby();ui();maybeEndRound();return;}
  delete NET.players[id];delete NET.toks[id];
  for(const h in NET.owners)if(NET.owners[h]===id)delete NET.owners[h];
  if(G.ready)delete G.ready[id];
  sendLobby();if(NET.started)ui();
}
/* --- пинги и быстрые фразы --- */
const PHRASES=['Сюда!','Нужно лечение!','Атакуем вместе!','Жду на выходе','Осторожно!','Я готов — жмите «Готов»','Отступаем!','Спасибо!'];
const PINGS=[];
function sendSocial(m){if(NET.role==='guest'){if(NET.conn&&NET.conn.open)NET.conn.send(m);}else relaySocial(m,'H');}
function relaySocial(m,from){
  const o={t:'soc',k:m.t,from,name:pname(from)};
  if(m.t==='ping'){if(!cellOf(m.c,m.r))return;o.c=m.c;o.r=m.r;}else{if(!PHRASES[m.i])return;o.i=m.i;}
  bc(o);showSocial(o);
}
function showSocial(o){
  const col=o.from===NET.me?'#ffd23f':'#8ad8ff';
  if(o.k==='ping'){PINGS.push({c:o.c,r:o.r,name:o.name,col,t:performance.now()});sfx('ping',true);toast('<b style="color:'+col+'">'+esc(o.name)+'</b>: метка на карте');}
  else{sfx('ping',true);toast('<b style="color:'+col+'">'+esc(o.name)+'</b>: '+esc(PHRASES[o.i]));}
}
function toast(html){
  const el=$('#toast');const d=document.createElement('div');d.innerHTML=html;el.appendChild(d);
  while(el.children.length>4)el.firstChild.remove();
  setTimeout(()=>{d.style.opacity='0';setTimeout(()=>d.remove(),600);},6000);
}
function goMenu(){location.href=location.pathname;}
function askQuit(){
  const role=NET.role;
  const txt=role==='host'?('Комната '+esc(NET.code)+' будет закрыта для всех игроков, сохранение удалится.')
    :role==='guest'?'Вы покинете комнату. Ваши герои перейдут под управление хоста; вернуться можно будет только как новый игрок.'
    :'Текущая игра будет завершена, сохранение удалится.';
  openModal('<h1>Завершить игру?</h1><p>'+txt+'</p>',[{t:'Да, выйти',fn:quitSession},{t:'Отмена',fn:()=>{closeModal();if(NET.lobby||(!NET.started&&NET.role!=='solo'))showLobby();}}],true);
}
function quitSession(){
  NET.quitting=true;clearTimeout(saveT);
  try{localStorage.removeItem(NET.role==='guest'?'bd_guest':'bd_host');}catch(e){}
  if(NET.role==='host'){bc({t:'closed'});}
  else if(NET.role==='guest'){try{NET.conn&&NET.conn.send({t:'leave'});}catch(e){}}
  setTimeout(()=>{try{NET.ws&&NET.ws.close();}catch(e){}goMenu();},300);
}
function showPhrases(){
  openModal('<h1>Быстрые фразы</h1><p style="color:var(--mid)">Метка на карте: правый клик (или Alt+клик) по гексу, на телефоне — долгое касание.</p>',
    PHRASES.map((t,i)=>({t,fn:()=>{closeModal();sendSocial({t:'say',i});}})).concat([{t:'Закрыть',fn:closeModal}]),true);
}
function hostData(conn,m){
  const id=conn.peer;
  if(m.t==='hello'){
    const tok=m.tok?String(m.tok).slice(0,40):'';
    let seat=null;
    if(tok)for(const o in NET.toks)if(NET.toks[o]===tok&&o!==id){seat=o;break;}
    if(seat){
      NET.players[id]=NET.players[seat]||{name:String(m.name||'Игрок').slice(0,14)};
      delete NET.players[seat];delete NET.toks[seat];delete NET.conns[seat];
      for(const h in NET.owners)if(NET.owners[h]===seat)NET.owners[h]=id;
      if(G.ready&&seat in G.ready){G.ready[id]=G.ready[seat];delete G.ready[seat];}
      NET.players[id].off=false;
    }else{
      let nm=String(m.name||'Игрок').slice(0,14);const base=nm;let k=1;
      while(Object.keys(NET.players).some(o=>o!==id&&NET.players[o].name===nm)){k++;nm=base.slice(0,12)+' '+k;}
      NET.players[id]={name:nm,spec:!!m.spec};
    }
    if(tok)NET.toks[id]=tok;
    NET.conns[id]=conn;
    conn.send({t:'you',id});
    sendLobby();
    if(NET.started)sendSnap(conn);
  }else if(m.t==='cmd'&&NET.started)runCmd(m.cmd,id);
  else if(m.t==='claim')claim(m.hero,id);
  else if(m.t==='ping'||m.t==='say')relaySocial(m,id);
  else if(m.t==='leave'){const nm=pname(id);delete NET.toks[id];dropPlayer(id);log(nm+' покидает игру. Его герои переходят к хосту.');ui();}
}
function hookHostConn(conn){
  conn.on('data',m=>hostData(conn,m));
  conn.on('close',()=>dropPlayer(conn.peer));
  conn.on('error',()=>dropPlayer(conn.peer));
}
function guestData(m){
  if(m.t==='you')NET.me=m.id;
  else if(m.t==='lobby'){NET.fog=!!m.fog;NET.rush=!!m.rush;NET.exped=!!m.exped;NET.expTheme=m.expTheme||null;NET.chapter=m.chapter||null;NET.timer=m.timer||0;NET.pacts=m.pacts||[];NET.squad=m.squad||SQUAD0;NET.diff=m.diff;NET.endless=m.endless;NET.horde=!!m.horde;NET.freeAI=m.freeAI;NET.players=m.players;NET.owners=m.owners;NET.started=m.started;NET.code=m.code;if(!m.started||NET.lobby)showLobby();}
  else if(m.t==='snap'){NET.started=true;if(NET.lobby){NET.lobby=false;closeModal();}applySnap(m.s);}
  else if(m.t==='modal'){NET.lobby=false;openModal(m.html+'<p style="color:var(--gold)">Решает хост.</p>',m.labels.map(t=>({t,fn:()=>{}})),true);document.querySelectorAll('#mbox .btn').forEach(b=>b.disabled=true);}
  else if(m.t==='mclose'){NET.lobby=false;closeModal();}
  else if(m.t==='soc')showSocial(m);
  else if(m.t==='closed'){NET.quitting=true;try{localStorage.removeItem('bd_guest');}catch(e){}try{NET.ws&&NET.ws.close();}catch(e){}
    openModal('<h1>Игра завершена</h1><p>Хост закрыл комнату.</p>',[{t:'В меню',fn:goMenu}],true);}
}
/* --- игра через свой сервер (WebSocket) --- */
function mkEm(){const hs={};return {on(ev,fn){(hs[ev]=hs[ev]||[]).push(fn);},emit(ev,a){(hs[ev]||[]).forEach(f=>f(a));}};}
function defSrv(){
  let v='';try{v=localStorage.getItem('bd_srv')||'';}catch(e){}
  if(v)return v;
  return /^https?:/.test(location.protocol)?((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws'):'ws://localhost:8080/ws';
}
function saveSrv(){const el=$('#psrv');if(!el)return;let v=el.value.trim();if(v&&!/\/ws$/.test(v)&&!/^wss?:\/\/[^/]+\/.+/.test(v))v=v.replace(/\/+$/,'')+'/ws';NET.srv=v||defSrv();try{localStorage.setItem('bd_srv',NET.srv);}catch(e){}}
const SRVMSG='Не удаётся подключиться к серверу игры. Проверьте адрес сервера, что он запущен и доступен, и что при https-странице адрес начинается с wss://.';
function hostWS(opts){
  opts=opts||{};
  const url=NET.srv||defSrv();
  openModal('<h1>'+(opts.resume?'Восстанавливаем комнату':'Создаём комнату')+'...</h1><p>'+esc(url)+'</p>',opts.resume?[{t:'В меню',fn:()=>location.reload()}]:[],true);
  let ws,up=false,dead=false,to=0;
  const lose=msg=>{
    if(dead||NET.quitting)return;dead=true;clearTimeout(to);try{ws.close();}catch(e){}
    if(up||opts.resume){
      NET.conns={};
      for(const id in NET.players)if(id!=='H'){
        if(NET.started)NET.players[id].off=true;
        else{delete NET.players[id];delete NET.toks[id];for(const h in NET.owners)if(NET.owners[h]===id)delete NET.owners[h];}
      }
      openModal('<h1>Нет связи с сервером</h1><p>Пробуем восстановить комнату '+esc(NET.code)+'...</p>',[{t:'В меню',fn:()=>location.reload()}],true);
      setTimeout(()=>hostWS({resume:true}),3000);
    }else netError(msg);
  };
  try{ws=new WebSocket(url);}catch(e){netError('Неверный адрес сервера: '+url);return;}
  NET.ws=ws;const peers={};
  to=setTimeout(()=>{if(!up)lose(SRVMSG);},9000);
  ws.onopen=()=>ws.send(JSON.stringify(opts.resume?{op:'host',code:NET.code}:{op:'host'}));
  ws.onerror=()=>lose(SRVMSG);
  ws.onclose=()=>lose(SRVMSG);
  ws.onmessage=e=>{
    let m;try{m=JSON.parse(e.data);}catch(x){return;}
    if(m.op==='hosted'){
      up=true;clearTimeout(to);
      if(opts.resume){
        NET.role='host';NET.me='H';const changed=m.code!==NET.code;NET.code=m.code;
        if(NET.started&&!changed){closeModal();ui();}else showLobby();
      }else{NET.role='host';NET.me='H';NET.code=m.code;NET.players={H:{name:NET.myName}};NET.owners={};NET.toks={};NET.started=false;showLobby();}
    }
    else if(m.op==='err'){lose(m.msg);}
    else if(m.op==='peer'){
      const em=mkEm();
      const conn={peer:m.id,open:true,on:em.on,emit:em.emit,send(x){if(ws.readyState===1)ws.send(JSON.stringify({op:'to',id:m.id,m:x}));},close(){}};
      peers[m.id]=conn;hookHostConn(conn);
    }
    else if(m.op==='from'){const c=peers[m.id];if(c)c.emit('data',m.m);}
    else if(m.op==='gone'){const c=peers[m.id];if(c){c.open=false;c.emit('close');delete peers[m.id];}}
  };
}
function joinWS(code,opts){
  opts=opts||{};
  code=String(code||'').trim().toUpperCase();
  if(!code){netError('Введите код комнаты.');return;}
  const again=!!(opts.retry||opts.resume);const spec=!!opts.spec;
  const tok=opts.tok||(Math.random().toString(36).slice(2)+Date.now().toString(36));
  const url=NET.srv||defSrv();
  openModal('<h1>'+(again?'Связь потеряна':'Подключаемся к '+esc(code))+'...</h1><p>'+(again?'Возвращаемся в комнату '+esc(code)+'. ':'')+esc(url)+'</p>',
    again?[{t:'Отмена (в меню)',fn:()=>{try{localStorage.removeItem('bd_guest');}catch(e){}location.reload();}}]:[],true);
  let ws,up=false,dead=false,to=0;
  const lose=msg=>{
    if(dead||NET.quitting)return;dead=true;clearTimeout(to);try{ws.close();}catch(e){}
    if(up||again){
      openModal('<h1>Связь потеряна</h1><p>Переподключаемся к комнате '+esc(code)+'...</p><p style="color:var(--mid)">'+esc(msg||'')+'</p>',
        [{t:'Отмена (в меню)',fn:()=>{try{localStorage.removeItem('bd_guest');}catch(e){}location.reload();}}],true);
      setTimeout(()=>joinWS(code,{tok,retry:true,spec}),3000);
    }else netError(msg);
  };
  try{ws=new WebSocket(url);}catch(e){netError('Неверный адрес сервера: '+url);return;}
  NET.ws=ws;
  to=setTimeout(()=>{if(!up)lose(SRVMSG);},9000);
  const em=mkEm();
  ws.onopen=()=>ws.send(JSON.stringify({op:'join',code}));
  ws.onerror=()=>lose(SRVMSG);
  ws.onclose=()=>lose('Связь с сервером потеряна.');
  ws.onmessage=e=>{
    let m;try{m=JSON.parse(e.data);}catch(x){return;}
    if(m.op==='joined'){
      up=true;clearTimeout(to);NET.me=m.id;NET.role='guest';NET.spec=spec;G.busy=true;
      try{localStorage.setItem('bd_guest',JSON.stringify({v:SAVE_VER,t:Date.now(),code,tok,name:NET.myName,srv:url,spec}));}catch(x){}
      NET.conn={open:true,send(x){if(ws.readyState===1)ws.send(JSON.stringify({op:'toHost',m:x}));},on:em.on};
      em.on('data',guestData);
      if(again)closeModal();
      NET.conn.send({t:'hello',name:NET.myName,tok,spec});
    }
    else if(m.op==='err'){lose(m.msg);}
    else if(m.op==='from')em.emit('data',m.m);
    else if(m.op==='hostgone')lose('Хост отключился.');
  };
}
/* --- сохранение сессии --- */
const SAVE_TTL=12*3600*1000;
let saveT=0;
function saveSoon(){if(saveT)return;saveT=setTimeout(()=>{saveT=0;saveSess();},600);}
function packG(){
  return {loc:G.loc,round:G.round,keys:G.keys,over:G.over,cols:G.cols,rows:G.rows,ox:G.ox,oy:G.oy,grid:G.grid,
    heroes:G.heroes.map(({d,...r})=>r),monsters:G.monsters.map(({hit,...r})=>r),
    dragon:G.dragon?G.monsters.indexOf(G.dragon):-1,tele:G.tele?[...G.tele.cells]:null,
    exitCells:G.exitCells,startCells:G.startCells,stats:G.stats,log:G.log.slice(-150),sel:G.sel,gold:G.gold,diff:G.diff,camp:G.camp,relics:G.relics,relicPending:G.relicPending,obj:G.obj,endless:G.endless,depth:G.depth,floorClear:G.floorClear,room:G.room||null,npc:G.npc||null,hunt:G.hunt||null,rush:G.rush||null,chapter:G.chapter||null,exped:G.exped||null,lures:G.lures||[],chron:G.chron||null,fog:!!G.fog,seen:G.seen||{},weather:G.weather||null,vault:G.vault||null,pacts:G.pacts||[],ww:G.ww,wh:G.wh,daily:G.daily||null,horde:G.horde||null};
}
function unpackG(g){
  const ng=Object.assign({},g,{fx:[],hover:null,mode:null,hl:null,busy:false,ready:{}});
  ng.heroes=g.heroes.map(h=>Object.assign(h,{d:HDEF[h.id]||h.pd}));
  ng.monsters=g.monsters.map(m=>Object.assign(m,{hit:new Set()}));
  ng.dragon=g.dragon>=0?ng.monsters[g.dragon]:null;
  ng.tele=g.tele?{cells:new Set(g.tele),flash:0}:null;
  G=ng;syncWorld();
}
const SAVE_VER=1; // менять при несовместимых изменениях формата packG/сохранений: старые сохранения будут отброшены
function saveSess(){
  if(NET.quitting)return;
  try{
    const ok=(NET.role==='solo'&&NET.playing)||(NET.role==='host'&&NET.started&&NET.ws);
    if(!ok||!G.grid)return;
    if(G.over){localStorage.removeItem('bd_host');return;}
    if(G.busy&&!G.camp)return;
    localStorage.setItem('bd_host',JSON.stringify({v:SAVE_VER,t:Date.now(),role:NET.role,code:NET.code,srv:NET.srv||'',name:NET.myName,players:NET.players,owners:NET.owners,freeAI:!!NET.freeAI,toks:NET.toks,g:packG()}));
  }catch(e){}
}
function loadSaved(k){try{const o=JSON.parse(localStorage.getItem(k)||'null');
  if(o&&(o.v||1)!==SAVE_VER){localStorage.removeItem(k);return null;} // сохранение от другой версии игры — не читаем
  if(o&&Date.now()-o.t<SAVE_TTL)return o;}catch(e){}return null;}
function resumeHost(o){
  try{unpackG(o.g);}catch(e){console.error('save',e);try{localStorage.removeItem('bd_host');}catch(x){}alert('Не удалось загрузить сохранение: оно повреждено или от старой версии игры. Начните новую игру.');location.reload();return;}NET.myName=o.name||NET.myName;
  NET.owners=o.owners||{};NET.freeAI=!!o.freeAI;
  if(o.role==='solo'){NET.role='solo';NET.playing=true;closeModal();ui();return;}
  NET.role='host';NET.me='H';NET.code=o.code;NET.players=o.players;NET.owners=o.owners;NET.toks=o.toks||{};NET.started=true;
  NET.srv=o.srv||defSrv();
  for(const id in NET.players)if(id!=='H')NET.players[id].off=true;
  hostWS({resume:true});
}
function resumeBtns(){
  const b=[],ago=t=>Math.max(1,Math.round((Date.now()-t)/60000))+' мин назад';
  const sh=loadSaved('bd_host'),sg=loadSaved('bd_guest');
  if(sh)b.push({t:'Продолжить: '+(sh.role==='solo'?'одиночная игра':'ваша комната '+sh.code)+' ('+ago(sh.t)+')',fn:()=>resumeHost(sh)});
  if(sg)b.push({t:'Вернуться в комнату '+sg.code+' ('+ago(sg.t)+')',fn:()=>{NET.myName=sg.name||NET.myName;NET.srv=sg.srv||defSrv();joinWS(sg.code,{tok:sg.tok,resume:true,spec:!!sg.spec});}});
  return b;
}
function chooseSquad(then){
  const sel=new Set(squad());const max=NET.horde?7:4;if(!NET.horde)while(sel.size>4)sel.delete([...sel].pop());
  const draw=()=>openModal('<h1>Состав отряда</h1><p>Выберите '+(NET.horde?'<b>от 4 до 7</b> героев':'<b>ровно 4</b> героя из 7')+' (выбрано: <b style="color:var(--gold)">'+sel.size+'/'+max+'</b>). '+(NET.horde?'В «Орде» можно взять весь список — врагов станет больше. ':'')+'Отряд один на всю партию; в сети им делятся игроки.</p>'+
    HORDER.map(id=>'<p>'+(sel.has(id)?'★ ':'— ')+'<b>'+HDEF[id].n+'</b>: '+HDEF[id].role+'</p>').join(''),
    [...HORDER.map(id=>({t:(sel.has(id)?'★ ':'')+HDEF[id].n,fn:()=>{if(sel.has(id))sel.delete(id);else if(sel.size<max)sel.add(id);draw();}})),
     {t:'Классический отряд',fn:()=>{sel.clear();SQUAD0.forEach(x=>sel.add(x));draw();}},
     {t:'ГОТОВО ▶',fn:()=>{if(sel.size<4||sel.size>max){log('Нужно выбрать '+(NET.horde?'от 4 до 7':'ровно 4')+' героев.');sfx('trap');return;}NET.squad=HORDER.filter(id=>sel.has(id));NET.soloPick=null;then();}}],true);
  draw();
}
function chooseHeroes(then){
  const sel=NET.soloPick||(NET.soloPick=new Set(squad()));
  const draw=()=>openModal('<h1>Кем вы играете?</h1><p>Отмеченными героями управляете вы, остальными — ИИ-союзники. Они ходят после того, как вы нажмёте «Конец раунда»: лечат, прикрывают, атакуют и следуют за вами.</p>'+
    squad().map(id=>'<p>'+(sel.has(id)?'★ ':'— ')+'<b>'+HDEF[id].n+'</b>: '+HDEF[id].role+' — '+(sel.has(id)?'<span style="color:var(--gold)">вы</span>':'<span style="color:#8ad8ff">ИИ</span>')+'</p>').join(''),
    [...squad().map(id=>({t:(sel.has(id)?'★ ':'')+HDEF[id].n,fn:()=>{if(sel.has(id)){if(sel.size>1)sel.delete(id);}else sel.add(id);draw();}})),
     {t:'Все — мои',fn:()=>{squad().forEach(x=>sel.add(x));draw();}},
     {t:'НАЧАТЬ ▶',fn:()=>{NET.owners={};NET.freeAI=sel.size<squad().length;squad().forEach(id=>{if(sel.has(id))NET.owners[id]='H';});then();}}],true);
  draw();
}
function chooseMode(then){
  const best=loadRecords()[0];
  openModal('<h1>Режим игры</h1><h2>Сюжетный</h2><p>Три локации (на развилках путь выбираете вы), ключи печатей, мини-боссы и финальная битва с Драконом.</p><h2>Сюжетные главы</h2><p>Короткие истории на две локации: свои условия, погода, цели и главный враг.</p><h2>Экспедиция</h2><p>Одна огромная локация без привалов: вдвое больше всего, а у выхода — логово хозяина.</p><h2>Босс-раш</h2><p>Ледяная королева, Гидра, Королева пауков и Дракон подряд. Отряд начинает с 3 уровня, между боями — привал с реликвией.</p><h2>Орда</h2><p>Одна арена и волны врагов, одна за другой. Между волнами — привал с торговцем, каждые 3 волны реликвия, каждые 5 — босс. Рекорд — волна, на которой пал отряд.</p><h2>Бесконечное подземелье</h2><p>Этаж за этажом, всё глубже. Каждый этаж сложнее: у врагов больше здоровья и урона, появляются новые монстры. Каждые 5 этажей — босс. На каждом привале — бесплатная реликвия. Сколько этажей вы продержитесь?</p>'+(best?'<p>Ваш рекорд: <b style="color:var(--gold)">этаж '+best.depth+'</b>, очки '+best.score+'.</p>':''),
    [{t:'Сюжет',fn:()=>{setMode(null);then();}},{t:'Главы',fn:()=>chooseChapter(then)},{t:'Бесконечное подземелье',fn:()=>{setMode('endless');then();}},{t:'Орда',fn:()=>{setMode('horde');then();}},{t:'Босс-раш',fn:()=>{setMode('rush');then();}},{t:'Экспедиция',fn:()=>chooseExped(then)}],true);
}
function chooseDiff(then){
  openModal('<h1>Сложность</h1>'+DORDER.map(k=>'<h2>'+DIFF[k].n+'</h2><p>'+DIFF[k].d+'</p>').join(''),
    DORDER.map(k=>({t:DIFF[k].n,fn:()=>{NET.diff=k;then();}})),true);
}
function showMenu(){
  let nm='',code='';
  try{nm=localStorage.getItem('bd_name')||'';}catch(e){}
  const m=location.hash.match(/room=([A-Za-z0-9]+)/);if(m)code=m[1].toUpperCase();
  const srv=NET.srv||defSrv();
  openModal('<div class="logo"><img src="'+SPR.dragon.toDataURL()+'"></div><h1 class="big">ЧЁРНЫЙ ДРАКОН</h1><p>Кооперативный данж-краулер: отряд из 4 героев (7 классов на выбор) против пяти локаций, мини-боссов и Дракона. Есть бесконечное подземелье, «Орда» и ежедневный забег.</p>'+
   '<h2>Ваше имя</h2><input id="pname" maxlength="14" value="'+esc(nm)+'" placeholder="Игрок">'+
   '<h2>Код комнаты (чтобы присоединиться)</h2>'+(code?'<p>Код подставлен из ссылки — просто нажмите «Войти по коду».</p>':'<p>Чтобы создать свою комнату, код вводить не нужно.</p>')+'<input id="pcode" maxlength="6" value="'+esc(code)+'" placeholder="ABCD">'+
   '<h2>Адрес сервера</h2><input id="psrv" value="'+esc(srv)+'">',
   [...resumeBtns(),{t:'Играть одному',fn:()=>{saveName();NET.daily=null;setMode(null);chooseMode(()=>chooseDiff(()=>choosePacts(()=>chooseSquad(()=>chooseHeroes(()=>{NET.playing=true;newGame();closeModal();if(G.chapter)showChapterIntro();else showIntro();})))));}},
    {t:'Ежедневный забег',fn:showDaily},
    {t:'Создать комнату',fn:()=>{saveName();saveSrv();NET.daily=null;hostWS();}},
    {t:'Войти по коду',fn:()=>{saveName();saveSrv();NET.spec=false;joinWS($('#pcode').value);}},
    {t:'Смотреть игру (зритель)',fn:()=>{saveName();saveSrv();joinWS($('#pcode').value,{spec:true});}},
    {t:'Достижения и дары',fn:showMeta},
    {t:'Справочник',fn:()=>showHelp('rules')}],true);
}

/* --- ввод --- */
function cellAtEvent(e){
  const w=evWorld(e),x=w.x,y=w.y;
  let best=null,bd=1e9;
  for(const row of G.grid)for(const cell of row){const p=hc(cell.c,cell.r);const d=(p.x-x)**2+(p.y-y)**2;if(d<bd){bd=d;best=cell;}}
  return bd<HS*HS?best:null;
}
PX=initPixi();
if(!PX)$('#stage').innerHTML='<div style="padding:30px;text-align:center;color:#ffd23f;font-family:Rubik,sans-serif"><h2>Нужен WebGL</h2><p>Эта игра рисуется через WebGL, а ваш браузер или устройство его не поддерживает. Попробуйте обновить браузер (Chrome, Firefox, Safari, Edge) или включить аппаратное ускорение.</p></div>';
const VIEW=PX?PX.app.view:cv;
VIEW.addEventListener('mousemove',e=>{if(!G.grid)return;const c=cellAtEvent(e);G.hover=c;describe(c);});
VIEW.addEventListener('mouseleave',()=>{G.hover=null;ui();});
function pingAt(e){if(!G.grid||NET.role==='solo')return false;const c=cellAtEvent(e);if(!c)return false;sendSocial({t:'ping',c:c.c,r:c.r});return true;}
VIEW.addEventListener('contextmenu',e=>{e.preventDefault();pingAt(e);});
let LP=0,LPdone=false,DRAGGED=false;
const PTR=new Map();let PINCH=null;
VIEW.addEventListener('pointerdown',e=>{
  try{VIEW.setPointerCapture(e.pointerId);}catch(x){}
  PTR.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY});
  if(PTR.size===1){DRAGGED=false;LPdone=false;clearTimeout(LP);
    if(e.pointerType==='touch'){const q={clientX:e.clientX,clientY:e.clientY};LP=setTimeout(()=>{if(PTR.size===1&&!DRAGGED&&pingAt(q))LPdone=true;},550);}}
  else if(PTR.size===2){clearTimeout(LP);const [a,b]=[...PTR.values()];PINCH={d:Math.hypot(a.x-b.x,a.y-b.y)||1,z:CAM.z};}
});
VIEW.addEventListener('pointermove',e=>{
  const p=PTR.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(PTR.size===2&&PX&&PINCH){const [a,b]=[...PTR.values()];const d=Math.hypot(a.x-b.x,a.y-b.y)||1;setZoomAt(PINCH.z*d/PINCH.d,(a.x+b.x)/2,(a.y+b.y)/2);DRAGGED=true;return;}
  const moved=Math.hypot(e.clientX-p.sx,e.clientY-p.sy);
  if(moved>8)clearTimeout(LP);
  if(PTR.size===1&&PX&&CAM.z>1.001&&(moved>8||DRAGGED)){DRAGGED=true;CAM.cx-=dx/CAM.S;CAM.cy-=dy/CAM.S;CAM.tgt=null;CAM.userT=performance.now();}
});
['pointerup','pointercancel'].forEach(ev=>VIEW.addEventListener(ev,e=>{PTR.delete(e.pointerId);clearTimeout(LP);if(PTR.size<2)PINCH=null;}));
VIEW.addEventListener('wheel',e=>{if(!PX)return;e.preventDefault();setZoomAt(CAM.z*(e.deltaY<0?1.18:1/1.18),e.clientX,e.clientY);},{passive:false});
if(PX){
  $('#zin').addEventListener('click',()=>zoomBtn(1.35));$('#zout').addEventListener('click',()=>zoomBtn(1/1.35));
  $('#zfit').addEventListener('click',()=>{CAM.z=1;CAM.tgt=null;CAM.cx=W/2;CAM.cy=H/2;});$('#zhero').addEventListener('click',focusHero);
  {let on=true;try{on=localStorage.getItem('bd_int')!=='0';}catch(e){}G.showInt=on;$('#zint').style.opacity=on?1:.45;$('#zint').addEventListener('click',()=>{G.showInt=!(G.showInt!==false);NET.showInt=G.showInt;try{localStorage.setItem('bd_int',G.showInt?'1':'0');}catch(e){}$('#zint').style.opacity=G.showInt?1:.45;});}
  if(TOUCH&&window.innerWidth<700){CAM.z=1.7;}
}
VIEW.addEventListener('click',e=>{
  if(DRAGGED){DRAGGED=false;return;}
  if(LPdone){LPdone=false;return;}
  if(e.altKey){pingAt(e);return;}
  if(!G.grid)return;
  const cell=cellAtEvent(e);if(!cell)return;
  G.hover=cell;describe(cell);
  if(G.busy||G.over)return;
  const h=selHero();const k=key(cell.c,cell.r);
  if(G.mode){
    const t=G.mode.valid.get(k);
    if(t){const {ref,h:hh}=G.mode;G.mode=null;act(ref.slot!=null?{c:'item',h:hh.id,slot:ref.slot,tx:cell.c,ty:cell.r}:{c:'abil',h:hh.id,id:ref.id,tx:cell.c,ty:cell.r});ui();}
    else{G.mode=null;ui();}
    return;
  }
  const other=heroAt(cell.c,cell.r);
  if(other&&other!==h){G.sel=other.id;ui();return;}
  if(!h||!h.alive)return;
  if(!mine(h)){log('Этим героем управляет: '+pname(ownerOf(h))+'.');return;}
  if(h.ap<=0)return;
  const hl=G.hl;
  if(hl.atk.has(k)){act({c:'atk',h:h.id,x:cell.c,y:cell.r});return;}
  if(hl.exp.has(k)){act({c:'exp',h:h.id,x:cell.c,y:cell.r});return;}
  if(hl.move.has(k)){act({c:'mv',h:h.id,x:cell.c,y:cell.r});return;}
});
const heroClick=e=>{
  const b=e.target.closest('[data-act]');if(!b||b.disabled)return;
  const h=G.heroes.find(x=>x.id===b.dataset.h);
  if(b.dataset.act==='sel'){if(G.sel!==h.id&&h.alive)voice(vid(h),'sel');G.sel=h.id;G.mode=null;ui();return;}
  if(b.dataset.act==='drop'){e.stopPropagation();act({c:'drop',h:h.id,slot:+b.dataset.slot});return;}
  if(b.dataset.act==='take'){e.stopPropagation();act({c:'take',h:h.id,i:+b.dataset.i});return;}
  if(b.dataset.act==='path'){e.stopPropagation();showPath(h);return;}
  if(b.dataset.act==='pick'){e.stopPropagation();showPick(h);return;}
  e.stopPropagation();
  G.sel=h.id;
  if(G.mode&&G.mode.h===h&&((b.dataset.act==='abil'&&G.mode.spec===ABIL[b.dataset.id])||(b.dataset.act==='item'&&G.mode.ref&&G.mode.ref.slot===+b.dataset.slot))){G.mode=null;ui();return;}
  G.mode=null;
  if(b.dataset.act==='abil')startSpec(h,ABIL[b.dataset.id],{id:b.dataset.id});
  else if(b.dataset.act==='item'){const s=+b.dataset.slot;startSpec(h,ITEMS[h.items[s]].use,{slot:s});}
  ui();
};
$('#heroes').addEventListener('click',heroClick);
$('#dock').addEventListener('click',heroClick);
$('#top').addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  if(b.dataset.act==='end')endClick();
  else if(b.dataset.act==='next')act({c:'next'});
  else if(b.dataset.act==='lobby')showLobby();
  else if(b.dataset.act==='say')showPhrases();
  else if(b.dataset.act==='quit')askQuit();
  else if(b.dataset.act==='rules')showHelp('rules');
  else if(b.dataset.act==='settings')showSettings();
  else if(b.dataset.act==='undo'){if(G.undo)act({c:'undo',h:G.undo.h});}
  else if(b.dataset.act==='mute'){MUTE=!MUTE;saveAudio();renderTop();}
  else if(b.dataset.act==='music'){MUSIC=!MUSIC;saveAudio();musicTick();renderTop();}
});
document.addEventListener('keydown',e=>{
  if($('#modal').style.display==='flex')return;
  if(e.key>='1'&&e.key<='7'){const h=G.heroes[+e.key-1];if(h){G.sel=h.id;G.mode=null;ui();}}
  else if(e.key===' '){e.preventDefault();endClick();}
  else if(e.key==='z'||e.key==='Z'||e.key==='я'||e.key==='Я'){if(G.undo)act({c:'undo',h:G.undo.h});}
  else if(e.key==='Escape'){G.mode=null;ui();}
});
function fit(){
  if(PX){const st=$('#stage');const w=st.clientWidth,h=st.clientHeight;if(w>20&&h>20){CAM.vw=w;CAM.vh=h;PX.app.renderer.resize(w,h);}return;}
  const st=$('#stage');const w=st.clientWidth-4,h=st.clientHeight-4;
  const s=Math.max(0.5,Math.min(w/W,h/H));
  cv.style.width=Math.floor(W*s)+'px';cv.style.height=Math.floor(H*s)+'px';
}
window.addEventListener('resize',fit);
if(window.ResizeObserver)new ResizeObserver(()=>fit()).observe($('#stage'));
if(PX&&document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{for(const k in PX.tp){PX.tp[k].a.forEach(t=>t.destroy());delete PX.tp[k];}});
$('#log').addEventListener('scroll',()=>{$('#log').dataset.touched=1;});
$('#logtg').addEventListener('click',()=>{const l=$('#log');l.classList.toggle('big');$('#logtg').textContent=l.classList.contains('big')?'Свернуть':'Развернуть';l.scrollTop=l.scrollHeight;fit();});

/* старт */
applySet();newGame();fit();loop();showMenu();
