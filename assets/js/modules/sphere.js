/**
 * 3D-сфера из частиц (Three.js, WebGL).
 *
 * Режимы по ТЗ:
 *  • ПК        — 6400 частиц, вращение, наклон за курсором (до 15°), «пульсация мысли»;
 *  • планшет   — облегчённая сфера, в 2 раза меньше частиц (3200);
 *  • смартфон  — видеолуп (MP4 ≤ 1.5 МБ) под текущую тему;
 *  • ТВ, prefers-reduced-motion, нет WebGL — статичная картинка.
 *
 * Three.js грузится отложенно (после load / в простое), чтобы не влиять на LCP.
 */
(function (Nova) {
  'use strict';

  // Сначала локальная копия (assets/vendor), при ошибке — CDN
  var THREE_LOCAL = new URL('assets/vendor/three/three.module.min.js', document.baseURI).href;
  var THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';
  var MAX_TILT = 15 * Math.PI / 180;

  var root, canvas, video, img;

  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }

  function showStatic() {
    canvas.hidden = true;
    video.hidden = true;
    img.hidden = false;
    if (img.complete) img.classList.add('is-ready');
    else img.addEventListener('load', function () { img.classList.add('is-ready'); }, { once: true });
  }

  /* ---------------- Смартфон: видеолуп ---------------- */
  function startVideo() {
    canvas.hidden = true;
    video.hidden = false;
    var setSrc = function (theme) {
      var base = 'assets/video/sphere-' + (theme === 'light' ? 'light' : 'dark');
      video.classList.remove('is-ready');
      video.poster = base + '-poster.jpg';
      // H.264 — везде, где есть; иначе VP9 (открытые сборки Chromium, часть Android)
      var mp4 = video.canPlayType('video/mp4; codecs="avc1.42E01E"');
      video.src = base + (mp4 ? '.mp4' : '.webm');
      video.load();
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    };
    video.addEventListener('loadeddata', function () { video.classList.add('is-ready'); });
    video.addEventListener('error', showStatic, { once: true });
    setSrc(Nova.modules.theme.get());
    Nova.on('theme', setSrc);

    // Пауза вне экрана — экономим батарею
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { var p = video.play(); p && p.catch && p.catch(function () {}); }
      else video.pause();
    }).observe(video);
  }

  /* ---------------- ПК / планшет: WebGL ---------------- */
  function startWebGL(particles) {
    import(THREE_LOCAL)
      .catch(function () { return import(THREE_CDN); })
      .then(function (THREE) { build(THREE, particles); })
      .catch(showStatic);
  }

  function build(THREE, N) {
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch (e) { showStatic(); return; }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var scene = new THREE.Scene();
    var cam = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    cam.position.z = 6.4;

    // Сфера Фибоначчи + градиент фирменных цветов
    var base = new Float32Array(N * 3), col = new Float32Array(N * 3);
    var c1 = new THREE.Color('#7C5CFF'), c2 = new THREE.Color('#3DD6FF'), c3 = new THREE.Color('#FF5CAA'), tmp = new THREE.Color();
    var R = 1.6, ga = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = ga * i;
      var x = Math.cos(th) * r, z = Math.sin(th) * r;
      base[i * 3] = x * R; base[i * 3 + 1] = y * R; base[i * 3 + 2] = z * R;
      var t = Nova.clamp01((x + 1) * 0.3 + (1 - y) * 0.35);
      if (t < 0.5) tmp.copy(c1).lerp(c2, t * 2); else tmp.copy(c2).lerp(c3, (t - 0.5) * 2);
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    }
    var pos = new Float32Array(base);
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    // Мягкий круглый спрайт частицы
    var tc = document.createElement('canvas');
    tc.width = tc.height = 64;
    var g = tc.getContext('2d');
    var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,.8)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);

    var baseSize = 0.05;
    var mat = new THREE.PointsMaterial({
      size: baseSize, map: new THREE.CanvasTexture(tc), vertexColors: true,
      transparent: true, depthWrite: false, sizeAttenuation: true
    });
    var pts = new THREE.Points(geo, mat);
    var spin = new THREE.Group(), tilt = new THREE.Group();
    spin.add(pts); tilt.add(spin); scene.add(tilt);
    tilt.rotation.x = 0.25;

    function applyTheme(theme) {
      mat.blending = theme === 'light' ? THREE.NormalBlending : THREE.AdditiveBlending;
      mat.opacity = theme === 'light' ? 0.85 : 0.95;
      mat.needsUpdate = true;
    }
    applyTheme(Nova.modules.theme.get());
    Nova.on('theme', applyTheme);

    function size() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.fov = w / h < 1 ? 35 / (w / h) * 0.9 : 35;
      cam.updateProjectionMatrix();
    }
    new ResizeObserver(size).observe(canvas);
    size();

    var mx = 0, my = 0, visible = true, time = 0, last = performance.now();
    window.addEventListener('pointermove', function (e) {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(canvas);

    function draw(dt) {
      time += dt;
      var think = 0.5 + 0.5 * Math.sin(time * 1.3); // «думает»
      for (var i = 0; i < N; i++) {
        var bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2];
        var n = Math.sin(time * 2.2 + by * 3.1 + bx * 2.3) * Math.cos(time * 1.7 + bz * 2.7);
        var s = 1 + 0.05 * n * (0.4 + think) + 0.025 * Math.sin(time * 1.3);
        pos[i * 3] = bx * s; pos[i * 3 + 1] = by * s; pos[i * 3 + 2] = bz * s;
      }
      geo.attributes.position.needsUpdate = true;
      mat.size = baseSize * (1 + 0.12 * think);
      renderer.render(scene, cam);
    }

    function loop(now) {
      requestAnimationFrame(loop);
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible || document.hidden) return;
      spin.rotation.y += dt * 0.18;
      tilt.rotation.x += ((0.25 + my * MAX_TILT) - tilt.rotation.x) * 0.05;
      tilt.rotation.z += ((-mx * MAX_TILT) - tilt.rotation.z) * 0.05;
      draw(dt);
    }
    requestAnimationFrame(loop);
  }

  Nova.define('sphere', {
    init: function () {
      root = Nova.$('[data-sphere]');
      if (!root) return;
      canvas = Nova.$('canvas', root);
      video = Nova.$('[data-sphere-video]', root);
      img = Nova.$('[data-sphere-static]', root);

      if (Nova.reduced() || Nova.isTV()) { showStatic(); return; }

      var bp = Nova.bp();
      if (bp === 'm') { startVideo(); return; }
      if (!hasWebGL()) { showStatic(); return; }

      // Откладываем тяжёлую WebGL-сцену до простоя браузера
      var go = function () { startWebGL(bp === 't' ? 3200 : 6400); };
      var idle = window.requestIdleCallback || function (fn) { setTimeout(fn, 200); };
      if (document.readyState === 'complete') idle(go);
      else window.addEventListener('load', function () { idle(go); }, { once: true });
    }
  });
})(window.Nova);
