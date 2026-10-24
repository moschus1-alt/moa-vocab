import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadDuomeStudy,prepareDuomeStudy,selectDuomeWords,loadDuomePreferences} from '../src/study/duome-study.js';
import {createRecognition} from '../src/study/recognition.js';
const data=JSON.parse(await readFile(new URL('../public/data/duome-es-study.json',import.meta.url)));
test('complete catalog matches every source term and placement with conservative speech classification',async()=>{
 const parts=await Promise.all(['duolingo-ko-es.json','duolingo-ko-es-part2.json'].map(f=>readFile(new URL('../public/data/'+f,import.meta.url)).then(JSON.parse)));
 const expected=new Map();for(const section of parts.flatMap(p=>p.sections))for(const skill of section.skills)for(const word of skill.words){const key=word.toLowerCase();if(!expected.has(key))expected.set(key,[]);expected.get(key).push(skill.number);}
 assert.equal(data.entries.length,5363);assert.equal(data.units.length,303);assert.equal(data.sections.length,8);
 assert.equal(new Set(data.entries.map(e=>e.headword.toLowerCase())).size,expected.size);
 for(const e of data.entries){assert.deepEqual(e.units,expected.get(e.headword.toLowerCase()),e.headword);if(e.mode==='speech')assert.equal(e.glossOrigin,'reviewed');}
 assert.equal(data.entries.find(e=>e.headword==='estudio').meaning,'나는 공부한다');assert.equal(data.entries.find(e=>e.headword==='practicar').meaning,'연습하다');
 assert.equal(await loadDuomeStudy(async()=>({ok:true,json:async()=>data})),data);await assert.rejects(loadDuomeStudy(async()=>({ok:false})));
 await assert.rejects(loadDuomeStudy(async()=>({ok:true,json:async()=>({...data,entries:[{...data.entries[0],units:[99999]}]})})));
});

test('seed only once and project reviewed prompt without mutating personal data',async()=>{let calls=0;const settings=new Map(),store={seedDefaults:async()=>calls++},prefs={getItem:k=>settings.get(k),setItem:(k,v)=>settings.set(k,v)};await prepareDuomeStudy(data,store,prefs);await prepareDuomeStudy(data,store,prefs);assert.equal(calls,1);const word={id:'1',language:'es',headword:'estudio',senses:[{meaning:'내 수정'}]};const selected=selectDuomeWords([word],data);assert.equal(selected.length,1);assert.equal(selected[0].senses[0].meaning,'나는 공부한다');assert.equal(word.senses.length,1);assert.equal(selectDuomeWords([{...word,language:'en'}],data).length,0);});
test('recognition errors notify failure exactly once, cancel does not fail',()=>{for(const kind of ['error','end','timeout','throw','unsupported']){let r,timer,count=0;class R{constructor(){r=this}start(){if(kind==='throw')throw Error()}abort(){}}const controller=createRecognition({SpeechRecognition:kind==='unsupported'?undefined:R,setTimeout:f=>(timer=f,1),clearTimeout(){}});controller.start({onText(){assert.fail()},onStatus(){},onFailure(){count++}});if(kind==='error')r.onerror({error:'no-speech'});if(kind==='end')r.onend();if(kind==='timeout')timer();controller.cancel();assert.equal(count,1,kind);}});

const vocabulary=data.entries.map((e,i)=>({id:String(i),language:'es',headword:e.headword,senses:[{meaning:'저장한 뜻'}]}));
test('single and cumulative selection respect every course boundary and deduplicate repeated terms',()=>{
 const skills=data.units;
 for(const u of skills){
  const exact=selectDuomeWords(vocabulary,data,u.number,'unit');
  assert.deepEqual(new Set(exact.map(w=>w.headword)),new Set(data.entries.filter(e=>e.units.includes(u.number)).map(e=>e.headword)));
 }
 for(const n of [10,11,41,42,131,132,181,182,267,268,303]){
  const through=selectDuomeWords(vocabulary,data,n,'through');
  assert.deepEqual(new Set(through.map(w=>w.headword)),new Set(data.entries.filter(e=>Math.min(...e.units)<=n).map(e=>e.headword)));
  assert.equal(new Set(through.map(w=>w.id)).size,through.length);
 }
 assert.equal(selectDuomeWords(vocabulary,data,303,'through').length,5363);
 assert.equal(data.units.find(u=>u.number===132).unitTo,5);
});
test('upgrade respects deleted first-section words, edited words, and prior course deletions',async()=>{
 const state=new Map([['moa-duome-reviewed-section1-v1','1'],['moa-course-import-v2-es',JSON.stringify({pending:['es|practicar|']})]]);
 let inserted;await prepareDuomeStudy(data,{all:async()=>[{language:'es',headword:'casa',senses:[{meaning:'내 수정'}]}],seedDefaults:async w=>inserted=w},{getItem:k=>state.get(k),setItem:(k,v)=>state.set(k,v)});
 assert.deepEqual(inserted.map(w=>w.headword),['practicar']);assert.equal(inserted[0].senses.length,1);assert.ok(inserted[0].courseRefs.length);
});
test('section, course, scope and count survive reload with old all-section preference migrated',()=>{
 const get=p=>loadDuomePreferences({getItem:()=>JSON.stringify(p)},data);
 assert.deepEqual(get({unit:303,count:30,scope:'through'}),{unit:303,count:30,scope:'through'});
 assert.deepEqual(get({unit:0,count:20}),{unit:10,count:20,scope:'through'});
 assert.deepEqual(get({unit:99999,count:-4,scope:'bad'}),{unit:1,count:1,scope:'unit'});
});
