import { paperPreview } from './paper-previews.js?v=blender-27';

const escape = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function explanationPage(article) {
  return `<article class="page explanation-page" aria-label="${escape(article.shortTitle)} explanation">
    <a class="back-link" href="#papers">← Papers</a>
    <header class="explanation-header">
      <p class="explanation-kicker">LLM generated explanation</p>
      <h1>${escape(article.title)}</h1>
      <p class="explanation-credit">Generated using GPT-6 Astra</p>
      <p class="explanation-source">Based on ${escape(article.sourceVersion)} · <a href="${escape(article.sources[0].url)}" target="_blank" rel="noopener noreferrer">Original paper</a></p>
      <p class="explanation-lead">${escape(article.lead)}</p>
    </header>
    <section class="explanation-overview" aria-label="The architecture at a glance">
      ${paperPreview(article.slug)}
    </section>
    <details class="paper-lab" id="playground" tabindex="-1">
      <summary>try the idea <span>an interactive calculation</span></summary>
      <div class="lab-mount" aria-label="Interactive ${escape(article.shortTitle)} demo"></div>
    </details>
    <details class="explanation-contents">
      <summary>In this explanation</summary>
      <ol>${article.sections.map(section => `<li><a href="#papers/${encodeURIComponent(article.slug)}/${encodeURIComponent(section.id)}">${escape(section.title)}</a></li>`).join('')}</ol>
    </details>
    <div class="explanation-body">${article.sections.map(section => `<section class="explanation-section" id="${escape(section.id)}" aria-labelledby="heading-${escape(section.id)}" tabindex="-1">
      <h2 id="heading-${escape(section.id)}">${escape(section.title)}</h2>
      ${section.html}
    </section>`).join('')}</div>
    <footer class="explanation-footer">
      <p>Source material</p>
      <div class="paper-links">${article.sources.map(source => `<a class="paper-link" href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.label)}</a>`).join('')}</div>
      <a class="back-link" href="#papers">← Back to papers</a>
    </footer>
  </article>`;
}

