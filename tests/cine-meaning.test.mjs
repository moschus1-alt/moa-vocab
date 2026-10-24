import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {choiceGlosses} from '../scripts/duome-glosses.mjs';
import {courseWords} from '../src/course/import-vocabulary.js';
import {repairCineGloss} from '../src/study/duome-study.js';
import {meaningChoicesFor} from '../src/study/presentation.js';

const load=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));

test('cine uses the corrected Korean gloss in course data, quiz data, and dictionary imports',async()=>{
 const source=await load('../public/data/duolingo-ko-es.json');
 const study=await load('../public/data/duome-es-study.json');
 const skill=source.sections.flatMap(s=>s.skills).find(s=>s.words.includes('cine'));
 const index=skill.words.indexOf('cine');
 const cine=study.entries.find(e=>e.headword==='cine');
 assert.equal(skill.meanings[index],'영화관');
 assert.equal(choiceGlosses.cine,'영화관, 영화');
 assert.equal(cine.meaning,'영화관, 영화');
 assert.equal(cine.sourceMeaning,'영화관');
 assert.equal(cine.glossOrigin,'reviewed');
 const saved=courseWords(source).find(w=>w.headword==='cine');
 assert.deepEqual(saved.senses.map(s=>s.meaning),['영화관','영화']);
 const choices=meaningChoicesFor({language:'es',headword:'cine',studyPrompt:cine.meaning,choiceMeanings:[cine.meaning,cine.sourceMeaning]},
  [{language:'es',headword:'cine',studyPrompt:cine.meaning,choiceMeanings:[cine.meaning,cine.sourceMeaning]},
   {language:'es',headword:'escuela',studyPrompt:'학교'},
   {language:'es',headword:'pan',studyPrompt:'빵'},
   {language:'es',headword:'hotel',studyPrompt:'호텔'}],()=>0.4);
 assert.equal(choices.length,4);
 assert(choices.includes('영화관'));
 assert(!choices.includes('치네'));
});

test('old cine mistranslation is repaired without replacing other user edits or study history',async()=>{
 const old={id:'existing',language:'es',headword:'cine',senses:[{meaning:'치네',pos:'명사'},{meaning:'내가 추가한 뜻'}],study:{reviews:15,lastRating:'know'},createdAt:100};
 const untouched={id:'untouched',language:'es',headword:'otro',senses:[{meaning:'치네'}]};
 let words=[old,untouched],saves=0;
 const storage={
  all:async()=>words,
  save:async(w,options)=>{
   assert.deepEqual(options,{replace:true});
   saves++;
   words=words.map(x=>x.id===w.id?w:x);
  }
 };
 const map=new Map(),settings={getItem:key=>map.get(key),setItem:(key,value)=>map.set(key,value)};
 await repairCineGloss(storage,settings);
 assert.equal(saves,1);
 assert.deepEqual(words[0].senses.map(s=>s.meaning),['영화관, 영화','내가 추가한 뜻']);
 assert.equal(words[0].senses[0].pos,'명사');
 assert.deepEqual(words[0].study,old.study);
 assert.deepEqual(words[1],untouched);
 await repairCineGloss(storage,settings);
 assert.equal(saves,1);
});
