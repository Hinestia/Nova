/**
 * Exit-intent (только ПК): когда курсор уходит к вкладкам, в углу появляется
 * небольшая карточка «+14 дней пробного периода». Не чаще 1 раза за сессию.
 */
(function (Nova) {
  'use strict';

  var KEY = 'nova-exit-shown';
  var card;

  function hide() { if (card) card.hidden = true; }
  function isOpen() { return !!card && !card.hidden; }

  Nova.define('exitIntent', {
    hide: hide,
    isOpen: isOpen,
    init: function () {
      card = Nova.$('[data-exit]');
      if (!card) return;
      Nova.$('[data-exit-close]', card).addEventListener('click', hide);

      document.addEventListener('mouseout', function (e) {
        if (e.relatedTarget || e.clientY > 0) return;                 // ушли не за верх окна
        if (window.innerWidth < 1024 || !Nova.canHover()) return;       // только ПК
        if (Nova.modals.isOpen()) return;
        try {
          if (sessionStorage.getItem(KEY)) return;
          sessionStorage.setItem(KEY, '1');
        } catch (x) {}
        card.hidden = false;
        Nova.emit('goal', 'exit_intent_shown');
      });
    }
  });
})(window.Nova);
