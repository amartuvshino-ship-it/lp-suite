// =============================================================================
// SETTINGS PAGE
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const App = window.LP.App;
  const Settings = window.LP.Settings;

  App.register('settings', main => {
    main.appendChild(el('div', {
      html: '<h1 class="page-title">Тохиргоо</h1>' +
            '<p class="page-subtitle">Тоо харуулах хэлбэр, тайлбарын дэлгэрэнгүй түвшин.</p>'
    }));

    const card = el('div', { class: 'card' });

    // Number display
    card.appendChild(el('h3', { class: 'subsection' }, 'Тоог хэрхэн харуулах'));
    const fracPill = el('div', { class: 'pill-toggle' });
    const fBtn = el('button', {
      class: Settings.numberDisplay === 'fraction' ? 'active' : '',
      onClick: () => {
        Settings.numberDisplay = 'fraction';
        fBtn.classList.add('active'); dBtn.classList.remove('active');
      }
    }, '½ Бутархай');
    const dBtn = el('button', {
      class: Settings.numberDisplay === 'decimal' ? 'active' : '',
      onClick: () => {
        Settings.numberDisplay = 'decimal';
        dBtn.classList.add('active'); fBtn.classList.remove('active');
      }
    }, '0.5 Десимал');
    fracPill.appendChild(fBtn); fracPill.appendChild(dBtn);
    card.appendChild(fracPill);

    card.appendChild(el('p', {
      class: 'form-help',
      style: { marginTop: '8px' }
    }, 'Бутархай хэлбэрт алдаа гарахгүй (нарийвчлал 100%). Десимал нь уншихад хялбар.'));

    // Detail level
    card.appendChild(el('h3', {
      class: 'subsection',
      style: { marginTop: '24px' }
    }, 'Тайлбарын түвшин'));
    const detPill = el('div', { class: 'pill-toggle' });
    const sBtn = el('button', {
      class: Settings.detailLevel === 'short' ? 'active' : '',
      onClick: () => {
        Settings.detailLevel = 'short';
        sBtn.classList.add('active'); lBtn.classList.remove('active');
      }
    }, 'Богино тайлбар');
    const lBtn = el('button', {
      class: Settings.detailLevel === 'long' ? 'active' : '',
      onClick: () => {
        Settings.detailLevel = 'long';
        lBtn.classList.add('active'); sBtn.classList.remove('active');
      }
    }, 'Дэлгэрэнгүй тайлбар');
    detPill.appendChild(sBtn); detPill.appendChild(lBtn);
    card.appendChild(detPill);

    card.appendChild(el('p', {
      class: 'form-help',
      style: { marginTop: '8px' }
    }, 'Богино — гол алхмууд. Дэлгэрэнгүй — эдийн засгийн утга, торгуулийн тайлбар, ' +
       'Hawkins-Simon нөхцөл зэрэг бүгд автоматаар нээгддэг.'));

    main.appendChild(card);
  });
})();
