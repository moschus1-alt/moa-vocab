import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { findSkill, courseRef, matchesCourse } from '../src/course/duolingo.js';
import { validateWord, mergeWords } from '../src/vocabulary/model.js';

const data = JSON.parse(await readFile(new URL('../public/data/duolingo-ko-es.json', import.meta.url), 'utf8'));

test('course snapshot covers all current sections, units and skills', () => {
  assert.deepEqual(data.stats, { sections: 8, units: 991, skills: 303, lexemes: 7114, distinct: 5364 });
  assert.deepEqual(data.sections.map(section => section.skills.length), [10, 31, 30, 60, 50, 50, 36, 36]);
  assert.equal(data.sections.flatMap(section => section.skills).reduce((sum, skill) => sum + skill.words.length, 0), 7114);
});

test('early units map one-to-one and later five-unit blocks share a skill', () => {
  assert.equal(findSkill(data, 1, 1).goal, '카페에서 주문하기');
  assert.equal(findSkill(data, 2, 3).goal, '스포츠에 대해 이야기하기');
  assert.equal(findSkill(data, 5, 1), findSkill(data, 5, 5));
  assert.notEqual(findSkill(data, 5, 5), findSkill(data, 5, 6));
  assert.deepEqual([findSkill(data, 8, 180).unitFrom, findSkill(data, 8, 180).unitTo], [176, 180]);
});

test('course references survive validation and merge without duplicates', () => {
  const skill = findSkill(data, 2, 3), ref = courseRef(skill, 3);
  const base = validateWord({ language: 'es', headword: 'nadar', query: 'nadar', senses: [{ meaning: '수영하다' }] });
  const linked = validateWord({ ...base, courseRefs: [ref] });
  assert.equal(matchesCourse(linked, 2, 3), true);
  const merged = mergeWords(linked, validateWord({ ...base, courseRefs: [ref] }));
  assert.equal(merged.courseRefs.length, 1);
});

