import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gradeAnswer,normalizeAnswer,quizDirection} from '../src/study/quiz.js';
import {loadStudyPreferences,saveStudyPreferences} from '../src/study/preferences.js';
import {selectCourseWords} from '../src/study/course-range.js';
import {readFile} from 'node:fs/promises';
const word={language:'es',headword:'casa',lemma:'casa',senses:[{meaning:'집, 가옥, 주택'}]};
test('foreign to Korean accepts one selected synonym',()=>{assert.equal(gradeAnswer(word,'foreign-ko','집').correct,true);assert.equal(gradeAnswer(word,'foreign-ko','회사').correct,false)});
test('Korean to foreign checks saved headword',()=>{assert.equal(gradeAnswer(word,'ko-foreign','Casa').correct,true);assert.equal(gradeAnswer(word,'ko-foreign','casá').correct,false)});
test('Japanese reading is accepted for Korean to foreign',()=>assert.equal(gradeAnswer({language:'ja',headword:'食べる',reading:'たべる',lemma:'食べる',senses:[{meaning:'먹다'}]},'ko-foreign','たべる').correct,true));
test('mixed direction alternates',()=>{assert.equal(quizDirection('mixed',0),'foreign-ko');assert.equal(quizDirection('mixed',1),'ko-foreign')});
test('study settings persist and invalid values fall back',()=>{let value='';const box={getItem:()=>value,setItem:(_,v)=>value=v};saveStudyPreferences({language:'ja',order:'random',mode:'quiz',direction:'mixed',dueOnly:true,source:'course',courseLanguage:'ja',courseSection:3,courseUnit:4,courseScope:'through'},box);assert.deepEqual(loadStudyPreferences(box),{language:'ja',order:'random',mode:'quiz',direction:'mixed',dueOnly:true,source:'course',courseLanguage:'ja',courseSection:3,courseUnit:4,courseScope:'through'});value='{"language":"xx","courseSection":99,"courseScope":"wrong"}';assert.equal(loadStudyPreferences(box).language,'all');assert.equal(loadStudyPreferences(box).courseSection,1);assert.equal(loadStudyPreferences(box).courseScope,'unit')});
test('selected course and cumulative range include each stored word once',async()=>{
 const data=JSON.parse(await readFile(new URL('../public/data/duolingo-ko-es.json',import.meta.url),'utf8'));
 const [first,second]=data.sections[0].skills;
 const ref=skill=>({course:data.course,section:skill.section,unitFrom:skill.unitFrom,unitTo:skill.unitTo});
 const words=[
  {id:'one',language:'es',courseRefs:[ref(first)]},
  {id:'repeat',language:'es',courseRefs:[ref(first),ref(second)]},
  {id:'two',language:'es',courseRefs:[ref(second)]},
  {id:'other',language:'ja',courseRefs:[ref(first)]},
  {id:'unlinked',language:'es',courseRefs:[]}
 ];
 assert.deepEqual(selectCourseWords(words,data,1,1,'unit').map(w=>w.id),['one','repeat']);
 assert.deepEqual(selectCourseWords(words,data,1,2,'unit').map(w=>w.id),['repeat','two']);
 assert.deepEqual(selectCourseWords(words,data,1,2,'through').map(w=>w.id),['one','repeat','two']);
 assert.deepEqual(selectCourseWords(words,data,1,1,'through').map(w=>w.id),['one','repeat']);
});
test('normalization preserves accented letters',()=>{assert.equal(normalizeAnswer('  CÁSÁ! '),'cásá')});
