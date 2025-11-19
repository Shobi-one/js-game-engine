import * as Tone from 'tone';

class AudioEngine {
  constructor() {
    this.initialized = false;
    this.sounds = new Map();
    this.mixers = new Map();
    this.effects = new Map();
    this.players = new Map();
    this.isPlaying = false;

    this.masterVolume = new Tone.Volume(0).toDestination();

    this.createMixer('master', this.masterVolume);
    this.createMixer('music');
    this.createMixer('sfx');
    this.createMixer('ambient');

    this.mixers.get('music').channel.connect(this.masterVolume);
    this.mixers.get('sfx').channel.connect(this.masterVolume);
    this.mixers.get('ambient').channel.connect(this.masterVolume);
  }

  async init() {
    if (this.initialized) return;

    try {
      await Tone.start();
      console.log('Audio engine initialized');
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return false;
    }
  }

  createMixer(name, existingChannel = null) {
    if (this.mixers.has(name)) {
      return this.mixers.get(name);
    }

    const channel = existingChannel || new Tone.Channel().toDestination();
    const mixer = {
      name,
      channel,
      volume: 0,
      pan: 0,
      mute: false,
      solo: false
    };

    this.mixers.set(name, mixer);
    return mixer;
  }

  generateSynth(name, options = {}) {
    const {
      type = 'triangle',
      envelope = { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
      channel = 'sfx'
    } = options;

    const synth = new Tone.Synth({
      oscillator: { type },
      envelope
    });

    const mixer = this.mixers.get(channel);
    if (mixer) {
      synth.connect(mixer.channel);
    } else {
      synth.toDestination();
    }

    this.sounds.set(name, {
      type: 'synth',
      instrument: synth,
      channel,
      options: { type, envelope }
    });

    return synth;
  }

  generatePolySynth(name, options = {}) {
    const {
      type = 'triangle',
      envelope = { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
      channel = 'music',
      polyphony = 4
    } = options;

    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type },
      envelope,
      maxPolyphony: polyphony
    });

    const mixer = this.mixers.get(channel);
    if (mixer) {
      synth.connect(mixer.channel);
    } else {
      synth.toDestination();
    }

    this.sounds.set(name, {
      type: 'polysynth',
      instrument: synth,
      channel,
      options: { type, envelope, polyphony }
    });

    return synth;
  }

  generateNoise(name, options = {}) {
    const {
      type = 'white',
      envelope = { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
      channel = 'ambient'
    } = options;

    const noise = new Tone.NoiseSynth({
      noise: { type },
      envelope
    });

    const mixer = this.mixers.get(channel);
    if (mixer) {
      noise.connect(mixer.channel);
    } else {
      noise.toDestination();
    }

    this.sounds.set(name, {
      type: 'noise',
      instrument: noise,
      channel,
      options: { type, envelope }
    });

    return noise;
  }

  generateMetalSynth(name, options = {}) {
    const {
      frequency = 200,
      envelope = { attack: 0.001, decay: 1.4, release: 0.2 },
      harmonicity = 5.1,
      modulationIndex = 32,
      resonance = 4000,
      octaves = 1.5,
      channel = 'sfx'
    } = options;

    const metal = new Tone.MetalSynth({
      frequency,
      envelope,
      harmonicity,
      modulationIndex,
      resonance,
      octaves
    });

    const mixer = this.mixers.get(channel);
    if (mixer) {
      metal.connect(mixer.channel);
    } else {
      metal.toDestination();
    }

    this.sounds.set(name, {
      type: 'metal',
      instrument: metal,
      channel,
      options: { frequency, envelope, harmonicity, modulationIndex, resonance, octaves }
    });

    return metal;
  }

  async loadSample(name, url, options = {}) {
    const {
      channel = 'sfx',
      loop = false,
      playbackRate = 1
    } = options;

    return new Promise((resolve, reject) => {
      const player = new Tone.Player({
        url,
        loop,
        playbackRate,
        onload: () => {
          const mixer = this.mixers.get(channel);
          if (mixer) {
            player.connect(mixer.channel);
          } else {
            player.toDestination();
          }

          this.players.set(name, {
            player,
            channel,
            loop,
            playbackRate
          });

          this.sounds.set(name, {
            type: 'sample',
            player,
            channel,
            options: { url, loop, playbackRate }
          });

          console.log(`Loaded sample: ${name}`);
          resolve(player);
        },
        onerror: (error) => {
          console.error(`Failed to load sample ${name}:`, error);
          reject(error);
        }
      });
    });
  }

  createEffect(name, type, options = {}) {
    let effect;

    switch (type.toLowerCase()) {
      case 'reverb':
        effect = new Tone.Reverb({
          decay: options.decay || 1.5,
          preDelay: options.preDelay || 0.01,
          wet: options.wet || 0.5
        });
        break;

      case 'delay':
        effect = new Tone.FeedbackDelay({
          delayTime: options.delayTime || 0.25,
          feedback: options.feedback || 0.5,
          wet: options.wet || 0.5
        });
        break;

      case 'distortion':
        effect = new Tone.Distortion({
          distortion: options.distortion || 0.4,
          wet: options.wet || 1
        });
        break;

      case 'chorus':
        effect = new Tone.Chorus({
          frequency: options.frequency || 1.5,
          delayTime: options.delayTime || 3.5,
          depth: options.depth || 0.7,
          wet: options.wet || 0.5
        });
        effect.start();
        break;

      case 'phaser':
        effect = new Tone.Phaser({
          frequency: options.frequency || 0.5,
          octaves: options.octaves || 3,
          baseFrequency: options.baseFrequency || 350,
          wet: options.wet || 0.5
        });
        break;

      case 'tremolo':
        effect = new Tone.Tremolo({
          frequency: options.frequency || 10,
          depth: options.depth || 0.5,
          wet: options.wet || 1
        });
        effect.start();
        break;

      case 'vibrato':
        effect = new Tone.Vibrato({
          frequency: options.frequency || 5,
          depth: options.depth || 0.1,
          wet: options.wet || 1
        });
        break;

      case 'filter':
        effect = new Tone.Filter({
          type: options.filterType || 'lowpass',
          frequency: options.frequency || 1000,
          rolloff: options.rolloff || -12,
          Q: options.Q || 1,
          wet: options.wet || 1
        });
        break;

      case 'autofilter':
        effect = new Tone.AutoFilter({
          frequency: options.frequency || 1,
          type: options.filterType || 'sine',
          depth: options.depth || 1,
          baseFrequency: options.baseFrequency || 200,
          octaves: options.octaves || 2.6,
          wet: options.wet || 1
        });
        effect.start();
        break;

      default:
        console.error(`Unknown effect type: ${type}`);
        return null;
    }

    this.effects.set(name, {
      type,
      effect,
      options
    });

    return effect;
  }

  applyEffect(soundName, effectName) {
    const sound = this.sounds.get(soundName);
    const effectData = this.effects.get(effectName);

    if (!sound || !effectData) {
      console.error(`Sound ${soundName} or effect ${effectName} not found`);
      return false;
    }

    const instrument = sound.instrument || sound.player;
    const mixer = this.mixers.get(sound.channel);

    instrument.disconnect();
    instrument.chain(effectData.effect, mixer ? mixer.channel : Tone.Destination);

    console.log(`Applied ${effectName} to ${soundName}`);
    return true;
  }

  createMix(mixName, soundNames, options = {}) {
    const {
      channel = 'music',
      volumes = []
    } = options;

    const mixer = this.createMixer(mixName);
    const mixChannel = this.mixers.get(channel);

    if (mixChannel) {
      mixer.channel.connect(mixChannel.channel);
    }

    soundNames.forEach((soundName, index) => {
      const sound = this.sounds.get(soundName);
      if (sound) {
        const instrument = sound.instrument || sound.player;
        instrument.disconnect();

        if (volumes[index] !== undefined) {
          const volume = new Tone.Volume(volumes[index]);
          instrument.chain(volume, mixer.channel);
        } else {
          instrument.connect(mixer.channel);
        }
      }
    });

    console.log(`Created mix ${mixName} with sounds:`, soundNames);
    return mixer;
  }

  playSound(name, options = {}) {
    const sound = this.sounds.get(name);
    if (!sound) {
      console.error(`Sound ${name} not found`);
      return;
    }

    const { note = 'C4', duration = '8n', velocity = 1, time = undefined } = options;

    if (sound.type === 'sample') {
      sound.player.start(time);
    } else if (sound.type === 'noise' || sound.type === 'metal') {
      sound.instrument.triggerAttackRelease(duration, time, velocity);
    } else {
      sound.instrument.triggerAttackRelease(note, duration, time, velocity);
    }
  }

  stopSound(name) {
    const sound = this.sounds.get(name);
    if (!sound) return;

    if (sound.type === 'sample') {
      sound.player.stop();
    } else {
      sound.instrument.triggerRelease();
    }
  }

  playSequence(name, notes, options = {}) {
    const {
      interval = '4n',
      loop = false,
      loopEnd = undefined
    } = options;

    const sound = this.sounds.get(name);
    if (!sound) {
      console.error(`Sound ${name} not found`);
      return null;
    }

    const sequence = new Tone.Sequence((time, note) => {
      if (sound.type === 'sample') {
        sound.player.start(time);
      } else if (sound.type === 'noise' || sound.type === 'metal') {
        sound.instrument.triggerAttackRelease('8n', time);
      } else {
        sound.instrument.triggerAttackRelease(note, '8n', time);
      }
    }, notes, interval);

    sequence.loop = loop;
    if (loopEnd) sequence.loopEnd = loopEnd;

    return sequence;
  }

  updateSound(name, params) {
    const sound = this.sounds.get(name);
    if (!sound) {
      console.error(`Sound ${name} not found`);
      return false;
    }

    const instrument = sound.instrument || sound.player;

    if (params.volume !== undefined) {
      instrument.volume.value = params.volume;
    }

    if (sound.type === 'sample') {
      if (params.playbackRate !== undefined) {
        instrument.playbackRate = params.playbackRate;
      }
      if (params.loop !== undefined) {
        instrument.loop = params.loop;
      }
    } else if (sound.type === 'synth' || sound.type === 'polysynth') {
      if (params.oscillatorType !== undefined) {
        instrument.oscillator.type = params.oscillatorType;
      }
      if (params.attack !== undefined) {
        instrument.envelope.attack = params.attack;
      }
      if (params.decay !== undefined) {
        instrument.envelope.decay = params.decay;
      }
      if (params.sustain !== undefined) {
        instrument.envelope.sustain = params.sustain;
      }
      if (params.release !== undefined) {
        instrument.envelope.release = params.release;
      }
    } else if (sound.type === 'noise') {
      if (params.noiseType !== undefined) {
        instrument.noise.type = params.noiseType;
      }
    }

    Object.assign(sound.options, params);
    return true;
  }

  updateEffect(name, params) {
    const effectData = this.effects.get(name);
    if (!effectData) {
      console.error(`Effect ${name} not found`);
      return false;
    }

    const effect = effectData.effect;

    if (params.wet !== undefined) {
      effect.wet.value = params.wet;
    }

    switch (effectData.type) {
      case 'reverb':
        if (params.decay !== undefined) effect.decay = params.decay;
        break;
      case 'delay':
        if (params.delayTime !== undefined) effect.delayTime.value = params.delayTime;
        if (params.feedback !== undefined) effect.feedback.value = params.feedback;
        break;
      case 'distortion':
        if (params.distortion !== undefined) effect.distortion = params.distortion;
        break;
      case 'filter':
        if (params.frequency !== undefined) effect.frequency.value = params.frequency;
        if (params.Q !== undefined) effect.Q.value = params.Q;
        break;
    }

    Object.assign(effectData.options, params);
    return true;
  }

  setChannelVolume(channelName, volume) {
    const mixer = this.mixers.get(channelName);
    if (!mixer) {
      console.error(`Channel ${channelName} not found`);
      return false;
    }

    mixer.channel.volume.value = volume;
    mixer.volume = volume;
    return true;
  }

  setMasterVolume(volume) {
    this.masterVolume.volume.value = volume;
  }

  muteChannel(channelName, mute = true) {
    const mixer = this.mixers.get(channelName);
    if (!mixer) return false;

    mixer.channel.mute = mute;
    mixer.mute = mute;
    return true;
  }

  getAllSounds() {
    return Array.from(this.sounds.keys());
  }

  getAllEffects() {
    return Array.from(this.effects.keys());
  }

  getAllMixers() {
    return Array.from(this.mixers.keys());
  }

  getSoundInfo(name) {
    return this.sounds.get(name);
  }

  getEffectInfo(name) {
    return this.effects.get(name);
  }

  clear() {
    this.sounds.forEach((sound, name) => {
      try {
        if (sound.instrument) {
          sound.instrument.dispose();
        }
        if (sound.player) {
          sound.player.dispose();
        }
      } catch (e) {
        console.error(`Error disposing sound ${name}:`, e);
      }
    });

    this.effects.forEach((effectData, name) => {
      try {
        effectData.effect.dispose();
      } catch (e) {
        console.error(`Error disposing effect ${name}:`, e);
      }
    });

    this.sounds.clear();
    this.effects.clear();
    this.players.clear();
  }
}

const audioEngine = new AudioEngine();
export { audioEngine, AudioEngine };
