import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {searchNaver} from './src/dictionary/naver.mjs';
const root=resolve('public'),src=resolve('src');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/api/search'){if(req.method!=='GET'){res.writeHead(405);return res.end()};try{const d=await searchNaver(u.searchParams.get('language'),u.searchParams.get('query'));res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});return res.end(JSON.stringify(d))}catch(e){res.writeHead(502,{'Content-Type':'application/json; charset=utf-8'});return res.end(JSON.stringify({error:e.message}))}}
 if(process.env.MOA_TEST==='1'&&u.pathname==='/__test'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(await readFile('tests/browser.html'))}
 const path=decodeURIComponent(u.pathname),base=path.startsWith('/src/')?src:root,file=resolve(base,path.startsWith('/src/')?path.slice(5):'.'+(path==='/'?'/index.html':path));
 if(file!==base&&!file.startsWith(base+'\\')&&!file.startsWith(base+'/')){res.writeHead(403);return res.end()}
 const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found')}});
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('모아 단어장: http://127.0.0.1:'+server.address().port));
