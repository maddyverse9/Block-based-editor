/**
 * Demo page script — initializes the editor with sample content
 * and wires up the JSON preview panel and theme toggle.
 */
import { BlockEditor } from '../src/index.js';

// ──────────────────────────────────────────────
// Initialize editor with sample content
// ──────────────────────────────────────────────

const sampleBlocks = [
  {
    type: 'heading',
    data: { level: 1, html: 'Welcome to Block Editor ✨' }
  },
  {
    type: 'paragraph',
    data: { html: 'A <strong>zero-dependency</strong>, <em>vanilla JavaScript</em> block editor that outputs structured JSON. Perfect for building canvases, note apps, and node-based editors.' }
  },
  {
    type: 'heading',
    data: { level: 2, html: 'Getting Started' }
  },
  {
    type: 'paragraph',
    data: { html: 'Try these actions to explore the editor:' }
  },
  {
    type: 'bullet-list',
    data: {
      items: [
        { html: 'Type <code>/</code> to open the <strong>slash command menu</strong>', children: [] },
        { html: 'Select text to see the <strong>floating toolbar</strong>', children: [
          { html: 'Try <strong>bold</strong>, <em>italic</em>, <u>underline</u>, and <s>strikethrough</s>', children: [] },
          { html: 'Apply text colors and background highlights', children: [] },
        ]},
        { html: 'Use <code>Tab</code> and <code>Shift+Tab</code> to nest list items', children: [] },
        { html: 'Drag the ⠿ handle to reorder blocks', children: [] },
      ]
    }
  },
  {
    type: 'heading',
    data: { level: 3, html: 'Markdown Shortcuts' }
  },
  {
    type: 'numbered-list',
    data: {
      items: [
        { html: 'Type <code>#</code> + space for Heading 1', children: [] },
        { html: 'Type <code>##</code> + space for Heading 2 (up to <code>######</code>)', children: [] },
        { html: 'Type <code>-</code> or <code>*</code> + space for bullet list', children: [] },
        { html: 'Type <code>1.</code> + space for numbered list', children: [] },
      ]
    }
  },
  {
    type: 'paragraph',
    data: { html: 'The JSON output updates in real-time in the panel to the right →' }
  },
];

const editorContainer = document.getElementById('editor');
const jsonOutput = document.getElementById('json-output').querySelector('code');
const copyBtn = document.getElementById('copy-json');

const editor = new BlockEditor({
  container: editorContainer,
  initialBlocks: sampleBlocks,
  onChange: (json) => {
    updateJsonPreview(json);
  }
});

// Initial JSON display
updateJsonPreview(editor.getJSON());

// ──────────────────────────────────────────────
// JSON Preview with syntax highlighting
// ──────────────────────────────────────────────

function updateJsonPreview(json) {
  const formatted = JSON.stringify(json, null, 2);
  jsonOutput.innerHTML = syntaxHighlightJSON(formatted);
}

function syntaxHighlightJSON(json) {
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
          // Remove the trailing colon for display, re-add after
          return `<span class="${cls}">${match.slice(0, -1)}</span>:`;
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-bool';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

// ──────────────────────────────────────────────
// Copy JSON button
// ──────────────────────────────────────────────

copyBtn.addEventListener('click', async () => {
  try {
    const json = JSON.stringify(editor.getJSON(), null, 2);
    await navigator.clipboard.writeText(json);
    
    copyBtn.classList.add('demo-copy-btn--copied');
    copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8l3 3 5-6"/></svg>`;
    
    setTimeout(() => {
      copyBtn.classList.remove('demo-copy-btn--copied');
      copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M3 11V2.5A1.5 1.5 0 014.5 1H11"/></svg>`;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
});

// ──────────────────────────────────────────────
// Theme Toggle
// ──────────────────────────────────────────────

const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
let isDark = true;

themeToggle.addEventListener('click', () => {
  isDark = !isDark;
  document.body.classList.toggle('light-theme', !isDark);
  themeIcon.textContent = isDark ? '🌙' : '☀️';
});
