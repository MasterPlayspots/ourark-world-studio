// Explicit, fail-closed suite list for the public source release. Nothing is silently skipped.
// Dataset-specific exclusions and adaptations are recorded in PUBLIC_SOURCE.json.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const suites=[
  'world-studio','map-studio','map-history','map-enhance','map-v2','map-runtime','physics',
  'broadphase','polygon','map-v3','map-project','city-layer','map-edit-cost','walker','quality',
  'world-walk','worldport','worldport-osm','osm-ground','surfaces','water','runtime','camera-rig',
  'device-check','perf-meter','kart','plane','pedestrian','kart-insights','car','sim-layout',
  'net-protocol','room','net-client','sim-wasm','net-delta','gpu-cull','vram-budget','frame-loop',
  'sim-snapshot','kart-assets','city-tile'
];
for(const name of suites){
  const result=spawnSync(process.execPath,[`tests/${name}.test.mjs`],{cwd:root,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
const result=spawnSync(process.execPath,['--test','tests/repository.test.mjs','tests/edge.test.mjs'],{cwd:root,stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
