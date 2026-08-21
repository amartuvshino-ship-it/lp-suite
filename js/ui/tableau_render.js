// =============================================================================
// TABLEAU RENDERER — draws a single simplex tableau snapshot
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const subscriptDigits = window.LP.subscriptDigits;

  function renderTableau(step, options) {
    options = options || {};
    const wrap = el('div', { class: 'tableau-wrap' });
    const table = el('table', { class: 'tableau' });

    const colNames = step.varNames.map(v => subscriptDigits(v));

    // Header
    const thead = el('thead');
    const trh = el('tr');
    trh.appendChild(el('th', { class: 'row-label' }, 'Суурь'));
    for (let j = 0; j < step.totalCols; j++) {
      const cls = (step.enterCol === j) ? 'entering-col-header' : '';
      const th = el('th', { class: cls });
      th.innerHTML = colNames[j];
      trh.appendChild(th);
    }
    trh.appendChild(el('th', {}, 'RHS'));
    if (step.ratios) trh.appendChild(el('th', {}, 'Харьцаа'));
    thead.appendChild(trh);
    table.appendChild(thead);

    // Body
    const tbody = el('tbody');
    for (let i = 0; i < step.tableau.length; i++) {
      const tr = el('tr');
      const isLeavingRow = (step.leaveRow === i);
      const td = el('td', { class: 'row-label' + (isLeavingRow ? ' leaving-row-label' : '') });
      td.innerHTML = colNames[step.basis[i]];
      tr.appendChild(td);

      for (let j = 0; j < step.totalCols; j++) {
        const v = step.tableau[i][j];
        const classes = [];
        if (j === step.enterCol) classes.push('pivot-col');
        if (i === step.leaveRow) classes.push('pivot-row');
        if (j === step.enterCol && i === step.leaveRow) {
          classes.length = 0; classes.push('pivot-cell');
        }
        if (v.isNeg()) classes.push('neg');
        if (v.isZero()) classes.push('zero-cell');
        tr.appendChild(el('td', { class: classes.join(' ') }, v.toString()));
      }
      const rhsVal = step.tableau[i][step.totalCols];
      tr.appendChild(el('td', { class: 'rhs' }, rhsVal.toString()));
      if (step.ratios) {
        const r = step.ratios[i];
        tr.appendChild(el('td', { class: 'ratio' }, r === null ? '—' : r.toString()));
      }
      tbody.appendChild(tr);
    }

    // Z row
    const zr = el('tr', { class: 'z-row' });
    zr.appendChild(el('td', { class: 'row-label' }, 'Z'));
    for (let j = 0; j < step.totalCols; j++) {
      const num = step.zRow.num[j];
      const mc  = step.zRow.mc[j];
      let display;
      if (mc.isZero()) display = num.toString();
      else if (num.isZero()) display = mc.toString() + 'M';
      else {
        display = mc.toString() + 'M ' + (num.isNeg() ? '−' : '+') + ' ' +
                  (num.isNeg() ? num.neg().toString() : num.toString());
      }
      const classes = [];
      if (j === step.enterCol) classes.push('pivot-col');
      if (num.isNeg() && mc.isZero()) classes.push('neg');
      zr.appendChild(el('td', { class: classes.join(' ') }, display));
    }
    const zNum = step.zRow.num[step.totalCols];
    const zMc  = step.zRow.mc[step.totalCols];
    let zDisplay;
    if (zMc.isZero()) zDisplay = zNum.toString();
    else if (zNum.isZero()) zDisplay = zMc.toString() + 'M';
    else {
      zDisplay = zMc.toString() + 'M ' + (zNum.isNeg() ? '−' : '+') + ' ' +
                 (zNum.isNeg() ? zNum.neg().toString() : zNum.toString());
    }
    zr.appendChild(el('td', { class: 'rhs' }, zDisplay));
    if (step.ratios) zr.appendChild(el('td', {}, ''));
    tbody.appendChild(zr);

    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  window.LP = window.LP || {};
  window.LP.renderTableau = renderTableau;
})();
