'use strict';
const SPR={},ICON={},ICONA={};
for(const k in SP)SPR[k]=mkSpr(SP[k]);
for(const k in VAR){const [b,ex]=VAR[k];SPR[k]=mkSpr(Object.assign({},SP[b],ex));}
for(const k in ART){try{SPR[k]=ART[k]();}catch(e){console.error('art',k,e);}}
for(const id in ICA){SPR['a_'+id]=mkSpr({fn:a=>ICA[id](a)});ICONA[id]=SPR['a_'+id].toDataURL();}
for(const id in ICON_OF){const [k,c]=ICON_OF[id];SPR['i_'+id]=mkSpr({fn:a=>ICN[k](a,c)});ICON[id]=SPR['i_'+id].toDataURL();}
/* --- Реликвии: пассивные бонусы на весь забег --- */
const RELICS={
 whetstone:{n:'Точильный камень',d:'+1 АТК всем героям.',ic:['sword','l']},
 ironwill:{n:'Железная воля',d:'+4 к максимуму HP всем героям.',ic:['heart','e']},
 ancestor:{n:'Щит предков',d:'+1 ЗАЩ всем героям.',ic:['shield','b']},
 windboots:{n:'Сапоги ветра',d:'+1 гекс за ОД движения всем героям.',ic:['boots','n']},
 goldtooth:{n:'Золотой зуб',d:'+50% золота с монстров, сундуков и событий.',ic:['ring','y']},
 warbook:{n:'Книга войны',d:'Герои получают +1 опыт за каждого врага, в убийстве которого участвовали.',ic:['tome','p']},
 chalice:{n:'Кровавый кубок',d:'Убийство врага лечит на 1 HP всех героев рядом с убийцей.',ic:['potion','r']},
 clock:{n:'Часы времени',d:'+1 ОД у всех героев в первом раунде каждой локации.',ic:['amulet','c']},
 moonstone:{n:'Лунный камень',d:'В начале раунда каждый герой лечится на 1 HP.',ic:['ring','c']},
 phoenix:{n:'Перо-оберег',d:'Раз за локацию первый павший герой тут же воскресает с 30% HP.',ic:['feather','o']},
 banner:{n:'Боевое знамя',d:'Герой рядом с союзником получает +1 ЗАЩ.',ic:['shield','r']},
 powder:{n:'Пороховая сумка',d:'Бомбы и взрывы бочек наносят на 3 урона больше.',ic:['bomb','o']},
 venom:{n:'Яд кобры',d:'Атаки героев вызывают у врагов кровотечение на 2 хода.',ic:['arrow','e']},
 eagle:{n:'Орлиный глаз',d:'+1 к дальности Лучника и Мага.',ic:['bow','y']},
 crown:{n:'Проклятая корона',d:'+2 АТК всем героям, но у монстров на 15% больше HP.',ic:['ring','p']},
 lantern:{n:'Шахтёрский фонарь',d:'Скрытые ловушки видны за 3 гекса от любого героя.',ic:['amulet','y']}
};
const RICON={};
for(const id in RELICS){const [k,c]=RELICS[id].ic;SPR['rl_'+id]=mkSpr({fn:a=>ICN[k](a,c)});RICON[id]=SPR['rl_'+id].toDataURL();}
