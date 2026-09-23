/**
 * Тема: prefers-color-scheme + ручной переключатель (сохраняется в localStorage).
 */
(function (Nova) {
  'use strict';

  var KEY = 'nova-theme';
  var root = document.documentElement;

  function get() { return root.dataset.theme === 'light' ? 'light' : 'dark'; }

  function apply(theme) {
    root.dataset.theme = theme;
    var meta = Nova.$('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#F3F2F7' : '#07070C');
    Nova.$$('[data-theme-toggle]').forEach(function (btn) {
      btn.textContent = theme === 'dark' ? '☾' : '☀';
      btn.setAttribute('aria-label', theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
    });
    Nova.emit('theme', theme);
  }

  function toggle() {
    var next = get() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, next); } catch (e) {}
    apply(next);
  }

  Nova.define('theme', {
    get: get,
    toggle: toggle,
    init: function () {
      apply(get());
      Nova.$$('[data-theme-toggle]').forEach(function (btn) { btn.addEventListener('click', toggle); });

      // Следуем за системой, пока пользователь не выбрал тему вручную
      var mq = window.matchMedia('(prefers-color-scheme: light)');
      var onChange = function (e) {
        try { if (localStorage.getItem(KEY)) return; } catch (x) {}
        apply(e.matches ? 'light' : 'dark');
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
    }
  });
})(window.Nova);
