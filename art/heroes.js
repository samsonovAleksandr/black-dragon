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
