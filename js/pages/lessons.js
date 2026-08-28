// =============================================================================
// LESSONS — 16 долоо хоногийн хичээлийн жагсаалт (зөвхөн бүртгэлтэй хэрэглэгч)
// =============================================================================
(function () {
  'use strict';
  const el   = window.LP.el;
  const App  = window.LP.App;
  const Auth = window.LP.Auth;
  const Data = window.LP.Data;
  const Book = window.LP.Book;
  const LESSONS = window.LP.Curriculum;

  App.register('lessons', main => {
    main.appendChild(el('div', {
      html: '<h1 class="page-title">Хичээл <em>16 долоо хоног</em></h1>' +
            '<p class="page-subtitle">Долоо хоног бүр 1.5 цагийн лекц ба 1.5 цагийн дадлага. ' +
            'Агуулга нь "Шугаман программчлал" сурах бичгийн 10 бүлэгт тулгуурлана.</p>'
    }));

    // Явцын хураангуй
    const summary = el('div', { class: 'card card-tight' });
    main.appendChild(summary);

    const grid = el('div', { class: 'lesson-grid' });
    main.appendChild(grid);

    const user = Auth.currentUser();
    Data.progress.get(user.id).then(prog => {
      prog = prog || {};

      const doneLec = LESSONS.filter(l => prog['l' + l.n + '.lecture']).length;
      const donePra = LESSONS.filter(l => prog['l' + l.n + '.practice']).length;
      const pct = Math.round((doneLec + donePra) / (LESSONS.length * 2) * 100);

      summary.innerHTML = '';
      const row = el('div', { class: 'stat-row' });
      [['Нийт сэдэв', LESSONS.length],
       ['Үзсэн лекц', doneLec + ' / ' + LESSONS.length],
       ['Хийсэн дадлага', donePra + ' / ' + LESSONS.length],
       ['Явц', pct + '%']].forEach(([label, val]) => {
        const s = el('div', { class: 'stat-tile' });
        s.appendChild(el('div', { class: 'stat-value' }, String(val)));
        s.appendChild(el('div', { class: 'stat-label' }, label));
        row.appendChild(s);
      });
      summary.appendChild(row);
      const bar = el('div', { class: 'progress-bar' });
      bar.appendChild(el('div', { class: 'progress-fill', style: { width: pct + '%' } }));
      summary.appendChild(bar);

      LESSONS.forEach(l => {
        const lecDone = !!prog['l' + l.n + '.lecture'];
        const praDone = !!prog['l' + l.n + '.practice'];
        const card = el('button', {
          class: 'lesson-card' + (lecDone && praDone ? ' done' : ''),
          onClick: () => App.go('lesson', { n: l.n })
        });

        const top = el('div', { class: 'lesson-top' });
        top.appendChild(el('span', { class: 'lesson-week' }, 'Долоо хоног ' + l.n));
        top.appendChild(el('span', { class: 'lesson-chapter' }, 'Бүлэг ' + l.ch));
        card.appendChild(top);

        card.appendChild(el('div', { class: 'lesson-title' }, l.title));
        card.appendChild(el('div', { class: 'lesson-brief' }, l.brief));

        const marks = el('div', { class: 'lesson-marks' });
        marks.appendChild(el('span', { class: 'mark' + (lecDone ? ' on' : '') },
          (lecDone ? '✓' : '○') + ' Лекц 1.5ц'));
        marks.appendChild(el('span', { class: 'mark' + (praDone ? ' on' : '') },
          (praDone ? '✓' : '○') + ' Дадлага 1.5ц'));
        if (l.slides) marks.appendChild(el('span', { class: 'mark has-slides' }, '🖥 Слайд'));
        card.appendChild(marks);

        grid.appendChild(card);
      });
    });
  });

  // ===========================================================================
  // НЭГ ХИЧЭЭЛ — лекц / дадлага таб
  // ===========================================================================
  App.register('lesson', (main, params) => {
    const n = Number(params.n) || 1;
    const L = LESSONS.find(x => x.n === n);
    if (!L) { main.innerHTML = '<div class="card"><p>Хичээл олдсонгүй.</p></div>'; return; }

    const user = Auth.currentUser();

    // ---- Толгой хэсэг ----
    const head = el('div', { class: 'lesson-head' });
    const back = el('button', { class: 'btn btn-ghost btn-xs', onClick: () => App.go('lessons') },
      '← Бүх хичээл');
    head.appendChild(back);
    head.appendChild(el('h1', { class: 'page-title', style: { marginTop: '8px' } },
      'Долоо хоног ' + L.n + '. ' + L.title));
    head.appendChild(el('p', { class: 'page-subtitle' },
      L.brief + ' · Эх сурвалж: Бүлэг ' + L.ch + ' — ' + Book.TITLES[L.ch]));

    // Хичээлд хамаарах кейсийн богино холбоос
    const CASE_BY_CH = {
      1: [], 2: ['Модон урлал', 'Хиам'], 3: ['Модон урлал', 'Гоо Мебель', 'Норов'],
      4: ['Модон урлал'], 5: ['Модон урлал'], 6: ['Хиам'], 7: ['Модон урлал'],
      8: [], 9: [], 10: [],
    };
    const cs = (window.LP.Enrich ? (CASE_BY_CH[L.ch] || []) : []);
    if (cs.length) {
      const row = el('div', { class: 'dr-actions', style: { marginTop: '4px' } });
      row.appendChild(el('span', { class: 'dr-kind', style: { marginLeft: '0' } },
        'Кейсийн өгөгдөл:'));
      cs.forEach(k => row.appendChild(el('button', {
        class: 'case-chip', type: 'button',
        onClick: () => window.LP.Enrich.openCase(k),
      }, '«' + k + '»')));
      head.appendChild(row);
    }
    main.appendChild(head);

    // ---- Таб ----
    const tabs = el('div', { class: 'pill-toggle lesson-tabs' });
    const body = el('div', { class: 'lesson-body' });
    let tab = 'lecture';

    const lecBtn = el('button', { class: 'active', onClick: () => setTab('lecture') }, 'Лекц (1.5 цаг)');
    const praBtn = el('button', { onClick: () => setTab('practice') }, 'Дадлага (1.5 цаг)');
    const sldBtn = el('button', { onClick: () => setTab('slides') }, '🖥 Слайд');
    tabs.appendChild(lecBtn); tabs.appendChild(praBtn); tabs.appendChild(sldBtn);
    main.appendChild(tabs);
    main.appendChild(body);

    function setTab(t) {
      tab = t;
      lecBtn.classList.toggle('active', t === 'lecture');
      praBtn.classList.toggle('active', t === 'practice');
      sldBtn.classList.toggle('active', t === 'slides');
      render();
    }

    function markBtn(kind) {
      const key = 'l' + L.n + '.' + kind;
      const btn = el('button', { class: 'btn btn-secondary' }, '…');
      Data.progress.get(user.id).then(p => {
        const done = !!(p && p[key]);
        btn.textContent = done ? '✓ Дууссан гэж тэмдэглэсэн' : 'Дууссан гэж тэмдэглэх';
        btn.className = 'btn ' + (done ? 'btn-ghost' : 'btn-secondary');
        btn.onclick = () => {
          Data.progress.set(user.id, key, done ? null : Date.now()).then(() => {
            window.LP.showToast(done ? 'Тэмдэглэгээ авлаа' : '✓ Тэмдэглэлээ');
            render();
          });
        };
      });
      return btn;
    }

    function toolButton() {
      const routes = {
        glossary: 'Glossary', formulation: 'Бодлогын тавилт', graphical: 'Графикийн арга',
        matrix: 'Матрицын арга', simplex: 'Симплекс арга', bigm: 'Big-M арга',
        duality: 'Хосмог бодлого', transport_table: 'Тээвэр — Хүснэгт',
        transport_network: 'Тээвэр — Сүлжээ', integer: 'Бүхэл тоон программчлал',
      };
      return el('button', {
        class: 'btn btn-primary',
        onClick: () => App.go(L.tool)
      }, '▶ ' + (routes[L.tool] || L.tool) + ' хэсэг рүү очих');
    }

    // ---- Слайдын таб (номын өгөгдөл шаардахгүй тул тусад нь) ----
    function renderSlides() {
      body.innerHTML = '';

      if (!L.slides) {
        const empty = el('div', { class: 'card empty-state' });
        empty.appendChild(el('div', { class: 'empty-state-icon' }, '🖥'));
        empty.appendChild(el('div', { class: 'empty-state-title' }, 'Слайд бэлтгэгдэж байна'));
        empty.appendChild(el('div', { class: 'empty-state-text' },
          'Долоо хоног ' + L.n + '-ийн лекцийн слайд хараахан бэлэн болоогүй байна. ' +
          'Одоохондоо "Лекц" табаас номын бүрэн агуулгыг үзнэ үү.'));
        empty.appendChild(el('button', {
          class: 'btn btn-primary', onClick: () => setTab('lecture')
        }, '← Лекц рүү буцах'));
        body.appendChild(empty);
        return;
      }

      const wrap = el('div', { class: 'card slide-card' });

      // Товчлуурын мөр
      const bar = el('div', { class: 'slide-toolbar' });
      const frame = el('iframe', {
        class: 'slide-frame',
        src: L.slides,
        title: 'Хичээл ' + L.n + ' — лекцийн слайд',
        allow: 'fullscreen',
        allowfullscreen: 'true',
        loading: 'lazy',
      });

      bar.appendChild(el('button', {
        class: 'btn btn-primary btn-xs',
        onClick: () => {
          const req = frame.requestFullscreen || frame.webkitRequestFullscreen;
          if (!req) { window.open(L.slides, '_blank'); return; }
          Promise.resolve(req.call(frame))
            .then(() => setTimeout(() => frame.focus(), 200))
            .catch(() => window.open(L.slides, '_blank'));
        }
      }, '⛶ Бүтэн дэлгэц'));
      bar.appendChild(el('button', {
        class: 'btn btn-secondary btn-xs',
        onClick: () => window.open(L.slides, '_blank')
      }, '↗ Шинэ цонхонд нээх'));
      bar.appendChild(el('button', {
        class: 'btn btn-ghost btn-xs',
        onClick: () => { frame.contentWindow.location.reload(); frame.focus(); }
      }, '↺ Эхнээс'));
      bar.appendChild(el('span', { class: 'slide-hint' },
        'Товчлуур ажиллуулахын тулд слайд дээр нэг товшино уу'));
      wrap.appendChild(bar);

      // Слайдын хүрээ (16:9)
      const stage = el('div', { class: 'slide-embed' });
      stage.appendChild(frame);
      stage.addEventListener('click', () => frame.focus());
      wrap.appendChild(stage);

      // Товчлуурын тайлбар
      const keys = el('div', { class: 'slide-keys' });
      [['← →', 'слайд солих'], ['O', 'бүх слайдын тойм'], ['S', 'багшийн тэмдэглэл'],
       ['F', 'бүтэн дэлгэц'], ['T', 'шөнө / цаас загвар'], ['W', 'камерын ус тэмдэг'],
       ['H', 'бүх товчлуур']].forEach(([k, t]) => {
        const row = el('span', { class: 'slide-key' });
        row.appendChild(el('kbd', {}, k));
        row.appendChild(el('span', {}, t));
        keys.appendChild(row);
      });
      wrap.appendChild(keys);
      body.appendChild(wrap);

      const nav = el('div', { class: 'action-bar' });
      nav.appendChild(el('button', {
        class: 'btn btn-ghost', onClick: () => setTab('lecture')
      }, '← Лекцийн бүрэн агуулга'));
      nav.appendChild(el('button', {
        class: 'btn btn-ghost', onClick: () => setTab('practice')
      }, 'Дадлага руу →'));
      body.appendChild(nav);
    }

    function render() {
      if (tab === 'slides') { renderSlides(); return; }

      body.innerHTML = '';
      body.appendChild(el('div', { class: 'loading' }, 'Ачаалж байна…'));

      Book.load(L.ch).then(ch => {
        body.innerHTML = '';
        if (window.LP.Enrich) window.LP.Enrich.resetScope();

        if (tab === 'lecture') {
          // Сурах зорилт
          const obj = el('div', { class: 'card objectives-card' });
          obj.appendChild(el('h3', { class: 'subsection' }, '◇ Сурах зорилт'));
          const ul = el('ul', { class: 'objective-list' });
          L.objectives.forEach(o => ul.appendChild(el('li', {}, o)));
          obj.appendChild(ul);
          body.appendChild(obj);

          // Онолын агуулга — дундуур нь мэдлэг шалгах тест оруулна
          const blocks = window.LP.Book.slice(ch.blocks, L.sections)
            .filter(b => !(b.t === 'h' && b.lvl === 2 &&
              /хариу түлхүүр|дасгал ажил/i.test(b.x)));
          const filtered = dropAfterExercises(blocks);
          renderWithChecks(filtered, L.n).forEach(node => body.appendChild(node));

          const bar = el('div', { class: 'action-bar' });
          if (L.slides) {
            bar.appendChild(el('button', {
              class: 'btn btn-primary',
              onClick: () => setTab('slides')
            }, '🖥 Слайд үзэх'));
          }
          bar.appendChild(toolButton());
          bar.appendChild(markBtn('lecture'));
          bar.appendChild(el('button', {
            class: 'btn btn-ghost', onClick: () => setTab('practice')
          }, 'Дадлага руу →'));
          body.appendChild(bar);

        } else {
          // Дадлагын даалгавар
          const tasks = el('div', { class: 'card' });
          tasks.appendChild(el('h3', { class: 'subsection' }, '◆ Дадлагын даалгавар'));
          const ol = el('ol', { class: 'practice-list' });
          L.practice.forEach(p => ol.appendChild(el('li', {}, p)));
          tasks.appendChild(ol);
          tasks.appendChild(toolButton());
          body.appendChild(tasks);

          // Интерактив дасгал — чирж тааруулах, нөхөх, эрэмбэлэх, тест
          const drills = window.LP.Drill && window.LP.Drill.render(L.n);
          if (drills) {
            const dc = el('div', { class: 'card' });
            dc.appendChild(el('h3', { class: 'subsection' }, '⚡ Интерактив дасгал'));
            dc.appendChild(el('p', { class: 'book-p' },
              'Хариултаа шууд шалгана. Чирж тааруулах дасгалд хавтанг хулганаар чирэх, ' +
              'эсвэл товшоод байрлах нүдэн дээрээ дахин товшино уу.'));
            dc.appendChild(drills);
            body.appendChild(dc);
          }

          // Номын дасгал
          const exBlocks = Book.sectionByKeyword(ch.blocks, ['дасгал ажил']);
          if (exBlocks.length) {
            const ex = el('div', { class: 'card' });
            ex.appendChild(el('h3', { class: 'subsection' },
              '📘 Номын дасгал — Бүлэг ' + L.ch));
            ex.appendChild(Book.render(exBlocks));
            body.appendChild(ex);
          }

          // Хариу түлхүүр — нуугдмал
          const keyBlocks = Book.sectionByKeyword(ch.blocks, ['хариу түлхүүр']);
          if (keyBlocks.length) {
            const kc = el('div', { class: 'card' });
            const inner = el('div', { style: { display: 'none' } });
            inner.appendChild(Book.render(keyBlocks));
            const toggle = el('button', {
              class: 'btn btn-secondary',
              onClick: () => {
                const open = inner.style.display !== 'none';
                inner.style.display = open ? 'none' : 'block';
                toggle.textContent = open ? '🔑 Хариу түлхүүр харах' : '🔒 Хариу түлхүүр нуух';
              }
            }, '🔑 Хариу түлхүүр харах');
            kc.appendChild(toggle);
            kc.appendChild(inner);
            body.appendChild(kc);
          }

          const bar = el('div', { class: 'action-bar' });
          bar.appendChild(markBtn('practice'));
          if (L.n < LESSONS.length) {
            bar.appendChild(el('button', {
              class: 'btn btn-ghost', onClick: () => App.go('lesson', { n: L.n + 1 })
            }, 'Дараагийн хичээл →'));
          }
          body.appendChild(bar);
        }

        if (window.renderMathInElement) {
          window.renderMathInElement(body, {
            delimiters: [{ left: '$$', right: '$$', display: true },
                         { left: '$', right: '$', display: false }],
            throwOnError: false,
          });
        }
      }).catch(e => {
        body.innerHTML = '';
        body.appendChild(el('div', { class: 'card' },
          el('p', { class: 'auth-error' }, e.message)));
      });
    }

    // Агуулгыг H2 хэсгээр хэсэглэж, тохирох газарт мэдлэг шалгах тест шигтгэнэ
    function renderWithChecks(blocks, lessonN) {
      const checks = (window.LP.Checks || {})[lessonN] || [];
      const Drill = window.LP.Drill;
      if (!checks.length || !Drill) {
        const c = el('div', { class: 'card' });
        c.appendChild(Book.render(blocks));
        return [c];
      }

      // H2 гарчиг бүрээр хэрчинэ
      const chunks = [];
      let cur = { sec: null, blocks: [] };
      blocks.forEach(b => {
        if (b.t === 'h' && b.lvl === 2) {
          if (cur.blocks.length) chunks.push(cur);
          const m = /^(\d+(?:\.\d+)*)/.exec(b.x.trim());
          cur = { sec: m ? m[1] : null, blocks: [b] };
        } else {
          cur.blocks.push(b);
        }
      });
      if (cur.blocks.length) chunks.push(cur);

      const out = [];
      let card = el('div', { class: 'card' });
      chunks.forEach(chunk => {
        card.appendChild(Book.render(chunk.blocks));
        const hit = checks.filter(c => c.after === chunk.sec);
        if (hit.length) {
          out.push(card);
          hit.forEach((c, i) => {
            out.push(Drill.quiz(c.item, {
              tag: '✓ Мэдлэг шалгах · ' + chunk.sec + (hit.length > 1 ? ' (' + (i + 1) + ')' : ''),
            }));
          });
          card = el('div', { class: 'card' });
        }
      });
      if (card.childNodes.length) out.push(card);
      return out;
    }

    // Лекцийн хэсгээс "Дасгал ажил"-аас хойшхийг таслах
    function dropAfterExercises(blocks) {
      const out = [];
      for (const b of blocks) {
        if (b.t === 'h' && b.lvl === 2 && /дасгал|хариу түлхүүр/i.test(b.x)) break;
        out.push(b);
      }
      return out.length ? out : blocks;
    }

    render();
  });
})();
