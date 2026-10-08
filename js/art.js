'use strict';
/*ART-BEGIN*/
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
 bog:['#1a2a14','#3a5a28','#5e8a3c','#9cc86a'], mud:['#24180e','#4a3420','#6e5030','#9a7a50'], acid:['#18401a','#38a830','#8ae850','#ddffa0'],
 crocgreen:['#14261a','#2e5232','#4e8248','#8cba70'], flesh:['#26362a','#506a54','#84a488','#b8d2b8'], chitin:['#3a1a0a','#7a3a14','#b8601e','#f09a50'],
 witchc:['#102a2a','#1e5a50','#34906e','#7ad0a0'], rat:['#2a2220','#544842','#867a70','#bcb0a4'],
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
/* Герои 36×36. Лицом к зрителю, свет сверху-слева. */
const ART={};
const tankFn=c=>mkArt({parts:[
 // ноги и сапоги
 {t:'c',x:12,y:27,w:5,h:6,m:c.legs},{t:'c',x:19,y:27,w:5,h:6,m:c.legs},
 {t:'r',x:11,y:32,w:7,h:3,m:'dark'},{t:'r',x:18,y:32,w:7,h:3,m:'dark'},{t:'r',x:12,y:29,w:5,h:1,m:c.trim},{t:'r',x:19,y:29,w:5,h:1,m:c.trim},
 // плащ сзади
 {t:'p',pts:[[24,15],[31,21],[30,31],[25,29]],m:c.cape,b:-.1},
 // торс
 {t:'c',x:11,y:15,w:14,h:13,m:c.armor},{t:'r',x:11,y:25,w:14,h:3,m:'leather'},{t:'r',x:16,y:25,w:4,h:3,m:c.trim},
 {t:'r',x:17,y:17,w:2,h:7,m:c.legs},{t:'r',x:12,y:20,w:12,h:1,m:c.trim},
 // наплечники
 {t:'e',cx:10,cy:17,rx:4.5,ry:3.8,m:c.armor},{t:'e',cx:26,cy:17,rx:4.5,ry:3.8,m:c.armor},
 {t:'r',x:6,y:19,w:9,h:1,m:c.trim},{t:'r',x:22,y:19,w:9,h:1,m:c.trim},
 // голова: шлем
 {t:'e',cx:18,cy:9,rx:6.2,ry:7,m:c.armor},{t:'r',x:12,y:11,w:12,h:2,m:c.trim},{t:'r',x:13,y:8,w:10,h:3,m:'dark'},
 {t:'px',x:15,y:9,c:c.eye},{t:'px',x:20,y:9,c:c.eye},{t:'r',x:17,y:8,w:2,h:6,m:c.legs},
 {t:'p',pts:[[18,0],[22,3],[21,8],[18,5],[15,8],[14,3]],m:c.plume},
 // щит слева
 {t:'p',pts:[[2,16],[11,15],[11,26],[7,32],[3,26]],m:c.shield},{t:'p',pts:[[2,16],[3,16],[5,30],[3,26]],m:c.trim,b:-.15},
 {t:'r',x:6,y:17,w:2,h:11,m:c.trim},{t:'r',x:3,y:21,w:8,h:2,m:c.trim},
 // меч справа
 {t:'r',x:29,y:5,w:3,h:17,m:c.armor},{t:'r',x:30,y:5,w:1,h:16,m:c.edge},{t:'r',x:27,y:21,w:7,h:2,m:c.trim},{t:'r',x:29,y:23,w:3,h:4,m:'leather'},{t:'e',cx:30.5,cy:28,rx:2,ry:1.5,m:c.trim},
 {t:'c',x:26,y:20,w:5,h:5,m:c.legs},
]});
ART.tank=()=>tankFn({legs:'steelD',armor:'steel',edge:'white',cape:'red',shield:'blue',trim:'gold',plume:'red',eye:'#ffe27a'});
ART.sword=()=>mkArt({parts:[
 // ноги
 {t:'c',x:12,y:26,w:5,h:7,m:'leather',b:-.05},{t:'c',x:19,y:26,w:5,h:7,m:'leather',b:-.05},
 {t:'r',x:11,y:31,w:7,h:4,m:'brown'},{t:'r',x:18,y:31,w:7,h:4,m:'brown'},{t:'r',x:11,y:31,w:7,h:1,m:'leather',b:.1},{t:'r',x:18,y:31,w:7,h:1,m:'leather',b:.1},
 // тело: красная туника
 {t:'c',x:10,y:15,w:16,h:13,m:'red'},{t:'r',x:10,y:25,w:16,h:3,m:'leather'},{t:'r',x:16,y:25,w:4,h:3,m:'gold'},
 {t:'l',x0:12,y0:16,x1:24,y1:26,w:2,m:'leather',k:.5},
 // руки
 {t:'e',cx:9,cy:20,rx:3,ry:5,m:'skin'},{t:'r',x:6,y:23,w:5,h:3,m:'steelD'},
 {t:'e',cx:27,cy:19,rx:3,ry:4.5,m:'skin'},{t:'r',x:25,y:16,w:5,h:3,m:'steelD'},
 // голова
 {t:'e',cx:18,cy:9,rx:5.8,ry:6.2,m:'skin'},
 {t:'e',cx:18,cy:5.5,rx:6.6,ry:4.2,m:'hair'},{t:'r',x:11,y:7,w:3,h:5,m:'hair'},{t:'r',x:22,y:7,w:3,h:4,m:'hair'},
 {t:'r',x:12,y:7,w:12,h:2,m:'red'},{t:'px',x:15,y:10,c:'#1a1424'},{t:'px',x:20,y:10,c:'#1a1424'},{t:'r',x:17,y:13,w:2,h:1,m:'skin',b:-.3},
 // меч над головой, справа
 {t:'l',x0:28,y0:20,x1:33,y1:1,w:3,m:'steel',k:.7},{t:'l',x0:29,y0:19,x1:33,y1:3,w:1,m:'white',k:.9},
 {t:'r',x:25,y:19,w:7,h:2,m:'gold'},{t:'r',x:27,y:21,w:3,h:4,m:'leather'},
 // круглый баклер слева
 {t:'e',cx:6,cy:23,rx:5,ry:5.5,m:'wood'},{t:'e',cx:6,cy:23,rx:3.2,ry:3.6,m:'steel'},{t:'e',cx:6,cy:23,rx:1.4,ry:1.6,m:'gold'},
]});
ART.archer=()=>mkArt({parts:[
 {t:'c',x:12,y:27,w:5,h:6,m:'brown'},{t:'c',x:19,y:27,w:5,h:6,m:'brown'},
 {t:'r',x:11,y:31,w:7,h:4,m:'leather'},{t:'r',x:18,y:31,w:7,h:4,m:'leather'},
 // колчан за спиной
 {t:'p',pts:[[25,10],[30,12],[28,26],[24,24]],m:'leather'},{t:'l',x0:26,y0:11,x1:25,y1:6,w:1,m:'wood'},{t:'l',x0:28,y0:12,x1:29,y1:7,w:1,m:'wood'},
 {t:'px',x:25,y:5,c:'#e34540'},{t:'px',x:29,y:6,c:'#e34540'},
 // плащ/капюшон
 {t:'p',pts:[[9,15],[27,15],[29,29],[7,29]],m:'green',b:-.15},
 {t:'c',x:11,y:15,w:14,h:12,m:'green'},{t:'r',x:11,y:24,w:14,h:2,m:'leather'},{t:'r',x:16,y:24,w:4,h:2,m:'gold'},
 {t:'p',pts:[[13,15],[23,15],[18,22]],m:'leather'},
 // руки
 {t:'e',cx:9,cy:19,rx:3,ry:5,m:'green'},{t:'e',cx:7,cy:23,rx:2.5,ry:2.5,m:'skin'},
 {t:'e',cx:27,cy:19,rx:3,ry:5,m:'green'},
 // лицо в капюшоне
 {t:'e',cx:18,cy:9,rx:6.8,ry:7.4,m:'green'},
 {t:'e',cx:18,cy:11,rx:4.2,ry:4.4,m:'skin'},{t:'px',x:16,y:11,c:'#1a1424'},{t:'px',x:20,y:11,c:'#1a1424'},{t:'r',x:17,y:14,w:2,h:1,m:'skin',b:-.3},
 {t:'p',pts:[[18,0],[24,5],[23,9],[18,4],[13,9],[12,5]],m:'green',b:.05},{t:'px',x:18,y:2,c:'#e34540'},
 // лук слева
 {t:'l',x0:4,y0:6,x1:2,y1:20,w:2,m:'wood',k:.65},{t:'l',x0:2,y0:20,x1:5,y1:33,w:2,m:'wood',k:.65},{t:'l',x0:4,y0:6,x1:5,y1:33,w:1,m:'white',k:.7},
 {t:'l',x0:5,y0:19,x1:15,y1:19,w:1,m:'wood',k:.8},{t:'r',x:14,y:18,w:2,h:3,m:'steel'},{t:'px',x:5,y:19,c:'#e34540'},
]});
ART.mage=()=>mkArt({parts:[
 // мантия
 {t:'p',pts:[[13,15],[23,15],[29,34],[7,34]],m:'purple'},{t:'p',pts:[[13,15],[16,15],[13,34],[7,34]],m:'purple',b:.12},
 {t:'p',pts:[[18,18],[19,18],[22,34],[14,34]],m:'purple',b:-.15},
 {t:'r',x:11,y:23,w:14,h:2,m:'gold'},{t:'r',x:8,y:32,w:20,h:2,m:'gold'},{t:'e',cx:18,cy:24,rx:2,ry:2,m:'glow'},
 // руки
 {t:'e',cx:10,cy:20,rx:3.2,ry:5,m:'purple'},{t:'e',cx:26,cy:19,rx:3.2,ry:5,m:'purple'},
 {t:'e',cx:27,cy:23,rx:2.4,ry:2.4,m:'skin'},{t:'e',cx:9,cy:25,rx:2.4,ry:2.4,m:'skin'},
 // голова и борода
 {t:'e',cx:18,cy:11,rx:5.2,ry:5.4,m:'skin'},{t:'px',x:16,y:11,c:'#1a1424'},{t:'px',x:20,y:11,c:'#1a1424'},{t:'r',x:17,y:12,w:2,h:1,m:'skin',b:-.35},
 {t:'p',pts:[[13,12],[23,12],[21,24],[18,27],[15,24]],m:'white'},{t:'r',x:16,y:12,w:4,h:2,m:'skin',b:-.2},
 // шляпа
 {t:'e',cx:18,cy:7.5,rx:9.5,ry:2.6,m:'purple',b:-.1},
 {t:'p',pts:[[18,-1],[24,7],[12,7]],m:'purple'},{t:'p',pts:[[25,-1],[24,2],[22,0]],m:'purple',b:.1},{t:'r',x:12,y:6,w:12,h:2,m:'gold'},{t:'px',x:18,y:3,c:'#fff0a0'},
 // посох справа с кристаллом
 {t:'l',x0:31,y0:12,x1:31,y1:29,w:2,m:'wood',k:.6},
 {t:'e',cx:31,cy:9,rx:3.6,ry:3.8,m:'glow'},{t:'e',cx:31,cy:9,rx:1.6,ry:1.8,m:'white'},
 {t:'px',x:27,y:5,c:'#b4f4ff'},{t:'px',x:35,y:7,c:'#b4f4ff'},{t:'px',x:33,y:3,c:'#ffffff'},
]});
/* Новые герои: Жрец, Разбойник, Паладин */
ART.priest=()=>mkArt({parts:[
 {t:'p',pts:[[13,15],[23,15],[29,34],[7,34]],m:'white'},{t:'p',pts:[[13,15],[16,15],[12,34],[7,34]],m:'white',b:.12},{t:'p',pts:[[19,18],[21,18],[24,34],[16,34]],m:'white',b:-.18},
 {t:'r',x:17,y:16,w:2,h:18,m:'gold'},{t:'r',x:14,y:19,w:8,h:2,m:'gold'},{t:'r',x:11,y:24,w:14,h:2,m:'gold',b:-.1},{t:'r',x:8,y:32,w:20,h:2,m:'gold'},
 {t:'e',cx:10,cy:20,rx:3.2,ry:5,m:'white'},{t:'e',cx:26,cy:19,rx:3.2,ry:5,m:'white'},{t:'e',cx:27,cy:23,rx:2.4,ry:2.4,m:'skin'},{t:'e',cx:9,cy:25,rx:2.4,ry:2.4,m:'skin'},
 {t:'r',x:7,y:21,w:6,h:1,m:'gold'},{t:'r',x:23,y:20,w:6,h:1,m:'gold'},
 {t:'e',cx:18,cy:9.5,rx:7,ry:7.4,m:'white'},{t:'e',cx:18,cy:11,rx:4.4,ry:4.7,m:'skin'},{t:'px',x:16,y:11,c:'#1a1424'},{t:'px',x:20,y:11,c:'#1a1424'},{t:'r',x:17,y:14,w:2,h:1,m:'skin',b:-.3},
 {t:'r',x:12,y:5,w:12,h:1,m:'gold'},{t:'px',x:18,y:5,c:'#e34540'},{t:'r',x:13,y:2,w:10,h:1,m:'gold',b:.1},
 {t:'l',x0:31,y0:8,x1:30,y1:34,w:2,m:'wood',k:.6},{t:'r',x:29,y:0,w:4,h:9,m:'gold'},{t:'r',x:26,y:3,w:10,h:3,m:'gold'},{t:'px',x:31,y:4,c:'#fff8c0'},
 {t:'e',cx:18,cy:26,rx:2.4,ry:2.4,m:'glow'},
]});
ART.rogue=()=>mkArt({parts:[
 {t:'p',pts:[[9,14],[27,14],[31,33],[5,33]],m:'dark',b:-.1},
 {t:'c',x:12,y:27,w:5,h:7,m:'dark'},{t:'c',x:19,y:27,w:5,h:7,m:'dark'},{t:'r',x:11,y:32,w:7,h:3,m:'black'},{t:'r',x:18,y:32,w:7,h:3,m:'black'},{t:'r',x:11,y:32,w:7,h:1,m:'leather'},{t:'r',x:18,y:32,w:7,h:1,m:'leather'},
 {t:'c',x:12,y:15,w:12,h:13,m:'leather'},{t:'l',x0:13,y0:16,x1:23,y1:27,w:2,m:'dark',k:.4},{t:'r',x:12,y:25,w:12,h:2,m:'dark'},{t:'r',x:16,y:25,w:4,h:2,m:'gold'},
 {t:'e',cx:10,cy:20,rx:3,ry:5,m:'leather'},{t:'e',cx:26,cy:20,rx:3,ry:5,m:'leather'},{t:'e',cx:8,cy:25,rx:2.3,ry:2.3,m:'skin'},{t:'e',cx:28,cy:25,rx:2.3,ry:2.3,m:'skin'},
 {t:'e',cx:18,cy:9,rx:7,ry:7.6,m:'dark'},{t:'e',cx:18,cy:11,rx:4.8,ry:4.4,m:'black'},{t:'px',x:16,y:10,c:'#ffe27a'},{t:'px',x:20,y:10,c:'#ffe27a'},{t:'px',x:16,y:11,c:'#ffe27a'},{t:'px',x:20,y:11,c:'#ffe27a'},
 {t:'r',x:13,y:14,w:10,h:3,m:'crimson'},{t:'p',pts:[[14,17],[22,17],[24,23],[12,23]],m:'crimson',b:-.15},
 {t:'p',pts:[[18,0],[24,5],[23,9],[18,4],[13,9],[12,5]],m:'dark',b:.1},
 {t:'l',x0:5,y0:27,x1:2,y1:12,w:2,m:'steel',k:.7},{t:'l',x0:6,y0:27,x1:3,y1:12,w:1,m:'white',k:.9},{t:'r',x:3,y:26,w:6,h:2,m:'gold'},
 {t:'l',x0:31,y0:27,x1:34,y1:12,w:2,m:'steel',k:.7},{t:'l',x0:30,y0:27,x1:33,y1:12,w:1,m:'white',k:.9},{t:'r',x:27,y:26,w:6,h:2,m:'gold'},
]});
ART.paladin=()=>mkArt({parts:[
 {t:'c',x:12,y:27,w:5,h:6,m:'steelD'},{t:'c',x:19,y:27,w:5,h:6,m:'steelD'},{t:'r',x:11,y:32,w:7,h:3,m:'gold'},{t:'r',x:18,y:32,w:7,h:3,m:'gold'},
 {t:'p',pts:[[24,15],[31,21],[30,31],[25,29]],m:'blue',b:-.1},
 {t:'c',x:11,y:15,w:14,h:13,m:'white'},{t:'p',pts:[[13,16],[23,16],[23,29],[18,32],[13,29]],m:'blue'},{t:'r',x:17,y:17,w:2,h:9,m:'gold'},{t:'r',x:14,y:20,w:8,h:2,m:'gold'},{t:'r',x:11,y:25,w:14,h:2,m:'gold',b:-.1},
 {t:'e',cx:10,cy:17,rx:4.5,ry:3.8,m:'white'},{t:'e',cx:26,cy:17,rx:4.5,ry:3.8,m:'white'},{t:'r',x:6,y:19,w:9,h:1,m:'gold'},{t:'r',x:22,y:19,w:9,h:1,m:'gold'},
 {t:'e',cx:18,cy:9,rx:6.2,ry:7,m:'white'},{t:'r',x:12,y:11,w:12,h:2,m:'gold'},{t:'r',x:13,y:8,w:10,h:3,m:'dark'},{t:'px',x:15,y:9,c:'#a0e0ff'},{t:'px',x:20,y:9,c:'#a0e0ff'},{t:'r',x:17,y:8,w:2,h:6,m:'gold'},
 {t:'p',pts:[[12,7],[6,2],[8,9]],m:'white',b:.1},{t:'p',pts:[[24,7],[30,2],[28,9]],m:'white',b:.1},{t:'p',pts:[[18,0],[21,4],[18,6],[15,4]],m:'gold'},
 {t:'p',pts:[[2,15],[11,15],[11,25],[6,32],[2,25]],m:'white'},{t:'p',pts:[[2,15],[3,15],[5,30],[3,25]],m:'gold',b:-.15},{t:'r',x:5,y:17,w:2,h:11,m:'gold'},{t:'r',x:3,y:20,w:7,h:2,m:'gold'},
 {t:'r',x:29,y:3,w:3,h:18,m:'glow'},{t:'r',x:30,y:3,w:1,h:17,m:'white'},{t:'r',x:27,y:20,w:7,h:2,m:'gold'},{t:'r',x:29,y:22,w:3,h:4,m:'leather'},{t:'e',cx:30.5,cy:27,rx:2,ry:1.5,m:'gold'},
 {t:'c',x:26,y:19,w:5,h:5,m:'steelD'},
]});
/* Пленник (цель «Спасти пленника») */
ART.captive=()=>mkArt({parts:[
 {t:'c',x:13,y:27,w:4,h:6,m:'skin',b:-.15},{t:'c',x:19,y:27,w:4,h:6,m:'skin',b:-.15},{t:'r',x:12,y:32,w:6,h:3,m:'brown'},{t:'r',x:18,y:32,w:6,h:3,m:'brown'},
 {t:'p',pts:[[11,15],[25,15],[26,29],[23,31],[20,28],[17,31],[13,29],[10,29]],m:'bone',b:-.1},{t:'l',x0:12,y0:22,x1:24,y1:23,w:1,m:'brown',k:.4},
 {t:'e',cx:10,cy:21,rx:2.6,ry:4.5,m:'bone',b:-.1},{t:'e',cx:26,cy:21,rx:2.6,ry:4.5,m:'bone',b:-.1},
 {t:'e',cx:14,cy:25,rx:2.2,ry:2.2,m:'skin'},{t:'e',cx:22,cy:25,rx:2.2,ry:2.2,m:'skin'},{t:'r',x:13,y:24,w:10,h:2,m:'leather'},{t:'px',x:18,y:24,c:'#c89558'},
 {t:'e',cx:18,cy:10,rx:5.6,ry:6,m:'skin'},{t:'e',cx:18,cy:6,rx:6,ry:3.4,m:'hair'},{t:'p',pts:[[13,11],[23,11],[22,16],[18,18],[14,16]],m:'hair',b:-.05},
 {t:'px',x:16,y:10,c:'#1a1424'},{t:'px',x:20,y:10,c:'#1a1424'},{t:'r',x:17,y:13,w:2,h:1,m:'skin',b:-.3},
]});
/* Монстры, партия 1: Тёмный лес */
const eyes2=(x1,x2,y,c)=>[{t:'px',x:x1,y,c},{t:'px',x:x2,y,c}];
ART.goblin=()=>mkArt({parts:[
 {t:'c',x:13,y:28,w:4,h:6,m:'green',b:-.1},{t:'c',x:19,y:28,w:4,h:6,m:'green',b:-.1},{t:'r',x:12,y:32,w:6,h:3,m:'leather'},{t:'r',x:18,y:32,w:6,h:3,m:'leather'},
 {t:'e',cx:18,cy:23,rx:6.5,ry:7,m:'green'},{t:'p',pts:[[12,22],[24,22],[25,30],[11,30]],m:'leather'},{t:'r',x:12,y:22,w:12,h:2,m:'brown'},
 {t:'e',cx:9,cy:23,rx:2.5,ry:4,m:'green'},{t:'e',cx:27,cy:23,rx:2.5,ry:4,m:'green'},
 {t:'p',pts:[[5,10],[12,12],[11,16]],m:'green'},{t:'p',pts:[[31,10],[24,12],[25,16]],m:'green'},
 {t:'e',cx:18,cy:13,rx:7,ry:6,m:'green'},{t:'px',x:15,y:12,c:'#fff070'},{t:'px',x:21,y:12,c:'#fff070'},{t:'px',x:15,y:13,c:'#1a1424'},{t:'px',x:21,y:13,c:'#1a1424'},
 {t:'r',x:17,y:14,w:2,h:3,m:'green',b:-.2},{t:'r',x:14,y:17,w:8,h:1,m:'dark'},{t:'px',x:15,y:17,c:'#ffffff'},{t:'px',x:20,y:17,c:'#ffffff'},
 {t:'l',x0:29,y0:30,x1:31,y1:15,w:2,m:'wood',k:.6},{t:'e',cx:31,cy:13,rx:3.4,ry:3.6,m:'wood'},{t:'px',x:30,y:12,c:'#cfd6e8'},{t:'px',x:33,y:14,c:'#cfd6e8'},
]});
ART.wolf=()=>mkArt({parts:[
 {t:'p',pts:[[28,17],[35,10],[34,19],[29,22]],m:'wolfgray'},
 {t:'c',x:10,y:26,w:3,h:8,m:'wolfgray',b:-.1},{t:'c',x:15,y:27,w:3,h:7,m:'wolfgray'},{t:'c',x:24,y:26,w:3,h:8,m:'wolfgray',b:-.1},{t:'c',x:28,y:27,w:3,h:7,m:'wolfgray'},
 {t:'e',cx:20,cy:21,rx:12,ry:7,m:'wolfgray'},{t:'e',cx:22,cy:25,rx:8,ry:3,m:'white',b:-.2},
 {t:'p',pts:[[8,9],[11,14],[7,15]],m:'wolfgray',b:-.15},{t:'p',pts:[[13,9],[15,14],[11,14]],m:'wolfgray'},
 {t:'e',cx:10,cy:17,rx:6,ry:5.5,m:'wolfgray'},{t:'e',cx:4.5,cy:20,rx:4,ry:2.6,m:'wolfgray',b:.05},{t:'px',x:1,y:19,c:'#05030a'},
 {t:'px',x:9,y:15,c:'#ff4040'},{t:'px',x:10,y:15,c:'#ffb0a0'},{t:'r',x:3,y:22,w:5,h:1,m:'dark'},{t:'px',x:4,y:23,c:'#ffffff'},{t:'px',x:7,y:23,c:'#ffffff'},
 {t:'p',pts:[[14,15],[20,14],[26,15],[24,18]],m:'wolfgray',b:.15},
]});
ART.skel=()=>mkArt({parts:[
 {t:'c',x:13,y:27,w:3,h:7,m:'bone'},{t:'c',x:20,y:27,w:3,h:7,m:'bone'},{t:'r',x:12,y:33,w:5,h:2,m:'bone'},{t:'r',x:19,y:33,w:5,h:2,m:'bone'},
 {t:'e',cx:18,cy:26,rx:6,ry:2.5,m:'bone'},{t:'r',x:17,y:16,w:2,h:11,m:'bone',b:-.1},
 {t:'r',x:12,y:17,w:12,h:2,m:'bone'},{t:'r',x:12,y:20,w:12,h:2,m:'bone'},{t:'r',x:13,y:23,w:10,h:2,m:'bone'},{t:'cut',x:15,y:17,w:1,h:8},{t:'cut',x:20,y:17,w:1,h:8},
 {t:'l',x0:11,y0:17,x1:7,y1:25,w:2,m:'bone'},{t:'l',x0:25,y0:17,x1:29,y1:22,w:2,m:'bone'},
 {t:'e',cx:18,cy:10,rx:6,ry:6,m:'bone'},{t:'r',x:14,y:14,w:8,h:3,m:'bone',b:-.1},{t:'e',cx:15.5,cy:10.5,rx:2,ry:2.2,m:'black'},{t:'e',cx:20.5,cy:10.5,rx:2,ry:2.2,m:'black'},
 {t:'px',x:15,y:10,c:'#ff4040'},{t:'px',x:20,y:10,c:'#ff4040'},{t:'px',x:18,y:13,c:'#1a1424'},{t:'cut',x:15,y:16,w:1,h:1},{t:'cut',x:17,y:16,w:1,h:1},{t:'cut',x:19,y:16,w:1,h:1},{t:'cut',x:21,y:16,w:1,h:1},
 {t:'l',x0:30,y0:24,x1:32,y1:6,w:2,m:'steelD',k:.55},{t:'r',x:28,y:23,w:6,h:2,m:'leather'},{t:'px',x:31,y:7,c:'#8a5a3a'},
 {t:'e',cx:6,cy:25,rx:4.5,ry:5,m:'wood'},{t:'r',x:5,y:21,w:2,h:8,m:'steelD'},
]});
ART.spider=()=>mkArt({parts:[
 {t:'l',x0:14,y0:19,x1:3,y1:12,w:2,m:'black',k:.55},{t:'l',x0:3,y0:12,x1:2,y1:30,w:2,m:'black',k:.55},
 {t:'l',x0:14,y0:22,x1:2,y1:20,w:2,m:'black',k:.55},{t:'l',x0:2,y0:20,x1:4,y1:31,w:2,m:'black',k:.5},
 {t:'l',x0:22,y0:19,x1:33,y1:12,w:2,m:'black',k:.55},{t:'l',x0:33,y0:12,x1:34,y1:30,w:2,m:'black',k:.55},
 {t:'l',x0:22,y0:22,x1:34,y1:20,w:2,m:'black',k:.55},{t:'l',x0:34,y0:20,x1:32,y1:31,w:2,m:'black',k:.5},
 {t:'e',cx:18,cy:23,rx:9,ry:8,m:'purple',b:-.05},{t:'e',cx:18,cy:15,rx:6,ry:5,m:'black'},
 {t:'p',pts:[[18,18],[21,27],[18,31],[15,27]],m:'red',b:-.1},{t:'e',cx:18,cy:25,rx:2,ry:2.5,m:'red',b:.1},
 {t:'px',x:15,y:13,c:'#ff3030'},{t:'px',x:17,y:12,c:'#ff3030'},{t:'px',x:19,y:12,c:'#ff3030'},{t:'px',x:21,y:13,c:'#ff3030'},{t:'px',x:16,y:15,c:'#ff7050'},{t:'px',x:20,y:15,c:'#ff7050'},
 {t:'r',x:15,y:18,w:1,h:3,m:'white'},{t:'r',x:20,y:18,w:1,h:3,m:'white'},
]});
const archerFn=(c)=>mkArt({parts:[
 {t:'c',x:12,y:27,w:5,h:6,m:c.pants},{t:'c',x:19,y:27,w:5,h:6,m:c.pants},{t:'r',x:11,y:31,w:7,h:4,m:'leather'},{t:'r',x:18,y:31,w:7,h:4,m:'leather'},
 {t:'p',pts:[[25,10],[30,12],[28,26],[24,24]],m:'leather'},{t:'l',x0:26,y0:11,x1:25,y1:6,w:1,m:'wood'},{t:'l',x0:28,y0:12,x1:29,y1:7,w:1,m:'wood'},{t:'px',x:25,y:5,c:c.fl},{t:'px',x:29,y:6,c:c.fl},
 {t:'p',pts:[[9,15],[27,15],[29,29],[7,29]],m:c.cloak,b:-.15},{t:'c',x:11,y:15,w:14,h:12,m:c.cloak},{t:'r',x:11,y:24,w:14,h:2,m:'leather'},{t:'r',x:16,y:24,w:4,h:2,m:'gold'},{t:'p',pts:[[13,15],[23,15],[18,22]],m:'leather'},
 {t:'e',cx:9,cy:19,rx:3,ry:5,m:c.cloak},{t:'e',cx:7,cy:23,rx:2.5,ry:2.5,m:'skin'},{t:'e',cx:27,cy:19,rx:3,ry:5,m:c.cloak},
 {t:'e',cx:18,cy:9,rx:6.8,ry:7.4,m:c.cloak},{t:'e',cx:18,cy:11,rx:4.2,ry:4.4,m:'skin'},{t:'r',x:13,y:11,w:10,h:5,m:c.mask},{t:'r',x:13,y:11,w:10,h:1,m:c.mask,b:.15},
 {t:'px',x:16,y:11,c:'#ff4040'},{t:'px',x:20,y:11,c:'#ff4040'},
 {t:'p',pts:[[18,0],[24,5],[23,9],[18,4],[13,9],[12,5]],m:c.cloak,b:.05},
 {t:'l',x0:4,y0:8,x1:3,y1:20,w:2,m:'wood',k:.65},{t:'l',x0:3,y0:20,x1:5,y1:31,w:2,m:'wood',k:.65},{t:'l',x0:4,y0:8,x1:5,y1:31,w:1,m:'white',k:.7},
]});
ART.bandit=()=>archerFn({pants:'dark',cloak:'gray',mask:'crimson',fl:'#e0e0e0'});
ART.slime=()=>mkArt({parts:[
 {t:'e',cx:18,cy:26,rx:14,ry:9,m:'slime'},{t:'e',cx:18,cy:21,rx:10,ry:8,m:'slime',b:.05},
 {t:'cut',x:0,y:35,w:36,h:1},{t:'e',cx:11,cy:20,rx:3.2,ry:2,m:'white',b:-.1},{t:'px',x:10,y:19,c:'#ffffff'},
 {t:'e',cx:14,cy:24,rx:2.5,ry:3,m:'white'},{t:'e',cx:22,cy:24,rx:2.5,ry:3,m:'white'},{t:'px',x:14,y:25,c:'#1a1424'},{t:'px',x:22,y:25,c:'#1a1424'},
 {t:'r',x:15,y:29,w:6,h:1,m:'slime',b:-.5},{t:'px',x:26,y:28,c:'#c8ffd0'},{t:'px',x:9,y:29,c:'#c8ffd0'},{t:'px',x:24,y:20,c:'#c8ffd0'},
]});
ART.slimelet=()=>mkArt({parts:[
 {t:'e',cx:18,cy:30,rx:8,ry:5.5,m:'slime',b:-.02},{t:'e',cx:18,cy:27,rx:6,ry:5,m:'slime',b:.05},{t:'cut',x:0,y:35,w:36,h:1},
 {t:'e',cx:15.5,cy:28,rx:1.6,ry:2,m:'white'},{t:'e',cx:20.5,cy:28,rx:1.6,ry:2,m:'white'},{t:'px',x:15,y:29,c:'#1a1424'},{t:'px',x:21,y:29,c:'#1a1424'},{t:'px',x:14,y:25,c:'#ffffff'},
]});
ART.bat=()=>mkArt({parts:[
 {t:'p',pts:[[16,15],[2,6],[1,18],[5,16],[8,22],[12,19],[16,24]],m:'purple',b:-.1},{t:'p',pts:[[20,15],[34,6],[35,18],[31,16],[28,22],[24,19],[20,24]],m:'purple',b:-.1},
 {t:'l',x0:16,y0:16,x1:3,y1:8,w:1,m:'black',k:.4},{t:'l',x0:16,y0:17,x1:5,y1:17,w:1,m:'black',k:.4},{t:'l',x0:20,y0:16,x1:33,y1:8,w:1,m:'black',k:.4},{t:'l',x0:20,y0:17,x1:31,y1:17,w:1,m:'black',k:.4},
 {t:'p',pts:[[14,8],[16,13],[12,13]],m:'black'},{t:'p',pts:[[22,8],[24,13],[20,13]],m:'black'},
 {t:'e',cx:18,cy:18,rx:5,ry:6,m:'black'},{t:'e',cx:18,cy:14,rx:5.2,ry:4.6,m:'black',b:.05},
 {t:'px',x:15,y:14,c:'#ff4040'},{t:'px',x:21,y:14,c:'#ff4040'},{t:'px',x:16,y:17,c:'#ffffff'},{t:'px',x:20,y:17,c:'#ffffff'},
]});
ART.boar=()=>mkArt({parts:[
 {t:'c',x:9,y:27,w:4,h:7,m:'brown',b:-.1},{t:'c',x:14,y:28,w:4,h:6,m:'brown'},{t:'c',x:24,y:27,w:4,h:7,m:'brown',b:-.1},{t:'c',x:28,y:28,w:4,h:6,m:'brown'},
 {t:'p',pts:[[14,11],[16,15],[19,10],[21,15],[24,10],[26,15],[29,12],[31,18],[12,18]],m:'dark',b:.1},
 {t:'e',cx:21,cy:22,rx:12,ry:8,m:'brown'},{t:'e',cx:10,cy:21,rx:6.5,ry:6,m:'brown',b:.05},
 {t:'e',cx:5,cy:23,rx:4,ry:3.2,m:'pink'},{t:'px',x:3,y:23,c:'#2c1428'},{t:'px',x:5,y:23,c:'#2c1428'},
 {t:'p',pts:[[6,25],[8,30],[10,25]],m:'bone'},{t:'p',pts:[[11,25],[13,29],[14,24]],m:'bone'},
 {t:'p',pts:[[10,13],[13,17],[8,17]],m:'dark'},{t:'px',x:9,y:19,c:'#ff4040'},{t:'px',x:10,y:19,c:'#ffb0a0'},
 {t:'e',cx:32,cy:19,rx:3,ry:1.4,m:'dark'},
]});
ART.shaman=()=>mkArt({parts:[
 {t:'c',x:13,y:30,w:4,h:4,m:'green',b:-.1},{t:'c',x:19,y:30,w:4,h:4,m:'green',b:-.1},
 {t:'p',pts:[[12,20],[24,20],[28,33],[8,33]],m:'teal'},{t:'r',x:8,y:31,w:20,h:2,m:'gold'},{t:'r',x:12,y:24,w:12,h:2,m:'gold'},
 {t:'e',cx:9,cy:23,rx:2.5,ry:3.5,m:'green'},{t:'e',cx:27,cy:21,rx:2.5,ry:3.5,m:'green'},
 {t:'p',pts:[[5,12],[12,14],[11,18]],m:'green'},{t:'p',pts:[[31,12],[24,14],[25,18]],m:'green'},
 {t:'e',cx:18,cy:14,rx:6.5,ry:5.8,m:'green'},{t:'px',x:15,y:13,c:'#fff070'},{t:'px',x:21,y:13,c:'#fff070'},{t:'px',x:15,y:14,c:'#1a1424'},{t:'px',x:21,y:14,c:'#1a1424'},
 {t:'r',x:14,y:18,w:8,h:1,m:'dark'},{t:'px',x:16,y:19,c:'#fff'},{t:'px',x:20,y:19,c:'#fff'},
 {t:'p',pts:[[10,9],[12,4],[14,8],[16,1],[18,7],[20,1],[22,8],[24,4],[26,9]],m:'pink'},{t:'r',x:11,y:8,w:14,h:2,m:'gold'},
 {t:'l',x0:30,y0:34,x1:30,y1:10,w:2,m:'wood',k:.6},{t:'e',cx:30,cy:8,rx:3.4,ry:3.6,m:'bone'},{t:'px',x:29,y:8,c:'#05030a'},{t:'px',x:31,y:8,c:'#05030a'},{t:'e',cx:30,cy:5,rx:1.5,ry:1.5,m:'glow'},
]});
ART.shroom=()=>mkArt({parts:[
 {t:'c',x:13,y:19,w:10,h:14,m:'bone'},{t:'e',cx:18,cy:33,rx:7,ry:2.2,m:'brown'},
 {t:'e',cx:18,cy:15,rx:15,ry:11,m:'red'},{t:'cut',x:0,y:21,w:36,h:15},{t:'c',x:13,y:19,w:10,h:14,m:'bone'},
 {t:'e',cx:18,cy:20,rx:15,ry:2.2,m:'red',b:-.3},
 {t:'e',cx:10,cy:12,rx:3,ry:2.4,m:'white'},{t:'e',cx:22,cy:8,rx:2.5,ry:2,m:'white'},{t:'e',cx:27,cy:15,rx:2.2,ry:1.8,m:'white'},{t:'e',cx:17,cy:16,rx:2.2,ry:1.8,m:'white'},{t:'e',cx:6,cy:17,rx:1.6,ry:1.3,m:'white'},
 {t:'px',x:15,y:24,c:'#1a1424'},{t:'px',x:16,y:25,c:'#1a1424'},{t:'px',x:21,y:24,c:'#1a1424'},{t:'px',x:20,y:25,c:'#1a1424'},{t:'px',x:15,y:26,c:'#ff4040'},{t:'px',x:21,y:26,c:'#ff4040'},
 {t:'r',x:16,y:29,w:4,h:1,m:'dark'},{t:'px',x:17,y:30,c:'#c8ffd0'},{t:'px',x:11,y:23,c:'#6ee080'},{t:'px',x:11,y:24,c:'#6ee080'},{t:'px',x:26,y:25,c:'#6ee080'},
]});
/* Монстры, партия 2: Мёртвые земли */
ART.dknight=()=>{const c=tankFn({legs:'darkplate',armor:'darkplate',edge:'steel',cape:'crimson',shield:'black',trim:'crimson',plume:'crimson',eye:'#ff4040'});return c;};
ART.orc=()=>mkArt({parts:[
 {t:'c',x:11,y:27,w:6,h:7,m:'leather'},{t:'c',x:19,y:27,w:6,h:7,m:'leather'},{t:'r',x:10,y:32,w:8,h:3,m:'dark'},{t:'r',x:18,y:32,w:8,h:3,m:'dark'},
 {t:'e',cx:18,cy:22,rx:11,ry:9,m:'orcgreen'},{t:'p',pts:[[10,17],[26,17],[24,26],[12,26]],m:'leather'},{t:'r',x:11,y:25,w:14,h:3,m:'brown'},{t:'r',x:16,y:25,w:4,h:3,m:'gold'},{t:'r',x:17,y:18,w:2,h:7,m:'dark'},
 {t:'e',cx:6,cy:24,rx:3.6,ry:6,m:'orcgreen'},{t:'e',cx:30,cy:24,rx:3.6,ry:6,m:'orcgreen'},{t:'r',x:3,y:26,w:6,h:3,m:'steelD'},{t:'r',x:27,y:26,w:6,h:3,m:'steelD'},
 {t:'e',cx:7,cy:16,rx:5,ry:4,m:'steel'},{t:'e',cx:29,cy:16,rx:5,ry:4,m:'steel'},{t:'px',x:5,y:14,c:'#d2dcf0'},{t:'px',x:7,y:12,c:'#d2dcf0'},{t:'px',x:29,y:12,c:'#d2dcf0'},{t:'px',x:31,y:14,c:'#d2dcf0'},
 {t:'e',cx:18,cy:10,rx:7,ry:6.5,m:'orcgreen'},{t:'e',cx:18,cy:14,rx:6,ry:3.2,m:'orcgreen',b:-.05},{t:'r',x:12,y:8,w:12,h:2,m:'dark'},
 {t:'px',x:15,y:9,c:'#ff4040'},{t:'px',x:21,y:9,c:'#ff4040'},{t:'r',x:17,y:11,w:2,h:2,m:'orcgreen',b:-.25},{t:'r',x:14,y:15,w:8,h:1,m:'dark'},
 {t:'p',pts:[[13,15],[12,10],[15,14]],m:'bone'},{t:'p',pts:[[23,15],[24,10],[21,14]],m:'bone'},
 {t:'p',pts:[[14,4],[18,0],[22,4],[20,6],[16,6]],m:'dark'},
 {t:'l',x0:33,y0:33,x1:33,y1:8,w:2,m:'wood',k:.6},{t:'p',pts:[[28,3],[35,1],[36,12],[29,11],[31,7]],m:'steel'},{t:'l',x0:30,y0:4,x1:35,y1:3,w:1,m:'white',k:.9},
]});
ART.necro=()=>mkArt({parts:[
 {t:'p',pts:[[12,13],[24,13],[30,34],[27,31],[24,35],[21,31],[18,35],[15,31],[12,35],[9,31],[6,34]],m:'black',b:.1},
 {t:'p',pts:[[13,13],[16,13],[11,34],[6,34]],m:'purple',b:-.25},{t:'p',pts:[[18,16],[19,16],[22,34],[14,34]],m:'black',b:-.3},
 {t:'r',x:12,y:24,w:12,h:1,m:'bone'},{t:'e',cx:18,cy:23,rx:2,ry:2,m:'slime'},
 {t:'e',cx:9,cy:19,rx:3,ry:4.5,m:'black'},{t:'e',cx:27,cy:19,rx:3,ry:4.5,m:'black'},{t:'r',x:7,y:22,w:4,h:4,m:'bone'},{t:'px',x:8,y:25,c:'#05030a'},{t:'px',x:10,y:25,c:'#05030a'},
 {t:'e',cx:18,cy:10,rx:7.4,ry:8,m:'black'},{t:'e',cx:18,cy:11,rx:4.6,ry:5,m:'bone'},{t:'e',cx:16,cy:10.5,rx:1.6,ry:1.8,m:'black'},{t:'e',cx:20.5,cy:10.5,rx:1.6,ry:1.8,m:'black'},
 {t:'px',x:16,y:10,c:'#7dff7d'},{t:'px',x:20,y:10,c:'#7dff7d'},{t:'r',x:15,y:14,w:6,h:1,m:'bone',b:-.3},{t:'cut',x:16,y:14,w:1,h:1},{t:'cut',x:18,y:14,w:1,h:1},{t:'cut',x:20,y:14,w:1,h:1},
 {t:'p',pts:[[18,1],[25,6],[11,6]],m:'black',b:.1},
 {t:'l',x0:31,y0:34,x1:31,y1:8,w:2,m:'bone',k:.55},{t:'e',cx:31,cy:7,rx:3.4,ry:3.6,m:'bone'},{t:'px',x:30,y:7,c:'#05030a'},{t:'px',x:32,y:7,c:'#05030a'},
 {t:'p',pts:[[30,5],[31,0],[33,5]],m:'slime',b:.2},{t:'px',x:28,y:2,c:'#7dff7d'},{t:'px',x:34,y:3,c:'#7dff7d'},
]});
ART.troll=()=>mkArt({parts:[
 {t:'c',x:10,y:28,w:6,h:6,m:'trollskin'},{t:'c',x:20,y:28,w:6,h:6,m:'trollskin'},{t:'r',x:9,y:32,w:8,h:3,m:'dark'},{t:'r',x:19,y:32,w:8,h:3,m:'dark'},
 {t:'e',cx:18,cy:23,rx:12,ry:10.5,m:'trollskin'},{t:'e',cx:18,cy:20,rx:9,ry:6,m:'trollskin',b:.14},{t:'e',cx:19,cy:28,rx:8,ry:4.5,m:'trollskin',b:.05},
 {t:'p',pts:[[10,26],[26,26],[27,32],[9,32]],m:'leather'},{t:'r',x:9,y:26,w:18,h:2,m:'brown'},
 {t:'e',cx:6,cy:17,rx:5.4,ry:4.4,m:'trollskin',b:.05},{t:'e',cx:30,cy:17,rx:5.4,ry:4.4,m:'trollskin',b:.05},
 {t:'e',cx:5,cy:25,rx:3.6,ry:8,m:'trollskin'},{t:'e',cx:31,cy:25,rx:3.6,ry:8,m:'trollskin'},{t:'e',cx:5,cy:33,rx:3.6,ry:2.4,m:'trollskin'},{t:'e',cx:33,cy:31,rx:3.6,ry:2.4,m:'trollskin'},
 {t:'e',cx:18,cy:10,rx:6,ry:5.4,m:'trollskin'},{t:'e',cx:18,cy:12.5,rx:3.4,ry:2.8,m:'trollskin',b:.12},{t:'px',x:15,y:9,c:'#ffe27a'},{t:'px',x:21,y:9,c:'#ffe27a'},{t:'r',x:14,y:8,w:3,h:1,m:'dark'},{t:'r',x:20,y:8,w:3,h:1,m:'dark'},
 {t:'r',x:14,y:15,w:8,h:1,m:'dark'},{t:'p',pts:[[14,15],[15,12],[16,15]],m:'bone'},{t:'p',pts:[[22,15],[21,12],[20,15]],m:'bone'},
 {t:'e',cx:14,cy:5,rx:3,ry:2.5,m:'moss'},{t:'e',cx:19,cy:4,rx:3.4,ry:2.6,m:'moss'},{t:'e',cx:23,cy:6,rx:2.6,ry:2.2,m:'moss'},
 {t:'l',x0:33,y0:30,x1:34,y1:6,w:4,m:'wood',k:.55},{t:'e',cx:34,cy:6,rx:4,ry:5,m:'wood'},{t:'px',x:32,y:4,c:'#cfd6e8'},{t:'px',x:36,y:8,c:'#cfd6e8'},
 {t:'px',x:12,y:22,c:'#8ae890'},{t:'px',x:24,y:19,c:'#8ae890'},{t:'px',x:16,y:29,c:'#8ae890'},
]});
ART.ghost=()=>mkArt({parts:[
 {t:'p',pts:[[10,13],[26,13],[28,26],[27,32],[24,28],[21,33],[18,28],[15,33],[12,28],[9,32],[8,26]],m:'spirit'},
 {t:'p',pts:[[10,14],[15,14],[13,28],[9,32],[8,26]],m:'spirit',b:.12},
 {t:'e',cx:18,cy:12,rx:8.5,ry:8,m:'spirit',b:.08},
 {t:'p',pts:[[8,17],[1,25],[4,28],[10,23]],m:'spirit'},{t:'p',pts:[[28,17],[35,25],[32,28],[26,23]],m:'spirit'},
 {t:'e',cx:14.5,cy:11,rx:2.4,ry:3.2,m:'black'},{t:'e',cx:21.5,cy:11,rx:2.4,ry:3.2,m:'black'},{t:'px',x:14,y:10,c:'#9affff'},{t:'px',x:21,y:10,c:'#9affff'},
 {t:'e',cx:18,cy:17.5,rx:2.6,ry:3.2,m:'black'},{t:'px',x:3,y:26,c:'#ffffff'},{t:'px',x:32,y:26,c:'#ffffff'},{t:'px',x:6,y:5,c:'#cde0ff'},{t:'px',x:30,y:6,c:'#cde0ff'},
]});
ART.ogre=()=>mkArt({parts:[
 {t:'c',x:10,y:28,w:7,h:6,m:'ogreskin'},{t:'c',x:19,y:28,w:7,h:6,m:'ogreskin'},{t:'r',x:9,y:32,w:9,h:3,m:'leather'},{t:'r',x:18,y:32,w:9,h:3,m:'leather'},
 {t:'e',cx:18,cy:22,rx:14,ry:11,m:'ogreskin'},{t:'e',cx:18,cy:25,rx:9,ry:6,m:'ogreskin',b:.1},{t:'p',pts:[[8,27],[28,27],[26,33],[10,33]],m:'leather'},{t:'r',x:7,y:26,w:22,h:2,m:'brown'},{t:'r',x:17,y:26,w:3,h:2,m:'gold'},
 {t:'e',cx:5,cy:22,rx:4.2,ry:6.5,m:'ogreskin'},{t:'e',cx:31,cy:22,rx:4.2,ry:6.5,m:'ogreskin'},
 {t:'e',cx:18,cy:10,rx:5.8,ry:5.5,m:'ogreskin'},{t:'e',cx:18,cy:13,rx:5,ry:3,m:'ogreskin',b:-.05},
 {t:'px',x:15,y:9,c:'#ff5030'},{t:'px',x:21,y:9,c:'#ff5030'},{t:'r',x:14,y:8,w:3,h:1,m:'dark'},{t:'r',x:20,y:8,w:3,h:1,m:'dark'},{t:'r',x:14,y:14,w:8,h:1,m:'dark'},{t:'px',x:15,y:15,c:'#fff'},{t:'px',x:21,y:15,c:'#fff'},
 {t:'p',pts:[[12,5],[10,0],[14,4]],m:'bone'},{t:'p',pts:[[24,5],[26,0],[22,4]],m:'bone'},
 {t:'l',x0:33,y0:32,x1:34,y1:8,w:4,m:'wood',k:.55},{t:'e',cx:34,cy:8,rx:3.6,ry:5.5,m:'wood'},{t:'px',x:31,y:7,c:'#cfd6e8'},{t:'px',x:36,y:5,c:'#cfd6e8'},{t:'px',x:36,y:10,c:'#cfd6e8'},
]});
ART.wraith=()=>mkArt({parts:[
 {t:'p',pts:[[11,12],[25,12],[29,27],[26,34],[23,30],[20,35],[17,30],[14,35],[11,30],[8,34],[7,27]],m:'wraithc'},
 {t:'p',pts:[[11,13],[16,13],[11,30],[8,34],[7,27]],m:'wraithc',b:.14},
 {t:'p',pts:[[12,2],[24,2],[27,12],[23,16],[18,13],[13,16],[9,12]],m:'wraithc'},{t:'e',cx:18,cy:10,rx:5.5,ry:5.2,m:'black'},
 {t:'e',cx:16,cy:9.5,rx:1.6,ry:2,m:'glow'},{t:'e',cx:20.5,cy:9.5,rx:1.6,ry:2,m:'glow'},{t:'px',x:16,y:9,c:'#ffffff'},{t:'px',x:20,y:9,c:'#ffffff'},
 {t:'e',cx:18,cy:14,rx:2.4,ry:1.8,m:'black'},
 {t:'p',pts:[[9,18],[2,24],[3,28],[11,24]],m:'bone'},{t:'p',pts:[[27,18],[34,24],[33,28],[25,24]],m:'bone'},{t:'px',x:3,y:29,c:'#cde0ff'},{t:'px',x:33,y:29,c:'#cde0ff'},
 {t:'px',x:6,y:8,c:'#a070e0'},{t:'px',x:30,y:6,c:'#a070e0'},{t:'px',x:4,y:16,c:'#a070e0'},
]});
const golemFn=c=>mkArt({parts:[
 {t:'r',x:11,y:27,w:6,h:8,m:c.s},{t:'r',x:19,y:27,w:6,h:8,m:c.s},{t:'r',x:10,y:32,w:8,h:3,m:c.s2},{t:'r',x:18,y:32,w:8,h:3,m:c.s2},
 {t:'r',x:8,y:12,w:20,h:17,m:c.s},{t:'r',x:11,y:15,w:14,h:10,m:c.s2},{t:'r',x:8,y:12,w:20,h:2,m:c.s,b:.15},
 {t:'e',cx:6,cy:15,rx:5,ry:5,m:c.s},{t:'e',cx:30,cy:15,rx:5,ry:5,m:c.s},
 {t:'r',x:1,y:16,w:6,h:14,m:c.s},{t:'r',x:29,y:16,w:6,h:14,m:c.s},{t:'r',x:0,y:29,w:8,h:5,m:c.s2},{t:'r',x:28,y:29,w:8,h:5,m:c.s2},
 {t:'r',x:13,y:3,w:10,h:9,m:c.s},{t:'r',x:14,y:7,w:8,h:2,m:'black'},{t:'px',x:15,y:7,c:c.glow},{t:'px',x:16,y:7,c:c.glow},{t:'px',x:20,y:7,c:c.glow},{t:'px',x:21,y:7,c:c.glow},
 {t:'p',pts:[[18,16],[21,20],[18,24],[15,20]],m:'black'},{t:'p',pts:[[18,17],[20,20],[18,23],[16,20]],m:c.rune},
 {t:'e',cx:11,cy:14,rx:2,ry:1.4,m:c.moss},{t:'e',cx:26,cy:26,rx:2.4,ry:1.6,m:c.moss},{t:'e',cx:4,cy:20,rx:1.6,ry:2,m:c.moss},{t:'e',cx:15,cy:4,rx:2,ry:1.2,m:c.moss},
 {t:'l',x0:9,y0:20,x1:11,y1:25,w:1,m:'black',k:.3},{t:'l',x0:26,y0:14,x1:24,y1:18,w:1,m:'black',k:.3},
]});
ART.golem=()=>golemFn({s:'stone',s2:'gray',glow:'#5cd6e8',rune:'glow',moss:'moss'});
ART.cultist=()=>mkArt({parts:[
 {t:'p',pts:[[12,14],[24,14],[28,34],[8,34]],m:'bloodrobe'},{t:'p',pts:[[12,14],[16,14],[12,34],[8,34]],m:'bloodrobe',b:.12},{t:'p',pts:[[17,18],[19,18],[21,34],[15,34]],m:'black',b:.1},
 {t:'r',x:11,y:24,w:14,h:2,m:'black'},{t:'e',cx:18,cy:25,rx:2.2,ry:2.2,m:'orange'},{t:'px',x:18,y:25,c:'#ffe070'},{t:'r',x:8,y:32,w:20,h:2,m:'black'},
 {t:'e',cx:9,cy:19,rx:3,ry:5,m:'bloodrobe'},{t:'e',cx:27,cy:19,rx:3,ry:5,m:'bloodrobe'},{t:'e',cx:7,cy:24,rx:2.2,ry:2.2,m:'skin'},{t:'e',cx:29,cy:23,rx:2.2,ry:2.2,m:'skin'},
 {t:'e',cx:18,cy:9,rx:7,ry:8,m:'bloodrobe'},{t:'e',cx:18,cy:11,rx:4.6,ry:5,m:'white'},{t:'r',x:14,y:9,w:3,h:2,m:'black'},{t:'r',x:20,y:9,w:3,h:2,m:'black'},{t:'px',x:15,y:10,c:'#ff7a30'},{t:'px',x:21,y:10,c:'#ff7a30'},
 {t:'r',x:17,y:11,w:2,h:3,m:'crimson'},{t:'r',x:15,y:15,w:6,h:1,m:'black'},{t:'p',pts:[[18,0],[25,6],[11,6]],m:'bloodrobe',b:.05},
 {t:'p',pts:[[29,20],[31,12],[33,20]],m:'steel'},{t:'r',x:29,y:20,w:4,h:2,m:'gold'},{t:'e',cx:7,cy:27,rx:2.4,ry:2.4,m:'orange'},{t:'px',x:7,y:26,c:'#ffe070'},{t:'px',x:5,y:23,c:'#ff9a40'},{t:'px',x:9,y:22,c:'#ff9a40'},
]});
ART.gargoyle=()=>mkArt({parts:[
 {t:'p',pts:[[8,12],[1,4],[3,18],[6,24],[11,20]],m:'stone',b:-.1},{t:'p',pts:[[28,12],[35,4],[33,18],[30,24],[25,20]],m:'stone',b:-.1},{t:'l',x0:9,y0:13,x1:2,y1:6,w:1,m:'black',k:.3},{t:'l',x0:27,y0:13,x1:34,y1:6,w:1,m:'black',k:.3},
 {t:'c',x:10,y:28,w:5,h:6,m:'stone'},{t:'c',x:21,y:28,w:5,h:6,m:'stone'},{t:'r',x:9,y:32,w:7,h:3,m:'gray'},{t:'r',x:20,y:32,w:7,h:3,m:'gray'},{t:'px',x:10,y:35,c:'#05030a'},{t:'px',x:14,y:35,c:'#05030a'},
 {t:'e',cx:18,cy:23,rx:9,ry:9,m:'stone'},{t:'e',cx:9,cy:22,rx:3,ry:5,m:'stone'},{t:'e',cx:27,cy:22,rx:3,ry:5,m:'stone'},{t:'r',x:7,y:25,w:5,h:2,m:'gray'},{t:'r',x:25,y:25,w:5,h:2,m:'gray'},
 {t:'e',cx:18,cy:12,rx:7,ry:6.5,m:'stone'},{t:'p',pts:[[11,8],[8,1],[14,6]],m:'bone'},{t:'p',pts:[[25,8],[28,1],[22,6]],m:'bone'},
 {t:'r',x:13,y:10,w:4,h:2,m:'black'},{t:'r',x:20,y:10,w:4,h:2,m:'black'},{t:'px',x:15,y:11,c:'#ff4040'},{t:'px',x:21,y:11,c:'#ff4040'},{t:'r',x:14,y:16,w:8,h:2,m:'black'},{t:'px',x:15,y:17,c:'#fff'},{t:'px',x:20,y:17,c:'#fff'},
 {t:'l',x0:26,y0:30,x1:34,y1:26,w:2,m:'stone',k:.5},{t:'px',x:34,y:25,c:'#8a909e'},
]});
/* Монстры, партия 3: Ледяные пещеры, дракончик */
const spiderFn=c=>mkArt({parts:[
 {t:'l',x0:14,y0:19,x1:3,y1:12,w:2,m:c.leg,k:.55},{t:'l',x0:3,y0:12,x1:2,y1:30,w:2,m:c.leg,k:.55},{t:'l',x0:14,y0:22,x1:2,y1:20,w:2,m:c.leg,k:.55},{t:'l',x0:2,y0:20,x1:4,y1:31,w:2,m:c.leg,k:.5},
 {t:'l',x0:22,y0:19,x1:33,y1:12,w:2,m:c.leg,k:.55},{t:'l',x0:33,y0:12,x1:34,y1:30,w:2,m:c.leg,k:.55},{t:'l',x0:22,y0:22,x1:34,y1:20,w:2,m:c.leg,k:.55},{t:'l',x0:34,y0:20,x1:32,y1:31,w:2,m:c.leg,k:.5},
 {t:'e',cx:18,cy:23,rx:9,ry:8,m:c.body,b:-.05},{t:'e',cx:18,cy:15,rx:6,ry:5,m:c.head},
 {t:'p',pts:[[18,18],[21,27],[18,31],[15,27]],m:c.mark,b:-.1},{t:'e',cx:18,cy:25,rx:2,ry:2.5,m:c.mark,b:.1},
 {t:'px',x:15,y:13,c:c.eye},{t:'px',x:17,y:12,c:c.eye},{t:'px',x:19,y:12,c:c.eye},{t:'px',x:21,y:13,c:c.eye},{t:'px',x:16,y:15,c:c.eye},{t:'px',x:20,y:15,c:c.eye},
 {t:'r',x:15,y:18,w:1,h:3,m:'white'},{t:'r',x:20,y:18,w:1,h:3,m:'white'},
]});
ART.frostspider=()=>spiderFn({leg:'ice',body:'ice',head:'spirit',mark:'white',eye:'#ff6a6a'});
ART.yeti=()=>mkArt({parts:[
 {t:'c',x:10,y:28,w:7,h:6,m:'fur'},{t:'c',x:19,y:28,w:7,h:6,m:'fur'},{t:'e',cx:13,cy:34,rx:5,ry:2.2,m:'ice'},{t:'e',cx:23,cy:34,rx:5,ry:2.2,m:'ice'},
 {t:'e',cx:18,cy:22,rx:13,ry:10.5,m:'fur'},{t:'e',cx:18,cy:26,rx:8,ry:5.5,m:'fur',b:.1},
 {t:'p',pts:[[8,14],[10,19],[13,15],[15,21],[18,16],[21,21],[24,15],[27,19],[29,14],[18,12]],m:'white'},
 {t:'e',cx:6,cy:17,rx:5,ry:4.2,m:'fur',b:.05},{t:'e',cx:30,cy:17,rx:5,ry:4.2,m:'fur',b:.05},
 {t:'e',cx:5.5,cy:25,rx:3.8,ry:8.5,m:'fur'},{t:'e',cx:30.5,cy:25,rx:3.8,ry:8.5,m:'fur'},{t:'e',cx:5.5,cy:32,rx:4,ry:3,m:'fur'},{t:'e',cx:30.5,cy:31,rx:4,ry:3,m:'fur'},
 {t:'p',pts:[[3,30],[5,34],[7,30]],m:'bone'},{t:'p',pts:[[29,29],[31,33],[33,29]],m:'bone'},
 {t:'e',cx:18,cy:10,rx:7,ry:6.5,m:'fur'},{t:'e',cx:18,cy:11,rx:4.6,ry:4.4,m:'ice'},{t:'px',x:15,y:10,c:'#1a1424'},{t:'px',x:21,y:10,c:'#1a1424'},{t:'px',x:15,y:9,c:'#ffffff'},{t:'px',x:21,y:9,c:'#ffffff'},
 {t:'r',x:14,y:13,w:8,h:3,m:'dark'},{t:'px',x:15,y:13,c:'#fff'},{t:'px',x:17,y:13,c:'#fff'},{t:'px',x:19,y:13,c:'#fff'},{t:'px',x:21,y:13,c:'#fff'},
 {t:'p',pts:[[11,5],[9,0],[14,4]],m:'ice'},{t:'p',pts:[[25,5],[27,0],[22,4]],m:'ice'},
]});
ART.icespirit=()=>mkArt({parts:[
 {t:'p',pts:[[18,0],[27,12],[23,26],[18,33],[13,26],[9,12]],m:'ice'},{t:'p',pts:[[18,0],[13,12],[13,26],[18,33]],m:'ice',b:.18},{t:'p',pts:[[18,0],[27,12],[18,14]],m:'spirit',b:.1},
 {t:'p',pts:[[9,12],[1,8],[6,16],[11,18]],m:'spirit'},{t:'p',pts:[[27,12],[35,8],[30,16],[25,18]],m:'spirit'},{t:'p',pts:[[13,26],[7,32],[12,30]],m:'ice'},{t:'p',pts:[[23,26],[29,32],[24,30]],m:'ice'},
 {t:'e',cx:14.8,cy:16,rx:2,ry:2.8,m:'black'},{t:'e',cx:21.2,cy:16,rx:2,ry:2.8,m:'black'},{t:'px',x:14,y:15,c:'#ffffff'},{t:'px',x:21,y:15,c:'#ffffff'},{t:'e',cx:18,cy:22,rx:1.6,ry:2,m:'black'},
 {t:'px',x:4,y:4,c:'#ffffff'},{t:'px',x:32,y:3,c:'#ffffff'},{t:'px',x:3,y:24,c:'#cfeaff'},{t:'px',x:33,y:22,c:'#cfeaff'},{t:'px',x:18,y:35,c:'#a8dcff'},
]});
ART.icegolem=()=>golemFn({s:'ice',s2:'spirit',glow:'#ff6a6a',rune:'glow',moss:'white'});
ART.icequeen=()=>mkArt({w:44,h:44,parts:[
 {t:'p',pts:[[16,18],[28,18],[38,42],[34,38],[30,43],[26,38],[22,44],[18,38],[14,43],[10,38],[6,42]],m:'ice'},
 {t:'p',pts:[[16,19],[21,19],[14,43],[6,42]],m:'ice',b:.16},{t:'p',pts:[[22,24],[23,24],[28,42],[16,42]],m:'spirit',b:-.2},{t:'r',x:15,y:29,w:14,h:2,m:'white'},{t:'e',cx:22,cy:30,rx:2.4,ry:2.4,m:'glow'},{t:'r',x:6,y:40,w:32,h:2,m:'white'},
 {t:'p',pts:[[16,16],[6,20],[1,34],[7,32],[11,22]],m:'spirit'},{t:'p',pts:[[28,16],[38,20],[43,34],[37,32],[33,22]],m:'spirit'},
 {t:'e',cx:22,cy:18,rx:6,ry:5,m:'ice'},{t:'e',cx:22,cy:11,rx:6.4,ry:7,m:'skin',b:.1},{t:'e',cx:22,cy:11,rx:6.4,ry:7,m:'spirit',b:-.05},
 {t:'p',pts:[[15,8],[22,3],[29,8],[31,20],[28,22],[27,12],[22,8],[17,12],[16,22],[13,20]],m:'white'},
 {t:'px',x:19,y:11,c:'#1a1424'},{t:'px',x:25,y:11,c:'#1a1424'},{t:'px',x:19,y:10,c:'#9affff'},{t:'px',x:25,y:10,c:'#9affff'},{t:'r',x:21,y:15,w:2,h:1,m:'crimson'},
 {t:'p',pts:[[14,6],[16,0],[19,5],[22,-2],[25,5],[28,0],[30,6]],m:'ice',b:.2},{t:'r',x:14,y:5,w:16,h:2,m:'gold'},{t:'px',x:22,y:3,c:'#ff7a9a'},
 {t:'l',x0:41,y0:44,x1:41,y1:12,w:2,m:'steel',k:.7},{t:'p',pts:[[41,2],[44,9],[41,13],[38,9]],m:'ice',b:.2},{t:'e',cx:41,cy:8,rx:2.4,ry:2.4,m:'glow'},{t:'px',x:36,y:5,c:'#ffffff'},{t:'px',x:41,y:1,c:'#ffffff'},
]});
ART.whelp=()=>mkArt({parts:[
 {t:'p',pts:[[9,14],[1,6],[3,20],[7,24],[11,22]],m:'red',b:-.1},{t:'p',pts:[[27,14],[35,6],[33,20],[29,24],[25,22]],m:'red',b:-.1},
 {t:'l',x0:9,y0:15,x1:2,y1:8,w:1,m:'crimson',k:.3},{t:'l',x0:27,y0:15,x1:34,y1:8,w:1,m:'crimson',k:.3},
 {t:'p',pts:[[24,28],[34,32],[30,34],[22,32]],m:'red'},{t:'p',pts:[[34,32],[36,28],[37,34]],m:'orange'},
 {t:'c',x:11,y:29,w:5,h:5,m:'red'},{t:'c',x:20,y:29,w:5,h:5,m:'red'},{t:'px',x:11,y:34,c:'#fff0a0'},{t:'px',x:15,y:34,c:'#fff0a0'},
 {t:'e',cx:18,cy:23,rx:9,ry:8,m:'red'},{t:'e',cx:18,cy:26,rx:5.5,ry:5.5,m:'yellow'},{t:'r',x:13,y:24,w:10,h:1,m:'orange'},{t:'r',x:13,y:27,w:10,h:1,m:'orange'},{t:'r',x:14,y:30,w:8,h:1,m:'orange'},
 {t:'e',cx:18,cy:12,rx:7,ry:6,m:'red'},{t:'e',cx:18,cy:16,rx:4.4,ry:3.2,m:'red',b:.08},{t:'px',x:16,y:17,c:'#2c0a10'},{t:'px',x:20,y:17,c:'#2c0a10'},
 {t:'px',x:14,y:11,c:'#fff070'},{t:'px',x:22,y:11,c:'#fff070'},{t:'px',x:14,y:12,c:'#1a1424'},{t:'px',x:22,y:12,c:'#1a1424'},{t:'r',x:14,y:9,w:3,h:1,m:'crimson'},{t:'r',x:20,y:9,w:3,h:1,m:'crimson'},
 {t:'p',pts:[[12,7],[10,1],[15,5]],m:'bone'},{t:'p',pts:[[24,7],[26,1],[21,5]],m:'bone'},{t:'px',x:17,y:19,c:'#ffffff'},{t:'px',x:19,y:19,c:'#ffffff'},
]});
/* Монстры, партия 4: Гиблые топи и Ядовитые катакомбы (+ мини-боссы Гидра и Королева пауков) */
ART.toad=()=>mkArt({parts:[
 {t:'e',cx:8,cy:29,rx:6,ry:4.6,m:'bog',b:-.1},{t:'r',x:2,y:32,w:9,h:2,m:'bog',b:-.2},{t:'px',x:3,y:33,c:'#9cc86a'},{t:'px',x:6,y:33,c:'#9cc86a'},{t:'px',x:9,y:33,c:'#9cc86a'},
 {t:'e',cx:28,cy:29,rx:5,ry:4.2,m:'bog',b:-.1},{t:'r',x:26,y:32,w:9,h:2,m:'bog',b:-.2},{t:'px',x:27,y:33,c:'#9cc86a'},{t:'px',x:30,y:33,c:'#9cc86a'},{t:'px',x:33,y:33,c:'#9cc86a'},
 {t:'e',cx:18,cy:24,rx:13,ry:9,m:'bog'},{t:'e',cx:18,cy:28,rx:8,ry:4,m:'bone',b:-.05},
 {t:'px',x:11,y:19,c:'#3a5a28'},{t:'px',x:15,y:17,c:'#3a5a28'},{t:'px',x:22,y:18,c:'#3a5a28'},{t:'px',x:26,y:21,c:'#3a5a28'},{t:'px',x:9,y:24,c:'#3a5a28'},
 {t:'e',cx:19,cy:16,rx:9.5,ry:6,m:'bog',b:.05},
 {t:'e',cx:12,cy:11,rx:3.4,ry:3.4,m:'bog'},{t:'e',cx:25,cy:11,rx:3.4,ry:3.4,m:'bog'},{t:'e',cx:12,cy:11,rx:2.3,ry:2.3,m:'yellow'},{t:'e',cx:25,cy:11,rx:2.3,ry:2.3,m:'yellow'},
 {t:'r',x:12,y:9,w:1,h:4,m:'black'},{t:'r',x:25,y:9,w:1,h:4,m:'black'},
 {t:'r',x:9,y:19,w:20,h:1,m:'dark'},{t:'px',x:9,y:18,c:'#1a1424'},{t:'px',x:28,y:18,c:'#1a1424'},{t:'r',x:17,y:20,w:6,h:2,m:'red'},
]});
ART.leech=()=>mkArt({parts:[
 {t:'e',cx:7,cy:30,rx:5,ry:3.6,m:'mud',b:-.1},{t:'e',cx:12,cy:26,rx:6,ry:4.6,m:'mud'},{t:'e',cx:18,cy:23,rx:6.4,ry:5,m:'mud',b:.05},{t:'e',cx:23.5,cy:19,rx:6,ry:5,m:'mud'},
 {t:'p',pts:[[11,22],[13,22],[8,31],[6,30]],m:'orange',b:-.1},{t:'p',pts:[[17,18],[19,18],[19,28],[16,27]],m:'orange',b:-.1},{t:'p',pts:[[23,14],[25,14],[24,23],[22,23]],m:'orange',b:-.1},
 {t:'e',cx:28,cy:12,rx:5.2,ry:5.6,m:'mud',b:.1},{t:'e',cx:29,cy:11,rx:3,ry:3.2,m:'red'},{t:'e',cx:29,cy:11,rx:1.4,ry:1.5,m:'black'},
 {t:'px',x:27,y:8,c:'#fff'},{t:'px',x:31,y:9,c:'#fff'},{t:'px',x:30,y:14,c:'#fff'},{t:'px',x:27,y:13,c:'#fff'},
 {t:'px',x:25,y:8,c:'#ffe27a'},{t:'px',x:32,y:6,c:'#ffe27a'},
]});
ART.croc=()=>mkArt({parts:[
 {t:'p',pts:[[1,29],[9,22],[11,28],[4,32]],m:'crocgreen',b:-.1},{t:'p',pts:[[0,31],[3,27],[5,31]],m:'crocgreen',b:-.2},
 {t:'c',x:10,y:28,w:4,h:6,m:'crocgreen',b:-.15},{t:'c',x:22,y:28,w:4,h:6,m:'crocgreen',b:-.15},{t:'r',x:9,y:33,w:6,h:2,m:'bone'},{t:'r',x:21,y:33,w:6,h:2,m:'bone'},
 {t:'e',cx:17,cy:24,rx:14,ry:6.6,m:'crocgreen'},{t:'e',cx:19,cy:28,rx:9,ry:3,m:'bone',b:-.1},
 {t:'p',pts:[[6,19],[8,16],[10,19]],m:'bog'},{t:'p',pts:[[12,18],[14,14],[16,18]],m:'bog'},{t:'p',pts:[[18,18],[20,14],[22,18]],m:'bog'},{t:'p',pts:[[24,19],[26,16],[28,19]],m:'bog'},
 {t:'e',cx:28,cy:21,rx:5.5,ry:4.4,m:'crocgreen',b:.05},{t:'r',x:27,y:19,w:9,h:5,m:'crocgreen',b:.05},
 {t:'r',x:27,y:23,w:9,h:1,m:'dark'},{t:'px',x:28,y:24,c:'#fff'},{t:'px',x:30,y:24,c:'#fff'},{t:'px',x:32,y:24,c:'#fff'},{t:'px',x:34,y:24,c:'#fff'},{t:'px',x:29,y:22,c:'#fff'},{t:'px',x:33,y:22,c:'#fff'},
 {t:'e',cx:27,cy:18,rx:2,ry:2,m:'yellow'},{t:'px',x:27,y:18,c:'#05030a'},{t:'px',x:35,y:20,c:'#05030a'},
]});
ART.bogwitch=()=>mkArt({parts:[
 {t:'p',pts:[[13,15],[23,15],[30,34],[6,34]],m:'witchc'},{t:'p',pts:[[13,15],[16,15],[12,34],[6,34]],m:'witchc',b:.12},{t:'p',pts:[[18,19],[20,19],[23,34],[15,34]],m:'witchc',b:-.18},
 {t:'r',x:11,y:23,w:14,h:2,m:'leather'},{t:'px',x:18,y:24,c:'#ddffa0'},{t:'r',x:7,y:32,w:22,h:2,m:'mud'},
 {t:'e',cx:10,cy:20,rx:3,ry:5,m:'witchc'},{t:'e',cx:26,cy:19,rx:3,ry:5,m:'witchc'},{t:'e',cx:27,cy:24,rx:2.4,ry:2.4,m:'bog'},{t:'e',cx:9,cy:25,rx:2.4,ry:2.4,m:'bog'},
 {t:'l',x0:31,y0:5,x1:29,y1:34,w:2,m:'wood',k:.6},{t:'e',cx:31,cy:5,rx:3.2,ry:3.4,m:'acid'},{t:'px',x:30,y:4,c:'#fff'},
 {t:'p',pts:[[12,10],[14,15],[11,24],[9,26],[10,15]],m:'wolfgray',b:-.1},{t:'p',pts:[[24,10],[22,15],[25,24],[27,26],[26,15]],m:'wolfgray',b:-.1},
 {t:'e',cx:18,cy:11,rx:5.2,ry:5.6,m:'bog',b:.05},{t:'px',x:16,y:11,c:'#fff070'},{t:'px',x:20,y:11,c:'#fff070'},{t:'p',pts:[[17,12],[19,12],[18,16]],m:'bog',b:-.2},{t:'r',x:16,y:15,w:4,h:1,m:'dark'},
 {t:'e',cx:18,cy:7.5,rx:9.5,ry:2.4,m:'dark'},{t:'p',pts:[[13,7],[23,7],[19,0],[16,0],[17,3]],m:'dark'},{t:'r',x:13,y:6,w:10,h:2,m:'yellow'},
]});
ART.wisp=()=>mkArt({parts:[
 {t:'p',pts:[[18,0],[24,9],[28,17],[24,28],[18,33],[12,28],[8,17],[12,9]],m:'orange'},
 {t:'p',pts:[[18,6],[22,13],[24,20],[21,27],[18,30],[15,27],[12,20],[14,13]],m:'yellow',b:.1},
 {t:'p',pts:[[18,12],[21,18],[18,27],[15,18]],m:'white',b:.15},
 {t:'p',pts:[[6,20],[2,13],[9,15]],m:'orange',b:.1},{t:'p',pts:[[30,20],[34,13],[27,15]],m:'orange',b:.1},{t:'p',pts:[[13,31],[9,35],[16,33]],m:'orange',b:-.1},{t:'p',pts:[[23,31],[27,35],[20,33]],m:'orange',b:-.1},
 {t:'e',cx:15,cy:19,rx:1.6,ry:2.4,m:'black'},{t:'e',cx:21,cy:19,rx:1.6,ry:2.4,m:'black'},{t:'r',x:16,y:24,w:4,h:1,m:'black'},
]});
ART.hydra=()=>mkArt({w:44,h:44,parts:[
 {t:'p',pts:[[1,38],[8,30],[14,34],[6,42]],m:'crocgreen',b:-.1},{t:'p',pts:[[43,38],[36,30],[30,34],[38,42]],m:'crocgreen',b:-.1},
 {t:'e',cx:22,cy:34,rx:17,ry:9,m:'crocgreen'},{t:'e',cx:22,cy:38,rx:11,ry:4.5,m:'bone',b:-.1},
 {t:'l',x0:14,y0:30,x1:7,y1:15,w:5,m:'crocgreen',k:.55},{t:'l',x0:22,y0:30,x1:22,y1:10,w:5,m:'crocgreen',k:.6},{t:'l',x0:30,y0:30,x1:37,y1:15,w:5,m:'crocgreen',k:.55},
 {t:'e',cx:6,cy:13,rx:5.4,ry:4.4,m:'crocgreen',b:.05},{t:'p',pts:[[1,13],[-1,16],[4,17]],m:'crocgreen'},{t:'r',x:2,y:16,w:8,h:1,m:'dark'},{t:'px',x:3,y:17,c:'#fff'},{t:'px',x:6,y:17,c:'#fff'},{t:'e',cx:7,cy:11,rx:1.6,ry:1.6,m:'yellow'},
 {t:'e',cx:22,cy:7,rx:6,ry:5,m:'crocgreen',b:.08},{t:'r',x:17,y:10,w:10,h:1,m:'dark'},{t:'px',x:18,y:11,c:'#fff'},{t:'px',x:22,y:11,c:'#fff'},{t:'px',x:25,y:11,c:'#fff'},{t:'e',cx:20,cy:5.5,rx:1.6,ry:1.6,m:'yellow'},{t:'e',cx:25,cy:5.5,rx:1.6,ry:1.6,m:'yellow'},
 {t:'e',cx:38,cy:13,rx:5.4,ry:4.4,m:'crocgreen',b:.05},{t:'p',pts:[[43,13],[45,16],[40,17]],m:'crocgreen'},{t:'r',x:34,y:16,w:8,h:1,m:'dark'},{t:'px',x:35,y:17,c:'#fff'},{t:'px',x:38,y:17,c:'#fff'},{t:'e',cx:37,cy:11,rx:1.6,ry:1.6,m:'yellow'},
 {t:'p',pts:[[14,29],[16,25],[18,29]],m:'bog'},{t:'p',pts:[[20,27],[22,23],[24,27]],m:'bog'},{t:'p',pts:[[26,29],[28,25],[30,29]],m:'bog'},
 {t:'px',x:6,y:12,c:'#05030a'},{t:'px',x:21,y:5,c:'#05030a'},{t:'px',x:26,y:5,c:'#05030a'},{t:'px',x:38,y:12,c:'#05030a'},
 {t:'px',x:15,y:34,c:'#8ae850'},{t:'px',x:29,y:35,c:'#8ae850'},{t:'px',x:22,y:31,c:'#8ae850'},
]});
ART.plaguerat=()=>mkArt({parts:[
 {t:'l',x0:6,y0:27,x1:1,y1:20,w:2,m:'pink',k:.5},{t:'l',x0:1,y0:20,x1:3,y1:13,w:1,m:'pink',k:.5},
 {t:'c',x:9,y:28,w:3,h:5,m:'rat',b:-.15},{t:'c',x:22,y:28,w:3,h:5,m:'rat',b:-.15},{t:'r',x:8,y:32,w:5,h:2,m:'pink',b:-.2},{t:'r',x:21,y:32,w:5,h:2,m:'pink',b:-.2},
 {t:'e',cx:16,cy:25,rx:11,ry:7,m:'rat'},{t:'e',cx:17,cy:29,rx:7,ry:3,m:'bone',b:-.2},
 {t:'p',pts:[[24,17],[27,11],[30,17]],m:'rat',b:-.1},{t:'p',pts:[[26,18],[28,13],[29,18]],m:'pink'},
 {t:'e',cx:28,cy:22,rx:5.5,ry:4.5,m:'rat',b:.05},{t:'p',pts:[[31,19],[36,23],[31,26]],m:'rat',b:.05},{t:'px',x:35,y:23,c:'#ff8aa0'},
 {t:'px',x:28,y:20,c:'#ff4040'},{t:'px',x:30,y:20,c:'#ff4040'},{t:'px',x:32,y:26,c:'#fff'},{t:'px',x:30,y:26,c:'#fff'},
 {t:'px',x:11,y:21,c:'#8ae850'},{t:'px',x:16,y:20,c:'#8ae850'},{t:'px',x:20,y:21,c:'#8ae850'},{t:'px',x:33,y:28,c:'#8ae850'},{t:'px',x:33,y:30,c:'#8ae850'},
]});
ART.acidslime=()=>mkArt({parts:[
 {t:'e',cx:18,cy:25,rx:15,ry:10,m:'acid'},{t:'e',cx:18,cy:30,rx:16,ry:4,m:'acid',b:-.15},
 {t:'e',cx:18,cy:19,rx:11,ry:7,m:'acid',b:.12},
 {t:'e',cx:10,cy:24,rx:2.2,ry:2.2,m:'white',b:-.1},{t:'e',cx:26,cy:27,rx:2.6,ry:2.6,m:'white',b:-.1},{t:'e',cx:21,cy:30,rx:1.6,ry:1.6,m:'white',b:-.1},{t:'e',cx:14,cy:29,rx:1.3,ry:1.3,m:'white',b:-.1},
 {t:'r',x:13,y:21,w:3,h:4,m:'black'},{t:'r',x:21,y:21,w:3,h:4,m:'black'},{t:'px',x:14,y:21,c:'#ffffff'},{t:'px',x:22,y:21,c:'#ffffff'},{t:'r',x:16,y:27,w:5,h:1,m:'black'},
 {t:'p',pts:[[6,31],[8,31],[7,35]],m:'acid'},{t:'p',pts:[[28,31],[30,31],[29,36]],m:'acid'},{t:'px',x:18,y:12,c:'#ddffa0'},{t:'px',x:24,y:14,c:'#ddffa0'},
]});
ART.alchemist=()=>mkArt({parts:[
 {t:'c',x:12,y:27,w:5,h:6,m:'dark'},{t:'c',x:19,y:27,w:5,h:6,m:'dark'},{t:'r',x:11,y:32,w:7,h:3,m:'leather'},{t:'r',x:18,y:32,w:7,h:3,m:'leather'},
 {t:'p',pts:[[24,14],[31,18],[31,30],[25,28]],m:'brown'},{t:'e',cx:29,cy:20,rx:2,ry:3,m:'acid'},{t:'e',cx:29,cy:26,rx:1.8,ry:2.6,m:'purple'},
 {t:'p',pts:[[10,15],[26,15],[28,31],[8,31]],m:'leather'},{t:'p',pts:[[13,16],[23,16],[24,30],[12,30]],m:'white',b:-.1},{t:'r',x:11,y:24,w:14,h:2,m:'brown'},{t:'e',cx:18,cy:25,rx:1.5,ry:1.5,m:'gold'},
 {t:'e',cx:9,cy:20,rx:3,ry:5,m:'leather'},{t:'e',cx:7,cy:25,rx:2.5,ry:2.5,m:'skin'},
 {t:'e',cx:27,cy:18,rx:3,ry:4.5,m:'leather'},{t:'e',cx:30,cy:13,rx:2.5,ry:2.5,m:'skin'},
 {t:'e',cx:33,cy:7,rx:3.2,ry:3.4,m:'acid'},{t:'r',x:32,y:3,w:3,h:3,m:'white'},{t:'r',x:32,y:1,w:3,h:2,m:'wood'},{t:'px',x:32,y:6,c:'#ddffa0'},
 {t:'e',cx:18,cy:9,rx:5.8,ry:6.2,m:'skin'},{t:'p',pts:[[12,7],[24,7],[23,3],[13,3]],m:'brown'},{t:'r',x:11,y:7,w:14,h:2,m:'leather'},
 {t:'e',cx:15,cy:10,rx:2.4,ry:2.4,m:'gold'},{t:'e',cx:21,cy:10,rx:2.4,ry:2.4,m:'gold'},{t:'e',cx:15,cy:10,rx:1.4,ry:1.4,m:'acid'},{t:'e',cx:21,cy:10,rx:1.4,ry:1.4,m:'acid'},
 {t:'r',x:14,y:13,w:8,h:3,m:'gray'},{t:'px',x:15,y:14,c:'#1a1424'},{t:'px',x:20,y:14,c:'#1a1424'},
]});
ART.zombie=()=>mkArt({parts:[
 {t:'c',x:12,y:27,w:5,h:7,m:'flesh',b:-.1},{t:'c',x:19,y:27,w:5,h:7,m:'flesh',b:-.1},{t:'r',x:11,y:33,w:7,h:2,m:'mud'},{t:'r',x:18,y:33,w:7,h:2,m:'mud'},
 {t:'p',pts:[[11,15],[25,15],[26,29],[24,32],[21,29],[18,32],[15,29],[12,32],[10,29]],m:'brown'},{t:'r',x:10,y:24,w:16,h:2,m:'leather'},
 {t:'cut',x:15,y:19,w:1,h:3},{t:'r',x:14,y:20,w:5,h:3,m:'flesh',b:-.2},{t:'px',x:15,y:21,c:'#e0d8be'},{t:'px',x:17,y:21,c:'#e0d8be'},
 {t:'e',cx:9,cy:19,rx:2.6,ry:4,m:'flesh'},{t:'l',x0:10,y0:18,x1:2,y1:20,w:3,m:'flesh',k:.55},{t:'e',cx:2.5,cy:20,rx:2.2,ry:2.2,m:'flesh',b:.1},
 {t:'l',x0:26,y0:18,x1:33,y1:20,w:3,m:'flesh',k:.55},{t:'e',cx:33.5,cy:20,rx:2.2,ry:2.2,m:'flesh',b:.1},
 {t:'e',cx:18,cy:9,rx:5.8,ry:6.4,m:'flesh'},{t:'p',pts:[[13,5],[18,3],[23,5],[21,7],[18,5],[15,7]],m:'hair'},
 {t:'e',cx:15.5,cy:9,rx:2,ry:2,m:'black'},{t:'e',cx:20.5,cy:9,rx:2,ry:2,m:'black'},{t:'px',x:15,y:9,c:'#fff070'},{t:'px',x:21,y:9,c:'#fff070'},
 {t:'r',x:15,y:13,w:6,h:2,m:'black'},{t:'px',x:16,y:13,c:'#e0d8be'},{t:'px',x:19,y:13,c:'#e0d8be'},{t:'px',x:26,y:22,c:'#8ae850'},{t:'px',x:11,y:27,c:'#8ae850'},
]});
ART.scorpion=()=>mkArt({parts:[
 {t:'l',x0:10,y0:24,x1:3,y1:30,w:2,m:'chitin',k:.5},{t:'l',x0:13,y0:27,x1:7,y1:34,w:2,m:'chitin',k:.5},{t:'l',x0:22,y0:27,x1:28,y1:34,w:2,m:'chitin',k:.5},{t:'l',x0:25,y0:24,x1:32,y1:30,w:2,m:'chitin',k:.5},
 {t:'e',cx:18,cy:25,rx:9.5,ry:5.8,m:'chitin'},{t:'r',x:11,y:22,w:1,h:7,m:'chitin',b:-.25},{t:'r',x:16,y:20,w:1,h:10,m:'chitin',b:-.25},{t:'r',x:21,y:20,w:1,h:10,m:'chitin',b:-.25},
 {t:'e',cx:23,cy:19,rx:5,ry:3.6,m:'chitin',b:.1},{t:'px',x:22,y:17,c:'#ff4040'},{t:'px',x:25,y:17,c:'#ff4040'},
 {t:'l',x0:24,y0:19,x1:30,y1:15,w:3,m:'chitin',k:.55},{t:'e',cx:31,cy:14,rx:4.4,ry:3.4,m:'chitin',b:.05},{t:'r',x:30,y:15,w:5,h:1,m:'dark'},
 {t:'l',x0:24,y0:18,x1:27,y1:23,w:3,m:'chitin',k:.55},{t:'e',cx:28,cy:25,rx:3.4,ry:2.8,m:'chitin',b:.05},{t:'r',x:27,y:24,w:4,h:1,m:'dark'},
 {t:'e',cx:7,cy:23,rx:3.2,ry:3,m:'chitin',b:-.05},{t:'e',cx:6,cy:15,rx:3,ry:3,m:'chitin'},{t:'e',cx:9,cy:8,rx:3,ry:2.8,m:'chitin',b:.05},{t:'e',cx:14,cy:4,rx:3,ry:2.6,m:'chitin',b:.1},
 {t:'p',pts:[[17,2],[21,4],[16,6]],m:'acid'},{t:'px',x:19,y:3,c:'#ddffa0'},{t:'px',x:18,y:7,c:'#8ae850'},
]});
ART.spiderqueen=()=>mkArt({w:44,h:44,parts:[
 {t:'l',x0:17,y0:24,x1:3,y1:14,w:2,m:'purple',k:.5},{t:'l',x0:3,y0:14,x1:1,y1:38,w:2,m:'purple',k:.5},{t:'l',x0:16,y0:28,x1:1,y1:26,w:2,m:'purple',k:.5},{t:'l',x0:1,y0:26,x1:5,y1:40,w:2,m:'purple',k:.45},
 {t:'l',x0:27,y0:24,x1:41,y1:14,w:2,m:'purple',k:.5},{t:'l',x0:41,y0:14,x1:43,y1:38,w:2,m:'purple',k:.5},{t:'l',x0:28,y0:28,x1:43,y1:26,w:2,m:'purple',k:.5},{t:'l',x0:43,y0:26,x1:39,y1:40,w:2,m:'purple',k:.45},
 {t:'e',cx:22,cy:30,rx:11,ry:10,m:'black'},{t:'e',cx:22,cy:30,rx:9,ry:8,m:'purple',b:-.1},
 {t:'p',pts:[[22,22],[26,30],[22,38],[18,30]],m:'acid',b:-.05},{t:'p',pts:[[19,26],[25,26],[22,30]],m:'black'},{t:'p',pts:[[19,34],[25,34],[22,30]],m:'black'},
 {t:'e',cx:22,cy:18,rx:7.4,ry:6.2,m:'black',b:.1},
 {t:'px',x:18,y:15,c:'#ff4040'},{t:'px',x:20,y:14,c:'#ff4040'},{t:'px',x:24,y:14,c:'#ff4040'},{t:'px',x:26,y:15,c:'#ff4040'},{t:'px',x:19,y:17,c:'#ffb0a0'},{t:'px',x:25,y:17,c:'#ffb0a0'},
 {t:'p',pts:[[17,21],[19,21],[18,26]],m:'bone'},{t:'p',pts:[[25,21],[27,21],[26,26]],m:'bone'},{t:'px',x:18,y:26,c:'#8ae850'},{t:'px',x:26,y:26,c:'#8ae850'},
 {t:'p',pts:[[15,12],[17,6],[19,10],[22,3],[25,10],[27,6],[29,12]],m:'gold'},{t:'r',x:15,y:11,w:14,h:2,m:'gold',b:-.1},{t:'px',x:22,y:6,c:'#d84848'},{t:'px',x:17,y:9,c:'#4a88ec'},{t:'px',x:27,y:9,c:'#4a88ec'},
]});
ART.mimic=()=>mkArt({parts:[
 {t:'c',x:7,y:31,w:4,h:4,m:'mud',b:-.1},{t:'c',x:25,y:31,w:4,h:4,m:'mud',b:-.1},{t:'c',x:16,y:32,w:4,h:3,m:'mud',b:-.1},
 {t:'r',x:5,y:19,w:26,h:13,m:'wood'},{t:'r',x:5,y:19,w:26,h:2,m:'leather'},{t:'r',x:5,y:29,w:26,h:2,m:'leather'},{t:'r',x:5,y:19,w:2,h:13,m:'gold',b:-.1},{t:'r',x:29,y:19,w:2,h:13,m:'gold',b:-.1},{t:'r',x:16,y:20,w:4,h:6,m:'gold'},{t:'px',x:18,y:23,c:'#3a2a10'},
 {t:'r',x:7,y:22,w:22,h:7,m:'black'},
 {t:'p',pts:[[8,22],[10,22],[9,27]],m:'white'},{t:'p',pts:[[12,22],[14,22],[13,27]],m:'white'},{t:'p',pts:[[22,22],[24,22],[23,27]],m:'white'},{t:'p',pts:[[26,22],[28,22],[27,27]],m:'white'},
 {t:'p',pts:[[9,29],[11,29],[10,24]],m:'white'},{t:'p',pts:[[15,29],[17,29],[16,24]],m:'white'},{t:'p',pts:[[19,29],[21,29],[20,24]],m:'white'},{t:'p',pts:[[25,29],[27,29],[26,24]],m:'white'},
 {t:'e',cx:18,cy:27,rx:5,ry:2.4,m:'crimson'},{t:'r',x:17,y:25,w:2,h:5,m:'red',b:-.1},
 {t:'p',pts:[[3,19],[33,19],[31,7],[5,7]],m:'wood'},{t:'r',x:3,y:6,w:30,h:3,m:'leather'},{t:'r',x:3,y:17,w:30,h:2,m:'leather'},{t:'r',x:3,y:6,w:2,h:13,m:'gold',b:-.1},{t:'r',x:31,y:6,w:2,h:13,m:'gold',b:-.1},
 {t:'p',pts:[[8,17],[10,17],[9,12]],m:'white'},{t:'p',pts:[[14,17],[16,17],[15,12]],m:'white'},{t:'p',pts:[[20,17],[22,17],[21,12]],m:'white'},{t:'p',pts:[[26,17],[28,17],[27,12]],m:'white'},
 {t:'e',cx:12,cy:11,rx:2.4,ry:2.6,m:'yellow'},{t:'e',cx:24,cy:11,rx:2.4,ry:2.6,m:'yellow'},{t:'r',x:12,y:10,w:1,h:3,m:'black'},{t:'r',x:24,y:10,w:1,h:3,m:'black'},
]});
ART.stalker=()=>mkArt({parts:[
 {t:'p',pts:[[9,14],[27,14],[31,34],[5,34]],m:'dark',b:-.12},
 {t:'c',x:12,y:27,w:5,h:7,m:'darkplate'},{t:'c',x:19,y:27,w:5,h:7,m:'darkplate'},{t:'r',x:11,y:32,w:7,h:3,m:'leather'},{t:'r',x:18,y:32,w:7,h:3,m:'leather'},
 {t:'c',x:12,y:15,w:12,h:13,m:'moss'},{t:'l',x0:12,y0:16,x1:24,y1:27,w:2,m:'leather',k:.45},{t:'r',x:12,y:25,w:12,h:2,m:'leather'},{t:'r',x:16,y:25,w:4,h:2,m:'bone'},
 {t:'e',cx:10,cy:20,rx:3,ry:5,m:'moss'},{t:'e',cx:26,cy:20,rx:3,ry:5,m:'moss'},
 {t:'p',pts:[[25,6],[30,8],[29,26],[25,24]],m:'leather'},{t:'px',x:27,y:5,c:'#e34540'},{t:'px',x:29,y:6,c:'#e34540'},
 {t:'e',cx:18,cy:9,rx:7,ry:7.6,m:'moss',b:-.05},{t:'e',cx:18,cy:11,rx:4.6,ry:4.2,m:'black'},{t:'r',x:15,y:10,w:2,h:1,m:'red'},{t:'r',x:20,y:10,w:2,h:1,m:'red'},
 {t:'p',pts:[[18,0],[24,5],[23,9],[18,4],[13,9],[12,5]],m:'moss',b:.08},
 {t:'p',pts:[[14,1],[11,0],[13,4]],m:'bone'},{t:'p',pts:[[22,1],[25,0],[23,4]],m:'bone'},
 {t:'r',x:1,y:20,w:12,h:3,m:'wood'},{t:'l',x0:2,y0:15,x1:2,y1:28,w:2,m:'wood',k:.6},{t:'l',x0:2,y0:15,x1:7,y1:21,w:1,m:'white',k:.7},{t:'l',x0:2,y0:28,x1:7,y1:22,w:1,m:'white',k:.7},
 {t:'l',x0:0,y0:21,x1:10,y1:21,w:1,m:'steel',k:.8},{t:'px',x:0,y:21,c:'#cfd6e8'},{t:'e',cx:8,cy:23,rx:2.2,ry:2.2,m:'skin',b:-.2},
]});
ART.hydrahead=()=>mkArt({parts:[
 {t:'e',cx:14,cy:30,rx:10,ry:4,m:'crocgreen',b:-.15},{t:'l',x0:10,y0:30,x1:16,y1:18,w:6,m:'crocgreen',k:.55},
 {t:'e',cx:20,cy:14,rx:9,ry:6.5,m:'crocgreen',b:.06},{t:'p',pts:[[26,12],[35,15],[27,19]],m:'crocgreen'},{t:'r',x:24,y:16,w:11,h:1,m:'dark'},
 {t:'px',x:26,y:17,c:'#fff'},{t:'px',x:29,y:17,c:'#fff'},{t:'px',x:32,y:17,c:'#fff'},{t:'px',x:27,y:15,c:'#fff'},{t:'px',x:31,y:15,c:'#fff'},
 {t:'e',cx:21,cy:11,rx:2,ry:2,m:'yellow'},{t:'px',x:21,y:11,c:'#05030a'},
 {t:'p',pts:[[14,9],[16,4],[18,9]],m:'bog'},{t:'p',pts:[[18,8],[20,3],[22,8]],m:'bog'},
 {t:'px',x:8,y:30,c:'#c42a2a'},{t:'px',x:11,y:31,c:'#c42a2a'},{t:'px',x:16,y:32,c:'#8ae850'},
]});
/* Декорации и Дракон */
const leafBlob=(cx,cy,rx,ry,m,b)=>({t:'e',cx,cy,rx,ry,m,b:b||0});
ART.tree=()=>mkArt({parts:[
 {t:'c',x:15,y:22,w:6,h:12,m:'wood'},{t:'p',pts:[[13,34],[15,28],[21,28],[23,34]],m:'wood',b:-.1},{t:'px',x:17,y:26,c:'#2b1a0c'},{t:'px',x:18,y:29,c:'#2b1a0c'},
 leafBlob(12,17,8,7,'green',-.05),leafBlob(24,17,8,7,'green',-.12),leafBlob(18,11,10,8.5,'green'),leafBlob(18,18,9,6,'green',-.18),leafBlob(13,9,5,4,'green',.14),
 {t:'px',x:20,y:8,c:'#aae870'},{t:'px',x:11,y:14,c:'#aae870'},{t:'px',x:25,y:14,c:'#143418'},{t:'px',x:16,y:20,c:'#143418'},{t:'px',x:22,y:6,c:'#aae870'},
]});
ART.oldtree=()=>mkArt({parts:[
 {t:'p',pts:[[11,35],[14,20],[22,20],[25,35]],m:'wood'},{t:'p',pts:[[11,35],[14,20],[17,20],[14,35]],m:'wood',b:.12},{t:'e',cx:18,cy:27,rx:3,ry:4.5,m:'black'},{t:'px',x:17,y:26,c:'#f0c030'},{t:'px',x:19,y:26,c:'#f0c030'},
 {t:'l',x0:14,y0:21,x1:5,y1:12,w:3,m:'wood',k:.55},{t:'l',x0:22,y0:21,x1:31,y1:11,w:3,m:'wood',k:.55},
 leafBlob(7,10,6,5,'orange'),leafBlob(30,9,6.5,5,'orange',-.1),leafBlob(18,8,10,8,'orange'),leafBlob(13,15,6,4.5,'orange',-.12),leafBlob(25,15,6,4.5,'orange',-.2),
 {t:'px',x:15,y:5,c:'#ffd070'},{t:'px',x:6,y:8,c:'#ffd070'},{t:'px',x:29,y:7,c:'#ffd070'},{t:'px',x:22,y:12,c:'#6a2a08'},
]});
ART.rock=()=>mkArt({parts:[
 {t:'e',cx:18,cy:26,rx:14,ry:9,m:'stone'},{t:'p',pts:[[6,29],[10,17],[18,12],[27,16],[31,28]],m:'stone'},{t:'p',pts:[[6,29],[10,17],[18,12],[17,20],[12,30]],m:'stone',b:.14},
 {t:'p',pts:[[24,30],[27,16],[31,28]],m:'stone',b:-.25},{t:'l',x0:14,y0:18,x1:17,y1:26,w:1,m:'black',k:.3},{t:'l',x0:22,y0:16,x1:20,y1:24,w:1,m:'black',k:.3},
 {t:'e',cx:30,cy:29,rx:4,ry:3,m:'stone',b:-.1},{t:'e',cx:7,cy:30,rx:3,ry:2.4,m:'stone'},{t:'e',cx:13,cy:15,rx:4,ry:2,m:'moss'},{t:'e',cx:24,cy:28,rx:3,ry:1.6,m:'moss'},
]});
ART.pillar=()=>mkArt({parts:[
 {t:'r',x:9,y:30,w:18,h:5,m:'stone'},{t:'r',x:11,y:27,w:14,h:3,m:'stone',b:.05},{t:'c',x:12,y:9,w:12,h:19,m:'stone'},
 {t:'r',x:9,y:5,w:18,h:4,m:'stone'},{t:'r',x:10,y:2,w:16,h:3,m:'stone',b:.08},{t:'p',pts:[[12,9],[16,13],[20,9]],m:'stone',b:-.2},
 {t:'l',x0:15,y0:12,x1:16,y1:27,w:1,m:'black',k:.25},{t:'l',x0:21,y0:12,x1:20,y1:26,w:1,m:'black',k:.25},
 {t:'p',pts:[[16,15],[20,15],[18,22]],m:'black'},{t:'px',x:18,y:17,c:'#ff7a30'},{t:'px',x:18,y:18,c:'#ffd070'},{t:'e',cx:11,cy:28,rx:2,ry:1.2,m:'moss'},
]});
ART.ruins=()=>mkArt({parts:[
 {t:'r',x:4,y:12,w:8,h:23,m:'stone'},{t:'r',x:24,y:6,w:8,h:29,m:'stone'},{t:'r',x:4,y:12,w:8,h:2,m:'stone',b:.2},{t:'r',x:24,y:6,w:8,h:2,m:'stone',b:.2},
 {t:'p',pts:[[12,12],[24,6],[24,12],[18,10],[12,16]],m:'stone',b:-.1},{t:'r',x:12,y:28,w:12,h:7,m:'stone',b:-.15},{t:'r',x:5,y:18,w:6,h:1,m:'black'},{t:'r',x:26,y:14,w:6,h:1,m:'black'},{t:'r',x:26,y:24,w:6,h:1,m:'black'},
 {t:'e',cx:8,cy:20,rx:2,ry:5,m:'moss'},{t:'e',cx:28,cy:12,rx:2,ry:4,m:'moss'},{t:'e',cx:18,cy:33,rx:5,ry:2,m:'moss'},{t:'px',x:16,y:21,c:'#ffd070'},{t:'px',x:17,y:20,c:'#ffd070'},
]});
ART.grave=()=>mkArt({parts:[
 {t:'e',cx:18,cy:31,rx:12,ry:4.5,m:'brown'},{t:'e',cx:18,cy:30,rx:9,ry:3,m:'moss',b:-.05},
 {t:'r',x:11,y:14,w:14,h:17,m:'stone'},{t:'e',cx:18,cy:14,rx:7,ry:5,m:'stone'},{t:'r',x:17,y:12,w:2,h:9,m:'black',b:.1},{t:'r',x:14,y:15,w:8,h:2,m:'black',b:.1},
 {t:'l',x0:15,y0:22,x1:21,y1:24,w:1,m:'black',k:.3},{t:'e',cx:28,cy:29,rx:2.4,ry:1.6,m:'bone'},{t:'px',x:6,y:28,c:'#e0d8be'},{t:'px',x:7,y:29,c:'#e0d8be'},{t:'e',cx:10,cy:30,rx:3,ry:1.5,m:'moss'},
]});
ART.cave=()=>mkArt({parts:[
 {t:'e',cx:18,cy:26,rx:17,ry:11,m:'stone'},{t:'p',pts:[[2,32],[5,16],[12,8],[24,8],[31,16],[34,32]],m:'stone'},{t:'p',pts:[[2,32],[5,16],[12,8],[14,14],[8,32]],m:'stone',b:.14},
 {t:'e',cx:18,cy:26,rx:9,ry:9.5,m:'black'},{t:'cut',x:0,y:34,w:36,h:2},{t:'r',x:9,y:30,w:18,h:4,m:'black'},
 {t:'px',x:15,y:23,c:'#ff3030'},{t:'px',x:16,y:23,c:'#ffb0a0'},{t:'px',x:21,y:23,c:'#ff3030'},{t:'px',x:22,y:23,c:'#ffb0a0'},
 {t:'p',pts:[[10,18],[12,24],[14,18]],m:'bone'},{t:'p',pts:[[22,18],[24,24],[26,18]],m:'bone'},{t:'e',cx:8,cy:12,rx:4,ry:2,m:'moss'},{t:'e',cx:28,cy:14,rx:3,ry:1.6,m:'moss'},
]});
ART.altar=()=>mkArt({parts:[
 {t:'r',x:6,y:28,w:24,h:6,m:'stone'},{t:'r',x:8,y:23,w:20,h:5,m:'stone',b:.05},{t:'c',x:10,y:14,w:16,h:9,m:'stone',b:-.05},{t:'r',x:8,y:12,w:20,h:3,m:'stone',b:.12},
 {t:'p',pts:[[18,0],[22,7],[18,12],[14,7]],m:'glow'},{t:'p',pts:[[18,0],[14,7],[18,12]],m:'glow',b:.16},{t:'e',cx:18,cy:7,rx:2,ry:2.4,m:'white'},
 {t:'px',x:10,y:5,c:'#b4f4ff'},{t:'px',x:26,y:4,c:'#b4f4ff'},{t:'px',x:23,y:1,c:'#ffffff'},{t:'r',x:14,y:18,w:8,h:1,m:'glow'},{t:'px',x:18,y:25,c:'#5cd6e8'},
]});
ART.camp=()=>mkArt({parts:[
 {t:'p',pts:[[18,4],[34,32],[3,32]],m:'red'},{t:'p',pts:[[18,4],[3,32],[14,32]],m:'red',b:.14},{t:'p',pts:[[18,12],[24,32],[13,32]],m:'black'},
 {t:'l',x0:18,y0:4,x1:18,y1:0,w:1,m:'wood'},{t:'p',pts:[[18,0],[24,2],[18,4]],m:'orange'},{t:'r',x:3,y:31,w:31,h:3,m:'wood',b:-.1},
 {t:'e',cx:6,cy:30,rx:3,ry:1.6,m:'dark'},{t:'px',x:6,y:29,c:'#ff9a30'},{t:'px',x:7,y:28,c:'#ffd070'},
]});
ART.frostcamp=()=>mkArt({parts:[
 {t:'p',pts:[[18,4],[34,32],[3,32]],m:'ice'},{t:'p',pts:[[18,4],[3,32],[14,32]],m:'ice',b:.16},{t:'p',pts:[[18,12],[24,32],[13,32]],m:'spirit',b:-.25},
 {t:'e',cx:12,cy:9,rx:4,ry:2,m:'white'},{t:'e',cx:6,cy:30,rx:5,ry:2.2,m:'white'},{t:'e',cx:30,cy:31,rx:5,ry:2,m:'white'},{t:'px',x:20,y:14,c:'#ffffff'},{t:'px',x:24,y:20,c:'#ffffff'},
]});
ART.frozencamp=ART.frostcamp;
ART.throne=()=>mkArt({parts:[
 {t:'r',x:7,y:29,w:22,h:6,m:'ice'},{t:'r',x:9,y:24,w:18,h:5,m:'ice',b:.08},
 {t:'p',pts:[[9,24],[9,6],[13,2],[13,24]],m:'spirit'},{t:'p',pts:[[27,24],[27,6],[23,2],[23,24]],m:'spirit',b:-.1},{t:'r',x:13,y:8,w:10,h:16,m:'ice'},
 {t:'p',pts:[[13,8],[18,0],[23,8]],m:'ice',b:.2},{t:'p',pts:[[9,6],[7,-2],[11,3]],m:'spirit',b:.1},{t:'p',pts:[[27,6],[29,-2],[25,3]],m:'spirit',b:.1},
 {t:'r',x:11,y:20,w:14,h:4,m:'blue'},{t:'px',x:18,y:12,c:'#ffffff'},{t:'px',x:15,y:15,c:'#ffffff'},{t:'p',pts:[[17,12],[19,12],[18,17]],m:'glow'},
]});
ART.icicle=()=>mkArt({parts:[
 {t:'p',pts:[[4,34],[7,16],[11,34]],m:'ice'},{t:'p',pts:[[4,34],[7,16],[7,34]],m:'ice',b:.18},
 {t:'p',pts:[[11,34],[17,2],[25,34]],m:'ice'},{t:'p',pts:[[11,34],[17,2],[17,34]],m:'ice',b:.2},{t:'p',pts:[[17,2],[25,34],[19,34]],m:'spirit',b:-.2},
 {t:'p',pts:[[24,34],[29,14],[33,34]],m:'ice'},{t:'p',pts:[[24,34],[29,14],[28,34]],m:'ice',b:.16},
 {t:'e',cx:18,cy:34,rx:15,ry:2.4,m:'white'},{t:'px',x:16,y:10,c:'#ffffff'},{t:'px',x:15,y:16,c:'#ffffff'},{t:'px',x:28,y:20,c:'#ffffff'},
]});
ART.barrel=()=>mkArt({parts:[
 {t:'e',cx:18,cy:33,rx:10,ry:2.6,m:'dark'},{t:'c',x:8,y:11,w:20,h:22,m:'wood'},{t:'e',cx:18,cy:11,rx:10,ry:3.2,m:'wood',b:.1},{t:'e',cx:18,cy:11,rx:7.5,ry:2.2,m:'wood',b:-.1},
 {t:'e',cx:18,cy:33,rx:10,ry:2.6,m:'wood',b:-.2},{t:'r',x:8,y:16,w:20,h:2,m:'steelD'},{t:'r',x:8,y:26,w:20,h:2,m:'steelD'},
 {t:'p',pts:[[15,19],[21,19],[20,25],[16,25]],m:'dark'},{t:'px',x:17,y:21,c:'#ff4040'},{t:'px',x:18,y:21,c:'#ff4040'},{t:'px',x:17,y:23,c:'#ffd23f'},{t:'px',x:18,y:23,c:'#ffd23f'},
 {t:'px',x:12,y:14,c:'#cf9a58'},{t:'px',x:23,y:14,c:'#cf9a58'},{t:'l',x0:20,y0:8,x1:24,y1:2,w:1,m:'leather',k:.5},{t:'px',x:24,y:1,c:'#ff9a30'},{t:'px',x:25,y:0,c:'#ffd070'},
]});
ART.dragon=()=>mkArt({w:56,h:44,scale:2,mirror:true,parts:[
 {c1:1,t:'p',pts:[[24,34],[32,34],[34,43],[28,40],[22,43]],m:'dragonred',b:-.1},
 {t:'p',pts:[[21,18],[12,10],[1,0],[3,14],[1,24],[8,30],[12,26],[16,32],[22,28]],m:'dragonwing',b:-.02},
 {t:'p',pts:[[21,18],[12,10],[1,0],[7,12],[14,22]],m:'dragonwing',b:-.15},
 {t:'l',x0:21,y0:18,x1:1,y1:1,w:2,m:'dragonred',k:.55},{t:'l',x0:20,y0:20,x1:3,y1:14,w:1,m:'dragonred',k:.45},{t:'l',x0:20,y0:22,x1:1,y1:24,w:1,m:'dragonred',k:.45},{t:'l',x0:20,y0:24,x1:8,y1:30,w:1,m:'dragonred',k:.45},
 {t:'px',x:1,y:0,c:'#fff8e4'},{t:'px',x:1,y:24,c:'#fff8e4'},{t:'px',x:8,y:30,c:'#fff8e4'},
 {t:'c',x:16,y:30,w:7,h:9,m:'dragonred'},{t:'r',x:14,y:38,w:9,h:3,m:'dragonred',b:-.1},{t:'px',x:14,y:41,c:'#fff8e4'},{t:'px',x:17,y:41,c:'#fff8e4'},{t:'px',x:20,y:41,c:'#fff8e4'},
 {c1:1,t:'e',cx:28,cy:29,rx:10.5,ry:11,m:'dragonred'},{c1:1,t:'e',cx:28,cy:32,rx:6.2,ry:8.6,m:'yellow',b:-.08},
 {c1:1,t:'r',x:22,y:26,w:12,h:1,m:'orange'},{c1:1,t:'r',x:22,y:29,w:12,h:1,m:'orange'},{c1:1,t:'r',x:23,y:32,w:10,h:1,m:'orange'},{c1:1,t:'r',x:23,y:35,w:10,h:1,m:'orange'},
 {c1:1,t:'p',pts:[[26,12],[28,2],[30,12]],m:'dragonred',b:.1},{c1:1,t:'p',pts:[[24,17],[28,8],[32,17]],m:'dragonred'},
 {c1:1,t:'e',cx:28,cy:19,rx:7.5,ry:7,m:'dragonred'},{c1:1,t:'e',cx:28,cy:13,rx:8.6,ry:7.6,m:'dragonred',b:.04},{c1:1,t:'e',cx:28,cy:19,rx:5.6,ry:4.4,m:'dragonred',b:.2},
 {c1:1,t:'px',x:26,y:18,c:'#0c0408'},{c1:1,t:'px',x:29,y:18,c:'#0c0408'},{c1:1,t:'r',x:24,y:21,w:8,h:1,m:'black'},
 {t:'p',pts:[[21,12],[16,8],[13,1],[19,6],[23,9]],m:'bone'},{t:'p',pts:[[16,8],[13,1],[14,6]],m:'bone',b:-.2},
 {t:'e',cx:24,cy:12,rx:2.8,ry:1.5,m:'yellow',b:.15},{t:'px',x:24,y:12,c:'#0c0408'},{t:'px',x:24,y:11,c:'#0c0408'},
 {t:'p',pts:[[20,9],[27,11.5],[27,10],[21,7]],m:'black'},
 {t:'p',pts:[[25,22],[26,26],[27,22]],m:'bone'},{c1:1,t:'e',cx:28,cy:23,rx:2.4,ry:1.4,m:'orange'},{c1:1,t:'px',x:28,y:23,c:'#fff070'},
]});
/* Декор новых локаций */
ART.mangrove=()=>mkArt({parts:[
 {t:'l',x0:6,y0:33,x1:12,y1:20,w:2,m:'mud',k:.5},{t:'l',x0:30,y0:33,x1:24,y1:20,w:2,m:'mud',k:.5},{t:'l',x0:14,y0:34,x1:16,y1:22,w:2,m:'mud',k:.5},{t:'l',x0:23,y0:34,x1:21,y1:22,w:2,m:'mud',k:.5},
 {t:'c',x:15,y:12,w:7,h:12,m:'mud'},{t:'l',x0:17,y0:14,x1:17,y1:22,w:1,m:'mud',k:.2},
 {t:'e',cx:10,cy:12,rx:8,ry:5.5,m:'moss'},{t:'e',cx:26,cy:11,rx:8,ry:5.5,m:'moss'},{t:'e',cx:18,cy:6,rx:9,ry:5.5,m:'moss',b:.08},{t:'e',cx:18,cy:13,rx:8,ry:4,m:'bog',b:-.12},
 {t:'l',x0:6,y0:15,x1:5,y1:23,w:1,m:'bog',k:.45},{t:'l',x0:12,y0:17,x1:12,y1:25,w:1,m:'bog',k:.45},{t:'l',x0:25,y0:16,x1:26,y1:24,w:1,m:'bog',k:.45},{t:'l',x0:31,y0:14,x1:32,y1:22,w:1,m:'bog',k:.45},
 {t:'px',x:14,y:4,c:'#b8e070'},{t:'px',x:24,y:8,c:'#b8e070'},{t:'px',x:9,y:11,c:'#b8e070'},
]});
ART.mushroom=()=>mkArt({parts:[
 {t:'c',x:9,y:18,w:5,h:15,m:'bone'},{t:'c',x:24,y:22,w:4,h:11,m:'bone'},{t:'c',x:16,y:26,w:3,h:7,m:'bone'},
 {t:'e',cx:11.5,cy:15,rx:10,ry:6.5,m:'purple'},{t:'e',cx:26,cy:20,rx:7.5,ry:5,m:'pink',b:-.05},{t:'e',cx:17.5,cy:25,rx:5,ry:3.4,m:'purple',b:.05},
 {t:'e',cx:8,cy:13,rx:1.8,ry:1.6,m:'acid'},{t:'e',cx:14,cy:11,rx:1.6,ry:1.4,m:'acid'},{t:'e',cx:12,cy:16,rx:1.4,ry:1.2,m:'acid'},{t:'e',cx:24,cy:18,rx:1.5,ry:1.3,m:'acid'},{t:'e',cx:28,cy:21,rx:1.3,ry:1.2,m:'acid'},
 {t:'px',x:10,y:30,c:'#8ae850'},{t:'px',x:26,y:30,c:'#8ae850'},{t:'px',x:4,y:6,c:'#ddffa0'},{t:'px',x:32,y:12,c:'#ddffa0'},
]});
ART.hut=()=>mkArt({parts:[
 {t:'c',x:3,y:30,w:2,h:5,m:'wood'},{t:'c',x:31,y:30,w:2,h:5,m:'wood'},
 {t:'r',x:6,y:17,w:24,h:15,m:'wood'},{t:'r',x:6,y:24,w:24,h:1,m:'wood',b:-.2},{t:'r',x:6,y:20,w:24,h:1,m:'wood',b:-.2},
 {t:'p',pts:[[2,18],[18,4],[34,18],[30,20],[18,9],[6,20]],m:'yellow',b:-.25},{t:'p',pts:[[2,18],[18,4],[34,18]],m:'brown',b:-.05},
 {t:'r',x:15,y:22,w:7,h:10,m:'dark'},{t:'px',x:20,y:27,c:'#ffd070'},{t:'r',x:8,y:20,w:4,h:4,m:'yellow',b:.1},{t:'r',x:24,y:20,w:4,h:4,m:'acid',b:.1},
 {t:'l',x0:32,y0:33,x1:32,y1:15,w:1,m:'wood',k:.6},{t:'e',cx:32,cy:13,rx:2.6,ry:2.8,m:'bone'},{t:'px',x:31,y:13,c:'#05030a'},{t:'px',x:33,y:13,c:'#05030a'},
]});
ART.lab=()=>mkArt({parts:[
 {t:'r',x:3,y:12,w:12,h:20,m:'stone'},{t:'r',x:3,y:12,w:12,h:2,m:'gray'},{t:'r',x:5,y:5,w:3,h:8,m:'stone'},{t:'px',x:6,y:3,c:'#8ae850'},{t:'px',x:7,y:1,c:'#ddffa0'},
 {t:'r',x:6,y:17,w:5,h:5,m:'acid',b:.1},{t:'r',x:6,y:25,w:6,h:7,m:'dark'},
 {t:'l',x0:15,y0:20,x1:22,y1:20,w:2,m:'steelD',k:.5},
 {t:'c',x:19,y:30,w:2,h:4,m:'steelD'},{t:'c',x:30,y:30,w:2,h:4,m:'steelD'},{t:'p',pts:[[17,24],[33,24],[31,32],[19,32]],m:'steelD'},{t:'e',cx:25,cy:24,rx:8.5,ry:2.6,m:'steel'},
 {t:'e',cx:25,cy:24,rx:7,ry:1.8,m:'acid'},{t:'e',cx:22,cy:22,rx:1.4,ry:1.4,m:'acid',b:.2},{t:'e',cx:27,cy:20,rx:1.8,ry:1.8,m:'acid',b:.2},{t:'e',cx:25,cy:16,rx:1.2,ry:1.2,m:'acid',b:.2},
 {t:'p',pts:[[21,33],[23,29],[25,33]],m:'orange'},{t:'p',pts:[[26,33],[28,29],[30,33]],m:'orange'},
]});

ART.totem=()=>mkArt({parts:[
 {t:'e',cx:18,cy:33,rx:11,ry:3,m:'stone',b:-.2},
 {t:'r',x:12,y:8,w:12,h:25,m:'wood'},{t:'r',x:12,y:8,w:2,h:25,m:'wood',b:.15},
 {t:'r',x:11,y:12,w:14,h:2,m:'bone'},{t:'r',x:11,y:21,w:14,h:2,m:'bone'},
 {t:'e',cx:15,cy:16.5,rx:1.6,ry:1.6,m:'yellow'},{t:'e',cx:21,cy:16.5,rx:1.6,ry:1.6,m:'yellow'},{t:'r',x:15,y:18,w:6,h:1,m:'dark'},
 {t:'e',cx:15,cy:26,rx:1.4,ry:1.4,m:'red'},{t:'e',cx:21,cy:26,rx:1.4,ry:1.4,m:'red'},{t:'r',x:14,y:28,w:8,h:1,m:'dark'},
 {t:'p',pts:[[10,8],[18,1],[26,8]],m:'red'},{t:'p',pts:[[5,10],[12,7],[12,12]],m:'bone'},{t:'p',pts:[[31,10],[24,7],[24,12]],m:'bone'},
 {t:'px',x:18,y:4,c:'#ffd23f'},
]});
ART.gate=()=>mkArt({parts:[
 {t:'r',x:5,y:6,w:4,h:28,m:'stone'},{t:'r',x:27,y:6,w:4,h:28,m:'stone'},{t:'r',x:4,y:3,w:28,h:4,m:'stone',b:.1},
 {t:'r',x:10,y:7,w:2,h:26,m:'steelD'},{t:'r',x:15,y:7,w:2,h:26,m:'steelD'},{t:'r',x:20,y:7,w:2,h:26,m:'steelD'},{t:'r',x:24,y:7,w:2,h:26,m:'steelD'},
 {t:'r',x:9,y:13,w:18,h:2,m:'steel'},{t:'r',x:9,y:24,w:18,h:2,m:'steel'},
 {t:'p',pts:[[10,33],[11,35],[12,33]],m:'steel'},{t:'p',pts:[[15,33],[16,35],[17,33]],m:'steel'},{t:'p',pts:[[20,33],[21,35],[22,33]],m:'steel'},{t:'p',pts:[[24,33],[25,35],[26,33]],m:'steel'},
 {t:'e',cx:18,cy:5,rx:2,ry:2,m:'gold'},
]});
ART.lever=()=>mkArt({parts:[
 {t:'e',cx:18,cy:31,rx:9,ry:3,m:'stone',b:-.2},{t:'r',x:11,y:24,w:14,h:7,m:'stone'},{t:'r',x:11,y:24,w:14,h:2,m:'gray',b:.1},
 {t:'l',x0:18,y0:25,x1:25,y1:10,w:2,m:'wood',k:.6},{t:'e',cx:25.5,cy:9,rx:3,ry:3,m:'red'},
 {t:'r',x:15,y:26,w:6,h:2,m:'steelD'},
]});
/* Покадровая анимация: из готового спрайта получаем кадры деформацией (смещение полос тела, ног, рук, волна подола, сжатие). */
const ANIMK={hydrahead:'blob',stalker:'hum',mimic:'blob',priest:'robe',rogue:'hum',paladin:'hum',toad:'quad',leech:'blob',croc:'quad',bogwitch:'robe',wisp:'float',hydra:'hum',plaguerat:'quad',acidslime:'blob',alchemist:'hum',zombie:'hum',scorpion:'spider',spiderqueen:'spider',tank:'hum',sword:'hum',archer:'hum',mage:'robe',goblin:'hum',wolf:'quad',skel:'hum',spider:'spider',bandit:'hum',slime:'blob',slimelet:'blob',bat:'flap',boar:'quad',shaman:'hum',shroom:'blob',orc:'hum',dknight:'hum',necro:'robe',troll:'hum',ghost:'float',ogre:'hum',wraith:'float',golem:'hum',cultist:'robe',gargoyle:'hum',yeti:'hum',icespirit:'float',frostspider:'spider',icegolem:'hum',icequeen:'robe',whelp:'flap',dragon:'flap'};
const FACE_LEFT={wolf:1,boar:1};            // спрайт нарисован мордой влево
const NO_FLIP={dragon:1,ghost:0};
const ANIMP={
 hum:{idle:[{up:0,outer:0},{up:-1,outer:0},{up:-1,outer:1},{up:0,outer:1}],
      walk:[{legL:-2,up:0},{up:-1},{legR:-2,up:0},{up:-1}],
      atk:[{up:-1,lean:-1.6,outerR:-3},{up:1,lean:3,outerR:2},{up:0,lean:1,outerR:0}],hurt:[{up:1,lean:-3,head:1}]},
 robe:{idle:[{up:0,wave:.6,ph:0},{up:-1,wave:.8,ph:1.6},{up:-1,wave:.6,ph:3.1},{up:0,wave:.8,ph:4.7}],
      walk:[{up:0,wave:1.2,ph:0,legL:0},{up:-1,wave:1.4,ph:1.6},{up:0,wave:1.2,ph:3.1},{up:-1,wave:1.4,ph:4.7}],
      atk:[{up:-1,lean:-1.6,outerR:-3,wave:.8},{up:1,lean:3,outerR:2,wave:1.2},{up:0,lean:1,wave:.8}],hurt:[{up:1,lean:-3,head:1,wave:1.4}]},
 quad:{idle:[{up:0},{up:-1},{up:-1},{up:0}],
      walk:[{legL:-2,legR:0,up:0},{up:-1},{legR:-2,legL:0,up:0},{up:-1}],
      atk:[{up:-1,lean:-1.6},{up:1,lean:3.5},{up:0,lean:1}],hurt:[{up:1,lean:-3}]},
 float:{idle:[{wave:1,ph:0},{wave:1.4,ph:1.6},{wave:1,ph:3.1},{wave:1.4,ph:4.7}],walk:[{wave:1.6,ph:0,lean:1},{wave:2,ph:1.6,lean:1},{wave:1.6,ph:3.1,lean:1},{wave:2,ph:4.7,lean:1}],
      atk:[{lean:-2,wave:1.4,ph:0},{lean:3.5,wave:2.2,ph:2},{lean:1,wave:1.4,ph:4}],hurt:[{lean:-3,wave:2.4,ph:1}]},
 blob:{idle:[{sq:1},{sq:.95},{sq:.9},{sq:.95}],walk:[{sq:1},{sq:.86},{sq:1.07},{sq:.92}],atk:[{sq:.8},{sq:1.22,lean:2},{sq:1}],hurt:[{sq:.78,lean:-2}]},
 flap:{idle:[{flap:-3,up:1},{flap:0,up:0},{flap:3,up:-1},{flap:0,up:0}],walk:[{flap:-4,up:1},{flap:0,up:-1},{flap:4,up:1},{flap:0,up:-1}],
      atk:[{flap:-4,lean:-1.6,up:-1},{flap:4,lean:3,up:1},{flap:0,lean:1}],hurt:[{flap:2,lean:-3,up:1}]},
 spider:{idle:[{sideL:0,sideR:0},{sideL:1,sideR:-1},{sideL:0,sideR:0},{sideL:-1,sideR:1}],walk:[{sideL:-2,sideR:2,up:0},{sideL:0,sideR:0,up:-1},{sideL:2,sideR:-2,up:0},{sideL:0,sideR:0,up:-1}],
      atk:[{up:-2,lean:-1},{up:2,lean:2.5},{up:0,lean:1}],hurt:[{up:1,lean:-3}]}
};
function deform(src,S,P,dir){
  const w=src.width,h=src.height,L=w/S,Hh=h/S,cx=L/2;
  const sd=src.getContext('2d').getImageData(0,0,w,h).data;
  const out=document.createElement('canvas');out.width=w;out.height=h;const og=out.getContext('2d');const od=og.createImageData(w,h),dd=od.data;
  const legTop=Hh*.74,headBot=Hh*.42,base=Hh-3;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const ly=y/S,lx=x/S;let sx=lx,sy=ly;
    if(P.sq){const s=P.sq;sy=base-(base-ly)/s;sx=cx+(lx-cx)*s;}
    if(ly<legTop){
      sy-=(P.up||0);if(ly<headBot)sy-=(P.head||0);
      if(P.outer&&(lx<L*.25||lx>L*.75))sy-=P.outer;
      if(P.outerR&&lx>L*.7)sy-=P.outerR;
      if(P.sideL!=null&&lx<L*.28)sy-=P.sideL;if(P.sideR!=null&&lx>L*.72)sy-=P.sideR;
      if(P.lean)sx-=dir*P.lean*(1-ly/legTop);
    }else{const k=lx<cx?P.legL:P.legR;sy-=(k||0);}
    if(P.flap){const d=Math.abs(lx-cx)/(L/2);if(d>.28)sy-=P.flap*(d-.28)/.72;}
    if(P.wave)sx+=Math.sin((P.ph||0)+ly*.55)*P.wave*(.25+.75*ly/Hh);
    const sxi=Math.floor(sx*S+.0001),syi=Math.floor(sy*S+.0001);
    if(sxi<0||syi<0||sxi>=w||syi>=h)continue;
    const si=(syi*w+sxi)*4,di=(y*w+x)*4;dd[di]=sd[si];dd[di+1]=sd[si+1];dd[di+2]=sd[si+2];dd[di+3]=sd[si+3];
  }
  og.putImageData(od,0,0);return out;
}
function buildFrames(name,canvas){
  const kind=ANIMK[name];if(!kind)return null;const S=name==='dragon'?2:1;const dir=FACE_LEFT[name]?-1:1;const A=ANIMP[kind];const f={};
  for(const st of ['idle','walk','atk','hurt'])f[st]=A[st].map(p=>deform(canvas,S,p,dir));
  return f;
}
/*ART-END*/
