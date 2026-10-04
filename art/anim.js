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
