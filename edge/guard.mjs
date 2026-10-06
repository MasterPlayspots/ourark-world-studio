// Durable Object: one instance per client key (IPv4, or IPv6 /64). Counts *different* wrong credentials
// (HMAC fingerprints, never the password) within WINDOW_SECONDS; more than MAX_FAILURES blocks the client
// for BLOCK_SECONDS. The worker asks before revealing whether credentials were right, so a blocked client
// cannot tell a right guess from a wrong one. Globally consistent, also on *.workers.dev.
// A browser that keeps resending one stale password produces one fingerprint and is never locked out.
export const MAX_FAILURES=10,WINDOW_SECONDS=600,BLOCK_SECONDS=900;
const KEY='state';
const json=body=>new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});

export class LoginGuard{
  constructor(ctx,env,now=Date.now){this.storage=ctx.storage;this.now=now;}
  async load(now){
    const state=await this.storage.get(KEY)??{blockedUntil:0,failures:{}};
    for(const [fingerprint,at] of Object.entries(state.failures))if(at+WINDOW_SECONDS*1000<=now)delete state.failures[fingerprint];
    return state;
  }
  async save(state){
    await this.storage.put(KEY,state);
    await this.storage.setAlarm(Math.max(state.blockedUntil,...Object.values(state.failures).map(at=>at+WINDOW_SECONDS*1000)));
  }
  // POST {ok:boolean, fingerprint?:string} → {blocked:boolean}
  async fetch(request){
    if(request.method!=='POST')return new Response(null,{status:405});
    let attempt;try{attempt=await request.json();}catch{return new Response(null,{status:400});}
    if(typeof attempt?.ok!=='boolean'||(!attempt.ok&&typeof attempt.fingerprint!=='string'))return new Response(null,{status:400});
    const now=this.now(),state=await this.load(now);
    if(state.blockedUntil>now)return json({blocked:true});
    if(attempt.ok||attempt.fingerprint in state.failures)return json({blocked:false});
    state.failures[attempt.fingerprint]=now;
    if(Object.keys(state.failures).length>MAX_FAILURES){state.blockedUntil=now+BLOCK_SECONDS*1000;state.failures={};}
    await this.save(state);
    return json({blocked:state.blockedUntil>now});
  }
  async alarm(){
    const now=this.now(),state=await this.load(now);
    if(state.blockedUntil<=now&&!Object.keys(state.failures).length)await this.storage.deleteAll();
    else await this.save(state);
  }
}
