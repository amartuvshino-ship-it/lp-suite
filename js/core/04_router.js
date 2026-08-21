// =============================================================================
// ROUTER — Page navigation + эрхийн хяналт
// =============================================================================
(function () {
  'use strict';

  const App = {
    routes: {},
    current: 'home',
    params: {},

    register: function (route, fn) {
      this.routes[route] = fn;
    },

    // go('lesson', { n: 3 }) — хоёр дахь аргумент нь хуудсанд дамжих параметр
    go: function (route, params) {
      this.params = params || {};

      // ---- Эрхийн хяналт ----
      const Access = window.LP.Access;
      const allowed = !Access || Access.canRoute(route);

      this.current = route;
      document.querySelectorAll('.nav-item').forEach(b => {
        b.classList.toggle('active', b.dataset.route === route);
      });

      const main = document.getElementById('main');
      if (!main) return;
      main.innerHTML = '';

      if (!allowed) {
        if (window.LP.AuthUI) window.LP.AuthUI.renderLocked(main, route);
        else main.innerHTML = '<div class="card"><h1 class="page-title">Хаалттай</h1></div>';
        window.scrollTo(0, 0);
        return;
      }

      const fn = this.routes[route];
      if (fn) {
        fn(main, this.params);
      } else {
        main.innerHTML = `<div class="card">
          <h1 class="page-title">Алдаа</h1>
          <p>"${route}" хуудас олдсонгүй.</p>
        </div>`;
      }
      window.scrollTo(0, 0);
      // Render KaTeX after content
      setTimeout(() => {
        if (window.renderMathInElement) {
          window.renderMathInElement(main, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$',  right: '$',  display: false },
            ],
            throwOnError: false,
          });
        }
      }, 0);
    },
  };

  window.LP = window.LP || {};
  window.LP.App = App;
})();
