import {mkdir,cp,copyFile,writeFile,rm} from 'node:fs/promises';
await mkdir('dist/client',{recursive:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await cp('public','dist/client',{recursive:true});await cp('src','dist/client/src',{recursive:true});
await cp('src/dictionary','dist/server/src/dictionary',{recursive:true});
await copyFile('worker.mjs','dist/server/index.js');
try{await copyFile('.openai/hosting.json','dist/.openai/hosting.json')}catch{}
console.log('Build complete: static PWA + dictionary Worker');

for(const p of ['dist/client/data/duolingo-ko-es-verified.json','dist/client/src/study/verified-lesson.js'])await rm(p,{force:true});
