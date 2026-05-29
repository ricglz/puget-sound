/* global Tone */
import { getDurationWeights, getProfileSettings } from "./settings.js";

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
  square: {
    voice: Tone.Synth,
    options: {
      oscillator: { type: "square" },
      envelope: { attack: 0.005, decay: 0.25, sustain: 0.15, release: 0.8 },
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

const FAMILY_PROFILES = {
  rapidride: {
    synths: ["am", "square"],
    baseOctave: 3,
    octaveSpan: 3,
    transpose: [-2, 0, 2, 5],
    cutoff: 1200,
    panWidth: 0.8,
    durationScale: 0.85,
    velocityScale: 1,
    maxPolyphony: 3,
  },
  local: {
    synths: ["triangle", "sine", "square"],
    baseOctave: 3,
    octaveSpan: 3,
    transpose: [-5, -2, 0, 2, 5],
    cutoff: 900,
    panWidth: 0.7,
    durationScale: 1,
    velocityScale: 0.9,
    maxPolyphony: 2,
  },
  express: {
    synths: ["triangle", "fm"],
    baseOctave: 2,
    octaveSpan: 3,
    transpose: [-7, -2, 0, 5],
    cutoff: 750,
    panWidth: 0.9,
    durationScale: 0.8,
    velocityScale: 0.95,
    maxPolyphony: 2,
  },
  rail: {
    synths: ["fm", "sine"],
    baseOctave: 2,
    octaveSpan: 2,
    transpose: [-12, -5, 0],
    cutoff: 650,
    panWidth: 0.45,
    durationScale: 1.25,
    velocityScale: 0.75,
    maxPolyphony: 2,
  },
  streetcar: {
    synths: ["sine", "triangle"],
    baseOctave: 4,
    octaveSpan: 2,
    transpose: [0, 7, 12],
    cutoff: 1600,
    panWidth: 0.6,
    durationScale: 0.65,
    velocityScale: 0.8,
    maxPolyphony: 2,
  },
};

let voices = new Map();
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

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getRouteFamily(route) {
  const shortName = route.short_name || "";
  if (shortName.includes("Streetcar")) return "streetcar";
  if (["1 Line", "2 Line", "T Line", "N Line", "S Line"].includes(shortName) || route.type === 0 || route.type === 2) {
    return "rail";
  }
  if (/^[A-H] Line$/.test(shortName)) return "rapidride";
  if (/^5\d\d$/.test(shortName)) return "express";
  return "local";
}

function buildRouteProfile(route, presetSynthType) {
  const family = getRouteFamily(route);
  const base = FAMILY_PROFILES[family] || FAMILY_PROFILES.local;
  const hash = hashString(route.route_id || route.short_name || "");
  const { profileIntensity, profileBrightness, stereoWidth } = getProfileSettings();
  const synthTypes = base.synths.length > 0 ? base.synths : [presetSynthType];
  const panRaw = ((hash % 101) / 50) - 1;
  const basePan = panRaw * base.panWidth;
  const baseCutoff = base.cutoff + (hash % 5) * 120;
  const baseTranspose = base.transpose[hash % base.transpose.length];
  const baseScaleOffset = hash % 11;
  return {
    ...base,
    hash,
    synthType: synthTypes[hash % synthTypes.length] || presetSynthType,
    pan: clamp(basePan * stereoWidth, -1, 1),
    cutoff: clamp(baseCutoff * profileBrightness, 300, 3500),
    transposeSemitones: Math.round(baseTranspose * profileIntensity),
    scaleOffset: Math.round(baseScaleOffset * profileIntensity),
    durationScale: 1 + (base.durationScale - 1) * profileIntensity,
    velocityScale: 1 + (base.velocityScale - 1) * profileIntensity,
  };
}

function getOrCreateVoice(route, profile) {
  const routeId = route.route_id;
  if (!voices.has(routeId)) {
    const config = SYNTH_CONFIGS[profile.synthType] || SYNTH_CONFIGS.sine;
    const filter = new Tone.Filter({
      frequency: profile.cutoff,
      type: "lowpass",
      Q: 1,
    });
    const pan = new Tone.Panner(profile.pan);
    const synth = new Tone.PolySynth(config.voice, config.options);
    synth.maxPolyphony = profile.maxPolyphony;
    synth.connect(filter);
    filter.connect(pan);
    pan.connect(volume);
    voices.set(routeId, { synth, filter, pan });
  }
  const voice = voices.get(routeId);
  voice.filter.frequency.value = profile.cutoff;
  voice.pan.pan.value = profile.pan;
  return voice;
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function playNote(route, stopSequence, synthType, scaleName) {
  if (!initialized) return;

  const scale = SCALES[scaleName] || SCALES.pentatonic;
  const profile = buildRouteProfile(route, synthType);
  const noteIndex = (stopSequence + profile.scaleOffset) % scale.length;
  const octaveOffset = Math.floor((stopSequence + profile.scaleOffset) / scale.length) % profile.octaveSpan;
  const baseNote = `${scale[noteIndex]}${profile.baseOctave + octaveOffset}`;
  const note = Tone.Frequency(baseNote).transpose(profile.transposeSemitones).toNote();

  const duration = clamp(pickDuration() * profile.durationScale, 0.08, 3);
  const velocityBase = duration > 1 ? 0.25 + Math.random() * 0.1 : 0.3 + Math.random() * 0.15;
  const velocity = clamp(velocityBase * profile.velocityScale, 0.12, 0.55);

  try {
    const { synth } = getOrCreateVoice(route, profile);
    synth.triggerAttackRelease(note, duration, Tone.now(), velocity);
  } catch {
    // synth disposed mid-transition — ignore
  }
}

export function disposeSynths() {
  const old = voices;
  voices = new Map();
  setTimeout(() => {
    for (const voice of old.values()) {
      try { voice.synth.releaseAll(); } catch {}
    }
    setTimeout(() => {
      for (const voice of old.values()) {
        try { voice.synth.dispose(); } catch {}
        try { voice.filter.dispose(); } catch {}
        try { voice.pan.dispose(); } catch {}
      }
    }, 2000);
  }, 100);
}
