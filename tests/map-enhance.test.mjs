// Kartenbild verbessern: Zielgröße, Dateiname, erweiterte Bildgrenze für verbesserte Bilder.
import assert from 'node:assert/strict';
import {demoDocument,validateDocument,enhanceTarget,enhancedName,MAX_IMAGE_BYTES,MAX_UPLOAD_BYTES,ENHANCE_LONG_SIDE} from '../dist/map-studio/model.js';

assert.equal(ENHANCE_LONG_SIDE,3840);
assert.deepEqual(enhanceTarget({width:1920,height:1080}),{width:3840,height:2160},'4K keeps the aspect ratio');
assert.deepEqual(enhanceTarget({width:800,height:1600}),{width:1920,height:3840},'portrait: the long side is 3840');
assert.deepEqual(enhanceTarget({width:5000,height:2000}),{width:5000,height:2000},'never downscaled, only sharpened');
assert.deepEqual(enhanceTarget({width:1000,height:333}),{width:3840,height:1279});

assert.equal(enhancedName('campus.png','image/webp'),'campus-4k.webp');
assert.equal(enhancedName('campus-4k.webp','image/webp'),'campus-4k.webp','not appended twice');
assert.equal(enhancedName('karte','image/png'),'karte-4k.png');
assert.equal(enhancedName('x'.repeat(200)+'.jpg','image/jpeg').length,160);

assert.equal(MAX_UPLOAD_BYTES,4*1024*1024,'user uploads stay at 4 MB');
assert.equal(MAX_IMAGE_BYTES,8*1024*1024,'enhanced images may be up to 8 MiB');
const big='data:image/webp;base64,'+'A'.repeat(Math.floor(6*1024*1024*4/3/4)*4);
const doc=validateDocument({...demoDocument(),map:{...demoDocument().map,image:{name:'gross-4k.webp',dataUrl:big}}});
assert.equal(doc.map.image.dataUrl.length,big.length,'a 6 MB enhanced image is a valid document');
assert.throws(()=>validateDocument({...demoDocument(),map:{...demoDocument().map,image:{name:'x',dataUrl:'data:image/webp;base64,'+'A'.repeat(12*1024*1024)}}}),/Kartenbild/);

console.log('PASS: enhance target (4K long side, never smaller), file name, upload and document image limits.');
