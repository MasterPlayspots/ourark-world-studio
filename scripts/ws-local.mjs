// Local stand-in for /api/realtime (dev server only): a minimal RFC 6455 WebSocket server without dependencies.
// One Room (edge/room.mjs, the same logic as the MapRoom Durable Object) per map, ticking while players are connected.
import {createHash} from 'node:crypto';
import {Room,TICK_MS} from '../edge/room.mjs';
import {REALTIME_MAPS} from '../edge/realtime.mjs';

const GUID='258EAFA5-E914-47DA-95CA-C5AB0DC85B11',MAX_FRAME=4096,MAX_CONTROL=125;
// The dev server has no login: only loopback names are accepted as Host and Origin, which also defeats DNS rebinding.
const LOOPBACK=/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const rooms=new Map();

function frame(opcode,payload){
  const n=payload.length,head=n<126?Buffer.from([0x80|opcode,n]):Buffer.from([0x80|opcode,126,n>>8,n&255]);
  return Buffer.concat([head,Buffer.from(payload)]);
}

// Attach to an http.Server: server.on('upgrade',(req,socket,head)=>handleUpgrade(req,socket,head)).
export function handleUpgrade(req,socket,head=Buffer.alloc(0)){
  const url=new URL(req.url,'http://local'),map=url.searchParams.get('map')??'';
  const refuse=(status,text)=>{socket.end(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\n\r\n`);};
  if(url.pathname!=='/api/realtime')return refuse(404,'Not Found');
  if(!REALTIME_MAPS.has(map))return refuse(404,'Not Found');
  if(!LOOPBACK.test(req.headers.host??''))return refuse(403,'Forbidden');
  const origin=req.headers.origin;
  if(origin){let host=null;try{host=new URL(origin).host;}catch{}if(host!==req.headers.host)return refuse(403,'Forbidden');}
  const key=req.headers['sec-websocket-key'];if(!key)return refuse(400,'Bad Request');
  let entry=rooms.get(map);
  if(!entry){entry={room:new Room(),sockets:new Map(),timer:null};rooms.set(map,entry);}
  const joined=entry.room.join();if(!joined)return refuse(503,'Service Unavailable');
  socket.write(['HTTP/1.1 101 Switching Protocols','Upgrade: websocket','Connection: Upgrade',
    `Sec-WebSocket-Accept: ${createHash('sha1').update(key+GUID).digest('base64')}`,'',''].join('\r\n'));
  const id=joined.id;entry.sockets.set(id,socket);socket.write(frame(2,joined.welcome));
  if(!entry.timer)entry.timer=setInterval(()=>{const frames=entry.room.tick();for(const [pid,s] of entry.sockets){const f=frames.get(pid);if(f&&!s.destroyed)s.write(frame(2,f));}},TICK_MS);
  const close=()=>{if(!entry.sockets.delete(id))return;entry.room.leave(id);if(!entry.sockets.size){clearInterval(entry.timer);entry.timer=null;rooms.delete(map);}socket.destroy();};
  let buffer=Buffer.from(head);// bytes the client sent right after the handshake
  socket.on('data',chunk=>{
    buffer=Buffer.concat([buffer,chunk]);
    while(buffer.length>=2){
      const opcode=buffer[0]&15,masked=buffer[1]&128;let len=buffer[1]&127,offset=2;
      if(len===126){if(buffer.length<4)return;len=buffer.readUInt16BE(2);offset=4;}
      else if(len===127){close();return;}// 64-bit lengths are far above anything protocol v1 sends
      if(!masked||len>MAX_FRAME){close();return;}// clients must mask (RFC 6455 §5.1)
      if(buffer.length<offset+4+len)return;
      const mask=buffer.subarray(offset,offset+4),data=Buffer.from(buffer.subarray(offset+4,offset+4+len));
      for(let i=0;i<data.length;i++)data[i]^=mask[i&3];
      buffer=buffer.subarray(offset+4+len);
      if(opcode===8){socket.write(frame(8,Buffer.alloc(0)));close();return;}
      if(opcode>=8&&len>MAX_CONTROL){close();return;}// control frames are ≤ 125 bytes (RFC 6455 §5.5)
      if(opcode===9){socket.write(frame(10,data));continue;}
      if(opcode!==2)continue;// text and continuation frames are not part of protocol v1
      const result=entry.room.receive(id,new Uint8Array(data));
      if(result.reply)socket.write(frame(2,result.reply));
      if(result.correction)socket.write(frame(2,result.correction));
    }
  });
  socket.on('close',close);socket.on('error',close);
}
export const localRooms=rooms;
