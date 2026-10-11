const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('[db:reset] .env not found:', envPath);
    process.exit(1);
  }
  const txt = fs.readFileSync(envPath, 'utf8');
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

function buildSsl() {
  const useSsl =
    process.env.DB_SSL === 'true' || process.env.DB_SSL === 'require';
  if (!useSsl) return undefined;
  return {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  };
}

function assertDbName(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    console.error(
      '[db:reset] DB_DATABASE must start with a letter or underscore and contain only letters, digits, and underscores:',
      name,
    );
    process.exit(1);
  }
}

async function main() {
  loadEnv();
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const user = process.env.DB_USERNAME || 'postgres';
  const password = process.env.DB_PASSWORD ?? 'postgres';
  const targetDb = process.env.DB_DATABASE || 'nevers_support';
  assertDbName(targetDb);
  const ssl = buildSsl();

  const admin = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
    ssl,
  });

  const R = '\x1b[0m';
  const D = '\x1b[2m';
  const G = '\x1b[32m';
  const Y = '\x1b[33m';

  try {
    await admin.connect();
    await admin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [targetDb],
    );
    await admin.query(`DROP DATABASE IF EXISTS "${targetDb}"`);
    await admin.query(`CREATE DATABASE "${targetDb}"`);
    console.log(
      `${D}  [db:reset]${R} ${G}OK${R}  database recreated: ${targetDb} @ ${host}:${port}`,
    );
  } catch (e) {
    console.error(`${D}  [db:reset]${R} ${Y}ERROR${R}`, e.message || e);
    process.exit(1);
  } finally {
    await admin.end().catch(() => {});
  }
}

main();
