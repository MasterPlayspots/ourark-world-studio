import {readFile,readdir,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
async function walk(dir){const results=[];for(const entry of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())results.push(...await walk(p));else results.push(p);}return results;}
let checked=0;
for(const dir of ['dist','edge','scripts','tests'])for(const file of await walk(path.join(root,dir))){
  if(/\.(?:mjs|js)$/.test(file)){execFileSync(process.execPath,['--check',file],{stdio:'pipe'});checked++;}
  if(file.endsWith('.json'))JSON.parse(await readFile(file,'utf8'));
  if(file.endsWith('.html')){
    const text=await readFile(file,'utf8'),ids=[...text.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    if(ids.length!==new Set(ids).size)throw new Error('Duplicate IDs in '+file);
    for(const [,url] of text.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)){
      const target=path.join(root,'dist',url);await access(url.endsWith('/')?path.join(target,'index.html'):target);
    }
  }
}
for(const file of await walk(path.join(root,'dist'))){
  if(!file.endsWith('.js'))continue;
  const source=await readFile(file,'utf8');
  for(const [,reference] of source.matchAll(/^\s*(?:import[\s\S]*?from|export\s+[^;]*?from)\s*['"](\.[^'"]+)['"]/gm))await access(path.resolve(path.dirname(file),reference));
}
const rootHtml=await readFile(path.join(root,'dist/index.html'),'utf8'),studioHtml=await readFile(path.join(root,'dist/studio/index.html'),'utf8');
if(rootHtml!==studioHtml)throw new Error('2D editor routes are out of sync.');
for(const schema of await walk(path.join(root,'schemas')))if(schema.endsWith('.json'))JSON.parse(await readFile(schema,'utf8'));
console.log(`PASS: ${checked} JavaScript modules, HTML IDs, static references, local imports and editor route parity.`);
