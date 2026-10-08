'use strict';
/* =========================================================
   PIXI-РЕНДЕРЕР (WebGL). Запасного canvas-рендера больше нет — без WebGL игра показывает подсказку.
   ========================================================= */
let PX=null;
const CAM={z:1,cx:W/2,cy:H/2,vw:W,vh:H,s0:1,S:1,tx:0,ty:0,tgt:null,userT:0,lastSel:null,lastPos:'',shake:0};
const FLASH={},GHOSTS=[],PART=[],AMB=[],LUNGE={},RECOIL={},EFX=[],ATKS={},FRC=new Map();
const CLSCOL={tank:0x4283ea,sword:0xe34540,archer:0x52bb4e,mage:0xa95bdc};
// смещение и деформация юнита по текущим событиям (выпад, отдача)
function unitFx(c,r,now){
  let ox=0,oy=0;const L=LUNGE[c+','+r];
  if(L){const k=(now-L.t)/230;if(k>=1)delete LUNGE[c+','+r];else{const a=Math.sin(Math.min(1,k)*Math.PI)*(k<.5?1:.55);ox+=L.dx*9*a;oy+=L.dy*9*a;}}
  const Rc=RECOIL[c+','+r];
  if(Rc){const k=(now-Rc.t)/260;if(k>=1)delete RECOIL[c+','+r];else{const a=(1-k);ox+=Math.sin(k*38)*3*a+Rc.dx*4*a;oy+=Rc.dy*3*a;}}
  return [ox,oy];
}
const hexOff=(()=>{const o=[];for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-30);o.push([Math.cos(a),Math.sin(a)]);}return o;})();
function hexPts(cx,cy,s){const o=new Array(12);for(let i=0;i<6;i++){o[i*2]=cx+s*hexOff[i][0];o[i*2+1]=cy+s*hexOff[i][1];}return o;}
const _hx={};const hx=s=>{let v=_hx[s];if(v===undefined){v=parseInt(s.slice(1),16);_hx[s]=v;}return v;};
const TXC=new Map();
const mixc=(a,b,k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k];
function framesOf(name){
  if(FRC.has(name))return FRC.get(name);
  let r=null;
  try{const c=SPR[name];const f=ANIMK[name]&&c?buildFrames(name,c):null;
    if(f){r={};for(const st in f)r[st]=f[st].map(cv_=>PIXI.Texture.from(cv_,{scaleMode:PIXI.SCALE_MODES.NEAREST}));}}catch(e){console.warn('frames',name,e);}
  FRC.set(name,r);return r;
}
const unitKeyAt=(c,r)=>{const h=heroAt(c,r);if(h)return 'h'+h.id;const m=monsterAt(c,r);return m?'m'+G.monsters.indexOf(m):null;};
function faceUnit(c,r,tc,tr,t){const k=unitKeyAt(c,r);if(!k||!ANIM[k])return;const a=hc(c,r),b=hc(tc,tr);if(Math.abs(b.x-a.x)>1){ANIM[k].face=b.x<a.x?-1:1;ANIM[k].faceT=t||performance.now();}}
// выбор кадра: ранен > атака > ходьба > покой; направление взгляда
function unitTexOf(name,key,u,ap,now,isHero){
  const fr=framesOf(name);
  if(!fr)return {t:tex(name),flip:1};
  const ck=u.c+','+u.r;let st='idle',idx=0;
  let hs=0;for(let i=0;i<key.length;i++)hs+=key.charCodeAt(i);
  const Fl=FLASH[ck],L=LUNGE[ck],A=ATKS[ck];
  if(Fl&&now-Fl<190){st='hurt';idx=0;}
  else if(L&&now-L.t<320&&now>=L.t){const k=(now-L.t)/320;st='atk';idx=k<.3?0:k<.62?1:2;}
  else if(A&&now-A<340){const k=(now-A)/340;st='atk';idx=k<.3?0:k<.62?1:2;}
  else if(ap.hop>0){st='walk';idx=Math.floor(now/105+hs)%4;}
  else idx=Math.floor(now/260+hs)%4;
  let f=ap.face||1;
  if(!(ap.faceT&&now-ap.faceT<1600)&&!isHero){
    let best=null,bd=1e9;for(const h of G.heroes){if(!h.alive)continue;const p=hc(h.c,h.r);const d=Math.abs(p.x-ap.x)+Math.abs(p.y-ap.y);if(d<bd){bd=d;best=p;}}
    if(best&&Math.abs(best.x-ap.x)>3)f=best.x<ap.x?-1:1;
  }
  const flip=NO_FLIP[name]?1:f*(FACE_LEFT[name]?-1:1);
  return {t:fr[st][Math.min(idx,fr[st].length-1)],flip};
}
function polish(c){
  const sc=c.width/2===18?2:3,w=Math.round(c.width/sc),h=Math.round(c.height/sc);
  const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  const px=(x,y)=>{if(x<0||y<0||x>=w||y>=h)return null;const i=((y*sc+(sc>>1))*c.width+(x*sc+(sc>>1)))*4;return d[i+3]<10?null:[d[i],d[i+1],d[i+2]];};
  const isOut=p=>!p||(p[0]===0x15&&p[1]===0x0f&&p[2]===0x1d);
  const o=document.createElement('canvas');o.width=c.width;o.height=c.height;const g=o.getContext('2d');
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const p=px(x,y);if(!p)continue;let col;
    if(isOut(p)){
      const ns=[px(x,y-1),px(x,y+1),px(x-1,y),px(x+1,y)].filter(q=>q&&!isOut(q));
      if(ns.length){const a=[0,0,0];ns.forEach(q=>{a[0]+=q[0];a[1]+=q[1];a[2]+=q[2];});col=mixc([a[0]/ns.length*.3,a[1]/ns.length*.3,a[2]/ns.length*.3],[14,10,26],.45);}
      else col=p;
    }else{
      col=p;const up=px(x,y-1),dn=px(x,y+1),lf=px(x-1,y),rt=px(x+1,y);
      const lum=(col[0]*.3+col[1]*.59+col[2]*.11)/255;
      if(isOut(up))col=mixc(col,[255,255,255],.2*(1-lum*.8));else if(isOut(dn))col=mixc(col,[10,6,24],.24);
      if(isOut(lf))col=mixc(col,[255,255,255],.1);else if(isOut(rt))col=mixc(col,[10,6,24],.12);
    }
    g.fillStyle='rgb('+Math.round(col[0])+','+Math.round(col[1])+','+Math.round(col[2])+')';g.fillRect(x*sc,y*sc,sc,sc);
  }
  return o;
}
function tex(name){let t=TXC.get(name);if(!t){let c=SPR[name];if(!c)return null;if(name!=='q'&&!name.startsWith('i_')&&!ART[name]){try{c=polish(c);}catch(e){}}t=PIXI.Texture.from(c,{scaleMode:PIXI.SCALE_MODES.NEAREST});TXC.set(name,t);}return t;}
function radialTex(size,stops){const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d');const gr=g.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);stops.forEach(([o,col])=>gr.addColorStop(o,col));g.fillStyle=gr;g.fillRect(0,0,size,size);return PIXI.Texture.from(c);}
class SprPool{
  constructor(layer,blend){this.l=layer;this.a=[];this.n=0;this.blend=blend||0;}
  begin(){this.n=0;}
  get(t){let s=this.a[this.n];if(!s){s=new PIXI.Sprite();s.anchor.set(.5);this.l.addChild(s);this.a[this.n]=s;}this.n++;
    s.texture=t;s.visible=true;s.alpha=1;s.tint=0xffffff;s.scale.set(1);s.rotation=0;s.blendMode=this.blend;return s;}
  end(){for(let i=this.n;i<this.a.length;i++)this.a[i].visible=false;}
}
function initPixi(){
  try{
    if(typeof PIXI==='undefined')return null;
    const st=$('#stage');
    PIXI.settings.ROUND_PIXELS=true;
    PIXI.BaseTexture.defaultOptions.scaleMode=PIXI.SCALE_MODES.NEAREST;
    const app=new PIXI.Application({width:Math.max(200,st.clientWidth),height:Math.max(150,st.clientHeight),backgroundColor:0x05030a,antialias:false,
      resolution:Math.min(3,window.devicePixelRatio||1),autoDensity:true,autoStart:false,powerPreference:'high-performance'});
    if(!app.renderer||!app.view)return null;
    const world=new PIXI.Container();
    // чёткие пиксели: мир рисуется в текстуру с целым масштабом, затем плавно подгоняется под экран
    const rtS=new PIXI.Sprite(PIXI.Texture.EMPTY);app.stage.addChild(rtS);
    try{const CMF=PIXI.ColorMatrixFilter||(PIXI.filters&&PIXI.filters.ColorMatrixFilter);if(CMF){const cf=new CMF();cf.saturate(.12,true);cf.contrast(.06,true);rtS.filters=[cf];}}catch(e){}
    // освещение: карта света умножается на картинку
    const lightC=new PIXI.Container(),lightBg=new PIXI.Graphics(),lightL=new PIXI.Container();lightC.addChild(lightBg,lightL);
    const lightS=new PIXI.Sprite(PIXI.Texture.EMPTY);lightS.blendMode=PIXI.BLEND_MODES.MULTIPLY;app.stage.addChild(lightS);
    const fogC=new PIXI.Container();app.stage.addChild(fogC);
    const gStatic=new PIXI.Graphics(),cStatic=new PIXI.Container(),gDyn=new PIXI.Graphics();
    const lGlow=new PIXI.Container(),l1=new PIXI.Container(),l2=new PIXI.Container(),gFg=new PIXI.Graphics(),lTxt=new PIXI.Container();
    world.addChild(gStatic,cStatic,gDyn,lGlow,l1,l2,gFg,lTxt);
    const vig=new PIXI.Sprite(radialTex(256,[[0,'rgba(0,0,0,0)'],[.62,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,.45)']]));app.stage.addChild(vig);
    const glowTex=radialTex(64,[[0,'rgba(255,255,255,1)'],[1,'rgba(255,255,255,0)']]);
    st.insertBefore(app.view,st.firstChild);cv.style.display='none';
    $('#zoombtns').style.display='flex';
    const o={app,world,rtS,rt:null,lightC,lightBg,lightS,lrt:null,fogC,fog:[],gStatic,cStatic,gDyn,gFg,lTxt,vig,glowTex,sig:'',gid:new WeakMap(),gidn:0,pLight:new SprPool(lightL,PIXI.BLEND_MODES.ADD),pFog:new SprPool(fogC),
      pGlow:new SprPool(lGlow,PIXI.BLEND_MODES.ADD),p1:new SprPool(l1),p2:new SprPool(l2),tp:{}};
    return o;
  }catch(e){console.warn('PixiJS недоступен, используется canvas:',e);return null;}
}
/* --- камера --- */
function applyCam(){
  const vw=CAM.vw,vh=CAM.vh;CAM.s0=Math.min(vw/W,vh/H);let S=CAM.s0*CAM.z;
  if(PX&&SET.crisp!==false){const res=PX.app.renderer.resolution;const D=S*res;if(D>=1.5)S=Math.round(D)/res;}
  CAM.S=S;
  if(W*S<=vw)CAM.cx=W/2;else{const mn=vw/2/S,mx=W-vw/2/S;CAM.cx=Math.min(mx,Math.max(mn,CAM.cx));}
  if(H*S<=vh)CAM.cy=H/2;else{const mn=vh/2/S,mx=H-vh/2/S;CAM.cy=Math.min(mx,Math.max(mn,CAM.cy));}
  CAM.tx=vw/2-CAM.cx*S;CAM.ty=vh/2-CAM.cy*S;

}
function evWorld(e){
  const rc=PX.app.view.getBoundingClientRect();const sx=e.clientX-rc.left,sy=e.clientY-rc.top;
  return {x:(sx-CAM.tx)/CAM.S,y:(sy-CAM.ty)/CAM.S};
}
function setZoomAt(z,cx,cy){
  if(!PX)return;z=Math.min(3.5,Math.max(1,z));
  const wp=evWorld({clientX:cx,clientY:cy});CAM.z=z;applyCam();const wp2=evWorld({clientX:cx,clientY:cy});
  CAM.cx+=wp.x-wp2.x;CAM.cy+=wp.y-wp2.y;CAM.tgt=null;CAM.userT=performance.now();applyCam();
}
function zoomBtn(f){const rc=PX.app.view.getBoundingClientRect();setZoomAt(CAM.z*f,rc.left+rc.width/2,rc.top+rc.height/2);}
function focusHero(){const h=selHero();if(!h)return;const p=hc(h.c,h.r);CAM.tgt={x:p.x,y:p.y};CAM.userT=0;if(CAM.z<1.5)CAM.z=1.8;}
/* --- частицы и эффекты --- */
function spawnP(x,y,vx,vy,life,col,size,g){if(PART.length>520)return;PART.push({x,y,vx,vy,t:0,life,col:typeof col==='string'?hx(col):col,size:size||2,g:g||0});}
const rr=(a,b)=>a+Math.random()*(b-a);
function burstAt(x,y,kind){
  const n=(k,f)=>{if(SET.calm)k=Math.ceil(k/4);for(let i=0;i<k;i++)f(i);};
  switch(kind){
    case 'hit':n(9,()=>{const a=rr(0,6.28),v=rr(40,120);spawnP(x,y,Math.cos(a)*v,Math.sin(a)*v-20,rr(.25,.45),Math.random()<.5?'#ffffff':'#ff5a4a',2,260);});break;
    case 'kill':n(20,()=>{const a=rr(0,6.28),v=rr(30,130);spawnP(x,y,Math.cos(a)*v,Math.sin(a)*v-30,rr(.5,.95),['#d3d8e2','#8b92a3','#e34540','#4b5162'][Math.floor(Math.random()*4)],rr(2,3.5),140);});break;
    case 'heal':n(9,()=>spawnP(x+rr(-9,9),y+rr(-2,8),rr(-8,8),rr(-55,-25),rr(.7,1.1),Math.random()<.5?'#6bff8a':'#d8ffe0',2,-10));break;
    case 'level':n(18,i=>{const a=i/18*6.28;spawnP(x,y-4,Math.cos(a)*55,Math.sin(a)*35-30,rr(.7,1),i%2?'#ffd23f':'#ffffff',2.5,40);});break;
    case 'gold':n(9,()=>spawnP(x+rr(-6,6),y,rr(-30,30),rr(-90,-40),rr(.5,.8),'#ffd23f',2,220));break;
    case 'fire':n(11,()=>spawnP(x+rr(-10,10),y+rr(-4,10),rr(-14,14),rr(-70,-30),rr(.4,.8),['#ff8a20','#ffd23f','#e34540'][Math.floor(Math.random()*3)],rr(2,3.5),-40));break;
    case 'ice':n(11,()=>{const a=rr(0,6.28),v=rr(20,70);spawnP(x,y,Math.cos(a)*v,Math.sin(a)*v,rr(.45,.8),Math.random()<.5?'#9df':'#ffffff',2,60);});break;
    case 'magic':n(11,()=>{const a=rr(0,6.28),v=rr(20,80);spawnP(x,y,Math.cos(a)*v,Math.sin(a)*v-20,rr(.4,.8),Math.random()<.5?'#c58bff':'#66deef',2,0);});break;
    case 'poison':n(7,()=>spawnP(x+rr(-8,8),y+rr(0,8),rr(-6,6),rr(-40,-15),rr(.6,1),'#52bb4e',2.5,-10));break;
    case 'spawn':efx('ring',x,y+8,600,0xa95bdc,{r:22});n(16,()=>{const a=rr(0,6.28),v=rr(20,90);spawnP(x,y+6,Math.cos(a)*v,Math.sin(a)*v*.5-25,rr(.5,.9),Math.random()<.6?'#a95bdc':'#211829',rr(2,3.5),30);});break;
    case 'boom':efx('ring',x,y,520,0xffd23f,{r:46});efx('ring',x,y,380,0xffffff,{r:28});efx('flash',x,y,260,0xffb040,{r:34});n(34,()=>{const a=rr(0,6.28),v=rr(40,190);spawnP(x,y,Math.cos(a)*v,Math.sin(a)*v-30,rr(.45,.95),['#ff8a20','#ffd23f','#e34540','#ffffff','#4b5162'][Math.floor(Math.random()*5)],rr(2,4.5),90);});CAM.shake=Math.max(CAM.shake,5);break;
    case 'confetti':n(120,()=>spawnP(rr(0,W),rr(-30,0),rr(-25,25),rr(30,90),rr(2.2,3.6),['#ffd23f','#e34540','#4283ea','#52bb4e','#ffffff','#a95bdc'][Math.floor(Math.random()*6)],rr(2,4),20));break;
    case 'dust':n(2,()=>spawnP(x+rr(-4,4),y+8,rr(-14,14),rr(-14,-4),rr(.25,.45),'#a08060',2,20));break;
  }
}
function efx(k,x,y,dur,col,extra){EFX.push(Object.assign({k,x,y,t:performance.now(),dur,col},extra||{}));}
function fxLocal(o){
  if(!PX)return;
  if(o.burst==='shake'){if(!SET.calm)CAM.shake=Math.max(CAM.shake,o.mag||4);return;}
  if(o.burst==='lunge'){const a=hc(o.c,o.r),b=hc(o.tc,o.tr),d=Math.hypot(b.x-a.x,b.y-a.y)||1;const dx=(b.x-a.x)/d,dy=(b.y-a.y)/d;const n=performance.now();LUNGE[o.c+','+o.r]={dx,dy,t:n};faceUnit(o.c,o.r,o.tc,o.tr,n);RECOIL[o.tc+','+o.tr]={dx,dy,t:n+120};EFX.push({k:'slash',x:b.x,y:b.y-4,ang:Math.atan2(dy,dx),t:n+90,dur:240,col:0xffffff});return;}
  if(o.burst==='confetti'){burstAt(0,0,'confetti');return;}
  const p=hc(o.c,o.r);
  if(o.burst==='kill'){
    burstAt(p.x,p.y,'kill');if(o.spr)GHOSTS.push({spr:o.spr,x:p.x,y:p.y,t:performance.now(),big:o.big});
    if(o.big){for(let i=0;i<4;i++)burstAt(p.x+rr(-30,30),p.y+rr(-20,20),'boom');}return;}
  burstAt(p.x,p.y,o.burst);
}
function fxQ(o){if(NET.role==='host'&&NET.started)(NET.pq=NET.pq||[]).push(o);fxLocal(o);}
function popFx(c,r,txt){
  if(typeof txt==='string'&&txt[0]==='-'&&Math.abs(parseInt(txt))>=3&&G.heroes&&G.heroes.some(h=>h.alive&&h.c===c&&h.r===r&&mine(h)))hurtFlash();
  if(!PX||typeof txt!=='string')return;
  const t=txt[0],p=hc(c,r);
  if(/ з$/.test(txt)||txt==='КЛЮЧ'){burstAt(p.x,p.y,'gold');if(txt==='КЛЮЧ'){efx('beam',p.x,p.y,900,0xffd23f);efx('ring',p.x,p.y+8,700,0xffd23f,{r:26});}}
  else if(t==='-'){burstAt(p.x,p.y,'hit');FLASH[c+','+r]=performance.now();if(!RECOIL[c+','+r])RECOIL[c+','+r]={dx:0,dy:0,t:performance.now()};}
  else if(t==='+'){burstAt(p.x,p.y,'heal');efx('ring',p.x,p.y+9,520,0x6bff8a,{r:16});}
  else if(txt.startsWith('УРОВЕНЬ')){burstAt(p.x,p.y,'level');efx('beam',p.x,p.y,1000,0xffe27a);efx('ring',p.x,p.y+9,800,0xffe27a,{r:30});efx('ring',p.x,p.y+9,1000,0xffffff,{r:18});}
  else if(txt==='ВОСКРЕС'){burstAt(p.x,p.y,'heal');burstAt(p.x,p.y,'level');efx('beam',p.x,p.y,1100,0xbfffd0);efx('ring',p.x,p.y+9,900,0x6bff8a,{r:28});}
  else if(/ГОРИТ|ОГОНЬ/.test(txt))burstAt(p.x,p.y,'fire');
  else if(/ЗАМОРОЖЕН|ХОЛОД/.test(txt)){burstAt(p.x,p.y,'ice');efx('shards',p.x,p.y,520,0x99ddff);}
  else if(txt.startsWith('ЯД'))burstAt(p.x,p.y,'poison');
  else if(txt==='ЛОВУШКА'||txt==='КРОВЬ'||txt.startsWith('КРОВЬ'))burstAt(p.x,p.y,'hit');
}
/* --- текст --- */
function T(str,x,y,size,col,alpha){
  let pl=PX.tp[size];if(!pl)pl=PX.tp[size]={a:[],n:0};
  let t=pl.a[pl.n];
  if(!t){t=new PIXI.Text('',{fontFamily:'"Press Start 2P","Courier New",monospace',fontSize:size,fill:0xffffff});t.anchor.set(.5,.85);t.resolution=3;PX.lTxt.addChild(t);pl.a[pl.n]=t;}
  pl.n++;if(t.text!==str)t.text=str;t.x=x;t.y=y;t.tint=typeof col==='number'?col:hx(col);t.alpha=alpha==null?1:alpha;t.visible=true;return t;
}
function dashedHex(g,x,y,s,dash,gap){
  const p=hexPts(x,y,s);
  for(let i=0;i<6;i++){const ax=p[i*2],ay=p[i*2+1],bx=p[((i+1)%6)*2],by=p[((i+1)%6)*2+1],L=Math.hypot(bx-ax,by-ay);
    for(let d=0;d<L;d+=dash+gap){const e=Math.min(d+dash,L);g.moveTo(ax+(bx-ax)*d/L,ay+(by-ay)*d/L);g.lineTo(ax+(bx-ax)*e/L,ay+(by-ay)*e/L);}}
}
function clipHex(x1,y1,x2,y2,cx,cy,s){
  const p=hexPts(cx,cy,s);let t0=0,t1=1;const dx=x2-x1,dy=y2-y1;
  for(let i=0;i<6;i++){const ax=p[i*2],ay=p[i*2+1],bx=p[((i+1)%6)*2],by=p[((i+1)%6)*2+1];
    let nx=-(by-ay),ny=bx-ax;if(nx*(cx-ax)+ny*(cy-ay)<0){nx=-nx;ny=-ny;}
    const f0=nx*(x1-ax)+ny*(y1-ay),fd=nx*dx+ny*dy;
    if(Math.abs(fd)<1e-9){if(f0<0)return null;}else{const tt=-f0/fd;if(fd>0)t0=Math.max(t0,tt);else t1=Math.min(t1,tt);}
    if(t0>t1)return null;}
  return [x1+dx*t0,y1+dy*t0,x1+dx*t1,y1+dy*t1];
}
function hexFill(g,x,y,s,color,alpha){g.beginFill(color,alpha==null?1:alpha);g.drawPolygon(hexPts(x,y,s));g.endFill();}
function shadow(g,x,y,rx,ry){g.beginFill(0,.38);g.drawEllipse(x,y,rx,ry);g.endFill();}
function pbar(g,x,y,f,col){g.beginFill(0);g.drawRect(Math.round(x-11),Math.round(y),22,5);g.endFill();g.beginFill(0x3a1a1a);g.drawRect(Math.round(x-10),Math.round(y+1),20,3);g.endFill();g.beginFill(hx(col));g.drawRect(Math.round(x-10),Math.round(y+1),Math.max(0,Math.round(20*f)),3);g.endFill();}
function pStatus(g,u,x,y){
  [[u.burn,0xff8a20],[u.bleed,0xe34540],[u.poison,0x52bb4e],[u.chill,0x66deef],[u.stun,0xffd23f],[u.root,0xa26634]].filter(a=>a[0]).forEach(([_,c],i)=>{
    g.beginFill(0);g.drawRect(x-9+i*5,y+15,5,5);g.endFill();g.beginFill(c);g.drawRect(x-8+i*5,y+16,3,3);g.endFill();});
}
/* --- статический слой (карта перерисовывается только при изменениях) --- */
function staticSig(){
  let id=PX.gid.get(G.grid);if(!id){id=++PX.gidn;PX.gid.set(G.grid,id);}
  let h='';for(const row of G.grid)for(const c of row)h+=(c.block?1:0)+(c.barrel?'b':'')+(c.token?'t':'')+(c.zone?c.zone[0]:'')+(c.deco||'')+(c.poi?'p':'');
  return G.loc+'|'+id+'|'+h;
}
const shadeHex=(h,f)=>{const v=hx(h);const r=Math.min(255,Math.round(((v>>16)&255)*f)),g=Math.min(255,Math.round(((v>>8)&255)*f)),b=Math.min(255,Math.round((v&255)*f));return (r<<16)|(g<<8)|b;};
function rebuildStatic(th){
  const g=PX.gStatic;g.clear();
  PX.cStatic.removeChildren().forEach(c=>c.destroy());
  g.beginFill(hx(th.bg));g.drawRect(0,0,W,H);g.endFill();
  const loc=G.loc;
  for(const row of G.grid)for(const cell of row){
    if(cell.void)continue;
    const {x,y}=hc(cell.c,cell.r);
    const R=i=>{const v=Math.sin(cell.seed*1000+i*12.9898)*43758.5453;return v-Math.floor(v);};
    const base=cell.block&&!cell.barrel?th.blk:(((cell.c+cell.r)&1)?th.a:th.b);
    const col=shadeHex(base,cell.block&&!cell.barrel?1:.9+.2*R(0));
    // плитка + фаска
    g.lineStyle(1,hx(th.line),.7);g.beginFill(col);g.drawPolygon(hexPts(x,y,HS-.5));g.endFill();g.lineStyle(0);
    if(!(cell.block&&!cell.barrel)){
      const pp=hexPts(x,y,HS-2);
      g.lineStyle(1.5,0xffffff,.11);g.moveTo(pp[8],pp[9]);g.lineTo(pp[10],pp[11]);g.lineTo(pp[0],pp[1]);
      g.lineStyle(1.5,0x000000,.24);g.moveTo(pp[2],pp[3]);g.lineTo(pp[4],pp[5]);g.lineTo(pp[6],pp[7]);g.lineStyle(0);
      g.beginFill(0xffffff,.035);g.drawPolygon(hexPts(x,y-1,HS-6));g.endFill();
    }
    // детали местности
    if(!cell.block&&!cell.token){
      const n=1+Math.floor(R(1)*3);
      for(let k=0;k<n;k++){
        const gx=Math.round(x+(R(2+k)-.5)*24),gy=Math.round(y+(R(9+k)-.5)*18);
        if(loc===1){
          const t=R(20+k);
          if(t<.5){g.beginFill(hx(th.acc[0]));g.drawRect(gx,gy-2,1,3);g.drawRect(gx+2,gy-3,1,4);g.drawRect(gx+4,gy-1,1,2);g.endFill();}
          else if(t<.68){g.beginFill(0x2a4a2c);g.drawRect(gx,gy,2,2);g.endFill();g.beginFill(R(30+k)<.5?0xf0da4c:0xee6fa0);g.drawRect(gx,gy-2,2,2);g.endFill();}
          else if(t<.78){g.beginFill(0xe8e0c8);g.drawRect(gx,gy,3,2);g.endFill();g.beginFill(0xe34540);g.drawRect(gx-1,gy-2,5,2);g.endFill();}
          else if(t<.9){g.beginFill(0x6b7568);g.drawRect(gx,gy,3,2);g.endFill();g.beginFill(0x9aa496);g.drawRect(gx,gy,3,1);g.endFill();}
          else{g.beginFill(0xe08a30);g.drawRect(gx,gy,2,1);g.drawRect(gx+1,gy+1,2,1);g.endFill();}
        }else if(loc===2){
          const t=R(20+k);
          if(t<.4){g.lineStyle(1,0x14101c,.8);g.moveTo(gx,gy);g.lineTo(gx+3,gy+2);g.lineTo(gx+2,gy+5);g.lineTo(gx+6,gy+6);g.lineStyle(0);}
          else if(t<.6){g.beginFill(0xd8d0b8);g.drawRect(gx,gy,4,1);g.drawRect(gx,gy-1,1,1);g.drawRect(gx+3,gy+1,1,1);g.endFill();}
          else if(t<.8){g.beginFill(0x5d546e);g.drawRect(gx,gy,3,2);g.endFill();g.beginFill(0x7d7490);g.drawRect(gx,gy,3,1);g.endFill();}
          else{g.beginFill(0x9a52b0,.8);g.drawRect(gx,gy,2,2);g.endFill();g.beginFill(0xc58bff,.7);g.drawRect(gx+1,gy-1,1,1);g.endFill();}
        }else if(loc===3){
          const t=R(20+k);
          if(t<.45){g.lineStyle(1,0xffffff,.28);g.moveTo(gx,gy+3);g.lineTo(gx+5,gy);g.lineStyle(0);}
          else if(t<.7){g.beginFill(0xffffff,.22);g.drawEllipse(gx+2,gy+2,5,2.5);g.endFill();}
          else{g.beginFill(0xcfefff,.7);g.drawPolygon([gx,gy+3,gx+1,gy-1,gx+2,gy+3]);g.endFill();g.beginFill(0xffffff,.8);g.drawRect(gx+1,gy,1,1);g.endFill();}
        }else if(loc===5){
          const t=R(20+k);
          if(t<.4){g.beginFill(0x7a9a4a);g.drawRect(gx,gy-3,1,4);g.drawRect(gx+2,gy-4,1,5);g.drawRect(gx+4,gy-2,1,3);g.endFill();}
          else if(t<.68){g.beginFill(0x14323a,.6);g.drawEllipse(gx+2,gy+2,5,2.5);g.endFill();g.beginFill(0x6aa0a0,.35);g.drawRect(gx,gy+1,3,1);g.endFill();}
          else if(t<.85){g.beginFill(0x3f8a3a);g.drawEllipse(gx+2,gy+2,3,1.6);g.endFill();g.beginFill(0xee6fa0);g.drawRect(gx+2,gy,1,1);g.endFill();}
          else{g.beginFill(0x5a4630);g.drawRect(gx,gy,3,2);g.endFill();g.beginFill(0x8a6a44);g.drawRect(gx,gy,3,1);g.endFill();}
        }else if(loc===6){
          const t=R(20+k);
          if(t<.4){g.beginFill(0x8ae850,.7);g.drawRect(gx,gy,2,2);g.endFill();g.beginFill(0xddffa0,.7);g.drawRect(gx+1,gy-1,1,1);g.endFill();}
          else if(t<.65){g.beginFill(0x3ab52a,.28);g.drawEllipse(gx+2,gy+2,5,2.5);g.endFill();}
          else if(t<.85){g.lineStyle(1,0x14140c,.8);g.moveTo(gx,gy);g.lineTo(gx+3,gy+2);g.lineTo(gx+2,gy+5);g.lineTo(gx+6,gy+6);g.lineStyle(0);}
          else{g.beginFill(0x6a6a50);g.drawRect(gx,gy,3,2);g.endFill();g.beginFill(0x9a9a7a);g.drawRect(gx,gy,3,1);g.endFill();}
        }else{
          const t=R(20+k);
          if(t<.45){g.lineStyle(1,0xff7a30,.55);g.moveTo(gx,gy);g.lineTo(gx+3,gy+2);g.lineTo(gx+4,gy+6);g.lineStyle(0);}
          else if(t<.75){g.beginFill(0x120707,.55);g.drawEllipse(gx+2,gy+2,5,2.5);g.endFill();}
          else{g.beginFill(0x2a1a1a);g.drawRect(gx,gy,3,2);g.endFill();g.beginFill(0x6a4a4a);g.drawRect(gx,gy,3,1);g.endFill();}
        }
      }
    }
    if(cell.zone==='start'){hexFill(g,x,y,HS-.5,0x6ac8ff,.12);g.lineStyle(1,0x6ac8ff);dashedHex(g,x,y,HS-3,3,3);g.lineStyle(0);}
    const dec=cell.block&&cell.deco?cell.deco:(cell.poi?cell.poi.spr:null);
    if(dec){
      g.beginFill(0,.42);g.drawEllipse(x+1,y+11,15,5);g.endFill();
      const t=tex(dec);if(t){const s=new PIXI.Sprite(t);s.anchor.set(.5);s.position.set(Math.round(x),Math.round(y-5));PX.cStatic.addChild(s);}
    }
  }
}
/* --- кадр --- */
function renderPixi(){
  const now=performance.now();const dt=Math.min(.1,(now-(ANIM_T||now))/1000);ANIM_T=now;
  if(ANIM_LOC!==G.loc){for(const k in ANIM)delete ANIM[k];ANIM_LOC=G.loc;PART.length=0;GHOSTS.length=0;AMB.length=0;}
  if(!G.grid)return;
  const th=THEME[G.loc]||THEME[1];
  // камера
  if(CAM.z>1.2){
    const h=selHero();
    if(G.sel!==CAM.lastSel){CAM.lastSel=G.sel;if(h&&h.alive){const p=hc(h.c,h.r);CAM.tgt={x:p.x,y:p.y};CAM.lastPos=h.c+','+h.r;}}
    else if(h&&h.alive&&now-CAM.userT>4000&&CAM.lastPos!==h.c+','+h.r){CAM.lastPos=h.c+','+h.r;const p=hc(h.c,h.r);CAM.tgt={x:p.x,y:p.y};}
  }
  if(CAM.tgt){const f=Math.min(1,dt*6);CAM.cx+=(CAM.tgt.x-CAM.cx)*f;CAM.cy+=(CAM.tgt.y-CAM.cy)*f;if(Math.hypot(CAM.tgt.x-CAM.cx,CAM.tgt.y-CAM.cy)<.5)CAM.tgt=null;}
  CAM.shake*=Math.pow(.02,dt);if(CAM.shake<.1)CAM.shake=0;
  applyCam();
  PX.app.renderer.background.color=hx(th.bg);
  const sig=staticSig();if(sig!==PX.sig){rebuildStatic(th);PX.sig=sig;}
  const g=PX.gDyn,f=PX.gFg;g.clear();f.clear();
  PX.pGlow.begin();PX.p1.begin();PX.p2.begin();
  for(const k in PX.tp)PX.tp[k].n=0;
  const hl=G.hl||{move:new Map(),atk:new Set(),exp:new Set()};const hv=G.hover;
  // динамические оверлеи клеток
  for(const row of G.grid)for(const cell of row){
    if(cell.void)continue;
    const unseen=G.fog&&G.seen&&!G.seen[key(cell.c,cell.r)];
    const {x,y}=hc(cell.c,cell.r);
    if(cell.room&&!cell.block){hexFill(g,x,y,HS-.5,G.room&&G.room.opened?0x7a3aa8:0x20103a,G.room&&G.room.opened?.10:.5);}
    if(cell.hold&&!unseen&&G.obj&&G.obj.type==='hold'&&!G.obj.done){hexFill(g,x,y,HS-.5,G.obj.active?0xff5040:0xffd23f,(G.obj.active?.14:.08)+.05*Math.sin(now/280));g.lineStyle(1,G.obj.active?0xff8a7a:0xffd23f,.7);g.drawPolygon(hexPts(x,y,HS-3));g.lineStyle(0);}
    if(cell.htrap&&!unseen){g.lineStyle(1.5,0xd0d0d8);g.drawCircle(x,y+2,7);g.moveTo(x-7,y+2);g.lineTo(x+7,y+2);for(let q=-6;q<=6;q+=3){g.moveTo(x+q,y-3);g.lineTo(x+q,y+1);}g.lineStyle(0);T('КАПКАН',x,y+HS+9,6,'#ffd23f');}
    if(cell.lever&&!unseen){const on=G.vault&&G.vault.open;hexFill(g,x,y,HS-.5,on?0x8af58a:0xffd23f,.12+.05*Math.sin(now/300));const t=tex('lever');if(t){const sp=PX.p1.get(t);sp.position.set(Math.round(x),Math.round(y-4));if(on){sp.scale.set(-1,1);}}T(on?'ДЕРЖАТ':'РЫЧАГ',x,y+HS+9,6,on?'#8af58a':'#ffd23f');}
    if(cell.door&&G.vault&&G.vault.open){g.lineStyle(2,0x8b92a3,.6);g.drawPolygon(hexPts(x,y,HS-3));g.lineStyle(0);T('ОТКРЫТО',x,y-HS-2,6,'#8af58a');}
    if(cell.rexit&&!unseen){hexFill(g,x,y,HS-.5,0xffd23f,.18+.06*Math.sin(now/300));g.lineStyle(1,0xffd23f);g.drawPolygon(hexPts(x,y,HS-3));g.lineStyle(0);T('НАЗАД',x,y+HS+9,7,'#ffd23f');}
    if(cell.portal&&!G.over){g.lineStyle(2,0xc58bff,.5+.3*Math.sin(now/260));g.drawPolygon(hexPts(x,y,HS-2));g.lineStyle(0);}
    if(cell.terr==='lava'){hexFill(g,x,y,HS-1.5,(255<<16)|(Math.round(90+40*Math.sin(now/300+cell.seed*9))<<8)|20,.55);
      g.beginFill(0xffd23f);g.drawRect(Math.round(x-6+cell.seed*8),Math.round(y-2),2,2);g.drawRect(Math.round(x+4-cell.seed*6),Math.round(y+4),2,2);g.endFill();}
    else if(cell.terr==='acid'){hexFill(g,x,y,HS-1.5,0x3ab52a,.42+.1*Math.sin(now/400+cell.seed*9));
      g.beginFill(0xddffa0,.8);g.drawCircle(Math.round(x-6+cell.seed*8),Math.round(y+1+Math.sin(now/300+cell.seed*7)*2),1.6);g.drawCircle(Math.round(x+5-cell.seed*6),Math.round(y-3+Math.sin(now/260+cell.seed*5)*2),1.2);g.endFill();}
    else if(cell.terr==='slow'){const ice=G.loc===3&&LOCS[3].slowName==='Сугроб';hexFill(g,x,y,HS-1.5,ice?0xebf5ff:0x28461f,ice?.45:.6);
      g.lineStyle(1,ice?0xffffff:0x78aa6e,.6);g.moveTo(x-7,y+2);g.quadraticCurveTo(x-3,y-1,x,y+2);g.quadraticCurveTo(x+3,y+5,x+7,y+2);g.lineStyle(0);}
    if(cell.zone==='exit'){hexFill(g,x,y,HS-.5,0xffd23f,.16+.06*Math.sin(now/300));g.lineStyle(1,0xffd23f);g.drawPolygon(hexPts(x,y,HS-3));g.lineStyle(0);}
  }
  (G.lures||[]).forEach(l=>{if(!fogCellVis(l.c,l.r))return;const p=hc(l.c,l.r);g.beginFill(0xc83a3a);g.drawEllipse(p.x,p.y+3,6,4);g.endFill();g.beginFill(0xf0e0c0);g.drawRect(p.x+4,p.y,4,2);g.endFill();T('ПРИМАНКА',p.x,p.y+HS+9,6,'#ff8a7a');});
  if(G.room&&(!G.fog||G.room.opened)){const p=hc(G.room.c0+Math.floor(G.room.cols/2),G.room.r0);T(G.room.n+(G.room.won?' · зачищено':G.room.opened?'':' · закрыто'),p.x,p.y-HS-2,7,'#d8b0ff');}
  hl.move.forEach((cost,k)=>{const [c,r]=k.split(',').map(Number);const {x,y}=hc(c,r);hexFill(g,x,y,HS-2,0x6ed2ff,.22);});
  if(hl.abil)hl.abil.forEach((v,k)=>{const [c,r]=k.split(',').map(Number);const {x,y}=hc(c,r);hexFill(g,x,y,HS-2,0xffdc50,.2+.14*Math.sin(now/150));g.lineStyle(2,0xffd23f);g.drawPolygon(hexPts(x,y,HS-2));g.lineStyle(0);});
  if(G.tele)G.tele.cells.forEach(k=>{const [c,r]=k.split(',').map(Number);const {x,y}=hc(c,r);
    hexFill(g,x,y,HS-1,0xff5a14,.18+.12*Math.sin(now/120));
    g.lineStyle(2,0xffaa32,.6+.35*Math.sin(now/120));
    for(let i=-HS*2;i<HS*2;i+=6){const seg=clipHex(x-HS+i,y+HS,x+i,y-HS,x,y,HS-1);if(seg){g.moveTo(seg[0],seg[1]);g.lineTo(seg[2],seg[3]);}}
    g.lineStyle(2,0xff6a20);g.drawPolygon(hexPts(x,y,HS-1));g.lineStyle(0);
    if(Math.random()<.25)spawnP(x+rr(-10,10),y+rr(-4,8),rr(-8,8),rr(-50,-25),rr(.3,.6),Math.random()<.5?'#ff8a20':'#ffd23f',2,-30);});
  // клетки: ловушки, фишки, лут
  for(const row of G.grid)for(const cell of row){
    const {x,y}=hc(cell.c,cell.r);
    if(cell.trap&&cell.trap.seen){g.beginFill(0x8b92a3);for(let i=-1;i<=1;i++)g.drawPolygon([x+i*6-3,y+5,x+i*6,y-3,x+i*6+3,y+5]);g.endFill();g.lineStyle(1,0xe34540);dashedHex(g,x,y,HS-6,2,2);g.lineStyle(0);}
    if(cell.token){
      const bob=Math.round(Math.sin(now/400+cell.c*1.7+cell.r)*1.2);
      hexFill(g,x,y+1,HS-4,0);
      g.lineStyle(2,0xffd23f);g.beginFill(0x3e2b68);g.drawPolygon(hexPts(x,y+bob,HS-5));g.endFill();g.lineStyle(0);
      const s=PX.p1.get(tex('q'));s.position.set(Math.round(x),Math.round(y+bob));
    }
    if(cell.loot&&cell.loot.length){
      const bob=Math.round(Math.sin(now/300+cell.c)*1.5);
      cell.loot.slice(0,3).forEach((id,i)=>{const off=(i-(Math.min(3,cell.loot.length)-1)/2)*8;
        g.beginFill(0xffd23f,.25+.15*Math.sin(now/250));g.drawCircle(x+off,y+5+bob,8);g.endFill();
        const t=tex('i_'+id);if(t){const s=PX.p1.get(t);s.scale.set(18/t.width);s.position.set(Math.round(x+off),Math.round(y+5+bob));}});
    }
    if(cell.zone==='exit'&&G.exitCells.length&&cell.c===G.exitCells[0][0]&&cell.r===G.exitCells[0][1])T('ВЫХОД',x,y+HS+9,7,'#ffd23f');
  }
  G.heroes.filter(h=>!h.alive).forEach(h=>{const {x,y}=hc(h.c,h.r);shadow(g,x,y+10,11,4);const s=PX.p1.get(tex('grave'));s.position.set(Math.round(x),Math.round(y-4));});
  if(G.room&&G.room.captive&&!G.room.captive.freed&&fogCellVis(G.room.captive.c,G.room.captive.r)){const K=G.room.captive;const {x,y}=hc(K.c,K.r);shadow(g,x,y+10,10,4);
    const t=tex(HDEF[K.id].spr);if(t){const sp=PX.p2.get(t);sp.scale.set(1,1);sp.tint=0xb0b0c0;sp.position.set(Math.round(x),Math.round(y-4));}
    f.lineStyle(2,0x8b92a3,.95);for(let i=-2;i<=2;i++){f.moveTo(x+i*5,y-20);f.lineTo(x+i*5,y+8);}f.moveTo(x-12,y-20);f.lineTo(x+12,y-20);f.lineStyle(0);T(HDEF[K.id].n.toUpperCase(),x,y-28,6,'#9fe0ff');}
  if(G.npc&&G.npc.alive&&fogCellVis(G.npc.c,G.npc.r)){const n=G.npc;const {x,y}=hc(n.c,n.r);shadow(g,x,y+10,10,4);
    if(n.freed){const ga=PX.pGlow.get(PX.glowTex);ga.position.set(Math.round(x),Math.round(y));ga.scale.set(2);ga.tint=0x6ed2ff;ga.alpha=.3+.1*Math.sin(now/300);}
    const t=tex('captive');if(t){const sp=PX.p2.get(t);sp.scale.set(1,1);sp.tint=0xffffff;sp.position.set(Math.round(x),Math.round(y-4+Math.round(Math.sin(now/500)*1)));}
    pbar(f,x,y+12,Math.max(0,n.hp)/n.d.hp,'#6ed2ff');pStatus(f,n,x,y);
    if(!n.freed){f.lineStyle(2,0x8b92a3,.95);for(let i=-2;i<=2;i++){f.moveTo(x+i*5,y-20);f.lineTo(x+i*5,y+8);}f.moveTo(x-12,y-20);f.lineTo(x+12,y-20);f.lineStyle(0);T('ПЛЕННИК',x,y-28,6,'#9fe0ff');}}
  // монстры
  const flash=(c,r)=>{const t=FLASH[c+','+r];return t&&now-t<150;};
  for(const m of G.monsters){
    if(!m.alive||!fogOK(m))continue;
    if(m.big){
      const {x,y}=hc(m.c,m.r);shadow(g,x,y+30,52,14);
      const dux=unitFx(m.c,m.r,now);const dap={hop:0,x,y,face:1};const ut=unitTexOf('dragon','m'+G.monsters.indexOf(m),m,dap,now*.7,false);const s=PX.p2.get(ut.t);s.position.set(Math.round(x+dux[0]),Math.round(y-4+dux[1]+Math.round(Math.sin(now/500)*2)));if(flash(m.c,m.r))s.tint=0xff9999;
      f.beginFill(0);f.drawRect(x-47,y-HS*2-22,94,10);f.endFill();f.beginFill(0x5a1420);f.drawRect(x-45,y-HS*2-20,90,6);f.endFill();
      f.beginFill(0xe34540);f.drawRect(x-45,y-HS*2-20,Math.max(0,Math.round(90*m.hp/m.max)),6);f.endFill();f.beginFill(0xffffff,.35);f.drawRect(x-45,y-HS*2-20,Math.max(0,Math.round(90*m.hp/m.max)),2);f.endFill();
      if(Math.random()<.08)spawnP(x+rr(-12,12),y-18,rr(-6,6),rr(-30,-15),rr(.5,.9),'#ff8a20',2,-20);
      continue;
    }
    const ap=animPos('m'+G.monsters.indexOf(m),m.id,m.c,m.r,dt),ux=unitFx(m.c,m.r,now);const x=ap.x+ux[0],y=ap.y+ux[1];
    const br=Math.sin(now/340+m.c*1.7+m.r*.9);
    shadow(g,x-ux[0],y-ux[1]+10,11-br*.6,4-br*.2);
    if(m.affix&&AFFIX[m.affix]){const aa=PX.pGlow.get(PX.glowTex);aa.position.set(Math.round(x),Math.round(y));aa.scale.set(2.3);aa.tint=AFFIX[m.affix].col;aa.alpha=.5+.15*Math.sin(now/260+m.c);}
    if(m.elite){const ea=PX.pGlow.get(PX.glowTex);ea.position.set(Math.round(x),Math.round(y));ea.scale.set(2.4);ea.tint=m.leader?0xff6a6a:0x88ddff;ea.alpha=.28+.08*Math.sin(now/300);}
    const ut=unitTexOf(m.spr,'m'+G.monsters.indexOf(m),m,ap,now,false),s=PX.p2.get(ut.t);s.scale.set(ut.flip,1);
    s.position.set(Math.round(x),Math.round(y-4-Math.round(ap.hop*.5)));
    if(flash(m.c,m.r))s.tint=0xff8888;
    if(m.stun)T('zZ',x+10,y-10,8,'#ffd23f');
    if(m.mark&&G.round<=m.mark.until)T('◎',x-11,y-12,10,'#ffd23f');
    pbar(f,x,y+12,m.hp/m.max,'#e24444');pStatus(f,m,x,y);
    if(m.elite)T(m.hp+'/'+m.max,x,y-32,7,'#99ddff');
    if(m.affix&&AFFIX[m.affix]){f.beginFill(0);f.drawRect(Math.round(x+7),Math.round(y-25),7,7);f.endFill();f.beginFill(AFFIX[m.affix].col);f.drawRect(Math.round(x+8),Math.round(y-24),5,5);f.endFill();}
    if(m.burn&&Math.random()<.2)spawnP(x+rr(-6,6),y-6,rr(-6,6),rr(-40,-20),rr(.3,.5),'#ff8a20',2,-20);
  }
  // призраки погибших
  for(let i=GHOSTS.length-1;i>=0;i--){const gh=GHOSTS[i];const k=(now-gh.t)/(gh.big?900:450);if(k>=1){GHOSTS.splice(i,1);continue;}
    const t=tex(gh.spr);if(!t)continue;const s=PX.p2.get(t);s.position.set(Math.round(gh.x),Math.round(gh.y-4-k*14));s.alpha=1-k;s.tint=0xffaaaa;s.rotation=(gh.big?0:(k*.7*(gh.x%2>1?1:-1)));s.scale.set(1-k*.25);}
  // герои
  for(const h of G.heroes){
    if(!h.alive)continue;const ap=animPos('h'+h.id,h.id,h.c,h.r,dt),ux=unitFx(h.c,h.r,now),x=ap.x+ux[0],y=ap.y+ux[1];
    if(h.id===G.sel&&!G.busy){g.lineStyle(2,0xffd23f);g.drawPolygon(hexPts(x,y,HS-1));g.lineStyle(0);}
    const br=Math.sin(now/430+G.heroes.indexOf(h)*1.3);
    shadow(g,x-ux[0],y-ux[1]+10,11-br*.5,4-br*.2);
    g.lineStyle(1.5,CLSCOL[h.id]||0xffffff,h.id===G.sel?.95:.55);g.drawEllipse(x-ux[0],y-ux[1]+10,13,5);g.lineStyle(0);
    const gl=PX.pGlow.get(PX.glowTex);gl.position.set(Math.round(x),Math.round(y));gl.scale.set(1.7);gl.tint=0xffc880;gl.alpha=.15+.03*Math.sin(now/500+h.c);
    const ut=unitTexOf(h.d.spr,'h'+h.id,h,ap,now,true),s=PX.p2.get(ut.t);s.scale.set(ut.flip,1);
    s.position.set(Math.round(x),Math.round(y-4-Math.round(ap.hop*.5)));
    if(flash(h.c,h.r))s.tint=0xff8888;
    pbar(f,x,y+12,h.hp/st(h,'maxhp'),hpCol(h.hp/st(h,'maxhp')));pStatus(f,h,x,y);
    if(h.block){f.lineStyle(2,0x66deef);f.moveTo(x+13*Math.cos(-2.4),y-2+13*Math.sin(-2.4));f.arc(x,y-2,13,-2.4,-0.7);f.lineStyle(0);}
    if(h.id==='tank'&&guardOn(h)){f.lineStyle(2,0x4283ea);f.moveTo(x+15*Math.cos(.4),y-2+15*Math.sin(.4));f.arc(x,y-2,15,.4,2.7);f.lineStyle(0);}
    T(String(G.heroes.indexOf(h)+1),x-13,y-10,7,'#ffd23f');
  }
  // подсветки поверх
  hl.atk.forEach(k=>{const [c,r]=k.split(',').map(Number);const {x,y}=hc(c,r);f.lineStyle(2,(Math.floor(now/250)%2)?0xff5a4a:0xffa090);dashedHex(f,x,y,HS-1,4,3);f.lineStyle(0);});
  hl.exp.forEach(k=>{const [c,r]=k.split(',').map(Number);const {x,y}=hc(c,r);f.lineStyle(2,0xffd23f);f.drawPolygon(hexPts(x,y,HS-1));f.lineStyle(0);});
  if(hv){const {x,y}=hc(hv.c,hv.r);f.lineStyle(1,0xffffff,.75);f.drawPolygon(hexPts(x,y,HS-1));f.lineStyle(0);
    const cost=hl.move.get(key(hv.c,hv.r));if(cost&&!G.mode)T(cost+'ОД',x,y+3,7,0xffffff);}
  // намерения врагов
  if(G.showInt!==false&&!G.busy){
    const hm=hv?monsterAt(hv.c,hv.r):null;
    for(const m of G.monsters){
      const it=m.alive&&fogOK(m)&&m.int;if(!it)continue;
      const sel=hm===m,al=sel?1:.5,w=sel?2:1.5;const a0=hc(m.c,m.r);
      if(it.k==='stun'||it.k==='sleep'){T(it.k==='stun'?'zZ':'Zzz',a0.x+12,a0.y-16,7,it.k==='stun'?'#ffd23f':'#9aa0b8',al);continue;}
      if(it.k==='summon'){f.lineStyle(1.5,0xc58bff,al);f.drawEllipse(a0.x,a0.y+8,15,6);f.lineStyle(0);T('призыв',a0.x,a0.y-20,6,'#c58bff',al);continue;}
      const dest=hc(it.dc!=null?it.dc:m.c,it.dr!=null?it.dr:m.r);
      if(it.k==='heal'){const t=hc(it.tc,it.tr);f.lineStyle(w,0x6bff8a,al);f.moveTo(a0.x,a0.y);f.lineTo(t.x,t.y);f.lineStyle(0);T('лечит',t.x,t.y-18,6,'#6bff8a',al);continue;}
      const moves=dest.x!==a0.x||dest.y!==a0.y;
      if(moves){f.lineStyle(w,0x9fb4ff,al*.9);const dx=dest.x-a0.x,dy=dest.y-a0.y,L=Math.hypot(dx,dy);for(let d=0;d<L;d+=8){const e=Math.min(d+4,L);f.moveTo(a0.x+dx*d/L,a0.y+dy*d/L);f.lineTo(a0.x+dx*e/L,a0.y+dy*e/L);}
        f.lineStyle(1.5,0x9fb4ff,al);dashedHex(f,dest.x,dest.y,HS-6,3,3);f.lineStyle(0);}
      if(it.k==='melee'||it.k==='ranged'){
        const t=hc(it.tc,it.tr),col=it.k==='melee'?0xff5a4a:0xffa040;const dx=t.x-dest.x,dy=t.y-dest.y,L=Math.hypot(dx,dy)||1;const ux=dx/L,uy=dy/L;
        const ex=t.x-ux*10,ey=t.y-uy*10,sx=dest.x+ux*8,sy=dest.y+uy*8;
        f.lineStyle(w,col,al);f.moveTo(sx,sy);f.lineTo(ex,ey);f.lineStyle(0);
        f.beginFill(col,al);f.drawPolygon([ex+ux*6,ey+uy*6,ex-uy*4,ey+ux*4,ex+uy*4,ey-ux*4]);f.endFill();
        if(it.dmg>0)T('-'+it.dmg,t.x+10,t.y-14,sel?9:7,col===0xff5a4a?'#ff8a7a':'#ffc070',al);
      }
    }
  }
  // снаряды
  for(let i=PROJ.length-1;i>=0;i--){const p=PROJ[i];const d=Math.hypot(p.x1-p.x0,p.y1-p.y0);const dur=Math.max(140,d*2.2);const k=(now-p.t)/dur;
    if(k>=1){PROJ.splice(i,1);if(p.kind!=='arrow'){burstAt(p.x1,p.y1+6,p.kind==='fire'?'fire':p.kind==='ice'?'ice':'magic');efx(p.kind==='ice'?'shards':'ring',p.x1,p.y1+6,420,p.kind==='fire'?0xff8a20:p.kind==='ice'?0x99ddff:0xc58bff,{r:18});if(p.kind==='magic')efx('bolt',p.x1,p.y1,260,0xe2c4ff);}continue;}
    const x=p.x0+(p.x1-p.x0)*k,y=p.y0+(p.y1-p.y0)*k-Math.sin(k*Math.PI)*(p.kind==='arrow'?d*.12:0);
    if(p.kind==='arrow'){const ang=Math.atan2(p.y1-p.y0,p.x1-p.x0);f.lineStyle(2,0xe8d8b0);f.moveTo(x-Math.cos(ang)*7,y-Math.sin(ang)*7);f.lineTo(x,y);f.lineStyle(0);f.beginFill(0xffffff);f.drawRect(Math.round(x)-1,Math.round(y)-1,2,2);f.endFill();}
    else{const col=p.kind==='fire'?0xff8a20:p.kind==='ice'?0x99ddff:0xc58bff;f.beginFill(col,.35);f.drawCircle(x,y,6);f.endFill();f.beginFill(col);f.drawCircle(x,y,3);f.endFill();
      if(Math.random()<.7)spawnP(x,y,rr(-15,15),rr(-15,15),rr(.2,.4),col,2,0);}
  }
  // метки игроков
  for(let i=PINGS.length-1;i>=0;i--){const p=PINGS[i];const age=now-p.t;if(age>3500){PINGS.splice(i,1);continue;}
    const {x,y}=hc(p.c,p.r);const k=(age%900)/900;const col=hx(p.col);
    f.lineStyle(2,col,1-k);f.drawCircle(x,y,6+k*18);f.lineStyle(2,col);f.drawPolygon(hexPts(x,y,HS-2));f.lineStyle(0);
    f.beginFill(col);f.drawPolygon([x,y-4,x-5,y-13,x+5,y-13]);f.endFill();T(p.name,x,y-HS-4,7,col);}
  // фон: частицы окружения
  const amb=SET.calm?['#fff',0]:({1:['#e8f070',16],2:['#c58bff',18],3:['#ffffff',26],4:['#ff8a20',22],5:['#b8e070',18],6:['#9aff60',22]})[G.loc]||['#fff',0];
  while(AMB.length<amb[1])AMB.push({x:rr(0,W),y:rr(0,H),ph:rr(0,6.28),v:rr(6,18)});
  AMB.length=Math.min(AMB.length,amb[1]);
  for(const a of AMB){
    if(G.loc===3){a.y+=a.v*dt;a.x+=Math.sin(now/900+a.ph)*8*dt;if(a.y>H){a.y=-4;a.x=rr(0,W);}}
    else if(G.loc===4){a.y-=a.v*dt*1.6;a.x+=Math.sin(now/700+a.ph)*10*dt;if(a.y<-4){a.y=H+4;a.x=rr(0,W);}}
    else{a.x+=Math.sin(now/1300+a.ph)*9*dt;a.y+=Math.cos(now/1100+a.ph)*7*dt;if(a.x<0)a.x=W;if(a.x>W)a.x=0;if(a.y<0)a.y=H;if(a.y>H)a.y=0;}
    const al=G.loc===1||G.loc===2||G.loc===5||G.loc===6?(.35+.5*Math.sin(now/500+a.ph)):.55;
    f.beginFill(hx(amb[0]),Math.max(0,al));f.drawRect(Math.round(a.x),Math.round(a.y),G.loc===3?2:2,2);f.endFill();
  }
  // эффекты (дуги ударов, кольца, лучи)
  for(let i=EFX.length-1;i>=0;i--){const e=EFX[i];const k=(now-e.t)/e.dur;if(k>=1){EFX.splice(i,1);continue;}if(k<0)continue;const a=1-k,eo=1-Math.pow(1-k,2);
    if(e.k==='slash'){f.lineStyle(3,e.col,a);f.moveTo(e.x+Math.cos(e.ang-1.3)*13,e.y+Math.sin(e.ang-1.3)*13);f.arc(e.x,e.y,13,e.ang-1.3,e.ang-1.3+2.6*Math.min(1,k*1.8));f.lineStyle(1.5,0xffe27a,a);f.moveTo(e.x+Math.cos(e.ang-1.1)*9,e.y+Math.sin(e.ang-1.1)*9);f.arc(e.x,e.y,9,e.ang-1.1,e.ang-1.1+2.2*Math.min(1,k*1.8));f.lineStyle(0);}
    else if(e.k==='ring'){f.lineStyle(2,e.col,a);f.drawEllipse(e.x,e.y,(e.r||20)*eo,(e.r||20)*eo*.45);f.lineStyle(0);}
    else if(e.k==='flash'){f.beginFill(e.col,.55*a);f.drawCircle(e.x,e.y,(e.r||30)*(.5+eo*.6));f.endFill();}
    else if(e.k==='beam'){const w=8*(1-k*.6);f.beginFill(e.col,.35*a);f.drawRect(e.x-w/2,e.y-60*Math.min(1,k*3),w,60*Math.min(1,k*3)+8);f.endFill();f.beginFill(0xffffff,.5*a);f.drawRect(e.x-w/5,e.y-60*Math.min(1,k*3),w/2.5,60*Math.min(1,k*3)+8);f.endFill();}
    else if(e.k==='shards'){f.beginFill(e.col,a);for(let q=0;q<6;q++){const an=q/6*6.28+.4,rr_=6+eo*16;const bx=e.x+Math.cos(an)*rr_,by=e.y+Math.sin(an)*rr_*.8;f.drawPolygon([bx,by-4,bx+2,by,bx,by+3,bx-2,by]);}f.endFill();}
    else if(e.k==='bolt'){f.lineStyle(2.5,e.col,a);let bx=e.x+rr(-6,6),by=e.y-54;f.moveTo(bx,by);const n=5;for(let q=1;q<=n;q++){bx=e.x+(q===n?0:rr(-8,8));by=e.y-54+q*(54/n);f.lineTo(bx,by);}f.lineStyle(1,0xffffff,a);f.moveTo(e.x,e.y-54);f.lineTo(e.x,e.y);f.lineStyle(0);}
  }
  // дождь
  if(G.weather==='rain'&&!SET.calm){f.lineStyle(1.2,0xb8d4ff,.5);for(let i=0;i<110;i++){const x=((i*97.3+now*.05*(1+i%3))%(W+40))-20,y=((i*53.7+now*.42*(1+(i%4)*.15))%(H+40))-20;f.moveTo(x,y);f.lineTo(x-3,y+9);}f.lineStyle(0);}
  // частицы
  for(let i=PART.length-1;i>=0;i--){const p=PART[i];p.t+=dt;if(p.t>=p.life){PART.splice(i,1);continue;}
    p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;f.beginFill(p.col,1-p.t/p.life);f.drawRect(Math.round(p.x-p.size/2),Math.round(p.y-p.size/2),p.size,p.size);f.endFill();}
  // всплывающие числа
  G.fx=G.fx.filter(q=>now-q.t<1100);
  for(const q of G.fx){const age=now-q.t,a=1-age/1100;const yy=q.y-Math.min(age,500)/14-Math.max(0,age-500)/60;
    const col=q.txt[0]==='-'?'#ff6b6b':q.txt[0]==='+'?'#6bff8a':(q.col&&q.col!=='#fff'?q.col:'#ffe27a');
    const num=/^[-+]\d+$/.test(q.txt)?Math.abs(parseInt(q.txt)):0;const sz=age<110?13:(num>=8?13:num>=4?11:9);const al=Math.max(0,Math.min(1,a*1.4));
    [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(([ox,oy])=>T(q.txt,q.x+ox,yy+oy,sz,0x000000,al));T(q.txt,q.x,yy,sz,col,al);}
  if(G.fog&&G.vis){for(const row of G.grid)for(const cell of row){if(cell.void)continue;const k=key(cell.c,cell.r);if(G.vis.has(k))continue;const {x,y}=hc(cell.c,cell.r);
    f.beginFill(0x05030a,G.seen&&G.seen[k]?.55:1);f.drawPolygon(hexPts(x,y,HS+1));f.endFill();}}
  PX.pGlow.end();PX.p1.end();PX.p2.end();
  for(const k in PX.tp){const pl=PX.tp[k];for(let i=pl.n;i<pl.a.length;i++)pl.a[i].visible=false;}
  PX.vig.width=CAM.vw;PX.vig.height=CAM.vh;
  composeFrame(th,now,dt);
}
/* --- финальная сборка кадра: чёткие пиксели, свет, туман --- */
const LIGHT_AMB={1:[.82,.88,.80],2:[.68,.64,.78],3:[.78,.86,.98],4:[.86,.68,.62],5:[.68,.80,.70],6:[.62,.70,.58],7:[.84,.84,.92]};
function lightsList(){
  const L=[];
  for(const h of G.heroes)if(h.alive)L.push([h.c,h.r,h.id===G.sel?110:90,0xfff0d0,.55]);
  for(const row of G.grid)for(const c of row){
    if(c.void)continue;
    if(c.terr==='lava')L.push([c.c,c.r,55,0xff7a20,.5]);else if(c.terr==='acid')L.push([c.c,c.r,45,0x60ff40,.32]);
    if(c.zone==='exit'&&hasExit())L.push([c.c,c.r,40,0xffd23f,.28]);
    if(c.portal||c.rexit)L.push([c.c,c.r,52,0xc58bff,.42]);
  }
  for(const m of G.monsters){if(!m.alive||!fogOK(m))continue;
    if(m.id==='dragon')L.push([m.c,m.r,160,0xff5030,.6]);
    else if(m.burn>0||m.affix==='fire'||m.id==='wisp')L.push([m.c,m.r,55,0xff8a20,.5]);
    else if(m.id==='icespirit'||m.id==='icequeen'||m.affix==='frost')L.push([m.c,m.r,48,0x99ddff,.38]);
    else if(m.elite)L.push([m.c,m.r,60,0x88ddff,.3]);}
  if(G.npc&&G.npc.alive)L.push([G.npc.c,G.npc.r,60,0x9fe0ff,.35]);
  if(G.tele)G.tele.cells.forEach(k=>{const [c,r]=k.split(',').map(Number);L.push([c,r,40,0xff5a14,.45]);});
  return L;
}
function composeFrame(th,now,dt){
  const R=PX.app.renderer,res=R.resolution;
  const crisp=SET.crisp!==false;
  const sh=CAM.shake>0.1?(Math.random()-.5)*CAM.shake:0,sv=CAM.shake>0.1?(Math.random()-.5)*CAM.shake:0;
  const Dd=CAM.S*res,direct=crisp&&Math.abs(Dd-Math.round(Dd))<.01;
  if(crisp&&!direct){
    const D=CAM.S*res,k=Math.max(1,Math.floor(D+0.02)),f=k/D;
    const rw=Math.max(1,Math.ceil(CAM.vw*res*f)),rh=Math.max(1,Math.ceil(CAM.vh*res*f));
    if(!PX.rt||PX.rt.width!==rw||PX.rt.height!==rh){if(PX.rt)PX.rt.destroy(true);PX.rt=PIXI.RenderTexture.create({width:rw,height:rh,scaleMode:PIXI.SCALE_MODES.LINEAR,resolution:1});PX.rtS.texture=PX.rt;}
    PX.world.scale.set(k);PX.world.position.set(Math.round((CAM.tx+sh)*k/CAM.S),Math.round((CAM.ty+sv)*k/CAM.S));
    R.render(PX.world,{renderTexture:PX.rt,clear:true});
    PX.rtS.visible=true;PX.rtS.position.set(0,0);PX.rtS.width=CAM.vw;PX.rtS.height=CAM.vh;
  }else{
    PX.rtS.visible=false;if(PX.rtS.filters&&!PX.wf){PX.wf=1;PX.world.filters=null;}PX.world.scale.set(CAM.S);PX.world.position.set(Math.round(CAM.tx+sh),Math.round(CAM.ty+sv));
    R.render(PX.world,{clear:true});
  }
  // свет
  let amb=SET.light===false?null:(LIGHT_AMB[G.loc]||null);
  if(amb&&G.weather){const k=G.weather==='night'?.62:G.weather==='rain'?.88:.94;amb=amb.map(v=>v*k);}
  if(amb){
    const lw=Math.max(1,Math.ceil(CAM.vw/2)),lh=Math.max(1,Math.ceil(CAM.vh/2));
    if(!PX.lrt||PX.lrt.width!==lw||PX.lrt.height!==lh){if(PX.lrt)PX.lrt.destroy(true);PX.lrt=PIXI.RenderTexture.create({width:lw,height:lh,scaleMode:PIXI.SCALE_MODES.LINEAR,resolution:1});PX.lightS.texture=PX.lrt;}
    const col=(Math.round(amb[0]*255)<<16)|(Math.round(amb[1]*255)<<8)|Math.round(amb[2]*255);
    PX.lightBg.clear();PX.lightBg.beginFill(col);PX.lightBg.drawRect(0,0,lw,lh);PX.lightBg.endFill();
    PX.pLight.begin();
    const fl=SET.calm?0:1;
    for(const [c,r,rad,tint,a] of lightsList()){const p=hc(c,r);const x=(p.x*CAM.S+CAM.tx)/2,y=(p.y*CAM.S+CAM.ty)/2;
      const rr2=rad*CAM.S/2;if(x<-rr2||y<-rr2||x>lw+rr2||y>lh+rr2)continue;
      const sp=PX.pLight.get(PX.glowTex);sp.position.set(x,y);sp.scale.set(rr2/32);sp.tint=tint;sp.alpha=a*(1+fl*.06*Math.sin(now/180+c*3+r));}
    PX.pLight.end();
    R.render(PX.lightC,{renderTexture:PX.lrt,clear:true});
    PX.lightS.visible=true;PX.lightS.width=CAM.vw;PX.lightS.height=CAM.vh;
  }else PX.lightS.visible=false;
  // туман над топями и катакомбами
  PX.pFog.begin();
  if(SET.light!==false&&!SET.calm&&(G.loc===5||G.loc===6||G.weather==='fog')){
    if(PX.fog.length!==10||PX.fogLoc!==G.loc+'|'+G.weather){PX.fogLoc=G.loc+'|'+G.weather;PX.fog=Array.from({length:10},()=>({x:Math.random()*W,y:Math.random()*H,v:6+Math.random()*10,s:4+Math.random()*4,ph:Math.random()*6}));}
    const tint=G.weather==='fog'?0xe0e8f0:G.loc===5?0xc8f0d0:0xb8ff90;
    for(const b of PX.fog){b.x+=b.v*dt;if(b.x>W+120)b.x=-120;const sp=PX.pFog.get(PX.glowTex);
      sp.position.set(b.x*CAM.S+CAM.tx,(b.y+Math.sin(now/2400+b.ph)*10)*CAM.S+CAM.ty);sp.scale.set(b.s*CAM.S);sp.tint=tint;sp.alpha=G.weather==='fog'?.13:G.loc===5?.09:.07;}
  }
  PX.pFog.end();
  R.render(PX.app.stage,{clear:crisp&&!direct});
}

let LOOPERR=0;
function loop(){try{if(PX)renderPixi();LOOPERR=0;}catch(e){if(LOOPERR++<3)console.error('render error',e);}requestAnimationFrame(loop);}
setInterval(musicTick,500);
setInterval(()=>{
  const e=$('#tmr');
  if(e&&G.deadline){const l=Math.max(0,Math.ceil((G.deadline-Date.now())/1000));e.textContent='⏱ '+l+' с';e.style.color=l<=10?'#ff8a7a':'#9fe0ff';}
  if(NET.role==='host'&&NET.started&&NET.timer>0&&G.grid&&G.deadline&&!G.over&&!G.busy&&!G.camp&&!NET.gmodal&&Date.now()>=G.deadline){
    G.deadline=0;needList().forEach(p=>{G.ready[p]=true;});log('⏱ Время раунда вышло — раунд закрывается.');endRound();
  }
},500);
