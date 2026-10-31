import { articleNavigation } from './article-navigation.js?v=reading-controls-20261031';
import { escapeHTML as escape, safeURL } from './site-utils.js';

export const notebookKinds = { idea: 'ideas', note: 'working notes', essay: 'essays' };
export const visiblePosts = posts => posts.filter(post => !post.draft || post.listedDraft);
export const postKind = post => Object.prototype.hasOwnProperty.call(notebookKinds, post.kind) ? post.kind : 'essay';
const kindLabel = post => post.draft ? 'draft' : ({ idea: 'idea', note: 'working note', essay: 'essay' })[postKind(post)];
const readableDate = date => /^\d{4}-\d{2}-\d{2}$/.test(date || '')
  ? new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  : escape(date || '');
const readingMinutes = post => Math.max(1, Math.ceil((post.bodyHTML || (post.body || []).map(block => block.text || block.items?.join(' ') || '').join(' '))
  .replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length / 200));
const postDate = post => `<time datetime="${escape(post.date)}">${readableDate(post.date)}</time>`;

export function notebookPage(posts, kind = 'all') {
  const published = visiblePosts(posts);
  const filtered = published.filter(post => kind === 'all' || postKind(post) === kind);
  return `<section class="page notebook-page${!published.length ? ' blogs-empty' : ''}" aria-label="Research notebook">
    <header class="notebook-heading"><h1 class="notebook-title">Blogs</h1><p>Notes and essays on language models, architecture, and training.</p></header>
    <div class="notebook-filters" role="group" aria-label="Filter writing by stage">${[['all', 'all'], ...Object.entries(notebookKinds)].map(([value, label]) => `<button type="button" class="quiet-button" data-notebook-filter="${value}" aria-pressed="${kind === value}">${label}${published.length ? ` <span>${published.filter(p => value === 'all' || postKind(p) === value).length}</span>` : ''}</button>`).join('')}</div>
    ${filtered.length ? `<ul class="entry-list">${filtered.map(post => `<li class="entry notebook-entry"><a href="#blogs/${encodeURIComponent(post.slug)}"><h2>${escape(post.title)}</h2>${post.summary ? `<p class="notebook-summary">${escape(post.summary)}</p>` : ''}<div class="notebook-meta">${postDate(post)}<span aria-hidden="true">·</span><span>${readingMinutes(post)} min</span><span aria-hidden="true">·</span><span>${kindLabel(post)}</span></div></a></li>`).join('')}</ul>` : `<p class="notebook-empty" role="status">${!published.length ? 'No blogs yet.' : 'Nothing in this stage yet.'}</p>`}
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
  const body = (post.bodyHTML || blocks).replace(/(<h2 id="([^"]+)">)([\s\S]*?)(<\/h2>)/g,
    (_, open, id, title, close) => `${open}${title}<a class="heading-anchor" href="#blogs/${encodeURIComponent(post.slug)}/${escape(id)}" aria-label="Link to this section">#</a>${close}`);
  const contents = headings.length > 3 ? `<details class="article-contents"><summary>In this article <span class="article-progress-label" data-reading-progress hidden aria-label="Reading progress"></span></summary><ol>${headings.map(([,id,title]) => `<li><a href="#blogs/${encodeURIComponent(post.slug)}/${id}">${title}</a></li>`).join('')}</ol></details>` : '';
  return `${articleNavigation(headings, post.slug)}<article class="page notebook-article">
    <header class="blog-post-header"><h1>${escape(post.title)}</h1>
    <p class="article-meta">${post.draft ? `Draft · updated ${readableDate(post.updated || post.date)}` : `${postDate(post)}${post.updated ? ` · updated ${readableDate(post.updated)}` : ''}`} <span aria-hidden="true">·</span> ${readingMinutes(post)} min</p></header>
    ${post.kind === 'idea' || post.kind === 'note' ? '<p class="notebook-stage-note">a thought in progress; this may change.</p>' : ''}
    ${contents}<div class="article-body">${body}</div>
    ${post.changes?.length ? `<details class="note-changes"><summary>how this note changed</summary><ul>${post.changes.map(change => `<li><time>${escape(change.date)}</time> — ${escape(change.text)}</li>`).join('')}</ul></details>` : ''}
    <footer class="blog-post-footer"><a class="back-link" href="#blogs">← All posts</a></footer>
  </article>`;
}
