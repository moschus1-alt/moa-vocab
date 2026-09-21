import {searchNaver} from '../src/dictionary/naver.mjs';
import assert from 'node:assert/strict';
for(const [lang,q] of [['es','casa'],['es','hablo'],['ja','食べる'],['zh','你好'],['en','apple'],['en','went'],['en','zzqqxxnonexistentword88219']]){
 const d=await searchNaver(lang,q);if(q.startsWith('zzqq'))assert.equal(d.results.length,0);else {assert(d.results.length);assert(d.results[0].senses.length)}
 console.log(JSON.stringify({language:lang,query:q,count:d.results.length,first:d.results[0]&&{headword:d.results[0].headword,reading:d.results[0].reading,pronunciation:d.results[0].pronunciation,pos:d.results[0].pos,example:d.results[0].example},headwords:d.results.map(x=>x.headword)}));
}
