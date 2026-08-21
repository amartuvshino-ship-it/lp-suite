// =============================================================================
// GRAPHICAL PAGE
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const App = window.LP.App;

  App.register('graphical', main => {
    let initial = null;
    if (window.LP._pendingExample && window.LP._pendingExample.method === 'graphical') {
      initial = window.LP._pendingExample.lp;
      window.LP._pendingExample = null;
    }

    main.appendChild(el('div', {
      html: '<h1 class="page-title">Графикийн <em>арга</em></h1>' +
            '<p class="page-subtitle">Зөвхөн 2 хувьсагчтай үед боломжит. Хязгаарлалтуудыг хавтгайд зурж, ' +
            'боломжит мужийн оройн цэгүүдээс оптимумыг олно.</p>'
    }));

    window.LP.buildLPInput(main, {
      title: 'Графикийн арга',
      subtitle: 'Зөвхөн 2 хувьсагчтай (x₁, x₂). Шинэ хувьсагч нэмэх боломжгүй.',
      allowedOps: ['<=', '>=', '='],
      defaultOp: '<=',
      objective: 'max',
      initial: initial,
      maxVars: 2,
      methodKey: 'graphical',
      onSolve: (lp, out) => {
        if (lp.c.length !== 2) {
          out.innerHTML = '<div class="panel danger">' +
            '<div class="panel-title">✕ Алдаа</div>' +
            '<p>Графикийн арга нь зөвхөн 2 хувьсагчтай үед боломжтой.</p></div>';
          return;
        }
        const eng = new window.LP.GraphicalEngine(lp).solve();
        window.LP.renderGraphicalSolution(eng, lp, out);
      }
    });
  });
})();
