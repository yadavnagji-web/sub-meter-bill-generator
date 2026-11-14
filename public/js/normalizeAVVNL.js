/**
 * normalizeAVVNL.js  —  Client-side response normalizer
 * ═══════════════════════════════════════════════════════════════════════════
 * Aligns with official MSR Pay Developer documentation:
 *   https://www.bijlimitraavvnl.com/Developer
 *
 * OFFICIAL SUCCESS RESPONSE FIELDS (from docs example):
 *   operator, status, message, dueAmount, dueDate,
 *   customerName, billNumber, billDate, billPeriod, refId
 *
 * This file runs in the BROWSER.
 * It NEVER receives, stores, or references API credentials.
 * It only processes the pre-sanitized data returned by our backend proxy.
 * ═══════════════════════════════════════════════════════════════════════════
 */

'use strict';

/**
 * Pick the first non-null, non-empty value from the given keys.
 */
function pickField(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of keys) {
    const val = obj[key];
    if (val !== undefined && val !== null && val !== ''
        && val !== 'null' && val !== 'undefined') {
      return val;
    }
  }
  return null;
}

/**
 * Convert a value to a float. Strips ₹, commas, spaces.
 */
function toNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(String(val).replace(/[₹,\s]/g, ''));
  return isNaN(n) ? null : n;
}

/**
 * Format a number as Indian Rupees (₹).
 * @param {number|null} amount
 * @returns {string|null}
 */
function formatINR(amount) {
  if (amount === null || amount === undefined) return null;
  return new Intl.NumberFormat('en-IN', {
    style:                 'currency',
    currency:              'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * normalizeAVVNLResponse(raw)
 *
 * Maps official MSR Pay API fields + possible variants to a clean schema.
 *
 * Official primary fields (from Developer docs):
 *   operator · status · message · dueAmount · dueDate ·
 *   customerName · billNumber · billDate · billPeriod · refId · editable
 *
 * Extended fields from possible API variations also covered.
 *
 * @param {Object} raw - Bill data from our backend proxy (no credentials)
 * @returns {Object|null}
 */
function normalizeAVVNLResponse(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const pick = (...keys) => pickField(raw, ...keys);

  // ── OFFICIAL FIELDS (MSR Pay Developer docs primary) ─────────────────────
  const operator     = pick('operator');
  const status       = pick('status');
  const refId        = pick('refId',       'ref_id',      'referenceId');
  const editable     = pick('editable');

  // dueAmount — official field, string "1630" per docs
  const dueAmount    = toNum(pick('dueAmount',    'due_amount',    'totalAmount',
                                  'totalPayable', 'payableAmount', 'netAmount'));

  // dueDate — official field, "YYYY-MM-DD" per docs
  const dueDate      = pick('dueDate',     'due_date',    'paymentDueDate', 'lastDate');

  // customerName — official field
  const customerName = pick('customerName','customer_name','name','consumerName','consumer_name');

  // billNumber — official field
  const billNumber   = pick('billNumber',  'bill_number', 'billNo', 'bill_no', 'invoiceNumber');

  // billDate — official field, "YYYY-MM-DD" per docs
  const billDate     = pick('billDate',    'bill_date',   'invoiceDate');

  // billPeriod — official field, "MAY 21" format per docs
  const billPeriod   = pick('billPeriod',  'bill_period', 'billingPeriod', 'period');

  // remarks — from message field (empty string on SUCCESS per docs)
  const remarks      = pick('message',     'remarks',     'notes') || null;

  // ── EXTENDED FIELDS (additional data some operators return) ───────────────
  const billMonth       = pick('billMonth', 'bill_month', 'month', 'billingMonth') || billPeriod;
  const billYear        = pick('billYear',  'bill_year',  'year');

  const kNumber         = pick('kNumber', 'number', 'consumerNumber', 'consumer_number', 'k_number');
  const connectionType  = pick('connectionType', 'connection_type', 'category', 'tariff');
  const address         = pick('address',  'consumerAddress', 'consumer_address');
  const mobileNumber    = pick('mobileNumber',   'mobile_number',  'mobile', 'phone');
  const email           = pick('email');
  const subdivision     = pick('subdivision', 'subDivision', 'sub_division', 'circle');
  const meterNumber     = pick('meterNumber', 'meter_number','meterId', 'meter_id', 'mno');
  const divisionCode    = pick('divisionCode','division_code','division');

  const readingDate     = pick('readingDate',   'reading_date',   'meterReadingDate');
  const rebateDueDate   = pick('rebateDueDate', 'rebate_due_date','earlyPaymentDate');

  const previousReading = pick('previousReading','prevReading','prev_reading',
                                'previous_reading','oldReading','prevRdg');
  const currentReading  = pick('currentReading', 'currReading','curr_reading',
                                'current_reading', 'newReading','currRdg','presReading');
  const unitsConsumed   = pick('unitsConsumed','units_consumed','units','consumption',
                                'energyConsumed','energy_consumed','kwh','unit');

  const billAmount      = toNum(pick('billAmount',     'bill_amount',    'amount'));
  const currentCharges  = toNum(pick('currentCharges', 'current_charges','newCharges','energyCharges'));
  const fixedCharges    = toNum(pick('fixedCharges',   'fixed_charges',  'fixedCharge'));
  const arrears         = toNum(pick('arrears',        'arrearsAmount',  'arrears_amount','previousDues'));
  const taxes           = toNum(pick('taxes',          'taxAmount',      'tax_amount','gst','surcharge'));
  const discount        = toNum(pick('discount',       'rebate',         'earlyPaymentDiscount'));

  return {
    // OFFICIAL
    operator, status, refId, editable, remarks,
    dueAmount, dueDate, customerName, billNumber, billDate, billPeriod,

    // EXTENDED
    billMonth, billYear,
    kNumber, connectionType, address, mobileNumber, email,
    subdivision, meterNumber, divisionCode,
    readingDate, rebateDueDate,
    previousReading, currentReading,
    unitsConsumed: unitsConsumed !== null ? String(unitsConsumed) : null,

    // Amount breakdown (numbers)
    billAmount, currentCharges, fixedCharges, arrears, taxes, discount,

    // Formatted INR strings (ready for display)
    dueAmountFormatted:      formatINR(dueAmount),
    billAmountFormatted:     formatINR(billAmount),
    currentChargesFormatted: formatINR(currentCharges),
    fixedChargesFormatted:   formatINR(fixedCharges),
    arrearsFormatted:        formatINR(arrears),
    taxesFormatted:          formatINR(taxes),
    discountFormatted:       formatINR(discount),
  };
}

// Export as browser globals
window.normalizeAVVNLResponse = normalizeAVVNLResponse;
window.formatINR              = formatINR;
window.pickField              = pickField;
