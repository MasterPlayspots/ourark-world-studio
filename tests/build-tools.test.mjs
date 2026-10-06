import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {relativeModuleReferences,checkProject} from '../scripts/check.mjs';
import {browserArgs} from './browser/harness.mjs';

test('module references include static, side-effect, re-export and literal dynamic imports',()=>{
  const source=String.raw`
    import {thing as item} from './static.mjs';
    import './side-effect.js';
    export {item} from '../shared.js';
    export * as namespace from './all.mjs';
    await import /* a comment */ ('./renderer.js');
    await import('./settings.json', {with:{type:'json'}});
    await import('.\u002fescaped.js?version=1#entry');
  `;
  assert.deepEqual(relativeModuleReferences(source),['./static.mjs','./side-effect.js','../shared.js','./all.mjs','./renderer.js','./settings.json','./escaped.js?version=1#entry']);
  assert.deepEqual(relativeModuleReferences('await import(`./literal-template.mjs`);'),['./literal-template.mjs']);
});

test('comments, regexes, quoted examples and computed imports are not literal dependencies',()=>{
  const source=[
    '// import "./comment.js";',
    '/* export * from "./commented.mjs"; */',
    'const example = "import(\'./example.js\')";',
    String.raw`const pattern = /import\(".\/regex.js"\)/;`,
    'const template = `import("./template.js") ${import("./real.js")}`;',
    'object.import("./method.js");',
    'object?.import("./optional-method.js");',
    'import("./" + name);',
    'import(variable);',
    'import.meta.url;',
  ].join('\n');
  assert.deepEqual(relativeModuleReferences(source),['./real.js']);
});

test('checker rejects missing imports in JS and MJS, and accepts resolvable URL suffixes',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'ourark-check-'));
  try{
    for(const dir of ['dist/studio','edge','scripts','tests','schemas'])await mkdir(path.join(root,dir),{recursive:true});
    await writeFile(path.join(root,'package.json'),' {"type":"module"}');
    for(const file of ['dist/index.html','dist/studio/index.html'])await writeFile(path.join(root,file),'<html></html>');
    for(const [filename,source] of [
      ['dist/editor.js',"await import('./missing.js');"],
      ['dist/editor.js','await import(`./missing.js`);'],
      ['dist/module.mjs',"import './missing.mjs';"],
      ['edge/entry.mjs',"export {value} from './missing.mjs';"],
    ]){
      const file=path.join(root,filename);await writeFile(file,source);
      await assert.rejects(checkProject(root),error=>error.message.includes('Missing local module')&&error.message.includes(filename));
      await rm(file);
    }
    await writeFile(path.join(root,'dist/present.js'),'export const value=1;');
    await writeFile(path.join(root,'dist/editor.mjs'),"await import('./present.js?v=1#entry');");
    assert.equal(await checkProject(root),2);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('extended browser entry fails when no Playwright dependency can be resolved',async()=>{
  const temp=await mkdtemp(path.join(tmpdir(),'ourark-browser-deps-'));
  try{
    const shim=path.join(temp,'no-playwright.cjs');
    await writeFile(shim,`const Module=require('node:module');const original=Module._load;
      Module._load=function(id,...args){if(id==='playwright'||id==='playwright-core')throw new Error('Dependency unavailable in test');return original.call(this,id,...args);};`);
    const env={...process.env};delete env.PLAYWRIGHT_CORE;
    const result=spawnSync(process.execPath,['--require',shim,fileURLToPath(new URL('./browser/baseline.browser.mjs',import.meta.url))],{env,encoding:'utf8'});
    assert.equal(result.status,1);assert.match(result.stderr,/Playwright and Chromium are required/);
    assert.doesNotMatch(result.stdout,/PASS|SKIP/);
  }finally{await rm(temp,{recursive:true,force:true});}
});

test('extended browser graphics arguments are selected for the actual OS',()=>{
  assert.ok(browserArgs('linux').includes('--use-angle=swiftshader'));
  assert.ok(!browserArgs('linux').includes('--use-angle=metal'));
  assert.ok(browserArgs('darwin').includes('--use-angle=metal'));
  assert.ok(!browserArgs('win32').some(value=>value.startsWith('--use-angle=')));
});
