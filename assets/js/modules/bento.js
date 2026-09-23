/**
 * Bento-сетка: мини-демо в карточках.
 *  • spotlight — светящееся пятно за курсором;
 *  • печатающийся чат;
 *  • живой график;
 *  • перетаскиваемые задачи (drag & drop + клик/клавиатура);
 *  • переводчик со сменой языка;
 *  • звуковая волна записи;
 *  • переключатели автоматизаций.
 * Все циклы останавливаются, когда карточка вне экрана или вкладка скрыта.
 */
(function (Nova) {
  'use strict';

  var C = Nova.content;

  /** Выполнять fn каждые ms, только пока el виден на экране */
  function whileVisible(el, fn, ms) {
    var visible = false;
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(el);
    return setInterval(function () { if (visible && !document.hidden) fn(); }, ms);
  }

  /* ---------- Spotlight ---------- */
  function spotlight() {
    if (!Nova.canHover()) return;
    Nova.$$('[data-spotlight]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
        card.style.setProperty('--so', '1');
      });
      card.addEventListener('pointerleave', function () { card.style.setProperty('--so', '0'); });
    });
  }

  /* ---------- Чат ---------- */
  function chat() {
    var box = Nova.$('[data-chat]');
    if (!box) return;
    var user = Nova.$('[data-chat-user]', box);
    var dots = Nova.$('[data-chat-dots]', box);
    var ans = Nova.$('[data-chat-answer]', box);
    var out = Nova.$('[data-chat-text]', box);

    if (Nova.reduced()) {
      user.classList.add('is-shown');
      ans.hidden = false;
      out.textContent = C.chatAnswer;
      return;
    }

    var timers = [], typer = 0, running = false;
    var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };

    function run() {
      running = true;
      out.textContent = '';
      user.classList.remove('is-shown');
      dots.hidden = true;
      ans.hidden = true;
      later(function () { user.classList.add('is-shown'); }, 700);
      later(function () { dots.hidden = false; }, 1500);
      later(function () {
        dots.hidden = true;
        ans.hidden = false;
        var i = 0;
        typer = setInterval(function () {
          i += 2;
          out.textContent = C.chatAnswer.slice(0, i);
          if (i >= C.chatAnswer.length) { clearInterval(typer); later(run, 4500); }
        }, 30);
      }, 2900);
    }
    function stop() {
      running = false;
      timers.forEach(clearTimeout); timers = [];
      clearInterval(typer);
    }

    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting && !running) run();
      else if (!es[0].isIntersecting && running) stop();
    }, { threshold: 0.2 }).observe(box);
  }

  /* ---------- График ---------- */
  function chart() {
    var line = Nova.$('[data-chart-line]');
    if (!line) return;
    var area = Nova.$('[data-chart-area]');
    var val = Nova.$('[data-chart-val]');
    var delta = Nova.$('[data-chart-delta]');

    var data = [], v = 55;
    for (var i = 0; i < 24; i++) { v = Math.max(15, Math.min(95, v + (Math.random() - 0.45) * 18)); data.push(v); }

    function render() {
      var d = 'M' + data.map(function (p, i) {
        return (i / (data.length - 1) * 300).toFixed(1) + ' ' + (110 - p).toFixed(1);
      }).join(' L');
      line.setAttribute('d', d);
      area.setAttribute('d', d + ' L300 110 L0 110 Z');
      var a = data[data.length - 1], b = data[data.length - 2];
      val.textContent = Math.round(a) + '%';
      delta.textContent = (a >= b ? '▲ +' : '▼ ') + Math.abs(a - b).toFixed(1) + '%';
      delta.classList.toggle('is-down', a < b);
    }
    render();
    if (Nova.reduced()) return;
    whileVisible(line, function () {
      data.shift();
      var l = data[data.length - 1];
      data.push(Math.max(15, Math.min(95, l + (Math.random() - 0.45) * 18)));
      render();
    }, 1400);
  }

  /* ---------- Задачи ---------- */
  function tasks() {
    var board = Nova.$('[data-board]');
    if (!board) return;
    var cols = { todo: Nova.$('[data-col="todo"]', board), done: Nova.$('[data-col="done"]', board) };
    var dragged = null;

    function make(text) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'task';
      b.draggable = true;
      b.textContent = text;
      b.addEventListener('click', function () { move(b); });
      b.addEventListener('dragstart', function (e) {
        dragged = b;
        b.classList.add('is-dragging');
        if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', text); }
      });
      b.addEventListener('dragend', function () { b.classList.remove('is-dragging'); dragged = null; });
      return b;
    }

    function counts() {
      Object.keys(cols).forEach(function (k) {
        Nova.$('[data-count-col]', cols[k]).textContent = Nova.$$('.task', cols[k]).length;
      });
      var todo = Nova.$$('.task', cols.todo);
      var label = function (b, col) { b.setAttribute('aria-label', b.textContent + (col === 'done' ? ' — готово, вернуть в работу' : ' — отметить выполненной')); };
      todo.forEach(function (b) { label(b, 'todo'); });
      Nova.$$('.task', cols.done).forEach(function (b) { label(b, 'done'); });
    }

    function place(b, col) {
      // Перезапуск анимации появления
      b.style.animation = 'none';
      cols[col].appendChild(b);
      void b.offsetWidth;
      b.style.animation = '';
      counts();
    }

    function move(b) {
      var toDone = b.parentNode === cols.todo;
      place(b, toDone ? 'done' : 'todo');
      b.focus({ preventScroll: true });
      // Когда всё сделано — через паузу возвращаем задачи, чтобы демо продолжалось
      if (!Nova.$$('.task', cols.todo).length) {
        setTimeout(function () {
          Nova.$$('.task', cols.done).slice(1).forEach(function (t) { place(t, 'todo'); });
        }, 1800);
      }
    }

    Object.keys(cols).forEach(function (k) {
      var col = cols[k];
      col.addEventListener('dragover', function (e) { e.preventDefault(); col.classList.add('is-over'); });
      col.addEventListener('dragleave', function () { col.classList.remove('is-over'); });
      col.addEventListener('drop', function (e) {
        e.preventDefault();
        col.classList.remove('is-over');
        if (dragged && dragged.parentNode !== col) move(dragged);
      });
    });

    C.tasks.todo.forEach(function (t) { cols.todo.appendChild(make(t)); });
    C.tasks.done.forEach(function (t) { cols.done.appendChild(make(t)); });
    counts();
  }

  /* ---------- Переводчик ---------- */
  function translate() {
    var langs = Nova.$('[data-langs]');
    var box = Nova.$('[data-phrases]');
    if (!langs || !box) return;
    var idx = 0;

    C.phrases.forEach(function (p, i) {
      var chip = document.createElement('span');
      chip.className = 'lang' + (i === 0 ? ' is-active' : '');
      chip.textContent = p[0];
      langs.appendChild(chip);

      var ph = document.createElement('span');
      ph.className = 'phrase' + (i === 0 ? ' is-active' : '');
      ph.lang = p[0].toLowerCase();
      ph.textContent = p[1];
      if (i) ph.setAttribute('aria-hidden', 'true');
      box.appendChild(ph);
    });

    if (Nova.reduced()) return;
    var chips = langs.children, phrases = box.children;
    whileVisible(box, function () {
      idx = (idx + 1) % C.phrases.length;
      for (var i = 0; i < chips.length; i++) {
        chips[i].classList.toggle('is-active', i === idx);
        phrases[i].classList.toggle('is-active', i === idx);
        if (i === idx) phrases[i].removeAttribute('aria-hidden'); else phrases[i].setAttribute('aria-hidden', 'true');
      }
    }, 2400);
  }

  /* ---------- Звуковая волна ---------- */
  function wave() {
    var box = Nova.$('[data-wave]');
    if (!box) return;
    var n = 30, frag = document.createDocumentFragment();
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span');
      s.style.setProperty('--h', (30 + Math.round(Nova.rnd(i, 9) * 70)) + '%');
      s.style.setProperty('--d', (-i * 0.09).toFixed(2) + 's');
      s.style.setProperty('--dur', (0.9 + Nova.rnd(i, 4) * 0.8).toFixed(2) + 's');
      s.style.setProperty('--bp', (i / (n - 1) * 100).toFixed(1) + '%');
      frag.appendChild(s);
    }
    box.appendChild(frag);
  }

  /* ---------- Переключатели ---------- */
  function switches() {
    Nova.$$('[data-switch]').forEach(function (b) {
      b.addEventListener('click', function () {
        b.setAttribute('aria-checked', String(b.getAttribute('aria-checked') !== 'true'));
      });
    });
  }

  Nova.define('bento', {
    init: function () {
      spotlight();
      chat();
      chart();
      tasks();
      translate();
      wave();
      switches();
    }
  });
})(window.Nova);
