// worldport P1: 2D world data (CSV) → a walkable Map Studio project. Pure, deterministic, browser + Node.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseCsv,convertPoints,LIMITS} from '../dist/worldport/core.mjs';
import {validateDocument,MAX_POINTS} from '../dist/map-studio/model.js';

// 1. CSV parsing (RFC 4180): quotes, escaped quotes, commas and line breaks inside fields, BOM, CRLF.
{
  const rows=parseCsv('﻿a,b,c\r\n1,"x, y","say ""hi"""\r\n2,"multi\nline",\r\n');
  assert.deepEqual(rows,[{a:'1',b:'x, y',c:'say "hi"'},{a:'2',b:'multi\nline',c:''}]);
  assert.throws(()=>parseCsv('a,b\n1,"open'),/Anführungszeichen/);
}

const csv=await readFile(new URL('./fixtures/leonida-sample.csv',import.meta.url),'utf8');
const records=parseCsv(csv);

// 2. Leonida-style records: lat = north, lng = east (Leaflet CRS.Simple) → x east, z south, scaled into metres.
{
  const {document,report}=convertPoints(records,{name:'Leonida (POIs)',scale:1/8,exclude:{source:['leaks']},colorBy:'source'});
  assert.equal(document.schema,'motionspec.map.v3');
  assert.equal(report.input,5);assert.equal(report.withoutCoordinates,1);assert.equal(report.excluded,1,'the leak is left out');
  assert.equal(document.points.length,3);
  const keys=document.points.find(p=>p.id==='screenshots_001');
  const centerX=(-4428+2500)/2,centerZ=-(-7612+1500)/2;
  assert.ok(Math.abs(keys.x-(-4428-centerX)/8)<1e-6&&Math.abs(keys.z-(7612-centerZ)/8)<1e-6,'centred and scaled, north up');
  assert.ok(document.map.width>=(2500+4428)/8&&document.map.depth>=(1500+7612)/8&&document.map.width<=5000,'map covers all points');
  // 3. Variables: every non-empty column except coordinates, links and image paths lands in data, with readable labels.
  assert.equal(keys.data.Beschreibung,undefined,'empty values are skipped');
  assert.equal(keys.data['Quelle'],'screenshots');assert.equal(keys.data['Tags'],'Screenshots; Leonida Keys; S2/46');
  assert.equal(keys.data['Bildnachweis'],'Rockstar Games / 05/06/2025');assert.equal(keys.data['calc_naechster_nachbar_dist'],120.5,'numbers stay numbers');
  assert.equal(keys.data['Original-Koordinaten'],'lat -7612 · lng -4428');
  for(const p of document.points)for(const v of Object.values(p.data))assert.doesNotMatch(String(v),/https?:|assets\//,'no links or image paths');
  // 4. Appearance: one colour per source, pillars that stand out, walkable and inspectable.
  const colors=new Set(document.points.map(p=>p.color));assert.equal(colors.size,3);
  assert.ok(document.points.every(p=>p.type==='station'&&p.solid&&p.interactive&&p.height>=6));
  // 5. The result is a valid document the studio accepts as it is.
  assert.deepEqual(validateDocument(document),document);
  assert.deepEqual(report.sources,{screenshots:1,trailer1:1,markers:1});
}

// 6. Limits are enforced with an honest report instead of silent loss.
{
  const many=Array.from({length:MAX_POINTS+30},(_,i)=>({id:`p${i}`,name:`P ${i}`,lat:String(i),lng:String(-i),source:'x'}));
  const {document,report}=convertPoints(many,{scale:1});
  assert.equal(document.points.length,MAX_POINTS);assert.equal(report.truncated,30);assert.match(report.warnings.join(' '),new RegExp(`ersten ${MAX_POINTS} Punkte`));
  const huge=[{id:'big',name:'Big',lat:'0',lng:'0',description:'x'.repeat(10_000)}];
  const r=convertPoints(huge,{scale:1});
  assert.ok(JSON.stringify(r.document.points[0].data).length<=6000);assert.match(r.report.warnings.join(' '),/gekürzt/);
  assert.throws(()=>convertPoints([{lat:'0',lng:'0'}],{scale:0}),/Maßstab/);
  const wide=convertPoints([{id:'a',name:'A',lat:'0',lng:'0'},{id:'b',name:'B',lat:'0',lng:'100000'}],{scale:1});
  assert.equal(wide.document.map.width,5000);assert.match(wide.report.warnings.join(' '),/5000 m/);
  assert.equal(LIMITS.maxDataChars,6000);assert.equal(LIMITS.maxPoints,MAX_POINTS,'same limit as the Map Studio');
}

// 6b. Duplicate ids across sources (real Leonida data: el_screenshots reuse screenshots ids) become unique.
{
  const dup=[{id:'s_1',name:'A',lat:'0',lng:'0',source:'screenshots'},{id:'s_1',name:'B',lat:'1',lng:'1',source:'el_screenshots'},{id:'s_1',name:'C',lat:'2',lng:'2',source:'el_screenshots'}];
  const {document,report}=convertPoints(dup,{scale:1});
  assert.deepEqual(document.points.map(p=>p.id),['s_1','s_1-el_screenshots','s_1-el_screenshots-2']);
  assert.match(report.warnings.join(' '),/doppelte ID/);assert.ok(validateDocument(document));
}

// 7. Deterministic: the same input gives byte-identical output (ids from the data, or stable fallbacks).
{
  const a=JSON.stringify(convertPoints(records,{scale:1/8}).document),b=JSON.stringify(convertPoints(parseCsv(csv),{scale:1/8}).document);
  assert.equal(a,b);
}

// Review findings (P1): hardening against unusual input.
{
  // Many columns or huge column names terminate (no endless shortening) and stay within the limit.
  const wide={lat:'1',lng:'2',name:'Breit'};for(let i=0;i<2000;i++)wide[`spalte${i}`]='vvv';
  const long={lat:'1',lng:'2',name:'Lang',['x'.repeat(7000)]:'wert'};
  for(const record of [wide,long]){const {document,report}=convertPoints([record]);assert.ok(JSON.stringify(document.points[0].data).length<=6000);assert.ok(record===long||report.warnings.some(w=>/gekürzt/.test(w)));}
  assert.equal(Object.keys(convertPoints([long]).document.points[0].data)[0].length,100,'column names are capped');
  // Column names that exist on Object.prototype are ordinary columns.
  const proto=convertPoints([{lat:'1',lng:'2',name:'P',constructor:'a',toString:'b',source:'constructor'},{lat:'1',lng:'3',name:'Q',source:'__proto__'}]);
  assert.equal(proto.document.points[0].data.constructor,'a');assert.equal(proto.document.points[0].data.toString,'b');
  assert.deepEqual({...proto.report.sources},{constructor:1,['__proto__']:1});assert.equal(Object.keys(proto.report.sources).length,2);
  // Coordinates must be plain decimal numbers: blanks, hex and words are "without coordinates".
  const coords=convertPoints([{lat:' ',lng:'1'},{lat:'0x10',lng:'1'},{lat:'abc',lng:'1'},{lat:' 12.5 ',lng:'-3'},{lat:'1e2',lng:'4'}]);
  assert.equal(coords.report.withoutCoordinates,3);assert.equal(coords.report.points,2);
  // Leading zeros (postcodes, ids) stay text; "-0" too; plain numbers become numbers.
  const kinds=convertPoints([{lat:'1',lng:'1',plz:'01234',null_:'-0',n:'42',f:'-1.5'}]).document.points[0].data;
  assert.equal(kinds.plz,'01234');assert.equal(kinds.null_,'-0');assert.equal(kinds.n,42);assert.equal(kinds.f,-1.5);
  // Link filter by column name: link/url only as whole words, not in "blink_rate" or "curly".
  const words=convertPoints([{lat:'1',lng:'1',blink_rate:'3',curly:'ja',page_url:'x',link:'y',website:'javascript:alert(1)'}]).document.points[0].data;
  assert.equal(words.blink_rate,3);assert.equal(words.curly,'ja');assert.ok(!('page_url' in words)&&!('link' in words));
  assert.ok(!('website' in words),'script/data URLs are never copied');
  // Shortening never splits an emoji (no lone surrogates).
  const emoji=convertPoints([{lat:'1',lng:'1',text:'😀'.repeat(4000)}]).document.points[0].data.text;
  assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(emoji),'lone surrogate');
  // Duplicate headers and extra values are reported, not silently lost.
  const dup=parseCsv('lat,lng,a,a\n1,2,x,y,z\n');assert.deepEqual(dup[0],{lat:'1',lng:'2',a:'x',a_2:'y'});
  assert.throws(()=>convertPoints([{lat:'1',lng:'1'}],{margin:2500}),/Rand/);
}

// CLI: options may come before the input file; a malformed --exclude is a usage error, not a crash.
{
  const {spawnSync}=await import('node:child_process'),{mkdtempSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join}=await import('node:path');
  const dir=mkdtempSync(join(tmpdir(),'worldport-')),cli=new URL('../scripts/worldport.mjs',import.meta.url).pathname,fixture=new URL('./fixtures/leonida-sample.csv',import.meta.url).pathname;
  const run=(...args)=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
  const ok=run('--scale','0.125','--name','Vorne','--color-by','source',fixture,'-o',join(dir,'a.json'),'--exclude','source=leaks');
  assert.equal(ok.status,0,ok.stderr);assert.equal(JSON.parse(await readFile(join(dir,'a.json'),'utf8')).name,'Vorne');
  const bad=run(fixture,'-o',join(dir,'b.json'),'--exclude','spalte');assert.equal(bad.status,2);assert.match(bad.stderr,/spalte=wert/);
  assert.equal(run(fixture).status,2,'output is required');
}

console.log('PASS: CSV parsing, lat/lng → metres (north up, centred, scaled), variables without links/images, colours per source, valid document, limits with report, deterministic.');
