import { createRequestHandler, corsDiagnostics, normalizeOrigin } from '../server/telegram-requests.mjs';
import { createTelegramWebhook } from './telegram-webhook.mjs';

export function createWorker(catalog, fetchImpl = fetch) {
  let handler, previous;
  return {
    async fetch(request, env) {
      const path = new URL(request.url).pathname;
      if (path === '/healthz' && request.method === 'GET') return Response.json({ ok: true });
      if (path === '/debug-cors' && request.method === 'GET') {
        const diagnostics = corsDiagnostics(request.headers.get('Origin'), env.SITE_ORIGIN);
        return Response.json(diagnostics, { headers: {
          'Cache-Control': 'no-store',
          ...(diagnostics.match ? { 'Access-Control-Allow-Origin': normalizeOrigin(request.headers.get('Origin')), 'Vary': 'Origin' } : {}),
        } });
      }
      if (path === '/debug-env' && request.method === 'GET') {
        const names = Object.keys(env || {}).filter(k => !/TOKEN|SECRET|CHAT_ID/.test(k));
        const present = {};
        for (const k of ['SITE_ORIGIN', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'TELEGRAM_WEBHOOK_SECRET']) {
          present[k] = Boolean(env[k]);
        }
        return Response.json({ present, other: names });
      }
      if (path === '/telegram-webhook') {
        const hook = createTelegramWebhook({
          token: env.TELEGRAM_BOT_TOKEN,
          adminChatId: env.TELEGRAM_CHAT_ID,
          webhookSecret: env.TELEGRAM_WEBHOOK_SECRET,
        });
        return hook(request);
      }
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
