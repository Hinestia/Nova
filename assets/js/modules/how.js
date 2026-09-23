/**
 * «Как это работает»:
 *  • ПК — слева закреплён макет, справа по скроллу сменяются 3 шага;
 *    экран макета меняется morph-переходом (View Transitions),
 *    вертикальная линия заполняется градиентом по прогрессу;
 *  • планшет/смартфон — карусель шагов со свайпом и точками.
 */
(function (Nova) {
  'use strict';

  var step = 0, steps, screens, navDots, stepDots, scroller, wrap, fill;

  function render(i) {
    steps.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
    screens.forEach(function (s) { s.hidden = +s.dataset.mock !== i; });
    navDots.forEach(function (d, k) { d.classList.toggle('is-active', k === i); });
    stepDots.forEach(function (d, k) {
      if (k === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
    });
  }

  function go(i) {
    if (i === step || isNaN(i)) return;
    step = i;
    Nova.vt(function () { render(i); });
  }

  function progress() {
    if (!fill || Nova.bp() !== 'd') return;
    var r = wrap.getBoundingClientRect();
    fill.style.transform = 'scaleY(' + Nova.clamp01((window.innerHeight * 0.5 - r.top) / r.height) + ')';
  }

  Nova.define('how', {
    init: function () {
      wrap = Nova.$('[data-how]');
      if (!wrap) return;
      scroller = Nova.$('[data-steps]', wrap);
      steps = Nova.$$('[data-step]', wrap);
      fill = Nova.$('[data-how-fill]', wrap);
      screens = Nova.$$('[data-mock]');
      navDots = Nova.$$('[data-mock-nav] i');
      stepDots = Nova.$$('[data-step-dots] button');

      // ПК: активный шаг — тот, что пересекает середину экрана
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting && Nova.bp() === 'd') go(+en.target.dataset.step);
        });
      }, { rootMargin: '-45% 0px -45% 0px' });
      steps.forEach(function (s) { io.observe(s); });

      window.addEventListener('scroll', Nova.rafThrottle(progress), { passive: true });
      window.addEventListener('resize', progress);
      progress();

      // Мобайл: свайп карусели
      var t = 0;
      scroller.addEventListener('scroll', function () {
        if (Nova.bp() === 'd') return;
        clearTimeout(t);
        t = setTimeout(function () {
          var first = steps[0];
          var i = Math.round(scroller.scrollLeft / (first.offsetWidth + 12));
          go(Math.max(0, Math.min(steps.length - 1, i)));
        }, 90);
      }, { passive: true });

      stepDots.forEach(function (d, i) {
        d.addEventListener('click', function () {
          var pad = parseFloat(getComputedStyle(scroller).paddingLeft) || 0;
          var left = steps[i].getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft - pad;
          scroller.scrollTo({ left: left, behavior: Nova.reduced() ? 'auto' : 'smooth' });
          go(i);
        });
      });

      render(0);
    }
  });
})(window.Nova);
