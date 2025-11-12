class PanelModalComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._isOpen = false;
    this._isDragging = false;
    this._isResizing = false;
    this._dragOffset = { x: 0, y: 0 };
  }

  static get observedAttributes() {
    return ['title', 'width', 'height', 'x', 'y', 'resizable', 'draggable'];
  }

  connectedCallback() {
    this.render();
    this._setupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  render() {
    const title = this.getAttribute('title') || 'Panel';
    const width = this.getAttribute('width') || '300';
    const height = this.getAttribute('height') || '400';
    const resizable = this.getAttribute('resizable') !== 'false';
    const draggable = this.getAttribute('draggable') !== 'false';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --space-xxs: 0.125rem;
          --space-xs: 0.25rem;
          --space-sm: 0.5rem;
          --border-thin: 0.0625rem;
          --border: 0.125rem;
          --shadow-offset: 0.125rem;
          --font-sm: 0.6875rem;
          --color-bg: #c0c0c0;
          --color-dark: #000080;
          --color-border-dark: #808080;
          --color-border-light: #dfdfdf;
          --color-text-light: #ffffff;
        }

        .panel-container {
          display: none;
          position: fixed;
          width: ${width}px;
          height: ${height}px;
          z-index: 1000;
          background: var(--color-bg);
          border: var(--border) solid;
          border-color: var(--color-border-light) var(--color-border-dark) var(--color-border-dark) var(--color-border-light);
          box-shadow: var(--shadow-offset) var(--shadow-offset) 0 rgba(0, 0, 0, 0.2);
          flex-direction: column;
        }

        .panel-container.open {
          display: flex;
        }

        .panel-container.dragging {
          cursor: move;
          user-select: none;
        }

        .title-bar {
          background: var(--color-dark);
          padding: calc(var(--space-xxs) + 0.0625rem) var(--space-xs);
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: ${draggable ? 'move' : 'default'};
          user-select: none;
        }

        .title-text {
          color: var(--color-text-light);
          font-weight: bold;
          font-size: var(--font-sm);
          flex: 1;
        }

        .control-btn {
          width: 1rem;
          height: 0.875rem;
          background: var(--color-bg);
          border: var(--border-thin) solid;
          border-color: var(--color-text-light) #000000 #000000 var(--color-text-light);
          font-size: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-weight: bold;
          line-height: 1;
        }

        .control-btn:active {
          border-color: #000000 var(--color-text-light) var(--color-text-light) #000000;
        }

        .panel-content {
          flex: 1;
          margin: var(--space-sm);
          background: var(--color-text-light);
          border: var(--border) solid;
          border-color: var(--color-border-dark) var(--color-border-light) var(--color-border-light) var(--color-border-dark);
          padding: var(--space-sm);
          overflow: auto;
          font-size: var(--font-sm);
        }

        .resize-handle {
          position: absolute;
          width: 10px;
          height: 10px;
          right: 0;
          bottom: 0;
          cursor: nwse-resize;
          background: linear-gradient(135deg, transparent 0%, transparent 50%, var(--color-border-dark) 50%, var(--color-border-dark) 100%);
          display: ${resizable ? 'block' : 'none'};
        }

        ::slotted(*) {
          font-family: "MS Sans Serif", "Microsoft Sans Serif", sans-serif;
        }
      </style>
      
      <div class="panel-container" part="container">
        <div class="title-bar" part="title-bar">
          <div class="title-text" part="title">${title}</div>
          <button class="control-btn" part="close-btn" aria-label="Close">×</button>
        </div>
        <div class="panel-content" part="content">
          <slot name="content"></slot>
        </div>
        <div class="resize-handle" part="resize-handle"></div>
      </div>
    `;
  }

  _setupEventListeners() {
    const container = this.shadowRoot.querySelector('.panel-container');
    const titleBar = this.shadowRoot.querySelector('.title-bar');
    const closeBtn = this.shadowRoot.querySelector('.control-btn');
    const resizeHandle = this.shadowRoot.querySelector('.resize-handle');

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hide();
      });
    }

    if (this.getAttribute('draggable') !== 'false') {
      titleBar.addEventListener('mousedown', (e) => {
        if (e.target === closeBtn || e.target.closest('.control-btn')) return;
        
        this._isDragging = true;
        container.classList.add('dragging');
        
        const rect = container.getBoundingClientRect();
        this._dragOffset = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        
        e.preventDefault();
      });
    }

    if (this.getAttribute('resizable') !== 'false' && resizeHandle) {
      resizeHandle.addEventListener('mousedown', (e) => {
        this._isResizing = true;
        this._resizeStart = {
          x: e.clientX,
          y: e.clientY,
          width: container.offsetWidth,
          height: container.offsetHeight
        };
        e.preventDefault();
        e.stopPropagation();
      });
    }

    document.addEventListener('mousemove', (e) => {
      if (this._isDragging) {
        const x = e.clientX - this._dragOffset.x;
        const y = e.clientY - this._dragOffset.y;
        this.setPosition(x, y);
        
        this.dispatchEvent(new CustomEvent('panel-move', {
          bubbles: true,
          composed: true,
          detail: { x, y }
        }));
      }
      
      if (this._isResizing && this._resizeStart) {
        const deltaX = e.clientX - this._resizeStart.x;
        const deltaY = e.clientY - this._resizeStart.y;
        const newWidth = Math.max(200, this._resizeStart.width + deltaX);
        const newHeight = Math.max(150, this._resizeStart.height + deltaY);
        
        container.style.width = `${newWidth}px`;
        container.style.height = `${newHeight}px`;
        
        this.dispatchEvent(new CustomEvent('panel-resize', {
          bubbles: true,
          composed: true,
          detail: { width: newWidth, height: newHeight }
        }));
      }
    });

    document.addEventListener('mouseup', () => {
      if (this._isDragging) {
        this._isDragging = false;
        container.classList.remove('dragging');
      }
      if (this._isResizing) {
        this._isResizing = false;
        this._resizeStart = null;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._isOpen) {
        this.hide();
      }
    });
  }

  show() {
    this._isOpen = true;
    const container = this.shadowRoot.querySelector('.panel-container');
    
    if (container) {
      container.classList.add('open');
      
      if (!this.hasAttribute('x') || !this.hasAttribute('y')) {
        const x = (window.innerWidth - container.offsetWidth) / 2;
        const y = (window.innerHeight - container.offsetHeight) / 2;
        this.setPosition(x, y);
      } else {
        const x = parseInt(this.getAttribute('x') || '0');
        const y = parseInt(this.getAttribute('y') || '0');
        this.setPosition(x, y);
      }
    }
    
    this.dispatchEvent(new CustomEvent('panel-open', {
      bubbles: true,
      composed: true
    }));
  }

  hide() {
    this._isOpen = false;
    const container = this.shadowRoot.querySelector('.panel-container');
    
    if (container) {
      container.classList.remove('open');
    }
    
    this.dispatchEvent(new CustomEvent('panel-close', {
      bubbles: true,
      composed: true
    }));
  }

  toggle() {
    if (this._isOpen) {
      this.hide();
    } else {
      this.show();
    }
  }

  setPosition(x, y) {
    const container = this.shadowRoot.querySelector('.panel-container');
    if (container) {
      container.style.left = `${x}px`;
      container.style.top = `${y}px`;
    }
  }

  get isOpen() {
    return this._isOpen;
  }
}

customElements.define('panel-modal', PanelModalComponent);

export { PanelModalComponent };
