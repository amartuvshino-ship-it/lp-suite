// =============================================================================
// DUALITY UI — side-by-side Primal vs Dual + verification
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const subscriptDigits = window.LP.subscriptDigits;
  const Frac = window.LP.Frac;

  // Format an LP problem as math display
  function formatLPMath(lp) {
    const div = el('div');
    let oz = (lp.objective === 'max' ? 'max ' : 'min ') +
             (lp.objective === 'max' ? 'Z' : 'W') + ' = ';
    for (let j = 0; j < lp.c.length; j++) {
      const cv = Frac.from(lp.c[j]);
      if (j > 0) oz += cv.isNeg() ? ' − ' : ' + ';
      const av = cv.isNeg() ? cv.neg() : cv;
      const vn = lp.varNames ? lp.varNames[j] : ('x_' + (j + 1));
      oz += av.toString() + subscriptDigits(vn);
    }
    div.appendChild(el('div', {
      class: 'formula-display',
      style: {
        margin: '4px 0', padding: '6px 10px',
        textAlign: 'left', background: 'rgba(255,255,255,0.5)'
      }
    }, oz));

    for (let i = 0; i < lp.b.length; i++) {
      let s = '';
      for (let j = 0; j < lp.c.length; j++) {
        const v = Frac.from(lp.A[i][j]);
        if (j > 0) s += v.isNeg() ? ' − ' : ' + ';
        const av = v.isNeg() ? v.neg() : v;
        const vn = lp.varNames ? lp.varNames[j] : ('x_' + (j + 1));
        s += av.toString() + subscriptDigits(vn);
      }
      s += ' ' + (lp.ops[i] === '<=' ? '≤' : lp.ops[i] === '>=' ? '≥' : '=') + ' ';
      s += Frac.from(lp.b[i]).toString();
      div.appendChild(el('div', {
        class: 'formula-display',
        style: {
          margin: '4px 0', padding: '6px 10px',
          textAlign: 'left', background: 'rgba(255,255,255,0.5)',
          fontSize: '13px'
        }
      }, s));
    }

    if (lp.nonneg) {
      const signs = lp.nonneg.map((nn, j) => {
        const vn = lp.varNames ? lp.varNames[j] : ('x_' + (j + 1));
        return subscriptDigits(vn) + (nn ? ' ≥ 0' : ' free');
      }).join(', ');
      div.appendChild(el('div', {
        style: {
          marginTop: '4px', fontSize: '12px',
          color: 'var(--ink-muted)', textAlign: 'left'
        }
      }, signs));
    }
    return div;
  }

  // -----------------------------
  // Render full duality solution
  // -----------------------------
  function renderDualitySolution(primal, dual, primalEng, dualEng, container) {
    container.innerHTML = '';
    const wrap = el('div');

    wrap.appendChild(el('h2', { class: 'section-title' },
      el('span', { class: 'step-num' }, 'Бодолт'),
      'Анхдагч ↔ Хосмог'
    ));

    const compCard = el('div', { class: 'card' });
    compCard.appendChild(el('h3', { class: 'subsection' }, '◇ Бодлогын харьцуулалт'));

    const grid = el('div', {
      style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }
    });

    const primalBox = el('div', { class: 'panel info' });
    primalBox.appendChild(el('div', { class: 'panel-title' }, 'Анхдагч (Primal)'));
    primalBox.appendChild(formatLPMath(primal));
    grid.appendChild(primalBox);

    const dualBox = el('div', { class: 'panel success' });
    dualBox.appendChild(el('div', { class: 'panel-title' }, 'Хосмог (Dual)'));
    dualBox.appendChild(formatLPMath({
      objective: dual.objective,
      c: dual.c, A: dual.A, b: dual.b, ops: dual.ops,
      varNames: dual.varNames, nonneg: dual.nonneg,
    }));
    grid.appendChild(dualBox);

    compCard.appendChild(grid);

    if (dual.notes && dual.notes.length > 0) {
      const np = el('div', { class: 'panel warn', style: { marginTop: '12px' } });
      np.appendChild(el('div', { class: 'panel-title' }, '⚠ Тэмдэглэл'));
      dual.notes.forEach(n => np.appendChild(el('p', {}, window.LP.mathSubscript(n))));
      compCard.appendChild(np);
    }
    wrap.appendChild(compCard);

    // Both solutions
    const solCard = el('div', { class: 'card' });
    solCard.appendChild(el('h3', { class: 'subsection' }, '◈ Хоёр бодлогын шийд'));

    const solGrid = el('div', {
      style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }
    });

    const ps = el('div');
    ps.appendChild(el('div', {
      class: 'panel-title', style: { color: 'var(--indigo)' }
    }, 'Анхдагч'));
    if (primalEng.status === 'optimal') {
      const sol = primalEng.getSolution();
      const list = el('div');
      for (let j = 0; j < sol.x.length; j++) {
        list.appendChild(el('div', {
          class: 'formula-display',
          style: { textAlign: 'left', padding: '6px 12px' }
        }, subscriptDigits('x_' + (j + 1)) + ' = ' + sol.x[j].toString()));
      }
      list.appendChild(el('div', {
        class: 'formula-display',
        style: { textAlign: 'left', padding: '6px 12px', background: 'var(--accent-bg)' }
      }, 'Z = ' + sol.z.toString()));
      ps.appendChild(list);
    } else {
      ps.appendChild(el('p', {}, 'Status: ' + primalEng.status));
    }
    solGrid.appendChild(ps);

    const ds = el('div');
    ds.appendChild(el('div', {
      class: 'panel-title', style: { color: 'var(--accent)' }
    }, 'Хосмог'));
    if (dualEng.status === 'optimal') {
      const sol = dualEng.getSolution();
      const list = el('div');
      for (let j = 0; j < sol.x.length; j++) {
        list.appendChild(el('div', {
          class: 'formula-display',
          style: { textAlign: 'left', padding: '6px 12px' }
        }, subscriptDigits('y_' + (j + 1)) + ' = ' + sol.x[j].toString()));
      }
      list.appendChild(el('div', {
        class: 'formula-display',
        style: { textAlign: 'left', padding: '6px 12px', background: 'var(--accent-bg)' }
      }, 'W = ' + sol.z.toString()));
      ds.appendChild(list);
    } else {
      ds.appendChild(el('p', {}, 'Status: ' + dualEng.status));
    }
    solGrid.appendChild(ds);

    solCard.appendChild(solGrid);

    if (primalEng.status === 'optimal' && dualEng.status === 'optimal') {
      const ps2 = primalEng.getSolution();
      const dsol = dualEng.getSolution();
      const equal = ps2.z.eq(dsol.z);
      const verifyPanel = el('div', {
        class: 'panel ' + (equal ? 'success' : 'danger'),
        style: { marginTop: '16px' }
      });
      verifyPanel.appendChild(el('div', {
        class: 'panel-title'
      }, equal ? '✓ Хосмог бодлогын алтан дүрэм биелэв' : '✕ Z ≠ W'));
      verifyPanel.appendChild(el('p', {
        html: 'Анхдагч <b>Z = ' + ps2.z.toString() + '</b>, Хосмог <b>W = ' + dsol.z.toString() + '</b>. ' +
              (equal
                ? 'Шугаман программчлалын <b>strong duality</b> дүрэм ёсоор Z = W. Бодолт зөв.'
                : 'Хоёр шийд тэнцэхгүй байна — энэ нь хувиргалтанд алдаа байж магадгүй.')
      }));

      if (equal) {
        verifyPanel.appendChild(el('p', {
          html: '<b>Эдийн засгийн утга:</b> Хосмог хувьсагчийн утгууд (y₁ = ' + dsol.x[0].toString() +
                (dsol.x.length > 1 ? ', y₂ = ' + dsol.x[1].toString() : '') +
                ') нь анхдагч бодлогын <b>сүүдрийн үнэ</b> юм. Тухайлбал, нэмж 1 нэгж 1-р нөөц олж чадвал ' +
                'нийт ашиг ' + dsol.x[0].toString() + ' нэгжээр өснө гэдгийг үнэлж байна.'
        }));
      }
      solCard.appendChild(verifyPanel);
    }

    wrap.appendChild(solCard);

    const actions = el('div', { class: 'action-bar' });
    actions.appendChild(el('button', {
      class: 'btn btn-secondary',
      onClick: () => { if (window.LP.openSaveDialog) window.LP.openSaveDialog(primal, 'duality'); }
    }, '☆ Хадгалах'));
    actions.appendChild(el('button', {
      class: 'btn btn-secondary',
      onClick: () => window.LP.exportPDF(container, 'duality-solution.pdf')
    }, '⬇ PDF татах'));
    wrap.appendChild(actions);

    container.appendChild(wrap);
  }

  window.LP = window.LP || {};
  window.LP.formatLPMath = formatLPMath;
  window.LP.renderDualitySolution = renderDualitySolution;
})();
