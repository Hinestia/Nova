/**
 * Точка входа: запускает модули по порядку и подключает цели аналитики.
 * Ошибка в одном модуле не ломает остальные.
 */
(function (Nova) {
  'use strict';

  var ORDER = [
    'theme', 'header', 'hero', 'sphere', 'marquee', 'bento', 'how', 'ask',
    'stats', 'pricing', 'cta', 'subscribe', 'modals', 'trial', 'video',
    'palette', 'exitIntent', 'reveal', 'cursor'
  ];

  ORDER.forEach(function (name) {
    var mod = Nova.modules[name];
    if (!mod || !mod.init) return;
    try { mod.init(); } catch (e) { console.error('[Nova] модуль «' + name + '» не запустился:', e); }
  });

  /**
   * Аналитика и цели по конверсиям.
   * Работает с Google Tag Manager (dataLayer) и Яндекс Метрикой (ym),
   * если счётчики подключены. Укажите номер счётчика в data-ym на <body>.
   */
  var ymId = document.body.dataset.ym;
  Nova.on('goal', function (goal) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'nova_goal', goal: goal });
    if (ymId && typeof window.ym === 'function') window.ym(+ymId, 'reachGoal', goal);
  });

  document.documentElement.classList.add('is-ready');
})(window.Nova);
