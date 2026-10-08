'use strict';
/* Сервер комнат для «Чёрного Дракона».
   Делает две вещи: раздаёт index.html, js/*.js и vendor/*.js и пересылает сообщения между хостом и гостями по WebSocket (/ws).
   Игровая логика остаётся у хоста в браузере, сервер её не знает.
   Защита от злоупотреблений: лимиты на число комнат/соединений, на создание комнат, на перебор кодов и на частоту сообщений. */
const http=require('http'),fs=require('fs'),path=require('path');
const {WebSocketServer}=require('ws');

const PORT=+process.env.PORT||8080;
const ROOT=path.join(__dirname,'..');
const MAX_GUESTS=12;   // игроки (до 3 гостей) + зрители
const num=(k,d)=>Number.isFinite(+process.env[k])&&process.env[k]!==''&&process.env[k]!=null?+process.env[k]:d;
const LIM={
  rooms:num('MAX_ROOMS',200),            // всего комнат на сервере
  roomsPerIp:num('MAX_ROOMS_PER_IP',4),  // одновременно открытых комнат с одного адреса
  connPerIp:num('MAX_CONN_PER_IP',30),   // WebSocket-соединений с одного адреса
  createPerMin:num('MAX_CREATE_PER_MIN',10), // создание комнат в минуту с одного адреса
  badJoinPerMin:num('MAX_BADJOIN_PER_MIN',15), // неудачных входов по коду в минуту (защита от перебора кодов)
  msgBurst:num('MSG_BURST',300),         // сообщений разом на одно соединение
  msgPerSec:num('MSG_PER_SEC',120),      // и в среднем в секунду
};
const rooms=new Map(); // code -> {host, guests:Map(id->ws), n, ip}

/* ---------- статика ---------- */
const TYPES={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8'};
function serveFile(req,res,file,cache){
  fs.stat(file,(e,stt)=>{
    if(e||!stt.isFile()){res.writeHead(404);res.end('not found');return;}
    const mod=stt.mtime.toUTCString();
    const hd={'Content-Type':TYPES[path.extname(file)]||'application/octet-stream','Cache-Control':cache,'Last-Modified':mod};
    const ims=req.headers['if-modified-since'];
    if(ims&&ims===mod){res.writeHead(304,hd);res.end();return;}
    res.writeHead(200,hd);fs.createReadStream(file).on('error',()=>res.end()).pipe(res);
  });
}
const server=http.createServer((req,res)=>{
  const u=req.url.split('?')[0];
  if(u==='/'||u==='/index.html')serveFile(req,res,path.join(ROOT,'index.html'),'no-cache');
  else if(/^\/js\/[A-Za-z0-9._-]+\.js$/.test(u))serveFile(req,res,path.join(ROOT,'js',path.basename(u)),'no-cache');
  else if(/^\/vendor\/[A-Za-z0-9._-]+\.js$/.test(u))serveFile(req,res,path.join(ROOT,'vendor',path.basename(u)),'public, max-age=86400');
  else if(u==='/health'){res.writeHead(200,{'Content-Type':'text/plain'});res.end('ok rooms='+rooms.size);}
  else{res.writeHead(404);res.end('not found');}
});

/* ---------- лимиты ---------- */
// за nginx реальный адрес берём из X-Real-IP / X-Forwarded-For, но только если запрос пришёл с этой же машины
function clientIp(req){
  const a=req.socket.remoteAddress||'';
  if(a==='127.0.0.1'||a==='::1'||a==='::ffff:127.0.0.1'){
    const x=req.headers['x-real-ip']||String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
    if(x)return x;
  }
  return a;
}
const connsByIp=new Map();
const hits=new Map(); // 'тип|ip' -> [время, ...]
function rate(kind,ip,max,windowMs,count=true){ // true — можно; считает попытку
  const k=kind+'|'+ip,now=Date.now();
  const arr=(hits.get(k)||[]).filter(t=>now-t<windowMs);
  if(arr.length>=max){hits.set(k,arr);return false;}
  if(count)arr.push(now);hits.set(k,arr);return true;
}
setInterval(()=>{const now=Date.now();for(const [k,a] of hits){if(!a.length||now-a[a.length-1]>120000)hits.delete(k);}},60000);
const roomsOfIp=ip=>{let n=0;for(const r of rooms.values())if(r.ip===ip)n++;return n;};

const wss=new WebSocketServer({server,path:'/ws',maxPayload:512*1024});
const send=(ws,o)=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify(o));};
function newCode(){
  const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for(let t=0;t<50;t++){let c='';for(let i=0;i<4;i++)c+=A[Math.floor(Math.random()*A.length)];if(!rooms.has(c))return c;}
  return null;
}

wss.on('connection',(ws,req)=>{
  const ip=clientIp(req);ws.ip=ip;
  const n=(connsByIp.get(ip)||0)+1;
  if(n>LIM.connPerIp){send(ws,{op:'err',msg:'Слишком много соединений с вашего адреса.'});ws.close();return;}
  connsByIp.set(ip,n);ws.counted=true;
  ws.alive=true;ws.tok=LIM.msgBurst;ws.tokT=Date.now();
  ws.on('pong',()=>{ws.alive=true;});
  ws.on('message',raw=>{
    const now=Date.now();
    ws.tok=Math.min(LIM.msgBurst,ws.tok+(now-ws.tokT)/1000*LIM.msgPerSec);ws.tokT=now;
    if(--ws.tok<0){ws.terminate();return;} // слишком частые сообщения — рвём соединение
    let m;try{m=JSON.parse(raw);}catch(e){return;}
    if(!m||typeof m!=='object')return;
    if(m.op==='host'&&!ws.room){
      if(rooms.size>=LIM.rooms){send(ws,{op:'err',msg:'Сервер перегружен: слишком много комнат. Попробуйте позже.'});return;}
      if(roomsOfIp(ip)>=LIM.roomsPerIp){send(ws,{op:'err',msg:'С вашего адреса уже открыто слишком много комнат.'});return;}
      if(!rate('create',ip,LIM.createPerMin,60000)){send(ws,{op:'err',msg:'Слишком часто создаются комнаты. Подождите минуту.'});return;}
      const want=String(m.code||'').toUpperCase();
      const code=(/^[A-HJ-NP-Z2-9]{4}$/.test(want)&&!rooms.has(want))?want:newCode();if(!code){send(ws,{op:'err',msg:'Нет свободных кодов комнат'});return;}
      rooms.set(code,{host:ws,guests:new Map(),n:0,ip});
      ws.room=code;ws.role='host';
      send(ws,{op:'hosted',code});
    }else if(m.op==='join'&&!ws.room){
      if(!rate('badjoin',ip,LIM.badJoinPerMin,60000,false)){send(ws,{op:'err',msg:'Слишком много неудачных попыток. Подождите минуту.'});return;}
      const code=String(m.code||'').toUpperCase().trim();
      const r=rooms.get(code);
      if(!r){rate('badjoin',ip,LIM.badJoinPerMin,60000);send(ws,{op:'err',msg:'Комната '+code+' не найдена.'});return;}
      if(r.guests.size>=MAX_GUESTS){send(ws,{op:'err',msg:'Комната заполнена.'});return;}
      const id='p'+(++r.n)+Math.random().toString(36).slice(2,6);
      r.guests.set(id,ws);ws.room=code;ws.role='guest';ws.pid=id;
      send(ws,{op:'joined',id});
      send(r.host,{op:'peer',id});
    }else if(m.op==='to'&&ws.role==='host'){
      const r=rooms.get(ws.room);const g=r&&r.guests.get(m.id);
      if(g)send(g,{op:'from',m:m.m});
    }else if(m.op==='toHost'&&ws.role==='guest'){
      const r=rooms.get(ws.room);
      if(r)send(r.host,{op:'from',id:ws.pid,m:m.m});
    }
  });
  ws.on('close',()=>{
    if(ws.counted){const c=(connsByIp.get(ip)||1)-1;if(c>0)connsByIp.set(ip,c);else connsByIp.delete(ip);}
    const r=rooms.get(ws.room);if(!r)return;
    if(ws.role==='host'){
      for(const g of r.guests.values()){send(g,{op:'hostgone'});g.close();}
      rooms.delete(ws.room);
    }else if(ws.role==='guest'){
      r.guests.delete(ws.pid);send(r.host,{op:'gone',id:ws.pid});
    }
  });
  ws.on('error',()=>{});
});

// держим соединения живыми за прокси и убираем «мёртвые»
setInterval(()=>{wss.clients.forEach(ws=>{if(!ws.alive){ws.terminate();return;}ws.alive=false;try{ws.ping();}catch(e){}});},25000);

server.listen(PORT,()=>console.log('Чёрный Дракон: http://localhost:'+PORT+'  (WebSocket: /ws)'));
