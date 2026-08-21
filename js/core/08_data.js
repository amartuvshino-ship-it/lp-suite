// =============================================================================
// DATA — Өгөгдлийн давхарга (adapter)
// =============================================================================
// Бүх өгөгдлийн хандалт ЗӨВХӨН энэ модулиар дамжина. Ингэснээр локал
// localStorage-оос Google Sheets руу шилжихэд бусад код өөрчлөгдөхгүй.
//
// Бүх метод Promise буцаана.
//
//   LP.Data.users.list() / create() / update() / remove()
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
  };

  // ===========================================================================
  // LOCAL BACKEND
  // ===========================================================================
  const LocalBackend = {
    name: 'local',

    users: {
      list: function () { return Promise.resolve(read(KEYS.users, [])); },
      create: function (user) {
        const arr = read(KEYS.users, []);
        if (arr.some(u => u.username.toLowerCase() === user.username.toLowerCase())) {
          return Promise.reject(new Error('"' + user.username + '" нэр аль хэдийн бүртгэлтэй байна.'));
        }
        user.id = user.id || uid('u');
        user.created_at = user.created_at || Date.now();
        arr.push(user);
        write(KEYS.users, arr);
        return Promise.resolve(user);
      },
      update: function (id, patch) {
        const arr = read(KEYS.users, []);
        const i = arr.findIndex(u => u.id === id);
        if (i < 0) return Promise.reject(new Error('Хэрэглэгч олдсонгүй.'));
        arr[i] = Object.assign({}, arr[i], patch);
        write(KEYS.users, arr);
        return Promise.resolve(arr[i]);
      },
      remove: function (id) {
        write(KEYS.users, read(KEYS.users, []).filter(u => u.id !== id));
        return Promise.resolve(true);
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
    users:    sheetsGroup('users',    ['list', 'create', 'update', 'remove']),
    session:  {
      get:   function () { return Promise.resolve(read(KEYS.session, null)); },
      set:   function (s) { write(KEYS.session, s); return Promise.resolve(s); },
      clear: function () { write(KEYS.session, null); return Promise.resolve(true); },
    },
    glossary: sheetsGroup('glossary', ['list', 'add', 'update', 'remove']),
    problems: sheetsGroup('problems', ['list', 'save', 'remove']),
    progress: sheetsGroup('progress', ['get', 'set']),
  };

  // ===========================================================================
  const backend = (Cfg.MODE === 'sheets') ? SheetsBackend : LocalBackend;

  window.LP.Data = {
    mode:     backend.name,
    users:    backend.users,
    session:  backend.session,
    glossary: backend.glossary,
    problems: backend.problems,
    progress: backend.progress,
    call:     backend.call || null,
    uid:      uid,
    _local:   LocalBackend,
  };
})();
