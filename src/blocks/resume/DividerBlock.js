import { BaseBlock } from '../BaseBlock.js';

export class DividerBlock extends BaseBlock {
  constructor(data, editor) {
    super({ ...data, type: 'divider' }, editor);
    if (!data.position) {
      this.position = { x: 50, y: 50, w: 600, h: 20, pageIndex: 0, zIndex: 1 };
    }
  }

  render() {
    this.contentEl = document.createElement('div');
    this.contentEl.className = 'be-divider-block';
    
    // An empty contenteditable div just so we can capture focus/keyboard events
    const editorNode = document.createElement('div');
    editorNode.contentEditable = true;
    editorNode.className = 'be-divider-editor';
    // Hide the caret in CSS, visually it just shows a line.
    
    const hr = document.createElement('hr');
    
    this.contentEl.appendChild(editorNode);
    this.contentEl.appendChild(hr);

    this.setupKeyboardHandlers(editorNode);
    this.createWrapper();
    
    // Click on hr focuses the editor node
    this.contentEl.addEventListener('click', () => editorNode.focus());
    
    return this.el;
  }

  serialize() {
    return {
      ...super.serialize()
      // no data for divider
    };
  }
}
