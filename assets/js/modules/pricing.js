/**
 * Тарифы: переключатель «Месяц / Год» с перелистыванием цифр, как на табло.
 * На узких экранах тарифы — карусель, по умолчанию по центру средняя карточка.
 */
(function (Nova) {
  'use strict';

  var DIGITS = '0123456789';

  /** Превращает «1 490» в колонки-барабаны 0–9 */
  function buildReels(el) {
    var str = el.dataset.month;
    el.setAttribute('aria-hidden', 'true');
    el.textContent = '';
    str.split('').forEach(function (ch, i) {
      var cell = document.createElement('span');
      if (/\d/.test(ch)) {
        cell.className = 'digit';
        var reel = document.createElement('span');
        reel.className = 'digit__reel';
        reel.style.setProperty('--delay', i * 70 + 'ms');
        DIGITS.split('').forEach(function (d) {
          var s = document.createElement('span');
          s.textContent = d;
          reel.appendChild(s);
        });
        cell.appendChild(reel);
      } else {
        cell.className = 'digit digit--gap';
      }
      el.appendChild(cell);
    });
    // Доступное значение цены для скринридеров
    var sr = document.createElement('span');
    sr.className = 'visually-hidden';
    sr.setAttribute('data-price-sr', '');
    el.parentNode.insertBefore(sr, el);
  }

  function setPrice(el, period) {
    var str = el.dataset[period];
    var digits = str.replace(/\D/g, '').split('');
    var reels = Nova.$$('.digit__reel', el);
    // Длина цены в обоих периодах одинакова (790/630, 1 490/1 190, 2 990/2 390)
    reels.forEach(function (r, i) { r.style.transform = 'translateY(-' + (+digits[i] || 0) + 'em)'; });
    var sr = el.parentNode.querySelector('[data-price-sr]');
    if (sr) sr.textContent = str + ' ₽';
  }

  Nova.define('pricing', {
    init: function () {
      var seg = Nova.$('[data-period]');
      var prices = Nova.$$('[data-price]');
      var pers = Nova.$$('[data-price-per]');
      var plans = Nova.$('[data-plans]');
      if (!seg) return;

      prices.forEach(function (p) { buildReels(p); setPrice(p, 'month'); });

      function set(period) {
        seg.dataset.value = period;
        Nova.$$('button', seg).forEach(function (b) {
          b.setAttribute('aria-checked', String(b.dataset.value === period));
        });
        prices.forEach(function (p) { setPrice(p, period); });
        pers.forEach(function (p) {
          p.textContent = period === 'month' ? 'за пользователя в месяц' : 'за пользователя в месяц при оплате за год';
        });
      }

      Nova.$$('button', seg).forEach(function (b) {
        b.addEventListener('click', function () { set(b.dataset.value); });
        // Стрелки в radiogroup
        b.addEventListener('keydown', function (e) {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          var next = b.dataset.value === 'month' ? 'year' : 'month';
          set(next);
          Nova.$('[data-value="' + next + '"]', seg).focus();
        });
      });

      // Карусель: центрируем «Популярный»
      function center() {
        if (!plans || window.innerWidth >= 900) return;
        var c = plans.children[1];
        if (c) plans.scrollLeft += c.getBoundingClientRect().left - plans.getBoundingClientRect().left - (plans.clientWidth - c.offsetWidth) / 2;
      }
      center();
      var wasNarrow = window.innerWidth < 900;
      window.addEventListener('resize', function () {
        var narrow = window.innerWidth < 900;
        if (narrow && !wasNarrow) center();
        wasNarrow = narrow;
      });
    }
  });
})(window.Nova);
