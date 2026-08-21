// =============================================================================
// FORMULATION PAGE — how to translate word problems to LP
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const App = window.LP.App;

  App.register('formulation', main => {
    main.appendChild(el('div', {
      html: '<h1 class="page-title">Бодлогын <em>тавилт</em></h1>' +
            '<p class="page-subtitle">Үг хэлбэрээр өгөгдсөн ШП бодлогыг математик ' +
            'илэрхийлэлд хэрхэн оруулах вэ — алхамууд.</p>'
    }));

    // Steps
    const stepsCard = el('div', { class: 'card' });
    stepsCard.appendChild(el('h3', { class: 'subsection' }, '◇ Гурван үндсэн алхам'));
    stepsCard.appendChild(el('div', {
      html:
        '<p><b>1. Шийдвэрийн хувьсагчдыг сонгох (x₁, x₂, …)</b><br>' +
        'Юу үйлдвэрлэх вэ? Хэдэн ширхэг? — гэж асуухад хариу болох тоо нь шийдвэрийн хувьсагч.</p>' +
        '<p><b>2. Зорилгын функцийг бичих (max Z эсвэл min Z)</b><br>' +
        'Ашиг бол max, зардал бол min. Z = c₁x₁ + c₂x₂ + … хэлбэртэй.</p>' +
        '<p><b>3. Хязгаарлалтын системийг бичих</b><br>' +
        'Нөөцийн хязгаар (≤), стандарт буюу шаардлага (≥), баланс (=). ' +
        'Бас үргэлж x ≥ 0 нөхцөл оруулна.</p>'
    }));
    main.appendChild(stepsCard);

    // Example walk-through
    const ex = el('div', { class: 'card' });
    ex.appendChild(el('h3', { class: 'subsection' }, '◈ Жишээгээр харах: "Модон урлал"'));
    ex.appendChild(el('p', {
      html: '<i>"Үйлдвэр стол ба сандал хийдэг. 1 стол хийхэд 4 м³ мод, 2 хүн-цаг ажиллагаа ' +
            'хэрэгтэй. 1 сандал хийхэд 2 м³ мод, 4 хүн-цаг ажиллагаа хэрэгтэй. ' +
            '1 ширхэг стол 50 мянган төгрөгийн ашиг өгдөг бол сандал 40 мянган төгрөг. ' +
            'Үйлдвэрт нийт 100 м³ мод, 80 хүн-цаг ажиллагаа байна. ' +
            'Хамгийн их ашиг олох үйлдвэрлэлийн төлөвлөгөөг гаргана уу."</i>'
    }));

    ex.appendChild(el('div', {
      class: 'panel info',
      style: { marginTop: '12px' },
      html:
        '<div class="panel-title">Алхам 1 — Хувьсагч</div>' +
        '<p>x₁ = үйлдвэрлэх стол тоо (ширхэг)<br>x₂ = үйлдвэрлэх сандал тоо (ширхэг)</p>'
    }));
    ex.appendChild(el('div', {
      class: 'panel success',
      style: { marginTop: '12px' },
      html:
        '<div class="panel-title">Алхам 2 — Зорилгын функц</div>' +
        '<p>Нийт ашиг: Z = 50x₁ + 40x₂ → max</p>'
    }));
    ex.appendChild(el('div', {
      class: 'panel warn',
      style: { marginTop: '12px' },
      html:
        '<div class="panel-title">Алхам 3 — Хязгаарлалтууд</div>' +
        '<p>Мод:        4x₁ + 2x₂ ≤ 100<br>' +
        'Хүн-цаг:    2x₁ + 4x₂ ≤ 80<br>' +
        'Тэмдэг:     x₁, x₂ ≥ 0 (буцаалт байхгүй)</p>'
    }));

    const tryBtn = el('div', { class: 'action-bar' });
    tryBtn.appendChild(el('button', {
      class: 'btn btn-primary',
      onClick: () => {
        window.LP._pendingExample = window.LP.Examples.find(e => e.id === 'modon-urlal');
        App.go('simplex');
      }
    }, 'Энэ жишээг бодох →'));
    ex.appendChild(tryBtn);
    main.appendChild(ex);
  });
})();
