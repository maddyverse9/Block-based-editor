# Block-Based Editor

A **zero-dependency**, vanilla JavaScript block-based editor that outputs structured JSON. Build canvases, note apps, and node-based editors with ease.

## ✨ Features

- **📝 Rich Text** — Bold, italic, underline, strikethrough, inline code
- **🎨 Colors** — Text color and background highlight with curated palettes
- **📋 Nested Lists** — Bullet and numbered lists with Tab/Shift+Tab nesting
- **📌 Headings** — H1 through H6 with markdown shortcuts
- **⌨️ Slash Commands** — Type `/` to insert any block type
- **🖱️ Floating Toolbar** — Select text to format inline
- **↕️ Drag & Drop** — Reorder blocks with drag handles
- **↩️ Undo / Redo** — Full history with Cmd/Ctrl+Z
- **🌙 Dark Mode** — Automatic dark/light mode support
- **📦 Zero Dependencies** — Pure vanilla JS, no build step required
- **🔌 Extensible** — Register custom block types via the block registry

## 🚀 Quick Start

### Use as ES Module

```html
<link rel="stylesheet" href="src/styles/editor.css">

<div id="my-editor"></div>

<script type="module">
  import { BlockEditor } from './src/index.js';

  const editor = new BlockEditor({
    container: document.getElementById('my-editor'),
    onChange: (json) => {
      console.log('Document changed:', json);
    }
  });
</script>
```

### With Initial Content

```js
const editor = new BlockEditor({
  container: document.getElementById('my-editor'),
  initialBlocks: [
    { type: 'heading', data: { level: 1, html: 'Hello World' } },
    { type: 'paragraph', data: { html: 'Start writing...' } },
    { type: 'bullet-list', data: { items: [
      { html: 'First item', children: [] },
      { html: 'Second item', children: [
        { html: 'Nested item', children: [] }
      ]}
    ]}}
  ],
  onChange: (json) => console.log(json),
});
```

## 📖 API

### `new BlockEditor(options)`

| Option | Type | Description |
|---|---|---|
| `container` | `HTMLElement` | **Required.** The DOM element to mount the editor in |
| `initialBlocks` | `Array` | Initial block data as JSON |
| `onChange` | `Function` | Callback when document changes, receives JSON |
| `readOnly` | `boolean` | Whether the editor is read-only |

### Methods

```js
editor.getJSON()            // Get document as structured JSON
editor.setJSON(json)        // Set document from JSON
editor.addBlock(blockData)  // Add a block at the end
editor.removeBlock(blockId) // Remove a block by ID
editor.destroy()            // Clean up and remove the editor
```

## 🧱 Block Types

| Type | Slash Command | Markdown Shortcut | Description |
|---|---|---|---|
| `paragraph` | `/text` | — | Default text block |
| `heading` | `/heading1` ... `/heading6` | `#` to `######` + space | Heading levels 1-6 |
| `bullet-list` | `/bullet` | `-` or `*` + space | Unordered nested list |
| `numbered-list` | `/numbered` | `1.` + space | Ordered nested list |

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `/` | Open slash command menu |
| `Enter` | Create new block / list item |
| `Backspace` | Merge with previous block (at start) |
| `Tab` | Indent list item |
| `Shift+Tab` | Outdent list item |
| `Cmd/Ctrl+Z` | Undo |
| `Cmd/Ctrl+Shift+Z` | Redo |
| `Cmd/Ctrl+B` | Bold |
| `Cmd/Ctrl+I` | Italic |
| `Cmd/Ctrl+U` | Underline |

## 🎨 Theming

The editor uses CSS custom properties for easy theming:

```css
.block-editor {
  --be-bg: #ffffff;
  --be-text: #1a1a2e;
  --be-primary: #6c63ff;
  --be-border: #e9ecef;
  --be-radius: 10px;
  /* ... see editor.css for all variables */
}
```

Add `.block-editor--dark` class or set `[data-theme="dark"]` on a parent for dark mode.

## 🔌 Custom Block Types

```js
import { BaseBlock } from './src/blocks/BaseBlock.js';

class MyCustomBlock extends BaseBlock {
  constructor(data, editor) {
    super({ ...data, type: 'custom' }, editor);
  }

  render() {
    this.contentEl = document.createElement('div');
    this.contentEl.textContent = 'My custom block!';
    this.createWrapper();
    return this.el;
  }

  serialize() {
    return { id: this.id, type: 'custom', data: {} };
  }
}

// Register before creating the editor
editor.registry.register('custom', {
  blockClass: MyCustomBlock,
  label: 'Custom Block',
  icon: '🔧',
  description: 'A custom block type',
});
```

## 🏗️ Development

```bash
# Serve the demo page
npm run dev

# Open http://localhost:3000/demo/
```

## 📄 License

MIT
