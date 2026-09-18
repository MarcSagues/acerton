# Bot de Telegram (@saguidev_bot)

Cloudflare Worker que responde a `/status` en Telegram con las PRs
abiertas y las alertas de Dependabot de este repo. Complementa a
`.github/workflows/telegram-notify.yml` (que avisa de comentarios/PRs/tareas)
y a `.github/workflows/telegram-digest.yml` (resumen semanal): esos dos
corren en GitHub Actions, esto corre en Cloudflare porque necesita
responder al instante a un mensaje entrante, algo que Actions no puede
hacer sin sondear (polling).

## Importante: esto no se despliega desde CI

`worker.js` vive aquí solo como referencia/control de versiones. El
Worker real se edita y despliega a mano desde el dashboard de Cloudflare
(Workers & Pages → `rough-brook-0a44` → *Edit code* → pegar → *Deploy*).
Si tocas este fichero, copia el contenido actualizado al editor de
Cloudflare tú mismo — un commit aquí no lo despliega solo.

## Variables de entorno (Settings → Variables and secrets del Worker)

| Variable | Secret | Que es |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | si | Token de @saguidev_bot (via @BotFather) |
| `TELEGRAM_CHAT_ID` | no | chat_id de Marc — el bot ignora mensajes de cualquier otro chat |
| `GITHUB_TOKEN` | si | Fine-grained PAT de solo lectura (`saguidev-bot-readonly`), scope: Pull requests + Dependabot alerts, solo sobre `acerton`. **Caduca el 18 oct 2026** — hay que renovarlo antes en github.com/settings/personal-access-tokens |
| `WEBHOOK_PATH` | no | Segmento aleatorio de la URL (`/tg-xxxx`) — evita que cualquiera que adivine la URL del Worker dispare el bot |
| `WEBHOOK_SECRET` | si | Token que Telegram manda en `X-Telegram-Bot-Api-Secret-Token`; el Worker rechaza cualquier request que no lo traiga |

## Si hay que recrear el webhook de Telegram

```bash
curl -s -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  --data-urlencode "url=https://rough-brook-0a44.marc10sagues.workers.dev/<WEBHOOK_PATH>" \
  --data-urlencode "secret_token=<WEBHOOK_SECRET>" \
  --data-urlencode 'allowed_updates=["message"]'
```
