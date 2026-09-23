/**
 * Цифры: при появлении числа «докручиваются» от 0 (count-up, 1,2 с, ease-out).
 */
(function (Nova) {
  'use strict';

  Nova.define('stats', {
    init: function () {
      var els = Nova.$$('[data-count]');
      if (!els.length || Nova.reduced() || !('IntersectionObserver' in window)) return;

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target;
          io.unobserve(el);
          var to = +el.dataset.count, dec = +el.dataset.dec || 0, t0 = performance.now();
          (function tick(now) {
            var p = Nova.clamp01((now - t0) / 1200);
            el.textContent = Nova.fmt(to * (1 - Math.pow(1 - p, 4)), dec);
            if (p < 1) requestAnimationFrame(tick);
          })(t0);
        });
      }, { threshold: 0.6 });

      els.forEach(function (el) {
        // Резервируем ширину итогового числа, чтобы не прыгала вёрстка
        el.style.display = 'inline-block';
        el.style.minWidth = el.getBoundingClientRect().width + 'px';
        el.textContent = Nova.fmt(0, +el.dataset.dec || 0);
        io.observe(el);
      });
    }
  });
})(window.Nova);
