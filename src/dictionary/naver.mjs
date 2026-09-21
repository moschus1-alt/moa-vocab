export const languages = {
  es: {name:'스페인어', dict:'esko', origin:'https://dict.naver.com', path:'/eskodict/'},
  ja: {name:'일본어', dict:'jako', origin:'https://ja.dict.naver.com', path:'/'},
  zh: {name:'중국어', dict:'zhko', origin:'https://zh.dict.naver.com', path:'/'},
  en: {name:'영어', dict:'enko', origin:'https://en.dict.naver.com', path:'/'}
};
export function clean(value) {
  let s=String(value??'');
  for(let i=0;i<2;i++) s=s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/&amp;/g,'&');
  return s.replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/gi,'').replace(/<[^>]*>/g,'').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c<=0x10ffff?String.fromCodePoint(c):''}).replace(/\s+/g,' ').trim();
}
export function sourceURL(lang,query){const l=languages[lang];return `${l.origin}${l.path}#/search?query=${encodeURIComponent(query)}`}
export function parseNaver(data,lang,query) {
  const map=data?.searchResultMap?.searchResultListMap;
  if(!map||!map.WORD||!Array.isArray(map.WORD.items)) throw new Error('네이버 사전 응답 구조가 변경되었습니다. 원문에서 확인해 주세요.');
  const l=languages[lang], examples=map.EXAMPLE?.items??[];
  const items=[...(map.WORD.items??[]),...(map.IDIOM?.items??[])].filter((item,index,all)=>{
    const key=item.entryId||item.destinationLink||`${item.expEntry}:${item.sourceCid??''}`;
    return index===all.findIndex(other=>(other.entryId||other.destinationLink||`${other.expEntry}:${other.sourceCid??''}`)===key);
  }).slice(0,16);
  const results=items.map(item=>{
    const headword=clean(lang==='ja'&&item.expKanji?item.expKanji:item.expEntry);
    const reading=lang==='ja'?clean(item.expEntry):'';
    const pronunciation=[...new Set((item.searchPhoneticSymbolList??[]).map(p=>clean(p.symbolValue)).filter(Boolean))].join(' / ');
    const senses=(item.meansCollector??[]).flatMap(group=>(group.means??[]).map(m=>({meaning:clean(m.value),pos:clean(group.partOfSpeech),example:clean(m.exampleOri),translation:clean(m.exampleTrans)}))).filter(s=>s.meaning);
    const pos=[...new Set(senses.map(s=>s.pos).filter(Boolean))].join(', ');
    const example=senses.find(s=>s.example&&s.translation);
    // Never attach an unrelated search example to a particular entry.
    const related=examples.find(e=>e.expEntryURL===item.destinationLink&&e.expExample2);
    let source=sourceURL(lang,query);
    if(/^#\/entry\/[a-z]+\/[a-zA-Z0-9]+$/.test(item.destinationLink??''))source=l.origin+l.path+item.destinationLink;
    return {entryId:String(item.entryId??''),language:lang,query,headword,reading,pronunciation,pos,kind:clean(item.expDictTypeForm)==='숙어'?'숙어':'단어',
      lemma:headword,gender:lang==='es'?(/여성/.test(pos)?'여성':/남성/.test(pos)?'남성':''):'',
      senses,example:example?.example||clean(related?.expExample1),translation:example?.translation||clean(related?.expExample2),
      source,provider:clean(item.sourceDictnameKO),fetchedAt:Date.now()};
  }).filter(x=>x.headword&&x.senses.length);
  if(items.length&&!results.length)throw new Error('검색 응답에서 표제어와 뜻을 읽지 못했습니다. 네이버 페이지 구조를 확인해야 합니다.');
  return results;
}
export async function searchNaver(lang,query,fetcher=fetch){
  if(!languages[lang])throw new Error('지원하지 않는 언어입니다.');
  query=String(query??'').trim();if(!query||query.length>100)throw new Error('검색어를 1~100자로 입력해 주세요.');
  const l=languages[lang], url=`${l.origin}/api3/${l.dict}/search?query=${encodeURIComponent(query)}&m=pc&range=all`;
  let r;try{r=await fetcher(url,{method:'POST',headers:{'Referer':l.origin+l.path,'User-Agent':'Mozilla/5.0','Accept':'application/json'},signal:AbortSignal.timeout(12000)});}catch{throw new Error('네이버 사전에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');}
  if(!r.ok)throw new Error(`네이버 사전이 요청을 거절했습니다 (${r.status}). 잠시 후 다시 시도해 주세요.`);
  const t=await r.text();if(!t.trim())throw new Error('네이버 사전에서 빈 응답을 받았습니다. 접근 제한 또는 서비스 변경일 수 있습니다.');
  let data;try{data=JSON.parse(t)}catch{throw new Error('네이버 사전에서 정상적인 검색 응답을 받지 못했습니다. 접근 제한 또는 페이지 변경일 수 있습니다.');}
  return {results:parseNaver(data,lang,query),source:sourceURL(lang,query),fetchedAt:Date.now()};
}
