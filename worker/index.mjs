import { createRequestHandler } from '../server/telegram-requests.mjs';

export function createWorker(catalog, fetchImpl = fetch) {
  let handler, previous;
  return {
    async fetch(request, env) {
      const path = new URL(request.url).pathname;
      if (path === '/healthz' && request.method === 'GET') return Response.json({ ok: true });
      if (path !== '/api/academic-requests') return new Response(null, { status: 404 });
      if (!previous || previous.token !== env.TELEGRAM_BOT_TOKEN || previous.chatId !== env.TELEGRAM_CHAT_ID || previous.origin !== env.SITE_ORIGIN) {
        previous = { token: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID, origin: env.SITE_ORIGIN };
        handler = createRequestHandler({ catalog, token: previous.token, chatId: previous.chatId, siteOrigin: previous.origin, fetchImpl });
      }
      // Cloudflare sets this header at its edge; never use X-Forwarded-For.
      return handler(request, request.headers.get('CF-Connecting-IP') || 'unknown');
    },
  };
}
