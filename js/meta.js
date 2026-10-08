'use strict';
/* =========================================================
   МЕТА-ПРОГРЕСС: достижения, дары предков, ежедневный забег
   ========================================================= */
const ACH={
 first_blood:{n:'Первая кровь',d:'Убить первого врага.'},
 forest:{n:'Выбраться из леса',d:'Пройти Тёмный лес.'},
 swamp:{n:'Болотный бродяга',d:'Пройти Гиблые топи.'},
 poison:{n:'Закалённый ядом',d:'Пройти Ядовитые катакомбы.'},
 mini:{n:'Искатель приключений',d:'Зачистить малую локацию.'},
 mini3:{n:'Охотник за добычей',d:'Зачистить 3 малые локации за один забег.'},
 queen:{n:'Королева повержена',d:'Победить Ледяную королеву.'},
 hydra:{n:'Головорез',d:'Победить Гидру топей.'},
 spider:{n:'Паучья погибель',d:'Победить Королеву пауков.'},
 victory:{n:'Победитель Дракона',d:'Победить Дракона в сюжетном режиме.'},
 victory_hard:{n:'Герой героев',d:'Победить Дракона на Героической сложности.'},
 flawless:{n:'Без потерь',d:'Победить Дракона, не потеряв ни одного героя.'},
 squad:{n:'Свой отряд',d:'Победить Дракона отрядом, не совпадающим с классическим.'},
 level5:{n:'Мастер',d:'Довести героя до 5 уровня.'},
 rich:{n:'Золотая жила',d:'Накопить 300 золота.'},
 relics8:{n:'Коллекционер',d:'Собрать 8 реликвий за один забег.'},
 depth5:{n:'Спуск',d:'Дойти до 5 этажа бесконечного подземелья.'},
 depth10:{n:'Бездна',d:'Дойти до 10 этажа бесконечного подземелья.'},
 horde5:{n:'Выстоять',d:'Отбить 5 волн в режиме «Орда».'},
 horde10:{n:'Неудержимые',d:'Отбить 10 волн в режиме «Орда».'},
 daily:{n:'Ежедневный герой',d:'Пройти 3 этажа ежедневного забега.'},
 exped:{n:'Первопроходец',d:'Завершить экспедицию.'},
 rush:{n:'Охотник на боссов',d:'Пройти режим «Босс-раш».'},
 chapter:{n:'Сказитель',d:'Пройти сюжетную главу.'}
};
const GIFTS={
 potions:{n:'Запас зелий',d:'Каждый герой начинает с Зельем лечения.',ach:['first_blood']},
 purse:{n:'Тугой кошель',d:'+40 золота на старте.',ach:['forest']},
 scholar:{n:'Свиток знаний',d:'Каждый герой начинает с 4 опытом.',ach:['mini']},
 heirloom:{n:'Фамильная реликвия',d:'Лишняя реликвия на первом привале.',ach:['queen','hydra','spider']},
 tough:{n:'Закалка',d:'+2 максимальных HP каждому герою.',ach:['victory']},
 edge:{n:'Острое оружие',d:'+1 АТК каждому герою.',ach:['victory_hard']}
};
let META=(()=>{try{const m=JSON.parse(localStorage.getItem('bd_meta')||'{}');return Object.assign({a:{},s:{runs:0,wins:0,kills:0},gift:null,daily:{}},m);}catch(e){return {a:{},s:{runs:0,wins:0,kills:0},gift:null,daily:{}};}})();
function saveMeta(){try{localStorage.setItem('bd_meta',JSON.stringify(META));}catch(e){}}
const hasAch=id=>!!META.a[id];
function ach(id){
  if(!ACH[id]||META.a[id]||NET.role==='guest')return;
  META.a[id]=Date.now();saveMeta();sfx('key');
  toast('🏆 <b>Достижение:</b> '+esc(ACH[id].n)+'<br><span style="color:var(--mid)">'+esc(ACH[id].d)+'</span>');
}
const giftOpen=id=>GIFTS[id].ach.some(hasAch);
function applyGift(){
  if(G.daily||NET.role==='guest')return;
  const g=META.gift;if(!g||!GIFTS[g]||!giftOpen(g))return;
  if(g==='purse')G.gold+=40;
  if(g==='heirloom')G.relicPending=(G.relicPending||0)+1;
  G.heroes.forEach(h=>{
    if(g==='potions')h.items.push('potion');
    if(g==='scholar')h.xp=Math.max(h.xp,4);
    if(g==='tough'){h.hpb=2;h.hp+=2;}
    if(g==='edge')h.atkb=1;
  });
  log('Дар предков: «'+GIFTS[g].n+'» — '+GIFTS[g].d);
}
function checkAch(){
  if(!G.heroes||NET.role==='guest')return;
  if((G.gold||0)>=300)ach('rich');
  if(G.heroes.some(h=>h.lv>=5))ach('level5');
  if((G.relics||[]).length>=8)ach('relics8');
  if(G.endless&&!G.horde){if(G.depth>=5)ach('depth5');if(G.depth>=10)ach('depth10');if(G.daily&&G.depth>=4)ach('daily');}
  if(G.horde){if(G.horde.cleared>=5)ach('horde5');if(G.horde.cleared>=10)ach('horde10');}
}
function showMeta(){
  const nA=Object.keys(ACH).length,got=Object.keys(ACH).filter(hasAch).length;
  let html='<h1>Достижения и дары</h1><p>Открыто достижений: <b style="color:var(--gold)">'+got+' / '+nA+'</b>. Сыграно забегов: '+META.s.runs+', побед: '+META.s.wins+', убито врагов: '+META.s.kills+'.</p>';
  html+='<h2>Дары предков</h2><p>Один дар действует в новых забегах (кроме ежедневного). Открываются достижениями.</p>';
  html+=Object.keys(GIFTS).map(id=>{const g=GIFTS[id],ok=giftOpen(id);
    return '<p>'+(META.gift===id?'★ ':ok?'✓ ':'🔒 ')+'<b>'+esc(g.n)+'</b> — '+esc(g.d)+(ok?'':' <span style="color:var(--mid)">(нужно: '+g.ach.map(a=>esc(ACH[a].n)).join(' или ')+')</span>')+'</p>';}).join('');
  html+='<h2>Достижения</h2>'+Object.keys(ACH).map(id=>'<p>'+(hasAch(id)?'🏆 <b>':'🔒 <span style="color:var(--mid)"><b>')+esc(ACH[id].n)+'</b> — '+esc(ACH[id].d)+(hasAch(id)?'':'</span>')+'</p>').join('');
  const btns=Object.keys(GIFTS).filter(giftOpen).map(id=>({t:(META.gift===id?'★ ':'')+GIFTS[id].n,fn:()=>{META.gift=META.gift===id?null:id;saveMeta();showMeta();}}));
  btns.push({t:'Назад',fn:showMenu});
  openModal(html,btns,true);
}
/* --- зерно случайных чисел для ежедневного забега --- */
function hashStr(t){let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function withSeed(seed,fn){const old=Math.random;Math.random=mulberry32(hashStr(String(seed)));try{return fn();}finally{Math.random=old;}}
const todayStr=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const dailySquad=day=>{const pick4=withSeed(day+'|squad',()=>shuffle(HORDER.slice()).slice(0,4));return HORDER.filter(id=>pick4.includes(id));};
function recordDaily(score){
  const d=G.daily;if(!d)return;const prev=META.daily[d];
  if(!prev||score>prev.score)META.daily[d]={score,depth:G.depth,kills:G.stats.kills};
  saveMeta();
}
function dailyStreak(){let n=0;const d=new Date();for(;;){const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');if(META.daily[k]){n++;d.setDate(d.getDate()-1);}else if(n===0&&k===todayStr()){d.setDate(d.getDate()-1);}else break;}return n;}
function showDaily(){
  const day=todayStr(),sq=dailySquad(day),best=META.daily[day];
  const days=Object.keys(META.daily).sort().reverse().slice(0,7);
  openModal('<h1>Ежедневный забег</h1><p>Дата: <b>'+day+'</b>. Для всех игроков в этот день одинаковые карты этажей и привалы, отряд задан заранее, а режим — бесконечное подземелье на обычной сложности. Дары предков не действуют. Результат — очки: этаж×100 + убийства×5 + золото/5.</p>'+
    '<h2>Отряд дня</h2><p>'+sq.map(id=>'<b>'+HDEF[id].n+'</b>').join(', ')+'</p>'+
    '<h2>Ваш результат сегодня</h2><p>'+(best?'<b style="color:var(--gold)">'+best.score+'</b> очков, этаж '+best.depth+', убито '+best.kills:'ещё не играли')+'. Серия дней подряд: <b>'+dailyStreak()+'</b>.</p>'+
    (days.length?'<h2>Последние забеги</h2><table class="rec"><tr><th>Дата</th><th>Этаж</th><th>Очки</th><th>Убито</th></tr>'+days.map(k=>'<tr><td>'+k+'</td><td>'+META.daily[k].depth+'</td><td>'+META.daily[k].score+'</td><td>'+META.daily[k].kills+'</td></tr>').join('')+'</table>':''),
    [{t:'Начать забег ▶',fn:()=>{saveName();NET.daily=day;setMode('endless');NET.diff='normal';NET.squad=sq;NET.owners={};NET.freeAI=false;sq.forEach(id=>NET.owners[id]='H');NET.playing=true;newGame();closeModal();showIntro();}},
     {t:'Назад',fn:showMenu}],true);
}
