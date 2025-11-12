class MenuItemComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._text = '';
        this._shortcut = '';
    }

    static get observedAttributes() {
        return ['text', 'shortcut'];
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            if (name === 'text') this._text = newValue;
            if (name === 'shortcut') this._shortcut = newValue;
            this.render();
        }
    }

    render() {
        const styles = `
            :host {
                display: block;
            }
            
            .menu-item {
                padding: var(--space-xs, 0.25rem) var(--space-sm, 0.5rem);
                font-size: var(--font-sm, 0.6875rem);
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-family: "MS Sans Serif", "Microsoft Sans Serif", sans-serif;
            }

            .menu-item:hover,
            .menu-item.active {
                background: var(--color-dark, #000080);
                color: var(--color-text-light, #ffffff);
            }
            
            .menu-item.active .menu-item-shortcut {
                color: var(--color-text-light, #ffffff);
            }

            .menu-item-text {
                flex: 1;
            }

            .menu-item-shortcut {
                color: var(--color-border-dark, #808080);
                font-size: var(--font-xs, 0.5rem);
                margin-left: var(--space-lg, 1.25rem);
            }
        `;

        this.shadowRoot.innerHTML = `
            <style>${styles}</style>
            <div class="menu-item">
                <span class="menu-item-text">${this._text}</span>
                ${this._shortcut ? `<span class="menu-item-shortcut">${this._shortcut}</span>` : ''}
            </div>
        `;
    }
}

customElements.define('menu-item', MenuItemComponent);