import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export class Exporter {
  /**
   * Export the current editor canvas to a PDF.
   * @param {import('./BlockEditor.js').BlockEditor} editor
   */
  static async exportToPDF(editor) {
    const pages = document.querySelectorAll('.be-page');
    if (pages.length === 0) return;

    // A4 dimensions in mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i];
      // Temporarily remove box shadow and margin for clean capture
      const originalShadow = pageEl.style.boxShadow;
      const originalMargin = pageEl.style.marginBottom;
      pageEl.style.boxShadow = 'none';
      pageEl.style.marginBottom = '0';
      pageEl.classList.add('be-exporting');

      const canvas = await html2canvas(pageEl, {
        scale: 2, // Higher resolution
        useCORS: true,
        logging: false
      });

      pageEl.style.boxShadow = originalShadow;
      pageEl.style.marginBottom = originalMargin;
      pageEl.classList.remove('be-exporting');

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      if (i > 0) {
        pdf.addPage();
      }
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }

    pdf.save('resume.pdf');
  }

  /**
   * Export the current editor canvas to a PNG.
   * Exports the first page by default.
   * @param {import('./BlockEditor.js').BlockEditor} editor
   */
  static async exportToPNG(editor) {
    const pages = document.querySelectorAll('.be-page');
    if (pages.length === 0) return;

    const pageEl = pages[0]; // Just capture the first page
    const originalShadow = pageEl.style.boxShadow;
    pageEl.style.boxShadow = 'none';

    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    pageEl.style.boxShadow = originalShadow;

    const link = document.createElement('a');
    link.download = 'resume.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  /**
   * Export the text content in order for ATS parsing.
   * @param {import('./BlockEditor.js').BlockEditor} editor
   */
  static exportToATS(editor) {
    const blocks = Array.from(editor.blocks.values());
    
    // Sort blocks by page, then by Y coordinate
    blocks.sort((a, b) => {
      const pageA = a.position.pageIndex || 0;
      const pageB = b.position.pageIndex || 0;
      if (pageA !== pageB) return pageA - pageB;
      return (a.position.y || 0) - (b.position.y || 0);
    });

    let text = '';
    blocks.forEach(block => {
      const el = block.getEditableEl();
      if (el) {
        // Simple extraction, ensuring spaces between elements
        text += el.innerText.trim() + '\n\n';
      }
    });

    return text.trim();
  }
}
