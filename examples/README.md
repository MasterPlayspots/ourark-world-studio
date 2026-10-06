# First runnable examples

Run npm run dev at the repository root. Open /map-studio/ and import [map-starter.map.json](map-starter.map.json) through the project import control. It contains a 120 × 80 m map, one building, an unobstructed spawn and arbitrary point.data values. No external asset is required.

Change the building height, switch views, undo/redo, enter/exit walking, save and export. Re-import the exported project and compare the building and its data. A different world ID opens as another project and may require saving/exporting unsaved work first.

## Convert CSV to a map

The included CSV fixture can be converted without fetching remote data:

~~~sh
node scripts/worldport.mjs tests/fixtures/leonida-sample.csv -o /tmp/motionspec-example.map.json --scale 0.125 --name "CSV example"
~~~

This produces a bare map payload. Map Studio wraps it into a project when opened/exported. Read the CLI report for excluded records or applied limits.

## Validate the example without a browser

Run this from the repository root:

~~~sh
node --input-type=module <<'JS'
import {readFile} from 'node:fs/promises';
import {readProject, serializeProject, projectBytes, MAX_PROJECT_BYTES} from './dist/map-studio/project.js';
const input = JSON.parse(await readFile('examples/map-starter.map.json', 'utf8'));
const {doc, meta} = readProject(input);
const bytes = projectBytes(doc, meta);
if (bytes > MAX_PROJECT_BYTES) throw new Error('Example exceeds project budget');
const again = readProject(JSON.parse(serializeProject(doc, meta)));
if (again.doc.points[0].data.assetId !== 'building-001') throw new Error('Round-trip lost data');
console.log({schema: doc.schema, worldId: meta.worldId, points: doc.points.length, bytes});
JS
~~~

These examples exercise the existing map path. They do not implement complete world-package export, arbitrary model reconstruction or shared cloud persistence.
