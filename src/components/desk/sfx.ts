"use client";

/**
 * Sonidos del escritorio sintetizados con Web Audio: sin ficheros que descargar ni derechos que pagar.
 * El contexto se crea en el primer clic (los navegadores no dejan sonar nada antes de un gesto).
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return { ac: ctx, out: master as GainNode };
}

function noiseBuffer(ac: AudioContext, seconds: number) {
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * seconds), ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
  return buf;
}

function play(buf: AudioBuffer, gain: number, filter?: BiquadFilterNode) {
  const { ac, out } = audio();
  const src = ac.createBufferSource();
  src.buffer = buf;
  const g = ac.createGain();
  g.gain.value = gain;
  if (filter) {
    src.connect(filter);
    filter.connect(g);
  } else src.connect(g);
  g.connect(out);
  src.start();
}

// Progresión de fogata en posiciones abiertas, notas de cada cuerda que suena de grave a agudo
const PROGRESSION = [
  [82.41, 123.47, 164.81, 196.0, 246.94, 329.63], // Mi m
  [130.81, 164.81, 196.0, 261.63, 329.63], // Do
  [98.0, 123.47, 146.83, 196.0, 246.94, 392.0], // Sol
  [146.83, 220.0, 293.66, 369.99], // Re
  [110.0, 164.81, 220.0, 261.63, 329.63], // La m
];
const chords: (AudioBuffer | null)[] = PROGRESSION.map(() => null);
let step = 0;
let lastStrum = -10;
let ringing: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

function chordBuffer(ac: AudioContext, notes: number[]) {
  const sr = ac.sampleRate;
  const len = Math.ceil(sr * 3);
  const buf = ac.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  notes.forEach((f, s) => {
    const period = Math.round(sr / f);
    const ring = new Float32Array(period);
    for (let i = 0; i < period; i += 1) ring[i] = Math.random() * 2 - 1;
    const start = Math.round(sr * 0.022 * s);
    for (let i = 0, p = 0; start + i < len; i += 1) {
      const next = (p + 1) % period;
      const v = ring[p];
      ring[p] = 0.997 * 0.5 * (v + ring[next]);
      d[start + i] += v * 0.22;
      p = next;
    }
  });
  return buf;
}

/**
 * Rasgueo de acústica (Karplus-Strong por cuerda, de grave a agudo con el retraso de la púa). Varios clics
 * seguidos recorren la progresión Mi m, Do, Sol, Re, La m; tras una pausa vuelve a empezar.
 */
export function strum() {
  const { ac, out } = audio();
  const now = ac.currentTime;
  step = now - lastStrum > 4 ? 0 : (step + 1) % PROGRESSION.length;
  lastStrum = now;
  const buf = (chords[step] ??= chordBuffer(ac, PROGRESSION[step]));
  // La mano que rasguea apaga lo que sonaba antes
  if (ringing) {
    ringing.gain.gain.setTargetAtTime(0, now, 0.03);
    ringing.src.stop(now + 0.2);
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const body = ac.createBiquadFilter();
  body.type = "lowpass";
  body.frequency.value = 3200;
  const gain = ac.createGain();
  gain.gain.value = 0.9;
  src.connect(body);
  body.connect(gain);
  gain.connect(out);
  src.start();
  ringing = { src, gain };
}

/** Clic seco de un botón de ratón. */
export function click() {
  const { ac } = audio();
  const f = ac.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 2500;
  const buf = noiseBuffer(ac, 0.012);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i += 1) d[i] *= 1 - i / d.length;
  play(buf, 0.5, f);
}

/** Taza de gres que se posa en el corcho: golpe sordo con un poco de timbre cerámico. */
export function clink() {
  const { ac, out } = audio();
  const t = ac.currentTime;
  for (const [f, peak, dur] of [
    [1850, 0.05, 0.25],
    [2730, 0.025, 0.18],
    [180, 0.12, 0.08],
  ] as const) {
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}

/** Vibración del mando: un zumbido grave con trémolo que se apaga. */
export function rumble() {
  const { ac, out } = audio();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = "square";
  osc.frequency.value = 52;
  const lfo = ac.createOscillator();
  lfo.frequency.value = 28;
  const lfoGain = ac.createGain();
  lfoGain.gain.value = 0.04;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.08, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 220;
  lfo.connect(lfoGain);
  lfoGain.connect(g.gain);
  osc.connect(lp);
  lp.connect(g);
  g.connect(out);
  osc.start(t);
  lfo.start(t);
  osc.stop(t + 0.6);
  lfo.stop(t + 0.6);
}

/** Soplido corto: ruido filtrado que sube y cae. */
export function blow() {
  const { ac } = audio();
  const f = ac.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 900;
  f.Q.value = 0.7;
  const buf = noiseBuffer(ac, 0.35);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i += 1) d[i] *= Math.sin((Math.PI * i) / d.length) ** 2;
  play(buf, 0.35, f);
}

/** Chisporroteo eléctrico del neón al fallar. */
export function zap() {
  const { ac } = audio();
  const f = ac.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 3800;
  f.Q.value = 2;
  const buf = noiseBuffer(ac, 0.5);
  const d = buf.getChannelData(0);
  const sr = ac.sampleRate;
  for (let i = 0; i < d.length; i += 1) {
    const burst = Math.sin(Math.floor((i / sr) * 22) * 91.7) > 0.2 ? 1 : 0.05;
    d[i] *= burst * (1 - i / d.length) + 0.15 * Math.sin((i / sr) * Math.PI * 2 * 100);
  }
  play(buf, 0.25, f);
}

/** Tic-tac rápido mientras las agujas del reloj dan vueltas. */
export function ticks(count: number, seconds: number) {
  const { ac, out } = audio();
  const buf = noiseBuffer(ac, 0.006);
  for (let i = 0; i < count; i += 1) {
    // Se frenan como las agujas: los tics se espacian al final
    const at = ac.currentTime + seconds * (1 - Math.sqrt(1 - i / count));
    const src = ac.createBufferSource();
    src.buffer = buf;
    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 4000;
    const g = ac.createGain();
    g.gain.value = 0.25;
    src.connect(hp);
    hp.connect(g);
    g.connect(out);
    src.start(at);
  }
}

// Jazz de estudio: ii-V-I en Do con vuelta por La7, a tempo lento y con corcheas swing
const BPM = 76;
const BAR_CHORDS = [
  { keys: [174.61, 220, 261.63, 329.63], bass: [73.42, 87.31, 110, 103.83] }, // Rem9
  { keys: [174.61, 246.94, 329.63, 440], bass: [98, 123.47, 146.83, 69.3] }, // Sol13
  { keys: [164.81, 196, 246.94, 293.66], bass: [65.41, 82.41, 98, 116.54] }, // Do maj9
  { keys: [196, 277.18, 349.23, 392], bass: [110, 138.59, 164.81, 155.56] }, // La7(b13)
];

/**
 * Jazz suave para estudiar: piano eléctrico que acompaña a contratiempo, contrabajo caminando,
 * escobillas y ride, y alguna nota suelta de vibráfono. Todo sintetizado y con un programador
 * que va encolando compases por delante. Devuelve la función que la para con un fundido.
 */
export function startAmbient() {
  const { ac, out } = audio();
  const bus = ac.createGain();
  bus.gain.setValueAtTime(0.0001, ac.currentTime);
  bus.gain.exponentialRampToValueAtTime(0.5, ac.currentTime + 1.5);
  const warm = ac.createBiquadFilter();
  warm.type = "lowpass";
  warm.frequency.value = 4200;
  bus.connect(warm);
  warm.connect(out);
  const brushBuf = noiseBuffer(ac, 0.4);

  const tone = (freq: number, at: number, dur: number, peak: number, type: OscillatorType, cutoff = 0) => {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    if (cutoff) {
      const f = ac.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = cutoff;
      o.connect(f);
      f.connect(g);
    } else o.connect(g);
    g.connect(bus);
    o.start(at);
    o.stop(at + dur + 0.05);
  };
  // Piano eléctrico: fundamental redonda y un parcial de campana que se apaga antes
  const rhodes = (freq: number, at: number, peak: number) => {
    tone(freq, at, 1.8, peak, "sine");
    tone(freq * 2, at, 0.5, peak * 0.25, "sine");
    tone(freq * 4.02, at, 0.12, peak * 0.06, "sine");
  };
  const brush = (at: number, peak: number, dur: number, freq: number) => {
    const src = ac.createBufferSource();
    src.buffer = brushBuf;
    const f = ac.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = 0.8;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f);
    f.connect(g);
    g.connect(bus);
    src.start(at);
    src.stop(at + dur + 0.05);
  };

  const beat = 60 / BPM;
  const swing = beat * (2 / 3);
  let next = ac.currentTime + 0.15;
  let bar = 0;
  const queueBar = (t0: number) => {
    const { keys, bass } = BAR_CHORDS[bar % BAR_CHORDS.length];
    for (let b = 0; b < 4; b += 1) {
      const t = t0 + b * beat;
      tone(bass[b], t, beat * 0.95, 0.32, "triangle", 420);
      // Ride: negra en cada pulso y la corchea swing antes del 2 y el 4
      brush(t, 0.05, 0.25, 7000);
      if (b === 1 || b === 3) {
        brush(t - beat + swing, 0.03, 0.12, 7500);
        brush(t, 0.07, 0.3, 2200);
      }
    }
    // Acordes a contratiempo: en el «y» del 2 y, a veces, en el 4
    const comp = (at: number, peak: number) => keys.forEach((f, i) => rhodes(f, at + i * 0.012, peak));
    comp(t0 + beat + swing, 0.045);
    if (Math.random() < 0.6) comp(t0 + 3 * beat, 0.035);
    // Vibráfono: dos o tres notas del acorde una octava arriba en corcheas swing al azar
    for (let k = 0; k < 8; k += 1) {
      if (Math.random() > 0.28) continue;
      const at = t0 + Math.floor(k / 2) * beat + (k % 2 ? swing : 0);
      tone(keys[Math.floor(Math.random() * keys.length)] * 2, at, 1.4, 0.05, "sine");
    }
    bar += 1;
  };
  const pump = () => {
    while (next < ac.currentTime + 1.2) {
      queueBar(next);
      next += beat * 4;
    }
  };
  pump();
  const timer = window.setInterval(pump, 300);

  return () => {
    window.clearInterval(timer);
    const t = ac.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), t);
    bus.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    window.setTimeout(() => {
      bus.disconnect();
      warm.disconnect();
    }, 2600);
  };
}
