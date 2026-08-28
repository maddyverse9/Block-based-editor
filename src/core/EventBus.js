/**
 * EventBus — Simple pub/sub system for decoupled component communication.
 * 
 * Events emitted throughout the editor:
 *   block:add, block:remove, block:update, block:move,
 *   block:focus, block:blur, selection:change, document:change,
 *   command:open, command:close
 */
export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string} event 
   * @param {Function} handler 
   * @returns {Function} unsubscribe function
   */
  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe from an event.
   * @param {string} event 
   * @param {Function} handler 
   */
  off(event, handler) {
    const set = this._listeners.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) this._listeners.delete(event);
    }
  }

  /**
   * Emit an event with data.
   * @param {string} event 
   * @param {*} data 
   */
  emit(event, data) {
    const set = this._listeners.get(event);
    if (set) {
      for (const handler of set) {
        try {
          handler(data);
        } catch (err) {
          console.error(`[BlockEditor] Error in event handler for "${event}":`, err);
        }
      }
    }
  }

  /** Remove all listeners. */
  destroy() {
    this._listeners.clear();
  }
}
