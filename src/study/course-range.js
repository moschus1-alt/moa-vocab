import { findSkill } from '../course/duolingo.js';

export function selectCourseWords(words, data, section, unit, scope = 'unit') {
  const skill = findSkill(data, section, unit);
  if (!skill) return [];
  const s = Number(section), u = Number(unit);
  return words.filter(word => word.language === data.language && (word.courseRefs || []).some(ref =>
    ref.course === data.course && (scope === 'through'
      ? ref.section < s || (ref.section === s && ref.unitFrom <= u)
      : ref.section === s && ref.unitFrom <= u && ref.unitTo >= u)));
}
