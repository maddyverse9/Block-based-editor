/**
 * ParagraphBlock — Default block type. Simple contenteditable paragraph.
 * Supports inline formatting via the floating toolbar.
 * Detects markdown shortcuts:
 *   - # → heading1 ... ###### → heading6
 *   - - or * → bullet list
 *   - 1. → numbered list
 */
import { BaseBlock } from './BaseBlock.js';

export class ParagraphBlock extends BaseBlock {
  constructor(data, editor) {
    super({ ...data, type: 'paragraph' }, editor);
    this._html = data?.data?.html || '';
  }

  render() {
    this.contentEl = document.createElement('p');
    this.contentEl.className = 'be-paragraph';
    this.contentEl.setAttribute('contenteditable', 'true');
    this.contentEl.setAttribute('data-placeholder', "Type '/' for commands...");
    this.contentEl.innerHTML = this._html;

    this.setupKeyboardHandlers(this.contentEl);
    this._setupMarkdownShortcuts(this.contentEl);

    this.createWrapper();
    return this.el;
  }

  _setupMarkdownShortcuts(el) {
    el.addEventListener('input', () => {
      const text = el.textContent;

      // Heading shortcuts: # space, ## space, etc.
      const headingMatch = text.match(/^(#{1,6})\s$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        el.textContent = '';
        this.editor.convertBlock(this.id, 'heading', { level });
        return;
      }

      // Bullet list shortcuts: - space or * space
      if (text === '- ' || text === '* ') {
        el.textContent = '';
        this.editor.convertBlock(this.id, 'bullet-list', {});
        return;
      }

      // Numbered list shortcut: 1. space
      if (/^\d+\.\s$/.test(text)) {
        el.textContent = '';
        this.editor.convertBlock(this.id, 'numbered-list', {});
        return;
      }
    });
  }

  serialize() {
    const base = super.serialize();
    return {
      ...base,
      data: {
        html: this.contentEl ? this.contentEl.innerHTML : this._html,
      }
    };
  }
}
