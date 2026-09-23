let cache;

export async function loadCourse(fetcher = fetch) {
  if (cache && fetcher === fetch) return cache;
  const response = await fetcher('./data/duolingo-ko-es.json');
  if (!response.ok) throw new Error('과정별 단어 자료를 불러오지 못했습니다.');
  const data = await response.json();
  if (data?.course !== 'duolingo-ko-es' || !Array.isArray(data.sections) || data.sections.length !== 8) throw new Error('과정별 단어 자료의 형식이 올바르지 않습니다.');
  if (fetcher === fetch) cache = data;
  return data;
}

export function findSkill(data, section, unit) {
  const group = data?.sections?.find(item => item.number === Number(section));
  return group?.skills?.find(skill => Number(unit) >= skill.unitFrom && Number(unit) <= skill.unitTo) ?? null;
}

export function courseRef(skill, selectedUnit) {
  return {
    course: 'duolingo-ko-es',
    section: skill.section,
    unitFrom: skill.unitFrom,
    unitTo: skill.unitTo,
    selectedUnit: Number(selectedUnit),
    skill: skill.name,
    goal: skill.goal
  };
}

export function matchesCourse(word, section, unit) {
  return (word?.courseRefs ?? []).some(ref => ref.course === 'duolingo-ko-es' && ref.section === Number(section) && Number(unit) >= ref.unitFrom && Number(unit) <= ref.unitTo);
}

