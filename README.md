# ⚡ Sub Meter Bill Generator — AVVNL

A professional Hindi PWA (Progressive Web App) + Node.js backend that fetches AVVNL electricity bills via the MSR Pay API.

---

## 🔐 Security Architecture

```
Browser (PWA)
    │
    │  POST /api/avvnl/bill
    │  { kNumber: "130531010333" }   ← Only sends K-Number, never API key
    ▼
Express Server (Your Machine / VPS)
    │
    │  GET https://www.bijlimitraavvnl.com/api/Billfetch
    │  username=R5296890
    │  apikey=NAGJ112839007302    ← API key ONLY lives here, in .env
    │  number=130531010333
    │  operator=AVVR
    ▼
MSR Pay AVVNL API
```

**API credentials are NEVER sent to or stored in the browser.**

---

## 📁 Project Structure

```
d:\Flate Bill\
├── server.js              # Express server (entry point)
├── package.json
├── .env                   # ⚠️ NEVER commit — API credentials here
├── .env.example           # Safe template for .env
├── .gitignore
│
├── api/
│   └── avvnl.js           # /api/avvnl/bill proxy route
│
└── public/                # PWA frontend (static files)
    ├── index.html
    ├── manifest.json
    ├── sw.js              # Service Worker
    ├── css/
    │   ├── app.css        # Main styles
    │   └── print.css      # A4 print styles
    └── js/
        ├── normalizeAVVNL.js    # Response field normalizer
        ├── avvnlService.js      # Frontend API service
        ├── billHistory.js       # LocalStorage history manager
        ├── pdfGenerator.js      # PDF/Print generator
        └── app.js               # Main app controller
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
AVVNL_USERNAME=R5296890
AVVNL_API_KEY=YOUR_API_KEY_HERE
PORT=3000
NODE_ENV=development
AVVNL_API_BASE=https://www.bijlimitraavvnl.com/api
ALLOWED_ORIGINS=http://localhost:3000
API_TIMEOUT=15000
RATE_LIMIT_MAX=30
```

> ⚠️ **NEVER commit `.env` to Git.** It's already in `.gitignore`.

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js 18+
- npm

### Steps

```bash
# 1. Go to project folder
cd "d:\Flate Bill"

# 2. Install dependencies
npm install

# 3. Create .env file
copy .env.example .env
# Edit .env and add your AVVNL_API_KEY

# 4. Start the server
npm start

# For development with auto-restart:
npm run dev
```

Open: **http://localhost:3000**

---

## 🏗️ How to Deploy

### Option 1: VPS / Linux Server (Recommended)

```bash
# On your server
git clone <your-repo>
cd sub-meter-bill-generator
npm install --production

# Create .env on the server (don't upload from local)
nano .env
# Add AVVNL_API_KEY, PORT=80, NODE_ENV=production

# Use PM2 for production
npm install -g pm2
pm2 start server.js --name "bill-generator"
pm2 save
pm2 startup
```

### Option 2: Railway / Render / Heroku

1. Connect your GitHub repository
2. Set environment variables in the dashboard:
   - `AVVNL_USERNAME` = `R5296890`
   - `AVVNL_API_KEY` = your key
   - `NODE_ENV` = `production`
   - `ALLOWED_ORIGINS` = your domain

> **Important:** The MSR Pay API requires your **server's IP address** to be whitelisted.
> Contact MSR Pay support at 9799693398 / mahendrasinghrathore986@gmail.com
> to whitelist your server's IP.

### Option 3: Vercel (Serverless)

The current setup uses Express. For Vercel, you would need to adapt `api/avvnl.js` to a serverless function format. See Vercel docs.

---

## 🔑 How to Configure AVVNL API Credentials

1. Log in to https://www.bijlimitraavvnl.com
2. Go to API Key section
3. Copy your API key
4. Add to `.env`: `AVVNL_API_KEY=your_key_here`
5. Restart the server

---

## 🧪 How to Test

### Test the API endpoint manually

```bash
# Test health
curl http://localhost:3000/api/health

# Test bill fetch (POST with K-Number)
curl -X POST http://localhost:3000/api/avvnl/bill \
  -H "Content-Type: application/json" \
  -d '{"kNumber": "130531010333"}'

# Developer debug endpoint (dev mode only)
curl "http://localhost:3000/api/avvnl/bill?kNumber=130531010333"
```

### Test with browser
1. Open http://localhost:3000
2. Enter K-Number: `130531010333`
3. Click "Save K-Number"
4. Click "⚡ Fetch Latest Bill"

### Important: IP Whitelisting
The MSR Pay API requires your server's IP to be whitelisted.
- When running locally: your home/office IP
- When deployed: your VPS/cloud server IP

Until whitelisted, API returns: `"IP not matched!!"`

---

## ⚠️ Known Limitation: IP Whitelisting

The AVVNL MSR Pay API requires IP whitelisting. The error `"IP not matched!!"` means your server's IP is not registered with MSR Pay.

**Solution:** Contact MSR Pay at:
- Phone: 9799693398
- Email: mahendrasinghrathore986@gmail.com
- Request to whitelist your server/machine IP

---

## 🔧 Developer Mode

When running on `localhost`, the app shows:
- 🔧 Developer button in header
- API test screen in Settings tab
- Raw JSON response display
- Normalized response display
- API credentials shown as `**************` (masked)

---

## 📱 PWA Features

- ✅ Installable on Android/iOS/Desktop
- ✅ Offline support (cached bills shown when offline)
- ✅ Hindi UI
- ✅ Auto-fetch reminder (configurable interval)
- ✅ Bill history (last 24 bills)
- ✅ Print A4 bill
- ✅ Download PDF (via browser print dialog)
- ✅ Rate limiting (30 requests per 15 minutes per IP)
- ✅ Request timeout (15 seconds default)
- ✅ Debounce (5 seconds minimum between fetches)

---

## 🛡️ Security Checklist

- [x] API key stored only in `.env` (server-side)
- [x] `.env` in `.gitignore`
- [x] No API key in any frontend JS file
- [x] No API key in localStorage
- [x] CORS restricted to configured origins in production
- [x] Helmet.js security headers
- [x] Rate limiting on all API routes
- [x] K-Number validation (server-side + client-side)
- [x] Error messages never expose credentials or stack traces
- [x] Developer debug endpoint disabled in production
