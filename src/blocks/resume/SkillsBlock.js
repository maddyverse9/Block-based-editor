import { BaseBlock } from '../BaseBlock.js';

export class SkillsBlock extends BaseBlock {
  constructor(data, editor) {
    super({ ...data, type: 'skills' }, editor);
    if (!data.position) {
      this.position = { x: 50, y: 350, w: 600, h: 60, pageIndex: 0, zIndex: 1 };
    }
    
    this._data = {
      category: data?.data?.category || 'Technical Skills',
      skills: data?.data?.skills || 'JavaScript, React, Node.js, CSS, HTML'
    };
  }

  render() {
    this.contentEl = document.createElement('div');
    this.contentEl.className = 'be-resume-skills';
    
    const catEl = document.createElement('div');
    catEl.className = 'be-skills-category';
    catEl.contentEditable = true;
    catEl.innerHTML = this._data.category;
    
    const skillsEl = document.createElement('div');
    skillsEl.className = 'be-skills-list';
    skillsEl.contentEditable = true;
    skillsEl.innerHTML = this._data.skills;

    this.contentEl.appendChild(catEl);
    this.contentEl.appendChild(skillsEl);

    const syncData = () => {
      this._data.category = catEl.innerHTML;
      this._data.skills = skillsEl.innerHTML;
      this.editor.events.emit('block:update', { blockId: this.id });
    };

    [catEl, skillsEl].forEach(el => {
      el.addEventListener('input', syncData);
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
