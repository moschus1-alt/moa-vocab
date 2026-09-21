import {mkdir,cp,copyFile,writeFile} from 'node:fs/promises';
await mkdir('dist/client',{recursive:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await cp('public','dist/client',{recursive:true});await cp('src','dist/client/src',{recursive:true});
await cp('src/dictionary','dist/server/src/dictionary',{recursive:true});
await copyFile('worker.mjs','dist/server/index.js');
try{await copyFile('.openai/hosting.json','dist/.openai/hosting.json')}catch{}
console.log('Build complete: static PWA + dictionary Worker');
