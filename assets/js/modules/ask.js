/**
 * «Спроси Nova»: чипсы-подсказки и поле ввода; ответ «печатается» посимвольно
 * из заготовленных ответов. Свободный вопрос получает поясняющий ответ демо-режима.
 */
(function (Nova) {
  'use strict';

  Nova.define('ask', {
    init: function () {
      var root = Nova.$('[data-ask]');
      if (!root) return;
      var C = Nova.content;
      var form = Nova.$('[data-ask-form]', root);
      var input = form && Nova.$('input', form);
      var send = form && Nova.$('button', form);
      var chipsBox = Nova.$('[data-ask-chips]', root);
      var answer = Nova.$('[data-ask-answer]', root);
      var out = Nova.$('[data-ask-out]', root);
      var hint = Nova.$('[data-ask-hint]', root);
      var busy = false, timer = 0, chips = [];

      function setBusy(v) {
        busy = v;
        answer.classList.toggle('is-busy', v);
        answer.setAttribute('aria-busy', String(v));
        chips.forEach(function (c) { c.disabled = v; });
        if (send) send.disabled = v;
      }

      function type(text, idx) {
        clearInterval(timer);
        hint.hidden = true;
        out.textContent = '';
        chips.forEach(function (c, i) { c.setAttribute('aria-pressed', String(i === idx)); });
        if (Nova.reduced()) { out.textContent = text; return; }
        setBusy(true);
        var i = 0;
        timer = setInterval(function () {
          i++;
          out.textContent = text.slice(0, i);
          if (i >= text.length) { clearInterval(timer); setBusy(false); }
        }, 16);
      }

      C.ask.forEach(function (pair, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip';
        b.textContent = pair[0];
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () { if (!busy) type(pair[1], i); });
        chipsBox.appendChild(b);
        chips.push(b);
      });

      form && form.addEventListener('submit', function (e) {
        e.preventDefault();
        var q = input.value.trim().toLowerCase();
        if (busy || !q) return;
        var hit = -1;
        C.ask.forEach(function (p, i) { if (p[0].toLowerCase() === q) hit = i; });
        type(hit >= 0 ? C.ask[hit][1] : C.askFallback, hit);
        input.value = '';
      });
    }
  });
})(window.Nova);
