import { escapeHTML } from './site-utils.js';

const glossary = {
  'residual stream': ['residual stream', 'The running vector that carries information through the model. In an ordinary residual network, each sub-layer adds an update to it.'],
  'residual connection': ['residual connection', 'A shortcut that adds a transformation to the state it started from: next = current + update.'],
  'RMSNorm': ['RMS normalization', 'Divide a vector by its root-mean-square magnitude. A small epsilon avoids division by zero. Some variants also learn a gain for each coordinate.'],
  'RMS normalization': ['RMS normalization', 'Rescale a vector by the square root of its mean squared coordinate. In default LR-AttnRes, this normalization sees the key slice, not the full value.'],
  'softmax': ['softmax', 'Turn scores into positive weights summing to one: exp(score) divided by the sum of all exponentials. The axis matters: LR-AttnRes normalizes across sources.'],
  'query': ['query', 'The vector used to score candidate keys. LR-AttnRes learns one input-independent query per read site; token-attention queries usually depend on the input.'],
  'key': ['key', 'A description used for matching against a query. A key decides the weight; the corresponding value supplies the information that is mixed.'],
  'value': ['value', 'The information carried by an attention source. A narrow routing key does not require a narrow value.'],
  'rank': ['routing width and rank', 'Here r is the number of coordinates used as a routing key. Matrix rank instead counts independent directions. These are related ideas, not interchangeable definitions.'],
  'anchors': ['exogenous anchors', 'Reusable input-dependent projections produced by matrices outside the sequential layer stack. They are learned references, not retrieved external knowledge.'],
  'RoPE': ['rotary position embeddings', 'Position-dependent rotations of queries and keys, used to make token attention sensitive to relative position.'],
  'perplexity': ['perplexity', 'The exponential of average next-token cross-entropy. Lower is better for the same evaluation data and tokenization; it is not a task-accuracy percentage.'],
};

const sources = {
  '2601.08131': { title: 'Attention Projection Mixing with Exogenous Anchors', version: 'arXiv v4 · Jonathan Su', text: 'ExoFormer mixes normalized, separately learned anchor projections with the current layer’s Q/K/V/gate projections.', url: 'https://arxiv.org/pdf/2601.08131v4' },
  '2607.09694': { title: 'Low-Rank Attention Residuals', version: 'arXiv v2 · Jonathan Su', text: 'LR-AttnRes uses a narrow key slice to select a mixture of full-width residual sources.', url: 'https://arxiv.org/pdf/2607.09694v2' },
};
let cleanup = () => {};

export function setupReadingTools(root, article) {
  cleanup();
  const abort = new AbortController(), signal = abort.signal;
  const panel = document.createElement('aside');
  panel.id = 'reading-peek'; panel.className = 'reading-peek'; panel.hidden = true;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'false');
  document.body.append(panel);
  let active = null;
  const source = sources[article.slug === 'exoformer' ? '2601.08131' : '2607.09694'];
  function close(restore = false) {
    panel.hidden = true;
    active?.setAttribute('aria-expanded', 'false');
    if (restore && active?.isConnected) active.focus({ preventScroll: true });
    active = null;
  }
  function position() {
    if (!active || panel.hidden) return;
    const rect = active.getBoundingClientRect(), width = panel.getBoundingClientRect().width;
    panel.style.left = `${Math.max(12, Math.min(innerWidth - width - 12, rect.left))}px`;
    const height = panel.getBoundingClientRect().height;
    panel.style.top = `${Math.max(12, Math.min(innerHeight - height - 12, rect.bottom + 9))}px`;
  }
  function open(button, title, text, url, label) {
    if (active === button) { close(true); return; }
    close(); active = button; button.setAttribute('aria-expanded', 'true');
    panel.innerHTML = `<button class="peek-close" type="button" aria-label="Close explanation">×</button><h2 id="peek-title">${escapeHTML(title)}</h2><p>${escapeHTML(text)}</p><a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(label)} ↗</a>`;
    panel.setAttribute('aria-labelledby', 'peek-title'); panel.hidden = false;
    position();
    panel.querySelector('button').focus({ preventScroll: true });
  }
  const used = new Set();
  // Enhance authored prose only; equations, code, headings, and links stay intact.
  root.querySelectorAll('.explanation-section p, .explanation-section li').forEach(paragraph => {
    if (paragraph.closest('.paper-lab')) return;
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT, {
      acceptNode: node => node.parentElement.closest('a,button,code,.katex,.katex-display') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    const texts = []; while (walker.nextNode()) texts.push(walker.currentNode);
    for (const node of texts) {
      const entries = Object.entries(glossary).filter(([term]) => !used.has(term));
      const matches = entries.map(([term, definition]) => {
        const match = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').exec(node.textContent);
        return match ? { term, definition, index: match.index, value: match[0] } : null;
      }).filter(Boolean).sort((a, b) => a.index - b.index || b.value.length - a.value.length);
      if (!matches.length) continue;
      const fragment = document.createDocumentFragment(); let offset = 0;
      for (const match of matches) {
        if (match.index < offset || used.has(match.term)) continue;
        fragment.append(node.textContent.slice(offset, match.index));
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'definition-trigger'; button.textContent = match.value;
        button.setAttribute('aria-label', `Define ${match.value}`); button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', panel.id);
        button.addEventListener('click', () => open(button, ...match.definition, source.url, 'paper context'), { signal });
        fragment.append(button); offset = match.index + match.value.length; used.add(match.term);
      }
      fragment.append(node.textContent.slice(offset)); node.replaceWith(fragment);
    }
  });
  root.querySelectorAll('.explanation-section').forEach(section => {
    const link = [...section.querySelectorAll('a[href]')].find(a => Object.keys(sources).some(id => a.href.includes(id)));
    if (!link) return;
    const reference = Object.entries(sources).find(([id]) => link.href.includes(id))?.[1];
    const button = document.createElement('button'); button.type = 'button'; button.className = 'reference-trigger'; button.textContent = 'preview';
    button.setAttribute('aria-label', `Preview source for ${section.querySelector('h2')?.textContent}`);
    button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', panel.id);
    button.addEventListener('click', () => open(button, reference.title, `${reference.version}. ${reference.text}`, link.href, 'open cited page'), { signal });
    link.after(button);
  });
  panel.addEventListener('click', event => { if (event.target.closest('.peek-close')) close(true); }, { signal });
  document.addEventListener('click', event => { if (active && !panel.contains(event.target) && !active.contains(event.target)) close(); }, { signal });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && active) { event.preventDefault(); close(true); } }, { signal });
  window.addEventListener('scroll', position, { signal, passive: true });
  window.addEventListener('resize', position, { signal });
  window.addEventListener('hashchange', () => { if (!root.contains(active)) close(); }, { signal });
  cleanup = () => { abort.abort(); panel.remove(); };
}
export function clearReadingTools() { cleanup(); cleanup = () => {}; }
