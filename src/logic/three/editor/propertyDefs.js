/**
 * Property groups shown in the 3D properties panel. Each property has an id
 * (a dotted path such as 'position.x'), a label, an input type and a value.
 * 'custom' properties build their own element with render(value, onChange).
 */

const xyz = (key, label, extra = {}) => (item) =>
  ['x', 'y', 'z'].map((axis) => ({
    id: `${key}.${axis}`, label: `${label} ${axis.toUpperCase()}`, type: 'number', value: item[key][axis], step: 0.1, ...extra,
  }));

const position = xyz('position', 'Position');
const rotation = xyz('rotation', 'Rotation');
const scale = xyz('scale', 'Scale', { min: 0.01 });
const target = xyz('target', 'Target');

function texturePicker(obj) {
  return (value, onChange) => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '4px';
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.className = 'property-input';
    
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const textureUrl = evt.target.result;
          onChange(textureUrl);
          preview.src = textureUrl;
          preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    };
    
    const preview = document.createElement('img');
    preview.style.maxWidth = '100px';
    preview.style.maxHeight = '100px';
    preview.style.border = '1px solid #ccc';
    preview.style.borderRadius = '4px';
    preview.style.display = obj.textureUrl ? 'block' : 'none';
    if (obj.textureUrl) preview.src = obj.textureUrl;
    
    const clearBtn = document.createElement('button');
    clearBtn.className = 'code-editor-button';
    clearBtn.textContent = 'Clear Texture';
    clearBtn.onclick = () => {
      onChange(null);
      fileInput.value = '';
      preview.style.display = 'none';
    };
    
    container.appendChild(fileInput);
    container.appendChild(preview);
    container.appendChild(clearBtn);
    return container;
  };
}

function animationPicker(obj) {
  return (value, onChange) => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '4px';
    
    obj.animations.forEach(clip => {
      const btn = document.createElement('button');
      btn.className = 'code-editor-button';
      btn.textContent = clip.name;
      btn.style.width = '100%';
      btn.onclick = () => {
        obj.playAnimation(clip.name);
        onChange(clip.name);
      };
      container.appendChild(btn);
    });
    
    return container;
  };
}

/** Groups for a mesh. editCode(obj, code, onChange) opens the code editor. */
export function objectPropertyGroups(obj, { editCode }) {
  const groups = {
    transform: { label: 'Transform', properties: [...position(obj), ...rotation(obj), ...scale(obj)] },
    material: {
      label: 'Material',
      properties: [
        { id: 'color', label: 'Color', type: 'color', value: obj.color },
        { id: 'metalness', label: 'Metalness', type: 'range', value: obj.metalness, min: 0, max: 1, step: 0.01 },
        { id: 'roughness', label: 'Roughness', type: 'range', value: obj.roughness, min: 0, max: 1, step: 0.01 },
        { id: 'opacity', label: 'Opacity', type: 'range', value: obj.opacity, min: 0, max: 1, step: 0.01 },
        { id: 'transparent', label: 'Transparent', type: 'checkbox', value: obj.transparent },
        { id: 'wireframe', label: 'Wireframe', type: 'checkbox', value: obj.wireframe },
        { id: 'textureUrl', label: 'Texture', type: 'custom', value: obj.textureUrl || '', render: texturePicker(obj) },
      ],
    },
    behavior: {
      label: 'Behavior',
      properties: [
        { id: 'interactive', label: 'Interactive', type: 'checkbox', value: obj.interactive },
        {
          id: 'code',
          label: 'Custom Code',
          type: 'custom',
          value: obj.code || '',
          render: (value, onChange) => {
            const button = document.createElement('button');
            button.className = 'code-editor-button';
            button.textContent = 'Edit Code';
            button.onclick = () => editCode(obj, obj.code, onChange);
            return button;
          },
        },
      ],
    },
  };

  if (obj.animations && obj.animations.length > 0) {
    groups.animation = {
      label: 'Animation',
      properties: [
        { id: 'currentAnimation', label: 'Active Animation', type: 'custom', value: obj.currentAnimation || '', render: animationPicker(obj) },
      ],
    };
  }
  return groups;
}

/** Extra groups by light type, after General and Position. */
const LIGHT_GROUPS = {
  spot: (light) => ({
    spotlight: {
      label: 'Spotlight Settings',
      properties: [
        { id: 'angle', label: 'Angle', type: 'range', value: light.angle, min: 0, max: Math.PI / 2, step: 0.01 },
        { id: 'penumbra', label: 'Penumbra', type: 'range', value: light.penumbra, min: 0, max: 1, step: 0.01 },
        { id: 'decay', label: 'Decay', type: 'number', value: light.decay, min: 0, step: 0.1 },
        { id: 'distance', label: 'Distance', type: 'number', value: light.distance, min: 0, step: 1 },
        ...target(light),
      ],
    },
  }),
  point: (light) => ({
    pointlight: {
      label: 'Point Light Settings',
      properties: [
        { id: 'distance', label: 'Distance', type: 'number', value: light.distance, min: 0, step: 1 },
        { id: 'decay', label: 'Decay', type: 'number', value: light.decay, min: 0, step: 0.1 },
      ],
    },
  }),
  hemisphere: (light) => ({
    hemisphere: {
      label: 'Hemisphere Settings',
      properties: [{ id: 'groundColor', label: 'Ground Color', type: 'color', value: light.groundColor }],
    },
  }),
};

const SHADOW_TYPES = ['directional', 'spot', 'point'];

/** Groups for a light. */
export function lightPropertyGroups(light) {
  const groups = {
    general: {
      label: 'General',
      properties: [
        { id: 'name', label: 'Name', type: 'text', value: light.name },
        { id: 'color', label: 'Color', type: 'color', value: light.color },
        { id: 'intensity', label: 'Intensity', type: 'range', value: light.intensity, min: 0, max: 5, step: 0.1 },
      ],
    },
    position: { label: 'Position', properties: position(light) },
    ...LIGHT_GROUPS[light.type]?.(light),
  };
  if (SHADOW_TYPES.includes(light.type)) {
    groups.shadow = { label: 'Shadows', properties: [{ id: 'castShadow', label: 'Cast Shadow', type: 'checkbox', value: light.castShadow }] };
  }
  return groups;
}
