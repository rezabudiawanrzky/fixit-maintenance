const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL;

let pool = null;

async function initDatabase() {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL && DATABASE_URL.includes('railway.internal') ? false : { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  });

  const maxRetries = 10;
  for (let i = 1; i <= maxRetries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connected successfully');
      break;
    } catch (err) {
      console.log(`Database connection attempt ${i}/${maxRetries} failed: ${err.code || err.message}`);
      if (i === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('operator', 'maintenance', 'supervisor')),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      ticket_code TEXT UNIQUE NOT NULL,
      reporter_name TEXT NOT NULL,
      line_area TEXT NOT NULL,
      machine_name TEXT NOT NULL,
      urgency TEXT NOT NULL CHECK(urgency IN ('Rendah', 'Sedang', 'Tinggi')),
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open', 'In Progress', 'Closed')),
      technician TEXT DEFAULT '-',
      action_note TEXT DEFAULT '-',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      report_id INTEGER REFERENCES reports(id),
      type TEXT NOT NULL CHECK(type IN ('new_report', 'status_update', 'mention')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await seedDefaultUsers();
  return pool;
}

async function seedDefaultUsers() {
  const result = await pool.query('SELECT COUNT(*) as count FROM users');
  const count = parseInt(result.rows[0].count);

  if (count === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await pool.query('INSERT INTO users (username, password, name, role) VALUES ($1, $2, $3, $4)', ['admin', hash, 'Administrator', 'supervisor']);

    const opHash = bcrypt.hashSync('operator123', 10);
    await pool.query('INSERT INTO users (username, password, name, role) VALUES ($1, $2, $3, $4)', ['operator', opHash, 'Operator Lini', 'operator']);

    const mtHash = bcrypt.hashSync('maintenance123', 10);
    await pool.query('INSERT INTO users (username, password, name, role) VALUES ($1, $2, $3, $4)', ['maintenance', mtHash, 'Teknisi Maintenance', 'maintenance']);

    console.log('Default users created (admin/admin123, operator/operator123, maintenance/maintenance123)');
  }
}

async function queryAll(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

async function queryOne(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

async function execute(sql, params = []) {
  const result = await pool.query(sql, params);
  const lastId = result.rows && result.rows[0] && result.rows[0].id
    ? result.rows[0].id
    : (result.rows && result.rows[0] && result.rows[0].lastval) || null;
  return { lastInsertRowid: lastId };
}

module.exports = { initDatabase, queryAll, queryOne, execute };
