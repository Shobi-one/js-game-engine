import { audioEngine } from './audioEngine.js';
import { AUDIO_PANEL_HTML } from './audio/panelTemplate.js';
import { renderEffectControls } from './audio/effectControls.js';
import {
  renderSoundsList, renderEffectsList, renderSoundOptions, renderSoundCheckboxes, renderMixerChannels,
} from './audio/lists.js';

/**
 * AudioUI - User interface for controlling audio engine
 */
class AudioUI {
  constructor() {
    this.selectedSound = null;
    this.selectedEffect = null;
    this.selectedMixer = null;
    this.setupUI();
  }
  
  setupUI() {
    this.createAudioPanel();
    this.setupEventListeners();
  }
  
  createAudioPanel() {
    const panel = document.createElement('div');
    panel.className = 'audio-panel-modal window';
    panel.id = 'audio-panel-modal';
    panel.style.display = 'none';
    panel.innerHTML = AUDIO_PANEL_HTML;
    
    // Insert as modal (append to body)
    document.body.appendChild(panel);
  }
  
  show() {
    const modal = document.getElementById('audio-panel-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }
  
  hide() {
    const modal = document.getElementById('audio-panel-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
  
  setupEventListeners() {
    // Close button
    document.getElementById('audio-panel-close').addEventListener('click', () => {
      this.hide();
    });
    
    // Initialize audio
    document.getElementById('audio-init-btn').addEventListener('click', async () => {
      const success = await audioEngine.init();
      if (success) {
        document.getElementById('audio-init-btn').textContent = '✓ Audio Ready';
        document.getElementById('audio-init-btn').disabled = true;
      }
    });
    
    // Tab switching
    document.querySelectorAll('.audio-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.audio-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        document.querySelectorAll('.audio-tab-content').forEach(content => {
          content.classList.add('hidden');
        });
        
        const tabName = tab.dataset.tab;
        document.getElementById(`audio-tab-${tabName}`).classList.remove('hidden');
        
        if (tabName === 'sounds') {
          this.updateSoundsList();
        } else if (tabName === 'effects') {
          this.updateEffectsList();
        } else if (tabName === 'mixer') {
          this.updateSoundsList();
          this.updateMixerUI();
        }
      });
    });
    
    // Generate sound
    document.getElementById('generate-sound-btn').addEventListener('click', () => {
      const name = document.getElementById('sound-name').value;
      const type = document.getElementById('sound-type').value;
      const channel = document.getElementById('sound-channel').value;
      
      if (!name) {
        return;
      }
      
      try {
        switch (type) {
          case 'synth':
            audioEngine.generateSynth(name, { channel });
            break;
          case 'polysynth':
            audioEngine.generatePolySynth(name, { channel });
            break;
          case 'noise':
            audioEngine.generateNoise(name, { channel });
            break;
          case 'metal':
            audioEngine.generateMetalSynth(name, { channel });
            break;
        }
        
        this.updateSoundsList();
        document.getElementById('sound-name').value = '';
      } catch (error) {
        console.error('Error generating sound:', error);
      }
    });
    
    // Load sample
    document.getElementById('load-sample-btn').addEventListener('click', async () => {
      const name = document.getElementById('sample-name').value;
      const file = document.getElementById('sample-file').files[0];
      
      if (!name || !file) {
        return;
      }
      
      try {
        const url = URL.createObjectURL(file);
        await audioEngine.loadSample(name, url);
        this.updateSoundsList();
        document.getElementById('sample-name').value = '';
        document.getElementById('sample-file').value = '';
      } catch (error) {
        console.error('Error loading sample:', error);
      }
    });
    
    // Sound controls
    this.setupSoundControls();
    
    // Create effect
    document.getElementById('create-effect-btn').addEventListener('click', () => {
      const name = document.getElementById('effect-name').value;
      const type = document.getElementById('effect-type').value;
      
      if (!name) {
        return;
      }
      
      try {
        audioEngine.createEffect(name, type);
        this.updateEffectsList();
        document.getElementById('effect-name').value = '';
      } catch (error) {
        console.error('Error creating effect:', error);
      }
    });
    
    // Effect controls
    this.setupEffectControls();
    
    // Master volume
    document.getElementById('master-volume').addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      audioEngine.setMasterVolume(value);
      document.getElementById('master-volume-value').textContent = `${value} dB`;
    });
    
    // Create mix
    document.getElementById('create-mix-btn').addEventListener('click', () => {
      const name = document.getElementById('mix-name').value;
      const checkboxes = document.querySelectorAll('#mix-sounds-select input:checked');
      const soundNames = Array.from(checkboxes).map(cb => cb.value);
      
      if (!name || soundNames.length === 0) {
        return;
      }
      
      try {
        audioEngine.createMix(name, soundNames);
        document.getElementById('mix-name').value = '';
        this.updateMixerUI();
      } catch (error) {
        console.error('Error creating mix:', error);
      }
    });
  }
  
  setupSoundControls() {
    // Volume
    document.getElementById('sound-volume').addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      if (this.selectedSound) {
        audioEngine.updateSound(this.selectedSound, { volume: value });
        document.getElementById('sound-volume-value').textContent = value;
      }
    });
    
    // Play/Stop
    document.getElementById('play-sound-btn').addEventListener('click', () => {
      if (this.selectedSound) {
        audioEngine.playSound(this.selectedSound);
      }
    });
    
    document.getElementById('stop-sound-btn').addEventListener('click', () => {
      if (this.selectedSound) {
        audioEngine.stopSound(this.selectedSound);
      }
    });
    
    // Synth controls
    document.getElementById('sound-osc-type').addEventListener('change', (e) => {
      if (this.selectedSound) {
        audioEngine.updateSound(this.selectedSound, { oscillatorType: e.target.value });
      }
    });
    
    ['attack', 'decay', 'sustain', 'release'].forEach(param => {
      const slider = document.getElementById(`sound-${param}`);
      slider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (this.selectedSound) {
          audioEngine.updateSound(this.selectedSound, { [param]: value });
          document.getElementById(`sound-${param}-value`).textContent = value.toFixed(3);
        }
      });
    });
    
    // Noise controls
    document.getElementById('sound-noise-type').addEventListener('change', (e) => {
      if (this.selectedSound) {
        audioEngine.updateSound(this.selectedSound, { noiseType: e.target.value });
      }
    });
    
    // Sample controls
    document.getElementById('sound-playback-rate').addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      if (this.selectedSound) {
        audioEngine.updateSound(this.selectedSound, { playbackRate: value });
        document.getElementById('sound-playback-rate-value').textContent = value.toFixed(1);
      }
    });
    
    document.getElementById('sound-loop').addEventListener('change', (e) => {
      if (this.selectedSound) {
        audioEngine.updateSound(this.selectedSound, { loop: e.target.checked });
      }
    });
  }
  
  setupEffectControls() {
    // Wet/dry mix
    document.getElementById('effect-wet').addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      if (this.selectedEffect) {
        audioEngine.updateEffect(this.selectedEffect, { wet: value });
        document.getElementById('effect-wet-value').textContent = value.toFixed(2);
      }
    });
    
    // Apply effect
    document.getElementById('apply-effect-btn').addEventListener('click', () => {
      const soundName = document.getElementById('effect-target-sound').value;
      if (this.selectedEffect && soundName) {
        audioEngine.applyEffect(soundName, this.selectedEffect);
      }
    });
  }
  
  updateSoundsList() {
    const names = audioEngine.getAllSounds();
    const sounds = names.map((name) => ({ name, ...audioEngine.getSoundInfo(name) }));
    this.soundRows = renderSoundsList(document.getElementById('sounds-list'), sounds, (name) => this.selectSound(name));
    renderSoundOptions(document.getElementById('effect-target-sound'), names);
    renderSoundCheckboxes(document.getElementById('mix-sounds-select'), names);
  }
  
  selectSound(name) {
    this.selectedSound = name;
    const sound = audioEngine.getSoundInfo(name);
    
    document.getElementById('current-sound-name').textContent = name;
    document.getElementById('sound-controls').style.display = 'block';
    
    // Hide all type-specific controls
    document.getElementById('synth-controls').style.display = 'none';
    document.getElementById('noise-controls').style.display = 'none';
    document.getElementById('sample-controls').style.display = 'none';
    
    // Show relevant controls
    if (sound.type === 'synth' || sound.type === 'polysynth') {
      document.getElementById('synth-controls').style.display = 'block';
      if (sound.options.type) {
        document.getElementById('sound-osc-type').value = sound.options.type;
      }
      if (sound.options.envelope) {
        const env = sound.options.envelope;
        this.setSliderValue('sound-attack', env.attack || 0.005);
        this.setSliderValue('sound-decay', env.decay || 0.1);
        this.setSliderValue('sound-sustain', env.sustain || 0.3);
        this.setSliderValue('sound-release', env.release || 1);
      }
    } else if (sound.type === 'noise') {
      document.getElementById('noise-controls').style.display = 'block';
      if (sound.options.type) {
        document.getElementById('sound-noise-type').value = sound.options.type;
      }
    } else if (sound.type === 'sample') {
      document.getElementById('sample-controls').style.display = 'block';
      this.setSliderValue('sound-playback-rate', sound.options.playbackRate || 1);
      document.getElementById('sound-loop').checked = sound.options.loop || false;
    }
    
    // Highlight selected
    document.querySelectorAll('.audio-list-item').forEach(item => {
      item.classList.remove('selected');
    });
    this.soundRows?.get(name)?.classList.add('selected');
  }
  
  updateEffectsList() {
    const effects = audioEngine.getAllEffects().map((name) => ({ name, ...audioEngine.getEffectInfo(name) }));
    renderEffectsList(document.getElementById('effects-list'), effects, (name) => this.selectEffect(name));
  }
  
  selectEffect(name) {
    this.selectedEffect = name;
    const effect = audioEngine.getEffectInfo(name);
    
    document.getElementById('current-effect-name').textContent = name;
    document.getElementById('effect-controls').style.display = 'block';
    
    // Update wet control
    this.setSliderValue('effect-wet', effect.options.wet || 0.5);
    
    // Create type-specific controls
    renderEffectControls(document.getElementById('effect-specific-controls'), effect, (param, value) => {
      if (this.selectedEffect) audioEngine.updateEffect(this.selectedEffect, { [param]: value });
    });
    
    // Highlight selected
    document.querySelectorAll('#effects-list .audio-list-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.effect === name);
    });
  }
  
  updateMixerUI() {
    const mixers = audioEngine.getAllMixers().map((name) => ({ name, ...audioEngine.mixers.get(name) }));
    renderMixerChannels(document.getElementById('mixer-channels'), mixers, {
      onVolume: (channel, value) => audioEngine.setChannelVolume(channel, value),
      onMute: (channel, mute) => audioEngine.muteChannel(channel, mute),
    });
  }
  
  setSliderValue(id, value) {
    const slider = document.getElementById(id);
    if (slider) {
      slider.value = value;
      const valueSpan = document.getElementById(`${id}-value`);
      if (valueSpan) {
        valueSpan.textContent = typeof value === 'number' ? value.toFixed(3) : value;
      }
    }
  }
}

// Export
export { AudioUI };
