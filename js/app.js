// =============================================================================
// APP BOOT — бүх модуль ачаалагдсаны дараа ажиллана
// =============================================================================
(function () {
  'use strict';

  function boot() {
    if (!window.LP || !window.LP.App) return;

    // Auth-ыг эхлүүлж (анхны админ данс үүсгэх, сесс сэргээх) дараа нь эхлэл хуудсыг нээнэ
    window.LP.Auth.init().then(() => {
      if (window.LP.AuthUI) window.LP.AuthUI.refreshChrome();
      window.LP.App.go('home');

      // Нэвтрэлтийн төлөв өөрчлөгдөх бүрд цэсийг шинэчилнэ
      window.LP.Auth.onChange(() => {
        if (window.LP.AuthUI) window.LP.AuthUI.refreshChrome();
      });

      // Эхний удаа нууц үг солих шаардлагатай бол сануулна
      const u = window.LP.Auth.currentUser();
      if (u && u.must_change_pw) {
        setTimeout(() => window.LP.AuthUI.openChangePassword(true), 400);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
