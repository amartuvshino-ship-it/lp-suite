// =============================================================================
// DUALITY PAGE
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const App = window.LP.App;

  App.register('duality', main => {
    let initial = null;
    if (window.LP._pendingExample && window.LP._pendingExample.method === 'duality') {
      initial = window.LP._pendingExample.lp;
      window.LP._pendingExample = null;
    }

    main.appendChild(el('div', {
      html: '<h1 class="page-title">Хосмог <em>(Duality)</em> бодлого</h1>' +
            '<p class="page-subtitle">Аливаа LP бодлогын ард үргэлж "сүүдэр" нь оршдог — нөөцийн ' +
            'үнэлгээ хайдаг хосмог бодлого. <b>Анхдагч (Primal) Z = Хосмог (Dual) W</b> үргэлж тэнцүү гарна.</p>'
    }));

    main.appendChild(el('div', {
      class: 'card',
      html:
        '<h3 class="subsection">◇ Хувиргалтын дүрэм</h3>' +
        '<p>Анхдагч бодлогоо оруулахад програм автоматаар хосмог бодлогыг үүсгэнэ.</p>' +
        '<table class="tableau" style="width:auto;font-size:13px">' +
        '<thead><tr><th class="row-label">Анхдагч (max)</th><th>Хосмог (min)</th></tr></thead>' +
        '<tbody>' +
        '<tr><td>max c′x</td><td>min b′y</td></tr>' +
        '<tr><td>i-р хязгаарлалт ≤</td><td>yᵢ ≥ 0</td></tr>' +
        '<tr><td>i-р хязгаарлалт ≥</td><td>yᵢ ≤ 0</td></tr>' +
        '<tr><td>i-р хязгаарлалт =</td><td>yᵢ — чөлөөт (free)</td></tr>' +
        '<tr><td>j-р хувьсагч xⱼ ≥ 0</td><td>j-р хязгаарлалт ≥</td></tr>' +
        '<tr><td>xⱼ — чөлөөт</td><td>j-р хязгаарлалт =</td></tr>' +
        '</tbody></table>'
    }));

    window.LP.buildLPInput(main, {
      title: 'Анхдагч бодлого',
      subtitle: 'Анхдагч (Primal) бодлогынхоо өгөгдлийг оруулна. Хосмог автоматаар үүснэ.',
      allowedOps: ['<=', '>=', '='],
      defaultOp: '<=',
      objective: 'max',
      initial: initial,
      methodKey: 'duality',
      onSolve: (lp, out) => {
        const dual = window.LP.buildDual(lp);
        const primalEng = new window.LP.SimplexEngine(lp, { useBigM: true }).solve();
        const dualEng = new window.LP.SimplexEngine({
          objective: dual.objective,
          c: dual.c, A: dual.A, b: dual.b, ops: dual.ops,
          varNames: dual.varNames, nonneg: dual.nonneg,
        }, { useBigM: true }).solve();
        window.LP.renderDualitySolution(lp, dual, primalEng, dualEng, out);
      }
    });
  });
})();
