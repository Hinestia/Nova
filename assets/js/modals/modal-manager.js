/**
 * Менеджер модальных окон на нативном <dialog>.
 *
 *  • showModal(): фокус внутрь, остальная страница inert, прокрутка заблокирована;
 *  • Esc, кнопка «Назад» ТВ-пульта (Tizen 10009, webOS 461) и системная «Назад»
 *    на Android (через history) закрывают верхнее окно;
 *  • клик по фону закрывает окно;
 *  • морф «кнопка → окно» через View Transitions API (ПК и планшет);
 *  • на смартфоне окна — bottom sheet, закрываются свайпом вниз за «ручку».
 */
(function (Nova) {
  'use strict';

  var dialogs = {};
  var stack = [];          // открытые окна, последнее — верхнее
  var triggers = {};       // кто открыл окно — вернём туда фокус / морф
  var hooks = {};          // onOpen / onClose модулей окон
  var popping = false;

  function panelOf(d) { return Nova.$('[data-sheet]', d); }
  var morphName = function (name) { return name + '-morph'; };

  function canMorph(trigger) {
    return Nova.canVT() && Nova.bp() !== 'm' && trigger && trigger.offsetParent !== null;
  }

  function open(name, trigger) {
    var d = dialogs[name];
    if (!d || d.open) return;
    Nova.modules.header && Nova.modules.header.closeMenu();
    triggers[name] = trigger || document.activeElement;
    var h = hooks[name] || {};
    h.beforeOpen && h.beforeOpen();

    var show = function () {
      d.showModal();
      stack.push(name);
      Nova.lockScroll('modal', true);
      history.pushState({ novaModal: name }, '');
      h.afterOpen && h.afterOpen();
    };

    var panel = panelOf(d);
    if (canMorph(trigger) && panel) {
      d.classList.add('is-morph');
      trigger.style.viewTransitionName = morphName(name);
      Nova.vt(function () {
        trigger.style.viewTransitionName = '';
        panel.style.viewTransitionName = morphName(name);
        show();
      }).finished.then(function () { panel.style.viewTransitionName = ''; });
    } else {
      d.classList.remove('is-morph');
      show();
    }
    Nova.emit('modal:open', name);
  }

  function finishClose(name) {
    var d = dialogs[name];
    if (!d.dataset.closing) return; // уже закрыто (страховка ниже)
    d.close();
    d.classList.remove('is-closing');
    delete d.dataset.closing;
    stack = stack.filter(function (n) { return n !== name; });
    if (!stack.length) Nova.lockScroll('modal', false);
    var h = hooks[name] || {};
    h.afterClose && h.afterClose();
    var t = triggers[name];
    if (t && document.contains(t) && t.focus) t.focus({ preventScroll: true });
    Nova.emit('modal:close', name);
  }

  function close(name, opts) {
    var d = dialogs[name];
    if (!d || !d.open || d.dataset.closing) return;
    d.dataset.closing = '1';
    opts = opts || {};
    var h = hooks[name] || {};
    h.beforeClose && h.beforeClose();

    // Убираем запись из истории, если закрыли не кнопкой «Назад»
    if (!popping && history.state && history.state.novaModal === name) {
      popping = true;
      history.back();
      setTimeout(function () { popping = false; }, 50);
    }

    var trigger = triggers[name];
    var panel = panelOf(d);
    var morph = !opts.noMorph && d.classList.contains('is-morph') && canMorph(trigger) && panel;

    if (morph) {
      panel.style.viewTransitionName = morphName(name);
      var done = false;
      var update = function () {
        if (done) return;
        done = true;
        panel.style.viewTransitionName = '';
        finishClose(name);
        trigger.style.viewTransitionName = morphName(name);
      };
      Nova.vt(update).finished.then(function () { trigger.style.viewTransitionName = ''; });
      // Страховка: на слабых устройствах захват снимка может затянуться —
      // окно всё равно закроется не позже чем через 500 мс
      setTimeout(function () {
        if (done) return;
        update();
        trigger.style.viewTransitionName = '';
      }, 500);
    } else if (Nova.reduced()) {
      finishClose(name);
    } else {
      d.classList.add('is-closing');
      setTimeout(function () { finishClose(name); }, 220);
    }
  }

  function closeTop() {
    if (stack.length) { close(stack[stack.length - 1]); return true; }
    var exit = Nova.modules.exitIntent;
    if (exit && exit.isOpen()) { exit.hide(); return true; }
    var header = Nova.modules.header;
    if (header && header.isMenuOpen()) { header.closeMenu(); return true; }
    return false;
  }

  /** Свайп вниз за «ручку» или по окну (видео) */
  function dragToClose(e, el, onClose) {
    if (e.button !== undefined && e.button !== 0) return;
    var y0 = e.clientY, dy = 0, moved = false;
    el.style.transition = 'none';
    function mv(ev) {
      dy = Math.max(0, ev.clientY - y0);
      if (dy > 4) moved = true;
      el.style.transform = 'translateY(' + dy + 'px)';
    }
    function up() {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.style.transition = '';
      if (dy > 110) {
        onClose();
        setTimeout(function () { el.style.transform = ''; }, 400);
      } else {
        el.style.transform = '';
      }
      if (moved) {
        Nova.modals._suppressClick = true;
        setTimeout(function () { Nova.modals._suppressClick = false; }, 60);
      }
    }
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  function register(d) {
    var name = d.dataset.modal;
    dialogs[name] = d;

    // Esc внутри <dialog>: не даём браузеру закрыть окно без анимации
    d.addEventListener('cancel', function (e) { e.preventDefault(); close(name); });

    // Клик по фону (сам <dialog> растянут на весь экран)
    d.addEventListener('click', function (e) {
      if (Nova.modals._suppressClick) return;
      if (e.target === d) close(name);
    });

    Nova.$$('[data-close]', d).forEach(function (b) {
      b.addEventListener('click', function () { close(name); });
    });

    var handle = Nova.$('[data-sheet-handle]', d);
    if (handle) {
      handle.addEventListener('pointerdown', function (e) {
        dragToClose(e, panelOf(d), function () { close(name, { noMorph: true }); });
      });
    }
  }

  Nova.modals = {
    open: open,
    close: close,
    closeTop: closeTop,
    isOpen: function (name) { return name ? stack.indexOf(name) > -1 : stack.length > 0; },
    hooks: function (name, h) { hooks[name] = h; },
    dragToClose: dragToClose,
    _suppressClick: false
  };

  Nova.define('modals', {
    init: function () {
      Nova.$$('dialog[data-modal]').forEach(register);

      // Открывающие кнопки
      document.addEventListener('click', function (e) {
        var t = e.target.closest('[data-open-trial], [data-open-video], [data-open-palette]');
        if (!t) return;
        if (t.hasAttribute('data-open-trial')) {
          if (stack.indexOf('palette') > -1) close('palette', { noMorph: true });
          open('trial', t);
        } else if (t.hasAttribute('data-open-video')) {
          open('video', Nova.$('[data-demo-thumb]') || t);
        } else {
          open('palette', t);
        }
      });

      document.addEventListener('keydown', function (e) {
        // Командная палитра: Ctrl/Cmd + K
        if ((e.metaKey || e.ctrlKey) && e.key && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          if (stack.indexOf('palette') > -1) close('palette');
          else if (!stack.length) open('palette', document.activeElement);
          return;
        }
        // «Назад»: Esc, пульты Samsung Tizen (10009), LG webOS (461), Android TV
        var back = e.key === 'Escape' || e.keyCode === 10009 || e.keyCode === 461 ||
                   e.key === 'GoBack' || e.key === 'BrowserBack';
        if (back && !e.defaultPrevented && closeTop()) e.preventDefault();
      });

      // Системная «Назад» (Android, браузер) закрывает окно, а не уводит со страницы
      window.addEventListener('popstate', function () {
        if (popping || !stack.length) return;
        popping = true;
        close(stack[stack.length - 1]);
        setTimeout(function () { popping = false; }, 50);
      });
    }
  });
})(window.Nova);
