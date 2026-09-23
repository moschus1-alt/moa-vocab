import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { findSkill, courseRef, matchesCourse } from '../src/course/duolingo.js';
import { validateWord, mergeWords } from '../src/vocabulary/model.js';

const load = async language => JSON.parse(await readFile(new URL(`../public/data/duolingo-ko-${language}.json`, import.meta.url), 'utf8'));
const [es, ja, zh] = await Promise.all(['es', 'ja', 'zh'].map(load));

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

