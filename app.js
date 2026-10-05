import { setupArticleNavigation } from './article-navigation.js?v=blog-cards-20261005';
import { about, papers } from './page-views.js?v=platform-polish-20261005';
import { site } from './content.js?platform-polish-20261005';
import { chessPage, setupChess } from './chess-opening.js?v=refined-24';
import { notebookPage, notebookPost, visiblePosts } from './notebook.js?v=blog-cards-20261005';
import { setupResearchPlots } from './research-plots.js?platform-polish-20261005';
import { clearReadingTools } from './reading-tools.js?v=features-20';
import { setupPaperPreviews } from './paper-previews.js?v=blender-27';

const explanationLoaders = {
  exoformer: () => import('./explanations/exoformer.js?v=explanations-1'),
  'lr-attnres': () => import('./explanations/lr-attnres.js?v=explanations-1'),
};
let renderRevision = 0;
let notebookFilter = 'all';
let disposePaperPreviews = null;
let disposeResearchPlots = null;
let disposeArticleNavigation = null;
let previousSection = null;

const main = document.querySelector('main');
if (location.hash && !location.hash.includes('/') && document.body.dataset.route?.includes('/') && document.getElementById(location.hash.slice(1))) {
  history.replaceState(null, '', `#${document.body.dataset.route}/${location.hash.slice(1)}`);
}
const navLinks = [...document.querySelectorAll('.site-header nav a')];
// Real HTML destinations work without scripts; enhance them to the live router.
document.querySelectorAll('[data-route]').forEach(link => {
  if (link.tagName === 'A') link.href = `#${link.dataset.route}`;
});
const escape = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const name = document.querySelector('.wordmark');
name.querySelector('.wordmark-name').textContent = site.name;
name.setAttribute('aria-label', `${site.name}, home`);

function blogs() {
  return notebookPage(site.blogs, notebookFilter);
}

function blogPost(post) {
  return notebookPost(post);
}

function revealPage() {
  const page = main.querySelector(':scope > .page');
  if (!page) return;
  // Animate only newly opened content. The header and background stay in place.
  [...page.children].forEach((element, index) => {
    element.style.setProperty('--arrival-delay', `${Math.min(index, 4) * 40}ms`);
  });
  main.classList.add('page-arrival');
}

async function render({ focus = false } = {}) {
  const revision = ++renderRevision;
  const routeParts = (location.hash.slice(1) || document.body.dataset.route || 'about').split('/');
  // In-page links preserve the live charts and their selected views.
  if (routeParts[0] === 'blogs' && routeParts[1] && routeParts[1] === main.dataset.post) {
    if (!routeParts[2]) {
      main.dispatchEvent(new CustomEvent('site:article-jump', { detail: { id: null } }));
      main.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    const section = routeParts[2] && document.getElementById(routeParts[2]);
    if (section && main.contains(section)) {
      section.tabIndex = -1;
      section.focus({ preventScroll: true });
      section.scrollIntoView({ block: 'start', behavior: 'auto' });
      main.dispatchEvent(new CustomEvent('site:article-jump', { detail: { id: section.id } }));
      return;
    }
  }
  delete main.dataset.post;
  main.classList.remove('page-arrival');
  disposePaperPreviews?.(); disposePaperPreviews = null;
  disposeResearchPlots?.(); disposeResearchPlots = null;
  disposeArticleNavigation?.(); disposeArticleNavigation = null;
  const route = location.hash.slice(1) || document.body.dataset.route || 'about';
  const [section, slug, anchor] = route.split('/');
  const post = section === 'blogs' && slug ? visiblePosts(site.blogs).find(entry => encodeURIComponent(entry.slug) === slug) : undefined;
  let active = 'about';
  let title = 'About me';
  if (section === 'blogs' && (!slug || post)) {
    active = 'blogs'; title = post ? post.title : 'Blogs';
    main.innerHTML = post ? blogPost(post) : blogs();
    if (post) { main.dataset.post = post.slug; disposeResearchPlots = setupResearchPlots(main); disposeArticleNavigation = setupArticleNavigation(main); }
  } else if (section === 'papers' && !slug) {
    active = 'papers'; title = 'Papers'; main.innerHTML = papers();
  } else if (section === 'papers' && Object.prototype.hasOwnProperty.call(explanationLoaders, slug)) {
    active = 'papers';
    if (main.dataset.explanation !== slug) {
      delete main.dataset.explanation;
      delete main.dataset.explanationTitle;
      main.innerHTML = '<section class="page"><p class="bio" role="status">Loading explanation…</p></section>';
      try {
        const [{ default: article }, view] = await Promise.all([
          explanationLoaders[slug](), import('./explanation-view.js?v=platform-polish-20261005'),
        ]);
        if (revision !== renderRevision) return;
        main.innerHTML = view.explanationPage(article);
        view.typesetExplanation(main, article);
        main.dataset.explanation = slug;
        main.dataset.explanationTitle = `${article.shortTitle} explained`;
      } catch (error) {
        if (revision !== renderRevision) return;
        console.error('Unable to load explanation', error);
        main.innerHTML = '<section class="page"><p>The explanation could not be loaded. Refresh to try again.</p><a href="#papers">← Papers</a></section>';
      }
    }
    title = main.dataset.explanationTitle || 'Paper explanation';
    disposePaperPreviews = setupPaperPreviews(main);
  } else if (section === 'about' && slug === 'chess') {
    title = 'Chess'; main.innerHTML = chessPage(); setupChess(main);
  } else if ((section === 'about' && !slug) || section === 'main') {
    main.innerHTML = about();
  } else {
    title = 'Page not found'; active = '';
    main.innerHTML = '<section class="page"><h1>Page not found</h1><p>That page is not here. You can return to the homepage or use the navigation above.</p><a class="back-link" href="#about">← About Me</a></section>';
  }
  const isExplanation = section === 'papers' && Object.prototype.hasOwnProperty.call(explanationLoaders, slug);
  document.body.classList.toggle('reading-explanation', isExplanation);
  document.body.classList.toggle('reading-article', !!post);
  document.body.classList.toggle('view-about', active === 'about');
  document.body.classList.toggle('view-empty-blogs', section === 'blogs' && !slug && !visiblePosts(site.blogs).length);
  document.dispatchEvent(new CustomEvent('site:reading-change'));
  if (!isExplanation) {
    clearReadingTools();
    delete main.dataset.explanation;
    delete main.dataset.explanationTitle;
  }
  navLinks.forEach(link => {
    if (link.hash === `#${active}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.title = `${title} — ${site.name}`;
  const description = post?.summary || (active === 'papers' ? 'Research papers and interactive explanations by Jonathan Su.' : 'Jonathan Su. Language model architecture, residuals and pretraining.');
  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
  if (active && active !== previousSection) {
    document.dispatchEvent(new CustomEvent('site:section-change', {detail:{section:active}}));
    previousSection=active;
  }
  if (!anchor) revealPage();
  const destination = anchor && [...main.querySelectorAll('.explanation-section,.paper-lab,.article-body h2[id]')].find(element => element.id === anchor);
  if (destination) {
    if (destination.matches('details')) destination.open = true;
    destination.tabIndex = -1;
    destination.focus({ preventScroll: true });
    destination.scrollIntoView({ block: 'start', behavior: 'auto' });
    if (post) main.dispatchEvent(new CustomEvent('site:article-jump', { detail: { id: destination.id } }));
  } else if (focus) {
    main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
}

document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault(); main.focus(); main.scrollIntoView({ block: 'start' });
});
window.addEventListener('hashchange', () => render({ focus: true }));
main.addEventListener('click', event => {
  const sectionLink = event.target.closest('.article-rail a, .article-contents a');
  if (sectionLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    if (location.hash === sectionLink.hash) render({ focus: true });
    else location.hash = sectionLink.hash;
    return;
  }
  const filter = event.target.closest('[data-notebook-filter]');
  if (!filter) return;
  notebookFilter = filter.dataset.notebookFilter;
  main.classList.remove('page-arrival');
  main.innerHTML = blogs();
  revealPage();
  main.querySelector(`[data-notebook-filter="${notebookFilter}"]`).focus({ preventScroll: true });
});
render();
