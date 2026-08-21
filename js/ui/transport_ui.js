// =============================================================================
// TRANSPORT UI — table-based input + step-by-step solution rendering
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const Frac = window.LP.Frac;
  const F = window.LP.F;
  const subscriptDigits = window.LP.subscriptDigits;
  const T = window.LP.transport;

  // Method labels in Mongolian
  const METHOD_LABELS = {
    NW: 'Баруун дээд өнцгийн арга',
    LCM: 'Хамгийн бага зардлын арга',
    VAM: 'Vogel-ийн зөрүүний арга',
    MODI: 'MODI (U-V) арга',
  };

  // -----------------------------
  // Build the input form (transportation table)
  // -----------------------------
  function buildTransportInput(container, opts) {
    opts = opts || {};
    const cfg = {
      title: opts.title || 'Тээврийн бодлого',
      subtitle: opts.subtitle || 'Нийлүүлэлт, эрэлт ба зардлын матрицыг оруулна уу.',
      onSolve: opts.onSolve || null,
      initial: opts.initial || null,
    };

    // State
    const state = {
      m: 3, n: 4,
      supply: ['300', '400', '500'],
      demand: ['250', '350', '400', '200'],
      cost: [
        ['3', '1', '7', '4'],
        ['2', '6', '5', '9'],
        ['8', '3', '3', '2'],
      ],
      method: 'NW',
    };

    if (cfg.initial) {
      state.m = cfg.initial.supply.length;
      state.n = cfg.initial.demand.length;
      state.supply = cfg.initial.supply.map(String);
      state.demand = cfg.initial.demand.map(String);
      state.cost = cfg.initial.cost.map(r => r.map(String));
    }

    function ensureSize() {
      while (state.supply.length < state.m) state.supply.push('0');
      state.supply.length = state.m;
      while (state.demand.length < state.n) state.demand.push('0');
      state.demand.length = state.n;
      while (state.cost.length < state.m) state.cost.push([]);
      state.cost.length = state.m;
      for (let i = 0; i < state.m; i++) {
        while (state.cost[i].length < state.n) state.cost[i].push('0');
        state.cost[i].length = state.n;
      }
    }

    function render() {
      container.innerHTML = '';
      // Header
      container.appendChild(el('div', {}, el('h1', { class: 'page-title' }, cfg.title)));
      if (cfg.subtitle) {
        container.appendChild(el('p', { class: 'page-subtitle' }, cfg.subtitle));
      }

      const card = el('div', { class: 'lp-builder' });

      // Dimensions
      card.appendChild(el('div', { class: 'builder-section-title' }, 'Хэмжээ'));
      const dimRow = el('div', { class: 'form-row' });

      function stepper(val, min, max, onChange) {
        const wrap = el('div', { class: 'stepper' });
        wrap.appendChild(el('button', {
          onClick: () => { if (val > min) onChange(val - 1); }
        }, '−'));
        wrap.appendChild(el('input', {
          type: 'number', value: String(val), min: String(min), max: String(max),
          onChange: e => {
            let v = parseInt(e.target.value, 10);
            if (isNaN(v)) v = val;
            v = Math.max(min, Math.min(max, v));
            onChange(v);
          }
        }));
        wrap.appendChild(el('button', {
          onClick: () => { if (val < max) onChange(val + 1); }
        }, '+'));
        return wrap;
      }

      dimRow.appendChild(el('label', { class: 'form-label' }, 'Нийлүүлэгч (мөр):'));
      dimRow.appendChild(stepper(state.m, 2, 8, v => { state.m = v; ensureSize(); render(); }));
      dimRow.appendChild(el('span', { style: { width: '24px' } }));
      dimRow.appendChild(el('label', { class: 'form-label' }, 'Хэрэглэгч (багана):'));
      dimRow.appendChild(stepper(state.n, 2, 8, v => { state.n = v; ensureSize(); render(); }));
      card.appendChild(dimRow);

      // Method picker
      card.appendChild(el('div', {
        class: 'builder-section-title',
        style: { marginTop: '16px' }
      }, 'Анхдагч хувилбар сонгох'));
      const methodPill = el('div', { class: 'pill-toggle' });
      ['NW', 'LCM', 'VAM'].forEach(m => {
        methodPill.appendChild(el('button', {
          class: state.method === m ? 'active' : '',
          onClick: () => {
            state.method = m;
            render();
          }
        }, m + ' — ' + METHOD_LABELS[m].split('(')[0].trim()));
      });
      card.appendChild(methodPill);
      card.appendChild(el('p', {
        class: 'form-help',
        style: { marginTop: '6px' }
      }, 'NW — хамгийн хялбар, гэхдээ муухан хариутай. ' +
         'LCM — зардал-руу анхаарна. ' +
         'VAM — хамгийн нарийн, оптимумд хамгийн ойр.'));

      // Cost table
      card.appendChild(el('div', {
        class: 'builder-section-title',
        style: { marginTop: '20px' }
      }, 'Зардлын матриц + нийлүүлэлт + эрэлт'));

      const tbl = el('table', { class: 'tp-table' });
      const thead = el('thead');
      const trh = el('tr');
      trh.appendChild(el('th', {}, ''));
      for (let j = 0; j < state.n; j++) {
        trh.appendChild(el('th', {}, 'B' + (j + 1)));
      }
      trh.appendChild(el('th', { style: { background: 'var(--bg-subtle)' } }, 'Нийлүүлэлт'));
      thead.appendChild(trh);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      for (let i = 0; i < state.m; i++) {
        const tr = el('tr');
        tr.appendChild(el('th', {}, 'A' + (i + 1)));
        for (let j = 0; j < state.n; j++) {
          const td = el('td', {
            style: {
              padding: '0',
              width: '70px', height: '52px',
              textAlign: 'center',
              background: 'var(--bg-elevated)',
            }
          });
          const inp = el('input', {
            class: 'input input-num',
            type: 'text',
            value: state.cost[i][j],
            style: { width: '52px', textAlign: 'center', border: 'none', background: 'transparent' },
            onInput: e => { state.cost[i][j] = e.target.value; }
          });
          td.appendChild(inp);
          tr.appendChild(td);
        }
        // Supply cell
        const sup = el('td', {
          style: {
            padding: '4px',
            background: 'var(--bg-subtle)',
            textAlign: 'center',
          }
        });
        sup.appendChild(el('input', {
          class: 'input input-num',
          type: 'text',
          value: state.supply[i],
          style: {
            width: '60px', textAlign: 'center', fontWeight: '600',
            border: 'none', background: 'transparent',
          },
          onInput: e => { state.supply[i] = e.target.value; }
        }));
        tr.appendChild(sup);
        tbody.appendChild(tr);
      }
      // Demand row
      const trD = el('tr');
      trD.appendChild(el('th', { style: { background: 'var(--bg-subtle)' } }, 'Эрэлт'));
      for (let j = 0; j < state.n; j++) {
        const td = el('td', {
          style: {
            padding: '4px',
            background: 'var(--bg-subtle)',
            textAlign: 'center',
          }
        });
        td.appendChild(el('input', {
          class: 'input input-num',
          type: 'text',
          value: state.demand[j],
          style: {
            width: '60px', textAlign: 'center', fontWeight: '600',
            border: 'none', background: 'transparent',
          },
          onInput: e => { state.demand[j] = e.target.value; }
        }));
        trD.appendChild(td);
      }
      // Sum/balance indicator cell
      trD.appendChild(el('td', {
        id: 'tp-balance',
        style: {
          padding: '4px',
          background: 'var(--bg-muted)',
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--ink-muted)',
        }
      }, computeBalanceText(state)));
      tbody.appendChild(trD);

      tbl.appendChild(tbody);
      const wrap = el('div', { style: { overflowX: 'auto' } });
      wrap.appendChild(tbl);
      card.appendChild(wrap);

      // Actions
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
      container.appendChild(el('div', { id: 'tp-output' }));
    }

    function computeBalanceText(s) {
      try {
        const sumS = s.supply.reduce((a, x) => a + (parseFloat(x) || 0), 0);
        const sumD = s.demand.reduce((a, x) => a + (parseFloat(x) || 0), 0);
        if (sumS === sumD) return '✓ Тэнцсэн (' + sumS + ')';
        return sumS + ' / ' + sumD + ' (тэнцэхгүй)';
      } catch (e) { return ''; }
    }

    function buildProblem() {
      try {
        return {
          supply: state.supply.map(v => Frac.from(v || '0')),
          demand: state.demand.map(v => Frac.from(v || '0')),
          cost: state.cost.map(r => r.map(v => Frac.from(v || '0'))),
        };
      } catch (e) {
        alert('Алдаа: ' + e.message);
        return null;
      }
    }

    function doSolve() {
      const prob = buildProblem();
      if (!prob) return;
      const out = container.querySelector('#tp-output');
      out.innerHTML = '';
      let result;
      switch (state.method) {
        case 'NW':  result = T.nw(prob);  break;
        case 'LCM': result = T.lcm(prob); break;
        case 'VAM': result = T.vam(prob); break;
        default: result = T.nw(prob);
      }
      // If caller provided a custom render, use it; otherwise default to table-based
      if (cfg.onSolve) {
        cfg.onSolve(result, out);
      } else {
        renderTransportSolution(result, out);
      }
    }

    function doFillRandom() {
      // Generate a random balanced transport problem
      const newSupply = [];
      const newDemand = [];
      const newCost = [];
      const totalUnit = Math.floor(Math.random() * 30 + 30) * 10; // 300..600 by 10
      // Distribute supply randomly across m rows
      let remS = totalUnit;
      for (let i = 0; i < state.m - 1; i++) {
        const v = Math.floor(Math.random() * (remS / 2)) + 50;
        newSupply.push(v);
        remS -= v;
      }
      newSupply.push(Math.max(50, remS));

      let remD = newSupply.reduce((a, x) => a + x, 0);
      for (let j = 0; j < state.n - 1; j++) {
        const v = Math.floor(Math.random() * (remD / 2)) + 30;
        newDemand.push(v);
        remD -= v;
      }
      newDemand.push(Math.max(30, remD));

      for (let i = 0; i < state.m; i++) {
        const row = [];
        for (let j = 0; j < state.n; j++) {
          row.push(Math.floor(Math.random() * 9) + 1);
        }
        newCost.push(row);
      }

      state.supply = newSupply.map(String);
      state.demand = newDemand.map(String);
      state.cost = newCost.map(r => r.map(String));
      ensureSize();
      render();
      const out = container.querySelector('#tp-output');
      if (out) out.innerHTML = '';
      if (window.LP.showToast) window.LP.showToast('🎲 Шинэ санамсаргүй жишээ үүслээ');
    }

    ensureSize();
    render();
    return { state: state };
  }

  // -----------------------------
  // Render initial-method solution + Optimize button
  // -----------------------------
  function renderTransportSolution(result, container) {
    container.innerHTML = '';
    const wrap = el('div');

    wrap.appendChild(el('h2', { class: 'section-title' },
      el('span', { class: 'step-num' }, 'Бодолт'),
      result.methodName
    ));

    // Dummy notice
    if (result.input.dummyAdded) {
      const da = result.input.dummyAdded;
      wrap.appendChild(el('div', {
        class: 'panel warn',
        html: '<div class="panel-title">⚠ Тэнцвэргүй бодлого</div>' +
              '<p>Нийлүүлэлт ба эрэлтийн нийлбэр тэнцсэнгүй. ' +
              'Иймд ' + (da.side === 'supply' ? 'хуурамч нийлүүлэгч (мөр)' : 'хуурамч хэрэглэгч (багана)') +
              ' ' + da.amount.toString() + ' хэмжээтэй автоматаар нэмэгдлээ. ' +
              'Хуурамч мөр/багананы зардал = 0.</p>'
      }));
    }

    // Steps
    result.steps.forEach((step, idx) => {
      const stepDiv = el('div', { class: 'step' });
      const header = el('div', { class: 'step-header' });
      header.appendChild(el('span', { class: 'step-badge iter' }, 'Алхам ' + (idx + 1)));
      header.appendChild(el('span', { class: 'step-title' },
        '(' + result.input.supplyNames[step.row] + ' → ' +
        result.input.demandNames[step.col] + ')   ' +
        step.amount.toString() + ' нэгж'
      ));
      stepDiv.appendChild(header);

      stepDiv.appendChild(el('p', { html: step.note }));

      // For VAM, show penalty info
      if (step.penalties) {
        const penDiv = el('div', { class: 'panel info' });
        penDiv.appendChild(el('div', { class: 'panel-title' }, '◇ Зөрүүний тооцоолол'));
        const pTbl = el('table', { class: 'tableau', style: { width: 'auto', fontSize: '12px' } });
        const tb = el('tbody');
        const trA = el('tr');
        trA.appendChild(el('td', { class: 'row-label' }, 'Мөр:'));
        for (let i = 0; i < step.penalties.row.length; i++) {
          trA.appendChild(el('td', {},
            step.penalties.row[i] ? step.penalties.row[i].toString() : '—'));
        }
        tb.appendChild(trA);
        const trB = el('tr');
        trB.appendChild(el('td', { class: 'row-label' }, 'Багана:'));
        for (let j = 0; j < step.penalties.col.length; j++) {
          trB.appendChild(el('td', {},
            step.penalties.col[j] ? step.penalties.col[j].toString() : '—'));
        }
        tb.appendChild(trB);
        pTbl.appendChild(tb);
        penDiv.appendChild(pTbl);
        stepDiv.appendChild(penDiv);
      }

      wrap.appendChild(stepDiv);
    });

    // Final allocation table
    wrap.appendChild(el('h3', {
      class: 'subsection',
      style: { marginTop: '24px' }
    }, '◈ Анхдагч хувилбар (' + result.method + ')'));
    wrap.appendChild(renderAllocationTable(result.alloc, result.input));

    // Total cost summary
    const sumGrid = el('div', { class: 'solution-grid' });
    const cc = el('div', { class: 'solution-card' });
    cc.appendChild(el('div', { class: 'solution-label' }, 'Нийт зардал (' + result.method + ')'));
    cc.appendChild(el('div', { class: 'solution-value gold' }, result.totalCost.toString()));
    sumGrid.appendChild(cc);
    wrap.appendChild(sumGrid);

    // Optimize button
    const optActions = el('div', { class: 'action-bar' });
    optActions.appendChild(el('button', {
      class: 'btn btn-primary',
      onClick: () => {
        const optResult = T.modi(result);
        renderModiSolution(optResult, container);
      }
    }, '⇒ MODI аргаар оптимумчлох'));
    optActions.appendChild(el('button', {
      class: 'btn btn-secondary',
      onClick: () => window.LP.exportPDF(container, 'transport-' + result.method + '.pdf')
    }, '⬇ PDF татах'));
    wrap.appendChild(optActions);

    container.appendChild(wrap);
  }

  // -----------------------------
  // Render MODI iterations
  // -----------------------------
  function renderModiSolution(result, container) {
    container.innerHTML = '';
    const wrap = el('div');

    wrap.appendChild(el('h2', { class: 'section-title' },
      el('span', { class: 'step-num' }, 'MODI'),
      'U-V аргаар оптимумчлал'
    ));

    // Show initial
    wrap.appendChild(el('div', {
      class: 'panel info',
      html: '<div class="panel-title">◇ Эхний хувилбар</div>' +
            '<p><b>' + result.initial.method + '</b> аргаар олсон анхдагч хувилбар. ' +
            'Нийт зардал: <b>' + result.initial.totalCost.toString() + '</b>.</p>' +
            '<p>Одоо MODI аргаар (u, v утгуудыг олж, бууруулах боломжтой нүдийг хайх) сайжруулна.</p>'
    }));

    result.iterations.forEach((iter, idx) => {
      if (iter.kind !== 'iter') return;
      const stepDiv = el('div', { class: 'step' });
      const header = el('div', { class: 'step-header' });
      header.appendChild(el('span', {
        class: 'step-badge ' + (iter.optimal ? 'final' : 'iter')
      }, iter.optimal ? 'Эцсийн' : ('Iter ' + iter.iter)));
      header.appendChild(el('span', { class: 'step-title' },
        iter.optimal ? 'Бүх dᵢⱼ ≥ 0 — оптимум' : 'u, v утгуудыг олох + бууруулах нүд хайх'
      ));
      stepDiv.appendChild(header);

      // Allocation table with u/v rows
      stepDiv.appendChild(renderAllocationTableUV(
        iter.alloc, iter.basic, result.input,
        iter.u, iter.v, iter.reduced,
        iter.enterCell, iter.loop
      ));

      if (iter.fail) {
        stepDiv.appendChild(el('div', {
          class: 'panel danger',
          html: '<p>' + iter.fail + '</p>'
        }));
      } else if (iter.optimal) {
        stepDiv.appendChild(el('div', {
          class: 'panel success',
          html: '<div class="panel-title">✓ Оптимум олдов</div>' +
                '<p>Бүх non-basic нүдний бууруулсан зардал dᵢⱼ = cᵢⱼ − (uᵢ + vⱼ) ≥ 0. ' +
                'Энэ хувилбараас илүү сайжруулах боломжгүй.</p>'
        }));
      } else if (iter.enterCell) {
        const [ei, ej] = iter.enterCell;
        const [li, lj] = iter.leaveCell;
        stepDiv.appendChild(el('div', {
          class: 'panel warn',
          html: '<div class="panel-title">◇ Гогцоо ба шилжүүлэлт</div>' +
                '<p>Хамгийн их сөрөг dᵢⱼ = <b>' + iter.enterReduced.toString() + '</b> нүд: <b>(' +
                result.input.supplyNames[ei] + ' → ' + result.input.demandNames[ej] +
                ')</b>. Энэ нүд орох суурь болно.</p>' +
                '<p>θ = ' + iter.theta.toString() + ' (хамгийн бага хасах нүдний хуваарилалт). ' +
                'Гарах суурь: <b>(' + result.input.supplyNames[li] + ' → ' +
                result.input.demandNames[lj] + ')</b>.</p>'
        }));
      }

      wrap.appendChild(stepDiv);
    });

    // Final summary
    wrap.appendChild(el('h3', { class: 'subsection', style: { marginTop: '24px' } },
      '◈ Эцсийн оптимум хувилбар'));
    wrap.appendChild(renderAllocationTable(result.alloc, result.input));

    const sumGrid = el('div', { class: 'solution-grid' });
    const cInit = el('div', { class: 'solution-card' });
    cInit.appendChild(el('div', { class: 'solution-label' },
      'Анхдагч (' + result.initial.method + ')'));
    cInit.appendChild(el('div', { class: 'solution-value' }, result.initial.totalCost.toString()));
    sumGrid.appendChild(cInit);
    const cOpt = el('div', { class: 'solution-card' });
    cOpt.appendChild(el('div', { class: 'solution-label' }, 'Оптимум (MODI)'));
    cOpt.appendChild(el('div', { class: 'solution-value accent' }, result.totalCost.toString()));
    sumGrid.appendChild(cOpt);
    const savings = result.initial.totalCost.sub(result.totalCost);
    if (!savings.isZero()) {
      const cSav = el('div', { class: 'solution-card' });
      cSav.appendChild(el('div', { class: 'solution-label' }, 'Хэмнэлт'));
      cSav.appendChild(el('div', { class: 'solution-value gold' }, savings.toString()));
      sumGrid.appendChild(cSav);
    }
    wrap.appendChild(sumGrid);

    const conc = el('div', { class: 'panel success' });
    conc.appendChild(el('div', { class: 'panel-title' }, '✓ Эдийн засгийн дүгнэлт'));
    if (savings.isZero()) {
      conc.appendChild(el('p', {
        html: '<b>' + result.initial.method + '</b> аргаар олсон анхдагч хувилбар <b>аль хэдийн оптимум</b> байжээ. ' +
              'MODI шалгалтаар бүх dᵢⱼ ≥ 0 болсныг баталгаажуулсан.'
      }));
    } else {
      conc.appendChild(el('p', {
        html: '<b>' + result.iterations.filter(i => i.kind==='iter' && !i.optimal).length +
              '</b> алхмаар нийт зардлыг <b>' + result.initial.totalCost.toString() +
              '</b>-аас <b>' + result.totalCost.toString() + '</b> болгон бууруулсан. ' +
              'Хэмнэлт: <b>' + savings.toString() + '</b> нэгж.'
      }));
    }
    wrap.appendChild(conc);

    const actions = el('div', { class: 'action-bar' });
    actions.appendChild(el('button', {
      class: 'btn btn-secondary',
      onClick: () => window.LP.exportPDF(container, 'transport-modi.pdf')
    }, '⬇ PDF татах'));
    wrap.appendChild(actions);

    container.appendChild(wrap);
  }

  // -----------------------------
  // Render allocation table (basic, no u/v)
  // -----------------------------
  function renderAllocationTable(alloc, input) {
    const m = input.supply.length;
    const n = input.demand.length;
    const wrap = el('div', { style: { overflowX: 'auto', margin: '12px 0' } });
    const tbl = el('table', { class: 'tp-table' });

    const thead = el('thead');
    const trh = el('tr');
    trh.appendChild(el('th', {}, ''));
    for (let j = 0; j < n; j++) trh.appendChild(el('th', {}, input.demandNames[j]));
    trh.appendChild(el('th', { style: { background: 'var(--bg-subtle)' } }, 'Нийлүүлэлт'));
    thead.appendChild(trh);
    tbl.appendChild(thead);

    const tbody = el('tbody');
    for (let i = 0; i < m; i++) {
      const tr = el('tr');
      tr.appendChild(el('th', {}, input.supplyNames[i]));
      for (let j = 0; j < n; j++) {
        const isAlloc = !alloc[i][j].isZero();
        const td = el('td', {
          class: 'tp-cell' + (isAlloc ? ' allocated' : ' empty'),
        });
        td.appendChild(el('span', { class: 'tp-cost' }, input.cost[i][j].toString()));
        if (isAlloc) {
          td.appendChild(el('span', { class: 'tp-alloc' }, alloc[i][j].toString()));
        }
        tr.appendChild(td);
      }
      tr.appendChild(el('td', { class: 'tp-supply' }, input.supply[i].toString()));
      tbody.appendChild(tr);
    }
    const trD = el('tr');
    trD.appendChild(el('th', { style: { background: 'var(--bg-subtle)' } }, 'Эрэлт'));
    for (let j = 0; j < n; j++) {
      trD.appendChild(el('td', { class: 'tp-demand' }, input.demand[j].toString()));
    }
    // Total
    let total = F(0);
    for (let i = 0; i < m; i++)
      for (let j = 0; j < n; j++)
        if (!alloc[i][j].isZero()) total = total.add(alloc[i][j].mul(input.cost[i][j]));
    trD.appendChild(el('td', {
      style: {
        background: 'var(--accent-bg)',
        textAlign: 'center',
        fontWeight: '700',
        color: 'var(--accent)',
      }
    }, 'Z = ' + total.toString()));
    tbody.appendChild(trD);
    tbl.appendChild(tbody);
    wrap.appendChild(tbl);
    return wrap;
  }

  // -----------------------------
  // Render allocation table with u/v rows + reduced costs (MODI)
  // -----------------------------
  function renderAllocationTableUV(alloc, basic, input, u, v, reduced, enterCell, loop) {
    const m = input.supply.length;
    const n = input.demand.length;
    const wrap = el('div', { style: { overflowX: 'auto', margin: '12px 0' } });
    const tbl = el('table', { class: 'tp-table' });

    const loopSet = new Set();
    if (loop) loop.forEach(([li, lj]) => loopSet.add(li + ',' + lj));
    const loopSign = {};
    if (loop) loop.forEach(([li, lj], idx) => {
      loopSign[li + ',' + lj] = idx % 2 === 0 ? '+' : '−';
    });

    const thead = el('thead');
    const trh = el('tr');
    trh.appendChild(el('th', {}, ''));
    for (let j = 0; j < n; j++) trh.appendChild(el('th', {}, input.demandNames[j]));
    trh.appendChild(el('th', { style: { background: 'var(--bg-subtle)' } }, 'Нийлүүлэлт'));
    if (u) trh.appendChild(el('th', {
      style: { background: 'var(--accent-bg)', color: 'var(--accent)' }
    }, 'uᵢ'));
    thead.appendChild(trh);
    tbl.appendChild(thead);

    const tbody = el('tbody');
    for (let i = 0; i < m; i++) {
      const tr = el('tr');
      tr.appendChild(el('th', {}, input.supplyNames[i]));
      for (let j = 0; j < n; j++) {
        const isBasic = basic[i][j];
        const isEnter = enterCell && enterCell[0] === i && enterCell[1] === j;
        const inLoop = loopSet.has(i + ',' + j);
        const sign = loopSign[i + ',' + j];
        const td = el('td', {
          class: 'tp-cell' + (isBasic ? ' allocated' : '') + (isEnter ? ' pivot' : ''),
          style: inLoop ? {
            border: '2px solid var(--gold)',
            background: 'var(--gold-bg)'
          } : {}
        });
        td.appendChild(el('span', { class: 'tp-cost' }, input.cost[i][j].toString()));
        if (isBasic && !alloc[i][j].isZero()) {
          td.appendChild(el('span', { class: 'tp-alloc' }, alloc[i][j].toString()));
        } else if (isBasic) {
          // epsilon basic
          td.appendChild(el('span', {
            class: 'tp-alloc',
            style: { color: 'var(--ink-muted)', fontSize: '14px' }
          }, 'ε'));
        } else if (reduced && reduced[i][j]) {
          // Show reduced cost
          const dval = reduced[i][j];
          td.appendChild(el('span', {
            style: {
              display: 'block',
              paddingTop: '16px',
              fontSize: '13px',
              fontWeight: '500',
              color: dval.isNeg() ? 'var(--rust)' : 'var(--ink-muted)',
            }
          }, 'dᵢⱼ=' + dval.toString()));
        }
        if (sign) {
          td.appendChild(el('span', {
            style: {
              position: 'absolute', top: '4px', right: '6px',
              fontSize: '14px', fontWeight: '700',
              color: sign === '+' ? 'var(--accent)' : 'var(--rust)'
            }
          }, sign));
        }
        tr.appendChild(td);
      }
      tr.appendChild(el('td', { class: 'tp-supply' }, input.supply[i].toString()));
      if (u) tr.appendChild(el('td', {
        style: {
          background: 'var(--accent-bg)',
          color: 'var(--accent)',
          textAlign: 'center',
          fontWeight: '700',
        }
      }, u[i].toString()));
      tbody.appendChild(tr);
    }
    const trD = el('tr');
    trD.appendChild(el('th', { style: { background: 'var(--bg-subtle)' } }, 'Эрэлт'));
    for (let j = 0; j < n; j++) {
      trD.appendChild(el('td', { class: 'tp-demand' }, input.demand[j].toString()));
    }
    trD.appendChild(el('td', { style: { background: 'var(--bg-subtle)' } }, ''));
    if (u) trD.appendChild(el('td', { style: { background: 'var(--bg-subtle)' } }, ''));
    tbody.appendChild(trD);

    if (v) {
      const trV = el('tr');
      trV.appendChild(el('th', {
        style: { background: 'var(--accent-bg)', color: 'var(--accent)' }
      }, 'vⱼ'));
      for (let j = 0; j < n; j++) {
        trV.appendChild(el('td', {
          style: {
            background: 'var(--accent-bg)',
            color: 'var(--accent)',
            textAlign: 'center',
            fontWeight: '700',
          }
        }, v[j].toString()));
      }
      trV.appendChild(el('td', { style: { background: 'var(--bg-subtle)' } }, ''));
      if (u) trV.appendChild(el('td', { style: { background: 'var(--bg-subtle)' } }, ''));
      tbody.appendChild(trV);
    }

    tbl.appendChild(tbody);
    wrap.appendChild(tbl);
    return wrap;
  }

  // Expose
  window.LP = window.LP || {};
  window.LP.buildTransportInput = buildTransportInput;
  window.LP.renderTransportSolution = renderTransportSolution;
  window.LP.renderModiSolution = renderModiSolution;
  window.LP.renderAllocationTable = renderAllocationTable;
  window.LP._renderModiTable = renderAllocationTableUV;
})();
