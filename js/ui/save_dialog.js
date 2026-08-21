// =============================================================================
// SAVE DIALOG — modal to name and save a problem
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const Storage = window.LP.Storage;

  // Create modal overlay
  function openSaveDialog(lp, method, onSaved) {
    // Бодлого хадгалахад нэвтэрсэн байх шаардлагатай
    if (Storage.canSave && !Storage.canSave()) {
      if (window.LP.AuthUI) {
        window.LP.showToast('Бодлого хадгалахад нэвтэрсэн байх шаардлагатай');
        window.LP.AuthUI.openLogin(() => openSaveDialog(lp, method, onSaved));
      } else {
        alert('Бодлого хадгалахад нэвтэрсэн байх шаардлагатай.');
      }
      return;
    }
    const autoNameValue = Storage.autoName(lp);
    let nameMode = 'auto';   // 'auto' | 'custom'
    let customName = '';

    const overlay = el('div', { class: 'save-overlay' });
    const dialog = el('div', { class: 'save-dialog' });

    dialog.appendChild(el('div', { class: 'save-dialog-title' }, '☆ Бодлого хадгалах'));
    dialog.appendChild(el('p', {
      class: 'save-dialog-help'
    }, 'Энэ бодлогыг "Миний бодлогууд" жагсаалтад хадгалж дараа нь дахин ачаалж болно.'));

    // Mode toggle
    const pill = el('div', { class: 'pill-toggle', style: { marginBottom: '12px' } });
    const autoBtn = el('button', {
      class: 'active',
      onClick: () => {
        nameMode = 'auto';
        autoBtn.classList.add('active');
        custBtn.classList.remove('active');
        autoBox.style.display = 'block';
        custBox.style.display = 'none';
      }
    }, 'Автомат нэр');
    const custBtn = el('button', {
      onClick: () => {
        nameMode = 'custom';
        custBtn.classList.add('active');
        autoBtn.classList.remove('active');
        autoBox.style.display = 'none';
        custBox.style.display = 'block';
        setTimeout(() => custInput.focus(), 0);
      }
    }, 'Өөрөө бичих');
    pill.appendChild(autoBtn);
    pill.appendChild(custBtn);
    dialog.appendChild(pill);

    // Auto name preview
    const autoBox = el('div', { class: 'save-namebox' });
    autoBox.appendChild(el('div', { class: 'save-namebox-label' }, 'Автомат нэр:'));
    autoBox.appendChild(el('div', { class: 'save-namebox-value' }, autoNameValue));
    dialog.appendChild(autoBox);

    // Custom name input
    const custBox = el('div', { class: 'save-namebox', style: { display: 'none' } });
    custBox.appendChild(el('div', { class: 'save-namebox-label' }, 'Бодлогын нэр:'));
    const custInput = el('input', {
      class: 'input',
      type: 'text',
      placeholder: 'жишээ нь: "Тавилгын үйлдвэр", "Хичээлийн даалгавар 3"',
      style: { width: '100%' },
      onInput: e => { customName = e.target.value; }
    });
    custBox.appendChild(custInput);
    dialog.appendChild(custBox);

    // Buttons
    const btnRow = el('div', { class: 'save-dialog-actions' });
    btnRow.appendChild(el('button', {
      class: 'btn btn-secondary',
      onClick: () => close()
    }, 'Болих'));
    btnRow.appendChild(el('button', {
      class: 'btn btn-primary',
      onClick: () => doSave()
    }, '☆ Хадгалах'));
    dialog.appendChild(btnRow);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // ESC to close
    function onKey(e) {
      if (e.key === 'Escape') close();
      else if (e.key === 'Enter' && nameMode === 'custom') doSave();
    }
    document.addEventListener('keydown', onKey);

    // Click overlay (not dialog) to close
    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });

    function close() {
      document.removeEventListener('keydown', onKey);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    function doSave() {
      const name = (nameMode === 'custom' ? customName.trim() : '') || autoNameValue;
      try {
        const rec = Storage.saveProblem(lp, method, name);
        close();
        showToast('✓ "' + name + '" хадгалагдлаа');
        if (onSaved) onSaved(rec);
      } catch (e) {
        alert('Алдаа: ' + e.message);
      }
    }
  }

  // Toast notification (auto-dismissed)
  function showToast(message) {
    const old = document.querySelector('.lp-toast');
    if (old) old.parentNode.removeChild(old);
    const toast = el('div', { class: 'lp-toast' }, message);
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2500);
  }

  window.LP = window.LP || {};
  window.LP.openSaveDialog = openSaveDialog;
  window.LP.showToast = showToast;
})();
