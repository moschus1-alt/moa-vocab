import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { findSkill, courseRef, matchesCourse } from '../src/course/duolingo.js';
import { validateWord, mergeWords } from '../src/vocabulary/model.js';
import { defaultSpanishWords } from '../src/course/default-vocabulary.js';

const load = async language => {
 const data=JSON.parse(await readFile(new URL(`../public/data/duolingo-ko-${language}.json`, import.meta.url), 'utf8'));
 if(language==='es')data.sections.push(...JSON.parse(await readFile(new URL('../public/data/duolingo-ko-es-part2.json', import.meta.url),'utf8')).sections);
 return data;
};
const [es, ja, zh] = await Promise.all(['es', 'ja', 'zh'].map(load));

test('Spanish defaults contain one selected Korean meaning per expression and preserve course placement', () => {
 const defaults=defaultSpanishWords(es);
 assert.equal(defaults.length,es.stats.distinct-1); // Chile/chile share a case-insensitive key.
 assert.equal(es.sections.flatMap(s=>s.skills).reduce((n,s)=>n+s.meanings.length,0),es.stats.lexemes);
 assert.equal(defaults.find(w=>w.headword==='agua').senses[0].meaning,'물');
 assert.equal(defaults.find(w=>w.headword==='quiero').senses[0].meaning,'원해요');
 assert.ok(defaults.every(w=>w.senses[0].meaning && validateWord(w).courseRefs.length));
});

test('course snapshots cover Spanish, Japanese and Chinese', () => {
  assert.deepEqual(es.stats, { sections: 8, units: 991, skills: 303, lexemes: 7114, distinct: 5364 });
  assert.deepEqual(ja.stats, { sections: 8, units: 1030, skills: 310, lexemes: 5710, distinct: 5307 });
  assert.deepEqual(zh.stats, { sections: 8, units: 1030, skills: 310, lexemes: 6425, distinct: 5943 });
  for (const data of [es, ja, zh]) assert.equal(data.sections.flatMap(section => section.skills).reduce((sum, skill) => sum + skill.words.length, 0), data.stats.lexemes);
  assert.equal(ja.sections[0].skills[0].words[0], 'おちゃ');
  assert.equal(zh.sections[0].skills[0].words[0], '和');
  assert.equal([...ja.sections, ...zh.sections].flatMap(section => section.skills).flatMap(skill => skill.words).some(word => / - \[[^\]]+\]$/.test(word)), false);
});

test('each course maps early units one-to-one and later blocks by five', () => {
  assert.equal(findSkill(es, 2, 3).goal, '스포츠에 대해 이야기하기');
  assert.equal(findSkill(ja, 1, 1).goal, '음식과 음료 주문하기');
  assert.equal(findSkill(zh, 1, 1).goal, '음식과 음료 이름 말하기');
  for (const data of [es, ja, zh]) {
    assert.equal(findSkill(data, 5, 1), findSkill(data, 5, 5));
    assert.notEqual(findSkill(data, 5, 5), findSkill(data, 5, 6));
    const last = data.sections.at(-1).unitCount;
    assert.deepEqual([findSkill(data, 8, last).unitFrom, findSkill(data, 8, last).unitTo], [last - 4, last]);
  }
});

test('multilingual course references survive validation and merge', () => {
  for (const [data, language, headword] of [[es, 'es', 'nadar'], [ja, 'ja', 'みず'], [zh, 'zh', '水']]) {
    const skill = findSkill(data, 1, 1), ref = courseRef(data, skill, 1);
    const base = validateWord({ language, headword, query: headword, senses: [{ meaning: '뜻' }] });
    const linked = validateWord({ ...base, courseRefs: [ref] });
    assert.equal(matchesCourse(linked, data.course, 1, 1), true);
    assert.equal(mergeWords(linked, validateWord({ ...base, courseRefs: [ref] })).courseRefs.length, 1);
  }
});
