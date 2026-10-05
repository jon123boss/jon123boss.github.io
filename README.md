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

## Hosting

GitHub Pages publishes the root of the default branch. The `.nojekyll` file preserves the static site as written. Pushing a website update to the publishing branch triggers deployment.

To connect a custom domain, first save it in the repository's **Settings → Pages → Custom domain**, then point the domain's DNS to GitHub Pages. Enable **Enforce HTTPS** once the certificate is available.

## Third-party files

The JetBrains Mono license is in `assets/FONT-LICENSE.txt`. KaTeX and Prism retain their licenses in `vendor/`.
