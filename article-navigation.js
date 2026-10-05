import { escapeHTML } from './site-utils.js';

const shortTitles = {
  'motivation': 'Motivation',
  'why-so-small': 'Why so small',
  'vocabulary-is-expensive-at-this-scale': 'Vocabulary',
  'residuals-across-recurrent-loops': 'Loop residuals',
  'why-i-moved-from-three-loops-to-six': 'Three to six loops',
  'nitp-was-worth-revisiting': 'Revisiting NITP',
  'what-happens-to-nitp-during-cooldown': 'NITP in cooldown',
  'deepcrossattention-did-not-make-the-cut': 'DeepCrossAttention',
  'one-large-shared-block-or-two-smaller-blocks': 'Shared blocks',
  'small-details-that-mattered': 'Small details',
  'the-harsh-lesson-from-100b-tokens': 'The 100B lesson',
  'trying-the-pulvis-v2-architecture': 'Pulvis v2',
  'latent-tokens-and-a-simpler-two-pass-model': 'Latents and two passes',
  'the-final-model': 'The final model',
  'pausing-here': 'Pausing here',
};

export function articleNavigation(headings, slug) {
  if (headings.length < 4) return '';
  return `<nav class="article-rail" aria-label="Article sections">
    <div class="article-rail-header"><span>On this page</span><span data-reading-progress hidden aria-label="Reading progress"></span></div>
    <div class="article-rail-body"><span class="article-rail-track" aria-hidden="true"><span></span></span>
      <ol>${headings.map(([, id, title], index) => `<li><a href="#blogs/${encodeURIComponent(slug)}/${escapeHTML(id)}" data-section="${escapeHTML(id)}" title="${escapeHTML(title)}"><span class="article-rail-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span>${escapeHTML(shortTitles[id] || title)}</span></a></li>`).join('')}</ol>
    </div>
    <a class="article-rail-top" href="#blogs/${encodeURIComponent(slug)}">↑ Back to top</a>
  </nav>`;
}

export function readingState(scrollY, viewportHeight, top, bottom, sectionTops) {
  const end = Math.max(top, bottom - viewportHeight);
  const progress = end === top ? (scrollY >= top ? 1 : 0) : Math.max(0, Math.min(1, (scrollY - top) / (end - top)));
  const threshold = scrollY + Math.min(160, Math.max(80, viewportHeight * .18));
  let active = 0;
  sectionTops.forEach((position, index) => { if (position <= threshold) active = index; });
  if (progress === 1) active = Math.max(0, sectionTops.length - 1);
  return { progress, active };
}

export function setupArticleNavigation(root) {
  const rail = root.querySelector('.article-rail');
  const article = root.querySelector('.notebook-article');
  if (!rail || !article) return () => {};
  const links = [...rail.querySelectorAll('[data-section]')];
  const headings = links.map(link => document.getElementById(link.dataset.section));
  const labels = [...root.querySelectorAll('[data-reading-progress]')];
  const contents = root.querySelector('.article-contents');
  let frame = 0;
  let disposed = false;
  let current = -1;
  let heldHeading = null;
  let alignHeading = false;
  function update() {
    frame = 0;
    if (disposed) return;
    // Keep a requested heading in place while nearby lazy charts change height.
    // Any reading gesture releases it immediately.
    if (heldHeading && alignHeading) heldHeading.scrollIntoView({ block: 'start', behavior: 'auto' });
    alignHeading = false;
    const bounds = article.getBoundingClientRect();
    const state = readingState(window.scrollY, window.innerHeight,
      bounds.top + window.scrollY, bounds.bottom + window.scrollY,
      headings.map(heading => heading.getBoundingClientRect().top + window.scrollY));
    rail.style.setProperty('--reading-progress', state.progress);
    labels.forEach(label => { label.hidden = false; label.textContent = `${Math.round(state.progress * 100)}%`; });
    if (current !== state.active) {
      current = state.active;
      links.forEach((link, index) => {
        if (index === current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
        link.classList.toggle('is-read', index < current);
      });
      const activeLink = links[current];
      if (activeLink && rail.clientHeight && rail.scrollHeight > rail.clientHeight) {
        const box = activeLink.getBoundingClientRect();
        const view = rail.getBoundingClientRect();
        if (box.top < view.top + 24) rail.scrollTop -= view.top + 24 - box.top;
        else if (box.bottom > view.bottom - 24) rail.scrollTop += box.bottom - view.bottom + 24;
      }
    }
  }
  function schedule() { if (!frame && !disposed) frame = requestAnimationFrame(update); }
  function scheduleAlignment() { alignHeading = true; schedule(); }
  function releaseHeading() { heldHeading = null; }
  function holdHeading(event) { heldHeading = event.detail?.id ? document.getElementById(event.detail.id) : null; scheduleAlignment(); }
  root.addEventListener('site:article-jump', holdHeading);
  const gestures = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
  gestures.forEach(type => window.addEventListener(type, releaseHeading, { passive: true }));
  function closeContents(event) { if (event.target.closest('a')) { contents.open = false; schedule(); } }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', scheduleAlignment);
  contents?.addEventListener('click', closeContents);
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleAlignment) : null;
  observer?.observe(article);
  document.fonts?.ready.then(scheduleAlignment);
  update();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', scheduleAlignment);
    contents?.removeEventListener('click', closeContents);
    observer?.disconnect();
    root.removeEventListener('site:article-jump', holdHeading);
    gestures.forEach(type => window.removeEventListener(type, releaseHeading));
  };
}
