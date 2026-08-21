// =============================================================================
// AUTH — Нэвтрэлт ба эрх
// =============================================================================
// Дүрэм:
//   • Шинэ хэрэглэгчийг ЗӨВХӨН админ үүсгэнэ. Өөрөө бүртгүүлэх боломжгүй.
//   • Бодлого бодох бүх хуудас нэвтрэлтгүйгээр чөлөөтэй ажиллана.
//   • Хичээл, Миний бодлогууд, Glossary засварлах нь нэвтрэлт шаардана.
//
// Хэрэглэгчийн бичлэг:
//   { id, username, name, role: 'admin'|'user', salt, hash,
//     active, must_change_pw, created_at, last_login, note }
// =============================================================================
(function () {
  'use strict';

  const Cfg    = window.LP.Config;
  const Data   = window.LP.Data;
  const Crypto = window.LP.Crypto;

  let _user  = null;     // нэвтэрсэн хэрэглэгч (нууц үггүй хувилбар)
  let _token = '';
  let _ready = null;
  const listeners = [];

  function publicUser(u) {
    if (!u) return null;
    return {
      id: u.id, username: u.username, name: u.name, role: u.role,
      active: u.active !== false, must_change_pw: !!u.must_change_pw,
      created_at: u.created_at, last_login: u.last_login, note: u.note || '',
    };
  }

  function emit() {
    listeners.forEach(fn => { try { fn(_user); } catch (e) { console.error(e); } });
  }

  // ---------------------------------------------------------------------------
  // Эхний ачаалалт: админ данс байхгүй бол үүсгэнэ, сесс сэргээнэ
  // ---------------------------------------------------------------------------
  function init() {
    if (_ready) return _ready;
    _ready = Data.users.list()
      .then(users => {
        if (users && users.length) return users;
        // Анхны админ данс
        const salt = Crypto.randomHex(16);
        const admin = {
          id: Data.uid('u'),
          username: Cfg.SEED_ADMIN.username,
          name: Cfg.SEED_ADMIN.name,
          role: 'admin',
          salt: salt,
          hash: Crypto.hashPassword(Cfg.SEED_ADMIN.password, salt),
          active: true,
          must_change_pw: true,
          created_at: Date.now(),
          last_login: null,
          note: 'Автоматаар үүсгэсэн анхны админ',
        };
        return Data.users.create(admin).then(() => [admin]);
      })
      .then(users => Data.session.get().then(s => ({ users, s })))
      .then(({ users, s }) => {
        if (!s || !s.user_id) return;
        if (s.expires_at && s.expires_at < Date.now()) return Data.session.clear();
        const u = users.find(x => x.id === s.user_id);
        if (u && u.active !== false) { _user = publicUser(u); _token = s.token || ''; }
        else return Data.session.clear();
      })
      .catch(e => { console.error('Auth init алдаа:', e); });
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
    return Data.users.list().then(users => {
      const u = users.find(x => x.username.toLowerCase() === uname.toLowerCase());
      if (!u) throw new Error('Нэр эсвэл нууц үг буруу байна.');
      if (u.active === false) throw new Error('Энэ данс идэвхгүй болсон байна. Админд хандана уу.');
      if (Crypto.hashPassword(password, u.salt) !== u.hash) {
        throw new Error('Нэр эсвэл нууц үг буруу байна.');
      }
      const token = Crypto.randomHex(24);
      const expires = Date.now() + Cfg.SESSION_DAYS * 24 * 3600 * 1000;
      return Data.users.update(u.id, { last_login: Date.now() })
        .then(fresh => Data.session.set({ token: token, user_id: u.id, expires_at: expires })
          .then(() => {
            _user = publicUser(fresh);
            _token = token;
            emit();
            return _user;
          }));
    });
  }

  function logout() {
    return Data.session.clear().then(() => {
      _user = null; _token = '';
      emit();
      return true;
    });
  }

  // ---------------------------------------------------------------------------
  // Нууц үг солих (өөрийн)
  // ---------------------------------------------------------------------------
  function changePassword(oldPw, newPw) {
    if (!_user) return Promise.reject(new Error('Эхлээд нэвтэрнэ үү.'));
    const err = validatePassword(newPw);
    if (err) return Promise.reject(new Error(err));
    return Data.users.list().then(users => {
      const u = users.find(x => x.id === _user.id);
      if (!u) throw new Error('Хэрэглэгч олдсонгүй.');
      if (Crypto.hashPassword(oldPw, u.salt) !== u.hash) {
        throw new Error('Одоогийн нууц үг буруу байна.');
      }
      const salt = Crypto.randomHex(16);
      return Data.users.update(u.id, {
        salt: salt,
        hash: Crypto.hashPassword(newPw, salt),
        must_change_pw: false,
      });
    }).then(fresh => { _user = publicUser(fresh); emit(); return _user; });
  }

  function validatePassword(pw) {
    if (!pw || pw.length < 6) return 'Нууц үг доод тал нь 6 тэмдэгт байх ёстой.';
    if (/^\s|\s$/.test(pw)) return 'Нууц үгийн эхэнд эсвэл эцэст хоосон зай байж болохгүй.';
    return null;
  }

  // ---------------------------------------------------------------------------
  // АДМИН ҮЙЛДЛҮҮД
  // ---------------------------------------------------------------------------
  function requireAdmin() {
    if (!_user || _user.role !== 'admin') throw new Error('Зөвхөн админ энэ үйлдлийг хийнэ.');
  }

  function listUsers() {
    try { requireAdmin(); } catch (e) { return Promise.reject(e); }
    return Data.users.list().then(us => us.map(publicUser));
  }

  function createUser(opts) {
    try { requireAdmin(); } catch (e) { return Promise.reject(e); }
    const username = String(opts.username || '').trim();
    if (!/^[A-Za-z0-9._-]{3,24}$/.test(username)) {
      return Promise.reject(new Error('Нэвтрэх нэр 3–24 тэмдэгт, зөвхөн латин үсэг, тоо, . _ - байна.'));
    }
    const err = validatePassword(opts.password);
    if (err) return Promise.reject(new Error(err));
    const salt = Crypto.randomHex(16);
    return Data.users.create({
      id: Data.uid('u'),
      username: username,
      name: String(opts.name || username).trim(),
      role: opts.role === 'admin' ? 'admin' : 'user',
      salt: salt,
      hash: Crypto.hashPassword(opts.password, salt),
      active: true,
      must_change_pw: opts.must_change_pw !== false,
      created_at: Date.now(),
      last_login: null,
      note: String(opts.note || '').trim(),
    }).then(publicUser);
  }

  function setActive(id, active) {
    try { requireAdmin(); } catch (e) { return Promise.reject(e); }
    if (id === _user.id && !active) {
      return Promise.reject(new Error('Өөрийн дансаа идэвхгүй болгож болохгүй.'));
    }
    return Data.users.update(id, { active: !!active }).then(publicUser);
  }

  function setRole(id, role) {
    try { requireAdmin(); } catch (e) { return Promise.reject(e); }
    if (id === _user.id && role !== 'admin') {
      return Promise.reject(new Error('Өөрийн админ эрхээ хасаж болохгүй.'));
    }
    return Data.users.update(id, { role: role === 'admin' ? 'admin' : 'user' }).then(publicUser);
  }

  function adminResetPassword(id, newPw) {
    try { requireAdmin(); } catch (e) { return Promise.reject(e); }
    const err = validatePassword(newPw);
    if (err) return Promise.reject(new Error(err));
    const salt = Crypto.randomHex(16);
    return Data.users.update(id, {
      salt: salt,
      hash: Crypto.hashPassword(newPw, salt),
      must_change_pw: true,
    }).then(publicUser);
  }

  function deleteUser(id) {
    try { requireAdmin(); } catch (e) { return Promise.reject(e); }
    if (id === _user.id) return Promise.reject(new Error('Өөрийн дансаа устгаж болохгүй.'));
    return Data.users.list().then(users => {
      const admins = users.filter(u => u.role === 'admin' && u.id !== id);
      if (!admins.length) throw new Error('Сүүлчийн админ дансыг устгаж болохгүй.');
      return Data.users.remove(id);
    });
  }

  // Бөөнөөр хэрэглэгч үүсгэх: "нэвтрэх нэр, овог нэр, нууц үг" мөр бүрээр
  function bulkCreate(text) {
    try { requireAdmin(); } catch (e) { return Promise.reject(e); }
    const rows = String(text || '').split('\n')
      .map(l => l.trim()).filter(Boolean)
      .map(l => l.split(/[,;\t]/).map(s => s.trim()));
    const results = [];
    let chain = Promise.resolve();
    rows.forEach(cols => {
      chain = chain.then(() =>
        createUser({
          username: cols[0],
          name: cols[1] || cols[0],
          password: cols[2] || 'lp' + Math.random().toString(36).slice(2, 8),
          role: 'user',
        })
          .then(u => results.push({ ok: true, username: cols[0], password: cols[2] || '(автомат)' }))
          .catch(e => results.push({ ok: false, username: cols[0], error: e.message }))
      );
    });
    return chain.then(() => results);
  }

  // Хэрэглэгчдийг JSON болгон гаргах / оруулах (нөөцлөлт)
  function exportUsers() {
    try { requireAdmin(); } catch (e) { return Promise.reject(e); }
    return Data.users.list();
  }
  function importUsers(arr, replace) {
    try { requireAdmin(); } catch (e) { return Promise.reject(e); }
    if (!Array.isArray(arr)) return Promise.reject(new Error('Буруу файл.'));
    return Data.users.list().then(existing => {
      const keep = replace ? [] : existing;
      const names = new Set(keep.map(u => u.username.toLowerCase()));
      let chain = Promise.resolve();
      let added = 0;
      if (replace) {
        existing.forEach(u => { chain = chain.then(() => Data.users.remove(u.id)); });
      }
      arr.forEach(u => {
        if (!u || !u.username || names.has(String(u.username).toLowerCase())) return;
        names.add(String(u.username).toLowerCase());
        chain = chain.then(() => Data.users.create(u)).then(() => { added++; });
      });
      return chain.then(() => added);
    });
  }

  // ---------------------------------------------------------------------------
  window.LP.Auth = {
    init: init,
    ready: function () { return init(); },
    currentUser: function () { return _user; },
    token: function () { return _token; },
    isLoggedIn: function () { return !!_user; },
    isAdmin: function () { return !!_user && _user.role === 'admin'; },
    onChange: function (fn) { listeners.push(fn); return fn; },

    login: login,
    logout: logout,
    changePassword: changePassword,
    validatePassword: validatePassword,

    listUsers: listUsers,
    createUser: createUser,
    setActive: setActive,
    setRole: setRole,
    adminResetPassword: adminResetPassword,
    deleteUser: deleteUser,
    bulkCreate: bulkCreate,
    exportUsers: exportUsers,
    importUsers: importUsers,
  };
})();
