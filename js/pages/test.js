// =============================================================================
// TEST PAGE — сэдвийн тест, ерөнхий шалгалт + оношилгоо
// =============================================================================
// Асуултын ТӨРЛҮҮД (js/data/exams.js-д бичигдэнэ):
//   mc     нэг зөв хариулт        { opts:[…], a: index }
//   multi  олон зөв хариулт       { opts:[…], a: [index,…] }
//   tf     үнэн/худал мэдэгдэл    { stmts:[…], a: [true,false,…] }
//   match  хос тааруулах          { pairs: [[зүүн, баруун], …] }
//   order  зөв дарааллаар өрөх    { seq: [1-р, 2-р, 3-р, …] }   ← ЗӨВ дараалал
//   fill   нөхөх — хувилбараас сонгох  { a:'4', opts:['4','2','6','8'], unit:'м³' }
//          Гараас БИЧҮҮЛДЭГГҮЙ: математик тэмдэглэгээг (x₁, ≥, ₮) гараас зөв
//          бичих бараг боломжгүй тул товшиж сонгоно. a нь opts дотор заавал
//          байх ёстой; opts нь дэлгэцэнд холигдоно.
//
// Бүгдэд нь заавал:  q (асуулт), why (тайлбар), ref (дэд бүлэг, ж нь '1.3.1')
//
// НЭГ УДААД: сангаас SIT_N ширхгийг санамсаргүй авна. Гэхдээ зүгээр
// санамсаргүй биш — ref бүрээс ээлжлэн сонгодог тул тухайн сэдвийн БҮХ
// дэд хэсэг хамрагдана (pickCovered).
//
// Өөр хуудаснаас:  App.go('test', { lesson: 5 })  эсвэл  App.go('test', { mode:'final' })
// =============================================================================
(function () {
  'use strict';
  const el   = window.LP.el;
  const App  = window.LP.App;

  const BANK = () => window.LP.Exams || {};
  const CUR  = () => (window.LP.Curriculum || window.LP.LESSONS || []);

  // Хичээл → бүлэг. curriculum.js байхгүй бол нөөц хүснэгт.
  const CH_OF = { 1:1, 2:2, 3:2, 4:3, 5:3, 6:4, 7:5, 8:5, 9:5,
                  10:6, 11:6, 12:7, 13:8, 14:8, 15:9, 16:10 };
  const CH_NAME = { 1:'Шугаман программчлалын үндэс', 2:'Бодлогын тавилт',
                    3:'Графикийн арга', 4:'Матрицын арга', 5:'Симплекс арга',
                    6:'Big-M арга', 7:'Хосмог бодлого', 8:'Тээврийн бодлого',
                    9:'Бүхэл тоон программчлал', 10:'Дамжин өнгөрөх тээвэр' };
  const CH_VIDEO = { 2:'modon-urlal', 3:'graphical', 4:'matrix', 5:'simplex' };
  function LESSONS_OF(ch) {
    return Object.keys(CH_OF).map(Number).filter(n => CH_OF[n] === ch).sort((a,b)=>a-b);
  }

  const SIT_N     = 10;      // нэг удаагийн сэдвийн тестийн асуултын тоо
  const FINAL_N   = 20;      // ерөнхий шалгалтын асуултын тоо
  const FINAL_MIN = 30;      // хугацаа, минутаар

  const K_NAME = { mc:'нэг зөв хариулт', multi:'олон зөв хариулт',
                   tf:'үнэн / худал', match:'хос тааруулах',
                   order:'зөв дарааллаар өрөх', fill:'нөхөх — хувилбараас сонгох' };
  const LETTER = ['А','Б','В','Г','Д','Е','Ж','З'];

  // ---------------------------------------------------------------- туслах
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function lessonTitle(n) {
    const L = CUR().find ? CUR().find(x => x.n === n) : null;
    return L ? L.title : ('Хичээл ' + n);
  }
  function chOfRef(ref) { return parseInt(String(ref || '').split('.')[0], 10) || 0; }
  function lessonsWithExam() {
    return Object.keys(BANK()).map(Number).sort((a, b) => a - b)
      .filter(n => (BANK()[n] || []).length);
  }
  function eqArr(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }

  // ------------------------------------------------- САНАМСАРГҮЙ БОЛОВЧ ХАМРАХУЙЦ
  // ХОЁР ТҮВШИНТ хамрах хүрээ:
  //   1-р түвшин — ҮНДСЭН ХЭСЭГ (ref-ийн эхний хоёр хэсэг, ж нь '2.4', '2.7').
  //                Эдгээрээс ээлжлэн авна → сэдвийн бүх том хэсэг заавал орно.
  //   2-р түвшин — үндсэн хэсэг дотроо ДЭД БҮЛЭГ (бүтэн ref) бүрээс ээлжлэн.
  // Дээр нь аль болох олон өөр ТӨРӨЛ (mc, match, order…) орохыг эрмэлзэнэ.
  //
  // Жишээ: Хичээл 3-д 21 дэд бүлэг бий — 10 асуултад бүгд багтахгүй. Гэхдээ
  // үндсэн 5 хэсэг (2.4 … 2.8) бүрээс 2 асуулт гарч, агуулга тэнцвэртэй хамрагдана.
  function parentOf(ref) {
    return String(ref || '?').split('.').slice(0, 2).join('.');
  }
  function pickCovered(items, n) {
    if (items.length <= n) return shuffle(items);

    // үндсэн хэсэг → дэд бүлэг → асуултууд
    const tree = {};
    items.forEach(it => {
      const r = it.ref || '?', p = parentOf(r);
      tree[p] = tree[p] || {};
      (tree[p][r] = tree[p][r] || []).push(it);
    });

    // үндсэн хэсэг бүрт дэд бүлгүүдийг ээлжлүүлсэн нэг дараалал үүсгэнэ
    const parents = shuffle(Object.keys(tree));
    const queue = {};
    parents.forEach(p => {
      const subs = shuffle(Object.keys(tree[p]));
      subs.forEach(s => { tree[p][s] = shuffle(tree[p][s]); });
      const q = [];
      let more = true;
      while (more) {
        more = false;
        subs.forEach(s => {
          if (tree[p][s].length) { q.push(tree[p][s].shift()); more = true; }
        });
      }
      queue[p] = q;
    });

    // Сонголтын эрэмбэ (жижиг оноо нь илүү):
    //   1) хараахан гараагүй дэд бүлэг  (1000 оноо)
    //   2) хамгийн ховор гарсан төрөл   (×10)
    //   3) дарааллын эхэнд байгаа нь    (+k)
    const kCount = {}, rSeen = {}, out = [];
    let guard = 0;
    while (out.length < n && guard++ < 800) {
      let moved = false;
      for (let i = 0; i < parents.length && out.length < n; i++) {
        const q = queue[parents[i]];
        if (!q.length) continue;
        const win = Math.min(q.length, 8);
        let best = 0, bv = Infinity;
        for (let k = 0; k < win; k++) {
          const sc = (rSeen[q[k].ref] ? 1000 : 0) + (kCount[q[k].k] || 0) * 10 + k;
          if (sc < bv) { bv = sc; best = k; }
        }
        const it = q.splice(best, 1)[0];
        kCount[it.k] = (kCount[it.k] || 0) + 1;
        rSeen[it.ref] = 1;
        out.push(it);
        moved = true;
      }
      if (!moved) break;
    }
    return shuffle(out);
  }

  // ------------------------------------------------- асуултыг дэлгэцэнд бэлтгэх
  function prepOne(it) {
    const o = { src: it, k: it.k, q: it.q, why: it.why, ref: it.ref };

    if (it.k === 'mc' || it.k === 'multi') {
      const idx = shuffle(it.opts.map((_, i) => i));
      o.opts = idx.map(i => it.opts[i]);
      const map = i => idx.indexOf(i);
      o.a = it.k === 'multi' ? it.a.map(map).sort((x, y) => x - y) : map(it.a);

    } else if (it.k === 'tf') {
      const idx = shuffle(it.stmts.map((_, i) => i));
      o.stmts = idx.map(i => it.stmts[i]);
      o.a     = idx.map(i => !!it.a[i]);

    } else if (it.k === 'match') {
      const L = shuffle(it.pairs);                     // зүүн талын дараалал
      const R = shuffle(it.pairs.map(p => p[1]));      // баруун талын дараалал
      o.left  = L.map(p => p[0]);
      o.right = R;
      o.a     = L.map(p => R.indexOf(p[1]));

    } else if (it.k === 'order') {
      o.a = it.seq.slice();                            // зөв дараалал (текстээр)
      let s = shuffle(it.seq);
      if (eqArr(s, o.a) && s.length > 1) s = s.slice(1).concat([s[0]]);
      o.opts = s;                                      // эхний эмх замбараагүй байдал

    } else if (it.k === 'fill') {
      // Гараас БИЧҮҮЛЭХГҮЙ — хувилбаруудыг холиод товшиж сонгуулна.
      // (Математик тэмдэглэгээг гараас зөв бичих бараг боломжгүй.)
      const opts = shuffle(it.opts && it.opts.length ? it.opts : [it.a]);
      o.opts = opts;
      o.a    = opts.indexOf(it.a);
      o.unit = it.unit || '';
    }
    return o;
  }
  function prep(items) { return shuffle(items).map(prepOne); }

  // ------------------------------------------------- хариуг шалгах
  function answered(it, v) {
    if (v === null || v === undefined) return false;
    if (it.k === 'multi') return v.length > 0;
    if (it.k === 'tf')    return v.every(x => x === true || x === false);
    if (it.k === 'match') return v.every(x => x !== null && x !== undefined && x !== -1);
    if (it.k === 'order') return true;                 // дараалал үргэлж "бөглөгдсөн"
    return true;
  }
  function grade(it, v) {
    if (v === null || v === undefined) return false;
    if (it.k === 'mc' || it.k === 'fill') return v === it.a;
    if (it.k === 'multi') return eqArr(v.slice().sort((a, b) => a - b), it.a);
    if (it.k === 'tf')    return eqArr(v, it.a);
    if (it.k === 'match') return eqArr(v, it.a);
    if (it.k === 'order') return eqArr(v, it.a);
    return false;
  }

  // ---------------------------------------------------------------- CSS
  function css() {
    if (document.getElementById('lp-test-css')) return;
    const st = document.createElement('style');
    st.id = 'lp-test-css';
    st.textContent = [
      '.ts-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px}',
      '.ts-card{border:1px solid var(--border);border-radius:14px;padding:16px 18px;',
      '  background:var(--bg-elevated);text-align:left;cursor:pointer;font:inherit;color:inherit;',
      '  transition:border-color .15s,transform .15s}',
      '.ts-card:hover{border-color:var(--accent);transform:translateY(-2px)}',
      '.ts-card .n{font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.55;',
      '  font-weight:700}',
      '.ts-card .t{font-size:16px;font-weight:600;margin:6px 0 4px;line-height:1.35}',
      '.ts-card .m{font-size:13px;opacity:.6}',
      '.ts-big{border:2px solid var(--accent);background:var(--accent-bg)}',
      '.ts-bar{display:flex;align-items:center;gap:14px;flex-wrap:wrap;',
      '  padding:12px 16px;border:1px solid var(--border);border-radius:12px;',
      '  background:var(--bg-elevated);margin-bottom:18px;position:sticky;top:12px;z-index:5}',
      '.ts-bar .sp{flex:1}',
      '.ts-clock{font-family:var(--font-mono);font-size:19px;font-weight:600}',
      '.ts-clock.warn{color:var(--rust)}',
      '.ts-q{border:1px solid var(--border);border-radius:14px;padding:18px 20px;',
      '  background:var(--bg-elevated);margin-bottom:14px}',
      '.ts-q .qn{font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.5;',
      '  font-weight:700;margin-bottom:8px}',
      '.ts-q .qt{font-size:16.5px;line-height:1.55;margin-bottom:12px}',
      '.ts-opt{display:flex;gap:11px;align-items:flex-start;padding:9px 12px;border-radius:10px;',
      '  cursor:pointer;border:1px solid transparent;transition:background .12s}',
      '.ts-opt:hover{background:var(--bg-muted)}',
      '.ts-opt.sel{background:var(--accent-bg);border-color:var(--accent)}',
      '.ts-opt input{margin-top:4px;flex:0 0 auto}',
      '.ts-opt span{line-height:1.5}',
      '.ts-hint{font-size:12.5px;opacity:.55;margin-top:6px}',
      // --- шинэ төрлүүд ---
      '.ts-tf{display:flex;gap:12px;align-items:flex-start;padding:9px 12px;border-radius:10px;',
      '  border:1px solid transparent}',
      '.ts-tf:hover{background:var(--bg-muted)}',
      '.ts-tf .sx{flex:1;line-height:1.5;min-width:0}',
      '.ts-tf .pick{display:flex;gap:4px;flex:0 0 auto}',
      '.ts-tf .pick label{font-size:13.5px;padding:4px 11px;border-radius:8px;cursor:pointer;',
      '  border:1px solid var(--border-strong);background:var(--bg-muted);white-space:nowrap}',
      '.ts-tf .pick label.on{background:var(--accent);border-color:var(--accent);color:#fff}',
      '.ts-tf .pick input{position:absolute;opacity:0;pointer-events:none}',
      '.ts-mt{display:grid;grid-template-columns:1fr auto;gap:9px 12px;align-items:center}',
      '.ts-mt .lf{line-height:1.45;font-size:15px}',
      '.ts-mt select{font:inherit;font-size:14px;padding:7px 9px;border-radius:9px;',
      '  border:1px solid var(--border-strong);background:var(--bg-muted);color:inherit;',
      '  max-width:360px}',
      '.ts-mkey{font-size:13.5px;opacity:.72;line-height:1.7;margin-top:12px;padding-top:10px;',
      '  border-top:1px dashed var(--border)}',
      '.ts-mkey b{font-family:var(--font-mono)}',
      '.ts-or{display:flex;flex-direction:column;gap:7px}',
      '.ts-or .row{display:flex;gap:10px;align-items:center;padding:9px 12px;border-radius:10px;',
      '  border:1px solid var(--border);background:var(--bg-muted)}',
      '.ts-or .row .ix{flex:0 0 26px;height:26px;border-radius:50%;display:flex;',
      '  align-items:center;justify-content:center;font-size:12.5px;font-weight:700;',
      '  background:var(--accent);color:#fff}',
      '.ts-or .row .tx{flex:1;line-height:1.45;min-width:0}',
      '.ts-or .row .mv{display:flex;gap:4px;flex:0 0 auto}',
      '.ts-or .row .mv button{font:inherit;font-size:15px;line-height:1;width:30px;height:30px;',
      '  border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-elevated);',
      '  cursor:pointer;color:inherit}',
      '.ts-or .row .mv button:hover:not(:disabled){border-color:var(--accent)}',
      '.ts-or .row .mv button:disabled{opacity:.3;cursor:default}',
      // нөхөх (сонголттой)
      '.ts-slot{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-bottom:12px}',
      '.ts-slot-v{min-width:130px;text-align:center;font-size:17px;font-weight:600;',
      '  padding:10px 16px;border-radius:10px;border:2px dashed var(--border-strong);',
      '  background:var(--bg-muted);line-height:1.3}',
      '.ts-slot-v.empty{opacity:.45;font-weight:400}',
      '.ts-slot-v:not(.empty){border-style:solid;border-color:var(--accent);',
      '  background:var(--accent-bg);color:var(--accent)}',
      '.ts-slot .un{font-size:15px;opacity:.7}',
      '.ts-chips{display:flex;gap:9px;flex-wrap:wrap}',
      '.ts-chip{font:inherit;font-size:15.5px;padding:9px 17px;border-radius:999px;',
      '  border:1px solid var(--border-strong);background:var(--bg-muted);color:inherit;',
      '  cursor:pointer;transition:background .12s,border-color .12s}',
      '.ts-chip:hover{border-color:var(--accent)}',
      '.ts-chip.on{background:var(--accent);border-color:var(--accent);color:#fff}',
      // --- үр дүн ---
      '.ts-score{display:flex;gap:22px;align-items:center;flex-wrap:wrap;',
      '  border:2px solid var(--accent);border-radius:16px;padding:20px 24px;',
      '  background:var(--accent-bg);margin-bottom:20px}',
      '.ts-score .big{font-family:var(--font-mono);font-size:44px;font-weight:700;line-height:1}',
      '.ts-score .pct{font-size:20px;font-weight:600;opacity:.75}',
      '.ts-score .lbl{font-size:13px;opacity:.7;margin-top:4px}',
      '.ts-sec{margin:22px 0 10px;font-size:17px;font-weight:600}',
      '.ts-topic{border:1px solid var(--border);border-left:4px solid var(--rust);',
      '  border-radius:12px;padding:14px 18px;margin-bottom:12px;background:var(--bg-elevated)}',
      '.ts-topic.ok{border-left-color:var(--accent)}',
      '.ts-topic .th{display:flex;justify-content:space-between;gap:12px;align-items:baseline;',
      '  flex-wrap:wrap}',
      '.ts-topic .tn{font-size:16px;font-weight:600}',
      '.ts-topic .tc{font-size:13.5px;opacity:.7}',
      '.ts-topic .acts{display:flex;gap:9px;margin-top:10px;flex-wrap:wrap}',
      '.ts-topic .acts button{font:inherit;font-size:13.5px;padding:6px 13px;border-radius:8px;',
      '  border:1px solid var(--border-strong);background:var(--bg-muted);cursor:pointer;',
      '  color:inherit}',
      '.ts-topic .acts button:hover{background:var(--bg-subtle)}',
      '.ts-rev{border:1px solid var(--border);border-radius:12px;padding:14px 18px;',
      '  margin-bottom:10px;background:var(--bg-elevated)}',
      '.ts-rev.bad{border-left:4px solid var(--rust)}',
      '.ts-rev.good{border-left:4px solid var(--accent)}',
      '.ts-rev .rq{font-size:15.5px;font-weight:600;line-height:1.5;margin-bottom:8px}',
      '.ts-rev .ra{font-size:14.5px;line-height:1.6;margin:3px 0}',
      '.ts-rev .ra.y{color:var(--accent)}',
      '.ts-rev .ra.n{color:var(--rust)}',
      '.ts-rev .ra.n s{opacity:.8}',
      '.ts-rev .rw{font-size:14.5px;line-height:1.6;margin-top:9px;padding-top:9px;',
      '  border-top:1px dashed var(--border);opacity:.85}',
      '.ts-rev ul{margin:4px 0 0;padding-left:20px;font-size:14.5px;line-height:1.65}',
      '.ts-rev ul li.n{color:var(--rust)}',
      '.ts-rev ul li.y{color:var(--accent)}',
      // --- багшийн шинжилгээ ---
      '.ts-ia{width:100%;border-collapse:collapse;font-size:14.5px}',
      '.ts-ia th{text-align:left;font-size:11px;letter-spacing:.12em;text-transform:uppercase;',
      '  opacity:.55;font-weight:700;padding:0 10px 8px}',
      '.ts-ia td{padding:10px;border-top:1px solid var(--border);vertical-align:top}',
      '.ts-ia .meter{height:8px;border-radius:4px;background:var(--bg-subtle);overflow:hidden;',
      '  min-width:90px}',
      '.ts-ia .meter i{display:block;height:100%;background:var(--rust)}',
      '@media(max-width:620px){.ts-mt{grid-template-columns:1fr}',
      '  .ts-mt select{max-width:none;width:100%}',
      '  .ts-tf{flex-direction:column;gap:7px}}',
    ].join('\n');
    document.head.appendChild(st);
  }

  // ---------------------------------------------------------------- сонгох дэлгэц
  function renderMenu(main) {
    const Access = window.LP.Access;
    const canExam = !Access || Access.canRoute('lessons');   // нэвтэрсэн эсэх

    main.appendChild(el('div', {
      html: '<h1 class="page-title">Мэдлэг <em>шалгах</em></h1>' +
            '<p class="page-subtitle">Сэдвээрээ тест өгөөд, аль хэсгийг дахин үзэх ' +
            'шаардлагатайг тань даруй харна.</p>'
    }));

    const all = lessonsWithExam();
    const total = all.reduce((s, n) => s + BANK()[n].length, 0);

    // --- ерөнхий шалгалт ---
    main.appendChild(el('h2', { class: 'ts-sec' }, 'Ерөнхий шалгалт'));
    const fin = el('button', { class: 'ts-card ts-big', type: 'button',
      onClick: () => canExam ? start(main, pickFinal(), 'final', FINAL_MIN)
                             : needLogin(main) });
    fin.appendChild(el('div', { class: 'n' }, 'Бүх сэдвээс'));
    fin.appendChild(el('div', { class: 't' }, 'Курсын нэгдсэн шалгалт'));
    fin.appendChild(el('div', { class: 'm' },
      FINAL_N + ' асуулт · ' + FINAL_MIN + ' минут · ' +
      (canExam ? 'үр дүн хадгалагдана' : '🔒 нэвтэрсэн байх шаардлагатай')));
    main.appendChild(fin);

    // --- сэдвийн тест ---
    main.appendChild(el('h2', { class: 'ts-sec' }, 'Сэдвийн тест'));
    main.appendChild(el('p', { class: 'ts-hint', style: { marginBottom: '12px' } },
      'Удаа бүрт санамсаргүй ' + SIT_N + ' асуулт гарна — гэхдээ тухайн сэдвийн ' +
      'бүх дэд хэсгийг хамарна. Дахин өгөх бүрд асуултууд солигдоно. ' +
      (canExam ? 'Үр дүн хадгалагдаж, багшид харагдана.'
               : 'Бүртгэлгүйгээр дасгал хэлбэрээр өгч болно — үр дүн хадгалагдахгүй.')));

    const grid = el('div', { class: 'ts-grid' });
    all.forEach(n => {
      const items = BANK()[n];
      const kinds = {};
      items.forEach(it => { kinds[it.k] = 1; });
      const c = el('button', { class: 'ts-card', type: 'button',
        onClick: () => start(main, prep(pickCovered(items, SIT_N)), 'l' + n, 0) });
      c.appendChild(el('div', { class: 'n' }, 'Хичээл ' + n + ' · Бүлэг ' + CH_OF[n]));
      c.appendChild(el('div', { class: 't' }, lessonTitle(n)));
      c.appendChild(el('div', { class: 'm' },
        Math.min(SIT_N, items.length) + ' асуулт · ' + items.length + '-ийн сангаас · ' +
        Object.keys(kinds).length + ' төрөл'));
      grid.appendChild(c);
    });
    main.appendChild(grid);

    if (all.length < 16) {
      main.appendChild(el('p', { class: 'ts-hint', style: { marginTop: '14px' } },
        'Бусад хичээлийн асуултын сан бэлтгэгдэж байна (' + total + ' асуулт бэлэн).'));
    }

    // --- багшийн шинжилгээ ---
    if (Access && Access.can && Access.can('progress.viewAll')) {
      main.appendChild(el('h2', { class: 'ts-sec' }, 'Багшийн шинжилгээ'));
      const b = el('button', { class: 'ts-card', type: 'button',
        style: { maxWidth: '420px' }, onClick: () => renderAnalysis(main) });
      b.appendChild(el('div', { class: 'n' }, 'Зөвхөн багш, админ'));
      b.appendChild(el('div', { class: 't' }, 'Ангийн хамгийн их алдаа'));
      b.appendChild(el('div', { class: 'm' }, 'Аль сэдвийг дахин тайлбарлах шаардлагатайг харуулна'));
      main.appendChild(b);
    }
  }

  function needLogin(main) {
    main.innerHTML = '';
    main.appendChild(el('div', { class: 'card',
      html: '<h1 class="page-title">Нэвтрэх шаардлагатай</h1>' +
            '<p>Ерөнхий шалгалтын үр дүн хадгалагддаг тул нэвтэрсэн байх ёстой. ' +
            'Сэдвийн тестийг бүртгэлгүйгээр өгч болно.</p>' }));
    main.appendChild(el('button', { class: 'btn btn-secondary',
      style: { marginTop: '14px' }, onClick: () => App.go('test') }, '← Буцах'));
  }

  function pickFinal() {
    const pool = [];
    lessonsWithExam().forEach(n => (BANK()[n] || []).forEach(it => pool.push(it)));
    return prep(pickCovered(pool, FINAL_N));
  }

  // ---------------------------------------------------------------- тест өгөх
  function start(main, items, key, minutes) {
    if (!items.length) return;
    main.innerHTML = '';
    css();
    const answers = items.map(it => it.k === 'order' ? it.opts.slice()
                                  : it.k === 'match' ? it.left.map(() => null)
                                  : it.k === 'tf'    ? it.stmts.map(() => null)
                                  : null);
    let left = minutes * 60, timer = null, submitted = false;

    const bar = el('div', { class: 'ts-bar' });
    const cnt = el('span', {});
    bar.appendChild(cnt);
    bar.appendChild(el('span', { class: 'sp' }));
    const clock = el('span', { class: 'ts-clock' });
    if (minutes) bar.appendChild(clock);
    bar.appendChild(el('button', { class: 'btn btn-primary', onClick: () => finish() },
                                 'Дуусгах'));
    main.appendChild(bar);

    function recount() {
      cnt.textContent = items.filter((it, i) => answered(it, answers[i])).length +
                        ' / ' + items.length + ' хариулсан';
    }

    items.forEach((it, i) => {
      const box = el('div', { class: 'ts-q' });
      box.appendChild(el('div', { class: 'qn' },
        'Асуулт ' + (i + 1) + ' / ' + items.length + ' · ' + (K_NAME[it.k] || '')));
      box.appendChild(el('div', { class: 'qt' }, it.q));
      box.appendChild(buildInput(it, i, answers, recount));
      main.appendChild(box);
    });

    const bot = el('div', { style: { margin: '18px 0 40px' } });
    bot.appendChild(el('button', { class: 'btn btn-primary', onClick: () => finish() },
                                 'Шалгалтыг дуусгах'));
    main.appendChild(bot);
    recount();

    function tick() {
      left--;
      const m = Math.floor(left / 60), s = left % 60;
      clock.textContent = m + ':' + String(s).padStart(2, '0');
      clock.classList.toggle('warn', left <= 120);
      if (left <= 0) { clearInterval(timer); finish(true); }
    }
    if (minutes) { clock.textContent = minutes + ':00'; timer = setInterval(tick, 1000); }

    function finish(auto) {
      if (submitted) return;
      const miss = items.filter((it, i) => !answered(it, answers[i])).length;
      if (!auto && miss &&
          !confirm(miss + ' асуулт хариулаагүй байна. Дуусгах уу?')) return;
      submitted = true;
      if (timer) clearInterval(timer);
      showResult(main, items, answers, key, auto);
    }
  }

  // ------------------------------------------------- төрөл тус бүрийн оролт
  function buildInput(it, i, answers, recount) {
    const wrap = el('div');

    // ---- mc / multi ----
    if (it.k === 'mc' || it.k === 'multi') {
      it.opts.forEach((o, j) => {
        const lab = el('label', { class: 'ts-opt' });
        const inp = el('input', { type: it.k === 'multi' ? 'checkbox' : 'radio',
                                  name: 'q' + i });
        inp.addEventListener('change', () => {
          if (it.k === 'multi') {
            const cur = answers[i] || [];
            answers[i] = inp.checked ? cur.concat([j]).sort((a, b) => a - b)
                                     : cur.filter(x => x !== j);
            if (!answers[i].length) answers[i] = null;
          } else {
            answers[i] = j;
          }
          [].forEach.call(wrap.querySelectorAll('.ts-opt'), l =>
            l.classList.toggle('sel', !!l.querySelector('input').checked));
          recount();
        });
        lab.appendChild(inp);
        lab.appendChild(el('span', {}, o));
        wrap.appendChild(lab);
      });
      return wrap;
    }

    // ---- tf: мэдэгдэл бүрт Үнэн / Худал ----
    if (it.k === 'tf') {
      it.stmts.forEach((s, j) => {
        const row = el('div', { class: 'ts-tf' });
        row.appendChild(el('div', { class: 'sx' }, s));
        const pick = el('div', { class: 'pick' });
        [['Үнэн', true], ['Худал', false]].forEach(pair => {
          const lab = el('label', {});
          const inp = el('input', { type: 'radio', name: 'q' + i + 's' + j });
          inp.addEventListener('change', () => {
            answers[i][j] = pair[1];
            [].forEach.call(pick.querySelectorAll('label'), l =>
              l.classList.toggle('on', !!l.querySelector('input').checked));
            recount();
          });
          lab.appendChild(inp);
          lab.appendChild(document.createTextNode(pair[0]));
          pick.appendChild(lab);
        });
        row.appendChild(pick);
        wrap.appendChild(row);
      });
      return wrap;
    }

    // ---- match: зүүн зүйл бүрт баруун талын хувилбарыг сонгоно ----
    if (it.k === 'match') {
      const g = el('div', { class: 'ts-mt' });
      it.left.forEach((L, j) => {
        g.appendChild(el('div', { class: 'lf' }, (j + 1) + '. ' + L));
        const sel = el('select');
        sel.appendChild(el('option', { value: '' }, '— сонгоно уу —'));
        it.right.forEach((R, k) => {
          sel.appendChild(el('option', { value: String(k) },
                             LETTER[k] + '. ' + R));
        });
        sel.addEventListener('change', () => {
          answers[i][j] = sel.value === '' ? null : parseInt(sel.value, 10);
          recount();
        });
        g.appendChild(sel);
      });
      wrap.appendChild(g);
      wrap.appendChild(el('div', { class: 'ts-mkey' },
        it.right.map((R, k) => LETTER[k] + '. ' + R).join('   ·   ')));
      return wrap;
    }

    // ---- order: ↑ ↓ товчоор зөв дараалалд оруулна ----
    if (it.k === 'order') {
      const list = el('div', { class: 'ts-or' });
      function draw() {
        list.innerHTML = '';
        answers[i].forEach((txt, j) => {
          const row = el('div', { class: 'row' });
          row.appendChild(el('span', { class: 'ix' }, String(j + 1)));
          row.appendChild(el('span', { class: 'tx' }, txt));
          const mv = el('div', { class: 'mv' });
          const up = el('button', { type: 'button', title: 'Дээш' }, '↑');
          const dn = el('button', { type: 'button', title: 'Доош' }, '↓');
          if (j === 0) up.disabled = true;
          if (j === answers[i].length - 1) dn.disabled = true;
          up.addEventListener('click', () => {
            const a = answers[i];
            [a[j - 1], a[j]] = [a[j], a[j - 1]]; draw(); recount();
          });
          dn.addEventListener('click', () => {
            const a = answers[i];
            [a[j + 1], a[j]] = [a[j], a[j + 1]]; draw(); recount();
          });
          mv.appendChild(up); mv.appendChild(dn);
          row.appendChild(mv);
          list.appendChild(row);
        });
      }
      draw();
      wrap.appendChild(list);
      wrap.appendChild(el('div', { class: 'ts-hint' },
        '↑ ↓ товчоор зөв дарааллаар нь өрнө үү.'));
      return wrap;
    }

    // ---- fill: нөхөх нүдэнд тавих хариугаа хувилбараас ТОВШИЖ сонгоно ----
    if (it.k === 'fill') {
      const slot = el('div', { class: 'ts-slot' });
      const val  = el('span', { class: 'ts-slot-v empty' }, '?');
      slot.appendChild(val);
      if (it.unit) slot.appendChild(el('span', { class: 'un' }, it.unit));
      wrap.appendChild(slot);

      const row = el('div', { class: 'ts-chips' });
      const chips = [];
      it.opts.forEach((o, j) => {
        const c = el('button', { type: 'button', class: 'ts-chip' }, o);
        c.addEventListener('click', () => {
          answers[i] = j;
          chips.forEach((x, k) => x.classList.toggle('on', k === j));
          val.textContent = o;
          val.classList.remove('empty');
          recount();
        });
        chips.push(c);
        row.appendChild(c);
      });
      wrap.appendChild(row);
      wrap.appendChild(el('div', { class: 'ts-hint' },
        'Зөв хариултыг товшиж нөхөх нүдэнд тавина уу.'));
      return wrap;
    }

    return wrap;
  }

  // ------------------------------------------------- хариуг текстээр харуулах
  function fmtMine(it, v) {
    if (it.k === 'mc' || it.k === 'fill')
      return (v === null || v === undefined) ? '— хариулаагүй'
             : it.opts[v] + (it.unit ? ' ' + it.unit : '');
    if (it.k === 'multi') return (v && v.length) ? v.map(j => it.opts[j]).join('; ')
                                                 : '— хариулаагүй';
    if (it.k === 'order') return (v || []).map((t, j) => (j + 1) + ') ' + t).join('  ');
    return '';
  }
  function fmtRight(it) {
    if (it.k === 'mc')    return it.opts[it.a];
    if (it.k === 'fill')  return it.opts[it.a] + (it.unit ? ' ' + it.unit : '');
    if (it.k === 'multi') return it.a.map(j => it.opts[j]).join('; ');
    if (it.k === 'order') return it.a.map((t, j) => (j + 1) + ') ' + t).join('  ');
    return '';
  }

  // ---------------------------------------------------------------- үр дүн
  function showResult(main, items, answers, key, auto) {
    main.innerHTML = '';
    const got = items.map((it, i) => grade(it, answers[i]));
    const n = got.filter(Boolean).length;
    const pct = Math.round(n / items.length * 100);

    const byCh = {};
    items.forEach((it, i) => {
      const c = chOfRef(it.ref);
      byCh[c] = byCh[c] || { ok: 0, bad: 0, refs: {} };
      if (got[i]) byCh[c].ok++;
      else { byCh[c].bad++; byCh[c].refs[it.ref] = (byCh[c].refs[it.ref] || 0) + 1; }
    });

    main.appendChild(el('div', {
      html: '<h1 class="page-title">Шалгалтын <em>үр дүн</em></h1>' +
            (auto ? '<p class="page-subtitle">Хугацаа дууссан тул автоматаар дуусгав.</p>' : '')
    }));

    const sc = el('div', { class: 'ts-score' });
    const lf = el('div');
    lf.appendChild(el('div', { class: 'big' }, n + ' / ' + items.length));
    lf.appendChild(el('div', { class: 'lbl' }, 'зөв хариулт'));
    sc.appendChild(lf);
    const rt = el('div');
    rt.appendChild(el('div', { class: 'pct' }, pct + '%'));
    rt.appendChild(el('div', { class: 'lbl' },
      pct >= 90 ? 'Маш сайн — бүх сэдвийг эзэмшсэн' :
      pct >= 70 ? 'Сайн — цөөн хэдэн сэдвийг давтах хэрэгтэй' :
      pct >= 50 ? 'Дунд — доорх сэдвүүдийг заавал дахин үзнэ үү' :
                  'Суурь ойлголтуудыг эхнээс нь дахин үзэх шаардлагатай'));
    sc.appendChild(rt);
    main.appendChild(sc);

    // --- дахин үзэх сэдвүүд ---
    const bad  = Object.keys(byCh).map(Number).filter(c => byCh[c].bad > 0)
                   .sort((a, b) => byCh[b].bad - byCh[a].bad);
    const good = Object.keys(byCh).map(Number).filter(c => byCh[c].bad === 0);

    if (bad.length) {
      main.appendChild(el('h2', { class: 'ts-sec' }, '⚠ Дахин үзэх шаардлагатай'));
      bad.forEach(c => {
        const t = byCh[c];
        const box = el('div', { class: 'ts-topic' });
        const h = el('div', { class: 'th' });
        h.appendChild(el('span', { class: 'tn' }, 'Бүлэг ' + c + ' · ' + (CH_NAME[c] || '')));
        h.appendChild(el('span', { class: 'tc' },
          t.bad + ' алдаа / ' + (t.ok + t.bad) + ' асуулт'));
        box.appendChild(h);
        const refs = Object.keys(t.refs).sort();
        if (refs.length) {
          box.appendChild(el('div', { class: 'tc', style: { marginTop: '6px' } },
            'Дэд бүлэг: ' + refs.join(', ')));
        }
        const acts = el('div', { class: 'acts' });
        LESSONS_OF(c).forEach(ln => {
          acts.appendChild(el('button', { onClick: () => App.go('lesson', { n: ln }) },
            '📖 Хичээл ' + ln + ' рүү очих'));
        });
        if (CH_VIDEO[c]) {
          acts.appendChild(el('button',
            { onClick: () => App.go('video', { id: CH_VIDEO[c] }) }, '🎬 Видео үзэх'));
        }
        box.appendChild(acts);
        main.appendChild(box);
      });
    }
    if (good.length) {
      main.appendChild(el('h2', { class: 'ts-sec' }, '✓ Сайн эзэмшсэн'));
      const g = el('div', { class: 'ts-topic ok' });
      g.appendChild(el('div', { class: 'tn' },
        good.map(c => 'Бүлэг ' + c + ' · ' + (CH_NAME[c] || '')).join('  ·  ')));
      main.appendChild(g);
    }

    // --- асуулт тус бүрийн задаргаа ---
    main.appendChild(el('h2', { class: 'ts-sec' }, 'Асуулт тус бүрээр'));
    items.forEach((it, i) => {
      const ok = got[i], v = answers[i];
      const box = el('div', { class: 'ts-rev ' + (ok ? 'good' : 'bad') });
      box.appendChild(el('div', { class: 'rq' },
        (ok ? '✓ ' : '✗ ') + (i + 1) + '. ' + it.q));

      if (it.k === 'tf') {
        const ul = el('ul');
        it.stmts.forEach((s, j) => {
          const r = v[j] === it.a[j];
          ul.appendChild(el('li', { class: r ? 'y' : 'n' },
            s + ' — зөв нь: ' + (it.a[j] ? 'Үнэн' : 'Худал') +
            (r ? '' : ' (та: ' + (v[j] === null ? 'хариулаагүй' :
                                   v[j] ? 'Үнэн' : 'Худал') + ')')));
        });
        box.appendChild(ul);

      } else if (it.k === 'match') {
        const ul = el('ul');
        it.left.forEach((L, j) => {
          const r = v[j] === it.a[j];
          ul.appendChild(el('li', { class: r ? 'y' : 'n' },
            L + ' → ' + it.right[it.a[j]] +
            (r ? '' : ' (та: ' + (v[j] === null || v[j] === undefined
                                  ? 'сонгоогүй' : it.right[v[j]]) + ')')));
        });
        box.appendChild(ul);

      } else {
        if (!ok) {
          box.appendChild(el('div', { class: 'ra n' },
            'Таны хариу: ' + fmtMine(it, v)));
        }
        box.appendChild(el('div', { class: 'ra y' }, 'Зөв хариу: ' + fmtRight(it)));
      }

      if (!ok && it.why) {
        box.appendChild(el('div', { class: 'rw' },
          it.why + (it.ref ? '  → Бүлэг ' + it.ref : '')));
      }
      main.appendChild(box);
    });

    const acts = el('div', { style: { display: 'flex', gap: '10px', margin: '22px 0 40px',
                                      flexWrap: 'wrap' } });
    acts.appendChild(el('button', { class: 'btn btn-primary', onClick: () => App.go('test') },
                                  'Өөр тест өгөх'));
    main.appendChild(acts);

    save(key, n, items.length, byCh);
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------- хадгалах
  function save(key, got, tot, byCh) {
    const Auth = window.LP.Auth, Data = window.LP.Data;
    if (!Auth || !Data || !Auth.currentUser) return;
    const u = Auth.currentUser();
    if (!u) return;                                   // зочны үр дүн хадгалагдахгүй
    const weak = Object.keys(byCh).filter(c => byCh[c].bad > 0).join(',');
    try {
      Data.progress.set(u.id, 'test.' + key,
        got + '/' + tot + (weak ? '|' + weak : ''));
    } catch (e) {}
  }

  // ---------------------------------------------------------------- багшийн шинжилгээ
  function renderAnalysis(main) {
    main.innerHTML = '';
    css();
    main.appendChild(el('div', {
      html: '<h1 class="page-title">Багшийн <em>шинжилгээ</em></h1>' +
            '<p class="page-subtitle">Оюутнуудын шалгалтын үр дүнгээс аль сэдэв хамгийн ' +
            'бэрхшээлтэй байгааг харуулна.</p>'
    }));
    const wait = el('p', {}, 'Ачаалж байна…');
    main.appendChild(wait);

    window.LP.Data.progress.all().then(rows => {
      wait.remove();
      const chBad = {};
      let tests = 0, scoreSum = 0, scoreN = 0;
      (rows || []).forEach(r => {
        const p = r.progress || {};
        Object.keys(p).forEach(k => {
          if (k.indexOf('test.') !== 0) return;
          tests++;
          const v = String(p[k] || '');
          const m = v.match(/^(\d+)\/(\d+)/);
          if (m) { scoreSum += (+m[1]) / (+m[2]); scoreN++; }
          (v.split('|')[1] || '').split(',').filter(Boolean)
            .forEach(c => { chBad[c] = (chBad[c] || 0) + 1; });
        });
      });

      if (!tests) {
        main.appendChild(el('div', { class: 'card' },
          'Одоогоор нэг ч шалгалтын үр дүн бүртгэгдээгүй байна.'));
      } else {
        const sum = el('div', { class: 'ts-score' });
        const a = el('div');
        a.appendChild(el('div', { class: 'big' }, String(tests)));
        a.appendChild(el('div', { class: 'lbl' }, 'нийт шалгалт'));
        sum.appendChild(a);
        const b = el('div');
        b.appendChild(el('div', { class: 'pct' },
          scoreN ? Math.round(scoreSum / scoreN * 100) + '%' : '—'));
        b.appendChild(el('div', { class: 'lbl' }, 'дундаж амжилт'));
        sum.appendChild(b);
        main.appendChild(sum);

        const ranked = Object.keys(chBad).map(Number).sort((x, y) => chBad[y] - chBad[x]);
        const max = ranked.length ? chBad[ranked[0]] : 1;
        main.appendChild(el('h2', { class: 'ts-sec' }, 'Хамгийн бэрхшээлтэй сэдвүүд'));
        const tbl = el('table', { class: 'ts-ia' });
        tbl.innerHTML = '<thead><tr><th>Бүлэг</th><th>Сэдэв</th>' +
                        '<th>Алдсан оюутан</th><th></th></tr></thead>';
        const tb = el('tbody');
        ranked.forEach(c => {
          const tr = el('tr');
          tr.appendChild(el('td', {}, 'Бүлэг ' + c));
          tr.appendChild(el('td', {}, CH_NAME[c] || ''));
          tr.appendChild(el('td', {}, String(chBad[c])));
          const td = el('td');
          const mt = el('div', { class: 'meter' });
          mt.appendChild(el('i', { style: { width: Math.round(chBad[c] / max * 100) + '%' } }));
          td.appendChild(mt);
          tr.appendChild(td);
          tb.appendChild(tr);
        });
        tbl.appendChild(tb);
        main.appendChild(tbl);
        main.appendChild(el('p', { class: 'ts-hint', style: { marginTop: '12px' } },
          'Жагсаалтын эхний хоёр сэдвийг дараагийн лекц дээрээ дахин тайлбарлах нь ' +
          'хамгийн их үр дүнтэй.'));
      }
      main.appendChild(el('button', { class: 'btn btn-secondary',
        style: { marginTop: '20px' }, onClick: () => App.go('test') }, '← Буцах'));
    }).catch(() => {
      wait.textContent = 'Үр дүнг татаж чадсангүй. Дараа дахин оролдоно уу.';
    });
  }

  // ---------------------------------------------------------------- бүртгэх
  App.register('test', function (main, params) {
    css();
    if (params && params.lesson && (BANK()[params.lesson] || []).length) {
      return start(main, prep(pickCovered(BANK()[params.lesson], SIT_N)),
                   'l' + params.lesson, 0);
    }
    if (params && params.mode === 'final') {
      return start(main, pickFinal(), 'final', FINAL_MIN);
    }
    renderMenu(main);
  });
})();
