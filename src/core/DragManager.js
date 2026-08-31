/**
 * DragManager — Handles block free positioning and resizing via mouse events.
 */
export class DragManager {
  /**
   * @param {import('./BlockEditor.js').BlockEditor} editor
   */
  constructor(editor) {
    this.editor = editor;
    this._dragState = null;
    this._resizeState = null;

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);

    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);
  }

  /**
   * Make a block freely draggable and resizable.
   * @param {import('../blocks/BaseBlock.js').BaseBlock} block
   */
  makeDraggable(block) {
    const handleEl = block.el.querySelector('.be-block-drag-handle');
    if (handleEl) {
      handleEl.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Only left click
        e.preventDefault();
        
        const zoom = this.editor.getZoom();
        this._dragState = {
          block,
          startX: e.clientX,
          startY: e.clientY,
          initialX: block.position.x,
          initialY: block.position.y,
          initialPageIndex: block.position.pageIndex || 0,
        };

        block.el.classList.add('be-block--dragging');
        // Bring to front
        block.position.zIndex = (block.position.zIndex || 1) + 100;
        block.updateStyles();
      });
    }

    const resizeHandles = block.el.querySelectorAll('.be-resize-handle');
    resizeHandles.forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        const zoom = this.editor.getZoom();
        this._resizeState = {
          block,
          type: handle.dataset.resize, // 'e', 's', 'se'
          startX: e.clientX,
          startY: e.clientY,
          initialW: block.position.w,
          initialH: block.position.h,
        };

        block.el.classList.add('be-block--dragging');
      });
    });
  }

  _onMouseMove(e) {
    const zoom = this.editor.getZoom();
    const PAGE_HEIGHT = 1123;
    const GRID_SIZE = 10; // Snap to 10px grid

    if (this._dragState) {
      e.preventDefault();
      const { block, startX, startY, initialX, initialY, initialPageIndex } = this._dragState;

      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;

      let newX = Math.round((initialX + dx) / GRID_SIZE) * GRID_SIZE;
      
      // Calculate global Y
      const initialGlobalY = initialPageIndex * PAGE_HEIGHT + initialY;
      let newGlobalY = Math.round((initialGlobalY + dy) / GRID_SIZE) * GRID_SIZE;

      // Calculate new page and local Y
      let newPageIndex = Math.floor(newGlobalY / PAGE_HEIGHT);
      let newLocalY = newGlobalY % PAGE_HEIGHT;

      // Push down logic: if block crosses the page boundary
      if (newLocalY + block.position.h > PAGE_HEIGHT) {
        // Push it to the next page
        newPageIndex += 1;
        newLocalY = 20; // Some top margin on the new page
      }

      // Prevent moving before page 0
      if (newPageIndex < 0) {
        newPageIndex = 0;
        newLocalY = Math.max(0, newLocalY);
      }

      this.editor.moveBlock(block.id, {
        x: newX,
        y: newLocalY,
        pageIndex: newPageIndex
      });

      this._clearDropHighlights();
      
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const targetBlockEl = elements.find(el => 
        el.classList && 
        el.classList.contains('be-block') && 
        el.dataset.blockId !== block.id
      );

      if (targetBlockEl) {
        const rect = targetBlockEl.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        const relativeY = e.clientY - rect.top;
        const width = rect.width;
        const height = rect.height;

        let side = '';
        let dropClass = '';

        if (relativeX < width * 0.2) {
          side = 'left';
          dropClass = 'be-block--drop-left';
        } else if (relativeX > width * 0.8) {
          side = 'right';
          dropClass = 'be-block--drop-right';
        } else if (relativeY < height * 0.5) {
          side = 'top';
          dropClass = 'be-block--drop-top';
        } else {
          side = 'bottom';
          dropClass = 'be-block--drop-bottom';
        }

        targetBlockEl.classList.add(dropClass);
        this._currentDropTarget = { id: targetBlockEl.dataset.blockId, side };
      } else {
        this._currentDropTarget = null;
      }
    }

    if (this._resizeState) {
      e.preventDefault();
      const { block, type, startX, startY, initialW, initialH } = this._resizeState;

      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;

      let newW = initialW;
      let newH = initialH;

      if (type.includes('e')) {
        newW = Math.max(50, Math.round((initialW + dx) / GRID_SIZE) * GRID_SIZE);
      }
      if (type.includes('s')) {
        newH = Math.max(20, Math.round((initialH + dy) / GRID_SIZE) * GRID_SIZE);
      }

      block.position.w = newW;
      block.position.h = newH;
      block.updateStyles();
      this.editor.events.emit('block:resize', { blockId: block.id });
    }
  }

  _clearDropHighlights() {
    const classes = ['be-block--drop-left', 'be-block--drop-right', 'be-block--drop-top', 'be-block--drop-bottom'];
    classes.forEach(cls => {
      document.querySelectorAll(`.${cls}`).forEach(el => el.classList.remove(cls));
    });
  }

  _onMouseUp(e) {
    if (this._dragState) {
      const { block } = this._dragState;
      block.el.classList.remove('be-block--dragging');
      // Reset z-index
      block.position.zIndex = Math.max(1, block.position.zIndex - 100);
      block.updateStyles();
      
      this._clearDropHighlights();

      if (this._currentDropTarget) {
        const target = this._currentDropTarget;
        this.editor.layout.moveBlock(block.id, target.id, target.side);
        this._currentDropTarget = null;
      }

      this.editor.history.captureImmediate();
      this.editor.layout.computePositions();
      
      this._dragState = null;
    }

    if (this._resizeState) {
      const { block } = this._resizeState;
      block.el.classList.remove('be-block--dragging');
      this.editor.history.captureImmediate();
      this.editor.layout.computePositions();
      this._resizeState = null;
    }
  }

  destroy() {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
  }
}
