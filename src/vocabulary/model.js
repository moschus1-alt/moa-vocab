export const LANGS={es:'스페인어',ja:'일본어',zh:'중국어',en:'영어'};
const text=(v,max=4000)=>typeof v==='string'?v.trim().slice(0,max):'';
export function identity(w){return [w.language,w.headword.normalize('NFC').toLocaleLowerCase(),(w.reading||'').normalize('NFC')].join('|')}
export function validateWord(w){
 if(!w||!LANGS[w.language]||!text(w.headword,150)||!Array.isArray(w.senses)||!w.senses.length||w.senses.length>100)throw new Error('단어 형식이 올바르지 않습니다.');
 const senses=w.senses.map(s=>{if(!s||!text(s.meaning))throw new Error('뜻이 비어 있는 단어가 있습니다.');return {meaning:text(s.meaning),pos:text(s.pos,150),example:text(s.example),translation:text(s.translation)}});
 const out={language:w.language,senses};
 for(const k of ['headword','query','reading','pronunciation','pos','lemma','gender','example','translation','provider','entryId'])out[k]=text(w[k],['headword','query'].includes(k)?150:4000);
 out.kind=w.kind==='숙어'?'숙어':'단어';
 out.queries=[...new Set([out.query,...(Array.isArray(w.queries)?w.queries:[])].map(q=>text(q,150)).filter(Boolean))].slice(0,100);
 out.courseRefs=(Array.isArray(w.courseRefs)?w.courseRefs:[]).map(ref=>{const course=['duolingo-ko-es','duolingo-ko-ja','duolingo-ko-zh'].includes(ref?.course)?ref.course:'';return {course,language:course.slice(-2),section:Number(ref?.section),unitFrom:Number(ref?.unitFrom),unitTo:Number(ref?.unitTo),selectedUnit:Number(ref?.selectedUnit),skill:text(ref?.skill,100),goal:text(ref?.goal,200)}}).filter(ref=>ref.course&&Number.isInteger(ref.section)&&ref.section>=1&&ref.section<=8&&Number.isInteger(ref.unitFrom)&&Number.isInteger(ref.unitTo)&&ref.unitFrom>=1&&ref.unitTo>=ref.unitFrom&&Number.isInteger(ref.selectedUnit)&&ref.selectedUnit>=ref.unitFrom&&ref.selectedUnit<=ref.unitTo).filter((ref,index,all)=>index===all.findIndex(other=>other.course===ref.course&&other.section===ref.section&&other.unitFrom===ref.unitFrom&&other.unitTo===ref.unitTo)).slice(0,100);
 out.source=/^https:\/\/(?:[a-z]+\.)?dict\.naver\.com\//.test(w.source??'')?w.source:'';
 out.id=text(w.id,100)||crypto.randomUUID();
 const num=(v,f)=>Number.isFinite(v)&&v>=0?v:f;
 out.createdAt=num(w.createdAt,Date.now());out.updatedAt=num(w.updatedAt,Date.now());
 const s=w.study??{};out.study={due:num(s.due,0),interval:Math.min(num(s.interval,0),365),reviews:num(s.reviews,0),lastRating:['know','unsure','unknown'].includes(s.lastRating)?s.lastRating:null};
 out.key=identity(out);return out;
}
export function mergeWords(old,next){
 const senses=[...old.senses];for(const s of next.senses)if(!senses.some(t=>t.meaning===s.meaning&&t.pos===s.pos))senses.push(s);
 return validateWord({...old,senses,queries:[...old.queries,...next.queries],courseRefs:[...(old.courseRefs||[]),...(next.courseRefs||[])],updatedAt:Date.now()});
}
export function parseBackup(value){
 if(value?.app!=='moa-vocab'||value.version!==1||!Array.isArray(value.words)||value.words.length>30000)throw new Error('모아 단어장 백업 파일(version 1)이 아닙니다.');
 return value.words.map(validateWord);
}

