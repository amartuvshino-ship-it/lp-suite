// =============================================================================
// ADMIN PAGE — Хэрэглэгчийн бүртгэл (зөвхөн админ)
// =============================================================================
(function () {
  'use strict';
  const el   = window.LP.el;
  const App  = window.LP.App;
  const Auth = window.LP.Auth;

  function fmtDate(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0') + ' ' +
           String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  App.register('admin', main => {
    main.appendChild(el('div', {
      html: '<h1 class="page-title">Админ <em>самбар</em></h1>' +
            '<p class="page-subtitle">Хэрэглэгчийн бүртгэлийг зөвхөн эндээс үүсгэнэ. ' +
            'Хэрэглэгч өөрөө бүртгүүлэх боломжгүй.</p>'
    }));

    const statCard  = el('div', { class: 'card card-tight' });
    const formCard  = el('div', { class: 'card' });
    const listCard  = el('div', { class: 'card' });
    const toolsCard = el('div', { class: 'card' });
    main.appendChild(statCard);
    main.appendChild(formCard);
    main.appendChild(listCard);
    main.appendChild(toolsCard);

    let users = [];
    let search = '';

    function reload() {
      return Auth.listUsers().then(us => { users = us; renderAll(); })
        .catch(e => { listCard.innerHTML = '<p class="auth-error">' + e.message + '</p>'; });
    }

    function renderAll() { renderStats(); renderForm(); renderList(); renderTools(); }

    // ---------------------------------------------------------------------
    function renderStats() {
      const R = window.LP.Access.normRole;
      const admins   = users.filter(u => R(u.role) === 'admin').length;
      const teachers = users.filter(u => R(u.role) === 'teacher').length;
      const active = users.filter(u => u.active !== false).length;
      statCard.innerHTML = '';
      const row = el('div', { class: 'stat-row' });
      [['Нийт', users.length],
       ['Идэвхтэй', active],
       ['Багш', teachers],
       ['Админ', admins],
       ['Идэвхгүй', users.length - active]].forEach(([label, val]) => {
        const s = el('div', { class: 'stat-tile' });
        s.appendChild(el('div', { class: 'stat-value' }, String(val)));
        s.appendChild(el('div', { class: 'stat-label' }, label));
        row.appendChild(s);
      });
      statCard.appendChild(row);
    }

    // ---------------------------------------------------------------------
    function renderForm() {
      formCard.innerHTML = '';
      formCard.appendChild(el('h3', { class: 'subsection' }, '＋ Шинэ хэрэглэгч үүсгэх'));

      const err = el('div', { class: 'auth-error', style: { display: 'none' } });
      formCard.appendChild(err);

      const grid = el('div', { class: 'admin-form-grid' });
      function fld(label, attrs, help) {
        const w = el('div', { class: 'auth-field' });
        w.appendChild(el('label', { class: 'form-label' }, label));
        const i = el('input', Object.assign({ class: 'input' }, attrs));
        w.appendChild(i);
        if (help) w.appendChild(el('div', { class: 'form-help' }, help));
        grid.appendChild(w);
        return i;
      }
      const uname = fld('Нэвтрэх нэр *', { type: 'text', placeholder: 'bat.d' },
                        'Латин үсэг, тоо, . _ - (3–24 тэмдэгт)');
      const name  = fld('Овог нэр', { type: 'text', placeholder: 'Дорж Бат' });
      const pw    = fld('Нууц үг *', { type: 'text', placeholder: 'доод тал нь 6 тэмдэгт' },
                        'Хэрэглэгчид дамжуулах тул ил харагдана');
      const note  = fld('Тэмдэглэл', { type: 'text', placeholder: 'ЭЗ-3а анги' });

      const roleWrap = el('div', { class: 'auth-field' });
      roleWrap.appendChild(el('label', { class: 'form-label' }, 'Эрх'));
      const pill = el('div', { class: 'pill-toggle' });
      let role = 'student';
      const roleBtns = {};
      [['student', 'Оюутан'], ['teacher', 'Багш'], ['admin', 'Админ']].forEach(([k, lbl]) => {
        const b = el('button', {
          class: k === 'student' ? 'active' : '',
          onClick: () => {
            role = k;
            Object.keys(roleBtns).forEach(x => roleBtns[x].classList.toggle('active', x === k));
          }
        }, lbl);
        roleBtns[k] = b;
        pill.appendChild(b);
      });
      roleWrap.appendChild(pill);
      roleWrap.appendChild(el('div', { class: 'form-hint' },
        'Оюутан — хичээл, дасгал. Багш — нэмээд явц харах, толь бичиг засах. Админ — данс удирдах.'));
      grid.appendChild(roleWrap);
      formCard.appendChild(grid);

      const genBtn = el('button', { class: 'btn btn-ghost', onClick: () => {
        pw.value = 'lp' + Math.random().toString(36).slice(2, 8);
      } }, '🎲 Нууц үг санамсаргүй үүсгэх');

      const addBtn = el('button', { class: 'btn btn-primary', onClick: () => {
        err.style.display = 'none';
        Auth.createUser({
          username: uname.value, name: name.value, password: pw.value,
          role: role, note: note.value, must_change_pw: true,
        }).then(u => {
          window.LP.showToast('✓ "' + u.username + '" үүслээ');
          reload();
        }).catch(e => { err.textContent = e.message; err.style.display = 'block'; });
      } }, '＋ Үүсгэх');

      const row = el('div', { class: 'action-bar' });
      row.appendChild(genBtn);
      row.appendChild(addBtn);
      formCard.appendChild(row);
    }

    // ---------------------------------------------------------------------
    function renderList() {
      listCard.innerHTML = '';
      const head = el('div', { class: 'list-head' });
      head.appendChild(el('h3', { class: 'subsection', style: { margin: '0' } },
        'Хэрэглэгчид (' + users.length + ')'));
      const s = el('input', {
        class: 'input', type: 'search', placeholder: 'Хайх…',
        style: { maxWidth: '220px' },
        onInput: e => { search = e.target.value.toLowerCase(); renderRows(); }
      });
      s.value = search;
      head.appendChild(s);
      listCard.appendChild(head);

      const table = el('div', { class: 'user-table' });
      listCard.appendChild(table);

      function renderRows() {
        table.innerHTML = '';
        const shown = users.filter(u =>
          !search || u.username.toLowerCase().includes(search) ||
          (u.name || '').toLowerCase().includes(search) ||
          (u.note || '').toLowerCase().includes(search));

        if (!shown.length) {
          table.appendChild(el('div', { class: 'empty-state' },
            el('div', { class: 'empty-state-text' }, 'Хэрэглэгч олдсонгүй.')));
          return;
        }

        shown.forEach(u => {
          const row = el('div', { class: 'user-row' + (u.active === false ? ' inactive' : '') });

          const av = el('div', { class: 'user-avatar sm' },
            (u.name || u.username).charAt(0).toUpperCase());
          row.appendChild(av);

          const info = el('div', { class: 'user-row-info' });
          const nameLine = el('div', { class: 'user-row-name' });
          nameLine.appendChild(el('span', {}, u.name || u.username));
          const rl = window.LP.Access.normRole(u.role);
          if (rl === 'admin') nameLine.appendChild(el('span', { class: 'tag tag-admin' }, 'Админ'));
          else if (rl === 'teacher') nameLine.appendChild(el('span', { class: 'tag tag-teacher' }, 'Багш'));
          if (u.active === false) nameLine.appendChild(el('span', { class: 'tag tag-off' }, 'Идэвхгүй'));
          if (u.must_change_pw) nameLine.appendChild(el('span', { class: 'tag tag-warn' }, 'Нууц үг солино'));
          info.appendChild(nameLine);
          info.appendChild(el('div', { class: 'user-row-meta' },
            '@' + u.username + ' · үүссэн ' + fmtDate(u.created_at) +
            ' · сүүлд нэвтэрсэн ' + fmtDate(u.last_login) +
            (u.note ? ' · ' + u.note : '')));
          row.appendChild(info);

          const acts = el('div', { class: 'user-row-actions' });

          acts.appendChild(el('button', {
            class: 'btn btn-ghost btn-xs',
            onClick: () => {
              const np = prompt('"' + u.username + '"-ийн шинэ нууц үг:',
                                'lp' + Math.random().toString(36).slice(2, 8));
              if (!np) return;
              Auth.adminResetPassword(u.id, np)
                .then(() => { window.LP.showToast('✓ Нууц үг: ' + np); reload(); })
                .catch(e => alert(e.message));
            }
          }, 'Нууц үг'));

          acts.appendChild(el('button', {
            class: 'btn btn-ghost btn-xs',
            onClick: () => Auth.setActive(u.id, u.active === false)
              .then(reload).catch(e => alert(e.message))
          }, u.active === false ? 'Идэвхжүүлэх' : 'Идэвхгүй'));

          const sel = el('select', {
            class: 'input input-xs',
            title: 'Эрх солих',
            onChange: e => Auth.setRole(u.id, e.target.value)
              .then(reload).catch(err => { alert(err.message); reload(); })
          });
          [['student', 'Оюутан'], ['teacher', 'Багш'], ['admin', 'Админ']].forEach(([k, lbl]) => {
            const o = el('option', { value: k }, lbl);
            if (window.LP.Access.normRole(u.role) === k) o.selected = true;
            sel.appendChild(o);
          });
          acts.appendChild(sel);

          acts.appendChild(el('button', {
            class: 'btn btn-ghost btn-xs danger',
            onClick: () => {
              if (!confirm('"' + u.username + '" дансыг устгах уу? Буцаах боломжгүй.')) return;
              Auth.deleteUser(u.id).then(reload).catch(e => alert(e.message));
            }
          }, 'Устгах'));

          row.appendChild(acts);
          table.appendChild(row);
        });
      }
      renderRows();
    }

    // ---------------------------------------------------------------------
    function renderTools() {
      toolsCard.innerHTML = '';
      toolsCard.appendChild(el('h3', { class: 'subsection' }, '⚙ Багц үйлдэл'));

      toolsCard.appendChild(el('p', { class: 'form-help' },
        'Мөр бүрд нэг хэрэглэгч: нэвтрэх нэр, овог нэр, нууц үг (таслалаар тусгаарлана). ' +
        'Нууц үг хоосон бол автоматаар үүснэ.'));
      const ta = el('textarea', {
        class: 'input', rows: '5',
        placeholder: 'bat.d, Дорж Бат, lp12345\nsara.b, Болд Сараа,',
        style: { width: '100%', fontFamily: 'var(--font-mono)', fontSize: '13px' }
      });
      toolsCard.appendChild(ta);

      const out = el('pre', { class: 'bulk-output', style: { display: 'none' } });

      const bar = el('div', { class: 'action-bar' });
      bar.appendChild(el('button', {
        class: 'btn btn-secondary',
        onClick: () => Auth.bulkCreate(ta.value).then(res => {
          out.style.display = 'block';
          const lines = res.created.map(u =>
            '✓ ' + u.username + '  →  ' + u.password +
            (u.generated ? '  (автомат)' : '') + '   [' + Auth.roleLabel(u.role) + ']');
          res.skipped.forEach(x => lines.push('✗ ' + x.username + '  →  ' + x.error));
          lines.push('', 'Үүссэн: ' + res.created.length + ' | алгассан: ' + res.skipped.length);
          out.textContent = lines.join('\n');
          reload();
        }).catch(e => alert(e.message))
      }, 'Багцаар үүсгэх'));

      bar.appendChild(el('button', {
        class: 'btn btn-ghost',
        onClick: () => Auth.exportUsers().then(arr => {
          const blob = new Blob([JSON.stringify(arr, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'lp-users-' + new Date().toISOString().slice(0, 10) + '.json';
          a.click();
          URL.revokeObjectURL(a.href);
        }).catch(e => alert(e.message))
      }, '⭳ Нөөцлөх (JSON)'));

      const fileInput = el('input', {
        type: 'file', accept: '.json', style: { display: 'none' },
        onChange: e => {
          const f = e.target.files[0];
          if (!f) return;
          const r = new FileReader();
          r.onload = () => {
            try {
              const arr = JSON.parse(r.result);
              Auth.importUsers(arr)
                .then(res => {
                  const txt = res.created.map(u => u.username + '  →  ' + u.password).join('\n');
                  window.LP.showToast('✓ ' + res.created.length + ' хэрэглэгч нэмэгдлээ');
                  if (txt) {
                    out.style.display = 'block';
                    out.textContent = 'ШИНЭ НУУЦ ҮГ (заавал хадгална уу):\n' + txt;
                  }
                  reload();
                })
                .catch(err => alert(err.message));
            } catch (err) { alert('Файл уншиж чадсангүй: ' + err.message); }
          };
          r.readAsText(f);
          e.target.value = '';
        }
      });
      bar.appendChild(el('button', {
        class: 'btn btn-ghost', onClick: () => fileInput.click()
      }, '⭱ Сэргээх (JSON)'));
      bar.appendChild(fileInput);

      toolsCard.appendChild(bar);
      toolsCard.appendChild(out);

      toolsCard.appendChild(el('div', {
        class: 'info-note',
        html: '<strong>Санамж:</strong> одоогийн горим — <code>' + window.LP.Data.mode +
              '</code>. Энэ горимд өгөгдөл зөвхөн энэ браузерт хадгалагдана. ' +
              'Google Sheets руу шилжихэд <code>js/config.js</code> дотор ' +
              '<code>MODE = \'sheets\'</code> болгож, <code>API_URL</code>-ээ бичнэ (Үе шат 4).'
      }));
    }

    reload();
  });

  // ---------------------------------------------------------------------------
  // ПРОФАЙЛ ХУУДАС
  // ---------------------------------------------------------------------------
  App.register('account', main => {
    const u = Auth.currentUser();
    main.appendChild(el('div', {
      html: '<h1 class="page-title">Профайл</h1>' +
            '<p class="page-subtitle">Таны бүртгэлийн мэдээлэл.</p>'
    }));
    const card = el('div', { class: 'card' });
    const rows = [
      ['Нэвтрэх нэр', '@' + u.username],
      ['Овог нэр', u.name || '—'],
      ['Эрх', Auth.roleLabel(u.role)],
      ['Бүртгүүлсэн', fmtDate(u.created_at)],
      ['Сүүлд нэвтэрсэн', fmtDate(u.last_login)],
    ];
    rows.forEach(([k, v]) => {
      const r = el('div', { class: 'kv-row' });
      r.appendChild(el('div', { class: 'kv-key' }, k));
      r.appendChild(el('div', { class: 'kv-val' }, v));
      card.appendChild(r);
    });
    const bar = el('div', { class: 'action-bar' });
    bar.appendChild(el('button', {
      class: 'btn btn-secondary',
      onClick: () => window.LP.AuthUI.openChangePassword(false)
    }, 'Нууц үг солих'));
    bar.appendChild(el('button', {
      class: 'btn btn-ghost',
      onClick: () => Auth.logout().then(() => {
        window.LP.AuthUI.refreshChrome();
        App.go('home');
      })
    }, 'Гарах'));
    card.appendChild(bar);
    main.appendChild(card);
  });
})();
