export const COURSE_LANGUAGES = { es: '스페인어', ja: '일본어', zh: '중국어' };
const cache = new Map();

export async function loadCourse(language = 'es', fetcher = fetch) {
  if (!COURSE_LANGUAGES[language]) throw new Error('지원하지 않는 듀오링고 과정입니다.');
  if (fetcher === fetch && cache.has(language)) return cache.get(language);
  const response = await fetcher(`./data/duolingo-ko-${language}.json`);
  if (!response.ok) throw new Error('듀오링고 과정별 단어 자료를 불러오지 못했습니다.');
  const data = await response.json();
  if (data?.course !== `duolingo-ko-${language}` || data?.language !== language || !Array.isArray(data.sections) || data.sections.length !== 8) throw new Error('듀오링고 과정별 단어 자료의 형식이 올바르지 않습니다.');
  if (fetcher === fetch) cache.set(language, data);
  return data;
}

export function findSkill(data, section, unit) {
  const group = data?.sections?.find(item => item.number === Number(section));
  return group?.skills?.find(skill => Number(unit) >= skill.unitFrom && Number(unit) <= skill.unitTo) ?? null;
}

export function courseRef(data, skill, selectedUnit) {
  return {
    course: data.course,
    language: data.language,
    section: skill.section,
    unitFrom: skill.unitFrom,
    unitTo: skill.unitTo,
    selectedUnit: Number(selectedUnit),
    skill: skill.name,
    goal: skill.goal
  };
}

export function matchesCourse(word, course, section, unit) {
  return (word?.courseRefs ?? []).some(ref => ref.course === course && ref.section === Number(section) && Number(unit) >= ref.unitFrom && Number(unit) <= ref.unitTo);
}

