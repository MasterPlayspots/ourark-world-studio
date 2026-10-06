// Device check (W8, A2): does the adaptive resolution hold 60 fps on this device? The walk runs on the source
// camera path (the same load on every device): first a warm-up so the resolution can settle, then a measured
// window. The summary is pure; deviceInfo() reads the browser.
export const DEVICE_CHECK_FORMAT='motionspec.device-check.v1';
export const CHECK=Object.freeze({seconds:20,warmupShare:.4});
// A2: mean ≥ 57 fps (60 Hz with a little slack) and 95 % of the frames within 20 ms.
export const A2=Object.freeze({fps:57,p95:20});

const percentile=(sorted,q)=>sorted.length?sorted[Math.min(sorted.length-1,Math.floor(sorted.length*q))]:0;
const round=(v,d=2)=>Math.round(v*10**d)/10**d;

// frames: frame intervals in ms of the measured window; scales: render scale per frame (whole run).
export function summarize(frames,scales){
  const sorted=[...frames].sort((a,b)=>a-b),mean=frames.length?frames.reduce((a,b)=>a+b,0)/frames.length:0;
  const fps=mean?1000/mean:0,p95=percentile(sorted,.95);
  return {
    frames:frames.length,fpsMean:round(fps,1),frameP50:round(percentile(sorted,.5)),frameP95:round(p95),frameP99:round(percentile(sorted,.99)),
    slowShare:round(frames.filter(ms=>ms>20).length/Math.max(1,frames.length),4),
    // The shortest steady interval tells the display rate (60, 90, 120 Hz).
    refreshHz:sorted.length?Math.round(1000/percentile(sorted,.1)):0,
    scaleStart:scales[0]??null,scaleEnd:scales.at(-1)??null,scaleMin:scales.length?Math.min(...scales):null,
    a2:frames.length>60&&fps>=A2.fps&&p95<=A2.p95
  };
}

export function deviceInfo(canvas){
  const gl=canvas?.getContext('webgl2'),debug=gl?.getExtension('WEBGL_debug_renderer_info');
  return {
    userAgent:navigator.userAgent.slice(0,300),platform:(navigator.userAgentData?.platform??navigator.platform??'').slice(0,60),
    mobile:navigator.userAgentData?.mobile??/Mobi|Android|iPhone|iPad/.test(navigator.userAgent),
    gpu:debug?String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)).slice(0,200):null,
    cores:navigator.hardwareConcurrency??null,memoryGB:navigator.deviceMemory??null,touchPoints:navigator.maxTouchPoints??0,
    devicePixelRatio:globalThis.devicePixelRatio??1,screen:`${screen.width}x${screen.height}`,viewport:`${innerWidth}x${innerHeight}`,
    canvas:canvas?`${canvas.width}x${canvas.height}`:null
  };
}

// Plain-text version for copying (and for when storing is not possible).
export function reportText(report){
  const r=report.result,d=report.device;
  return [`MotionSpec device check · ${report.time}`,`Scene ${report.scene.slice(0,12)}… · ${report.seconds} s (${report.warmup} s warm-up)`,
    `Device: ${d.platform}${d.mobile?' (mobile)':''} · ${d.gpu??'GPU unknown'} · ${d.cores??'?'} cores · DPR ${d.devicePixelRatio} · screen ${d.screen} · canvas ${d.canvas}`,
    `Result: ${r.fpsMean} fps · p50 ${r.frameP50} ms · p95 ${r.frameP95} ms · p99 ${r.frameP99} ms · ${Math.round(r.slowShare*1000)/10} % > 20 ms · ~${r.refreshHz} Hz`,
    `Resolution scale: start ${r.scaleStart} → end ${r.scaleEnd} (min ${r.scaleMin})`,
    `Errors: ${report.errors.length?report.errors.join(' | '):'none'}`,
    `A2 (≥ ${A2.fps} fps, p95 ≤ ${A2.p95} ms): ${r.a2?'PASS':'FAIL'}`,`UA: ${d.userAgent}`].join('\n');
}
