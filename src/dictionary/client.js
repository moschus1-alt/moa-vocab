export async function search(language,query){
 const r=await fetch(`./api/search?language=${encodeURIComponent(language)}&query=${encodeURIComponent(query)}`,{signal:AbortSignal.timeout(16000)});
 let d;try{d=await r.json()}catch{throw new Error('사전 연결 서버가 응답하지 않습니다. 저장된 단어는 계속 학습할 수 있습니다.')}
 if(!r.ok||d.error)throw new Error(d.error||'사전 검색에 실패했습니다.');return d;
}
