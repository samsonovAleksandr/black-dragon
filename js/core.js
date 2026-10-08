'use strict';
/* =========================================================
   ГЕКСЫ (odd-r, «острый» верх)
   ========================================================= */
const HS=22,S3=Math.sqrt(3);let W=620,H=440;
const DIRS=[[[1,0],[0,-1],[-1,-1],[-1,0],[-1,1],[0,1]],[[1,0],[1,-1],[0,-1],[-1,0],[0,1],[1,1]]];
let G={};
const inb=(c,r)=>c>=0&&r>=0&&c<G.cols&&r<G.rows;
const nb=(c,r)=>DIRS[r&1].map(d=>[c+d[0],r+d[1]]).filter(([x,y])=>inb(x,y));
function cube(c,r){const x=c-(r-(r&1))/2;return [x,-x-r,r];}
function dist(c1,r1,c2,r2){if(G.room&&((c1>=G.room.c0)!==(c2>=G.room.c0)))return 99;const a=cube(c1,r1),b=cube(c2,r2);return Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]),Math.abs(a[2]-b[2]));}
function hc(c,r){return {x:G.ox+S3*HS*(c+0.5*(r&1)),y:G.oy+1.5*HS*r};}
const cellOf=(c,r)=>G.grid[r]&&G.grid[r][c];

/* =========================================================
   ГЕРОИ / МОНСТРЫ: ХАРАКТЕРИСТИКИ И ПОИСК
   ========================================================= */
const roll=()=>rnd(0,2);
function itemFx(h,k){return h.items.reduce((s,id)=>s+(ITEMS[id][k]||0),0);}
const TOUCH='ontouchstart' in window;
const ccImmune=m=>m.boss||m.elite;
function perkOf(h,l){const g=h.d.lv[l];const i=h.perks&&h.perks[l];return g&&g.pick&&i!=null?g.pick[i]:null;}
function hasPerk(h,f){for(let l=2;l<=h.lv;l++){const o=perkOf(h,l);if(o&&o.flag===f)return true;}return false;}
function pendingPick(h){for(let l=2;l<=h.lv;l++){const g=h.d.lv[l];if(g&&g.pick&&!perkOf(h,l))return l;}return 0;}
function lvSum(h,k){let s=0;for(let l=2;l<=h.lv;l++){const g=h.d.lv[l];if(g&&g[k])s+=g[k];const o=perkOf(h,l);if(o&&o[k])s+=o[k];}return s;}
function itemMods(h,k){let s=0;for(const id of h.items){const m=ITEMS[id].mods;if(m&&m[k])s+=m[k];}return s;}
function guardOn(h){return h.id==='tank'&&(h.guard||hasPerk(h,'unbreak'));}
const hasRelic=id=>!!(G.relics&&G.relics.includes(id));
function pickRelics(n){const have=G.relics||[];return shuffle(Object.keys(RELICS).filter(k=>!have.includes(k))).slice(0,n);}
function giveRelic(id){
  (G.relics=G.relics||[]).push(id);const r=RELICS[id];chronEv('Найдена реликвия «'+r.n+'».');log('★ Реликвия: «'+r.n+'» — '+r.d);sfx('key');
  if(id==='ironwill')G.heroes.forEach(h=>{if(h.alive)h.hp+=4;});
  const h=selHero();if(h){const p=hc(h.c,h.r);fxQ({burst:'level',c:h.c,r:h.r});}ui();
}
function st(h,k){
  const d=h.d;
  switch(k){
    case 'atk':return d.atk+lvSum(h,'atk')+itemMods(h,'atk')+(h.rage||0)+(h.atkb||0)+(pact('glass')&&!h.npc?1:0)+(h.bless>0?2:0)+(hasRelic('whetstone')?1:0)+(hasRelic('crown')?2:0);
    case 'def':return Math.max(0,d.def+lvSum(h,'def')+itemMods(h,'def')+(guardOn(h)?1:0)+(h.bless>0?1:0)+(G.heroes.some(x=>x!==h&&x.alive&&x.id==='paladin'&&hasPerk(x,'aura')&&dist(h.c,h.r,x.c,x.r)<=1)?1:0)+(hasRelic('ancestor')?1:0)+(hasRelic('banner')&&G.heroes.some(x=>x!==h&&x.alive&&dist(h.c,h.r,x.c,x.r)<=1)?1:0));
    case 'maxhp':{const v=d.hp+(h.hpb||0)+lvSum(h,'hp')+itemMods(h,'hp')+(hasRelic('ironwill')?4:0);return (pact('glass')&&!h.npc)?Math.max(1,Math.floor(v*.8)):v;}
    case 'ap':return Math.max(1,d.ap+lvSum(h,'ap')+itemMods(h,'ap'));
    case 'spd':return Math.max(1,2+(d.spd||0)+itemMods(h,'spd')+(hasRelic('windboots')?1:0));
    case 'rng':{let v=d.rng+lvSum(h,'rng')+itemMods(h,'rng')+(hasRelic('eagle')&&(h.id==='archer'||h.id==='mage')?1:0);if(G.weather==='fog')v=Math.min(v,2);else if(G.weather==='rain'&&v>=3)v--;return v;}
    case 'heal':return itemMods(h,'heal');
  }
}
function habils(h){const a=[...h.d.abil];for(let l=2;l<=h.lv;l++){const g=h.d.lv[l];if(g&&g.ab)a.push(...g.ab);const o=perkOf(h,l);if(o&&o.ab)a.push(...o.ab);}return a;}
const heroAt=(c,r)=>G.heroes.find(h=>h.alive&&h.c===c&&h.r===r);
const cellsOf=m=>m.cells||[[m.c,m.r]];
const monsterAt=(c,r)=>G.monsters.find(m=>m.alive&&cellsOf(m).some(x=>x[0]===c&&x[1]===r));
function mdist(h,m){let b=99;for(const [c,r] of cellsOf(m))b=Math.min(b,dist(h.c,h.r,c,r));return b;}
const pc=e=>e.big?{c:e.c,r:e.r}:{c:e.c,r:e.r};
function freeNear(c,r,avoid){
  const l=shuffle(nb(c,r)).filter(([x,y])=>{const cl=cellOf(x,y);return !cl.block&&!cl.token&&!cl.dragon&&!heroAt(x,y)&&!monsterAt(x,y)&&!npcAt(x,y)&&!(avoid&&avoid.some(a=>a[0]===x&&a[1]===y));});
  return l[0]||null;
}

/* =========================================================
   ЛОГ, ВСПЛЫВАЮЩИЙ ТЕКСТ
   ========================================================= */
function log(s){G.log.push(s);if(G.log.length>300)G.log.shift();renderLog();}
function pop(e,txt,col){if(NET.role==='host'&&NET.started)NET.fq.push({c:e.c,r:e.r,txt,col:col||'#fff'});const p=hc(e.c,e.r);G.fx.push({x:p.x,y:p.y-10,txt,col:col||'#fff',t:performance.now()});popFx(e.c,e.r,txt);}
