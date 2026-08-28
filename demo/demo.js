/**
 * Demo page script — initializes the editor with sample content
 * and wires up the JSON preview panel and theme toggle.
 */
import { BlockEditor, Exporter } from '../src/index.js';

// ──────────────────────────────────────────────
// Initialize editor with sample content
// ──────────────────────────────────────────────

const sampleBlocks = [
  {
    type: 'contact',
    position: { x: 40, y: 40, w: 714, h: 80, pageIndex: 0, zIndex: 1 },
    data: {
      name: 'Alice Developer',
      title: 'Senior Software Engineer',
      contactInfo: 'alice@example.com • github.com/alice'
    }
  },
  {
    type: 'experience',
    position: { x: 40, y: 150, w: 714, h: 120, pageIndex: 0, zIndex: 2 },
    data: {
      company: 'Tech Innovators Inc.',
      role: 'Lead Engineer',
      date: '2021 - Present',
      description: '<ul><li>Led the migration from legacy monolith to microservices.</li><li>Improved performance by 40% across the board.</li></ul>'
    }
  },
  {
    type: 'experience',
    position: { x: 40, y: 290, w: 714, h: 100, pageIndex: 0, zIndex: 3 },
    data: {
      company: 'Web Solutions LLC',
      role: 'Frontend Developer',
      date: '2018 - 2021',
      description: '<ul><li>Built responsive web applications using React.</li></ul>'
    }
  },
  {
    type: 'education',
    position: { x: 40, y: 410, w: 714, h: 80, pageIndex: 0, zIndex: 4 },
    data: {
      institution: 'University of Science',
      degree: 'B.S. Computer Science',
      date: '2014 - 2018',
      description: 'Graduated with Honors.'
    }
  },
  {
    type: 'skills',
    position: { x: 40, y: 510, w: 714, h: 50, pageIndex: 0, zIndex: 5 },
    data: {
      category: 'Languages & Tools:',
      skills: 'JavaScript, TypeScript, React, Node.js, CSS, HTML, Git'
    }
  }
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
// Zoom & Export Actions
// ──────────────────────────────────────────────

const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomLevelText = document.getElementById('zoom-level');

zoomInBtn.addEventListener('click', () => {
  editor.setZoom(editor.getZoom() + 0.1);
});

zoomOutBtn.addEventListener('click', () => {
  editor.setZoom(editor.getZoom() - 0.1);
});

editor.events.on('zoom:change', (zoom) => {
  zoomLevelText.textContent = `${Math.round(zoom * 100)}%`;
});

document.getElementById('export-pdf').addEventListener('click', async () => {
  document.getElementById('export-pdf').textContent = 'Generating...';
  try {
    await Exporter.exportToPDF(editor);
  } finally {
    document.getElementById('export-pdf').textContent = '📄 PDF';
  }
});

document.getElementById('export-png').addEventListener('click', async () => {
  document.getElementById('export-png').textContent = 'Generating...';
  try {
    await Exporter.exportToPNG(editor);
  } finally {
    document.getElementById('export-png').textContent = '🖼️ PNG';
  }
});

document.getElementById('export-ats').addEventListener('click', () => {
  const text = Exporter.exportToATS(editor);
  const blob = new Blob([text], { type: 'text/plain' });
  const link = document.createElement('a');
  link.download = 'resume.txt';
  link.href = URL.createObjectURL(blob);
  link.click();
});

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
