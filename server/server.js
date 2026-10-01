'use strict';
/* Сервер комнат для «Чёрного Дракона».
   Делает две вещи: раздаёт index.html и пересылает сообщения между хостом и гостями по WebSocket (/ws).
   Игровая логика остаётся у хоста в браузере, сервер её не знает. */
const http=require('http'),fs=require('fs'),path=require('path');
const {WebSocketServer}=require('ws');

const PORT=+process.env.PORT||8080;
const HTML=path.join(__dirname,'..','index.html');
const MAX_GUESTS=6;
const rooms=new Map(); // code -> {host, guests:Map(id->ws), n}

const server=http.createServer((req,res)=>{
  const u=req.url.split('?')[0];
  if(u==='/'||u==='/index.html'){
    fs.readFile(HTML,(e,d)=>{
      if(e){res.writeHead(500);res.end('index.html not found');return;}
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end(d);
    });
  }else if(u.startsWith('/vendor/')&&/^\/vendor\/[A-Za-z0-9._-]+\.js$/.test(u)){
    fs.readFile(path.join(__dirname,'..','vendor',path.basename(u)),(e,d)=>{
      if(e){res.writeHead(404);res.end('not found');return;}
      res.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'public, max-age=86400'});res.end(d);
    });
  }else if(u==='/health'){res.writeHead(200,{'Content-Type':'text/plain'});res.end('ok rooms='+rooms.size);}
  else{res.writeHead(404);res.end('not found');}
});

const wss=new WebSocketServer({server,path:'/ws',maxPayload:512*1024});
const send=(ws,o)=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify(o));};
function newCode(){
  const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for(let t=0;t<50;t++){let c='';for(let i=0;i<4;i++)c+=A[Math.floor(Math.random()*A.length)];if(!rooms.has(c))return c;}
  return null;
}

wss.on('connection',ws=>{
  ws.alive=true;
  ws.on('pong',()=>{ws.alive=true;});
  ws.on('message',raw=>{
    let m;try{m=JSON.parse(raw);}catch(e){return;}
    if(m.op==='host'&&!ws.room){
      const want=String(m.code||'').toUpperCase();
      const code=(/^[A-HJ-NP-Z2-9]{4}$/.test(want)&&!rooms.has(want))?want:newCode();if(!code){send(ws,{op:'err',msg:'Нет свободных кодов комнат'});return;}
      rooms.set(code,{host:ws,guests:new Map(),n:0});
      ws.room=code;ws.role='host';
      send(ws,{op:'hosted',code});
    }else if(m.op==='join'&&!ws.room){
      const code=String(m.code||'').toUpperCase().trim();
      const r=rooms.get(code);
      if(!r){send(ws,{op:'err',msg:'Комната '+code+' не найдена.'});return;}
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
