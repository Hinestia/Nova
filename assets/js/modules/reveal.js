/**
 * Появление блоков при скролле: каскадом, со снятием размытия (blur 12px → 0).
 * Задержка считается по порядку среди соседей с [data-reveal] (шаг 80 мс).
 * Блоки, уже видимые при загрузке, не прячутся — никакого CLS и мигания.
 */
(function (Nova) {
  'use strict';

  Nova.define('reveal', {
    init: function () {
      if (Nova.reduced() || !('IntersectionObserver' in window)) return;

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target;
          io.unobserve(el);
          el.classList.add('is-visible');
          // После анимации убираем служебные классы, чтобы не мешать hover/focus
          setTimeout(function () { el.classList.remove('reveal-init', 'is-visible'); el.style.removeProperty('--rd'); }, 1400);
        });
      }, { rootMargin: '0px 0px -8% 0px' });

      Nova.$$('[data-reveal]').forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
        var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.hasAttribute('data-reveal'); });
        el.style.setProperty('--rd', (sibs.indexOf(el) % 6) * 80 + 'ms');
        el.classList.add('reveal-init');
        io.observe(el);
      });
    }
  });
})(window.Nova);
