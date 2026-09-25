import { courseRef } from './duolingo.js';

export function defaultSpanishWords(data) {
  const byTerm = new Map();
  for (const section of data.sections) for (const skill of section.skills) {
    if (!Array.isArray(skill.meanings) || skill.meanings.length !== skill.words.length) throw new Error('기본 단어 자료가 불완전합니다.');
    for (let i = 0; i < skill.words.length; i++) {
      const headword = skill.words[i], key = headword.normalize('NFC').toLocaleLowerCase();
      let word = byTerm.get(key);
      if (!word) {
        word = { language:'es', headword, query:headword, kind:headword.includes(' ')?'숙어':'단어',
          provider:'Duome', senses:[{meaning:skill.meanings[i]}], courseRefs:[] };
        byTerm.set(key, word);
      }
      word.courseRefs.push(courseRef(data, skill, skill.unitFrom));
    }
  }
  return [...byTerm.values()];
}
