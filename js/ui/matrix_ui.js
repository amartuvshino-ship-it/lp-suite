// =============================================================================
// MATRIX UI — renders matrix A, X, B + det + inverse + step-by-step
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const subscriptDigits = window.LP.subscriptDigits;
  const Frac = window.LP.Frac;
  const F = window.LP.F;
  const Settings = window.LP.Settings;

  // Helper: matrix HTML with brackets
  function matrixHTML(M, label) {
    const wrap = el('div', {
      style: { display: 'inline-flex', alignItems: 'center', flexDirection: 'column', gap: '4px' }
    });
    if (label) {
      wrap.appendChild(el('span', {
        style: {
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: '14px',
          color: 'var(--ink-muted)'
        }
      }, label));
    }

    const inner = el('div', {
      style: { display: 'flex', alignItems: 'stretch', position: 'relative', padding: '8px 14px' }
    });
    inner.appendChild(el('div', {
      style: {
        width: '8px',
        borderTop: '2px solid var(--ink)',
        borderBottom: '2px solid var(--ink)',
        borderLeft: '2px solid var(--ink)',
        borderRadius: '4px 0 0 4px'
      }
    }));

    const tbl = el('table', { style: { borderCollapse: 'collapse', margin: '0 12px' } });
    for (const row of M) {
      const tr = el('tr');
      for (const v of row) {
        tr.appendChild(el('td', {
          style: {
            padding: '4px 12px',
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: '14px'
          }
        }, v.toString()));
      }
      tbl.appendChild(tr);
    }
    inner.appendChild(tbl);

    inner.appendChild(el('div', {
      style: {
        width: '8px',
        borderTop: '2px solid var(--ink)',
        borderBottom: '2px solid var(--ink)',
        borderRight: '2px solid var(--ink)',
        borderRadius: '0 4px 4px 0'
      }
    }));
    wrap.appendChild(inner);
    return wrap;
  }

  function vectorHTML(vec, label) {
    return matrixHTML(vec.map(v => [v]), label);
  }

  // -----------------------------
  // Raw matrix input form
  // -----------------------------
  function buildRawMatrixInput(container) {
    let n = 2;
    let A = [['4', '2'], ['2', '4']];
    let B = ['100', '80'];

    function render() {
      container.innerHTML = '';
      const card = el('div', { class: 'lp-builder' });

      card.appendChild(el('div', { class: 'builder-section-title' }, 'Хэмжээ'));
      const dimRow = el('div', { class: 'form-row' });
      dimRow.appendChild(el('label', { class: 'form-label' }, 'n × n матриц:'));
      const stepper = el('div', { class: 'stepper' });
      stepper.appendChild(el('button', {
        onClick: () => { if (n > 1) { n--; resize(); render(); } }
      }, '−'));
      stepper.appendChild(el('input', {
        type: 'number', value: String(n), min: '1', max: '6',
        onChange: e => {
          n = Math.max(1, Math.min(6, parseInt(e.target.value) || n));
          resize(); render();
        }
      }));
      stepper.appendChild(el('button', {
        onClick: () => { if (n < 6) { n++; resize(); render(); } }
      }, '+'));
      dimRow.appendChild(stepper);
      card.appendChild(dimRow);

      card.appendChild(el('div', {
        class: 'builder-section-title',
        style: { marginTop: '16px' }
      }, 'Матриц A'));
      const grid = el('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(' + n + ', max-content)',
          gap: '6px',
          alignItems: 'center',
          marginBottom: '12px'
        }
      });
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          grid.appendChild(el('input', {
            class: 'input input-num', type: 'text', value: A[i][j],
            onInput: e => { A[i][j] = e.target.value; }
          }));
        }
      }
      card.appendChild(grid);

      card.appendChild(el('div', {
        class: 'builder-section-title',
        style: { marginTop: '8px' }
      }, 'Вектор B'));
      const bGrid = el('div', {
        style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }
      });
      for (let i = 0; i < n; i++) {
        bGrid.appendChild(el('input', {
          class: 'input input-num', type: 'text', value: B[i],
          onInput: e => { B[i] = e.target.value; }
        }));
      }
      card.appendChild(bGrid);

      const actions = el('div', { class: 'action-bar' });
      actions.appendChild(el('div', { class: 'spacer' }));
      actions.appendChild(el('button', {
        class: 'btn btn-secondary',
        onClick: () => doFillRandom()
      }, '🎲 Жишээгээр дүүргэх'));
      actions.appendChild(el('button', {
        class: 'btn btn-primary btn-lg',
        onClick: () => doSolve()
      }, '▸ Бодох'));
      card.appendChild(actions);

      container.appendChild(card);
      container.appendChild(el('div', { id: 'matrix-output' }));
    }

    function resize() {
      while (A.length < n) A.push([]);
      A.length = n;
      for (let i = 0; i < n; i++) {
        while (A[i].length < n) A[i].push('0');
        A[i].length = n;
      }
      while (B.length < n) B.push('0');
      B.length = n;
    }
    resize();

    function doFillRandom() {
      // Generate random A and B that yields a non-singular system
      // Try up to 5 times to get nonzero determinant
      for (let attempt = 0; attempt < 5; attempt++) {
        // Pick a target solution
        const target = [];
        for (let i = 0; i < n; i++) target.push(Math.floor(Math.random() * 10) + 1);
        // Random A coefficients
        const newA = [];
        for (let i = 0; i < n; i++) {
          const row = [];
          for (let j = 0; j < n; j++) {
            // Diagonal-favored to ensure non-singularity
            if (i === j) row.push(String(Math.floor(Math.random() * 6) + 3));
            else row.push(String(Math.floor(Math.random() * 5) + 1));
          }
          newA.push(row);
        }
        // B = A * target
        const newB = [];
        for (let i = 0; i < n; i++) {
          let s = 0;
          for (let j = 0; j < n; j++) s += parseInt(newA[i][j]) * target[j];
          newB.push(String(s));
        }
        // Quick singularity check via Frac determinant
        try {
          const Af = newA.map(r => r.map(v => Frac.from(v)));
          const det = (function compute(M) {
            const sz = M.length;
            if (sz === 1) return M[0][0];
            if (sz === 2) return M[0][0].mul(M[1][1]).sub(M[0][1].mul(M[1][0]));
            let s = Frac.from(0);
            for (let j = 0; j < sz; j++) {
              const minor = M.filter((_, ii) => ii !== 0).map(r => r.filter((_, jj) => jj !== j));
              const sign = j % 2 === 0 ? Frac.from(1) : Frac.from(-1);
              s = s.add(sign.mul(M[0][j]).mul(compute(minor)));
            }
            return s;
          })(Af);
          if (!det.isZero()) {
            A = newA;
            B = newB;
            render();
            const out = container.querySelector('#matrix-output');
            if (out) out.innerHTML = '';
            if (window.LP.showToast) {
              window.LP.showToast('🎲 Шинэ санамсаргүй матриц үүслээ');
            }
            return;
          }
        } catch (e) { /* try again */ }
      }
      alert('Хэдэн оролдлогын дараа ч ялгаралтай матриц олж чадсангүй. Дахин туршина уу.');
    }

    function doSolve() {
      try {
        const Af = A.map(r => r.map(v => Frac.from(v || '0')));
        const Bf = B.map(v => Frac.from(v || '0'));
        const eng = new window.LP.MatrixEngine(Af, Bf).solve();
        const out = container.querySelector('#matrix-output');
        out.innerHTML = '';
        renderMatrixSolution(eng, Af, Bf, out, {
          variableNames: Array.from({ length: n }, (_, i) => 'x_' + (i + 1))
        });
      } catch (e) {
        alert('Алдаа: ' + e.message);
      }
    }

    render();
  }

  // -----------------------------
  // From-LP solution wrapper
  // -----------------------------
  function renderMatrixLPSolution(lp, container) {
    const A = lp.A.map(r => r.slice());
    const B = lp.b.slice();
    const eng = new window.LP.MatrixEngine(A, B).solve();
    renderMatrixSolution(eng, A, B, container, {
      variableNames: lp.varNames || Array.from({ length: lp.c.length }, (_, i) => 'x_' + (i + 1)),
      isLP: true,
      lp: lp,
    });
  }

  // -----------------------------
  // Render solution
  // -----------------------------
  function renderMatrixSolution(eng, A, B, container, opts) {
    container.innerHTML = '';
    opts = opts || {};
    const wrap = el('div');
    const n = A.length;
    const varNames = opts.variableNames || Array.from({ length: n }, (_, i) => 'x_' + (i + 1));

    wrap.appendChild(el('h2', { class: 'section-title' },
      el('span', { class: 'step-num' }, 'Бодолт'),
      'Алхам алхмаар'
    ));

    // Step 1: A, X, B
    const card1 = el('div', { class: 'card' });
    card1.appendChild(el('div', { class: 'step-header' },
      el('span', { class: 'step-badge' }, 'Алхам 1'),
      el('span', { class: 'step-title' }, 'Матрицуудыг гаргах')
    ));
    card1.appendChild(el('p', {
      html: 'Хязгаарлалтын системийг матрицуудаар илэрхийлнэ: <b>A</b> — коэффициентийн матриц, ' +
            '<b>X</b> — хувьсагчдын вектор, <b>B</b> — сул гишүүний вектор. AX = B.'
    }));
    const matRow = el('div', {
      style: {
        display: 'flex', gap: '24px', alignItems: 'center',
        flexWrap: 'wrap', justifyContent: 'center', margin: '12px 0'
      }
    });
    matRow.appendChild(matrixHTML(A, 'A'));
    matRow.appendChild(el('span', { style: { fontSize: '24px', fontWeight: '500' } }, '×'));
    matRow.appendChild(vectorHTML(varNames.map(v => subscriptDigits(v)), 'X'));
    matRow.appendChild(el('span', { style: { fontSize: '24px', fontWeight: '500' } }, '='));
    matRow.appendChild(vectorHTML(B.map(v => v.toString()), 'B'));
    card1.appendChild(matRow);
    wrap.appendChild(card1);

    // Step 2: Determinant
    const card2 = el('div', { class: 'card' });
    card2.appendChild(el('div', { class: 'step-header' },
      el('span', { class: 'step-badge' }, 'Алхам 2'),
      el('span', { class: 'step-title' }, 'Тодорхойлогч |A| = ' + (eng.detA ? eng.detA.toString() : '0'))
    ));

    if (n === 2) {
      card2.appendChild(el('p', {
        html: 'Гол диагоналийн үржвэрээс туслах диагоналийн үржвэрийг хасна:'
      }));
      card2.appendChild(el('div', { class: 'formula-display' },
        '|A| = (' + A[0][0].toString() + ' × ' + A[1][1].toString() + ') − (' +
        A[0][1].toString() + ' × ' + A[1][0].toString() + ') = ' +
        A[0][0].mul(A[1][1]).toString() + ' − ' + A[0][1].mul(A[1][0]).toString() + ' = ' +
        eng.detA.toString()
      ));
    }

    if (eng.status === 'singular') {
      card2.appendChild(el('div', {
        class: 'panel danger',
        html: '<div class="panel-title">✕ |A| = 0 — Систем шийдгүй (эсвэл хязгааргүй шийдтэй)</div>' +
              '<p>Тодорхойлогч тэгтэй тэнцэх нь хязгаарлалтуудын шугамууд параллел эсвэл давхцсан гэсэн үг. ' +
              '<b>Эдийн засгийн утга:</b> үйлдвэрлэлийн жорууд хооронд хамааралтай — нэг хязгаарлалт ' +
              'нөгөөгөөсөө хамаарч байгаа учраас систем хатуу шийдгүй.</p>'
      }));
      wrap.appendChild(card2);
      container.appendChild(wrap);
      return;
    }

    // Det economic interpretation
    const detExpl = el('details', { class: 'explainer' });
    detExpl.open = (Settings.detailLevel === 'long');
    detExpl.appendChild(el('summary', {}, 'Тодорхойлогчийн эдийн засгийн утга'));
    const detBody = el('div', { class: 'body' });
    if (eng.detA.isPos()) {
      detBody.appendChild(el('p', {
        html: '<b>|A| > 0 — "Эрүүл, төрөлжсөн" систем.</b> Бүтээгдэхүүнүүд өөрсдийн үндсэн нөөцөөсөө түлхүү ' +
              'хамааралтай (Hawkins-Simon нөхцөл биелсэн). Менежер бизнесээ итгэлтэйгээр тэлж болно.'
      }));
    } else {
      detBody.appendChild(el('p', {
        html: '<b>|A| < 0 — "Урвуу хамааралтай" парадокс систем.</b> Орцын технологиуд хооронд логикийн зөрчилтэй. ' +
              'Нөөцийг нэмэхэд бүтээгдэхүүн үргэлж нэмэгддэггүй парадокс гарч болно.'
      }));
    }
    detExpl.appendChild(detBody);
    card2.appendChild(detExpl);
    wrap.appendChild(card2);

    // Step 3: inverse
    const card3 = el('div', { class: 'card' });
    card3.appendChild(el('div', { class: 'step-header' },
      el('span', { class: 'step-badge' }, 'Алхам 3'),
      el('span', { class: 'step-title' }, 'Урвуу матриц A⁻¹')
    ));
    if (n === 2) {
      card3.appendChild(el('p', {
        html: '2×2 матрицын урвууг олох томьёо: гол диагоналийн байрыг сольж, туслах диагоналийн ' +
              'тэмдгийг эсрэгээр өөрчлөөд |A|-д хуваана.'
      }));
    }
    const invRow = el('div', { style: { display: 'flex', justifyContent: 'center', margin: '12px 0' } });
    invRow.appendChild(matrixHTML(eng.inverse_, 'A⁻¹'));
    card3.appendChild(invRow);
    wrap.appendChild(card3);

    // Step 4: X = A⁻¹ · B
    const card4 = el('div', { class: 'card' });
    card4.appendChild(el('div', { class: 'step-header' },
      el('span', { class: 'step-badge' }, 'Алхам 4'),
      el('span', { class: 'step-title' }, 'X = A⁻¹ · B')
    ));
    const fr = el('div', {
      style: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }
    });
    fr.appendChild(matrixHTML(eng.inverse_, 'A⁻¹'));
    fr.appendChild(el('span', { style: { fontSize: '24px' } }, '×'));
    fr.appendChild(vectorHTML(B.map(v => v.toString()), 'B'));
    fr.appendChild(el('span', { style: { fontSize: '24px' } }, '='));
    fr.appendChild(vectorHTML(eng.X.map(v => v.toString()), 'X'));
    card4.appendChild(fr);

    const compList = el('div', { style: { marginTop: '16px' } });
    for (let i = 0; i < n; i++) {
      const parts = [];
      for (let j = 0; j < n; j++) {
        parts.push('(' + eng.inverse_[i][j].toString() + ' × ' + B[j].toString() + ')');
      }
      compList.appendChild(el('div', {
        class: 'formula-display',
        style: { textAlign: 'left', padding: '6px 14px', fontSize: '13px' }
      }, subscriptDigits(varNames[i]) + ' = ' + parts.join(' + ') + ' = ' + eng.X[i].toString()));
    }
    card4.appendChild(compList);
    wrap.appendChild(card4);

    // Final summary
    const sumGrid = el('div', { class: 'solution-grid' });
    for (let i = 0; i < n; i++) {
      const c = el('div', { class: 'solution-card' });
      c.appendChild(el('div', { class: 'solution-label' }, subscriptDigits(varNames[i])));
      c.appendChild(el('div', { class: 'solution-value accent' }, eng.X[i].toString()));
      sumGrid.appendChild(c);
    }
    if (opts.isLP && opts.lp) {
      let z = F(0);
      for (let i = 0; i < n; i++) z = z.add(opts.lp.c[i].mul(eng.X[i]));
      const zc = el('div', { class: 'solution-card' });
      zc.appendChild(el('div', { class: 'solution-label' }, 'Z (зорилгын функц)'));
      zc.appendChild(el('div', { class: 'solution-value gold' }, z.toString()));
      sumGrid.appendChild(zc);
    }
    wrap.appendChild(sumGrid);

    const actions = el('div', { class: 'action-bar' });
    if (opts.isLP && opts.lp && window.LP.openSaveDialog) {
      actions.appendChild(el('button', {
        class: 'btn btn-secondary',
        onClick: () => window.LP.openSaveDialog(opts.lp, 'matrix')
      }, '☆ Хадгалах'));
    }
    actions.appendChild(el('button', {
      class: 'btn btn-secondary',
      onClick: () => window.LP.exportPDF(container, 'matrix-solution.pdf')
    }, '⬇ PDF татах'));
    wrap.appendChild(actions);

    container.appendChild(wrap);
  }

  window.LP = window.LP || {};
  window.LP.matrixHTML = matrixHTML;
  window.LP.vectorHTML = vectorHTML;
  window.LP.buildRawMatrixInput = buildRawMatrixInput;
  window.LP.renderMatrixLPSolution = renderMatrixLPSolution;
  window.LP.renderMatrixSolution = renderMatrixSolution;
})();
