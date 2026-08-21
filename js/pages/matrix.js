// =============================================================================
// MATRIX PAGE
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const App = window.LP.App;

  App.register('matrix', main => {
    let initial = null;
    if (window.LP._pendingExample && window.LP._pendingExample.method === 'matrix') {
      initial = window.LP._pendingExample.lp;
      window.LP._pendingExample = null;
    }

    main.appendChild(el('div', {
      html: '<h1 class="page-title">Матрицын <em>арга (AX = B)</em></h1>' +
            '<p class="page-subtitle">LP бодлогын оптимум үргэлж хязгаарлалтын шугамуудын ' +
            'огтлолцол дээр оршдог. Тиймээс хязгаарлалтуудаа тэгшитгэл болгож AX = B хэлбэрт ' +
            'шилжүүлээд урвуу матрицаар шууд шийднэ.</p>'
    }));

    // Mode toggle
    const modeCard = el('div', { class: 'card' });
    modeCard.appendChild(el('h3', { class: 'subsection' }, '◇ Горим'));
    let mode = 'lp';
    const pill = el('div', { class: 'pill-toggle' });
    const lpBtn = el('button', { class: 'active' }, 'LP — хязгаарлалтаар');
    const rawBtn = el('button', { class: '' }, 'Цэвэр AX = B');
    pill.appendChild(lpBtn); pill.appendChild(rawBtn);
    modeCard.appendChild(pill);
    modeCard.appendChild(el('p', {
      class: 'form-help',
      style: { marginTop: '8px' }
    }, 'LP горимд бид хязгаарлалтуудыг "тэнцүү" болгож AX=B хэлбэрт шилжүүлнэ. ' +
       'Цэвэр горимд та матрицаа шууд оруулна.'));
    main.appendChild(modeCard);

    const inputArea = el('div');
    main.appendChild(inputArea);

    function renderInput() {
      inputArea.innerHTML = '';
      if (mode === 'lp') {
        window.LP.buildLPInput(inputArea, {
          title: 'LP-аас матриц',
          subtitle: 'Хязгаарлалтуудыг тэгшитгэл болгож (≤, ≥ → =) AX = B хэлбэрээр бодно. ' +
                    'n хязгаарлалт = n хувьсагчтай байх ёстой.',
          allowedOps: ['<=', '>=', '='],
          defaultOp: '<=',
          objective: 'max',
          initial: initial,
          maxVars: 6,
          maxConstraints: 6,
          methodKey: 'matrix',
          onSolve: (lp, out) => {
            if (lp.c.length !== lp.b.length) {
              out.innerHTML = '<div class="panel danger">' +
                '<div class="panel-title">✕ Алдаа</div>' +
                '<p>Матрицын аргад n хувьсагч × n хязгаарлалт байх ёстой. ' +
                'Та ' + lp.c.length + ' хувьсагч ' + lp.b.length + ' хязгаарлалттай оруулсан байна.</p></div>';
              return;
            }
            window.LP.renderMatrixLPSolution(lp, out);
          }
        });
      } else {
        window.LP.buildRawMatrixInput(inputArea);
      }
    }

    lpBtn.addEventListener('click', () => {
      mode = 'lp';
      lpBtn.classList.add('active');
      rawBtn.classList.remove('active');
      renderInput();
    });
    rawBtn.addEventListener('click', () => {
      mode = 'raw';
      rawBtn.classList.add('active');
      lpBtn.classList.remove('active');
      renderInput();
    });

    renderInput();
  });
})();
