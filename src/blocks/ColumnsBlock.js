import { BaseBlock } from './BaseBlock.js';

/**
 * ColumnsBlock - A container block that holds other blocks in multiple columns.
 */
export class ColumnsBlock extends BaseBlock {
  constructor(data, editor) {
    super(data, editor);
    this.type = 'columns';
    
    // Default to 2 columns if not specified
    this.columnsCount = data.columnsCount || 2;
    this.columnEls = [];
  }

  render() {
    this.contentEl = document.createElement('div');
    this.contentEl.className = 'be-columns-block';

    for (let i = 0; i < this.columnsCount; i++) {
      const colEl = document.createElement('div');
      colEl.className = 'be-column';
      colEl.dataset.colIndex = i;
      this.contentEl.appendChild(colEl);
      this.columnEls.push(colEl);
    }

    return this.createWrapper();
  }

  getColumnEl(index) {
    return this.columnEls[index] || this.columnEls[0];
  }

  addColumn() {
    this.columnsCount++;
    const colEl = document.createElement('div');
    colEl.className = 'be-column';
    colEl.dataset.colIndex = this.columnsCount - 1;
    this.contentEl.appendChild(colEl);
    this.columnEls.push(colEl);
    return this.columnsCount - 1;
  }

  serialize() {
    const data = super.serialize();
    data.columnsCount = this.columnsCount;
    return data;
  }
}
