// =============================================================================
// SIMPLEX PAGE
// =============================================================================
(function () {
  'use strict';
  const App = window.LP.App;

  App.register('simplex', main => {
    let initial = null;
    if (window.LP._pendingExample &&
        (window.LP._pendingExample.method === 'simplex' || window.LP._pendingExample.method === 'bigm')) {
      initial = window.LP._pendingExample.lp;
      window.LP._pendingExample = null;
    }

    window.LP.buildLPInput(main, {
      title: 'Симплекс арга',
      subtitle: 'Олон хувьсагчтай LP. ≤ хязгаарлалтад slack хувьсагч нэмж тэгшитгэл болгоно. ' +
                '≥ ба = хязгаарлалт байвал автоматаар Big-M аргад шилжинэ.',
      allowedOps: ['<=', '>=', '='],
      defaultOp: '<=',
      objective: 'max',
      initial: initial,
      methodKey: 'simplex',
      onSolve: (lp, out) => {
        const eng = new window.LP.SimplexEngine(lp, { useBigM: true }).solve();
        window.LP.renderSimplexSolution(eng, lp, out);
      }
    });
  });
})();
