/**
 * HeadingBlock — Heading block supporting H1 through H6.
 * Users can change levels via the block menu or toolbar.
 */
import { BaseBlock } from './BaseBlock.js';

export class HeadingBlock extends BaseBlock {
  constructor(data, editor) {
    super({ ...data, type: 'heading' }, editor);
    this._level = data?.data?.level || 1;
    this._html = data?.data?.html || '';
  }

  render() {
    const tag = `h${this._level}`;
    this.contentEl = document.createElement(tag);
    this.contentEl.className = `be-heading be-heading--${this._level}`;
    this.contentEl.setAttribute('contenteditable', 'true');
    this.contentEl.setAttribute('data-placeholder', `Heading ${this._level}`);
    this.contentEl.innerHTML = this._html;

    this.setupKeyboardHandlers(this.contentEl);

    // If backspace at start and content is empty, convert back to paragraph
    this.contentEl.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && this.contentEl.textContent === '') {
        e.preventDefault();
        this.editor.convertBlock(this.id, 'paragraph', {});
      }
    });

    this.createWrapper();

    // Add level selector badge
    const levelBadge = document.createElement('button');
    levelBadge.className = 'be-heading-level-badge';
    levelBadge.textContent = `H${this._level}`;
    levelBadge.title = 'Change heading level';
    levelBadge.setAttribute('tabindex', '-1');
    levelBadge.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._cycleLevel();
    });
    
    this.el.querySelector('.be-block-controls').appendChild(levelBadge);

    return this.el;
  }

  _cycleLevel() {
    this._level = this._level >= 6 ? 1 : this._level + 1;
    const html = this.contentEl.innerHTML;
    
    // Replace the heading element
    const tag = `h${this._level}`;
    const newEl = document.createElement(tag);
    newEl.className = `be-heading be-heading--${this._level}`;
    newEl.setAttribute('contenteditable', 'true');
    newEl.setAttribute('data-placeholder', `Heading ${this._level}`);
    newEl.innerHTML = html;

    this.contentEl.replaceWith(newEl);
    this.contentEl = newEl;
    this.setupKeyboardHandlers(this.contentEl);

    // Update badge
    const badge = this.el.querySelector('.be-heading-level-badge');
    if (badge) badge.textContent = `H${this._level}`;

    this.editor.events.emit('block:update', { blockId: this.id });
    this.editor.history.capture();
    this.focus('end');
  }

  serialize() {
    const base = super.serialize();
    return {
      ...base,
      data: {
        level: this._level,
        html: this.contentEl ? this.contentEl.innerHTML : this._html,
      }
    };
  }
}
