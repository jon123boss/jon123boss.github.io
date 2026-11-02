import { setupArticleNavigation } from './article-navigation.js?v=reading-controls-20261031';
import { about, papers } from './page-views.js?v=platform-polish-20261005';
import { site } from './content.js?platform-polish-20261005';
import { chessPage, setupChess } from './chess-opening.js?v=refined-24';
import { notebookPage, notebookPost, visiblePosts } from './notebook.js?v=reading-controls-20261031';
import { setupResearchPlots } from './research-plots.js?v=reading-controls-20261031';
import { clearReadingTools } from './reading-tools.js?v=features-20';
import { setupPaperPreviews } from './paper-previews.js?v=blender-27';
import { pageSEO, schemaJSON, routes, routeURL } from './site-seo.js?v=seo-20261102';

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
function currentRoute() {
  const hash = location.hash.slice(1);
  // Old shared fragment URLs still work; new navigation uses the HTML pages.
  if (hash && routeURL(hash)) return hash;
  const file = location.pathname.split('/').pop() || 'index.html';
  const route = Object.keys(routes).find(key => routes[key] === file) || document.body.dataset.route || 'about';
  return hash && hash !== 'main' && route.includes('/') ? `${route}/${hash}` : route;
}
const navLinks = [...document.querySelectorAll('.site-header nav a')];
function enhanceLinks(root) {
  root.querySelectorAll('a').forEach(link => {
    const route = link.dataset.route || (link.getAttribute('href')?.startsWith('#') ? link.hash.slice(1) : '');
    const target = route && routeURL(route);
    if (target) { link.dataset.route = route; link.setAttribute('href', target); }
  });
}
enhanceLinks(document);
if (location.hash && routeURL(location.hash.slice(1))) {
  history.replaceState(null, '', routeURL(currentRoute()));
}
const name = document.querySelector('.wordmark');
name.querySelector('.wordmark-name').textContent = site.name;
name.setAttribute('aria-label', `${site.name}, home`);

function blogs() {
  return notebookPage(site.blogs, notebookFilter);
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
  const routeParts = currentRoute().split('/');
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
  const route = currentRoute();
  const [section, slug, anchor] = route.split('/');
  const post = section === 'blogs' && slug ? visiblePosts(site.blogs).find(entry => encodeURIComponent(entry.slug) === slug) : undefined;
  let active = 'about';
  if (section === 'blogs' && (!slug || post)) {
    active = 'blogs';
    main.innerHTML = post ? notebookPost(post) : blogs();
    if (post) { main.dataset.post = post.slug; disposeResearchPlots = setupResearchPlots(main); disposeArticleNavigation = setupArticleNavigation(main); }
  } else if (section === 'papers' && !slug) {
    active = 'papers'; main.innerHTML = papers();
  } else if (section === 'papers' && Object.prototype.hasOwnProperty.call(explanationLoaders, slug)) {
    active = 'papers';
    if (main.dataset.explanation !== slug) {
      delete main.dataset.explanation;
      main.innerHTML = '<section class="page"><p class="bio" role="status">Loading explanation…</p></section>';
      try {
        const [{ default: article }, view] = await Promise.all([
          explanationLoaders[slug](), import('./explanation-view.js?v=platform-polish-20261005'),
        ]);
        if (revision !== renderRevision) return;
        main.innerHTML = view.explanationPage(article);
        view.typesetExplanation(main, article);
        main.dataset.explanation = slug;
      } catch (error) {
        if (revision !== renderRevision) return;
        console.error('Unable to load explanation', error);
        main.innerHTML = '<section class="page"><p>The explanation could not be loaded. Refresh to try again.</p><a href="#papers">← Papers</a></section>';
      }
    }
    disposePaperPreviews = setupPaperPreviews(main);
  } else if (section === 'about' && slug === 'chess') {
    main.innerHTML = chessPage(); setupChess(main);
  } else if ((section === 'about' && !slug) || section === 'main') {
    main.innerHTML = about();
  } else {
    active = '';
    main.innerHTML = '<section class="page"><h1>Page not found</h1><p>That page is not here. You can return to the homepage or use the navigation above.</p><a class="back-link" href="#about">← About Me</a></section>';
  }
  const isExplanation = section === 'papers' && Object.prototype.hasOwnProperty.call(explanationLoaders, slug);
  document.body.classList.toggle('reading-explanation', isExplanation);
  document.body.classList.toggle('reading-article', !!post);
  document.body.classList.toggle('view-blog', active === 'blogs');
  document.body.classList.toggle('view-about', active === 'about');
  document.body.classList.toggle('view-empty-blogs', section === 'blogs' && !slug && !visiblePosts(site.blogs).length);
  document.dispatchEvent(new CustomEvent('site:reading-change'));
  if (!isExplanation) {
    clearReadingTools();
    delete main.dataset.explanation;
  }
  navLinks.forEach(link => {
    if (link.dataset.route === active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const seo = pageSEO(route);
  document.title = seo.title;
  const description = seo.description;
  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
  document.querySelector('meta[property="og:type"]')?.setAttribute('content', seo.type);
  document.querySelector('meta[property="og:url"]')?.setAttribute('content', seo.url || location.href);
  if (seo.url) document.querySelector('link[rel="canonical"]')?.setAttribute('href', seo.url);
  let schema = document.getElementById('page-schema');
  if (seo.structuredData) {
    if (!schema) {
      schema = document.createElement('script'); schema.id = 'page-schema'; schema.type = 'application/ld+json';
      document.head.append(schema);
    }
    schema.textContent = schemaJSON(seo.structuredData);
  } else schema?.remove();
  enhanceLinks(main);
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
window.addEventListener('popstate', () => render({ focus: true }));
document.addEventListener('click', event => {
  const link = event.target.closest('a[data-route]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
  event.preventDefault();
  if (location.href !== link.href) history.pushState(null, '', link.href);
  render({ focus: true });
});
main.addEventListener('click', event => {
  const filter = event.target.closest('[data-notebook-filter]');
  if (!filter) return;
  notebookFilter = filter.dataset.notebookFilter;
  main.classList.remove('page-arrival');
  main.innerHTML = blogs();
  enhanceLinks(main);
  revealPage();
  main.querySelector(`[data-notebook-filter="${notebookFilter}"]`).focus({ preventScroll: true });
});
render();
