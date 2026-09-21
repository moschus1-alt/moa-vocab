const KEY = 'moa-study-preferences-v1';
const defaults = Object.freeze({ language: 'all', order: 'range', mode: 'card', direction: 'foreign-ko', dueOnly: false });

export function loadStudyPreferences(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(KEY));
    return {
      language: ['all', 'es', 'ja', 'zh', 'en'].includes(value?.language) ? value.language : defaults.language,
      order: ['range', 'random'].includes(value?.order) ? value.order : defaults.order,
      mode: ['card', 'quiz'].includes(value?.mode) ? value.mode : defaults.mode,
      direction: ['foreign-ko', 'ko-foreign', 'mixed'].includes(value?.direction) ? value.direction : defaults.direction,
      dueOnly: typeof value?.dueOnly === 'boolean' ? value.dueOnly : defaults.dueOnly
    };
  } catch { return { ...defaults }; }
}

export function saveStudyPreferences(value, storage = globalThis.localStorage) {
  const safe = loadStudyPreferences({ getItem: () => JSON.stringify(value) });
  storage.setItem(KEY, JSON.stringify(safe));
  return safe;
}
