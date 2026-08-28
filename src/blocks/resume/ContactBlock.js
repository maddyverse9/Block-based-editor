import { BaseBlock } from '../BaseBlock.js';

export class ContactBlock extends BaseBlock {
  constructor(data, editor) {
    super({ ...data, type: 'contact' }, editor);
    if (!data.position) {
      this.position = { x: 50, y: 50, w: 600, h: 80, pageIndex: 0, zIndex: 1 };
    }
    
    this._data = {
      name: data?.data?.name || 'Your Name',
      title: data?.data?.title || 'Professional Title',
      contactInfo: data?.data?.contactInfo || 'email@example.com • (555) 123-4567 • linkedin.com/in/yourname'
    };
  }

  render() {
    this.contentEl = document.createElement('div');
    this.contentEl.className = 'be-resume-contact';
    this.contentEl.style.textAlign = 'center';
    
    const nameEl = document.createElement('div');
    nameEl.contentEditable = true;
    nameEl.innerHTML = this._data.name;
    nameEl.style.fontSize = '2em';
    nameEl.style.fontWeight = 'bold';
    nameEl.style.color = 'var(--be-primary)';
    
    const titleEl = document.createElement('div');
    titleEl.contentEditable = true;
    titleEl.innerHTML = this._data.title;
    titleEl.style.fontSize = '1.2em';
    titleEl.style.marginBottom = '4px';
    
    const infoEl = document.createElement('div');
    infoEl.contentEditable = true;
    infoEl.innerHTML = this._data.contactInfo;
    infoEl.style.color = 'var(--be-text-muted)';
    infoEl.style.fontSize = '0.9em';

    this.contentEl.appendChild(nameEl);
    this.contentEl.appendChild(titleEl);
    this.contentEl.appendChild(infoEl);

    const syncData = () => {
      this._data.name = nameEl.innerHTML;
      this._data.title = titleEl.innerHTML;
      this._data.contactInfo = infoEl.innerHTML;
      this.editor.events.emit('block:update', { blockId: this.id });
    };

    [nameEl, titleEl, infoEl].forEach(el => {
      el.addEventListener('input', syncData);
    });

    this.setupKeyboardHandlers(infoEl);
    this.createWrapper();
    return this.el;
  }

  serialize() {
    return {
      ...super.serialize(),
      data: this._data
    };
  }
}
