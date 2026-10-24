import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {extractLesson} from '../scripts/extract-lesson.mjs';
import {validateVerifiedLesson,loadVerifiedLesson,verifiedDefaults,selectVerifiedWords,prepareVerifiedLesson} from '../src/study/verified-lesson.js';
import {loadStudyPreferences,saveStudyPreferences} from '../src/study/preferences.js';
import {gradeAnswer} from '../src/study/quiz.js';
const data=JSON.parse(await readFile(new URL('../public/data/duolingo-ko-es-verified.json',import.meta.url),'utf8'));
test('published evidence is Korean-based, seven observed terms, not English trial or distractors',()=>{
 assert.equal(validateVerifiedLesson(data),data);
 assert.equal(data.challengeCount,15);
 assert.deepEqual(data.vocabulary.map(x=>x.headword).sort(),['café','con leche','hola','por favor','quiero','té','un'].sort());
 assert(!data.vocabulary.some(x=>['gato','perro','un sándwich'].includes(x.headword)));
 assert.throws(()=>validateVerifiedLesson({...data,fromLanguage:'en'}));
});
test('extractor excludes distractors, keeps a phrase, rejects wrong course and unknown types',()=>{
 const session={fromLanguage:'ko',learningLanguage:'es',type:'LESSON',challenges:[
  {type:'assist',prompt:'주세요',choices:['papá','por favor'],correctIndex:1},
  {type:'translate',sourceLanguage:'es',targetLanguage:'ko',prompt:'por favor',newWords:['por','favor'],tokens:[{value:'por',hintTable:{headers:['por','favor'],rows:[[{hint:'제발'}]]}},{value:'favor',hintTable:{headers:['por','favor'],rows:[[{hint:'제발'}]]}}]}
 ]};
 assert.deepEqual(extractLesson(session,{}).vocabulary.map(x=>x.headword),['por favor']);
 assert.throws(()=>extractLesson({...session,fromLanguage:'en'},{}));
 assert.throws(()=>extractLesson({...session,challenges:[{type:'newUnsupportedType'}]},{}));
 assert.throws(()=>extractLesson({...session,challenges:[{type:'assist',prompt:'차',choices:['té'],correctIndex:4}]},{}));
});
test('selection is exact, ignores lemma and other languages, retains edits without mutation',()=>{
 const words=verifiedDefaults(data).map((w,i)=>({...w,id:String(i),study:{reviews:3}}));
 words[0].senses=[{meaning:'카페, 커피숍'}];words[0].lemma='other';
 const original=structuredClone(words);
 const selected=selectVerifiedWords([...words,{id:'dup',...words[0]},{id:'extra',language:'es',headword:'quieres',lemma:'quiero',senses:[{meaning:'원한다'}]},{id:'foreign',language:'it',headword:'un',senses:[{meaning:'하나'}]}],data);
 assert.equal(selected.length,7);assert.deepEqual(words,original);
 assert.equal(selected[0].senses[0].meaning,'커피');
 assert(gradeAnswer(selected[0],'foreign-ko','커피숍').correct);
 assert(!gradeAnswer(selected[0],'ko-foreign','other').correct);
});
test('import once does not restore deleted entries, network failure never falls back to Duome',async()=>{
 let calls=0;const saved=new Map(),settings={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
 const storage={seedDefaults:async()=>calls++};
 await prepareVerifiedLesson(data,storage,settings);await prepareVerifiedLesson(data,storage,settings);
 assert.equal(calls,1);
 await assert.rejects(loadVerifiedLesson(async()=>({ok:false})));
 await assert.rejects(loadVerifiedLesson(async()=>({ok:true,json:async()=>({...data,fromLanguage:'en'})})));
});
test('Spanish legacy preference migrates once and explicit manual source stays selected',()=>{
 const values=new Map([['moa-study-preferences-v1',JSON.stringify({language:'es',source:'saved'})]]);
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 assert.equal(loadStudyPreferences(storage).source,'verified');
 saveStudyPreferences({...loadStudyPreferences(storage),source:'saved'},storage);
 assert.equal(loadStudyPreferences(storage).source,'saved');
});
