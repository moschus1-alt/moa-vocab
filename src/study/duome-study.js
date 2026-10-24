export async function loadDuomeStudy(fetcher=fetch){
 const response=await fetcher('/data/duome-es-study.json');
 if(!response.ok)throw Error('Duome 학습 자료를 불러오지 못했어요. 다시 시도해 주세요.');
 const data=await response.json();
 if(data.version!==2||data.provider!=='Duome'||data.language!=='es'||!data.entries?.length||!data.units?.length||!data.sections?.length)throw Error('Duome 학습 자료 형식이 올바르지 않아요.');
 const ids=new Set(data.units.map(u=>u.number));
 if(ids.size!==data.units.length||data.entries.some(e=>!e.headword||!e.meaning||!['speech','choice'].includes(e.mode)||!e.units?.length||e.units.some(n=>!ids.has(n))))throw Error('과정 정보가 올바르지 않은 단어가 있어요.');
 return data;
}
export async function prepareDuomeStudy(data,storage,settings){
 const key='moa-duome-study-all-v2';
 if(settings.getItem(key))return;
 const previous=!!settings.getItem('moa-duome-reviewed-section1-v1');
 const old=new Set((await storage.all?.()||[]).filter(w=>w.language==='es').map(w=>w.headword.toLowerCase()));
 let imported=null;try{const state=JSON.parse(settings.getItem('moa-course-import-v2-es'));if(Array.isArray(state?.pending))imported=new Set(state.pending);}catch{}
 const locations=new Map(data.units.map(u=>[u.number,u]));
 const incoming=data.entries.filter(e=>!old.has(e.headword.toLowerCase())&&!(previous&&e.units.some(n=>n<=10))&&(!imported||imported.has(`es|${e.headword.normalize('NFC').toLowerCase()}|`)));
 await storage.seedDefaults(incoming.map(e=>({language:'es',headword:e.headword,query:e.headword,provider:'Duome',kind:e.headword.includes(' ')?'숙어':'단어',senses:[{meaning:e.meaning}],courseRefs:e.units.map(n=>{const u=locations.get(n);return {course:data.course,section:u.section,unitFrom:u.unitFrom,unitTo:u.unitTo,selectedUnit:u.unitFrom,goal:u.title};})})));
 settings.setItem(key,'1');
}
export function selectDuomeWords(words,data,unit=0,scope='unit'){
 const index=new Map();for(const w of words)if(w.language==='es'&&!index.has(w.headword.toLowerCase()))index.set(w.headword.toLowerCase(),w);
 return data.entries.filter(e=>!unit||e.units.some(n=>scope==='through'?n<=unit:n===unit)).flatMap(e=>{
  const w=index.get(e.headword.toLowerCase());
  return w?[{...w,lemma:'',lessonMode:e.mode,glossOrigin:e.glossOrigin,studyPrompt:e.meaning,choiceMeanings:[e.meaning,e.sourceMeaning],senses:[{meaning:e.meaning},...w.senses]}]:[];
 });
}
export function loadDuomePreferences(settings,data){
 let p={};try{p=JSON.parse(settings.getItem('moa-duome-study-ui'))||{}}catch{}
 // The former "section 1 all" selection is the cumulative first ten units.
 const legacyAll=p.unit===0;
 const unit=legacyAll?10:data.units.some(u=>u.number===p.unit)?p.unit:data.units[0].number;
 return {unit,scope:legacyAll||p.scope==='through'?'through':'unit',count:Number.isInteger(p.count)?Math.min(data.entries.length,Math.max(1,p.count)):10};
}
