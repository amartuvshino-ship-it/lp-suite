// =============================================================================
// STATS — Админы статистик самбар
// =============================================================================
// Өгөгдөл: LP.Auth.stats() → сервер (эсвэл локал) талд бэлтгэсэн нэгтгэл.
// Бүх график цэвэр SVG-ээр зурагдана — гадаад сан ашиглахгүй.
//
// Өнгө: --viz-1 ногоон (лекц), --viz-2 индиго (дадлага), --viz-3 алт (гуравдагч).
// Эдгээр нь contrast, өнгө ялгах чадвар (CVD) шалгуурыг давсан утгууд.
// =============================================================================
(function () {
  'use strict';

  const el   = window.LP.el;
  const App  = window.LP.App;
  const Auth = window.LP.Auth;
  const NS   = 'http://www.w3.org/2000/svg';

  const C1 = '#3E8E41';   // ногоон — лекц
  const C2 = '#4A5FBF';   // индиго — дадлага
  const C3 = '#D08C1E';   // алт — гуравдагч
  const GRID = '#E5E3D9', INK = '#4A4A4A', MUTE = '#7A7A7A';
  // Ногоон дараалсан шат (бага → их)
  const RAMP = ['#DCE9DA', '#BBD8B6', '#95C48E', '#6DAE66', '#4F9B4B', '#3E8E41'];

  // ---------------------------------------------------------------------------
  // SVG туслахууд
  // ---------------------------------------------------------------------------
  function svg(w, h, cls) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    s.setAttribute('width', '100%');
    s.setAttribute('class', 'viz ' + (cls || ''));
    s.setAttribute('role', 'img');
    return s;
  }
  function mk(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, attrs) {
    const t = mk('text', Object.assign({
      x: x, y: y, fill: MUTE, 'font-size': 10,
      'font-family': 'inherit',
    }, attrs || {}), parent);
    t.textContent = s;
    return t;
  }
  // Дээд ирмэг нь бөөрөнхий, суурьтаа наалдсан багана
  function bar(parent, x, y, w, h, fill, r) {
    if (h <= 0) return null;
    r = Math.min(r === undefined ? 4 : r, w / 2, h);
    const d = 'M' + x + ',' + (y + h) +
              'L' + x + ',' + (y + r) +
              'Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
              'L' + (x + w - r) + ',' + y +
              'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) +
              'L' + (x + w) + ',' + (y + h) + 'Z';
    return mk('path', { d: d, fill: fill }, parent);
  }
  function hbar(parent, x, y, w, h, fill, r) {
    if (w <= 0) return null;
    r = Math.min(r === undefined ? 4 : r, h / 2, w);
    const d = 'M' + x + ',' + y +
              'L' + (x + w - r) + ',' + y +
              'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) +
              'L' + (x + w) + ',' + (y + h - r) +
              'Q' + (x + w) + ',' + (y + h) + ' ' + (x + w - r) + ',' + (y + h) +
              'L' + x + ',' + (y + h) + 'Z';
    return mk('path', { d: d, fill: fill }, parent);
  }
  function tip(node, text) {
    const t = document.createElementNS(NS, 'title');
    t.textContent = text;
    node.appendChild(t);
  }

  // Тэнхлэгийн хуваарь — үргэлж бүхэл тоо, давхардахгүй
  function ticks(max) {
    max = Math.max(1, Math.ceil(max));
    const want = 4;
    let step = Math.ceil(max / want);
    const nice = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
    for (const n of nice) { if (n >= step) { step = n; break; } }
    const top = Math.ceil(max / step) * step;
    const out = [];
    for (let v = 0; v <= top; v += step) out.push(v);
    return { top: top, values: out };
  }

  function card(title, hint) {
    const c = el('div', { class: 'card viz-card' });
    const h = el('div', { class: 'viz-head' });
    h.appendChild(el('h3', { class: 'subsection', style: { margin: 0 } }, title));
    if (hint) h.appendChild(el('span', { class: 'viz-hint' }, hint));
    c.appendChild(h);
    return c;
  }
  function legend(items) {
    const w = el('div', { class: 'viz-legend' });
    items.forEach(([color, label]) => {
      const i = el('span', { class: 'viz-leg-item' });
      i.appendChild(el('span', { class: 'viz-swatch', style: { background: color } }));
      i.appendChild(el('span', {}, label));
      w.appendChild(i);
    });
    return w;
  }
  function empty(msg) {
    return el('div', { class: 'viz-empty' }, msg || 'Одоогоор өгөгдөл алга.');
  }
  const nf = n => Number(n || 0).toLocaleString('en-US');

  // Хуудасны кодыг уншигдахуйц нэр рүү
  const ROUTE_MN = {
    home: 'Эхлэл', examples: 'Бэлэн жишээ', formulation: 'Бодлогын тавилт',
    graphical: 'Графикийн арга', matrix: 'Матрицын арга', simplex: 'Симплекс арга',
    bigm: 'Big-M арга', duality: 'Хосмог бодлого', transport_table: 'Тээвэр — хүснэгт',
    transport_network: 'Тээвэр — сүлжээ', integer: 'Бүхэл тоон', glossary: 'Нэр томьёо',
    lessons: 'Хичээлийн жагсаалт', lesson: 'Хичээл үзсэн', my_problems: 'Миний бодлогууд',
    settings: 'Тохиргоо', account: 'Профайл', teacher: 'Оюутны явц',
    admin: 'Админ самбар', stats: 'Статистик',
  };

  // ===========================================================================
  App.register('stats', main => {
    main.appendChild(el('div', {
      html: '<h1 class="page-title">Статистик</h1>' +
            '<p class="page-subtitle">Хэрэглэгч, хичээлийн явц, идэвх, агуулгын ' +
            'бүрэн зураглал. Зөвхөн админ харна.</p>'
    }));

    const wrap = el('div', { class: 'viz-wrap' });
    main.appendChild(wrap);
    wrap.appendChild(el('div', { class: 'loading' }, 'Тооцоолж байна…'));

    Auth.stats()
      .then(d => { wrap.innerHTML = ''; render(wrap, d); })
      .catch(e => {
        wrap.innerHTML = '';
        wrap.appendChild(el('div', { class: 'card' },
          el('p', { class: 'auth-error' }, e.message)));
      });
  });

  // ===========================================================================
  function render(root, d) {
    const N = (d.lessons || []).length || 16;

    // ---- 1. Гол үзүүлэлт (KPI) ----------------------------------------------
    const kpi = el('div', { class: 'card card-tight' });
    const row = el('div', { class: 'stat-row' });
    const V = d.visits || {};
    [['Нийт хэрэглэгч', d.users.total],
     ['Оюутан', d.users.byRole.student],
     ['Нийт хандалт', nf(V.total || 0)],
     ['Зочлолт', nf(V.sessions || 0)],
     ['7 хоногт идэвхтэй', d.users.act7],
     ['Дундаж явц', d.progress.avgPct + '%']].forEach(([k, v]) => {
      const s = el('div', { class: 'stat-tile' });
      s.appendChild(el('div', { class: 'stat-value' }, String(v)));
      s.appendChild(el('div', { class: 'stat-label' }, k));
      row.appendChild(s);
    });
    kpi.appendChild(row);
    root.appendChild(kpi);

    const grid = el('div', { class: 'viz-grid' });
    root.appendChild(grid);

    // ---- 1b. Хандалт — өдрөөр -------------------------------------------------
    (function () {
      const c = card('Хандалт — сүүлийн 30 хоног',
                     V.total ? nf(V.total) + ' үзэлт · ' + nf(V.sessions) + ' зочлолт' : '');
      const L = V.byDay || [];
      const tot = L.reduce((a, x) => a + x.v, 0);
      if (!tot) {
        c.appendChild(empty('Хандалтын мэдээлэл хараахан цуглаагүй байна.'));
        grid.appendChild(c); return;
      }
      const W = 720, H = 190, ML = 34, MR = 10, MT = 14, MB = 26;
      const s = svg(W, H);
      const T = ticks(Math.max(...L.map(x => x.v)));
      const max = T.top;
      const xs = i => ML + (W - ML - MR) * (i / (L.length - 1 || 1));
      const ys = v => MT + (H - MT - MB) * (1 - v / max);
      T.values.forEach(v => {
        const y = ys(v);
        mk('line', { x1: ML, y1: y, x2: W - MR, y2: y, stroke: GRID, 'stroke-width': 1 }, s);
        txt(s, ML - 6, y + 3, String(v), { 'text-anchor': 'end' });
      });
      const pts = L.map((x, i) => xs(i) + ',' + ys(x.v)).join(' ');
      mk('polygon', { points: ML + ',' + (H - MB) + ' ' + pts + ' ' + (W - MR) + ',' + (H - MB),
                      fill: C2, 'fill-opacity': 0.14 }, s);
      mk('polyline', { points: pts, fill: 'none', stroke: C2, 'stroke-width': 2,
                       'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, s);
      L.forEach((x, i) => {
        if (!x.v) return;
        const dot = mk('circle', { cx: xs(i), cy: ys(x.v), r: 3.5, fill: C2,
                                   stroke: '#fff', 'stroke-width': 1.5 }, s);
        tip(dot, x.k + ': ' + x.v + ' үзэлт');
      });
      txt(s, ML, H - 8, L[0].k.slice(5));
      txt(s, W - MR, H - 8, L[L.length - 1].k.slice(5), { 'text-anchor': 'end' });
      c.appendChild(s);
      c.appendChild(el('div', { class: 'viz-hint' },
        'Өдрийн дундаж ' + (tot / L.length).toFixed(1) + ' үзэлт · зочин ' +
        nf(V.guest || 0) + ' · нэвтэрсэн ' + nf(V.member || 0)));
      grid.appendChild(c);
    })();

    // ---- 1c. Улсаар ------------------------------------------------------------
    (function () {
      const c = card('Аль улсаас хандсан', 'цагийн бүсээр тодорхойлсон');
      const K = V.byCountry || [];
      if (!K.length) { c.appendChild(empty()); grid.appendChild(c); return; }
      c.appendChild(hBarChart(K.slice(0, 10), 340, C2));
      grid.appendChild(c);
    })();

    // ---- 1d. Хамгийн их үзсэн хуудас -------------------------------------------
    (function () {
      const c = card('Хамгийн их үзсэн хэсэг', 'сэдэв, хуудсаар');
      const K = (V.byRoute || []).map(x => ({ k: ROUTE_MN[x.k] || x.k, v: x.v }));
      if (!K.length) { c.appendChild(empty()); grid.appendChild(c); return; }
      c.appendChild(hBarChart(K.slice(0, 12), 340));
      grid.appendChild(c);
    })();

    // ---- 1e. Төхөөрөмж ба хэл --------------------------------------------------
    (function () {
      const c = card('Төхөөрөмж', 'юугаар үзэж байна');
      const K = V.byDevice || [];
      if (!K.length) { c.appendChild(empty()); grid.appendChild(c); return; }
      const tot = K.reduce((a, x) => a + x.v, 0);
      const W = 340, H = 54;
      const s = svg(W, H);
      const cols = [C1, C2, C3, RAMP[2]];
      let x = 0;
      K.forEach((p, i) => {
        const w = (W - (K.length - 1) * 2) * (p.v / tot);
        const seg = hbar(s, x, 8, w, 26, cols[i % cols.length],
                         i === 0 || i === K.length - 1 ? 4 : 0);
        if (seg) tip(seg, p.k + ': ' + p.v + ' (' + Math.round(p.v / tot * 100) + '%)');
        if (w > 40) txt(s, x + w / 2, 25, Math.round(p.v / tot * 100) + '%',
                        { 'text-anchor': 'middle', fill: '#fff', 'font-weight': 700, 'font-size': 11 });
        x += w + 2;
      });
      c.appendChild(s);
      c.appendChild(legend(K.map((p, i) => [cols[i % cols.length], p.k + ' · ' + p.v])));
      if ((V.byLang || []).length) {
        const lg = el('div', { class: 'viz-facts' });
        V.byLang.slice(0, 6).forEach(p => {
          const f = el('div', { class: 'viz-fact' });
          f.appendChild(el('span', { class: 'viz-fact-k' }, p.k));
          f.appendChild(el('span', { class: 'viz-fact-v' }, String(p.v)));
          lg.appendChild(f);
        });
        c.appendChild(lg);
      }
      grid.appendChild(c);
    })();

    // ---- 2. Хичээл тус бүрийн гүйцэтгэл (бүлэглэсэн багана) ------------------
    (function () {
      const c = card('Хичээл тус бүрийн гүйцэтгэл',
                     'хэдэн оюутан тухайн долоо хоногийг дуусгасан');
      const done = (d.lessons || []).some(l => l.lecture || l.practice);
      if (!done) { c.appendChild(empty()); grid.appendChild(c); return; }

      const W = 720, H = 250, ML = 34, MR = 8, MT = 12, MB = 34;
      const s = svg(W, H);
      const T = ticks(Math.max(...d.lessons.map(l => Math.max(l.lecture, l.practice))));
      const max = T.top;
      const iw = (W - ML - MR) / N;              // нэг хичээлд ноогдох өргөн
      const bw = Math.max(3, (iw - 6) / 2 - 1);  // хоёр баганын хооронд 2px зай

      // тор
      T.values.forEach(v => {
        const y = MT + (H - MT - MB) * (1 - v / max);
        mk('line', { x1: ML, y1: y, x2: W - MR, y2: y, stroke: GRID, 'stroke-width': 1 }, s);
        txt(s, ML - 6, y + 3, String(v), { 'text-anchor': 'end' });
      });

      d.lessons.forEach((l, i) => {
        const x0 = ML + i * iw + 3;
        const hl = (H - MT - MB) * (l.lecture / max);
        const hp = (H - MT - MB) * (l.practice / max);
        const b1 = bar(s, x0, H - MB - hl, bw, hl, C1);
        const b2 = bar(s, x0 + bw + 2, H - MB - hp, bw, hp, C2);
        if (b1) tip(b1, 'Долоо хоног ' + l.n + ' · лекц: ' + l.lecture);
        if (b2) tip(b2, 'Долоо хоног ' + l.n + ' · дадлага: ' + l.practice);
        if (N <= 20) txt(s, x0 + bw + 1, H - MB + 14, String(l.n), { 'text-anchor': 'middle' });
      });
      mk('line', { x1: ML, y1: H - MB, x2: W - MR, y2: H - MB, stroke: '#C9C5B5', 'stroke-width': 1 }, s);
      txt(s, W - MR, H - 6, 'долоо хоног', { 'text-anchor': 'end', 'font-size': 10 });

      c.appendChild(s);
      c.appendChild(legend([[C1, 'Лекц'], [C2, 'Дадлага']]));
      grid.appendChild(c);
    })();

    // ---- 3. Оюутны гүйцэтгэлийн тархалт -------------------------------------
    (function () {
      const c = card('Оюутны гүйцэтгэлийн тархалт', d.progress.students + ' оюутан');
      const b = d.progress.buckets || [];
      if (!b.reduce((a, x) => a + x, 0)) { c.appendChild(empty()); grid.appendChild(c); return; }

      const labels = ['0%', '1–25%', '26–50%', '51–75%', '76–99%', '100%'];
      const W = 340, H = 210, ML = 30, MR = 8, MT = 12, MB = 34;
      const s = svg(W, H);
      const T = ticks(Math.max(...b));
      const max = T.top;
      const iw = (W - ML - MR) / b.length;
      T.values.forEach(v => {
        const y = MT + (H - MT - MB) * (1 - v / max);
        mk('line', { x1: ML, y1: y, x2: W - MR, y2: y, stroke: GRID, 'stroke-width': 1 }, s);
        txt(s, ML - 6, y + 3, String(v), { 'text-anchor': 'end' });
      });
      b.forEach((v, i) => {
        const h = (H - MT - MB) * (v / max);
        const x = ML + i * iw + 4;
        const w = iw - 10;
        const r = bar(s, x, H - MB - h, w, h, RAMP[i]);
        if (r) { tip(r, labels[i] + ': ' + v + ' оюутан'); mk('rect',
          { x: x, y: H - MB - h, width: w, height: Math.max(h, 0), fill: 'none',
            stroke: '#C9C5B5', 'stroke-width': 0.5 }, s); }
        if (v) txt(s, x + w / 2, H - MB - h - 5, String(v),
                   { 'text-anchor': 'middle', fill: INK, 'font-weight': 600, 'font-size': 11 });
        txt(s, x + w / 2, H - MB + 14, labels[i], { 'text-anchor': 'middle', 'font-size': 9 });
      });
      mk('line', { x1: ML, y1: H - MB, x2: W - MR, y2: H - MB, stroke: '#C9C5B5', 'stroke-width': 1 }, s);
      c.appendChild(s);
      grid.appendChild(c);
    })();

    // ---- 4. Эрхийн бүтэц (хэвтээ давхарласан) --------------------------------
    (function () {
      const c = card('Эрхийн бүтэц', d.users.total + ' данс');
      const r = d.users.byRole;
      const parts = [[C1, 'Оюутан', r.student], [C2, 'Багш', r.teacher], [C3, 'Админ', r.admin]]
        .filter(p => p[2] > 0);
      if (!parts.length) { c.appendChild(empty()); grid.appendChild(c); return; }

      const W = 340, H = 54, tot = parts.reduce((a, p) => a + p[2], 0);
      const s = svg(W, H);
      let x = 0;
      parts.forEach((p, i) => {
        const w = (W - (parts.length - 1) * 2) * (p[2] / tot);   // 2px зай
        const seg = hbar(s, x, 8, w, 26, p[0], i === 0 || i === parts.length - 1 ? 4 : 0);
        if (seg) tip(seg, p[1] + ': ' + p[2] + ' (' + Math.round(p[2] / tot * 100) + '%)');
        if (w > 34) txt(s, x + w / 2, 25, String(p[2]),
                        { 'text-anchor': 'middle', fill: '#fff', 'font-weight': 700, 'font-size': 11 });
        x += w + 2;
      });
      c.appendChild(s);
      c.appendChild(legend(parts.map(p => [p[0], p[1] + ' · ' + p[2]])));

      const meta = el('div', { class: 'viz-facts' });
      [['Идэвхтэй', d.users.active], ['Идэвхгүй', d.users.inactive],
       ['Хэзээ ч нэвтрээгүй', d.users.never],
       ['Нууц үг солиогүй', d.users.mustChangePw],
       ['30 хоногт идэвхтэй', d.users.act30]].forEach(([k, v]) => {
        const f = el('div', { class: 'viz-fact' });
        f.appendChild(el('span', { class: 'viz-fact-k' }, k));
        f.appendChild(el('span', { class: 'viz-fact-v' }, String(v)));
        meta.appendChild(f);
      });
      c.appendChild(meta);
      grid.appendChild(c);
    })();

    // ---- 5. Нэвтрэлт — сүүлийн 30 хоног (талбайт шугам) ----------------------
    (function () {
      const c = card('Нэвтрэлт — сүүлийн 30 хоног',
                     d.local ? 'локал горимд бүртгэгддэггүй' : 'өдрөөр');
      const L = d.logins || [];
      const tot = L.reduce((a, x) => a + x.v, 0);
      if (!L.length || !tot) {
        c.appendChild(empty(d.local
          ? 'Нэвтрэлтийн бүртгэл зөвхөн сервер горимд хөтлөгдөнө.'
          : 'Сүүлийн 30 хоногт нэвтрэлт бүртгэгдээгүй.'));
        grid.appendChild(c); return;
      }
      const W = 720, H = 190, ML = 30, MR = 10, MT = 14, MB = 26;
      const s = svg(W, H);
      const T = ticks(Math.max(...L.map(x => x.v)));
      const max = T.top;
      const xs = i => ML + (W - ML - MR) * (i / (L.length - 1 || 1));
      const ys = v => MT + (H - MT - MB) * (1 - v / max);
      T.values.forEach(v => {
        const y = MT + (H - MT - MB) * (1 - v / max);
        mk('line', { x1: ML, y1: y, x2: W - MR, y2: y, stroke: GRID, 'stroke-width': 1 }, s);
        txt(s, ML - 6, y + 3, String(v), { 'text-anchor': 'end' });
      });
      const pts = L.map((x, i) => xs(i) + ',' + ys(x.v)).join(' ');
      mk('polygon', {
        points: ML + ',' + (H - MB) + ' ' + pts + ' ' + (W - MR) + ',' + (H - MB),
        fill: C1, 'fill-opacity': 0.14,
      }, s);
      mk('polyline', { points: pts, fill: 'none', stroke: C1, 'stroke-width': 2,
                       'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, s);
      L.forEach((x, i) => {
        if (!x.v) return;
        const dot = mk('circle', { cx: xs(i), cy: ys(x.v), r: 3.5, fill: C1,
                                   stroke: '#fff', 'stroke-width': 1.5 }, s);
        tip(dot, x.k + ': ' + x.v + ' нэвтрэлт');
      });
      txt(s, ML, H - 8, L[0].k.slice(5));
      txt(s, W - MR, H - 8, L[L.length - 1].k.slice(5), { 'text-anchor': 'end' });
      c.appendChild(s);
      c.appendChild(el('div', { class: 'viz-hint' },
        'Нийт ' + tot + ' нэвтрэлт · өдрийн дундаж ' + (tot / L.length).toFixed(1)));
      grid.appendChild(c);
    })();

    // ---- 6. Хадгалсан бодлого — аргаар --------------------------------------
    (function () {
      const c = card('Хадгалсан бодлого — аргаар', d.problems.total + ' бодлого');
      const K = d.problems.byKind || [];
      if (!K.length) { c.appendChild(empty()); grid.appendChild(c); return; }
      c.appendChild(hBarChart(K.slice(0, 8), 340));
      grid.appendChild(c);
    })();

    // ---- 7. Хамгийн идэвхтэй хэрэглэгч ---------------------------------------
    (function () {
      const c = card('Хамгийн идэвхтэй — бодлого хадгалсан', 'эхний 8');
      const T = d.problems.topUsers || [];
      if (!T.length) { c.appendChild(empty()); grid.appendChild(c); return; }
      c.appendChild(hBarChart(T.slice(0, 8), 340));
      grid.appendChild(c);
    })();

    // ---- 8. Толь бичигт хувь нэмэр -------------------------------------------
    (function () {
      const c = card('Толь бичигт нэмсэн', d.glossary.total + ' нэр томьёо');
      const G = d.glossary.byUser || [];
      if (!G.length) { c.appendChild(empty()); grid.appendChild(c); return; }
      c.appendChild(hBarChart(G.slice(0, 8), 340));
      grid.appendChild(c);
    })();

    // ---- 9. Данс үүссэн байдал — сараар --------------------------------------
    (function () {
      const c = card('Данс үүссэн — сараар', 'бүртгэлийн өсөлт');
      const M = d.users.byMonth || [];
      if (!M.length) { c.appendChild(empty()); grid.appendChild(c); return; }
      c.appendChild(hBarChart(M, 340, RAMP[4]));
      grid.appendChild(c);
    })();

    // ---- 10. Серверийн үйлдэл -------------------------------------------------
    if ((d.actions || []).length) {
      const c = card('Серверийн үйлдэл', 'нийт ' + nf(d.logSize) + ' бичлэг');
      c.appendChild(hBarChart(d.actions.slice(0, 10), 340, RAMP[3]));
      grid.appendChild(c);
    }

    // ---- 11. Дасгалын оноо ----------------------------------------------------
    if (d.progress.drillTotal) {
      const c = card('Интерактив дасгал', 'бүх оюутны нийлбэр');
      const pct = Math.round(d.progress.drillDone / d.progress.drillTotal * 100);
      const W = 340, H = 74;
      const s = svg(W, H);
      hbar(s, 0, 22, W, 22, '#EBE9E0', 4);
      const fill = hbar(s, 0, 22, W * (pct / 100), 22, C1, 4);
      if (fill) tip(fill, d.progress.drillDone + ' / ' + d.progress.drillTotal);
      txt(s, 0, 14, d.progress.drillDone + ' / ' + d.progress.drillTotal + ' зөв',
          { fill: INK, 'font-weight': 600, 'font-size': 12 });
      txt(s, W, 14, pct + '%', { 'text-anchor': 'end', fill: C1, 'font-weight': 700, 'font-size': 12 });
      c.appendChild(s);
      grid.appendChild(c);
    }

    // ---- Хөл ------------------------------------------------------------------
    const foot = el('div', { class: 'action-bar' });
    foot.appendChild(el('span', { class: 'viz-hint' },
      'Тооцоолсон: ' + new Date(d.generated_at).toLocaleString('mn-MN') +
      (d.local ? ' · локал горим' : ' · сервер')));
    foot.appendChild(el('button', {
      class: 'btn btn-ghost', onClick: () => exportJson(d)
    }, '⭳ JSON татах'));
    foot.appendChild(el('button', {
      class: 'btn btn-ghost', onClick: () => App.go('stats')
    }, '↺ Шинэчлэх'));
    root.appendChild(foot);
  }

  // ---------------------------------------------------------------------------
  // Хэвтээ багана — нэр урт, тоо цөөн үед хамгийн уншигдахуйц
  // ---------------------------------------------------------------------------
  function hBarChart(pairs, W, color) {
    const RH = 26, ML = 128, MR = 34;
    const H = pairs.length * RH + 6;
    const s = svg(W, H);
    const max = Math.max(1, ...pairs.map(p => p.v));
    pairs.forEach((p, i) => {
      const y = i * RH + 4;
      const w = (W - ML - MR) * (p.v / max);
      const b = hbar(s, ML, y, w, 16, color || C1);
      if (b) tip(b, p.k + ': ' + p.v);
      const label = String(p.k).length > 20 ? String(p.k).slice(0, 19) + '…' : String(p.k);
      const t = txt(s, ML - 8, y + 12, label, { 'text-anchor': 'end', fill: INK, 'font-size': 11 });
      if (label !== p.k) tip(t, p.k);
      txt(s, ML + w + 6, y + 12, String(p.v), { fill: MUTE, 'font-size': 11, 'font-weight': 600 });
    });
    return s;
  }

  function exportJson(d) {
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lp-statistik-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
})();
