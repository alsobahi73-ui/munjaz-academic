// Incoming private messages. Never acknowledge delivery before Telegram confirms it.
export function createTelegramWebhook({ token, adminChatId, webhookSecret, fetchImpl = fetch }) {
  const delivered = new Map();
  async function api(body) {
    const response = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true || !Number.isInteger(result.result?.message_id)) {
      throw new Error('delivery_failed');
    }
  }
  const welcome = 'أهلًا بك في مُنجز أكاديمي.\nلا نكتب عنك… ننجز معك.\nأرسل استفسارك النصي هنا لإيصاله إلى فريق المنصة.\nخدماتنا: https://alsobahi73-ui.github.io/munjaz-academic/';
  return async function handleWebhook(request) {
    if (request.method !== 'POST') return new Response(null, { status: 405 });
    if (!token || !/^-?\d+$/.test(String(adminChatId || '')) || !webhookSecret) {
      return Response.json({ ok: false }, { status: 503 });
    }
    if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== webhookSecret) {
      return new Response(null, { status: 403 });
    }
    let update;
    try { update = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
    if (!update || typeof update !== 'object' || !Number.isSafeInteger(update.update_id)) {
      return Response.json({ ok: false }, { status: 400 });
    }
    const message = update.message;
    if (!message || message.chat?.type !== 'private' || !Number.isSafeInteger(message.chat.id)) {
      return Response.json({ ok: true });
    }
    if (String(message.chat.id) === String(adminChatId)) return Response.json({ ok: true });
    const text = typeof message.text === 'string' ? message.text.trim() : '';
    const id = update.update_id;
    let state = delivered.get(id);
    if (state?.busy) return Response.json({ ok: false }, { status: 503 });
    if (!state) {
      if (delivered.size >= 1000) delivered.delete(delivered.keys().next().value);
      state = { sent: 0, acknowledged: false, busy: false };
      delivered.set(id, state);
    }
    state.busy = true;
    try {
      if (!state.acknowledged) {
        if (/^\/start(?:\s|$)/.test(text)) {
          await api({ chat_id: message.chat.id, text: welcome });
        } else if (text) {
          const from = message.from || {};
          const name = [from.first_name, from.last_name].filter(value => typeof value === 'string').join(' ') || 'مستخدم';
          const username = from.username ? `@${from.username}` : 'بدون معرف';
          const content = Array.from(`رسالة جديدة من ${name} (${username})\nمعرّف المرسل: ${from.id ?? ''}\n\n${text}`);
          const chunks = [];
          while (content.length) chunks.push(content.splice(0, 4000).join(''));
          for (let i = state.sent; i < chunks.length; i++) {
            await api({ chat_id: adminChatId, text: chunks[i] });
            state.sent = i + 1;
          }
          await api({ chat_id: message.chat.id, text: 'تم إيصال رسالتك إلى فريق مُنجز أكاديمي.' });
        } else {
          await api({ chat_id: message.chat.id, text: 'استقبال المرفقات قيد التجهيز. يرجى إرسال استفسارك كنص.' });
        }
        state.acknowledged = true;
      }
      return Response.json({ ok: true });
    } catch {
      // No provider response/URL is logged: it may contain credentials.
      return Response.json({ ok: false }, { status: 503 });
    } finally { state.busy = false; }
  };
}
