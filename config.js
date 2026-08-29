// =============================================================================
// CONFIG — Суурь тохиргоо
// =============================================================================
// MODE:
//   'local'  — бүх өгөгдөл браузерын localStorage-д (офлайн, index.html давхар дарж ажиллана)
//   'sheets' — Google Apps Script Web App руу хандана (GitHub Pages дээр)
//
// Sheets горимд шилжихдээ: MODE = 'sheets', API_URL-д deploy хийсэн /exec хаягаа бичнэ.
// =============================================================================
(function () {
  'use strict';

  window.LP = window.LP || {};

  window.LP.Config = {
    MODE: 'sheets',
    API_URL: 'https://script.google.com/macros/s/AKfycbyLFT94zxNRh5nXJ699MmPd7-AUAi_tA8ylSnVQJRAoBt4NoIyKKcoEri5W1Gcb6GlE/exec',
                              // Apps Script Web App хаяг. Локал горимд буцахдаа
                              // MODE-ыг 'local' болгоно (API_URL-ыг хөндөх шаардлагагүй).
    SESSION_DAYS: 14,         // нэвтрэлт хэдэн хоног хүчинтэй байх

    // Эхний удаа автоматаар үүсэх админ данс.
    // Эхний нэвтрэлтийн дараа нууц үгээ солихыг шаардана.
    SEED_ADMIN: {
      username: 'admin',
      password: 'admin123',
      name: 'Системийн админ',
    },
  };

  // ---------------------------------------------------------------------------
  // ХАНДАЛТЫН ХЭМЖИЛТ
  // ---------------------------------------------------------------------------
  // Улс (цагийн бүсээр), хуудас, төхөөрөмжийн статистик цуглуулна.
  // IP хаяг, cookie, гуравдагч талын хэмжигч ашиглахгүй.
  window.LP.Config.ANALYTICS = {
    enabled: true,      // false → огт цуглуулахгүй
    flushMs: 15000,     // хэдэн миллисекунд тутам серверт илгээх
  };

  // ---------------------------------------------------------------------------
  // ДЭМЖИХ (ХАНДИВ) — зөвхөн энэ хэсгийг засна
  // ---------------------------------------------------------------------------
  // enabled: false байвал товч огт гарахгүй.
  // Бөглөөгүй талбарыг цонх өөрөө нуудаг тул хэрэггүйг нь хоосон үлдээж болно.
  window.LP.Config.DONATE = {
    enabled:  true,                     // false болгоход товч огт гарахгүй

    button:   'Төслийг дэмжих',         // цэсэн дэх товчны бичвэр
    title:    'Төслийг дэмжих',
    subtitle: 'LP Suite — ХААИС-ийн шугаман программчлалын нээлттэй сургалтын платформ',

    note:     'Энэ сайт болон сурах бичиг нь оюутнуудад үнэ төлбөргүй нээлттэй. '
            + 'Таны дэмжлэг цаашид хөгжүүлэх, шинэ агуулга нэмэх боломж олгоно.',
    uses: [
      'Шинэ бодлого, интерактив симуляци нэмэх',
      'Сурах бичгийн хэвлэлтийн зардал',
      'Домэйн, хостинг, техникийн засвар',
    ],

    // ---- Дансны мэдээлэл (бөглөнө үү) ----
    name:      'АМАРТҮВШИН ОТГОНДЭМБЭРЭЛ',   // банкан дээр бүртгэлтэй нэрээр яг ижил
    bank:      'Худалдаа хөгжлийн банк',
    iban:      'MN82 0004 0004 7408 7826',
    account:   '474087826',             // ₮ (MNT) харилцах данс
    swift:     'TDBMMNUB',              // ХХБ — зөвхөн гадаадаас шилжүүлэхэд
    reference: 'LP Suite дэмжлэг',      // гүйлгээний утга

    // ---- QR (хүсвэл) ----
    qr:      'assets/donate-qr.png',    // QR зургаа энэ нэрээр assets/ дотор тавина
    qrLabel: 'QPay-ээр шилжүүлэх',
    qrHint:  'Банкны аппаа нээж QR уншуулна уу',

    thanks: 'Дэмжсэн бүхэнд чин сэтгэлээсээ баярлалаа.',
  };

  // ---------------------------------------------------------------------------
  // ЭРХИЙН ТОХИРГОО — хуудас бүр ямар эрх шаардах вэ
  //   'public'  — хэн ч (нэвтрэхгүйгээр)
  //   'auth'    — нэвтэрсэн хэн ч (оюутан ба дээш)
  //   'teacher' — багш ба админ
  //   'admin'   — зөвхөн админ
  //
  // Түвшин:  admin 3 > teacher 2 > student 1 > зочин 0
  // ---------------------------------------------------------------------------
  const ROUTE_ACCESS = {
    home:              'public',
    examples:          'public',
    formulation:       'public',
    graphical:         'public',
    matrix:            'public',
    simplex:           'public',
    bigm:              'public',
    duality:           'public',
    transport_table:   'public',
    transport_network: 'public',
    integer:           'public',
    glossary:          'public',   // үзэх нь чөлөөтэй; нэмэх/засах нь auth (доор)
    settings:          'public',
    account:           'auth',
    my_problems:       'auth',
    lessons:           'auth',
    lesson:            'auth',
    teacher:           'teacher',   // оюутны явцын самбар
    stats:             'admin',     // статистик самбар
    admin:             'admin',
  };

  // Хуудаснаас бусад тусдаа эрхүүд
  const ABILITY = {
    'glossary.add':      'auth',      // өөрөө нэр томьёо нэмэх
    'glossary.edit':     'auth',      // өөрийн нэмсэнийг засах (багш бүгдийг)
    'glossary.editAny':  'teacher',   // бусдын бичлэгийг засах
    'glossary.remove':   'teacher',   // устгах
    'problem.save':      'auth',      // бодлого хадгалах
    'examples.edit':     'teacher',   // бэлэн жишээ нэмэх / засах
    'progress.viewAll':  'teacher',   // бүх оюутны явц
    'user.view':         'teacher',   // хэрэглэгчийн жагсаалт
    'user.manage':       'admin',     // данс үүсгэх / устгах / эрх солих
  };

  const ROLE_LEVEL = { admin: 3, teacher: 2, student: 1, user: 1 };

  function normRole(r) {
    r = String(r || 'student').toLowerCase();
    if (r === 'user') return 'student';
    return (r === 'admin' || r === 'teacher' || r === 'student') ? r : 'student';
  }

  function levelOf(user) {
    if (!user) return 0;
    return ROLE_LEVEL[normRole(user.role)] || 0;
  }
  function need(rule) {
    return rule === 'admin' ? 3 : rule === 'teacher' ? 2 : rule === 'auth' ? 1 : 0;
  }

  window.LP.Access = {
    ROUTE_ACCESS: ROUTE_ACCESS,
    ABILITY: ABILITY,
    ROLE_LEVEL: ROLE_LEVEL,
    normRole: normRole,
    levelOf: levelOf,

    ruleFor: function (route) {
      return ROUTE_ACCESS[route] || 'public';
    },

    // Тухайн хуудсанд хандах эрхтэй эсэх
    canRoute: function (route) {
      const u = window.LP.Auth ? window.LP.Auth.currentUser() : null;
      return levelOf(u) >= need(this.ruleFor(route));
    },

    // Тухайн үйлдэл хийх эрхтэй эсэх
    can: function (ability) {
      const u = window.LP.Auth ? window.LP.Auth.currentUser() : null;
      return levelOf(u) >= need(ABILITY[ability] || 'public');
    },
  };
})();
