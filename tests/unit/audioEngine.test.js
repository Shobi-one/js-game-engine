import { describe, it, expect, vi, beforeEach } from 'vitest';

// A stand-in for Tone.js that records how every node was built and wired.
// The real library needs a browser AudioContext.
const log = [];
vi.mock('tone', () => {
  class Param { constructor(v = 0) { this.value = v; } }
  class Node {
    constructor(...args) {
      this.kind = new.target.name;
      this.args = args;
      this.volume = new Param(0);
      this.wet = new Param(1);
      this.frequency = new Param(0);
      this.Q = new Param(0);
      this.delayTime = new Param(0);
      this.feedback = new Param(0);
      this.oscillator = { type: 'sine' };
      this.envelope = {};
      this.noise = { type: 'white' };
      this.calls = [];
      log.push(this);
      const opts = args.find((a) => a && typeof a === 'object' && 'onload' in a);
      if (opts) queueMicrotask(() => opts.onload());
    }
    connect(n) { this.calls.push(['connect', n.kind]); return this; }
    disconnect() { this.calls.push(['disconnect']); return this; }
    chain(...ns) { this.calls.push(['chain', ...ns.map((n) => n.kind)]); return this; }
    toDestination() { this.calls.push(['toDestination']); return this; }
    start(...a) { this.calls.push(['start', ...a]); return this; }
    stop() { this.calls.push(['stop']); return this; }
    triggerAttackRelease(...a) { this.calls.push(['triggerAttackRelease', ...a]); }
    triggerRelease() { this.calls.push(['triggerRelease']); }
    dispose() { this.calls.push(['dispose']); }
  }
  const make = (name) => ({ [name]: class extends Node {} })[name];
  const names = ['Volume', 'Channel', 'Synth', 'PolySynth', 'NoiseSynth', 'MetalSynth', 'Player', 'Reverb',
    'FeedbackDelay', 'Distortion', 'Chorus', 'Phaser', 'Tremolo', 'Vibrato', 'Filter', 'AutoFilter', 'Sequence'];
  const mod = Object.fromEntries(names.map((n) => [n, make(n)]));
  return { ...mod, Destination: { kind: 'Destination' }, start: async () => {} };
});

const { AudioEngine } = await import('../../src/logic/audioEngine.js');

const built = (kind) => log.filter((n) => n.kind === kind);
const describeNode = (n) => ({ kind: n.kind, args: JSON.parse(JSON.stringify(n.args.map((a) => (a?.kind ? a.kind : a)))) });

let engine;
beforeEach(() => {
  log.length = 0;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  engine = new AudioEngine();
});

describe('AudioEngine setup', () => {
  it('creates master, music, sfx and ambient channels', () => {
    expect(engine.getAllMixers()).toEqual(['master', 'music', 'sfx', 'ambient']);
  });
});

describe('AudioEngine instruments', () => {
  it('builds each instrument with its defaults and routes it to its channel', async () => {
    engine.generateSynth('s');
    engine.generatePolySynth('p', { polyphony: 8 });
    engine.generateNoise('n', { type: 'pink' });
    engine.generateMetalSynth('m', { frequency: 300 });
    await engine.loadSample('smp', 'blob:x', { loop: true });
    const nodes = ['Synth', 'PolySynth', 'NoiseSynth', 'MetalSynth', 'Player'].map((k) => built(k).at(-1));
    expect(nodes.map(describeNode)).toMatchSnapshot();
    expect(nodes.map((n) => n.calls)).toMatchSnapshot();
    expect(['s', 'p', 'n', 'm', 'smp'].map((k) => {
      const { type, channel, options } = engine.getSoundInfo(k);
      return { type, channel, options };
    })).toMatchSnapshot();
  });

  it('sends a sound to the speakers directly when its channel does not exist', () => {
    const synth = engine.generateSynth('s', { channel: 'nope' });
    expect(synth.calls).toEqual([['toDestination']]);
  });
});

describe('AudioEngine effects', () => {
  const types = ['reverb', 'delay', 'distortion', 'chorus', 'phaser', 'tremolo', 'vibrato', 'filter', 'autofilter'];

  it('builds every effect type with its defaults', () => {
    const effects = types.map((t) => engine.createEffect(t, t));
    expect(effects.map((e) => ({ ...describeNode(e), calls: e.calls }))).toMatchSnapshot();
  });

  it('builds every effect type with custom options', () => {
    const opts = { decay: 3, preDelay: 0.2, wet: 0.3, delayTime: 0.5, feedback: 0.7, distortion: 0.9, frequency: 4,
      depth: 0.2, octaves: 5, baseFrequency: 500, filterType: 'highpass', rolloff: -24, Q: 3 };
    const effects = types.map((t) => engine.createEffect(t, t, opts));
    expect(effects.map(describeNode)).toMatchSnapshot();
  });

  it('returns null for an unknown effect', () => {
    expect(engine.createEffect('x', 'wobble')).toBeNull();
    expect(engine.getAllEffects()).toEqual([]);
  });

  it('chains a sound through an effect into its channel', () => {
    const synth = engine.generateSynth('s');
    engine.createEffect('r', 'reverb');
    expect(engine.applyEffect('s', 'r')).toBe(true);
    expect(synth.calls.slice(-2)).toEqual([['disconnect'], ['chain', 'Reverb', 'Channel']]);
    expect(engine.applyEffect('s', 'missing')).toBe(false);
  });

  it('updates effect parameters', () => {
    const delay = engine.createEffect('d', 'delay');
    engine.updateEffect('d', { wet: 0.2, delayTime: 0.4, feedback: 0.6 });
    expect([delay.wet.value, delay.delayTime.value, delay.feedback.value]).toEqual([0.2, 0.4, 0.6]);
    const filter = engine.createEffect('f', 'filter');
    engine.updateEffect('f', { frequency: 800, Q: 2 });
    expect([filter.frequency.value, filter.Q.value]).toEqual([800, 2]);
    const reverb = engine.createEffect('r', 'reverb');
    engine.updateEffect('r', { decay: 4 });
    expect(reverb.decay).toBe(4);
    expect(engine.getEffectInfo('r').options.decay).toBe(4);
    expect(engine.updateEffect('missing', {})).toBe(false);
  });
});

describe('AudioEngine playback', () => {
  it('triggers each sound type the right way', async () => {
    const synth = engine.generateSynth('s');
    const noise = engine.generateNoise('n');
    const player = await engine.loadSample('smp', 'blob:x');
    engine.playSound('s', { note: 'E4', duration: '4n' });
    engine.playSound('n');
    engine.playSound('smp', { time: 1 });
    engine.stopSound('s');
    engine.stopSound('smp');
    expect(synth.calls.slice(-2)).toEqual([['triggerAttackRelease', 'E4', '4n', undefined, 1], ['triggerRelease']]);
    expect(noise.calls.at(-1)).toEqual(['triggerAttackRelease', '8n', undefined, 1]);
    expect(player.calls.slice(-2)).toEqual([['start', 1], ['stop']]);
  });

  it('builds a sequence', () => {
    engine.generateSynth('s');
    const seq = engine.playSequence('s', ['C4', 'E4'], { loop: true });
    expect(seq.kind).toBe('Sequence');
    expect(seq.args.slice(1)).toEqual([['C4', 'E4'], '4n']);
    expect(seq.loop).toBe(true);
    expect(engine.playSequence('missing', [])).toBeNull();
  });

  it('updates sound parameters', () => {
    const synth = engine.generateSynth('s');
    engine.updateSound('s', { volume: -6, oscillatorType: 'square', attack: 0.1, release: 2 });
    expect([synth.volume.value, synth.oscillator.type, synth.envelope.attack, synth.envelope.release]).toEqual([-6, 'square', 0.1, 2]);
    const noise = engine.generateNoise('n');
    engine.updateSound('n', { noiseType: 'brown' });
    expect(noise.noise.type).toBe('brown');
    expect(engine.updateSound('missing', {})).toBe(false);
  });
});

describe('AudioEngine mixing', () => {
  it('creates a mix that routes its sounds, with optional per-sound volume', () => {
    const a = engine.generateSynth('a');
    const b = engine.generateSynth('b');
    const mix = engine.createMix('chord', ['a', 'b'], { volumes: [-3] });
    expect(engine.getAllMixers()).toContain('chord');
    expect(mix.channel.calls).toContainEqual(['connect', 'Channel']);
    expect(a.calls.slice(-1)).toEqual([['chain', 'Volume', 'Channel']]);
    expect(b.calls.slice(-1)).toEqual([['connect', 'Channel']]);
  });

  it('sets channel volume and mute', () => {
    expect(engine.setChannelVolume('sfx', -10)).toBe(true);
    expect(engine.mixers.get('sfx')).toMatchObject({ volume: -10, mute: false });
    expect(engine.muteChannel('sfx')).toBe(true);
    expect(engine.mixers.get('sfx').mute).toBe(true);
    expect(engine.setChannelVolume('missing', 0)).toBe(false);
    engine.setMasterVolume(-2);
    expect(engine.masterVolume.volume.value).toBe(-2);
  });

  it('clear() disposes sounds and effects', () => {
    const synth = engine.generateSynth('s');
    const reverb = engine.createEffect('r', 'reverb');
    engine.clear();
    expect(synth.calls.at(-1)).toEqual(['dispose']);
    expect(reverb.calls.at(-1)).toEqual(['dispose']);
    expect(engine.getAllSounds()).toEqual([]);
    expect(engine.getAllEffects()).toEqual([]);
  });
});
