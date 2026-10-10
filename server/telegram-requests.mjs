import { createHash } from 'node:crypto';

const normalizeDigits = value => value.replace(/[٠-٩]/g, char => String(char.charCodeAt(0) - 0x660))
  .replace(/[۰-۹]/g, char => String(char.charCodeAt(0) - 0x6f0));
const digest = value => createHash('sha256').update(value).digest('hex');

// Remove whitespace, control/format characters (including bidi marks), and
// default-ignorable Unicode characters; retain strict equality afterwards.
export const normalizeOrigin = value => typeof value === 'string'
  ? value.replace(/[\s\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}]/gu, '').replace(/\/+$/, '')
  : '';

export function corsDiagnostics(receivedOrigin, siteOrigin) {
  const allowedOrigin = normalizeOrigin(siteOrigin);
  return {
    receivedOrigin,
    configured: Boolean(allowedOrigin),
    match: Boolean(allowedOrigin) && normalizeOrigin(receivedOrigin) === allowedOrigin,
  };
}

// A handler factory makes provider calls testable without sending real messages.
export function createRequestHandler({ catalog, token, chatId, siteOrigin, fetchImpl = fetch, now = Date.now }) {
  siteOrigin = normalizeOrigin(siteOrigin);
  const services = new Map(catalog.flatMap(group => group.services.map(service =>
    [service.id, { ...service, category: group.title }])));
  const requests = new Map();
  const rates = new Map();
  const ttl = 24 * 60 * 60 * 1000;
  const windowMs = 10 * 60 * 1000;
  const configured = Boolean(token && /^-?\d+$/.test(String(chatId || '')) && siteOrigin);
  const reply = (status, value, cors = false) => new Response(JSON.stringify(value), {
    status, headers: {
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
      ...(cors ? { 'Access-Control-Allow-Origin': siteOrigin, 'Vary': 'Origin' } : {}),
    },
  });
  const validText = (value, min, max) => typeof value === 'string' && value.trim().length >= min && value.length <= max;

  return async function handle(request, clientAddress = 'unknown') {
    const origin = request.headers.get('Origin');
    if (!siteOrigin || normalizeOrigin(origin) !== siteOrigin) return reply(403, { error: 'forbidden' });
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': siteOrigin, 'Vary': 'Origin',
        'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
      } });
    }
    if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' }, true);
    if (!configured) return reply(503, { error: 'unavailable' }, true);
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) return reply(415, { error: 'invalid_request' }, true);
    const body = await request.text();
    if (Buffer.byteLength(body, 'utf8') > 12000) return reply(413, { error: 'invalid_request' }, true);
    let input;
    try { input = JSON.parse(body); } catch { return reply(400, { error: 'invalid_request' }, true); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) return reply(400, { error: 'invalid_request' }, true);
    const { requestId, service, name = '', phone = '', details, consent } = input;
    if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)
      || !services.has(service) || !validText(name, 0, 100) || !validText(phone, 0, 30)
      || !validText(details, 10, 2500) || consent !== true) return reply(400, { error: 'invalid_request' }, true);
    const phoneText = normalizeDigits(phone.trim());
    if (phoneText && (!/^[+\d\s()-]+$/.test(phoneText) || phoneText.replace(/\D/g, '').length < 7)) return reply(400, { error: 'invalid_request' }, true);
    const time = now();
    for (const [key, entry] of requests) if (time - entry.created >= ttl && !entry.pending) requests.delete(key);
    for (const [key, entry] of rates) if (time - entry.started >= windowMs) rates.delete(key);
    const fingerprint = digest(JSON.stringify({ service, name: name.trim(), phone: phone.trim(), details: details.trim(), consent }));
    const previous = requests.get(requestId);
    if (previous) {
      if (previous.fingerprint !== fingerprint) return reply(409, { error: 'conflict' }, true);
      const result = await previous.result;
      return reply(result.status, result.body, true);
    }
    if (requests.size >= 5000 || rates.size >= 10000) return reply(503, { error: 'unavailable' }, true);
    // Do not trust user-controlled X-Forwarded-For. Configure host-level rate limits when using a reverse proxy.
    const key = digest(clientAddress);
    const rate = rates.get(key) || { started: time, count: 0 };
    rates.set(key, rate);
    if (rate.count >= 5) return reply(429, { error: 'rate_limited' }, true);
    rate.count++;
    const item = services.get(service);
    const text = [
      'طلب جديد — مُنجز أكاديمي', `رقم الطلب: ${requestId}`,
      `الفئة: ${item.category}`, `الخدمة: ${item.title}`,
      ...(name.trim() ? [`الاسم: ${name.trim()}`] : []),
      ...(phone.trim() ? [`رقم التواصل: ${phone.trim()}`] : []),
      `تفاصيل الطلب:\n${details.trim()}`,
      'وافق صاحب الطلب على أن الخدمة مدفوعة وعلى النزاهة الأكاديمية والدعم بالتعاون معه.',
    ].join('\n');
    if (text.length > 4096) return reply(400, { error: 'invalid_request' }, true);
    const entry = { created: time, fingerprint, pending: true };
    entry.result = (async () => {
      try {
        const response = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: String(chatId), text, link_preview_options: { is_disabled: true } }),
          signal: AbortSignal.timeout(15000),
        });
        const result = await response.json();
        if (!response.ok || result.ok !== true || !Number.isInteger(result.result?.message_id)) {
          return { status: 502, body: { error: 'delivery_failed' } };
        }
        return { status: 201, body: { status: 'sent', requestId } };
      } catch {
        // A timeout may occur after Telegram accepted a message. Do not automatically resend this ID.
        return { status: 502, body: { error: 'delivery_uncertain' } };
      } finally { entry.pending = false; }
    })();
    requests.set(requestId, entry);
    const result = await entry.result;
    if (result.body.error === 'delivery_failed') requests.delete(requestId);
    return reply(result.status, result.body, true);
  };
}
