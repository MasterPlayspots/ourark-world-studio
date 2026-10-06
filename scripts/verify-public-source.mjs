// Release snapshot integrity check. Run on the exported snapshot before publication.
// PUBLIC_SOURCE.json describes the initial source snapshot, so normal feature development does not
// run this command as part of npm test or rewrite its provenance to disguise subsequent edits.
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('PUBLIC_SOURCE.json',root),'utf8'));
const expected=new Set(['PUBLIC_SOURCE.json']);
for(const file of manifest.files){
  assert.equal(path.posix.normalize(file.path),file.path,'manifest path must be normalized');
  assert.ok(!file.path.startsWith('/')&&!file.path.startsWith('../')&&!file.path.includes('\\'),'manifest path must stay inside the release');
  assert.ok(!expected.has(file.path),'duplicate manifest path: '+file.path);expected.add(file.path);
  const bytes=await readFile(new URL(file.path,root));
  assert.equal(bytes.length,file.bytes,file.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,file.path);
}
// These are workspace products, not files exported by this manifest. The release packaging step must
// also omit them. The three generated architecture files describe the new public Git checkout.
const ignoredDirectories=new Set(['.git','node_modules','.browser-artifacts','releases']);
const generated=new Set(['docs/architecture/FILES.md','docs/architecture/SYMBOLS.md','docs/architecture/index.json']);
async function audit(dir,prefix=''){
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const relative=prefix+entry.name;
    if(!prefix&&ignoredDirectories.has(entry.name))continue;
    assert.ok(!entry.isSymbolicLink(),'symlinks are not part of the exported snapshot: '+relative);
    if(entry.isDirectory())await audit(path.join(dir,entry.name),relative+'/');
    else assert.ok(expected.has(relative)||generated.has(relative),'unexpected file in export: '+relative);
  }
}
await audit(fileURLToPath(root));
console.log(`PASS: ${manifest.files.length} exported files match PUBLIC_SOURCE.json (source ${manifest.sourceCommit}).`);
