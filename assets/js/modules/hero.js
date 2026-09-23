/**
 * Hero: слово «быстрее» перебирает варианты каждые 2,5 с с эффектом размытия.
 */
(function (Nova) {
  'use strict';

  Nova.define('hero', {
    init: function () {
      var box = Nova.$('[data-words]');
      if (!box || Nova.reduced()) return;

      var words = Nova.$$('.hero__word', box);
      var idx = 0;

      setInterval(function () {
        if (document.hidden) return;
        var prev = idx;
        idx = (idx + 1) % words.length;
        words.forEach(function (w, i) {
          w.classList.toggle('is-active', i === idx);
          w.classList.toggle('is-prev', i === prev);
          if (i === idx) w.removeAttribute('aria-hidden'); else w.setAttribute('aria-hidden', 'true');
        });
      }, 2500);
    }
  });
})(window.Nova);
