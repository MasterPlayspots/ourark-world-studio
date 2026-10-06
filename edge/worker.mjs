// Worker entry (wrangler.jsonc "main"). workerd accepts only handlers and Durable Object classes as exports
// here, so the request logic lives in edge/app.mjs and the guard in edge/guard.mjs.
import {createWorker} from './app.mjs';
export {LoginGuard} from './guard.mjs';
export {MapRoom} from './map-room.mjs';
import {MapRoom} from './map-room.mjs';
// The WASM simulation core as a compiled module (Wrangler's default rule for .wasm imports); MapRoom uses it to check
// poses against the map's terrain.
import simModule from '../dist/runtime/sim/sim.wasm';
MapRoom.simModule=simModule;

export default createWorker();
