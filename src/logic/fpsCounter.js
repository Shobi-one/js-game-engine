/**
 * View → Show FPS: frames per second in the corner of the viewport. Counts
 * browser animation frames, which both the p5 and the Three.js loops run on.
 */

const STORAGE_KEY = 'clipengine:show-fps';

/** Turns frame timestamps into a frames-per-second figure, updated every `windowMs`. */
export class FpsMeter {
  constructor(windowMs = 500) {
    this.windowMs = windowMs;
    this.start = null;
    this.frames = 0;
    this.fps = null;
  }

  /** Call once per frame; returns the new figure when one is ready, otherwise null. */
  tick(now) {
    if (this.start === null) {
      this.start = now;
      return null;
    }
    this.frames++;
    const elapsed = now - this.start;
    if (elapsed < this.windowMs) return null;
    this.fps = Math.round((this.frames * 1000) / elapsed);
    this.start = now;
    this.frames = 0;
    return this.fps;
  }
}

const remember = (on) => {
  try {
    localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  } catch {
    // Storage can be blocked; the setting then lasts for this visit only.
  }
};

const remembered = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

export function initFpsCounter() {
  const display = document.getElementById('fps-counter');
  const item = document.getElementById('view-fps');
  if (!display || !item) return;

  let on = false;
  let frame = null;
  const meter = new FpsMeter();

  const loop = (now) => {
    const fps = meter.tick(now);
    if (fps !== null) display.textContent = `${fps} FPS`;
    frame = requestAnimationFrame(loop);
  };

  const set = (value) => {
    on = value;
    display.hidden = !on;
    item.setAttribute('text', `Show FPS: ${on ? 'On' : 'Off'}`);
    if (on && frame === null) {
      display.textContent = '-- FPS';
      frame = requestAnimationFrame(loop);
    } else if (!on && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
      meter.start = null;
    }
  };

  item.addEventListener('click', () => {
    set(!on);
    remember(on);
    document.getElementById('view-menu').style.display = 'none';
  });
  set(remembered());
}
