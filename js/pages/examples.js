// =============================================================================
// EXAMPLES PAGE — pre-loaded LP problems
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const App = window.LP.App;

  App.register('examples', main => {
    main.appendChild(el('div', {
      html: '<h1 class="page-title">Бэлэн <em>жишээнүүд</em></h1>' +
            '<p class="page-subtitle">Лекцийн сонгодог жишээнүүдийг товшоод шууд тохирох ' +
            'аргын хуудас руу ачаалагдана.</p>'
    }));

    const list = el('div', { class: 'example-list' });
    window.LP.Examples.forEach(ex => {
      const item = el('button', {
        class: 'example-item',
        onClick: () => {
          window.LP._pendingExample = ex;
          App.go(ex.method);
        }
      });
      item.appendChild(el('div', { class: 'example-icon' }, ex.icon));
      const content = el('div', { class: 'example-content' });
      content.appendChild(el('div', { class: 'example-title' }, ex.title));
      content.appendChild(el('div', { class: 'example-meta' }, ex.desc));
      item.appendChild(content);
      const meta = el('div', { class: 'tag' }, ex.method.toUpperCase());
      item.appendChild(meta);
      list.appendChild(item);
    });
    main.appendChild(list);
  });
})();
