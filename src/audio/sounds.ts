// Procedural sounds. Everything is synthesised with the Web Audio API from noise
// and oscillators: no recordings, so no licensing questions and nothing to
// download. Randomised timing keeps ambience from ever sounding like a loop.

export type Voice = {
  // The voice's own level; connect it to a bus.
  output: GainNode;
  // Extra controllable parameters (e.g. the AI Core's "thinking" level).
  params: Record<string, AudioParam>;
  stop: () => void;
};

type NoiseKind = "white" | "pink" | "brown";

const NOISE_SECONDS = 4;
const CROSSFADE = 2048;
const noiseCache = new WeakMap<BaseAudioContext, Map<NoiseKind, AudioBuffer>>();

// Looping noise buffer. The tail is crossfaded into the head so the loop point
// is seamless (brown noise would otherwise click where it wraps).
function noiseBuffer(ctx: BaseAudioContext, kind: NoiseKind) {
  let byKind = noiseCache.get(ctx);
  if (!byKind) noiseCache.set(ctx, (byKind = new Map()));
  const cached = byKind.get(kind);
  if (cached) return cached;

  const length = Math.floor(ctx.sampleRate * NOISE_SECONDS);
  const raw = new Float32Array(length + CROSSFADE);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < raw.length; i++) {
    const white = Math.random() * 2 - 1;
    if (kind === "white") {
      raw[i] = white * 0.5;
    } else if (kind === "pink") {
      // Paul Kellet's refined pink filter.
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    } else {
      last = (last + 0.02 * white) / 1.02;
      raw[i] = last * 3.5;
    }
  }
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  data.set(raw.subarray(0, length));
  for (let i = 0; i < CROSSFADE; i++) {
    const t = i / CROSSFADE;
    data[i] = raw[i] * t + raw[length + i] * (1 - t);
  }
  byKind.set(kind, buffer);
  return buffer;
}

function noise(ctx: BaseAudioContext, kind: NoiseKind, rate = 1) {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, kind);
  source.loop = true;
  source.playbackRate.value = rate;
  source.start(0, Math.random() * NOISE_SECONDS);
  return source;
}

// Slow modulator added onto an AudioParam (its base value is set separately).
function lfo(ctx: BaseAudioContext, frequency: number, depth: number, target: AudioParam, type: OscillatorType = "sine") {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = frequency;
  const amount = ctx.createGain();
  amount.gain.value = depth;
  osc.connect(amount).connect(target);
  osc.start();
  return osc;
}

function filter(ctx: BaseAudioContext, type: BiquadFilterType, frequency: number, q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = q;
  return f;
}

function gain(ctx: BaseAudioContext, value: number) {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

// Builds a voice from sources plus optional randomly-timed events. Everything is
// stopped and disconnected together.
function voice(
  ctx: AudioContext,
  build: (out: GainNode) => { sources: AudioScheduledSourceNode[]; params?: Record<string, AudioParam> },
  events?: { every: [number, number]; fire: (out: GainNode) => void },
): Voice {
  const output = gain(ctx, 0);
  const { sources, params = {} } = build(output);
  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (!events) return;
    timer = setTimeout(() => {
      try {
        events.fire(output);
      } catch {
        // A failed event is skipped; the voice carries on.
      }
      schedule();
    }, rand(events.every[0], events.every[1]) * 1000);
  };
  schedule();
  return {
    output,
    params,
    stop: () => {
      if (timer) clearTimeout(timer);
      for (const s of sources) {
        try {
          s.stop();
        } catch {
          // Already stopped.
        }
      }
      output.disconnect();
    },
  };
}

// A short enveloped tone, used by chirps, blips and chimes.
function tone(ctx: AudioContext, out: AudioNode, at: number, options: { from: number; to?: number; length: number; level: number; type?: OscillatorType; pan?: number }) {
  const osc = ctx.createOscillator();
  osc.type = options.type ?? "sine";
  osc.frequency.setValueAtTime(options.from, at);
  if (options.to) osc.frequency.exponentialRampToValueAtTime(options.to, at + options.length);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(options.level, at + Math.min(0.012, options.length / 4));
  env.gain.exponentialRampToValueAtTime(0.0001, at + options.length);
  let node: AudioNode = osc.connect(env);
  if (options.pan) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = options.pan;
    node = node.connect(panner);
  }
  node.connect(out);
  osc.start(at);
  osc.stop(at + options.length + 0.05);
}

// ── Ambience ────────────────────────────────────────────────────────────────

// Meadow bed: soft wind that slowly breathes, a little high air, a distant low
// rumble, and now and then a bird somewhere off to one side.
export function meadow(ctx: AudioContext): Voice {
  return voice(
    ctx,
    (out) => {
      const wind = noise(ctx, "brown");
      const windFilter = filter(ctx, "lowpass", 420, 0.5);
      const windLevel = gain(ctx, 0.5);
      wind.connect(windFilter).connect(windLevel).connect(out);

      const air = noise(ctx, "pink");
      const airLevel = gain(ctx, 0.045);
      air.connect(filter(ctx, "bandpass", 2600, 0.6)).connect(airLevel).connect(out);

      const far = noise(ctx, "brown", 0.5);
      far.connect(filter(ctx, "lowpass", 160)).connect(gain(ctx, 0.22)).connect(out);

      return {
        sources: [
          wind,
          air,
          far,
          lfo(ctx, 0.061, 220, windFilter.frequency),
          lfo(ctx, 0.093, 0.2, windLevel.gain),
          lfo(ctx, 0.137, 0.025, airLevel.gain),
        ],
      };
    },
    {
      every: [5, 16],
      fire: (out) => {
        // A short phrase of two to four rising-then-falling chirps.
        const at = ctx.currentTime + 0.05;
        const pan = rand(-0.8, 0.8);
        const base = rand(2600, 3900);
        const notes = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < notes; i++) {
          const start = at + i * rand(0.11, 0.18);
          tone(ctx, out, start, { from: base * rand(0.9, 1.1), to: base * rand(1.15, 1.35), length: rand(0.05, 0.09), level: 0.035, pan });
        }
      },
    },
  );
}

// ── Zone voices ─────────────────────────────────────────────────────────────

// About: a low fire roar with irregular crackles and pops.
export function campfire(ctx: AudioContext): Voice {
  return voice(
    ctx,
    (out) => {
      const roar = noise(ctx, "brown");
      const roarLevel = gain(ctx, 0.35);
      roar.connect(filter(ctx, "bandpass", 650, 0.6)).connect(roarLevel).connect(out);
      return { sources: [roar, lfo(ctx, 0.7, 0.08, roarLevel.gain)] };
    },
    {
      every: [0.03, 0.22],
      fire: (out) => {
        const at = ctx.currentTime + 0.01;
        const crack = ctx.createBufferSource();
        crack.buffer = noiseBuffer(ctx, "white");
        const env = ctx.createGain();
        const length = rand(0.006, 0.03);
        env.gain.setValueAtTime(rand(0.15, 0.6), at);
        env.gain.exponentialRampToValueAtTime(0.0001, at + length);
        crack.connect(filter(ctx, "highpass", rand(1400, 3200))).connect(env).connect(out);
        crack.start(at, Math.random() * NOISE_SECONDS, length + 0.01);
      },
    },
  );
}

// Contact: sea wash swelling on the shore, and a faint wind whistle.
export function shore(ctx: AudioContext): Voice {
  return voice(ctx, (out) => {
    const sea = noise(ctx, "pink");
    const swell = gain(ctx, 0.35);
    sea.connect(filter(ctx, "lowpass", 750)).connect(swell).connect(out);
    const whistle = noise(ctx, "brown");
    const whistleFilter = filter(ctx, "bandpass", 900, 9);
    whistle.connect(whistleFilter).connect(gain(ctx, 0.12)).connect(out);
    return {
      sources: [sea, whistle, lfo(ctx, 0.075, 0.3, swell.gain), lfo(ctx, 0.047, 260, whistleFilter.frequency)],
    };
  });
}

// Projects: a soft two-tone machine hum with an occasional quiet data blip.
export function workshop(ctx: AudioContext): Voice {
  return voice(
    ctx,
    (out) => {
      const low = filter(ctx, "lowpass", 600);
      low.connect(out);
      const a = ctx.createOscillator();
      a.frequency.value = 98;
      a.connect(gain(ctx, 0.12)).connect(low);
      const b = ctx.createOscillator();
      b.frequency.value = 196.7;
      b.connect(gain(ctx, 0.05)).connect(low);
      a.start();
      b.start();
      return { sources: [a, b] };
    },
    {
      every: [3.5, 8],
      fire: (out) => {
        const at = ctx.currentTime + 0.02;
        const notes = [1046.5, 1318.5, 1568];
        for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
          tone(ctx, out, at + i * 0.09, { from: notes[Math.floor(Math.random() * 3)], length: 0.06, level: 0.025, type: "triangle" });
        }
      },
    },
  );
}

// Skills: high partials that drift in and out on their own slow cycles.
export function crystals(ctx: AudioContext): Voice {
  return voice(ctx, (out) => {
    const sources: AudioScheduledSourceNode[] = [];
    [
      [1568, 0.071],
      [2093 * 1.003, 0.113],
      [2637, 0.167],
    ].forEach(([frequency, rate]) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = frequency;
      const level = gain(ctx, 0.02);
      osc.connect(level).connect(out);
      osc.start();
      sources.push(osc, lfo(ctx, rate, 0.02, level.gain));
    });
    return { sources };
  });
}

// Experience: banners fluttering on the path, irregular and quiet.
export function banners(ctx: AudioContext): Voice {
  return voice(ctx, (out) => {
    const cloth = noise(ctx, "pink");
    const flutter = gain(ctx, 0.08);
    cloth.connect(filter(ctx, "bandpass", 520, 1.2)).connect(flutter).connect(out);
    return { sources: [cloth, lfo(ctx, 3.1, 0.05, flutter.gain), lfo(ctx, 5.3, 0.035, flutter.gain)] };
  });
}

// AI Core: a low technological hum, plus a "thinking" layer whose level is
// driven from outside (params.thinking: 0 idle .. 1 working).
export function aiCore(ctx: AudioContext): Voice {
  return voice(ctx, (out) => {
    const body = filter(ctx, "lowpass", 520);
    body.connect(out);
    const base = ctx.createOscillator();
    base.frequency.value = 73.4;
    base.connect(gain(ctx, 0.16)).connect(body);
    const octave = ctx.createOscillator();
    octave.frequency.value = 146.8;
    octave.connect(gain(ctx, 0.06)).connect(body);
    const fifth = ctx.createOscillator();
    fifth.type = "triangle";
    fifth.frequency.value = 220.2;
    fifth.connect(gain(ctx, 0.03)).connect(body);

    // Thinking: a soft tone pulsing a few times a second, faded in and out.
    const thinking = gain(ctx, 0);
    const pulse = gain(ctx, 0.5);
    const think = ctx.createOscillator();
    think.frequency.value = 587.3;
    think.connect(pulse).connect(thinking).connect(out);
    for (const o of [base, octave, fifth, think]) o.start();
    return {
      sources: [base, octave, fifth, think, lfo(ctx, 2.6, 0.5, pulse.gain)],
      params: { thinking: thinking.gain },
    };
  });
}

// ── One-shot effects ────────────────────────────────────────────────────────

// A soft step on sand: a short filtered noise brush plus a faint low thud.
export function footstep(ctx: AudioContext, out: AudioNode, pan: number) {
  const at = ctx.currentTime + 0.005;
  const sand = ctx.createBufferSource();
  sand.buffer = noiseBuffer(ctx, "white");
  sand.playbackRate.value = rand(0.8, 1.15);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(rand(0.28, 0.4), at + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, at + 0.11);
  const panner = ctx.createStereoPanner();
  panner.pan.value = pan;
  sand.connect(filter(ctx, "lowpass", rand(800, 1100))).connect(env).connect(panner).connect(out);
  sand.start(at, Math.random() * NOISE_SECONDS, 0.13);
  tone(ctx, panner, at, { from: 95, to: 60, length: 0.07, level: 0.12 });
}

// Two rising notes: an answer has arrived.
export function chime(ctx: AudioContext, out: AudioNode) {
  const at = ctx.currentTime + 0.02;
  tone(ctx, out, at, { from: 880, length: 0.55, level: 0.09 });
  tone(ctx, out, at + 0.11, { from: 1318.5, length: 0.7, level: 0.08 });
}

// A gentle falling tone: the live guide couldn't answer.
export function failTone(ctx: AudioContext, out: AudioNode) {
  const at = ctx.currentTime + 0.02;
  tone(ctx, out, at, { from: 392, to: 293.7, length: 0.42, level: 0.08, type: "triangle" });
}
