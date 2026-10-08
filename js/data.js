'use strict';
/* =========================================================
   ДАННЫЕ ИГРЫ
   ========================================================= */
const XPT=[8,20,38,62];                        // опыт для уровней 2..5
const KEYS_NEEDED=5;
const LOC_SUB={7:'Держитесь! Волны врагов идут одна за другой',1:'Найдите ключи и доберитесь до выхода',2:'Земля мертвецов, орков и тёмных рыцарей',3:'Ледяная королева охраняет последний ключ',5:'Трясина, болотные твари и логово Гидры',6:'Яды, кислота и Королева пауков в глубине',4:'Разбейте печати. Сразите Дракона!'};
const DIFF={
 easy:{n:'Лёгкая',hp:.75,atk:-1,mon:-2,gold:1.4,boss:.8,d:'Монстры слабее и их меньше, больше золота. Для знакомства с игрой.'},
 normal:{n:'Обычная',hp:1.4,atk:0,mon:2,gold:1,boss:1.4,d:'Задуманный баланс.'},
 hard:{n:'Героическая',hp:1.9,atk:2,mon:4,gold:.7,boss:1.7,d:'Монстры сильнее и их больше, золота меньше. Для опытной команды.'}};
const DORDER=['easy','normal','hard'];
const D=()=>DIFF[G.diff]||DIFF.normal;
/* --- Бесконечное подземелье --- */
const BOSS_EVERY=5;
const isBossFloor=d=>d%BOSS_EVERY===0;
const THEME_CYCLE=[1,2,3,5,6];
const themeFor=d=>{if(isBossFloor(d))return 4;const n=d-Math.floor(d/BOSS_EVERY);return THEME_CYCLE[(n-1)%THEME_CYCLE.length];};
const LOC_TIER={1:0,2:1,5:1,3:2,6:2,4:3};
const STORY_TIERS=[[1],[2,5],[3,6]];
const nextOpts=()=>G.chapter?(()=>{const r=CHAPTERS[G.chapter.id].route;return r[G.chapter.step+1]!=null?[r[G.chapter.step+1]]:[];})():STORY_TIERS[(LOC_TIER[G.loc]||0)+1]||[ARENA];
const DS=()=>G.exped?{hp:1.15,atk:1,cnt:0}:G.rush?{hp:1+.12*G.rush.i,atk:Math.floor(G.rush.i/2),cnt:0}:G.horde?{hp:1+.09*(G.horde.wave-1)+(G.heroes.length>4?.05*(G.heroes.length-4):0),atk:Math.floor((G.horde.wave-1)/4),cnt:0}:G.endless?{hp:1+.11*(G.depth-1),atk:Math.floor((G.depth-1)/3),cnt:Math.floor((G.depth-1)/2)}:(()=>{const k=Math.min(LOC_TIER[G.loc]||0,2);return {hp:1+.18*k,atk:k,cnt:k};})();
const HORDE_LOC=7;
const hasExit=()=>!G.horde&&!G.rush&&!(G.exped&&!G.exped.bossDead)&&!(G.chapter&&!nextOpts().length)&&(G.loc!==ARENA||!!G.floorClear);
function loadRecords(){try{return JSON.parse(localStorage.getItem('bd_endless')||'[]');}catch(e){return [];}}
function saveRecord(r){const a=loadRecords();a.push(r);a.sort((x,y)=>y.score-x.score);a.length=Math.min(a.length,5);try{localStorage.setItem('bd_endless',JSON.stringify(a));}catch(e){}return a;}
const endlessScore=()=>G.depth*100+G.stats.kills*5+Math.floor((G.gold||0)/5);
const PRICE={trap_bear:9,smokebomb:11,lure:8,potion:8,antidote:8,ragepot:9,scroll:10,icerune:11,bomb:12,elixir:14,blink:14,stormrune:14,feather:22,
 leather:12,rustsword:12,helmet:14,dagger:14,cloak:14,boots:16,chain:18,axe:18,ringhp:15,vampring:22,trollheart:22,amulet:30};
const priceOf=id=>PRICE[id]||(ITEMS[id].pure?0:/^p_/.test(id)?30:ITEMS[id].cls?20:15);
const CURSED=['c_blade','c_mask','c_plate','c_ring','c_crown'];
const isCursed=id=>!!(ITEMS[id]&&ITEMS[id].curse);
const PURIFY_COST=25;
const DRAGON_HP=250, SEAL_HP=28, ARENA=4;

const HDEF={
 tank:{n:'Танк',hp:20,atk:2,def:2,ap:3,rng:1,spr:'tank',abil:['guard'],
   role:'Щит команды: принимает удары на себя.',
   lv:{2:{hp:3,ab:['taunt']},
       3:{hp:3,pick:[{n:'Крепкая броня',d:'+1 ЗАЩ навсегда.',def:1},{n:'Второе дыхание',d:'Новое умение: Танк лечит себя на 3+уровень HP (2 ОД).',ab:['second']}]},
       4:{hp:3,atk:1,ab:['bash']},
       5:{hp:4,pick:[{n:'Несокрушимый',d:'«Стража» активна всегда, без траты ОД.',flag:'unbreak'},{n:'Землетрясение',d:'Новое умение: все враги рядом получают АТК+1 урона и оглушены (3 ОД).',ab:['quake']}]}}},
 sword:{n:'Мечник',hp:14,atk:4,def:1,ap:3,rng:1,spr:'sword',abil:['power'],
   role:'Главный убийца ближнего боя.',
   lv:{2:{hp:2,ab:['block']},
       3:{hp:2,pick:[{n:'Мастер меча',d:'+1 АТК навсегда.',atk:1},{n:'Жажда крови',d:'Каждое убийство восстанавливает Мечнику 2 HP.',flag:'bloodlust'}]},
       4:{hp:2,ab:['whirl']},
       5:{hp:3,atk:1,pick:[{n:'Отражение',d:'Успешный «Блок» бьёт атакующего на половину АТК.',flag:'reflect'},{n:'Казнь',d:'Новое умение: по врагу с ≤50% HP — тройной урон (2 ОД).',ab:['execute']}]}}},
 archer:{n:'Лучник',hp:9,atk:3,def:0,ap:3,rng:3,spr:'archer',abil:['triple'],
   role:'Дальний урон и мобильность.',
   lv:{2:{hp:2,ab:['dash']},
       3:{hp:2,pick:[{n:'Острый глаз',d:'+1 АТК навсегда.',atk:1},{n:'Пригвоздить',d:'Новое умение: выстрел АТК+1, враг не может сойти с места в свой ход (2 ОД).',ab:['pin']}]},
       4:{hp:2,rng:1,ab:['aimed']},
       5:{hp:2,atk:1,pick:[{n:'Быстрые руки',d:'+1 очко действия каждый раунд.',ap:1},{n:'Град стрел',d:'Новое умение: выстрел по каждому врагу в дальности (3 ОД).',ab:['volley']}]}}},
 mage:{n:'Маг',hp:8,atk:3,def:0,ap:3,rng:2,spr:'mage',abil:['heal'],
   role:'Поддержка: лечит, ускоряет, жжёт группы.',
   lv:{2:{hp:2,ab:['haste']},
       3:{hp:2,atk:1,pick:[{n:'Огненный шар',d:'Новое умение: урон цели и всем врагам рядом с ней (3 ОД).',ab:['fireball']},{n:'Ледяная стрела',d:'Новое умение: АТК+1 урона, враг заморожен и пропускает ход (2 ОД).',ab:['frost']}]},
       4:{hp:2,rng:1},
       5:{hp:2,atk:1,pick:[{n:'Воскрешение',d:'Новое умение: вернуть павшего героя с 50% HP (раз за локацию, 3 ОД).',ab:['revive']},{n:'Массовое лечение',d:'Новое умение: лечит всех союзников в радиусе 3 на 2+уровень HP (3 ОД).',ab:['massheal']}]}}},
 priest:{n:'Жрец',hp:11,atk:2,def:1,ap:3,rng:2,spr:'priest',abil:['smite','mend'],
   role:'Свет: лечит, снимает яды, карает нежить.',
   lv:{2:{hp:2,ab:['cleanse']},
       3:{hp:2,pick:[{n:'Священный щит',d:'Новое умение: союзник в 3 гексах получает «Блок» — следующий удар по нему блокируется (2 ОД).',ab:['ward']},{n:'Благословение',d:'Новое умение: союзник получает +2 АТК и +1 ЗАЩ на 2 раунда (2 ОД).',ab:['bless']}]},
       4:{hp:2,rng:1},
       5:{hp:3,atk:1,pick:[{n:'Святой нимб',d:'В начале каждого раунда Жрец лечит всех союзников в радиусе 2 на 2 HP.',flag:'halo'},{n:'Воскрешение',d:'Новое умение: вернуть павшего героя с 50% HP (раз за локацию, 3 ОД).',ab:['revive']}]}}},
 rogue:{n:'Разбойник',hp:10,atk:4,def:0,ap:3,rng:1,spd:1,spr:'rogue',abil:['backstab'],
   role:'Быстрый убийца: ходит на 3 гекса за ОД, без ударов вдогонку.',
   lv:{2:{hp:2,ab:['knives']},
       3:{hp:2,pick:[{n:'Яд на клинках',d:'Каждый удар Разбойника вызывает у врага кровотечение (1 урон 2 хода).',flag:'venom'},{n:'Острые клинки',d:'+1 АТК навсегда.',atk:1}]},
       4:{hp:2,ab:['smoke']},
       5:{hp:2,atk:1,pick:[{n:'Казнь',d:'Новое умение: по врагу с ≤50% HP — тройной урон (2 ОД).',ab:['execute']},{n:'Быстрые руки',d:'+1 очко действия каждый раунд.',ap:1}]}}},
 paladin:{n:'Паладин',hp:17,atk:3,def:2,ap:3,rng:1,spr:'paladin',abil:['holystrike'],
   role:'Воин света: бьёт и исцеляет соседей, усиливает отряд.',
   lv:{2:{hp:3,ab:['layhands']},
       3:{hp:3,pick:[{n:'Аура щита',d:'Союзники рядом (в 1 гексе) получают +1 ЗАЩ.',flag:'aura'},{n:'Латы веры',d:'+1 ЗАЩ навсегда.',def:1}]},
       4:{hp:3,atk:1,ab:['judge']},
       5:{hp:3,pick:[{n:'Несгибаемая вера',d:'Раз за локацию: смертельный удар оставляет Паладина с 1 HP.',flag:'faith'},{n:'Праведный клич',d:'Новое умение: союзники в радиусе 3 получают +2 АТК и +1 ЗАЩ на 2 раунда (3 ОД).',ab:['rally']}]}}},
};
const HORDER=['tank','sword','archer','mage','priest','rogue','paladin'];
const SQUAD0=['tank','sword','archer','mage'];
const squad=()=>(NET.squad&&NET.squad.length>=4&&NET.squad.length<=7&&NET.squad.every(id=>HDEF[id]))?NET.squad:SQUAD0;
const heroIds=()=>(G.heroes&&G.heroes.length)?G.heroes.filter(h=>!h.temp&&!h.pet).map(h=>h.id):squad();
const inSquad=id=>!ITEMS[id].cls||heroIds().includes(ITEMS[id].cls);

/* Монстры: hp, atk, def, mv (гексов за ход), rng, xp */
const MON={
 goblin:{n:'Гоблин',hp:5,atk:3,def:0,mv:2,rng:1,xp:1,spr:'goblin',d:'Мелкий мародёр.'},
 wolf:{n:'Волк',hp:6,atk:3,def:0,mv:4,rng:1,xp:2,spr:'wolf',bleed:2,d:'Очень быстрый: ходит на 4 гекса. Укус вызывает кровотечение.'},
 skel:{n:'Скелет',undead:1,hp:7,atk:3,def:1,mv:2,rng:1,xp:2,spr:'skel',d:'Костяной воин, защита 1.'},
 spider:{n:'Паук',hp:6,atk:2,def:0,mv:3,rng:1,xp:2,spr:'spider',poison:1,d:'Яд: жертва теряет 1 HP в начале 2 раундов.'},
 bandit:{n:'Разбойник-лучник',hp:5,atk:3,def:0,mv:2,rng:3,xp:2,spr:'bandit',d:'Стреляет с расстояния 3.'},
 slime:{n:'Слизь',hp:9,atk:2,def:0,mv:1,rng:1,xp:2,spr:'slime',split:1,d:'Медленная. После смерти делится на 2 слизнячка.'},
 slimelet:{n:'Слизнячок',hp:3,atk:1,def:0,mv:1,rng:1,xp:0,spr:'slimelet',d:'Остаток слизи.'},
 orc:{n:'Орк',hp:13,atk:6,def:1,mv:2,rng:1,xp:3,spr:'orc',rage:1,d:'Ярость: ниже половины HP бьёт на +1.'},
 dknight:{n:'Тёмный рыцарь',hp:16,atk:6,def:3,mv:2,rng:1,xp:4,spr:'dknight',d:'Тяжёлая броня (защита 3). Нужна магия или меткий выстрел.'},
 necro:{n:'Некромант',undead:1,hp:9,atk:5,def:0,mv:2,rng:3,xp:4,spr:'necro',summon:1,pierce:1,d:'Магия пробивает броню. Раз в 3 хода поднимает Скелета.'},
 troll:{n:'Тролль',hp:20,atk:6,def:1,mv:2,rng:1,xp:5,spr:'troll',regen:2,d:'Регенерация: +2 HP в начале каждого хода.'},
 ghost:{n:'Призрак',undead:1,hp:9,atk:5,def:0,mv:3,rng:1,xp:4,spr:'ghost',pierce:1,d:'Его удар игнорирует защиту.'},
 ogre:{n:'Огр',hp:22,atk:8,def:0,mv:1,rng:1,xp:5,spr:'ogre',d:'Медленный, но сокрушительно бьёт.'},
 bat:{n:'Летучая мышь',hp:3,atk:2,def:0,mv:5,rng:1,xp:1,spr:'bat',d:'Хрупкая, но очень быстрая: 5 гексов за ход.'},
 boar:{n:'Кабан',hp:9,atk:4,def:1,mv:3,rng:1,xp:2,spr:'boar',charge:1,bleed:2,d:'Разбег: если перед атакой бежал, бьёт на +2. Клыки вызывают кровотечение.'},
 shaman:{n:'Гоблин-шаман',hp:5,atk:2,def:0,mv:2,rng:3,xp:2,spr:'shaman',healer:3,d:'Лечит раненых союзников на 3 HP вместо атаки. Убейте его первым!'},
 shroom:{n:'Ядовитый гриб',hp:6,atk:2,def:0,mv:0,rng:1,xp:1,spr:'shroom',poison:1,d:'Не двигается. Удар отравляет.'},
 wraith:{n:'Банши',undead:1,hp:8,atk:4,def:0,mv:3,rng:2,xp:3,spr:'wraith',pierce:1,d:'Крик на 2 гекса, игнорирует защиту.'},
 golem:{n:'Каменный голем',hp:24,atk:6,def:2,mv:1,rng:1,xp:5,spr:'golem',d:'Очень прочный и медленный.'},
 cultist:{n:'Культист',hp:7,atk:4,def:0,mv:2,rng:2,xp:3,spr:'cultist',explode:4,d:'При смерти взрывается: 4 урона всем героям рядом.'},
 gargoyle:{n:'Горгулья',hp:10,atk:4,def:3,mv:3,rng:1,xp:3,spr:'gargoyle',d:'Каменная кожа (защита 3). Бейте магией или метким выстрелом.'},
 yeti:{n:'Йети',hp:16,atk:6,def:1,mv:2,rng:1,xp:4,spr:'yeti',chill:1,d:'Могучий зверь. Удар промораживает: −1 ОД в следующем раунде.'},
 icespirit:{n:'Ледяной дух',hp:7,atk:4,def:0,mv:3,rng:2,xp:3,spr:'icespirit',chill:1,d:'Бьёт холодом на 2 гекса и промораживает.'},
 frostspider:{n:'Морозный паук',hp:7,atk:3,def:0,mv:3,rng:1,xp:2,spr:'frostspider',chill:1,poison:1,d:'Яд и холод одновременно.'},
 icegolem:{n:'Ледяной голем',hp:20,atk:6,def:3,mv:1,rng:1,xp:5,spr:'icegolem',d:'Медленный ледяной страж (защита 3). Горение и магия — лучшее средство.'},
 icequeen:{n:'Ледяная королева',hp:85,atk:8,def:3,mv:2,rng:3,xp:12,spr:'icequeen',chill:1,pierce:1,summon:'icespirit',sumMax:3,nova:1,key:1,lair:4,d:'МИНИ-БОСС. Бьёт льдом на 3 гекса сквозь броню, промораживает, призывает до 3 ледяных духов. Ниже половины HP каждые 3 хода выпускает Ледяной взрыв (4 урона и холод всем героям в 2 гексах). Не оглушается. Охраняет трон: нападает, если подойти ближе 4 гексов. Хранит последний ключ.'},
 toad:{n:'Жаба-прыгун',hp:8,atk:3,def:0,mv:3,rng:1,xp:2,spr:'toad',charge:1,d:'Прыжок: если перед атакой двигалась, бьёт на +2.'},
 leech:{n:'Пиявка',hp:7,atk:2,def:0,mv:2,rng:1,xp:2,spr:'leech',bleed:2,drain:1,d:'Кровосос: лечится на столько, сколько урона нанесла. Укус вызывает кровотечение.'},
 croc:{n:'Крокодил',hp:17,atk:6,def:1,mv:3,rng:1,xp:4,spr:'croc',d:'Быстрый и зубастый: ходит на 3 гекса.'},
 bogwitch:{n:'Болотная ведьма',hp:9,atk:4,def:0,mv:2,rng:3,xp:4,spr:'bogwitch',poison:1,pierce:1,summon:'toad',sumMax:2,d:'Проклятие бьёт на 3 гекса сквозь броню и травит. Призывает жаб.'},
 wisp:{n:'Блуждающий огонёк',hp:5,atk:4,def:0,mv:4,rng:2,xp:3,spr:'wisp',pierce:1,burn:1,d:'Манит в топь. Огонь бьёт на 2 гекса сквозь броню и поджигает.'},
 hydra:{n:'Гидра топей',hp:90,atk:7,def:2,mv:2,rng:1,xp:12,spr:'hydra',sweep:1,regen:3,key:1,lair:4,d:'МИНИ-БОСС. Много голов: каждый удар задевает всех героев рядом. Регенерация +3 HP за ход. Не оглушается. Охраняет логово: нападает, если подойти ближе 4 гексов. Хранит ключ.'},
 plaguerat:{n:'Чумная крыса',hp:4,atk:2,def:0,mv:5,rng:1,xp:1,spr:'plaguerat',poison:1,d:'Хрупкая, но очень быстрая: 5 гексов за ход. Укус отравляет.'},
 acidslime:{n:'Кислотная слизь',hp:10,atk:3,def:0,mv:1,rng:1,xp:2,spr:'acidslime',split:1,poison:1,d:'Медленная. Яд при ударе. После смерти делится на 2 слизнячка.'},
 alchemist:{n:'Алхимик',hp:8,atk:4,def:0,mv:2,rng:3,xp:4,spr:'alchemist',poison:1,explode:3,d:'Бросает колбы с ядом на 3 гекса. При смерти колбы лопаются: 3 урона героям рядом.'},
 zombie:{n:'Зомби',undead:1,hp:15,atk:5,def:0,mv:1,rng:1,xp:3,spr:'zombie',poison:1,d:'Медленный и живучий. Укус заражает ядом.'},
 scorpion:{n:'Скорпион',hp:9,atk:5,def:1,mv:3,rng:1,xp:3,spr:'scorpion',poison:2,d:'Быстрый. Жало вызывает долгий яд (3 хода).'},
 spiderqueen:{n:'Королева пауков',hp:95,atk:7,def:2,mv:3,rng:1,xp:14,spr:'spiderqueen',poison:2,summon:'spider',sumMax:3,web:1,key:1,lair:4,d:'МИНИ-БОСС. Яд, призывает до 3 пауков, раз в 3 хода плюёт паутиной: 2 урона и −1 ОД двум героям в 4 гексах. Не оглушается. Хранит ключ.'},
 hydrahead:{n:'Голова гидры',hp:14,atk:5,def:1,mv:2,rng:1,xp:3,spr:'hydrahead',bleed:1,d:'Отрубленная голова Гидры — живёт сама по себе и больно кусается. Появляется, когда Гидра теряет треть и две трети здоровья.'},
 stalker:{n:'Охотник',hp:30,atk:6,def:2,mv:3,rng:2,xp:8,spr:'stalker',bleed:2,d:'Выследил отряд и преследует его по всей карте. Арбалет бьёт на 2 гекса и вызывает кровотечение. Не оглушается. За его голову — щедрая награда.'},
 mimic:{n:'Мимик',hp:14,atk:5,def:1,mv:2,rng:1,xp:4,spr:'mimic',d:'Сундук-обманщик: притворялся добычей. Кусается больно, после смерти оставляет настоящую добычу.'},
 whelp:{n:'Дракончик',hp:5,atk:3,def:0,mv:3,rng:1,xp:0,spr:'whelp',d:'Отродье Дракона.'},
};

/* Предметы. mods: atk,def,hp,ap,spd,rng,heal.  use: активируемый эффект */
const ITEMS={
 potion:{n:'Зелье лечения',type:'Зелье',d:'1 ОД: +6 HP герою рядом (или себе). Одноразовое.',use:{cost:1,t:'ally',rng:1,consume:1,run:(h,t)=>healHero(h,t,6)}},
 elixir:{n:'Большое зелье',type:'Зелье',d:'1 ОД: +11 HP герою рядом (или себе). Одноразовое.',use:{cost:1,t:'ally',rng:1,consume:1,run:(h,t)=>healHero(h,t,11)}},
 rustsword:{n:'Ржавый меч',type:'Оружие',d:'+1 АТК',mods:{atk:1}},
 leather:{n:'Кожаный доспех',type:'Броня',d:'+1 ЗАЩ',mods:{def:1}},
 chain:{n:'Кольчуга',type:'Броня',d:'+2 ЗАЩ',mods:{def:2}},
 ringhp:{n:'Кольцо жизни',type:'Артефакт',d:'+3 макс. HP',mods:{hp:3}},
 boots:{n:'Сапоги скорохода',type:'Артефакт',d:'+1 гекс за ОД движения',mods:{spd:1}},
 amulet:{n:'Амулет времени',type:'Артефакт',d:'+1 очко действия',mods:{ap:1}},
 scroll:{n:'Свиток огня',type:'Свиток',d:'1 ОД: 5 магического урона, дальность 3. Одноразовый.',use:{cost:1,t:'enemy',rng:3,consume:1,run:(h,m)=>dmgMon(h,m,5,{magic:1})}},
 bomb:{n:'Бомба',type:'Свиток',d:'1 ОД: 4 урона (пробивает броню) цели и соседним врагам, дальность 3. Одноразовая.',use:{cost:1,t:'enemy',rng:3,consume:1,run:(h,m)=>{sfx('boom');aoeMon(h,m,4+(hasRelic('powder')?3:0),{pierce:1});}}},
 feather:{n:'Перо феникса',type:'Артефакт',d:'2 ОД: воскрешает павшего героя рядом с 50% HP. Одноразовое.',use:{cost:2,t:'dead',rng:1,consume:1,run:(h,t)=>reviveHero(t,.5)}},
 // классовые
 mace:{n:'Булава жреца',type:'Класс: Жрец',cls:'priest',d:'+1 АТК, +2 макс. HP',mods:{atk:1,hp:2}},
 holysymbol:{n:'Священный символ',type:'Класс: Жрец',cls:'priest',d:'+1 дальность, +2 к лечению',mods:{rng:1,heal:2}},
 twindagger:{n:'Парные кинжалы',type:'Класс: Разбойник',cls:'rogue',d:'+1 АТК, +1 ЗАЩ',mods:{atk:1,def:1}},
 assassinblade:{n:'Клинок убийцы',type:'Класс: Разбойник',cls:'rogue',d:'+2 АТК',mods:{atk:2}},
 shadowcloak:{n:'Плащ теней',type:'Класс: Разбойник',cls:'rogue',d:'+1 ЗАЩ, +1 гекс за ОД движения',mods:{def:1,spd:1}},
 holyshield:{n:'Святой щит',type:'Класс: Паладин',cls:'paladin',d:'+1 ЗАЩ, +2 макс. HP',mods:{def:1,hp:2}},
 lighthammer:{n:'Молот света',type:'Класс: Паладин',cls:'paladin',d:'+1 АТК, +1 ЗАЩ',mods:{atk:1,def:1}},
 c_blade:{n:'Проклятый клинок',type:'Проклятый предмет',d:'+3 АТК. Проклятие: −1 HP в начале каждого раунда (не ниже 1). Нельзя выбросить или продать — только очистить на привале.',mods:{atk:3},curse:'bleed',pure:'p_blade'},
 p_blade:{n:'Очищенный клинок',type:'Оружие',d:'+3 АТК',mods:{atk:3}},
 c_mask:{n:'Маска безумия',type:'Проклятый предмет',d:'+1 очко действия. Проклятие: −2 ЗАЩ. Нельзя выбросить или продать — только очистить на привале.',mods:{ap:1,def:-2},curse:'mask',pure:'p_mask'},
 p_mask:{n:'Маска провидца',type:'Артефакт',d:'+1 очко действия',mods:{ap:1}},
 c_plate:{n:'Латы демона',type:'Проклятый предмет',d:'+3 ЗАЩ, +4 HP. Проклятие: −1 гекс за ОД движения. Нельзя выбросить или продать — только очистить на привале.',mods:{def:3,hp:4,spd:-1},curse:'slow',pure:'p_plate'},
 p_plate:{n:'Латы света',type:'Броня',d:'+3 ЗАЩ, +4 HP',mods:{def:3,hp:4}},
 c_ring:{n:'Кольцо алчности',type:'Проклятый предмет',d:'+40% золота отряду. Проклятие: −4 макс. HP. Нельзя выбросить или продать — только очистить на привале.',mods:{hp:-4},greed:1,curse:'greed',pure:'p_ring'},
 p_ring:{n:'Кольцо удачи',type:'Артефакт',d:'+40% золота отряду',greed:1},
 c_crown:{n:'Корона костей',type:'Проклятый предмет',d:'+2 АТК, +2 ЗАЩ. Проклятие: враги в первую очередь нападают на этого героя. Нельзя выбросить или продать — только очистить на привале.',mods:{atk:2,def:2},curse:'lure',pure:'p_crown'},
 p_crown:{n:'Корона воителя',type:'Артефакт',d:'+2 АТК, +2 ЗАЩ',mods:{atk:2,def:2}},
 trap_bear:{n:'Капкан',type:'Ловушка',d:'1 ОД: поставить на соседний гекс. Враг, наступивший на него, получает 5 урона и не может двигаться в следующий ход. Герои его не задевают. Одноразовый.',use:{cost:1,t:'hex',steps:1,consume:1,run:(h,cell)=>{cell.htrap=true;sfx('clang');pop(cell,'КАПКАН','#ffd23f');log(h.d.n+' ставит капкан.');}}},
 smokebomb:{n:'Дымовая шашка',type:'Ловушка',d:'1 ОД: враги вплотную к герою оглушены и пропускают ход (боссы и вожаки — нет). Одноразовая.',use:{cost:1,t:'self',consume:1,run:h=>{sfx('whoosh');fxQ({burst:'dust',c:h.c,r:h.r});const l=G.monsters.filter(m=>m.alive&&mdist(h,m)<=1&&!ccImmune(m));if(!l.length)log('Дым рассеялся впустую.');l.forEach(m=>{m.stun=true;pop(m,'ОГЛУШЁН');});}}},
 lure:{n:'Приманка',type:'Ловушка',d:'1 ОД: бросить на гекс в 3 шагах. Два раунда враги поблизости бегут к приманке, а не к героям (боссы не ведутся). Одноразовая.',use:{cost:1,t:'hex',steps:3,consume:1,run:(h,cell)=>{(G.lures=G.lures||[]).push({c:cell.c,r:cell.r,until:G.round+2});sfx('item');pop(cell,'ПРИМАНКА','#ff8a7a');log(h.d.n+' бросает приманку.');}}},
 barbed:{n:'Зазубренные стрелы',type:'Класс: Лучник',cls:'archer',d:'+1 АТК',mods:{atk:1}},
 longbow:{n:'Длинный лук',type:'Класс: Лучник',cls:'archer',d:'+1 дальность',mods:{rng:1}},
 oakstaff:{n:'Дубовый посох',type:'Класс: Маг',cls:'mage',d:'+1 АТК',mods:{atk:1}},
 tome:{n:'Том исцеления',type:'Класс: Маг',cls:'mage',d:'+2 к лечению',mods:{heal:2}},
 duelist:{n:'Баклер дуэлянта',type:'Класс: Мечник',cls:'sword',d:'+1 ЗАЩ, +1 АТК',mods:{def:1,atk:1}},
 claymore:{n:'Клеймор',type:'Класс: Мечник',cls:'sword',d:'+2 АТК',mods:{atk:2}},
 spikeshield:{n:'Шипастый щит',type:'Класс: Танк',cls:'tank',d:'+1 ЗАЩ. Ударивший в ближнем бою получает 2 урона.',mods:{def:1},thorns:2},
 towershield:{n:'Башенный щит',type:'Класс: Танк',cls:'tank',d:'+2 ЗАЩ, +3 HP',mods:{def:2,hp:3}},
 // новые общие
 helmet:{n:'Железный шлем',type:'Броня',d:'+1 ЗАЩ, +2 HP',mods:{def:1,hp:2}},
 dagger:{n:'Кинжал',type:'Оружие',d:'+1 АТК, +1 гекс за ОД движения',mods:{atk:1,spd:1}},
 axe:{n:'Боевой топор',type:'Оружие',d:'+3 АТК, но −1 ЗАЩ',mods:{atk:3,def:-1}},
 cloak:{n:'Плащ странника',type:'Броня',d:'+1 ЗАЩ, +1 гекс за ОД движения',mods:{def:1,spd:1}},
 vampring:{n:'Кольцо вампира',type:'Артефакт',d:'Каждое убийство восстанавливает 2 HP',vamp:2},
 trollheart:{n:'Сердце тролля',type:'Артефакт',d:'+2 HP, восстанавливает 1 HP в начале каждого раунда',mods:{hp:2},regen:1},
 antidote:{n:'Противоядие',type:'Зелье',d:'1 ОД: снимает яд и даёт +4 HP герою рядом (или себе). Одноразовое.',use:{cost:1,t:'ally',rng:1,consume:1,run:(h,t)=>{t.poison=0;healHero(h,t,4);}}},
 ragepot:{n:'Зелье ярости',type:'Зелье',d:'1 ОД: +3 АТК до конца раунда. Одноразовое.',use:{cost:1,t:'self',consume:1,run:h=>{h.rage=3;sfx('taunt');pop(h,'ЯРОСТЬ','#f66');log(h.d.n+' впадает в ярость: +3 АТК до конца раунда.');}}},
 icerune:{n:'Руна льда',type:'Свиток',d:'1 ОД: 3 магического урона и заморозка (враг пропускает ход), дальность 3. Одноразовая.',use:{cost:1,t:'enemy',rng:3,consume:1,run:(h,m)=>{sfx('zap');dmgMon(h,m,3,{magic:1});if(m.alive&&!ccImmune(m)){m.stun=true;pop(m,'ЗАМОРОЖЕН','#9df');}}}},
 stormrune:{n:'Руна бури',type:'Свиток',d:'1 ОД: 4 урона всем врагам в радиусе 2 от героя. Одноразовая.',use:{cost:1,t:'self',consume:1,run:h=>{sfx('boom');const l=G.monsters.filter(m=>m.alive&&mdist(h,m)<=2);if(!l.length)log('Молнии бьют в пустоту.');l.forEach(m=>{if(m.alive)dmgMon(h,m,4,{magic:1});});}}},
 blink:{n:'Свиток прыжка',type:'Свиток',d:'1 ОД: мгновенно перенестись на свободный гекс до 6 шагов (без ударов вдогонку). Одноразовый.',use:{cost:1,t:'hex',steps:6,consume:1,run:(h,cell)=>{sfx('whoosh');moveHero(h,cell.c,cell.r,true);}}},
 // новые классовые
 elvencloak:{n:'Эльфийский плащ',type:'Класс: Лучник',cls:'archer',d:'+1 ЗАЩ, +1 гекс за ОД движения',mods:{def:1,spd:1}},
 crystal:{n:'Кристалл силы',type:'Класс: Маг',cls:'mage',d:'+1 АТК, +1 дальность',mods:{atk:1,rng:1}},
 bloodblade:{n:'Меч-кровопийца',type:'Класс: Мечник',cls:'sword',d:'+1 АТК, каждое убийство +2 HP',mods:{atk:1},vamp:2},
 platelegs:{n:'Латные поножи',type:'Класс: Танк',cls:'tank',d:'+1 ЗАЩ, +4 HP',mods:{def:1,hp:4}},
};

/* Способности. t: self/enemy/ally/dead/hex ; rng: число | 'weapon' | 'melee' */
const ABIL={
 power:{n:'Сильный удар',cost:2,t:'enemy',rng:'melee',d:'Удар по цели рядом: 2×АТК+2 урона и кровотечение (1 урон 2 хода).',
   run:(h,m)=>dmgMon(h,m,2*st(h,'atk')+2+roll(),{bleed:2})},
 block:{n:'Блок',cost:1,t:'self',d:'Следующий входящий удар полностью блокируется.',
   run:h=>{h.block=true;sfx('shield');log(h.d.n+' встаёт в блок.');}},
 whirl:{n:'Вихрь',cost:3,t:'self',d:'Удар по всем врагам рядом.',
   run:h=>{sfx('whirl');const l=G.monsters.filter(m=>m.alive&&mdist(h,m)<=1);if(!l.length)log('Вихрь бьёт воздух.');l.forEach(m=>dmgMon(h,m,st(h,'atk')+roll()));}},
 guard:{n:'Стража',cost:1,t:'self',d:'До след. раунда: +1 ЗАЩ, а урон по соседним союзникам принимает на себя.',
   run:h=>{h.guard=true;sfx('shield');log('Танк выставляет щит: союзники рядом под защитой.');}},
 taunt:{n:'Провокация',cost:1,t:'self',d:'В этот ход враги нападают на Танка, если могут до него дотянуться.',
   run:h=>{h.taunt=true;sfx('taunt');log('Танк вызывает врагов на себя!');}},
 bash:{n:'Удар щитом',cost:2,t:'enemy',rng:'melee',d:'АТК+2 урона, оглушение (враг пропускает ход) и отбрасывание на 1 гекс: в лаву, на бочку или в другого врага.',
   run:(h,m)=>{dmgMon(h,m,st(h,'atk')+2+roll());sfx('clang');if(m.alive&&!ccImmune(m)){m.stun=true;pop(m,'ОГЛУШЁН');pushMon(h,m);}}},
 triple:{n:'Тройной выстрел',cost:2,t:'enemy',rng:'weapon',d:'Три выстрела подряд по одной цели (АТК−1 каждый).',
   run:(h,m)=>{for(let i=0;i<3&&m.alive;i++)dmgMon(h,m,st(h,'atk')-1+roll());}},
 dash:{n:'Рывок',cost:2,t:'hex',steps:5,d:'Переместиться до 5 гексов без ударов вдогонку.',
   run:(h,cell)=>{moveHero(h,cell.c,cell.r,true);}},
 aimed:{n:'Меткий выстрел',cost:2,t:'enemy',rng:'weapon',d:'АТК+3 урона, игнорирует броню. Помечает цель: следующий удар ДРУГОГО героя по ней +3.',
   run:(h,m)=>{dmgMon(h,m,st(h,'atk')+3+roll(),{pierce:1});markMon(h,m);}},
 heal:{n:'Лечение',cost:2,t:'ally',rng:3,d:'Восстановить союзнику 3+уровень HP (дальность 3).',
   run:(h,t)=>healHero(h,t,3+h.lv+st(h,'heal'),true)},
 haste:{n:'Ускорение',cost:2,t:'ally',rng:3,d:'Союзник получает +1 ОД в следующем раунде.',
   run:(h,t)=>{t.haste=true;sfx('haste');pop(t,'+1 ОД');log(t.d.n+' получит +1 ОД.');}},
 fireball:{n:'Огненный шар',cost:3,t:'enemy',rng:3,d:'АТК+2 магического урона цели и врагам рядом с ней, поджигает (2 урона 2 хода).',
   run:(h,m)=>{sfx('fire');aoeMon(h,m,st(h,'atk')+2+roll(),{magic:1,burn:2});}},
 revive:{n:'Воскрешение',cost:3,t:'dead',rng:2,once:1,d:'Воскресить павшего героя (50% HP). Раз за локацию.',
   run:(h,t)=>{reviveHero(t,.5);h.reviveUsed=true;}},

 second:{n:'Второе дыхание',cost:2,t:'self',d:'Танк восстанавливает себе 3+уровень HP.',
   run:h=>healHero(h,h,3+h.lv)},
 quake:{n:'Землетрясение',cost:3,t:'self',d:'Все враги рядом получают АТК+1 урона и оглушены (Дракон не оглушается).',
   run:h=>{sfx('boom');const l=G.monsters.filter(m=>m.alive&&mdist(h,m)<=1);if(!l.length)log('Земля дрожит впустую.');
     l.forEach(m=>{dmgMon(h,m,st(h,'atk')+1+roll());if(m.alive&&!ccImmune(m)){m.stun=true;pop(m,'ОГЛУШЁН');}});}},
 execute:{n:'Казнь',cost:2,t:'enemy',rng:'melee',d:'Если у врага ≤50% HP — тройной урон (3×АТК), иначе обычный удар.',
   run:(h,m)=>{const low=m.hp<=m.max/2;if(low)log('КАЗНЬ!');dmgMon(h,m,(low?3:1)*st(h,'atk')+roll());}},
 pin:{n:'Пригвоздить',cost:2,t:'enemy',rng:'weapon',d:'АТК+1 урона; враг не может двигаться в свой следующий ход. Помечает цель: следующий удар ДРУГОГО героя по ней +3.',
   run:(h,m)=>{dmgMon(h,m,st(h,'atk')+1+roll());if(m.alive&&!ccImmune(m)){m.root=true;pop(m,'ПРИГВОЖДЁН');}markMon(h,m);}},
 volley:{n:'Град стрел',cost:3,t:'self',d:'Выстрел по каждому врагу в дальности (АТК−1).',
   run:h=>{const l=G.monsters.filter(m=>m.alive&&mdist(h,m)<=st(h,'rng'));if(!l.length)log('Нет врагов в дальности.');
     l.forEach(m=>{if(m.alive)dmgMon(h,m,st(h,'atk')-1+roll());});}},
 frost:{n:'Ледяная стрела',cost:2,t:'enemy',rng:3,d:'АТК+1 магического урона; враг заморожен и пропускает ход (Дракон — нет). Помечает цель: следующий удар ДРУГОГО героя по ней +3.',
   run:(h,m)=>{sfx('zap');dmgMon(h,m,st(h,'atk')+1+roll(),{magic:1});if(m.alive&&!ccImmune(m)){m.stun=true;pop(m,'ЗАМОРОЖЕН','#9df');}markMon(h,m);}},
 smite:{n:'Кара',cost:2,t:'enemy',rng:3,d:'АТК+2 магического урона (дальность 3). По нежити — скелетам, призракам, зомби, банши — вдвое больше. Помечает цель: следующий удар ДРУГОГО героя по ней +3.',
   run:(h,m)=>{sfx('zap');let b=st(h,'atk')+2+roll();if(MON[m.id]&&MON[m.id].undead){b*=2;log('Свет жжёт нежить!');}dmgMon(h,m,b,{magic:1});markMon(h,m);}},
 mend:{n:'Целительный свет',cost:1,t:'ally',rng:2,d:'Восстановить союзнику 2+уровень HP (дальность 2, всего 1 ОД).',
   run:(h,t)=>healHero(h,t,2+h.lv+st(h,'heal'),true)},
 cleanse:{n:'Очищение',cost:1,t:'ally',rng:2,d:'Снять с союзника яд, горение, кровотечение и холод и вылечить 2 HP.',
   run:(h,t)=>{const had=t.poison||t.burn||t.bleed||t.chill;t.poison=t.burn=t.bleed=t.chill=0;sfx('heal');if(had){pop(t,'ОЧИЩЕН','#fff');log(h.d.n+' очищает '+t.d.n+' от недугов.');}healHero(h,t,2,true);}},
 ward:{n:'Священный щит',cost:2,t:'ally',rng:3,d:'Союзник получает «Блок»: следующий удар по нему полностью блокируется.',
   run:(h,t)=>{t.block=true;sfx('shield');pop(t,'ЩИТ','#9df');log(h.d.n+' ограждает '+t.d.n+' священным щитом.');}},
 bless:{n:'Благословение',cost:2,t:'ally',rng:3,d:'Союзник получает +2 АТК и +1 ЗАЩ на 2 раунда.',
   run:(h,t)=>{t.bless=2;sfx('haste');pop(t,'БЛАГОСЛОВЕН','#ffe27a');log(h.d.n+' благословляет '+t.d.n+'.');}},
 backstab:{n:'Удар в спину',cost:2,t:'enemy',rng:'melee',d:'АТК+3 урона, игнорирует броню. Если враг оглушён, пригвождён или спит — тройной урон (3×АТК).',
   run:(h,m)=>{const sleeping=(m.lair||(MON[m.id]&&MON[m.id].lair))&&!m.aggro;const sneak=m.stun||m.root||sleeping;
     if(sneak)log('Удар в спину!');dmgMon(h,m,sneak?3*st(h,'atk')+roll():st(h,'atk')+3+roll(),{pierce:1});}},
 knives:{n:'Метание ножей',cost:1,t:'enemy',rng:3,d:'Бросок ножа: АТК−1 урона, дальность 3 (всего 1 ОД). Помечает цель: следующий удар ДРУГОГО героя по ней +3.',
   run:(h,m)=>{dmgMon(h,m,Math.max(1,st(h,'atk')-1)+roll());markMon(h,m);}},
 smoke:{n:'Дымовая завеса',cost:2,t:'self',d:'Все враги в радиусе 2 оглушены и пропускают ход (боссы и вожаки не оглушаются).',
   run:h=>{sfx('whoosh');const l=G.monsters.filter(m=>m.alive&&mdist(h,m)<=2&&!ccImmune(m));if(!l.length)log('Дым рассеялся впустую.');l.forEach(m=>{m.stun=true;pop(m,'ОГЛУШЁН');});}},
 holystrike:{n:'Священный удар',cost:2,t:'enemy',rng:'melee',d:'АТК+2 урона. Паладин и союзники рядом с ним исцеляются на 2 HP.',
   run:(h,m)=>{dmgMon(h,m,st(h,'atk')+2+roll());G.heroes.filter(x=>x.alive&&(x===h||dist(h.c,h.r,x.c,x.r)<=1)&&x.hp<st(x,'maxhp')).forEach(x=>healHero(h,x,2));}},
 layhands:{n:'Возложение рук',cost:2,t:'ally',rng:1,d:'Восстановить союзнику рядом 4+уровень HP.',
   run:(h,t)=>healHero(h,t,4+h.lv+st(h,'heal'),true)},
 judge:{n:'Правосудие',cost:3,t:'enemy',rng:'melee',d:'2×АТК+2 магического урона и оглушение врага.',
   run:(h,m)=>{sfx('clang');dmgMon(h,m,2*st(h,'atk')+2+roll(),{magic:1});if(m.alive&&!ccImmune(m)){m.stun=true;pop(m,'ОГЛУШЁН');}}},
 rally:{n:'Праведный клич',cost:3,t:'self',d:'Все союзники в радиусе 3 (и сам Паладин) получают +2 АТК и +1 ЗАЩ на 2 раунда.',
   run:h=>{sfx('haste');G.heroes.filter(x=>x.alive&&dist(h.c,h.r,x.c,x.r)<=3).forEach(x=>{x.bless=2;pop(x,'БЛАГОСЛОВЕН','#ffe27a');});log(h.d.n+' поднимает отряд на бой!');}},
 massheal:{n:'Массовое лечение',cost:3,t:'self',d:'Все живые союзники в радиусе 3 (и сам Маг) восстанавливают 2+уровень HP.',
   run:h=>{const l=G.heroes.filter(x=>x.alive&&x.hp<st(x,'maxhp')&&dist(h.c,h.r,x.c,x.r)<=3);if(!l.length)log('Все рядом и так здоровы.');l.forEach(x=>healHero(h,x,2+h.lv+st(h,'heal')));}},
};

/* Локации */
const LOCS={
 1:{n:'Тёмный лес',cols:12,rows:10,deco:'tree',
   poi:[{n:'Старое дерево',spr:'oldtree',at:[.32,.42],tok:{t:'item',it:'*a'}},
        {n:'Руины храма',spr:'ruins',at:[.72,.3],tok:{t:'key',guard:'skel'}},
        {n:'Заброшенный лагерь',spr:'camp',at:[.3,.78],tok:{t:'item',it:'*a'}},
        {n:'Звериное логово',spr:'cave',at:[.55,.62],tok:{t:'portal'}}],
   mon:['goblin','goblin','goblin','wolf','wolf','skel','skel','spider','bandit','slime','bat','bat','boar','shaman','shroom'],monN:10,
   items:['potion','potion','*g1','*g1','*g1','*c1','*c1'],keys:1,
   events:['trap','spring','ambush','empty','shrine','chest','chest'],terr:{slow:7,barrel:3,trap:2},slowName:'Болото',
   mini:{n:'Звериное логово',d:'Тесная нора, где свирепые звери защищают добычу.',mon:['wolf','wolf','boar','boar','spider','orc'],terr:{slow:3}}},
 2:{n:'Мёртвые земли',cols:14,rows:10,deco:'rock',
   poi:[{n:'Кладбище',spr:'grave',at:[.3,.3],tok:{t:'key',guard:'necro'}},
        {n:'Пещера тролля',spr:'cave',at:[.72,.55],tok:{t:'key',guard:'troll'}},
        {n:'Забытый алтарь',spr:'altar',at:[.45,.78],tok:{t:'item',it:'feather'}},
        {n:'Вход в склеп',spr:'ruins',at:[.58,.28],tok:{t:'portal'}}],
   mon:['orc','orc','orc','dknight','dknight','necro','troll','ghost','ghost','ogre','spider','wraith','golem','cultist','gargoyle','gargoyle'],monN:11,
   items:['elixir','potion','*g2','*g2','*g2','*c2','*c2'],keys:0,
   events:['trap','trap','spring','ambush','shrine','chest','chest'],terr:{lava:6,barrel:3,trap:3},
   mini:{n:'Склеп павших',d:'Древняя усыпальница: мертвецы не любят гостей.',mon:['dknight','necro','ghost','ghost','cultist','ogre'],terr:{lava:3}}},
 3:{n:'Ледяные пещеры',cols:13,rows:10,deco:'icicle',
   poi:[{n:'Замёрзший караван',spr:'frozencamp',at:[.3,.35],tok:{t:'item',it:'*a'}},
        {n:'Ледяной трон',spr:'throne',at:[.74,.28],boss:'icequeen'},
        {n:'Ледяной грот',spr:'cave',at:[.45,.8],tok:{t:'item',it:'elixir'}},
        {n:'Ледяная цитадель',spr:'throne',at:[.5,.52],tok:{t:'portal'}}],
   mon:['yeti','yeti','icespirit','icespirit','frostspider','frostspider','icegolem','wolf','wolf','skel','bat','wraith'],monN:10,
   items:['potion','elixir','*g2','*g2','*c2','*c2'],keys:0,
   events:['trap','spring','ambush','chest','shrine','empty','chest'],terr:{slow:8,barrel:2,trap:3},slowName:'Сугроб',
   mini:{n:'Ледяная цитадель',d:'Заброшенная крепость, занятая ледяными стражами.',mon:['yeti','icegolem','icespirit','icespirit','frostspider','wraith'],terr:{slow:3}}},
 5:{n:'Гиблые топи',cols:13,rows:10,deco:'mangrove',
   poi:[{n:'Хижина ведьмы',spr:'hut',at:[.3,.3],tok:{t:'key',guard:'bogwitch'}},
        {n:'Логово гидры',spr:'cave',at:[.74,.3],boss:'hydra'},
        {n:'Затонувшая лодка',spr:'camp',at:[.4,.8],tok:{t:'item',it:'*a'}},
        {n:'Тёмная заводь',spr:'cave',at:[.58,.6],tok:{t:'portal'}}],
   mon:['toad','toad','toad','leech','leech','croc','croc','bogwitch','wisp','wisp','spider','slime','shroom','boar'],monN:11,
   items:['elixir','potion','*g2','*g2','*g2','*c2','*c2'],keys:0,
   events:['trap','spring','ambush','ambush','shrine','chest','chest'],terr:{slow:16,barrel:2,trap:2},slowName:'Трясина',
   mini:{n:'Логово крокодилов',d:'Заводь, где в тине дремлют крокодилы и подстерегают болотные твари.',mon:['croc','croc','toad','toad','leech','bogwitch'],terr:{slow:4}}},
 6:{n:'Ядовитые катакомбы',cols:14,rows:10,deco:'mushroom',
   poi:[{n:'Паучье гнездо',spr:'cave',at:[.74,.28],boss:'spiderqueen'},
        {n:'Склад ядов',spr:'camp',at:[.4,.8],tok:{t:'item',it:'elixir'}},
        {n:'Тайник отравителя',spr:'ruins',at:[.3,.3],tok:{t:'item',it:'*a'}},
        {n:'Заброшенная лаборатория',spr:'lab',at:[.56,.55],tok:{t:'portal'}}],
   mon:['plaguerat','plaguerat','plaguerat','acidslime','acidslime','alchemist','alchemist','zombie','zombie','scorpion','scorpion','spider','shroom','wraith'],monN:12,
   items:['potion','elixir','*g2','*g2','*c2','*c2'],keys:0,
   events:['trap','trap','spring','ambush','shrine','chest','chest'],terr:{acid:9,barrel:3,trap:3},
   mini:{n:'Алхимический погреб',d:'Подвал отравителя: котлы, кислота и его верные слуги.',mon:['zombie','zombie','alchemist','alchemist','scorpion','acidslime'],terr:{acid:3}}},
 4:{n:'Логово Дракона',cols:11,rows:9,deco:'pillar'},
 7:{n:'Арена Орды',cols:13,rows:11,deco:'pillar'},
};
const POOL_A=['ringhp','boots','leather','potion','rustsword','helmet','dagger','cloak','vampring'];
const CLASS1=['barbed','oakstaff','duelist','spikeshield','mace','twindagger','holyshield','elvencloak','crystal','bloodblade','platelegs','shadowcloak'], CLASS2=['longbow','tome','claymore','towershield','holysymbol','assassinblade','lighthammer','elvencloak','crystal','bloodblade','platelegs','shadowcloak'];
const GEN1=['leather','rustsword','scroll','helmet','dagger','antidote','icerune','cloak','ragepot','trap_bear','smokebomb','lure'];
const GEN2=['chain','bomb','scroll','axe','trollheart','stormrune','blink','ragepot','icerune','vampring','amulet','trap_bear','smokebomb'];
