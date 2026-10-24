export async function loadDuomeStudy(fetcher=fetch){
 const response=await fetcher('/data/duome-es-study.json');
 if(!response.ok)throw Error('Duome 학습 자료를 불러오지 못했어요. 다시 시도해 주세요.');
 const data=await response.json();
 if(data.provider!=='Duome'||data.language!=='es'||!data.entries?.length||!data.units?.length)throw Error('Duome 학습 자료 형식이 올바르지 않아요.');
 if(data.entries.some(e=>!e.headword||!e.meaning||!['speech','choice'].includes(e.mode)||!e.units?.length))throw Error('검수 정보가 없는 단어가 있어요.');
 return data;
}
export async function prepareDuomeStudy(data,storage,settings){
 const key='moa-duome-reviewed-section1-v1';
 if(settings.getItem(key))return;
 await storage.seedDefaults(data.entries.map(e=>({language:'es',headword:e.headword,query:e.headword,provider:'Duome',kind:e.headword.includes(' ')?'숙어':'단어',senses:[{meaning:e.meaning}]})));
 settings.setItem(key,'1');
}
export function selectDuomeWords(words,data,unit=0){
 const index=new Map();for(const w of words)if(w.language==='es'&&!index.has(w.headword.toLowerCase()))index.set(w.headword.toLowerCase(),w);
 return data.entries.filter(e=>!unit||e.units.includes(unit)).flatMap(e=>{
  const w=index.get(e.headword.toLowerCase());
  return w?[{...w,lemma:'',lessonMode:e.mode,studyPrompt:e.meaning,senses:[{meaning:e.meaning},...w.senses]}]:[];
 });
}
