import { describe, it, expect, vi } from 'vitest';
import { renderEffectControls } from '../../src/logic/audio/effectControls.js';
import { renderSoundsList, renderSoundOptions, renderMixerChannels } from '../../src/logic/audio/lists.js';

const evil = '<img src=x onerror="alert(1)">';

describe('audio panel lists', () => {
  it('renders sound names as text and reports clicks', () => {
    const list = document.createElement('div');
    const onSelect = vi.fn();
    const rows = renderSoundsList(list, [{ name: evil, type: 'synth', channel: 'sfx' }], onSelect);
    expect(list.querySelector('img')).toBeNull();
    expect(list.querySelector('.audio-list-name').textContent).toBe(evil);
    rows.get(evil).click();
    expect(onSelect).toHaveBeenCalledWith(evil);
  });

  it('builds the target dropdown with a placeholder', () => {
    const select = document.createElement('select');
    renderSoundOptions(select, ['a', evil]);
    expect([...select.options].map((o) => o.value)).toEqual(['', 'a', evil]);
  });

  it('skips master and wires channel volume and mute', () => {
    const box = document.body.appendChild(document.createElement('div'));
    const onVolume = vi.fn();
    const onMute = vi.fn();
    renderMixerChannels(box, [{ name: 'master', volume: 0 }, { name: 'sfx', volume: -6, mute: true }], { onVolume, onMute });
    expect([...box.querySelectorAll('.mixer-channel-title')].map((t) => t.textContent)).toEqual(['sfx']);
    const slider = box.querySelector('.channel-volume');
    slider.value = '-20';
    slider.dispatchEvent(new Event('input'));
    expect(onVolume).toHaveBeenCalledWith('sfx', -20);
    const mute = box.querySelector('.channel-mute');
    expect(mute.checked).toBe(true);
    mute.click();
    expect(onMute).toHaveBeenCalledWith('sfx', false);
  });
});

describe('effect controls', () => {
  it('shows the sliders for a delay with stored or default values', () => {
    const box = document.createElement('div');
    const onChange = vi.fn();
    renderEffectControls(box, { type: 'delay', options: { feedback: 0 } }, onChange);
    expect(box.querySelector('#effect-param-delayTime').value).toBe('0.25');
    expect(box.querySelector('#effect-param-feedback').value).toBe('0');
    const slider = box.querySelector('#effect-param-feedback');
    slider.value = '0.8';
    slider.dispatchEvent(new Event('input'));
    expect(onChange).toHaveBeenCalledWith('feedback', 0.8);
    expect(box.querySelector('#effect-param-feedback-value').textContent).toBe('0.80');
  });

  it('says so when an effect has no extra controls', () => {
    const box = document.createElement('div');
    renderEffectControls(box, { type: 'chorus', options: {} }, vi.fn());
    expect(box.textContent).toBe('No additional controls for this effect type.');
  });
});
