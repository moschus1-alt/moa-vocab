export function createRecognition(env=globalThis){
 const Constructor=env.SpeechRecognition||env.webkitSpeechRecognition;
 let active=null,timer;
 const clear=()=>{if(timer)env.clearTimeout(timer);timer=null;};
 function cancel(){const old=active;active=null;clear();if(old){old.onresult=old.onerror=old.onend=null;try{old.abort()}catch{}}}
 return {supported:!!Constructor&&env.isSecureContext!==false,cancel,
  start({language,onText,onStatus}){
   cancel();
   if(!Constructor||env.isSecureContext===false){onStatus('이 브라우저에서는 음성인식을 사용할 수 없어요. 아래에 직접 입력해 주세요.',false);return;}
   let r;
   const finish=message=>{if(active!==r)return;cancel();onStatus(message,false);};
   try{
    r=new Constructor();active=r;r.lang=({es:'es-ES',ko:'ko-KR',ja:'ja-JP',zh:'zh-CN',en:'en-US',it:'it-IT'})[language]||'es-ES';r.continuous=false;r.interimResults=false;r.maxAlternatives=1;
    r.onresult=e=>{if(active!==r)return;const result=e.results[e.resultIndex??0];if(!result?.isFinal)return;const text=String(result[0]?.transcript||'').trim();if(!text){finish('말소리를 인식하지 못했어요. 다시 말하거나 직접 입력해 주세요.');return;}cancel();onText(text);onStatus('인식한 답을 확인한 뒤 정답 확인을 눌러 주세요. 잘못 들렸다면 수정하거나 다시 말할 수 있어요.',false);};
    r.onerror=e=>finish(({'not-allowed':'마이크 사용이 허용되지 않았어요. 브라우저 설정에서 허용하거나 직접 입력해 주세요.','service-not-allowed':'이 브라우저에서 음성인식 서비스가 허용되지 않아요. 직접 입력해 주세요.','audio-capture':'마이크를 찾지 못했어요. 연결을 확인하거나 직접 입력해 주세요.','network':'음성인식 연결에 실패했어요. 인터넷 연결을 확인하거나 직접 입력해 주세요.','no-speech':'말소리를 듣지 못했어요. 다시 말하거나 직접 입력해 주세요.','language-not-supported':'선택한 언어의 음성인식을 지원하지 않아요. 직접 입력해 주세요.'})[e.error]||'음성인식을 마치지 못했어요. 다시 시도하거나 직접 입력해 주세요.');
    r.onend=()=>finish('인식된 답이 없어요. 다시 말하거나 직접 입력해 주세요.');
    onStatus('듣고 있어요. 답을 말해 주세요.',true);
    timer=env.setTimeout(()=>finish('듣기를 종료했어요. 다시 말하거나 직접 입력해 주세요.'),15000);
    r.start();
   }catch{cancel();onStatus('음성인식을 시작하지 못했어요. 직접 입력해 주세요.',false);}
  }
 };
}
