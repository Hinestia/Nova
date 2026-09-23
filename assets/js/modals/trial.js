/**
 * Модалка-трансформер «Попробовать бесплатно».
 * Шаг 1 — e-mail, шаг 2 — имя, размер команды, согласие на обработку данных.
 * Успех — конфетти в фирменных цветах и галочка, нарисованная stroke-dashoffset.
 */
(function (Nova) {
  'use strict';

  var d, steps, s1, s2, email, name, sizes, consent, submit, err, confettiCanvas;
  var state = { email: '', name: '', size: '' };

  function showStep(n) {
    var go = function () {
      steps.forEach(function (s) { s.hidden = +s.dataset.trialStep !== n; });
      d.setAttribute('aria-labelledby', 'trial-title-' + n);
    };
    // Мягкая смена шага внутри окна
    if (d.open && Nova.canVT()) Nova.vt(go); else go();

    setTimeout(function () {
      var target = n === 1 ? email : n === 2 ? name : Nova.$('[data-trial-step="3"] .trial-title', d);
      target && target.focus();
    }, 60);
  }

  function setError(msg) {
    err.textContent = msg;
    err.hidden = !msg;
    email.setAttribute('aria-invalid', String(!!msg));
  }

  function validate2() {
    var ok = name.value.trim() && state.size && consent.checked;
    submit.disabled = !ok;
    return ok;
  }

  function reset() {
    state = { email: '', name: '', size: '' };
    s1.reset();
    s2.reset();
    setError('');
    Nova.$$('button', sizes).forEach(function (b) { b.setAttribute('aria-checked', 'false'); });
    submit.disabled = true;
    submit.textContent = 'Создать аккаунт';
    submit.removeAttribute('aria-busy');
    steps.forEach(function (s) { s.hidden = s.dataset.trialStep !== '1'; });
  }

  function confetti() {
    var c = confettiCanvas;
    if (!c || Nova.reduced()) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = c.width = window.innerWidth * dpr, H = c.height = window.innerHeight * dpr;
    var ctx = c.getContext('2d');
    var cols = ['#7C5CFF', '#3DD6FF', '#FF5CAA', '#F2F2F7'];
    var ps = [];
    for (var i = 0; i < 170; i++) {
      ps.push({
        x: W / 2, y: H * 0.45,
        vx: (Math.random() - 0.5) * 26 * dpr, vy: (-Math.random() * 22 - 6) * dpr,
        r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
        w: (6 + Math.random() * 6) * dpr, h: (3 + Math.random() * 5) * dpr,
        c: cols[i % 4]
      });
    }
    var t0 = performance.now();
    (function frame(now) {
      var t = now - t0;
      ctx.clearRect(0, 0, W, H);
      ps.forEach(function (p) {
        p.vy += 0.55 * dpr; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - t / 2800);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (t < 2800 && d.open) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    })(t0);
  }

  Nova.define('trial', {
    init: function () {
      d = Nova.$('[data-modal="trial"]');
      if (!d) return;
      steps = Nova.$$('[data-trial-step]', d);
      s1 = Nova.$('[data-trial-step="1"]', d);
      s2 = Nova.$('[data-trial-step="2"]', d);
      email = Nova.$('input[name="email"]', s1);
      err = Nova.$('[data-error]', s1);
      name = Nova.$('input[name="name"]', s2);
      sizes = Nova.$('[data-sizes]', s2);
      consent = Nova.$('input[name="consent"]', s2);
      submit = Nova.$('[data-trial-submit]', s2);
      confettiCanvas = Nova.$('[data-confetti]', d);

      Nova.modals.hooks('trial', {
        beforeOpen: function () {
          reset();
          Nova.modules.exitIntent && Nova.modules.exitIntent.hide();
          Nova.emit('goal', 'trial_open');
        },
        afterOpen: function () { setTimeout(function () { email.focus(); }, 80); }
      });

      // Шаг 1: e-mail
      email.addEventListener('input', function () { if (!err.hidden) setError(''); });
      s1.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = email.value.trim();
        var re = Nova.modules.subscribe.EMAIL_RE;
        if (!v) return setError('Введите e-mail — на него придёт ссылка для входа'), email.focus();
        if (!re.test(v)) return setError('Похоже, в адресе опечатка. Пример: name@company.ru'), email.focus();
        state.email = v;
        Nova.$$('[data-trial-email]', d).forEach(function (el) { el.textContent = v; });
        showStep(2);
        Nova.emit('goal', 'trial_step1');
      });

      // Шаг 2
      Nova.$$('button', sizes).forEach(function (b, i, all) {
        b.addEventListener('click', function () {
          state.size = b.textContent;
          all.forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
          validate2();
        });
      });
      name.addEventListener('input', validate2);
      consent.addEventListener('change', validate2);
      Nova.$('[data-trial-back]', s2).addEventListener('click', function () { showStep(1); });

      s2.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validate2()) return;
        state.name = name.value.trim();
        submit.disabled = true;
        submit.setAttribute('aria-busy', 'true');
        submit.innerHTML = '<span class="spinner" aria-hidden="true"></span>Создаём аккаунт…';
        // Имитация запроса к API
        setTimeout(function () {
          if (!d.open) return;
          Nova.$('[data-trial-name]', d).textContent = state.name || 'коллега';
          showStep(3);
          confetti();
          Nova.emit('goal', 'trial_success');
        }, 1300);
      });
    }
  });
})(window.Nova);
