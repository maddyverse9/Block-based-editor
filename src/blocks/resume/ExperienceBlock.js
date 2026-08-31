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

    const leftGroup = document.createElement('div');
    
    const roleEl = document.createElement('div');
    roleEl.className = 'be-experience-role';
    roleEl.contentEditable = true;
    roleEl.innerHTML = this._data.role;
    
    const compEl = document.createElement('div');
    compEl.className = 'be-experience-company';
    compEl.contentEditable = true;
    compEl.innerHTML = this._data.company;
    
    const dateEl = document.createElement('div');
    dateEl.className = 'be-experience-date';
    dateEl.contentEditable = true;
    dateEl.innerHTML = this._data.date;

    leftGroup.appendChild(roleEl);
    leftGroup.appendChild(compEl);
    header.appendChild(leftGroup);
    header.appendChild(dateEl);

    const descEl = document.createElement('div');
    descEl.className = 'be-experience-description';
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
