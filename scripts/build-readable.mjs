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
const dist = new URL('../', import.meta.url);
const template = await readFile(new URL('readable-shell.html',import.meta.url),'utf8');
const routes = {'about':'index.html','about/chess':'chess.html','blogs':'blogs.html','papers':'papers.html','blogs/purrence':'purrence.html','papers/exoformer':'exoformer.html','papers/lr-attnres':'lr-attnres.html'};
function links(html) {
  return html.replace(/href="#([^\"]+)"/g, (all, hash) => {
    const segments=hash.split('/'), base=segments.slice(0,2).join('/');
    const target=routes[base] || routes[hash];
    if (!target) return all;
    const anchor=routes[base] && segments[2];
    return `href="${target}${anchor?'#'+anchor:''}" data-route="${hash}"`;
  });
}
const pages=[
  ['about','About me',about(),'view-about'],
  ['about/chess','Chess',chessPage().replace('<div class="chess-board"','<noscript><p>The opening quiz needs JavaScript. You can still read the rest of the site.</p></noscript><div class="chess-board"'),'view-about'],
  ['blogs','Blogs',notebookPage(site.blogs),''],
  ['papers','Papers',papers(),''],
  ...site.blogs.filter(p=>!p.draft).map(p=>[`blogs/${p.slug}`,p.title,notebookPost(p),'reading-article']),
  ['papers/exoformer','ExoFormer explained',explanationPage(exoformer),'reading-explanation'],
  ['papers/lr-attnres','LR-AttnRes explained',explanationPage(attnres),'reading-explanation'],
];
for (const [route,title,content,classes] of pages) {
  const description=site.blogs.find(p=>route===`blogs/${p.slug}`)?.summary || (route.startsWith('papers')?'Research papers and interactive explanations by Jonathan Su.':'Jonathan Su. Language model architecture, residuals and pretraining.');
  const readable=content.replace(/<table[\s\S]*?<\/table>/g,table=>`<div class="explanation-table" tabindex="0" role="region" aria-label="Data table">${table}</div>`);
  let html=template.replace(/<title>[\s\S]*?<\/title>/,`<title>${escape(title)} — Jonathan Su</title>`)
    .replace(/<body[^>]*>/,`<body class="${classes}" data-route="${route}">`)
    .replace('{{CONTENT}}',links(readable))
    .replace(/<a ([^>]*?)aria-current="page"([^>]*)>/g,'<a $1$2>');
  const active=route.split('/')[0];
  html=html.replace(new RegExp(`(<a [^>]*data-route="${active}"[^>]*)(>)`,'g'),'$1 aria-current="page"$2');
  html=html.replace(/<meta property="og:title"[^>]*>/,`<meta property="og:title" content="${escape(title)} — Jonathan Su">`)
    .replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${escape(description)}">`)
    .replace(/<meta property="og:description"[^>]*>/,`<meta property="og:description" content="${escape(description)}">`)
    .replace(/<meta property="og:type"[^>]*>/,`<meta property="og:type" content="${route.includes('/')&&route!=='about/chess'?'article':'website'}">`);
  await writeFile(new URL(routes[route],dist),html);
}
console.log(`Built ${pages.length} readable HTML entry points.`);
