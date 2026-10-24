import test from 'node:test';
import assert from 'node:assert/strict';
import {presentationFor,choicesFor,pictureMarkup} from '../src/study/presentation.js';
test('reviewed concrete words have pictures; broad meanings and unknown words use choices',()=>{
 for(const headword of ['café','té'])assert.equal(presentationFor({headword}).kind,'picture');
 assert.equal(presentationFor({headword:'hola'}).kind,'speech');
 for(const headword of ['un','quiero','por favor','con leche','unknown'])assert.equal(presentationFor({headword}).kind,'choice');
 assert.match(pictureMarkup(presentationFor({headword:'café'})),/role="img"/);
});
test('choices contain the correct expression exactly once and only distinct Spanish terms',()=>{
 const word={headword:'un',language:'es'},words=['un','un','té','hola','café','quiero'].map(headword=>({headword,language:'es'}));
 const options=choicesFor(word,[...words,{headword:'外',language:'ja'}],()=>0.3);
 assert.equal(options.length,4);assert.equal(new Set(options).size,4);assert.equal(options.filter(x=>x==='un').length,1);assert(!options.includes('外'));
});
