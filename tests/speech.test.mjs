import {test} from 'node:test';
import assert from 'node:assert/strict';
import {speechText,speakWord,stopSpeech} from '../src/ui/speech.js';
test('reads Japanese kana and other language headwords, not IPA or pinyin',()=>{
 assert.equal(speechText({language:'ja',headword:'食べる',reading:'たべる'}),'たべる');
 assert.equal(speechText({language:'zh',headword:'你好',pronunciation:'nǐhǎo'}),'你好');
 assert.equal(speechText({language:'en',headword:'apple',pronunciation:'ˈæpl'}),'apple');
});
test('matching language, cancellation, repeated tap and completion',()=>{
 const originals=[globalThis.speechSynthesis,globalThis.SpeechSynthesisUtterance];
 let current,cancels=0;const voices=['es-ES','ja-JP','zh-CN','en-US'].map(lang=>({lang}));
 globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
 globalThis.speechSynthesis={getVoices:()=>voices,resume(){},speak(u){current=u;u.onstart()},cancel(){cancels++}};
 try {const states=[];const errors=[];const w={id:'es',language:'es',headword:'casa'};
 speakWord(w,s=>states.push(s),e=>errors.push(e));assert.equal(current.lang,'es-ES');assert.equal(current.voice.lang,'es-ES');assert.deepEqual(states,['loading','speaking']);
 speakWord(w,s=>states.push(s),e=>errors.push(e));assert.equal(cancels,1);assert.equal(states.at(-1),'idle');
 for(const [language,headword] of [['ja','食べる'],['zh','你好'],['en','apple']]){speakWord({id:language,language,headword},s=>states.push(s),e=>errors.push(e));assert(current.lang.startsWith(language));current.onend();assert.equal(states.at(-1),'idle')}
 assert.deepEqual(errors,[]);
 }finally{stopSpeech();[globalThis.speechSynthesis,globalThis.SpeechSynthesisUtterance]=originals}
});
