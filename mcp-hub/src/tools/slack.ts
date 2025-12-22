import type { Env } from '../config.js';
import type { HubStore } from '../store/types.js';

export async function slackPostMessage({
  channel,
  text,
  store,
  env,
}: {
  channel: string;
  text: string;
  store: HubStore;
  env: Env;
}) {
  if (!env.SLACK_BOT_TOKEN) {
    return { ok: false, error: 'SLACK_BOT_TOKEN is not configured' };
  }

  const resp = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ channel, text }),
  });

  const textResp = await resp.text();
  const json = safeJson(textResp);

  const artifact = await store.createArtifact({
    type: 'slack_post_message_result',
    source: 'slack',
    contentType: 'application/json',
    contentText: textResp,
    metadata: { channel, status: resp.status },
  });

  return {
    ok: resp.ok && json?.ok === true,
    status: resp.status,
    ts: typeof json?.ts === 'string' ? json.ts : undefined,
    channel: typeof json?.channel === 'string' ? json.channel : channel,
    artifact,
    response: json,
  };
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}


