// =============================================================================
// AUTH — Нэвтрэлт ба эрх
// =============================================================================
// Дүрэм:
//   • Шинэ хэрэглэгчийг ЗӨВХӨН админ үүсгэнэ. Өөрөө бүртгүүлэх боломжгүй.
//   • Бодлого бодох бүх хуудас нэвтрэлтгүйгээр чөлөөтэй ажиллана.
//   • Хичээл, Миний бодлогууд, Glossary засварлах нь нэвтрэлт шаардана.
//
// Эрхийн түвшин:  admin (3) > teacher (2) > student (1) > зочин (0)
//
// ЧУХАЛ: нууц үгийн salt/hash энэ модульд ХЭЗЭЭ Ч ирэхгүй. Бүх шалгалт
// LP.Data.auth дотор (локал горимд браузерт, сервер горимд серверт) хийгдэнэ.
// Энд байгаа эрхийн шалгалт нь зөвхөн UI-г цэгцлэх зорилготой — жинхэнэ
// хамгаалалт нь серверт байна.
// =============================================================================
(function () {
  'use strict';

  const Cfg  = window.LP.Config;
  const Data = window.LP.Data;

  let _user  = null;     // нэвтэрсэн хэрэглэгч (нийтийн хувилбар)
  let _token = '';
  let _ready = null;
  const listeners = [];

  function emit() {
    listeners.forEach(fn => { try { fn(_user); } catch (e) { console.error(e); } });
  }

  function level(u) { return Data.roleLevel(u && u.role); }

  // ---------------------------------------------------------------------------
  // Эхний ачаалалт — хадгалсан сессийг сэргээнэ
  // ---------------------------------------------------------------------------
  function init() {
    if (_ready) return _ready;
    _ready = Data.session.get()
      .then(s => {
        if (!s || !s.token) return null;
        if (s.expires_at && s.expires_at < Date.now()) {
          return Data.session.clear().then(() => null);
        }
        _token = s.token;
        return Data.auth.me();
      })
      .then(u => {
        if (u) { _user = u; return null; }
        _token = '';
        return Data.session.clear();
      })
      .catch(e => {
        // Сервер хүрэхгүй эсвэл token хүчингүй — зочин болгож үлдээнэ
        console.warn('Auth init:', e.message);
        _user = null; _token = '';
        return Data.session.clear();
      });
    return _ready;
  }

  // ---------------------------------------------------------------------------
  // Нэвтрэх / гарах
  // ---------------------------------------------------------------------------
  function login(username, password) {
    const uname = String(username || '').trim();
    if (!uname || !password) {
      return Promise.reject(new Error('Нэр болон нууц үгээ бүрэн бөглөнө үү.'));
    }
    return Data.auth.login(uname, password).then(res => {
      _user  = res.user;
      _token = res.token;
      return Data.session.set({
        token: _token,
        user_id: _user.id,
        expires_at: Date.now() + Cfg.SESSION_DAYS * 24 * 3600 * 1000,
      }).then(() => { emit(); return _user; });
    });
  }

  function logout() {
    return Promise.resolve()
      .then(() => Data.auth.logout())
      .catch(() => true)                 // сервер хүрэхгүй ч локал сессийг цэвэрлэнэ
      .then(() => Data.session.clear())
      .then(() => { _user = null; _token = ''; emit(); return true; });
  }

  function changePassword(oldPw, newPw) {
    if (!_user) return Promise.reject(new Error('Эхлээд нэвтэрнэ үү.'));
    const err = Data.validatePw(newPw);
    if (err) return Promise.reject(new Error(err));
    return Data.auth.changePassword(oldPw, newPw)
      .then(u => { _user = u; emit(); return _user; });
  }

  function validatePassword(pw) { return Data.validatePw(pw); }

  // ---------------------------------------------------------------------------
  // УДИРДАХ ҮЙЛДЛҮҮД (сервер горимд эрхийг сервер дахин шалгана)
  // ---------------------------------------------------------------------------
  function guard(n, what, fn) {
    if (level(_user) < n) {
      return Promise.reject(new Error('Танд ' + what + ' эрх байхгүй.'));
    }
    return fn();
  }

  function listUsers() { return guard(2, 'хэрэглэгч харах', () => Data.users.list()); }

  function createUser(opts) {
    return guard(3, 'данс үүсгэх', () => Data.users.create({
      username: opts.username,
      name: opts.name,
      password: opts.password,
      role: opts.role,
      note: opts.note,
      must_change_pw: opts.must_change_pw,
    }));
  }

  function setActive(id, active) {
    return guard(3, 'данс идэвхжүүлэх', () => {
      if (id === _user.id && !active) {
        return Promise.reject(new Error('Өөрийн дансаа идэвхгүй болгож болохгүй.'));
      }
      return Data.users.update(id, { active: !!active });
    });
  }

  function setRole(id, role) {
    return guard(3, 'эрх солих', () => {
      if (id === _user.id && Data.normRole(role) !== 'admin') {
        return Promise.reject(new Error('Өөрийн админ эрхээ хасаж болохгүй.'));
      }
      return Data.users.update(id, { role: role });
    });
  }

  function updateUser(id, patch) {
    return guard(3, 'мэдээлэл засах', () => Data.users.update(id, patch));
  }

  function adminResetPassword(id, newPw) {
    return guard(3, 'нууц үг сэргээх', () => Data.users.resetPassword(id, newPw));
  }

  function deleteUser(id) {
    return guard(3, 'данс устгах', () => {
      if (id === _user.id) return Promise.reject(new Error('Өөрийн дансаа устгаж болохгүй.'));
      return Data.users.remove(id);
    });
  }

  // ---------------------------------------------------------------------------
  // Бөөнөөр үүсгэх: мөр бүр «нэвтрэх нэр, овог нэр, нууц үг, эрх»
  // ---------------------------------------------------------------------------
  // Санамсаргүй нууц үг — үргэлж 8 тэмдэгт (lp + 6)
  function genPassword() {
    const abc = 'abcdefghijkmnpqrstuvwxyz23456789';   // ойлгомжгүй тэмдэгтгүй
    let s = 'lp';
    for (let i = 0; i < 6; i++) s += abc.charAt(Math.floor(Math.random() * abc.length));
    return s;
  }

  function parseBulk(text) {
    return String(text || '').split('\n')
      .map(l => l.trim()).filter(Boolean)
      .map(l => {
        const c = l.split(/[,;\t]/).map(s => s.trim());
        const pw = c[2] || genPassword();
        return {
          username: c[0],
          name: c[1] || c[0],
          password: pw,
          role: Data.normRole(c[3] || 'student'),
          _generated: !c[2],
        };
      });
  }

  function runBulk(rows) {
    // Сервер горимд нэг дуудлагад 40-оос ихгүй — Apps Script-ийн хугацааны хязгаар
    const CH = Data.remote ? 40 : rows.length || 1;
    const out = { created: [], skipped: [] };
    let chain = Promise.resolve();
    for (let i = 0; i < rows.length; i += CH) {
      const part = rows.slice(i, i + CH);
      chain = chain.then(() => Data.users.bulkCreate(part).then(r => {
        (r.created || []).forEach(u => {
          const src = part.find(x => x.username === u.username);
          out.created.push(Object.assign({}, u, {
            password: src ? src.password : '',
            generated: src ? !!src._generated : false,
          }));
        });
        (r.skipped || []).forEach(x => out.skipped.push(x));
      }));
    }
    return chain.then(() => out);
  }

  function bulkCreate(text) {
    return guard(3, 'данс үүсгэх', () => {
      const rows = parseBulk(text);
      if (!rows.length) return Promise.reject(new Error('Оруулах мөр олдсонгүй.'));
      return runBulk(rows);
    });
  }

  // Оюутны явцын хураангуй (багш ба админ)
  function allProgress() { return guard(2, 'явц харах', () => Data.progress.all()); }

  // Нөөцлөлт — нууц үг ОРОХГҮЙ, зөвхөн нийтийн талбарууд
  function exportUsers() { return guard(3, 'нөөцлөх', () => Data.users.list()); }

  function importUsers(arr) {
    return guard(3, 'сэргээх', () => {
      if (!Array.isArray(arr)) return Promise.reject(new Error('Буруу файл.'));
      const rows = arr.filter(u => u && u.username).map(u => ({
        username: u.username,
        name: u.name || u.username,
        password: genPassword(),
        role: Data.normRole(u.role),
        note: u.note || '',
        _generated: true,
      }));
      if (!rows.length) return Promise.reject(new Error('Оруулах хэрэглэгч олдсонгүй.'));
      return runBulk(rows);
    });
  }

  // ---------------------------------------------------------------------------
  const ROLE_LABEL = { admin: 'Админ', teacher: 'Багш', student: 'Оюутан' };

  window.LP.Auth = {
    init: init,
    ready: function () { return init(); },
    currentUser: function () { return _user; },
    token: function () { return _token; },
    isLoggedIn: function () { return !!_user; },
    isAdmin:    function () { return level(_user) >= 3; },
    isTeacher:  function () { return level(_user) >= 2; },
    level:      function () { return level(_user); },
    roleLabel:  function (r) { return ROLE_LABEL[Data.normRole(r)] || r; },
    ROLE_LABEL: ROLE_LABEL,
    onChange: function (fn) { listeners.push(fn); return fn; },

    login: login,
    logout: logout,
    changePassword: changePassword,
    validatePassword: validatePassword,

    listUsers: listUsers,
    createUser: createUser,
    updateUser: updateUser,
    setActive: setActive,
    setRole: setRole,
    adminResetPassword: adminResetPassword,
    deleteUser: deleteUser,
    bulkCreate: bulkCreate,
    parseBulk: parseBulk,
    genPassword: genPassword,
    allProgress: allProgress,
    exportUsers: exportUsers,
    importUsers: importUsers,
  };
})();
