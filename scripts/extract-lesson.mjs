import {readFile, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const key = value => String(value ?? '').normalize('NFC').trim().toLowerCase();

// Only explicit answers and newly taught prompt tokens are vocabulary evidence.
// Choices, wrongTokens and incidental sentence words are never harvested wholesale.
export function extractLesson(session, provenance) {
  if (session.fromLanguage !== 'ko' || session.learningLanguage !== 'es' || session.type !== 'LESSON') throw Error('한국어 기반 스페인어 레슨이 아닙니다.');
  if (!Array.isArray(session.challenges) || !session.challenges.length) throw Error('문제가 없습니다.');
  const entries = new Map(), unsupported = [];
  const add = (term, meaning, index, field, example = '', translation = '') => {
    const headword = key(term);
    if (!headword || !meaning?.trim()) throw Error(`문제 ${index + 1}: 단어 또는 뜻이 없습니다.`);
    const entry = entries.get(headword) ?? {headword, meanings: [], evidence: []};
    if (!entry.meanings.includes(meaning.trim())) entry.meanings.push(meaning.trim());
    entry.evidence.push({question: index + 1, type: session.challenges[index].type, field});
    if (example && !entry.example) Object.assign(entry, {example, translation});
    entries.set(headword, entry);
  };
  session.challenges.forEach((c, i) => {
    if (['select', 'assist'].includes(c.type)) {
      if (!Number.isInteger(c.correctIndex) || !c.choices?.[c.correctIndex]) throw Error(`문제 ${i + 1}: 정답 번호가 없습니다.`);
      add(c.type === 'select' ? c.choices[c.correctIndex].phrase : c.choices[c.correctIndex], c.prompt, i, 'choices[correctIndex]');
    } else if (!['translate', 'listenTap', 'dialogue'].includes(c.type)) unsupported.push({question:i+1,type:c.type});
  });
  session.challenges.forEach((c, i) => {
    if (c.type !== 'translate' || c.sourceLanguage !== 'es' || c.targetLanguage !== 'ko') return;
    for (const term of c.newWords ?? []) {
      if (entries.has(key(term))) continue;
      const token = c.tokens?.find(t => key(t.value) === key(term));
      const headers = token?.hintTable?.headers ?? [];
      // Multi-token hints describe a phrase, not independent meanings of each piece.
      if (headers.length > 1) {
        const phrase = headers.join(' ');
        if (!entries.has(key(phrase))) add(phrase, token.hintTable.rows?.[0]?.[0]?.hint, i, 'newWords + tokens.hintTable.headers', c.prompt, c.correctSolutions?.[0]);
        continue;
      }
      add(term, token?.hintTable?.rows?.[0]?.[0]?.hint, i, 'newWords + tokens.hintTable.rows[0]', c.prompt, c.correctSolutions?.[0]);
    }
  });
  if (unsupported.length) throw Error(`미지원 문제 유형: ${JSON.stringify(unsupported)}`);
  return {version:1, course:'duolingo-ko-es', learningLanguage:'es', fromLanguage:'ko',
    label:'한국어 기반 스페인어 · 첫 체험 레슨', coverage:'첫 체험 레슨 1개 응답만 확인 · 전체 과정 아님',
    observedAt:'2026-10-24', challengeCount:session.challenges.length,
    evidenceId:provenance.evidenceId, responseSha256:provenance.sha256,
    endpoint:'/2023-05-23/sessions', screenVerifiedQuestions:[1],
    vocabulary:[...entries.values()]};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [input, proof, output] = process.argv.slice(2);
  if (!output) throw Error('Usage: node scripts/extract-lesson.mjs session.json provenance.json output.json');
  const json = async path => JSON.parse((await readFile(path,'utf8')).replace(/^\uFEFF/,''));
  const data = extractLesson(await json(input), await json(proof));
  await writeFile(output, JSON.stringify(data,null,2)+'\n');
  console.log(`${data.challengeCount} questions, ${data.vocabulary.length} verified words`);
}
