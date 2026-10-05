import renderMathInElement from './vendor/katex/contrib/auto-render.mjs';
import { highlightPython } from './syntax-highlight.js';
import { setupReadingTools } from './reading-tools.js?v=features-20';
export { explanationPage } from './explanation-template.js';

export function typesetExplanation(root, article) {
  highlightPython(root);
  renderMathInElement(root, {
    delimiters: [
      { left: '\\[', right: '\\]', display: true },
      { left: '\\(', right: '\\)', display: false },
    ],
    throwOnError: false,
    trust: false,
    strict: 'warn',
  });
  root.querySelectorAll('table').forEach(table => {
    const wrapper = document.createElement('div');
    wrapper.className = 'explanation-table';
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', table.caption?.textContent || 'Paper comparison table');
    table.before(wrapper);
    wrapper.append(table);
  });
  root.querySelectorAll('pre').forEach(code => {
    code.tabIndex = 0;
    code.setAttribute('aria-label', 'PyTorch pseudocode');
  });
  setupReadingTools(root, article);
  const lab = root.querySelector('.paper-lab');
  let loading = false, ready = false;
  lab.addEventListener('toggle', async () => {
    if (!lab.open || loading || ready) return;
    loading = true;
    const mount = lab.querySelector('.lab-mount');
    mount.innerHTML = '<p role="status">loading the playground…</p>';
    try {
      const { mountPlayground } = await import('./paper-playgrounds.js?v=platform-polish-20261005');
      if (!lab.isConnected) return;
      mountPlayground(mount, article.slug); ready = true;
    } catch (error) {
      mount.innerHTML = '<p>Unable to load this demo. Close and reopen it to retry.</p>';
      console.error('Playground unavailable', error);
    } finally { loading = false; }
  });
}
