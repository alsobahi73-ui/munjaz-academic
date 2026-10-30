import { pathToFileURL } from 'node:url';
function parseWorkerUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const base = new URL(raw.trim());
    return base.protocol === 'https:' && !base.username && !base.password ? base : null;
  } catch {
    return null;
  }
}
export async function runAdmin(env = process.env, fetchImpl = fetch) {
  const action = env.APPROVAL_ACTION || 'status';
  if (!['status', 'sync', 'publish', 'ignore', 'set-webhook', 'webhook-status'].includes(action)) throw Error('إجراء غير صالح');
  const decision = ['publish', 'ignore'].includes(action);
  const webhookAction = action === 'set-webhook' || action === 'webhook-status';
  const base = parseWorkerUrl(env.APPROVAL_WORKER_URL);
  const adminSecret = env.APPROVAL_ADMIN_SECRET?.trim();
  if (!decision && !webhookAction && (!base || !adminSecret)) {
    return {
      ok: true,
      paused: true,
      configured: false,
      reviewed: 0,
      published: 0,
      message: 'مراجعة الأخبار غير الرسمية متوقفة مؤقتًا حتى يتم نشر عامل الموافقة (munjaz-news-approval)؛ لم تتم مراجعة أو نشر أي خبر.'
    };
  }
  if (!env.APPROVAL_WORKER_URL?.trim()) throw Error('عنوان العامل غير مضبوط');
  if (!base) throw Error('يلزم عنوان HTTPS آمن للعامل');
  let url, body, headers;
  if (webhookAction) {
    if (!env.TELEGRAM_BOT_TOKEN || (action === 'set-webhook' && !env.TELEGRAM_WEBHOOK_SECRET)) throw Error('أسرار Webhook غير مضبوطة');
    url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${action === 'set-webhook' ? 'setWebhook' : 'getWebhookInfo'}`;
    body = action === 'set-webhook' ? { url: new URL('/webhook', base).href, secret_token: env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ['callback_query'], drop_pending_updates: false } : {};
    headers = {};
  } else {
    if (!adminSecret) throw Error('سر الإدارة غير مضبوط');
    if (decision && !/^[a-f0-9]{32}$/.test(env.APPROVAL_ITEM_ID || '')) throw Error('معرّف مراجعة غير صالح');
    url = new URL(decision ? '/manual' : `/${action}`, base).href;
    body = decision ? { id: env.APPROVAL_ITEM_ID, decision: action } : {};
    if (env.APPROVAL_CHANNEL_MESSAGE_ID) {
      const id = Number(env.APPROVAL_CHANNEL_MESSAGE_ID);
      if (action !== 'publish' || !Number.isSafeInteger(id) || id <= 0) throw Error('معرّف رسالة القناة غير صالح');
      body.channelMessageId = id;
    }
    headers = { Authorization: `Bearer ${adminSecret}` };
  }
  // لإجراءي sync/status فقط: عامل غير قابل للوصول = إيقاف هادئ (exit 0)،
  // لا فشل متكرر. القرارات اليدوية وwebhook تبقى فشلًا صريحًا.
  const safePause = !decision && !webhookAction;
  const unreachablePause = () => ({
    ok: true,
    paused: true,
    configured: false,
    reviewed: 0,
    published: 0,
    message: 'عامل الموافقة (munjaz-news-approval) غير قابل للوصول حاليًا؛ مراجعة الأخبار غير الرسمية متوقفة مؤقتًا ولم تتم مراجعة أو نشر أي خبر.'
  });
  let response, data;
  try {
    response = await fetchImpl(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
    data = await response.json();
  } catch {
    if (safePause) return unreachablePause();
    throw Error('تعذّر الاتصال؛ افحص الحالة قبل إعادة الإرسال');
  }
  if (!response.ok || data.ok === false) {
    if (safePause) return unreachablePause();
    throw Error('فشل الإجراء؛ افحص حالة المراجعة وإعدادات الوصول دون إعادة نشر يدوي مكرر');
  }
  if (action === 'webhook-status') return { configured: Boolean(data.result?.url), pending_updates: data.result?.pending_update_count, has_error: Boolean(data.result?.last_error_message) };
  if (action === 'set-webhook') return { configured: true };
  return data;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await runAdmin();
    if (result?.paused) console.log(result.message);
    console.log(JSON.stringify(result, null, 2));
  }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
