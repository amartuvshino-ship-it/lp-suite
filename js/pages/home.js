// =============================================================================
// HOME PAGE — Welcome / method overview
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const App = window.LP.App;

  App.register('home', main => {
    main.appendChild(el('div', {
      html: '<h1 class="page-title">Шугаман <em>программчлал</em></h1>' +
            '<p class="page-subtitle">Алхам алхмаар, эдийн засгийн утгатай. ' +
            'Лекцийн жишээнүүд бэлэн оруулсан, өөрийн бодлогоо ч оруулж болно.</p>'
    }));

    const methods = [
      {
        num: '🎓',
        name: 'Хичээл — 16 сэдэв',
        desc: '16 долоо хоногийн хөтөлбөр: долоо хоног бүр 1.5 цаг лекц, 1.5 цаг дадлага. ' +
              'Нэвтэрсэн хэрэглэгчид зориулав.',
        route: 'lessons',
        tags: ['Лекц', 'Дадлага', '🔒 Бүртгэлтэй'],
      },
      {
        num: '01',
        name: 'Бодлогын тавилт',
        desc: 'Үг хэлбэрээр өгсөн бодлогыг математик хэлбэрт оруулах: x хувьсагч, зорилгын функц, хязгаарлалт.',
        route: 'formulation',
        tags: ['Үндэс', 'Орчуулга'],
      },
      {
        num: '02',
        name: 'Графикийн арга',
        desc: '2-хувьсагчтай LP-г координатын хавтгайд зурж, оройн цэгүүдээс оптимумыг олох.',
        route: 'graphical',
        tags: ['Зураг', '2 хувьсагч'],
      },
      {
        num: '03',
        name: 'Матрицын арга',
        desc: 'AX=B хэлбэрт хязгаарлалтыг оруулж, тодорхойлогч ба урвуу матрицаар бодох.',
        route: 'matrix',
        tags: ['det', 'A⁻¹'],
      },
      {
        num: '04',
        name: 'Симплекс арга',
        desc: 'Олон хувьсагчтай LP-ийн стандарт алгоритм. ≤ хязгаарлалт, slack хувьсагч.',
        route: 'simplex',
        tags: ['Олон хувьсагч', 'Slack'],
      },
      {
        num: '05',
        name: 'Big-M арга',
        desc: '≥ ба = хязгаарлалттай LP-д зориулсан. Artificial хувьсагч + торгуулийн М.',
        route: 'bigm',
        tags: ['Artificial', 'Торгууль'],
      },
      {
        num: '06',
        name: 'Хосмог бодлого',
        desc: 'Аливаа LP-ийн ард байх "сүүдрийн үнэ" болох хосмог бодлого. Primal ↔ Dual.',
        route: 'duality',
        tags: ['Сүүдрийн үнэ', 'Z=W'],
      },
      {
        num: '07',
        name: 'Бэлэн жишээнүүд',
        desc: 'Лекцийн сонгодог жишээнүүд: Модон урлал, Хиам, олон бүтээгдэхүүнт ШП.',
        route: 'examples',
        tags: ['Жишээ', 'Тест'],
      },
      {
        num: '08',
        name: 'Тээвэр — Хүснэгт',
        desc: 'Нийлүүлэгч-Хэрэглэгч матриц. NW/LCM/VAM анхдагч хувилбар, дараа нь MODI.',
        route: 'transport_table',
        tags: ['NW', 'LCM', 'VAM', 'MODI'],
      },
      {
        num: '09',
        name: 'Тээвэр — Сүлжээ',
        desc: 'Тэр л өгөгдөл, гэхдээ зангилаа-сум хэлбэрээр SVG зурагтайгаар.',
        route: 'transport_network',
        tags: ['Граф', 'SVG'],
      },
      {
        num: '10',
        name: 'Бүхэл тоон программчлал',
        desc: 'Шийдвэрийн хувьсагч заавал бүхэл тоо. Branch & Bound аргаар салбарлан зааглах.',
        route: 'integer',
        tags: ['B&B', 'Integer'],
      },
      {
        num: '11',
        name: 'Миний бодлогууд',
        desc: 'Хадгалсан бодлогууд. Шинэ бодлого оруулсныхаа дараа "☆ Хадгалах" товчоор хадгална.',
        route: 'my_problems',
        tags: ['Хадгалсан', 'Хувийн'],
      },
    ];

    const grid = el('div', { class: 'method-grid' });
    methods.forEach(m => {
      const card = el('button', {
        class: 'method-card',
        onClick: () => App.go(m.route)
      });
      card.appendChild(el('div', { class: 'method-num' }, m.num));
      card.appendChild(el('div', { class: 'method-name' }, m.name));
      card.appendChild(el('div', { class: 'method-desc' }, m.desc));
      const tags = el('div', { class: 'method-tags' });
      m.tags.forEach(t => tags.appendChild(el('span', { class: 'tag' }, t)));
      card.appendChild(tags);
      grid.appendChild(card);
    });
    main.appendChild(grid);

    main.appendChild(el('div', {
      class: 'card',
      style: { marginTop: '40px' },
      html: '<h3 class="subsection">◇ Хэрэглэх заавар</h3>' +
            '<p>Зүүн талын цэснээс арга сонгож, бодлогынхоо өгөгдлийг оруулна. Эсвэл ' +
            '"Бэлэн жишээ" хэсгээс лекцийн жишээг шууд ачаалж туршиж үзээрэй. ' +
            'Бутархай ↔ Десимал, Богино ↔ Дэлгэрэнгүй гэсэн тохиргоонуудыг хэдийд ч сольж болно.</p>'
    }));
  });
})();
