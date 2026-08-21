// =============================================================================
// STORAGE — localStorage wrapper for saving user problems
// =============================================================================
// All saved problems live under one key: 'lp.savedProblems' (JSON array).
// Each problem record:
//   {
//     id: 'p_1234567890_abc',     // unique
//     name: 'Миний бодлого 1',     // user-given or auto
//     method: 'simplex',           // 'simplex' | 'bigm' | 'graphical' | ...
//     lp: { objective, c, A, ops, b, varNames, nonneg },  // serialized as strings
//     created: 1714543200000,      // timestamp
//   }
//
// IMPORTANT: Frac values are serialized as strings ("3/4", "5") so they survive
// JSON round-trip. When loading, the LP input form re-parses them via Frac.from.
// =============================================================================

(function () {
  'use strict';
  const KEY = 'lp.savedProblems';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr;
    } catch (e) {
      console.warn('Хадгалсан бодлогуудыг уншихад алдаа:', e);
      return [];
    }
  }

  function persist(arr) {
    try {
      localStorage.setItem(KEY, JSON.stringify(arr));
      return true;
    } catch (e) {
      console.error('Хадгалахад алдаа:', e);
      return false;
    }
  }

  // Serialize an LP problem's coefficient values to strings (so JSON works)
  function serializeLP(lp) {
    const ser = v => (v && typeof v === 'object' && 'n' in v && 'd' in v) ? v.toString() : String(v);
    return {
      objective: lp.objective,
      c: lp.c.map(ser),
      A: lp.A.map(row => row.map(ser)),
      ops: lp.ops.slice(),
      b: lp.b.map(ser),
      varNames: lp.varNames ? lp.varNames.slice() : null,
      nonneg: lp.nonneg ? lp.nonneg.slice() : null,
    };
  }

  // Auto-generate a name from the LP problem
  function autoName(lp) {
    const obj = lp.objective || 'max';
    const parts = [];
    for (let j = 0; j < lp.c.length; j++) {
      const cs = (lp.c[j] && typeof lp.c[j] === 'object' && 'toString' in lp.c[j])
        ? lp.c[j].toString() : String(lp.c[j]);
      const sign = (j > 0 && !cs.startsWith('-')) ? '+' : '';
      const sub = '₁₂₃₄₅₆₇₈₉'.charAt(j) || ('_' + (j + 1));
      parts.push(sign + cs + 'x' + sub);
    }
    const objExpr = obj + ' ' + parts.join('');
    const date = new Date();
    const dateStr = date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
    let name = objExpr + ' (' + dateStr + ')';
    if (name.length > 60) name = name.slice(0, 57) + '…';
    return name;
  }

  function genId() {
    return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  // Одоо нэвтэрсэн хэрэглэгчийн id (нэвтрээгүй бол null)
  function currentUserId() {
    const u = window.LP.Auth && window.LP.Auth.currentUser();
    return u ? u.id : null;
  }

  // Public API
  const Storage = {
    // Бодлого хадгалах эрхтэй эсэх — зөвхөн нэвтэрсэн хэрэглэгч
    canSave: function () { return !!currentUserId(); },

    list: function () {
      const uid = currentUserId();
      if (!uid) return [];
      return load()
        .filter(r => (r.user_id || null) === uid)
        .sort((a, b) => (b.created || 0) - (a.created || 0));
    },
    save: function (record) {
      const uid = currentUserId();
      if (!uid) throw new Error('Бодлого хадгалахын тулд нэвтэрнэ үү.');
      if (!record.id) record.id = genId();
      if (!record.created) record.created = Date.now();
      record.user_id = uid;
      const arr = load();
      const i = arr.findIndex(r => r.id === record.id);
      if (i >= 0) arr[i] = record;
      else arr.push(record);
      persist(arr);
      return record;
    },
    saveProblem: function (lp, method, name) {
      const record = {
        id: genId(),
        name: name || autoName(lp),
        method: method,
        lp: serializeLP(lp),
        created: Date.now(),
      };
      return Storage.save(record);
    },
    delete: function (id) {
      const uid = currentUserId();
      const arr = load().filter(r => !(r.id === id && (r.user_id || null) === uid));
      return persist(arr);
    },
    get: function (id) {
      const uid = currentUserId();
      return load().find(r => r.id === id && (r.user_id || null) === uid) || null;
    },
    // Зөвхөн тухайн хэрэглэгчийн бодлогуудыг устгана
    clear: function () {
      const uid = currentUserId();
      if (!uid) return false;
      return persist(load().filter(r => (r.user_id || null) !== uid));
    },
    autoName: autoName,
  };

  window.LP = window.LP || {};
  window.LP.Storage = Storage;
})();
