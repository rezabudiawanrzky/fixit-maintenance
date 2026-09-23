const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'fixit.db');

let db = null;

// Pastikan folder data ada
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('SQLite database loaded from file');
  } else {
    db = new SQL.Database();
    console.log('SQLite database created');
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('operator', 'maintenance', 'supervisor')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      report_id INTEGER REFERENCES reports(id),
      type TEXT NOT NULL CHECK(type IN ('new_report', 'status_update', 'mention')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await seedDefaultUsers();
  saveDatabase();
  console.log('Database initialized successfully (SQLite)');
  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

async function seedDefaultUsers() {
  const result = db.exec('SELECT COUNT(*) as count FROM users');
  const count = result.length > 0 ? parseInt(result[0].values[0][0]) : 0;

  if (count === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.run('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)', ['admin', hash, 'Administrator', 'supervisor']);

    const opHash = bcrypt.hashSync('operator123', 10);
    db.run('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)', ['operator', opHash, 'Operator Lini', 'operator']);

    const mtHash = bcrypt.hashSync('maintenance123', 10);
    db.run('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)', ['maintenance', mtHash, 'Teknisi Maintenance', 'maintenance']);

    console.log('Default users created (admin/admin123, operator/operator123, maintenance/maintenance123)');
    saveDatabase();
  }
}

async function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await queryAll(sql, params);
  return rows[0] || null;
}

async function execute(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
  const result = db.exec('SELECT last_insert_rowid() as id');
  const lastId = result.length > 0 ? result[0].values[0][0] : null;
  return { lastInsertRowid: lastId };
}

module.exports = { initDatabase, queryAll, queryOne, execute };
