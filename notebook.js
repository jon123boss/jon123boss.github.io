import { articleNavigation } from './article-navigation.js?v=blog-cards-20261005';
import { escapeHTML as escape, safeURL } from './site-utils.js';

export const notebookKinds = { idea: 'ideas', note: 'working notes', essay: 'essays' };
export const visiblePosts = posts => posts.filter(post => !post.draft || post.listedDraft);
export const postKind = post => Object.prototype.hasOwnProperty.call(notebookKinds, post.kind) ? post.kind : 'essay';
const kindLabel = post => post.draft ? 'draft' : ({ idea: 'idea', note: 'working note', essay: 'essay' })[postKind(post)];

export function notebookPage(posts, kind = 'all') {
  const published = visiblePosts(posts);
  const filtered = published.filter(post => kind === 'all' || postKind(post) === kind);
  return `<section class="page notebook-page${!published.length ? ' blogs-empty' : ''}" aria-label="Research notebook">
    <h1 class="feature-kicker notebook-title">research notebook</h1>
    <div class="notebook-filters" role="group" aria-label="Filter writing by stage">${[['all', 'all'], ...Object.entries(notebookKinds)].map(([value, label]) => `<button type="button" class="quiet-button" data-notebook-filter="${value}" aria-pressed="${kind === value}">${label}${published.length ? ` <span>${published.filter(p => value === 'all' || postKind(p) === value).length}</span>` : ''}</button>`).join('')}</div>
    ${filtered.length ? `<ul class="entry-list">${filtered.map(post => `<li class="entry notebook-entry"><a href="#blogs/${encodeURIComponent(post.slug)}"><div class="notebook-meta"><span>${kindLabel(post)}</span><time datetime="${escape(post.updated || post.date)}">${escape(post.updated || post.date)}</time></div><h2>${escape(post.title)}</h2><span class="notebook-open" aria-hidden="true">→</span></a></li>`).join('')}</ul>` : `<p class="notebook-empty" role="status">${!published.length ? 'No blogs yet.' : 'Nothing in this stage yet.'}</p>`}
  </section>`;
}
export function notebookPost(post) {
  const blocks = (post.body || []).map(block => {
    if (block.type === 'link') {
      const href = safeURL(block.url);
      return href ? `<p><a href="${escape(href)}" target="_blank" rel="noopener noreferrer">${escape(block.text)}</a></p>` : '';
    }
    if (block.type === 'code') return `<pre><code>${escape(block.text)}</code></pre>`;
    if (block.type === 'list') return `<ul>${block.items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`;
    const tag = block.type === 'heading' ? 'h2' : block.type === 'quote' ? 'blockquote' : 'p';
    return `<${tag}>${escape(block.text)}</${tag}>`;
  }).join('');
  const headings = [...(post.bodyHTML || '').matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)];
  const body = (post.bodyHTML || blocks).replace(/(<h2\b[^>]*>)([\s\S]*?)(<\/h2>)/g, '$1<span class="section-highlight">$2</span>$3');
  const contents = headings.length > 3 ? `<details class="article-contents"><summary>In this article <span class="article-progress-label" data-reading-progress hidden aria-label="Reading progress"></span></summary><ol>${headings.map(([,id,title]) => `<li><a href="#blogs/${encodeURIComponent(post.slug)}/${id}">${title}</a></li>`).join('')}</ol></details>` : '';
  return `${articleNavigation(headings, post.slug)}<article class="page notebook-article"><a class="back-link" href="#blogs">← Blogs</a>
    <p class="feature-kicker">${kindLabel(post)}</p><h1>${escape(post.title)}</h1>
    <p class="article-meta">${post.draft ? `draft · updated ${escape(post.updated || post.date)}` : `published ${escape(post.date)}${post.updated ? ` · updated ${escape(post.updated)}` : ''}`}</p>
    ${post.kind === 'idea' || post.kind === 'note' ? '<p class="notebook-stage-note">a thought in progress; this may change.</p>' : ''}
    ${contents}<div class="article-body">${body}</div>
    ${post.changes?.length ? `<details class="note-changes"><summary>how this note changed</summary><ul>${post.changes.map(change => `<li><time>${escape(change.date)}</time> — ${escape(change.text)}</li>`).join('')}</ul></details>` : ''}
  </article>`;
}
