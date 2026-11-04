import * as Tone from 'tone';
import { createToneEffect, updateToneEffect } from './audio/effects.js';
import { createInstrument, triggerSound, updateInstrument } from './audio/instruments.js';

/**
 * AudioEngine - Complete Tone.js integration for game engine
 * Features:
 * - Sound generation (synthesizers, noise, samples)
 * - Audio mixing and routing
 * - Effects processing (reverb, delay, distortion, etc.)
 * - Event-based audio triggering
 * - User-adjustable parameters via UI
 */
class AudioEngine {
  constructor() {
    this.initialized = false;
    this.sounds = new Map(); // Generated/loaded sounds
    this.mixers = new Map(); // Audio mixers/channels
    this.effects = new Map(); // Audio effects
    this.players = new Map(); // Sample players
    this.isPlaying = false;
    
    // Master output
    this.masterVolume = new Tone.Volume(0).toDestination();
    
    // Create default mixer channels
    this.createMixer('master', this.masterVolume);
    this.createMixer('music');
    this.createMixer('sfx');
    this.createMixer('ambient');
    
    // Connect channels to master
    this.mixers.get('music').channel.connect(this.masterVolume);
    this.mixers.get('sfx').channel.connect(this.masterVolume);
    this.mixers.get('ambient').channel.connect(this.masterVolume);
  }
  
  /**
   * Initialize audio context (must be called after user interaction)
   */
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
  
  /**
   * Create a mixer/channel for routing audio
   */
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
  
  /**
   * Generate a synthesizer sound. Oscillator types: 'sine', 'square', 'triangle', 'sawtooth'
   */
  generateSynth(name, options = {}) {
    return this._addInstrument(name, 'synth', options);
  }

  /**
   * Generate a polyphonic synthesizer
   */
  generatePolySynth(name, options = {}) {
    return this._addInstrument(name, 'polysynth', options);
  }

  /**
   * Generate a noise synth. Types: 'white', 'pink', 'brown'
   */
  generateNoise(name, options = {}) {
    return this._addInstrument(name, 'noise', options);
  }

  /**
   * Generate a metallic percussion synth
   */
  generateMetalSynth(name, options = {}) {
    return this._addInstrument(name, 'metal', options);
  }

  _addInstrument(name, kind, options) {
    const { node, channel, options: stored } = createInstrument(kind, options);
    this._connectToChannel(node, channel);
    this.sounds.set(name, { type: kind, instrument: node, channel, options: stored });
    return node;
  }

  _connectToChannel(node, channel) {
    const mixer = this.mixers.get(channel);
    if (mixer) {
      node.connect(mixer.channel);
    } else {
      node.toDestination();
    }
  }

  /**
   * Load an audio sample/file
   */
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
          this._connectToChannel(player, channel);
          
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
  
  /**
   * Create an audio effect
   * Types: reverb, delay, distortion, chorus, phaser, tremolo, vibrato, filter
   */
  createEffect(name, type, options = {}) {
    const effect = createToneEffect(type, options);
    if (!effect) {
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
  
  /**
   * Apply effect to a sound
   */
  applyEffect(soundName, effectName) {
    const sound = this.sounds.get(soundName);
    const effectData = this.effects.get(effectName);
    
    if (!sound || !effectData) {
      console.error(`Sound ${soundName} or effect ${effectName} not found`);
      return false;
    }
    
    const instrument = sound.instrument || sound.player;
    const mixer = this.mixers.get(sound.channel);
    
    // Disconnect from current output
    instrument.disconnect();
    
    // Connect through effect
    instrument.chain(effectData.effect, mixer ? mixer.channel : Tone.Destination);
    
    console.log(`Applied ${effectName} to ${soundName}`);
    return true;
  }
  
  /**
   * Create a mix of multiple sounds
   */
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
        
        // Apply volume if specified
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
  
  /**
   * Play a sound
   */
  playSound(name, options = {}) {
    const sound = this.sounds.get(name);
    if (!sound) {
      console.error(`Sound ${name} not found`);
      return;
    }
    
    const { note = 'C4', duration = '8n', velocity = 1, time = undefined } = options;
    triggerSound(sound, { note, duration, time, velocity });
  }
  
  /**
   * Stop a sound
   */
  stopSound(name) {
    const sound = this.sounds.get(name);
    if (!sound) return;
    
    if (sound.type === 'sample') {
      sound.player.stop();
    } else {
      sound.instrument.triggerRelease();
    }
  }
  
  /**
   * Play a sequence/pattern
   */
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
      triggerSound(sound, { note, duration: '8n', time });
    }, notes, interval);
    
    sequence.loop = loop;
    if (loopEnd) sequence.loopEnd = loopEnd;
    
    return sequence;
  }
  
  /**
   * Update sound parameters
   */
  updateSound(name, params) {
    const sound = this.sounds.get(name);
    if (!sound) {
      console.error(`Sound ${name} not found`);
      return false;
    }
    
    updateInstrument(sound, params);
    Object.assign(sound.options, params);
    
    return true;
  }
  
  /**
   * Update effect parameters
   */
  updateEffect(name, params) {
    const effectData = this.effects.get(name);
    if (!effectData) {
      console.error(`Effect ${name} not found`);
      return false;
    }
    
    const effect = effectData.effect;
    
    // Update common parameters
    updateToneEffect(effectData.type, effect, params);
    
    Object.assign(effectData.options, params);
    return true;
  }
  
  /**
   * Update mixer/channel volume
   */
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
  
  /**
   * Set master volume
   */
  setMasterVolume(volume) {
    this.masterVolume.volume.value = volume;
  }
  
  /**
   * Mute/unmute channel
   */
  muteChannel(channelName, mute = true) {
    const mixer = this.mixers.get(channelName);
    if (!mixer) return false;
    
    mixer.channel.mute = mute;
    mixer.mute = mute;
    return true;
  }
  
  /**
   * Get all sounds
   */
  getAllSounds() {
    return Array.from(this.sounds.keys());
  }
  
  /**
   * Get all effects
   */
  getAllEffects() {
    return Array.from(this.effects.keys());
  }
  
  /**
   * Get all mixers
   */
  getAllMixers() {
    return Array.from(this.mixers.keys());
  }
  
  /**
   * Get sound info
   */
  getSoundInfo(name) {
    return this.sounds.get(name);
  }
  
  /**
   * Get effect info
   */
  getEffectInfo(name) {
    return this.effects.get(name);
  }
  
  /**
   * Clear all audio
   */
  clear() {
    // Stop and dispose all sounds
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
    
    // Dispose all effects
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

// Create singleton instance
const audioEngine = new AudioEngine();

// Export
export { audioEngine, AudioEngine };
