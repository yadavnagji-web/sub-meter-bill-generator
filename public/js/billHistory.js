/**
 * billHistory.js
 * Local bill history storage using localStorage.
 * Stores bill summaries with full normalized data.
 * NEVER stores API credentials.
 */

'use strict';

const BillHistory = (() => {
  const STORAGE_KEY   = 'avvnl_bill_history';
  const MAX_HISTORY   = 24; // keep up to 24 bills (2 years monthly)

  // ── Internal: load/save ───────────────────────────────────────────────────
  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function _save(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch (err) {
      console.warn('[BillHistory] Save failed:', err.message);
      return false;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Add or update a bill in history.
   * Matches by kNumber + billMonth to avoid duplicates.
   *
   * @param {Object} billData - Normalized bill data
   * @param {string} fetchedAt - ISO timestamp of fetch
   * @param {string} kNumber - K-Number used
   */
  function addBill(billData, fetchedAt, kNumber) {
    if (!billData) return false;

    const items = _load();

    const entry = {
      id:              `${kNumber}_${billData.billMonth || Date.now()}`,
      kNumber:         kNumber || billData.consumerNumber,
      customerName:    billData.customerName,
      billNumber:      billData.billNumber,
      billDate:        billData.billDate,
      billMonth:       billData.billMonth,
      billPeriod:      billData.billPeriod,
      unitsConsumed:   billData.unitsConsumed,
      billAmount:      billData.billAmount,
      dueAmount:       billData.dueAmount,
      dueDate:         billData.dueDate,
      arrears:         billData.arrears,
      fetchedAt:       fetchedAt || new Date().toISOString(),
      fullData:        billData,  // full normalized data for re-display
    };

    // Remove any existing entry with same id (update)
    const filtered = items.filter(i => i.id !== entry.id);

    // Prepend newest first
    filtered.unshift(entry);

    // Trim to max
    const trimmed = filtered.slice(0, MAX_HISTORY);

    return _save(trimmed);
  }

  /**
   * Get all bills, newest first.
   * @returns {Array}
   */
  function getAll() {
    return _load();
  }

  /**
   * Get bills for a specific K-Number.
   * @param {string} kNumber
   * @returns {Array}
   */
  function getByKNumber(kNumber) {
    return _load().filter(i => i.kNumber === kNumber);
  }

  /**
   * Delete a single bill entry by id.
   * @param {string} id
   */
  function deleteById(id) {
    const items = _load().filter(i => i.id !== id);
    return _save(items);
  }

  /**
   * Clear all history.
   */
  function clearAll() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch { return false; }
  }

  /**
   * Get count of stored bills.
   */
  function count() { return _load().length; }

  return { addBill, getAll, getByKNumber, deleteById, clearAll, count };
})();

window.BillHistory = BillHistory;
