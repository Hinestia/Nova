/**
 * Nova — ядро: пространство имён и общие утилиты.
 *
 * Скрипты подключаются обычными <script defer> — без сборщика и зависимостей.
 * Вся логика работает и с file://, но локальные шрифты и WebGL-модуль браузер
 * отдаёт только по http(s), поэтому для разработки используйте `npm start`.
 * Каждый модуль регистрирует себя в window.Nova.modules, а main.js их запускает.
 */
(function () {
  'use strict';

  var mq = function (q) { return window.matchMedia(q); };

  var Nova = {
    modules: {},

    /** Зарегистрировать модуль: Nova.define('name', { init() {} }) */
    define: function (name, mod) { this.modules[name] = mod; return mod; },

    /** Короткие селекторы */
    $: function (sel, root) { return (root || document).querySelector(sel); },
    $$: function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); },

    /** Среда */
    reduced: function () { return mq('(prefers-reduced-motion: reduce)').matches; },
    isTV: function () { return mq('(min-width: 1800px) and (hover: none)').matches; },
    canHover: function () { return mq('(hover: hover) and (pointer: fine)').matches; },
    /** m — смартфон (< 768), t — планшет (< 1024), d — ПК */
    bp: function () { var w = window.innerWidth; return w < 768 ? 'm' : w < 1024 ? 't' : 'd'; },
    isMac: /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),

    /** View Transitions API доступен и уместен */
    canVT: function () { return !!document.startViewTransition && !this.reduced(); },

    /** Безопасная обёртка над startViewTransition */
    vt: function (update) {
      if (!this.canVT()) { update(); return { finished: Promise.resolve() }; }
      try {
        var t = document.startViewTransition(update);
        t.ready.catch(function () {});
        t.finished.catch(function () {});
        return t;
      } catch (e) {
        update();
        return { finished: Promise.resolve() };
      }
    },

    clamp01: function (v) { return Math.max(0, Math.min(1, v)); },

    /** Детерминированный псевдослучай (одинаковый при каждой загрузке) */
    rnd: function (i, s) {
      var x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
      return x - Math.floor(x);
    },

    /** Плавная прокрутка к секции с учётом высоты шапки */
    scrollToId: function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var top = id === 'top' ? 0 : el.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ top: top, behavior: this.reduced() ? 'auto' : 'smooth' });
    },

    /** Простая шина событий между модулями */
    _bus: {},
    on: function (ev, fn) { (this._bus[ev] = this._bus[ev] || []).push(fn); },
    emit: function (ev, data) { (this._bus[ev] || []).forEach(function (fn) { fn(data); }); },

    /** rAF-троттлинг для scroll/resize */
    rafThrottle: function (fn) {
      var id = 0;
      return function () {
        if (id) return;
        id = requestAnimationFrame(function () { id = 0; fn(); });
      };
    },

    /** Блокировка прокрутки страницы (меню, модалки) — с учётом нескольких источников */
    _locks: {},
    lockScroll: function (key, on) {
      if (on) this._locks[key] = true; else delete this._locks[key];
      document.documentElement.classList.toggle('is-locked', Object.keys(this._locks).length > 0);
    },

    /** Форматирование чисел по-русски: 12 000, 3,2 */
    fmt: function (v, dec) {
      return v.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    }
  };

  window.Nova = Nova;
})();
