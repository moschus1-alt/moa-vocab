const locales = { es: 'es-ES', ja: 'ja-JP', zh: 'zh-CN', en: 'en-US' };
let active = null;

export function speechText(word) {
  return word.language === 'ja' && word.reading?.trim()
    ? word.reading.trim()
    : word.headword.trim();
}

export function stopSpeech() {
  if (!active) return;
  const previous = active;
  active = null;
  clearTimeout(previous.timer);
  globalThis.speechSynthesis.cancel();
  previous.onState('idle');
}

export function speakWord(word, onState, onError) {
  const sameWord = active?.id === word.id;
  stopSpeech();
  if (sameWord) return;
  const synth = globalThis.speechSynthesis;
  if (!synth || !globalThis.SpeechSynthesisUtterance) {
    onError('이 브라우저에서는 발음 듣기를 지원하지 않습니다. Chrome 또는 Safari에서 열어 주세요.');
    return;
  }
  const locale = locales[word.language];
  if (!locale || !speechText(word)) return;
  const voices = synth.getVoices();
  const voice = voices.find(v => v.lang.replace('_', '-').toLowerCase() === locale.toLowerCase())
    || voices.find(v => v.lang.toLowerCase().startsWith(word.language + '-') && !(word.language === 'zh' && /hk/i.test(v.lang)));
  if (voices.length && !voice) {
    onError('이 언어의 음성이 기기에 없습니다. 기기 설정에서 해당 언어의 음성을 설치해 주세요.');
    return;
  }
  const utterance = new SpeechSynthesisUtterance(speechText(word));
  utterance.lang = locale;
  utterance.rate = 0.9;
  if (voice) utterance.voice = voice;
  const current = { id: word.id, utterance, onState, timer: null };
  active = current;
  const finish = error => {
    if (active !== current) return;
    active = null;
    clearTimeout(current.timer);
    onState('idle');
    if (error) onError(error);
  };
  utterance.onstart = () => {
    if (active !== current) return;
    clearTimeout(current.timer);
    onState('speaking');
    current.timer = setTimeout(() => { stopSpeech(); }, 30000);
  };
  utterance.onend = () => finish();
  utterance.onerror = () => finish('발음을 재생하지 못했습니다. 기기의 음성 설정과 인터넷 연결을 확인해 주세요.');
  onState('loading');
  current.timer = setTimeout(() => {
    if (active !== current) return;
    stopSpeech();
    onError('발음 재생이 시작되지 않았습니다. 기기의 음성 설정과 인터넷 연결을 확인해 주세요.');
  }, 5000);
  try { synth.resume(); synth.speak(utterance); }
  catch { finish('발음을 재생하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
}
