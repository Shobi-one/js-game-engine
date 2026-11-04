// Builds the 2D properties form from field definitions.
// EditorUI owns what happens on a change; this file only renders inputs and validates them.

/** The editable fields of a sprite, grouped as they appear in the panel. */
export function spritePropertyGroups(item, { onEditCode }) {
  return {
    transform: {
      label: 'Transform',
      properties: [
        { id: 'x', label: 'Position X', type: 'number', value: item.x ?? 0, step: 1, validate: v => !isNaN(v) },
        { id: 'y', label: 'Position Y', type: 'number', value: item.y ?? 0, step: 1, validate: v => !isNaN(v) },
        { id: 'rotation', label: 'Rotation', type: 'number', value: item.rotation ?? 0, step: 1, validate: v => !isNaN(v) }
      ]
    },
    appearance: {
      label: 'Size & Style',
      properties: [
        { id: 'width', label: 'Width', type: 'number', value: item.width ?? 50, min: 1, step: 1, validate: v => v > 0 },
        { id: 'height', label: 'Height', type: 'number', value: item.height ?? 50, min: 1, step: 1, validate: v => v > 0 },
        { id: 'color', label: 'Color', type: 'color', value: item.color ?? '#00ff00' },
        {
          id: 'imageUrl',
          label: 'Image',
          type: 'custom',
          value: item.imageUrl || '',
          render: (value, onChange) => {
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = 'var(--space-xs)';

            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.className = 'property-input';

            fileInput.onchange = (e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                  const imageUrl = evt.target.result;
                  onChange(imageUrl);
                  preview.src = imageUrl;
                  preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
              }
            };

            const preview = document.createElement('img');
            preview.style.maxWidth = '100px';
            preview.style.maxHeight = '100px';
            preview.style.marginTop = '4px';
            preview.style.border = '1px solid #ccc';
            preview.style.borderRadius = '4px';
            preview.style.display = item.imageUrl ? 'block' : 'none';
            if (item.imageUrl) {
              preview.src = item.imageUrl;
            }

            const clearBtn = document.createElement('button');
            clearBtn.className = 'code-editor-button';
            clearBtn.textContent = 'Clear Image';
            clearBtn.style.marginTop = '4px';
            clearBtn.onclick = () => {
              onChange(null);
              fileInput.value = '';
              preview.style.display = 'none';
            };

            container.appendChild(fileInput);
            container.appendChild(preview);
            container.appendChild(clearBtn);
            return container;
          }
        }
      ]
    },
    animation: {
      label: 'Sprite Sheet Animation',
      properties: [
        { id: 'frameWidth', label: 'Frame Width', type: 'number', value: item.frameWidth ?? null, min: 1, step: 1 },
        { id: 'frameHeight', label: 'Frame Height', type: 'number', value: item.frameHeight ?? null, min: 1, step: 1 },
        { id: 'totalFrames', label: 'Total Frames', type: 'number', value: item.totalFrames ?? 1, min: 1, step: 1 },
        { id: 'framesPerRow', label: 'Frames Per Row', type: 'number', value: item.framesPerRow ?? 1, min: 1, step: 1 },
        { id: 'currentFrame', label: 'Current Frame', type: 'number', value: item.currentFrame ?? 0, min: 0, step: 1 },
        { id: 'animationSpeed', label: 'Animation Speed', type: 'number', value: item.animationSpeed ?? 10, min: 1, step: 1 }
      ]
    },
    behavior: {
      label: 'Behavior',
      properties: [
        {
          id: 'code',
          label: 'Logic',
          type: 'custom',
          value: item.code || '',
          render: (value, onChange) => {
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.gap = 'var(--space-xs)';

            const button = document.createElement('button');
            button.className = 'code-editor-button';
            button.textContent = 'Edit Logic';

            button.onclick = () => onEditCode(item, onChange);

            container.appendChild(button);
            return container;
          }
        }
      ]
    }
  };
}

/**
 * Renders `groups` into `panel` for `item`. Calls onUpdate(changes) with the
 * changed fields when an input changes and every field in its group is valid.
 */
export function renderPropertyForm(panel, item, groups, onUpdate) {
  const makeRow = (propDef) => {
    const row = document.createElement('div');
    row.className = 'property-row';
    row.dataset.property = propDef.id;

    const label = document.createElement('label');
    label.textContent = propDef.label;
    label.htmlFor = `prop-${item.id}-${propDef.id}`;
    row.appendChild(label);

    let input;
    if (propDef.type === 'custom' && propDef.render) {
      input = propDef.render(propDef.value, (newValue) => {
        const update = {};
        update[propDef.id] = newValue;
        onUpdate(update);
      });
    } else {
      input = document.createElement('input');
      input.className = 'property-input';
      input.id = `prop-${item.id}-${propDef.id}`;
      input.type = propDef.type;
      input.value = propDef.value ?? '';
      input.dataset.propId = propDef.id;
      if (propDef.min !== undefined) input.min = propDef.min;
      if (propDef.step !== undefined) input.step = propDef.step;
    }

    row.appendChild(input);

    const error = document.createElement('span');
    error.className = 'property-error';
    error.style.display = 'none';
    error.id = `error-${item.id}-${propDef.id}`;
    row.appendChild(error);

    return { row, input, error };
  };

  Object.entries(groups).forEach(([groupId, group]) => {
    const groupEl = document.createElement('div');
    groupEl.className = 'property-group';
    groupEl.dataset.group = groupId;

    const label = document.createElement('div');
    label.className = 'property-label';
    label.textContent = group.label;
    groupEl.appendChild(label);

    const inputs = {};
    const errors = {};

    group.properties.forEach(prop => {
      const { row, input, error } = makeRow(prop);
      groupEl.appendChild(row);
      inputs[prop.id] = input;
      errors[prop.id] = error;
    });

    panel.appendChild(groupEl);

    const validateAndUpdate = (propId, value) => {
      const prop = group.properties.find(p => p.id === propId);

      if (prop.type === 'custom' || !prop.validate) {
        return true;
      }

      const isValid = prop.validate(value);
      const error = errors[propId];

      if (!isValid) {
        error.textContent = `Invalid ${prop.label.toLowerCase()}`;
        error.style.display = 'block';
        inputs[propId].classList.add('invalid');
        return false;
      }

      error.style.display = 'none';
      inputs[propId].classList.remove('invalid');
      return true;
    };

    Object.entries(inputs).forEach(([propId, input]) => {
      input.addEventListener('change', () => {
        const update = {};
        let isValid = true;

        Object.entries(inputs).forEach(([key, inp]) => {
          const value = inp.type === 'number' ? Number(inp.value) : inp.value;
          if (validateAndUpdate(key, value)) {
            update[key] = value;
          } else {
            isValid = false;
          }
        });

        if (isValid) onUpdate(update);
      });

      validateAndUpdate(propId, input.type === 'number' ? Number(input.value) : input.value);
    });
  });
}
