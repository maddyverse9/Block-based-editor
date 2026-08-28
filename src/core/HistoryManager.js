/**
 * HistoryManager — Undo/redo stack using document model snapshots.
 * Debounces snapshot capture so rapid typing doesn't fill the stack.
 */
export class HistoryManager {
  /**
   * @param {import('./BlockEditor.js').BlockEditor} editor
   * @param {Object} [options]
   * @param {number} [options.maxHistory=100]
   * @param {number} [options.debounceMs=400]
   */
  constructor(editor, options = {}) {
    this.editor = editor;
    this.maxHistory = options.maxHistory ?? 100;
    this.debounceMs = options.debounceMs ?? 400;

    /** @type {string[]} Stack of JSON-serialized snapshots */
    this._undoStack = [];
    /** @type {string[]} */
    this._redoStack = [];

    this._debounceTimer = null;
    this._lastSnapshot = null;

    this._onKeyDown = this._onKeyDown.bind(this);
  }

  /** Start listening for undo/redo keyboard shortcuts. */
  attach(container) {
    container.addEventListener('keydown', this._onKeyDown);
  }

  /**
   * Capture a snapshot of the current document state.
   * Call this after any mutation.
   */
  capture() {
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this._pushSnapshot();
    }, this.debounceMs);
  }

  /** Force an immediate snapshot (e.g., before a destructive action). */
  captureImmediate() {
    clearTimeout(this._debounceTimer);
    this._pushSnapshot();
  }

  _pushSnapshot() {
    const json = JSON.stringify(this.editor.getJSON());
    
    // Don't push duplicate snapshots
    if (json === this._lastSnapshot) return;
    
    this._undoStack.push(json);
    this._lastSnapshot = json;

    // Clear redo stack on new action
    this._redoStack = [];

    // Cap stack size
    if (this._undoStack.length > this.maxHistory) {
      this._undoStack.shift();
    }
  }

  /** Undo the last change. */
  undo() {
    if (this._undoStack.length <= 1) return; // Need at least one state to go back to

    // Save current state to redo stack
    const current = this._undoStack.pop();
    this._redoStack.push(current);

    // Restore previous state
    const prev = this._undoStack[this._undoStack.length - 1];
    this._lastSnapshot = prev;
    this.editor.setJSON(JSON.parse(prev), { skipHistory: true });
  }

  /** Redo the last undone change. */
  redo() {
    if (this._redoStack.length === 0) return;

    const next = this._redoStack.pop();
    this._undoStack.push(next);
    this._lastSnapshot = next;
    this.editor.setJSON(JSON.parse(next), { skipHistory: true });
  }

  _onKeyDown(e) {
    const isMod = e.metaKey || e.ctrlKey;
    if (!isMod) return;

    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.undo();
    } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
      e.preventDefault();
      this.redo();
    }
  }

  destroy() {
    clearTimeout(this._debounceTimer);
  }
}
