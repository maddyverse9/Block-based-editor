/**
 * SelectionManager — Wraps browser Selection/Range APIs to provide
 * reliable cursor and selection tracking relative to the block model.
 */
export class SelectionManager {
  constructor(editor) {
    /** @type {import('./BlockEditor.js').BlockEditor} */
    this.editor = editor;

    this._onSelectionChange = this._onSelectionChange.bind(this);
    document.addEventListener('selectionchange', this._onSelectionChange);
  }

  /** Currently focused block id */
  get activeBlockId() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    const node = sel.anchorNode;
    const blockEl = node?.nodeType === Node.ELEMENT_NODE
      ? node.closest?.('[data-block-id]')
      : node?.parentElement?.closest?.('[data-block-id]');

    return blockEl?.dataset?.blockId ?? null;
  }

  /** 
   * Get the current browser Selection if it's inside our editor.
   * @returns {Selection|null}
   */
  getSelection() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    
    const editorEl = this.editor.container;
    if (!editorEl) return null;

    const anchor = sel.anchorNode;
    if (!editorEl.contains(anchor)) return null;
    
    return sel;
  }

  /**
   * Get the Range of the current selection inside the editor.
   * @returns {Range|null}
   */
  getRange() {
    const sel = this.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    return sel.getRangeAt(0);
  }

  /**
   * Returns the bounding rect of the current selection.
   * @returns {DOMRect|null}
   */
  getSelectionRect() {
    const range = this.getRange();
    if (!range) return null;
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;
    return rect;
  }

  /**
   * Check if there's a non-collapsed selection (i.e. text is highlighted).
   */
  hasSelection() {
    const sel = this.getSelection();
    return sel && !sel.isCollapsed;
  }

  /**
   * Get the selected text.
   * @returns {string}
   */
  getSelectedText() {
    const sel = this.getSelection();
    return sel ? sel.toString() : '';
  }

  /**
   * Wrap the current selection in an inline element.
   * @param {string} tagName - e.g., 'strong', 'em', 'span'
   * @param {Object} [attrs] - attributes to set, e.g., { style: 'color: red' }
   * @returns {HTMLElement|null} the wrapping element, or null if no selection
   */
  wrapSelection(tagName, attrs = {}) {
    const range = this.getRange();
    if (!range || range.collapsed) return null;

    const wrapper = document.createElement(tagName);
    for (const [key, val] of Object.entries(attrs)) {
      wrapper.setAttribute(key, val);
    }

    try {
      range.surroundContents(wrapper);
    } catch (e) {
      // surroundContents fails if selection spans partial elements.
      // Fall back to extracting and re-inserting.
      const fragment = range.extractContents();
      wrapper.appendChild(fragment);
      range.insertNode(wrapper);
    }

    // Reselect the wrapped content
    const sel = window.getSelection();
    sel.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(wrapper);
    sel.addRange(newRange);

    return wrapper;
  }

  /**
   * Check if the current selection has a specific formatting tag.
   * @param {string} tagName - e.g., 'STRONG', 'EM'
   * @returns {boolean}
   */
  hasFormat(tagName) {
    const sel = this.getSelection();
    if (!sel || sel.rangeCount === 0) return false;

    let node = sel.anchorNode;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

    while (node && node !== this.editor.container) {
      if (node.tagName === tagName.toUpperCase()) return true;
      node = node.parentElement;
    }
    return false;
  }

  /**
   * Toggle an inline format on the selection using execCommand as fallback.
   * @param {string} command - e.g., 'bold', 'italic', 'underline', 'strikethrough'
   */
  toggleFormat(command) {
    document.execCommand(command, false, null);
    this.editor.events.emit('block:update', { blockId: this.activeBlockId });
  }

  /**
   * Apply a color to selected text.
   * @param {string} color - CSS color value
   * @param {'color'|'background'} mode
   */
  applyColor(color, mode = 'color') {
    const command = mode === 'color' ? 'foreColor' : 'hiliteColor';
    document.execCommand(command, false, color);
    this.editor.events.emit('block:update', { blockId: this.activeBlockId });
  }

  /**
   * Remove color from selected text.
   * @param {'color'|'background'} mode
   */
  removeColor(mode = 'color') {
    if (mode === 'color') {
      document.execCommand('foreColor', false, 'inherit');
    } else {
      document.execCommand('hiliteColor', false, 'transparent');
    }
    this.editor.events.emit('block:update', { blockId: this.activeBlockId });
  }

  /**
   * Check if cursor is at the very start of a contenteditable element.
   * @param {HTMLElement} el - The contenteditable element
   * @returns {boolean}
   */
  isAtStart(el) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return false;

    // Create a range from the start of the element to the cursor
    const preRange = document.createRange();
    preRange.selectNodeContents(el);
    preRange.setEnd(range.startContainer, range.startOffset);
    
    return preRange.toString().length === 0;
  }

  /**
   * Check if cursor is at the very end of a contenteditable element.
   * @param {HTMLElement} el - The contenteditable element
   * @returns {boolean}
   */
  isAtEnd(el) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;

    const range = sel.getRangeAt(0);
    if (!range.collapsed) return false;

    const postRange = document.createRange();
    postRange.selectNodeContents(el);
    postRange.setStart(range.endContainer, range.endOffset);

    return postRange.toString().length === 0;
  }

  /**
   * Place cursor at the start of an element.
   * @param {HTMLElement} el
   */
  setCursorToStart(el) {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /**
   * Place cursor at the end of an element.
   * @param {HTMLElement} el
   */
  setCursorToEnd(el) {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  _onSelectionChange() {
    this.editor.events.emit('selection:change', {
      blockId: this.activeBlockId,
      hasSelection: this.hasSelection(),
    });
  }

  destroy() {
    document.removeEventListener('selectionchange', this._onSelectionChange);
  }
}
