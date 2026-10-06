// /api/realtime?map=<name> (behind the login): upgrades to a WebSocket served by that map's MapRoom Durable Object.
// Browsers send cached credentials with cross-site WebSocket handshakes too, so the Origin must be this site.
// /api/realtime/stats?map= returns the room's counters (players, tick, bytes, rejections).
// Only known maps get a room: every distinct name would otherwise create (and bill) its own Durable Object.
export const REALTIME_MAPS=new Set(['kronach','rosenberg']);

export async function realtime(request,env,reply,pathname){
  const url=new URL(request.url),map=url.searchParams.get('map')??'';
  if(!env.MAP_ROOM)return reply(503,'Echtzeit ist hier nicht eingerichtet.');
  if(!REALTIME_MAPS.has(map))return reply(404,'Unbekannte Karte.');
  const stub=env.MAP_ROOM.get(env.MAP_ROOM.idFromName(map));
  if(pathname==='/api/realtime/stats'){
    if(request.method!=='GET')return reply(405,'',{Allow:'GET'});
    return stub.fetch(new Request(`https://map-room/stats`));
  }
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return reply(426,'WebSocket erwartet.',{Upgrade:'websocket'});
  const origin=request.headers.get('Origin');
  if(origin!==null){let host=null;try{host=new URL(origin).host;}catch{}if(host!==url.host)return reply(403,'Fremde Herkunft.');}
  return stub.fetch(new Request(`https://map-room/connect?map=${map}`,{headers:{Upgrade:'websocket','CF-Connecting-IP':request.headers.get('CF-Connecting-IP')??''}}));
}
