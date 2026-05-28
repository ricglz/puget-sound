/* global Tone */

const SCALES = {
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
      envelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 1.5 },
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
      envelope: { attack: 0.01, decay: 0.4, sustain: 0.1, release: 2 },
      modulation: { type: "square" },
      modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 },
    },
  },
  triangle: {
    voice: Tone.Synth,
    options: {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.4, sustain: 0.1, release: 1.2 },
    },
  },
  sine: {
    voice: Tone.Synth,
    options: {
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 1 },
    },
  },
};

let synths = new Map();
let reverb;
let volume;
let initialized = false;

export async function initAudio() {
  await Tone.start();
  reverb = new Tone.Reverb({ decay: 3, wet: 0.35 }).toDestination();
  volume = new Tone.Volume(-8).connect(reverb);
  initialized = true;
}

function getOrCreateSynth(routeId, synthType) {
  if (!synths.has(routeId)) {
    const config = SYNTH_CONFIGS[synthType] || SYNTH_CONFIGS.sine;
    const synth = new Tone.PolySynth(config.voice, config.options);
    synth.maxPolyphony = 6;
    synth.connect(volume);
    synths.set(routeId, synth);
  }
  return synths.get(routeId);
}

export function playNote(routeId, stopSequence, synthType, scaleName) {
  if (!initialized) return;

  const scale = SCALES[scaleName] || SCALES.pentatonic;
  const baseOctave = 3;
  const noteIndex = stopSequence % scale.length;
  const octaveOffset = Math.floor(stopSequence / scale.length) % 3;
  const note = `${scale[noteIndex]}${baseOctave + octaveOffset}`;

  try {
    const synth = getOrCreateSynth(routeId, synthType);
    synth.triggerAttackRelease(note, "8n", Tone.now(), 0.25 + Math.random() * 0.15);
  } catch {
    // synth busy — skip
  }
}

export function disposeSynths() {
  for (const s of synths.values()) s.dispose();
  synths.clear();
}
