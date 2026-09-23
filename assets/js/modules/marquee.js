/**
 * Бесконечные ленты: логотипы и две встречные ленты отзывов.
 * Содержимое дублируется, анимация сдвигает трек на -50% — шов не виден.
 * Копии скрыты от скринридеров (aria-hidden) и из порядка табуляции.
 */
(function (Nova) {
  'use strict';

  var AVA = ['#9B84FF', '#3DD6FF', '#FF8CC4', '#FFC857', '#4BE39A'];

  function cloneInto(track, nodes) {
    nodes.forEach(function (n) {
      var c = n.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      Nova.$$('a, button, [tabindex]', c).forEach(function (f) { f.setAttribute('tabindex', '-1'); });
      track.appendChild(c);
    });
  }

  Nova.define('marquee', {
    init: function () {
      // Логотипы
      Nova.$$('[data-marquee]').forEach(function (track) {
        cloneInto(track, Array.prototype.slice.call(track.children));
      });

      // Отзывы: верхняя лента — оригинал + копия
      var rowA = Nova.$('[data-reviews-row]:not([data-reviews-row="reverse"])');
      var rowB = Nova.$('[data-reviews-row="reverse"]');
      if (!rowA) return;
      var items = Array.prototype.slice.call(rowA.children);
      cloneInto(rowA, items);

      // Нижняя лента — те же отзывы со сдвигом и другими цветами аватаров
      if (rowB) {
        var shifted = items.slice(4).concat(items.slice(0, 4));
        var list = shifted.concat(shifted);
        list.forEach(function (n, i) {
          var c = n.cloneNode(true);
          var ava = Nova.$('.review__ava', c);
          if (ava) ava.style.setProperty('--ava', AVA[(i + 2) % AVA.length]);
          rowB.appendChild(c);
        });
      }
    }
  });
})(window.Nova);
