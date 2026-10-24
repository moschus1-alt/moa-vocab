export function normalizeAnswer(value) {
  return String(value ?? '').normalize('NFC').trim().toLocaleLowerCase()
    .replace(/[’‘]/g, "'").replace(/[.,!?¿¡。！？·・]/g, '').replace(/\s+/g, ' ');
}

function meaningAnswers(word) {
  const values = [];
  for (const sense of word.senses ?? []) {
    const meaning = String(sense.meaning ?? '').replace(/\([^)]*\)/g, ' ').trim();
    values.push(meaning, ...meaning.split(/[,.;，；／/\n·・]|\s+(?:또는|혹은)\s+|\[[^\]]*\]/g));
  }
  return [...new Set(values.map(normalizeAnswer).filter(v => v.length >= 1))];
}

export function quizDirection(selected, turn = 0, rng = Math.random) {
  return selected === 'mixed' ? (rng() < 0.5 ? 'ko-foreign' : 'foreign-ko') : selected;
}

export function quizCard(word, direction) {
  if (direction === 'ko-foreign') {
    const answers = [word.headword, word.lemma];
    if (word.language === 'ja') answers.push(word.reading);
    return { prompt: word.senses?.[0]?.meaning ?? '', promptLang: 'ko', answers: [...new Set(answers.map(normalizeAnswer).filter(Boolean))], answerLabel: word.headword };
  }
  return { prompt: word.headword, promptLang: word.language, answers: meaningAnswers(word), answerLabel: (word.senses ?? []).map(s => s.meaning).join(' · ') };
}

export function gradeAnswer(word, direction, input) {
  const card = quizCard(word, direction), answer = normalizeAnswer(input);
  return { correct: !!answer && card.answers.includes(answer), ...card, normalizedAnswer: answer };
}

export function gradeAttempt(word,direction,input,failures=0){
 const graded=gradeAnswer(word,direction,input);
 const nextFailures=failures+(graded.correct?0:1);
 return {...graded,input,failures:nextFailures,finished:graded.correct||nextFailures>=3,retriesLeft:Math.max(0,3-nextFailures)};
}
