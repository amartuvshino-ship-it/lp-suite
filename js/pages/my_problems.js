// =============================================================================
// MY PROBLEMS PAGE — list of saved problems
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const App = window.LP.App;
  const Storage = window.LP.Storage;
  const Frac = window.LP.Frac;
  const subscriptDigits = window.LP.subscriptDigits;

  // Method labels
  const METHOD_LABELS = {
    simplex: 'Симплекс',
    bigm: 'Big-M',
    graphical: 'Графикийн',
    matrix: 'Матрицын',
    duality: 'Хосмог',
  };

  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const time = String(d.getHours()).padStart(2, '0') + ':' +
                 String(d.getMinutes()).padStart(2, '0');
    if (isToday) return 'Өнөөдөр ' + time;
    if (isYesterday) return 'Өчигдөр ' + time;
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0') + ' ' + time;
  }

  // Format an LP brief (e.g. "max 50x₁+40x₂, 2 хязгаарлалт")
  function formatBrief(lp) {
    const obj = lp.objective || 'max';
    const vc = lp.c.length, mc = lp.b.length;
    return obj + ', ' + vc + ' хувьсагч × ' + mc + ' хязгаарлалт';
  }

  // Convert serialized LP back to Frac-typed
  function deserializeLP(s) {
    return {
      objective: s.objective,
      c: s.c.map(v => Frac.from(v)),
      A: s.A.map(row => row.map(v => Frac.from(v))),
      ops: s.ops.slice(),
      b: s.b.map(v => Frac.from(v)),
      varNames: s.varNames ? s.varNames.slice() : null,
      nonneg: s.nonneg ? s.nonneg.slice() : null,
    };
  }

  App.register('my_problems', main => {
    main.appendChild(el('div', {
      html: '<h1 class="page-title">Миний <em>бодлогууд</em></h1>' +
            '<p class="page-subtitle">Хадгалсан бодлогууд. Товшоод ачааллана. ' +
            'Танай хөтөч (browser)-д хадгалагддаг учир бусад төхөөрөмжид харагдахгүй.</p>'
    }));

    const list = Storage.list();

    if (list.length === 0) {
      const empty = el('div', { class: 'empty-state' });
      empty.appendChild(el('div', { class: 'empty-state-icon' }, '☆'));
      empty.appendChild(el('div', { class: 'empty-state-title' }, 'Хадгалсан бодлого алга'));
      empty.appendChild(el('div', { class: 'empty-state-text' },
        'Симплекс, Графикийн, Матрицын эсвэл Хосмог хуудсанд орж бодлогын ' +
        'формоо бөглөөд "☆ Хадгалах" товчийг дарж эхний бодлогоо нэмээрэй.'
      ));
      empty.appendChild(el('button', {
        class: 'btn btn-primary',
        onClick: () => App.go('simplex')
      }, 'Симплекс хуудас руу очих →'));
      main.appendChild(empty);
      return;
    }

    // List header
    const header = el('div', {
      class: 'card',
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
    });
    header.appendChild(el('div', {},
      el('div', { style: { fontSize: '14px', color: 'var(--ink-muted)' } },
        list.length + ' бодлого хадгалагдсан')
    ));
    header.appendChild(el('button', {
      class: 'btn btn-secondary',
      onClick: () => {
        if (confirm('БҮХ хадгалсан бодлогыг устгах уу? Энэ үйлдлийг буцаах боломжгүй.')) {
          Storage.clear();
          App.go('my_problems');
        }
      }
    }, '🗑 Бүгдийг устгах'));
    main.appendChild(header);

    // List
    const ul = el('div', { class: 'saved-list' });
    list.forEach(rec => {
      const item = el('div', { class: 'saved-item' });

      const content = el('div', {
        class: 'saved-content',
        onClick: () => openProblem(rec)
      });
      content.appendChild(el('div', { class: 'saved-name' }, rec.name));
      const meta = el('div', { class: 'saved-meta' });
      meta.appendChild(el('span', {
        class: 'saved-method-tag'
      }, METHOD_LABELS[rec.method] || rec.method));
      meta.appendChild(el('span', {}, formatBrief(rec.lp)));
      meta.appendChild(el('span', {}, '·'));
      meta.appendChild(el('span', {}, formatDate(rec.created)));
      content.appendChild(meta);
      item.appendChild(content);

      const actions = el('div', { class: 'saved-actions' });
      actions.appendChild(el('button', {
        onClick: () => openProblem(rec)
      }, 'Нээх'));
      actions.appendChild(el('button', {
        class: 'danger',
        onClick: () => {
          if (confirm('"' + rec.name + '" бодлогыг устгах уу?')) {
            Storage.delete(rec.id);
            App.go('my_problems');
          }
        }
      }, 'Устгах'));
      item.appendChild(actions);

      ul.appendChild(item);
    });
    main.appendChild(ul);
  });

  function openProblem(rec) {
    // Convert serialized LP to typed LP, set as pending example, navigate
    const lp = {
      objective: rec.lp.objective,
      c: rec.lp.c.map(v => window.LP.Frac.from(v)),
      A: rec.lp.A.map(row => row.map(v => window.LP.Frac.from(v))),
      ops: rec.lp.ops.slice(),
      b: rec.lp.b.map(v => window.LP.Frac.from(v)),
      varNames: rec.lp.varNames ? rec.lp.varNames.slice() : null,
      nonneg: rec.lp.nonneg ? rec.lp.nonneg.slice() : null,
    };
    window.LP._pendingExample = { method: rec.method, lp: lp };
    window.LP.App.go(rec.method);
  }

  // Expose for testing
  window.LP._myProblemsOpen = openProblem;
})();
