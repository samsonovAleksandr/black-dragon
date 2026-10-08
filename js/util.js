'use strict';
/* =========================================================
   УТИЛИТЫ
   ========================================================= */
const $=s=>document.querySelector(s);
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const SET=Object.assign({speed:1,big:false,calm:false,cb:false,vol:90,confirm:false,crisp:true,light:true,voice:true},(()=>{try{return JSON.parse(localStorage.getItem('bd_set')||'{}');}catch(e){return {};}})());
function saveSet(){try{localStorage.setItem('bd_set',JSON.stringify(SET));}catch(e){}}
function applySet(){
  const b=document.body;if(!b)return;
  b.classList.toggle('big',!!SET.big);b.classList.toggle('cb',!!SET.cb);b.classList.toggle('calm',!!SET.calm);
  if(typeof A_BUS!=='undefined'&&A_BUS)A_BUS.gain.value=SET.vol/100;
}
const sleep=ms=>new Promise(r=>setTimeout(r,window.FAST?0:ms*SET.speed));
const key=(c,r)=>c+','+r;
const NET={role:'solo',me:'H',peer:null,conn:null,conns:{},players:{H:{name:'Хост'}},owners:{},started:false,code:'',sq:[],fq:[],bq:0,gmodal:false,lobby:false,myName:'Игрок',selInit:false,toks:{},playing:false};
let REMOTE=false;

/* Простые звуки (WebAudio) */
let AC=null,MUTE=false,MUSIC=true,A_BUS=null,A_SFX=null,A_MUS=null,A_NOISE=null;
try{const a=JSON.parse(localStorage.getItem('bd_audio')||'{}');MUTE=!!a.mute;MUSIC=a.music!==false;}catch(e){}
function saveAudio(){try{localStorage.setItem('bd_audio',JSON.stringify({mute:MUTE,music:MUSIC}));}catch(e){}}
function audioInit(){
  try{
    if(!AC){
      AC=new (window.AudioContext||window.webkitAudioContext)();
      A_BUS=AC.createGain();A_BUS.gain.value=SET.vol/100;
      const comp=AC.createDynamicsCompressor();A_BUS.connect(comp);comp.connect(AC.destination);
      A_SFX=AC.createGain();A_SFX.gain.value=0.55;A_SFX.connect(A_BUS);
      A_MUS=AC.createGain();A_MUS.gain.value=0.16;A_MUS.connect(A_BUS);
      const n=AC.sampleRate,b=AC.createBuffer(1,n,n),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;A_NOISE=b;
    }
    if(AC.state==='suspended')AC.resume();
  }catch(e){}
  return AC;
}
['pointerdown','keydown'].forEach(ev=>addEventListener(ev,()=>{audioInit();musicTick();},{capture:true}));

/* --- синтез --- */
// тон: частота f (со слайдом до o.to), длительность d, форма type, громкость v
function aTone(f,d,type,v,o={},out){
  const t=(o.at!=null?o.at:AC.currentTime)+(o.delay||0);
  const os=AC.createOscillator(),g=AC.createGain();
  os.type=type||'square';os.frequency.setValueAtTime(f,t);
  if(o.to)os.frequency.exponentialRampToValueAtTime(o.to,t+d);
  if(o.vib){const l=AC.createOscillator(),lg=AC.createGain();l.frequency.value=o.vib;lg.gain.value=f*0.03;l.connect(lg);lg.connect(os.frequency);l.start(t);l.stop(t+d+0.05);}
  const a=o.att||0.005;
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+d);
  os.connect(g);g.connect(out||A_SFX);os.start(t);os.stop(t+d+0.02);
}
// шум через фильтр (ftype/fq, со слайдом до o.to)
function aNoise(d,v,ftype,fq,o={},out){
  const t=(o.at!=null?o.at:AC.currentTime)+(o.delay||0);
  const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();
  s.buffer=A_NOISE;s.loop=true;f.type=ftype||'lowpass';f.frequency.setValueAtTime(fq||1000,t);f.Q.value=o.q||1;
  if(o.to)f.frequency.exponentialRampToValueAtTime(o.to,t+d);
  const a=o.att||0.003;
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+d);
  s.connect(f);f.connect(g);g.connect(out||A_SFX);s.start(t,Math.random()*0.5);s.stop(t+d+0.02);
}
const arp=(fs,step,d,type,v,delay=0)=>fs.forEach((f,i)=>aTone(f,d,type,v,{delay:delay+i*step}));

/* --- звуковые эффекты --- */
const SFX={
  click:()=>aTone(1400,.03,'square',.05),
  ping:()=>{aTone(1200,.12,'sine',.12);aTone(1800,.18,'sine',.08,{delay:.1});},
  step:()=>{aNoise(.05,.10,'lowpass',700);aTone(90,.05,'sine',.08);},
  slash:()=>{aNoise(.13,.35,'bandpass',2500,{to:500,q:2});aTone(160,.08,'square',.10,{to:70,delay:.04});},
  arrow:()=>{aTone(700,.07,'triangle',.12,{to:1500});aNoise(.16,.22,'highpass',3500,{to:1200,delay:.03});aNoise(.05,.2,'lowpass',500,{delay:.16});},
  zap:()=>{aTone(500,.18,'sawtooth',.08,{to:1600});aTone(1200,.2,'sine',.10,{to:2400,delay:.05});aNoise(.1,.12,'highpass',5000,{delay:.08});},
  hurt:()=>{aTone(220,.16,'sawtooth',.14,{to:70});aNoise(.1,.3,'lowpass',900);},
  claw:()=>{aNoise(.09,.35,'bandpass',1800,{to:600,q:3});aNoise(.09,.3,'bandpass',1500,{to:500,q:3,delay:.07});},
  block:()=>{aTone(1300,.12,'square',.08);aTone(1950,.18,'triangle',.08,{delay:.01});aNoise(.04,.2,'highpass',4000);},
  clang:()=>{aTone(180,.2,'square',.12,{to:90});aTone(1100,.25,'triangle',.08);aNoise(.08,.3,'bandpass',2000);},
  whirl:()=>{aNoise(.35,.35,'bandpass',400,{to:3000,q:3});aNoise(.25,.2,'bandpass',3000,{to:600,q:3,delay:.3});},
  shield:()=>{aTone(300,.12,'square',.08,{to:600});aTone(900,.3,'triangle',.07,{delay:.1});},
  taunt:()=>{aTone(140,.25,'sawtooth',.12,{vib:18});aTone(210,.25,'sawtooth',.08,{vib:18});},
  whoosh:()=>aNoise(.3,.35,'bandpass',300,{to:2500,q:1.5}),
  fire:()=>{aNoise(.6,.45,'lowpass',300,{to:3000});aTone(80,.5,'sawtooth',.12,{to:40});aTone(400,.3,'sine',.06,{to:900});},
  heal:()=>{arp([523,659,784,1047],.07,.3,'sine',.12);aNoise(.3,.05,'highpass',6000,{delay:.1});},
  haste:()=>arp([600,800,1000,1300,1700],.04,.12,'square',.05),
  revive:()=>{arp([262,330,392,523,659,784],.09,.45,'triangle',.12);aTone(1047,.8,'sine',.08,{delay:.55});},
  level:()=>{arp([523,659,784,1047],.08,.18,'square',.08);aTone(1319,.5,'square',.07,{delay:.34});aTone(1568,.6,'triangle',.06,{delay:.34});},
  kill:()=>{aTone(420,.28,'square',.10,{to:60});aNoise(.25,.25,'lowpass',1800,{to:200});},
  death:()=>arp([392,330,262,196],.16,.35,'triangle',.14),
  spawn:()=>{aTone(70,.4,'sawtooth',.16,{to:110,vib:9});aNoise(.35,.25,'lowpass',400);},
  summon:()=>{aTone(220,.6,'sine',.10,{to:440,vib:6});aTone(233,.6,'sine',.10,{to:466,vib:5});aNoise(.5,.08,'bandpass',800,{to:200});},
  key:()=>{aTone(880,.9,'sine',.14);aTone(1320,.9,'sine',.10,{delay:.12});aTone(1760,1.1,'sine',.08,{delay:.24});aTone(2640,.6,'triangle',.03,{delay:.24});},
  item:()=>{aTone(988,.08,'square',.08);aTone(1319,.3,'square',.08,{delay:.08});},
  trap:()=>{aNoise(.12,.4,'highpass',2000);aTone(300,.25,'sawtooth',.12,{to:90,delay:.05});},
  poison:()=>[0,.08,.17].forEach((d,i)=>aTone(300+i*90,.07,'sine',.08,{to:500+i*90,delay:d})),
  shrine:()=>{aTone(523,1,'sine',.08,{att:.1});aTone(784,1,'sine',.06,{att:.1});aTone(1047,1,'sine',.05,{att:.2});},
  wind:()=>aNoise(.9,.12,'bandpass',500,{to:1200,att:.3,q:4}),
  drum:()=>{[0,.18].forEach(d=>{aTone(110,.25,'sine',.35,{to:40,delay:d});aNoise(.12,.15,'lowpass',300,{delay:d});});},
  round:()=>{aTone(660,.2,'triangle',.08);aTone(990,.3,'triangle',.06,{delay:.1});},
  roar:()=>{aTone(160,1.1,'sawtooth',.2,{to:55,vib:13,att:.08});aTone(110,1.1,'sawtooth',.15,{to:45,vib:11,att:.08});aNoise(1.1,.35,'lowpass',900,{to:150,att:.1});},
  inhale:()=>aNoise(.8,.25,'bandpass',200,{to:2000,att:.5,q:2}),
  boom:()=>{aNoise(1.2,.6,'lowpass',3000,{to:120});aTone(90,.8,'sine',.35,{to:30});aTone(60,1,'sawtooth',.12,{to:30});},
  tail:()=>{aNoise(.2,.4,'bandpass',300,{to:1500,q:2});aTone(80,.3,'sine',.35,{to:35,delay:.15});},
  travel:()=>{arp([392,523,659],.12,.4,'triangle',.08);},
  victory:()=>{arp([523,523,523,659],.14,.2,'square',.09);aTone(784,.25,'square',.09,{delay:.6});aTone(659,.2,'square',.08,{delay:.85});aTone(784,1.2,'square',.1,{delay:1.05});aTone(523,1.2,'triangle',.08,{delay:1.05});},
  defeat:()=>{arp([392,370,349,330],.35,.5,'triangle',.12);aTone(262,1.6,'sawtooth',.06,{delay:1.4});aTone(196,1.8,'triangle',.1,{delay:1.4});}
};
const SFX_LAST={};

/* --- Голоса героев: синтезированная «речь» из слогов с формантами гласных --- */
const VOICE={tank:{f:98,w:'sawtooth'},sword:{f:142,w:'sawtooth'},archer:{f:196,w:'sawtooth'},mage:{f:122,w:'sawtooth',vib:7},
 priest:{f:176,w:'triangle'},rogue:{f:158,w:'sawtooth',breath:1},paladin:{f:132,w:'sawtooth'},pet:{f:330,w:'square',bark:1}};
const FORM={a:[800,1250],o:[520,900],e:[480,1850],i:[320,2250],u:[360,780]};
const VPLAN={atk:[[1.15,.08],[1.32,.13]],hurt:[[1.25,.06],[.82,.17]],die:[[1.05,.12],[.82,.15],[.6,.32]],lvl:[[1,.08],[1.16,.08],[1.4,.18]],sel:[[1,.07],[1.12,.1]]};
function vSyll(V,vow,f,d,t,vol){
  const o=AC.createOscillator(),g=AC.createGain();o.type=V.w;o.frequency.setValueAtTime(f,t);o.frequency.linearRampToValueAtTime(f*(V.bark?.7:.93),t+d);
  if(V.vib){const l=AC.createOscillator(),lg=AC.createGain();l.frequency.value=V.vib;lg.gain.value=f*.04;l.connect(lg);lg.connect(o.frequency);l.start(t);l.stop(t+d+.05);}
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+d);
  const [f1,f2]=FORM[vow];
  [[f1,1],[f2,.55]].forEach(([fq,k])=>{const bp=AC.createBiquadFilter();bp.type='bandpass';bp.frequency.value=fq;bp.Q.value=V.bark?3:7;const gg=AC.createGain();gg.gain.value=k;o.connect(bp);bp.connect(gg);gg.connect(g);});
  g.connect(A_SFX);o.start(t);o.stop(t+d+.03);
  if(V.breath)aNoise(d*.9,vol*.35,'bandpass',f2,{at:t},A_SFX);
}
function voice(id,mood){
  if(MUTE||SET.voice===false||!audioInit())return;
  const V=VOICE[id]||VOICE.sword,plan=VPLAN[mood]||VPLAN.sel;let t=AC.currentTime+.01;
  try{plan.forEach(([pm,d])=>{const vow='aoeiu'[Math.floor(Math.random()*5)];vSyll(V,vow,V.f*pm*(.95+Math.random()*.1),d,t,mood==='die'?.5:.38);t+=d*.88;});}catch(e){}
}
const vid=h=>h&&(h.pet?'pet':h.id);
function vsay(h,mood,ch){if(!h||!h.d||h.npc||Math.random()>(ch==null?1:ch))return;const now=performance.now();if(h._vt&&now-h._vt<650)return;h._vt=now;sfx('v_'+vid(h)+'_'+mood);}

function sfx(name,remote){
  if(!remote&&NET.role==='host'&&NET.started&&name!=='click')NET.sq.push(name);
  if(MUTE||!SFX[name])return;
  if(!audioInit())return;
  const now=performance.now();if(SFX_LAST[name]&&now-SFX_LAST[name]<45)return;SFX_LAST[name]=now;
  try{SFX[name]();}catch(e){}
}

for(const id in VOICE)for(const md in VPLAN)SFX['v_'+id+'_'+md]=()=>voice(id,md);
/* --- музыка: маленький чиптюн-секвенсор ---
   мелодия: 8 восьмых на такт, «.» — пауза, «-» — тянуть предыдущую ноту */
const NOTE=n=>{const m=n.match(/^([A-G])(#|b)?(\d)$/);if(!m)return 0;const b={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0);return 12*(+m[3]+1)+b;};
const MF=m=>440*Math.pow(2,(m-69)/12);
const TRACKS={
  menu:{bpm:72,lead:'triangle',leadV:.10,drums:0,
    chords:['A2m','E2m','F2M','E2M'],bass:[0,null,null,null,7,null,null,null],arp:[0,7,12,15,12,7,3,7],
    mel:'E5 - - - D5 - C5 - | B4 - - - - - . . | C5 - - - A4 - F4 - | G#4 - - - - - . .'},
  1:{bpm:96,lead:'square',leadV:.07,drums:1,
    chords:['A2m','F2M','D2m','E2M','A2m','F2M','D2m','E2M'],bass:[0,null,null,0,12,null,7,null],arp:[0,7,12,7,3,7,12,15],
    mel:'A4 - C5 E5 D5 - C5 B4 | A4 - - . F4 - A4 C5 | D5 - F5 E5 D5 - C5 D5 | B4 - - - G#4 - . . | E5 - D5 C5 B4 - C5 A4 | C5 - A4 F4 A4 - C5 F5 | E5 - D5 - F5 E5 D5 C5 | B4 - G#4 - E4 - - .'},
  2:{bpm:84,lead:'triangle',leadV:.12,drums:1,
    chords:['D2m','A#1M','G1m','A1M','D2m','A#1M','G1m','A1M'],bass:[0,null,null,null,0,null,12,null],arp:[0,3,7,12,7,3,0,7],
    mel:'D5 - - . A4 - F4 . | A#4 - A4 G4 F4 - - . | G4 - A#4 D5 C5 - A#4 A4 | A4 - - - C#5 - - . | D5 - E5 F5 E5 - D5 C#5 | D5 - A#4 - G4 - A#4 . | G4 - A4 A#4 A4 G4 F4 E4 | C#5 - E5 - A4 - - .'},
  3:{bpm:80,lead:'triangle',leadV:.11,drums:1,
    chords:['A2m','F2M','C2M','G2M','A2m','F2M','D2m','E2M'],bass:[0,null,7,null,12,null,7,null],arp:[0,7,12,15,19,15,12,7],
    mel:'E5 - - A5 G5 - E5 - | F5 - - - E5 - C5 - | E5 - G5 - C6 - B5 A5 | B5 - - - G5 - - . | A5 - E5 - A5 B5 C6 B5 | A5 - F5 - A5 - C6 - | D6 - C6 A5 F5 - D5 E5 | G#5 - - - E5 - - .'},
  5:{bpm:68,lead:'triangle',leadV:.12,drums:1,
    chords:['C2m','G#1M','D#2M','A#1M','C2m','G#1M','F2m','G2M'],bass:[0,null,null,null,7,null,null,null],arp:[0,3,7,12,7,3,0,3],
    mel:'G4 - - C5 D#5 - D5 - | C5 - - - G4 - . . | G#4 - C5 - D#5 - F5 D#5 | D5 - - - A#4 - . . | G4 - - C5 D#5 - G5 - | F5 - D#5 - C5 - G#4 - | F4 - G#4 - C5 - F5 - | D5 - B4 - G4 - . .'},
  6:{bpm:90,lead:'square',leadV:.06,drums:1,
    chords:['E2m','F2M','E2m','D#2M','C2M','B1M','A1m','B1M'],bass:[0,null,0,null,12,null,7,null],arp:[0,3,7,3,12,7,3,0],
    mel:'B4 - C5 - B4 - G#4 - | E5 - - - D#5 - B4 . | C5 - D5 - C5 - A4 - | B4 - - - F#4 - . . | B4 - C5 - E5 - D#5 - | C5 - B4 - G4 - E4 - | A4 - C5 - E5 - F5 E5 | D#5 - - - B4 - . .'},
  camp:{bpm:64,lead:'triangle',leadV:.10,drums:0,
    chords:['F2M','C2M','D2m','A#1M','F2M','C2M','A#1M','C2M'],bass:[0,null,null,null,7,null,null,null],arp:[0,7,12,15,12,7,3,7],
    mel:'A4 - - C5 - A4 G4 - | E4 - - - G4 - - . | F4 - A4 - D5 - C5 A4 | A#4 - - - - - . . | A4 - - C5 F5 - E5 D5 | C5 - - - G4 - - . | D5 - C5 A#4 A4 - G4 F4 | E4 - - - - - . .'},
  horde:{bpm:140,lead:'square',leadV:.07,drums:2,always:1,
    chords:['D2m','D2m','A#1M','C2M','D2m','D2m','G1m','A1M'],bass:[0,0,12,0,7,0,12,0],arp:[0,7,12,7,0,7,12,15],
    mel:'D5 - D5 F5 E5 - D5 C5 | D5 - A4 - - - . . | A#4 - C5 D5 C5 - A#4 A4 | C5 - - - E5 - . . | F5 - E5 D5 E5 - F5 G5 | A5 - - - D5 - . . | G5 - F5 E5 D5 - C5 A#4 | A4 - C#5 - E5 - A5 -'},
  boss:{bpm:132,lead:'square',leadV:.07,drums:2,always:1,
    chords:['C2m','C2m','G#1M','G1M','C2m','C2m','F1m','G1M'],bass:[0,12,0,12,0,12,7,12],arp:[0,3,7,12,7,3,0,3],
    mel:'C5 - D#5 - G5 - F5 D#5 | D5 - - - B4 - . . | C5 - D#5 - G#5 - G5 F5 | G5 - - - D5 - . . | D#5 - D5 C5 D5 - D#5 F5 | G5 - - - C6 - . . | G#5 - G5 F5 D#5 - D5 C5 | B4 - D5 - G5 - - .'},
  '1b':{bpm:100,lead:'square',leadV:.07,drums:1,
    chords:['E2m','C2M','G2M','D2M','E2m','C2M','A1m','B1M'],bass:[0,null,7,null,0,null,7,null],arp:[0,7,12,15,12,7,3,7],
    mel:'E5 - G5 - F#5 - E5 D5 | B4 - - - G4 - . . | C5 - E5 - G5 - F#5 E5 | D5 - - - A4 - . . | E5 - B4 - E5 - G5 F#5 | E5 - C5 - E5 - G5 - | A5 - G5 F#5 E5 - D5 C5 | B4 - D#5 - F#5 - . .'},
  '2b':{bpm:76,lead:'triangle',leadV:.12,drums:1,
    chords:['A1m','F1M','G1M','E1M','A1m','F1M','D2m','E1M'],bass:[0,null,null,null,0,null,7,null],arp:[0,3,7,12,7,3,0,7],
    mel:'A4 - - B4 C5 - B4 A4 | F4 - - - A4 - . . | G4 - B4 - D5 - C5 B4 | G#4 - - - E4 - . . | A4 - C5 - E5 - D5 C5 | A4 - F4 - A4 - C5 - | D5 - E5 F5 E5 - D5 C5 | B4 - - - G#4 - . .'},
  '3b':{bpm:84,lead:'triangle',leadV:.11,drums:1,
    chords:['D2m','A#1M','F2M','C2M','D2m','A#1M','G1m','A1M'],bass:[0,null,7,null,12,null,7,null],arp:[0,7,12,15,19,15,12,7],
    mel:'A5 - - F5 E5 - D5 - | F5 - - - A#4 - . . | C5 - F5 - A5 - G5 F5 | E5 - - - C5 - . . | D5 - F5 - A5 - D6 C6 | A#5 - A5 - F5 - D5 - | G5 - A#5 - A5 - G5 F5 | E5 - C#5 - A4 - . .'},
  '5b':{bpm:72,lead:'triangle',leadV:.12,drums:1,
    chords:['F2m','C#2M','G#1M','D#2M','F2m','C#2M','A#1m','C2M'],bass:[0,null,null,null,7,null,null,null],arp:[0,3,7,12,7,3,0,3],
    mel:'C5 - - F5 G#5 - G5 F5 | F5 - - - C#5 - . . | C5 - D#5 - G#5 - G5 F5 | G5 - - - D#5 - . . | F5 - G#5 - C6 - A#5 G#5 | G5 - F5 - D#5 - C#5 - | C5 - D#5 - F5 - G5 - | E5 - - - C5 - . .'},
  '6b':{bpm:96,lead:'square',leadV:.06,drums:1,
    chords:['B1m','G1M','B1m','F#1M','E2m','C2M','F#1M','F#1M'],bass:[0,null,0,null,12,null,7,null],arp:[0,3,7,3,12,7,3,0],
    mel:'F#5 - G5 - F#5 - D5 - | B4 - - - D5 - . . | F#5 - G5 - A5 - G5 F#5 | E5 - - - A#4 - . . | B4 - D5 - F#5 - E5 D5 | C5 - E5 - G5 - - . | F#5 - E5 D5 C#5 - A#4 - | F#4 - A#4 - C#5 - . .'},
  win:{bpm:120,lead:'square',leadV:.08,drums:0,once:1,
    chords:['C2M','F2M','G2M','C2M'],bass:[0,null,7,null,0,null,7,null],arp:[0,7,12,15,12,7,3,7],
    mel:'C5 E5 G5 C6 - - G5 - | A5 - F5 - A5 C6 - - | B5 - G5 - D6 - B5 - | C6 - - - - - . .'},
  lose:{bpm:70,lead:'triangle',leadV:.12,drums:0,once:1,
    chords:['A1m','F1M','D2m','E1M'],bass:[0,null,null,null,7,null,null,null],arp:[0,3,7,12,7,3,0,7],
    mel:'E5 - D5 - C5 - B4 - | A4 - - - F4 - . . | D4 - F4 - A4 - G#4 - | A4 - - - - - . .'},
  4:{bpm:148,lead:'square',leadV:.07,drums:2,
    chords:['E2m','C2M','A1m','B1M','E2m','C2M','A1m','B1M'],bass:[0,0,12,0,0,12,0,7],arp:[0,7,12,7,0,7,12,7],
    mel:'E5 - B4 - E5 F5 G5 F5 | E5 - C5 - E5 - G5 - | A5 - G5 F5 E5 - D5 E5 | D#5 - - - B4 - F#5 - | G5 F#5 E5 - B4 - E5 - | C5 - E5 G5 A5 - G5 E5 | F5 - E5 D5 C5 - B4 A4 | B4 - D#5 - F#5 - B5 -'}
};
for(const k in TRACKS){const t=TRACKS[k];
  t.ch=t.chords.map(c=>{const m=c.match(/^([A-G]#?)(\d)(m|M)$/);return {root:NOTE(m[1]+m[2]),third:m[3]==='m'?3:4};});
  t.notes=t.mel.replace(/\|/g,' ').trim().split(/\s+/);
}
const MUS={cur:null,bus:null,step:0,next:0,timer:0};
function musicHot(){
  if(!G.monsters||!G.heroes)return false;
  return G.monsters.some(m=>m.alive&&!((m.lair||(MON[m.id]&&MON[m.id].lair))&&!m.aggro)&&G.heroes.some(h=>h.alive&&mdist(h,m)<=5));
}
function musicWant(){
  if(!MUSIC)return null;
  if(!NET.started&&!(NET.role==='solo'&&NET.playing))return 'menu';
  if(G.over)return G.heroes&&G.heroes.some(h=>h.alive)&&!G.endless&&!G.horde?'win':'lose';
  if(G.camp)return 'camp';
  if(G.horde)return 'horde';
  if(G.loc!==ARENA&&G.monsters&&G.monsters.some(m=>m.alive&&m.elite&&MON[m.id]&&MON[m.id].key&&m.aggro&&G.heroes.some(h=>h.alive&&dist(h.c,h.r,m.c,m.r)<=7)))return 'boss';
  const v=String(G.loc)+(G.trackVar?'b':'');
  return TRACKS[v]?v:TRACKS[G.loc]?String(G.loc):null;
}
function musicFx(){
  if(MUS.lp||!AC)return;
  MUS.lp=AC.createBiquadFilter();MUS.lp.type='lowpass';MUS.lp.frequency.value=14000;MUS.lp.Q.value=.5;MUS.lp.connect(A_MUS);
  // реверберация: импульс из затухающего шума
  const len=Math.floor(AC.sampleRate*2.2),ir=AC.createBuffer(2,len,AC.sampleRate);
  for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6);}
  MUS.rev=AC.createConvolver();MUS.rev.buffer=ir;MUS.wet=AC.createGain();MUS.wet.gain.value=.26;
  MUS.lp.connect(MUS.rev);MUS.rev.connect(MUS.wet);MUS.wet.connect(A_MUS);
}
function musicTick(){
  const want=musicWant();
  const hot=musicHot();
  if(AC&&MUS.lp&&hot!==MUS.hot){MUS.hot=hot;const t=TRACKS[MUS.cur];MUS.lp.frequency.setTargetAtTime(hot||(t&&t.always)||!t||!t.drums?14000:2600,AC.currentTime,.8);}
  if(want===MUS.cur)return;
  if(!AC){if(want)return;} else if(MUS.bus){const b=MUS.bus;b.gain.setTargetAtTime(0,AC.currentTime,0.25);setTimeout(()=>{try{b.disconnect();}catch(e){}},1500);MUS.bus=null;}
  MUS.cur=want;clearInterval(MUS.timer);MUS.timer=0;
  if(!want||!audioInit())return;
  musicFx();
  MUS.bus=AC.createGain();MUS.bus.gain.setValueAtTime(0,AC.currentTime);MUS.bus.gain.setTargetAtTime(1,AC.currentTime,0.4);MUS.bus.connect(MUS.lp||A_MUS);
  {const tt=TRACKS[want];MUS.hot=musicHot();if(MUS.lp)MUS.lp.frequency.setTargetAtTime(MUS.hot||!tt||tt.always||!tt.drums?14000:2600,AC.currentTime,.3);}
  MUS.step=0;MUS.next=AC.currentTime+0.1;
  MUS.timer=setInterval(musicSched,25);
}
function musicSched(){
  const t=TRACKS[MUS.cur];if(!t||!MUS.bus)return;
  const e=60/t.bpm/2; // длительность восьмой
  while(MUS.next<AC.currentTime+0.15){
    const s=MUS.step,at=MUS.next,bar=Math.floor(s/8)%t.ch.length,i=s%8,c=t.ch[bar],out=MUS.bus;
    if(t.once&&s>=t.notes.length){const b=MUS.bus;b.gain.setTargetAtTime(0,AC.currentTime+.5,.6);clearInterval(MUS.timer);MUS.timer=0;return;}
    // пэд: мягкий аккорд на весь такт
    if(i===0){[0,c.third,7].forEach((n,k)=>aTone(MF(c.root+12+n),e*8*.98,k?'sine':'triangle',.045,{at,att:.35},out));}
    const tone=n=>n===3?c.third:n===15?c.third+12:n; // 3/15 в шаблонах = терция аккорда
    // бас
    const b=t.bass[i];if(b!=null)aTone(MF(c.root+b),e*0.9,'triangle',.5,{at},out);
    // арпеджио (шестнадцатые)
    [0,.5].forEach((h,j)=>{const n=t.arp[(i*2+j)%8];aTone(MF(c.root+24+tone(n)),e*0.45,'square',.035,{at:at+h*e},out);});
    // мелодия
    const tok=t.notes[s%t.notes.length];
    if(tok!=='.'&&tok!=='-'){let len=1;while(t.notes[(s+len)%t.notes.length]==='-')len++;
      aTone(MF(NOTE(tok)),e*len*0.95,t.lead,t.leadV*3,{at,att:.01,vib:len>2?5:0},out);
      aTone(MF(NOTE(tok))*1.006,e*len*0.95,'triangle',t.leadV*1.2,{at,att:.02},out);}
    // ударные
    const dl=!t.drums?0:(t.always?t.drums:(MUS.hot?2:0));
    if(t.drums&&!dl&&i===0)aTone(110,.18,'sine',.45,{at,to:40},out);
    if(dl){
      if(i%4===0)aTone(120,.14,'sine',.9,{at,to:40},out);
      if(i%4===2)aNoise(.12,dl>1?.5:.25,'bandpass',1800,{at},out);
      if(dl>1||i%2===1)aNoise(.03,.18,'highpass',7000,{at},out);
      if(dl>1&&i===7)aTone(120,.14,'sine',.7,{at,to:40},out);
    }
    MUS.step++;MUS.next+=e;
  }
}
