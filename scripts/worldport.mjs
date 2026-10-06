#!/usr/bin/env node
// worldport CLI (P1): CSV with lat/lng points → Map Studio project (motionspec.map.v3). Uses dist/worldport/core.mjs.
//   node scripts/worldport.mjs <input.csv> -o <out.map.json> [--scale 0.125] [--name "…"] [--exclude source=leaks,foo] [--color-by source]
import {readFile,writeFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {parseCsv,convertPoints} from '../dist/worldport/core.mjs';

const usage='Aufruf: node scripts/worldport.mjs <input.csv> -o <out.map.json> [--scale 0.125] [--name "…"] [--exclude spalte=wert1,wert2] [--color-by spalte]';
let parsed;
try{parsed=parseArgs({allowPositionals:true,options:{output:{type:'string',short:'o'},scale:{type:'string',default:'1'},name:{type:'string',default:'Importierte Welt'},exclude:{type:'string',multiple:true,default:[]},'color-by':{type:'string',default:'source'}}});}
catch(error){console.error(`${error.message}\n${usage}`);process.exit(2);}
const {values:options,positionals}=parsed,output=options.output;
if(positionals.length!==1||!output){console.error(usage);process.exit(2);}
const exclude=Object.create(null);
for(const rule of options.exclude){const at=rule.indexOf('=');if(at<1){console.error(`--exclude braucht spalte=wert1,wert2 (war: „${rule}“).\n${usage}`);process.exit(2);}(exclude[rule.slice(0,at)]??=[]).push(...rule.slice(at+1).split(','));}
const {document,report}=convertPoints(parseCsv(await readFile(positionals[0],'utf8')),{name:options.name,scale:Number(options.scale),exclude,colorBy:options['color-by']});
await writeFile(output,JSON.stringify(document,null,1)+'\n');
console.log(JSON.stringify({...report,output,map:`${document.map.width} × ${document.map.depth} m`},null,1));
