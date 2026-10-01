/* Движок «объёмного» пиксель-арта: форма -> материал -> авто-светотень (свет сверху-слева), цветная обводка. */
const MAT={
 steel:['#1f2431','#414b63','#7480a0','#bcc8e4'], steelD:['#1c202b','#363e52','#5e6a86','#9aa6c4'],
 gold:['#6f4608','#b0771a','#f0bc2c','#fff0a0'], red:['#4e101c','#98222f','#d84848','#ff9c8c'],
 blue:['#122658','#2350a6','#4a88ec','#aad2ff'], green:['#143418','#2a6a30','#50b04c','#aae870'],
 leather:['#2a170c','#59361a','#98642f','#cf9a58'], skin:['#6e4028','#be8860','#f0c096','#ffe6cc'],
 purple:['#27124a','#5a2a8c','#a45ad8','#e0aaff'], white:['#80869e','#c4cadc','#eef0fa','#ffffff'],
 hair:['#241006','#54300e','#86562a','#be8a50'], dark:['#0c0812','#1a1424','#2c2440','#4a4268'],
 glow:['#217f98','#5cd6e8','#b4f4ff','#ffffff'], wood:['#2b1a0c','#5a3a1a','#8c5e2c','#b88a50'],
 bone:['#5c5648','#a89f86','#e0d8be','#fff8e4'], orange:['#6a2a08','#c25a14','#f28a2a','#ffd070'],
 gray:['#2a2c34','#555a68','#8a90a2','#c4c9d8'], teal:['#0e3a3a','#1e7a74','#3cc0b0','#9af0e0'],
 ice:['#2a5a8a','#5aa0d8','#a8dcff','#f0fbff'], black:['#05030a','#120c1c','#221a34','#3a2e54'],
 slime:['#14502a','#2ea850','#6ee080','#c8ffd0'], brown:['#2b1a0c','#5e3d1d','#926232','#c89558'],
 crimson:['#3a0a14','#7a1428','#b92a3e','#f06a7a'], pink:['#7a2a4a','#c85a8a','#f08ab8','#ffc8de'],
 yellow:['#7a5a08','#c89a16','#f6d23a','#fff4a0'],
 wolfgray:['#1f2129','#40444f','#69707f','#a2a9ba'], orcgreen:['#1a3216','#3a6628','#68a046','#a6d67c'],
 trollskin:['#1c2e26','#38583f','#5c8a62','#96c49a'], ogreskin:['#40301a','#86662a','#c29a48','#ecca7c'],
 spirit:['#4666a0','#88a8d8','#cde0ff','#f6fbff'], darkplate:['#0c0912','#26203a','#4a4264','#82789e'],
 stone:['#2a2c32','#575c68','#8a909e','#bfc5d2'], moss:['#1a3014','#35602a','#5c9a42','#98d070'],
 fur:['#4a5a7a','#8498bc','#c2d0ea','#f2f7ff'], wraithc:['#150c28','#33185a','#5e2e96','#a070e0'],
 bloodrobe:['#2c0810','#661222','#a62438','#e0586a'],
 dragonred:['#240610','#5a101e','#9a2230','#cf4a3a'], dragonwing:['#18040e','#42101c','#701a2a','#a02a3a'],
};
const hex2rgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const mixRGB=(a,b,k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k];
function mkArt(o){
  const W=o.w||36,H=o.h||36,S=o.scale||1;
  const buf=new Array(W*H).fill(null);
  const put=(x,y,m,t)=>{x=Math.floor(x);y=Math.floor(y);if(x<0||y<0||x>=W||y>=H)return;
    if(m===null){buf[y*W+x]=null;return;}
    if(typeof m==='string'&&m[0]==='#'){buf[y*W+x]={c:hex2rgb(m),ol:mixRGB(hex2rgb(m),[10,6,20],.5)};return;}
    const r=MAT[m];const i=Math.max(0,Math.min(3,Math.floor(t*4)));buf[y*W+x]={c:hex2rgb(r[i]),ol:hex2rgb(r[0]),m:m};};
  const clamp=v=>Math.max(0,Math.min(1,v));
  const mir=q=>{const m=Object.assign({},q);const X=W;
    if(q.t==='e')m.cx=X-q.cx;else if(q.t==='c'||q.t==='r'||q.t==='cut')m.x=X-q.x-q.w;else if(q.t==='p')m.pts=q.pts.map(([x,y])=>[X-x,y]);
    else if(q.t==='l'){m.x0=X-q.x0;m.x1=X-q.x1;}else if(q.t==='px')m.x=X-1-q.x;return m;};
  const parts=o.mirror?o.parts.flatMap(q=>q.c1?[q]:[q,mir(q)]):o.parts;
  for(const p of parts){
    if(p.t==='e'){ // эллипсоид
      const rx=p.rx,ry=p.ry;
      for(let y=Math.floor(p.cy-ry);y<=Math.ceil(p.cy+ry);y++)for(let x=Math.floor(p.cx-rx);x<=Math.ceil(p.cx+rx);x++){
        const nx=(x+.5-p.cx)/rx,ny=(y+.5-p.cy)/ry,d=nx*nx+ny*ny;if(d>1)continue;
        const nz=Math.sqrt(1-d);put(x,y,p.m,clamp((-.45*nx-.62*ny+.62*nz+.28)/1.1+(p.b||0)));}
    }else if(p.t==='c'){ // горизонтальный цилиндр: x,y,w,h
      for(let y=p.y;y<p.y+p.h;y++)for(let x=p.x;x<p.x+p.w;x++){
        const nx=((x+.5)-(p.x+p.w/2))/(p.w/2);const nz=Math.sqrt(Math.max(0,1-nx*nx));
        put(x,y,p.m,clamp((-.75*nx+.65*nz)/1.0*.9+.18+(.5-(y-p.y)/p.h)*.12+(p.b||0)));}
    }else if(p.t==='r'){ // плоский прямоугольник с гранями
      for(let y=p.y;y<p.y+p.h;y++)for(let x=p.x;x<p.x+p.w;x++){
        let t=.5+(.5-(y-p.y)/p.h)*.22;if(y===p.y)t+=.32;if(x===p.x)t+=.2;if(y===p.y+p.h-1)t-=.22;if(x===p.x+p.w-1)t-=.16;put(x,y,p.m,clamp(t+(p.b||0)));}
    }else if(p.t==='p'){ // многоугольник
      const xs=p.pts.map(q=>q[0]),ys=p.pts.map(q=>q[1]);const x0=Math.floor(Math.min(...xs)),x1=Math.ceil(Math.max(...xs)),y0=Math.floor(Math.min(...ys)),y1=Math.ceil(Math.max(...ys));
      const inside=(px,py)=>{let c=false;for(let i=0,j=p.pts.length-1;i<p.pts.length;j=i++){const [xi,yi]=p.pts[i],[xj,yj]=p.pts[j];if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi))c=!c;}return c;};
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){if(!inside(x+.5,y+.5))continue;
        const u=(x-x0)/Math.max(1,x1-x0),v=(y-y0)/Math.max(1,y1-y0);
        let t=.62-.38*v-.28*u+(p.b||0);if(!inside(x-.5,y+.5)||!inside(x+.5,y-.5))t+=.22;if(!inside(x+1.5,y+.5)||!inside(x+.5,y+1.5))t-=.14;put(x,y,p.m,clamp(t));}
    }else if(p.t==='l'){ // линия толщиной w
      const n=Math.max(Math.abs(p.x1-p.x0),Math.abs(p.y1-p.y0))*2+1,w=p.w||1;
      for(let i=0;i<=n;i++){const x=p.x0+(p.x1-p.x0)*i/n,y=p.y0+(p.y1-p.y0)*i/n;
        for(let dy=0;dy<w;dy++)for(let dx=0;dx<w;dx++)put(x+dx-(w-1)/2,y+dy-(w-1)/2,p.m,clamp((p.k==null?.6:p.k)+(dx===0&&dy===0?.18:0)-(dx===w-1&&dy===w-1&&w>1?.2:0)));}
    }else if(p.t==='px'){ put(p.x,p.y,p.c,0);
    }else if(p.t==='cut'){ for(let y=p.y;y<p.y+p.h;y++)for(let x=p.x;x<p.x+p.w;x++)put(x,y,null,0); }
  }
  // сборка: контур + масштабирование
  const c=document.createElement('canvas');c.width=(W+2)*S;c.height=(H+2)*S;const g=c.getContext('2d');
  const at=(x,y)=>(x<0||y<0||x>=W||y>=H)?null:buf[y*W+x];
  for(let y=-1;y<=H;y++)for(let x=-1;x<=W;x++){
    const p=at(x,y);let col;
    if(p)col=p.c;
    else{const ns=[at(x,y-1),at(x,y+1),at(x-1,y),at(x+1,y),at(x-1,y-1),at(x+1,y-1),at(x-1,y+1),at(x+1,y+1)].filter(Boolean);
      if(!ns.length)continue;const n=ns[0];col=mixRGB(n.ol,[8,5,16],.45);}
    g.fillStyle='rgb('+(col[0]|0)+','+(col[1]|0)+','+(col[2]|0)+')';g.fillRect((x+1)*S,(y+1)*S,S,S);
  }
  return c;
}
