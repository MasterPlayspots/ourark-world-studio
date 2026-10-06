// CI visual startup check with the separately installed agent-browser CLI.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createDevServer} from '../../scripts/serve.mjs';

const run=promisify(execFile),bin=process.env.AGENT_BROWSER_BIN;
assert.ok(bin&&path.isAbsolute(bin),'Set AGENT_BROWSER_BIN to the separately installed CLI.');
const dir=fileURLToPath(new URL('../../.browser-artifacts/agent-check/',import.meta.url));
await mkdir(dir,{recursive:true});
const session=`ourark-ci-${process.pid}`,server=createDevServer();
const evidence={ok:false,scope:'agent-browser visual startup only'};
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const command=async(...args)=>{
  const {stdout,stderr}=await run(bin,['--session',session,...args],{timeout:60000,maxBuffer:4*1024*1024});
  if(stderr)console.log(stderr.trim());return stdout;
};
try{
  const origin=`http://127.0.0.1:${server.address().port}`;
  console.log(await command('open',origin+'/map-studio/'));
  await command('wait','--load','networkidle');
  await command('wait','#canvas');
  const snapshot=await command('snapshot','-i');await writeFile(path.join(dir,'snapshot.txt'),snapshot);
  assert.match(snapshot,/Importieren/);assert.match(snapshot,/Exportieren/);assert.match(snapshot,/Welt betreten/);
  await command('screenshot',path.join(dir,'map-start.png'));
  const status=JSON.parse(await command('eval',`JSON.stringify({content:document.body.innerText.trim().length,canvas:document.querySelector('#canvas').width,fallback:document.querySelector('#fallback').hidden,overlay:Boolean(document.querySelector('[data-nextjs-dialog],.vite-error-overlay,#webpack-dev-server-client-overlay'))})`,'--json'));
  assert.equal(status.success,true);let value=status.data.result;if(typeof value==='string')value=JSON.parse(value);
  assert.ok(value.content>100&&value.canvas>100&&value.fallback&&!value.overlay,JSON.stringify(value));
  const errors=JSON.parse(await command('errors','--json'));assert.equal(errors.success,true);
  assert.ok(Array.isArray(errors.data.errors),'Expected a structured browser error list');assert.deepEqual(errors.data.errors,[]);
  Object.assign(evidence,{ok:true,status:value,errors:errors.data.errors});
  console.log('PASS agent-browser: page and canvas load, fallback stays hidden, no page errors; screenshot captured for visual review.');
}catch(error){
  evidence.error=error.stack;console.error(error);process.exitCode=1;
}finally{
  try{await command('close');}catch(error){evidence.cleanupError=error.message;evidence.ok=false;process.exitCode=1;}
  await new Promise(resolve=>server.close(resolve));
  await writeFile(path.join(dir,'results.json'),JSON.stringify(evidence,null,2)+'\n');
}
