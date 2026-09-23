/**
 * Финальный CTA: огромная надпись «Начните сегодня» — при скролле буквы
 * собираются из разлетевшихся частей.
 */
(function (Nova) {
  'use strict';

  Nova.define('cta', {
    init: function () {
      var section = Nova.$('[data-cta]');
      if (!section) return;
      var letters = [];

      Nova.$$('[data-cta-word]', section).forEach(function (word, w) {
        var text = word.dataset.ctaWord;
        word.textContent = '';
        text.split('').forEach(function (ch, i) {
          var s = document.createElement('span');
          s.className = 'cta__letter';
          s.textContent = ch;
          var k = i + w * 7;
          s.style.setProperty('--bp', (i / (text.length - 1) * 100) + '%');
          letters.push({
            el: s,
            x: Math.round((Nova.rnd(k, 1) - 0.5) * 700),
            y: Math.round((Nova.rnd(k, 2) - 0.5) * 420),
            r: Math.round((Nova.rnd(k, 3) - 0.5) * 120)
          });
          word.appendChild(s);
        });
      });

      if (Nova.reduced()) return;

      function update() {
        var r = section.getBoundingClientRect();
        if (r.top > window.innerHeight * 1.2 || r.bottom < -200) return;
        var p = Nova.clamp01((window.innerHeight - r.top) / (window.innerHeight * 0.75));
        var e = 1 - Math.pow(1 - p, 3);
        var k = (1 - e) * (window.innerWidth < 768 ? 0.45 : 1);
        letters.forEach(function (l) {
          l.el.style.transform = 'translate3d(' + l.x * k + 'px,' + l.y * k + 'px,0) rotate(' + l.r * k + 'deg)';
          l.el.style.opacity = 0.15 + 0.85 * e;
        });
      }
      update();
      window.addEventListener('scroll', Nova.rafThrottle(update), { passive: true });
      window.addEventListener('resize', update);
    }
  });
})(window.Nova);
