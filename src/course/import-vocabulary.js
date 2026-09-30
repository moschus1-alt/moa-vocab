import {courseRef} from './duolingo.js';
import {identity} from '../vocabulary/model.js';
import {needsMeaningReview} from '../vocabulary/meaning-review.js';

export const importKey=language=>`moa-course-import-v2-${language}`;
export function courseWords(data){
 const map=new Map();
 for(const section of data.sections)for(const skill of section.skills){
  if(skill.fullMeanings?.length!==skill.words.length)throw Error('과정의 한국어 풀이가 불완전합니다.');
  skill.words.forEach((headword,i)=>{
   const key=headword.normalize('NFC').toLocaleLowerCase();
   let word=map.get(key);
   if(!word){word={language:data.language,headword,query:headword,provider:'Duome',kind:headword.includes(' ')?'숙어':'단어',senses:[],courseRefs:[]};map.set(key,word);}
   for(const meaning of skill.fullMeanings[i].split(/,\s*/).map(s=>s.trim()).filter(Boolean))if(!word.senses.some(s=>s.meaning===meaning))word.senses.push({meaning});
   word.courseRefs.push(courseRef(data,skill,skill.unitFrom));
  });
 }
 return [...map.values()];
}
export function planImport(incoming,existing){
 const old=new Map(existing.map(w=>[identity(w),w]));
 // Course snapshots have no readings. Reuse an existing dictionary entry with
 // the same spelling only when that match is unambiguous.
 const spelling=w=>`${w.language}|${w.headword.normalize('NFC').toLocaleLowerCase()}`,bySpelling=new Map();
 for(const w of existing){const k=spelling(w);bySpelling.set(k,bySpelling.has(k)?null:w);}
 for(const w of incoming)if(!old.has(identity(w))&&bySpelling.get(spelling(w)))old.set(identity(w),bySpelling.get(spelling(w)));
 const needs=w=>!w.senses.length||needsMeaningReview(w.senses);
 return {ready:incoming.filter(w=>old.has(identity(w))||!needs(w)).map(w=>old.has(identity(w))?{...old.get(identity(w)),courseRefs:w.courseRefs}:w),pending:incoming.filter(w=>!old.has(identity(w))&&needs(w))};
}
export async function importCourse(data,storage,settings){
 const key=importKey(data.language),saved=settings.getItem(key),defaults=courseWords(data);
 if(saved){const pending=new Set(JSON.parse(saved).pending);return defaults.filter(w=>pending.has(identity(w)));}
 const {ready,pending}=planImport(defaults,await storage.all());
 await storage.seedDefaults(ready);
 settings.setItem(key,JSON.stringify({pending:pending.map(identity)}));
 return pending;
}
export function finishReview(word,settings){
 const key=importKey(word.language),state=JSON.parse(settings.getItem(key));
 state.pending=state.pending.filter(k=>k!==identity(word));settings.setItem(key,JSON.stringify(state));
}
