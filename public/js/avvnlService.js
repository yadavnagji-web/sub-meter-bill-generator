/**
 * avvnlService.js
 * Frontend service layer for calling our secure backend proxy.
 *
 * SECURITY:
 * - This file calls /api/avvnl/bill on OUR server (NOT MSR Pay directly)
 * - API credentials are NEVER stored or referenced here
 * - No API key, no username in this file
 */

'use strict';

const AVVNLService = (() => {
  // Debounce state
  let _lastFetchTime = 0;
  const MIN_FETCH_INTERVAL_MS = 5000; // 5 seconds minimum between fetches

  /**
   * Fetch the latest AVVNL bill for a K-Number.
   * Calls our own backend proxy at /api/avvnl/bill.
   *
   * @param {string} kNumber - Customer K-Number
   * @param {number} [timeout=15000] - Request timeout in ms
   * @returns {Promise<{success: boolean, data?: Object, error?: string, message?: string}>}
   */
  async function fetchBill(kNumber, timeout = 15000) {
    // ── Debounce rapid calls ──────────────────────────────────────────────────
    const now = Date.now();
    if (now - _lastFetchTime < MIN_FETCH_INTERVAL_MS) {
      return {
        success: false,
        error: 'debounced',
        message: 'बहुत जल्दी request। कृपया कुछ सेकंड wait करें।',
      };
    }
    _lastFetchTime = now;

    // ── Validate K-Number client-side ────────────────────────────────────────
    const cleaned = String(kNumber || '').replace(/\s/g, '');
    if (!cleaned || !/^\d{8,15}$/.test(cleaned)) {
      return {
        success: false,
        error: 'invalid_k_number',
        message: 'K-Number गलत है। कृपया 8-15 अंकों का K-Number डालें।',
      };
    }

    // ── Check network connectivity ────────────────────────────────────────────
    if (!navigator.onLine) {
      return {
        success: false,
        error: 'offline',
        message: 'Internet connection check करें',
        cached: true,
      };
    }

    // ── Fetch with timeout ────────────────────────────────────────────────────
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch('/api/avvnl/bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept':       'application/json',
        },
        body: JSON.stringify({ kNumber: cleaned }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // ── Parse response ──────────────────────────────────────────────────────
      let json;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        json = await response.json();
      } else {
        // Non-JSON response (very unusual)
        return {
          success: false,
          error: 'invalid_response',
          message: 'API से response नहीं मिला',
        };
      }

      // ── Handle rate limit ───────────────────────────────────────────────────
      if (response.status === 429) {
        return {
          success: false,
          error: 'rate_limited',
          message: json.message || 'बहुत अधिक requests। कृपया 15 मिनट बाद try करें।',
        };
      }

      // ── Handle server errors ────────────────────────────────────────────────
      if (response.status >= 500) {
        return {
          success: false,
          error: json.error || 'server_error',
          message: json.message || 'API service temporarily unavailable',
        };
      }

      // ── Return response as-is (server already normalized) ──────────────────
      return json;

    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        return {
          success: false,
          error: 'timeout',
          message: 'Internet connection check करें या बाद में try करें',
        };
      }

      if (!navigator.onLine) {
        return {
          success: false,
          error: 'offline',
          message: 'Internet connection check करें',
          cached: true,
        };
      }

      return {
        success: false,
        error: 'network_error',
        message: 'API service temporarily unavailable',
      };
    }
  }

  /**
   * Developer test: calls GET /api/avvnl/bill (dev only endpoint)
   * Returns raw response for debugging. Credentials are masked server-side.
   */
  async function devTestFetch(kNumber) {
    const cleaned = String(kNumber || '').replace(/\s/g, '');
    try {
      const response = await fetch(`/api/avvnl/bill?kNumber=${encodeURIComponent(cleaned)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      return await response.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  return { fetchBill, devTestFetch };
})();

window.AVVNLService = AVVNLService;
