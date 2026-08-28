/**
 * BlockMenu — The '+' button menu for inserting new blocks.
 * Shows a compact dropdown near the + button on any block's controls.
 */
export class BlockMenu {
  /**
   * @param {import('../core/BlockEditor.js').BlockEditor} editor
   */
  constructor(editor) {
    this.editor = editor;
    this.el = null;
    this._visible = false;
    this._anchorBlockId = null;

    this._onDocClick = this._onDocClick.bind(this);
    this._build();
  }

  _build() {
    this.el = document.createElement('div');
    this.el.className = 'be-block-menu';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);
  }

  /**
   * Show the menu near the + button of a block.
   * @param {string} blockId
   * @param {HTMLElement} anchorEl - the + button
   */
  show(blockId, anchorEl) {
    this._anchorBlockId = blockId;
    this._visible = true;

    // Build items
    this.el.innerHTML = '';
    const items = this.editor.registry.getAll();

    items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'be-block-menu-item';
      btn.setAttribute('tabindex', '-1');

      const icon = document.createElement('span');
      icon.className = 'be-block-menu-icon';
      icon.textContent = item.icon;

      const label = document.createElement('span');
      label.className = 'be-block-menu-label';
      label.textContent = item.label;

      btn.appendChild(icon);
      btn.appendChild(label);

      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._insertBlock(item);
      });

      this.el.appendChild(btn);
    });

    // Position near the anchor
    const rect = anchorEl.getBoundingClientRect();
    this.el.style.position = 'fixed';
    this.el.style.top = `${rect.bottom + 4}px`;
    this.el.style.left = `${rect.left}px`;
    this.el.style.display = 'block';

    // Clamp to viewport
    requestAnimationFrame(() => {
      const menuRect = this.el.getBoundingClientRect();
      if (menuRect.bottom > window.innerHeight - 16) {
        this.el.style.top = `${rect.top - menuRect.height - 4}px`;
      }
      if (menuRect.right > window.innerWidth - 16) {
        this.el.style.left = `${window.innerWidth - menuRect.width - 16}px`;
      }
    });

    setTimeout(() => {
      document.addEventListener('click', this._onDocClick, true);
    }, 0);
  }

  hide() {
    this._visible = false;
    this.el.style.display = 'none';
    document.removeEventListener('click', this._onDocClick, true);
  }

  _insertBlock(item) {
    const data = { type: item.type, data: {} };
    
    if (item.type === 'heading') {
      const match = item.label.match(/(\d)/);
      data.data.level = match ? parseInt(match[1]) : 1;
    }
    
    this.editor.addBlockAfter(this._anchorBlockId, data);
    this.hide();
  }

  _onDocClick(e) {
    if (!this.el.contains(e.target)) {
      this.hide();
    }
  }

  destroy() {
    this.hide();
    this.el?.remove();
  }
}
