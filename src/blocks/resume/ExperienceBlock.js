import { BaseBlock } from '../BaseBlock.js';

export class ExperienceBlock extends BaseBlock {
  constructor(data, editor) {
    super({ ...data, type: 'experience' }, editor);
    if (!data.position) {
      this.position = { x: 50, y: 150, w: 600, h: 100, pageIndex: 0, zIndex: 1 };
    }
    
    this._data = {
      company: data?.data?.company || '',
      role: data?.data?.role || '',
      location: data?.data?.location || '',
      startDate: data?.data?.startDate || '',
      endDate: data?.data?.endDate || '',
      isCurrent: data?.data?.isCurrent || false,
      description: data?.data?.description || '<ul><li></li></ul>'
    };
  }

  render() {
    this.contentEl = document.createElement('div');
    this.contentEl.className = 'be-resume-experience';
    
    const header = document.createElement('div');
    header.className = 'be-experience-header';

    const leftGroup = document.createElement('div');
    leftGroup.className = 'be-experience-left';
    
    const roleEl = document.createElement('div');
    roleEl.className = 'be-experience-role';
    roleEl.contentEditable = true;
    roleEl.dataset.placeholder = 'Job Title';
    roleEl.innerHTML = this._data.role;
    
    const compGroup = document.createElement('div');
    compGroup.className = 'be-experience-company-group';

    const compEl = document.createElement('div');
    compEl.className = 'be-experience-company';
    compEl.contentEditable = true;
    compEl.dataset.placeholder = 'Company Name';
    compEl.innerHTML = this._data.company;

    const locEl = document.createElement('div');
    locEl.className = 'be-experience-location';
    locEl.contentEditable = true;
    locEl.dataset.placeholder = 'Location';
    locEl.innerHTML = this._data.location;

    compGroup.appendChild(compEl);
    compGroup.appendChild(locEl);

    leftGroup.appendChild(roleEl);
    leftGroup.appendChild(compGroup);
    
    const rightGroup = document.createElement('div');
    rightGroup.className = 'be-experience-right';

    const dateGroup = document.createElement('div');
    dateGroup.className = 'be-experience-dates';

    const startEl = document.createElement('div');
    startEl.className = 'be-experience-date-start';
    startEl.contentEditable = true;
    startEl.dataset.placeholder = 'Start Date';
    startEl.innerHTML = this._data.startDate;

    const separator = document.createElement('span');
    separator.className = 'be-experience-date-separator';
    separator.textContent = '–';

    const endEl = document.createElement('div');
    endEl.className = 'be-experience-date-end';
    endEl.contentEditable = !this._data.isCurrent;
    endEl.dataset.placeholder = 'End Date';
    endEl.innerHTML = this._data.isCurrent ? 'Present' : this._data.endDate;

    const currentToggleLabel = document.createElement('label');
    currentToggleLabel.className = 'be-experience-current-toggle';
    const currentToggle = document.createElement('input');
    currentToggle.type = 'checkbox';
    currentToggle.checked = this._data.isCurrent;
    currentToggleLabel.appendChild(currentToggle);
    currentToggleLabel.appendChild(document.createTextNode(' Current'));

    dateGroup.appendChild(startEl);
    dateGroup.appendChild(separator);
    dateGroup.appendChild(endEl);

    rightGroup.appendChild(dateGroup);
    rightGroup.appendChild(currentToggleLabel);

    header.appendChild(leftGroup);
    header.appendChild(rightGroup);

    const descEl = document.createElement('div');
    descEl.className = 'be-experience-description';
    descEl.contentEditable = true;
    descEl.innerHTML = this._data.description;

    this.contentEl.appendChild(header);
    this.contentEl.appendChild(descEl);

    const syncData = () => {
      this._data.role = roleEl.innerHTML;
      this._data.company = compEl.innerHTML;
      this._data.location = locEl.innerHTML;
      this._data.startDate = startEl.innerHTML;
      if (!this._data.isCurrent) {
        this._data.endDate = endEl.innerHTML;
      }
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

    [roleEl, compEl, locEl, startEl, endEl].forEach(el => {
      if(!el.innerHTML) el.classList.add('empty');
      el.addEventListener('input', () => {
        handleEmptyState(el);
        syncData();
      });
      el.addEventListener('blur', () => handleEmptyState(el));
      
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const focusOrder = [roleEl, compEl, locEl, startEl, endEl, descEl];
          const currentIdx = focusOrder.indexOf(el);
          if (currentIdx > -1 && currentIdx < focusOrder.length - 1) {
            let nextEl = focusOrder[currentIdx + 1];
            if (nextEl === endEl && this._data.isCurrent) {
               nextEl = descEl; // skip end date if current
            }
            nextEl.focus();
            if(nextEl === descEl) {
              this.editor.selection.setCursorToEnd(nextEl);
            }
          }
        }
      });
    });

    currentToggle.addEventListener('change', (e) => {
      this._data.isCurrent = e.target.checked;
      endEl.contentEditable = !this._data.isCurrent;
      if (this._data.isCurrent) {
        endEl.innerHTML = 'Present';
        endEl.classList.remove('empty');
      } else {
        endEl.innerHTML = this._data.endDate;
        handleEmptyState(endEl);
      }
      syncData();
    });

    // Special handling for description rich text (bullets)
    descEl.addEventListener('input', () => {
      // Ensure we always have at least a ul>li if empty
      if (descEl.innerHTML.trim() === '' || descEl.innerHTML === '<br>') {
        descEl.innerHTML = '<ul><li><br></li></ul>';
      }
      syncData();
    });

    descEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        // Allow default enter behavior in contenteditable which creates new <li> inside <ul>
        // But intercept if we want to exit list on double enter
        const sel = window.getSelection();
        const node = sel.anchorNode;
        const li = node.nodeType === 3 ? node.parentNode.closest('li') : node.closest('li');
        
        if (li && li.textContent.trim() === '') {
          // Double enter on empty bullet -> let's remove bullet and just add text
          // Actually, we'll let contenteditable handle it natively (it usually exits the list)
        }
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
