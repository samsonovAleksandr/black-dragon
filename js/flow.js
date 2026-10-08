'use strict';
/* =========================================================
   ПЕРЕХОДЫ, КОНЕЦ ИГРЫ
   ========================================================= */
function checkEnd(){
  if(G.over)return true;
  if(G.horde&&G.horde.state==='fight'&&!G.camp&&G.heroes.some(h=>h.alive)&&!G.monsters.some(m=>m.alive))waveClear();
  if(G.rush&&G.rush.state==='fight'&&!G.camp&&G.loc!==ARENA&&G.heroes.some(h=>h.alive)&&!G.monsters.some(m=>m.alive))rushClear();
  if(G.room&&G.room.opened&&!G.room.won&&G.heroes.some(h=>h.alive&&inRoom(h.c))&&!G.monsters.some(m=>m.alive&&inRoom(m.c)))winRoom();
  if(!G.heroes.some(h=>h.alive&&!h.temp&&!h.pet)){
    G.over=true;G.busy=true;sfx('defeat');document.body.classList.add('lost');hurtFlash();
    if(G.horde){
      const sc=hordeScore();const prev=loadHordeRecords();const isNew=!prev.length||sc>prev[0].score;
      const rec=saveHordeRecord({wave:G.horde.wave,kills:G.stats.kills,score:sc,gold:G.gold||0,date:new Date().toLocaleDateString('ru-RU')});
      openModal('<h1 style="color:#ff8a7a">ОРДА ПРОРВАЛАСЬ</h1><p>Отряд пал на <b>волне '+G.horde.wave+'</b> (отбито волн: '+G.horde.cleared+'). Очки: <b style="color:var(--gold)">'+sc+'</b>'+(isNew?' — <b style="color:#8af58a">НОВЫЙ РЕКОРД!</b>':'')+'</p>'+summaryHtml()+
        '<h2>Лучшие обороны</h2><table class="rec"><tr><th>#</th><th>Волна</th><th>Очки</th><th>Убито</th><th>Дата</th></tr>'+rec.map((r,i)=>'<tr><td>'+(i+1)+'</td><td>'+r.wave+'</td><td>'+r.score+'</td><td>'+r.kills+'</td><td>'+r.date+'</td></tr>').join('')+'</table>',
        [{t:'Новая оборона',fn:()=>{closeModal();newGame();}}]);
    }else if(G.endless){
      const sc=endlessScore();const prev=loadRecords();const isNew=!prev.length||sc>prev[0].score;
      if(G.daily)recordDaily(sc);
      const rec=saveRecord({depth:G.depth,kills:G.stats.kills,score:sc,gold:G.gold||0,relics:(G.relics||[]).length,date:new Date().toLocaleDateString('ru-RU')});
      openModal('<h1 style="color:#ff8a7a">ЭКСПЕДИЦИЯ ЗАВЕРШЕНА</h1><p>Отряд пал на <b>этаже '+G.depth+'</b>. Очки: <b style="color:var(--gold)">'+sc+'</b>'+(isNew?' — <b style="color:#8af58a">НОВЫЙ РЕКОРД!</b>':'')+'</p>'+summaryHtml()+recordsHtml(rec),[{t:'Начать заново',fn:()=>{closeModal();newGame();}}]);
    }else
    openModal('<h1 style="color:#ff8a7a">ПОРАЖЕНИЕ</h1><p>Все герои пали. Тьма поглощает подземелье...</p>'+summaryHtml(),[{t:'Начать заново',fn:()=>{closeModal();newGame();}}]);
    return true;
  }
  return false;
}
function recordsHtml(rec){
  if(!rec||!rec.length)return '';
  return '<h2>Лучшие экспедиции</h2><table class="rec"><tr><th>#</th><th>Этаж</th><th>Очки</th><th>Убито</th><th>Реликвий</th><th>Дата</th></tr>'+rec.map((r,i)=>'<tr><td>'+(i+1)+'</td><td>'+r.depth+'</td><td>'+r.score+'</td><td>'+r.kills+'</td><td>'+(r.relics||0)+'</td><td>'+r.date+'</td></tr>').join('')+'</table>';
}
function summaryHtml(){return summaryHtml0()+chronHtml();}
function summaryHtml0(){
  const hs=G.heroes.map(h=>'<div class="sh"><img src="'+SPR[h.d.spr].toDataURL()+'"'+(h.alive?'':' style="filter:grayscale(1);opacity:.6"')+'><b>'+h.d.n+'</b><span>ур.'+h.lv+(h.alive?'':' · пал')+'</span></div>').join('');
  return '<div class="sum"><span class="chip">Раундов: '+G.round+'</span><span class="chip">Убито врагов: '+G.stats.kills+'</span><span class="chip">Смертей: '+G.stats.deaths+'</span><span class="chip">'+(G.exped?'Экспедиция: '+LOCS[G.exped.theme].n:G.rush?'Боёв: '+G.rush.i+'/'+G.rush.list.length:G.chapter?'Глава: '+CHAPTERS[G.chapter.id].n:G.horde?'Волна: '+G.horde.wave:G.endless?'Этаж: '+G.depth:'Ключей: '+G.keys+'/'+KEYS_NEEDED)+'</span><span class="chip gold"><i class="coin"></i>'+(G.gold||0)+'</span></div><div class="shs">'+hs+'</div>';
}
function victory(){
  if(!G.endless&&!G.horde&&!G.rush){META.s.wins++;saveMeta();ach('victory');if(G.diff==='hard')ach('victory_hard');if(G.stats.deaths===0)ach('flawless');if(G.heroes.map(h=>h.id).join()!==SQUAD0.join())ach('squad');}
  G.over=true;G.busy=true;sfx('victory');fxQ({burst:'confetti',c:0,r:0});setTimeout(()=>fxQ({burst:'confetti',c:0,r:0}),1400);
  const alive=G.heroes.filter(h=>h.alive).length;
  if(G.rush){ach('rush');META.rush=Math.max(META.rush||0,1);saveMeta();}
  openModal('<h1>ПОБЕДА!</h1><p>'+(G.rush?'Босс-раш пройден: все мини-боссы и Дракон повержены подряд!':'Дракон повержен, королевство спасено.')+' Выжило героев: <b>'+alive+'/'+G.heroes.filter(h=>!h.temp&&!h.pet).length+'</b>.</p>'+summaryHtml(),[{t:'Сыграть ещё раз',fn:()=>{closeModal();newGame();}}]);
}
function openCamp(out){
  if(G.daily){withSeed(G.daily+'|camp|'+G.depth,()=>openCamp0(out));return;}
  openCamp0(out);
}
function openCamp0(out){
  const pool=shuffle([...GEN1,...GEN2,'potion','elixir','feather','ringhp','boots'].filter((x,i,a)=>a.indexOf(x)===i));
  const cls=shuffle((G.loc>=2?CLASS2:CLASS1).filter(inSquad)).slice(0,2);
  const stock=['potion',...pool.filter(x=>x!=='potion').slice(0,4),...cls];
  G.camp={out,stock,rested:false,relics:G.relicPending>0?pickRelics(3):null};G.mode=null;sfx('travel');log('=== Привал: торговец раскладывает товар ===');ui();
}
const REST_COST=12;
function campCmd(cmd,who){
  const C=G.camp;if(!C)return;
  if(cmd.c==='campgo'){if(who!=='H')return;G.camp=null;NET.campHtml='';closeModal();if(G.rush){G.camp=null;NET.campHtml='';closeModal();startRushFight();return;}
  if(G.chapter){G.camp=null;NET.campHtml='';closeModal();const nx=nextOpts()[0];G.chapter.step++;startLoc(nx);return;}
  if(G.horde){G.camp=null;NET.campHtml='';closeModal();G.monsters=G.monsters.filter(m=>m.alive);armTimer();G.heroes.forEach(h=>{h.block=h.guard=h.taunt=h.haste=false;});nextWave();return;}
  if(G.endless){G.depth++;startLoc(themeFor(G.depth));}else{const opts=nextOpts();startLoc(opts.includes(cmd.n)?cmd.n:opts[0]);}return;}
  if(cmd.c==='relic'){if(who!=='H'||!C.relics)return;const id=C.relics[cmd.i];if(!id)return;G.relicPending=Math.max(0,(G.relicPending||0)-1);giveRelic(id);C.relics=G.relicPending>0?pickRelics(3):null;ui();return;}
  if(cmd.c==='rest'){if(C.rested||G.gold<REST_COST)return;G.gold-=REST_COST;C.rested=true;G.heroes.forEach(h=>{if(h.alive)h.hp=st(h,'maxhp');h.poison=0;h.burn=0;h.bleed=0;});sfx('heal');log(pname(who)+' оплачивает отдых у костра: все герои полностью здоровы.');ui();return;}
  const h=G.heroes.find(x=>x.id===cmd.h);if(!h||(ownerOf(h)!==who&&!(isAI(h)&&who==='H')))return;
  if(cmd.c==='buy'){const id=C.stock[cmd.i];if(!id||!canUse(h,id)||h.items.length>=3||G.gold<priceOf(id))return;
    G.gold-=priceOf(id);C.stock.splice(cmd.i,1);takeItem(h,id);log(h.d.n+' покупает: '+ITEMS[id].n+' (−'+priceOf(id)+' з).');ui();return;}
  if(cmd.c==='purify'){const id=h.items[cmd.slot];if(!id||!isCursed(id)||G.gold<PURIFY_COST)return;G.gold-=PURIFY_COST;const np=ITEMS[id].pure;h.items[cmd.slot]=np;fixHp(h);sfx('heal');log(h.d.n+': проклятие снято! «'+ITEMS[id].n+'» → «'+ITEMS[np].n+'» (−'+PURIFY_COST+' з).');ui();return;}
  if(cmd.c==='sell'){const id=h.items[cmd.slot];if(!id||isCursed(id))return;const g=Math.floor(priceOf(id)/2);
    h.items.splice(cmd.slot,1);fixHp(h);G.gold+=g;sfx('item');log(h.d.n+' продаёт: '+ITEMS[id].n+' (+'+g+' з).');ui();return;}
}
function renderCamp(){
  const C=G.camp;
  if(!C){if(NET.campHtml){NET.campHtml='';closeModal();}return;}
  const isHost=NET.role!=='guest';
  const my=G.heroes.filter(h=>(mine(h)||(isAI(h)&&NET.role!=='guest'))&&h.alive);
  let html='<h1>Привал</h1><p>'+C.out.join('<br>')+'</p><h2>Золото отряда: <span style="color:var(--gold)">'+G.gold+'</span></h2>';
  if(C.relics&&C.relics.length){html+='<h2>Выберите реликвию</h2><p>Бесплатный дар на привале — навсегда, на весь забег.</p><div class="shop">'+C.relics.map((id,i)=>'<div class="item"><div class="ih"><img class="ic" src="'+RICON[id]+'"><div><b>'+RELICS[id].n+'</b><div class="ty">Реликвия</div></div></div><div class="ds">'+RELICS[id].d+'</div><div class="row">'+(isHost?'<button class="btn primary" data-camp="relic" data-i="'+i+'">Взять</button>':'<span class="st">Выбирает хост</span>')+'</div></div>').join('')+'</div>';}
  html+='<h2>Торговец</h2><div class="shop">'+C.stock.map((id,i)=>{const it=ITEMS[id];
    const bt=my.filter(h=>canUse(h,id)).map(h=>{const dis=h.items.length>=3||G.gold<priceOf(id);return '<button class="btn" data-camp="buy" data-h="'+h.id+'" data-i="'+i+'"'+(dis?' disabled':'')+'>→ '+h.d.n+'</button>';}).join('');
    return '<div class="item"><div class="ih"><img class="ic" src="'+ICON[id]+'"><div><b>'+it.n+'</b><div class="ty">'+it.type+'</div></div><span class="chip gold pr"><i class="coin"></i>'+priceOf(id)+'</span></div><div class="ds">'+it.d+'</div><div class="row">'+(bt||'<span class="st">не для ваших героев</span>')+'</div></div>';}).join('')+'</div>';
  const curses=my.flatMap(h=>h.items.map((id,s)=>isCursed(id)?'<button class="btn" data-camp="purify" data-h="'+h.id+'" data-slot="'+s+'"'+(G.gold<PURIFY_COST?' disabled':'')+'>'+h.d.n+': очистить «'+ITEMS[id].n+'» → «'+ITEMS[ITEMS[id].pure].n+'» ('+PURIFY_COST+' з)</button>':'')).filter(Boolean);
  if(curses.length)html+='<h2>Снять проклятие</h2><p>Очищенный предмет сохраняет силу, но теряет проклятие.</p><div class="row">'+curses.join('')+'</div>';
  const sells=my.flatMap(h=>h.items.filter(id=>!isCursed(id)).length?h.items.map((id,s)=>isCursed(id)?'':'<button class="btn" data-camp="sell" data-h="'+h.id+'" data-slot="'+s+'">'+h.d.n+': '+ITEMS[id].n+' +'+Math.floor(priceOf(id)/2)+' з</button>').filter(Boolean):[]);
  if(sells.length)html+='<h2>Продать</h2><div class="row">'+sells.join('')+'</div>';
  html+='<h2>Костёр</h2><p>'+(C.rested?'Отряд уже отдохнул.':'Полное лечение всех героев и снятие ядов — '+REST_COST+' з.')+'</p>';
  html+='<div class="row">'+(C.rested?'':'<button class="btn" data-camp="rest"'+(G.gold<REST_COST?' disabled':'')+'>Отдохнуть ('+REST_COST+' з)</button>')+
    (isHost?((G.endless||G.horde||G.rush)?[0]:nextOpts()).map(n=>'<button class="btn act" data-camp="campgo" data-n="'+n+'">'+(G.rush?'Следующий бой: '+(G.rush.list[G.rush.i]==='dragon'?'Дракон':MON[G.rush.list[G.rush.i]].n)+' ▶':G.horde?'Следующая волна ▶':!G.endless&&nextOpts().length>1?'Идти: '+LOCS[n].n+' ▶':'Идти дальше ▶')+'</button>').join(''):'<span class="st">Дальше команду ведёт хост.</span>')+'</div>';
  html+=(G.chapter&&CHAPTERS[G.chapter.id].mid&&G.chapter.step===0?'<p style="color:#d8b0ff"><i>'+CHAPTERS[G.chapter.id].mid+'</i></p>':'')+(G.rush?'<p style="color:var(--gold)">Дальше — бой '+(G.rush.i+1)+' из '+G.rush.list.length+'.</p>':G.horde?'<p style="color:var(--gold)">Дальше — волна '+(G.horde.wave+1)+((G.horde.wave+1)%5===0?' — БОСС!':'')+'. Враги крепче на '+Math.round(.09*G.horde.wave*100)+'%.</p>':G.endless?'<p style="color:var(--gold)">Дальше — этаж '+(G.depth+1)+(isBossFloor(G.depth+1)?' — БОСС!':'')+'. Враги сильнее на '+Math.round((1+.11*G.depth-1)*100)+'%.</p>':nextOpts()[0]===ARENA?'<p style="color:var(--gold)">Впереди — логово Дракона.</p>':nextOpts().length>1?'<p style="color:var(--gold)">Развилка пути: '+nextOpts().map(n=>'<b>'+LOCS[n].n+'</b> — '+LOC_SUB[n]).join('; ')+'. Выбирает хост.</p>':'');
  if(html===NET.campHtml&&$('#modal').style.display==='flex')return;
  NET.campHtml=html;openModal(html,[],true);
  $('#mbox').querySelectorAll('[data-camp]').forEach(b=>b.onclick=()=>{sfx('click');const d=b.dataset;
    act(d.camp==='relic'?{c:'relic',i:+d.i}:d.camp==='buy'?{c:'buy',h:d.h,i:+d.i}:d.camp==='sell'?{c:'sell',h:d.h,slot:+d.slot}:d.camp==='purify'?{c:'purify',h:d.h,slot:+d.slot}:{c:d.camp,n:d.n!=null?+d.n:undefined});});
}
function goNext(){
  if(G.busy||G.over||!atExit())return;
  if(G.exped){if(escortOn()&&npcNearExit())objProgress('escort');expedWin();return;}
  if(escortOn()&&G.npc.freed&&!G.mini){
    if(npcNearExit()){objProgress('escort');const it=pick(['amulet','trollheart','vampring','feather','elixir']);const hh=G.heroes.find(h=>h.alive&&canUse(h,it))||G.heroes.find(h=>h.alive);if(hh)giveItem(hh,it,cellOf(hh.c,hh.r));log('Спасённый пленник благодарит отряд и дарит: '+ITEMS[it].n+'.');}
    else if(!G.escAsk){G.escAsk=1;openModal('<h1>Пленник отстал</h1><p>Пленник не у выхода. Уйти без него? Цель «Спасти пленника» будет провалена.</p>',[{t:'Уйти без него',fn:()=>{closeModal();escortFail();goNext();}},{t:'Подождать',fn:()=>{closeModal();G.escAsk=0;}}]);return;}
  }
  G.escAsk=0;
  const go=()=>{ach(({1:'forest',5:'swamp',6:'poison'})[G.loc]||'forest');objProgress('exit');G.relicPending=(G.relicPending||0)+1+(pact('iron')?1:0);const out=campRest();openCamp(out);};
  if(nextOpts()[0]===ARENA&&G.keys<KEYS_NEEDED){
    const s=KEYS_NEEDED-G.keys;
    openModal('<h1>Печати не сломаны!</h1><p>У вас '+G.keys+' из '+KEYS_NEEDED+' ключей. Дракон сохраняет '+s+' печат'+(s===1?'ь':'и')+': +'+(SEAL_HP*s)+' HP'+(s>=2?' и +'+Math.floor(s/2)+' к урону':'')+'.</p><p>Возврата на прошлую локацию нет. Войти сейчас?</p>',
      [{t:'Войти к Дракону',fn:()=>{closeModal();go();}},{t:'Ещё поищем',fn:closeModal}]);
  }else go();
}

/* =========================================================
   МОДАЛЬНЫЕ ОКНА
   ========================================================= */
function openModal(html,btns,local){
  const b=$('#mbox');b.classList.remove('wide');b.innerHTML=html+'<div class="row"></div>';
  const row=b.querySelector('.row');
  (btns||[]).forEach(x=>{const e=document.createElement('button');e.className='btn';e.textContent=x.t;e.onclick=ev=>{sfx('click');x.fn(ev);};row.appendChild(e);});
  $('#modal').style.display='flex';
  if(!local&&NET.role==='host'&&NET.started){NET.gmodal=true;bc({t:'modal',html,labels:(btns||[]).map(x=>x.t)});}
}
function closeModal(){
  $('#modal').style.display='none';NET.lobby=false;
  if(NET.gmodal){NET.gmodal=false;bc({t:'mclose'});}
}
function endClick(){
  if(!SET.confirm||G.busy||G.over||G.camp||(G.ready&&G.ready[NET.me])){act({c:'end'});return;}
  const idle=G.heroes.filter(h=>h.alive&&mine(h)&&h.ap>0);
  if(!idle.length){act({c:'end'});return;}
  openModal('<h1>Завершить раунд?</h1><p>У героев остались очки действия: '+idle.map(h=>'<b>'+h.d.n+'</b> ('+h.ap+')').join(', ')+'.</p>',
    [{t:'Всё равно завершить',fn:()=>{closeModal();act({c:'end'});}},{t:'Продолжить ход',fn:closeModal}],true);
}
function showSettings(){
  const sp=[[1,'обычная'],[.5,'быстрая'],[.2,'очень быстрая']];
  const cur=Math.max(0,sp.findIndex(x=>x[0]===SET.speed));
  const oo=v=>v?'вкл':'выкл';
  openModal('<h1>Настройки</h1><p style="color:var(--mid)">Сохраняются в этом браузере и действуют только у вас.</p>'+
    '<h2>Громкость: <span id="volv">'+SET.vol+'%</span></h2><input type="range" id="vol" min="0" max="100" step="5" value="'+SET.vol+'">'+
    '<p>Скорость анимаций — ходы врагов и ИИ быстрее. Крупный интерфейс — увеличенные шрифты. Меньше эффектов — без тряски экрана, вспышек и частиц. Палитра для дальтоников — полоски здоровья синие/оранжевые/пурпурные. Подтверждение — спрашивать, если у героя остались очки действия. Чёткие пиксели — все пиксели одинакового размера при любом масштабе. Свет и туман — освещение локаций (на слабом телефоне можно выключить).</p>',
    [{t:'Скорость: '+sp[cur][1],fn:()=>{SET.speed=sp[(cur+1)%sp.length][0];saveSet();showSettings();}},
     {t:'Крупный интерфейс: '+oo(SET.big),fn:()=>{SET.big=!SET.big;saveSet();applySet();fit();showSettings();}},
     {t:'Меньше эффектов: '+oo(SET.calm),fn:()=>{SET.calm=!SET.calm;saveSet();applySet();showSettings();}},
     {t:'Палитра для дальтоников: '+oo(SET.cb),fn:()=>{SET.cb=!SET.cb;saveSet();applySet();ui();showSettings();}},
     {t:'Голоса героев: '+oo(SET.voice!==false),fn:()=>{SET.voice=!(SET.voice!==false);saveSet();if(SET.voice)voice('sword','sel');showSettings();}},
     {t:'Чёткие пиксели: '+oo(SET.crisp!==false),fn:()=>{SET.crisp=!(SET.crisp!==false);saveSet();showSettings();}},
     {t:'Свет и туман: '+oo(SET.light!==false),fn:()=>{SET.light=!(SET.light!==false);saveSet();showSettings();}},
     {t:'Подтверждать конец раунда: '+oo(SET.confirm),fn:()=>{SET.confirm=!SET.confirm;saveSet();showSettings();}},
     {t:'Готово',fn:closeModal}],true);
  const v=$('#vol');if(v)v.oninput=()=>{SET.vol=+v.value;$('#volv').textContent=SET.vol+'%';saveSet();applySet();};
}
