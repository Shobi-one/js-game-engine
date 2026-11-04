/** Markup for the Edit → Audio Engine panel. Static: no user data goes in here. */
export const AUDIO_PANEL_HTML = `
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
