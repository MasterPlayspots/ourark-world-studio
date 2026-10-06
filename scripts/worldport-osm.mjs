#!/usr/bin/env node
// worldport P2 CLI: OpenStreetMap buildings (Overpass JSON with `out geom`) → Map Studio / 3D Worlds project (map.v3).
//   node scripts/worldport-osm.mjs --query 25.765,-80.145,25.795,-80.125     prints the Overpass query for a box
//   node scripts/worldport-osm.mjs --ground-query 25.765,-80.145,25.795,-80.125  prints the query for roads, beach, water, coastline
//   node scripts/worldport-osm.mjs overpass.json -o vice-city.map.json [--ground ground.json] [--name "Vice City"] [--spawn 25.7797,-80.1302,0]
// Fetch the data yourself (e.g. curl -A "<your tool name>" --data-urlencode data@query.txt https://overpass-api.de/api/interpreter)
// and keep the attribution: © OpenStreetMap contributors, ODbL.
import {readFile,writeFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {convertOsm,overpassQuery} from '../dist/worldport/osm.mjs';
import {overpassGroundQuery} from '../dist/worldport/osm-ground.mjs';

const usage='Aufruf: node scripts/worldport-osm.mjs --query|--ground-query süd,west,nord,ost | <gebäude.json> -o <out.map.json> [--ground <boden.json>] [--name "…"] [--spawn breite,länge,blickrichtung°]';
let parsed;
try{parsed=parseArgs({allowPositionals:true,options:{output:{type:'string',short:'o'},name:{type:'string',default:'OpenStreetMap-Welt'},query:{type:'string'},'ground-query':{type:'string'},ground:{type:'string'},spawn:{type:'string'}}});}
catch(error){console.error(`${error.message}\n${usage}`);process.exit(2);}
const {values:options,positionals}=parsed;
if(options['ground-query']){
  const box=options['ground-query'].split(',').map(Number);
  if(box.length!==4||!box.every(Number.isFinite)){console.error(`--ground-query braucht süd,west,nord,ost in Grad.\n${usage}`);process.exit(2);}
  const [south,west,north,east]=box;console.log(overpassGroundQuery({south,west,north,east}));process.exit(0);
}
if(options.query){
  const box=options.query.split(',').map(Number);
  if(box.length!==4||!box.every(Number.isFinite)){console.error(`--query braucht süd,west,nord,ost in Grad.\n${usage}`);process.exit(2);}
  const [south,west,north,east]=box;console.log(overpassQuery({south,west,north,east}));process.exit(0);
}
if(positionals.length!==1||!options.output){console.error(usage);process.exit(2);}
let spawn;
if(options.spawn){const [lat,lon,heading=0]=options.spawn.split(',').map(Number);if(![lat,lon,heading].every(Number.isFinite)){console.error(`--spawn braucht breite,länge[,blickrichtung°].\n${usage}`);process.exit(2);}spawn={lat,lon,heading};}
const ground=options.ground?JSON.parse(await readFile(options.ground,'utf8')):undefined;
const {document,report}=convertOsm(JSON.parse(await readFile(positionals[0],'utf8')),{name:options.name,spawn,ground});
await writeFile(options.output,JSON.stringify(document)+'\n');
console.log(JSON.stringify({...report,output:options.output},null,1));
