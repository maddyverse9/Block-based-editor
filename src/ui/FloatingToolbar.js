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

    this._onSelectionChange = this._onSelectionChange.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._build();
  }

  _build() {
    this.el = document.createElement('div');
    this.el.className = 'be-floating-toolbar';
    this.el.style.display = 'none';

    const buttons = [
      { cmd: 'bold', icon: '<strong>B</strong>', title: 'Bold (Ctrl+B)' },
      { cmd: 'italic', icon: '<em>I</em>', title: 'Italic (Ctrl+I)' },
      { cmd: 'underline', icon: '<u>U</u>', title: 'Underline (Ctrl+U)' },
      { cmd: 'strikethrough', icon: '<s>S</s>', title: 'Strikethrough' },
      { cmd: 'code', icon: '<code>&lt;/&gt;</code>', title: 'Inline code' },
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
    // Don't show while command palette is open
    if (this.editor.commandPalette?.isVisible) {
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
      case 'code':
        // Wrap in <code> tag
        if (this.editor.selection.hasFormat('CODE')) {
          // Unwrap — execCommand doesn't have a 'code' command, so we manually handle
          document.execCommand('removeFormat', false, null);
        } else {
          const range = this.editor.selection.getRange();
          if (range && !range.collapsed) {
            const code = document.createElement('code');
            code.className = 'be-inline-code';
            try {
              range.surroundContents(code);
            } catch (e) {
              const fragment = range.extractContents();
              code.appendChild(fragment);
              range.insertNode(code);
            }
          }
        }
        this.editor.events.emit('block:update', { blockId: this.editor.selection.activeBlockId });
        break;
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
        case 'code':
          active = sel.hasFormat('CODE');
          break;
      }

      btn.classList.toggle('be-toolbar-btn--active', active);
    });
  }

  destroy() {
    clearTimeout(this._selTimeout);
    this._colorPicker?.destroy();
    this._bgColorPicker?.destroy();
    this.el?.remove();
  }
}
