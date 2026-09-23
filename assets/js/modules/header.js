/**
 * Шапка:
 *  • стекло при прокрутке, сжатие в «пилюлю» при скролле вниз и возврат при скролле вверх (ПК);
 *  • якорные ссылки с плавной прокруткой;
 *  • бургер и полноэкранное мобильное меню.
 */
(function (Nova) {
  'use strict';

  var header, menu, burger;
  var lastY = 0;
  var state = { glassy: false, compact: false, menuOpen: false };

  function onScroll() {
    var y = window.scrollY;
    var dy = y - lastY;
    var compact = state.compact;

    if (y < 80) compact = false;
    else if (dy > 8) compact = true;
    else if (dy < -8) compact = false;
    if (Math.abs(dy) > 8 || y < 80) lastY = y;

    var glassy = y > 10;
    if (glassy !== state.glassy) header.classList.toggle('is-glassy', (state.glassy = glassy));
    if (compact !== state.compact) header.classList.toggle('is-compact', (state.compact = compact));
  }

  function setMenu(open) {
    if (!menu || open === state.menuOpen) return;
    state.menuOpen = open;
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    Nova.lockScroll('menu', open);
    if (open) setTimeout(function () { var l = Nova.$('.mobile-menu__link', menu); l && l.focus(); }, 60);
  }

  function onAnchorClick(e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (!id || !document.getElementById(id)) return;
    e.preventDefault();
    var wasOpen = state.menuOpen;
    setMenu(false);
    setTimeout(function () { Nova.scrollToId(id); }, wasOpen ? 250 : 0);
    history.replaceState(null, '', id === 'top' ? location.pathname : '#' + id);
  }

  Nova.define('header', {
    isMenuOpen: function () { return state.menuOpen; },
    closeMenu: function () { setMenu(false); },

    init: function () {
      header = Nova.$('[data-header]');
      menu = Nova.$('[data-mobile-menu]');
      burger = Nova.$('[data-burger]');
      if (!header) return;

      lastY = window.scrollY;
      onScroll();
      window.addEventListener('scroll', Nova.rafThrottle(onScroll), { passive: true });

      document.addEventListener('click', onAnchorClick);
      burger && burger.addEventListener('click', function () { setMenu(!state.menuOpen); });

      // Меню нужно только до 1024 px
      window.addEventListener('resize', function () { if (window.innerWidth >= 1024) setMenu(false); });

      // Подсказка горячей клавиши палитры
      var kbd = Nova.$('[data-kbd]');
      if (kbd) kbd.textContent = Nova.isMac ? '⌘K' : 'Ctrl K';
    }
  });
})(window.Nova);
