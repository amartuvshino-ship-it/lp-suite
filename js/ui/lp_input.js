// =============================================================================
// LP INPUT BUILDER — reusable form for Simplex / Big-M / Graphical / etc.
// =============================================================================
// Renders a configurable LP problem input form with:
//   - Variable count stepper (n)
//   - Constraint count stepper (m)
//   - Objective toggle (max/min)
//   - Coefficient grid for objective + constraints
//   - Sign pickers (<=, >=, =)
//   - Non-negativity checkboxes per variable
//   - Toggles: fraction/decimal display, short/long detail
//   - Solve / Reset buttons
// =============================================================================

(function () {
  'use strict';
  const el = window.LP.el;
  const Frac = window.LP.Frac;
  const Settings = window.LP.Settings;
  const subscriptDigits = window.LP.subscriptDigits;

  function buildLPInput(container, opts) {
    const cfg = Object.assign({
      title: 'Симплекс арга',
      subtitle: 'Бодлогынхоо өгөгдлийг доорх формд оруулаад "Бодох" товч дарна уу.',
      allowedOps: ['<=', '>=', '='],
      defaultOp: '<=',
      objective: 'max',
      initial: null,
      maxVars: 10,
      maxConstraints: 15,
      onSolve: null,
      methodKey: 'simplex',
    }, opts);

    const state = {
      nVars: 2,
      nCons: 2,
      objective: cfg.objective,
      c: [], A: [], ops: [], b: [], nonneg: [],
    };

    function ensureSize() {
      while (state.c.length < state.nVars) state.c.push('0');
      state.c.length = state.nVars;
      while (state.nonneg.length < state.nVars) state.nonneg.push(true);
      state.nonneg.length = state.nVars;
      while (state.A.length < state.nCons) state.A.push([]);
      state.A.length = state.nCons;
      for (let i = 0; i < state.nCons; i++) {
        while (state.A[i].length < state.nVars) state.A[i].push('0');
        state.A[i].length = state.nVars;
      }
      while (state.ops.length < state.nCons) state.ops.push(cfg.defaultOp);
      state.ops.length = state.nCons;
      while (state.b.length < state.nCons) state.b.push('0');
      state.b.length = state.nCons;
    }

    if (cfg.initial) {
      state.nVars = cfg.initial.c.length;
      state.nCons = cfg.initial.b.length;
      state.objective = cfg.initial.objective || 'max';
      state.c = cfg.initial.c.map(String);
      state.A = cfg.initial.A.map(r => r.map(String));
      state.ops = cfg.initial.ops.slice();
      state.b = cfg.initial.b.map(String);
      state.nonneg = cfg.initial.nonneg
        ? cfg.initial.nonneg.slice()
        : new Array(state.nVars).fill(true);
    }
    ensureSize();

    function render() {
      container.innerHTML = '';
      // Header
      container.appendChild(el('div', {},
        el('h1', { class: 'page-title' },
          cfg.title.split(' ')[0] + ' ',
          el('em', {}, cfg.title.split(' ').slice(1).join(' ') || '')
        ),
        el('p', { class: 'page-subtitle' }, cfg.subtitle)
      ));

      const card = el('div', { class: 'lp-builder' });

      // Section 1: dimensions & objective
      const sec1 = el('div', { class: 'builder-section' });
      sec1.appendChild(el('div', { class: 'builder-section-title' }, 'Хэмжээ ба зорилго'));

      const stepper = (val, min, max, onChange) => {
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
      };

      sec1.appendChild(el('div', { class: 'form-row' },
        el('label', { class: 'form-label' }, 'Хувьсагчийн тоо (n):'),
        stepper(state.nVars, 2, cfg.maxVars, v => { state.nVars = v; ensureSize(); render(); })
      ));
      sec1.appendChild(el('div', { class: 'form-row' },
        el('label', { class: 'form-label' }, 'Хязгаарлалтын тоо (m):'),
        stepper(state.nCons, 1, cfg.maxConstraints, v => { state.nCons = v; ensureSize(); render(); })
      ));

      const objWrap = el('div', { class: 'form-row' });
      objWrap.appendChild(el('label', { class: 'form-label' }, 'Зорилго:'));
      const pill = el('div', { class: 'pill-toggle' });
      const maxBtn = el('button', {
        class: state.objective === 'max' ? 'active' : '',
        onClick: () => { state.objective = 'max'; render(); }
      }, 'max (Z → ↑)');
      const minBtn = el('button', {
        class: state.objective === 'min' ? 'active' : '',
        onClick: () => { state.objective = 'min'; render(); }
      }, 'min (Z → ↓)');
      pill.appendChild(maxBtn); pill.appendChild(minBtn);
      objWrap.appendChild(pill);
      sec1.appendChild(objWrap);
      card.appendChild(sec1);

      // Section 2: objective function
      const sec2 = el('div', { class: 'builder-section' });
      sec2.appendChild(el('div', { class: 'builder-section-title' }, 'Зорилгын функц (Z)'));

      const zRow = el('div', { class: 'constraint-row' });
      zRow.appendChild(el('span', {
        class: 'var-label',
        style: { minWidth: '40px', textAlign: 'right' }
      }, 'Z ='));
      for (let j = 0; j < state.nVars; j++) {
        if (j > 0) zRow.appendChild(el('span', { class: 'plus' }, '+'));
        zRow.appendChild(el('input', {
          class: 'input input-num', type: 'text', value: state.c[j],
          onInput: e => { state.c[j] = e.target.value; }
        }));
        zRow.appendChild(el('span', { class: 'var-label', html: subscriptDigits('x_' + (j + 1)) }));
      }
      zRow.appendChild(el('span', { class: 'var-label' }, '→'));
      zRow.appendChild(el('span', { style: { fontWeight: '700' } }, state.objective));
      sec2.appendChild(zRow);
      card.appendChild(sec2);

      // Section 3: constraints
      const sec3 = el('div', { class: 'builder-section' });
      sec3.appendChild(el('div', { class: 'builder-section-title' }, 'Хязгаарлалтуудын систем'));

      for (let i = 0; i < state.nCons; i++) {
        const row = el('div', { class: 'constraint-row' });
        row.appendChild(el('span', {
          class: 'var-label',
          style: { minWidth: '40px', textAlign: 'right' }
        }, '(' + (i + 1) + ')'));
        for (let j = 0; j < state.nVars; j++) {
          if (j > 0) row.appendChild(el('span', { class: 'plus' }, '+'));
          row.appendChild(el('input', {
            class: 'input input-num', type: 'text', value: state.A[i][j],
            onInput: e => { state.A[i][j] = e.target.value; }
          }));
          row.appendChild(el('span', { class: 'var-label', html: subscriptDigits('x_' + (j + 1)) }));
        }
        const sign = el('select', {
          class: 'sign-select',
          onChange: e => { state.ops[i] = e.target.value; }
        });
        for (const op of cfg.allowedOps) {
          const o = el('option', { value: op }, op === '<=' ? '≤' : op === '>=' ? '≥' : '=');
          if (state.ops[i] === op) o.selected = true;
          sign.appendChild(o);
        }
        row.appendChild(sign);
        row.appendChild(el('input', {
          class: 'input input-num', type: 'text', value: state.b[i],
          onInput: e => { state.b[i] = e.target.value; }
        }));
        sec3.appendChild(row);
      }
      card.appendChild(sec3);

      // Section 4: nonneg / sign restrictions
      const sec4 = el('div', { class: 'builder-section' });
      sec4.appendChild(el('div', { class: 'builder-section-title' }, 'Хувьсагчийн тэмдгийн нөхцөл'));
      const sec4row = el('div', { class: 'form-row', style: { gap: '24px', flexWrap: 'wrap' } });
      for (let j = 0; j < state.nVars; j++) {
        const lab = el('label', {
          class: 'flex items-center gap-2',
          style: { cursor: 'pointer' }
        });
        const cb = el('input', {
          type: 'checkbox',
          onChange: e => { state.nonneg[j] = e.target.checked; }
        });
        cb.checked = state.nonneg[j];
        lab.appendChild(cb);
        lab.appendChild(el('span', {
          class: 'font-mono',
          style: { fontSize: '13px' },
          html: subscriptDigits('x_' + (j + 1)) + ' ≥ 0'
        }));
        sec4row.appendChild(lab);
      }
      sec4.appendChild(sec4row);
      sec4.appendChild(el('div', { class: 'form-help' },
        'Тэмдэглэхгүй (uncheck) бол хувьсагчийг сөрөг ч авч болно. ' +
        'Сөрөг тоог зөвшөөрвөл x = x⁺ − x⁻ задралд оруулах болно.'
      ));
      card.appendChild(sec4);

      // Action bar (toggles + buttons)
      const actions = el('div', { class: 'action-bar' });

      const detailToggle = el('div', { class: 'pill-toggle' });
      const sBtn = el('button', {
        class: Settings.detailLevel === 'short' ? 'active' : '',
        onClick: () => {
          Settings.detailLevel = 'short';
          sBtn.classList.add('active'); lBtn.classList.remove('active');
        }
      }, 'Богино тайлбар');
      const lBtn = el('button', {
        class: Settings.detailLevel === 'long' ? 'active' : '',
        onClick: () => {
          Settings.detailLevel = 'long';
          lBtn.classList.add('active'); sBtn.classList.remove('active');
        }
      }, 'Дэлгэрэнгүй');
      detailToggle.appendChild(sBtn); detailToggle.appendChild(lBtn);

      const fracToggle = el('div', { class: 'pill-toggle' });
      const fBtn = el('button', {
        class: Settings.numberDisplay === 'fraction' ? 'active' : '',
        onClick: () => {
          Settings.numberDisplay = 'fraction';
          fBtn.classList.add('active'); dBtn.classList.remove('active');
        }
      }, '½ Бутархай');
      const dBtn = el('button', {
        class: Settings.numberDisplay === 'decimal' ? 'active' : '',
        onClick: () => {
          Settings.numberDisplay = 'decimal';
          dBtn.classList.add('active'); fBtn.classList.remove('active');
        }
      }, '0.5 Десимал');
      fracToggle.appendChild(fBtn); fracToggle.appendChild(dBtn);

      actions.appendChild(detailToggle);
      actions.appendChild(fracToggle);
      actions.appendChild(el('div', { class: 'spacer' }));
      actions.appendChild(el('button', {
        class: 'btn btn-secondary',
        onClick: () => doReset()
      }, 'Цэвэрлэх'));
      actions.appendChild(el('button', {
        class: 'btn btn-secondary',
        title: 'Тухайн хувьсагч/хязгаарлалтын тоонд тохирсон санамсаргүй жишээ үүсгэнэ',
        onClick: () => doFillRandom()
      }, '🎲 Жишээгээр дүүргэх'));
      actions.appendChild(el('button', {
        class: 'btn btn-secondary',
        onClick: () => doSave()
      }, '☆ Хадгалах'));
      actions.appendChild(el('button', {
        class: 'btn btn-primary btn-lg',
        onClick: () => doSolve()
      }, '▸ Бодох'));
      card.appendChild(actions);

      container.appendChild(card);
      container.appendChild(el('div', { id: 'lp-output' }));
    }

    function doReset() {
      state.c = state.c.map(() => '0');
      state.A = state.A.map(r => r.map(() => '0'));
      state.b = state.b.map(() => '0');
      render();
      const out = container.querySelector('#lp-output');
      if (out) out.innerHTML = '';
    }

    function buildLP() {
      try {
        const c = state.c.map(v => Frac.from(v || '0'));
        const A = state.A.map(r => r.map(v => Frac.from(v || '0')));
        const b = state.b.map(v => Frac.from(v || '0'));
        return {
          objective: state.objective,
          c: c, A: A, b: b,
          ops: state.ops.slice(),
          varNames: Array.from({ length: state.nVars }, (_, i) => 'x_' + (i + 1)),
          nonneg: state.nonneg.slice(),
        };
      } catch (e) {
        alert('Алдаа: ' + e.message + '. Тоонуудаа шалгана уу.');
        return null;
      }
    }

    function doSolve() {
      const lp = buildLP();
      if (!lp) return;
      const out = container.querySelector('#lp-output');
      out.innerHTML = '';
      if (cfg.onSolve) cfg.onSolve(lp, out);
    }

    function doSave() {
      const lp = buildLP();
      if (!lp) return;
      if (window.LP.openSaveDialog) {
        window.LP.openSaveDialog(lp, cfg.methodKey || 'simplex');
      }
    }

    function doFillRandom() {
      if (!window.LP.generateLP) {
        alert('Үүсгэгч модуль ачаалагдаагүй байна.');
        return;
      }
      // Use current dimensions and objective
      const generated = window.LP.generateLP({
        nVars: state.nVars,
        nCons: state.nCons,
        objective: state.objective,
        allowedOps: cfg.allowedOps,
        defaultOp: cfg.defaultOp,
        methodKey: cfg.methodKey,
      });
      // Apply to state
      state.c = generated.c.slice();
      state.A = generated.A.map(r => r.slice());
      state.ops = generated.ops.slice();
      state.b = generated.b.slice();
      state.nonneg = generated.nonneg.slice();
      ensureSize();
      render();
      const out = container.querySelector('#lp-output');
      if (out) out.innerHTML = '';
      if (window.LP.showToast) {
        window.LP.showToast('🎲 Шинэ санамсаргүй жишээ үүслээ');
      }
    }

    render();
    return { state: state, render: render, buildLP: buildLP };
  }

  window.LP = window.LP || {};
  window.LP.buildLPInput = buildLPInput;
})();
