import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import type { ERPDatabase } from './src/types/erp';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = '/tmp/edutrack-erp-store.json';

let serverDb: ERPDatabase | null = null;

function readServerDb(): ERPDatabase | null {
  if (serverDb) return serverDb;
  try {
    if (fs.existsSync(STORE_PATH)) {
      serverDb = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')) as ERPDatabase;
      return serverDb;
    }
  } catch {
    // ignore corrupt snapshot
  }
  return null;
}

function writeServerDb(db: ERPDatabase): void {
  serverDb = db;
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(db), 'utf-8');
  } catch {
    // ignore disk write issues in ephemeral fs
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health & Integration Readiness
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'edutrack-erp-api',
      supabaseConfigured: Boolean(process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      whatsappConfigured: Boolean(process.env.WHATSAPP_CLOUD_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
      smsConfigured: Boolean(process.env.SMS_PROVIDER_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // Sync full multi-tenant database snapshot from browser persistence
  app.post('/api/tenant/sync', (req, res) => {
    const body = req.body as ERPDatabase;
    if (!body || !Array.isArray(body.institutes)) {
      res.status(400).json({ error: 'Invalid database payload' });
      return;
    }
    writeServerDb(body);
    res.json({ ok: true, institutes: body.institutes.length });
  });

  // Tenant-Isolated Server Query Endpoint (demonstrates backend RLS/tenant check)
  app.get('/api/tenant/:instituteId/summary', (req, res) => {
    const db = readServerDb();
    const { instituteId } = req.params;
    const headerInstitute = req.header('x-institute-id');
    const headerRole = req.header('x-user-role');

    if (!headerRole) {
      res.status(401).json({ error: 'Missing authentication headers' });
      return;
    }
    if (headerRole !== 'super_admin' && headerInstitute !== instituteId) {
      res.status(403).json({
        error: 'Tenant isolation violation: cross-institute access is prohibited by backend policy.',
      });
      return;
    }
    if (!db) {
      res.status(404).json({ error: 'Server store not yet hydrated' });
      return;
    }

    const institute = db.institutes.find((i) => i.id === instituteId);
    if (!institute) {
      res.status(404).json({ error: 'Institute not found' });
      return;
    }

    res.json({
      instituteId: institute.id,
      instituteName: institute.name,
      studentsCount: db.students.filter((s) => s.instituteId === instituteId && s.status === 'active').length,
      teachersCount: db.teachers.filter((t) => t.instituteId === instituteId && t.status === 'active').length,
      staffCount: db.staff.filter((s) => s.instituteId === instituteId && s.status === 'active').length,
    });
  });

  // Secure Server-Side Notification Dispatch Preview (WhatsApp Cloud API / DLT SMS)
  app.post('/api/notifications/dispatch', (req, res) => {
    const { instituteId, channel, recipientNumber, messageContent } = req.body || {};
    if (!instituteId || !channel || !recipientNumber || !messageContent) {
      res.status(400).json({ error: 'Missing required dispatch fields' });
      return;
    }

    const hasLiveWhatsApp = Boolean(
      process.env.WHATSAPP_CLOUD_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
    );
    const hasLiveSms = Boolean(process.env.SMS_PROVIDER_API_KEY);

    if (channel === 'whatsapp' && hasLiveWhatsApp) {
      res.json({
        mode: 'production_ready',
        delivered: false,
        note: 'WhatsApp Cloud API credentials detected; ready for template dispatch.',
      });
      return;
    }

    if (channel === 'sms' && hasLiveSms) {
      res.json({
        mode: 'production_ready',
        delivered: false,
        note: 'Indian DLT SMS credentials detected; ready for gateway dispatch.',
      });
      return;
    }

    res.json({
      mode: 'simulated_outbox',
      delivered: false,
      isSimulated: true,
      note: 'Simulated prototype dispatch only. External WhatsApp/SMS credentials are not configured.',
    });
  });

  // Vite middleware in development; static dist in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EduTrack ERP server running on http://localhost:${PORT}`);
  });
}

startServer();
