(() => {
  'use strict';

  const ROUTES = new Set(['home', 'play', 'learn', 'library']);
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const continueButton = document.getElementById('continueButton');
  const themeKey = 'tbc-pr5-theme';

  function preferredTheme() {
    const saved = localStorage.getItem(themeKey);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function setTheme(theme) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    if (themeToggle) {
      themeToggle.setAttribute('aria-pressed', String(theme === 'light'));
      themeToggle.title = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#0b0d10' : '#f6f7f9';
  }

  function toggleTheme() {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(themeKey, next);
    setTheme(next);
  }

  function getRoute() {
    const raw = location.hash.replace(/^#/, '').trim().toLowerCase();
    return ROUTES.has(raw) ? raw : 'home';
  }

  function renderRoute() {
    const route = getRoute();

    document.querySelectorAll('[data-page]').forEach((section) => {
      const active = section.dataset.page === route;
      section.hidden = !active;
      section.classList.toggle('active', active);
    });

    document.querySelectorAll('[data-route]').forEach((link) => {
      if (link.dataset.route === route) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    const main = document.getElementById('main');
    if (main && document.activeElement !== main) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  function hasExistingProgress() {
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = String(localStorage.key(i) || '').toLowerCase();
        if (key === themeKey) continue;
        if (
          key.includes('tbc') ||
          key.includes('biblechallenge') ||
          key.includes('progress') ||
          key.includes('mastery') ||
          key.includes('session')
        ) return true;
      }
    } catch (_) {
      return false;
    }
    return false;
  }

  function launchLegacy() {
    // Same-origin navigation intentionally preserves all existing localStorage state.
    window.location.assign('../index.html');
  }

  setTheme(preferredTheme());
  renderRoute();

  if (continueButton && hasExistingProgress()) {
    continueButton.hidden = false;
  }

  themeToggle?.addEventListener('click', toggleTheme);
  window.addEventListener('hashchange', renderRoute);

  document.addEventListener('click', (event) => {
    const launcher = event.target.closest('[data-legacy-launch]');
    if (!launcher) return;
    event.preventDefault();
    launchLegacy();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const active = document.activeElement;
    if (active && active instanceof HTMLElement) active.blur();
  });
})();
