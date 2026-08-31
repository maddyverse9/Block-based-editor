export const LAYOUT = {
  PAGE_WIDTH: 794,
  PAGE_HEIGHT: 1123,
  PAGE_MARGIN: 40,
  BLOCK_GAP: 12,
  USABLE_WIDTH: 714, // PAGE_WIDTH - 2 * PAGE_MARGIN
};

export class LayoutManager {
  constructor(editor) {
    this.editor = editor;
    this.pages = [];
  }

  // Build the initial layout tree from a simple sequential array of blocks
  initFromBlocks(blockIds) {
    this.pages = [];
    if (blockIds.length === 0) return;

    let currentPage = { rows: [] };
    this.pages.push(currentPage);

    for (const blockId of blockIds) {
      const block = this.editor.blocks.get(blockId);
      if (!block) continue;
      
      // Initially put each block in its own row on page 0
      // If the layout tree already exists in the JSON, it will be loaded via deserialize()
      currentPage.rows.push({
        columns: [
          { blockIds: [blockId] }
        ]
      });
    }
  }

  serialize() {
    return JSON.parse(JSON.stringify(this.pages));
  }

  deserialize(data) {
    if (data && Array.isArray(data)) {
      this.pages = JSON.parse(JSON.stringify(data));
    }
  }

  // Re-calculate X, Y, W for all blocks based on the tree structure
  computePositions() {
    const { PAGE_MARGIN, BLOCK_GAP, USABLE_WIDTH, PAGE_HEIGHT } = LAYOUT;

    let globalRowY = PAGE_MARGIN;
    let currentPageIndex = 0;

    for (let pageIdx = 0; pageIdx < this.pages.length; pageIdx++) {
      const page = this.pages[pageIdx];
      let rowY = PAGE_MARGIN;
      
      for (let rowIdx = 0; rowIdx < page.rows.length; rowIdx++) {
        const row = page.rows[rowIdx];
        const numCols = row.columns.length;
        
        // Compute column width evenly distributed
        let colWidth = USABLE_WIDTH;
        if (numCols > 1) {
          colWidth = (USABLE_WIDTH - (numCols - 1) * BLOCK_GAP) / numCols;
        }

        let maxRowHeight = 0;
        
        for (let colIdx = 0; colIdx < numCols; colIdx++) {
          const col = row.columns[colIdx];
          const colX = PAGE_MARGIN + colIdx * (colWidth + BLOCK_GAP);
          
          let blockY = rowY;
          for (let bIdx = 0; bIdx < col.blockIds.length; bIdx++) {
            const blockId = col.blockIds[bIdx];
            const block = this.editor.blocks.get(blockId);
            
            if (block) {
              block.position = {
                x: colX,
                y: blockY,
                w: colWidth,
                h: block.position.h, // Retain existing minHeight or computed height
                pageIndex: currentPageIndex,
                zIndex: block.position.zIndex || 1
              };
              
              block.updateStyles();
              
              const actualHeight = this.editor._getActualBlockHeight(block);
              blockY += actualHeight + BLOCK_GAP;
            }
          }
          
          const colHeight = blockY - rowY - BLOCK_GAP; // Remove trailing gap
          maxRowHeight = Math.max(maxRowHeight, colHeight);
        }
        
        rowY += maxRowHeight + BLOCK_GAP;
        
        // If a row forces us past the bottom page margin, push to next page
        // Soft boundary: the current row stays if it's the only one, but subsequent rows move.
        // For simplicity, we just flow content onto the next page if Y exceeds bound.
        if (rowY > PAGE_HEIGHT - PAGE_MARGIN && rowIdx < page.rows.length - 1) {
           currentPageIndex++;
           rowY = PAGE_MARGIN;
        }
      }
      
      currentPageIndex++;
    }
    
    this._cleanupEmptyElements();
  }

  // Removes empty columns and rows from the tree
  _cleanupEmptyElements() {
    for (let p = 0; p < this.pages.length; p++) {
      const page = this.pages[p];
      for (let r = page.rows.length - 1; r >= 0; r--) {
        const row = page.rows[r];
        for (let c = row.columns.length - 1; c >= 0; c--) {
          const col = row.columns[c];
          if (col.blockIds.length === 0) {
             row.columns.splice(c, 1);
          }
        }
        if (row.columns.length === 0) {
          page.rows.splice(r, 1);
        }
      }
      // Keep at least one empty page if there are no pages? We'll leave empty pages alone for now
      // or remove them if needed, but BlockEditor might expect at least page 0.
    }
  }

  // Find where a block is in the tree
  findBlock(blockId) {
    for (let p = 0; p < this.pages.length; p++) {
      const page = this.pages[p];
      for (let r = 0; r < page.rows.length; r++) {
        const row = page.rows[r];
        for (let c = 0; c < row.columns.length; c++) {
          const col = row.columns[c];
          const bIdx = col.blockIds.indexOf(blockId);
          if (bIdx !== -1) {
            return { pageIndex: p, rowIndex: r, colIndex: c, blockIndex: bIdx };
          }
        }
      }
    }
    return null;
  }

  removeBlock(blockId) {
    const loc = this.findBlock(blockId);
    if (!loc) return;
    
    const col = this.pages[loc.pageIndex].rows[loc.rowIndex].columns[loc.colIndex];
    col.blockIds.splice(loc.blockIndex, 1);
    
    this._cleanupEmptyElements();
  }

  // Moves a block to a new position relative to target block
  // direction: 'top', 'bottom', 'left', 'right', 'center'
  moveBlock(blockId, targetBlockId, direction) {
    if (blockId === targetBlockId) return;
    
    const targetLoc = this.findBlock(targetBlockId);
    if (!targetLoc) return;

    this.removeBlock(blockId); // removes it, clean up empty elements
    
    // Find target again since indices might have shifted after cleanup
    const tLoc = this.findBlock(targetBlockId);
    if (!tLoc) {
       // Target disappeared? Fallback to putting it at the end
       this._appendToEnd(blockId);
       return;
    }

    const page = this.pages[tLoc.pageIndex];
    const row = page.rows[tLoc.rowIndex];
    
    switch (direction) {
      case 'top':
        // Insert in the same column, above the target block
        const colTop = row.columns[tLoc.colIndex];
        colTop.blockIds.splice(tLoc.blockIndex, 0, blockId);
        break;
      case 'bottom':
        // Insert in the same column, below the target block
        const colBot = row.columns[tLoc.colIndex];
        colBot.blockIds.splice(tLoc.blockIndex + 1, 0, blockId);
        break;
      case 'left':
        // Insert as a new column to the left
        row.columns.splice(tLoc.colIndex, 0, {
          blockIds: [blockId]
        });
        break;
      case 'right':
        // Insert as a new column to the right
        row.columns.splice(tLoc.colIndex + 1, 0, {
          blockIds: [blockId]
        });
        break;
    }
  }

  // Helper to insert a newly created block after an existing one in the same column
  insertBlockInSameColumn(newBlockId, afterBlockId) {
    const loc = this.findBlock(afterBlockId);
    if (!loc) {
      this._appendToEnd(newBlockId);
      return;
    }
    const col = this.pages[loc.pageIndex].rows[loc.rowIndex].columns[loc.colIndex];
    col.blockIds.splice(loc.blockIndex + 1, 0, newBlockId);
  }

  // Append block to end of the layout if we can't find a target
  _appendToEnd(blockId) {
    if (this.pages.length === 0) {
      this.pages.push({ rows: [] });
    }
    const lastPage = this.pages[this.pages.length - 1];
    lastPage.rows.push({
      columns: [{ blockIds: [blockId] }]
    });
  }
}
