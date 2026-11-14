const API_URL = '/api/avvnl/bill';

let appData = {
  kNumbers: [], // { kNumber, lastBill: null, fetchedAt: null, submeters: [] }
  activeK: null
};

// ── LOCAL STORAGE ──
function loadData() {
  const saved = localStorage.getItem('masterBillData');
  if (saved) {
    appData = JSON.parse(saved);
  }
}
function saveData() {
  localStorage.setItem('masterBillData', JSON.stringify(appData));
}

// ── INITIALIZE ──
window.onload = () => {
  loadData();
  renderKList();
  if (appData.activeK) {
    showBillSection();
  }
  initPWA();
  
  // Attach static event listeners
  document.getElementById('btn-add-k').addEventListener('click', addKNumber);
  document.getElementById('btn-fetch-bill').addEventListener('click', fetchBill);
  document.getElementById('btn-add-sm').addEventListener('click', addSubMeter);
  
  // Event delegation for dynamic items
  document.addEventListener('click', (e) => {
    // Select K-Number
    const kItemInfo = e.target.closest('.k-item-info');
    if (kItemInfo) {
      selectKNumber(kItemInfo.dataset.knum);
    }
    
    // Direct Fetch Button
    const fetchBtn = e.target.closest('.btn-fetch-direct');
    if (fetchBtn) {
      const kNum = fetchBtn.dataset.knum;
      selectKNumber(kNum);
      fetchBillForK(kNum, false);
    }
    
    // Delete K-Number
    const delKBtn = e.target.closest('.btn-del-k');
    if (delKBtn) {
      deleteKNumber(delKBtn.dataset.knum);
    }
    
    // Delete Submeter
    const delSmBtn = e.target.closest('.sm-delete');
    if (delSmBtn) {
      deleteSubMeter(delSmBtn.dataset.id);
    }
  });

  document.addEventListener('input', (e) => {
    // Update Submeter reading
    if (e.target.classList.contains('sm-input')) {
      updateSMReading(e.target.dataset.id, e.target.dataset.field, e.target.value);
    }
  });
  
  setTimeout(autoFetchCheck, 1500); 
};

async function autoFetchCheck() {
  const now = Date.now();
  for (let kObj of appData.kNumbers) {
    if (!kObj.fetchedAt || (now - kObj.fetchedAt > 30 * 24 * 60 * 60 * 1000)) {
      console.log(`Auto fetching bill for K-Number: ${kObj.kNumber}`);
      await fetchBillForK(kObj.kNumber, true);
    }
  }
}

// ── K-NUMBER MANAGEMENT ──
function addKNumber() {
  const input = document.getElementById('new-k-number');
  const kNum = input.value.trim();
  if (!kNum || !/^\d{8,15}$/.test(kNum)) {
    alert("Please enter a valid K-Number (8-15 digits).");
    return;
  }
  if (appData.kNumbers.find(k => k.kNumber === kNum)) {
    alert("K-Number already exists!");
    return;
  }
  
  appData.kNumbers.push({
    kNumber: kNum,
    lastBill: null,
    fetchedAt: null,
    submeters: []
  });
  
  // Auto-select the newly added K-number
  appData.activeK = kNum;
  
  input.value = '';
  saveData();
  renderKList();
  showBillSection();
  
  // Auto-fetch for the new K-Number
  fetchBillForK(kNum, false);
}

function deleteKNumber(kNum) {
  if(confirm(`Are you sure you want to delete K-Number ${kNum}?`)) {
    appData.kNumbers = appData.kNumbers.filter(k => k.kNumber !== kNum);
    if(appData.activeK === kNum) {
      appData.activeK = null;
      hideBillSections();
    }
    saveData();
    renderKList();
  }
}

function selectKNumber(kNum) {
  appData.activeK = kNum;
  saveData();
  renderKList();
  showBillSection();
}

function renderKList() {
  const list = document.getElementById('k-numbers-list');
  list.innerHTML = '';
  
  appData.kNumbers.forEach(item => {
    const isAct = appData.activeK === item.kNumber;
    const div = document.createElement('div');
    div.className = 'k-item';
    if(isAct) div.style.borderColor = 'var(--primary)';
    
    let statusText = 'No bill fetched yet';
    if(item.lastBill) {
      statusText = `Month: ${item.lastBill.billPeriod} | Amt: ₹${item.lastBill.billAmount}`;
    }
    
    div.innerHTML = `
      <div class="k-item-info" data-knum="${item.kNumber}">
        <div class="k-number">${item.kNumber} ${isAct ? '✅' : ''}</div>
        <div class="k-status">${statusText}</div>
      </div>
      <div style="display:flex; gap:10px; align-items:center;">
        <button class="btn btn-secondary btn-sm btn-fetch-direct" data-knum="${item.kNumber}" style="padding: 5px 10px; font-size:0.8rem;">Fetch</button>
        <button class="btn-icon btn-del-k" data-knum="${item.kNumber}">🗑️</button>
      </div>
    `;
    list.appendChild(div);
  });
}

// ── BILL FETCHING ──
async function fetchBill() {
  if (!appData.activeK) return;
  await fetchBillForK(appData.activeK, false);
}

async function fetchBillForK(kNumber, isSilent = false) {
  const kObj = appData.kNumbers.find(k => k.kNumber === kNumber);
  if(!kObj) return;

  const loader = document.getElementById('fetch-loader');
  if(appData.activeK === kNumber && !isSilent) {
    loader.classList.remove('hidden');
    document.getElementById('bill-details').classList.add('hidden');
    document.getElementById('submeter-section').classList.add('hidden');
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kNumber: kNumber })
    });
    const result = await res.json();
    
    if (result.success && result.data) {
      const amt = result.data.billAmount || result.data.dueAmount || 0;
      const units = result.data.unitsConsumed || 0;
      
      let cName = result.data.customerName || 'Unknown';
      
      // If it's a PAID bill placeholder and we already know the customer's name, keep it!
      if (result.isPaid && kObj.lastBill && kObj.lastBill.customerName && !kObj.lastBill.customerName.includes("No Dues")) {
         cName = kObj.lastBill.customerName;
      }
      
      kObj.lastBill = {
        customerName: cName,
        billPeriod: result.data.billPeriod || result.data.dueDate || '-',
        billAmount: parseFloat(amt),
        unitsConsumed: parseFloat(units)
      };
      kObj.fetchedAt = Date.now();
      saveData();
      renderKList();
      if(appData.activeK === kNumber) renderBillDetails();
    } else {
      if(!isSilent) alert(result.message || "Failed to fetch bill. (Or No Dues).");
      if(appData.activeK === kNumber) renderBillDetails(); // Still try to render if we have old data
    }
  } catch (err) {
    if(!isSilent) alert("Network error while fetching bill.");
    if(appData.activeK === kNumber) renderBillDetails(); // Still try to render if we have old data
  } finally {
    if(appData.activeK === kNumber && !isSilent) {
      loader.classList.add('hidden');
    }
  }
}

function hideBillSections() {
  document.getElementById('bill-section').classList.add('hidden');
  document.getElementById('submeter-section').classList.add('hidden');
}

function showBillSection() {
  if(!appData.activeK) return hideBillSections();
  
  document.getElementById('bill-section').classList.remove('hidden');
  document.getElementById('active-k-display').textContent = appData.activeK;
  
  renderBillDetails();
}

function renderBillDetails() {
  const kObj = appData.kNumbers.find(k => k.kNumber === appData.activeK);
  if (!kObj || !kObj.lastBill) {
    document.getElementById('bill-details').classList.add('hidden');
    document.getElementById('submeter-section').classList.add('hidden');
    return;
  }
  
  const b = kObj.lastBill;
  document.getElementById('bill-details').classList.remove('hidden');
  
  // Custom logic for PAID bills
  let displayAmt = '₹' + b.billAmount;
  let name = b.customerName;
  
  // If it's a "Paid" placeholder from backend, try to keep the old name if we had one
  if (name.includes("No Dues") && kObj.submeters && kObj.submeters.length > 0) {
    // We don't have a stored name directly outside lastBill yet, but let's just show a green badge
    displayAmt = '₹0 <span style="color: green; font-size:0.8rem; background:#e8f5e9; padding:2px 6px; border-radius:4px; margin-left:5px;">✅ PAID</span>';
  } else if (b.billAmount === 0 || b.billPeriod === "Paid") {
    displayAmt = '₹0 <span style="color: green; font-size:0.8rem; background:#e8f5e9; padding:2px 6px; border-radius:4px; margin-left:5px;">✅ PAID</span>';
  }

  document.getElementById('bill-name').textContent = name;
  document.getElementById('bill-month').textContent = b.billPeriod;
  document.getElementById('bill-amount').innerHTML = displayAmt;
  document.getElementById('bill-units').textContent = b.unitsConsumed;
  
  const perUnit = b.unitsConsumed > 0 ? (b.billAmount / b.unitsConsumed).toFixed(2) : 0;
  document.getElementById('bill-per-unit').textContent = '₹' + perUnit;
  
  document.getElementById('submeter-section').classList.remove('hidden');
  renderSubMeters();
}

// ── SUB METER CALCULATOR ──
function addSubMeter() {
  const input = document.getElementById('new-sm-name');
  const name = input.value.trim();
  if(!name) return;
  
  const kObj = appData.kNumbers.find(k => k.kNumber === appData.activeK);
  if(!kObj) return;
  
  kObj.submeters.push({
    id: Date.now().toString(),
    name: name,
    prev: 0,
    curr: 0
  });
  
  input.value = '';
  saveData();
  renderSubMeters();
}

function deleteSubMeter(id) {
  const kObj = appData.kNumbers.find(k => k.kNumber === appData.activeK);
  if(!kObj) return;
  
  kObj.submeters = kObj.submeters.filter(s => s.id !== id);
  saveData();
  renderSubMeters();
}

function updateSMReading(id, field, value) {
  const kObj = appData.kNumbers.find(k => k.kNumber === appData.activeK);
  if(!kObj) return;
  
  const sm = kObj.submeters.find(s => s.id === id);
  if(sm) {
    sm[field] = parseFloat(value) || 0;
    saveData();
    renderSubMeters();
  }
}

function renderSubMeters() {
  const kObj = appData.kNumbers.find(k => k.kNumber === appData.activeK);
  if(!kObj) return;
  
  const b = kObj.lastBill;
  const perUnit = b.unitsConsumed > 0 ? (b.billAmount / b.unitsConsumed) : 0;
  
  const list = document.getElementById('submeters-list');
  list.innerHTML = '';
  
  let totalSMUnits = 0;
  let totalSMAmount = 0;
  
  kObj.submeters.forEach(sm => {
    let units = sm.curr - sm.prev;
    if(units < 0) units = 0;
    const amt = units * perUnit;
    
    totalSMUnits += units;
    totalSMAmount += amt;
    
    const div = document.createElement('div');
    div.className = 'submeter-item';
    div.innerHTML = `
      <div class="sm-name">${sm.name}</div>
      <button class="btn-icon sm-delete" data-id="${sm.id}">✕</button>
      
      <div>
        <label style="font-size:0.8rem; color:var(--text-light)">Prev Reading</label>
        <input type="number" class="sm-input" data-id="${sm.id}" data-field="prev" value="${sm.prev}" />
      </div>
      <div>
        <label style="font-size:0.8rem; color:var(--text-light)">Curr Reading</label>
        <input type="number" class="sm-input" data-id="${sm.id}" data-field="curr" value="${sm.curr}" />
      </div>
      
      <div class="sm-result">
        <span>${units} Units</span>
        <span>₹${amt.toFixed(2)}</span>
      </div>
    `;
    list.appendChild(div);
  });
  
  // Update Remaining
  const remUnits = b.unitsConsumed - totalSMUnits;
  const remAmt = b.billAmount - totalSMAmount;
  
  document.getElementById('rem-units').textContent = remUnits;
  document.getElementById('rem-amount').textContent = '₹' + remAmt.toFixed(2);
}

// ── PWA & APP INSTALL LOGIC ──
let deferredInstallPrompt = null;

function initPWA() {
  const installBtn = document.getElementById('btn-install-app');
  const modal = document.getElementById('install-modal');
  const closeModalBtn = document.getElementById('btn-close-modal');
  const modalOkBtn = document.getElementById('btn-modal-ok');

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[SW] Registration failed:', err);
    });
  }

  // Detect standalone mode (already installed)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (isStandalone) {
    if (installBtn) installBtn.classList.add('hidden');
    return;
  }

  // Show button on regular browsers
  if (installBtn) {
    installBtn.classList.remove('hidden');
  }

  // Capture beforeinstallprompt for Android/Chrome/Edge
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (installBtn) {
      installBtn.classList.remove('hidden');
    }
  });

  // Handle Install Button Click
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          installBtn.classList.add('hidden');
        }
        deferredInstallPrompt = null;
      } else {
        // Fallback guidance modal for iOS Safari / desktop
        if (modal) modal.classList.remove('hidden');
      }
    });
  }

  // Close modal handlers
  if (closeModalBtn && modal) {
    closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
  }
  if (modalOkBtn && modal) {
    modalOkBtn.addEventListener('click', () => modal.classList.add('hidden'));
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.classList.add('hidden');
    deferredInstallPrompt = null;
  });
}

