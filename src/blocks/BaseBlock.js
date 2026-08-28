/**
 * BaseBlock — Abstract base class that all block types extend.
 * Provides common structure: ID, wrapper element, drag handle, block menu, 
 * and keyboard handling (Enter to split, Backspace to merge).
 */

let _blockIdCounter = 0;

export class BaseBlock {
  /**
   * @param {Object} data - Block data from the document model
   * @param {import('../core/BlockEditor.js').BlockEditor} editor
   */
  constructor(data, editor) {
    this.editor = editor;
    this.id = data.id || BaseBlock.generateId();
    this.type = data.type || 'paragraph';

    /** @type {HTMLElement} The outer wrapper */
    this.el = null;
    /** @type {HTMLElement} The contenteditable element for this block */
    this.contentEl = null;

    // Canvas positioning properties
    this.position = data.position || { x: 50, y: 50, w: 400, h: 100, pageIndex: 0, zIndex: 1 };
  }

  /**
   * Generate a unique block ID.
   * @returns {string}
   */
  static generateId() {
    return `blk_${Date.now().toString(36)}_${(++_blockIdCounter).toString(36)}`;
  }

  /**
   * Create the full block wrapper with controls.
   * Subclasses should call this after creating their contentEl.
   * @returns {HTMLElement}
   */
  createWrapper() {
    this.el = document.createElement('div');
    this.el.className = 'be-block';
    this.el.dataset.blockId = this.id;
    this.el.dataset.blockType = this.type;

    // Left controls container (visible on hover)
    const controls = document.createElement('div');
    controls.className = 'be-block-controls';

    // Add button (+)
    const addBtn = document.createElement('button');
    addBtn.className = 'be-block-add-btn';
    addBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    addBtn.title = 'Add block below';
    addBtn.setAttribute('tabindex', '-1');
    addBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.editor.blockMenu.show(this.id, addBtn);
    });

    // Drag handle
    const dragHandle = document.createElement('button');
    dragHandle.className = 'be-block-drag-handle';
    dragHandle.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="3" r="1.2" fill="currentColor"/><circle cx="9" cy="3" r="1.2" fill="currentColor"/><circle cx="5" cy="7" r="1.2" fill="currentColor"/><circle cx="9" cy="7" r="1.2" fill="currentColor"/><circle cx="5" cy="11" r="1.2" fill="currentColor"/><circle cx="9" cy="11" r="1.2" fill="currentColor"/></svg>`;
    dragHandle.title = 'Drag to reorder';
    dragHandle.setAttribute('tabindex', '-1');

    controls.appendChild(addBtn);
    controls.appendChild(dragHandle);

    // Content area
    const content = document.createElement('div');
    content.className = 'be-block-content';
    if (this.contentEl) {
      content.appendChild(this.contentEl);
    }

    this.el.appendChild(controls);
    this.el.appendChild(content);

    // Apply absolute positioning styles
    this.updateStyles();

    // Add resize handles
    this._addResizeHandles();

    // Register drag (we will pass the block instance to a new DragManager)
    this.editor.dragManager.makeDraggable(this);

    return this.el;
  }

  updateStyles() {
    if (!this.el) return;
    this.el.style.left = `${this.position.x}px`;
    this.el.style.top = `${this.position.y}px`;
    this.el.style.width = `${this.position.w}px`;
    this.el.style.height = `${this.position.h}px`;
    this.el.style.zIndex = this.position.zIndex;
  }

  _addResizeHandles() {
    const positions = ['se', 's', 'e'];
    positions.forEach(pos => {
      const handle = document.createElement('div');
      handle.className = `be-resize-handle be-resize-handle-${pos}`;
      handle.dataset.resize = pos;
      this.el.appendChild(handle);
    });
  }

  /**
   * Set up standard keyboard handlers on a contenteditable element.
   * @param {HTMLElement} editableEl
   */
  setupKeyboardHandlers(editableEl) {
    editableEl.addEventListener('keydown', (e) => {
      // Slash command trigger
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        // Only trigger at the start of an empty block or after text
        setTimeout(() => {
          const text = editableEl.textContent;
          if (text.endsWith('/')) {
            this.editor.commandPalette.show(this.id, editableEl);
          }
        }, 0);
      }

      // Enter — create new block below
      if (e.key === 'Enter' && !e.shiftKey) {
        // Allow enter in list items (handled by list blocks)
        if (this.type === 'bullet-list' || this.type === 'numbered-list') return;
        
        e.preventDefault();
        
        // Split content at cursor
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          
          // Get content after cursor
          const afterRange = document.createRange();
          afterRange.setStart(range.endContainer, range.endOffset);
          afterRange.setEnd(editableEl, editableEl.childNodes.length);
          const afterContent = afterRange.cloneContents();
          
          // Remove content after cursor from current block
          afterRange.deleteContents();

          // Create a temp div to get the HTML
          const temp = document.createElement('div');
          temp.appendChild(afterContent);
          const afterHTML = temp.innerHTML;

          // Create new paragraph block with the after content
          this.editor.addBlockAfter(this.id, {
            type: 'paragraph',
            data: { html: afterHTML }
          });
        }
      }

      // Backspace at start — merge with previous block
      if (e.key === 'Backspace' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (this.editor.selection.isAtStart(editableEl)) {
          const content = editableEl.innerHTML;
          // Only merge if we have content or this isn't the first block
          e.preventDefault();
          this.editor.mergeWithPrevious(this.id, content);
        }
      }

      // Delete at end — merge with next block
      if (e.key === 'Delete') {
        if (this.editor.selection.isAtEnd(editableEl)) {
          e.preventDefault();
          this.editor.mergeWithNext(this.id);
        }
      }

      // Arrow Up at top — focus previous block
      if (e.key === 'ArrowUp') {
        if (this.editor.selection.isAtStart(editableEl)) {
          e.preventDefault();
          this.editor.focusPreviousBlock(this.id);
        }
      }

      // Arrow Down at bottom — focus next block
      if (e.key === 'ArrowDown') {
        if (this.editor.selection.isAtEnd(editableEl)) {
          e.preventDefault();
          this.editor.focusNextBlock(this.id);
        }
      }

      // Tab — indent (for list blocks, handled in subclass)
      if (e.key === 'Tab') {
        if (this.type !== 'bullet-list' && this.type !== 'numbered-list') {
          e.preventDefault();
        }
      }
    });

    // Focus tracking
    editableEl.addEventListener('focus', () => {
      this.el?.classList.add('be-block--focused');
      this.editor.events.emit('block:focus', { blockId: this.id });
    });

    editableEl.addEventListener('blur', () => {
      this.el?.classList.remove('be-block--focused');
      this.editor.events.emit('block:blur', { blockId: this.id });
    });

    // Content change tracking
    editableEl.addEventListener('input', () => {
      this.editor.events.emit('block:update', { blockId: this.id });
      this.editor.history.capture();
    });
  }

  /**
   * Render the block. Must be overridden by subclasses.
   * @returns {HTMLElement}
   */
  render() {
    throw new Error('BaseBlock.render() must be overridden');
  }

  /**
   * Serialize the block to JSON data. Must be overridden, but subclass can call super.serialize() to get base props.
   * @returns {Object}
   */
  serialize() {
    return {
      id: this.id,
      type: this.type,
      position: { ...this.position },
      data: {}
    };
  }

  /**
   * Get the contenteditable element for focusing.
   * @returns {HTMLElement|null}
   */
  getEditableEl() {
    return this.contentEl;
  }

  /**
   * Focus this block's editable element.
   * @param {'start'|'end'} [position='end']
   */
  focus(position = 'end') {
    const el = this.getEditableEl();
    if (!el) return;
    if (position === 'start') {
      this.editor.selection.setCursorToStart(el);
    } else {
      this.editor.selection.setCursorToEnd(el);
    }
  }

  /**
   * Append HTML content to this block (used for merging).
   * @param {string} html
   */
  appendContent(html) {
    if (this.contentEl && html) {
      this.contentEl.innerHTML += html;
    }
  }

  /** Cleanup when block is removed. */
  destroy() {
    this.el?.remove();
  }
}
