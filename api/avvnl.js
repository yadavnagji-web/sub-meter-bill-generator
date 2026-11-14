'use strict';

/**
 * AVVNL Bill Fetch API Router
 * ═══════════════════════════════════════════════════════════════════════════
 * Proxies requests to Pay2All BBPS Fetch API per their Developer docs:
 *
 * OFFICIAL ENDPOINT:
 *   POST https://pay2all.in/api/v1/bbps/fetch
 *
 * HEADERS:
 *   Authorization: Bearer <PAY2ALL_API_KEY>
 *
 * PAYLOAD:
 *   {
 *     "biller_id": "<PAY2ALL_BILLER_ID>", // Supplied by env
 *     "mobile_number": "9876543210", // Dummy mobile for fetch
 *     "params": { "K Number": "<CUSTOMER_K_NUMBER>" }
 *   }
 *
 * SECURITY: API credentials stay in .env — NEVER sent to the browser.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const axios   = require('axios');
const router  = express.Router();

const IS_DEV = process.env.NODE_ENV === 'development';
const PAY2ALL_BASE_URL = 'https://pay2all.in/api/v1';

// ── K-Number validation ───────────────────────────────────────────────────────
function isValidKNumber(kNumber) {
  if (!kNumber || typeof kNumber !== 'string') return false;
  return /^\d{8,15}$/.test(kNumber.replace(/\s/g, ''));
}

// ── Hindi-friendly error messages ─────────────────────────────────────────────
function getFriendlyError(apiMessage, httpStatus) {
  if (!apiMessage) {
    return { code: 'api_unavailable', message: 'API से response नहीं मिला' };
  }
  const msg = String(apiMessage || '').toLowerCase();

  if (httpStatus === 401 || msg.includes('unauthorized') || msg.includes('token')) {
    return { code: 'auth_error', message: 'API Authentication विफल रही। कृपया API Key चेक करें।' };
  }
  if (msg.includes('invalid') || msg.includes('not found') || msg.includes('no record') || msg.includes('wrong')) {
    return { code: 'invalid_k_number', message: 'K-Number गलत है या record नहीं मिला' };
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return { code: 'timeout', message: 'API से response नहीं मिला। कृपया बाद में try करें।' };
  }
  if (msg.includes('unavailable') || msg.includes('down')) {
    return { code: 'service_unavailable', message: 'API service temporarily unavailable' };
  }
  if (msg.includes('bill') && (msg.includes('not') || msg.includes('no'))) {
    return { code: 'bill_not_found', message: 'Bill नहीं मिला। अभी उपलब्ध नहीं है।' };
  }
  return { code: 'failed', message: 'Bill अभी उपलब्ध नहीं है' };
}

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/avvnl/bill
// ═════════════════════════════════════════════════════════════════════════════
router.post('/bill', async (req, res) => {
  const { kNumber } = req.body;

  const cleanK = String(kNumber || '').replace(/\s/g, '');
  if (!cleanK || !isValidKNumber(cleanK)) {
    return res.status(400).json({
      success: false,
      error:   'invalid_k_number',
      message: 'K-Number गलत है। कृपया 8-15 अंकों का सही K-Number डालें।',
    });
  }

  // Ensure credentials are in .env
  const apiKey = process.env.PAY2ALL_API_KEY || process.env.AVVNL_API_KEY;
  const billerId = process.env.PAY2ALL_BILLER_ID || 'AVVNL_DEFAULT'; 

  if (!apiKey) {
    console.error('[AVVNL] Missing PAY2ALL_API_KEY in .env');
    return res.status(503).json({
      success: false,
      error:   'not_configured',
      message: 'API service temporarily unavailable (API Key missing)',
    });
  }

  const timeout = parseInt(process.env.API_TIMEOUT || '20000', 10);

  try {
    const payload = {
      biller_id: billerId,
      mobile_number: "9876543210", // Dummy required for fetch
      params: { 
        "K Number": cleanK
      }
    };

    const response = await axios.post(`${PAY2ALL_BASE_URL}/bbps/fetch`, payload, {
      timeout,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json'
      },
      validateStatus: () => true, // Handle all statuses
    });

    const raw = response.data;
    if (IS_DEV) {
      console.log('[AVVNL DEV] HTTP Status :', response.status);
      console.log('[AVVNL DEV] Raw Response :', JSON.stringify(raw, null, 2));
    }

    if (response.status !== 200 || raw.status_id !== 1) {
      const msg = (raw.message || '').toLowerCase();
      // Detect if it's a "Bill already paid" response from BBPS
      if (msg.includes('payment received') || msg.includes('no bill due')) {
        return res.status(200).json({
          success: true,
          isPaid: true,
          data: {
            operator: "AVVNL",
            status: "PAID",
            dueAmount: 0,
            billAmount: 0,
            unitsConsumed: 0,
            customerName: "Saved in History / No Dues",
            billPeriod: "Paid",
            dueDate: "-"
          }
        });
      }

      const friendly = getFriendlyError(raw.message, response.status);
      return res.status(200).json({
        success: false,
        error:   friendly.code,
        message: raw.message || friendly.message,
        apiStatus: 'FAILED',
        devInfo: IS_DEV ? { httpStatus: response.status, raw } : undefined
      });
    }

    const data = raw.data || {};
    
    // Normalize response from Pay2All BBPS format
    const normalized = {
      operator:     "AVVNL",
      status:       "SUCCESS",
      dueAmount:    data.amount,
      dueDate:      data.dueDate,
      customerName: data.customerName,
      billNumber:   data.billNumber,
      billDate:     data.billDate,
      billPeriod:   data.billPeriod,
      refId:        data.referenceId,
      additionalInfo: data.additionalInfo // May contain units, readings etc
    };

    return res.status(200).json({
      success:   true,
      data:      normalized,
      fetchedAt: new Date().toISOString(),
      ...(IS_DEV ? { _raw: raw } : {}),
    });

  } catch (err) {
    if (IS_DEV) console.error('[AVVNL ERROR]', err.code, err.message);
    if (err.code === 'ECONNABORTED' || (err.message || '').includes('timeout')) {
      return res.status(504).json({ success: false, error: 'timeout', message: 'Internet connection check करें या बाद में try करें' });
    }
    return res.status(500).json({ success: false, error: 'server_error', message: 'कुछ गलत हुआ। कृपया बाद में try करें।' });
  }
});

module.exports = router;
