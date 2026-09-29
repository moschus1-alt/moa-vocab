import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reviewSave,needsMeaningReview} from '../src/vocabulary/meaning-review.js';
import {validateWord,parseBackup} from '../src/vocabulary/model.js';
import {loadStudyPreferences} from '../src/study/preferences.js';
import {readFile} from 'node:fs/promises';
const senses=n=>Array.from({length:n},(_,i)=>({meaning:`뜻 ${i}`,pos:''}));
test('many meanings require approval even after selecting only one',()=>{
 assert.equal(needsMeaningReview(senses(9)),false);
 assert.equal(needsMeaningReview(senses(10)),true);
 assert.equal(needsMeaningReview([{meaning:'가'.repeat(500)}]),true);
 assert.equal(reviewSave({language:'it',headword:'fare',senses:senses(1)},[],false,senses(30)).required,true);
});
test('duplicate merging prompts at the final total, replacement allows removing meanings',()=>{
 const old={language:'it',headword:'fare',senses:senses(9)};
 const next={...old,senses:[{meaning:'새 뜻',pos:''}]};
 assert.deepEqual(reviewSave(next,[old]),{required:true,count:10});
 assert.deepEqual(reviewSave(next,[old],true),{required:false,count:1});
});
test('Italian survives validation, backup and study preferences and has a full course',async()=>{
 const w=validateWord({language:'it',headword:'ciao',senses:senses(1)});
 assert.equal(parseBackup({app:'moa-vocab',version:1,words:[w]})[0].language,'it');
 assert.equal(loadStudyPreferences({getItem:()=>JSON.stringify({language:'it'})}).language,'it');
 const d=JSON.parse(await readFile('public/data/duolingo-ko-it.json','utf8'));
 assert.equal(d.sections.reduce((n,s)=>n+s.unitCount,0),1030);
 assert.equal(d.sections.flatMap(s=>s.skills).flatMap(s=>s.words).length,6129);
});
