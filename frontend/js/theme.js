/* theme.js – loaded in <head> so the saved theme is applied before the page paints */

(function () {
  var saved = null;
  try { saved = localStorage.getItem('fms_theme'); } catch (e) {}
  if (saved !== 'light' && saved !== 'dark') {
    saved = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', saved);
})();

function getTheme() {
  return document.documentElement.getAttribute('data-theme');
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('fms_theme', theme); } catch (e) {}
  document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
}

function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}
