const KEY = 'moa-study-preferences-v2';
const defaults = Object.freeze({ language: 'es', order: 'random', mode: 'quiz', direction: 'mixed', dueOnly: false, source: 'course', courseLanguage: 'es', courseSection: 1, courseUnit: 1, courseScope: 'unit' });

export function loadStudyPreferences(storage = globalThis.localStorage) {
  try {
    const current = storage.getItem(KEY);
    const value = JSON.parse(current ?? storage.getItem('moa-study-preferences-v1'));
    const migrateSpanish = !current && (value?.source === 'course' ? value?.courseLanguage === 'es' : value?.language === 'es');
    return {
      language: ['all', 'es', 'ja', 'zh', 'en', 'it'].includes(value?.language) ? value.language : defaults.language,
      order: 'random',
      mode: 'quiz',
      direction: 'mixed',
      dueOnly: typeof value?.dueOnly === 'boolean' ? value.dueOnly : defaults.dueOnly,
      source: migrateSpanish || value?.source === 'verified' ? 'course' : ['saved','course'].includes(value?.source) ? value.source : defaults.source,
      courseLanguage: ['es','ja','zh','it'].includes(value?.courseLanguage) ? value.courseLanguage : defaults.courseLanguage,
      courseSection: Number.isInteger(value?.courseSection) && value.courseSection >= 1 && value.courseSection <= 8 ? value.courseSection : 1,
      courseUnit: Number.isInteger(value?.courseUnit) && value.courseUnit >= 1 && value.courseUnit <= 300 ? value.courseUnit : 1,
      courseScope: ['unit','through'].includes(value?.courseScope) ? value.courseScope : defaults.courseScope
    };
  } catch { return { ...defaults }; }
}

export function saveStudyPreferences(value, storage = globalThis.localStorage) {
  const safe = loadStudyPreferences({ getItem: () => JSON.stringify(value) });
  storage.setItem(KEY, JSON.stringify(safe));
  return safe;
}
