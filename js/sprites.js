'use strict';
/* =========================================================
   ПИКСЕЛЬНЫЕ СПРАЙТЫ (цветные, 16×16, зеркальная сборка)
   ========================================================= */
const PAL={'0':'#150f1d',k:'#211829',w:'#ffffff',l:'#d3d8e2',g:'#8b92a3',d:'#4b5162',
 r:'#e34540',R:'#8f2233',o:'#f59a32',y:'#ffd23f',Y:'#c58b2b',n:'#a26634',N:'#603a1a',
 s:'#f6cba3',S:'#c99269',b:'#4283ea',B:'#24499e',c:'#66deef',e:'#52bb4e',E:'#2c7d3a',G:'#aee85f',
 p:'#a95bdc',P:'#5f2d8f',m:'#ea5da4',h:'#efe8cf',H:'#b5ab8b'};
function mkSpr(o){
  const Wd=o.w||16,Hd=o.h||16,sc=o.scale||2,half=Wd/2;
  const g=Array.from({length:Hd},()=>Array(Wd).fill('.'));
  const put=(x,y,ch)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<Wd&&y<Hd)g[y][x]=ch;};
  const rect=(x,y,w,h,ch)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++)put(x+i,y+j,ch);};
  const line=(x0,y0,x1,y1,ch)=>{const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1);for(let i=0;i<=n;i++)put(x0+(x1-x0)*i/n,y0+(y1-y0)*i/n,ch);};
  const inside=(pts,px,py)=>{let c=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [xi,yi]=pts[i],[xj,yj]=pts[j];if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi))c=!c;}return c;};
  const M=o.mirror;
  (o.polys||[]).forEach(([ch,pts])=>{for(let y=0;y<Hd;y++)for(let x=0;x<Wd;x++)if(inside(pts,x+.5,y+.5)){put(x,y,ch);if(M)put(Wd-1-x,y,ch);}});
  (o.lines||[]).forEach(([a,b,c,d,ch])=>{line(a,b,c,d,ch);if(M)line(Wd-1-a,b,Wd-1-c,d,ch);});
  (o.rows||[]).forEach((r,y)=>{
    const rw=M?half:Wd;
    r=o.ralign?r.padStart(rw,'.'):r.padEnd(rw,'.');r=r.slice(0,rw);
    for(let x=0;x<rw;x++){if(r[x]==='.')continue;put(x,y,r[x]);if(M)put(Wd-1-x,y,r[x]);}
  });
  (o.rects||[]).forEach(r=>rect(...r));
  (o.mr||[]).forEach(([x,y,w,h,ch])=>{rect(x,y,w,h,ch);rect(Wd-x-w,y,w,h,ch);});
  if(o.fn)o.fn({put,rect,line});
  if(o.swap){for(let y=0;y<Hd;y++)for(let x=0;x<Wd;x++){const s=o.swap[g[y][x]];if(s)g[y][x]=s;}}
  (o.post||[]).forEach(r=>rect(...r));
  (o.mpost||[]).forEach(([x,y,w,h,ch])=>{rect(x,y,w,h,ch);rect(Wd-x-w,y,w,h,ch);});
  // обводка
  const og=Array.from({length:Hd+2},(_,y)=>Array.from({length:Wd+2},(_,x)=>(y>0&&x>0&&y<=Hd&&x<=Wd)?g[y-1][x-1]:'.'));
  const out=og.map(r=>r.slice());
  for(let y=0;y<Hd+2;y++)for(let x=0;x<Wd+2;x++){if(og[y][x]!=='.')continue;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const t=og[y+dy]&&og[y+dy][x+dx];if(t&&t!=='.'){out[y][x]='0';break;}}}
  const c=document.createElement('canvas');c.width=(Wd+2)*sc;c.height=(Hd+2)*sc;const cx=c.getContext('2d');
  out.forEach((r,j)=>r.forEach((ch,i)=>{if(ch==='.')return;cx.fillStyle=PAL[ch]||'#f0f';cx.fillRect(i*sc,j*sc,sc,sc);}));
  return c;
}
const SP={};
SP.tank={mirror:1,rows:["......rr",".....rrr","....llll","...lllll","...lgkkk","...lgllg","..dlllll",".dlllllg",".dllgllg",".dlllgll","..dllgll","..dYYYYY","..dgllll","...dlll.","...ddgg.","........"],
 rects:[[1,5,5,1,'b'],[0,6,7,4,'b'],[1,10,5,2,'b'],[2,12,3,1,'b'],[3,6,1,6,'y'],[1,8,5,1,'y'],[0,6,7,1,'B'],[14,5,1,9,'n'],[13,2,3,4,'g'],[13,2,3,1,'l'],[12,3,1,2,'w']]};
SP.sword={mirror:1,rows:["......rr","....dddd","...dllll","...lssss","...lskss","...lssss","....ssSS","..rrllll",".rrrllgl",".rrlrrrr",".rrlrrrr","..rYYYYY","...rrrrr","...llll.","...nnnn.","........"],
 rects:[[13,0,1,9,'w'],[14,0,1,9,'l'],[11,9,5,1,'Y'],[13,10,2,2,'n'],[13,12,2,1,'Y']]};
SP.archer={mirror:1,rows:["....EEEE","...Eeeee","..Eeeeee","..Eessss","..Eeskss","..Eessss","...EeSss","...eeeee","..eeEeee","..eEnnne","..eeeeee","..eeYYYY","...nnnn.","...nnnn.","...NNNN.","........"],
 rects:[[2,2,1,1,'n'],[1,3,1,2,'n'],[0,5,1,7,'n'],[1,12,1,2,'n'],[2,14,1,1,'n'],[2,4,1,10,'l'],[12,5,2,7,'N'],[12,3,1,2,'r'],[13,3,1,2,'w']]};
SP.mage={mirror:1,rows:[".......p","......pp",".....ppp","....pppP","...pppYY",".PPPPPPP","..ssssss","..ssksss","..swwwww","..ppwwww",".pppPwwp",".pppPppp",".ppppYYY","pppppppp","pppPPPPP","PPPPPPPP"],
 rects:[[13,4,1,12,'n'],[12,1,3,3,'c'],[13,1,1,1,'w'],[12,10,2,2,'s']]};
SP.goblin={mirror:1,rows:["........","....EEEE","...Eeeee","eEeeeeee",".eeYYeee","..eeeeee","..eEwEww","...eeeee","..nnnnnn",".enNnnnn",".enNnnnn","..nnnnnn","..eee...","..eee...","..NNN...","........"],
 rects:[[13,8,1,5,'w'],[12,13,3,1,'Y'],[13,14,1,1,'n']]};
SP.skel={mirror:1,rows:["........","....hhhh","...hhhhh","..hhhhhH","..hkkhhH","..hkkhhh","..hhhkhh","...hHhHh","......hh","..hhhhhh","...hkhkh","..hhhhhh","...hkhkh","....hhhh","...hh...","..hhh..."],
 mpost:[[4,5,1,1,'r']],rects:[[13,6,1,7,'g'],[13,6,1,1,'l'],[12,13,3,1,'n'],[13,14,1,1,'n']]};
SP.wolf={rows:["................","..d.............",".dgd............",".dgggg.......dd.","dggkgggggggggddd","gwgggggdggdgggg.","kwwgggdggggggggg","..wwggggggggggw.","..ggggggggggggd.","..ggd.gg..gg.gd.","..gg..gg..gg.gg.","..dd..dd..dd.dd.","................","................","................","................"],
 post:[[3,4,1,1,'y'],[0,6,1,1,'r']]};
SP.spider={mirror:1,rows:["........","k.......",".k....dd","..k..ddd","k.k.drdr",".kkddddd","..kkdddd","k..kkPPP",".k.kPPpp","..kPPpPP","..kPpPPp",".kkPPPPP","k..kPPPP","....kPPP",".....kPP","........"]};
SP.slime={mirror:1,rows:["........","........","........","......ee","....eeee","...eeGGe","..eeGGee","..eeeeee",".eewkeee",".eewkeee",".eeeeeee","eeeeeeee","eeEEEeEE","EEEEEEEE","........","........"]};
SP.orc={mirror:1,rows:["........","....EEEE","...Eeeee","..Eeeeee","..eerree","..eeeeee","..eEEEEE","..wEEEEE","gnnnnnnn",".nnNnnnn",".nnNnnnn",".nnnYYYY","..NNNNNN","..eeee..","..eeee..","..NNNN.."],
 rects:[[14,3,1,12,'n'],[12,3,3,5,'l'],[12,3,1,5,'w']]};
SP.ghost={mirror:1,rows:["........","....cccc","...cccww","..ccwwww","..cwwwww","..cwkkww","..cwkkww","..cwwwkk","..cwwwww","..cwwwww",".cwwwwww",".cwwcwww","..cwwwwc","..wcwwcw","...c.cw.","........"]};
SP.whelp={mirror:1,rows:["........","...R....","...rrrrr","..rrrrrr","..rrYkrr","..rrrrrr","..rooooo","...rrrrr","..rrooor","..rrooor","..rrooor","..rrrooo","...rr...","...rr...","...YY...","........"],
 mr:[[0,6,3,4,'R'],[1,9,2,3,'R'],[0,5,1,2,'r']]};
SP.tree={mirror:1,rows:["........","........",".....eee","...eeGGe","..eeGGee","..eeeeee",".eEeeeEe",".eEeeeee","..EEeeEE","...EEEEE","......nn","......nN","......nN",".....nnN","....NNNN","........"]};
SP.rock={mirror:1,rows:["........","........","........",".....ggl","...gglll","..gllllw",".glllwll",".gllllll","gdgggggg","gddddddd",".kdddddd","........","........","........","........","........"],
 rects:[[11,8,4,4,'g'],[12,8,2,1,'l'],[11,11,4,1,'d']]};
SP.pillar={mirror:1,rows:["..hhhhhh","..hHHHHH","...hhhhh","....hHhh","....hHhh","....hHhh","....hHhh","....hHhh","....hHhh","....hHhh","....hHhh","...hhhhh","..hHHHHH","..hhhhhh","..HHHHHH","........"],
 swap:{h:'g',H:'d'},post:[[7,6,2,2,'r'],[7,6,2,1,'y']]};
SP.ruins={mirror:1,rows:["........","........","..hhhhhh","..hhhhhh","..hHh...","..hHh...","..hHh...","..hHh...","..hHh..e",".hhHhh.e",".hhhhhee","eeHHHHee","........","........","........","........"]};
SP.camp={mirror:1,rows:["........","........","........",".......r","......rr",".....rrw","....rrww","...rrwww","..rrwwkk",".rrwwwkk","rrwwwkkk","rwwwwkkk","rrrrrrrr","........","........","........"],
 rects:[[7,11,2,3,'o'],[7,12,2,2,'y'],[6,14,4,1,'n']]};
SP.grave={mirror:1,rows:["........","........","....llll","...lllll","..lllllH","..lllllH","..llHHHH","..lllllH","..lllllH","..lllllH","..lllllg","..llllgg","..gggggg","dddddddd","eEeEeEeE","........"]};
SP.cave={mirror:1,rows:["........","........","....gggg","..ggllll",".gglllll",".glllggg",".gllgkkk","gllgkkkk","gllgkkkk","gllgkkkk","gdgdkkkk","dddddddd","........","........","........","........"],
 mr:[[6,8,1,1,'r']]};
SP.altar={mirror:1,rows:["........","........","........","........",".......c","......cc","......cw",".....ccc","..hhhhhh","..hhhhhh","...HhHhH","...hhhhh","...hHHHH","..hhhhhh",".HHHHHHH","........"],
 rects:[[6,9,4,1,'c']]};
SP.q={rows:["................","......yyyy......",".....yyyyyy.....","....yy....yy....","....yy....yy....","..........yy....",".........yy.....","........yy......","........yy......","........yy......","................","........yy......","........yy......","................","................","................"]};
SP.barrel={mirror:1,rows:["........","........","....NNNN","...Nnnnn","..NgggggN".slice(0,8),"..Nnnnnn","..Nnnnnn","..Nnnrnn","..Nnnrnn","..Nnnnnn","..Nggggg","..Nnnnnn","...Nnnnn","....NNNN","........","........"]};
SP.bat={mirror:1,rows:["........","........","........","k.......","kk....k.","kPk...kk","kPPk.kPk",".kPPkPPP",".kPPPPrP","..kPPPPP","...kPPPP","....kk.P","......k.","........","........","........"]};
SP.shroom={mirror:1,rows:["........","........","....RRRR","..RRrrrr",".RrrwrrR",".Rrrrrrr","RrwrrrRr","RRRRRRRR","....hhhh","....hkhk","....hhhh","....hHhh","....hhhh","...Hhhhh","..eeEeeE","........"]};
const VAR={
 bandit:['archer',{swap:{e:'d',E:'k',Y:'r'},post:[[5,6,6,1,'r']]}],
 dknight:['tank',{swap:{l:'d',g:'k',b:'R',y:'r',r:'p',d:'k'},mpost:[[5,4,1,1,'r']]}],
 necro:['mage',{swap:{p:'d',P:'k',Y:'r',c:'e',w:'h',s:'H',n:'N'}}],
 troll:['orc',{swap:{e:'g',E:'d',n:'e',N:'E',Y:'y',w:'h',l:'g'}}],
 ogre:['orc',{swap:{e:'S',E:'n',n:'N',N:'k',Y:'y',w:'h',l:'g'}}],
 boar:['wolf',{swap:{g:'n',d:'N',w:'h',k:'k'}}],
 shaman:['goblin',{swap:{n:'P',N:'p',w:'c',Y:'m'}}],
 wraith:['ghost',{swap:{c:'P',w:'p'}}],
 golem:['orc',{swap:{e:'g',E:'d',n:'d',N:'k',Y:'c',w:'l',r:'c',l:'g'}}],
 cultist:['mage',{swap:{p:'R',P:'k',Y:'y',c:'o',w:'h',n:'N'}}],
 gargoyle:['ghost',{swap:{c:'d',w:'g',k:'r'}}],
 yeti:['orc',{swap:{e:'l',E:'g',n:'h',N:'H',Y:'c',w:'w',r:'b'}}],
 icespirit:['ghost',{swap:{c:'B',w:'c'}}],
 frostspider:['spider',{swap:{P:'B',p:'c',d:'b'}}],
 icegolem:['orc',{swap:{e:'c',E:'b',n:'b',N:'B',Y:'w',w:'w',r:'w',l:'c'}}],
 icequeen:['mage',{scale:3,swap:{p:'c',P:'b',Y:'w',n:'l',s:'h'}}],
 frozencamp:['camp',{swap:{r:'b',w:'c',o:'c',y:'w'}}],
 throne:['altar',{swap:{h:'c',H:'b',c:'w'}}],
 icicle:['rock',{swap:{g:'c',l:'w',d:'b',k:'B'}}],
 slimelet:['slime',{swap:{e:'b',E:'B',G:'c'},scale:1}],
 oldtree:['tree',{swap:{e:'o',E:'R',G:'y',n:'N'}}],
};
/* Дракон: 40×24 (зеркало), масштаб 3 */
SP.dragon={w:40,h:24,scale:3,mirror:1,ralign:1,
 polys:[['R',[[0,3],[6,6],[13,9],[15,10],[15,17],[12,14],[10,18],[7,13],[4,15],[1,9]]]],
 lines:[[15,10,0,3,'r'],[15,11,4,15,'r'],[15,11,10,18,'r'],[15,11,1,9,'r'],[15,11,7,13,'r']],
 rows:["y......","Yy..rrr","YYrrrrrr",".rrrrrrr",".rrYkrrr",".rrrrrrr","..rooooo","..roookk","..rwowow","...rrrrr","..rrrrr",".rrrrrrr","rrrooooo","rrrYYYYY","rrrooooo","rrrYYYYY","rrrooooo",".rrYYYYY",".rrooooo","..rrYYYY","..rrrooo","...rrrrr","....rrrr",".....rrr"],
 mr:[[11,13,3,4,'r'],[10,17,4,1,'w'],[10,19,4,3,'r'],[9,22,5,1,'w'],[13,5,2,1,'Y']]};
/* Иконки предметов */
const ICN={
 potion:(a,c)=>{a.rect(6,1,4,2,'n');a.rect(7,3,2,2,'l');a.rect(4,5,8,9,'l');a.rect(5,7,6,6,c);a.rect(6,6,1,6,'w');},
 sword:(a,c)=>{a.line(5,10,13,2,c);a.line(6,10,13,3,'w');a.line(3,8,8,13,'Y');a.line(4,11,2,13,'n');a.put(1,14,'Y');},
 claymore:(a,c)=>{a.line(5,10,13,2,c);a.line(6,10,13,3,'w');a.line(5,9,12,2,c);a.line(3,8,8,13,'Y');a.line(4,11,2,13,'n');a.put(1,14,'Y');},
 armor:(a,c)=>{a.rect(4,3,8,10,c);a.rect(7,3,2,2,'.');a.rect(2,3,3,4,c);a.rect(11,3,3,4,c);a.rect(4,9,8,1,'Y');a.rect(5,5,1,4,'w');a.rect(4,12,8,1,'d');},
 shield:(a,c)=>{a.rect(3,2,10,8,c);a.rect(4,10,8,2,c);a.rect(6,12,4,2,c);a.rect(7,3,2,10,'y');a.rect(4,6,8,2,'y');a.rect(3,2,10,1,'l');},
 tower:(a,c)=>{a.rect(3,1,10,11,c);a.rect(4,12,8,2,c);a.rect(6,14,4,1,c);a.rect(7,2,2,12,'y');a.rect(4,6,8,2,'y');a.rect(3,1,10,1,'l');},
 buckler:(a,c)=>{a.rect(4,4,8,7,c);a.rect(5,11,6,1,c);a.rect(7,5,2,5,'y');a.rect(7,2,2,2,'w');},
 spike:(a,c)=>{a.rect(3,3,10,8,c);a.rect(4,11,8,2,c);a.rect(6,13,4,1,c);a.rect(7,4,2,9,'y');a.rect(2,4,1,2,'w');a.rect(13,4,1,2,'w');a.rect(7,0,2,3,'w');a.rect(2,8,1,2,'w');a.rect(13,8,1,2,'w');},
 ring:(a,c)=>{a.rect(5,7,6,6,'y');a.rect(7,9,2,2,'.');a.rect(6,6,4,1,'y');a.rect(6,3,4,4,c);a.rect(7,4,1,1,'w');},
 boots:(a,c)=>{a.rect(5,2,4,8,'n');a.rect(5,9,8,4,'n');a.rect(5,2,4,1,'l');a.rect(5,13,8,1,'N');a.rect(5,6,4,1,'Y');},
 amulet:(a,c)=>{a.line(4,1,8,7,'Y');a.line(12,1,8,7,'Y');a.rect(6,7,4,5,'y');a.rect(7,8,2,3,c);},
 scroll:(a,c)=>{a.rect(3,3,10,10,'h');a.rect(2,2,2,12,'H');a.rect(12,2,2,12,'H');a.rect(5,5,6,1,'g');a.rect(5,11,6,1,'g');a.rect(7,6,2,4,c);a.rect(7,8,2,2,'y');},
 bomb:(a,c)=>{a.rect(4,6,8,8,'d');a.rect(5,5,6,10,'d');a.rect(6,7,2,2,'g');a.line(10,5,12,2,'n');a.rect(12,0,3,3,'o');a.rect(13,1,1,1,'y');},
 feather:(a,c)=>{a.line(3,13,12,3,'o');a.line(4,13,13,4,'y');a.line(5,11,10,6,'r');a.rect(9,2,4,3,'y');a.rect(10,3,2,1,'o');},
 arrow:(a,c)=>{a.line(2,13,13,2,'n');a.rect(12,1,3,3,'l');a.rect(1,11,4,4,c);a.rect(2,12,2,2,'w');},
 bow:(a,c)=>{a.rect(4,2,2,2,'n');a.rect(3,4,2,8,'n');a.rect(4,12,2,2,'n');a.rect(6,3,1,10,'l');a.line(6,8,14,8,'n');a.rect(13,7,2,3,'l');},
 staff:(a,c)=>{a.line(3,14,10,7,'n');a.rect(9,2,5,5,c);a.rect(10,3,1,1,'w');},
 helmet:(a,c)=>{a.rect(4,3,8,8,c);a.rect(3,6,10,6,c);a.rect(5,7,6,2,'k');a.rect(7,9,2,3,'k');a.rect(5,3,6,1,'l');a.rect(7,1,2,2,'r');},
 axe:(a,c)=>{a.line(3,14,11,4,'n');a.rect(9,1,5,6,c);a.rect(8,2,1,4,c);a.rect(13,1,1,6,'w');},
 dagger:(a,c)=>{a.line(6,9,12,3,c);a.line(7,9,12,4,'w');a.rect(4,8,4,1,'Y');a.line(5,10,3,12,'n');},
 cloak:(a,c)=>{a.rect(6,2,4,2,'Y');a.rect(5,4,6,3,c);a.rect(4,7,8,4,c);a.rect(3,11,10,3,c);a.rect(7,4,2,9,'k');},
 heart:(a,c)=>{a.rect(3,4,4,5,c);a.rect(9,4,4,5,c);a.rect(4,9,8,2,c);a.rect(6,11,4,2,c);a.rect(7,13,2,1,c);a.rect(5,5,1,2,'w');},
 rune:(a,c)=>{a.rect(3,2,10,12,'d');a.rect(4,3,8,10,'g');a.line(8,4,6,8,c);a.line(6,8,10,8,c);a.line(10,8,8,12,c);},
 tome:(a,c)=>{a.rect(3,2,10,12,'P');a.rect(4,3,8,10,'p');a.rect(3,2,1,12,'k');a.rect(7,5,2,6,'y');a.rect(5,7,6,2,'y');},
};
const ICON_OF={potion:['potion','r'],elixir:['potion','b'],rustsword:['sword','o'],leather:['armor','n'],chain:['armor','g'],ringhp:['ring','r'],boots:['boots'],
 amulet:['amulet','c'],scroll:['scroll','r'],bomb:['bomb'],feather:['feather'],barbed:['arrow','g'],longbow:['bow'],oakstaff:['staff','e'],tome:['tome'],
 duelist:['buckler','r'],claymore:['claymore','l'],spikeshield:['spike','b'],towershield:['tower','b'],
 helmet:['helmet','g'],dagger:['dagger','l'],axe:['axe','g'],cloak:['cloak','E'],vampring:['ring','R'],trollheart:['heart','e'],antidote:['potion','e'],ragepot:['potion','o'],
 mace:['staff','y'],holysymbol:['amulet','y'],twindagger:['dagger','r'],assassinblade:['dagger','R'],shadowcloak:['cloak','p'],holyshield:['tower','y'],lighthammer:['axe','y'],
 trap_bear:['spike','g'],smokebomb:['potion','g'],lure:['heart','r'],
 c_blade:['sword','p'],p_blade:['sword','w'],c_mask:['helmet','p'],p_mask:['helmet','c'],c_plate:['armor','R'],p_plate:['armor','y'],c_ring:['ring','p'],p_ring:['ring','y'],c_crown:['amulet','R'],p_crown:['amulet','y'],
 icerune:['rune','c'],stormrune:['rune','y'],blink:['scroll','p'],elvencloak:['cloak','e'],crystal:['staff','p'],bloodblade:['sword','R'],platelegs:['armor','l']};
const ICA={
 power:a=>{ICN.sword(a,'l');a.put(13,12,'r');a.put(14,13,'r');a.put(12,13,'o');a.rect(1,1,2,1,'y');a.rect(2,0,1,3,'y');},
 block:a=>{ICN.shield(a,'b');a.rect(6,5,4,1,'w');},
 whirl:a=>{a.rect(3,3,10,1,'c');a.rect(12,4,1,8,'c');a.rect(3,12,10,1,'c');a.rect(3,5,1,7,'c');a.rect(1,2,3,1,'w');a.rect(11,11,3,1,'w');a.rect(6,7,4,2,'l');},
 guard:a=>{ICN.tower(a,'b');},
 taunt:a=>{a.rect(7,2,2,7,'r');a.rect(7,11,2,2,'r');a.rect(2,5,3,1,'o');a.rect(11,5,3,1,'o');a.rect(3,3,2,1,'y');a.rect(11,3,2,1,'y');},
 bash:a=>{ICN.shield(a,'g');a.rect(1,1,3,1,'y');a.rect(2,0,1,3,'y');a.rect(12,10,3,1,'y');a.rect(13,9,1,3,'y');},
 triple:a=>{[2,6,10].forEach(y=>{a.line(1,y+3,13,y-1,'n');a.rect(12,y-2,3,3,'l');a.rect(1,y+2,2,2,'e');});},
 dash:a=>{ICN.boots(a);a.rect(0,6,4,1,'w');a.rect(0,9,5,1,'c');a.rect(1,12,3,1,'w');},
 aimed:a=>{a.rect(7,1,2,14,'r');a.rect(1,7,14,2,'r');a.rect(4,4,8,1,'r');a.rect(4,11,8,1,'r');a.rect(4,4,1,8,'r');a.rect(11,4,1,8,'r');a.rect(7,7,2,2,'w');},
 heal:a=>{a.rect(6,2,4,12,'e');a.rect(2,6,12,4,'e');a.rect(7,3,2,10,'G');a.rect(3,7,10,2,'G');a.put(5,3,'w');},
 haste:a=>{a.line(10,1,5,8,'y');a.line(5,8,10,8,'y');a.line(10,8,5,15,'y');a.line(11,1,6,8,'o');a.rect(1,5,3,1,'w');a.rect(0,10,4,1,'w');},
 fireball:a=>{a.rect(5,3,6,10,'o');a.rect(4,5,8,7,'o');a.rect(6,5,4,7,'y');a.rect(7,2,2,2,'r');a.rect(6,8,4,4,'w');a.put(3,7,'r');a.put(12,6,'r');},
 revive:a=>{a.rect(7,2,2,13,'y');a.rect(4,6,8,2,'y');a.rect(5,1,6,2,'y');a.rect(4,2,1,3,'y');a.rect(11,2,1,3,'y');a.rect(7,3,2,3,'w');},
 second:a=>{ICN.heart(a,'e');a.rect(7,6,2,5,'w');a.rect(5,8,6,1,'w');},
 quake:a=>{a.line(1,9,6,8,'k');a.line(6,8,8,12,'k');a.line(8,12,14,10,'k');a.rect(2,3,3,3,'n');a.rect(10,2,3,3,'n');a.rect(6,4,2,2,'g');a.rect(1,13,14,2,'N');},
 execute:a=>{a.rect(4,2,8,7,'w');a.rect(3,4,10,4,'w');a.rect(5,5,2,2,'k');a.rect(9,5,2,2,'k');a.rect(7,7,2,1,'k');a.rect(5,9,6,3,'l');a.rect(6,9,1,3,'k');a.rect(9,9,1,3,'k');a.rect(1,13,14,1,'r');},
 pin:a=>{a.line(2,14,10,6,'n');a.rect(9,4,4,4,'l');a.rect(11,10,4,1,'r');a.rect(12,9,2,3,'r');a.rect(2,13,3,2,'e');},
 volley:a=>{[[2,14,3,1],[5,14,7,1],[8,14,8,1],[11,14,12,1],[14,14,14,1]].forEach(([x0,y0,x1,y1])=>a.line(x0,y0,x1,y1,'n'));[3,7,8,12,14].forEach(x=>a.rect(x-1,0,3,3,'l'));},
 frost:a=>{a.rect(7,1,2,14,'c');a.rect(1,7,14,2,'c');a.line(3,3,12,12,'c');a.line(12,3,3,12,'c');a.rect(6,6,4,4,'w');},
 smite:a=>{a.rect(7,1,2,14,'y');a.rect(3,5,10,2,'y');a.rect(7,2,2,3,'w');a.rect(4,5,2,1,'w');a.put(2,2,'w');a.put(13,2,'w');a.put(2,12,'w');a.put(13,12,'w');},
 mend:a=>{a.rect(6,3,4,10,'c');a.rect(3,6,10,4,'c');a.rect(7,4,2,8,'w');a.rect(4,7,8,2,'w');a.put(2,2,'w');a.put(13,13,'w');},
 cleanse:a=>{a.rect(7,2,2,2,'c');a.rect(6,4,4,2,'c');a.rect(5,6,6,5,'c');a.rect(6,11,4,2,'c');a.rect(7,5,1,5,'w');a.put(2,3,'w');a.put(13,4,'w');a.put(12,12,'w');a.put(3,11,'w');},
 ward:a=>{ICN.shield(a,'c');a.rect(5,4,2,1,'w');},
 bless:a=>{a.rect(7,1,2,14,'y');a.rect(1,7,14,2,'y');a.line(3,3,12,12,'Y');a.line(12,3,3,12,'Y');a.rect(6,6,4,4,'w');},
 backstab:a=>{ICN.dagger(a,'l');a.rect(10,10,4,2,'r');a.rect(11,12,2,2,'r');a.put(14,9,'r');},
 knives:a=>{a.line(2,12,9,5,'l');a.line(5,14,12,7,'l');a.line(8,15,14,9,'l');a.rect(1,11,2,2,'n');a.rect(4,13,2,2,'n');a.rect(7,14,2,2,'n');a.put(10,4,'w');a.put(13,6,'w');},
 smoke:a=>{a.rect(3,6,10,6,'g');a.rect(5,4,6,3,'g');a.rect(2,8,3,4,'g');a.rect(11,8,3,4,'g');a.rect(5,6,2,2,'w');a.rect(8,5,2,2,'w');a.rect(4,11,8,1,'d');},
 holystrike:a=>{ICN.sword(a,'w');a.rect(1,1,3,1,'y');a.rect(2,0,1,3,'y');a.rect(12,10,3,1,'y');a.rect(13,9,1,3,'y');},
 layhands:a=>{a.rect(4,6,8,7,'s');a.rect(4,3,2,4,'s');a.rect(7,2,2,5,'s');a.rect(10,3,2,4,'s');a.rect(7,8,2,4,'y');a.rect(6,9,4,2,'y');a.put(2,2,'y');a.put(13,2,'y');},
 judge:a=>{a.line(3,14,10,7,'n');a.rect(8,2,6,5,'l');a.rect(9,3,4,1,'w');a.rect(1,1,3,1,'y');a.rect(2,0,1,3,'y');},
 rally:a=>{a.rect(3,1,1,14,'n');a.rect(4,2,9,6,'r');a.rect(5,3,7,1,'y');a.rect(7,4,3,3,'y');a.rect(4,7,9,1,'R');},
 massheal:a=>{a.rect(6,4,4,9,'e');a.rect(3,7,10,3,'e');a.rect(7,5,2,7,'G');a.rect(4,8,8,1,'G');a.put(2,2,'w');a.put(13,2,'w');a.put(13,13,'w');a.put(2,13,'w');}
};
