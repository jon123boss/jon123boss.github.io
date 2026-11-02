// Build the progressive HTML entry points from the content modules.
import { readFile, writeFile } from 'node:fs/promises';
import { site } from '../content.js';
import { about, papers } from '../page-views.js';
import { notebookPage, notebookPost } from '../notebook.js';
import { chessPage } from '../chess-opening.js';
import { explanationPage } from '../explanation-template.js';
import exoformer from '../explanations/exoformer.js';
import attnres from '../explanations/lr-attnres.js';
import { escapeHTML as escape } from '../site-utils.js';
import { routes, pageSEO, schemaJSON, readableLinks } from '../site-seo.js';
const dist = new URL('../', import.meta.url);
const template = await readFile(new URL('readable-shell.html',import.meta.url),'utf8');
const pages=[
  ['about',about(),'view-about'],
  ['about/chess',chessPage().replace('<div class="chess-board"','<noscript><p>The opening quiz needs JavaScript. You can still read the rest of the site.</p></noscript><div class="chess-board"'),'view-about'],
  ['blogs',notebookPage(site.blogs),'view-blog'],
  ['papers',papers(),''],
  ...site.blogs.filter(p=>!p.draft).map(p=>[`blogs/${p.slug}`,notebookPost(p),'view-blog reading-article']),
  ['papers/exoformer',explanationPage(exoformer),'reading-explanation'],
  ['papers/lr-attnres',explanationPage(attnres),'reading-explanation'],
];
for (const [route,content,classes] of pages) {
  const seo = pageSEO(route);
  const description = seo.description;
  const readable=content.replace(/<table[\s\S]*?<\/table>/g,table=>`<div class="explanation-table" tabindex="0" role="region" aria-label="Data table">${table}</div>`);
  let html=template.replace(/<title>[\s\S]*?<\/title>/,`<title>${escape(seo.title)}</title>`)
    .replace(/<body[^>]*>/,`<body class="${classes}" data-route="${route}">`)
    .replace('{{CONTENT}}',readableLinks(readable))
    .replace(/<a ([^>]*?)aria-current="page"([^>]*)>/g,'<a $1$2>');
  const active=route.split('/')[0];
  html=html.replace(new RegExp(`(<a [^>]*data-route="${active}"[^>]*)(>)`,'g'),'$1 aria-current="page"$2');
  html=html.replace(/<meta property="og:title"[^>]*>/,`<meta property="og:title" content="${escape(seo.title)}">`)
    .replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${escape(description)}">`)
    .replace(/<meta property="og:description"[^>]*>/,`<meta property="og:description" content="${escape(description)}">`)
    .replace(/<meta property="og:type"[^>]*>/,`<meta property="og:type" content="${seo.type}">`)
    .replace(/<meta property="og:url"[^>]*>/,`<meta property="og:url" content="${escape(seo.url)}">`)
    .replace(/<link rel="canonical"[^>]*>/,`<link rel="canonical" href="${escape(seo.url)}">`)
    .replace('{{STRUCTURED_DATA}}', seo.structuredData ? `<script type="application/ld+json" id="page-schema">${schemaJSON(seo.structuredData)}</script>` : '');
  await writeFile(new URL(routes[route],dist),html);
}
const urls = pages.map(([route]) => pageSEO(route).url);
await writeFile(new URL('sitemap.xml', dist), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${escape(url)}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log(`Built ${pages.length} readable HTML entry points.`);
