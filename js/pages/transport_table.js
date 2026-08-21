// =============================================================================
// TRANSPORT TABLE PAGE — table-based input + table-based solution
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const App = window.LP.App;

  App.register('transport_table', main => {
    let initial = null;
    if (window.LP._pendingExample &&
        window.LP._pendingExample.method === 'transport_table') {
      initial = window.LP._pendingExample.problem;
      window.LP._pendingExample = null;
    }

    main.appendChild(el('div', {
      class: 'card',
      html: '<h3 class="subsection">◇ Тээврийн бодлогын хүснэгт хэлбэр</h3>' +
            '<p>Нийлүүлэгч (мөр) — Хэрэглэгч (багана) — Зардлын матриц. ' +
            'Анхдагч хувилбарыг сонгож (NW/LCM/VAM), бодсоны дараа MODI аргаар оптимумчилна.</p>'
    }));

    window.LP.buildTransportInput(main, {
      title: 'Тээврийн бодлого — Хүснэгт',
      subtitle: 'Хүснэгт хэлбэрээр оруулж, алхам алхмаар бодолтоо хүснэгт хэлбэрээр харна.',
      initial: initial,
      onSolve: (result, out) => {
        window.LP.renderTransportSolution(result, out);
      }
    });
  });
})();
