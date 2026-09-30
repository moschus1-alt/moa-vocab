import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {courseWords,planImport,importCourse,finishReview} from '../src/course/import-vocabulary.js';
import {validateWord} from '../src/vocabulary/model.js';
const data=[];
for(const lang of ['es','ja','zh','it']){
 const d=JSON.parse(await readFile(`public/data/duolingo-ko-${lang}.json`,'utf8'));
 if(lang==='es')d.sections.push(...JSON.parse(await readFile('public/data/duolingo-ko-es-part2.json','utf8')).sections);
 data.push(d);
}
test('all four snapshots retain translations and only safe entries auto-save',()=>{
 for(const d of data){const words=courseWords(d),{ready,pending}=planImport(words,[]);
  assert.equal(ready.length+pending.length,words.length);assert.ok(ready.length>0);
  for(const w of ready)assert.equal(validateWord(w).senses.length,w.senses.length);
  console.log(d.language,JSON.stringify({total:words.length,automatic:ready.length,pending:pending.length,missing:pending.filter(w=>!w.senses.length).length}));
 }
});
test('import preserves existing edits and reviews; pending persists; completed import does not readd deleted words',async()=>{
 const d=data[0],defaults=courseWords(d),old=validateWord({...defaults[0],senses:[{meaning:'직접 정리한 뜻'}],study:{reviews:7}});
 let stored=[old],calls=0;const settings=new Map();settings.getItem=settings.get.bind(settings);settings.setItem=settings.set.bind(settings);
 const storage={all:async()=>stored,seedDefaults:async words=>{calls++;assert.equal(words[0].senses[0].meaning,'직접 정리한 뜻');assert.equal(words[0].study.reviews,7);stored=words;}};
 const pending=await importCourse(d,storage,settings);assert.ok(pending.length>0);
 stored=[];assert.deepEqual(await importCourse(d,storage,settings),pending);assert.equal(calls,1);
 finishReview(pending[0],settings);assert.equal((await importCourse(d,storage,settings)).length,pending.length-1);
});

