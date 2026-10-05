// Load the Python grammar only when an explanation is opened.
window.Prism = { manual: true };
await import('./vendor/prism/prism-core.min.js');
await import('./vendor/prism/prism-python.min.js');

export function highlightPython(root) {
  root.querySelectorAll('pre code.language-python').forEach(code => {
    window.Prism.highlightElement(code);
  });
}
