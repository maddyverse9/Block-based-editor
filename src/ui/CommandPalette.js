/**
 * CommandPalette — Slash menu for adding blocks.
 * Triggered by typing '/' in any block. Filterable, keyboard-navigable.
 */
export class CommandPalette {
  /**
   * @param {import('../core/BlockEditor.js').BlockEditor} editor
   */
  constructor(editor) {
    this.editor = editor;
    this.el = null;
    this._visible = false;
    this._activeBlockId = null;
    this._activeEditableEl = null;
    this._selectedIndex = 0;
    this._filteredItems = [];
    this._query = '';

    this._onDocClick = this._onDocClick.bind(this);
    this._onDocKeyDown = this._onDocKeyDown.bind(this);
    this._build();
  }

  _build() {
    this.el = document.createElement('div');
    this.el.className = 'be-command-palette';
    this.el.style.display = 'none';

    const header = document.createElement('div');
    header.className = 'be-command-palette-header';
    header.textContent = 'Add a block';

    this._list = document.createElement('div');
    this._list.className = 'be-command-palette-list';

    this.el.appendChild(header);
    this.el.appendChild(this._list);

    document.body.appendChild(this.el);
  }

  /**
   * Show the palette near the active editable element.
   * @param {string} blockId
   * @param {HTMLElement} editableEl
   */
  show(blockId, editableEl) {
    this._activeBlockId = blockId;
    this._activeEditableEl = editableEl;
    this._query = '';
    this._selectedIndex = 0;
    this._visible = true;

    this._renderItems();
    this._position(editableEl);

    this.el.style.display = 'block';

    document.addEventListener('click', this._onDocClick, true);
    document.addEventListener('keydown', this._onDocKeyDown, true);

    // Listen for further input to filter
    this._onInput = () => {
      const text = editableEl.textContent;
      const slashIdx = text.lastIndexOf('/');
      if (slashIdx === -1) {
        this.hide();
        return;
      }
      this._query = text.slice(slashIdx + 1).toLowerCase();
      this._selectedIndex = 0;
      this._renderItems();
    };
    editableEl.addEventListener('input', this._onInput);

    this.editor.events.emit('command:open', { blockId });
  }

  hide() {
    this._visible = false;
    this.el.style.display = 'none';

    document.removeEventListener('click', this._onDocClick, true);
    document.removeEventListener('keydown', this._onDocKeyDown, true);

    if (this._activeEditableEl && this._onInput) {
      this._activeEditableEl.removeEventListener('input', this._onInput);
    }

    this.editor.events.emit('command:close', {});
  }

  get isVisible() {
    return this._visible;
  }

  _renderItems() {
    this._filteredItems = this.editor.registry.search(this._query);
    this._list.innerHTML = '';

    if (this._filteredItems.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'be-command-palette-empty';
      empty.textContent = 'No blocks found';
      this._list.appendChild(empty);
      return;
    }

    this._filteredItems.forEach((item, i) => {
      const row = document.createElement('button');
      row.className = 'be-command-palette-item';
      if (i === this._selectedIndex) row.classList.add('be-command-palette-item--active');
      row.setAttribute('tabindex', '-1');

      const icon = document.createElement('span');
      icon.className = 'be-command-palette-icon';
      icon.textContent = item.icon;

      const info = document.createElement('div');
      info.className = 'be-command-palette-info';

      const label = document.createElement('span');
      label.className = 'be-command-palette-label';
      label.textContent = item.label;

      const desc = document.createElement('span');
      desc.className = 'be-command-palette-desc';
      desc.textContent = item.description;

      info.appendChild(label);
      info.appendChild(desc);

      row.appendChild(icon);
      row.appendChild(info);

      row.addEventListener('mouseenter', () => {
        this._selectedIndex = i;
        this._highlightActive();
      });

      row.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._selectItem(i);
      });

      this._list.appendChild(row);
    });
  }

  _highlightActive() {
    const items = this._list.querySelectorAll('.be-command-palette-item');
    items.forEach((item, i) => {
      item.classList.toggle('be-command-palette-item--active', i === this._selectedIndex);
    });
  }

  _selectItem(index) {
    const item = this._filteredItems[index];
    if (!item) return;

    // Remove the slash command text from the current block
    if (this._activeEditableEl) {
      const text = this._activeEditableEl.textContent;
      const slashIdx = text.lastIndexOf('/');
      if (slashIdx !== -1) {
        this._activeEditableEl.textContent = text.slice(0, slashIdx);
      }
    }

    // If the current block is empty, convert it
    const currentText = this._activeEditableEl?.textContent?.trim() || '';
    if (currentText === '') {
      this.hide();
      
      // Build data based on type
      const data = {};
      if (item.type === 'heading') {
        const match = item.label.match(/(\d)/);
        data.level = match ? parseInt(match[1]) : 1;
      }
      
      this.editor.convertBlock(this._activeBlockId, item.type, data);
    } else {
      // Add a new block after
      this.hide();
      
      const blockData = { type: item.type, data: {} };
      if (item.type === 'heading') {
        const match = item.label.match(/(\d)/);
        blockData.data.level = match ? parseInt(match[1]) : 1;
      }
      
      this.editor.addBlockAfter(this._activeBlockId, blockData);
    }
  }

  _position(editableEl) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    this.el.style.position = 'fixed';
    this.el.style.top = `${rect.bottom + 8}px`;
    this.el.style.left = `${Math.max(rect.left - 8, 16)}px`;

    // Ensure it doesn't go off screen
    requestAnimationFrame(() => {
      const paletteRect = this.el.getBoundingClientRect();
      if (paletteRect.bottom > window.innerHeight - 16) {
        this.el.style.top = `${rect.top - paletteRect.height - 8}px`;
      }
      if (paletteRect.right > window.innerWidth - 16) {
        this.el.style.left = `${window.innerWidth - paletteRect.width - 16}px`;
      }
    });
  }

  _onDocClick(e) {
    if (!this.el.contains(e.target)) {
      this.hide();
    }
  }

  _onDocKeyDown(e) {
    if (!this._visible) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      this._selectedIndex = Math.min(this._selectedIndex + 1, this._filteredItems.length - 1);
      this._highlightActive();
      this._scrollToActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      this._selectedIndex = Math.max(this._selectedIndex - 1, 0);
      this._highlightActive();
      this._scrollToActive();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      this._selectItem(this._selectedIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.hide();
    }
  }

  _scrollToActive() {
    const activeItem = this._list.querySelector('.be-command-palette-item--active');
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest' });
    }
  }

  destroy() {
    this.hide();
    this.el?.remove();
  }
}
