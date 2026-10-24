// Explicitly reviewed prompts use speech; ambiguous upstream glosses use choices.
const pictures={
 'café':{label:'커피잔과 커피 원두',drawing:'<path d="M75 85h100v48a45 36 0 0 1-90 0V85" fill="#f4e5d0"/><ellipse cx="125" cy="86" rx="50" ry="12" fill="#754d34"/><path d="M176 96c42-9 42 43-3 34" fill="none" stroke="#b98a60" stroke-width="10"/><ellipse cx="125" cy="169" rx="70" ry="9" fill="#d6c3a5"/><g fill="#754d34" stroke="#f4e5d0" stroke-width="2"><ellipse cx="65" cy="191" rx="15" ry="10" transform="rotate(-25 65 191)"/><path d="M54 195q10-14 22-9"/><ellipse cx="99" cy="194" rx="15" ry="10" transform="rotate(25 99 194)"/><path d="M88 190q13 1 22 9"/></g>'},
 'té':{label:'찻잎과 티백이 담긴 찻잔',drawing:'<path d="M75 85h100v48a45 36 0 0 1-90 0V85" fill="#eef3dc"/><ellipse cx="125" cy="86" rx="50" ry="12" fill="#c6a350"/><path d="M176 96c42-9 42 43-3 34" fill="none" stroke="#8aab75" stroke-width="10"/><ellipse cx="125" cy="169" rx="70" ry="9" fill="#c8d6b5"/><path d="M139 87q33-3 26 45" fill="none" stroke="#6f8665" stroke-width="2"/><path d="M156 132h22v27h-22z" fill="#71964f"/><path d="M50 196q-7-35 28-30q3 29-28 30M83 194q-1-30 31-23q-3 26-31 23" fill="#71964f"/>'}
};
export function presentationFor(word){
 const term=word.headword.normalize('NFC').trim().toLowerCase();
 if(pictures[term]&&word.lessonMode==='speech')return {kind:'picture',...pictures[term]};
 if(word.lessonMode==='speech')return {kind:'speech'};
 return {kind:'choice'};
}
export function pictureMarkup(presentation){
 if(presentation.kind!=='picture')return '';
 return `<svg viewBox="0 0 260 230" width="260" height="230" role="img" aria-label="${presentation.label}" style="max-width:100%;display:block;margin:0 auto"><rect x="10" y="10" width="240" height="210" rx="32" fill="#f1f3e8"/><path d="M109 65q-15-15 0-30M139 65q-15-15 0-30" fill="none" stroke="#c1c9b5" stroke-width="4" stroke-linecap="round"/>${presentation.drawing}</svg>`;
}
function meaningKeys(word){
 return (word.choiceMeanings||[word.studyPrompt||word.senses?.[0]?.meaning||'']).flatMap(s=>s.split(/[,;/·]/)).map(s=>s.replace(/\([^)]*\)/g,'').replace(/\s/g,'').normalize('NFC')).filter(Boolean);
}
export function choicesFor(word,words,rng=Math.random){
 const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 const target=meaningKeys(word),key=s=>s.normalize('NFC').toLowerCase();
 const seen=new Set([key(word.headword)]),other=[];
 for(const candidate of words){
  if(candidate.language!==word.language||seen.has(key(candidate.headword)))continue;
  const meanings=meaningKeys(candidate);
  if(meanings.some(a=>target.some(b=>a===b||(Math.min(a.length,b.length)>=2&&(a.startsWith(b)||b.startsWith(a))))))continue;
  seen.add(key(candidate.headword));other.push(candidate.headword);
 }
 return shuffle([word.headword,...shuffle(other).slice(0,3)]);
}
