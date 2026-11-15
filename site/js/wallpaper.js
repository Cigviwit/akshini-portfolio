// A slow, warm, domain-warped gradient. Half-resolution WebGL with a CSS fallback.
export const WALLPAPERS = {
  chai:    { name: 'Chai',    dark: false, colors: ['#F5EDE2', '#F2C9A2', '#E59466', '#D3D8C4'], css: 'radial-gradient(80% 70% at 85% 15%, #F2C9A2 0%, transparent 60%), radial-gradient(70% 60% at 10% 90%, #E59466aa 0%, transparent 60%), radial-gradient(60% 60% at 70% 90%, #D3D8C4 0%, transparent 60%), #F5EDE2' },
  monsoon: { name: 'Monsoon', dark: false, colors: ['#ECEFEC', '#BCD0CD', '#DCD3C1', '#93AEB8'], css: 'radial-gradient(80% 70% at 85% 15%, #BCD0CD 0%, transparent 60%), radial-gradient(70% 60% at 10% 90%, #93AEB8aa 0%, transparent 60%), radial-gradient(60% 60% at 70% 90%, #DCD3C1 0%, transparent 60%), #ECEFEC' },
  dusk:    { name: 'Dusk',    dark: true,  colors: ['#15110E', '#4A2516', '#1C2B2A', '#8A3D1F'], css: 'radial-gradient(80% 70% at 85% 15%, #4A2516 0%, transparent 60%), radial-gradient(70% 60% at 10% 90%, #8A3D1F88 0%, transparent 60%), radial-gradient(60% 60% at 70% 90%, #1C2B2A 0%, transparent 60%), #15110E' },
};

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FRAG = `precision mediump float;
uniform vec2 r;uniform float t;uniform vec3 c0,c1,c2,c3;uniform vec2 m;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p*=2.02;a*=.5;}return v;}
void main(){
 vec2 uv=gl_FragCoord.xy/r;vec2 p=uv*vec2(r.x/r.y,1.)*1.6;
 float s=t*.035;
 vec2 q=vec2(fbm(p+s),fbm(p+vec2(5.2,1.3)-s));
 vec2 w=vec2(fbm(p+3.*q+vec2(1.7,9.2)+s*1.3),fbm(p+3.*q+vec2(8.3,2.8)-s));
 w+= (m-.5)*.06;
 float f=fbm(p+2.4*w);
 vec3 col=mix(c0,c1,smoothstep(.15,.85,f));
 col=mix(col,c2,smoothstep(.45,1.,w.x)*.75);
 col=mix(col,c3,smoothstep(.5,1.,w.y)*.65);
 col=mix(col,c0,smoothstep(.3,1.,1.-uv.y)*.12);
 float g=h(gl_FragCoord.xy+fract(t)*91.)-.5;
 col+=g*.035;
 float v=smoothstep(1.25,.35,length(uv-.5));
 col*=mix(.94,1.,v);
 gl_FragColor=vec4(col,1.);}`;

const hex = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

export function mountWallpaper(canvas, fallbackEl) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let gl = null;
  try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false }); } catch { gl = null; }
  let current = WALLPAPERS.chai;
  let target = null, blend = 1, from = null;
  const state = { mx: .5, my: .5, tmx: .5, tmy: .5 };

  const setFallback = (wp) => { fallbackEl.style.background = wp.css; };
  if (!gl) {
    canvas.remove();
    return { set(id) { current = WALLPAPERS[id] || current; setFallback(current); }, get: () => current };
  }

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    canvas.remove();
    return { set(id) { current = WALLPAPERS[id] || current; setFallback(current); }, get: () => current };
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['r', 't', 'c0', 'c1', 'c2', 'c3', 'm'].forEach(k => U[k] = gl.getUniformLocation(prog, k));

  const scale = 0.5;
  const resize = () => {
    const w = Math.max(2, Math.round(innerWidth * scale)), h = Math.max(2, Math.round(innerHeight * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  };
  resize();
  addEventListener('resize', () => { resize(); if (reduce) draw(performance.now()); });
  addEventListener('pointermove', (e) => { state.tmx = e.clientX / innerWidth; state.tmy = 1 - e.clientY / innerHeight; }, { passive: true });

  const colorsFor = () => {
    const a = (from || current).colors.map(hex), b = current.colors.map(hex);
    const k = blend * blend * (3 - 2 * blend);
    return a.map((c, i) => c.map((v, j) => v + (b[i][j] - v) * k));
  };

  const t0 = performance.now();
  let last = 0, raf = 0, running = true;
  function draw(now) {
    const t = (now - t0) / 1000;
    state.mx += (state.tmx - state.mx) * 0.03; state.my += (state.tmy - state.my) * 0.03;
    if (blend < 1) blend = Math.min(1, blend + 0.025);
    const cs = colorsFor();
    gl.uniform2f(U.r, canvas.width, canvas.height);
    gl.uniform1f(U.t, reduce ? 12 : t);
    gl.uniform3fv(U.c0, cs[0]); gl.uniform3fv(U.c1, cs[1]); gl.uniform3fv(U.c2, cs[2]); gl.uniform3fv(U.c3, cs[3]);
    gl.uniform2f(U.m, state.mx, state.my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (now - last < 1000 / 30) return; // 30 fps is plenty for a drift
    last = now; draw(now);
  }
  const start = () => { if (!running) return; cancelAnimationFrame(raf); if (reduce) { draw(performance.now()); } else raf = requestAnimationFrame(loop); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else start(); });
  setFallback(current);
  start();

  return {
    set(id, instant = false) {
      const wp = WALLPAPERS[id]; if (!wp || wp === current) return;
      from = current; current = wp; blend = 0; setFallback(wp);
      if (reduce || instant) { blend = 1; from = null; draw(performance.now()); }
    },
    get: () => current,
  };
}
