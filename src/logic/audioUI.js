import { audioEngine } from './audioEngine.js';

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
    panel.innerHTML = `
      <header>
        <div class="title-bar">
          <div class="title-text">Audio Engine</div>
          <button class="control-btn" id="audio-panel-close">×</button>
        </div>
      </header>
      <div class="audio-panel-content">
        <div class="audio-init-section">
          <button id="audio-init-btn" class="audio-control-btn">Initialize Audio</button>
        </div>
      
      <div class="audio-tabs">
        <button class="audio-tab active" data-tab="sounds">Sounds</button>
        <button class="audio-tab" data-tab="effects">Effects</button>
        <button class="audio-tab" data-tab="mixer">Mixer</button>
      </div>
      
      <div class="audio-tab-content" id="audio-tab-sounds">
        <div class="audio-section">
          <div class="audio-section-title">Generate Sound</div>
          <div class="audio-form">
            <input type="text" id="sound-name" placeholder="Sound name" class="audio-input">
            <select id="sound-type" class="audio-select">
              <option value="synth">Synth</option>
              <option value="polysynth">Poly Synth</option>
              <option value="noise">Noise</option>
              <option value="metal">Metal</option>
            </select>
            <select id="sound-channel" class="audio-select">
              <option value="sfx">SFX</option>
              <option value="music">Music</option>
              <option value="ambient">Ambient</option>
            </select>
            <button id="generate-sound-btn" class="audio-btn">Generate</button>
          </div>
        </div>
        
        <div class="audio-section">
          <div class="audio-section-title">Load Sample</div>
          <div class="audio-form">
            <input type="text" id="sample-name" placeholder="Sample name" class="audio-input">
            <input type="file" id="sample-file" accept="audio/*" class="audio-input">
            <button id="load-sample-btn" class="audio-btn">Load</button>
          </div>
        </div>
        
        <div class="audio-section">
          <div class="audio-section-title">Sounds List</div>
          <div id="sounds-list" class="audio-list"></div>
        </div>
        
        <div class="audio-section" id="sound-controls" style="display: none;">
          <div class="audio-section-title">Sound Controls: <span id="current-sound-name"></span></div>
          <div class="audio-control-group">
            <label>Volume (dB)</label>
            <input type="range" id="sound-volume" min="-40" max="10" step="1" value="0" class="audio-slider">
            <span id="sound-volume-value">0</span>
          </div>
          <div id="synth-controls" style="display: none;">
            <div class="audio-control-group">
              <label>Oscillator Type</label>
              <select id="sound-osc-type" class="audio-select">
                <option value="sine">Sine</option>
                <option value="square">Square</option>
                <option value="triangle">Triangle</option>
                <option value="sawtooth">Sawtooth</option>
              </select>
            </div>
            <div class="audio-control-group">
              <label>Attack</label>
              <input type="range" id="sound-attack" min="0" max="2" step="0.01" value="0.005" class="audio-slider">
              <span id="sound-attack-value">0.005</span>
            </div>
            <div class="audio-control-group">
              <label>Decay</label>
              <input type="range" id="sound-decay" min="0" max="2" step="0.01" value="0.1" class="audio-slider">
              <span id="sound-decay-value">0.1</span>
            </div>
            <div class="audio-control-group">
              <label>Sustain</label>
              <input type="range" id="sound-sustain" min="0" max="1" step="0.01" value="0.3" class="audio-slider">
              <span id="sound-sustain-value">0.3</span>
            </div>
            <div class="audio-control-group">
              <label>Release</label>
              <input type="range" id="sound-release" min="0" max="5" step="0.01" value="1" class="audio-slider">
              <span id="sound-release-value">1</span>
            </div>
          </div>
          <div id="noise-controls" style="display: none;">
            <div class="audio-control-group">
              <label>Noise Type</label>
              <select id="sound-noise-type" class="audio-select">
                <option value="white">White</option>
                <option value="pink">Pink</option>
                <option value="brown">Brown</option>
              </select>
            </div>
          </div>
          <div id="sample-controls" style="display: none;">
            <div class="audio-control-group">
              <label>Playback Rate</label>
              <input type="range" id="sound-playback-rate" min="0.5" max="2" step="0.1" value="1" class="audio-slider">
              <span id="sound-playback-rate-value">1</span>
            </div>
            <div class="audio-control-group">
              <label>Loop</label>
              <input type="checkbox" id="sound-loop">
            </div>
          </div>
          <div class="audio-button-group">
            <button id="play-sound-btn" class="audio-btn">Play</button>
            <button id="stop-sound-btn" class="audio-btn">Stop</button>
          </div>
        </div>
      </div>
      
      <div class="audio-tab-content hidden" id="audio-tab-effects">
        <div class="audio-section">
          <div class="audio-section-title">Create Effect</div>
          <div class="audio-form">
            <input type="text" id="effect-name" placeholder="Effect name" class="audio-input">
            <select id="effect-type" class="audio-select">
              <option value="reverb">Reverb</option>
              <option value="delay">Delay</option>
              <option value="distortion">Distortion</option>
              <option value="chorus">Chorus</option>
              <option value="phaser">Phaser</option>
              <option value="tremolo">Tremolo</option>
              <option value="filter">Filter</option>
            </select>
            <button id="create-effect-btn" class="audio-btn">Create</button>
          </div>
        </div>
        
        <div class="audio-section">
          <div class="audio-section-title">Effects List</div>
          <div id="effects-list" class="audio-list"></div>
        </div>
        
        <div class="audio-section" id="effect-controls" style="display: none;">
          <div class="audio-section-title">Effect Controls: <span id="current-effect-name"></span></div>
          <div class="audio-control-group">
            <label>Wet/Dry Mix</label>
            <input type="range" id="effect-wet" min="0" max="1" step="0.01" value="0.5" class="audio-slider">
            <span id="effect-wet-value">0.5</span>
          </div>
          <div id="effect-specific-controls"></div>
          <div class="audio-form">
            <label>Apply to Sound:</label>
            <select id="effect-target-sound" class="audio-select">
              <option value="">Select sound...</option>
            </select>
            <button id="apply-effect-btn" class="audio-btn">Apply</button>
          </div>
        </div>
      </div>
      
      <div class="audio-tab-content hidden" id="audio-tab-mixer">
        <div class="audio-section">
          <div class="audio-section-title">Master Volume</div>
          <div class="audio-control-group">
            <input type="range" id="master-volume" min="-40" max="10" step="1" value="0" class="audio-slider">
            <span id="master-volume-value">0 dB</span>
          </div>
        </div>
        
        <div class="audio-section">
          <div class="audio-section-title">Channels</div>
          <div id="mixer-channels" class="mixer-channels"></div>
        </div>
        
        <div class="audio-section">
          <div class="audio-section-title">Create Mix</div>
          <div class="audio-form">
            <input type="text" id="mix-name" placeholder="Mix name" class="audio-input">
            <div id="mix-sounds-select" class="audio-checkboxes"></div>
            <button id="create-mix-btn" class="audio-btn">Create Mix</button>
          </div>
        </div>
      </div>
      </div>
    `;
    
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
    const list = document.getElementById('sounds-list');
    const sounds = audioEngine.getAllSounds();
    
    list.innerHTML = sounds.map(name => {
      const sound = audioEngine.getSoundInfo(name);
      return `
        <div class="audio-list-item" data-sound="${name}">
          <span class="audio-list-name">${name}</span>
          <span class="audio-list-type">${sound.type}</span>
          <span class="audio-list-channel">${sound.channel}</span>
        </div>
      `;
    }).join('');
    
    // Add click listeners
    list.querySelectorAll('.audio-list-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectSound(item.dataset.sound);
      });
    });
    
    // Update target sound dropdown
    const targetSelect = document.getElementById('effect-target-sound');
    targetSelect.innerHTML = '<option value="">Select sound...</option>' +
      sounds.map(name => `<option value="${name}">${name}</option>`).join('');
    
    // Update mix sounds checkboxes
    const mixSoundsSelect = document.getElementById('mix-sounds-select');
    mixSoundsSelect.innerHTML = sounds.map(name => `
      <label class="audio-checkbox-label">
        <input type="checkbox" value="${name}">
        ${name}
      </label>
    `).join('');
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
    document.querySelector(`[data-sound="${name}"]`)?.classList.add('selected');
  }
  
  updateEffectsList() {
    const list = document.getElementById('effects-list');
    const effects = audioEngine.getAllEffects();
    
    list.innerHTML = effects.map(name => {
      const effect = audioEngine.getEffectInfo(name);
      return `
        <div class="audio-list-item" data-effect="${name}">
          <span class="audio-list-name">${name}</span>
          <span class="audio-list-type">${effect.type}</span>
        </div>
      `;
    }).join('');
    
    // Add click listeners
    list.querySelectorAll('.audio-list-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectEffect(item.dataset.effect);
      });
    });
  }
  
  selectEffect(name) {
    this.selectedEffect = name;
    const effect = audioEngine.getEffectInfo(name);
    
    document.getElementById('current-effect-name').textContent = name;
    document.getElementById('effect-controls').style.display = 'block';
    
    // Update wet control
    this.setSliderValue('effect-wet', effect.options.wet || 0.5);
    
    // Create type-specific controls
    const specificControls = document.getElementById('effect-specific-controls');
    specificControls.innerHTML = this.createEffectSpecificControls(effect);
    
    // Add event listeners to specific controls
    this.attachEffectSpecificListeners(effect);
    
    // Highlight selected
    document.querySelectorAll('#effects-list .audio-list-item').forEach(item => {
      item.classList.remove('selected');
    });
    document.querySelector(`[data-effect="${name}"]`)?.classList.add('selected');
  }
  
  createEffectSpecificControls(effect) {
    const type = effect.type;
    const opts = effect.options;
    
    switch (type) {
      case 'reverb':
        return `
          <div class="audio-control-group">
            <label>Decay Time (s)</label>
            <input type="range" id="effect-param-decay" min="0.1" max="10" step="0.1" value="${opts.decay || 1.5}" class="audio-slider">
            <span id="effect-param-decay-value">${opts.decay || 1.5}</span>
          </div>
        `;
      case 'delay':
        return `
          <div class="audio-control-group">
            <label>Delay Time (s)</label>
            <input type="range" id="effect-param-delayTime" min="0" max="1" step="0.01" value="${opts.delayTime || 0.25}" class="audio-slider">
            <span id="effect-param-delayTime-value">${opts.delayTime || 0.25}</span>
          </div>
          <div class="audio-control-group">
            <label>Feedback</label>
            <input type="range" id="effect-param-feedback" min="0" max="0.99" step="0.01" value="${opts.feedback || 0.5}" class="audio-slider">
            <span id="effect-param-feedback-value">${opts.feedback || 0.5}</span>
          </div>
        `;
      case 'distortion':
        return `
          <div class="audio-control-group">
            <label>Distortion Amount</label>
            <input type="range" id="effect-param-distortion" min="0" max="1" step="0.01" value="${opts.distortion || 0.4}" class="audio-slider">
            <span id="effect-param-distortion-value">${opts.distortion || 0.4}</span>
          </div>
        `;
      case 'filter':
        return `
          <div class="audio-control-group">
            <label>Frequency (Hz)</label>
            <input type="range" id="effect-param-frequency" min="20" max="20000" step="10" value="${opts.frequency || 1000}" class="audio-slider">
            <span id="effect-param-frequency-value">${opts.frequency || 1000}</span>
          </div>
          <div class="audio-control-group">
            <label>Q Factor</label>
            <input type="range" id="effect-param-Q" min="0.1" max="20" step="0.1" value="${opts.Q || 1}" class="audio-slider">
            <span id="effect-param-Q-value">${opts.Q || 1}</span>
          </div>
        `;
      default:
        return '<p>No additional controls for this effect type.</p>';
    }
  }
  
  attachEffectSpecificListeners(effect) {
    const controls = document.getElementById('effect-specific-controls');
    controls.querySelectorAll('input[type="range"]').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const param = slider.id.replace('effect-param-', '');
        const value = parseFloat(e.target.value);
        const valueSpan = document.getElementById(`${slider.id}-value`);
        if (valueSpan) {
          valueSpan.textContent = value.toFixed(2);
        }
        
        if (this.selectedEffect) {
          audioEngine.updateEffect(this.selectedEffect, { [param]: value });
        }
      });
    });
  }
  
  updateMixerUI() {
    const mixerChannels = document.getElementById('mixer-channels');
    const mixers = audioEngine.getAllMixers();
    
    mixerChannels.innerHTML = mixers.map(name => {
      const mixer = audioEngine.mixers.get(name);
      if (name === 'master') return ''; // Skip master, it has its own section
      
      return `
        <div class="mixer-channel">
          <div class="mixer-channel-title">${name}</div>
          <div class="audio-control-group">
            <label>Volume (dB)</label>
            <input type="range" class="channel-volume" data-channel="${name}" min="-40" max="10" step="1" value="${mixer.volume}" class="audio-slider">
            <span class="channel-volume-value">${mixer.volume}</span>
          </div>
          <div class="audio-control-group">
            <label>
              <input type="checkbox" class="channel-mute" data-channel="${name}" ${mixer.mute ? 'checked' : ''}>
              Mute
            </label>
          </div>
        </div>
      `;
    }).join('');
    
    // Add event listeners
    mixerChannels.querySelectorAll('.channel-volume').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const channel = e.target.dataset.channel;
        const value = parseFloat(e.target.value);
        audioEngine.setChannelVolume(channel, value);
        e.target.nextElementSibling.textContent = value;
      });
    });
    
    mixerChannels.querySelectorAll('.channel-mute').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const channel = e.target.dataset.channel;
        audioEngine.muteChannel(channel, e.target.checked);
      });
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
