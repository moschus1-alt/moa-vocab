import {searchNaver} from './src/dictionary/naver.mjs';
export default {async fetch(request,env){const u=new URL(request.url);
 if(u.pathname==='/api/search'){if(request.method!=='GET')return new Response(null,{status:405});try{return Response.json(await searchNaver(u.searchParams.get('language'),u.searchParams.get('query')),{headers:{'Cache-Control':'no-store'}})}catch(e){return Response.json({error:e.message},{status:502})}}
 return env.ASSETS.fetch(request);
}};
