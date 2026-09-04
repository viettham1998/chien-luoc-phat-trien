import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'data.sqlite');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT
    );

    CREATE TABLE IF NOT EXISTS kpis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      group_code TEXT,
      group_name TEXT,
      target_2030 TEXT,
      target_school REAL,
      target_school_text TEXT,
      method TEXT,
      lead_unit TEXT,
      lead_person TEXT,
      unit_kind TEXT DEFAULT 'count',   -- 'count' | 'ratio'
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kpi_id INTEGER NOT NULL REFERENCES kpis(id) ON DELETE CASCADE,
      unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
      target REAL DEFAULT 0,
      UNIQUE (kpi_id, unit_id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT NOT NULL DEFAULT 'editor',   -- 'super_admin' | 'editor'
      unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Append-only monthly figures. Never physically overwritten:
    -- correcting a month inserts a new row and flags the old one is_current=0.
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kpi_id INTEGER NOT NULL REFERENCES kpis(id) ON DELETE CASCADE,
      unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      value REAL NOT NULL DEFAULT 0,
      note TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      is_current INTEGER DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_entries_lookup ON entries(kpi_id, unit_id, year, month, is_current);
  `);
}

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) c FROM kpis').get().c;
  if (count > 0) return;

  const seed = JSON.parse(readFileSync(join(__dirname, 'seed.json'), 'utf8'));

  const insGroup = db.prepare('INSERT OR IGNORE INTO groups (code,name,sort_order) VALUES (?,?,?)');
  seed.groups.forEach((g, i) => insGroup.run(g.code, g.name, i));

  const insUnit = db.prepare('INSERT OR IGNORE INTO units (code,name,type) VALUES (?,?,?)');
  seed.units.forEach(u => insUnit.run(u.code, u.name, u.type || null));

  const unitByCode = {};
  for (const u of db.prepare('SELECT id,code FROM units').all()) unitByCode[u.code] = u.id;

  const insKpi = db.prepare(`INSERT OR IGNORE INTO kpis
    (code,name,group_code,group_name,target_2030,target_school,target_school_text,method,lead_unit,lead_person,unit_kind,sort_order)
    VALUES (@code,@name,@group,@groupName,@target2030,@targetSchoolNum,@targetSchoolText,@method,@lead,@leadPerson,@unitKind,@order)`);
  seed.kpis.forEach((k, i) => {
    const ts = typeof k.targetSchool === 'number' ? k.targetSchool : null;
    const isRatio = ts !== null && ts > 0 && ts <= 1;
    insKpi.run({
      code: k.code, name: k.name, group: k.group || null, groupName: k.groupName || '',
      target2030: k.target2030 || null,
      targetSchoolNum: ts,
      targetSchoolText: typeof k.targetSchool === 'string' ? k.targetSchool : null,
      method: k.method || null, lead: k.lead || null, leadPerson: k.leadPerson || null,
      unitKind: isRatio ? 'ratio' : 'count',
      order: k.order ?? i
    });
  });

  const kpiByCode = {};
  for (const k of db.prepare('SELECT id,code FROM kpis').all()) kpiByCode[k.code] = k.id;

  const insAlloc = db.prepare(`INSERT OR IGNORE INTO allocations (kpi_id,unit_id,target) VALUES (?,?,?)`);
  const allocAcc = {};
  for (const a of seed.allocations) {
    const kid = kpiByCode[a.kpi], uid = unitByCode[a.unit];
    if (!kid || !uid) continue;
    const key = kid + ':' + uid;
    allocAcc[key] = (allocAcc[key] || 0) + (a.target || 0);
  }
  for (const key of Object.keys(allocAcc)) {
    const [kid, uid] = key.split(':').map(Number);
    insAlloc.run(kid, uid, allocAcc[key]);
  }

  const insEntry = db.prepare(`INSERT INTO entries (kpi_id,unit_id,year,month,value,is_current) VALUES (?,?,?,?,?,1)`);
  // Collapse duplicate (kpi,unit,year,month) by summing.
  const entryAcc = {};
  for (const e of seed.entries) {
    const kid = kpiByCode[e.kpi], uid = unitByCode[e.unit];
    if (!kid || !uid) continue;
    const key = [kid, uid, e.year, e.month].join(':');
    entryAcc[key] = (entryAcc[key] || 0) + (e.value || 0);
  }
  const tx = db.transaction(() => {
    for (const key of Object.keys(entryAcc)) {
      const [kid, uid, y, m] = key.split(':').map(Number);
      insEntry.run(kid, uid, y, m, entryAcc[key]);
    }
  });
  tx();

  // Default super admin
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`INSERT OR IGNORE INTO users (username,password_hash,full_name,role) VALUES (?,?,?,?)`)
    .run('admin', hash, 'Quản trị hệ thống', 'super_admin');

  // A couple of demo editors bound to units, to illustrate scoping
  const demoUnit = db.prepare('SELECT id FROM units WHERE code=?').get('CNTT');
  if (demoUnit) {
    db.prepare(`INSERT OR IGNORE INTO users (username,password_hash,full_name,role,unit_id) VALUES (?,?,?,?,?)`)
      .run('cntt', bcrypt.hashSync('cntt123', 10), 'Trưởng Khoa CNTT', 'editor', demoUnit.id);
  }
  const demoUnit2 = db.prepare('SELECT id FROM units WHERE code=?').get('KHCN');
  if (demoUnit2) {
    db.prepare(`INSERT OR IGNORE INTO users (username,password_hash,full_name,role,unit_id) VALUES (?,?,?,?,?)`)
      .run('khcn', bcrypt.hashSync('khcn123', 10), 'Trưởng phòng KHCN', 'editor', demoUnit2.id);
  }

  console.log('[db] Seeded initial data.');
}

migrate();
seedIfEmpty();
