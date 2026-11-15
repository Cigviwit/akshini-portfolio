// Tiny synthesized UI sounds (off by default) and a generative ambient radio.
let ctx = null;
const ac = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());

export const Sound = {
  on: true,
  unlocked: false,
  // Browsers only allow audio after a gesture: the first click or key unlocks it.
  unlock() {
    if (this.unlocked) return;
    try { const c = ac(); if (c.state === 'suspended') c.resume(); this.unlocked = true; } catch { /* no audio */ }
  },
  // A warm, soft startup chord for the moment the OS wakes up.
  chime() {
    if (!this.on) return;
    this.unlock();
    try {
      const c = ac(), t = c.currentTime + .02;
      const out = c.createGain(); out.gain.value = .9; out.connect(c.destination);
      [50, 57, 62, 66, 69, 74].forEach((m, i) => {
        const f = 440 * Math.pow(2, (m - 69) / 12);
        [0, 7].forEach((det, j) => {
          const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
          o.type = j ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = det + (i - 2.5) * 1.5;
          lp.type = 'lowpass'; lp.frequency.setValueAtTime(600, t); lp.frequency.linearRampToValueAtTime(3200, t + .25); lp.frequency.exponentialRampToValueAtTime(900, t + 3);
          const peak = (j ? .018 : .045) * (i < 2 ? 1.1 : .8);
          g.gain.setValueAtTime(0.0001, t + i * .035); g.gain.exponentialRampToValueAtTime(peak, t + i * .035 + .06); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
          o.connect(lp).connect(g).connect(out); o.start(t + i * .035); o.stop(t + 3.8);
        });
      });
    } catch { /* no audio */ }
  },
  play(kind) {
    if (!this.on || !this.unlocked) return;
    try {
      const c = ac(); const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      const map = {
        open: [520, 780, .05, .16], close: [600, 380, .045, .14], click: [1400, 1100, .03, .04],
        pop: [880, 1320, .04, .09], error: [220, 180, .05, .18], send: [440, 1200, .05, .28],
      };
      const [f1, f2, vol, dur] = map[kind] || map.click;
      o.type = 'sine'; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch { /* audio unavailable */ }
  },
};

// ---- Radio: "Chai & Rain", a generative ambient station ----
const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = [[50, 57, 61, 64, 66], [47, 54, 57, 62, 66], [43, 50, 54, 59, 62], [45, 52, 57, 61, 64]]; // Dmaj9 Bm11 Gmaj7 A6/9
const PENTA = [74, 76, 78, 81, 83, 86, 88, 90];

export const Radio = {
  playing: false, volume: 0.7, listeners: new Set(), analyser: null,
  nodes: null, timers: [],
  emit() { this.listeners.forEach(f => f(this)); },
  on(f) { this.listeners.add(f); return () => this.listeners.delete(f); },
  build() {
    const c = ac();
    const master = c.createGain(); master.gain.value = 0;
    const comp = c.createDynamicsCompressor();
    const analyser = c.createAnalyser(); analyser.fftSize = 64; analyser.smoothingTimeConstant = .85;
    master.connect(comp).connect(analyser).connect(c.destination);
    // reverb
    const len = c.sampleRate * 3.2, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    const verb = c.createConvolver(); verb.buffer = ir;
    const wet = c.createGain(); wet.gain.value = .55; verb.connect(wet).connect(master);
    const dry = c.createGain(); dry.gain.value = .5; dry.connect(master);
    // rain
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const rain = c.createBufferSource(); rain.buffer = nb; rain.loop = true;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
    const rg = c.createGain(); rg.gain.value = .045;
    rain.connect(hp).connect(lp).connect(rg).connect(master); rain.start();
    this.nodes = { c, master, verb, dry, rain };
    this.analyser = analyser;
  },
  pad(i) {
    const { c, verb, dry } = this.nodes; const t = c.currentTime;
    CHORDS[i % CHORDS.length].forEach((m, k) => {
      [-4, 4].forEach(det => {
        const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
        o.type = k === 0 ? 'sine' : 'triangle'; o.frequency.value = NOTE(m); o.detune.value = det;
        f.type = 'lowpass'; f.frequency.value = 1100;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(k === 0 ? .05 : .022, t + 2.6); g.gain.linearRampToValueAtTime(0.0001, t + 9.5);
        o.connect(f).connect(g); g.connect(verb); g.connect(dry); o.start(t); o.stop(t + 10);
      });
    });
  },
  pluck() {
    const { c, verb } = this.nodes; const t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain(), p = c.createStereoPanner ? c.createStereoPanner() : null;
    o.type = 'triangle'; o.frequency.value = NOTE(PENTA[Math.floor(Math.random() * PENTA.length)]);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.05, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    if (p) { p.pan.value = Math.random() * 1.4 - .7; o.connect(g).connect(p).connect(verb); } else o.connect(g).connect(verb);
    o.start(t); o.stop(t + 1.7);
  },
  async play() {
    if (this.playing) return;
    const c = ac(); if (c.state === 'suspended') await c.resume();
    if (!this.nodes) this.build();
    const { master } = this.nodes; const t = c.currentTime;
    master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(this.volume, t + 1.5);
    let i = 0; this.pad(i++);
    this.timers.push(setInterval(() => this.pad(i++), 8000));
    const pl = () => { this.pluck(); this.timers.push(setTimeout(pl, 450 + Math.random() * 1400)); };
    this.timers.push(setTimeout(pl, 1200));
    this.playing = true; this.emit();
  },
  pause() {
    if (!this.playing) return;
    this.timers.forEach(t => { clearInterval(t); clearTimeout(t); }); this.timers = [];
    const { c, master } = this.nodes; const t = c.currentTime;
    master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + .6);
    this.playing = false; this.emit();
  },
  toggle() { return this.playing ? this.pause() : this.play(); },
  setVolume(v) {
    this.volume = v;
    if (this.nodes && this.playing) { const { c, master } = this.nodes; master.gain.setTargetAtTime(v, c.currentTime, .1); }
    this.emit();
  },
  levels(n = 16) {
    if (!this.analyser || !this.playing) return new Array(n).fill(0);
    const d = new Uint8Array(this.analyser.frequencyBinCount); this.analyser.getByteFrequencyData(d);
    return Array.from({ length: n }, (_, i) => d[Math.min(d.length - 1, i + 1)] / 255);
  },
};
