// Telegram incoming-message webhook for @MunjazAcademicBot.
// redeploy: pick up dashboard secrets
// POST /telegram-webhook on the worker. Verifies the Telegram secret header
// when TELEGRAM_WEBHOOK_SECRET is configured. Never throws: Telegram
// retries on non-2xx, so the handler always answers 200 for valid updates.
export function createTelegramWebhook({ token, adminChatId, webhookSecret, fetchImpl = fetch }) {
  const api = (method, body) =>
    fetchImpl(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  const sendMessage = (chat_id, text) =>
    api('sendMessage', { chat_id, text, parse_mode: 'HTML' });

  const WELCOME = [
    'أهلًا بك في <b>مُنجز أكاديمي</b> 🎓',
    'لا نكتب عنك… <b>ننجز معك</b>.',
    '',
    'أرسل استفسارك هنا مباشرة وسيرد عليك فريقنا.',
    'لتصفح خدماتنا: https://alsobahi73-ui.github.io/munjaz-academic/',
  ].join('\n');

  return async function handleWebhook(request) {
    if (request.method !== 'POST') return new Response(null, { status: 405 });
    if (webhookSecret && request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== webhookSecret) {
      return new Response(null, { status: 403 });
    }
    let update;
    try {
      update = await request.json();
    } catch {
      return Response.json({ ok: false }, { status: 400 });
    }
    const msg = update && update.message;
    if (!msg || !msg.chat) return Response.json({ ok: true });
    const chatId = msg.chat.id;
    const text = typeof msg.text === 'string' ? msg.text.trim() : '';
    try {
      if (text === '/start') {
        await sendMessage(chatId, WELCOME);
      } else if (text) {
        const from = msg.from || {};
        const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'مستخدم';
        const username = from.username ? `@${from.username}` : 'بدون معرف';
        await api('sendMessage', {
          chat_id: adminChatId,
          parse_mode: 'HTML',
          text: `📩 رسالة جديدة من ${name} (${username})\n🆔 <code>${from.id ?? ''}</code>\n\n${text}`,
        });
        await sendMessage(chatId, 'تم استلام رسالتك ✅\nسيرد عليك فريق مُنجز أكاديمي قريبًا.');
      }
    } catch {
      // Delivery failures must not fail the webhook.
    }
    return Response.json({ ok: true });
  };
}
