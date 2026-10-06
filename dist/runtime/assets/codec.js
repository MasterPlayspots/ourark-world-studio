// Kart asset codec (Welle P3, ADR 0006): lossless, smaller height grids for the browser, the Worker (MapRoom terrain
// check) and the Node tests — one implementation, web-platform APIs only (DecompressionStream, no WASM, no deps).
// Transfer packing (field `packing`, separate from the content `encoding` such as "uint16le" or "KB01 …"): height grids
// (uint16 little endian, row by row) as "delta-planes+gzip": each value minus its
// left neighbour (first column: minus the value above; first value: as is), modulo 2^16, then all low bytes followed
// by all high bytes, then gzip. Smooth terrain gives small deltas, so the high-byte plane is almost constant and
// deflate shrinks it to nearly nothing (Kronach DGM1 2.0 MB → 0.81 MB, Rosenberg 387 KB → 178 KB).
// Other binary files may be plain "gzip". Missing `packing` means raw bytes (the format before P3).

export const HEIGHT_PACKING='delta-planes+gzip',GZIP_PACKING='gzip';

// Decompresses a gzip byte stream (Response body, Blob stream or bytes) with the platform's DecompressionStream.
export async function gunzip(source){
  const stream=source instanceof ReadableStream?source:new Blob([source]).stream();
  return new Uint8Array(await new Response(stream.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
}

/** Delta + byte planes of a uint16 grid (before gzip). Pure; used by the packer and the tests. */
export function encodeHeightPlanes(values,width,depth){
  const n=width*depth;if(values.length!==n)throw new Error('Höhenraster hat die falsche Größe');
  const out=new Uint8Array(2*n);
  for(let k=0;k<n;k++){
    const i=k%width,pred=i>0?values[k-1]:k>=width?values[k-width]:0,d=(values[k]-pred)&0xffff;
    out[k]=d&0xff;out[n+k]=d>>8;
  }
  return out;
}

/** Inverse of encodeHeightPlanes → Uint16Array(width*depth). */
export function decodeHeightPlanes(planes,width,depth){
  const n=width*depth;if(planes.length!==2*n)throw new Error('Höhenraster hat die falsche Größe');
  const out=new Uint16Array(n);
  for(let k=0;k<n;k++){
    const i=k%width,pred=i>0?out[k-1]:k>=width?out[k-width]:0;
    out[k]=(pred+(planes[k]|planes[n+k]<<8))&0xffff;
  }
  return out;
}

/** Bytes of a height grid file → Uint16Array, whatever its packing (raw or delta planes + gzip). */
export async function decodeHeightFile(bytes,{width,depth,packing}){
  if(!packing){const raw=new Uint16Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));if(raw.length!==width*depth)throw new Error('Höhenraster hat die falsche Größe');return raw;}
  if(packing!==HEIGHT_PACKING)throw new Error(`Unbekannte Höhenpackung: ${packing}`);
  return decodeHeightPlanes(await gunzip(bytes),width,depth);
}

/** Bytes of another binary asset → its raw bytes (plain or gzip). */
export async function decodeBinaryFile(bytes,packing){
  if(!packing)return bytes;
  if(packing!==GZIP_PACKING)throw new Error(`Unbekannte Packung: ${packing}`);
  return gunzip(bytes);
}

/** URL of a bundle file with its content hash as cache key (?v=), so it can be cached as immutable. */
export const assetUrl=(base,file,hash)=>{const url=new URL(file,base);if(hash)url.searchParams.set('v',hash);return url;};
