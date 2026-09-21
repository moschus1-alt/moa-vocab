export function rate(study={},rating,now=Date.now()){
 if(!['know','unsure','unknown'].includes(rating))throw new Error('잘못된 학습 평가');
 const interval=rating==='know'?Math.min(365,Math.max(1,(study.interval||0)*2)):0;
 return {interval,reviews:(study.reviews||0)+1,lastRating:rating,due:now+(rating==='unknown'?60000:rating==='unsure'?600000:interval*86400000)};
}
export function makeQueue(words,{from=1,to=words.length,random=false,dueOnly=false}={},now=Date.now(),rng=Math.random){
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||to>words.length)throw new Error('단어 범위를 확인해 주세요.');
 const result=words.slice(from-1,to).filter(w=>!dueOnly||(w.study?.due||0)<=now);
 if(random)for(let i=result.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[result[i],result[j]]=[result[j],result[i]]}
 return result.map(w=>w.id);
}
