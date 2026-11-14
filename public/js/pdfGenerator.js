/**
 * pdfGenerator.js
 * Generates clean A4 PDF from bill data without any external dependencies.
 * Uses the browser's built-in print dialog as the PDF engine.
 * A dedicated print window is created with optimized CSS.
 */

'use strict';

const PDFGenerator = (() => {

  /**
   * Format date string for display.
   * @param {string|null} dateStr
   * @returns {string}
   */
  function fmtDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    } catch { return dateStr; }
  }

  /**
   * Format currency in INR.
   */
  function fmtINR(amount) {
    if (amount === null || amount === undefined) return '—';
    return '₹ ' + new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Generate the HTML content for the print window.
   */
  function buildPrintHTML(bill, kNumber, fetchedAt) {
    const val = (v) => v || '—';
    const now = new Date().toLocaleString('en-IN');

    return `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AVVNL Bill — ${val(bill.billMonth)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&family=Roboto+Mono&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 15mm; }
    body {
      font-family: 'Noto Sans Devanagari', Roboto, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #212121;
      background: #fff;
    }
    .mono { font-family: 'Roboto Mono', 'Courier New', monospace; }

    /* ── Bill Container ── */
    .bill-wrapper {
      max-width: 180mm;
      margin: 0 auto;
      border: 2px solid #1565c0;
      border-radius: 8pt;
      overflow: hidden;
    }

    /* ── Header ── */
    .bill-header {
      background: #1565c0;
      color: #fff;
      padding: 16pt 20pt;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .bill-header-title { font-size: 18pt; font-weight: 800; letter-spacing: 1px; }
    .bill-header-sub { font-size: 9pt; opacity: 0.85; margin-top: 3pt; }
    .bill-period-label {
      background: rgba(255,255,255,0.2);
      padding: 6pt 12pt;
      border-radius: 20pt;
      font-size: 10pt;
      font-weight: 700;
      text-align: center;
    }

    /* ── Sections ── */
    .bill-section {
      padding: 14pt 20pt;
      border-bottom: 1px solid #e0e0e0;
    }
    .section-title {
      font-size: 8pt;
      font-weight: 800;
      color: #1565c0;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-bottom: 1.5pt solid #1565c0;
      padding-bottom: 4pt;
      margin-bottom: 10pt;
    }

    /* ── Grid ── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10pt;
    }
    .info-item { display: flex; flex-direction: column; gap: 1pt; }
    .info-label {
      font-size: 7pt;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
    }
    .info-value { font-size: 10pt; font-weight: 600; }

    /* ── Readings ── */
    .readings-row {
      display: flex;
      gap: 12pt;
      align-items: center;
      margin-bottom: 12pt;
    }
    .reading-box {
      flex: 1;
      text-align: center;
      padding: 10pt;
      border-radius: 6pt;
    }
    .reading-box.prev { background: #f5f5f5; border: 1pt solid #ccc; }
    .reading-box.curr { background: #e3f2fd; border: 1pt solid #90caf9; }
    .reading-label { font-size: 7pt; color: #666; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 4pt; }
    .reading-value { font-size: 20pt; font-weight: 800; font-family: 'Roboto Mono', monospace; }
    .reading-arrow { font-size: 18pt; color: #1565c0; }

    .units-box {
      background: #1565c0;
      color: #fff;
      padding: 10pt 16pt;
      border-radius: 6pt;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .units-label { font-size: 10pt; font-weight: 600; }
    .units-value { font-size: 22pt; font-weight: 800; font-family: 'Roboto Mono', monospace; }
    .units-unit { font-size: 9pt; opacity: 0.85; }

    /* ── Amount Table ── */
    .amount-table { width: 100%; border-collapse: collapse; }
    .amount-table tr { border-bottom: 1pt dashed #e0e0e0; }
    .amount-table tr:last-child { border-bottom: 2pt solid #bdbdbd; }
    .amount-table td { padding: 6pt 0; font-size: 10pt; }
    .amount-table .amount-label { color: #555; }
    .amount-table .amount-val { text-align: right; font-weight: 700; font-family: 'Roboto Mono', monospace; }
    .amount-table .arrears { color: #c62828; }
    .amount-table .discount { color: #2e7d32; }

    .total-box {
      background: #1565c0;
      color: #fff;
      padding: 14pt 16pt;
      border-radius: 6pt;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12pt;
    }
    .total-label { font-size: 11pt; font-weight: 600; }
    .total-value { font-size: 22pt; font-weight: 800; font-family: 'Roboto Mono', monospace; }

    .due-box {
      background: #fff8e1;
      border: 1pt solid #ffe082;
      padding: 10pt 16pt;
      border-radius: 6pt;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10pt;
    }
    .due-label { font-size: 10pt; font-weight: 600; color: #f57f17; }
    .due-value { font-size: 12pt; font-weight: 800; color: #f57f17; font-family: 'Roboto Mono', monospace; }

    /* ── Footer ── */
    .bill-footer {
      background: #f5f5f5;
      padding: 10pt 20pt;
      font-size: 8pt;
      color: #888;
      display: flex;
      justify-content: space-between;
    }

    .print-stamp {
      text-align: center;
      margin-top: 16pt;
      font-size: 8pt;
      color: #aaa;
    }

    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <!-- Print / Download Button (hidden in print) -->
  <div class="no-print" style="text-align:center; padding: 16pt; margin-bottom: 8pt;">
    <button onclick="window.print()" style="
      background:#1565c0; color:#fff; border:none; padding:10pt 24pt;
      font-size:12pt; border-radius:6pt; cursor:pointer; font-family:inherit;
      margin-right:8pt;">
      🖨️ Print / PDF Save
    </button>
    <button onclick="window.close()" style="
      background:#e0e0e0; color:#333; border:none; padding:10pt 24pt;
      font-size:12pt; border-radius:6pt; cursor:pointer; font-family:inherit;">
      ✕ बंद करें
    </button>
  </div>

  <div class="bill-wrapper">

    <!-- Header -->
    <div class="bill-header">
      <div>
        <div class="bill-header-title">⚡ AVVNL</div>
        <div class="bill-header-sub">Ajmer Vidyut Vitran Nigam Limited</div>
        <div class="bill-header-sub">Sub Meter Bill Generator</div>
      </div>
      <div class="bill-period-label">${val(bill.billMonth)}<br>${val(bill.billYear)}</div>
    </div>

    <!-- Consumer Details -->
    <div class="bill-section">
      <div class="section-title">Consumer Details</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Consumer Name</span>
          <span class="info-value">${val(bill.customerName)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">K-Number</span>
          <span class="info-value mono">${val(kNumber || bill.consumerNumber)}</span>
        </div>
        ${bill.connectionType ? `<div class="info-item">
          <span class="info-label">Connection Type</span>
          <span class="info-value">${bill.connectionType}</span>
        </div>` : ''}
        ${bill.meterNumber ? `<div class="info-item">
          <span class="info-label">Meter Number</span>
          <span class="info-value mono">${bill.meterNumber}</span>
        </div>` : ''}
        ${bill.address ? `<div class="info-item" style="grid-column: span 2;">
          <span class="info-label">Address</span>
          <span class="info-value">${bill.address}</span>
        </div>` : ''}
        ${bill.subdivision ? `<div class="info-item">
          <span class="info-label">Sub-Division</span>
          <span class="info-value">${bill.subdivision}</span>
        </div>` : ''}
      </div>
    </div>

    <!-- Bill Details -->
    <div class="bill-section">
      <div class="section-title">Bill Details</div>
      <div class="info-grid">
        ${bill.billNumber ? `<div class="info-item">
          <span class="info-label">Bill Number</span>
          <span class="info-value mono">${bill.billNumber}</span>
        </div>` : ''}
        ${bill.billDate ? `<div class="info-item">
          <span class="info-label">Bill Date</span>
          <span class="info-value">${fmtDate(bill.billDate)}</span>
        </div>` : ''}
        ${bill.billMonth ? `<div class="info-item">
          <span class="info-label">Bill Month</span>
          <span class="info-value">${bill.billMonth}</span>
        </div>` : ''}
        ${bill.billPeriod ? `<div class="info-item">
          <span class="info-label">Billing Period</span>
          <span class="info-value">${bill.billPeriod}</span>
        </div>` : ''}
      </div>
    </div>

    <!-- Meter Readings -->
    <div class="bill-section">
      <div class="section-title">Meter Readings</div>
      <div class="readings-row">
        <div class="reading-box prev">
          <span class="reading-label">Previous Reading</span>
          <span class="reading-value mono">${val(bill.previousReading)}</span>
        </div>
        <div class="reading-arrow">→</div>
        <div class="reading-box curr">
          <span class="reading-label">Current Reading</span>
          <span class="reading-value mono">${val(bill.currentReading)}</span>
        </div>
      </div>
      <div class="units-box">
        <span class="units-label">Units Consumed / खपत</span>
        <span class="units-value">${val(bill.unitsConsumed)}</span>
        <span class="units-unit">kWh</span>
      </div>
    </div>

    <!-- Amount Details -->
    <div class="bill-section">
      <div class="section-title">Amount Details</div>
      <table class="amount-table">
        ${bill.currentCharges !== null ? `<tr>
          <td class="amount-label">Current Charges</td>
          <td class="amount-val">${fmtINR(bill.currentCharges)}</td>
        </tr>` : ''}
        ${bill.fixedCharges !== null ? `<tr>
          <td class="amount-label">Fixed Charges</td>
          <td class="amount-val">${fmtINR(bill.fixedCharges)}</td>
        </tr>` : ''}
        ${bill.taxes !== null ? `<tr>
          <td class="amount-label">Taxes / Surcharge</td>
          <td class="amount-val">${fmtINR(bill.taxes)}</td>
        </tr>` : ''}
        ${bill.arrears !== null ? `<tr>
          <td class="amount-label">Arrears / पिछला बकाया</td>
          <td class="amount-val arrears">${fmtINR(bill.arrears)}</td>
        </tr>` : ''}
        ${bill.discount !== null ? `<tr>
          <td class="amount-label">Discount / Rebate</td>
          <td class="amount-val discount">- ${fmtINR(bill.discount)}</td>
        </tr>` : ''}
      </table>

      <div class="total-box">
        <span class="total-label">कुल देय राशि<br><small style="font-weight:400;font-size:9pt;">Total Payable Amount</small></span>
        <span class="total-value">${fmtINR(bill.dueAmount)}</span>
      </div>

      <div class="due-box">
        <span class="due-label">📅 Due Date / अंतिम तारीख</span>
        <span class="due-value">${fmtDate(bill.dueDate)}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="bill-footer">
      <span>Fetched: ${fetchedAt ? new Date(fetchedAt).toLocaleString('en-IN') : now}</span>
      ${bill.refId ? `<span>Ref: ${bill.refId}</span>` : ''}
      <span>Generated: ${now}</span>
    </div>

  </div>

  <div class="print-stamp">
    This bill is fetched from AVVNL via MSR Pay API. For official records, please contact AVVNL office.
  </div>

  <script>
    // Auto-open print dialog after fonts load
    window.addEventListener('load', () => {
      setTimeout(() => {
        // Don't auto-print — let user decide
      }, 500);
    });
  </script>
</body>
</html>`;
  }

  /**
   * Open bill in a new print window.
   * @param {Object} bill - Normalized bill data
   * @param {string} kNumber - K-Number
   * @param {string} fetchedAt - ISO fetch timestamp
   */
  function printBill(bill, kNumber, fetchedAt) {
    const html = buildPrintHTML(bill, kNumber, fetchedAt);
    const printWin = window.open('', '_blank', 'width=800,height=900,scrollbars=yes');
    if (!printWin) {
      alert('Popup blocked! कृपया browser में popup allow करें।');
      return;
    }
    printWin.document.write(html);
    printWin.document.close();
  }

  /**
   * Download bill as PDF using browser print-to-PDF.
   * Opens a new window pre-configured for printing.
   */
  function downloadPDF(bill, kNumber, fetchedAt) {
    printBill(bill, kNumber, fetchedAt);
    // User can use Ctrl+P → Save as PDF in the print dialog
  }

  return { printBill, downloadPDF };
})();

window.PDFGenerator = PDFGenerator;
