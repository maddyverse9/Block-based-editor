import { BaseBlock } from '../BaseBlock.js';

export class EducationBlock extends BaseBlock {
  constructor(data, editor) {
    super({ ...data, type: 'education' }, editor);
    if (!data.position) {
      this.position = { x: 50, y: 260, w: 600, h: 80, pageIndex: 0, zIndex: 1 };
    }
    
    this._data = {
      degree: data?.data?.degree || '',
      institution: data?.data?.institution || '',
      location: data?.data?.location || '',
      startDate: data?.data?.startDate || '',
      endDate: data?.data?.endDate || '',
      gpa: data?.data?.gpa || '',
      description: data?.data?.description || ''
    };
  }

  render() {
    this.contentEl = document.createElement('div');
    this.contentEl.className = 'be-resume-education';
    
    const header = document.createElement('div');
    header.className = 'be-education-header';

    const leftGroup = document.createElement('div');
    leftGroup.className = 'be-education-left';
    
    const degreeEl = document.createElement('div');
    degreeEl.className = 'be-education-degree';
    degreeEl.contentEditable = true;
    degreeEl.dataset.placeholder = 'Degree and Major';
    degreeEl.innerHTML = this._data.degree;
    
    const instGroup = document.createElement('div');
    instGroup.className = 'be-education-institution-group';

    const instEl = document.createElement('div');
    instEl.className = 'be-education-institution';
    instEl.contentEditable = true;
    instEl.dataset.placeholder = 'University Name';
    instEl.innerHTML = this._data.institution;

    const locEl = document.createElement('div');
    locEl.className = 'be-education-location';
    locEl.contentEditable = true;
    locEl.dataset.placeholder = 'Location';
    locEl.innerHTML = this._data.location;

    instGroup.appendChild(instEl);
    instGroup.appendChild(locEl);

    leftGroup.appendChild(degreeEl);
    leftGroup.appendChild(instGroup);
    
    const rightGroup = document.createElement('div');
    rightGroup.className = 'be-education-right';

    const dateGroup = document.createElement('div');
    dateGroup.className = 'be-education-dates';

    const startEl = document.createElement('div');
    startEl.className = 'be-education-date-start';
    startEl.contentEditable = true;
    startEl.dataset.placeholder = 'Start';
    startEl.innerHTML = this._data.startDate;

    const separator = document.createElement('span');
    separator.className = 'be-education-date-separator';
    separator.textContent = '–';

    const endEl = document.createElement('div');
    endEl.className = 'be-education-date-end';
    endEl.contentEditable = true;
    endEl.dataset.placeholder = 'End';
    endEl.innerHTML = this._data.endDate;

    dateGroup.appendChild(startEl);
    dateGroup.appendChild(separator);
    dateGroup.appendChild(endEl);

    rightGroup.appendChild(dateGroup);

    header.appendChild(leftGroup);
    header.appendChild(rightGroup);

    const details = document.createElement('div');
    details.className = 'be-education-details';

    const gpaWrapper = document.createElement('div');
    gpaWrapper.className = 'be-education-gpa-wrapper';
    
    const gpaLabel = document.createElement('span');
    gpaLabel.className = 'be-education-gpa-label';
    gpaLabel.textContent = 'GPA: ';

    const gpaEl = document.createElement('div');
    gpaEl.className = 'be-education-gpa';
    gpaEl.contentEditable = true;
    gpaEl.dataset.placeholder = 'GPA';
    gpaEl.innerHTML = this._data.gpa;

    gpaWrapper.appendChild(gpaLabel);
    gpaWrapper.appendChild(gpaEl);

    const descEl = document.createElement('div');
    descEl.className = 'be-education-description';
    descEl.contentEditable = true;
    descEl.dataset.placeholder = 'Add coursework, honors, activities...';
    descEl.innerHTML = this._data.description;

    details.appendChild(gpaWrapper);
    details.appendChild(descEl);

    this.contentEl.appendChild(header);
    this.contentEl.appendChild(details);

    const syncData = () => {
      this._data.degree = degreeEl.innerHTML;
      this._data.institution = instEl.innerHTML;
      this._data.location = locEl.innerHTML;
      this._data.startDate = startEl.innerHTML;
      this._data.endDate = endEl.innerHTML;
      this._data.gpa = gpaEl.innerHTML;
      this._data.description = descEl.innerHTML;
      this.editor.events.emit('block:update', { blockId: this.id });
    };

    const handleEmptyState = (el) => {
      if (el.innerHTML.trim() === '' || el.innerHTML === '<br>') {
        el.innerHTML = '';
        el.classList.add('empty');
      } else {
        el.classList.remove('empty');
      }
    };

    const updateGpaVisibility = () => {
      if (!gpaEl.innerHTML && !gpaEl.matches(':focus')) {
        gpaWrapper.style.display = 'none';
      } else {
        gpaWrapper.style.display = 'flex';
      }
    };

    [degreeEl, instEl, locEl, startEl, endEl, gpaEl, descEl].forEach(el => {
      if(!el.innerHTML) el.classList.add('empty');
      el.addEventListener('input', () => {
        handleEmptyState(el);
        syncData();
      });
      el.addEventListener('blur', () => {
        handleEmptyState(el);
        if (el === gpaEl) updateGpaVisibility();
      });
      el.addEventListener('focus', () => {
        if (el === gpaEl) updateGpaVisibility();
      });
      
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          // If description, allow multiline, otherwise tab behavior
          if (el !== descEl) {
            e.preventDefault();
            const focusOrder = [degreeEl, instEl, locEl, startEl, endEl, gpaEl, descEl];
            const currentIdx = focusOrder.indexOf(el);
            if (currentIdx > -1 && currentIdx < focusOrder.length - 1) {
              const nextEl = focusOrder[currentIdx + 1];
              if (nextEl === gpaEl) {
                 gpaWrapper.style.display = 'flex';
              }
              nextEl.focus();
            }
          }
        }
      });
    });

    updateGpaVisibility();

    // When focused on block, show gpa wrapper if not empty
    this.el = document.createElement('div');
    this.contentEl.addEventListener('focusin', () => {
      gpaWrapper.style.display = 'flex';
    });
    this.contentEl.addEventListener('focusout', (e) => {
      if (!this.contentEl.contains(e.relatedTarget)) {
         updateGpaVisibility();
      }
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
