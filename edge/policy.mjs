// Shared delivery policy for the local dev server (scripts/serve.mjs) and the Cloudflare Worker (edge/worker.mjs).
// Web-platform APIs only (crypto.subtle, atob, TextEncoder), so the same code runs in Node 24 and in workerd.

// The studios load only same-origin modules, styles and images. Map images and the favicon are data: URLs,
// exports use blob: URLs. Inline style attributes exist in map-studio/index.html, inline scripts do not.
export const CONTENT_SECURITY_POLICY=["default-src 'self'","script-src 'self'","style-src 'self' 'unsafe-inline'","img-src 'self' data: blob:","connect-src 'self' data: blob:","font-src 'self'","object-src 'none'","base-uri 'none'","form-action 'none'","frame-ancestors 'none'"].join('; ');

export const SECURITY_HEADERS=Object.freeze({
  'Content-Security-Policy':CONTENT_SECURITY_POLICY,
  'X-Frame-Options':'DENY',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'X-Robots-Tag':'noindex, nofollow',
  'Cross-Origin-Opener-Policy':'same-origin',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()'
});
export const STRICT_TRANSPORT_SECURITY='max-age=31536000';

// Kart bundle files requested with their content hash (?v=<16 hex>, scripts/kart/pack-assets.mjs) never change under
// that URL: the browser may keep them for a year without asking again. Everything else is revalidated (ETag → 304).
export const IMMUTABLE_CACHE='private, max-age=31536000, immutable',REVALIDATE_CACHE='private, no-cache';
export function assetCacheControl(url){
  return url.pathname.startsWith('/kart/assets/')&&/^[0-9a-f]{16}$/.test(url.searchParams.get('v')??'')?IMMUTABLE_CACHE:REVALIDATE_CACHE;
}

// The globe (/globe/) streams imagery, terrain and optionally Google Photorealistic 3D Tiles from these hosts,
// decodes Draco meshes with WebAssembly in Cesium's workers (started from blob: URLs), and must send its origin as Referer so a Google
// browser key restricted to https://world.ourark.io/* is accepted. Everything else stays as strict as above.
export const GLOBE_HOSTS=['https://server.arcgisonline.com','https://terrain.reearth.land','https://tile.googleapis.com'];
export const GLOBE_CONTENT_SECURITY_POLICY=["default-src 'self'","script-src 'self' 'wasm-unsafe-eval' blob:","style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${GLOBE_HOSTS.join(' ')}`,`connect-src 'self' data: blob: ${GLOBE_HOSTS.join(' ')}`,"worker-src 'self' blob:",
  "font-src 'self'","object-src 'none'","base-uri 'none'","form-action 'none'","frame-ancestors 'none'"].join('; ');
/** Security headers for a path: the strict default, with the globe's exceptions under /globe/. */
export function securityHeadersFor(pathname=''){
  if(!pathname.startsWith('/globe/'))return SECURITY_HEADERS;
  return Object.freeze({...SECURITY_HEADERS,'Content-Security-Policy':GLOBE_CONTENT_SECURITY_POLICY,'Referrer-Policy':'strict-origin-when-cross-origin'});
}

// null = no Authorization header (not an attempt); '' = unusable header (a failed attempt); else "user:password".
export function readCredentials(header){
  if(header==null)return null;
  const match=/^basic\s+([A-Za-z0-9+/=]+)\s*$/i.exec(header);
  if(!match)return '';
  try{return new TextDecoder().decode(Uint8Array.from(atob(match[1]),c=>c.charCodeAt(0)));}catch{return '';}
}

// Compares fixed-length SHA-256 digests without an early exit, so neither content nor length leaks through timing.
export async function sameSecret(given,expected){
  const digest=async value=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
  const [a,b]=await Promise.all([digest(given),digest(expected)]);
  let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];
  return difference===0;
}

// HMAC fingerprint of a wrong credential, keyed with the current password: the guard can tell guesses apart
// without ever holding a password or an offline-crackable plain hash.
export async function fingerprint(secret,value){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const mac=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)));
  return [...mac.slice(0,16)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

// Guard key: IPv4 as is (also IPv4-mapped IPv6), IPv6 by its /64 prefix (one subscriber usually owns a
// whole /64). Anything malformed becomes 'unknown' instead of throwing.
export function clientKey(ip){
  if(!ip)return 'unknown';
  if(/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip))return ip;
  const mapped=/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);if(mapped)return mapped[1];
  const parts=ip.split('::');if(parts.length>2)return 'unknown';
  const split=part=>part?part.split(':'):[],left=split(parts[0]),right=parts.length===2?split(parts[1]):[];
  const missing=8-left.length-right.length;
  if(parts.length===2?missing<1:missing!==0)return 'unknown';
  const groups=[...left,...Array(parts.length===2?missing:0).fill('0'),...right];
  if(!groups.every(group=>/^[0-9a-f]{1,4}$/i.test(group)))return 'unknown';
  return groups.slice(0,4).map(group=>group.toLowerCase().replace(/^0+(?=.)/,'')).join(':')+'::/64';
}
