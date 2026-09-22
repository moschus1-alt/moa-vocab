import { searchNaver } from '../src/dictionary/naver.mjs';

export default {
  async fetch(request) {
    if (request.method !== 'GET') return new Response(null, { status: 405 });
    const url = new URL(request.url);
    try {
      const data = await searchNaver(url.searchParams.get('language'), url.searchParams.get('query'));
      return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      return Response.json({ error: error.message }, { status: 502 });
    }
  }
};
