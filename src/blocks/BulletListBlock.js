/**
 * BulletListBlock — Nested bullet list with indentation support.
 * Tab to indent, Shift+Tab to outdent.
 * Each list item is its own contenteditable for precise control.
 */
import { BaseBlock } from './BaseBlock.js';

export class BulletListBlock extends BaseBlock {
  constructor(data, editor) {
    super({ ...data, type: 'bullet-list' }, editor);
    this._items = data?.data?.items || [{ html: '', children: [] }];
  }

  render() {
    this.contentEl = document.createElement('div');
    this.contentEl.className = 'be-list be-bullet-list';

    this._renderList(this.contentEl, this._items, 0);

    this.createWrapper();
    return this.el;
  }

  _renderList(container, items, depth) {
    const ul = document.createElement('ul');
    ul.className = 'be-list-items';
    ul.dataset.depth = depth;

    items.forEach((item, index) => {
      const li = this._createListItem(item, depth, index);
      ul.appendChild(li);
    });

    container.appendChild(ul);
  }

  _createListItem(item, depth, index) {
    const li = document.createElement('li');
    li.className = 'be-list-item';
    li.dataset.depth = depth;

    const itemContent = document.createElement('div');
    itemContent.className = 'be-list-item-content';
    itemContent.setAttribute('contenteditable', 'true');
    itemContent.setAttribute('data-placeholder', 'List item');
    itemContent.innerHTML = item.html || '';

    this._setupListItemKeys(itemContent, li, depth);

    li.appendChild(itemContent);

    // Render children
    if (item.children && item.children.length > 0) {
      this._renderList(li, item.children, depth + 1);
    }

    return li;
  }

  _setupListItemKeys(contentEl, li, depth) {
    contentEl.addEventListener('keydown', (e) => {
      // Enter — add new item at same level
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();

        // If the item is empty, outdent or convert to paragraph
        if (contentEl.textContent.trim() === '') {
          if (depth > 0) {
            this._outdentItem(li, contentEl);
          } else {
            // Convert to paragraph — remove this item, add paragraph after block
            li.remove();
            const remainingItems = this._collectItems();
            if (remainingItems.length === 0) {
              this.editor.convertBlock(this.id, 'paragraph', {});
            } else {
              this._items = remainingItems;
              this.editor.addBlockAfter(this.id, { type: 'paragraph', data: { html: '' } });
            }
          }
          return;
        }

        // Split content at cursor
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const afterRange = document.createRange();
          afterRange.setStart(range.endContainer, range.endOffset);
          afterRange.setEnd(contentEl, contentEl.childNodes.length);
          const afterContent = afterRange.cloneContents();
          afterRange.deleteContents();

          const temp = document.createElement('div');
          temp.appendChild(afterContent);

          const newLi = this._createListItem({ html: temp.innerHTML, children: [] }, depth, 0);
          
          // Insert after current li
          if (li.nextSibling) {
            li.parentNode.insertBefore(newLi, li.nextSibling);
          } else {
            li.parentNode.appendChild(newLi);
          }

          // Focus the new item
          const newContentEl = newLi.querySelector('.be-list-item-content');
          if (newContentEl) {
            this.editor.selection.setCursorToStart(newContentEl);
          }
        }
        
        this.editor.events.emit('block:update', { blockId: this.id });
        this.editor.history.capture();
      }

      // Tab — indent item
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        this._indentItem(li, contentEl);
      }

      // Shift+Tab — outdent item
      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        this._outdentItem(li, contentEl);
      }

      // Backspace at start of first item at depth 0 — convert to paragraph
      if (e.key === 'Backspace') {
        if (this.editor.selection.isAtStart(contentEl)) {
          e.preventDefault();
          e.stopPropagation();
          
          if (depth > 0) {
            this._outdentItem(li, contentEl);
          } else {
            // If this is the first and only item, convert block to paragraph
            const allItems = this.contentEl.querySelectorAll(':scope > .be-list-items > .be-list-item');
            if (allItems.length === 1 && contentEl.textContent === '') {
              this.editor.convertBlock(this.id, 'paragraph', {});
            } else if (allItems[0] === li) {
              // Merge with previous block
              const html = contentEl.innerHTML;
              li.remove();
              this._items = this._collectItems();
              this.editor.mergeWithPrevious(this.id, html);
            }
          }
        }
      }

      // Content change
      contentEl.addEventListener('input', () => {
        this.editor.events.emit('block:update', { blockId: this.id });
        this.editor.history.capture();
      });
    });

    // Focus tracking
    contentEl.addEventListener('focus', () => {
      this.el?.classList.add('be-block--focused');
      this.editor.events.emit('block:focus', { blockId: this.id });
    });

    contentEl.addEventListener('blur', () => {
      this.el?.classList.remove('be-block--focused');
      this.editor.events.emit('block:blur', { blockId: this.id });
    });
  }

  _indentItem(li, contentEl) {
    const prevLi = li.previousElementSibling;
    if (!prevLi) return; // Can't indent the first item

    // Find or create a sublist in the previous item
    let subList = prevLi.querySelector(':scope > .be-list-items');
    if (!subList) {
      subList = document.createElement('ul');
      subList.className = 'be-list-items';
      const parentDepth = parseInt(prevLi.dataset.depth || '0');
      subList.dataset.depth = parentDepth + 1;
      prevLi.appendChild(subList);
    }

    // Move li into the sublist
    const newDepth = parseInt(subList.dataset.depth || '1');
    li.dataset.depth = newDepth;
    subList.appendChild(li);

    // Re-setup keys with new depth
    contentEl.focus();
    this.editor.events.emit('block:update', { blockId: this.id });
    this.editor.history.capture();
  }

  _outdentItem(li, contentEl) {
    const parentUl = li.parentElement;
    if (!parentUl) return;

    const grandParentLi = parentUl.parentElement;
    if (!grandParentLi || !grandParentLi.classList.contains('be-list-item')) return;

    const grandParentUl = grandParentLi.parentElement;
    if (!grandParentUl) return;

    // Move li after the grandparent li
    const newDepth = parseInt(grandParentLi.dataset.depth || '0');
    li.dataset.depth = newDepth;

    if (grandParentLi.nextSibling) {
      grandParentUl.insertBefore(li, grandParentLi.nextSibling);
    } else {
      grandParentUl.appendChild(li);
    }

    // Clean up empty ul
    if (parentUl.children.length === 0) {
      parentUl.remove();
    }

    contentEl.focus();
    this.editor.events.emit('block:update', { blockId: this.id });
    this.editor.history.capture();
  }

  _collectItems(container = null) {
    const el = container || this.contentEl;
    const ul = el.querySelector(':scope > .be-list-items');
    if (!ul) return [];

    const items = [];
    for (const li of ul.children) {
      if (!li.classList.contains('be-list-item')) continue;
      const content = li.querySelector(':scope > .be-list-item-content');
      items.push({
        html: content ? content.innerHTML : '',
        children: this._collectItems(li),
      });
    }
    return items;
  }

  getEditableEl() {
    // Return the first list item's content
    return this.contentEl?.querySelector('.be-list-item-content') || null;
  }

  focus(position = 'end') {
    const items = this.contentEl?.querySelectorAll('.be-list-item-content');
    if (!items || items.length === 0) return;
    
    const target = position === 'start' ? items[0] : items[items.length - 1];
    if (position === 'start') {
      this.editor.selection.setCursorToStart(target);
    } else {
      this.editor.selection.setCursorToEnd(target);
    }
  }

  appendContent(html) {
    // Append to the last list item
    const items = this.contentEl?.querySelectorAll('.be-list-item-content');
    if (items && items.length > 0) {
      items[items.length - 1].innerHTML += html;
    }
  }

  serialize() {
    const base = super.serialize();
    return {
      ...base,
      data: {
        items: this._collectItems(),
      }
    };
  }
}
