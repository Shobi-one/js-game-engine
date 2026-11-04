import * as Tone from 'tone';

// Every effect type the audio engine can build: which Tone.js node, its defaults,
// and whether it needs start() (LFO-driven effects). A param given as
// [optionName, default] reads a differently named option (filterType -> type).
const EFFECT_TYPES = {
  reverb: { node: 'Reverb', params: { decay: 1.5, preDelay: 0.01, wet: 0.5 } },
  delay: { node: 'FeedbackDelay', params: { delayTime: 0.25, feedback: 0.5, wet: 0.5 } },
  distortion: { node: 'Distortion', params: { distortion: 0.4, wet: 1 } },
  chorus: { node: 'Chorus', params: { frequency: 1.5, delayTime: 3.5, depth: 0.7, wet: 0.5 }, start: true },
  phaser: { node: 'Phaser', params: { frequency: 0.5, octaves: 3, baseFrequency: 350, wet: 0.5 } },
  tremolo: { node: 'Tremolo', params: { frequency: 10, depth: 0.5, wet: 1 }, start: true },
  vibrato: { node: 'Vibrato', params: { frequency: 5, depth: 0.1, wet: 1 } },
  filter: { node: 'Filter', params: { type: ['filterType', 'lowpass'], frequency: 1000, rolloff: -12, Q: 1, wet: 1 } },
  autofilter: {
    node: 'AutoFilter',
    params: { frequency: 1, type: ['filterType', 'sine'], depth: 1, baseFrequency: 200, octaves: 2.6, wet: 1 },
    start: true,
  },
};

export const EFFECT_TYPE_NAMES = Object.keys(EFFECT_TYPES);

/** Builds the Tone.js node for an effect type, or returns null for an unknown type. */
export function createToneEffect(type, options = {}) {
  const spec = EFFECT_TYPES[type.toLowerCase()];
  if (!spec) return null;

  const args = {};
  for (const [param, value] of Object.entries(spec.params)) {
    const [option, fallback] = Array.isArray(value) ? value : [param, value];
    args[param] = options[option] ?? fallback;
  }
  const effect = new Tone[spec.node](args);
  if (spec.start) effect.start();
  return effect;
}

// How a live effect's parameters are changed from the audio panel.
const UPDATERS = {
  reverb: { decay: (e, v) => { e.decay = v; } },
  delay: { delayTime: (e, v) => { e.delayTime.value = v; }, feedback: (e, v) => { e.feedback.value = v; } },
  distortion: { distortion: (e, v) => { e.distortion = v; } },
  filter: { frequency: (e, v) => { e.frequency.value = v; }, Q: (e, v) => { e.Q.value = v; } },
};

/** Applies changed parameters to a live effect node. */
export function updateToneEffect(type, effect, params) {
  if (params.wet !== undefined) effect.wet.value = params.wet;
  for (const [param, set] of Object.entries(UPDATERS[type] || {})) {
    if (params[param] !== undefined) set(effect, params[param]);
  }
}
