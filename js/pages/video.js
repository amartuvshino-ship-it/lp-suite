// =============================================================================
// VIDEO PAGE — богино тайлбар видеонууд (нээлттэй, эрх шаардахгүй)
// =============================================================================
// Шинэ видео нэмэхдээ:
//   1. video/<нэр>.html файлаа тавина
//   2. доорх VIDEOS массивт нэг мөр нэмнэ
//
// ЧУХАЛ: Видеоны файлыг ЗАССАН бол тухайн мөрийн  v: '...'  тамгыг
// заавал шинэ утгаар солино (ж нь өнөөдрийн огноо). Үгүй бол хөтөч
// хуучин хувилбараа санах ойноосоо гаргаад ирнэ.
//
// group: ижил нэртэй видеонууд жагсаалтад нэг бүлэг болж бүлэглэгдэнэ.
// Өөр хуудаснаас шууд нээх:  App.go('video', { id: 'simplex' })
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const App = window.LP.App;

  const VIDEOS = [
    {
      id:    'modon-urlal',
      group: '«Модон урлал» ХХК — бүрэн цуврал',
      file:  'video/modon-urlal.html',
      v:     '20261014',
      num:   '1',
      name:  'Өгүүлбэрээс математик загвар руу',
      ch:    'Бүлэг 2',
      len:   '1:34',
      tags:  ['Хувьсагч', 'Зорилгын функц', 'Хязгаарлалт'],
      desc:  'Бодлогын нөхцөлийг бүтнээр нь уншаад, дотор нь байгаа тоо бүр хэрхэн ' +
             'шийдвэрийн хувьсагч, зорилгын функц, хязгаарлалт болж хувирдгийг алхам ' +
             'алхмаар үзүүлнэ. Тоо бүр өгүүлбэрээсээ математик бичиглэл рүү шилжиж ' +
             'байгааг нүдээр дагаж болно.',
    },
    {
      id:    'graphical',
      group: '«Модон урлал» ХХК — бүрэн цуврал',
      file:  'video/graphical.html',
      v:     '20261014',
      num:   '2',
      name:  'Графикийн аргаар бодох нь',
      ch:    'Бүлэг 3',
      len:   '1:35',
      tags:  ['Боломжит муж', 'Орой', 'Харьцуулалт'],
      desc:  'Өмнөх видеонд зохиосон загварыг графикийн аргаар бүрэн бодно: ' +
             'хязгаарлалтыг шулуун болгох, аль талыг нь сонгох, боломжит муж олох, ' +
             'оройн координатыг бодож гаргах, орой бүрт ашгийг тооцож хамгийн ихийг нь ' +
             'сонгох — таван алхам.',
    },
    {
      id:    'matrix',
      group: '«Модон урлал» ХХК — бүрэн цуврал',
      file:  'video/matrix.html',
      v:     '20261014d',
      num:   '3',
      name:  'Матрицын аргаар бодох нь',
      ch:    'Бүлэг 4',
      len:   '2:33',
      tags:  ['det A', 'A⁻¹', 'AX = B'],
      desc:  'Яагаад «≤» тэмдгийг «=» болгодгийг нэмэлт хувьсагчаар тайлбарлаад, ' +
             'системийг AX = B хэлбэрт оруулна. Дараа нь тодорхойлогч, урвуу матриц, ' +
             'X = A⁻¹B үржвэрийг бүрэн гаргаж, графикийн аргын хариутай тулгана.',
    },
    {
      id:    'simplex',
      group: '«Модон урлал» ХХК — бүрэн цуврал',
      file:  'video/simplex.html',
      v:     '20261014d',
      num:   '4',
      name:  'Симплекс аргаар бодох нь',
      ch:    'Бүлэг 5',
      len:   '2:41',
      tags:  ['Хүснэгт', 'Тулгуур элемент', 'Сүүдрийн үнэ'],
      desc:  'Симплекс хүснэгтийн итерац бүрийг графиктай зэрэгцүүлж харуулна: ' +
             'эхлээд «≤» тэмдэг «=» болж, зорилгын функц тэнцүү тэмдгийн нөгөө тал руу ' +
             'гарч сөрөг болохыг харуулна. Дараа нь оруулах багана, гарах мөр, ' +
             'харьцааны шалгуур, тулгуур элемент, мөрийн ' +
             'үйлдлүүд. Итерац бүрт тэмдэглэгч графикийн нэг оройноос нөгөө рүү ' +
             'шилжиж, ашиг хэрхэн өсөхийг зэрэг харуулна.',
    },
  ];

  // ---------------------------------------------------------------------------
  function injectCss() {
    if (document.getElementById('lp-video-css')) return;
    const st = document.createElement('style');
    st.id = 'lp-video-css';
    st.textContent = [
      '.vd-wrap{display:grid;grid-template-columns:1fr 330px;gap:24px;align-items:start}',
      '.vd-main{min-width:0}',
      '.vd-frame{position:relative;width:100%;aspect-ratio:16/9;border-radius:12px;',
      '  overflow:hidden;background:#070B09;margin-bottom:16px}',
      '.vd-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}',
      '.vd-title{font-size:23px;font-weight:600;margin:0 0 10px}',
      '.vd-actions{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0 8px}',
      '.vd-actions a{text-decoration:none}',
      '.vd-keys{font-size:13.5px;opacity:.72;line-height:1.7;margin-top:8px}',
      '.vd-keys kbd{border:1px solid currentColor;border-radius:4px;padding:0 5px;',
      '  font-size:12px;opacity:.8;margin:0 1px}',
      '.vd-list{border:1px solid var(--border);border-radius:14px;overflow:hidden;',
      '  background:var(--bg-elevated);position:sticky;top:20px}',
      '.vd-lh{padding:13px 16px;border-bottom:1px solid var(--border);',
      '  display:flex;justify-content:space-between;align-items:baseline;gap:8px}',
      '.vd-lh b{font-size:14px}',
      '.vd-lh span{font-size:12px;opacity:.6}',
      '.vd-grp{padding:11px 16px 5px;font-size:10.5px;letter-spacing:.13em;',
      '  text-transform:uppercase;opacity:.55;font-weight:700;line-height:1.5}',
      '.vd-item{display:flex;gap:11px;align-items:flex-start;width:100%;text-align:left;',
      '  padding:11px 16px;background:none;border:0;border-top:1px solid var(--border);',
      '  cursor:pointer;font:inherit;color:inherit;transition:background .15s}',
      '.vd-grp + .vd-item{border-top:0}',
      '.vd-item:hover{background:var(--bg-muted)}',
      '.vd-item.on{background:var(--accent-bg)}',
      '.vd-n{flex:0 0 24px;height:24px;border-radius:50%;display:flex;align-items:center;',
      '  justify-content:center;font-size:12px;font-weight:700;background:var(--bg-muted);',
      '  border:1px solid var(--border-strong);margin-top:1px}',
      '.vd-item.on .vd-n{background:var(--accent);border-color:var(--accent);color:#fff}',
      '.vd-tx{min-width:0;flex:1}',
      '.vd-tx .t{font-size:14.5px;font-weight:600;line-height:1.35}',
      '.vd-item.on .vd-tx .t{color:var(--accent)}',
      '.vd-tx .m{font-size:12px;opacity:.6;margin-top:3px}',
      '@media(max-width:980px){.vd-wrap{grid-template-columns:1fr}',
      '  .vd-list{position:static;order:-1}}',
      '@media(max-width:700px){.vd-frame{aspect-ratio:auto;height:56vw;min-height:200px}}',
    ].join('\n');
    document.head.appendChild(st);
  }

  // ---------------------------------------------------------------------------
  App.register('video', function (main, params) {
    injectCss();

    main.appendChild(el('div', {
      html: '<h1 class="page-title">Богино <em>видео</em></h1>' +
            '<p class="page-subtitle">Хичээлийн гол санааг 1–3 минутад тайлбарласан ' +
            'анимэйшнүүд. Бүртгэлгүйгээр үзэж болно.</p>'
    }));

    const wrap  = el('div', { class: 'vd-wrap' });
    const pane  = el('div', { class: 'vd-main' });
    const aside = el('div', { class: 'vd-list' });
    wrap.appendChild(pane);
    wrap.appendChild(aside);
    main.appendChild(wrap);

    // ---- баруун талын жагсаалт ----
    const head = el('div', { class: 'vd-lh' });
    head.appendChild(el('b', {}, 'Жагсаалт'));
    head.appendChild(el('span', {}, VIDEOS.length + ' видео'));
    aside.appendChild(head);

    const items = [];
    let lastGroup = null;
    VIDEOS.forEach((v, i) => {
      if (v.group && v.group !== lastGroup) {
        lastGroup = v.group;
        aside.appendChild(el('div', { class: 'vd-grp' }, v.group));
      }
      const b = el('button', { class: 'vd-item', type: 'button',
                               onClick: () => show(i) });
      b.appendChild(el('span', { class: 'vd-n' }, v.num));
      const tx = el('div', { class: 'vd-tx' });
      tx.appendChild(el('div', { class: 't' }, v.name));
      tx.appendChild(el('div', { class: 'm' }, v.ch + ' · ' + v.len));
      b.appendChild(tx);
      aside.appendChild(b);
      items.push(b);
    });

    // ---- тоглуулагч (нэг л удаа нэг iframe) ----
    function show(i) {
      const v = VIDEOS[i];
      items.forEach((b, k) => b.classList.toggle('on', k === i));
      pane.innerHTML = '';

      const frame = el('div', { class: 'vd-frame' });
      frame.appendChild(el('iframe', {
        src: v.file + '?start=0&v=' + (v.v || '1'),
        title: v.name,
        allowfullscreen: 'true',
      }));
      pane.appendChild(frame);

      pane.appendChild(el('h2', { class: 'vd-title' }, v.name));

      const tags = el('div', { class: 'method-tags' });
      tags.appendChild(el('span', { class: 'tag' }, '⏱ ' + v.len));
      tags.appendChild(el('span', { class: 'tag' }, v.ch));
      (v.tags || []).forEach(t => tags.appendChild(el('span', { class: 'tag' }, t)));
      pane.appendChild(tags);

      pane.appendChild(el('p', { style: { marginTop: '12px', lineHeight: '1.65',
                                          textAlign: 'justify' } }, v.desc));

      const acts = el('div', { class: 'vd-actions' });
      acts.appendChild(el('a', {
        class: 'btn btn-secondary',
        href: v.file + '?v=' + (v.v || '1'),
        target: '_blank', rel: 'noopener',
      }, 'Шинэ цонхонд бүтэн хэмжээгээр нээх ↗'));
      pane.appendChild(acts);

      pane.appendChild(el('div', {
        class: 'vd-keys',
        html: 'Удирдлага: <kbd>Space</kbd> түр зогсоох · <kbd>←</kbd> <kbd>→</kbd> 5 секунд · ' +
              '<kbd>R</kbd> эхнээс · <kbd>F</kbd> бүтэн дэлгэц. ' +
              'Доод талын явцын зурвас дээр товшвол тухайн хэсэг рүү шилжинэ. ' +
              'Утсаар үзэхдээ дэлгэцээ хэвтээ эргүүлээрэй.'
      }));
    }

    // App.go('video', { id:'simplex' }) гэж дуудвал тэр видеог шууд нээнэ
    let start = 0;
    if (params && params.id) {
      const k = VIDEOS.findIndex(v => v.id === params.id);
      if (k >= 0) start = k;
    }
    show(start);
  });
})();
