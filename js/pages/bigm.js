// =============================================================================
// BIG-M PAGE
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const App = window.LP.App;

  App.register('bigm', main => {
    let initial = null;
    if (window.LP._pendingExample && window.LP._pendingExample.method === 'bigm') {
      initial = window.LP._pendingExample.lp;
      window.LP._pendingExample = null;
    }

    main.appendChild(el('div', {
      html: '<h1 class="page-title">Big-M <em>арга</em></h1>' +
            '<p class="page-subtitle">≥ эсвэл = хязгаарлалттай LP-д зохиомол хувьсагч (A) нэмж, ' +
            'тэдгээрт асар их торгууль (М) тавьж стандарт Симплексээр бодно.</p>'
    }));

    main.appendChild(el('div', {
      class: 'card',
      html:
        '<h3 class="subsection">◇ Big-M аргын суурь</h3>' +
        '<p>Стандарт Симплекс зөвхөн ≤ хязгаарлалттай ажилладаг (учир нь slack хувьсагч анхны ' +
        'суурь болно). ≥ эсвэл = хязгаарлалттай үед эхний боломжит шийдэл олдохгүй.</p>' +
        '<p><b>Шийдэл:</b> зохиомол хувьсагч <code>A</code>-г нэмж, зорилгын функцед ' +
        '<code>−M·A</code> (max үед) эсвэл <code>+M·A</code> (min үед) гэсэн торгууль өгнө. ' +
        'M бол маш том тоо. Алгоритм A-г аль болох хурдан 0 болгох гэж хичээдэг.</p>' +
        '<p><b>Дүгнэлт:</b> хэрэв оптимум дээр A > 0 хэвээр үлдвэл бодлого <b>шийдгүй</b> (Infeasible).</p>'
    }));

    window.LP.buildLPInput(main, {
      title: 'Big-M арга',
      subtitle: '≥ ба = хязгаарлалт оруулж болно. Зохиомол хувьсагч автоматаар нэмэгдэнэ.',
      allowedOps: ['<=', '>=', '='],
      defaultOp: '>=',
      objective: 'min',
      initial: initial,
      methodKey: 'bigm',
      onSolve: (lp, out) => {
        const eng = new window.LP.SimplexEngine(lp, { useBigM: true }).solve();
        window.LP.renderSimplexSolution(eng, lp, out);
      }
    });
  });
})();
