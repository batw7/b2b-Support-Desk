import { readFileSync, existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

function loadEnvFile() {
  const p = join(__dirname, '..', '.env');
  if (!existsSync(p)) return;
  const txt = readFileSync(p, 'utf8');
  for (const line of txt.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

async function main() {
  loadEnvFile();
  const { default: dataSource } = await import('../src/config/typeorm.config');
  await dataSource.initialize();

  const q = (sql: string) => dataSource.query(sql);

  try {
    await q('DELETE FROM ticket_attachments');
    await q('DELETE FROM ticket_replies');
    await q('DELETE FROM ticket_logs');
    await q('DELETE FROM tickets');
    await q('DELETE FROM activity_logs');
    try {
      await q('DELETE FROM article_comments');
    } catch {
      void 0;
    }

    await q(`DELETE FROM users WHERE role = 'user'`);
    console.log(
      '[reset-demo-data] Removed ticket attachments, replies, logs, tickets, and activity logs.',
    );
    console.log('[reset-demo-data] Removed customer accounts (role=user).');

    const uploadRoot = join(process.cwd(), process.env.UPLOAD_PATH || 'uploads');
    const ticketsDir = join(uploadRoot, 'tickets');
    if (existsSync(ticketsDir)) {
      rmSync(ticketsDir, { recursive: true, force: true });
      mkdirSync(ticketsDir, { recursive: true });
      console.log('[reset-demo-data] Cleared uploads/tickets:', ticketsDir);
    } else {
      mkdirSync(ticketsDir, { recursive: true });
      console.log('[reset-demo-data] Created uploads/tickets:', ticketsDir);
    }

    console.log('[reset-demo-data] Done. Owner, admin, and support accounts were kept.');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((e) => {
  console.error('[reset-demo-data] Error:', e);
  process.exit(1);
});
