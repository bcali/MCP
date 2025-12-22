import type { Env } from '../config.js';
import type { HubStore } from '../store/types.js';

export async function figmaImport({
  fileKey,
  store,
  env,
}: {
  fileKey: string;
  store: HubStore;
  env: Env;
}) {
  if (!env.FIGMA_TOKEN) {
    return {
      ok: false,
      error: 'FIGMA_TOKEN is not configured',
    };
  }

  const resp = await fetch(`https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}`, {
    headers: {
      'X-Figma-Token': env.FIGMA_TOKEN,
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    return { ok: false, error: `Figma API error: ${resp.status} ${resp.statusText}`, details: text };
  }

  const data = (await resp.json()) as Record<string, unknown>;
  const name = typeof data.name === 'string' ? data.name : undefined;

  const artifact = await store.createArtifact({
    type: 'figma_file',
    name: name ?? `figma:${fileKey}`,
    source: 'figma',
    contentType: 'application/json',
    contentText: JSON.stringify(data),
    metadata: { fileKey },
  });

  return {
    ok: true,
    artifact,
  };
}


