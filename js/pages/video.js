// =============================================================================
// VIDEO PAGE — богино тайлбар видеонууд (нээлттэй, эрх шаардахгүй)
// =============================================================================
// Шинэ видео нэмэхдээ:
//   1. video/<нэр>.html файлаа тавина
//   2. доорх VIDEOS массивт нэг мөр нэмнэ
// Өөр юу ч засах шаардлагагүй.
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const App = window.LP.App;

  const VIDEOS = [
    {
      file:  'video/modon-urlal.html',
      num:   '🎬',
      name:  'Өгүүлбэрээс математик загвар руу',
      len:   '1:34',
      tags:  ['Бүлэг 2', '«Модон урлал» ХХК', 'Нээлттэй'],
      desc:  'Бодлогын нөхцөлийг бүтнээр нь уншаад, дотор нь байгаа тоо бүр хэрхэн ' +
             'шийдвэрийн хувьсагч, зорилгын функц, хязгаарлалт болж хувирдгийг алхам ' +
             'алхмаар үзүүлнэ. Тоо бүр өгүүлбэрээсээ математик бичиглэл рүү шилжиж ' +
             'байгааг нүдээр дагаж болно.',
    },
  ];

  // Нэг удаа CSS оруулна
  function injectCss() {
    if (document.getElementById('lp-video-css')) return;
    const st = document.createElement('style');
    st.id = 'lp-video-css';
    st.textContent = [
      '.vid-frame{position:relative;width:100%;aspect-ratio:16/9;border-radius:12px;',
      '  overflow:hidden;background:#070B09;margin:18px 0}',
      '.vid-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}',
      '.vid-actions{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0 6px}',
      '.vid-actions a{text-decoration:none}',
      '.vid-keys{font-size:13.5px;opacity:.75;line-height:1.7;margin-top:10px}',
      '.vid-keys kbd{border:1px solid currentColor;border-radius:4px;padding:0 5px;',
      '  font-size:12px;opacity:.8;margin:0 1px}',
      '@media(max-width:700px){.vid-frame{aspect-ratio:auto;height:56vw;min-height:200px}}',
    ].join('\n');
    document.head.appendChild(st);
  }

  App.register('video', main => {
    injectCss();

    main.appendChild(el('div', {
      html: '<h1 class="page-title">Богино <em>видео</em></h1>' +
            '<p class="page-subtitle">Хичээлийн гол санааг 1–2 минутад тайлбарласан ' +
            'анимэйшнүүд. Бүртгэлгүйгээр үзэж болно.</p>'
    }));

    VIDEOS.forEach(v => {
      const card = el('div', { class: 'card', style: { marginTop: '24px' } });

      card.appendChild(el('div', {
        html: '<h3 class="subsection">' + v.num + ' ' + v.name + '</h3>'
      }));

      const tags = el('div', { class: 'method-tags' });
      tags.appendChild(el('span', { class: 'tag' }, '⏱ ' + v.len));
      v.tags.forEach(t => tags.appendChild(el('span', { class: 'tag' }, t)));
      card.appendChild(tags);

      // ?start=0 → iframe дотор автоматаар эхлэхгүй, ▶ товчтой хүлээнэ
      const frame = el('div', { class: 'vid-frame' });
      frame.appendChild(el('iframe', {
        src: v.file + '?start=0',
        title: v.name,
        allowfullscreen: 'true',
        loading: 'lazy',
      }));
      card.appendChild(frame);

      card.appendChild(el('p', {}, v.desc));

      const acts = el('div', { class: 'vid-actions' });
      acts.appendChild(el('a', {
        class: 'btn btn-secondary',
        href: v.file,
        target: '_blank',
        rel: 'noopener',
      }, 'Шинэ цонхонд бүтэн хэмжээгээр нээх ↗'));
      card.appendChild(acts);

      card.appendChild(el('div', {
        class: 'vid-keys',
        html: 'Удирдлага: <kbd>Space</kbd> түр зогсоох · <kbd>←</kbd> <kbd>→</kbd> 5 секунд · ' +
              '<kbd>R</kbd> эхнээс · <kbd>F</kbd> бүтэн дэлгэц. ' +
              'Доод талын явцын зурвас дээр товшвол тухайн хэсэг рүү шилжинэ. ' +
              'Утсаар үзэхдээ дэлгэцээ хэвтээ эргүүлээрэй.'
      }));

      main.appendChild(card);
    });
  });
})();
