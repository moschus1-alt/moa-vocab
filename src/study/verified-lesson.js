const spelling = value => String(value ?? '').normalize('NFC').trim().toLowerCase();

export function validateVerifiedLesson(data) {
  if (data?.version !== 1 || data.course !== 'duolingo-ko-es' || data.fromLanguage !== 'ko' || data.learningLanguage !== 'es' || !data.evidenceId || !/^[a-f0-9]{64}$/.test(data.responseSha256 ?? '') || !Array.isArray(data.vocabulary) || !data.vocabulary.length) throw Error('실제 레슨 확인 자료가 올바르지 않습니다.');
  const seen = new Set();
  for (const entry of data.vocabulary) {
    const name = spelling(entry.headword);
    if (!name || seen.has(name) || !entry.meanings?.length || entry.meanings.some(m => typeof m !== 'string' || !m.trim()) || !entry.evidence?.length) throw Error('실제 레슨 단어의 근거 또는 뜻이 없습니다.');
    seen.add(name);
  }
  return data;
}

export async function loadVerifiedLesson(fetcher = fetch) {
  const response = await fetcher('/data/duolingo-ko-es-verified.json');
  if (!response.ok) throw Error('실제 레슨 자료를 불러오지 못했습니다. 다시 시도해 주세요.');
  return validateVerifiedLesson(await response.json());
}

export function verifiedDefaults(data) {
  return validateVerifiedLesson(data).vocabulary.map(entry => ({language:'es', headword:entry.headword, query:entry.headword,
    provider:'Duolingo 실제 레슨 확인', kind:entry.headword.includes(' ') ? '숙어' : '단어',
    senses:entry.meanings.map(meaning => ({meaning, example:entry.example ?? '', translation:entry.translation ?? ''}))}));
}

// Do not broaden an observed inflection to all forms of its lemma.
// Existing IDs and all user meanings remain usable; lesson meaning is the prompt.
export function selectVerifiedWords(words, data) {
  validateVerifiedLesson(data);
  return data.vocabulary.flatMap(entry => {
    const word = words.find(w => w.language === 'es' && spelling(w.headword) === spelling(entry.headword));
    if (!word) return [];
    const meanings = [...new Set([...entry.meanings, ...word.senses.map(s => s.meaning)])];
    return [{...word, lemma:'', senses:meanings.map(meaning => ({meaning}))}];
  });
}

export async function prepareVerifiedLesson(data, storage, settings) {
  validateVerifiedLesson(data);
  const marker = `moa-verified-import-${data.responseSha256}`;
  if (!settings.getItem(marker)) {
    await storage.seedDefaults(verifiedDefaults(data));
    settings.setItem(marker, '1');
  }
}
