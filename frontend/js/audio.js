/* global Tone */
import { getDurationWeights } from "./settings.js";

export const SCALES = {
  pentatonic: ["C", "D", "E", "G", "A"],
  dorian: ["C", "D", "Eb", "F", "G", "A", "Bb"],
  mixolydian: ["C", "D", "E", "F", "G", "A", "Bb"],
};

const SYNTH_CONFIGS = {
  am: {
    voice: Tone.AMSynth,
    options: {
      harmonicity: 2,
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0.25, release: 1.5 },
      modulation: { type: "sine" },
      modulationEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.8 },
    },
  },
  fm: {
    voice: Tone.FMSynth,
    options: {
      harmonicity: 3,
      modulationIndex: 10,
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.4, sustain: 0.25, release: 2 },
      modulation: { type: "square" },
      modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.15, release: 0.5 },
    },
  },
  triangle: {
    voice: Tone.Synth,
    options: {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.4, sustain: 0.25, release: 1.2 },
    },
  },
  sine: {
    voice: Tone.Synth,
    options: {
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.25, release: 1 },
    },
  },
};

let synths = new Map();
let reverb;
let volume;
let compressor;
let limiter;
let initialized = false;
let initPromise = null;

export async function initAudio() {
  await Tone.start();
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      limiter = new Tone.Limiter(-1).toDestination();
      compressor = new Tone.Compressor({
        threshold: -18,
        ratio: 3,
        attack: 0.003,
        release: 0.25,
      }).connect(limiter);
      reverb = new Tone.Reverb({ decay: 3, wet: 0.35 }).connect(compressor);
      volume = new Tone.Volume(-8).connect(reverb);
      initialized = true;
    })();
  }
  try {
    await initPromise;
  } finally {
    initPromise = null;
  }
}

export function setVolume(db) {
  if (volume) volume.volume.value = db;
}

export function setReverbWet(wet) {
  if (reverb) reverb.wet.value = wet;
}

export function setMuted(muted) {
  Tone.Destination.mute = muted;
}

export function isMuted() {
  return Tone.Destination.mute;
}

function getOrCreateSynth(routeId, synthType) {
  if (!synths.has(routeId)) {
    const config = SYNTH_CONFIGS[synthType] || SYNTH_CONFIGS.sine;
    const synth = new Tone.PolySynth(config.voice, config.options);
    synth.maxPolyphony = 3;
    synth.connect(volume);
    synths.set(routeId, synth);
  }
  return synths.get(routeId);
}

function pickDuration() {
  const weights = getDurationWeights();
  const total = weights.reduce((s, w) => s + w[1], 0);
  if (total <= 0) return 0.15;
  let r = Math.random() * total;
  for (const [dur, weight] of weights) {
    r -= weight;
    if (r <= 0) return dur;
  }
  return weights[0][0];
}

export function playNote(routeId, stopSequence, synthType, scaleName) {
  if (!initialized) return;

  const scale = SCALES[scaleName] || SCALES.pentatonic;
  const baseOctave = 3;
  const noteIndex = stopSequence % scale.length;
  const octaveOffset = Math.floor(stopSequence / scale.length) % 3;
  const note = `${scale[noteIndex]}${baseOctave + octaveOffset}`;

  const duration = pickDuration();
  const velocity = duration > 1 ? 0.25 + Math.random() * 0.1 : 0.3 + Math.random() * 0.15;

  if (duration >= 1.2) {
    console.log(`♬ HELD note: ${note} (${duration.toFixed(1)}s) on ${routeId}`);
  }

  try {
    const synth = getOrCreateSynth(routeId, synthType);
    synth.triggerAttackRelease(note, duration, Tone.now(), velocity);
  } catch {
    // synth disposed mid-transition — ignore
  }
}

export function disposeSynths() {
  const old = synths;
  synths = new Map();
  setTimeout(() => {
    for (const s of old.values()) {
      try { s.releaseAll(); } catch {}
    }
    setTimeout(() => {
      for (const s of old.values()) {
        try { s.dispose(); } catch {}
      }
    }, 2000);
  }, 100);
}
