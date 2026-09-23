/**
 * Подписка в подвале: валидация e-mail и понятные сообщения об ошибке.
 * Отправка имитируется — подключите свой endpoint в SUBMIT_URL.
 */
(function (Nova) {
  'use strict';

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  Nova.define('subscribe', {
    EMAIL_RE: EMAIL_RE,
    init: function () {
      var form = Nova.$('[data-subscribe]');
      if (!form) return;
      var input = Nova.$('input', form);
      var btn = Nova.$('button', form);
      var status = Nova.$('[data-subscribe-status]');

      function say(msg, isErr) {
        status.textContent = msg;
        status.classList.toggle('is-error', !!isErr);
        input.setAttribute('aria-invalid', String(!!isErr));
      }

      input.addEventListener('input', function () { if (status.classList.contains('is-error')) say(''); });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = input.value.trim();
        if (!v) { say('Введите e-mail, чтобы подписаться', true); input.focus(); return; }
        if (!EMAIL_RE.test(v)) { say('Проверьте адрес — пример: you@company.ru', true); input.focus(); return; }
        btn.disabled = true;
        btn.textContent = 'Отправляем…';
        setTimeout(function () {
          btn.textContent = 'Готово ✓';
          say('Вы подписаны. Первое письмо придёт в начале месяца.');
          input.value = '';
          Nova.emit('goal', 'subscribe');
        }, 700);
      });
    }
  });
})(window.Nova);
