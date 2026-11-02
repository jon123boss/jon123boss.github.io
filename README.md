# Jonathan Su

Personal website with writing, research papers, interactive diagrams, and the Blackwall background.

## Preview locally

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173.

## Edit

- Biography and paper links: `content.js`.
- Purrence article: `blog/purrence/post.js`.
- Interactive measurements: `blog/purrence/charts/`.
- Shared HTML shell: `scripts/readable-shell.html`.
- Appearance: the CSS files in the repository root.

After changing the content modules or shared shell, regenerate the standalone pages with Node.js:

```sh
npm run build
npm test
```

The site has no package dependencies. Its generated HTML remains readable without JavaScript.

## Search metadata

`site-seo.js` defines titles, descriptions, canonical URLs, and structured data. The build regenerates `sitemap.xml` from the published pages; drafts are excluded. `robots.txt` advertises the sitemap. The favicon uses the existing J on an opaque dark background so it remains visible in search results.

After publishing, submit `https://jonathansu.me/sitemap.xml` in Google Search Console and inspect the homepage and new article URLs to request indexing. Search Console is the source for indexing status; publishing metadata does not guarantee indexing or rankings.

## Hosting

GitHub Pages publishes the root of the default branch. The `.nojekyll` file preserves the static site as written. Pushing a website update to the publishing branch triggers deployment.

To connect a custom domain, first save it in the repository's **Settings → Pages → Custom domain**, then point the domain's DNS to GitHub Pages. Enable **Enforce HTTPS** once the certificate is available.

## Third-party files

The JetBrains Mono license is in `assets/FONT-LICENSE.txt`. KaTeX and Prism retain their licenses in `vendor/`.
