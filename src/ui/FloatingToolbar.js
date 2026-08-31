/**
 * FloatingToolbar — Appears above selected text for inline formatting.
 * Buttons: Bold, Italic, Underline, Strikethrough, Code, Text Color, Bg Color.
 */
import { ColorPicker } from './ColorPicker.js';

export class FloatingToolbar {
  /**
   * @param {import('../core/BlockEditor.js').BlockEditor} editor
   */
  constructor(editor) {
    this.editor = editor;
    this.el = null;
    this._visible = false;
    this._colorPicker = null;
    this._bgColorPicker = null;
    
    // Link popover state
    this._linkPopover = null;
    this._linkInput = null;
    this._savedRange = null;

    this._onSelectionChange = this._onSelectionChange.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._build();
  }

  _build() {
    this.el = document.createElement('div');
    this.el.className = 'be-floating-toolbar';
    this.el.style.display = 'none';

    // Build the link popover
    this._buildLinkPopover();

    const buttons = [
      { cmd: 'bold', icon: '<strong>B</strong>', title: 'Bold (Ctrl+B)' },
      { cmd: 'italic', icon: '<em>I</em>', title: 'Italic (Ctrl+I)' },
      { cmd: 'underline', icon: '<u>U</u>', title: 'Underline (Ctrl+U)' },
      { cmd: 'strikethrough', icon: '<s>S</s>', title: 'Strikethrough' },
      { cmd: 'link', icon: '🔗', title: 'Link' },
      { cmd: 'separator' },
      { cmd: 'alignLeft', icon: '⫷', title: 'Align Left' },
      { cmd: 'alignCenter', icon: '≡', title: 'Align Center' },
      { cmd: 'alignRight', icon: '⫸', title: 'Align Right' },
      { cmd: 'separator' },
      { cmd: 'textColor', icon: `<span class="be-toolbar-color-icon"><span class="be-toolbar-color-a">A</span><span class="be-toolbar-color-bar" id="be-text-color-bar"></span></span>`, title: 'Text color' },
      { cmd: 'bgColor', icon: `<span class="be-toolbar-bg-icon">A</span>`, title: 'Background color' },
    ];

    buttons.forEach(btn => {
      if (btn.cmd === 'separator') {
        const sep = document.createElement('div');
        sep.className = 'be-toolbar-separator';
        this.el.appendChild(sep);
        return;
      }

      const button = document.createElement('button');
      button.className = 'be-toolbar-btn';
      button.dataset.cmd = btn.cmd;
      button.innerHTML = btn.icon;
      button.title = btn.title;
      button.setAttribute('tabindex', '-1');

      button.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._executeCommand(btn.cmd, button);
      });

      this.el.appendChild(button);
    });

    document.body.appendChild(this.el);

    // Color pickers
    this._colorPicker = new ColorPicker({
      mode: 'color',
      onSelect: (color) => {
        this.editor.selection.applyColor(color, 'color');
        this._colorPicker.hide();
      },
      onClose: () => {},
    });

    this._bgColorPicker = new ColorPicker({
      mode: 'background',
      onSelect: (color) => {
        this.editor.selection.applyColor(color, 'background');
        this._bgColorPicker.hide();
      },
      onClose: () => {},
    });
  }

  _buildLinkPopover() {
    this._linkPopover = document.createElement('div');
    this._linkPopover.className = 'be-link-popover';
    this._linkPopover.style.display = 'none';

    this._linkInput = document.createElement('input');
    this._linkInput.type = 'url';
    this._linkInput.placeholder = 'https://...';
    this._linkInput.className = 'be-link-input';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'be-link-save-btn';
    saveBtn.textContent = 'Apply';

    this._linkPopover.appendChild(this._linkInput);
    this._linkPopover.appendChild(saveBtn);
    document.body.appendChild(this._linkPopover);

    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this._applyLink();
    });

    this._linkInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this._applyLink();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this._hideLinkPopover();
      }
    });
  }

  /** Attach to the editor container. */
  attach(container) {
    container.addEventListener('mouseup', this._onMouseUp);
    this.editor.events.on('selection:change', this._onSelectionChange);
  }

  _onMouseUp() {
    // Delay to let selection settle
    setTimeout(() => this._updateVisibility(), 10);
  }

  _onSelectionChange() {
    // Short delay to debounce
    clearTimeout(this._selTimeout);
    this._selTimeout = setTimeout(() => this._updateVisibility(), 50);
  }

  _updateVisibility() {
    // Don't show while command palette is open or link popover is active
    if (this.editor.commandPalette?.isVisible || this._linkPopover.style.display === 'flex') {
      this.hide();
      return;
    }

    if (this.editor.selection.hasSelection()) {
      this._show();
    } else {
      this.hide();
    }
  }

  _show() {
    const rect = this.editor.selection.getSelectionRect();
    if (!rect) return;

    this.el.style.display = 'flex';
    this._visible = true;

    // Position above the selection
    const toolbarHeight = 40;
    let top = rect.top - toolbarHeight - 8;
    let left = rect.left + (rect.width / 2);

    // Measure toolbar width after showing
    requestAnimationFrame(() => {
      const tbRect = this.el.getBoundingClientRect();
      left = left - (tbRect.width / 2);

      // Clamp to viewport
      left = Math.max(8, Math.min(left, window.innerWidth - tbRect.width - 8));
      if (top < 8) top = rect.bottom + 8;

      this.el.style.position = 'fixed';
      this.el.style.top = `${top}px`;
      this.el.style.left = `${left}px`;
    });

    this._updateActiveStates();
  }

  hide() {
    this._visible = false;
    this.el.style.display = 'none';
    this._colorPicker?.hide();
    this._bgColorPicker?.hide();
    this._hideLinkPopover();
  }

  _hideLinkPopover() {
    this._linkPopover.style.display = 'none';
    this._savedRange = null;
  }

  _showLinkPopover(buttonEl) {
    this._savedRange = this.editor.selection.getRange();
    if (!this._savedRange) return;

    this.hide(); // Hide main toolbar

    const rect = buttonEl.getBoundingClientRect();
    this._linkPopover.style.display = 'flex';
    
    // Position below the button
    requestAnimationFrame(() => {
      const popRect = this._linkPopover.getBoundingClientRect();
      let left = rect.left + (rect.width / 2) - (popRect.width / 2);
      
      left = Math.max(8, Math.min(left, window.innerWidth - popRect.width - 8));
      
      this._linkPopover.style.position = 'fixed';
      this._linkPopover.style.top = `${rect.bottom + 8}px`;
      this._linkPopover.style.left = `${left}px`;
      
      this._linkInput.value = '';
      this._linkInput.focus();
    });
  }

  _applyLink() {
    const url = this._linkInput.value.trim();
    this._hideLinkPopover();

    if (this._savedRange && url) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(this._savedRange);

      let linkUrl = url;
      if (!/^https?:\/\//i.test(linkUrl) && !/^mailto:/i.test(linkUrl) && !/^tel:/i.test(linkUrl)) {
        linkUrl = 'https://' + linkUrl;
      }

      document.execCommand('createLink', false, linkUrl);
      this.editor.events.emit('block:update', { blockId: this.editor.selection.activeBlockId });
    }
  }

  _executeCommand(cmd, buttonEl) {
    switch (cmd) {
      case 'bold':
        this.editor.selection.toggleFormat('bold');
        break;
      case 'italic':
        this.editor.selection.toggleFormat('italic');
        break;
      case 'underline':
        this.editor.selection.toggleFormat('underline');
        break;
      case 'strikethrough':
        this.editor.selection.toggleFormat('strikethrough');
        break;
      case 'link':
        this._showLinkPopover(buttonEl);
        break;
      case 'alignLeft':
      case 'alignCenter':
      case 'alignRight': {
        const sel = window.getSelection();
        if (sel && sel.anchorNode) {
          const editable = sel.anchorNode.nodeType === Node.ELEMENT_NODE
            ? sel.anchorNode.closest('[contenteditable="true"]')
            : sel.anchorNode.parentElement?.closest('[contenteditable="true"]');
          if (editable) {
            editable.style.textAlign = cmd === 'alignLeft' ? 'left' : cmd === 'alignCenter' ? 'center' : 'right';
            this.editor.events.emit('block:update', { blockId: this.editor.selection.activeBlockId });
          }
        }
        break;
      }
      case 'textColor':
        this._bgColorPicker.hide();
        if (this._colorPicker.el.style.display === 'block') {
          this._colorPicker.hide();
        } else {
          const rect = buttonEl.getBoundingClientRect();
          this._colorPicker.show(buttonEl, rect);
        }
        break;
      case 'bgColor':
        this._colorPicker.hide();
        if (this._bgColorPicker.el.style.display === 'block') {
          this._bgColorPicker.hide();
        } else {
          const rect2 = buttonEl.getBoundingClientRect();
          this._bgColorPicker.show(buttonEl, rect2);
        }
        break;
    }

    this._updateActiveStates();
  }

  _updateActiveStates() {
    const sel = this.editor.selection;
    this.el.querySelectorAll('.be-toolbar-btn').forEach(btn => {
      const cmd = btn.dataset.cmd;
      let active = false;

      switch (cmd) {
        case 'bold':
          active = sel.hasFormat('STRONG') || sel.hasFormat('B');
          break;
        case 'italic':
          active = sel.hasFormat('EM') || sel.hasFormat('I');
          break;
        case 'underline':
          active = sel.hasFormat('U');
          break;
        case 'strikethrough':
          active = sel.hasFormat('STRIKE') || sel.hasFormat('S');
          break;
        case 'alignLeft':
        case 'alignCenter':
        case 'alignRight': {
          active = false;
          const userSel = window.getSelection();
          if (userSel && userSel.anchorNode) {
            const editable = userSel.anchorNode.nodeType === Node.ELEMENT_NODE
              ? userSel.anchorNode.closest('[contenteditable="true"]')
              : userSel.anchorNode.parentElement?.closest('[contenteditable="true"]');
            if (editable) {
              const align = editable.style.textAlign;
              if (cmd === 'alignLeft' && align === 'left') active = true;
              if (cmd === 'alignCenter' && align === 'center') active = true;
              if (cmd === 'alignRight' && align === 'right') active = true;
            }
          }
          break;
        }
      }

      btn.classList.toggle('be-toolbar-btn--active', active);
    });
  }

  destroy() {
    clearTimeout(this._selTimeout);
    this._colorPicker?.destroy();
    this._bgColorPicker?.destroy();
    this.el?.remove();
    this._linkPopover?.remove();
  }
}
