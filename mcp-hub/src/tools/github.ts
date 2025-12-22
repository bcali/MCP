import type { Env } from '../config.js';
import type { HubStore } from '../store/types.js';

function requireGithubToken(env: Env) {
  if (!env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is not configured');
  }
  return env.GITHUB_TOKEN;
}

export async function githubPutFile({
  owner,
  repo,
  path,
  content,
  message,
  branch,
  store,
  env,
}: {
  owner: string;
  repo: string;
  path: string;
  content: string;
  message: string;
  branch: string;
  store: HubStore;
  env: Env;
}) {
  const token = requireGithubToken(env);

  // Check if file exists to get sha (for update)
  const getResp = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}?ref=${encodeURIComponent(branch)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  let sha: string | undefined;
  if (getResp.ok) {
    const existing = (await getResp.json()) as { sha?: string };
    sha = existing.sha;
  }

  const body = {
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch,
    ...(sha ? { sha } : {}),
  };

  const putResp = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  const resultText = await putResp.text();
  const artifact = await store.createArtifact({
    type: 'github_put_file_result',
    source: 'github',
    contentType: 'application/json',
    contentText: resultText,
    metadata: { owner, repo, path, branch, status: putResp.status },
  });

  return {
    ok: putResp.ok,
    status: putResp.status,
    artifact,
    response: safeJson(resultText),
  };
}

export async function githubCreatePullRequest({
  owner,
  repo,
  head,
  base,
  title,
  body,
  store,
  env,
}: {
  owner: string;
  repo: string;
  head: string;
  base: string;
  title: string;
  body?: string;
  store: HubStore;
  env: Env;
}) {
  const token = requireGithubToken(env);

  const resp = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, head, base, body }),
  });

  const text = await resp.text();
  const json = safeJson(text);

  const artifact = await store.createArtifact({
    type: 'github_pull_request',
    source: 'github',
    contentType: 'application/json',
    contentText: text,
    metadata: { owner, repo, head, base, status: resp.status },
  });

  return {
    ok: resp.ok,
    status: resp.status,
    url: typeof json?.html_url === 'string' ? json.html_url : undefined,
    number: typeof json?.number === 'number' ? json.number : undefined,
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


