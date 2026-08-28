/**
 * DragManager — Handles block reordering via native HTML Drag & Drop API.
 * Shows visual drop indicators between blocks.
 */
export class DragManager {
  /**
   * @param {import('./BlockEditor.js').BlockEditor} editor
   */
  constructor(editor) {
    this.editor = editor;
    this._draggedBlockId = null;
    this._dropIndicator = null;
    this._dropTarget = null; // { blockId, position: 'before' | 'after' }

    this._createDropIndicator();
  }

  _createDropIndicator() {
    this._dropIndicator = document.createElement('div');
    this._dropIndicator.className = 'be-drop-indicator';
    this._dropIndicator.style.display = 'none';
  }

  /**
   * Make a block draggable via its handle element.
   * @param {string} blockId
   * @param {HTMLElement} handleEl - The drag handle element
   * @param {HTMLElement} blockEl - The entire block wrapper
   */
  makeDraggable(blockId, handleEl, blockEl) {
    blockEl.setAttribute('draggable', 'false'); // Controlled by handle
    
    handleEl.addEventListener('mousedown', () => {
      blockEl.setAttribute('draggable', 'true');
    });

    handleEl.addEventListener('mouseup', () => {
      blockEl.setAttribute('draggable', 'false');
    });

    blockEl.addEventListener('dragstart', (e) => {
      this._draggedBlockId = blockId;
      blockEl.classList.add('be-block--dragging');
      
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', blockId);

      // Append drop indicator to editor
      this.editor.container.appendChild(this._dropIndicator);
    });

    blockEl.addEventListener('dragend', () => {
      this._draggedBlockId = null;
      blockEl.classList.remove('be-block--dragging');
      blockEl.setAttribute('draggable', 'false');
      this._hideDropIndicator();
      this._dropTarget = null;
    });

    blockEl.addEventListener('dragover', (e) => {
      if (!this._draggedBlockId || this._draggedBlockId === blockId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const rect = blockEl.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? 'before' : 'after';

      this._dropTarget = { blockId, position };
      this._showDropIndicator(blockEl, position);
    });

    blockEl.addEventListener('dragleave', (e) => {
      // Only hide if truly leaving the element
      if (!blockEl.contains(e.relatedTarget)) {
        this._hideDropIndicator();
      }
    });

    blockEl.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!this._draggedBlockId || !this._dropTarget) return;
      if (this._draggedBlockId === this._dropTarget.blockId) return;

      this.editor.moveBlock(
        this._draggedBlockId,
        this._dropTarget.blockId,
        this._dropTarget.position
      );

      this._hideDropIndicator();
      this._draggedBlockId = null;
      this._dropTarget = null;
    });
  }

  _showDropIndicator(blockEl, position) {
    this._dropIndicator.style.display = 'block';
    const rect = blockEl.getBoundingClientRect();
    const containerRect = this.editor.container.getBoundingClientRect();

    const top = position === 'before'
      ? rect.top - containerRect.top - 2
      : rect.bottom - containerRect.top - 2;

    this._dropIndicator.style.top = `${top}px`;
    this._dropIndicator.style.left = '0';
    this._dropIndicator.style.width = '100%';
  }

  _hideDropIndicator() {
    if (this._dropIndicator) {
      this._dropIndicator.style.display = 'none';
    }
  }

  destroy() {
    this._dropIndicator?.remove();
  }
}
