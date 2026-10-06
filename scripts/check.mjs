import {readFile,readdir,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
async function walk(dir){const results=[];for(const entry of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())results.push(...await walk(p));else results.push(p);}return results;}

// Lexical scanning, never evaluation. Ignore comments/text/regexes; scan template expressions.
// Computed paths are intentionally left to runtime checks. node --check validates syntax first.
function tokens(source){
  const out=[],stack=[];let i=0;
  const push=(type,value)=>out.push({type,value});
  const regexKeywords=new Set(['return','throw','case','delete','void','typeof','instanceof','in','of','yield','await','else','do']);
  const regexAllowed=()=>{const p=out.at(-1);return !p||p.type==='id'&&regexKeywords.has(p.value)||p.type==='punct'&&![')',']','}','++','--'].includes(p.value);};
  function quoted(quote){
    let value='';i++;
    while(i<source.length){
      const c=source[i++];if(c===quote)return value;
      if(c!=='\\'){value+=c;continue;}
      const escaped=source[i++];
      if(escaped==='\n')continue;
      if(escaped==='\r'){if(source[i]==='\n')i++;continue;}
      if(escaped==='x'){value+=String.fromCodePoint(parseInt(source.slice(i,i+2),16));i+=2;continue;}
      if(escaped==='u'){
        if(source[i]==='{'){const end=source.indexOf('}',++i);value+=String.fromCodePoint(parseInt(source.slice(i,end),16));i=end+1;}
        else{value+=String.fromCodePoint(parseInt(source.slice(i,i+4),16));i+=4;}
        continue;
      }
      value+=({n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v','0':'\0'})[escaped]??escaped;
    }
    return value;
  }
  function template(first=false,start=i-1){
    let value='';
    while(i<source.length){
      const c=source[i++];
      if(c==='\\'){value+=c+(source[i++]??'');continue;}
      if(c==='`'){
        // A template with no substitutions is also a statically known module URL.
        if(first){const end=i;i=start;const cooked=quoted('`');i=end;out.pop();push('string',cooked);}
        else{push('templateText',value);push('punct','`end');}
        return;
      }
      if(c==='$'&&source[i]==='{'){i++;push('templateText',value);push('punct','${');stack.push('template');return;}
      value+=c;
    }
  }
  while(i<source.length){
    const c=source[i];
    if(/\s/.test(c)){i++;continue;}
    if(source.startsWith('//',i)){const end=source.indexOf('\n',i+2);i=end<0?source.length:end;continue;}
    if(source.startsWith('/*',i)){const end=source.indexOf('*/',i+2);i=end<0?source.length:end+2;continue;}
    if(c==='"'||c==="'"){push('string',quoted(c));continue;}
    if(c==='`'){push('punct','`start');i++;template(true);continue;}
    if(c==='/'&&regexAllowed()){
      i++;let characterClass=false;
      while(i<source.length){const r=source[i++];if(r==='\\'){i++;continue;}if(r==='[')characterClass=true;else if(r===']')characterClass=false;else if(r==='/'&&!characterClass)break;}
      while(/[a-z]/i.test(source[i]??''))i++;
      push('regex','');continue;
    }
    if(/[A-Za-z_$]/.test(c)){let end=i+1;while(/[\w$]/.test(source[end]??''))end++;push('id',source.slice(i,end));i=end;continue;}
    if(/\d/.test(c)){let end=i+1;while(/[\w.]/.test(source[end]??''))end++;push('number',source.slice(i,end));i=end;continue;}
    if(c==='{')stack.push('brace');
    if(c==='}'&&stack.pop()==='template'){push('punct','}');i++;template();continue;}
    const punct=['?.','++','--','=>'].find(p=>source.startsWith(p,i))??c;
    push('punct',punct);i+=punct.length;
  }
  return out;
}

export function relativeModuleReferences(source){
  const scanned=tokens(source),references=[];
  const add=t=>{if(t?.type==='string'&&(t.value.startsWith('./')||t.value.startsWith('../')))references.push(t.value);};
  for(let i=0;i<scanned.length;i++){
    const t=scanned[i],next=scanned[i+1];
    if(t.type!=='id'||!['import','export'].includes(t.value)||['.','?.'].includes(scanned[i-1]?.value))continue;
    if(t.value==='import'&&next?.value==='('){
      // import('./module.js', options) is resolvable; import('./'+name) is not.
      if([')',','].includes(scanned[i+3]?.value))add(scanned[i+2]);
      continue;
    }
    if(t.value==='import'&&next?.type==='string'){add(next);continue;}
    if(t.value==='import'&&next?.value==='.')continue;
    if(t.value==='export'&&!['*','{'].includes(next?.value))continue;
    let depth=0;
    for(let j=i+1;j<scanned.length;j++){
      const token=scanned[j];
      if(token.value==='{')depth++;
      if(token.value==='}')depth--;
      if(depth===0&&token.type==='id'&&token.value==='from'){add(scanned[j+1]);break;}
      if(depth===0&&token.value===';')break;
      if(j>i+1&&depth===0&&token.type==='id'&&['import','export','const','let','function','class'].includes(token.value))break;
    }
  }
  return [...new Set(references)];
}

export async function checkProject(root){
  let checked=0;
  for(const dir of ['dist','edge','scripts','tests'])for(const file of await walk(path.join(root,dir))){
    if(/\.(?:mjs|js)$/.test(file)){
      execFileSync(process.execPath,['--check',file],{stdio:'pipe'});checked++;
      // URL resolution handles browser module query/hash suffixes and escaped filenames.
      for(const reference of relativeModuleReferences(await readFile(file,'utf8'))){
        const target=new URL(reference,pathToFileURL(file));
        try{await access(fileURLToPath(target));}
        catch{throw new Error(`Missing local module ${JSON.stringify(reference)} imported by ${path.relative(root,file)}`);}
      }
    }
    if(file.endsWith('.json'))JSON.parse(await readFile(file,'utf8'));
    if(file.endsWith('.html')){
      const text=await readFile(file,'utf8'),ids=[...text.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
      if(ids.length!==new Set(ids).size)throw new Error('Duplicate IDs in '+file);
      for(const [,url] of text.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)){
        const target=path.join(root,'dist',url);await access(url.endsWith('/')?path.join(target,'index.html'):target);
      }
    }
  }
  const rootHtml=await readFile(path.join(root,'dist/index.html'),'utf8'),studioHtml=await readFile(path.join(root,'dist/studio/index.html'),'utf8');
  if(rootHtml!==studioHtml)throw new Error('2D editor routes are out of sync.');
  for(const schema of await walk(path.join(root,'schemas')))if(schema.endsWith('.json'))JSON.parse(await readFile(schema,'utf8'));
  return checked;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const checked=await checkProject(fileURLToPath(new URL('../',import.meta.url)));
  console.log(`PASS: ${checked} JavaScript modules, HTML IDs, static references, literal local imports and editor route parity.`);
}
