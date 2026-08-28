// =============================================================================
// TEACHER — Оюутны явцын самбар (багш ба админ)
// =============================================================================
// 16 долоо хоногийн лекц / дадлагын явцыг оюутан тус бүрээр харуулна.
// Өгөгдөл: LP.Auth.allProgress() → [{ id, username, name, role,
//                                     lectures, practices, progress }]
// =============================================================================
(function () {
  'use strict';

  const el   = window.LP.el;
  const App  = window.LP.App;
  const Auth = window.LP.Auth;
  const LESSONS = window.LP.Curriculum || [];
  const N = LESSONS.length || 16;

  App.register('teacher', main => {
    main.appendChild(el('div', {
      html: '<h1 class="page-title">Оюутны <em>явц</em></h1>' +
            '<p class="page-subtitle">16 долоо хоногийн лекц ба дадлагын гүйцэтгэл. ' +
            'Зөвхөн багш, админ харна.</p>'
    }));

    const statCard = el('div', { class: 'card card-tight' });
    const listCard = el('div', { class: 'card' });
    main.appendChild(statCard);
    main.appendChild(listCard);

    let rows = [];
    let sortBy = 'name';
    let onlyStudents = true;

    load();

    function load() {
      listCard.innerHTML = '';
      listCard.appendChild(el('div', { class: 'loading' }, 'Ачаалж байна…'));
      Auth.allProgress()
        .then(r => { rows = r || []; render(); })
        .catch(e => {
          listCard.innerHTML = '';
          listCard.appendChild(el('p', { class: 'auth-error' }, e.message));
        });
    }

    function view() {
      let r = rows.slice();
      if (onlyStudents) r = r.filter(x => x.role === 'student');
      const done = x => x.lectures + x.practices;
      if (sortBy === 'name') r.sort((a, b) => String(a.name).localeCompare(String(b.name), 'mn'));
      if (sortBy === 'progress') r.sort((a, b) => done(b) - done(a));
      if (sortBy === 'behind') r.sort((a, b) => done(a) - done(b));
      return r;
    }

    function render() {
      const r = view();
      const tot = N * 2;

      // ---- Хураангуй ----
      statCard.innerHTML = '';
      const sum = r.reduce((a, x) => a + x.lectures + x.practices, 0);
      const avg = r.length ? Math.round(sum / r.length / tot * 100) : 0;
      const started = r.filter(x => x.lectures + x.practices > 0).length;
      const finished = r.filter(x => x.lectures + x.practices >= tot).length;
      const row = el('div', { class: 'stat-row' });
      [['Оюутан', r.length],
       ['Эхэлсэн', started],
       ['Дуусгасан', finished],
       ['Дундаж явц', avg + '%']].forEach(([k, v]) => {
        const s = el('div', { class: 'stat-tile' });
        s.appendChild(el('div', { class: 'stat-value' }, String(v)));
        s.appendChild(el('div', { class: 'stat-label' }, k));
        row.appendChild(s);
      });
      statCard.appendChild(row);

      // ---- Хяналтын мөр ----
      listCard.innerHTML = '';
      const head = el('div', { class: 'list-head' });
      head.appendChild(el('h3', { class: 'subsection', style: { margin: 0 } },
        'Жагсаалт (' + r.length + ')'));
      const pill = el('div', { class: 'pill-toggle' });
      [['name', 'Нэрээр'], ['progress', 'Явцаар'], ['behind', 'Хоцорсноор']].forEach(([k, lbl]) => {
        pill.appendChild(el('button', {
          class: sortBy === k ? 'active' : '',
          onClick: () => { sortBy = k; render(); }
        }, lbl));
      });
      head.appendChild(pill);
      listCard.appendChild(head);

      const filt = el('label', { class: 'role-legend', style: { cursor: 'pointer' } });
      const cb = el('input', { type: 'checkbox', onChange: e => { onlyStudents = e.target.checked; render(); } });
      cb.checked = onlyStudents;
      filt.appendChild(cb);
      filt.appendChild(el('span', {}, 'Зөвхөн оюутан харуулах'));
      listCard.appendChild(filt);

      if (!r.length) {
        listCard.appendChild(el('div', { class: 'empty-state' },
          el('div', { class: 'empty-state-icon' }, '📊'),
          el('div', { class: 'empty-state-text' }, 'Мэдээлэл алга.')));
        return;
      }

      // ---- Оюутан тус бүр ----
      r.forEach(u => {
        const card = el('div', { class: 'prog-row' });

        const top = el('div', { class: 'user-main' });
        const nameLine = el('div', { class: 'user-name' });
        nameLine.appendChild(el('span', {}, u.name || u.username));
        nameLine.appendChild(el('span', { class: 'user-uname' }, '@' + u.username));
        if (u.role === 'teacher') nameLine.appendChild(el('span', { class: 'tag tag-teacher' }, 'Багш'));
        if (u.role === 'admin')   nameLine.appendChild(el('span', { class: 'tag tag-admin' }, 'Админ'));
        top.appendChild(nameLine);

        const pct = Math.round((u.lectures + u.practices) / (N * 2) * 100);
        top.appendChild(el('div', { class: 'user-meta' },
          'Лекц ' + u.lectures + '/' + N + ' · Дадлага ' + u.practices + '/' + N +
          ' · ' + pct + '%'));
        card.appendChild(top);

        // 16 долоо хоногийн жижиг сүлжээ
        const grid = el('div', { class: 'wk-grid' });
        for (let i = 1; i <= N; i++) {
          const lec = !!u.progress['l' + i + '.lecture'];
          const pra = !!u.progress['l' + i + '.practice'];
          const cls = lec && pra ? 'both' : (lec || pra ? 'half' : '');
          const cell = el('span', {
            class: 'wk' + (cls ? ' ' + cls : ''),
            title: 'Долоо хоног ' + i +
                   (lec ? ' · лекц ✓' : ' · лекц —') +
                   (pra ? ' · дадлага ✓' : ' · дадлага —'),
          }, String(i));
          grid.appendChild(cell);
        }
        card.appendChild(grid);
        listCard.appendChild(card);
      });

      const legend = el('div', { class: 'role-legend' });
      [['both', 'хоёулаа'], ['half', 'нэг нь'], ['', 'хийгээгүй']].forEach(([c, t]) => {
        const w = el('span', { class: 'role-legend-item' });
        w.appendChild(el('span', { class: 'wk' + (c ? ' ' + c : ''), style: { width: '18px' } }, ''));
        w.appendChild(el('span', {}, t));
        legend.appendChild(w);
      });
      listCard.appendChild(legend);

      // ---- CSV гаргах ----
      const bar = el('div', { class: 'action-bar' });
      bar.appendChild(el('button', {
        class: 'btn btn-ghost',
        onClick: () => exportCsv(r)
      }, '⭳ CSV болгон татах'));
      bar.appendChild(el('button', { class: 'btn btn-ghost', onClick: load }, '↺ Шинэчлэх'));
      listCard.appendChild(bar);
    }

    function exportCsv(r) {
      const head = ['Нэвтрэх нэр', 'Овог нэр', 'Эрх', 'Лекц', 'Дадлага', 'Хувь'];
      for (let i = 1; i <= N; i++) head.push('DH' + i);
      const lines = [head.join(',')];
      r.forEach(u => {
        const pct = Math.round((u.lectures + u.practices) / (N * 2) * 100);
        const c = [u.username, '"' + String(u.name || '').replace(/"/g, '""') + '"',
                   Auth.roleLabel(u.role), u.lectures, u.practices, pct];
        for (let i = 1; i <= N; i++) {
          const lec = u.progress['l' + i + '.lecture'] ? 'Л' : '';
          const pra = u.progress['l' + i + '.practice'] ? 'Д' : '';
          c.push(lec + pra || '-');
        }
        lines.push(c.join(','));
      });
      const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'lp-yavts-' + new Date().toISOString().slice(0, 10) + '.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    }
  });
})();
