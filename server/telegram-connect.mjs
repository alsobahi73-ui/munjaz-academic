// Run on the trusted server after setting TELEGRAM_BOT_TOKEN through its secret settings.
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) { console.error('Set TELEGRAM_BOT_TOKEN in the secure server environment first.'); process.exit(1); }
async function call(method) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  if (!response.ok || data.ok !== true) throw new Error('Telegram setup request failed.');
  return data.result;
}
try {
  const bot = await call('getMe');
  if (bot.username?.toLowerCase() !== 'munjazacademicbot') throw new Error('The token does not belong to @MunjazAcademicBot.');
  const updates = await call('getUpdates');
  const chats = new Map();
  for (const update of updates) {
    const message = update.message;
    if (message?.chat?.type === 'private' && message.text === '/start') {
      chats.set(message.chat.id, { chatId: String(message.chat.id), username: message.chat.username || null });
    }
  }
  console.log(JSON.stringify({ bot: bot.username, privateChats: [...chats.values()] }, null, 2));
  if (!chats.size) console.log('Send /start again to the bot, then rerun.');
  else console.log('Choose your own chat ID and save it as TELEGRAM_CHAT_ID. Do not select another visitor.');
} catch { console.error('Could not check the bot. Verify its token, webhook configuration and server network access.'); process.exit(1); }
