class ModalComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._isOpen = false;
    this._isDragging = false;
    this._dragOffset = { x: 0, y: 0 };
    this._currentPosition = null;
  }

  static get observedAttributes() {
    return ['title', 'width', 'height', 'closeable'];
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
    const title = this.getAttribute('title') || 'Modal';
    const width = this.getAttribute('width') || 'auto';
    const height = this.getAttribute('height') || 'auto';
    const closeable = this.getAttribute('closeable') !== 'false';

    const widthClass = width !== 'auto' ? `modal-width-${width}` : '';
    const heightStyle = height !== 'auto' ? `height: ${height}; max-height: ${height};` : '';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --space-xxs: 0.125rem;
          --space-xs: 0.25rem;
          --space-sm: 0.5rem;
          --space-md: 0.75rem;
          --space-lg: 1.25rem;
          --border-thin: 0.0625rem;
          --border: 0.125rem;
          --shadow-offset: 0.125rem;
          --font-sm: 0.6875rem;
          --modal-width-sm: 25rem;
          --modal-width-md: 31.25rem;
          --modal-width-lg: 37.5rem;
          --modal-width-xl: 43.75rem;
          --modal-max-width: 50rem;
          --modal-max-height: 37.5rem;
          --color-bg: #c0c0c0;
          --color-dark: #000080;
          --color-border-dark: #808080;
          --color-border-light: #dfdfdf;
          --color-text-light: #ffffff;
          --spacing-gap: 0.5rem;
        }

        .modal-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          z-index: 9998;
        }

        .modal-overlay.open {
          display: block;
        }

        .modal-window {
          display: none;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80vw;
          max-width: var(--modal-max-width);
          height: auto;
          max-height: var(--modal-max-height);
          z-index: 9999;
          padding: 0;
          margin: 0;
          background: var(--color-bg);
          border: var(--border) solid;
          border-color: var(--color-border-light) var(--color-border-dark) var(--color-border-dark) var(--color-border-light);
          box-shadow: var(--shadow-offset) var(--shadow-offset) 0 rgba(0, 0, 0, 0.2);
          flex-direction: column;
        }

        .modal-window.open {
          display: flex;
        }

        .modal-window.dragging {
          cursor: move;
          user-select: none;
        }

        .modal-width-400 {
          width: var(--modal-width-sm);
        }

        .modal-width-500 {
          width: var(--modal-width-md);
        }

        .modal-width-600 {
          width: var(--modal-width-lg);
        }

        .modal-width-700 {
          width: var(--modal-width-xl);
        }

        header {
          margin: 0;
        }

        .title-bar {
          background: var(--color-dark);
          padding: calc(var(--space-xxs) + 0.0625rem) var(--space-xs);
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0;
          cursor: move;
          user-select: none;
        }

        .title-text {
          color: var(--color-text-light);
          font-weight: bold;
          font-size: var(--font-sm);
          flex: 1;
          justify-content: flex-start;
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

        .modal-content {
          flex: 1;
          margin: var(--space-sm);
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          background: var(--color-text-light);
          border: var(--border) solid;
          border-color: var(--color-border-dark) var(--color-border-light) var(--color-border-light) var(--color-border-dark);
          padding: var(--space-sm);
          overflow: auto;
        }

        .modal-footer {
          padding: var(--space-sm);
          display: flex;
          justify-content: flex-end;
          gap: var(--space-sm);
          border-top: var(--border-thin) solid var(--color-border-dark);
        }

        ::slotted(*) {
          font-family: "MS Sans Serif", "Microsoft Sans Serif", sans-serif;
        }
      </style>
      
      <div class="modal-overlay" part="overlay"></div>
      <div class="modal-window ${widthClass}" part="window" style="${heightStyle}">
        <header>
          <div class="title-bar" part="title-bar">
            <div class="title-text" part="title">${title}</div>
            ${closeable ? '<button class="control-btn" part="close-btn" aria-label="Close">×</button>' : ''}
          </div>
        </header>
        <div class="modal-content" part="content">
          <slot name="content"></slot>
        </div>
        ${this.querySelector('[slot="footer"]') ? '<div class="modal-footer" part="footer"><slot name="footer"></slot></div>' : ''}
      </div>
    `;
  }

  _setupEventListeners() {
    const closeBtn = this.shadowRoot.querySelector('.control-btn');
    const overlay = this.shadowRoot.querySelector('.modal-overlay');
    const titleBar = this.shadowRoot.querySelector('.title-bar');
    const modalWindow = this.shadowRoot.querySelector('.modal-window');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    if (overlay) {
      overlay.addEventListener('click', () => this.hide());
    }

    // Dragging functionality
    if (titleBar && modalWindow) {
      titleBar.addEventListener('mousedown', (e) => {
        // Don't drag if clicking the close button
        if (e.target === closeBtn || e.target.closest('.control-btn')) return;
        
        this._isDragging = true;
        modalWindow.classList.add('dragging');
        
        const rect = modalWindow.getBoundingClientRect();
        this._dragOffset = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        
        // Store current position or calculate from transform
        if (!this._currentPosition) {
          this._currentPosition = {
            x: rect.left,
            y: rect.top
          };
        }
        
        e.preventDefault();
      });
    }

    // Global mouse move handler
    document.addEventListener('mousemove', (e) => {
      if (this._isDragging && modalWindow) {
        const x = e.clientX - this._dragOffset.x;
        const y = e.clientY - this._dragOffset.y;
        
        // Remove centering transform and use absolute positioning
        modalWindow.style.transform = 'none';
        modalWindow.style.left = `${x}px`;
        modalWindow.style.top = `${y}px`;
        
        this._currentPosition = { x, y };
        
        this.dispatchEvent(new CustomEvent('modal-move', {
          bubbles: true,
          composed: true,
          detail: { x, y }
        }));
      }
    });

    // Global mouse up handler
    document.addEventListener('mouseup', () => {
      if (this._isDragging && modalWindow) {
        this._isDragging = false;
        modalWindow.classList.remove('dragging');
      }
    });

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._isOpen) {
        this.hide();
      }
    });
  }

  show() {
    this._isOpen = true;
    const window = this.shadowRoot.querySelector('.modal-window');
    const overlay = this.shadowRoot.querySelector('.modal-overlay');
    
    if (window) {
      window.classList.add('open');
      
      // If modal has been dragged before, restore its position
      if (this._currentPosition) {
        window.style.transform = 'none';
        window.style.left = `${this._currentPosition.x}px`;
        window.style.top = `${this._currentPosition.y}px`;
      }
    }
    if (overlay) overlay.classList.add('open');
    
    this.dispatchEvent(new CustomEvent('modal-open', {
      bubbles: true,
      composed: true
    }));
  }

  hide() {
    this._isOpen = false;
    const window = this.shadowRoot.querySelector('.modal-window');
    const overlay = this.shadowRoot.querySelector('.modal-overlay');
    
    if (window) window.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    
    this.dispatchEvent(new CustomEvent('modal-close', {
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

  get isOpen() {
    return this._isOpen;
  }
}

customElements.define('modal-window', ModalComponent);

export { ModalComponent };
