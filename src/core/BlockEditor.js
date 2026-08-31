/**
 * BlockEditor — The main editor orchestrator.
 * Manages the document model, coordinates blocks, UI components, and events.
 * 
 * Usage:
 *   const editor = new BlockEditor({
 *     container: document.getElementById('editor'),
 *     initialBlocks: [...],
 *     onChange: (json) => { ... }
 *   });
 */
import { EventBus } from './EventBus.js';
import { BlockRegistry } from './BlockRegistry.js';
import { SelectionManager } from './SelectionManager.js';
import { HistoryManager } from './HistoryManager.js';
import { DragManager } from './DragManager.js';
import { CommandPalette } from '../ui/CommandPalette.js';
import { FloatingToolbar } from '../ui/FloatingToolbar.js';
import { BlockMenu } from '../ui/BlockMenu.js';
import { LayoutManager } from './LayoutManager.js';

// Block types
import { ParagraphBlock } from '../blocks/ParagraphBlock.js';
import { HeadingBlock } from '../blocks/HeadingBlock.js';
import { BulletListBlock } from '../blocks/BulletListBlock.js';
import { NumberedListBlock } from '../blocks/NumberedListBlock.js';


// Resume blocks
import { ContactBlock } from '../blocks/resume/ContactBlock.js';
import { ExperienceBlock } from '../blocks/resume/ExperienceBlock.js';
import { EducationBlock } from '../blocks/resume/EducationBlock.js';
import { SkillsBlock } from '../blocks/resume/SkillsBlock.js';

export class BlockEditor {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container - The DOM element to mount the editor in
   * @param {Array} [options.initialBlocks] - Initial block data as JSON
   * @param {Function} [options.onChange] - Callback when document changes
   * @param {boolean} [options.readOnly=false] - Whether the editor is read-only
   */
  constructor(options) {
    if (!options.container) {
      throw new Error('[BlockEditor] A container element is required.');
    }

    this.container = options.container;
    this.onChange = options.onChange || null;
    this.readOnly = options.readOnly || false;

    /** @type {Map<string, import('../blocks/BaseBlock.js').BaseBlock>} */
    this.blocks = new Map();

    /** @type {string[]} Ordered block IDs */
    this.blockOrder = [];

    // Core systems
    this.events = new EventBus();
    this.registry = new BlockRegistry();
    this.selection = new SelectionManager(this);
    this.history = new HistoryManager(this);
    this.dragManager = new DragManager(this);
    this.layout = new LayoutManager(this);

    // UI components
    this.commandPalette = new CommandPalette(this);
    this.floatingToolbar = new FloatingToolbar(this);
    this.blockMenu = new BlockMenu(this);

    // Register default block types
    this._registerDefaults();

    // Setup the container
    this._setupContainer();

    // Load initial blocks or create an empty paragraph
    if (options.initialBlocks && options.initialBlocks.length > 0) {
      this._loadBlocks(options.initialBlocks);
      this.layout.initFromBlocks(this.blockOrder);
      this.layout.computePositions();
    }

    // Attach UI
    this.floatingToolbar.attach(this.container);
    this.history.attach(this.container);

    // Listen for changes
    this.events.on('block:update', () => {
      this._emitChange();
      this._scheduleReflow();
    });
    this.events.on('block:add', () => {
      this._emitChange();
      this._scheduleReflow();
    });
    this.events.on('block:remove', () => {
      this._emitChange();
      this._scheduleReflow();
    });
    this.events.on('block:move', () => this._emitChange());

    // Capture initial state
    this.history.captureImmediate();

    // Reflow after initial render so blocks don't overlap
    requestAnimationFrame(() => {
      this.reflowBlocks();
    });
  }

  setZoom(level) {
    this._zoom = Math.max(0.2, Math.min(level, 3));
    if (this._canvasContainer) {
      this._canvasContainer.style.transform = `scale(${this._zoom})`;
    }
    this.events.emit('zoom:change', this._zoom);
  }

  getZoom() {
    return this._zoom || 1;
  }

  _registerDefaults() {
    this.registry.register('paragraph', {
      blockClass: ParagraphBlock,
      label: 'Text',
      icon: '📝',
      description: 'Plain text paragraph',
      keywords: ['paragraph', 'text', 'plain'],
    });

    this.registry.register('heading', {
      blockClass: HeadingBlock,
      label: 'Heading 1',
      icon: '𝗛₁',
      description: 'Large section heading',
      keywords: ['heading', 'title', 'h1'],
    });

    // Register H2-H6 as separate menu items
    for (let i = 2; i <= 6; i++) {
      this.registry.register(`heading-${i}`, {
        blockClass: HeadingBlock,
        label: `Heading ${i}`,
        icon: `𝗛${String.fromCharCode(8320 + i)}`,
        description: `Level ${i} heading`,
        keywords: [`heading`, `h${i}`, `title`],
      });
    }

    this.registry.register('bullet-list', {
      blockClass: BulletListBlock,
      label: 'Bullet List',
      icon: '•',
      description: 'Unordered list with nesting',
      keywords: ['bullet', 'list', 'unordered', 'ul'],
    });

    this.registry.register('numbered-list', {
      blockClass: NumberedListBlock,
      label: 'Numbered List',
      icon: '1.',
      description: 'Ordered list with nesting',
      keywords: ['numbered', 'list', 'ordered', 'ol'],
    });



    // Resume Blocks
    this.registry.register('contact', {
      blockClass: ContactBlock,
      label: 'Contact Info',
      icon: '📇',
      description: 'Name and contact details for resume',
      keywords: ['contact', 'name', 'email', 'resume'],
    });

    this.registry.register('experience', {
      blockClass: ExperienceBlock,
      label: 'Experience',
      icon: '💼',
      description: 'Job experience entry',
      keywords: ['experience', 'job', 'work', 'resume'],
    });

    this.registry.register('education', {
      blockClass: EducationBlock,
      label: 'Education',
      icon: '🎓',
      description: 'Education entry',
      keywords: ['education', 'school', 'university', 'resume'],
    });

    this.registry.register('skills', {
      blockClass: SkillsBlock,
      label: 'Skills',
      icon: '🛠️',
      description: 'Skills list',
      keywords: ['skills', 'tools', 'resume'],
    });
  }

  _setupContainer() {
    this.container.classList.add('block-editor');
    this.container.setAttribute('role', 'textbox');
    this.container.setAttribute('aria-multiline', 'true');
    this.container.setAttribute('aria-label', 'Block editor');

    this._zoom = 1;
    this._pages = [];

    // Workspace wrapper (scrollable)
    this._workspace = document.createElement('div');
    this._workspace.className = 'be-workspace';
    this.container.appendChild(this._workspace);

    // Canvas container (scalable)
    this._canvasContainer = document.createElement('div');
    this._canvasContainer.className = 'be-canvas-container';
    this._workspace.appendChild(this._canvasContainer);

    // Click on workspace -> defocus or handle generic click
    this._workspace.addEventListener('mousedown', (e) => {
      if (e.target === this._workspace || e.target === this._canvasContainer || e.target.classList.contains('be-page')) {
        // Deselect blocks when clicking empty space
        this.events.emit('workspace:click');
      }
    });
  }

  /**
   * Get or create a page by index
   * @param {number} pageIndex
   * @returns {HTMLElement} The content element of the page
   */
  _getPageContentEl(pageIndex) {
    while (this._pages.length <= pageIndex) {
      const page = document.createElement('div');
      page.className = 'be-page';
      
      const pageContent = document.createElement('div');
      pageContent.className = 'be-page-content';
      page.appendChild(pageContent);
      
      this._canvasContainer.appendChild(page);
      this._pages.push(pageContent);
    }
    return this._pages[pageIndex];
  }

  _loadBlocks(blocksData) {
    blocksData.forEach(blockData => {
      // Strip any legacy parent/column data
      if (blockData.position) {
        delete blockData.position.parentId;
        delete blockData.position.colIndex;
      }
      this.addBlock(blockData, { silent: true });
    });
    // Build initial layout from flat block list if no layout info exists (handled in deserialize)
  }

  // ──────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────

  /**
   * Get the editor content as structured JSON.
   * @returns {{ version: string, blocks: Array }}
   */
  getJSON() {
    return {
      version: '1.0',
      layout: this.layout.serialize(),
      blocks: this.blockOrder.map(id => {
        const block = this.blocks.get(id);
        return block ? block.serialize() : null;
      }).filter(Boolean),
    };
  }

  /**
   * Set the editor content from JSON.
   * @param {Object} json
   * @param {Object} [options]
   * @param {boolean} [options.skipHistory=false]
   */
  setJSON(json, options = {}) {
    // Clear existing blocks
    this.blockOrder.forEach(id => {
      const block = this.blocks.get(id);
      block?.destroy();
    });
    this.blocks.clear();
    this.blockOrder = [];
    
    // Clear pages
    this._canvasContainer.innerHTML = '';
    this._pages = [];

    // Load new blocks
    if (json.blocks && json.blocks.length > 0) {
      this._loadBlocks(json.blocks);
    }
    
    if (json.layout) {
      this.layout.deserialize(json.layout);
    } else {
      // Fallback for older json without layout
      this.layout.initFromBlocks(this.blockOrder);
    }
    
    this.layout.computePositions();

    if (!options.skipHistory) {
      this.history.captureImmediate();
    }
  }

  /**
   * Add a block at the end.
   * @param {Object} blockData
   * @param {Object} [options]
   * @returns {import('../blocks/BaseBlock.js').BaseBlock}
   */
  addBlock(blockData, options = {}) {
    const block = this._createBlock(blockData);
    const el = block.render();

    this.blocks.set(block.id, block);
    this.blockOrder.push(block.id);
    
    const pageContentEl = this._getPageContentEl(block.position.pageIndex || 0);
    pageContentEl.appendChild(el);

    if (!options.silent) {
      this.events.emit('block:add', { blockId: block.id });
      block.focus('start');
    }

    return block;
  }

  addBlockAfter(afterBlockId, blockData) {
    const afterBlock = this.blocks.get(afterBlockId);
    const newBlock = this.addBlock(blockData, { silent: true });
    
    if (afterBlock) {
      this.layout.insertBlockInSameColumn(newBlock.id, afterBlock.id);
    } else {
      this.layout.initFromBlocks(this.blockOrder); // simple fallback
    }
    
    this.layout.computePositions();
    
    this.events.emit('block:add', { blockId: newBlock.id });
    newBlock.focus('start');
    
    return newBlock;
  }

  /**
   * Remove a block by ID.
   * @param {string} blockId
   */
  removeBlock(blockId) {
    const block = this.blocks.get(blockId);
    if (!block) return;

    this.layout.removeBlock(blockId);

    const idx = this.blockOrder.indexOf(blockId);
    block.destroy();
    this.blocks.delete(blockId);
    this.blockOrder.splice(idx, 1);

    this.layout.computePositions();
    this.events.emit('block:remove', { blockId });
  }

  /**
   * Convert a block to a different type.
   * @param {string} blockId
   * @param {string} newType
   * @param {Object} data
   */
  convertBlock(blockId, newType, data = {}) {
    const oldBlock = this.blocks.get(blockId);
    if (!oldBlock) return;

    const idx = this.blockOrder.indexOf(blockId);
    const oldEl = oldBlock.el;

    // Maintain original position and z-index
    blockData.position = { ...oldBlock.position };
    
    // Resolve heading subtypes (heading-2, heading-3, etc.)
    let resolvedType = newType;
    
    if (newType.startsWith('heading-')) {
      const level = parseInt(newType.split('-')[1]);
      resolvedType = 'heading';
      blockData = { ...blockData, type: 'heading', data: { ...data, level } };
    } else if (newType === 'heading' && !data.level) {
      blockData.data.level = data.level || 1;
    }

    // Carry over text content if converting from a text block
    const oldEditable = oldBlock.getEditableEl();
    if (oldEditable && resolvedType !== 'bullet-list' && resolvedType !== 'numbered-list') {
      blockData.data.html = oldEditable.innerHTML;
    }

    const newBlock = this._createBlock(blockData);
    const newEl = newBlock.render();

    // Replace in DOM
    const oldParent = oldEl.parentNode;
    if (oldParent) {
      oldParent.replaceChild(newEl, oldEl);
    }

    // Replace in maps
    oldBlock.destroy();
    this.blocks.delete(blockId);
    this.blocks.set(newBlock.id, newBlock);
    this.blockOrder[idx] = newBlock.id;

    this.events.emit('block:update', { blockId: newBlock.id });
    newBlock.focus('end');
    this.history.captureImmediate();
  }

  /**
   * Move a block visually (used by drag manager for ghosting).
   * @param {string} blockId
   * @param {Object} newPosition
   */
  moveBlock(blockId, newPosition) {
    const block = this.blocks.get(blockId);
    if (!block) return;

    const oldPageIndex = block.position.pageIndex || 0;
    const newPageIndex = newPosition.pageIndex || 0;

    block.position = { ...block.position, ...newPosition };
    block.updateStyles();

    if (oldPageIndex !== newPageIndex) {
      const newPageEl = this._getPageContentEl(newPageIndex);
      newPageEl.appendChild(block.el);
    }

    this.events.emit('block:move', { blockId });
    this.history.captureImmediate();
  }

  /**
   * Merge a block's content with the previous block.
   * @param {string} blockId
   * @param {string} content - HTML content to append to previous block
   */
  mergeWithPrevious(blockId, content) {
    const idx = this.blockOrder.indexOf(blockId);
    if (idx <= 0) return;

    const prevId = this.blockOrder[idx - 1];
    const prevBlock = this.blocks.get(prevId);
    const currBlock = this.blocks.get(blockId);
    if (!prevBlock || !currBlock) return;

    // Remember cursor position for placing it at the merge point
    const prevEditable = prevBlock.getEditableEl();
    const prevLength = prevEditable ? prevEditable.textContent.length : 0;

    prevBlock.appendContent(content);
    
    // Remove current block
    currBlock.destroy();
    this.blocks.delete(blockId);
    this.blockOrder.splice(idx, 1);

    // Place cursor at the merge point
    if (prevEditable) {
      prevBlock.focus('end');
      // Try to set cursor at the merge point
      try {
        const sel = window.getSelection();
        const range = document.createRange();
        const textNodes = this._getTextNodes(prevEditable);
        let charCount = 0;
        for (const textNode of textNodes) {
          if (charCount + textNode.length >= prevLength) {
            range.setStart(textNode, prevLength - charCount);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            break;
          }
          charCount += textNode.length;
        }
      } catch (e) {
        prevBlock.focus('end');
      }
    }

    this.events.emit('block:remove', { blockId });
    this.history.captureImmediate();
  }

  /**
   * Merge the next block's content into the current block.
   * @param {string} blockId
   */
  mergeWithNext(blockId) {
    const idx = this.blockOrder.indexOf(blockId);
    if (idx >= this.blockOrder.length - 1) return;

    const nextId = this.blockOrder[idx + 1];
    const nextBlock = this.blocks.get(nextId);
    if (!nextBlock) return;

    const nextEditable = nextBlock.getEditableEl();
    const content = nextEditable ? nextEditable.innerHTML : '';

    this.mergeWithPrevious(nextId, ''); // Remove next block
    const currBlock = this.blocks.get(blockId);
    currBlock?.appendContent(content);
  }

  /**
   * Focus the previous block.
   * @param {string} blockId
   */
  focusPreviousBlock(blockId) {
    const idx = this.blockOrder.indexOf(blockId);
    if (idx <= 0) return;

    const prevId = this.blockOrder[idx - 1];
    const prevBlock = this.blocks.get(prevId);
    prevBlock?.focus('end');
  }

  /**
   * Focus the next block.
   * @param {string} blockId
   */
  focusNextBlock(blockId) {
    const idx = this.blockOrder.indexOf(blockId);
    if (idx >= this.blockOrder.length - 1) return;

    const nextId = this.blockOrder[idx + 1];
    const nextBlock = this.blocks.get(nextId);
    nextBlock?.focus('start');
  }

  /**
   * Get the actual rendered height of a block element (accounts for height:auto).
   * @param {import('../blocks/BaseBlock.js').BaseBlock} block
   * @returns {number}
   */
  _getActualBlockHeight(block) {
    if (block.el) {
      const rendered = block.el.getBoundingClientRect();
      const zoom = this.getZoom();
      // Divide by zoom since getBoundingClientRect includes CSS transforms
      return rendered.height / zoom;
    }
    return block.position.h;
  }

  /**
   * Schedule a debounced compute to layout blocks.
   */
  _scheduleReflow() {
    clearTimeout(this._reflowTimeout);
    this._reflowTimeout = setTimeout(() => {
      this.layout.computePositions();
    }, 50);
  }

  /** Destroy the editor and clean up. */
  destroy() {
    this.blockOrder.forEach(id => {
      this.blocks.get(id)?.destroy();
    });
    this.blocks.clear();
    this.blockOrder = [];

    this.events.destroy();
    this.selection.destroy();
    this.history.destroy();
    this.dragManager.destroy();
    this.commandPalette.destroy();
    this.floatingToolbar.destroy();
    this.blockMenu.destroy();

    this.container.innerHTML = '';
    this.container.classList.remove('block-editor');
  }

  // ──────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────

  _createBlock(blockData) {
    // Handle heading subtypes
    let type = blockData.type;
    let data = blockData;
    
    if (type?.startsWith('heading-')) {
      const level = parseInt(type.split('-')[1]);
      type = 'heading';
      data = { ...blockData, type: 'heading', data: { ...blockData.data, level } };
    }
    
    return this.registry.create(type, data, this);
  }

  _emitChange() {
    clearTimeout(this._changeTimeout);
    this._changeTimeout = setTimeout(() => {
      if (this.onChange) {
        this.onChange(this.getJSON());
      }
      this.events.emit('document:change', this.getJSON());
    }, 100);
  }

  _getTextNodes(el) {
    const nodes = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      nodes.push(node);
    }
    return nodes;
  }
}
