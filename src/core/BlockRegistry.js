/**
 * BlockRegistry — Stores and retrieves block type definitions.
 * Each block type must provide a class that extends BaseBlock.
 */
export class BlockRegistry {
  constructor() {
    /** @type {Map<string, { blockClass: Function, label: string, icon: string, description: string, keywords: string[] }>} */
    this._types = new Map();
  }

  /**
   * Register a block type.
   * @param {string} type - Unique type identifier, e.g. 'paragraph', 'heading'
   * @param {Object} definition
   * @param {Function} definition.blockClass - The block class (extends BaseBlock)
   * @param {string} definition.label - Human-readable label
   * @param {string} definition.icon - Emoji or icon string
   * @param {string} definition.description - Short description for slash menu
   * @param {string[]} [definition.keywords] - Search keywords for slash menu
   */
  register(type, definition) {
    this._types.set(type, {
      ...definition,
      keywords: definition.keywords || [],
    });
  }

  /**
   * Get a block type definition.
   * @param {string} type
   * @returns {Object|undefined}
   */
  get(type) {
    return this._types.get(type);
  }

  /**
   * Get all registered block types.
   * @returns {Array<{ type: string, label: string, icon: string, description: string, keywords: string[] }>}
   */
  getAll() {
    const result = [];
    for (const [type, def] of this._types) {
      result.push({ type, ...def });
    }
    return result;
  }

  /**
   * Search block types by query (for slash menu filtering).
   * @param {string} query
   * @returns {Array}
   */
  search(query) {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAll();

    return this.getAll().filter(def => {
      return (
        def.type.includes(q) ||
        def.label.toLowerCase().includes(q) ||
        def.description.toLowerCase().includes(q) ||
        def.keywords.some(k => k.includes(q))
      );
    });
  }

  /**
   * Create a block instance.
   * @param {string} type
   * @param {Object} data - Block data
   * @param {import('./BlockEditor.js').BlockEditor} editor
   * @returns {import('../blocks/BaseBlock.js').BaseBlock}
   */
  create(type, data, editor) {
    const def = this._types.get(type);
    if (!def) throw new Error(`[BlockEditor] Unknown block type: "${type}"`);
    return new def.blockClass(data, editor);
  }
}
