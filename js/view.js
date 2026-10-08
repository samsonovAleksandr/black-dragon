'use strict';
/* =========================================================
   ОТРИСОВКА
   ========================================================= */
const cv=$('#cv');
function hlCompute(){
  G.hl={move:new Map(),atk:new Set(),exp:new Set(),abil:null};
  const h=selHero();if(!h||!h.alive||G.busy||G.over||!mine(h)){G.mode=null;return;}
  if(G.mode){
    if(G.mode.h!==h||h.ap<G.mode.spec.cost)G.mode=null;
    else{const v=validTargets(h,G.mode.spec);if(v.size){G.mode.valid=v;G.hl.abil=v;return;}G.mode=null;}
  }
  if(h.ap<=0)return;
  const spd=st(h,'spd');
  const dm=reach(h,h.ap*spd);
  dm.forEach((d,k)=>{if(d===0)return;const [c,r]=k.split(',').map(Number);if(heroAt(c,r))return;G.hl.move.set(k,Math.ceil(d/spd));});
  const rg=st(h,'rng');
  G.monsters.filter(m=>m.alive&&mdist(h,m)<=rg&&fogOK(m)).forEach(m=>cellsOf(m).forEach(([c,r])=>G.hl.atk.add(key(c,r))));
  G.grid.flat().forEach(cl=>{if(cl.barrel&&dist(h.c,h.r,cl.c,cl.r)<=rg)G.hl.atk.add(key(cl.c,cl.r));});
  nb(h.c,h.r).forEach(([c,r])=>{if(cellOf(c,r).token)G.hl.exp.add(key(c,r));});
}
const THEME={
 1:{a:'#2c4d2f',b:'#325734',line:'#1d3320',blk:'#15281a',acc:['#5fa652','#f0da4c','#ee6fa0'],bg:'#0a130c'},
 2:{a:'#3c3548',b:'#443c52',line:'#29222f',blk:'#1a1522',acc:['#6d627f','#bdb59e','#9a52b0'],bg:'#0e0a14'},
 3:{a:'#34506a',b:'#3a5a76',line:'#223648',blk:'#16222e',acc:['#cfefff','#8ad8ff','#ffffff'],bg:'#070d14'},
 4:{a:'#4d2c2c',b:'#593434',line:'#331c1c',blk:'#1d0f0f',acc:['#ff7a30','#ffc040','#8c3a2a'],bg:'#120707'},
 7:{a:'#3a3a4c',b:'#42425a',line:'#25253a',blk:'#181826',acc:['#8a8ac8','#c8c8f0','#6a6aa0'],bg:'#0a0a14'},
 5:{a:'#2a3e30',b:'#2f4636',line:'#1a291f',blk:'#10201a',acc:['#7a9a4a','#c8d060','#4aa090'],bg:'#08100c'},
 6:{a:'#33332a',b:'#3a3a30',line:'#22221b',blk:'#17170f',acc:['#8ae850','#ddffa0','#a45ad8'],bg:'#0b0c07'}};
const hpCol=f=>SET.cb?(f>.5?'#4a90e8':f>.25?'#f0a020':'#d040c8'):(f>.5?'#5ad15a':f>.25?'#f0c020':'#e24444');
const ANIM={},PROJ=[];let ANIM_T=0,ANIM_LOC=null;
function animPos(k,id,c,r,dt){
  const t=hc(c,r);let a=ANIM[k];
  if(!a||a.id!==id){a=ANIM[k]={id,x:t.x,y:t.y,hop:0};return a;}
  const dx=t.x-a.x,dy=t.y-a.y,d=Math.hypot(dx,dy);
  if(d<0.5){a.x=t.x;a.y=t.y;a.hop=0;return a;}
  const sp=Math.max(d*Math.min(1,dt*9),dt*220);const f=Math.min(1,sp/d);
  a.x+=dx*f;a.y+=dy*f;a.hop=Math.min(4,d/6);
  if(Math.abs(dx)>1){a.face=dx<0?-1:1;a.faceT=performance.now();}
  if(PX){a.dust=(a.dust||0)-dt;if(a.dust<=0){a.dust=.06;burstAt(a.x,a.y,'dust');}}
  return a;
}
function shoot(a,b,kind){
  const o={c0:a.c,r0:a.r,c1:b.c,r1:b.r,kind};
  if(NET.role==='host'&&NET.started)(NET.pq=NET.pq||[]).push(o);
  addProj(o);
}
function addProj(o){if(o.burst){fxLocal(o);return;}if(PX){ATKS[o.c0+','+o.r0]=performance.now();faceUnit(o.c0,o.r0,o.c1,o.r1);}const p0=hc(o.c0,o.r0),p1=hc(o.c1,o.r1);PROJ.push({x0:p0.x,y0:p0.y-6,x1:p1.x,y1:p1.y-6,kind:o.kind,t:performance.now()});}
