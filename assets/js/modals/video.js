/**
 * Видео-модалка «Смотреть демо»: превью в hero расширяется на весь экран
 * (shared element transition), страница уходит в размытие и отдаляется (scale .95).
 * Закрытие — свайп вниз, Esc, «Назад» пульта или клик по фону.
 */
(function (Nova) {
  'use strict';

  Nova.define('video', {
    init: function () {
      var d = Nova.$('[data-modal="video"]');
      if (!d) return;
      var frame = Nova.$('[data-sheet]', d);
      var hint = Nova.$('[data-video-hint]', d);

      Nova.modals.hooks('video', {
        beforeOpen: function () {
          hint.textContent = Nova.canHover() ? 'Esc — закрыть' : 'Смахните вниз, чтобы закрыть';
          document.body.classList.add('is-video-open');
          Nova.emit('goal', 'video_open');
        },
        beforeClose: function () { document.body.classList.remove('is-video-open'); }
      });

      // Свайп вниз по всему окну
      d.addEventListener('pointerdown', function (e) {
        if (e.target.closest('button')) return;
        Nova.modals.dragToClose(e, frame, function () { Nova.modals.close('video', { noMorph: true }); });
      });
    }
  });
})(window.Nova);
