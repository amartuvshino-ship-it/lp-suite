// =============================================================================
// GLOSSARY — нэр томьёоны толь
// =============================================================================
// • ҮЗЭХ    — хэн ч (бүртгэлгүй хэрэглэгч ч)
// • НЭМЭХ / ЗАСАХ / УСТГАХ — зөвхөн нэвтэрсэн хэрэглэгч
//
// Хоёр эх сурвалж:
//   1. Номын суурь толь (LP.BookTerms) — 118 нэр томьёо, устгагдахгүй
//   2. Хэрэглэгчийн нэмсэн нэр томьёо  — LP.Data.glossary
// =============================================================================
(function () {
  'use strict';
  const el     = window.LP.el;
  const App    = window.LP.App;
  const Data   = window.LP.Data;
  const Auth   = window.LP.Auth;
  const Access = window.LP.Access;

  App.register('glossary', main => {
    let userEntries = [];
    let editingId = null;
    let query = '';
    let filterGroup = 'all';
    let source = 'all';          // 'all' | 'book' | 'mine'

    main.appendChild(el('div', {
      html: '<h1 class="page-title">Нэр томьёоны <em>толь</em></h1>' +
            '<p class="page-subtitle">Сурах бичгийн стандарт толь (' +
            (window.LP.BookTerms || []).length + ' нэр томьёо) ба хэрэглэгчийн нэмсэн ' +
            'тайлбарууд. Үзэхэд бүртгэл шаардахгүй.</p>'
    }));

    const noticeCard = el('div');
    const formCard   = el('div', { class: 'card' });
    const listCard   = el('div', { class: 'card' });
    main.appendChild(noticeCard);
    main.appendChild(formCard);
    main.appendChild(listCard);

    function canEdit() { return Access.can('glossary.edit'); }

    function reload() {
      return Data.glossary.list().then(arr => {
        userEntries = Array.isArray(arr) ? arr : [];
        render();
      }).catch(() => { userEntries = []; render(); });
    }

    function render() { renderNotice(); renderForm(); renderList(); }

    // -----------------------------------------------------------------------
    function renderNotice() {
      noticeCard.innerHTML = '';
      if (canEdit()) return;
      const box = el('div', { class: 'info-note' });
      box.appendChild(el('span', {}, '👁 Та зочин горимд байна — толийг чөлөөтэй үзэж, хайж болно. ' +
        'Шинэ нэр томьёо нэмэх, засах, устгахад нэвтэрсэн байх шаардлагатай. '));
      box.appendChild(el('button', {
        class: 'btn btn-ghost btn-xs',
        onClick: () => window.LP.AuthUI.openLogin(() => { window.LP.AuthUI.refreshChrome(); reload(); })
      }, 'Нэвтрэх'));
      noticeCard.appendChild(box);
    }

    // -----------------------------------------------------------------------
    function renderForm() {
      formCard.innerHTML = '';
      formCard.style.display = canEdit() ? '' : 'none';
      if (!canEdit()) return;

      const editing = editingId ? userEntries.find(e => e.id === editingId) : null;
      formCard.appendChild(el('h3', { class: 'subsection' },
        editing ? '✎ Нэр томьёо засах' : '＋ Шинэ нэр томьёо нэмэх'));

      const err = el('div', { class: 'auth-error', style: { display: 'none' } });
      formCard.appendChild(err);

      const grid = el('div', { class: 'admin-form-grid' });
      function fld(label, value, placeholder) {
        const w = el('div', { class: 'auth-field' });
        w.appendChild(el('label', { class: 'form-label' }, label));
        const i = el('input', { class: 'input', type: 'text', placeholder: placeholder || '' });
        i.value = value || '';
        w.appendChild(i);
        grid.appendChild(w);
        return i;
      }
      const mn = fld('Монгол нэр томьёо *', editing && editing.term_mn, 'Сүүдрийн үнэ');
      const en = fld('Гадаад нэр томьёо', editing && editing.term_en, 'Shadow Price');

      const chWrap = el('div', { class: 'auth-field' });
      chWrap.appendChild(el('label', { class: 'form-label' }, 'Холбогдох бүлэг'));
      const chSel = el('select', { class: 'input' });
      chSel.appendChild(el('option', { value: '0' }, '— сонгоогүй —'));
      for (let i = 1; i <= 10; i++) {
        chSel.appendChild(el('option', { value: String(i) },
          'Бүлэг ' + i + '. ' + window.LP.Book.TITLES[i]));
      }
      chSel.value = String((editing && editing.chapter) || 0);
      chWrap.appendChild(chSel);
      grid.appendChild(chWrap);
      formCard.appendChild(grid);

      const dWrap = el('div', { class: 'auth-field' });
      dWrap.appendChild(el('label', { class: 'form-label' }, 'Тайлбар *'));
      const def = el('textarea', {
        class: 'input', rows: '3', style: { width: '100%' },
        placeholder: 'Нөөцийн нэг нэгж нэмэгдэхэд зорилгын функц хэдээр өөрчлөгдөхийг заана.'
      });
      def.value = (editing && editing.definition) || '';
      dWrap.appendChild(def);
      formCard.appendChild(dWrap);

      const bar = el('div', { class: 'action-bar' });
      bar.appendChild(el('button', {
        class: 'btn btn-primary',
        onClick: () => {
          const payload = {
            term_mn: mn.value.trim(),
            term_en: en.value.trim(),
            definition: def.value.trim(),
            chapter: Number(chSel.value) || 0,
            author_id: (Auth.currentUser() || {}).id || '',
            author_name: (Auth.currentUser() || {}).name || '',
          };
          if (!payload.term_mn || !payload.definition) {
            err.textContent = 'Нэр томьёо ба тайлбарыг бөглөнө үү.';
            err.style.display = 'block';
            return;
          }
          const p = editing ? Data.glossary.update(editing.id, payload) : Data.glossary.add(payload);
          p.then(() => {
            window.LP.showToast(editing ? '✓ Засагдлаа' : '✓ Нэмэгдлээ');
            editingId = null;
            reload();
          }).catch(e => { err.textContent = e.message; err.style.display = 'block'; });
        }
      }, editing ? 'Хадгалах' : '＋ Нэмэх'));
      if (editing) {
        bar.appendChild(el('button', {
          class: 'btn btn-ghost', onClick: () => { editingId = null; render(); }
        }, 'Болих'));
      }
      formCard.appendChild(bar);
    }

    // -----------------------------------------------------------------------
    function allTerms() {
      const book = (window.LP.BookTerms || []).map((t, i) => ({
        id: 'b' + i, kind: 'book',
        term_mn: t.mn, term_en: t.en, definition: t.def,
        symbol: t.sym, group: t.g, chapter: t.ch,
      }));
      const mine = userEntries.map(e => ({
        id: e.id, kind: 'user',
        term_mn: e.term_mn || e.term || '',
        term_en: e.term_en || '',
        definition: e.definition || '',
        symbol: '',
        group: e.chapter ? ('Бүлэг ' + e.chapter) : 'Хэрэглэгчийн',
        chapter: e.chapter || 0,
        author_name: e.author_name || '',
        created_at: e.created_at,
      }));
      return book.concat(mine);
    }

    function renderList() {
      listCard.innerHTML = '';

      const head = el('div', { class: 'list-head' });
      head.appendChild(el('h3', { class: 'subsection', style: { margin: 0 } }, 'Толь'));
      const s = el('input', {
        class: 'input', type: 'search', placeholder: 'Монгол эсвэл англиар хайх…',
        style: { maxWidth: '260px' },
        onInput: e => { query = e.target.value.toLowerCase().trim(); renderRows(); }
      });
      s.value = query;
      head.appendChild(s);
      listCard.appendChild(head);

      const srcPill = el('div', { class: 'pill-toggle', style: { marginBottom: '8px' } });
      [['all', 'Бүгд'], ['book', 'Номын толь'], ['mine', 'Нэмсэн']].forEach(([v, label]) => {
        srcPill.appendChild(el('button', {
          class: source === v ? 'active' : '',
          onClick: () => { source = v; renderList(); }
        }, label));
      });
      listCard.appendChild(srcPill);

      const groups = Array.from(new Set(allTerms().map(t => t.group))).filter(Boolean);
      const chips = el('div', { class: 'chip-row' });
      chips.appendChild(el('button', {
        class: 'chip' + (filterGroup === 'all' ? ' on' : ''),
        onClick: () => { filterGroup = 'all'; renderList(); }
      }, 'Бүх бүлэг'));
      groups.forEach(g => {
        chips.appendChild(el('button', {
          class: 'chip' + (filterGroup === g ? ' on' : ''),
          onClick: () => { filterGroup = g; renderList(); }
        }, g));
      });
      listCard.appendChild(chips);

      const box = el('div', { class: 'term-list' });
      listCard.appendChild(box);

      function renderRows() {
        box.innerHTML = '';
        let items = allTerms();
        if (source !== 'all') {
          items = items.filter(t => (source === 'book' ? t.kind === 'book' : t.kind === 'user'));
        }
        if (filterGroup !== 'all') items = items.filter(t => t.group === filterGroup);
        if (query) {
          items = items.filter(t =>
            t.term_mn.toLowerCase().includes(query) ||
            t.term_en.toLowerCase().includes(query) ||
            (t.definition || '').toLowerCase().includes(query));
        }
        items.sort((a, b) => a.term_mn.localeCompare(b.term_mn, 'mn'));

        box.appendChild(el('div', { class: 'form-help', style: { marginBottom: '8px' } },
          items.length + ' нэр томьёо'));

        if (!items.length) {
          box.appendChild(el('div', { class: 'empty-state' },
            el('div', { class: 'empty-state-text' }, 'Илэрц олдсонгүй.')));
          return;
        }

        items.forEach(t => {
          const row = el('div', { class: 'term-row' });

          const mainCol = el('div', { class: 'term-main' });
          const line = el('div', { class: 'term-line' });
          line.appendChild(el('span', { class: 'term-mn' }, t.term_mn));
          if (t.term_en) line.appendChild(el('span', { class: 'term-en' }, t.term_en));
          if (t.symbol) line.appendChild(el('span', { class: 'term-sym' }, t.symbol));
          if (t.kind === 'user') line.appendChild(el('span', { class: 'tag tag-user' }, 'нэмсэн'));
          mainCol.appendChild(line);
          if (t.definition) mainCol.appendChild(el('div', { class: 'term-def' }, t.definition));
          const meta = [];
          if (t.chapter) meta.push('Бүлэг ' + t.chapter);
          if (t.author_name) meta.push(t.author_name);
          if (meta.length) mainCol.appendChild(el('div', { class: 'term-meta' }, meta.join(' · ')));
          row.appendChild(mainCol);

          if (t.kind === 'user' && canEdit()) {
            const acts = el('div', { class: 'term-actions' });
            acts.appendChild(el('button', {
              class: 'btn btn-ghost btn-xs',
              onClick: () => { editingId = t.id; render(); window.scrollTo(0, 0); }
            }, 'Засах'));
            acts.appendChild(el('button', {
              class: 'btn btn-ghost btn-xs danger',
              onClick: () => {
                if (!confirm('"' + t.term_mn + '"-г устгах уу?')) return;
                Data.glossary.remove(t.id).then(reload);
              }
            }, 'Устгах'));
            row.appendChild(acts);
          } else if (t.kind === 'book') {
            row.appendChild(el('div', { class: 'term-actions' },
              el('span', { class: 'term-locked', title: 'Сурах бичгийн стандарт толь' }, '📘')));
          }

          box.appendChild(row);
        });
      }
      renderRows();
    }

    reload();
  });
})();
