// Keep background controls available when the site content is hidden.
export function setupContentControls({ returnToWall, setRoguesEnabled = () => {}, visibilityChanged = () => {} }) {
  const button = document.querySelector('.content-toggle');
  const rogueButton = document.querySelector('.rogue-toggle');
  const content = document.querySelector('#site-content');
  const skipLink = document.querySelector('.skip-link');
  const controlsBar = document.querySelector('.background-controls');
  // Reserve space only while the floating controls are visible.
  const reserveSpace = () => {
    document.documentElement.style.setProperty('--controls-height', `${controlsBar.getBoundingClientRect().height}px`);
  };
  if ('ResizeObserver' in window) new ResizeObserver(reserveSpace).observe(controlsBar);
  else window.addEventListener('resize', reserveSpace);
  reserveSpace();
  let savedScrollY = 0;
  let moonbound = false;
  let returning = false;
  let roguesEnabled = true;
  let appliedRoguesEnabled;
  let animationAvailable = true;
  let readingBlog = document.body.classList.contains('reading-article');
  const isAbout = () => ['', 'about', 'main'].includes(location.hash.slice(1).split('/')[0]);

  function updateButton() {
    controlsBar.hidden = readingBlog;
    button.textContent = moonbound ? 'Return to Blackwall' : content.hidden ? 'Show Content' : 'Hide Content';
    button.setAttribute('aria-expanded', String(!content.hidden));
    button.disabled = returning;
    button.hidden = false;
    // Moonbound keeps its own return control and uninterrupted scene transition.
    rogueButton.hidden = moonbound || !animationAvailable;
  }

  function updateRogues() {
    const enabled = roguesEnabled && !readingBlog;
    if (enabled !== appliedRoguesEnabled) {
      appliedRoguesEnabled = enabled;
      setRoguesEnabled(enabled);
    }
    rogueButton.textContent = roguesEnabled ? 'Stop Rogue AIs' : 'Allow Rogue AIs';
  }

  rogueButton.addEventListener('click', () => {
    roguesEnabled = !roguesEnabled;
    updateRogues();
  });

  function setHidden(hidden) {
    if (hidden && !content.hidden) savedScrollY = window.scrollY;
    const moveFocus = hidden && content.contains(document.activeElement);
    content.hidden = hidden;
    skipLink.hidden = hidden;
    updateButton();
    if (!hidden) window.scrollTo({ top: savedScrollY, behavior: 'auto' });
    if (moveFocus) button.focus({ preventScroll: true });
    visibilityChanged();
  }

  button.addEventListener('click', () => {
    if (moonbound) returnToWall();
    else setHidden(!content.hidden);
  });

  window.addEventListener('hashchange', () => {
    if (isAbout()) setHidden(false);
    else updateButton();
  });

  function updateReadingMode() {
    readingBlog = document.body.classList.contains('reading-article');
    if (readingBlog && content.hidden && !moonbound) setHidden(false);
    else updateButton();
    updateRogues();
  }
  document.addEventListener('site:reading-change', updateReadingMode);
  updateReadingMode();

  return {
    setAnimationAvailable(value) { animationAvailable = value; updateButton(); },
    setScene(state) {
      const immersive = ['crossing', 'moonbound', 'returning'].includes(state);
      returning = state === 'returning';
      if (immersive !== moonbound) {
        moonbound = immersive;
        // Returning always restores the site, even if it was manually hidden before unlocking.
        setHidden(immersive);
      } else updateButton();
    },
  };
}
