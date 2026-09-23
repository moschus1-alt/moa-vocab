import { mkdir, readFile, writeFile } from 'node:fs/promises';

const DUOME_URL = 'https://duome.eu/vocabulary/ko/es/skills';
const COURSE_URL = 'https://www.duolingodata.com/dat/esfko991.html';
const args = new Set(process.argv.slice(2));

function decode(value = '') {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}

async function source(url, localFile) {
  if (args.has('--local')) return readFile(localFile, 'utf8');
  const response = await fetch(url, { headers: { 'User-Agent': 'moa-vocab-course-updater/1.0' } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

function parseUnits(html) {
  const units = [];
  const pattern = /<span class=c\d+><b>ㅤ<span class=c1>(\d+)<\/span>ㅤ<\/b><\/span>\s*<span class=c\d+>(\d+)\s+([\s\S]*?)<\/span><br>/g;
  for (const match of html.matchAll(pattern)) units.push({ section: Number(match[1]), unit: Number(match[2]), title: decode(match[3]) });
  return units;
}

function locationForSkill(number) {
  if (number <= 10) return { section: 1, unitFrom: number, unitTo: number };
  if (number <= 41) return { section: 2, unitFrom: number - 10, unitTo: number - 10 };
  if (number <= 71) return { section: 3, unitFrom: number - 41, unitTo: number - 41 };
  if (number <= 131) return { section: 4, unitFrom: number - 71, unitTo: number - 71 };
  if (number <= 181) { const from = (number - 132) * 5 + 1; return { section: 5, unitFrom: from, unitTo: from + 4 }; }
  if (number <= 231) { const from = (number - 182) * 5 + 1; return { section: 6, unitFrom: from, unitTo: from + 4 }; }
  if (number <= 267) { const from = (number - 232) * 5 + 1; return { section: 7, unitFrom: from, unitTo: from + 4 }; }
  const from = (number - 268) * 5 + 1;
  return { section: 8, unitFrom: from, unitTo: from + 4 };
}

function parseSkills(html, unitRows) {
  const marker = /<li class="single"><a name="s(\d+)"><\/a><div class="path-section-delimiter"><hr><span title="([^"]+)">(\d+) <span class="small-label">([^<]*)<\/span> ([^<]*)<\/span><hr><\/div><\/li>/g;
  const markers = [...html.matchAll(marker)];
  const skills = markers.map((match, index) => {
    const number = Number(match[3]);
    const end = markers[index + 1]?.index ?? html.indexOf('</ul>', match.index);
    const block = html.slice(match.index + match[0].length, end);
    const words = [];
    const wordPattern = /<span class="_blue\s+wA">([\s\S]*?)<\/span><span class="cCCC wT">\s*-\s*([\s\S]*?)<\/span>/g;
    for (const word of block.matchAll(wordPattern)) {
      const text = decode(word[1]);
      if (text) words.push(text);
    }
    const location = locationForSkill(number);
    const units = unitRows.filter(row => row.section === location.section && row.unit >= location.unitFrom && row.unit <= location.unitTo).map(({ unit, title }) => ({ number: unit, title }));
    return { number, id: match[2], name: decode(match[4]), goal: decode(match[5]), ...location, units, words };
  });
  return skills;
}

const [duomeHtml, courseHtml] = await Promise.all([
  source(DUOME_URL, '.tmp-course/duome-skills.html'),
  source(COURSE_URL, '.tmp-course/duolingo-course.html')
]);
const unitRows = parseUnits(courseHtml);
const skills = parseSkills(duomeHtml, unitRows);
const counts = [10, 31, 30, 60, 250, 250, 180, 180];
if (unitRows.length !== 991) throw new Error(`Expected 991 units, found ${unitRows.length}`);
if (skills.length !== 303) throw new Error(`Expected 303 skills, found ${skills.length}`);
if (skills.reduce((sum, skill) => sum + skill.words.length, 0) !== 7114) throw new Error('Duome lexeme count changed; inspect before updating.');
for (const skill of skills) if (!skill.words.length || skill.units.length !== skill.unitTo - skill.unitFrom + 1) throw new Error(`Incomplete skill ${skill.number}`);

const sections = counts.map((unitCount, index) => ({
  number: index + 1,
  cefr: index === 0 ? 'Intro' : index < 3 ? 'A1' : index === 3 ? 'A2' : index < 6 ? 'B1' : 'B2',
  unitCount,
  skills: skills.filter(skill => skill.section === index + 1)
}));
const output = {
  course: 'duolingo-ko-es',
  title: '한국어 사용자를 위한 스페인어',
  source: DUOME_URL,
  structureSource: COURSE_URL,
  sourceSnapshot: '2026-08-31',
  generatedAt: new Date().toISOString(),
  note: '비공식 과정 참고자료입니다. 뜻과 예문은 저장 전에 네이버 사전에서 확인하세요.',
  stats: { sections: 8, units: 991, skills: 303, lexemes: 7114, distinct: 5364 },
  sections
};
await mkdir('public/data', { recursive: true });
await writeFile('public/data/duolingo-ko-es.json', JSON.stringify(output), 'utf8');
console.log(`Wrote ${skills.length} skills, ${unitRows.length} units, ${output.stats.lexemes} lexemes.`);

