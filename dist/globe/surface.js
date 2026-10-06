// Surface height grid of the Kronach tile for the globe: the kart bundle's 1 m terrain (DGM1) with the LoD2 roofs
// (KB01) rasterised on top — the same data the globe's kronach-1km.glb is built from. Looking a height up is a
// bilinear read of a Float32Array instead of scene.sampleHeight(), which renders an extra pick pass per call
// (measured over Kronach: ~63 calls/s at 6.5–9.2 ms each while flying, 41–58 % of the frame time).
// Frame: kart-local metres (x east, z south, origin = tile centre); heights in metres relative to the bundle offset
// (300 m NN, = the GLB's y = 0).

/** heights: Uint16Array (cm), terrain meta {width,depth,cell,scale}, buildings: KB01 bytes or null → SurfaceGrid. */
export function buildSurface(heights,{width,depth,cell=1,scale=.01},buildings=null){
  if(heights.length!==width*depth)throw new Error('Höhenraster hat die falsche Größe');
  const data=new Float32Array(width*depth);
  for(let k=0;k<data.length;k++)data[k]=heights[k]*scale;
  let roofs=0;
  if(buildings){
    const bytes=buildings instanceof Uint8Array?buildings:new Uint8Array(buildings);
    if(String.fromCharCode(...bytes.subarray(0,4))!=='KB01')throw new Error('Unbekanntes Gebäudeformat');
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),roofVerts=view.getUint32(4,true);
    const raw=new Int16Array(bytes.buffer.slice(bytes.byteOffset+12,bytes.byteOffset+12+roofVerts*6));
    for(let t=0;t+8<raw.length;t+=9){rasterise(data,width,depth,cell,raw,t);roofs++;}
  }
  return new SurfaceGrid(data,width,depth,cell,roofs);
}

// Raises every grid node inside the roof triangle at raw[t..t+8] (x,y,z × 3, 0.05 m units) to the roof height there.
function rasterise(data,width,depth,cell,raw,t){
  const q=.05,ax=raw[t]*q,ay=raw[t+1]*q,az=raw[t+2]*q,bx=raw[t+3]*q,by=raw[t+4]*q,bz=raw[t+5]*q,cx=raw[t+6]*q,cy=raw[t+7]*q,cz=raw[t+8]*q;
  // Corners and centroid always reach their nearest node: dormers and small roof parts narrower than a cell would
  // otherwise slip between the nodes.
  stamp(data,width,depth,cell,ax,ay,az);stamp(data,width,depth,cell,bx,by,bz);stamp(data,width,depth,cell,cx,cy,cz);
  stamp(data,width,depth,cell,(ax+bx+cx)/3,(ay+by+cy)/3,(az+bz+cz)/3);
  const det=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);if(Math.abs(det)<1e-9)return;// vertical (wall) or degenerate
  const i0=Math.max(0,Math.ceil(Math.min(ax,bx,cx)/cell+width/2)),i1=Math.min(width-1,Math.floor(Math.max(ax,bx,cx)/cell+width/2));
  const j0=Math.max(0,Math.ceil(Math.min(az,bz,cz)/cell+depth/2)),j1=Math.min(depth-1,Math.floor(Math.max(az,bz,cz)/cell+depth/2));
  for(let j=j0;j<=j1;j++){
    const z=(j-depth/2)*cell;
    for(let i=i0;i<=i1;i++){
      const x=(i-width/2)*cell,u=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/det,v=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/det,w=1-u-v;
      if(u<-1e-6||v<-1e-6||w<-1e-6)continue;
      const y=u*ay+v*by+w*cy,k=j*width+i;if(y>data[k])data[k]=y;
    }
  }
}

function stamp(data,width,depth,cell,x,y,z){
  const i=Math.round(x/cell+width/2),j=Math.round(z/cell+depth/2);
  if(i<0||j<0||i>=width||j>=depth)return;const k=j*width+i;if(y>data[k])data[k]=y;
}

export class SurfaceGrid{
  constructor(data,width,depth,cell,roofs){Object.assign(this,{data,width,depth,cell,roofs});this.half=Math.min(width,depth)*cell/2;}
  /** true when (x, z) lies on the grid (with a one-cell margin). */
  covers(x,z){return Math.abs(x)<this.half-this.cell&&Math.abs(z)<this.half-this.cell;}
  /** Bilinear surface height (m relative to the bundle offset) at kart-local (x, z); clamped at the edge. */
  at(x,z){
    const {width,depth,cell,data}=this;
    const gx=Math.min(width-1.001,Math.max(0,x/cell+width/2)),gz=Math.min(depth-1.001,Math.max(0,z/cell+depth/2));
    const i=Math.floor(gx),j=Math.floor(gz),u=gx-i,v=gz-j,k=j*width+i;
    return (data[k]*(1-u)+data[k+1]*u)*(1-v)+(data[k+width]*(1-u)+data[k+width+1]*u)*v;
  }
}

// ---------------------------------------------------------------- Landkreis tiles (scripts/geo/kronach_lk_surface.py)

/** WGS84 lon/lat (degrees) → UTM zone 32N (EPSG:25832) east/north in metres; Krüger series, mm-accurate. */
export function utm32(lon,lat){
  const a=6378137,f=1/298.257223563,k0=.9996,n=f/(2-f),n2=n*n,n3=n2*n,n4=n3*n;
  const A=a/(1+n)*(1+n2/4+n4/64),al=[n/2-2/3*n2+5/16*n3+41/180*n4,13/48*n2-3/5*n3+557/1440*n4,61/240*n3-103/140*n4,49561/161280*n4];
  const phi=lat*Math.PI/180,dl=(lon-9)*Math.PI/180,c=2*Math.sqrt(n)/(1+n);
  const t=Math.sinh(Math.atanh(Math.sin(phi))-c*Math.atanh(c*Math.sin(phi))),xi=Math.atan2(t,Math.cos(dl)),eta=Math.atanh(Math.sin(dl)/Math.sqrt(1+t*t));
  let E=eta,N=xi;
  for(let j=1;j<=4;j++){E+=al[j-1]*Math.cos(2*j*xi)*Math.sinh(2*j*eta);N+=al[j-1]*Math.sin(2*j*xi)*Math.cosh(2*j*eta);}
  return [500000+k0*A*E,k0*A*N];
}

/** KS01 bytes → {offset (m NN), heights Uint16Array, roofs KB01 bytes}; gunzip(bytes) → Promise<Uint8Array>. */
export async function readSurfaceFile(bytes,gunzip){
  const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  if(String.fromCharCode(...b.subarray(0,4))!=='KS01')throw new Error('Unbekanntes Oberflächenformat');
  const v=new DataView(b.buffer,b.byteOffset,b.byteLength),offset=v.getUint32(4,true)/100,hLen=v.getUint32(8,true);
  const h=await gunzip(b.subarray(12,12+hLen)),roofs=await gunzip(b.subarray(12+hLen));
  return {offset,heights:new Uint16Array(h.buffer.slice(h.byteOffset,h.byteOffset+h.byteLength)),roofs};
}

/** Surface heights (m NN) of the county from 1 km KS01 files, loaded on demand around where they are asked for.
 *  at(E, N) answers NaN until the tile is there (the caller falls back to the globe terrain meanwhile). */
export class SurfaceTiles{
  constructor({load,keep=16,onLoad=()=>{}}){Object.assign(this,{load,keep,onLoad});this.tiles=new Map();}
  tile(te,tn){
    const key=`${te}_${tn}`;let t=this.tiles.get(key);
    if(!t){
      t={grid:null};this.tiles.set(key,t);
      this.load(te,tn).then(file=>{if(!file){t.grid=false;return;}
        t.grid=buildSurface(file.heights,{width:1000,depth:1000,cell:1,scale:.01},file.roofs);t.offset=file.offset;this.onLoad(key);})
        .catch(()=>{t.grid=false;});
      // Keep the newest `keep` tiles (4 MB each).
      for(const k of this.tiles.keys()){if(this.tiles.size<=this.keep)break;if(k!==key)this.tiles.delete(k);}
    }else{this.tiles.delete(key);this.tiles.set(key,t);}
    return t;
  }
  at(E,N){
    const te=Math.floor(E/1000),tn=Math.floor(N/1000),t=this.tile(te,tn);
    if(!t.grid)return NaN;
    // Grid node i sits at x = i − 500 m from the tile centre, the DGM pixel centres at i + 0.5 − 500: look up −0.5 m.
    const x=E-(te*1000+500)-.5,z=(tn*1000+500)-N-.5;
    return t.offset+t.grid.at(x,z);
  }
}
