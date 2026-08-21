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
    MODE: 'local',
    API_URL: '',              // жишээ: 'https://script.google.com/macros/s/AKfy.../exec'
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
  //   'public' — хэн ч
  //   'auth'   — нэвтэрсэн хэрэглэгч
  //   'admin'  — зөвхөн админ
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
    admin:             'admin',
  };

  // Хуудаснаас бусад тусдаа эрхүүд
  const ABILITY = {
    'glossary.edit':   'auth',    // нэр томьёо нэмэх / засах / устгах
    'problem.save':    'auth',    // бодлого хадгалах
    'examples.edit':   'admin',
    'user.manage':     'admin',
  };

  function levelOf(user) {
    if (!user) return 0;
    return user.role === 'admin' ? 2 : 1;
  }
  function need(rule) {
    return rule === 'admin' ? 2 : rule === 'auth' ? 1 : 0;
  }

  window.LP.Access = {
    ROUTE_ACCESS: ROUTE_ACCESS,
    ABILITY: ABILITY,

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
