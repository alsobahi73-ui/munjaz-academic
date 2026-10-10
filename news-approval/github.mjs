import { updateFiles } from './core.mjs';
const paths = ['news_queue.json', 'news.json', 'published.json', 'ignored.json'];
export class GitHubStore {
  constructor(env) { this.env = env; }
  async api(path, body, method) {
    const response = await fetch(`https://api.github.com/repos/${this.env.GITHUB_REPOSITORY}/${path}`, {
      method: method || (body ? 'POST' : 'GET'),
      headers: { Authorization: `Bearer ${this.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'Munjaz-Academic-News-Approval', 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`github_${response.status}`);
    return response.json();
  }
  async snapshot() {
    const branch = encodeURIComponent(this.env.GITHUB_BRANCH || 'main');
    const ref = await this.api(`git/ref/heads/${branch}`);
    const commit = await this.api(`git/commits/${ref.object.sha}`);
    const tree = await this.api(`git/trees/${commit.tree.sha}`);
    if (tree.truncated) throw new Error('github_tree_truncated');
    const files = {};
    for (const path of paths) {
      const entry = tree.tree.find(item => item.path === path);
      if (!entry) { files[path] = []; continue; }
      if (entry.type !== 'blob') throw new Error('invalid_news_file');
      const blob = await this.api(`git/blobs/${entry.sha}`);
      if (blob.encoding !== 'base64') throw new Error('invalid_blob_encoding');
      const bytes = Uint8Array.from(atob(blob.content.replace(/\s/g, '')), char => char.charCodeAt(0));
      files[path] = JSON.parse(new TextDecoder().decode(bytes));
      if (!Array.isArray(files[path])) throw new Error('invalid_news_file');
    }
    return { sha: ref.object.sha, tree: commit.tree.sha, files };
  }
  async sync(record) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await this.snapshot();
      const files = await updateFiles(current.files, record);
      const tree = await this.api('git/trees', { base_tree: current.tree, tree: paths
        .filter(path => JSON.stringify(files[path]) !== JSON.stringify(current.files[path]))
        .map(path => ({ path, mode: '100644', type: 'blob', content: JSON.stringify(files[path], null, 2) + '\n' })) });
      const commit = await this.api('git/commits', { message: `news: ${record.decision} reviewed item ${record.id}`, tree: tree.sha, parents: [current.sha] });
      try {
        await this.api(`git/refs/heads/${encodeURIComponent(this.env.GITHUB_BRANCH || 'main')}`, { sha: commit.sha, force: false }, 'PATCH');
        return;
      } catch (error) {
        if (!['github_409', 'github_422'].includes(error.message)) throw error;
      }
    }
    throw new Error('github_concurrent_updates');
  }
}
