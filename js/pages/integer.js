// =============================================================================
// INTEGER PROGRAMMING PAGE
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const App = window.LP.App;

  App.register('integer', main => {
    let initial = null;
    if (window.LP._pendingExample && window.LP._pendingExample.method === 'integer') {
      initial = window.LP._pendingExample.lp;
      window.LP._pendingExample = null;
    }

    main.appendChild(el('div', {
      html: '<h1 class="page-title">Бүхэл <em>тоон программчлал</em></h1>' +
            '<p class="page-subtitle">Шийдвэрийн хувьсагч заавал бүхэл тоо байх ' +
            'шаардлагатай ШП. Branch & Bound (салаалуулан хязгаарлах) аргаар бодно.</p>'
    }));

    main.appendChild(el('div', {
      class: 'card',
      html:
        '<h3 class="subsection">◇ Branch & Bound аргын зарчим</h3>' +
        '<p>1. Эхлээд <b>бүхэл тоон нөхцөлийг түр зуур орхиж</b> энгийн ШП-аар бодно (Симплекс).</p>' +
        '<p>2. Хариу нь аль хэдийн бүхэл тоо бол → дууссан.</p>' +
        '<p>3. Үгүй бол хамгийн бутархай хувьсагчийг сонгож <b>2 салаа</b> үүсгэнэ:<br>' +
        '<span style="margin-left:16px"><code>xⱼ ≤ ⌊v⌋</code> (доош дугуйрсан) болон ' +
        '<code>xⱼ ≥ ⌈v⌉</code> (дээш дугуйрсан)</span></p>' +
        '<p>4. Салаа бүрд дахин ШП бодоод:<br>' +
        '<span style="margin-left:16px">' +
        '• <b>Шийдгүй</b> → салаа хаасан<br>' +
        '• <b>Z муу</b> (одоогийн хамгийн сайнаас дор) → хязгаарлаж хаасан<br>' +
        '• <b>Бүхэл тоо</b> → шинэ хамгийн сайн шийд бол солино<br>' +
        '• Үгүй бол дахин салаалах</span></p>' +
        '<p>5. Бүх салаа дуустал давтана.</p>'
    }));

    window.LP.buildLPInput(main, {
      title: 'Бүхэл тоон бодлого',
      subtitle: 'Бүх хувьсагч бүхэл тоо байх ёстой. ' +
                'Алгоритм автоматаар Симплексээс эхлээд салаалуулан хязгаарлах аргаар бодно.',
      allowedOps: ['<=', '>=', '='],
      defaultOp: '<=',
      objective: 'max',
      initial: initial,
      methodKey: 'integer',
      onSolve: (lp, out) => {
        const result = window.LP.branchBound.solve(lp);
        window.LP.renderIntegerSolution(result, lp, out);
      }
    });
  });
})();
