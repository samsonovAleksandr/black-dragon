'use strict';
/* =========================================================
   СТАРТ ИГРЫ / ЛОКАЦИЙ
   ========================================================= */
function newGame(){
  document.body.classList.remove('lost');
  const _si=G&&G.showInt;
  G={showInt:_si,chron:{h:{},ev:[]},fog:!NET.daily&&!!NET.fog,seen:{},pacts:NET.daily?[]:(NET.pacts||[]).slice(),relics:[],relicPending:0,diff:NET.diff||'normal',gold:0,camp:null,ready:{},heroes:[],monsters:[],keys:0,loc:0,round:1,log:[],fx:[],hover:null,mode:null,sel:'sword',busy:false,over:false,tele:null,dragon:null,stats:{deaths:0,kills:0}};
  G.rush=NET.rush?{i:0,list:RUSH_LIST.slice(),state:'fight'}:null;G.chapter=NET.chapter&&CHAPTERS[NET.chapter]?{id:NET.chapter,step:0}:null;
  if(NET.exped){const th=NET.expTheme||pick(EXP_THEMES);G.exped={theme:th,boss:EXP_BOSS[th]||pick(['icequeen','hydra','spiderqueen']),bossDead:false};}else G.exped=null;
  G.endless=!!NET.endless&&!NET.horde&&!G.rush&&!G.chapter&&!G.exped;G.horde=NET.horde?{wave:0,cleared:0,state:'prep'}:null;G.depth=1;G.floorClear=false;G.daily=NET.daily||null;if(G.endless)G.keys=KEYS_NEEDED;
  squad().forEach(id=>G.heroes.push({id,d:HDEF[id],lv:1,xp:0,hp:HDEF[id].hp,alive:true,c:0,r:0,ap:HDEF[id].ap,items:[],block:false,guard:false,taunt:false,haste:false,poison:0,reviveUsed:false,xpFlag:false,perks:{}}));
  G.heroes.forEach(h=>{h.hp=Math.min(h.hp,st(h,'maxhp'));});
  applyGift();META.s.runs++;saveMeta();
  if(G.horde){G.keys=KEYS_NEEDED;startLoc(HORDE_LOC);nextWave();}
  else if(G.rush){G.heroes.forEach(h=>{h.lv=3;h.xp=XPT[1];h.hp=st(h,'maxhp');});G.gold+=60;startRushFight();const r=pickRelics(1)[0];if(r)giveRelic(r);}
  else if(G.chapter){startLoc(CHAPTERS[G.chapter.id].route[0]);}
  else if(G.exped){startLoc(G.exped.theme);}
  else startLoc(1);
}
function startLoc(n){
  if(G.heroes&&G.heroes.some(h=>h.temp)){G.heroes.filter(h=>h.temp).forEach(h=>{delete NET.owners[h.id];log(h.d.n+' прощается с отрядом и уходит своей дорогой.');});G.heroes=G.heroes.filter(h=>!h.temp);}
  G.seen={};G.lures=[];G.vault=null;if(G.chron&&n!==HORDE_LOC)chronEv('Отряд входит: '+(LOCS[n]||{}).n+'.');G.loc=n;G.trackVar=Math.random()<.5?1:0;G.undo=null;G.room=null;G.npc=null;G.monsters=[];G.dragon=null;G.tele=null;G.round=1;G.mode=null;
  const CH=G.chapter?CHAPTERS[G.chapter.id]:null;
  const build=()=>{G.weather=G.rush?null:CH&&CH.weather&&(n in CH.weather)?CH.weather[n]:(n!==ARENA&&n!==HORDE_LOC&&Math.random()<.4)?pick(['rain','fog','night']):null;G.forceObj=CH&&CH.obj?CH.obj[n]||null:null;if(n===HORDE_LOC)genHorde();else if(G.rush&&n!==ARENA)genRush(n,G.rush.list[G.rush.i]);else if(n!==ARENA)genField(n);else genArena();G.obj=null;if(n!==ARENA&&LOCS[n].mon&&!G.rush)rollObjective();G.forceObj=null;
    G.hunt=(!G.rush&&n!==ARENA&&n!==HORDE_LOC&&Math.random()<(G.endless?.7:.6))?{at:rnd(5,8),warned:false,spawned:false}:null;};
  if(G.daily)withSeed(G.daily+'|'+G.depth,build);else build();
  G.heroes.forEach((h,i)=>{const [c,r]=G.startCells[i]||freeNear(G.startCells[0][0],G.startCells[0][1],G.startCells)||G.startCells[0];h.c=c;h.r=r;h.ap=st(h,'ap')+(hasRelic('clock')?1:0);h.block=h.guard=h.taunt=h.haste=false;h.poison=0;h.burn=0;h.bleed=0;h.chill=0;h.reviveUsed=false;h.xpFlag=false;h.bless=0;h.faith=false;});
  G.phxUsed=false;
  G.sel=(G.heroes.find(h=>h.alive&&mine(h))||G.heroes.find(h=>h.alive)).id;armTimer();
  {const ot=objText();const objLine=(G.weather?'\nПогода: '+WEATHER[G.weather].n:'')+(ot?'\nЦель: '+ot.n+(G.obj.type==='hunt'?' ('+G.obj.goal+')':G.obj.type==='alarm'?' (за '+G.obj.limit+' раундов)':''):'');
   if(G.horde){log('=== '+LOCS[n].n+' ===');}
   else if(G.endless){log('=== Этаж '+G.depth+': '+LOCS[n].n+' ===');showBanner('Этаж '+G.depth+(n===ARENA?' — БОСС':''),LOCS[n].n+' · враги сильнее на '+Math.round((DS().hp-1)*100)+'%'+objLine);}
   else{log('=== '+LOCS[n].n+' ===');showBanner(LOCS[n].n,LOC_SUB[n]+(n===ARENA?' Печатей осталось: '+(KEYS_NEEDED-G.keys)+'.':'')+objLine);}}
  if(n>1)sfx(n===ARENA?'roar':'travel');
  if(n!==ARENA&&!G.horde)log('Совет: '+pick(TIPS));
  if(!G.rush&&!G.exped&&n===3)log('В глубине пещер на ледяном троне ждёт Ледяная королева. Её смерть откроет последний ключ.');
  if(!G.rush&&!G.exped&&n===5)log('Над топью стелется туман. В хижине ведьмы и в логове Гидры спрятаны ключи.');
  if(!G.rush&&!G.exped&&n===6)log('В глубине катакомб, в паучьем гнезде, ждёт Королева пауков. Её смерть откроет последний ключ.');
  if(n===ARENA)log(G.endless?'Страж этажа пробуждается — Дракон!':'Дракон пробуждается. Печатей осталось: '+(KEYS_NEEDED-G.keys)+'.');
  ui();
}
function campRest(){
  const out=[];
  const dp=G.heroes.find(h=>h.pet&&!h.alive);if(dp){out.push(dp.d.n+' погиб и остался в прошлой локации.');G.heroes=G.heroes.filter(h=>h!==dp);delete NET.owners.pet;}
  G.heroes.forEach(h=>{
    if(h.alive){const heal=Math.ceil(st(h,'maxhp')*0.4);const b=h.hp;h.hp=Math.min(st(h,'maxhp'),h.hp+heal);out.push(h.d.n+': +'+(h.hp-b)+' HP');}
    else{h.alive=true;h.hp=Math.max(1,Math.ceil(st(h,'maxhp')*0.25));let lost='';
      if(h.items.length){const i=rnd(0,h.items.length-1);lost=' (потерян предмет: '+ITEMS[h.items[i]].n+')';h.items.splice(i,1);}
      out.push(h.d.n+' очнулся на привале с '+h.hp+' HP'+lost);}
  });
  return out;
}
