// =============================================================================
// DRILL — интерактив дасгалын хөдөлгүүр
// =============================================================================
// Дасгалын төрлүүд (js/data/drills.js дотор өгөгдөл нь байна):
//   { k:'mc',    q, opts:[...], a:idx,        why }   нэг зөв хариулт
//   { k:'multi', q, opts:[...], a:[i,j],      why }   олон зөв хариулт
//   { k:'match', q, pairs:[[зүүн, баруун]…],  why }   курсороор чирж тааруулах
//   { k:'fill',  q, text:'… {0} … {1}', a:['20','10'], why }   нөхөх
//   { k:'order', q, items:[…зөв дараалал…],   why }   алхмыг эрэмбэлэх
//
// Ашиглалт:  LP.Drill.render(lessonN)  → DOM зангилаа буцаана
//            LP.Drill.quiz(item, opts)  → нэг богино тест (слайдын дунд)
// =============================================================================
(function () {
  'use strict';

  const el = window.LP.el;

  // --- туслах ----------------------------------------------------------------
  function shuffle(a, seed) {
    // тогтвортой холилт — нэг дасгал дахин рендер хийхэд ижил дараалалтай
    const r = a.slice();
    let s = seed || 7;
    for (let i = r.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const j = s % (i + 1);
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }

  function norm(s) {
    return String(s).trim().toLowerCase()
      .replace(/\s+/g, '').replace(/,/g, '').replace(/₮/g, '')
      .replace(/[−–—]/g, '-');
  }

  function feedback() { return el('div', { class: 'dr-feedback' }); }

  function say(fb, ok, why) {
    fb.className = 'dr-feedback on ' + (ok ? 'ok' : 'bad');
    fb.innerHTML = '';
    fb.appendChild(el('strong', {}, ok ? '✓ Зөв. ' : '✗ Дахин оролдоно уу. '));
    if (why) fb.appendChild(document.createTextNode(why));
    return ok;
  }

  const KEYS = 'абвгдеёж';

  // ===========================================================================
  // 1. Сонголттой тест (mc / multi)
  // ===========================================================================
  function buildMC(item, onDone) {
    const box = el('div');
    const multi = item.k === 'multi';
    const ans = multi ? item.a.slice().sort() : [item.a];
    const list = el('div', { class: 'mc-list' });
    const chosen = new Set();
    const btns = [];
    let locked = false;

    item.opts.forEach((o, i) => {
      const b = el('button', { class: 'mc-opt', type: 'button' });
      b.appendChild(el('span', { class: 'mc-key' }, KEYS[i] || String(i + 1)));
      b.appendChild(el('span', {}, o));
      b.addEventListener('click', () => {
        if (locked) return;
        if (multi) {
          if (chosen.has(i)) chosen.delete(i); else chosen.add(i);
        } else {
          chosen.clear(); chosen.add(i);
        }
        btns.forEach((x, j) => x.classList.toggle('sel', chosen.has(j)));
        if (!multi) check();
      });
      btns.push(b); list.appendChild(b);
    });
    box.appendChild(list);

    const fb = feedback();
    const bar = el('div', { class: 'dr-actions' });
    if (multi) {
      bar.appendChild(el('button', { class: 'btn btn-primary btn-xs', onClick: check },
        'Шалгах'));
    }
    box.appendChild(bar);
    box.appendChild(fb);

    function check() {
      if (locked) return;
      const got = Array.from(chosen).sort();
      const ok = got.length === ans.length && got.every((v, i) => v === ans[i]);
      btns.forEach((b, i) => {
        b.classList.remove('sel');
        if (ans.indexOf(i) >= 0) b.classList.add('right');
        else if (chosen.has(i)) b.classList.add('wrong');
      });
      say(fb, ok, item.why);
      if (ok) { locked = true; btns.forEach(b => b.disabled = true); }
      else {
        setTimeout(() => {
          if (locked) return;
          btns.forEach(b => b.classList.remove('right', 'wrong'));
          chosen.clear();
        }, 1600);
      }
      onDone && onDone(ok);
    }

    return box;
  }

  // ===========================================================================
  // 2. Курсороор чирж тааруулах (match)
  // ===========================================================================
  function buildMatch(item, onDone, seed) {
    const box = el('div');
    const grid = el('div', { class: 'match-grid' });

    const left = item.pairs.map((p, i) => ({ i: i, txt: p[0] }));
    const right = shuffle(item.pairs.map((p, i) => ({ i: i, txt: p[1] })), seed || 11);

    // — баруун талын чирэх хавтан
    const srcCol = el('div');
    srcCol.appendChild(el('div', { class: 'match-col-label' }, 'Чирэх хэсэг'));
    const src = el('div', { class: 'match-src' });
    srcCol.appendChild(src);

    // — зүүн талын байрлуулах нүд
    const dstCol = el('div');
    dstCol.appendChild(el('div', { class: 'match-col-label' }, 'Хаана тохирох вэ'));
    const dst = el('div', { class: 'match-dst' });
    dstCol.appendChild(dst);

    grid.appendChild(dstCol);
    grid.appendChild(srcCol);
    box.appendChild(grid);

    let picked = null;             // хулганаар товшиж сонгосон хавтан (гар утсанд)
    const slots = [];
    const tiles = [];

    right.forEach(r => {
      const t = el('div', { class: 'match-tile', draggable: 'true' }, r.txt);
      t.dataset.i = r.i;
      t.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', String(r.i));
        e.dataTransfer.effectAllowed = 'move';
        t.classList.add('dragging');
      });
      t.addEventListener('dragend', () => t.classList.remove('dragging'));
      t.addEventListener('click', () => {
        if (picked === t) { t.classList.remove('picked'); picked = null; return; }
        if (picked) picked.classList.remove('picked');
        picked = t; t.classList.add('picked');
      });
      tiles.push(t); src.appendChild(t);
    });

    left.forEach(l => {
      const s = el('div', { class: 'match-slot' });
      s.appendChild(el('span', { class: 'slot-target' }, l.txt));
      const drop = el('span', { class: 'slot-drop' }, '⇠ энд буулгана');
      s.appendChild(drop);
      s.dataset.i = l.i;
      s.filled = null;

      function place(tile) {
        if (!tile) return;
        if (s.filled) { s.filled.classList.remove('done'); src.appendChild(s.filled); }
        s.filled = tile;
        tile.classList.add('done');
        drop.textContent = tile.textContent;
        drop.classList.add('filled');
        s.classList.remove('over', 'right', 'wrong');
        if (picked === tile) { tile.classList.remove('picked'); picked = null; }
      }

      s.addEventListener('dragover', e => { e.preventDefault(); s.classList.add('over'); });
      s.addEventListener('dragleave', () => s.classList.remove('over'));
      s.addEventListener('drop', e => {
        e.preventDefault(); s.classList.remove('over');
        const idx = e.dataTransfer.getData('text/plain');
        place(tiles.find(t => t.dataset.i === idx));
      });
      s.addEventListener('click', () => { if (picked) place(picked); });
      slots.push(s); dst.appendChild(s);
    });

    const fb = feedback();
    const bar = el('div', { class: 'dr-actions' });
    bar.appendChild(el('button', { class: 'btn btn-primary btn-xs', onClick: check }, 'Шалгах'));
    bar.appendChild(el('button', { class: 'btn btn-ghost btn-xs', onClick: reset }, '↺ Цэвэрлэх'));
    bar.appendChild(el('span', { class: 'dr-kind' },
      'Хулганаар чирэх, эсвэл товшоод байрлуулах'));
    box.appendChild(bar);
    box.appendChild(fb);

    function check() {
      let ok = 0;
      slots.forEach(s => {
        s.classList.remove('right', 'wrong');
        if (!s.filled) return;
        if (s.filled.dataset.i === s.dataset.i) { s.classList.add('right'); ok++; }
        else s.classList.add('wrong');
      });
      const all = ok === slots.length;
      say(fb, all, all ? item.why
        : ok + ' / ' + slots.length + ' зөв. Улаан мөрийг дахин байрлуулна уу.');
      onDone && onDone(all);
    }

    function reset() {
      slots.forEach(s => {
        if (s.filled) { s.filled.classList.remove('done'); src.appendChild(s.filled); }
        s.filled = null;
        s.classList.remove('right', 'wrong');
        const d = s.querySelector('.slot-drop');
        d.textContent = '⇠ энд буулгана'; d.classList.remove('filled');
      });
      fb.className = 'dr-feedback';
    }

    return box;
  }

  // ===========================================================================
  // 3. Нөхөх (fill)
  // ===========================================================================
  function buildFill(item, onDone) {
    const box = el('div');
    const row = el('div', { class: 'fill-row' });
    const ins = [];
    const parts = String(item.text).split(/(\{\d+\})/);
    parts.forEach(p => {
      const m = /^\{(\d+)\}$/.exec(p);
      if (m) {
        const inp = el('input', {
          class: 'fill-in', type: 'text',
          'aria-label': 'Хариу ' + (Number(m[1]) + 1),
          placeholder: '?',
        });
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
        ins[Number(m[1])] = inp;
        row.appendChild(inp);
      } else if (p) {
        p.split('\n').forEach((line, i) => {
          if (i) row.appendChild(el('span', { style: { flexBasis: '100%' } }));
          row.appendChild(el('span', {}, line));
        });
      }
    });
    box.appendChild(row);

    const fb = feedback();
    const bar = el('div', { class: 'dr-actions' });
    bar.appendChild(el('button', { class: 'btn btn-primary btn-xs', onClick: check }, 'Шалгах'));
    box.appendChild(bar);
    box.appendChild(fb);

    function check() {
      let ok = 0;
      item.a.forEach((want, i) => {
        const inp = ins[i];
        if (!inp) return;
        const alts = Array.isArray(want) ? want : [want];
        const good = alts.some(w => norm(w) === norm(inp.value));
        inp.classList.remove('right', 'wrong');
        inp.classList.add(good ? 'right' : 'wrong');
        if (good) ok++;
      });
      const all = ok === item.a.length;
      say(fb, all, all ? item.why : ok + ' / ' + item.a.length + ' зөв.');
      onDone && onDone(all);
    }

    return box;
  }

  // ===========================================================================
  // 4. Алхмыг эрэмбэлэх (order)
  // ===========================================================================
  function buildOrder(item, onDone, seed) {
    const box = el('div');
    const list = el('div', { class: 'ord-list' });
    const start = shuffle(item.items.map((t, i) => ({ i: i, t: t })), seed || 23);
    let dragging = null;

    start.forEach(o => {
      const r = el('div', { class: 'ord-item', draggable: 'true' });
      r.dataset.i = o.i;
      r.appendChild(el('span', { class: 'ord-badge' }, '·'));
      r.appendChild(el('span', {}, o.t));
      r.appendChild(el('span', { class: 'ord-grip' }, '⠿'));
      r.addEventListener('dragstart', () => { dragging = r; r.classList.add('dragging'); });
      r.addEventListener('dragend', () => { r.classList.remove('dragging'); renum(); });
      r.addEventListener('dragover', e => {
        e.preventDefault();
        if (!dragging || dragging === r) return;
        const rect = r.getBoundingClientRect();
        const before = (e.clientY - rect.top) < rect.height / 2;
        list.insertBefore(dragging, before ? r : r.nextSibling);
      });
      list.appendChild(r);
    });
    box.appendChild(list);
    renum();

    function renum() {
      Array.from(list.children).forEach((r, i) => {
        r.querySelector('.ord-badge').textContent = String(i + 1);
      });
    }

    const fb = feedback();
    const bar = el('div', { class: 'dr-actions' });
    bar.appendChild(el('button', { class: 'btn btn-primary btn-xs', onClick: check }, 'Шалгах'));
    bar.appendChild(el('span', { class: 'dr-kind' }, 'Мөрийг чирж дээш доош зөөнө'));
    box.appendChild(bar);
    box.appendChild(fb);

    function check() {
      const rows = Array.from(list.children);
      let ok = 0;
      rows.forEach((r, i) => {
        r.classList.remove('right', 'wrong');
        const good = Number(r.dataset.i) === i;
        r.classList.add(good ? 'right' : 'wrong');
        if (good) ok++;
      });
      const all = ok === rows.length;
      say(fb, all, all ? item.why : ok + ' / ' + rows.length + ' байрандаа байна.');
      onDone && onDone(all);
    }

    return box;
  }

  // ===========================================================================
  // Нэг дасгалын хайрцаг
  // ===========================================================================
  const KIND_LABEL = {
    mc: 'Нэг зөв хариулт', multi: 'Олон зөв хариулт',
    match: 'Чирж тааруулах', fill: 'Нөхөх', order: 'Эрэмбэлэх',
  };

  function buildItem(item, idx, onDone) {
    const wrap = el('div', { class: 'dr-item' });
    const head = el('div', { class: 'dr-head' });
    head.appendChild(el('span', { class: 'dr-num' }, 'Дасгал ' + (idx + 1)));
    head.appendChild(el('span', { class: 'dr-kind' }, KIND_LABEL[item.k] || item.k));
    wrap.appendChild(head);

    const q = el('p', { class: 'dr-q' });
    if (window.LP.Enrich) window.LP.Enrich.text(q, item.q);
    else q.appendChild(document.createTextNode(item.q));
    wrap.appendChild(q);

    let body;
    if (item.k === 'mc' || item.k === 'multi') body = buildMC(item, onDone);
    else if (item.k === 'match') body = buildMatch(item, onDone, idx * 17 + 5);
    else if (item.k === 'fill') body = buildFill(item, onDone);
    else if (item.k === 'order') body = buildOrder(item, onDone, idx * 13 + 3);
    else body = el('p', {}, '(тодорхойгүй төрөл)');
    wrap.appendChild(body);
    return wrap;
  }

  // ===========================================================================
  // Бүх багц
  // ===========================================================================
  function render(lessonN) {
    const set = (window.LP.Drills || {})[lessonN];
    if (!set || !set.length) return null;

    const root = el('div');
    const score = el('div', { class: 'dr-score' });
    const done = new Set();
    const num = el('strong', {}, '0');
    score.appendChild(num);
    score.appendChild(el('span', {}, '/ ' + set.length + ' дасгал зөв бөглөгдсөн'));
    const bar = el('div', { class: 'progress-bar' });
    const fill = el('div', { class: 'progress-fill', style: { width: '0%' } });
    bar.appendChild(fill); score.appendChild(bar);
    root.appendChild(score);

    const list = el('div', { class: 'dr-set' });
    set.forEach((item, i) => {
      list.appendChild(buildItem(item, i, ok => {
        if (ok) done.add(i);
        num.textContent = String(done.size);
        fill.style.width = Math.round(done.size / set.length * 100) + '%';
        save(lessonN, done.size, set.length);
      }));
    });
    root.appendChild(list);
    return root;
  }

  let saveTimer = null;
  function save(n, got, tot) {
    const Auth = window.LP.Auth, Data = window.LP.Data;
    if (!Auth || !Data || !Auth.currentUser) return;
    const u = Auth.currentUser();
    if (!u) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { Data.progress.set(u.id, 'l' + n + '.drill', got + '/' + tot); } catch (e) {}
    }, 600);
  }

  // ===========================================================================
  // Слайд/лекцийн дунд орох богино мэдлэг шалгах
  // ===========================================================================
  function quiz(item, opts) {
    opts = opts || {};
    const box = el('div', { class: 'quiz-block' });
    box.appendChild(el('span', { class: 'quiz-tag' }, opts.tag || '✓ Мэдлэг шалгах'));
    const q = el('p', { class: 'dr-q' });
    if (window.LP.Enrich) window.LP.Enrich.text(q, item.q);
    else q.appendChild(document.createTextNode(item.q));
    box.appendChild(q);
    if (item.k === 'match') box.appendChild(buildMatch(item, opts.onDone, 31));
    else if (item.k === 'fill') box.appendChild(buildFill(item, opts.onDone));
    else if (item.k === 'order') box.appendChild(buildOrder(item, opts.onDone, 41));
    else box.appendChild(buildMC(item, opts.onDone));
    return box;
  }

  window.LP = window.LP || {};
  window.LP.Drill = {
    render: render,
    quiz: quiz,
    item: buildItem,
  };
})();
