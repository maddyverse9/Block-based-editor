import { BaseBlock } from '../BaseBlock.js';

export class ExperienceBlock extends BaseBlock {
  constructor(data, editor) {
    super({ ...data, type: 'experience' }, editor);
    if (!data.position) {
      this.position = { x: 50, y: 150, w: 600, h: 100, pageIndex: 0, zIndex: 1 };
    }
    
    this._data = {
      company: data?.data?.company || 'Company Name',
      role: data?.data?.role || 'Job Title',
      date: data?.data?.date || 'Jan 2020 - Present',
      description: data?.data?.description || '<ul><li>Key achievement or responsibility...</li></ul>'
    };
  }

  render() {
    this.contentEl = document.createElement('div');
    this.contentEl.className = 'be-resume-experience';
    
    const header = document.createElement('div');
    header.className = 'be-experience-header';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.fontWeight = 'bold';
    header.style.marginBottom = '8px';

    const leftGroup = document.createElement('div');
    
    const roleEl = document.createElement('div');
    roleEl.contentEditable = true;
    roleEl.innerHTML = this._data.role;
    roleEl.style.fontSize = '1.1em';
    
    const compEl = document.createElement('div');
    compEl.contentEditable = true;
    compEl.innerHTML = this._data.company;
    compEl.style.color = 'var(--be-primary)';
    
    const dateEl = document.createElement('div');
    dateEl.contentEditable = true;
    dateEl.innerHTML = this._data.date;
    dateEl.style.color = 'var(--be-text-muted)';
    dateEl.style.fontWeight = 'normal';

    leftGroup.appendChild(roleEl);
    leftGroup.appendChild(compEl);
    header.appendChild(leftGroup);
    header.appendChild(dateEl);

    const descEl = document.createElement('div');
    descEl.contentEditable = true;
    descEl.innerHTML = this._data.description;

    this.contentEl.appendChild(header);
    this.contentEl.appendChild(descEl);

    const syncData = () => {
      this._data.role = roleEl.innerHTML;
      this._data.company = compEl.innerHTML;
      this._data.date = dateEl.innerHTML;
      this._data.description = descEl.innerHTML;
      this.editor.events.emit('block:update', { blockId: this.id });
    };

    [roleEl, compEl, dateEl, descEl].forEach(el => {
      el.addEventListener('input', syncData);
    });

    this.setupKeyboardHandlers(descEl);
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
