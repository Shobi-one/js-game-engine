/**
 * Builds the 3D properties form from property groups (see propertyDefs.js).
 * Input ids are `prop-<item id>-<property id>`; every change calls
 * onUpdate with a partial update such as { position: { x: 2 } }.
 */
export function renderPropertyGroups(container, propertyGroups, item, onUpdate) {
  Object.entries(propertyGroups).forEach(([groupId, group]) => {
    const groupEl = document.createElement('div');
    groupEl.className = 'property-group';
    
    const label = document.createElement('div');
    label.className = 'property-label';
    label.textContent = group.label;
    groupEl.appendChild(label);
    
    const inputs = {};
    
    group.properties.forEach(prop => {
      const row = document.createElement('div');
      row.className = 'property-row';
      
      const labelEl = document.createElement('label');
      labelEl.textContent = prop.label;
      labelEl.htmlFor = `prop-${item.id}-${prop.id}`;
      row.appendChild(labelEl);
      
      let input;
      if (prop.type === 'custom' && prop.render) {
        input = prop.render(prop.value, (newValue) => onUpdate(parsePropertyPath(prop.id, newValue)));
      } else {
        input = document.createElement('input');
        input.className = 'property-input';
        input.id = `prop-${item.id}-${prop.id}`;
        input.dataset.propId = prop.id;
        
        if (prop.type === 'checkbox') {
          input.type = 'checkbox';
          input.checked = prop.value;
        } else if (prop.type === 'range') {
          input.type = 'range';
          input.value = prop.value;
          input.min = prop.min;
          input.max = prop.max;
          input.step = prop.step;
          
          const valueLabel = document.createElement('span');
          valueLabel.textContent = prop.value.toFixed(2);
          valueLabel.style.marginLeft = '8px';
          valueLabel.style.fontSize = '12px';
          
          input.addEventListener('input', () => {
            valueLabel.textContent = parseFloat(input.value).toFixed(2);
          });
          
          row.appendChild(input);
          row.appendChild(valueLabel);
          inputs[prop.id] = input;
          groupEl.appendChild(row);
          return;
        } else {
          input.type = prop.type;
          input.value = prop.value ?? '';
          if (prop.min !== undefined) input.min = prop.min;
          if (prop.step !== undefined) input.step = prop.step;
        }
      }
      
      row.appendChild(input);
      inputs[prop.id] = input;
      groupEl.appendChild(row);
    });
    
    container.appendChild(groupEl);
    
    Object.entries(inputs).forEach(([propId, input]) => {
      const eventType = input.type === 'range' ? 'input' : 'change';
      
      input.addEventListener(eventType, () => {
        const value = input.type === 'checkbox' ? input.checked : 
                     (input.type === 'number' || input.type === 'range') ? parseFloat(input.value) : 
                     input.value;
        
        onUpdate(parsePropertyPath(propId, value));
      });
    });
  });
}

/** 'position.x', 2 → { position: { x: 2 } } */
export function parsePropertyPath(path, value) {
  const parts = path.split('.');
  if (parts.length === 1) {
    return { [path]: value };
  }
  
  const result = {};
  let current = result;
  for (let i = 0; i < parts.length - 1; i++) {
    current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
  return result;
}

/** The right-aligned Delete button under the form. */
export function renderDeleteRow(container, onDelete) {
  const deleteRow = document.createElement('div');
  deleteRow.style.display = 'flex';
  deleteRow.style.justifyContent = 'flex-end';
  deleteRow.style.marginTop = 'var(--space-sm)';
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'code-editor-button';
  deleteBtn.addEventListener('click', onDelete);
  deleteRow.appendChild(deleteBtn);
  container.appendChild(deleteRow);
}
