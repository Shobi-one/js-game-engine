/**
 * Extra sliders shown under "Wet" for each effect type.
 * Each slider gets id `effect-param-<param>` and a `<id>-value` label, and
 * changes the effect parameter of the same name.
 */
const EFFECT_CONTROLS = {
  reverb: [
    { param: 'decay', label: 'Decay Time (s)', min: 0.1, max: 10, step: 0.1, fallback: 1.5 },
  ],
  delay: [
    { param: 'delayTime', label: 'Delay Time (s)', min: 0, max: 1, step: 0.01, fallback: 0.25 },
    { param: 'feedback', label: 'Feedback', min: 0, max: 0.99, step: 0.01, fallback: 0.5 },
  ],
  distortion: [
    { param: 'distortion', label: 'Distortion Amount', min: 0, max: 1, step: 0.01, fallback: 0.4 },
  ],
  filter: [
    { param: 'frequency', label: 'Frequency (Hz)', min: 20, max: 20000, step: 10, fallback: 1000 },
    { param: 'Q', label: 'Q Factor', min: 0.1, max: 20, step: 0.1, fallback: 1 },
  ],
};

/** Fills `container` with the sliders for `effect` and calls onChange(param, value) on input. */
export function renderEffectControls(container, effect, onChange) {
  container.replaceChildren();
  const controls = EFFECT_CONTROLS[effect.type];
  if (!controls) {
    const note = document.createElement('p');
    note.textContent = 'No additional controls for this effect type.';
    container.append(note);
    return;
  }

  for (const { param, label, min, max, step, fallback } of controls) {
    const value = effect.options[param] ?? fallback;
    const group = document.createElement('div');
    group.className = 'audio-control-group';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;

    const slider = document.createElement('input');
    Object.assign(slider, { type: 'range', id: `effect-param-${param}`, min, max, step, value, className: 'audio-slider' });

    const valueEl = document.createElement('span');
    valueEl.id = `effect-param-${param}-value`;
    valueEl.textContent = value;

    slider.addEventListener('input', () => {
      const next = parseFloat(slider.value);
      valueEl.textContent = next.toFixed(2);
      onChange(param, next);
    });

    group.append(labelEl, slider, valueEl);
    container.append(group);
  }
}
