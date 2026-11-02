import { site } from './content.js?v=platform-polish-20261005';

export const siteURL = 'https://jonathansu.me/';
export const routes = {
  about: 'index.html',
  'about/chess': 'chess.html',
  blogs: 'blogs.html',
  papers: 'papers.html',
  ...Object.fromEntries(site.blogs.filter(post => !post.draft)
    .map(post => [`blogs/${post.slug}`, `${post.slug}.html`])),
  'papers/exoformer': 'exoformer.html',
  'papers/lr-attnres': 'lr-attnres.html',
};

export function routeURL(route) {
  const parts = route.split('/');
  const key = parts.length > 1 ? parts.slice(0, 2).join('/') : parts[0];
  if (!Object.hasOwn(routes, key)) return null;
  const anchor = parts.slice(key.split('/').length).join('/');
  return `${routes[key]}${anchor ? `#${anchor}` : ''}`;
}

export function readableLinks(html) {
  return html.replace(/href="#([^\"]+)"/g, (all, route) => {
    const target = routeURL(route);
    return target ? `href="${target}" data-route="${route}"` : all;
  });
}

export function pageSEO(route) {
  if (route === 'main') route = 'about';
  const key = route.split('/').slice(0, 2).join('/');
  const post = site.blogs.find(post => !post.draft && key === `blogs/${post.slug}`);
  const pages = {
    about: ['Jonathan Su — Language Model Research', 'Jonathan Su, a student in Hong Kong researching language model architecture, residual connections, and pretraining. Research papers, experiments, and blog posts.'],
    'about/chess': ['Chess — Jonathan Su', 'A chess opening puzzle on Jonathan Su’s personal website.'],
    blogs: ['Language Model Research Blog — Jonathan Su', 'Experiments and essays by Jonathan Su on language model training, small language models, recurrent architectures, and attention residuals.'],
    papers: ['Research Papers — Jonathan Su', 'Research papers by Jonathan Su, including ExoFormer and Low-Rank Attention Residuals, with code and interactive explanations.'],
    'papers/exoformer': ['ExoFormer Explained: Attention Projection Mixing — Jonathan Su', 'An interactive explanation of ExoFormer: Attention Projection Mixing with Exogenous Anchors, with worked examples and a projection-mixing playground.'],
    'papers/lr-attnres': ['Low-Rank Attention Residuals Explained — Jonathan Su', 'An interactive explanation of Low-Rank Attention Residuals: narrow routing keys, full-width values, worked examples, and an attention residual playground.'],
  };
  const [title, description] = post
    ? [`${post.title} — ${site.name}`, post.summary]
    : pages[key] || ['Page not found — Jonathan Su', 'This page could not be found.'];
  const url = Object.hasOwn(routes, key) ? new URL(key === 'about' ? '' : routes[key], siteURL).href : null;
  const author = { '@type': 'Person', '@id': `${siteURL}#person`, name: site.name, url: siteURL };
  let structuredData = null;
  if (key === 'about') {
    structuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', '@id': `${siteURL}#website`, name: site.name, alternateName: 'jonathansu.me', url: siteURL },
        { ...author, sameAs: ['https://github.com/jon123boss'] },
        { '@type': 'ProfilePage', '@id': `${siteURL}#profile`, url: siteURL, name: title, mainEntity: { '@id': author['@id'] } },
      ],
    };
  } else if (post) {
    structuredData = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      url,
      mainEntityOfPage: url,
      headline: post.title,
      description,
      author,
      datePublished: post.date,
      ...(post.updated ? { dateModified: post.updated } : {}),
      inLanguage: 'en',
    };
  }
  return { title, description, url, type: post ? 'article' : 'website', structuredData };
}

// Safe inside a script element even if authored text contains a closing tag.
export const schemaJSON = value => JSON.stringify(value).replace(/</g, '\\u003c');
