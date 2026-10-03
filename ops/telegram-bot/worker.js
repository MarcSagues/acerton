export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method !== 'POST' || url.pathname !== '/' + env.WEBHOOK_PATH) {
      return new Response('Not found', { status: 404 });
    }

    const secretHeader = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (secretHeader !== env.WEBHOOK_SECRET) {
      return new Response('Forbidden', { status: 403 });
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response('Bad request', { status: 400 });
    }

    ctx.waitUntil(handleUpdate(update, env));
    return new Response('OK');
  },
};

async function handleUpdate(update, env) {
  const message = update.message;
  if (!message || typeof message.text !== 'string') return;

  const chatId = message.chat.id;
  if (String(chatId) !== env.TELEGRAM_CHAT_ID) return;

  const text = message.text.trim().split('@')[0];

  if (text === '/status') {
    await sendMessage(env, chatId, await buildStatus(env));
  } else if (text === '/start' || text === '/help') {
    await sendMessage(env, chatId, 'Comandos:\n/status - PRs abiertas y alertas de Dependabot de acerton');
  }
}

async function buildStatus(env) {
  const repo = 'MarcSagues/acerton';
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'saguidev-bot',
  };

  const [prsRes, alertsRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=20`, { headers }),
    fetch(`https://api.github.com/repos/${repo}/dependabot/alerts?state=open&per_page=100`, { headers }),
  ]);

  const prs = prsRes.ok ? await prsRes.json() : [];
  const alerts = alertsRes.ok ? await alertsRes.json() : [];

  const prLines = Array.isArray(prs) && prs.length
    ? prs.map((p) => `#${p.number} ${p.title} -> ${p.base.ref}`).join('\n')
    : '(ninguna)';

  const bySeverity = {};
  if (Array.isArray(alerts)) {
    for (const a of alerts) {
      const sev = a.security_vulnerability && a.security_vulnerability.severity
        ? a.security_vulnerability.severity
        : 'unknown';
      bySeverity[sev] = (bySeverity[sev] || 0) + 1;
    }
  }
  const order = ['critical', 'high', 'medium', 'low', 'unknown'];
  const alertLine = Object.keys(bySeverity).length
    ? order
        .filter((k) => bySeverity[k])
        .map((k) => `${k}: ${bySeverity[k]}`)
        .join(', ')
    : '(ninguna)';

  const prCount = Array.isArray(prs) ? prs.length : 0;

  return `acerton\n\nPRs abiertas (${prCount}):\n${prLines}\n\nAlertas Dependabot abiertas:\n${alertLine}`;
}

async function sendMessage(env, chatId, text) {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
