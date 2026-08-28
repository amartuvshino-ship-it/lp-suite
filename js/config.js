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
