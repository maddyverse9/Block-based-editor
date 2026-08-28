import { BaseBlock } from '../BaseBlock.js';

export class EducationBlock extends BaseBlock {
  constructor(data, editor) {
    super({ ...data, type: 'education' }, editor);
    if (!data.position) {
      this.position = { x: 50, y: 260, w: 600, h: 80, pageIndex: 0, zIndex: 1 };
    }
    
    this._data = {
      institution: data?.data?.institution || 'University Name',
      degree: data?.data?.degree || 'Degree and Major',
      date: data?.data?.date || '2016 - 2020',
      description: data?.data?.description || 'GPA: 3.8/4.0'
    };
  }

  render() {
    this.contentEl = document.createElement('div');
    this.contentEl.className = 'be-resume-education';
    
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.fontWeight = 'bold';
    header.style.marginBottom = '4px';

    const leftGroup = document.createElement('div');
    
    const degreeEl = document.createElement('div');
    degreeEl.contentEditable = true;
    degreeEl.innerHTML = this._data.degree;
    
    const instEl = document.createElement('div');
    instEl.contentEditable = true;
    instEl.innerHTML = this._data.institution;
    instEl.style.color = 'var(--be-text-muted)';
    instEl.style.fontWeight = 'normal';
    
    const dateEl = document.createElement('div');
    dateEl.contentEditable = true;
    dateEl.innerHTML = this._data.date;
    dateEl.style.color = 'var(--be-text-muted)';
    dateEl.style.fontWeight = 'normal';

    leftGroup.appendChild(degreeEl);
    leftGroup.appendChild(instEl);
    header.appendChild(leftGroup);
    header.appendChild(dateEl);

    const descEl = document.createElement('div');
    descEl.contentEditable = true;
    descEl.innerHTML = this._data.description;
    descEl.style.fontSize = '0.9em';

    this.contentEl.appendChild(header);
    this.contentEl.appendChild(descEl);

    const syncData = () => {
      this._data.degree = degreeEl.innerHTML;
      this._data.institution = instEl.innerHTML;
      this._data.date = dateEl.innerHTML;
      this._data.description = descEl.innerHTML;
      this.editor.events.emit('block:update', { blockId: this.id });
    };

    [degreeEl, instEl, dateEl, descEl].forEach(el => {
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
