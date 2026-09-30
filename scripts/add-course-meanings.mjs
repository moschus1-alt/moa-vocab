import {readFile,writeFile} from 'node:fs/promises';
const decode=s=>s.replace(/<[^>]+>/g,'').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&').trim();
for(const [lang,slug] of Object.entries({es:'es',ja:'ja',zh:'zs',it:'it'})){
 const url=`https://duome.eu/vocabulary/ko/${slug}/skills`;
 const response=await fetch(url);if(!response.ok)throw Error(`${url}: ${response.status}`);
 const html=await response.text();
 const rows=[...html.matchAll(/<span class="_blue\s+wA">([\s\S]*?)<\/span><span class="cCCC wT">\s*-\s*([\s\S]*?)<\/span>/g)].map(m=>[decode(m[1]).replace(/\s+-\s+\[[^\]]+\]\s*$/,''),decode(m[2])]);
 const file=`public/data/duolingo-ko-${lang}.json`,data=JSON.parse(await readFile(file,'utf8'));
 if(lang==='es'&&data.sections.length===4)data.sections.push(...JSON.parse(await readFile('public/data/duolingo-ko-es-part2.json','utf8')).sections);
 let i=0;for(const section of data.sections)for(const skill of section.skills){
  skill.fullMeanings=skill.words.map(word=>{const [actual,meaning]=rows[i++]||[];if(word!==actual)throw Error(`Snapshot mismatch ${lang} ${i}: ${word} / ${actual}`);return meaning;});
 }
 if(i!==rows.length||i!==data.stats.lexemes)throw Error(`Incomplete ${lang}`);
 data.meaningsSource=url;data.meaningsFetchedAt=new Date().toISOString().slice(0,10);
 data.note='Duome의 한국어 풀이를 보존했습니다. 문맥에 따른 번역과 활용형이 포함되며 직접 수정할 수 있습니다.';
 if(lang==='es'){await writeFile(file,JSON.stringify({...data,sections:data.sections.slice(0,4)}));await writeFile('public/data/duolingo-ko-es-part2.json',JSON.stringify({course:data.course,sections:data.sections.slice(4)}));}
 else await writeFile(file,JSON.stringify(data));
 console.log(`${lang}: ${i} verified translations`);
}

