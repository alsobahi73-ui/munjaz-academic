import { pathToFileURL } from 'node:url';
export async function runAdmin(env = process.env, fetchImpl = fetch) {
  const action = env.APPROVAL_ACTION || 'status';
  if (!['status', 'sync', 'publish', 'ignore', 'set-webhook', 'webhook-status'].includes(action)) throw Error('إجراء غير صالح');
  if (!env.APPROVAL_WORKER_URL) throw Error('عنوان العامل غير مضبوط');
  const base = new URL(env.APPROVAL_WORKER_URL);
  if (base.protocol !== 'https:' || base.username || base.password) throw Error('يلزم عنوان HTTPS آمن للعامل');
  let url, body, headers;
  if (action === 'set-webhook' || action === 'webhook-status') {
    if (!env.TELEGRAM_BOT_TOKEN || (action === 'set-webhook' && !env.TELEGRAM_WEBHOOK_SECRET)) throw Error('أسرار Webhook غير مضبوطة');
    url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${action === 'set-webhook' ? 'setWebhook' : 'getWebhookInfo'}`;
    body = action === 'set-webhook' ? { url: new URL('/webhook', base).href, secret_token: env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ['callback_query'], drop_pending_updates: false } : {};
    headers = {};
  } else {
    if (!env.APPROVAL_ADMIN_SECRET) throw Error('سر الإدارة غير مضبوط');
    const decision = ['publish', 'ignore'].includes(action);
    if (decision && !/^[a-f0-9]{32}$/.test(env.APPROVAL_ITEM_ID || '')) throw Error('معرّف مراجعة غير صالح');
    url = new URL(decision ? '/manual' : `/${action}`, base).href;
    body = decision ? { id: env.APPROVAL_ITEM_ID, decision: action } : {};
    if (env.APPROVAL_CHANNEL_MESSAGE_ID) {
      const id = Number(env.APPROVAL_CHANNEL_MESSAGE_ID);
      if (action !== 'publish' || !Number.isSafeInteger(id) || id <= 0) throw Error('معرّف رسالة القناة غير صالح');
      body.channelMessageId = id;
    }
    headers = { Authorization: `Bearer ${env.APPROVAL_ADMIN_SECRET}` };
  }
  let response, data;
  try {
    response = await fetchImpl(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
    data = await response.json();
  } catch { throw Error('تعذّر الاتصال؛ افحص الحالة قبل إعادة الإرسال'); }
  if (!response.ok || data.ok === false) throw Error('فشل الإجراء؛ افحص حالة المراجعة وإعدادات الوصول دون إعادة نشر يدوي مكرر');
  if (action === 'webhook-status') return { configured: Boolean(data.result?.url), pending_updates: data.result?.pending_update_count, has_error: Boolean(data.result?.last_error_message) };
  if (action === 'set-webhook') return { configured: true };
  return data;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await runAdmin(), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
