/**
 * Фирменный курсор (только ПК): светящаяся точка + круг 32 px, догоняющий
 * с задержкой ~120 мс. Над кнопками [data-magnetic] круг увеличивается
 * и «прилипает» к кнопке, а сама кнопка слегка тянется к курсору.
 */
(function (Nova) {
  'use strict';

  Nova.define('cursor', {
    init: function () {
      if (!Nova.canHover() || Nova.reduced()) return;

      var mk = function (cls) {
        var d = document.createElement('div');
        d.className = cls;
        d.setAttribute('aria-hidden', 'true');
        d.style.display = 'none';
        document.body.appendChild(d);
        return d;
      };
      var dot = mk('cursor-dot');
      var ring = mk('cursor-ring');

      var x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, rw = 32, rh = 32;
      var mag = null, shown = false, last = performance.now();
      var active = function () { return window.innerWidth >= 1024; };

      function setOn(v) {
        document.documentElement.classList.toggle('has-cursor', v);
        dot.style.display = ring.style.display = v ? '' : 'none';
      }

      window.addEventListener('mousemove', function (e) {
        x = e.clientX; y = e.clientY;
        if (!shown) { shown = true; rx = x; ry = y; setOn(active()); }
        var hit = e.target.closest && e.target.closest('[data-magnetic], button, a, summary, [role="switch"]');
        var nm = hit && hit.hasAttribute('data-magnetic') ? hit : null;
        if (mag && mag !== nm) mag.style.translate = '';
        mag = nm;
        ring.classList.toggle('is-hover', !!hit);
      }, { passive: true });

      document.addEventListener('mouseleave', function () {
        shown = false;
        setOn(false);
        if (mag) { mag.style.translate = ''; mag = null; }
      });
      window.addEventListener('resize', function () { setOn(shown && active()); });

      (function loop(now) {
        requestAnimationFrame(loop);
        var dt = now - last; last = now;
        var k = 1 - Math.exp(-dt / 120); // задержка ~120 мс
        var tx = x, ty = y, tw = 32, th = 32;

        if (mag) {
          var r = mag.getBoundingClientRect();
          var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          var dx = x - cx, dy = y - cy;
          mag.style.translate = (dx * 0.2) + 'px ' + (dy * 0.25) + 'px';
          tx = cx + dx * 0.2; ty = cy + dy * 0.25;
          tw = r.width + 12; th = r.height + 12;
        }

        rx += (tx - rx) * k; ry += (ty - ry) * k;
        rw += (tw - rw) * Math.min(1, k * 1.6);
        rh += (th - rh) * Math.min(1, k * 1.6);

        dot.style.transform = 'translate(' + (x - 4) + 'px,' + (y - 4) + 'px)';
        ring.style.width = rw + 'px';
        ring.style.height = rh + 'px';
        ring.style.transform = 'translate(' + (rx - rw / 2) + 'px,' + (ry - rh / 2) + 'px)';
      })(last);
    }
  });
})(window.Nova);
