import { findTheme, applyPalette } from './themes.js';
import { Blackwall } from './blackwall.js?v=blackwall-rail-20261005';
import { setupContentControls } from './content-controls.js?v=platform-polish-20261005';

// Clear the retired discovery timestamp without affecting other site preferences.
try { localStorage.removeItem('jonathan-su:moonbound-memory:v1'); } catch {}

// Blackwall is the selected design, including links saved during the theme studies.
applyPalette(document.documentElement, findTheme('blackwall'));
const url = new URL(location.href);
if (url.searchParams.has('theme')) {
  url.searchParams.delete('theme');
  history.replaceState(null, '', url);
}
const canvas = document.querySelector('#ambient');
let wall, controls;
try {
  wall = new Blackwall(canvas, {
    onWorldChange: world => applyPalette(document.documentElement, findTheme(world)),
    onSceneChange: state => controls?.setScene(state),
  });
} catch (error) {
  console.error('Blackwall rendering unavailable:', error);
  canvas.dataset.renderer = 'static';
  canvas.width = canvas.height = 0;
}
controls = setupContentControls({
  returnToWall: () => wall?.returnToWall(),
  setRoguesEnabled: enabled => {
    canvas.dataset.rogues = enabled ? 'enabled' : 'disabled';
    wall?.setRoguesEnabled(enabled);
  },
  visibilityChanged: () => wall?.readingBounds(),
});
controls.setScene(wall?.encounter.state || 'idle');

controls.setAnimationAvailable(Boolean(wall?.gl));
