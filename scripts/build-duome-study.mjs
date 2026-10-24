import {readFile,writeFile} from 'node:fs/promises';
const source=JSON.parse(await readFile('public/data/duolingo-ko-es.json','utf8'));
// Editorial review of section 1: keep source spellings and locations, while
// replacing fragmented Korean glosses with self-contained learning prompts.
const meanings=[
 '물|커피|작별 인사|설탕을 넣은|얼음을 넣은|우유가 들어간|감사합니다|아이스크림|안녕하세요|또는|빵|완벽한|부탁합니다|너는 원한다|나는 원한다|샌드위치|타코|차(음료)|하나의(남성 명사 앞)|한 잔의|그리고',
 '잘, 좋게|환영합니다(여성에게)|환영합니다(남성에게)|아침 인사|그녀|그/그녀는 ~이다|나중에 봐요|주스|가장 친한 여자 친구|가장 친한 남자 친구|만나서 반갑습니다|어떻게 지내요?|나는 ~이다|나|그(남성)',
 '독일|오후 인사|룸메이트|어디 출신인가요?|만나서 반갑습니다(여성 화자)|만나서 반갑습니다(남성 화자)|너는 ~출신이다|그/그녀는 ~출신이다|엄마|나의|아니요|나는 ~출신이다|네(긍정)|너|사실, 진실',
 '여자 친구(친구 관계)|남자 친구(친구 관계)|여자 직장 동료|남자 직장 동료|사실은|여자 형제|남자 형제|딸|아들|그/그녀는 원한다|오직, 단지|또한|나는 가지고 있다|이모, 고모|삼촌, 외삼촌|하나의(여성 명사 앞)|하나(숫자)',
 '할머니|할아버지|나처럼|내 생각에는|어떤 사람인가요?|일반적으로|아내|남편|재미있는(여성형)|재미있는(남성형)|그렇게 생각하지 않나요?|여자 친구(연인)|남자 친구(연인)|아빠|하지만|진지한(여성형)|진지한(남성형)|상냥한(여성형)|상냥한(남성형)|너의|수줍은(여성형)|수줍은(남성형)',
 '여기|아이고!|충전기|지갑|재킷|어디|그/그녀는 ~에 있다|챙 달린 모자|책|여행 가방|배낭|아니요|찾을 수 없어요|새로운(남성형)|여권|그러면, 음|시계|스웨터|태블릿|나는 가지고 있다|진정해요(여성에게)|진정해요(남성에게)|드레스',
 '은행, 벤치|동네|카페|쇼핑몰|가까이|도시|~안에, ~에서|주차장|지하철역|~이 있다|호텔|서점|봐요|박물관|~이 없다|이봐요|빵집|공원|이 근처에|마을|극장|가게',
 '독일어|미술, 예술|집|학교|스페인어|너는 공부한다|나는 공부한다|프랑스어|멋진|와!|말하다|너는 말한다|영어|이탈리아어|아주 잘|음악|아침에|밤에|포르투갈어|약간의|너는?'
];
meanings.push('외투|지금|저기|좋은 날씨|더위|12월|~안에, ~에서|1월|추위|그/그녀는 한다|오늘|겨울|7월|3월|많이|~하지 않는다|10월|가을|나라|봄|9월|태양|수영복|나는 사용한다|여름|바람');
meanings.push('봉지(단수)|봉지들(복수)|한 병의|얼마인가요?(단수)|얼마인가요?(복수)|둘|복숭아(단수)|복숭아들(복수)|이것, 이(남성 단수)|~이 있다|1킬로그램의|여러 킬로그램의|망고(단수)|망고들(복수)|시장(단수)|시장들(복수)|더 많이|오렌지(단수)|오렌지들(복수)|너는 필요하다|나는 필요하다|파인애플(단수)|파인애플들(복수)|수박(단수)|수박들(복수)|셋');
// Explicit terms (multi-word nouns included) instead of an ambiguity heuristic.
const clearTerms='agua|café|gracias|helado|hola|pan|sándwich|taco|té|jugo|Alemania|mamá|hija|hijo|abuela|abuelo|esposa|esposo|papá|cargador|cartera|chaqueta|libro|maleta|mochila|pasaporte|reloj|suéter|tableta|vestido|barrio|cafetería|centro comercial|ciudad|estacionamiento|estación de metro|hotel|librería|museo|panadería|parque|pueblo|teatro|tienda|alemán|casa|escuela|español|francés|inglés|italiano|música|portugués|abrigo|diciembre|enero|hoy|invierno|julio|marzo|octubre|otoño|país|primavera|septiembre|sol|traje de baño|verano|viento|dos|tres';
const clear=new Set(clearTerms.split('|').map(x=>x.toLowerCase())),entries=new Map();
const units=source.sections[0].skills.map((skill,i)=>{
 const reviewed=meanings[i].split('|');if(reviewed.length!==skill.words.length)throw Error(`Review mismatch unit ${i+1}: ${reviewed.length}/${skill.words.length}`);
 skill.words.forEach((headword,j)=>{const key=headword.toLowerCase(),old=entries.get(key);if(old){old.units.push(i+1);return}entries.set(key,{headword,meaning:reviewed[j],sourceMeaning:skill.meanings[j],mode:clear.has(key)?'speech':'choice',units:[i+1]});});
 return {number:i+1,title:skill.goal};
});
const data={version:1,provider:'Duome',course:'duolingo-ko-es',language:'es',source:'https://duome.eu/vocabulary/ko/es/skills',sourceFetchedAt:source.meaningsFetchedAt,reviewedAt:'2026-10-24',section:1,units,entries:[...entries.values()]};
await writeFile('public/data/duome-es-study.json',JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({words:data.entries.length,speech:data.entries.filter(x=>x.mode==='speech').length,choice:data.entries.filter(x=>x.mode==='choice').length}));
