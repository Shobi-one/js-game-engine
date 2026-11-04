/**
 * Lists in the audio panel. Sound, effect and channel names are typed by the
 * user, so they are always set with textContent or as properties, never as HTML.
 */

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

function listItem(cells, onClick) {
  const item = el('div', { className: 'audio-list-item' },
    ...cells.map(([className, text]) => el('span', { className, textContent: text })));
  item.addEventListener('click', onClick);
  return item;
}

/** One clickable row per sound: name, type, channel. Returns the rows by name. */
export function renderSoundsList(container, sounds, onSelect) {
  const rows = new Map();
  container.replaceChildren(...sounds.map(({ name, type, channel }) => {
    const row = listItem([['audio-list-name', name], ['audio-list-type', type], ['audio-list-channel', channel]],
      () => onSelect(name));
    row.dataset.sound = name;
    rows.set(name, row);
    return row;
  }));
  return rows;
}

/** One clickable row per effect: name, type. */
export function renderEffectsList(container, effects, onSelect) {
  container.replaceChildren(...effects.map(({ name, type }) => {
    const row = listItem([['audio-list-name', name], ['audio-list-type', type]], () => onSelect(name));
    row.dataset.effect = name;
    return row;
  }));
}

/** The "Select sound..." dropdown used by Apply Effect. */
export function renderSoundOptions(select, names) {
  select.replaceChildren(
    el('option', { value: '', textContent: 'Select sound...' }),
    ...names.map((name) => el('option', { value: name, textContent: name })));
}

/** One checkbox per sound for Create Mix. */
export function renderSoundCheckboxes(container, names) {
  container.replaceChildren(...names.map((name) =>
    el('label', { className: 'audio-checkbox-label' }, el('input', { type: 'checkbox', value: name }), ` ${name}`)));
}

/** A volume slider and mute box per channel (master has its own section). */
export function renderMixerChannels(container, mixers, { onVolume, onMute }) {
  container.replaceChildren(...mixers.filter((m) => m.name !== 'master').map((mixer) => {
    const valueEl = el('span', { className: 'channel-volume-value', textContent: mixer.volume });
    const slider = el('input', { type: 'range', className: 'channel-volume', min: -40, max: 10, step: 1, value: mixer.volume });
    slider.dataset.channel = mixer.name;
    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      valueEl.textContent = value;
      onVolume(mixer.name, value);
    });

    const mute = el('input', { type: 'checkbox', className: 'channel-mute', checked: mixer.mute });
    mute.dataset.channel = mixer.name;
    mute.addEventListener('change', () => onMute(mixer.name, mute.checked));

    return el('div', { className: 'mixer-channel' },
      el('div', { className: 'mixer-channel-title', textContent: mixer.name }),
      el('div', { className: 'audio-control-group' }, el('label', { textContent: 'Volume (dB)' }), slider, valueEl),
      el('div', { className: 'audio-control-group' }, el('label', {}, mute, ' Mute')));
  }));
}
