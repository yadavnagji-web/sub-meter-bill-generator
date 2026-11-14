# ⚡ YADAV COMPLEX SAKODARA - Sub-Meter Electricity Bill Generator (PWA)

**Mo. No: 8384980657, 9982151938**  
A modern, zero-mismatch sub-meter electricity bill management system designed specifically for **Yadav Complex Sakodara (8 Flats)**. Built as an offline-first Progressive Web App (PWA), fully deployable to **Vercel** and publishable on **GitHub**.

---

## 🌟 Key Features

1. **Zero Mismatch Guarantee (सटीक मिलान):**
   - Employs the **Hare-Niemeyer (Largest Remainder) Algorithm** to guarantee that the sum of all flat bills strictly equals the government bill amount (e.g. ₹4,970) to the exact rupee.
   - All external figures and PDF printouts display **pure integers (दशमलव मुक्त)** without any trailing decimals.

2. **Both Readings 100% Editable (गत पठन व वर्तमान पठन दोनों सम्पादन योग्य):**
   - Flat readings can be directly edited anytime in the interactive table:
     - **वर्तमान पठन (मीटर रीडिंग):** Enter the physical meter reading read today (e.g. 2938, 2200, 2423, etc.).
     - **गत पठन:** Displays the previous reading (e.g. 2920) and is fully editable.
     - **बिल पठन:** Displays the 15-day gap adjusted reading after deducting common units (e.g. 2934), so that `वर्तमान - गत = यूनिट` ($2934 - 2920 = 14$).

3. **Automatic Rollover to Next Month (ऑटो-ट्रांसफर):**
   - Automatically archives the completed month's record into history.
   - Automatically transfers each flat's billed reading (`2934`, `2184`, `2408`, `2745`, `3184`, `2010`, `1547`, `2452`) into the next month's `गत पठन` (previous reading), so the user never has to re-type previous readings.

4. **Colourful & Attractive Print & PDF Designs:**
   - **A4 Master Sheet (COMPLEX LIGHT BILL):** Vibrant royal blue gradient header, color-coded badges (Green for units, Purple for CCTV/motor, Radiant Gold for total amount), and an amber-framed summary banner.
   - **8 Tenant Cut Slips (किरायेदार पर्चियां):** 2×4 grid on A4 with scissor cutting guidelines (`✂ - - -`), itemized consumption, motor share, and bold total due box.

5. **PWA Mobile App (मोबाइल पर इनस्टॉल एवं ऑफलाइन रन):**
   - Installable on Android (Chrome) and iOS (Safari) with native standalone app experience.
   - Service worker provides instant offline support.

6. **Instant WhatsApp Receipts:**
   - Generate one-click formatted WhatsApp bills and send directly to tenants.

---

## 📊 Live Sample Data (माह नवम्बर 2026)

- **सरकारी कुल यूनिट:** 607 | **सरकारी बिल राशि:** ₹4,970 | **कॉमन मोटर/CCTV:** 90 यूनिट  
- **कमरों की कुल यूनिट:** 517 ($607 - 90$)

| # | Room | वर्तमान पठन (मीटर) | गत पठन | बिल पठन | यूनिट | दर | राशि (₹) | CCTV मोटर (₹) | योग (₹) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Room 1 | 2938 | 2920 | 2934 | 14 | 8 | 115 | 92 | 207 |
| 2 | Room 2 | 2200 | 2127 | 2184 | 57 | 8 | 467 | 92 | 559 |
| 3 | Room 3 | 2423 | 2352 | 2408 | 56 | 8 | 459 | 92 | 551 |
| 4 | Room 4 | 2760 | 2690 | 2745 | 55 | 8 | 450 | 92 | 542 |
| 5 | Room 5 | 3196 | 3139 | 3184 | 45 | 8 | 368 | 92 | 460 |
| 6 | Room 6 | 2045 | 1883 | 2010 | 127 | 8 | 1040 | 92 | 1132 |
| 7 | Room 7 | 1572 | 1453 | 1547 | 94 | 8 | 770 | 92 | 862 |
| 8 | Room 8 | 2471 | 2383 | 2452 | 69 | 8 | 565 | 92 | 657 |
| 9 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 10| 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Σ**| **कुल** | **658** | - | - | **517** | **64** | **4234** | **736** | **4970** |

---

## 🚀 Deployment

### 1. GitHub
The repository is published on GitHub:
```bash
git push origin main
```

### 2. Vercel Deployment
1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Set Root Directory to `./` (or leave default).
3. Vercel uses `vercel.json` to automatically serve `/public` assets and serverless routes.
4. Click **Deploy** — your app is live on HTTPS with automatic SSL!

### 3. Local Development
```bash
npm install
npm start
# Opens on http://localhost:3000
```
