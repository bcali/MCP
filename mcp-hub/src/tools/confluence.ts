import type { Env } from '../config.js';
import type { HubStore } from '../store/types.js';

function requireAtlassianConfig(env: Env) {
  const missing = [
    !env.ATLASSIAN_EMAIL ? 'ATLASSIAN_EMAIL' : null,
    !env.ATLASSIAN_API_TOKEN ? 'ATLASSIAN_API_TOKEN' : null,
    !env.CONFLUENCE_BASE_URL ? 'CONFLUENCE_BASE_URL' : null,
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(`Missing Confluence config: ${missing.join(', ')}`);
  }
  return {
    email: env.ATLASSIAN_EMAIL!,
    token: env.ATLASSIAN_API_TOKEN!,
    baseUrl: env.CONFLUENCE_BASE_URL!.replace(/\/+$/, ''),
  };
}

// Minimal upsert behavior:
// - Search by title in a space using CQL (v1 endpoint)
// - If found: update page content (v1 endpoint)
// - Else: create new page (v1 endpoint)
export async function confluenceUpsertPage({
  spaceKey,
  title,
  bodyHtml,
  store,
  env,
}: {
  spaceKey: string;
  title: string;
  bodyHtml: string;
  store: HubStore;
  env: Env;
}) {
  let cfg: { email: string; token: string; baseUrl: string };
  try {
    cfg = requireAtlassianConfig(env);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Confluence config error' };
  }

  const auth = Buffer.from(`${cfg.email}:${cfg.token}`, 'utf8').toString('base64');

  const cql = `space="${escapeCql(spaceKey)}" AND type=page AND title="${escapeCql(title)}"`;
  const searchUrl = `${cfg.baseUrl}/rest/api/content/search?cql=${encodeURIComponent(cql)}&limit=1&expand=version`;
  const searchResp = await fetch(searchUrl, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
    },
  });

  const searchText = await searchResp.text();
  const searchJson = safeJson(searchText);

  if (!searchResp.ok) {
    const artifact = await store.createArtifact({
      type: 'confluence_search_error',
      source: 'confluence',
      contentType: 'application/json',
      contentText: searchText,
      metadata: { spaceKey, title, status: searchResp.status },
    });
    return { ok: false, status: searchResp.status, error: 'Confluence search failed', artifact };
  }

  const results = Array.isArray(searchJson?.results) ? searchJson.results : [];
  const existing = results[0];

  if (!existing?.id) {
    // Create
    const createUrl = `${cfg.baseUrl}/rest/api/content`;
    const createBody = {
      type: 'page',
      title,
      space: { key: spaceKey },
      body: { storage: { value: bodyHtml, representation: 'storage' } },
    };
    const createResp = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBody),
    });

    const createText = await createResp.text();
    const createJson = safeJson(createText);

    const artifact = await store.createArtifact({
      type: 'confluence_page_create',
      source: 'confluence',
      contentType: 'application/json',
      contentText: createText,
      metadata: { spaceKey, title, status: createResp.status },
    });

    return {
      ok: createResp.ok,
      status: createResp.status,
      pageId: typeof createJson?.id === 'string' ? createJson.id : undefined,
      url: typeof createJson?._links?.base === 'string' && typeof createJson?._links?.webui === 'string'
        ? `${createJson._links.base}${createJson._links.webui}`
        : undefined,
      artifact,
      response: createJson,
    };
  }

  // Update
  const pageId = String(existing.id);
  const currentVersion = Number(existing.version?.number ?? 1);
  const updateBody = {
    id: pageId,
    type: 'page',
    title,
    version: { number: currentVersion + 1 },
    body: { storage: { value: bodyHtml, representation: 'storage' } },
  };
  const updateUrl = `${cfg.baseUrl}/rest/api/content/${encodeURIComponent(pageId)}`;
  const updateResp = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateBody),
  });

  const updateText = await updateResp.text();
  const updateJson = safeJson(updateText);

  const artifact = await store.createArtifact({
    type: 'confluence_page_update',
    source: 'confluence',
    contentType: 'application/json',
    contentText: updateText,
    metadata: { spaceKey, title, pageId, status: updateResp.status },
  });

  return {
    ok: updateResp.ok,
    status: updateResp.status,
    pageId,
    url: typeof updateJson?._links?.base === 'string' && typeof updateJson?._links?.webui === 'string'
      ? `${updateJson._links.base}${updateJson._links.webui}`
      : undefined,
    artifact,
    response: updateJson,
  };
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function escapeCql(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}


