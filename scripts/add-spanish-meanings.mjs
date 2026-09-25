import { readFile, writeFile } from 'node:fs/promises';

// Run with a locally downloaded Duome skills page. Never fetch a dictionary in the browser.
const html = await readFile(process.argv[2] || '.tmp-course/es-skills.html', 'utf8');
const file = 'public/data/duolingo-ko-es.json';
const data = JSON.parse(await readFile(file, 'utf8'));
const decode = value => value.replace(/<[^>]+>/g, '').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').trim();
const rows = [...html.matchAll(/<span class="_blue\s+wA">([\s\S]*?)<\/span><span class="cCCC wT">\s*-\s*([\s\S]*?)<\/span>/g)]
  .map(match => [decode(match[1]).replace(/\s+-\s+\[[^\]]+\]\s*$/, ''), decode(match[2])]);
const overrides = {
  quieres:'원하니', quiero:'원해요', un:'하나의', es:'이다', soy:'나는 ~이다',
  eres:'너는 ~이다', tengo:'나는 가지고 있다', tiene:'가지고 있다', tienes:'너는 가지고 있다',
  somos:'우리는 ~이다', son:'~이다', está:'있다', estoy:'나는 ~에 있다', están:'있다',
  hay:'있다', me:'나를', se:'자신을', de:'~의', a:'~에', en:'~에', el:'그', la:'그',
  los:'그', las:'그', una:'하나의', que:'~라는 것', qué:'무엇', como:'~처럼', cómo:'어떻게',
  con:'~와 함께', por:'~때문에', para:'~을 위해', pero:'하지만', si:'만약', sí:'네',
  y:'그리고', o:'또는', mamá:'엄마', sándwich:'샌드위치', taco:'타코',
  vaso_de:'한 잔의', 'vaso de':'한 잔의', soy:'나는 ~이다',
};
function representative(word, raw) {
  if (overrides[word]) return overrides[word];
  const options = raw.split(/,\s*/).map(s => s.trim()).filter(Boolean);
  // Duome translations include sentence fragments and inflected Korean endings.
  // Prefer a short standalone gloss when present; retain the original otherwise.
  const clean = options.filter(s => /^[가-힣\s~?!0-9]+$/.test(s) && s.length > 1 && s.length <= 18);
  const standalone = clean.filter(s => !/(?:은|는|이|가|을|를|에|에서|으로|와|과|의|도|만|며|고|서|면|데|다며)$/.test(s));
  return (standalone.length ? standalone : clean).sort((a,b) => a.length - b.length)[0] || options[0] || '';
}
let index = 0;
for (const section of data.sections) for (const skill of section.skills) {
  skill.meanings = skill.words.map(word => {
    const [actual, translation] = rows[index++] || [];
    if (word !== actual) throw new Error(`Duome snapshot mismatch at ${index}: ${word} / ${actual}`);
    return representative(word, translation);
  });
}
if (index !== rows.length || index !== data.stats.lexemes || skillEmpty(data)) throw new Error('Incomplete Duome vocabulary snapshot');
data.note = 'Duome의 한국어 풀이 중 간결한 대표 뜻을 골랐습니다. 문맥에 따라 다를 수 있으며 단어장에서 수정할 수 있습니다.';
data.meaningsSource = data.source;
await writeFile(file, JSON.stringify({...data,sections:data.sections.slice(0,4)}));
await writeFile('public/data/duolingo-ko-es-part2.json', JSON.stringify({course:data.course,sections:data.sections.slice(4)}));
console.log(`${index} Spanish expressions with Korean meanings.`);
function skillEmpty(data) { return data.sections.some(section => section.skills.some(skill => skill.meanings.some(value => !value))); }
