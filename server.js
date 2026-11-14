'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const avvnlRouter = require('./api/avvnl');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_DEV = NODE_ENV === 'development';

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
      },
    },
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: IS_DEV
      ? true  // allow all origins in development
      : (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin) || (typeof origin === 'string' && origin.endsWith('.vercel.app'))) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Accept'],
    credentials: false,
  })
);

// ── Request parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan(IS_DEV ? 'dev' : 'combined'));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '30', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'too_many_requests',
    message: 'बहुत अधिक requests. कृपया 15 मिनट बाद try करें।',
  },
});

app.use('/api', apiLimiter);

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/avvnl', avvnlRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: NODE_ENV,
    avvnl_configured: !!(process.env.AVVNL_USERNAME && process.env.AVVNL_API_KEY),
  });
});

// ── Static PWA files ──────────────────────────────────────────────────────────
app.use(
  express.static(path.join(__dirname, 'public'), {
    etag: true,
    maxAge: IS_DEV ? 0 : '1d',
    index: 'index.html',
  })
);

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  // Never expose stack traces or API credentials to the client
  const statusCode = err.status || err.statusCode || 500;

  if (IS_DEV) {
    console.error('[ERROR]', err.message);
  }

  res.status(statusCode).json({
    success: false,
    error: 'server_error',
    message: 'Server error. कृपया बाद में try करें।',
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ Sub Meter Bill Generator running at http://localhost:${PORT}`);
    console.log(`   Environment: ${NODE_ENV}`);
    console.log(`   AVVNL Configured: ${!!(process.env.AVVNL_USERNAME && (process.env.AVVNL_API_KEY || process.env.PAY2ALL_API_KEY))}`);
    if (!process.env.AVVNL_API_KEY && !process.env.PAY2ALL_API_KEY) {
      console.warn('⚠️  WARNING: AVVNL_API_KEY or PAY2ALL_API_KEY not set. Bill fetching will fail.');
    }
  });
}

module.exports = app;
