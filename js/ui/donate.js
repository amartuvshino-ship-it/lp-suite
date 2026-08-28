// =============================================================================
// DONATE — Дэмжих (хандив) цонх
// =============================================================================
// Тохиргоо нь js/config.js доторх LP.Config.DONATE-д байна. Тэндээ л засна.
// Энэ файлыг хөндөх шаардлагагүй.
//
// Юу хийдэг вэ:
//   · Зүүн цэсний доод талд «Дэмжих» товч гаргана
//   · Товшиход банкны мэдээлэл, QR бүхий цонх нээгдэнэ
//   · Мөр бүрийн хажууд «Хуулах» товч — IBAN-г гараар бичих шаардлагагүй
//   · Бөглөөгүй талбарыг өөрөө нуудаг тул хагас дутуу мэдээлэлтэй ч эвдрэхгүй
// =============================================================================
(function () {
  'use strict';

  const el = window.LP.el;
  const D = (window.LP.Config && window.LP.Config.DONATE) || {};

  // Юу ч тохируулаагүй бол товч огт гаргахгүй
  function enabled() {
    return !!(D.enabled && (D.iban || D.account || D.qr));
  }

  // ---------------------------------------------------------------------------
  // Хуулах
  // ---------------------------------------------------------------------------
  function copy(text, btn) {
    const done = () => {
      const old = btn.textContent;
      btn.textContent = '✓ Хуулагдлаа';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = old; btn.classList.remove('copied'); }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallback(text, done));
    } else {
      fallback(text, done);
    }
  }

  function fallback(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* чимээгүй */ }
    document.body.removeChild(ta);
  }

  // ---------------------------------------------------------------------------
  // Цонх
  // ---------------------------------------------------------------------------
  function open() {
    const back = el('div', { class: 'modal-back', onClick: e => { if (e.target === back) close(); } });
    const box = el('div', { class: 'modal donate-modal', role: 'dialog', 'aria-label': 'Дэмжих' });

    // ---- Толгой ----
    const head = el('div', { class: 'case-head' });
    const ttl = el('div', {});
    ttl.appendChild(el('div', { class: 'case-title' }, D.title || 'Төслийг дэмжих'));
    if (D.subtitle) ttl.appendChild(el('div', { class: 'case-sub' }, D.subtitle));
    head.appendChild(ttl);
    head.appendChild(el('button', { class: 'modal-x', title: 'Хаах (Esc)', onClick: close }, '✕'));
    box.appendChild(head);

    const body = el('div', { class: 'case-body' });

    // ---- Зорилго ----
    if (D.note) {
      body.appendChild(el('p', { class: 'donate-note' }, D.note));
    }
    if (D.uses && D.uses.length) {
      const ul = el('ul', { class: 'donate-uses' });
      D.uses.forEach(u => ul.appendChild(el('li', {}, u)));
      body.appendChild(ul);
    }

    // ---- Дансны мэдээлэл ----
    const rows = [
      ['Хүлээн авагч', D.name],
      ['Банк', D.bank],
      ['IBAN', D.iban],
      ['Дансны дугаар', D.account],
      ['SWIFT / BIC', D.swift],
      ['Гүйлгээний утга', D.reference],
    ].filter(r => r[1]);

    if (rows.length) {
      body.appendChild(el('div', { class: 'case-label' }, 'Шилжүүлэх мэдээлэл'));
      const list = el('div', { class: 'donate-rows' });
      rows.forEach(([k, v]) => {
        const row = el('div', { class: 'donate-row' });
        row.appendChild(el('div', { class: 'donate-key' }, k));
        row.appendChild(el('div', { class: 'donate-val' }, v));
        const btn = el('button', { class: 'btn btn-ghost btn-xs donate-copy', type: 'button' }, 'Хуулах');
        btn.addEventListener('mousedown', e => e.preventDefault());
        btn.addEventListener('click', () => copy(v, btn));
        row.appendChild(btn);
        list.appendChild(row);
      });
      body.appendChild(list);
    }

    // ---- QR ----
    if (D.qr) {
      body.appendChild(el('div', { class: 'case-label' }, D.qrLabel || 'Утсаар шилжүүлэх'));
      const wrap = el('div', { class: 'donate-qr' });
      const img = el('img', { src: D.qr, alt: D.qrLabel || 'Хандивын QR код', loading: 'lazy' });
      img.addEventListener('error', () => wrap.style.display = 'none');
      wrap.appendChild(img);
      if (D.qrHint) wrap.appendChild(el('div', { class: 'donate-qr-hint' }, D.qrHint));
      body.appendChild(wrap);
    }

    box.appendChild(body);

    // ---- Хөл ----
    const foot = el('div', { class: 'case-foot' });
    foot.appendChild(el('span', { class: 'donate-thanks' }, D.thanks || 'Дэмжсэн бүхэнд баярлалаа.'));
    foot.appendChild(el('button', { class: 'btn btn-primary', onClick: close }, 'Хаах'));
    box.appendChild(foot);

    back.appendChild(box);
    document.body.appendChild(back);
    document.addEventListener('keydown', onKey);

    function onKey(e) { if (e.key === 'Escape') close(); }
    function close() {
      document.removeEventListener('keydown', onKey);
      if (back.parentNode) back.parentNode.removeChild(back);
    }
  }

  // ---------------------------------------------------------------------------
  // Цэсний товч
  // ---------------------------------------------------------------------------
  function mount() {
    if (!enabled()) return;
    const nav = document.querySelector('.sidebar nav') || document.querySelector('.sidebar');
    if (!nav || document.querySelector('.donate-btn')) return;

    const wrap = el('div', { class: 'nav-group donate-group' });
    const btn = el('button', { class: 'donate-btn', type: 'button', onClick: open });
    btn.appendChild(el('span', { class: 'donate-heart' }, '♡'));
    btn.appendChild(el('span', {}, D.button || 'Төслийг дэмжих'));
    wrap.appendChild(btn);
    nav.appendChild(wrap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  window.LP = window.LP || {};
  window.LP.Donate = { open: open, mount: mount, enabled: enabled };
})();
