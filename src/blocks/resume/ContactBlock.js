import { BaseBlock } from '../BaseBlock.js';

const ICONS = {
  email: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>`
};

export class ContactBlock extends BaseBlock {
  constructor(data, editor) {
    super({ ...data, type: 'contact' }, editor);
    if (!data.position) {
      this.position = { x: 50, y: 50, w: 600, h: 80, pageIndex: 0, zIndex: 1 };
    }
    
    // Setup default dynamic links if new block
    const defaultLinks = [
      { id: Date.now().toString() + '-1', icon: ICONS.email, text: 'email@example.com', url: 'mailto:email@example.com' },
      { id: Date.now().toString() + '-2', icon: ICONS.phone, text: '(555) 123-4567', url: 'tel:+15551234567' },
      { id: Date.now().toString() + '-3', icon: ICONS.linkedin, text: 'linkedin.com/in/yourname', url: 'https://linkedin.com/in/yourname' }
    ];

    this._data = {
      name: data?.data?.name || 'Your Name',
      title: data?.data?.title || 'Professional Title',
      links: data?.data?.links || defaultLinks,
      linksAlign: data?.data?.linksAlign || 'center'
    };
    
    this._popoverEl = null;
    this._editingLinkId = null;
  }

  render() {
    this.contentEl = document.createElement('div');
    this.contentEl.className = 'be-resume-contact';
    
    const nameEl = document.createElement('div');
    nameEl.className = 'be-resume-contact-name';
    nameEl.contentEditable = true;
    nameEl.dataset.placeholder = 'Your Name';
    nameEl.innerHTML = this._data.name !== 'Your Name' ? this._data.name : '';
    if(!nameEl.innerHTML) nameEl.classList.add('empty');
    
    const titleEl = document.createElement('div');
    titleEl.className = 'be-resume-contact-title';
    titleEl.contentEditable = true;
    titleEl.dataset.placeholder = 'Professional Title';
    titleEl.innerHTML = this._data.title !== 'Professional Title' ? this._data.title : '';
    if(!titleEl.innerHTML) titleEl.classList.add('empty');
    
    this.linksContainer = document.createElement('div');
    this.linksContainer.className = 'be-resume-contact-links';
    this._applyLinksAlignment();
    
    this._renderLinks();

    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'be-contact-controls';

    const addLinkBtn = document.createElement('button');
    addLinkBtn.className = 'be-contact-add-link';
    addLinkBtn.innerHTML = '<span>+ Add Link</span>';
    addLinkBtn.addEventListener('click', (e) => {
      this._openPopover(e.target, null);
    });

    const alignControls = document.createElement('div');
    alignControls.className = 'be-contact-align-controls';
    
    ['left', 'center', 'right'].forEach(align => {
      const btn = document.createElement('button');
      btn.className = 'be-contact-align-btn';
      btn.innerHTML = align === 'left' ? '⫷' : align === 'center' ? '≡' : '⫸';
      btn.title = `Align ${align}`;
      btn.addEventListener('click', () => {
        this._data.linksAlign = align;
        this._applyLinksAlignment();
        this.editor.events.emit('block:update', { blockId: this.id });
      });
      alignControls.appendChild(btn);
    });

    controlsContainer.appendChild(addLinkBtn);
    controlsContainer.appendChild(alignControls);

    const headerContainer = document.createElement('div');
    headerContainer.className = 'be-contact-header-container';
    headerContainer.appendChild(nameEl);
    headerContainer.appendChild(titleEl);

    this.contentEl.appendChild(headerContainer);
    this.contentEl.appendChild(this.linksContainer);
    this.contentEl.appendChild(controlsContainer);

    const handleEmptyState = (el) => {
      if (el.innerHTML.trim() === '' || el.innerHTML === '<br>') {
        el.innerHTML = '';
        el.classList.add('empty');
      } else {
        el.classList.remove('empty');
      }
    };

    [nameEl, titleEl].forEach(el => {
      el.addEventListener('input', () => {
        handleEmptyState(el);
        this._data.name = nameEl.innerHTML;
        this._data.title = titleEl.innerHTML;
        this.editor.events.emit('block:update', { blockId: this.id });
      });
      el.addEventListener('blur', () => handleEmptyState(el));
      
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (el === nameEl) titleEl.focus();
        }
      });
    });

    this.setupKeyboardHandlers(titleEl); 
    this.createWrapper();
    return this.el;
  }

  _applyLinksAlignment() {
    const align = this._data.linksAlign || 'center';
    this.linksContainer.style.justifyContent = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  }

  _renderLinks() {
    this.linksContainer.innerHTML = '';

    this._data.links.forEach((link, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'be-contact-link-item';
      
      const anchorEl = document.createElement('a');
      anchorEl.className = 'be-contact-link-anchor';
      anchorEl.href = link.url || '#';
      anchorEl.target = '_blank';

      // Prevent navigation in editor mode
      anchorEl.addEventListener('click', (e) => {
        e.preventDefault();
        this._openPopover(anchorEl, link.id);
      });
      
      const iconWrap = document.createElement('span');
      iconWrap.className = 'be-contact-link-icon-wrap';
      if (link.icon) {
        iconWrap.innerHTML = link.icon;
      }

      const textWrap = document.createElement('span');
      textWrap.className = 'be-contact-link-text-wrap';
      textWrap.textContent = link.text || 'Link';

      anchorEl.appendChild(iconWrap);
      anchorEl.appendChild(textWrap);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'be-contact-link-remove';
      removeBtn.innerHTML = '×';
      removeBtn.title = 'Remove';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._data.links.splice(idx, 1);
        this._renderLinks();
        this.editor.events.emit('block:update', { blockId: this.id });
      });

      wrapper.appendChild(anchorEl);
      wrapper.appendChild(removeBtn);
      this.linksContainer.appendChild(wrapper);
    });
  }

  _openPopover(anchorEl, linkId) {
    if (this._popoverEl) {
      this._popoverEl.remove();
    }
    
    this._editingLinkId = linkId;
    let linkData = { icon: '', text: '', url: '' };
    if (linkId) {
      linkData = this._data.links.find(l => l.id === linkId) || linkData;
    }

    this._popoverEl = document.createElement('div');
    this._popoverEl.className = 'be-contact-link-popover';

    const iconInput = document.createElement('input');
    iconInput.placeholder = 'Icon (Emoji or SVG)';
    iconInput.value = linkData.icon;
    iconInput.className = 'be-popover-input';

    const textInput = document.createElement('input');
    textInput.placeholder = 'Display Text';
    textInput.value = linkData.text;
    textInput.className = 'be-popover-input';

    const urlInput = document.createElement('input');
    urlInput.placeholder = 'https://...';
    urlInput.value = linkData.url;
    urlInput.className = 'be-popover-input';

    const actionRow = document.createElement('div');
    actionRow.className = 'be-popover-actions';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.className = 'be-popover-save-btn';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'be-popover-cancel-btn';

    actionRow.appendChild(cancelBtn);
    actionRow.appendChild(saveBtn);

    this._popoverEl.appendChild(iconInput);
    this._popoverEl.appendChild(textInput);
    this._popoverEl.appendChild(urlInput);
    this._popoverEl.appendChild(actionRow);

    document.body.appendChild(this._popoverEl);

    // Positioning
    const rect = anchorEl.getBoundingClientRect();
    this._popoverEl.style.position = 'fixed';
    this._popoverEl.style.top = `${rect.bottom + 8}px`;
    this._popoverEl.style.left = `${rect.left}px`;

    // Ensure it doesn't go offscreen
    requestAnimationFrame(() => {
      const popRect = this._popoverEl.getBoundingClientRect();
      if (popRect.right > window.innerWidth) {
        this._popoverEl.style.left = `${window.innerWidth - popRect.width - 8}px`;
      }
    });

    const closePopover = () => {
      if (this._popoverEl) {
        this._popoverEl.remove();
        this._popoverEl = null;
      }
    };

    saveBtn.addEventListener('click', () => {
      if (this._editingLinkId) {
        const link = this._data.links.find(l => l.id === this._editingLinkId);
        if (link) {
          link.icon = iconInput.value;
          link.text = textInput.value;
          link.url = urlInput.value;
        }
      } else {
        this._data.links.push({
          id: Date.now().toString(),
          icon: iconInput.value,
          text: textInput.value,
          url: urlInput.value
        });
      }
      this._renderLinks();
      this.editor.events.emit('block:update', { blockId: this.id });
      closePopover();
    });

    cancelBtn.addEventListener('click', closePopover);

    // Close on outside click
    const handleOutsideClick = (e) => {
      if (this._popoverEl && !this._popoverEl.contains(e.target) && !anchorEl.contains(e.target)) {
        closePopover();
        document.removeEventListener('mousedown', handleOutsideClick);
      }
    };
    // small delay to avoid immediately firing on the click that opened it
    setTimeout(() => document.addEventListener('mousedown', handleOutsideClick), 10);
  }

  destroy() {
    if (this._popoverEl) this._popoverEl.remove();
    super.destroy();
  }

  serialize() {
    return {
      ...super.serialize(),
      data: this._data
    };
  }
}
