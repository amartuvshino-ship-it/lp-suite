// =============================================================================
// TRANSPORT NETWORK PAGE — same input, network (graph) visualization
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const App = window.LP.App;

  App.register('transport_network', main => {
    let initial = null;
    if (window.LP._pendingExample &&
        window.LP._pendingExample.method === 'transport_network') {
      initial = window.LP._pendingExample.problem;
      window.LP._pendingExample = null;
    }

    main.appendChild(el('div', {
      class: 'card',
      html: '<h3 class="subsection">◇ Тээврийн бодлогын сүлжээ хэлбэр</h3>' +
            '<p>Нэг талд нийлүүлэгчид, нөгөө талд хэрэглэгчид. Хооронд нь ' +
            'бүх боломжит замууд (сум). Шийдвэрт ашиглагдсан замууд тод, ' +
            'ашиглагдаагүй нь бүдэг харагдана. Зардал ба хуваарилагдсан хэмжээг ' +
            'зам бүр дээр харуулна.</p>'
    }));

    window.LP.buildTransportInput(main, {
      title: 'Тээврийн бодлого — Сүлжээ',
      subtitle: 'Хүснэгт хэлбэрээр оруулна, бодолт нь сүлжээний график хэлбэрээр гарна.',
      initial: initial,
      onSolve: (result, out) => {
        window.LP.renderTransportNetworkSolution(result, out);
      }
    });
  });
})();
