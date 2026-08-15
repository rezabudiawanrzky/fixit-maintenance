const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, 'data');
const dbPath = path.join(dbDir, 'fixit.db');

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

let db = null;

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('operator', 'maintenance', 'supervisor')),
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_code TEXT UNIQUE NOT NULL,
      reporter_name TEXT NOT NULL,
      line_area TEXT NOT NULL,
      machine_name TEXT NOT NULL,
      urgency TEXT NOT NULL CHECK(urgency IN ('Rendah', 'Sedang', 'Tinggi')),
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open', 'In Progress', 'Closed')),
      technician TEXT DEFAULT '-',
      action_note TEXT DEFAULT '-',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      report_id INTEGER,
      type TEXT NOT NULL CHECK(type IN ('new_report', 'status_update', 'mention')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (report_id) REFERENCES reports(id)
    )
  `);

  seedDefaultUsers();
  save();
  return db;
}

function save() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function seedDefaultUsers() {
  const result = db.exec('SELECT COUNT(*) as c FROM users');
  const count = result[0]?.values[0][0] || 0;

  if (count === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.run('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)', ['admin', hash, 'Administrator', 'supervisor']);

    const opHash = bcrypt.hashSync('operator123', 10);
    db.run('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)', ['operator', opHash, 'Operator Lini', 'operator']);

    const mtHash = bcrypt.hashSync('maintenance123', 10);
    db.run('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)', ['maintenance', mtHash, 'Teknisi Maintenance', 'maintenance']);

    console.log('Default users created (admin/admin123, operator/operator123, maintenance/maintenance123)');
  }
}

// Helper: run query and return array of objects
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper: run query and return single object
function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results[0] || null;
}

// Helper: run statement (INSERT, UPDATE, DELETE)
function execute(sql, params = []) {
  db.run(sql, params);
  const lastId = db.exec('SELECT last_insert_rowid()')[0]?.values[0][0];
  save();
  return { lastInsertRowid: lastId };
}

module.exports = { initDatabase, queryAll, queryOne, execute, save };
