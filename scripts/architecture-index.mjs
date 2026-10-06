// Architecture index — generates docs/architecture/FILES.md, SYMBOLS.md and index.json from the tracked sources.
// No dependencies: a small tokenizer finds module-level declarations, class members, instance fields,
// imports/exports, DOM-ID references, event bindings and CSS custom properties.
// Usage: node scripts/architecture-index.mjs          (write)
//        node scripts/architecture-index.mjs --check  (exit 1 if the committed output is stale)
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.join(root,'docs/architecture');
const VENDOR=/\/vendor\//;
const GENERATED=/^docs\/architecture\/(FILES|SYMBOLS)\.md$|^docs\/architecture\/index\.json$/;

const role=file=>{
  if(GENERATED.test(file))return 'Generiert (dieses Verzeichnis)';
  if(file.startsWith('dist/globe/vendor/cesium/'))return 'Drittanbieter (CesiumJS 1.138.0)';
  if(file.startsWith('dist/worlds/vendor/'))return 'Drittanbieter (Three.js 0.180.0)';
  if(VENDOR.test(file))return 'Drittanbieter';
  if(file.startsWith('dist/kart/'))return 'Kart und Gelände';
  if(file.startsWith('dist/globe/'))return 'Globus';
  if(file.startsWith('dist/worldport/'))return 'Datenimport';
  if(file.startsWith('dist/map-studio/'))return 'Map Studio';
  if(file.startsWith('dist/runtime/'))return 'Runtime (Begehmodus)';
  if(file.startsWith('dist/world-studio/'))return 'World Studio';
  if(file.startsWith('dist/worlds/'))return 'Welt-Vorlagen (geteilt)';
  if(file.startsWith('dist/'))return 'Layereditor / geteilte Styles';
  if(file.startsWith('tests/browser/'))return 'Browsertest';
  if(file.startsWith('tests/'))return 'Node-Test';
  if(file.startsWith('scripts/'))return 'Werkzeug';
  if(file.startsWith('docs/'))return 'Dokumentation';
  if(['contracts/world-package-v2.d.ts','contracts/runtime-extensions.d.ts','schemas/world-package-v2.schema.json'].includes(file))return 'Entwurfs-Vertrag (nicht implementiert)';
  if(file.startsWith('contracts/')||file.startsWith('schemas/'))return 'Implementierter Formatvertrag';
  if(file.startsWith('sim/'))return 'Rust-Simulationskern';
  if(file.startsWith('examples/'))return 'Einstiegsbeispiel';
  if(file.startsWith('edge/'))return 'Edge-Worker (Auslieferung)';
  if(file==='wrangler.jsonc'||file.startsWith('.github/'))return 'Deployment-Konfiguration';
  return 'Projekt';
};

// ---------- tokenizer ----------
const KEYWORDS_BEFORE_REGEX=new Set(['return','typeof','instanceof','in','of','new','delete','void','throw','case','do','else','yield','await']);
const PUNCT=['>>>=','...','===','!==','**=','<<=','>>=','>>>','&&=','||=','??=','=>','==','!=','<=','>=','&&','||','??','?.','++','--','+=','-=','*=','/=','%=','&=','|=','^=','**','<<','>>'];
function tokenize(src){
  const tokens=[];let i=0,line=1;const stack=[];// 'brace' | 'template'
  const push=(type,value,start)=>tokens.push({type,value,line:start});
  const prevSignificant=()=>tokens[tokens.length-1];
  const regexAllowed=()=>{const p=prevSignificant();if(!p)return true;if(['num','str','tplstr','regex'].includes(p.type)||(p.type==='tpl'&&p.value==='`'))return false;if(p.type==='id')return KEYWORDS_BEFORE_REGEX.has(p.value);return ![')',']','}'].includes(p.value);};
  function scanTemplate(){// i points after ` or after } closing ${…}
    const start=line,from=i;
    while(i<src.length){
      const c=src[i];
      if(c==='\\'){i+=2;continue;}
      if(c==='\n')line++;
      if(c==='`'){push('tplstr',src.slice(from,i),start);i++;push('tpl','`',start);return;}
      if(c==='$'&&src[i+1]==='{'){push('tplstr',src.slice(from,i),start);i+=2;stack.push('template');push('tpl','${',start);return;}
      i++;
    }
  }
  while(i<src.length){
    const c=src[i];
    if(c==='\n'){line++;i++;continue;}
    if(/\s/.test(c)){i++;continue;}
    if(c==='/'&&src[i+1]==='/'){while(i<src.length&&src[i]!=='\n')i++;continue;}
    if(c==='/'&&src[i+1]==='*'){const end=src.indexOf('*/',i+2);const chunk=src.slice(i,end<0?src.length:end+2);line+=chunk.split('\n').length-1;i+=chunk.length;continue;}
    if(c==='"'||c==="'"){const start=line;let j=i+1;while(j<src.length&&src[j]!==c){if(src[j]==='\\')j++;j++;}push('str',src.slice(i+1,j),start);i=j+1;continue;}
    if(c==='`'){push('tpl','`open',line);i++;scanTemplate();continue;}
    if(c==='/'&&regexAllowed()){const start=line;let j=i+1,cls=false;while(j<src.length){const d=src[j];if(d==='\\'){j+=2;continue;}if(d==='['){cls=true;}else if(d===']'){cls=false;}else if(d==='/'&&!cls)break;else if(d==='\n')break;j++;}j++;while(/[a-z]/i.test(src[j]??''))j++;push('regex',src.slice(i,j),start);i=j;continue;}
    if(/[A-Za-z_$#]/.test(c)){let j=i+1;while(/[\w$]/.test(src[j]??''))j++;push('id',src.slice(i,j),line);i=j;continue;}
    if(/\d/.test(c)||(c==='.'&&/\d/.test(src[i+1]))){let j=i+1;while(/[\w.]/.test(src[j]??''))j++;push('num',src.slice(i,j),line);i=j;continue;}
    if(c==='{'){stack.push('brace');push('p','{',line);i++;continue;}
    if(c==='}'){const top=stack.pop();if(top==='template'){push('tpl','}',line);i++;scanTemplate();continue;}push('p','}',line);i++;continue;}
    const p=PUNCT.find(p=>src.startsWith(p,i))??c;push('p',p,line);i+=p.length;
  }
  return tokens;
}

// ---------- JS analysis ----------
const OPEN={'(':')','[':']','{':'}'};
function matchClose(tokens,i){// tokens[i] is an opener; returns index of matching closer
  let depth=0;
  for(let j=i;j<tokens.length;j++){const t=tokens[j];if(t.type!=='p'&&!(t.type==='tpl'&&(t.value==='${'||t.value==='}')))continue;
    if(t.value in OPEN||t.value==='${')depth++;else if([')',']','}'].includes(t.value))depth--;if(depth===0)return j;}
  return tokens.length-1;
}
function matchOpen(tokens,i){// tokens[i] is a closer; returns index of matching opener
  let depth=0;
  for(let j=i;j>=0;j--){const t=tokens[j];const v=t.type==='tpl'?(t.value==='${'?'(':t.value==='}'?')':t.value==='`'?'`c':t.value==='`open'?'`o':null):t.type==='p'?t.value:null;if(!v)continue;
    if([')',']','}','`c'].includes(v))depth++;else if(['(','[','{','`o'].includes(v))depth--;if(depth===0)return j;}
  return 0;
}
function memberStart(tokens,end){// start index of the member/call expression ending at tokens[end]
  let j=end;
  while(j>=0){const t=tokens[j];
    if(t.type==='p'&&[')',']'].includes(t.value)||t.type==='tpl'&&t.value==='`'){j=matchOpen(tokens,j);const before=tokens[j-1];if(before&&(before.type==='id'||[')',']','?.'].includes(before.value))){j--;continue;}return j;}
    if(t.type==='id'||t.type==='str'){const before=tokens[j-1];if(before&&(before.value==='.'||before.value==='?.')){j-=2;continue;}return j;}
    return j+1;}
  return 0;
}
function source(tokens,a,b,max=90){
  let s='';for(let k=a;k<=b&&k<tokens.length;k++){const t=tokens[k];const v=t.type==='str'?JSON.stringify(t.value):t.type==='tpl'?(t.value==='`open'?'`':t.value):t.value;
    if(s&&/[\w$'"]$/.test(s)&&/^[\w$'"]/.test(v))s+=' ';s+=v;if(s.length>max)return s.slice(0,max-1)+'…';}
  return s;
}
function patternNames(tokens,a,b){// identifiers bound by a destructuring pattern
  const names=[];
  for(let k=a+1;k<b;k++){const t=tokens[k];if(t.type!=='id')continue;const next=tokens[k+1];
    if(next?.value===':')continue;// property key
    if(next?.value==='='){names.push(t.value);k=skipExpr(tokens,k+2,b)-1;continue;}// default value
    names.push(t.value);}
  return names;
}
function skipExpr(tokens,k,limit=tokens.length){// advance to next ',' or ';' at this level (or a closer)
  while(k<limit){const t=tokens[k];
    if(t.type==='p'&&t.value in OPEN){k=matchClose(tokens,k)+1;continue;}
    if(t.type==='tpl'&&t.value==='${'){k=matchClose(tokens,k)+1;continue;}
    if(t.type==='p'&&(t.value===','||t.value===';'||[')',']','}'].includes(t.value)))return k;
    k++;}
  return k;
}
function analyzeJs(file,src){
  const tokens=tokenize(src);
  const result={imports:[],exports:[],declarations:[],classes:[],domIds:[],events:[],storage:[]};
  // Block structure: find module-level scope (plus an IIFE wrapper as in dist/app.js).
  const scopeOf=new Array(tokens.length).fill(null);// innermost block per token
  const blocks=[];const stack=[];
  for(let k=0;k<tokens.length;k++){
    const t=tokens[k];
    scopeOf[k]=stack.at(-1)??null;
    if(t.type==='p'&&t.value==='{'){
      let kind='block',name=null;
      // class Name [extends X] {
      for(let b=k-1;b>=0&&b>=k-6;b--){if(tokens[b].type==='id'&&tokens[b].value==='class'){kind='class';name=tokens[b+1]?.type==='id'&&tokens[b+1].value!=='extends'?tokens[b+1].value:'(anonym)';break;}if(tokens[b].value===';'||tokens[b].value==='}'||tokens[b].value==='{')break;}
      // (()=>{  at file start → module wrapper
      if(kind==='block'&&stack.length===0&&tokens[k-1]?.value==='=>'&&tokens[k-2]?.value===')'&&tokens[k-3]?.value==='('&&tokens[k-4]?.value==='('&&k-4<=2)kind='module';
      const block={kind,name,open:k,parent:stack.at(-1)??null};blocks.push(block);stack.push(block);
    }else if(t.type==='p'&&t.value==='}'){stack.pop();}
    else if(t.type==='tpl'&&t.value==='${'){stack.push({kind:'expr',parent:stack.at(-1)??null});}
    else if(t.type==='tpl'&&t.value==='}'){stack.pop();}
  }
  const isModuleScope=s=>s===null||s.kind==='module';
  const enclosingClass=s=>{while(s){if(s.kind==='class')return s;s=s.parent;}return null;};
  const ID_CALLEES=new Set(['$','getElementById','querySelector']);
  // Functions that turn their first parameter into an element lookup, e.g. setInputValue(id,…){$('#'+id)}
  const idHelpers=new Set();
  for(let k=0;k<tokens.length;k++){
    if(tokens[k].value!=='function'||tokens[k+1]?.type!=='id'||tokens[k+2]?.value!=='(')continue;
    const param=tokens[k+3]?.value,close=matchClose(tokens,k+2),bodyEnd=tokens[close+1]?.value==='{'?matchClose(tokens,close+1):close;
    for(let j=close;j<bodyEnd;j++)if(tokens[j].type==='str'&&tokens[j].value==='#'&&tokens[j+1]?.value==='+'&&tokens[j+2]?.value===param&&ID_CALLEES.has(tokens[j-2]?.value)){idHelpers.add(tokens[k+1].value);break;}
  }
  const addPattern=(glob,line)=>{if(!/^[\w*-]+$/.test(glob))return;if(glob.replace(/[*-]/g,'').length>=3)result.domIds.push({id:glob,line,dynamic:true});else result.domIds.push({id:glob,line,dynamic:true,tooBroad:true});};
  const classes=new Map();
  const classFor=name=>{if(!classes.has(name))classes.set(name,{name,line:0,extends:null,exported:false,methods:[],fields:new Map()});return classes.get(name);};

  for(let k=0;k<tokens.length;k++){
    const t=tokens[k],scope=scopeOf[k],prev=tokens[k-1],next=tokens[k+1];
    // ----- imports / exports -----
    if(t.type==='id'&&t.value==='import'&&isModuleScope(scope)&&next?.value!=='('&&next?.value!=='.'){
      let j=k+1;const names=[];
      while(j<tokens.length&&!(tokens[j].type==='id'&&tokens[j].value==='from')&&tokens[j].type!=='str'){if(tokens[j].type==='id'&&tokens[j].value!=='as'&&tokens[j+1]?.value!=='as')names.push(tokens[j].value);j++;}
      const from=tokens[j]?.type==='str'?tokens[j].value:tokens[j+1]?.value;
      result.imports.push({line:t.line,from,names});continue;
    }
    if(t.type==='id'&&t.value==='import'&&next?.value==='('){const s=tokens[k+2];if(s?.type==='str')result.imports.push({line:t.line,from:s.value,names:['(dynamisch)'],dynamic:true});}
    const exported=prev?.type==='id'&&prev.value==='export'||(prev?.value==='async'&&tokens[k-2]?.value==='export');
    if(t.type==='id'&&t.value==='export'&&next?.value==='{'){const end=matchClose(tokens,k+1);for(let j=k+2;j<end;j++)if(tokens[j].type==='id'&&tokens[j].value!=='as'&&tokens[j+1]?.value!=='as')result.exports.push(tokens[j].value);}
    // ----- module-level declarations -----
    if(isModuleScope(scope)&&t.type==='id'){
      if(t.value==='function'||(t.value==='async'&&next?.value==='function')){
        const j=t.value==='async'?k+2:k+1;const star=tokens[j]?.value==='*';const nameTok=tokens[star?j+1:j];
        if(nameTok?.type==='id'){const params=tokens[(star?j+2:j+1)];const close=params?.value==='('?matchClose(tokens,star?j+2:j+1):null;
          result.declarations.push({kind:t.value==='async'?'async function':'function',name:nameTok.value,line:t.line,exported:exported||(t.value==='async'?prev?.value==='export':false),signature:close?source(tokens,star?j+2:j+1,close,110):''});
          if(exported)result.exports.push(nameTok.value);}
        if(t.value==='async')k++;
        continue;
      }
      if(t.value==='class'&&next?.type==='id'){
        const c=classFor(next.value);c.line=t.line;c.exported=exported;if(tokens[k+2]?.value==='extends')c.extends=tokens[k+3]?.value;
        result.declarations.push({kind:'class',name:next.value,line:t.line,exported});if(exported)result.exports.push(next.value);continue;
      }
      if(['const','let','var'].includes(t.value)&&(prev?.value!=='.')){
        const kind=t.value;let j=k+1;
        // Only statements: skip `for(let …` heads (they are not module scope bindings worth listing twice)
        if(tokens[k-1]?.value==='(')continue;
        while(j<tokens.length){
          const d=tokens[j];let names=[],end;
          if(d.value==='{'||d.value==='['){end=matchClose(tokens,j);names=patternNames(tokens,j,end);j=end+1;}
          else if(d.type==='id'){names=[d.value];j++;}
          else break;
          let init='';
          if(tokens[j]?.value==='='){const e=skipExpr(tokens,j+1);init=source(tokens,j+1,e-1);j=e;}
          for(const name of names){result.declarations.push({kind,name,line:d.line,exported,init});if(exported)result.exports.push(name);}
          if(tokens[j]?.value===','){j++;continue;}
          break;
        }
        continue;// keep scanning the initializer for DOM IDs, events and storage
      }
    }
    // ----- class members -----
    const cls=enclosingClass(scope);
    if(scope?.kind==='class'&&(t.type==='id')&&!['static','async','get','set'].includes(t.value)){
      const before=tokens[k-1];
      const atMemberStart=before&&(before.value==='{'&&scopeOf[k-1]!==scope||before.value==='}'||before.value===';'||['static','async','get','set','*'].includes(before.value));
      if(atMemberStart){
        const c=classFor(scope.name);const modifiers=[];for(let b=k-1;b>=0&&['static','async','get','set','*'].includes(tokens[b].value);b--)modifiers.unshift(tokens[b].value);
        if(next?.value==='('){const close=matchClose(tokens,k+1);c.methods.push({name:t.value,line:t.line,modifiers,signature:source(tokens,k+1,close,110)});}
        else if(next?.value==='='||next?.value===';'){const e=next.value==='='?skipExpr(tokens,k+2):k+1;c.fields.set(t.value,{name:t.value,line:t.line,init:next.value==='='?source(tokens,k+2,e-1):'',declared:true});}
      }
    }
    if(cls&&t.type==='id'&&t.value==='this'&&next?.value==='.'&&tokens[k+2]?.type==='id'&&tokens[k+3]?.value==='='&&tokens[k+4]?.value!=='='){
      const c=classFor(cls.name),name=tokens[k+2].value;
      if(!c.fields.has(name)){const e=skipExpr(tokens,k+4);c.fields.set(name,{name,line:t.line,init:source(tokens,k+4,e-1)});}
    }
    if(cls&&t.type==='id'&&t.value==='Object'&&tokens[k+2]?.value==='assign'&&tokens[k+4]?.value==='this'&&tokens[k+6]?.value==='{'){
      const c=classFor(cls.name),end=matchClose(tokens,k+6);
      for(let j=k+7;j<end;j++)if(tokens[j].type==='id'&&[',','}',':'].includes(tokens[j+1]?.value)&&[',','{'].includes(tokens[j-1]?.value)&&!c.fields.has(tokens[j].value))c.fields.set(tokens[j].value,{name:tokens[j].value,line:tokens[j].line,init:'(Konstruktor-Option)'});
    }
    // ----- DOM, events, storage -----
    if(t.type==='str'&&prev?.value==='('){
      const callee=tokens[k-2]?.value;
      // '#id' through any selector helper, or a bare name through $/getElementById (map studio: $=getElementById)
      if((ID_CALLEES.has(callee)||idHelpers.has(callee))&&tokens[k+1]?.value===')'||idHelpers.has(callee)&&tokens[k+1]?.value===',')
        if(/^#[\w-]+$/.test(t.value)||(callee!=='querySelector'&&/^[\w-]+$/.test(t.value)))result.domIds.push({id:t.value.replace(/^#/,''),line:t.line});
      // dynamic ID: $('#prop-'+key)
      if(ID_CALLEES.has(callee)&&/^#?[\w-]+$/.test(t.value)&&tokens[k+1]?.value==='+')
        addPattern(t.value.replace(/^#/,'')+'*',t.line);
      if(callee==='addEventListener'&&tokens[k-3]?.value==='.')result.events.push({event:t.value,line:t.line,target:source(tokens,memberStart(tokens,k-4),k-4,70)});
      if(['getItem','setItem','removeItem'].includes(callee)&&tokens[k-4]?.value==='localStorage')result.storage.push({api:'localStorage.'+callee,key:t.value,line:t.line});
    }
    // dynamic ID: $(`point-${key}`), setInputValue(`${prop}-${axis}`)
    if(t.type==='tpl'&&t.value==='`open'&&prev?.value==='('&&(ID_CALLEES.has(tokens[k-2]?.value)||idHelpers.has(tokens[k-2]?.value))){
      let glob='';for(let j=k+1;j<tokens.length;j++){const u=tokens[j];if(u.type==='tpl'&&u.value==='`')break;if(u.type==='tplstr')glob+=u.value;else if(u.type==='tpl'&&u.value==='${'){glob+='*';j=matchClose(tokens,j);}}
      addPattern(glob.replace(/^#/,''),t.line);
    }
    if(t.type==='id'&&/^on[a-z]+$/.test(t.value)&&prev?.value==='.'&&next?.value==='='&&tokens[k+2]?.value!=='='&&!['onupgradeneeded','onsuccess','onerror','onblocked','oncomplete','onabort','onload'].includes(t.value))
      result.events.push({event:t.value.slice(2),line:t.line,target:source(tokens,memberStart(tokens,k-2),k-2,70)});
    if(t.type==='id'&&t.value==='indexedDB'&&tokens[k+2]?.value==='open')result.storage.push({api:'indexedDB.open',key:'(siehe DB_NAME)',line:t.line});
  }
  // localStorage via a key constant (e.g. localStorage.setItem(storageKey,…))
  for(let k=0;k<tokens.length;k++)if(tokens[k].type==='id'&&tokens[k].value==='localStorage'&&tokens[k+1]?.value==='.'&&tokens[k+3]?.value==='('&&tokens[k+4]?.type==='id')result.storage.push({api:'localStorage.'+tokens[k+2].value,key:tokens[k+4].value+' (Konstante)',line:tokens[k].line});
  result.classes=[...classes.values()].map(c=>({...c,fields:[...c.fields.values()].sort((a,b)=>a.line-b.line)}));
  result.exports=[...new Set(result.exports)];
  const seen=new Set();result.domIds=result.domIds.filter(d=>{const key=d.id;if(seen.has(key))return false;seen.add(key);return true;});
  const seenStorage=new Set();result.storage=result.storage.filter(s=>{const key=s.api+s.key;if(seenStorage.has(key))return false;seenStorage.add(key);return true;});
  return result;
}
function analyzeHtml(src){
  const ids=[...src.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  const scripts=[...src.matchAll(/<script[^>]*src="([^"]+)"[^>]*>/g)].map(m=>m[1]);
  const styles=[...src.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(m=>m[1]);
  const dataAttrs=[...new Set([...src.matchAll(/\b(data-[\w-]+)=/g)].map(m=>m[1]))];
  const title=/<title>([^<]*)<\/title>/.exec(src)?.[1]??'';
  return {title,ids,scripts,styles,dataAttrs};
}
function analyzeCss(src){
  const props=new Map();
  for(const m of src.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g))if(!props.has(m[1]))props.set(m[1],m[2].trim().slice(0,60));
  const media=[...new Set([...src.matchAll(/@media\s*([^{]+)\{/g)].map(m=>m[1].trim()))];
  const selectors=(src.match(/[^{}]+\{/g)??[]).length;
  return {customProperties:[...props].map(([name,value])=>({name,value})),media,ruleCount:selectors};
}

// ---------- collect ----------
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(f=>f&&!GENERATED.test(f)).sort();
const entries=[];
for(const file of files){
  let data;try{data=await readFile(path.join(root,file));}catch{continue;}
  const sha256=createHash('sha256').update(data).digest('hex');
  const text=/\.(m?js|html|css|jsonc?|md|ts|yml|txt)$|^\.|\/\./.test(file)||!file.includes('.');
  const lines=text?data.toString('utf8').split('\n').length-(data.at(-1)===10?1:0):null;
  const entry={file,bytes:data.length,sha256,lines,role:role(file)};
  if(!VENDOR.test(file)){
    const src=data.toString('utf8');
    if(/\.m?js$/.test(file))entry.js=analyzeJs(file,src);
    if(file.endsWith('.html'))entry.html=analyzeHtml(src);
    if(file.endsWith('.css'))entry.css=analyzeCss(src);
  }
  entries.push(entry);
}
const byHash=new Map();for(const e of entries){if(!byHash.has(e.sha256))byHash.set(e.sha256,[]);byHash.get(e.sha256).push(e.file);}
for(const e of entries){const same=byHash.get(e.sha256).filter(f=>f!==e.file);if(same.length)e.identicalTo=same;}

// ---------- cross-checks (HTML ↔ JS contract) ----------
const page=(dir)=>entries.find(e=>e.file===`dist/${dir}index.html`);
const pairs=[['dist/map-studio/editor.js','map-studio/'],['dist/world-studio/editor.js','world-studio/'],['dist/app.js','']];
const contracts=pairs.map(([js,dir])=>{
  const script=entries.find(e=>e.file===js),html=page(dir);if(!script?.js||!html?.html)return null;
  const htmlIds=new Set(html.html.ids),used=script.js.domIds.filter(d=>!d.tooBroad).map(d=>d.id);
  const matches=(pattern,id)=>new RegExp('^'+pattern.split('*').map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$').test(id);
  return {script:js,page:html.file,referenced:used.length,htmlIds:htmlIds.size,dynamicPrefixes:used.filter(id=>id.includes('*')),
    missingInHtml:used.filter(p=>![...htmlIds].some(id=>matches(p,id))),unusedInScript:[...htmlIds].filter(id=>!used.some(p=>matches(p,id))&&!/^i-/.test(id))};
}).filter(Boolean);

// ---------- render ----------
const commit=execFileSync('git',['rev-parse','--short','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const esc=s=>String(s??'').replace(/\|/g,'\\|').replace(/\n/g,' ');
const code=s=>s?'`'+String(s).replace(/`/g,'ˋ').replace(/\|/g,'\\|')+'`':'';
const n=x=>x.toLocaleString('de-DE');
const header=title=>`<!-- GENERIERT von scripts/architecture-index.mjs — nicht von Hand bearbeiten. Neu erzeugen: npm run docs:architecture -->\n# ${title}\n\nBasis: Commit \`${commit}\` plus Arbeitsbaum. Ablageregel und Deutung: [README.md](README.md).\n`;

let F=header('Dateiregister — jede Datei, Byte für Byte');
const total=entries.reduce((s,e)=>s+e.bytes,0),vendor=entries.filter(e=>VENDOR.test(e.file)).reduce((s,e)=>s+e.bytes,0);
F+=`\n${entries.length} Dateien, ${n(total)} Bytes gesamt. Davon Drittanbieter unter vendor/ ${n(vendor)} Bytes, übrige Dateien ${n(total-vendor)} Bytes.\nDer SHA-256 ist der Fingerabdruck des exakten Byte-Inhalts. Stimmt er zwischen zwei Ständen überein, ist die Datei Byte für Byte gleich.\n`;
const groups=new Map();for(const e of entries){if(!groups.has(e.role))groups.set(e.role,[]);groups.get(e.role).push(e);}
F+='\n## Übersicht nach Rolle\n\n| Rolle | Dateien | Bytes |\n|---|---:|---:|\n';
for(const [r,list] of groups)F+=`| ${r} | ${list.length} | ${n(list.reduce((s,e)=>s+e.bytes,0))} |\n`;
F+='\n## Alle Dateien\n\n| Datei | Bytes | Zeilen | Rolle | SHA-256 | Byte-identisch mit |\n|---|---:|---:|---|---|---|\n';
for(const e of entries)F+=`| ${code(e.file)} | ${n(e.bytes)} | ${e.lines??'—'} | ${e.role} | ${code(e.sha256)} | ${(e.identicalTo??[]).map(code).join(', ')} |\n`;

let S=header('Symbolregister — jede Variable, Funktion, Klasse und Eigenschaft');
S+='\nErfasst werden alle Deklarationen auf Modulebene (`const`/`let`/`var`/`function`/`class`, auch destrukturiert), jede Klassenmethode, jedes Instanzfeld (`this.x=`), alle Imports und Exporte, jede DOM-ID, die ein Skript anspricht, jede Event-Bindung sowie Speicher-Schlüssel. Lokale Variablen innerhalb von Funktionsrümpfen sind absichtlich nicht aufgeführt, weil sie nicht über die Funktion hinaus wirken.\n\nNicht analysiert: Bibliotheken unter `vendor/` (Drittanbieter).\n';
S+='\n## Vertragsprüfung HTML ↔ Skript\n\n| Skript | Seite | Angesprochene IDs (davon dynamische Präfixe) | IDs in HTML | Im Skript benutzt, im HTML fehlend | Im HTML, vom Skript nie direkt angesprochen |\n|---|---|---:|---:|---|---|\n';
for(const c of contracts)S+=`| ${code(c.script)} | ${code(c.page)} | ${c.referenced} (${c.dynamicPrefixes.map(code).join(', ')||'—'}) | ${c.htmlIds} | ${c.missingInHtml.map(code).join(', ')||'keine'} | ${c.unusedInScript.map(code).join(', ')||'keine'} |\n`;
S+='\nDie rechte Spalte ist kein Fehler an sich: viele IDs dienen nur Labels (`for=`), ARIA-Verweisen oder CSS.\n';
for(const e of entries.filter(e=>e.js||e.html||e.css)){
  S+=`\n## ${code(e.file)}\n\n${n(e.bytes)} Bytes · ${e.lines} Zeilen · ${e.role}${e.identicalTo?` · byte-identisch mit ${e.identicalTo.map(code).join(', ')}`:''}\n`;
  const j=e.js;
  if(j){
    if(j.imports.length){S+='\n**Imports**\n\n| Zeile | Quelle | Namen |\n|---:|---|---|\n';for(const i of j.imports)S+=`| ${i.line} | ${code(i.from)} | ${i.names.map(code).join(', ')} |\n`;}
    if(j.exports.length)S+=`\n**Exporte:** ${j.exports.map(code).join(', ')}\n`;
    if(j.declarations.length){S+='\n**Modulebene**\n\n| Zeile | Art | Name | Export | Wert / Signatur |\n|---:|---|---|:---:|---|\n';for(const d of j.declarations)S+=`| ${d.line} | ${d.kind} | ${code(d.name)} | ${d.exported?'✓':''} | ${code(d.signature??d.init)} |\n`;}
    for(const c of j.classes){
      S+=`\n**Klasse ${code(c.name)}**${c.extends?` extends ${code(c.extends)}`:''} (Zeile ${c.line})\n`;
      if(c.methods.length){S+='\n| Zeile | Methode | Modifikatoren | Parameter |\n|---:|---|---|---|\n';for(const m of c.methods)S+=`| ${m.line} | ${code(m.name)} | ${m.modifiers.join(' ')} | ${code(m.signature)} |\n`;}
      if(c.fields.length){S+='\n| Zeile | Instanzfeld | Erster Wert |\n|---:|---|---|\n';for(const f of c.fields)S+=`| ${f.line} | ${code(f.name)} | ${code(f.init)} |\n`;}
    }
    if(j.domIds.length)S+=`\n**DOM-IDs, die dieses Skript anspricht (${j.domIds.length}):** ${j.domIds.map(d=>code(d.id)).join(', ')}\n`;
    if(j.events.length){S+='\n**Event-Bindungen**\n\n| Zeile | Ereignis | Ziel |\n|---:|---|---|\n';for(const ev of j.events)S+=`| ${ev.line} | ${code(ev.event)} | ${code(ev.target.trim())} |\n`;}
    if(j.storage.length){S+='\n**Speicherzugriffe**\n\n| Zeile | API | Schlüssel |\n|---:|---|---|\n';for(const s of j.storage)S+=`| ${s.line} | ${code(s.api)} | ${code(s.key)} |\n`;}
  }
  if(e.html){const h=e.html;S+=`\nTitel: ${esc(h.title)} · Skripte: ${h.scripts.map(code).join(', ')||'inline/Modul'} · Stylesheets: ${h.styles.map(code).join(', ')}\n\n**Element-IDs (${h.ids.length}):** ${h.ids.map(code).join(', ')}\n`;if(h.dataAttrs.length)S+=`\n**data-Attribute:** ${h.dataAttrs.map(code).join(', ')}\n`;}
  if(e.css){const c=e.css;S+=`\n${c.ruleCount} Regelblöcke${c.media.length?` · Media-Queries: ${c.media.map(code).join(', ')}`:''}\n`;if(c.customProperties.length){S+='\n| CSS-Variable | Erster Wert |\n|---|---|\n';for(const p of c.customProperties)S+=`| ${code(p.name)} | ${code(p.value)} |\n`;}}
}
const json=JSON.stringify({generatedBy:'scripts/architecture-index.mjs',commit,files:entries,contracts},null,1)+'\n';

const outputs={'FILES.md':F,'SYMBOLS.md':S,'index.json':json};
const strip=s=>s.replace(/Commit `[0-9a-f]+`/,'').replace(/"commit": "[0-9a-f]+"/,'');
if(process.argv.includes('--check')){
  let stale=[];for(const [name,content] of Object.entries(outputs)){let current='';try{current=await readFile(path.join(out,name),'utf8');}catch{}if(strip(current)!==strip(content))stale.push(name);}
  if(stale.length){console.error(`Architektur-Index veraltet: ${stale.join(', ')}. Bitte npm run docs:architecture ausführen.`);process.exit(1);}
  console.log('PASS: Architektur-Index ist aktuell.');
}else{
  await mkdir(out,{recursive:true});for(const [name,content] of Object.entries(outputs))await writeFile(path.join(out,name),content);
  console.log(`Architektur-Index geschrieben: ${entries.length} Dateien, ${entries.filter(e=>e.js).length} JS-Module, ${entries.reduce((s,e)=>s+(e.js?.declarations.length??0),0)} Deklarationen.`);
}
