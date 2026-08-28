/**
 * Block-Based Editor — Entry Point
 * 
 * Zero-dependency, vanilla JavaScript block editor.
 * Export the main classes for use as an ES module.
 */

export { BlockEditor } from './core/BlockEditor.js';
export { BlockRegistry } from './core/BlockRegistry.js';
export { EventBus } from './core/EventBus.js';
export { BaseBlock } from './blocks/BaseBlock.js';
export { ParagraphBlock } from './blocks/ParagraphBlock.js';
export { HeadingBlock } from './blocks/HeadingBlock.js';
export { BulletListBlock } from './blocks/BulletListBlock.js';
export { NumberedListBlock } from './blocks/NumberedListBlock.js';
