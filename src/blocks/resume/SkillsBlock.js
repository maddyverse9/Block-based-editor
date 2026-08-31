import { BaseBlock } from '../BaseBlock.js';

export class SkillsBlock extends BaseBlock {
  constructor(data, editor) {
    super({ ...data, type: 'skills' }, editor);
    if (!data.position) {
      this.position = { x: 50, y: 350, w: 600, h: 60, pageIndex: 0, zIndex: 1 };
    }
    
    this._data = {
      category: data?.data?.category || '',
      skills: data?.data?.skills || ''
    };
  }

  render() {
    this.contentEl = document.createElement('div');
    this.contentEl.className = 'be-resume-skills';
    
    const catEl = document.createElement('div');
    catEl.className = 'be-skills-category';
    catEl.contentEditable = true;
    catEl.dataset.placeholder = 'Category (e.g. Technical Skills)';
    catEl.innerHTML = this._data.category;
    
    const skillsEl = document.createElement('div');
    skillsEl.className = 'be-skills-list';
    skillsEl.contentEditable = true;
    skillsEl.dataset.placeholder = 'Add skills separated by commas...';
    skillsEl.innerHTML = this._data.skills;

    this.contentEl.appendChild(catEl);
    this.contentEl.appendChild(skillsEl);

    const syncData = () => {
      this._data.category = catEl.innerHTML;
      this._data.skills = skillsEl.innerHTML;
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

    [catEl, skillsEl].forEach(el => {
      if(!el.innerHTML) el.classList.add('empty');
      el.addEventListener('input', () => {
        handleEmptyState(el);
        syncData();
      });
      el.addEventListener('blur', () => handleEmptyState(el));
      
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (el === catEl) {
            skillsEl.focus();
          }
        }
      });
    });

    this.setupKeyboardHandlers(skillsEl);
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
