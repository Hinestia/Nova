/**
 * Командная палитра (Ctrl/Cmd + K) — «пасхалка»: быстрый поиск по разделам
 * и действиям. Навигация стрелками, Enter — перейти. На смартфоне — через иконку поиска.
 */
(function (Nova) {
  'use strict';

  Nova.define('palette', {
    init: function () {
      var d = Nova.$('[data-modal="palette"]');
      if (!d) return;
      var input = Nova.$('[data-palette-input]', d);
      var list = Nova.$('[data-palette-list]', d);
      var items = Nova.content.palette;
      var shown = [], sel = 0;

      function run(item) {
        var action = item[2];
        Nova.modals.close('palette', { noMorph: true });
        setTimeout(function () {
          if (action === '@trial') Nova.modals.open('trial', Nova.$('.hero [data-open-trial]'));
          else if (action === '@video') Nova.modals.open('video', Nova.$('[data-demo-thumb]'));
          else if (action === '@theme') Nova.modules.theme.toggle();
          else Nova.scrollToId(action);
        }, 260);
      }

      function render() {
        var q = input.value.trim().toLowerCase();
        shown = items.filter(function (it) { return it[0].toLowerCase().indexOf(q) > -1; });
        sel = Math.min(sel, Math.max(0, shown.length - 1));
        list.textContent = '';

        if (!shown.length) {
          var empty = document.createElement('p');
          empty.className = 'palette__empty';
          empty.textContent = 'Ничего не нашлось. Попробуйте «тарифы» или «демо».';
          list.appendChild(empty);
          input.removeAttribute('aria-activedescendant');
          return;
        }

        shown.forEach(function (it, i) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'palette__item';
          b.id = 'pal-opt-' + i;
          b.setAttribute('role', 'option');
          b.setAttribute('aria-selected', String(i === sel));
          b.tabIndex = -1;
          b.innerHTML = '<span></span><small></small>';
          b.firstChild.textContent = it[0];
          b.lastChild.textContent = it[1];
          b.addEventListener('click', function () { run(it); });
          b.addEventListener('mouseenter', function () { sel = i; mark(); });
          list.appendChild(b);
        });
        mark();
      }

      function mark() {
        Nova.$$('.palette__item', list).forEach(function (b, i) {
          b.setAttribute('aria-selected', String(i === sel));
          if (i === sel) { input.setAttribute('aria-activedescendant', b.id); b.scrollIntoView({ block: 'nearest' }); }
        });
      }

      input.addEventListener('input', function () { sel = 0; render(); });
      input.addEventListener('keydown', function (e) {
        if (!shown.length) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % shown.length; mark(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + shown.length) % shown.length; mark(); }
        else if (e.key === 'Enter') { e.preventDefault(); run(shown[sel]); }
      });

      Nova.modals.hooks('palette', {
        beforeOpen: function () { input.value = ''; sel = 0; render(); },
        afterOpen: function () { setTimeout(function () { input.focus(); }, 30); }
      });
    }
  });
})(window.Nova);
