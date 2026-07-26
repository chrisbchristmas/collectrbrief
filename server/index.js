// server/index.js — Express entry point
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import { runMigrations } from './db/index.js';
import subscribersRouter from './routes/subscribers.js';
import webhooksRouter from './routes/webhooks.js';
import adminRouter from './routes/admin.js';
import { scheduleBriefJob } from './jobs/sendBriefs.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Stripe webhook needs raw body — mount before json parser
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// API routes
app.use('/api/subscribers', subscribersRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/admin', adminRouter);

// Global error handler
app.use((err, req, res, _next) => {
  console.error('[Express]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

async function start() {
  await runMigrations();
  scheduleBriefJob();
  app.listen(PORT, () => console.log(`[Server] CollectrBrief API listening on :${PORT}`));
}

start().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
