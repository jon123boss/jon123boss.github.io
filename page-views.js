import { site } from './content.js?v=platform-polish-20261005';
import { escapeHTML as escape } from './site-utils.js';

export function about() {
  const renderBlock = block => {
    if (block.type === 'greeting') return `<h1 class="bio-greeting">${escape(block.text)}</h1>`;
    if (block.type === 'list') return `<section class="bio-section"><h2>${escape(block.title)}</h2><ul>${block.items.map(item => `<li>${escape(item)}</li>`).join('')}</ul></section>`;
    if (block.type === 'contact') return `<p class="bio-contact">${escape(block.before)}<a href="mailto:${escape(block.email)}">${escape(block.email)}</a>${escape(block.after).replace('we can play chess :)', '<a href="#about/chess">we can play chess :)</a>')}${block.note ? `<span class="bio-background-note">${escape(block.note)}</span>` : ''}</p>`;
    return `<p>${escape(block.text)}</p>`;
  };
  const introduction = site.biography.filter(block => block.type !== 'list' && block.type !== 'contact').map(renderBlock).join('');
  const lists = site.biography.filter(block => block.type === 'list').map(renderBlock).join('');
  const contact = site.biography.filter(block => block.type === 'contact').map(renderBlock).join('');
  return `<section class="page about-page" aria-label="about me"><div class="bio">${introduction}<div class="bio-lists">${lists}</div>${contact}</div></section>`;
}


function safeURL(value) {
  if (!value) return '';
  try {
    const url = new URL(value, 'https://example.invalid/');
    return ['http:', 'https:'].includes(url.protocol) ? value : '';
  } catch { return ''; }
}

export function papers() {
  return `<section class="page papers-page" aria-label="Papers"><h1 class="sr-only">Papers</h1>
    ${site.papers.map(paper => {
      const url = safeURL(paper.url);
      const github = safeURL(paper.github);
      const preview = safeURL(paper.preview);
      const venue = [paper.venue, paper.year].filter(Boolean).join(' ');
      const publication = paper.status ? `${paper.status} to ${venue}` : venue;
      const metadata = [paper.authors, publication, paper.track].filter(Boolean).join(' · ');
      const image = preview ? `<img src="${escape(preview)}" alt="First page of ${escape(paper.title)}" width="720" height="932" decoding="async" loading="lazy">` : '';
      return `<article class="paper-entry${preview ? ' has-preview' : ''}">
        ${preview ? (url ? `<a class="paper-preview" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${image}</a>` : `<div class="paper-preview">${image}</div>`) : ''}
        <div class="paper-info">
        <h2>${url ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(paper.title)}</a>` : escape(paper.title)}</h2>
        ${metadata ? `<p class="paper-authors">${escape(metadata)}</p>` : ''}
        ${paper.abstract ? `<details><summary>Abstract</summary><p class="abstract">${escape(paper.abstract)}</p></details>` : ''}
        ${url || github ? `<div class="paper-links">
          ${url ? `<a class="paper-link" href="${escape(url)}" target="_blank" rel="noopener noreferrer" aria-label="Read ${escape(paper.title)}">Paper</a>` : ''}
          ${github ? `<a class="paper-link" href="${escape(github)}" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository for ${escape(paper.title)}">GitHub</a>` : ''}
        </div>` : ''}
        ${paper.explanation ? `<div class="paper-explanation">
          <a class="explanation-button" href="#papers/${encodeURIComponent(paper.explanation)}" aria-label="LLM generated explanations of ${escape(paper.title)}">LLM generated explanations</a>
          <a class="explanation-button try-idea-button" href="#papers/${encodeURIComponent(paper.explanation)}/playground" aria-label="Try the idea in ${escape(paper.title)}">try the idea ↗</a>
          <span>Using GPT-6 Astra</span>
        </div>` : ''}
        </div>
      </article>`;
    }).join('')}
    ${site.papers.length ? '' : '<p class="bio">No papers yet.</p>'}
  </section>`;
}

