// =============================================================================
// PDF EXPORT — converts a DOM container to multi-page PDF
// =============================================================================
(function () {
  'use strict';

  function exportPDF(container, filename) {
    if (!window.jspdf || !window.html2canvas) {
      alert('PDF сан ачаалагдаагүй байна. Интернет холболтоо шалгана уу.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const target = container.cloneNode(true);
    target.querySelectorAll('.action-bar, button').forEach(b => b.style.display = 'none');
    target.style.padding = '20px';
    target.style.background = '#fff';
    target.style.width = '900px';
    target.style.position = 'absolute';
    target.style.left = '-9999px';
    document.body.appendChild(target);

    window.html2canvas(target, { scale: 2, backgroundColor: '#FAFAF7' }).then(canvas => {
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'p' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 40;
      const imgH = canvas.height * imgW / canvas.width;

      let srcY = 0;
      let remaining = imgH;
      const sliceH = (pageH - 40) * canvas.width / imgW;

      while (remaining > 0) {
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = Math.min(sliceH, canvas.height - srcY);
        const ctx = slice.getContext('2d');
        ctx.drawImage(canvas, 0, srcY, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
        const imgPart = slice.toDataURL('image/png');
        const partH = slice.height * imgW / canvas.width;
        pdf.addImage(imgPart, 'PNG', 20, 20, imgW, partH);
        srcY += slice.height;
        remaining -= partH;
        if (remaining > 0) pdf.addPage();
      }
      pdf.save(filename || 'lp-solution.pdf');
      document.body.removeChild(target);
    });
  }

  window.LP = window.LP || {};
  window.LP.exportPDF = exportPDF;
})();
