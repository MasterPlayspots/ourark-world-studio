import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDevServer} from '../scripts/serve.mjs';

test('public server serves the three self-contained editors, vector placeholders and integration gates',async()=>{
  const server=createDevServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const base=`http://127.0.0.1:${server.address().port}`;
    for(const route of ['/','/studio/','/map-studio/','/world-studio/','/map-studio/editor.js','/map-studio/renderer.js','/runtime/walk-host.js','/worlds/vendor/three.module.js','/assets/starter-motion.svg',...['alpine','neon','dune','ocean','orbital'].map(w=>`/worlds/assets/${w}.svg`)]){
      const response=await fetch(base+route);assert.equal(response.status,200,route);assert.ok((await response.arrayBuffer()).byteLength>0,route);
    }
    for(const name of ['kart','globe']){
      const gate=await (await fetch(base+`/${name}/`)).text();assert.doesNotMatch(gate,/<script\b/i,'gate must not start external integrations');
      assert.match(gate,/excluded/i);assert.equal((await fetch(base+`/${name}/integration.html`)).status,200);
    }
    assert.equal((await fetch(base+'/package.json')).status,404);
    assert.equal((await fetch(base+'/%2e%2e/package.json')).status,404);
    assert.equal((await fetch(base+'/map-studio/',{method:'POST'})).status,405);
    const head=await fetch(base+'/map-studio/',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
    const enhance=await fetch(base+'/api/enhance',{method:'POST',body:'{}'});assert.equal(enhance.status,503);
    assert.deepEqual((await (await fetch(base+'/api/scenes')).json()).scenes,[],'no prepared scans are bundled');
  }finally{await new Promise(resolve=>server.close(resolve));}
});
test('public source manifest records provenance and excludes private payloads',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../PUBLIC_SOURCE.json',import.meta.url),'utf8'));
  assert.equal(manifest.format,'motionspec.public-source.v1');assert.equal(manifest.historyIncluded,false);assert.match(manifest.sourceCommit,/^[0-9a-f]{40}$/);
  const paths=new Set();
  for(const file of manifest.files){
    assert.ok(!paths.has(file.path),file.path);paths.add(file.path);
    assert.match(file.sha256,/^[0-9a-f]{64}$/,file.path);
  }
  for(const forbidden of ['repository-history.bundle','RESTORE_GIT.md','wrangler.jsonc','.github/workflows/deploy.yml'])assert.ok(!paths.has(forbidden),forbidden);
  assert.ok(![...paths].some(p=>/^tests\/fixtures\/(scans|scan-reference)\//.test(p)));
  assert.ok(![...paths].some(p=>/^dist\/(kart\/assets|globe\/models)\//.test(p)));
  assert.ok(paths.has('dist/runtime/assets/codec.js'),'runtime code in assets/ stays part of the core');
  assert.equal(JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).license,'MIT');
});
test('future world package contract remains explicitly a draft',async()=>{
  const schema=JSON.parse(await readFile(new URL('../schemas/world-package-v2.schema.json',import.meta.url),'utf8'));
  assert.match(schema.$comment,/DRAFT/);
  const source=await readFile(new URL('../dist/world-studio/model.js',import.meta.url),'utf8');
  assert.match(source,/motionspec\.world\.v1/);assert.doesNotMatch(source,/world-package\.v2/);
});
