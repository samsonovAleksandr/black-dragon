'use strict';
/* =========================================================
   ИНТЕРФЕЙС
   ========================================================= */
function renderTop(){
  const L=LOCS[G.loc]||{n:''};
  const bossPct=G.dragon&&G.dragon.alive?Math.max(0,Math.round(100*G.dragon.hp/G.dragon.max)):0;
  const bossH=G.dragon&&G.dragon.alive?'<span class="boss"><b class="pf" style="font-size:8px">ДРАКОН</b><span class="bbar"><i style="width:'+bossPct+'%"></i></span><span class="pf" style="font-size:7px">'+G.dragon.hp+'/'+G.dragon.max+'</span></span>':'';
  const keysH=G.exped?'<span class="chip" style="color:#9fe0ff;border-color:#24566b" data-tn="Экспедиция" data-tip="Пройдите весь край и сразите хозяина логова у выхода. Привалов нет.">Экспедиция · '+(G.exped.bossDead?'хозяин повержен':'хозяин: '+MON[G.exped.boss].n)+'</span>':G.rush?'<span class="chip" style="color:#ffb0a0;border-color:#7a2a2a">Босс-раш · бой '+Math.min(G.rush.list.length,G.rush.i+1)+'/'+G.rush.list.length+'</span>':G.chapter?'<span class="chip" style="color:#d8b0ff;border-color:#5f2d8f" data-tn="'+esc(CHAPTERS[G.chapter.id].n)+'" data-tip="'+esc(CHAPTERS[G.chapter.id].intro)+'">Глава: '+esc(CHAPTERS[G.chapter.id].n)+' · '+(G.chapter.step+1)+'/'+CHAPTERS[G.chapter.id].route.length+'</span>':G.horde?'<span class="chip" data-tn="Орда" data-tip="Отбивайте волны врагов одну за другой. Каждые 5 волн — босс. Между волнами — привал с торговцем." style="color:#ffb0a0;border-color:#7a2a2a">Волна '+G.horde.wave+' · врагов '+G.monsters.filter(m=>m.alive).length+'</span>':G.endless?'<span class="chip" data-tn="Бесконечное подземелье" data-tip="Каждый этаж сложнее предыдущего. Каждые 5 этажей — босс. Враги: +'+Math.round((DS().hp-1)*100)+'% HP." style="color:#ffb0a0;border-color:#7a2a2a">Этаж '+G.depth+(isBossFloor(G.depth)?' · БОСС':'')+'</span>':'<span class="keys"><span class="lb">КЛЮЧИ</span>'+Array.from({length:KEYS_NEEDED},(_,i)=>'<i class="gem'+(i<G.keys?' on':'')+'"></i>').join('')+'</span>';
  const wH=G.weather&&WEATHER[G.weather]?'<span class="chip" data-tn="'+WEATHER[G.weather].n+'" data-tip="'+esc(WEATHER[G.weather].d)+'">Погода: '+WEATHER[G.weather].n+'</span>':'';
  const pactH=wH+((G.pacts&&G.pacts.length)?'<span class="chip" style="color:#ff9a8a;border-color:#7a2a2a" data-tn="Договоры" data-tip="'+esc(G.pacts.map(k=>PACTS[k].n+': '+PACTS[k].d).join(' '))+'">✒ '+G.pacts.length+'</span>':'');
  const relH=pactH+((G.relics&&G.relics.length)?'<span class="relics">'+G.relics.map(id=>'<img class="ric" src="'+RICON[id]+'" data-tn="'+esc(RELICS[id].n)+'" data-tc="Реликвия" data-tip="'+esc(RELICS[id].d)+'">').join('')+'</span>':'');
  const ot=objText();const objH=ot?'<span class="chip obj '+ot.st+'" data-tn="Цель: '+esc(ot.n)+'" data-tip="'+esc(ot.d)+' Награда: золото и реликвия.">'+(ot.st==='ok'?'✓ ':ot.st==='bad'?'✗ ':'◎ ')+esc(ot.n)+(ot.prog?' '+ot.prog:'')+'</span>':'';
  const uh=G.undo&&G.heroes.find(h=>h.id===G.undo.h);const undoH=uh&&uh.alive&&mine(uh)?'<button class="btn" data-act="undo" data-tip="Вернуть героя на прежнее место и вернуть потраченные очки действия. Работает, пока ход ничем не отозвался (бой, находка, ловушка).">↶ Отмена хода</button>':'';
  const roomH=(G.room&&G.room.opened&&!G.room.won)?'<span class="chip" data-tn="'+esc(G.room.n)+'" data-tip="Подземелье справа на карте. Враги внутри: '+G.monsters.filter(m=>m.alive&&inRoom(m.c)).length+'. Героев внутри: '+G.heroes.filter(h=>h.alive&&inRoom(h.c)).length+'." style="color:#d8b0ff;border-color:#5f2d8f">⛏ '+esc(G.room.n)+' · врагов '+G.monsters.filter(m=>m.alive&&inRoom(m.c)).length+'</span>':'';
  const tleft=G.deadline&&!G.busy&&!G.camp&&!G.over?Math.max(0,Math.ceil((G.deadline-Date.now())/1000)):-1;
  const tmH=tleft>=0?'<span class="chip" id="tmr" data-tip="Время до автоматического конца раунда" style="color:#9fe0ff;border-color:#24566b">⏱ '+tleft+' с</span>':'';
  const exH=hasExit()?(atExit()?'<button class="btn act" data-act="next">Дальше ▶</button>':'<span class="chip">Выход '+G.heroes.filter(h=>h.alive&&!h.temp&&!h.pet&&cellOf(h.c,h.r).zone==='exit').length+'/'+G.heroes.filter(h=>h.alive&&!h.temp&&!h.pet).length+'</span>'):'';
  $('#top').innerHTML='<span class="loc">'+L.n+'</span><span class="chip">Раунд '+G.round+'</span><span class="chip gold"><i class="coin"></i>'+(G.gold||0)+'</span>'+keysH+objH+relH+bossH+'<span class="sp"></span>'+tmH+roomH+undoH+exH+
   netTop()+
   '<button class="btn" data-act="quit">Выход</button><button class="btn" data-act="rules">?</button><button class="btn" data-act="settings" data-tip="Скорость анимаций, размер интерфейса, громкость, палитра для дальтоников, меньше эффектов">⚙</button><button class="btn" data-act="music">'+(MUSIC?'♪ Музыка':'♪ выкл')+'</button><button class="btn" data-act="mute">'+(MUTE?'🔇 выкл':'🔊 Звук')+'</button>';
}
let LOGHTML='';
function renderLog(){
  const el=$('#log');const cls=t=>/^===/.test(t)?'h':/повержен|погибает|ПАЛ|умирает|промах/i.test(t)?'k':/лечит|восстанавл|возвращается к жизни/i.test(t)?'g':/уровня|КЛЮЧ|золот|предмет|Найден|подбирает|покупает/i.test(t)?'y':/призывает|заморож|Ледян|магия|колдует/i.test(t)?'m':'';
  const html=G.log.slice(-200).map(s=>'<div class="'+cls(s)+'">'+s+'</div>').join('');
  if(html===LOGHTML)return;LOGHTML=html;
  const atEnd=el.scrollTop+el.clientHeight>=el.scrollHeight-8;
  el.innerHTML=html;if(atEnd||!el.dataset.touched)el.scrollTop=el.scrollHeight;
}
function lvText(g){
  if(!g)return '';const p=[];
  if(g.hp)p.push('+'+g.hp+' HP');if(g.atk)p.push('+'+g.atk+' АТК');if(g.def)p.push('+'+g.def+' ЗАЩ');if(g.rng)p.push('+'+g.rng+' дальн.');if(g.ap)p.push('+'+g.ap+' ОД');
  if(g.ab)p.push('умение «'+g.ab.map(a=>ABIL[a].n).join('», «')+'»');
  if(g.pick)p.push('выбор: «'+g.pick[0].n+'» или «'+g.pick[1].n+'»');
  return p.join(', ');
}
function showPath(h){
  let html='<h1>Путь героя: '+h.d.n+'</h1><p>'+h.d.role+'</p><p style="color:var(--mid)">Опыт дают: удары по врагу, которого затем убили (убийце +1), лечение союзников, защита Танком, святилища.</p><ul>';
  html+='<li>Ур.1: '+h.d.abil.map(a=>'«'+ABIL[a].n+'» — '+ABIL[a].d).join('; ')+'</li>';
  for(let l=2;l<=5;l++){const g=h.d.lv[l];const got=l<=h.lv;const need=XPT[l-2];
    let t='<li style="'+(got?'':'color:var(--mid)')+'"><b>Ур.'+l+'</b> ('+need+' опыта)'+(got?' ✓':'')+': '+lvText(Object.assign({},g,{pick:null,ab:null}));
    if(g.ab)t+=(lvText(Object.assign({},g,{pick:null,ab:null}))?', ':'')+g.ab.map(a=>'умение «'+ABIL[a].n+'» — '+ABIL[a].d).join('; ');
    if(g.pick)t+='<br>Выбор одного из двух:'+g.pick.map((o,i)=>'<br>'+(perkOf(h,l)===o?'★ ':'— ')+'<b>'+o.n+'</b>: '+o.d).join('');
    html+=t+'</li>';}
  openModal(html+'</ul>',[{t:'Закрыть',fn:closeModal}],true);
}
function showPick(h){
  const l=pendingPick(h);if(!l){showPath(h);return;}
  const g=h.d.lv[l];
  openModal('<h1>'+h.d.n+': уровень '+l+'</h1><p>Выберите одно улучшение. Выбор постоянный.</p>'+
    g.pick.map(o=>'<h2>'+o.n+'</h2><p>'+o.d+'</p>').join(''),
    [...g.pick.map((o,i)=>({t:'Взять «'+o.n+'»',fn:()=>{closeModal();act({c:'perk',h:h.id,lv:l,o:i});}})),{t:'Позже',fn:closeModal}],true);
}
const PROMPTED={};
function autoPick(){
  if(G.busy||G.over||$('#modal').style.display==='flex')return;
  if(NET.role!=='solo'&&!NET.started)return;
  const h=G.heroes.find(x=>x.alive&&mine(x)&&pendingPick(x)&&!PROMPTED[x.id+':'+pendingPick(x)]);
  if(h){PROMPTED[h.id+':'+pendingPick(h)]=1;G.sel=h.id;showPick(h);}
}
function renderHeroes(){
  const el=$('#heroes');
  const dh=(()=>{const sel=G.heroes.find(x=>x.id===G.sel);return (sel&&sel.alive&&mine(sel))?sel:G.heroes.find(x=>x.alive&&mine(x));})();
  const dockOn=!!dh&&window.matchMedia('(max-width:900px)').matches;
  const card=(h,i)=>{
    const mx=st(h,'maxhp'),nx=h.lv<5?XPT[h.lv-1]:null;const fr=Math.max(0,h.hp)/mx;
    let gems='';const apMax=st(h,'ap');for(let a=0;a<Math.max(apMax,h.ap);a++)gems+='<i class="g'+(a<h.ap?' on':'')+'"></i>';
    const abils=habils(h).map(id=>{const a=ABIL[id];const dis=!h.alive||G.busy||!mine(h)||h.ap<a.cost||(a.once&&h.reviveUsed);const act=G.mode&&G.mode.h===h&&G.mode.spec===a;
      return '<button class="btn ab'+(act?' act':'')+'" data-tip="'+esc(a.d)+'" data-tn="'+esc(a.n)+'" data-tc="'+a.cost+' ОД" data-act="abil" data-h="'+h.id+'" data-id="'+id+'" '+(dis?'disabled':'')+'><img src="'+(ICONA[id]||'')+'"><span>'+a.n+'</span><em>'+a.cost+'</em></button>';}).join('');
    const items=[0,1,2].map(s=>{const id=h.items[s];if(!id)return '<button class="btn slot empty">— пусто —</button>';
      const it=ITEMS[id];const usable=!!it.use;const dis=!usable||!h.alive||G.busy||!mine(h)||h.ap<it.use.cost;
      const act=G.mode&&G.mode.h===h&&G.mode.ref&&G.mode.ref.slot===s;
      return '<span class="slotw"><button class="btn slot'+(act?' act':'')+'" data-tip="'+esc(it.d)+'" data-tn="'+esc(it.n)+'" data-tc="'+esc(it.type)+'" data-act="item" data-h="'+h.id+'" data-slot="'+s+'" '+(usable&&!dis?'':'disabled style="opacity:1;'+(usable?'opacity:.35':'cursor:help')+'"')+'><img class="ic" src="'+ICON[id]+'">'+it.n+'</button>'+
        (mine(h)&&h.alive&&!G.busy&&!isCursed(id)?'<button class="btn x" data-tip="Выбросить на землю (0 ОД)" data-act="drop" data-h="'+h.id+'" data-slot="'+s+'">✕</button>':'')+'</span>';}).join('');
    const here=cellOf(h.c,h.r);
    const takes=h.alive&&mine(h)&&!G.busy&&here&&here.loot?here.loot.map((id,i)=>canUse(h,id)?'<button class="btn" data-act="take" data-h="'+h.id+'" data-i="'+i+'"'+(h.items.length>=3?' disabled data-tip="Нет места"':'')+'>Подобрать: '+ITEMS[id].n+'</button>':'').join(''):'';
    const notes=[];for(let l=2;l<=h.lv;l++){const o=perkOf(h,l);if(o&&!o.ab)notes.push('★ '+o.n);}
    const pend=pendingPick(h);
    const nextTxt=h.lv<5?'<div class="next">Ур.'+(h.lv+1)+': '+lvText(h.d.lv[h.lv+1])+'</div>':'';
    const sts=[[h.poison,'ЯД'],[h.burn,'ГОРИТ'],[h.bleed,'КРОВЬ'],[h.chill,'ХОЛОД'],[h.block,'БЛОК'],[h.bless>0,'БЛАГОСЛОВЕН'],[guardOn(h)&&h.id==='tank',h.guard?'СТРАЖА':'СТРАЖА']].filter(a=>a[0]).map(a=>'<span class="chip st-bad" style="'+(a[1]==='БЛОК'||a[1]==='СТРАЖА'||a[1]==='БЛАГОСЛОВЕН'?'color:#9fe0ff;border-color:#24566b;background:#0e1e2a':'')+'">'+a[1]+'</span>').join('');
    return '<div class="card cls-'+h.id+(h.id===G.sel?' sel':'')+(h.alive?'':' dead')+'" data-act="sel" data-h="'+h.id+'">'+
     '<div class="hd"><div class="pt"><img src="'+SPR[h.d.spr].toDataURL()+'"><span class="lv">'+h.lv+'</span></div><div class="nm"><b>'+(i+1)+'. '+h.d.n+'</b>'+(h.temp?' <span class="chip" style="color:#9fe0ff;border-color:#24566b">союзник</span>':'')+(h.pet?' <span class="chip" style="color:#8af58a;border-color:#2c7d3a">питомец</span>':'')+(h.alive?'':' <span class="chip st-bad">ПАЛ</span>')+ownTag(h).replace('[ИИ]','<span class="tagai">ИИ</span>')+'<div class="role">'+h.d.role+'</div></div></div>'+
     '<div class="hp"><i class="'+(fr>.5?'':fr>.25?'y':'r')+'" style="width:'+(100*fr)+'%"></i><span>'+Math.max(0,h.hp)+' / '+mx+'</span></div>'+
     '<div class="xpb"><i style="width:'+(nx?Math.min(100,100*h.xp/nx):100)+'%"></i></div><div class="xpl"><span>Опыт</span><span>'+h.xp+(nx?' / '+nx:' (макс.)')+'</span></div>'+
     '<div class="chips"><span class="chip atk">АТК '+st(h,'atk')+'</span><span class="chip def">ЗАЩ '+st(h,'def')+'</span><span class="chip">ДАЛЬН '+st(h,'rng')+'</span><span class="chip">ХОД '+st(h,'spd')+'</span>'+sts+'</div>'+
     '<div class="apline">ОД '+gems+'</div>'+
     nextTxt+(notes.length?'<div class="perks">'+notes.join('; ')+'</div>':'')+
     '<div class="row">'+(pend&&mine(h)&&h.alive?'<button class="btn pick" data-act="pick" data-h="'+h.id+'">★ Выбрать улучшение (ур.'+pend+')</button>':'')+
     (pend&&!mine(h)?'<span class="st" style="color:var(--gold)">ждёт выбора улучшения</span>':'')+
     '<button class="btn" data-act="path" data-h="'+h.id+'">Путь героя</button></div>'+
     '<div class="row">'+abils+'</div><div class="row">'+items+'</div>'+(takes?'<div class="row">'+takes+'</div>':'')+'</div>';
  };
  el.innerHTML=G.heroes.map((h,i)=>card(h,i)).join('');
  const dk=$('#dock');
  if(dockOn){
    dk.innerHTML=card(dh,G.heroes.indexOf(dh));
    const idx=G.heroes.indexOf(dh);const lc=el.children[idx];if(lc)lc.classList.add('indock');
    document.body.style.paddingBottom=dk.offsetHeight+'px';
  }else{dk.innerHTML='';document.body.style.paddingBottom='';}
}
/* --- подсказки --- */
const TIP=$('#tip');
document.addEventListener('mouseover',e=>{
  const t=e.target.closest&&e.target.closest('[data-tip]');
  if(!t){TIP.style.display='none';return;}
  TIP.innerHTML=(t.dataset.tn?'<b>'+t.dataset.tn+'</b>':'')+(t.dataset.tc?'<span class="cost">'+t.dataset.tc+'</span><br>':'')+t.dataset.tip;
  TIP.style.display='block';const r=t.getBoundingClientRect(),w=TIP.offsetWidth,h=TIP.offsetHeight;
  let x=Math.min(innerWidth-w-8,Math.max(8,r.left)),y=r.top-h-6;if(y<8)y=r.bottom+6;
  TIP.style.left=x+'px';TIP.style.top=y+'px';
});
document.addEventListener('mouseleave',()=>{TIP.style.display='none';},true);
document.addEventListener('scroll',()=>{TIP.style.display='none';},true);
document.addEventListener('click',()=>{TIP.style.display='none';},true);
function showBanner(h,p){const b=$('#banner');b.querySelector('h1').textContent=h;b.querySelector('p').textContent=p||'';b.classList.remove('show');void b.offsetWidth;b.classList.add('show');}
function hurtFlash(){const e=$('#hurtflash');e.classList.remove('on');void e.offsetWidth;e.classList.add('on');}
function ui(){try{checkAch();}catch(e){}
  try{fogUpdate();}catch(e){}
  if(NET.role!=='guest'&&G.grid&&G.vault){try{updateDoors();}catch(e){}}
  if(NET.role!=='guest'&&G.monsters&&!G.over&&!G.camp){try{computeIntents();}catch(e){console.warn('intents',e);}}
  schedSnap();saveSoon();musicTick();renderCamp();renderTop();renderHeroes();renderLog();hlCompute();setTimeout(autoPick,0);
  const inf=$('#info');
  if(G.mode)inf.innerHTML='<b>'+G.mode.spec.n+'</b>: выберите цель на карте (Esc — отмена).<br><span style="color:var(--mid)">'+G.mode.spec.d+'</span>';
  else if(!G.hover)inf.innerHTML='<span style="color:var(--mid)">'+(TOUCH?'Касание по гексу — идти, по «?» рядом — открыть, по врагу — атаковать. Долгое касание — метка для команды.':'Наведите на клетку. Клик по гексу — идти, по «?» рядом — открыть, по врагу — атаковать. Правый клик — метка для команды.')+'</span>';
}
const statusTxt=u=>{const a=[];if(u.burn)a.push('горит');if(u.bleed)a.push('кровотечение');if(u.poison)a.push('яд');if(u.chill)a.push('холод');if(u.stun)a.push('оглушён');if(u.root)a.push('пригвождён');if(u.mark&&G.round<=u.mark.until)a.push('помечен: удар другого героя +3');return a.length?' · <span style="color:#f99">'+a.join(', ')+'</span>':'';};
function describe(cell){
  const inf=$('#info');if(G.mode)return;
  if(!cell){ui();return;}
  if(G.fog&&G.vis&&!G.vis.has(key(cell.c,cell.r))){inf.innerHTML='<b>'+(G.seen&&G.seen[key(cell.c,cell.r)]?'Вне видимости':'Неизведанная тьма')+'</b><br><span style="color:var(--mid)">Подведите героя ближе: видно на '+fogRadius()+' гекса вокруг.</span>';return;}
  const m=monsterAt(cell.c,cell.r);
  if(m){const it=m.int;let itx='';if(it){const th=it.tc!=null?heroAt(it.tc,it.tr):null;itx=it.k==='stun'?'пропустит ход (оглушён)':it.k==='sleep'?'спит, пока не подойдёте близко':it.k==='summon'?'призовёт помощника':it.k==='heal'?'вылечит союзника':it.k==='move'?'идёт к '+(th?th.d.n:'герою'):(it.k==='ranged'?'стреляет в ':'бьёт ')+(th?th.d.n:'героя')+(it.dmg?' (≈'+it.dmg+' урона)':'');}
    inf.innerHTML='<b>'+m.n+'</b>'+(m.affix&&AFFIX[m.affix]?' <span style="color:'+AFFIX[m.affix].css+'">('+AFFIX[m.affix].d+')</span>':'')+' · HP '+m.hp+'/'+m.max+' · АТК '+m.atk+' · ЗАЩ '+m.def+' · ХОД '+m.mv+' · ДАЛЬН '+m.rng+(m.xp?' · опыт '+m.xp:'')+statusTxt(m)+(itx?'<br><span style="color:#ffb0a0">Намерение: '+itx+'</span>':'')+'<br><span style="color:var(--mid)">'+m.d+'</span>';return;}
  const lootTxt=cell.loot&&cell.loot.length?'<br><span style="color:var(--gold)">На земле: '+cell.loot.map(id=>ITEMS[id].n+' ('+(ITEMS[id].cls?'только '+HDEF[ITEMS[id].cls].n:ITEMS[id].type)+': '+ITEMS[id].d+')').join('; ')+'</span>':'';
  const h=heroAt(cell.c,cell.r);
  if(h){inf.innerHTML='<b>'+h.d.n+'</b> ур.'+h.lv+' · HP '+h.hp+'/'+st(h,'maxhp')+' · АТК '+st(h,'atk')+' · ЗАЩ '+st(h,'def')+lootTxt;return;}
  if(lootTxt){inf.innerHTML='<b>Предметы на земле</b>'+lootTxt+'<br><span style="color:var(--mid)">Встаньте на гекс — подходящий предмет подберётся сам (если есть место).</span>';return;}
  if(capAt(cell.c,cell.r)){const d=HDEF[G.room.captive.id];inf.innerHTML='<b>Пленник: '+d.n+'</b><br><span style="color:var(--mid)">'+d.role+' Подойдите вплотную, чтобы освободить, — он будет сражаться за отряд (под управлением ИИ) до конца локации.</span>';return;}
  if(npcAt(cell.c,cell.r)){const n=G.npc;inf.innerHTML='<b>Пленник</b> · HP '+n.hp+'/'+n.d.hp+'<br><span style="color:var(--mid)">'+(n.freed?'Идёт за ближайшим героем, а когда кто-то встанет на выход — к выходу. Враги охотятся на него в первую очередь.':'Сидит в клетке. Подойдите вплотную любым героем, чтобы освободить.')+'</span>';return;}
  if(cell.portal){inf.innerHTML='<b>Вход: '+(cell.poi?cell.poi.n:'подземелье')+'</b><br><span style="color:var(--mid)">Встаньте на этот гекс — герой окажется в подземелье справа на карте (остальные продолжают ходить, раунд общий). Внутри сильные враги и щедрая награда.</span>';return;}
  if(cell.hold&&G.obj&&G.obj.type==='hold'){inf.innerHTML='<b>Древний тотем</b><br><span style="color:var(--mid)">'+(G.obj.done?'Тотем удержан.':G.obj.active?'Стойте на светящихся гексах вокруг тотема: каждый такой раунд засчитывается ('+G.obj.prog+'/'+G.obj.goal+').':'Встаньте на светящийся гекс рядом с тотемом, чтобы начать оборону.')+'</span>';return;}
  if(cell.lever){inf.innerHTML='<b>Рычаг</b><br><span style="color:var(--mid)">Пока на этом гексе стоит герой, решётка сокровищницы открыта. Сойдёте — она опустится (если в проёме никого нет).</span>';return;}
  if(cell.door){inf.innerHTML='<b>Решётка сокровищницы</b><br><span style="color:var(--mid)">'+(G.vault&&G.vault.open?'Открыта, пока кто-то стоит на рычаге.':'Закрыта. Найдите рычаг поблизости и поставьте на него героя.')+'</span>';return;}
  if(cell.rexit){inf.innerHTML='<b>Выход из подземелья</b><br><span style="color:var(--mid)">Встаньте сюда, чтобы вернуться на основную карту.</span>';return;}
  if(cell.token){inf.innerHTML='<b>Скрытая фишка'+(cell.poi?' — '+cell.poi.n:'')+'</b><br><span style="color:var(--mid)">Может скрывать монстра, предмет, ключ или событие. Откройте, стоя рядом (1 ОД).</span>';return;}
  if(cell.zone==='exit'){inf.innerHTML='<b>Выход</b><br><span style="color:var(--mid)">Все живые герои должны встать на светлые гексы, затем «Дальше».</span>';return;}
  if(cell.zone==='start'){inf.innerHTML='<b>Стартовая зона</b>';return;}
  if(cell.barrel){inf.innerHTML='<b>Бочка с порохом</b><br><span style="color:var(--mid)">Атакуйте её (1 ОД, в пределах дальности): взрыв наносит 5 урона и поджигает всех рядом — и врагов, и героев. Соседние бочки взрываются цепочкой.</span>';return;}
  if(cell.trap&&cell.trap.seen){inf.innerHTML='<b>Ловушка</b><br><span style="color:var(--mid)">Обнаружена — герои обходят её стороной.</span>';return;}
  if(cell.terr==='acid'){inf.innerHTML='<b>Кислота</b>'+lootTxt+'<br><span style="color:var(--mid)">Встав сюда, герой отравляется: 1 урон в начале 2 следующих раундов.</span>';return;}
  if(cell.terr==='lava'){inf.innerHTML='<b>Лава</b>'+lootTxt+'<br><span style="color:var(--mid)">Встав сюда, загоритесь: 2 урона в начале 2 следующих раундов.</span>';return;}
  if(cell.terr==='slow'){inf.innerHTML='<b>'+(LOCS[G.loc].slowName||'Топь')+'</b>'+lootTxt+'<br><span style="color:var(--mid)">Вход на этот гекс стоит 2 шага вместо 1.</span>';return;}
  if(cell.block){inf.innerHTML='<b>Непроходимо</b>';return;}
  if(cell.poi){inf.innerHTML='<b>'+cell.poi.n+'</b> (осмотрено)';return;}
  inf.innerHTML='<span style="color:var(--mid)">Пустой гекс.</span>';
}
