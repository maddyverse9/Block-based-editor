/**
 * ColorPicker — Reusable color picker with a curated palette.
 * Used by FloatingToolbar for text color and background color.
 */
export class ColorPicker {
  /**
   * @param {Object} options
   * @param {'color'|'background'} options.mode
   * @param {Function} options.onSelect - Called with the selected color value
   * @param {Function} [options.onClose]
   */
  constructor(options) {
    this.mode = options.mode || 'color';
    this.onSelect = options.onSelect;
    this.onClose = options.onClose;
    this.el = null;
    this._build();
  }

  static TEXT_COLORS = [
    { label: 'Default',  value: 'inherit',  swatch: 'var(--be-text)' },
    { label: 'Red',      value: '#ef4444',  swatch: '#ef4444' },
    { label: 'Orange',   value: '#f97316',  swatch: '#f97316' },
    { label: 'Yellow',   value: '#eab308',  swatch: '#eab308' },
    { label: 'Green',    value: '#22c55e',  swatch: '#22c55e' },
    { label: 'Blue',     value: '#3b82f6',  swatch: '#3b82f6' },
    { label: 'Purple',   value: '#a855f7',  swatch: '#a855f7' },
    { label: 'Pink',     value: '#ec4899',  swatch: '#ec4899' },
    { label: 'Teal',     value: '#14b8a6',  swatch: '#14b8a6' },
    { label: 'Gray',     value: '#6b7280',  swatch: '#6b7280' },
  ];

  static BG_COLORS = [
    { label: 'Default',       value: 'transparent', swatch: 'transparent' },
    { label: 'Red',           value: '#fecaca',     swatch: '#fecaca' },
    { label: 'Orange',        value: '#fed7aa',     swatch: '#fed7aa' },
    { label: 'Yellow',        value: '#fef08a',     swatch: '#fef08a' },
    { label: 'Green',         value: '#bbf7d0',     swatch: '#bbf7d0' },
    { label: 'Blue',          value: '#bfdbfe',     swatch: '#bfdbfe' },
    { label: 'Purple',        value: '#e9d5ff',     swatch: '#e9d5ff' },
    { label: 'Pink',          value: '#fbcfe8',     swatch: '#fbcfe8' },
    { label: 'Teal',          value: '#99f6e4',     swatch: '#99f6e4' },
    { label: 'Gray',          value: '#e5e7eb',     swatch: '#e5e7eb' },
  ];

  _build() {
    this.el = document.createElement('div');
    this.el.className = 'be-color-picker';

    const title = document.createElement('div');
    title.className = 'be-color-picker-title';
    title.textContent = this.mode === 'color' ? 'Text Color' : 'Background';
    this.el.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'be-color-picker-grid';

    const colors = this.mode === 'color' ? ColorPicker.TEXT_COLORS : ColorPicker.BG_COLORS;

    colors.forEach(color => {
      const btn = document.createElement('button');
      btn.className = 'be-color-swatch';
      btn.title = color.label;
      btn.setAttribute('tabindex', '-1');

      const dot = document.createElement('span');
      dot.className = 'be-color-dot';
      dot.style.background = color.swatch;
      if (color.value === 'transparent' || color.value === 'inherit') {
        dot.classList.add('be-color-dot--default');
      }

      const label = document.createElement('span');
      label.className = 'be-color-label';
      label.textContent = color.label;

      btn.appendChild(dot);
      btn.appendChild(label);

      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onSelect(color.value);
      });

      grid.appendChild(btn);
    });

    this.el.appendChild(grid);
  }

  show(parentEl, rect) {
    if (!this.el.parentElement) {
      document.body.appendChild(this.el);
    }
    this.el.style.display = 'block';
    
    // Position near the toolbar
    if (rect) {
      this.el.style.position = 'fixed';
      this.el.style.top = `${rect.bottom + 4}px`;
      this.el.style.left = `${rect.left}px`;
    }
  }

  hide() {
    this.el.style.display = 'none';
    this.onClose?.();
  }

  destroy() {
    this.el?.remove();
  }
}
