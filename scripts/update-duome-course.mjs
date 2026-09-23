import { mkdir, readFile, writeFile } from 'node:fs/promises';

const STRUCTURE_URL = 'https://www.duolingodata.com/dat/esfko991.html';
const args = new Set(process.argv.slice(2));
const courses = [
  { language: 'es', slug: 'es', name: '스페인어', title: '한국어 사용자를 위한 스페인어', counts: [10, 31, 30, 60, 250, 250, 180, 180], expected: [303, 7114, 5364], structureSource: STRUCTURE_URL },
  { language: 'ja', slug: 'ja', name: '일본어', title: '한국어 사용자를 위한 일본어', counts: [10, 30, 30, 60, 260, 240, 200, 200], expected: [310, 5710, 5307] },
  { language: 'zh', slug: 'zs', name: '중국어', title: '한국어 사용자를 위한 중국어', counts: [10, 30, 30, 60, 255, 245, 200, 200], expected: [310, 6425, 5943] }
].map(course => ({ ...course, source: `https://duome.eu/vocabulary/ko/${course.slug}/skills`, course: `duolingo-ko-${course.language}` }));

function decode(value = '') {
  return value.replace(/<[^>]+>/g, '').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

async function source(url, localFile) {
  if (args.has('--local')) return readFile(localFile, 'utf8');
  const response = await fetch(url, { headers: { 'User-Agent': 'moa-vocab-course-updater/2.0' } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

function parseUnits(html) {
  const units = [], pattern = /<span class=c\d+><b>ㅤ<span class=c1>(\d+)<\/span>ㅤ<\/b><\/span>\s*<span class=c\d+>(\d+)\s+([\s\S]*?)<\/span><br>/g;
  for (const match of html.matchAll(pattern)) units.push({ section: Number(match[1]), unit: Number(match[2]), title: decode(match[3]) });
  return units;
}

function locationForSkill(number, counts) {
  let offset = 0;
  for (let index = 0; index < counts.length; index++) {
    const size = index < 4 ? counts[index] : counts[index] / 5;
    if (number <= offset + size) {
      const position = number - offset, unitFrom = index < 4 ? position : (position - 1) * 5 + 1;
      return { section: index + 1, unitFrom, unitTo: index < 4 ? unitFrom : unitFrom + 4 };
    }
    offset += size;
  }
  throw new Error(`Skill ${number} is outside the configured sections.`);
}

function parseSkills(html, course, unitRows) {
  const marker = /<li class="single"><a name="s(\d+)"><\/a><div class="path-section-delimiter"><hr><span title="([^"]+)">(\d+) <span class="small-label">([^<]*)<\/span> ([^<]*)<\/span><hr><\/div><\/li>/g;
  const markers = [...html.matchAll(marker)];
  return markers.map((match, index) => {
    const number = Number(match[3]), end = markers[index + 1]?.index ?? html.indexOf('</ul>', match.index), block = html.slice(match.index + match[0].length, end), words = [];
    const wordPattern = /<span class="_blue\s+wA">([\s\S]*?)<\/span><span class="cCCC wT">\s*-\s*([\s\S]*?)<\/span>/g;
    for (const word of block.matchAll(wordPattern)) { const value = decode(word[1]).replace(/\s+-\s+\[[^\]]+\]\s*$/, '').trim(); if (value) words.push(value); }
    const location = locationForSkill(number, course.counts);
    const units = Array.from({ length: location.unitTo - location.unitFrom + 1 }, (_, i) => {
      const unit = location.unitFrom + i;
      return { number: unit, title: unitRows.find(row => row.section === location.section && row.unit === unit)?.title || decode(match[5]) };
    });
    return { number, id: match[2], name: decode(match[4]), goal: decode(match[5]), ...location, units, words };
  });
}

await mkdir('public/data', { recursive: true });
const unitRows = parseUnits(await source(STRUCTURE_URL, '.tmp-course/es-units.html'));
if (unitRows.length !== 991) throw new Error(`Expected 991 Spanish units, found ${unitRows.length}`);

for (const course of courses) {
  const html = await source(course.source, `.tmp-course/${course.language}-skills.html`), skills = parseSkills(html, course, course.language === 'es' ? unitRows : []);
  const footer = html.match(/(\d+) lexemes\s*•\s*(\d+) distinct\s*•\s*(\d+) skills/);
  if (!footer) throw new Error(`${course.name}: summary counts were not found.`);
  const actual = [Number(footer[3]), Number(footer[1]), Number(footer[2])];
  if (actual.some((value, index) => value !== course.expected[index])) throw new Error(`${course.name}: expected ${course.expected.join('/')}, found ${actual.join('/')}. Inspect before updating.`);
  if (skills.length !== actual[0] || skills.reduce((sum, skill) => sum + skill.words.length, 0) !== actual[1]) throw new Error(`${course.name}: parsed data is incomplete.`);
  for (const skill of skills) if (!skill.words.length || skill.units.length !== skill.unitTo - skill.unitFrom + 1) throw new Error(`${course.name}: incomplete skill ${skill.number}.`);
  const sections = course.counts.map((unitCount, index) => ({ number: index + 1, cefr: index === 0 ? 'Intro' : index < 3 ? 'A1' : index === 3 ? 'A2' : index < 6 ? 'B1' : 'B2', unitCount, skills: skills.filter(skill => skill.section === index + 1) }));
  const output = { course: course.course, language: course.language, name: course.name, title: course.title, source: course.source, structureSource: course.structureSource || '', sourceSnapshot: '2026-08-31', generatedAt: new Date().toISOString(), note: '비공식 듀오링고 과정 참고자료입니다. 뜻과 예문은 저장 전에 네이버 사전에서 확인하세요.', stats: { sections: 8, units: course.counts.reduce((a, b) => a + b, 0), skills: actual[0], lexemes: actual[1], distinct: actual[2] }, sections };
  await writeFile(`public/data/duolingo-ko-${course.language}.json`, JSON.stringify(output), 'utf8');
  console.log(`${course.name}: ${actual[0]} skills, ${output.stats.units} units, ${actual[1]} lexemes.`);
}

