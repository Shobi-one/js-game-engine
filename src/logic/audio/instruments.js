import * as Tone from 'tone';

const DEFAULT_ENVELOPE = { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 };

// Every generated instrument: its default channel, and how to build the Tone.js
// node from options. `build` returns the node and the options stored with it.
const INSTRUMENTS = {
  synth: {
    channel: 'sfx',
    build({ type = 'triangle', envelope = DEFAULT_ENVELOPE }) {
      return { node: new Tone.Synth({ oscillator: { type }, envelope }), options: { type, envelope } };
    },
  },
  polysynth: {
    channel: 'music',
    build({ type = 'triangle', envelope = DEFAULT_ENVELOPE, polyphony = 4 }) {
      const node = new Tone.PolySynth(Tone.Synth, { oscillator: { type }, envelope, maxPolyphony: polyphony });
      return { node, options: { type, envelope, polyphony } };
    },
  },
  noise: {
    channel: 'ambient',
    build({ type = 'white', envelope = DEFAULT_ENVELOPE }) {
      return { node: new Tone.NoiseSynth({ noise: { type }, envelope }), options: { type, envelope } };
    },
  },
  metal: {
    channel: 'sfx',
    build({
      frequency = 200,
      envelope = { attack: 0.001, decay: 1.4, release: 0.2 },
      harmonicity = 5.1,
      modulationIndex = 32,
      resonance = 4000,
      octaves = 1.5,
    }) {
      const options = { frequency, envelope, harmonicity, modulationIndex, resonance, octaves };
      return { node: new Tone.MetalSynth(options), options };
    },
  },
};

/** Builds a generated instrument. Returns { node, channel, options }. */
export function createInstrument(kind, options = {}) {
  const spec = INSTRUMENTS[kind];
  const { node, options: stored } = spec.build(options);
  return { node, channel: options.channel === undefined ? spec.channel : options.channel, options: stored };
}

/** Plays a sound once: samples start, noise and metal take no note, the rest take a note. */
export function triggerSound(sound, { note = 'C4', duration = '8n', time, velocity } = {}) {
  if (sound.type === 'sample') {
    sound.player.start(time);
  } else if (sound.type === 'noise' || sound.type === 'metal') {
    sound.instrument.triggerAttackRelease(duration, time, velocity);
  } else {
    sound.instrument.triggerAttackRelease(note, duration, time, velocity);
  }
}

const ENVELOPE_KEYS = ['attack', 'decay', 'sustain', 'release'];

/** Applies live parameter changes (volume, envelope, oscillator, noise, sample rate/loop). */
export function updateInstrument(sound, params) {
  const node = sound.instrument || sound.player;
  if (params.volume !== undefined) node.volume.value = params.volume;

  if (sound.type === 'sample') {
    if (params.playbackRate !== undefined) node.playbackRate = params.playbackRate;
    if (params.loop !== undefined) node.loop = params.loop;
  } else if (sound.type === 'synth' || sound.type === 'polysynth') {
    if (params.oscillatorType !== undefined) node.oscillator.type = params.oscillatorType;
    for (const key of ENVELOPE_KEYS) {
      if (params[key] !== undefined) node.envelope[key] = params[key];
    }
  } else if (sound.type === 'noise') {
    if (params.noiseType !== undefined) node.noise.type = params.noiseType;
  }
}
