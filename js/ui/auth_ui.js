// =============================================================================
// AUTH UI — Нэвтрэх цонх, sidebar-ын хэрэглэгчийн хэсэг, эрхийн хаалт
// =============================================================================
(function () {
  'use strict';
  const el   = window.LP.el;
  const Auth = window.LP.Auth;
  const App  = window.LP.App;

  // ---------------------------------------------------------------------------
  // Нэвтрэх цонх
  // ---------------------------------------------------------------------------
  function openLogin(onSuccess) {
    const overlay = el('div', { class: 'save-overlay' });
    const dialog  = el('div', { class: 'save-dialog auth-dialog' });

    dialog.appendChild(el('div', { class: 'save-dialog-title' }, 'Нэвтрэх'));
    dialog.appendChild(el('p', { class: 'save-dialog-help' },
      'Бүртгэлээ админаас авна. Бодлого бодох хэсгүүд нэвтрэлтгүйгээр чөлөөтэй ажиллана.'));

    const errBox = el('div', { class: 'auth-error', style: { display: 'none' } });
    dialog.appendChild(errBox);

    const uWrap = el('div', { class: 'auth-field' });
    uWrap.appendChild(el('label', { class: 'form-label' }, 'Нэвтрэх нэр'));
    const uInput = el('input', { class: 'input', type: 'text', autocomplete: 'username',
                                 placeholder: 'жишээ нь: admin' });
    uWrap.appendChild(uInput);
    dialog.appendChild(uWrap);

    const pWrap = el('div', { class: 'auth-field' });
    pWrap.appendChild(el('label', { class: 'form-label' }, 'Нууц үг'));
    const pInput = el('input', { class: 'input', type: 'password', autocomplete: 'current-password' });
    pWrap.appendChild(pInput);
    dialog.appendChild(pWrap);

    const actions = el('div', { class: 'save-dialog-actions' });
    const cancelBtn = el('button', { class: 'btn btn-secondary', onClick: () => close() }, 'Болих');
    const okBtn = el('button', { class: 'btn btn-primary', onClick: () => submit() }, 'Нэвтрэх');
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    dialog.appendChild(actions);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    setTimeout(() => uInput.focus(), 0);

    function showErr(msg) {
      errBox.textContent = msg;
      errBox.style.display = 'block';
    }
    function submit() {
      okBtn.disabled = true;
      okBtn.textContent = 'Шалгаж байна…';
      Auth.login(uInput.value, pInput.value)
        .then(user => {
          close();
          window.LP.showToast('✓ Тавтай морил, ' + (user.name || user.username));
          refreshChrome();
          if (user.must_change_pw) openChangePassword(true);
          if (onSuccess) onSuccess(user);
        })
        .catch(e => {
          showErr(e.message);
          okBtn.disabled = false;
          okBtn.textContent = 'Нэвтрэх';
          pInput.select();
        });
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
      else if (e.key === 'Enter') submit();
    }
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    function close() {
      document.removeEventListener('keydown', onKey);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
  }

  // ---------------------------------------------------------------------------
  // Нууц үг солих цонх
  // ---------------------------------------------------------------------------
  function openChangePassword(forced) {
    const overlay = el('div', { class: 'save-overlay' });
    const dialog  = el('div', { class: 'save-dialog auth-dialog' });

    dialog.appendChild(el('div', { class: 'save-dialog-title' }, 'Нууц үг солих'));
    dialog.appendChild(el('p', { class: 'save-dialog-help' },
      forced ? 'Аюулгүй байдлын үүднээс эхний нэвтрэлтийн дараа нууц үгээ солино уу.'
             : 'Шинэ нууц үг доод тал нь 6 тэмдэгт байна.'));

    const errBox = el('div', { class: 'auth-error', style: { display: 'none' } });
    dialog.appendChild(errBox);

    function field(label, type) {
      const w = el('div', { class: 'auth-field' });
      w.appendChild(el('label', { class: 'form-label' }, label));
      const i = el('input', { class: 'input', type: type });
      w.appendChild(i);
      dialog.appendChild(w);
      return i;
    }
    const oldI = field('Одоогийн нууц үг', 'password');
    const n1   = field('Шинэ нууц үг', 'password');
    const n2   = field('Шинэ нууц үг (давтах)', 'password');

    const actions = el('div', { class: 'save-dialog-actions' });
    if (!forced) actions.appendChild(el('button', { class: 'btn btn-secondary', onClick: () => close() }, 'Болих'));
    const okBtn = el('button', { class: 'btn btn-primary', onClick: () => submit() }, 'Хадгалах');
    actions.appendChild(okBtn);
    dialog.appendChild(actions);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    setTimeout(() => oldI.focus(), 0);

    function submit() {
      if (n1.value !== n2.value) {
        errBox.textContent = 'Шинэ нууц үг хоёр талдаа таарахгүй байна.';
        errBox.style.display = 'block';
        return;
      }
      okBtn.disabled = true;
      Auth.changePassword(oldI.value, n1.value)
        .then(() => { close(); window.LP.showToast('✓ Нууц үг солигдлоо'); refreshChrome(); })
        .catch(e => {
          errBox.textContent = e.message;
          errBox.style.display = 'block';
          okBtn.disabled = false;
        });
    }
    function onKey(e) {
      if (e.key === 'Escape' && !forced) close();
      else if (e.key === 'Enter') submit();
    }
    document.addEventListener('keydown', onKey);
    function close() {
      document.removeEventListener('keydown', onKey);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
  }

  // ---------------------------------------------------------------------------
  // Sidebar-ын хэрэглэгчийн хэсэг + цэсний эрхийн харагдац
  // ---------------------------------------------------------------------------
  function refreshChrome() {
    const user = Auth.currentUser();

    // Цэсний зүйлсийг эрхээр нь харуулах / нуух
    document.querySelectorAll('.nav-item[data-route]').forEach(b => {
      const rule = window.LP.Access.ruleFor(b.dataset.route);
      const ok = window.LP.Access.canRoute(b.dataset.route);
      b.classList.toggle('nav-locked', !ok);
      if (rule === 'admin') b.style.display = (user && user.role === 'admin') ? '' : 'none';
      else b.style.display = '';
      // түгжээний тэмдэг
      let lock = b.querySelector('.nav-lock');
      if (!ok && rule !== 'admin') {
        if (!lock) {
          lock = el('span', { class: 'nav-lock', title: 'Нэвтэрсэн хэрэглэгчид' }, '🔒');
          b.appendChild(lock);
        }
      } else if (lock) {
        lock.remove();
      }
    });

    // Бүлгийн гарчиг бүхэлдээ нуугдах эсэх (админы бүлэг)
    document.querySelectorAll('.nav-group').forEach(g => {
      const items = Array.from(g.querySelectorAll('.nav-item'));
      const visible = items.some(i => i.style.display !== 'none');
      g.style.display = items.length && !visible ? 'none' : '';
    });

    // Хэрэглэгчийн хэсэг
    const box = document.getElementById('user-box');
    if (!box) return;
    box.innerHTML = '';
    if (user) {
      const chip = el('div', { class: 'user-chip' });
      const initials = (user.name || user.username).trim().charAt(0).toUpperCase();
      chip.appendChild(el('div', { class: 'user-avatar' }, initials));
      const info = el('div', { class: 'user-info' });
      info.appendChild(el('div', { class: 'user-name' }, user.name || user.username));
      info.appendChild(el('div', { class: 'user-role' },
        user.role === 'admin' ? 'Админ' : 'Хэрэглэгч'));
      chip.appendChild(info);
      box.appendChild(chip);

      const row = el('div', { class: 'user-actions' });
      row.appendChild(el('button', {
        class: 'btn btn-ghost btn-xs', onClick: () => App.go('account')
      }, 'Профайл'));
      row.appendChild(el('button', {
        class: 'btn btn-ghost btn-xs',
        onClick: () => Auth.logout().then(() => {
          window.LP.showToast('Гарлаа');
          refreshChrome();
          App.go('home');
        })
      }, 'Гарах'));
      box.appendChild(row);
    } else {
      box.appendChild(el('button', {
        class: 'btn btn-primary btn-block',
        onClick: () => openLogin()
      }, 'Нэвтрэх'));
      box.appendChild(el('p', { class: 'user-hint' },
        'Бодлого бодох хэсэг нэвтрэлтгүй ажиллана. Хичээл, glossary засварлахад бүртгэл хэрэгтэй.'));
    }
  }

  // ---------------------------------------------------------------------------
  // Эрх хүрэхгүй үед харуулах хуудас
  // ---------------------------------------------------------------------------
  function renderLocked(main, route) {
    const rule = window.LP.Access.ruleFor(route);
    const admin = rule === 'admin';
    const card = el('div', { class: 'card locked-card' });
    card.appendChild(el('div', { class: 'locked-icon' }, admin ? '⚙' : '🔒'));
    card.appendChild(el('h2', { class: 'locked-title' },
      admin ? 'Зөвхөн админд' : 'Нэвтэрсэн хэрэглэгчид'));
    card.appendChild(el('p', { class: 'locked-text' },
      admin
        ? 'Энэ хэсгийг зөвхөн админ эрхтэй хэрэглэгч нээнэ.'
        : 'Энэ хэсгийг үзэхийн тулд нэвтэрнэ үү. Бүртгэлийг админ үүсгэж өгнө — ' +
          'өөрөө бүртгүүлэх боломжгүй.'));
    if (!Auth.isLoggedIn()) {
      card.appendChild(el('button', {
        class: 'btn btn-primary', style: { marginTop: '16px' },
        onClick: () => openLogin(() => App.go(route))
      }, 'Нэвтрэх'));
    }
    card.appendChild(el('div', { class: 'locked-free' },
      '✓ Бодлого бодох бүх арга (график, симплекс, Big-M, хосмог, тээвэр, бүхэл тоон) ' +
      'болон Glossary үзэх нь нэвтрэлтгүйгээр чөлөөтэй.'));
    main.appendChild(card);
  }

  window.LP.AuthUI = {
    openLogin: openLogin,
    openChangePassword: openChangePassword,
    refreshChrome: refreshChrome,
    renderLocked: renderLocked,
  };
})();
