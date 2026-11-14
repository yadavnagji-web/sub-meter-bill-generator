'use strict';

/**
 * YADAV COMPLEX SAKODARA - Sub-Meter Electricity Bill Generator
 * Mo. No: 8384980657, 9982151938
 * Pure Integer Zero-Mismatch Calculation (Hare-Niemeyer Algorithm)
 * Colourful & Attractive Design for Master Sheet & Tenant Slips
 * Auto-Rollover: Billed Reading Automatically Transfers to Next Month's Gat Pathan
 * Both Gat Pathan & Vartman Pathan are 100% Editable Inputs
 */

// Configure PDF.js worker
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const STORAGE_KEY = 'yadavComplexBillData_v9';
const HISTORY_KEY = 'yadavComplexBillHistory_v9';

const MONTH_NAMES_HI = [
  'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
  'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवम्बर', 'दिसंबर'
];

// Default Live Readings Provided by User:
// Flat No | Gat (Prev) | Raw Meter Reading (Today)
const DEFAULT_FLATS = [
  { room: 1, name: 'Flat 1', prev: 2920, rawCurr: 2938, phone: '' },
  { room: 2, name: 'Flat 2', prev: 2127, rawCurr: 2200, phone: '' },
  { room: 3, name: 'Flat 3', prev: 2352, rawCurr: 2423, phone: '' },
  { room: 4, name: 'Flat 4', prev: 2690, rawCurr: 2760, phone: '' },
  { room: 5, name: 'Flat 5', prev: 3139, rawCurr: 3196, phone: '' },
  { room: 6, name: 'Flat 6', prev: 1883, rawCurr: 2045, phone: '' },
  { room: 7, name: 'Flat 7', prev: 1453, rawCurr: 1572, phone: '' },
  { room: 8, name: 'Flat 8', prev: 2383, rawCurr: 2471, phone: '' }
];

let appState = {
  buildingName: 'YADAV COMPLEX SAKODARA',
  ownerPhone: '8384980657, 9982151938',
  billMonth: 'नवम्बर 2026',
  govtPrev: 5493,
  govtCurr: 6100,
  govtUnits: 607,
  govtAmount: 4970,
  flatRate: 8.19,
  commonUnits: 90, // 90 units common deducted from Master Units (607 - 90 = 517)
  flats: JSON.parse(JSON.stringify(DEFAULT_FLATS))
};

let deferredPrompt = null;

// ── INITIALIZATION ──
document.addEventListener('DOMContentLoaded', () => {
  // Clean up legacy keys
  ['yadavComplexBillData', 'yadavComplexBillData_v2', 'yadavComplexBillData_v3', 'yadavComplexBillData_v4', 'yadavComplexBillData_v5', 'yadavComplexBillData_v6', 'yadavComplexBillData_v7', 'yadavComplexBillData_v8'].forEach((k) => {
    try { localStorage.removeItem(k); } catch (e) {}
  });

  loadSavedState();
  initEventListeners();
  initPDFDropzone();
  initPWA();
  renderFlatsTable();
  recalculateAll();
});

// ── LOCAL STORAGE SAVE & LOAD (CONTINUOUS AUTO-SAVE) ──
function loadSavedState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      appState = { ...appState, ...parsed };
      appState.ownerPhone = '8384980657, 9982151938'; // Always enforce both numbers
      document.getElementById('bill-month').value = appState.billMonth || 'नवम्बर 2026';
      document.getElementById('govt-prev').value = appState.govtPrev !== undefined ? appState.govtPrev : 5493;
      document.getElementById('govt-curr').value = appState.govtCurr !== undefined ? appState.govtCurr : 6100;
      document.getElementById('govt-units').value = appState.govtUnits !== undefined ? appState.govtUnits : 607;
      document.getElementById('govt-amount').value = appState.govtAmount !== undefined ? appState.govtAmount : 4970;
      document.getElementById('flat-rate').value = appState.flatRate !== undefined ? appState.flatRate : 8.19;
      document.getElementById('less-units-input').value = appState.commonUnits !== undefined ? appState.commonUnits : 90;
    } catch (e) {
      console.warn('Error loading state:', e);
    }
  }
}

function saveCurrentState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

// ── EVENT LISTENERS ──
function initEventListeners() {
  document.getElementById('bill-month').addEventListener('input', (e) => {
    appState.billMonth = e.target.value;
    updateBottomBanner();
    saveCurrentState();
  });

  document.getElementById('govt-prev').addEventListener('input', (e) => {
    appState.govtPrev = parseFloat(e.target.value) || 0;
    if (appState.govtCurr >= appState.govtPrev) {
      appState.govtUnits = Math.round(appState.govtCurr - appState.govtPrev);
      document.getElementById('govt-units').value = appState.govtUnits;
    }
    saveCurrentState();
    recalculateAll();
  });

  document.getElementById('govt-curr').addEventListener('input', (e) => {
    appState.govtCurr = parseFloat(e.target.value) || 0;
    if (appState.govtCurr >= appState.govtPrev) {
      appState.govtUnits = Math.round(appState.govtCurr - appState.govtPrev);
      document.getElementById('govt-units').value = appState.govtUnits;
    }
    saveCurrentState();
    recalculateAll();
  });

  document.getElementById('govt-units').addEventListener('input', (e) => {
    appState.govtUnits = parseFloat(e.target.value) || 0;
    saveCurrentState();
    recalculateAll();
  });

  document.getElementById('govt-amount').addEventListener('input', (e) => {
    appState.govtAmount = parseFloat(e.target.value) || 0;
    saveCurrentState();
    recalculateAll();
  });

  document.getElementById('flat-rate').addEventListener('input', (e) => {
    appState.flatRate = parseFloat(e.target.value) || 0;
    saveCurrentState();
    recalculateAll();
  });

  document.getElementById('btn-rate-auto').addEventListener('click', () => {
    if (appState.govtUnits > 0) {
      appState.flatRate = parseFloat((appState.govtAmount / appState.govtUnits).toFixed(2));
      document.getElementById('flat-rate').value = appState.flatRate;
      saveCurrentState();
      recalculateAll();
    }
  });

  document.getElementById('btn-rate-9').addEventListener('click', () => {
    appState.flatRate = 9.00;
    document.getElementById('flat-rate').value = '9.00';
    saveCurrentState();
    recalculateAll();
  });

  document.getElementById('less-units-input').addEventListener('input', (e) => {
    appState.commonUnits = parseFloat(e.target.value) || 0;
    saveCurrentState();
    recalculateAll();
  });

  document.getElementById('btn-toggle-less-90').addEventListener('click', () => {
    appState.commonUnits = 90;
    document.getElementById('less-units-input').value = 90;
    saveCurrentState();
    recalculateAll();
  });

  document.getElementById('btn-toggle-less-0').addEventListener('click', () => {
    appState.commonUnits = 0;
    document.getElementById('less-units-input').value = 0;
    saveCurrentState();
    recalculateAll();
  });

  document.getElementById('btn-quick-fill-jpg').addEventListener('click', () => {
    if (confirm('क्या आप ताज़ा लाइव रीडिंग पुनः लोड करना चाहते हैं?')) {
      appState.flats = JSON.parse(JSON.stringify(DEFAULT_FLATS));
      saveCurrentState();
      renderFlatsTable();
      recalculateAll();
    }
  });

  // Force Cache Reload Button
  const btnForceReload = document.getElementById('btn-force-reload');
  if (btnForceReload) {
    btnForceReload.addEventListener('click', async () => {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      localStorage.removeItem(STORAGE_KEY);
      window.location.href = window.location.origin + window.location.pathname + '?t=' + Date.now();
    });
  }

  // Quick Auto-Rollover Button
  const btnAutoRolloverQuick = document.getElementById('btn-auto-rollover-quick');
  if (btnAutoRolloverQuick) {
    btnAutoRolloverQuick.addEventListener('click', triggerAutoRollover);
  }

  // Action Buttons
  document.getElementById('btn-save-month').addEventListener('click', triggerAutoRollover);
  document.getElementById('btn-print-master').addEventListener('click', printMasterSheet);
  document.getElementById('btn-print-slips').addEventListener('click', printTenantSlips);
  document.getElementById('btn-export-csv').addEventListener('click', exportToCSV);
  document.getElementById('btn-view-history').addEventListener('click', openHistoryModal);

  // Preview Buttons
  document.getElementById('btn-open-preview').addEventListener('click', openPreviewModal);
  document.getElementById('btn-header-preview').addEventListener('click', openPreviewModal);
  document.getElementById('btn-preview-sheet-top').addEventListener('click', openPreviewModal);
  document.getElementById('btn-preview-print-now').addEventListener('click', () => {
    document.getElementById('preview-modal').classList.add('hidden');
    printMasterSheet();
  });

  // Modals
  document.getElementById('btn-close-preview').addEventListener('click', () => {
    document.getElementById('preview-modal').classList.add('hidden');
  });
  document.getElementById('btn-preview-close-2').addEventListener('click', () => {
    document.getElementById('preview-modal').classList.add('hidden');
  });

  document.getElementById('btn-close-wa').addEventListener('click', () => {
    document.getElementById('wa-modal').classList.add('hidden');
  });

  document.getElementById('btn-close-history').addEventListener('click', () => {
    document.getElementById('history-modal').classList.add('hidden');
  });

  document.getElementById('btn-close-install').addEventListener('click', () => {
    document.getElementById('install-modal').classList.add('hidden');
  });

  document.getElementById('btn-install-ok').addEventListener('click', () => {
    document.getElementById('install-modal').classList.add('hidden');
  });

  // PWA Install Button
  const btnInstall = document.getElementById('btn-install-app');
  if (btnInstall) {
    btnInstall.addEventListener('click', handleInstallClick);
  }
  const btnTriggerPwa = document.getElementById('btn-trigger-pwa-install');
  if (btnTriggerPwa) {
    btnTriggerPwa.addEventListener('click', handleInstallClick);
  }
}

// ── SYSTEM 2: SMART PDF DRAG & DROP ──
function initPDFDropzone() {
  const dropzone = document.getElementById('pdf-dropzone');
  const fileInput = document.getElementById('pdf-file-input');

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handlePDFFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handlePDFFile(e.target.files[0]);
    }
  });
}

async function handlePDFFile(file) {
  if (!file || file.type !== 'application/pdf') {
    alert('कृपया सही PDF फाइल चुनें!');
    return;
  }

  const badge = document.getElementById('pdf-extract-badge');
  const badgeText = document.getElementById('pdf-extract-text');

  badge.classList.remove('hidden');
  badgeText.textContent = `⏳ ${file.name} पढ़ी जा रही है...`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let extractedStrings = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      textContent.items.forEach((item) => {
        if (item.str && item.str.trim()) {
          extractedStrings.push(item.str.trim());
        }
      });
    }

    const result = parseAVVNLBillText(extractedStrings);

    if (result.totalUnits || result.dueAmount) {
      if (result.billMonth) {
        appState.billMonth = result.billMonth;
        document.getElementById('bill-month').value = appState.billMonth;
      }
      if (result.prevReading) {
        appState.govtPrev = Math.round(result.prevReading);
        document.getElementById('govt-prev').value = appState.govtPrev;
      }
      if (result.currReading) {
        appState.govtCurr = Math.round(result.currReading);
        document.getElementById('govt-curr').value = appState.govtCurr;
      }
      if (result.totalUnits) {
        appState.govtUnits = Math.round(result.totalUnits);
        document.getElementById('govt-units').value = appState.govtUnits;
      }
      if (result.dueAmount) {
        appState.govtAmount = Math.round(result.dueAmount);
        document.getElementById('govt-amount').value = appState.govtAmount;
      }

      if (appState.govtUnits > 0) {
        appState.flatRate = parseFloat((appState.govtAmount / appState.govtUnits).toFixed(2));
        document.getElementById('flat-rate').value = appState.flatRate;
      }

      badgeText.innerHTML = `✅ <b>${file.name}</b> से सफल! माह: <b>${appState.billMonth}</b> | गत: <b>${appState.govtPrev}</b> | वर्तमान: <b>${appState.govtCurr}</b> | कुल यूनिट: <b>${appState.govtUnits}</b> | राशि: <b>₹${appState.govtAmount}</b>`;
      badge.style.background = '#e8f5e9';
      badge.style.color = '#2e7d32';

      saveCurrentState();
      recalculateAll();
    } else {
      badgeText.textContent = '⚠️ PDF से जरूरी आंकड़े नहीं मिले, कृपया मैन्युअल दर्ज करें।';
      badge.style.background = '#fff3e0';
      badge.style.color = '#e65100';
    }
  } catch (err) {
    console.error('[PDF Error]', err);
    badgeText.textContent = `❌ PDF पढ़ने में त्रुटि: ${err.message}`;
    badge.style.background = '#ffebee';
    badge.style.color = '#c62828';
  }
}

function parseAVVNLBillText(list) {
  const res = {};
  const meterTokens = [];

  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (/^\d{12}$/.test(s) && !res.kNumber) {
      res.kNumber = s;
      if (list[i + 1]) res.customerName = list[i + 1];
    }
    if (/^20\d{4}$/.test(s) && !res.billMonthCode) {
      res.billMonthCode = s;
      const yr = s.substring(0, 4);
      const mo = parseInt(s.substring(4, 6), 10);
      const moName = MONTH_NAMES_HI[mo - 1] || 'माह';
      res.billMonth = `${moName} ${yr}`;
    }
    if (/^\d{2,5}\.0000$/.test(s)) {
      meterTokens.push(parseFloat(s));
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(s) && !res.dueDate) {
      res.dueDate = s;
    }
  }

  if (meterTokens.length >= 3) {
    res.prevReading = meterTokens[0];
    res.currReading = meterTokens[1];
    res.totalUnits = meterTokens[2];
  } else if (meterTokens.length > 0) {
    res.totalUnits = meterTokens[meterTokens.length - 1];
  }

  const amounts = list.filter((s) => /^\d{3,6}\.00$/.test(s));
  if (amounts.length > 0) {
    res.dueAmount = parseFloat(amounts[0]);
  } else {
    const altAmounts = list.filter((s) => /^\d{3,6}\.\d{2}$/.test(s));
    if (altAmounts.length > 0) res.dueAmount = parseFloat(altAmounts[0]);
  }

  return res;
}

// ── CALCULATION ENGINE (CLEAN INTEGER DISTRIBUTION - NO DECIMALS SHOWN) ──
function getCalculations() {
  const gUnits = Math.round(parseFloat(appState.govtUnits)) || 0;
  const gAmount = Math.round(parseFloat(appState.govtAmount)) || 0;
  const commonUnits = Math.round(parseFloat(appState.commonUnits) !== undefined ? parseFloat(appState.commonUnits) : 90);
  const targetRoomUnits = Math.max(0, gUnits - commonUnits); // e.g. 607 - 90 = 517

  const effectiveRate = gUnits > 0 ? (gAmount / gUnits) : 8.19;
  const displayRate = Math.round(effectiveRate); // 8

  // 1. Raw Gross Consumption from sub-meters
  let sumRawGross = 0;
  const rawRows = appState.flats.map((f) => {
    const rawCurr = parseFloat(f.rawCurr !== undefined ? f.rawCurr : f.curr) || 0;
    const prev = Math.round(parseFloat(f.prev)) || 0;
    const rawGross = Math.max(0, rawCurr - prev);
    sumRawGross += rawGross;
    return { ...f, rawCurr, prev, rawGross };
  });

  // 2. Largest Remainder Method (Hare-Niemeyer) for Room Units
  // Guarantees integers AND exact sum === targetRoomUnits (517)
  let floorUnitsSum = 0;
  const unroundedUnits = rawRows.map((f, i) => {
    const exact = sumRawGross > 0 ? (f.rawGross / sumRawGross) * targetRoomUnits : 0;
    const fl = Math.floor(exact);
    const rem = exact - fl;
    floorUnitsSum += fl;
    return { idx: i, exact, fl, rem, f };
  });

  let remUnits = targetRoomUnits - floorUnitsSum;
  unroundedUnits.sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < remUnits; i++) {
    unroundedUnits[i].fl += 1;
  }
  unroundedUnits.sort((a, b) => a.idx - b.idx);

  const rows = unroundedUnits.map((u) => {
    const f = u.f;
    const unit = u.fl;
    const adjCurr = f.prev + unit; // Vartman = Gat + Unit (e.g. 2920 + 14 = 2934)
    return {
      room: f.room,
      name: f.name || ('Flat ' + f.room),
      phone: f.phone || '',
      rawCurr: f.rawCurr, // Actual meter reading (e.g. 2938)
      prev: f.prev,       // Gat pathan (e.g. 2920)
      adjCurr: adjCurr,   // Billed reading (e.g. 2934)
      unit: unit,
      rate: displayRate
    };
  });

  // 3. CCTV Motor Amount per flat (integer)
  // Total CCTV Motor Amount = round(commonUnits * effectiveRate) = 736 (92 * 8 = 736)
  const cctvPerFlat = Math.round((commonUnits * effectiveRate) / 8); // 92
  const cctvPool = cctvPerFlat * 8; // 736

  // 4. Room Amount Total = gAmount - cctvPool = 4970 - 736 = 4234
  const roomAmountTotal = gAmount - cctvPool;

  // Largest Remainder Method for Rashi to guarantee sum === roomAmountTotal (4234)
  let floorRashiSum = 0;
  const unroundedRashi = rows.map((r, i) => {
    const exactR = targetRoomUnits > 0 ? (r.unit / targetRoomUnits) * roomAmountTotal : 0;
    const fl = Math.floor(exactR);
    const rem = exactR - fl;
    floorRashiSum += fl;
    return { idx: i, exactR, fl, rem, r };
  });

  let remRashi = roomAmountTotal - floorRashiSum;
  unroundedRashi.sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < remRashi; i++) {
    unroundedRashi[i].fl += 1;
  }
  unroundedRashi.sort((a, b) => a.idx - b.idx);

  let sumUnits = 0;
  let sumAdjCurr = 0;
  let sumRashi = 0;
  let sumYog = 0;

  unroundedRashi.forEach((d) => {
    const r = d.r;
    r.rashi = d.fl;
    r.cctv = cctvPerFlat;
    r.yog = r.rashi + r.cctv; // Yog = Rashi + CCTV

    sumUnits += r.unit;
    sumAdjCurr += r.adjCurr;
    sumRashi += r.rashi;
    sumYog += r.yog;
  });

  const sumRate = rows.length * displayRate; // 8 * 8 = 64

  return {
    rows,
    sumRawGross,
    sumUnits,
    sumAdjCurr,
    targetRoomUnits,
    commonUnits,
    sumRashi,
    cctvPool,
    cctvPerFlat,
    sumYog,
    sumRate,
    gUnits,
    gAmount,
    rate: displayRate,
    effectiveRate
  };
}

// ── RENDER & RECALCULATE TABLE (BOTH GAT & VARTMAN ARE EDITABLE INPUTS) ──
function renderFlatsTable() {
  const tbody = document.getElementById('flats-tbody');
  tbody.innerHTML = '';

  // 8 Active Flats
  appState.flats.forEach((f, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.index = idx;

    tr.innerHTML = `
      <td><strong>${idx + 1}</strong></td>
      <td><strong>${f.room}</strong></td>
      <td>
        <input type="number" class="flat-curr-input form-control" value="${f.rawCurr !== undefined ? f.rawCurr : f.curr}" data-index="${idx}" min="0" step="1" title="वर्तमान पठन (आज मीटर में दिखी रीडिंग)" />
      </td>
      <td>
        <input type="number" class="flat-prev-input form-control" value="${f.prev}" data-index="${idx}" min="0" step="1" title="गत पठन (पिछली रीडिंग - स्वतः ट्रांसफर होती है)" />
      </td>
      <td>
        <strong id="adj-curr-${idx}" class="cell-billed-reading" style="color:#1e3a8a;">0</strong>
      </td>
      <td>
        <span class="cell-billable" id="unit-${idx}">0</span>
      </td>
      <td id="rate-${idx}">8</td>
      <td id="rashi-${idx}">0</td>
      <td id="cctv-${idx}">0</td>
      <td>
        <strong class="cell-amount" id="yog-${idx}">₹0</strong>
      </td>
      <td>
        <input type="text" class="flat-name-input form-control" style="width:105px;" value="${f.name || 'Flat ' + f.room}" data-index="${idx}" placeholder="नाम" />
      </td>
      <td>
        <div class="row-actions">
          <button class="btn-wa" onclick="openWhatsAppModal(${idx})" title="WhatsApp रसीद">
            <span>📲 WA</span>
          </button>
          <button class="btn-slip" onclick="printSingleSlip(${idx})" title="पर्ची प्रिंट">
            <span>🖨️ पर्ची</span>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Rows 9 and 10: Extra rows with 0 matching the user's uploaded image exactly!
  for (let extra = 9; extra <= 10; extra++) {
    const trExtra = document.createElement('tr');
    trExtra.className = 'zero-row';
    trExtra.innerHTML = `
      <td>${extra}</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td style="color:#888; font-size:0.8rem;">(खाली / रिज़र्व)</td>
      <td>-</td>
    `;
    tbody.appendChild(trExtra);
  }

  // Event Listeners for BOTH Editable Reading Inputs
  tbody.querySelectorAll('.flat-curr-input').forEach((inp) => {
    inp.addEventListener('input', (e) => {
      const i = parseInt(e.target.dataset.index, 10);
      const val = parseFloat(e.target.value) || 0;
      appState.flats[i].rawCurr = val;
      appState.flats[i].curr = val;
      saveCurrentState();
      recalculateAll();
    });
  });

  tbody.querySelectorAll('.flat-prev-input').forEach((inp) => {
    inp.addEventListener('input', (e) => {
      const i = parseInt(e.target.dataset.index, 10);
      appState.flats[i].prev = parseFloat(e.target.value) || 0;
      saveCurrentState();
      recalculateAll();
    });
  });

  tbody.querySelectorAll('.flat-name-input').forEach((inp) => {
    inp.addEventListener('input', (e) => {
      const i = parseInt(e.target.dataset.index, 10);
      appState.flats[i].name = e.target.value;
      saveCurrentState();
    });
  });
}

function recalculateAll() {
  const calc = getCalculations();

  // Update DOM table rows 1-8 (Clean Integers Only)
  calc.rows.forEach((r, idx) => {
    const adjCurrEl = document.getElementById(`adj-curr-${idx}`);
    const unitEl = document.getElementById(`unit-${idx}`);
    const rateEl = document.getElementById(`rate-${idx}`);
    const rashiEl = document.getElementById(`rashi-${idx}`);
    const cctvEl = document.getElementById(`cctv-${idx}`);
    const yogEl = document.getElementById(`yog-${idx}`);

    if (adjCurrEl) adjCurrEl.textContent = r.adjCurr;
    if (unitEl) unitEl.textContent = r.unit;
    if (rateEl) rateEl.textContent = r.rate;
    if (rashiEl) rashiEl.textContent = r.rashi;
    if (cctvEl) cctvEl.textContent = r.cctv;
    if (yogEl) yogEl.textContent = `₹${r.yog}`;
  });

  // Update Table Footer Totals (Clean Integers Only)
  document.getElementById('tot-raw-meter').textContent = calc.sumRawGross;
  document.getElementById('tot-adj-curr').textContent = calc.sumAdjCurr;
  document.getElementById('tot-units').textContent = calc.sumUnits; // 517
  document.getElementById('tot-rate-col').textContent = calc.sumRate;
  document.getElementById('tot-rashi').textContent = calc.sumRashi; // 4234
  document.getElementById('tot-cctv').textContent = calc.cctvPool; // 736
  document.getElementById('tot-yog').textContent = `₹${calc.sumYog}`; // 4970

  // Update Live Verification Card
  document.getElementById('match-govt-units').textContent = calc.gUnits;
  document.getElementById('match-calc-units').textContent = `${calc.sumUnits} + ${calc.commonUnits} = ${calc.gUnits}`;

  document.getElementById('match-govt-amount').textContent = `₹${calc.gAmount}`;
  document.getElementById('match-calc-amount').textContent = `₹${calc.sumYog}`;

  const diffAmount = calc.gAmount - calc.sumYog;
  const diffUnitsEl = document.getElementById('diff-units-display');
  const diffAmountEl = document.getElementById('diff-amount-display');
  const badgeEl = document.getElementById('match-status-badge');

  if (Math.abs(diffAmount) === 0) {
    diffUnitsEl.innerHTML = `कमरे: <b>${calc.sumUnits}</b> + मोटर/CCTV: <b>${calc.commonUnits}</b> = <b>${calc.gUnits} यूनिट</b> (सटीक मिलान ✅)`;
    diffUnitsEl.style.color = '#2e7d32';

    diffAmountEl.innerHTML = `अंतर: <b>₹0</b> (100% सटीक मिलान ✅)`;
    diffAmountEl.style.color = '#2e7d32';

    badgeEl.textContent = '✅ सरकारी बिल से 1 पैसा भी कम या ज्यादा नहीं';
    badgeEl.style.background = '#e8f5e9';
    badgeEl.style.color = '#2e7d32';
  } else {
    diffAmountEl.innerHTML = `अंतर: <b>₹${Math.abs(diffAmount)}</b>`;
    diffAmountEl.style.color = '#d32f2f';

    badgeEl.textContent = '⚠️ सरकारी बिल और फ्लैट्स योग में अंतर है';
    badgeEl.style.background = '#ffebee';
    badgeEl.style.color = '#c62828';
  }

  updateBottomBanner();
}

function updateBottomBanner() {
  const monthStr = appState.billMonth || 'चालू माह';
  document.getElementById('banner-month').textContent = monthStr;
  const summaryMonth = document.getElementById('summary-month');
  if (summaryMonth) summaryMonth.textContent = monthStr;
  document.getElementById('banner-prev').textContent = appState.govtPrev || 0;
  document.getElementById('banner-curr').textContent = appState.govtCurr || 0;
  document.getElementById('banner-units').textContent = appState.govtUnits || 0;
  document.getElementById('banner-amount').textContent = appState.govtAmount || 0;
}

// ── GENERATE MASTER SHEET HTML (COLOURFUL & ATTRACTIVE, CLEAN INTEGERS, NO NOTES) ──
function buildMasterSheetHTML() {
  const calc = getCalculations();

  let rowsHtml = '';
  // Flats 1 to 8 (Pure Integers Only)
  calc.rows.forEach((r, idx) => {
    rowsHtml += `
      <tr class="${idx % 2 === 1 ? 'row-alt' : ''}">
        <td class="col-center"><strong>${idx + 1}</strong></td>
        <td class="col-center"><span class="room-pill">${r.room}</span></td>
        <td class="col-center"><strong>${r.adjCurr}</strong></td>
        <td class="col-center">${r.prev}</td>
        <td class="col-center"><span class="unit-badge">${r.unit}</span></td>
        <td class="col-center">${r.rate}</td>
        <td class="col-center font-bold">${r.rashi}</td>
        <td class="col-center"><span class="cctv-badge">${r.cctv}</span></td>
        <td class="col-center"><strong class="yog-badge">${r.yog}</strong></td>
      </tr>
    `;
  });

  // Rows 9 and 10 with 0
  for (let extra = 9; extra <= 10; extra++) {
    rowsHtml += `
      <tr class="zero-row">
        <td class="col-center">${extra}</td>
        <td class="col-center">0</td>
        <td class="col-center">0</td>
        <td class="col-center">0</td>
        <td class="col-center">0</td>
        <td class="col-center">0</td>
        <td class="col-center">0</td>
        <td class="col-center">0</td>
        <td class="col-center">0</td>
      </tr>
    `;
  }

  const sheetHTML = `
    <div class="common-bill-sheet">
      <div class="common-bill-header">
        <div class="common-bill-building">${appState.buildingName}</div>
        <div class="common-bill-sub">Mo. No: ${appState.ownerPhone}</div>
        <div class="common-bill-ribbon">
          <h1 class="common-bill-title">COMPLEX LIGHT BILL</h1>
        </div>
      </div>

      <table class="common-bill-table">
        <thead>
          <tr>
            <th style="width: 5%;">#</th>
            <th style="width: 8%;">Room</th>
            <th style="width: 14%;">वर्तमान पठन</th>
            <th style="width: 13%;">गत पठन</th>
            <th style="width: 11%;">यूनिट</th>
            <th style="width: 8%;">दर</th>
            <th style="width: 13%;">राशि</th>
            <th style="width: 13%;">CCTV मोटर</th>
            <th style="width: 15%;">योग</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td class="col-center"><strong>Σ</strong></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="col-center"><strong class="tot-unit-val">${calc.sumUnits}</strong></td>
            <td class="col-center"><strong>${calc.sumRate}</strong></td>
            <td class="col-center"><strong>${calc.sumRashi}</strong></td>
            <td class="col-center"><strong class="tot-cctv-val">${calc.cctvPool}</strong></td>
            <td class="col-center"><strong class="tot-yog-val">${calc.sumYog}</strong></td>
          </tr>
        </tfoot>
      </table>

      <!-- EXACT BOTTOM BANNER (FRAMED COLOURFUL CARD) -->
      <div class="common-bill-bottom-banner">
        माह ${appState.billMonth} यूनिट ${appState.govtPrev} से ${appState.govtCurr} कुल यूनिट =${appState.govtUnits} कुल राशि ${appState.govtAmount}
      </div>
    </div>
  `;

  return sheetHTML;
}

// ── OPEN PREVIEW MODAL ──
function openPreviewModal() {
  const target = document.getElementById('preview-sheet-target');
  target.innerHTML = buildMasterSheetHTML();
  document.getElementById('preview-modal').classList.remove('hidden');
}

// ── PRINTING: A4 MASTER SHEET (COLOURFUL & ATTRACTIVE) ──
function printMasterSheet() {
  const printContainer = document.getElementById('print-container');
  printContainer.innerHTML = buildMasterSheetHTML();
  window.print();
}

// ── PRINTING: 8 TENANT CUT SLIPS (ATTRACTIVE COLOURFUL DESIGN WITH SCISSOR GUIDES) ──
function printTenantSlips() {
  const printContainer = document.getElementById('print-container');
  const calc = getCalculations();

  let slipsHtml = '';
  calc.rows.forEach((r) => {
    slipsHtml += `
      <div class="tenant-slip">
        <div class="slip-header">
          <h4>${appState.buildingName}</h4>
          <div class="slip-sub">Mo. No: ${appState.ownerPhone}</div>
          <div class="slip-tag">
            ⚡ बिजली बिल रसीद • ${appState.billMonth}
          </div>
        </div>

        <table class="slip-table">
          <tr>
            <td>कमरा / फ्लैट:</td>
            <td><strong>Room ${r.room} (${r.name || 'Flat ' + r.room})</strong></td>
          </tr>
          <tr>
            <td>वर्तमान पठन:</td>
            <td><strong>${r.adjCurr}</strong> <span style="font-size:7.5pt; color:#64748b;">(मीटर: ${r.rawCurr})</span></td>
          </tr>
          <tr>
            <td>गत पठन:</td>
            <td>${r.prev}</td>
          </tr>
          <tr class="slip-row-unit">
            <td>यूनिट (${r.adjCurr} - ${r.prev}):</td>
            <td><strong>${r.unit} यूनिट</strong></td>
          </tr>
          <tr>
            <td>दर:</td>
            <td>₹${r.rate} / यूनिट</td>
          </tr>
          <tr>
            <td>कमरा राशि:</td>
            <td>₹${r.rashi}</td>
          </tr>
          <tr class="slip-row-cctv">
            <td>CCTV / मोटर शेयर:</td>
            <td>₹${r.cctv}</td>
          </tr>
        </table>

        <div class="slip-total-box">
          <span>कुल देय राशि:</span>
          <span class="slip-total-val">₹${r.yog}</span>
        </div>

        <div class="slip-footer">
          सम्पर्क: ${appState.ownerPhone}
        </div>
      </div>
    `;
  });

  printContainer.innerHTML = `
    <div class="slips-grid">
      ${slipsHtml}
    </div>
  `;

  window.print();
}

function printSingleSlip(idx) {
  const calc = getCalculations();
  const r = calc.rows[idx];
  if (!r) return;

  const printContainer = document.getElementById('print-container');
  printContainer.innerHTML = `
    <div style="max-width:380px; margin:20px auto; border:2px dashed #1e3a8a; border-radius:12px; padding:18px; font-family:'Roboto', sans-serif; background:#ffffff; box-shadow:0 4px 15px rgba(0,0,0,0.1);">
      <div style="text-align:center; background:linear-gradient(135deg, #1e3a8a, #2563eb); color:#fff; border-radius:8px; padding:10px 12px; margin-bottom:14px;">
        <h3 style="margin:0; font-size:13pt; font-weight:900;">${appState.buildingName}</h3>
        <div style="font-size:8.5pt; color:#fde047; font-weight:700; margin-top:3px;">Mo. No: ${appState.ownerPhone}</div>
        <div style="font-weight:700; font-size:9pt; margin-top:6px; background:#eff6ff; color:#1e40af; padding:3px 10px; border-radius:20px; display:inline-block;">
          ⚡ बिजली बिल रसीद • ${appState.billMonth}
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:9.5pt; margin-bottom:12px;">
        <tr style="border-bottom:1px dotted #cbd5e1;">
          <td style="padding:5px 0;">कमरा / फ्लैट:</td>
          <td style="text-align:right;"><strong>Room ${r.room} (${r.name || 'Flat ' + r.room})</strong></td>
        </tr>
        <tr style="border-bottom:1px dotted #cbd5e1;">
          <td style="padding:5px 0;">वर्तमान पठन:</td>
          <td style="text-align:right;"><strong>${r.adjCurr}</strong> <span style="font-size:8pt; color:#64748b;">(मीटर: ${r.rawCurr})</span></td>
        </tr>
        <tr style="border-bottom:1px dotted #cbd5e1;">
          <td style="padding:5px 0;">गत पठन:</td>
          <td style="text-align:right;">${r.prev}</td>
        </tr>
        <tr style="border-bottom:1px dotted #cbd5e1; background:#f0fdf4; color:#166534;">
          <td style="padding:5px 4px;">यूनिट (${r.adjCurr} - ${r.prev}):</td>
          <td style="text-align:right; padding:5px 4px;"><strong>${r.unit} यूनिट</strong></td>
        </tr>
        <tr style="border-bottom:1px dotted #cbd5e1;">
          <td style="padding:5px 0;">दर:</td>
          <td style="text-align:right;">₹${r.rate} / यूनिट</td>
        </tr>
        <tr style="border-bottom:1px dotted #cbd5e1;">
          <td style="padding:5px 0;">कमरा राशि:</td>
          <td style="text-align:right;">₹${r.rashi}</td>
        </tr>
        <tr style="border-bottom:1px dotted #cbd5e1; background:#faf5ff; color:#6b21a8;">
          <td style="padding:5px 4px;">CCTV / मोटर शेयर:</td>
          <td style="text-align:right; padding:5px 4px;">₹${r.cctv}</td>
        </tr>
      </table>

      <div style="background:linear-gradient(135deg, #eff6ff, #dbeafe); border:2px solid #2563eb; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; font-weight:900; font-size:13pt; color:#1e3a8a;">
        <span>कुल देय राशि:</span>
        <span style="font-size:15pt; color:#1d4ed8;">₹${r.yog}</span>
      </div>

      <div style="font-size:8.5pt; color:#64748b; text-align:center; margin-top:14px; border-top:1px dashed #cbd5e1; padding-top:8px;">
        सम्पर्क: ${appState.ownerPhone}
      </div>
    </div>
  `;

  window.print();
}

// ── WHATSAPP RECEIPT MODAL (CLEAN INTEGERS) ──
let currentFlatForWA = null;

window.openWhatsAppModal = function(idx) {
  const calc = getCalculations();
  const r = calc.rows[idx];
  if (!r) return;

  currentFlatForWA = r;
  const phoneInput = document.getElementById('wa-phone-input');
  phoneInput.value = r.phone || '';

  const waText =
`*${appState.buildingName}*
⚡ *बिजली बिल रसीद - ${appState.billMonth}*
------------------------------
🏠 *कमरा / फ्लैट:* Room ${r.room} (${r.name || 'Flat ' + r.room})
🔢 *वर्तमान पठन:* ${r.adjCurr} (मीटर: ${r.rawCurr})
⏮️ *गत पठन:* ${r.prev}
⚡ *यूनिट:* ${r.unit} यूनिट
💵 *दर:* ₹${r.rate} / यूनिट
💰 *कमरा राशि:* ₹${r.rashi}
📹 *CCTV / मोटर शेयर:* ₹${r.cctv}
------------------------------
👉 *कुल देय राशि: ₹${r.yog}*
------------------------------
📞 *Mo. No:* ${appState.ownerPhone}
धन्यवाद! 🙏`;

  document.getElementById('wa-preview-text').textContent = waText;
  document.getElementById('wa-modal').classList.remove('hidden');

  document.getElementById('btn-copy-wa').onclick = () => {
    navigator.clipboard.writeText(waText).then(() => {
      alert('📋 WhatsApp बिल टेक्स्ट कॉपी हो गया!');
    });
  };

  document.getElementById('btn-send-wa').onclick = () => {
    const rawPhone = phoneInput.value.replace(/\D/g, '');
    let url = '';
    if (rawPhone.length >= 10) {
      const cleanPhone = rawPhone.length === 10 ? '91' + rawPhone : rawPhone;
      url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`;
    } else {
      url = `https://wa.me/?text=${encodeURIComponent(waText)}`;
    }
    window.open(url, '_blank');
  };
};

window.printSingleSlip = printSingleSlip;

// ── AUTO-ROLLOVER & AUTOMATIC SAVE TO NEXT MONTH ──
// "ise automatic save kara do jisase user bhul na jaye auto agle mahine transfer kar do aur gat pathan aur vartman pathan dono ko editable rakhna"
function triggerAutoRollover() {
  const month = appState.billMonth || 'चालू माह';
  const calc = getCalculations();

  const confirmMsg =
    `क्या आप माह '${month}' का बिल सुरक्षित करके अगले माह के लिए ऑटो-ट्रांसफर करना चाहते हैं?\n\n` +
    `📊 कुल यूनिट: ${calc.sumUnits} | कुल राशि: ₹${calc.sumYog}\n\n` +
    `👉 ऑटो-ट्रांसफर में:\n` +
    `1. इस माह का पूरा रिकॉर्ड इतिहास में हमेशा सुरक्षित रहेगा।\n` +
    `2. अगली बार के लिए वर्तमान बिल पठन (${calc.rows.map(r => r.adjCurr).join(', ')}) अपने-आप 'गत पठन' बन जाएगा!\n` +
    `3. आप किसी भी समय 'गत पठन' या 'वर्तमान पठन' को सीधे बदल (Edit) सकते हैं।`;

  if (!confirm(confirmMsg)) return;

  // 1. Archive to History
  const historyItem = {
    id: 'bill_' + Date.now(),
    savedAt: new Date().toISOString(),
    buildingName: appState.buildingName,
    ownerPhone: appState.ownerPhone,
    billMonth: appState.billMonth,
    govtPrev: appState.govtPrev,
    govtCurr: appState.govtCurr,
    govtUnits: appState.govtUnits,
    govtAmount: appState.govtAmount,
    rate: calc.rate,
    commonUnits: appState.commonUnits,
    totals: {
      rawGross: calc.sumRawGross,
      units: calc.sumUnits,
      rashi: calc.sumRashi,
      cctv: calc.cctvPool,
      yog: calc.sumYog
    },
    flats: JSON.parse(JSON.stringify(calc.rows))
  };

  const existingHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  existingHistory.unshift(historyItem);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(existingHistory));

  // 2. AUTO-TRANSFER: Next month's Gat (prev) becomes this month's Billed Vartman (adjCurr) after deduction!
  calc.rows.forEach((r, idx) => {
    appState.flats[idx].prev = r.adjCurr;     // Billed reading (2934, 2184, etc.)
    appState.flats[idx].rawCurr = r.adjCurr;  // Set raw meter to same starting baseline
    appState.flats[idx].curr = r.adjCurr;
  });

  // 3. Rollover Govt Meter Reading: Curr becomes Prev!
  appState.govtPrev = appState.govtCurr;
  document.getElementById('govt-prev').value = appState.govtPrev;

  // 4. Advance Month Name to Next Month Automatically
  const currentMonthStr = appState.billMonth || '';
  for (let i = 0; i < MONTH_NAMES_HI.length; i++) {
    if (currentMonthStr.includes(MONTH_NAMES_HI[i])) {
      const nextMonthName = MONTH_NAMES_HI[(i + 1) % 12];
      const yearMatch = currentMonthStr.match(/\d{4}/);
      let year = yearMatch ? parseInt(yearMatch[0], 10) : new Date().getFullYear();
      if (i === 11) year += 1; // December to January next year
      appState.billMonth = `${nextMonthName} ${year}`;
      document.getElementById('bill-month').value = appState.billMonth;
      break;
    }
  }

  saveCurrentState();
  renderFlatsTable();
  recalculateAll();

  alert(`✅ ऑटो-ट्रांसफर सफल!\n\nमाह '${month}' का बिल सुरक्षित हो चुका है।\nअब नए माह (${appState.billMonth}) के लिए गत पठन (${calc.rows.map(r => r.adjCurr).join(', ')}) स्वतः सेट हो गया है।\n\nआप आवश्यकतानुसार गत पठन व वर्तमान पठन दोनों को कभी भी बदल (Edit) सकते हैं।`);
}

// ── HISTORY MODAL ──
function openHistoryModal() {
  const container = document.getElementById('history-list-container');
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

  if (history.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:30px; color:#64748b;">
        <div style="font-size:2.5rem; margin-bottom:8px;">📜</div>
        <p>अभी तक कोई सुरक्षित बिल इतिहास नहीं है।</p>
      </div>
    `;
  } else {
    let html = '';
    history.forEach((h, idx) => {
      const dateStr = new Date(h.savedAt).toLocaleDateString('hi-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      html += `
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:14px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
            <strong style="font-size:1.05rem; color:#1e3a8a;">📅 ${h.billMonth}</strong>
            <span style="font-size:0.8rem; color:#64748b;">सेव: ${dateStr}</span>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px; font-size:0.88rem; margin-bottom:8px;">
            <div>सरकारी मीटर: <b>${h.govtPrev || '-'} से ${h.govtCurr || '-'}</b></div>
            <div>कुल यूनिट: <b>${h.govtUnits}</b></div>
            <div>सरकारी राशि: <b>₹${h.govtAmount}</b></div>
            <div>फ्लैट्स योग: <b>₹${h.totals.yog}</b></div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button class="btn btn-outline" style="font-size:0.8rem; padding:4px 8px;" onclick="loadHistoryMonth(${idx})">
              🔄 यह डेटा लोड करें
            </button>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  document.getElementById('history-modal').classList.remove('hidden');
}

window.loadHistoryMonth = function(idx) {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  const item = history[idx];
  if (!item) return;

  if (confirm(`क्या आप '${item.billMonth}' का पुराना डेटा स्क्रीन पर लोड करना चाहते हैं?`)) {
    appState.billMonth = item.billMonth;
    appState.govtPrev = item.govtPrev;
    appState.govtCurr = item.govtCurr;
    appState.govtUnits = item.govtUnits;
    appState.govtAmount = item.govtAmount;
    appState.flatRate = item.rate;
    appState.commonUnits = item.commonUnits;
    appState.flats = item.flats.map((f) => ({
      room: f.room,
      name: f.name,
      prev: f.prev,
      rawCurr: f.rawCurr || f.adjCurr,
      curr: f.rawCurr || f.adjCurr,
      phone: f.phone || ''
    }));

    document.getElementById('bill-month').value = appState.billMonth;
    document.getElementById('govt-prev').value = appState.govtPrev;
    document.getElementById('govt-curr').value = appState.govtCurr;
    document.getElementById('govt-units').value = appState.govtUnits;
    document.getElementById('govt-amount').value = appState.govtAmount;
    document.getElementById('flat-rate').value = appState.flatRate;
    document.getElementById('less-units-input').value = appState.commonUnits;

    saveCurrentState();
    renderFlatsTable();
    recalculateAll();

    document.getElementById('history-modal').classList.add('hidden');
  }
};

// ── CSV EXPORT ──
function exportToCSV() {
  const calc = getCalculations();
  let csv = 'No,Room,Vartman,Gat,Unit,Rate,Rashi,CCTV_Motor,Yog\n';

  calc.rows.forEach((r, idx) => {
    csv += `${idx + 1},${r.room},${r.adjCurr},${r.prev},${r.unit},${r.rate},${r.rashi},${r.cctv},${r.yog}\n`;
  });

  for (let extra = 9; extra <= 10; extra++) {
    csv += `${extra},0,0,0,0,0,0,0,0\n`;
  }

  csv += `Total,-,-,-,${calc.sumUnits},${calc.sumRate},${calc.sumRashi},${calc.cctvPool},${calc.sumYog}\n`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Complex_Light_Bill_${(appState.billMonth || 'month').replace(/\s+/g, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PWA INSTALLATION LOGIC ──
function initPWA() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('btn-install-app');
    if (btn) btn.classList.remove('hidden');
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    const btn = document.getElementById('btn-install-app');
    if (btn) btn.classList.add('hidden');
    alert('🎉 बधाई हो! यादव कॉम्प्लेक्स बिजली बिल ऐप सफलतापूर्वक इंस्टॉल हो चुका है।');
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[SW Registration Error]', err);
    });
  }
}

function handleInstallClick() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        deferredPrompt = null;
        document.getElementById('install-modal').classList.add('hidden');
      }
    });
  } else {
    document.getElementById('install-modal').classList.remove('hidden');
  }
}
