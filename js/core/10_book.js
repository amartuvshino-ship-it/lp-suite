// =============================================================================
// BOOK — Сурах бичгийн 10 бүлгийн агуулгыг ачаалж, блокоор рендерлэх
// =============================================================================
// Бүлэг тус бүр js/data/book/chN.js файлд байна (~50–90 KB). Шаардлагатай
// үед л ачаална (lazy) — эхний ачаалалт хурдан байлгах үүднээс.
//
// Блокийн төрлүүд:
//   { t:'h', lvl:2|3, x:'...' }   гарчиг
//   { t:'p', x:'...' }            догол мөр
//   { t:'table', rows:[[...]] }   хүснэгт
//   { t:'img', src:'ch3_1.png' }  зураг (assets/book/ дотор)
// =============================================================================
(function () {
  'use strict';

  const el = window.LP.el;
  const cache = {};
  const pending = {};

  const TITLES = {
    1: 'Шугаман программчлалын үндэс',
    2: 'Бодлогын тавилт',
    3: 'Графикийн арга',
    4: 'Матрицын арга',
    5: 'Симплекс арга',
    6: 'Big-M арга',
    7: 'Хосмог бодлого (Duality)',
    8: 'Тээврийн бодлого',
    9: 'Бүхэл тоон программчлал',
    10: 'Дамжин өнгөрөх тээвэр (Transshipment)',
  };

  function load(n) {
    if (cache[n]) return Promise.resolve(cache[n]);
    if (window.LP.BookData && window.LP.BookData[n]) {
      cache[n] = window.LP.BookData[n];
      return Promise.resolve(cache[n]);
    }
    if (pending[n]) return pending[n];

    pending[n] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'js/data/book/ch' + n + '.js';
      s.onload = () => {
        if (window.LP.BookData && window.LP.BookData[n]) {
          cache[n] = window.LP.BookData[n];
          resolve(cache[n]);
        } else {
          reject(new Error('Бүлэг ' + n + ' ачаалагдсангүй.'));
        }
      };
      s.onerror = () => reject(new Error('Бүлэг ' + n + '-ийн файл олдсонгүй (js/data/book/ch' + n + '.js).'));
      document.head.appendChild(s);
    });
    return pending[n];
  }

  // ---------------------------------------------------------------------------
  // Дэд бүлгээр шүүх. prefixes = ['5.1','5.2'] эсвэл 'all'
  // ---------------------------------------------------------------------------
  function slice(blocks, prefixes) {
    if (!prefixes || prefixes === 'all') return blocks.slice();
    const want = prefixes.map(p => String(p).replace(/\.$/, ''));
    const out = [];
    let on = false;
    blocks.forEach(b => {
      if (b.t === 'h' && b.lvl === 2) {
        const txt = b.x.trim();
        on = want.some(p => txt.indexOf(p + '.') === 0 || txt.indexOf(p + ' ') === 0);
      }
      if (on) out.push(b);
    });
    return out;
  }

  // Гарчиг нь өгсөн үгсийн аль нэгийг агуулсан H2 хэсгийг олох
  function sectionByKeyword(blocks, keywords) {
    const kw = keywords.map(k => k.toLowerCase());
    const out = [];
    let on = false;
    blocks.forEach(b => {
      if (b.t === 'h' && b.lvl === 2) {
        const t = b.x.toLowerCase();
        on = kw.some(k => t.indexOf(k) >= 0);
      }
      if (on) out.push(b);
    });
    return out;
  }

  // ---------------------------------------------------------------------------
  // Рендер
  // ---------------------------------------------------------------------------
  function renderBlocks(blocks, opts) {
    opts = opts || {};
    const wrap = el('div', { class: 'book-body' });

    blocks.forEach(b => {
      if (b.t === 'h') {
        if (b.lvl === 2) {
          wrap.appendChild(el('h2', { class: 'book-h2' }, b.x));
        } else {
          wrap.appendChild(el('h3', { class: 'book-h3' }, b.x));
        }
      } else if (b.t === 'p') {
        const cls = /^→/.test(b.x) ? 'book-p book-ref'
                  : /^Хүснэгт\s|^Зураг\s/.test(b.x) ? 'book-p book-caption'
                  : 'book-p';
        wrap.appendChild(el('p', { class: cls }, b.x));
      } else if (b.t === 'img') {
        const fig = el('figure', { class: 'book-figure' });
        fig.appendChild(el('img', {
          src: 'assets/book/' + b.src, alt: 'Зураг', loading: 'lazy'
        }));
        wrap.appendChild(fig);
      } else if (b.t === 'table') {
        wrap.appendChild(renderTable(b.rows));
      }
    });

    return wrap;
  }

  function renderTable(rows) {
    // Нэг нүдтэй "хайрцаг" хэлбэрийн хүснэгтийг тодруулга болгож харуулна
    if (rows.length === 1 && rows[0].length === 1) {
      const txt = rows[0][0];
      const box = el('div', { class: 'book-callout' });
      txt.split('\n').forEach((line, i) => {
        if (!line.trim()) return;
        box.appendChild(el(i === 0 ? 'strong' : 'p', { class: i === 0 ? 'callout-title' : '' }, line));
      });
      return box;
    }
    const scroll = el('div', { class: 'book-table-wrap' });
    const t = el('table', { class: 'book-table' });
    const thead = el('thead');
    const trh = el('tr');
    rows[0].forEach(c => trh.appendChild(el('th', {}, c)));
    thead.appendChild(trh);
    t.appendChild(thead);
    const tb = el('tbody');
    rows.slice(1).forEach(r => {
      const tr = el('tr');
      r.forEach(c => {
        const td = el('td');
        String(c).split('\n').forEach((line, i) => {
          if (i) td.appendChild(el('br'));
          td.appendChild(document.createTextNode(line));
        });
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    scroll.appendChild(t);
    return scroll;
  }

  // Агуулгын жагсаалт (H2/H3) — хажуугийн навигацид
  function outline(blocks) {
    return blocks.filter(b => b.t === 'h').map(b => ({ lvl: b.lvl, text: b.x }));
  }

  window.LP = window.LP || {};
  window.LP.Book = {
    TITLES: TITLES,
    load: load,
    slice: slice,
    sectionByKeyword: sectionByKeyword,
    render: renderBlocks,
    outline: outline,
  };
})();
