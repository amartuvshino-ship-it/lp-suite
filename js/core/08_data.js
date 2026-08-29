// =============================================================================
// DATA — Өгөгдлийн давхарга (adapter)
// =============================================================================
// Бүх өгөгдлийн хандалт ЗӨВХӨН энэ модулиар дамжина. Ингэснээр локал
// localStorage-оос Google Sheets руу шилжихэд бусад код өөрчлөгдөхгүй.
//
// Бүх метод Promise буцаана.
//
//   LP.Data.auth.login() / logout() / me() / changePassword()
//   LP.Data.users.list() / create() / update() / remove()
//                / resetPassword() / bulkCreate()
//   LP.Data.session.get() / set() / clear()
//   LP.Data.glossary.list() / add() / update() / remove()
//   LP.Data.problems.list() / save() / remove()
//   LP.Data.progress.get() / set()
// =============================================================================
(function () {
  'use strict';

  const Cfg = window.LP.Config;

  // ---------------------------------------------------------------------------
  // localStorage туслахууд
  // ---------------------------------------------------------------------------
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const v = JSON.parse(raw);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.error('Хадгалахад алдаа:', e); return false; }
  }
  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' +
           Math.random().toString(36).slice(2, 7);
  }

  const KEYS = {
    users:    'lp.auth.users',
    session:  'lp.auth.session',
    glossary: 'lp.glossary',
    problems: 'lp.savedProblems',
    progress: 'lp.progress',
    visits:   'lp.visits',
  };

  // ---------------------------------------------------------------------------
  // Эрхийн түвшин ба нийтэд харагдах хэрэглэгч
  // ---------------------------------------------------------------------------
  const ROLE_LEVEL = { admin: 3, teacher: 2, student: 1, user: 1 };

  function normRole(r) {
    r = String(r || 'student').toLowerCase();
    if (r === 'user') return 'student';        // хуучин өгөгдөлтэй нийцтэй
    return (r === 'admin' || r === 'teacher' || r === 'student') ? r : 'student';
  }

  // Нууц үгийн salt/hash-ийг ХЭЗЭЭ Ч гаргахгүй
  function pub(u) {
    if (!u) return null;
    return {
      id: u.id, username: u.username, name: u.name, role: normRole(u.role),
      active: u.active !== false, must_change_pw: !!u.must_change_pw,
      created_at: u.created_at || null, last_login: u.last_login || null,
      note: u.note || '',
    };
  }

  function validatePw(pw) {
    pw = String(pw || '');
    if (pw.length < 6) return 'Нууц үг доод тал нь 6 тэмдэгт байх ёстой.';
    if (/^\s|\s$/.test(pw)) return 'Нууц үгийн эхэнд эсвэл эцэст хоосон зай байж болохгүй.';
    return null;
  }

  function C() { return window.LP.Crypto; }

  // Локал горимд анхны админыг үүсгэнэ (сервер горимд серверт хийгдэнэ)
  function seedAdmin() {
    const arr = read(KEYS.users, []);
    if (arr.length) return;
    const salt = C().randomHex(16);
    arr.push({
      id: uid('u'),
      username: Cfg.SEED_ADMIN.username,
      name: Cfg.SEED_ADMIN.name,
      role: 'admin',
      salt: salt,
      hash: C().hashPassword(Cfg.SEED_ADMIN.password, salt),
      active: true, must_change_pw: true,
      created_at: Date.now(), last_login: null,
      note: 'Автоматаар үүсгэсэн анхны админ',
    });
    write(KEYS.users, arr);
  }

  // ===========================================================================
  // LOCAL BACKEND
  // ===========================================================================
  const LocalBackend = {
    name: 'local',

    // ---- Нэвтрэлт (локал: hash браузерт тооцоологдоно) -------------------
    auth: {
      login: function (username, password) {
        seedAdmin();
        const arr = read(KEYS.users, []);
        const u = arr.find(x => String(x.username).toLowerCase() ===
                                String(username || '').trim().toLowerCase());
        const bad = new Error('Нэр эсвэл нууц үг буруу байна.');
        if (!u) return Promise.reject(bad);
        if (u.active === false) {
          return Promise.reject(new Error('Энэ данс идэвхгүй болсон байна. Админд хандана уу.'));
        }
        if (C().hashPassword(password, u.salt) !== u.hash) return Promise.reject(bad);
        u.last_login = Date.now();
        write(KEYS.users, arr);
        const token = C().randomHex(24);
        return Promise.resolve({ token: token, user: pub(u) });
      },
      logout: function () { return Promise.resolve(true); },
      me: function () {
        const s = read(KEYS.session, null);
        if (!s || !s.user_id) return Promise.resolve(null);
        if (s.expires_at && s.expires_at < Date.now()) return Promise.resolve(null);
        const u = read(KEYS.users, []).find(x => x.id === s.user_id);
        return Promise.resolve(u && u.active !== false ? pub(u) : null);
      },
      changePassword: function (oldPw, newPw) {
        const s = read(KEYS.session, null);
        const arr = read(KEYS.users, []);
        const u = s && arr.find(x => x.id === s.user_id);
        if (!u) return Promise.reject(new Error('Эхлээд нэвтэрнэ үү.'));
        const err = validatePw(newPw);
        if (err) return Promise.reject(new Error(err));
        if (C().hashPassword(oldPw, u.salt) !== u.hash) {
          return Promise.reject(new Error('Одоогийн нууц үг буруу байна.'));
        }
        u.salt = C().randomHex(16);
        u.hash = C().hashPassword(newPw, u.salt);
        u.must_change_pw = false;
        write(KEYS.users, arr);
        return Promise.resolve(pub(u));
      },
    },

    users: {
      list: function () { seedAdmin(); return Promise.resolve(read(KEYS.users, []).map(pub)); },

      create: function (opts) {
        seedAdmin();
        const arr = read(KEYS.users, []);
        const username = String((opts && opts.username) || '').trim();
        if (!/^[A-Za-z0-9._-]{3,24}$/.test(username)) {
          return Promise.reject(new Error(
            'Нэвтрэх нэр 3–24 тэмдэгт, зөвхөн латин үсэг, тоо, . _ - байна.'));
        }
        if (arr.some(u => String(u.username).toLowerCase() === username.toLowerCase())) {
          return Promise.reject(new Error('"' + username + '" нэр аль хэдийн бүртгэлтэй байна.'));
        }
        const err = validatePw(opts.password);
        if (err) return Promise.reject(new Error(err));
        const salt = C().randomHex(16);
        const rec = {
          id: uid('u'),
          username: username,
          name: String(opts.name || username).trim(),
          role: normRole(opts.role),
          salt: salt,
          hash: C().hashPassword(opts.password, salt),
          active: true,
          must_change_pw: opts.must_change_pw !== false,
          created_at: Date.now(),
          last_login: null,
          note: String(opts.note || '').trim(),
        };
        arr.push(rec);
        write(KEYS.users, arr);
        return Promise.resolve(pub(rec));
      },

      update: function (id, patch) {
        const arr = read(KEYS.users, []);
        const u = arr.find(x => x.id === id);
        if (!u) return Promise.reject(new Error('Хэрэглэгч олдсонгүй.'));
        if (patch.role !== undefined) {
          const nr = normRole(patch.role);
          if (normRole(u.role) === 'admin' && nr !== 'admin' &&
              arr.filter(x => normRole(x.role) === 'admin').length <= 1) {
            return Promise.reject(new Error('Сүүлчийн админы эрхийг бууруулах боломжгүй.'));
          }
          u.role = nr;
        }
        if (patch.active !== undefined) {
          if (normRole(u.role) === 'admin' && !patch.active &&
              arr.filter(x => normRole(x.role) === 'admin' && x.active !== false).length <= 1) {
            return Promise.reject(new Error('Сүүлчийн идэвхтэй админыг унтраах боломжгүй.'));
          }
          u.active = !!patch.active;
        }
        if (patch.name !== undefined) u.name = String(patch.name).trim();
        if (patch.note !== undefined) u.note = String(patch.note).trim();
        write(KEYS.users, arr);
        return Promise.resolve(pub(u));
      },

      remove: function (id) {
        const arr = read(KEYS.users, []);
        const u = arr.find(x => x.id === id);
        if (u && normRole(u.role) === 'admin' &&
            arr.filter(x => normRole(x.role) === 'admin').length <= 1) {
          return Promise.reject(new Error('Сүүлчийн админыг устгах боломжгүй.'));
        }
        write(KEYS.users, arr.filter(x => x.id !== id));
        return Promise.resolve(true);
      },

      resetPassword: function (id, newPw) {
        const err = validatePw(newPw);
        if (err) return Promise.reject(new Error(err));
        const arr = read(KEYS.users, []);
        const u = arr.find(x => x.id === id);
        if (!u) return Promise.reject(new Error('Хэрэглэгч олдсонгүй.'));
        u.salt = C().randomHex(16);
        u.hash = C().hashPassword(newPw, u.salt);
        u.must_change_pw = true;
        write(KEYS.users, arr);
        return Promise.resolve(pub(u));
      },

      bulkCreate: function (list) {
        const made = [], skipped = [];
        let chain = Promise.resolve();
        (list || []).forEach(o => {
          chain = chain.then(() => LocalBackend.users.create(o)
            .then(u => made.push(u))
            .catch(e => skipped.push({ username: o && o.username, error: e.message })));
        });
        return chain.then(() => ({ created: made, skipped: skipped }));
      },
    },

    session: {
      get: function () { return Promise.resolve(read(KEYS.session, null)); },
      set: function (s) { write(KEYS.session, s); return Promise.resolve(s); },
      clear: function () { write(KEYS.session, null); return Promise.resolve(true); },
    },

    glossary: {
      list: function () { return Promise.resolve(read(KEYS.glossary, [])); },
      add: function (entry) {
        const arr = read(KEYS.glossary, []);
        entry.id = entry.id || uid('g');
        entry.created_at = entry.created_at || Date.now();
        arr.push(entry);
        write(KEYS.glossary, arr);
        return Promise.resolve(entry);
      },
      update: function (id, patch) {
        const arr = read(KEYS.glossary, []);
        const i = arr.findIndex(g => g.id === id);
        if (i < 0) return Promise.reject(new Error('Нэр томьёо олдсонгүй.'));
        arr[i] = Object.assign({}, arr[i], patch, { updated_at: Date.now() });
        write(KEYS.glossary, arr);
        return Promise.resolve(arr[i]);
      },
      remove: function (id) {
        write(KEYS.glossary, read(KEYS.glossary, []).filter(g => g.id !== id));
        return Promise.resolve(true);
      },
    },

    problems: {
      list: function (userId) {
        const arr = read(KEYS.problems, []);
        if (!userId) return Promise.resolve([]);
        return Promise.resolve(arr.filter(p => (p.user_id || null) === userId));
      },
      save: function (rec) {
        const arr = read(KEYS.problems, []);
        if (!rec.id) rec.id = uid('p');
        if (!rec.created) rec.created = Date.now();
        const i = arr.findIndex(p => p.id === rec.id);
        if (i >= 0) arr[i] = rec; else arr.push(rec);
        write(KEYS.problems, arr);
        return Promise.resolve(rec);
      },
      remove: function (id) {
        write(KEYS.problems, read(KEYS.problems, []).filter(p => p.id !== id));
        return Promise.resolve(true);
      },
    },

    progress: {
      get: function (userId) {
        return Promise.resolve(read(KEYS.progress, {})[userId] || {});
      },
      set: function (userId, lessonKey, value) {
        const all = read(KEYS.progress, {});
        all[userId] = all[userId] || {};
        all[userId][lessonKey] = value;
        write(KEYS.progress, all);
        return Promise.resolve(all[userId]);
      },
      all: function () {
        const prog = read(KEYS.progress, {});
        return Promise.resolve(read(KEYS.users, []).map(u => {
          const p = prog[u.id] || {};
          let lec = 0, pra = 0;
          Object.keys(p).forEach(k => {
            if (/\.lecture$/.test(k) && p[k]) lec++;
            if (/\.practice$/.test(k) && p[k]) pra++;
          });
          return { id: u.id, username: u.username, name: u.name,
                   role: normRole(u.role), lectures: lec, practices: pra, progress: p };
        }));
      },
    },

    visits: {
      log: function (list) {
        const arr = read(KEYS.visits, []);
        const now = Date.now();
        // Нэвтэрсэн эсэхийг локал сешнээс тодорхойлно (серверийнхтэй ижил утга)
        const s = read(KEYS.session, null);
        const who = (s && s.user_id && (!s.expires_at || s.expires_at > now)) ? s.user_id : '';
        (list || []).forEach(v => {
          if (!v || !v.route) return;
          const d = new Date();
          arr.push({ ts: now,
            date: d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
                  ('0' + d.getDate()).slice(-2),
            route: String(v.route).slice(0, 24),
            country: String(v.country || '—').slice(0, 40),
            lang: String(v.lang || '—').slice(0, 12),
            device: String(v.device || '—').slice(0, 10),
            sid: String(v.sid || '').slice(0, 24),
            user_id: who });
        });
        // Локал горимд хэт томроохгүй
        write(KEYS.visits, arr.slice(-5000));
        return Promise.resolve({ saved: (list || []).length });
      },
    },

    stats: {
      overview: function () {
        const now = Date.now(), DAY = 86400000;
        const users = read(KEYS.users, []);
        const prog  = read(KEYS.progress, {});
        const probs = read(KEYS.problems, []);
        const gloss = read(KEYS.glossary, []);
        const vis   = read(KEYS.visits, []);

        const byRole = { admin: 0, teacher: 0, student: 0 };
        let active = 0, never = 0, mustPw = 0, act7 = 0, act30 = 0;
        const byMonth = {}, nameOf = {};
        users.forEach(u => {
          const r = normRole(u.role);
          byRole[r] = (byRole[r] || 0) + 1;
          if (u.active !== false) active++;
          if (u.must_change_pw) mustPw++;
          const ll = Number(u.last_login) || 0;
          if (!ll) never++;
          else { if (now - ll <= 7 * DAY) act7++; if (now - ll <= 30 * DAY) act30++; }
          const ca = Number(u.created_at) || 0;
          if (ca) {
            const d = new Date(ca);
            const k = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
            byMonth[k] = (byMonth[k] || 0) + 1;
          }
          nameOf[u.id] = u.name || u.username;
        });

        const lessons = {}, perUser = {};
        let drillDone = 0, drillTotal = 0;
        Object.keys(prog).forEach(uid => {
          Object.keys(prog[uid] || {}).forEach(key => {
            const m = /^l(\d+)\.(lecture|practice|drill)$/.exec(key);
            if (!m || !prog[uid][key]) return;
            const n = Number(m[1]), kind = m[2];
            lessons[n] = lessons[n] || { n: n, lecture: 0, practice: 0, drill: 0 };
            if (kind === 'drill') {
              lessons[n].drill++;
              const dm = /^(\d+)\s*\/\s*(\d+)$/.exec(String(prog[uid][key]));
              if (dm) { drillDone += +dm[1]; drillTotal += +dm[2]; }
            } else {
              lessons[n][kind]++;
              perUser[uid] = perUser[uid] || { lecture: 0, practice: 0 };
              perUser[uid][kind]++;
            }
          });
        });
        const lessonList = Object.keys(lessons).map(k => lessons[k]).sort((a, b) => a.n - b.n);
        const NL = lessonList.length || 16;

        const buckets = [0, 0, 0, 0, 0, 0];
        let sumPct = 0, studentCount = 0;
        users.forEach(u => {
          if (normRole(u.role) !== 'student') return;
          studentCount++;
          const p = perUser[u.id] || { lecture: 0, practice: 0 };
          const pct = (p.lecture + p.practice) / (NL * 2) * 100;
          sumPct += pct;
          if (pct <= 0) buckets[0]++;
          else if (pct < 26) buckets[1]++;
          else if (pct < 51) buckets[2]++;
          else if (pct < 76) buckets[3]++;
          else if (pct < 100) buckets[4]++;
          else buckets[5]++;
        });

        const kinds = {}, probByUser = {}, probMonth = {};
        probs.forEach(p => {
          const kk = String(p.kind || '—');
          kinds[kk] = (kinds[kk] || 0) + 1;
          const un = nameOf[p.user_id] || '—';
          probByUser[un] = (probByUser[un] || 0) + 1;
          const c = Number(p.created) || 0;
          if (c) {
            const d = new Date(c);
            const mk = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
            probMonth[mk] = (probMonth[mk] || 0) + 1;
          }
        });

        const glossByUser = {};
        gloss.forEach(g => {
          const un = nameOf[g.created_by] || '—';
          glossByUser[un] = (glossByUser[un] || 0) + 1;
        });

        const days = {};
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now - i * DAY);
          days[d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
              ('0' + d.getDate()).slice(-2)] = 0;
        }

        const pairs = (o, desc) => {
          const a = Object.keys(o).map(k => ({ k: k, v: o[k] }));
          a.sort(desc ? (x, y) => y.v - x.v : (x, y) => (x.k < y.k ? -1 : 1));
          return a;
        };

        const vC = {}, vR = {}, vD = {}, vL = {}, vDay = {}, sids = {};
        let vGuest = 0, vUser = 0;
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now - i * DAY);
          vDay[d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
               ('0' + d.getDate()).slice(-2)] = 0;
        }
        vis.forEach(v => {
          vC[v.country || '—'] = (vC[v.country || '—'] || 0) + 1;
          vR[v.route || '—']   = (vR[v.route || '—'] || 0) + 1;
          vD[v.device || '—']  = (vD[v.device || '—'] || 0) + 1;
          vL[v.lang || '—']    = (vL[v.lang || '—'] || 0) + 1;
          if (v.sid) sids[v.sid] = 1;
          if (v.user_id) vUser++; else vGuest++;
          if (v.date in vDay) vDay[v.date]++;
        });

        return Promise.resolve({
          generated_at: now,
          local: true,
          visits: {
            total: vis.length, sessions: Object.keys(sids).length,
            guest: vGuest, member: vUser,
            byCountry: pairs(vC, true).slice(0, 12),
            byRoute: pairs(vR, true).slice(0, 14),
            byDevice: pairs(vD, true),
            byLang: pairs(vL, true).slice(0, 8),
            byDay: pairs(vDay, false),
          },
          users: { total: users.length, byRole: byRole, active: active,
                   inactive: users.length - active, never: never, mustChangePw: mustPw,
                   act7: act7, act30: act30, byMonth: pairs(byMonth, false) },
          lessons: lessonList,
          progress: { students: studentCount,
                      avgPct: studentCount ? Math.round(sumPct / studentCount) : 0,
                      buckets: buckets, drillDone: drillDone, drillTotal: drillTotal },
          problems: { total: probs.length, byKind: pairs(kinds, true),
                      topUsers: pairs(probByUser, true).slice(0, 10),
                      byMonth: pairs(probMonth, false) },
          glossary: { total: gloss.length, byUser: pairs(glossByUser, true).slice(0, 10) },
          logins: pairs(days, false),
          actions: [],
          logSize: 0,
        });
      },
    },
  };

  // ===========================================================================
  // SHEETS BACKEND — Google Apps Script Web App
  // ---------------------------------------------------------------------------
  // Үе шат 4-д бүрэн залгагдана. Бүх дуудлага нэг POST endpoint руу явна:
  //   { action: 'users.list', token: '...', payload: {...} }
  // Content-Type: text/plain — CORS preflight-аас зайлсхийх стандарт арга.
  // ===========================================================================
  function apiCall(action, payload) {
    const url = Cfg.API_URL;
    if (!url) return Promise.reject(new Error('API_URL тохируулаагүй байна (js/config.js).'));
    const token = (window.LP.Auth && window.LP.Auth.token()) || '';
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, token: token, payload: payload || {} }),
    })
      .then(r => r.json())
      .then(res => {
        if (!res || res.ok !== true) throw new Error((res && res.error) || 'Серверийн алдаа.');
        return res.data;
      });
  }

  function sheetsGroup(prefix, methods) {
    const g = {};
    methods.forEach(m => {
      g[m] = function () {
        return apiCall(prefix + '.' + m, { args: Array.prototype.slice.call(arguments) });
      };
    });
    return g;
  }

  const SheetsBackend = {
    name: 'sheets',
    call: apiCall,
    auth:     sheetsGroup('auth',     ['login', 'logout', 'me', 'changePassword']),
    users:    sheetsGroup('users',    ['list', 'create', 'update', 'remove',
                                       'resetPassword', 'bulkCreate']),
    session:  {
      get:   function () { return Promise.resolve(read(KEYS.session, null)); },
      set:   function (s) { write(KEYS.session, s); return Promise.resolve(s); },
      clear: function () { write(KEYS.session, null); return Promise.resolve(true); },
    },
    glossary: sheetsGroup('glossary', ['list', 'add', 'update', 'remove']),
    problems: sheetsGroup('problems', ['list', 'save', 'remove']),
    progress: sheetsGroup('progress', ['get', 'set', 'all']),
    stats:    sheetsGroup('stats',    ['overview']),
    visits:   sheetsGroup('visits',   ['log']),
  };

  // ===========================================================================
  const backend = (Cfg.MODE === 'sheets') ? SheetsBackend : LocalBackend;

  window.LP.Data = {
    mode:     backend.name,
    remote:   backend.name === 'sheets',
    auth:     backend.auth,
    users:    backend.users,
    session:  backend.session,
    glossary: backend.glossary,
    problems: backend.problems,
    progress: backend.progress,
    stats:    backend.stats,
    visits:   backend.visits,
    call:     backend.call || null,
    uid:      uid,
    pub:      pub,
    normRole: normRole,
    roleLevel: function (r) { return ROLE_LEVEL[normRole(r)] || 0; },
    validatePw: validatePw,
    _local:   LocalBackend,
  };
})();
