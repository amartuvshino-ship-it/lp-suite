// =============================================================================
// ENRICH — номын бичвэрийг интерактив болгох давхарга
// =============================================================================
// Юу хийдэг вэ:
//   1. Дотоод эшлэлийг холбоос болгоно  — «Бүлэг 8», «Хэсэг 3.4», «Зураг 3.2»,
//      «Хүснэгт 1.1» дээр дархад тухайн газар руу шууд үсэрнэ.
//   2. Кейсийн нэрийг дархад бодлогын өгөгдөл popup-аар гарна.
//   3. Нэр томьёог хулганаар зааж/дархад тодорхойлолт нь гарна.
//
// Ашиглалт:  LP.Enrich.text(node, str)  — текстийг баяжуулж node-д хийнэ
//            LP.Enrich.anchorId(headingText)  — гарчгийн якорь id
// =============================================================================
(function () {
  'use strict';

  const el = window.LP.el;

  // ---------------------------------------------------------------------------
  // Кейсийн сан — popup-д гарах бодлогын бүрэн өгөгдөл
  // ---------------------------------------------------------------------------
  const CASES = {
    'Модон урлал': {
      title: '«Модон урлал» ХХК',
      sub: 'Номын гол кейс — Бүлэг 2.7, 3.5, 4.5, 5, 7.6-д давтан гарна',
      story: 'Компани ширээ, сандал хийдэг. Агуулахад 100 м³ мод, долоо хоногт '
           + '80 цагийн хүчин чадал бий. Ширээний ашиг 50,000₮, сандлын ашиг 40,000₮.',
      vars: [['x₁', 'Үйлдвэрлэх ширээний тоо'], ['x₂', 'Үйлдвэрлэх сандлын тоо']],
      model: ['Z = 50000x₁ + 40000x₂ → max',
              '4x₁ + 2x₂ ≤ 100     (мод, м³)',
              '2x₁ + 4x₂ ≤ 80      (цаг)',
              'x₁ ≥ 0,  x₂ ≥ 0'],
      table: [['Үзүүлэлт', 'Ширээ (x₁)', 'Сандал (x₂)', 'Боломжит нөөц'],
              ['Мод (м³)', '4', '2', '100'],
              ['Цаг', '2', '4', '80'],
              ['Ашиг (₮)', '50,000', '40,000', '—']],
      answer: 'x₁ = 20 ширээ,  x₂ = 10 сандал,  Z = 1,400,000₮. '
            + 'Мод ба цаг хоёулаа 100% ашиглагдана (илүүдэлгүй).',
      corners: [['A (0, 0)', '0'], ['B (25, 0)', '1,250,000'],
                ['C (0, 20)', '800,000'], ['D (20, 10)', '1,400,000  ← оновчтой']],
      tool: 'graphical',
    },
    'Хиам': {
      title: '«Хиам» ХХК',
      sub: 'Диетийн (min) бодлого — Бүлэг 2.8, 6.6',
      story: 'Хиамны найрлагад хамгийн бага зардлаар шаардлагатай уураг, өөх тосыг '
           + 'хангах хоёр төрлийн түүхий эдийг хослуулна.',
      vars: [['x₁', 'Нэгдүгээр түүхий эдийн хэмжээ (кг)'],
             ['x₂', 'Хоёрдугаар түүхий эдийн хэмжээ (кг)']],
      model: ['Z = 4x₁ + 3x₂ → min', 'x₁ + x₂ ≥ 6', '2x₁ + x₂ ≥ 8', 'x₁, x₂ ≥ 0'],
      answer: 'x₁ = 2, x₂ = 4, Z = 22. Big-M аргаар Бүлэг 6.6-д бүрэн бодсон.',
      tool: 'bigm',
    },
    'Гоо Мебель': {
      title: '«Гоо Мебель» ХХК',
      sub: 'Дасгал 3, Бүлэг 3',
      story: 'Шкаф, ширээ үйлдвэрлэдэг. Нэг шкафт 6 м³ мод, 3 цаг; нэг ширээнд '
           + '3 м³ мод, 6 цаг зарцуулагдана. Ашиг: шкаф 80,000₮, ширээ 60,000₮.',
      vars: [['x₁', 'Шкафны тоо'], ['x₂', 'Ширээний тоо']],
      model: ['Z = 80000x₁ + 60000x₂ → max', '6x₁ + 3x₂ ≤ 90  (мод)',
              '3x₁ + 6x₂ ≤ 72  (цаг)', 'x₁, x₂ ≥ 0'],
      answer: 'x₁ = 12 шкаф, x₂ = 6 ширээ, Z = 1,320,000₮.',
      tool: 'graphical',
    },
    'Норов': {
      title: '«Норов» ХХК',
      sub: 'Шийдгүй бодлогын жишээ — Дасгал 7, Бүлэг 3',
      story: 'Нягтлан бодогч хоорондоо зөрчилдсөн хоёр хязгаарлалт бичсэн.',
      model: ['x₁ + x₂ ≤ 15    (уургийн хязгаар)',
              'x₁ + x₂ ≥ 25    (эрчим хүчний хязгаар)', 'x₁, x₂ ≥ 0'],
      answer: 'Боломжит муж хоосон — шийдгүй (Infeasible). Нэг тоо зэрэг ≤ 15 бас '
            + '≥ 25 байх боломжгүй.',
      tool: 'graphical',
    },
  };

  // ---------------------------------------------------------------------------
  // Эшлэл таних загварууд
  // ---------------------------------------------------------------------------
  //  Бүлэг 8 · Бүлэг 8.4 · Хэсэг 3.4 · Хэсэг 3.6.1 · Зураг 3.2 · Хүснэгт 1.1
  const XREF = /(Бүлэг|Хэсэг|Зураг|Хүснэгт)\s+(\d{1,2})(?:\.(\d{1,2}))?(?:\.(\d{1,2}))?/g;
  // Кейсийн нэрийг зөвхөн бүтэн үг байхад л таних (Хиамны → таарахгүй)
  const LETTER = 'A-Za-zА-Яа-яӨөҮүЁё';
  const CASE_RE = new RegExp(
    '«?(' + Object.keys(CASES)
      .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') +
    ')»?(?![' + LETTER + '])', 'g');
  const PREV_OK = new RegExp('[' + LETTER + ']');

  // ---------------------------------------------------------------------------
  // Якорь
  // ---------------------------------------------------------------------------
  function slug(s) {
    return String(s).trim().toLowerCase()
      .replace(/[^\wа-яөүёa-z0-9.]+/gi, '-').replace(/^-+|-+$/g, '');
  }

  function anchorId(headingText) {
    const m = String(headingText).match(/^(\d+(?:\.\d+)*)/);
    return m ? 'sec-' + m[1] : 'h-' + slug(headingText).slice(0, 40);
  }

  // ---------------------------------------------------------------------------
  // Эшлэл рүү шилжих
  // ---------------------------------------------------------------------------
  function lessonForSection(ch, sec) {
    const C = window.LP.Curriculum || [];
    let fallback = null;
    for (const l of C) {
      if (l.ch !== ch) continue;
      if (!fallback) fallback = l;
      if (l.sections === 'all') return l;
      if (sec && Array.isArray(l.sections)) {
        for (const s of l.sections) {
          if (sec === s || sec.indexOf(s + '.') === 0) return l;
        }
      }
    }
    return fallback;
  }

  function scrollToAnchor(id, tries) {
    tries = tries == null ? 24 : tries;
    const node = document.getElementById(id);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      node.classList.add('xref-flash');
      setTimeout(() => node.classList.remove('xref-flash'), 1800);
      return;
    }
    if (tries > 0) setTimeout(() => scrollToAnchor(id, tries - 1), 120);
  }

  function goto(kind, ch, a, b) {
    const sec = a ? (ch + '.' + a + (b ? '.' + b : '')) : null;
    if (kind === 'Зураг' || kind === 'Хүснэгт') {
      const l = lessonForSection(ch, sec);
      const id = (kind === 'Зураг' ? 'fig-' : 'tab-') + ch + '.' + (a || '');
      if (l) {
        window.LP.App.go('lesson', { n: l.n });
        setTimeout(() => scrollToAnchor(id), 260);
      }
      return;
    }
    const l = lessonForSection(ch, sec);
    if (!l) return;
    window.LP.App.go('lesson', { n: l.n });
    if (sec) setTimeout(() => scrollToAnchor('sec-' + sec), 260);
    else setTimeout(() => {
      const m = document.querySelector('.lesson-body');
      if (m) m.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 260);
  }

  // ---------------------------------------------------------------------------
  // Кейсийн popup
  // ---------------------------------------------------------------------------
  function openCase(key) {
    const c = CASES[key];
    if (!c) return;
    const back = el('div', { class: 'modal-back', onClick: (e) => {
      if (e.target === back) close();
    } });
    const box = el('div', { class: 'modal case-modal', role: 'dialog',
                            'aria-label': c.title });

    const head = el('div', { class: 'case-head' });
    const ttl = el('div', {});
    ttl.appendChild(el('div', { class: 'case-title' }, c.title));
    ttl.appendChild(el('div', { class: 'case-sub' }, c.sub));
    head.appendChild(ttl);
    head.appendChild(el('button', { class: 'modal-x', title: 'Хаах (Esc)',
                                    onClick: close }, '✕'));
    box.appendChild(head);

    const body = el('div', { class: 'case-body' });

    body.appendChild(el('div', { class: 'case-label' }, 'Бизнесийн нөхцөл'));
    body.appendChild(el('p', { class: 'case-story' }, c.story));

    if (c.table) {
      body.appendChild(el('div', { class: 'case-label' }, 'Өгөгдөл'));
      const wrap = el('div', { class: 'book-table-wrap' });
      const t = el('table', { class: 'book-table' });
      const th = el('thead'), trh = el('tr');
      c.table[0].forEach(x => trh.appendChild(el('th', {}, x)));
      th.appendChild(trh); t.appendChild(th);
      const tb = el('tbody');
      c.table.slice(1).forEach(r => {
        const tr = el('tr');
        r.forEach(x => tr.appendChild(el('td', {}, x)));
        tb.appendChild(tr);
      });
      t.appendChild(tb); wrap.appendChild(t); body.appendChild(wrap);
    }

    if (c.vars) {
      body.appendChild(el('div', { class: 'case-label' }, 'Шийдвэрийн хувьсагч'));
      const ul = el('ul', { class: 'case-vars' });
      c.vars.forEach(([k, v]) => {
        const li = el('li');
        li.appendChild(el('code', {}, k));
        li.appendChild(document.createTextNode(' — ' + v));
        ul.appendChild(li);
      });
      body.appendChild(ul);
    }

    body.appendChild(el('div', { class: 'case-label' }, 'Математик загвар'));
    const pre = el('pre', { class: 'case-model' }, c.model.join('\n'));
    body.appendChild(pre);

    if (c.corners) {
      body.appendChild(el('div', { class: 'case-label' }, 'Оройн цэгүүд'));
      const wrap = el('div', { class: 'book-table-wrap' });
      const t = el('table', { class: 'book-table' });
      const th = el('thead'), trh = el('tr');
      ['Оройн цэг', 'Z (₮)'].forEach(x => trh.appendChild(el('th', {}, x)));
      th.appendChild(trh); t.appendChild(th);
      const tb = el('tbody');
      c.corners.forEach(r => {
        const tr = el('tr');
        r.forEach(x => tr.appendChild(el('td', {}, x)));
        if (/оновчтой/.test(r[1])) tr.className = 'row-opt';
        tb.appendChild(tr);
      });
      t.appendChild(tb); wrap.appendChild(t); body.appendChild(wrap);
    }

    const ans = el('div', { class: 'case-answer' });
    ans.appendChild(el('strong', {}, 'Хариу: '));
    ans.appendChild(document.createTextNode(c.answer));
    body.appendChild(ans);

    box.appendChild(body);

    const foot = el('div', { class: 'case-foot' });
    if (c.tool) {
      foot.appendChild(el('button', { class: 'btn btn-primary', onClick: () => {
        close(); window.LP.App.go(c.tool);
      } }, '→ Энэ бодлогыг сайт дээр бодох'));
    }
    foot.appendChild(el('button', { class: 'btn btn-ghost', onClick: close }, 'Хаах'));
    box.appendChild(foot);

    back.appendChild(box);
    document.body.appendChild(back);
    document.addEventListener('keydown', onKey);

    function onKey(e) { if (e.key === 'Escape') close(); }
    function close() {
      document.removeEventListener('keydown', onKey);
      if (back.parentNode) back.parentNode.removeChild(back);
    }
  }

  // ---------------------------------------------------------------------------
  // Нэр томьёоны тайлбар
  // ---------------------------------------------------------------------------
  let TERMS = null;
  function terms() {
    if (TERMS) return TERMS;
    TERMS = {};
    (window.LP.BookTerms || []).forEach(t => {
      if (t.mn && t.def) TERMS[t.mn.toLowerCase()] = t;
    });
    return TERMS;
  }

  // ---------------------------------------------------------------------------
  // Гол функц — текстийг баяжуулж элемент дотор байрлуулна
  // ---------------------------------------------------------------------------
  // Нэг хуудсанд нэг кейс хэт олон удаа товч болж гарахаас сэргийлнэ
  let caseSeen = {};
  const CASE_LIMIT = 3;
  function resetScope() { caseSeen = {}; }

  function enrichText(node, str) {
    // 1) кейсийн нэр, 2) эшлэл — хоёуланг нэг удаагийн ажиллагаагаар
    const marks = [];
    let m;
    XREF.lastIndex = 0;
    while ((m = XREF.exec(str)) !== null) {
      marks.push({ s: m.index, e: m.index + m[0].length, kind: 'xref', m: m.slice() });
    }
    CASE_RE.lastIndex = 0;
    while ((m = CASE_RE.exec(str)) !== null) {
      const s = m.index, e = m.index + m[0].length;
      if (s > 0 && PREV_OK.test(str[s - 1])) continue;   // үгийн дунд байвал алгасна
      if (marks.some(k => s < k.e && e > k.s)) continue;
      const seen = (caseSeen[m[1]] || 0);
      if (seen >= CASE_LIMIT) continue;
      caseSeen[m[1]] = seen + 1;
      marks.push({ s: s, e: e, kind: 'case', key: m[1], txt: m[0] });
    }
    if (!marks.length) { node.appendChild(document.createTextNode(str)); return node; }
    marks.sort((a, b) => a.s - b.s);

    let pos = 0;
    marks.forEach(k => {
      if (k.s < pos) return;
      if (k.s > pos) node.appendChild(document.createTextNode(str.slice(pos, k.s)));
      if (k.kind === 'xref') {
        const [full, kind, ch, a, b] = k.m;
        const chn = parseInt(ch, 10);
        if (chn >= 1 && chn <= 10) {
          const link = el('a', {
            class: 'xref', href: '#',
            title: 'Очих: ' + full,
            onClick: (e) => { e.preventDefault(); goto(kind, chn, a, b); },
          }, full);
          node.appendChild(link);
        } else {
          node.appendChild(document.createTextNode(full));
        }
      } else {
        node.appendChild(el('button', {
          class: 'case-chip', type: 'button',
          title: 'Бодлогын өгөгдлийг харах',
          onClick: () => openCase(k.key),
        }, k.txt));
      }
      pos = k.e;
    });
    if (pos < str.length) node.appendChild(document.createTextNode(str.slice(pos)));
    return node;
  }

  window.LP = window.LP || {};
  window.LP.Enrich = {
    text: enrichText,
    resetScope: resetScope,
    anchorId: anchorId,
    openCase: openCase,
    cases: CASES,
    goto: goto,
    scrollTo: scrollToAnchor,
  };
})();
