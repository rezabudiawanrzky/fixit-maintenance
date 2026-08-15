const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { initDatabase, queryAll, queryOne, execute } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fixit-secret-key-change-in-production';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function authMiddleware(roles) {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token tidak ditemukan' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      if (roles && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Akses ditolak' });
      }
      next();
    } catch {
      return res.status(401).json({ error: 'Token tidak valid atau expired' });
    }
  };
}

// Auth
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi' });

  const user = await queryOne('SELECT * FROM users WHERE username = $1', [username]);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Username atau password salah' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
    JWT_SECRET, { expiresIn: '24h' }
  );

  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
});

app.get('/api/me', authMiddleware(), (req, res) => res.json({ user: req.user }));

// Reports
app.get('/api/reports', authMiddleware(), async (req, res) => {
  const { search, status, urgency, line_area } = req.query;
  let sql = 'SELECT * FROM reports WHERE 1=1';
  const params = [];
  let paramIdx = 1;

  if (search) {
    sql += ` AND (machine_name LIKE $${paramIdx} OR reporter_name LIKE $${paramIdx + 1} OR ticket_code LIKE $${paramIdx + 2})`;
    const s = `%${search}%`;
    params.push(s, s, s);
    paramIdx += 3;
  }
  if (status) { sql += ` AND status = $${paramIdx}`; params.push(status); paramIdx++; }
  if (urgency) { sql += ` AND urgency = $${paramIdx}`; params.push(urgency); paramIdx++; }
  if (line_area) { sql += ` AND line_area = $${paramIdx}`; params.push(line_area); paramIdx++; }

  sql += ' ORDER BY created_at DESC';
  const reports = await queryAll(sql, params);
  res.json(reports);
});

app.post('/api/reports', authMiddleware(['operator', 'supervisor']), async (req, res) => {
  const { reporter_name, line_area, machine_name, urgency, description } = req.body;
  if (!reporter_name || !line_area || !machine_name || !urgency || !description) {
    return res.status(400).json({ error: 'Semua field wajib diisi' });
  }

  const ticket_code = 'REQ-' + Math.floor(100000 + Math.random() * 900000);
  const result = await queryOne(
    'INSERT INTO reports (ticket_code, reporter_name, line_area, machine_name, urgency, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [ticket_code, reporter_name, line_area, machine_name, urgency, description]
  );

  const report = await queryOne('SELECT * FROM reports WHERE id = $1', [result.id]);

  const allUsers = await queryAll('SELECT id, role FROM users WHERE role IN ($1, $2)', ['maintenance', 'supervisor']);
  for (const u of allUsers) {
    await queryAll(
      'INSERT INTO notifications (user_id, report_id, type, title, message) VALUES ($1, $2, $3, $4, $5)',
      [u.id, report.id, 'new_report', `Laporan Baru: ${ticket_code}`, `Kerusakan ${machine_name} di ${line_area} (${urgency})`]
    );
  }

  res.status(201).json(report);
});

app.put('/api/reports/:id', authMiddleware(['maintenance', 'supervisor']), async (req, res) => {
  const { id } = req.params;
  const { status, technician, action_note } = req.body;

  const existing = await queryOne('SELECT * FROM reports WHERE id = $1', [id]);
  if (!existing) return res.status(404).json({ error: 'Tiket tidak ditemukan' });

  await queryAll(
    'UPDATE reports SET status = $1, technician = $2, action_note = $3, updated_at = NOW() WHERE id = $4',
    [status || existing.status, technician || existing.technician, action_note || existing.action_note, id]
  );

  const updated = await queryOne('SELECT * FROM reports WHERE id = $1', [id]);

  const allUsers = await queryAll('SELECT id FROM users WHERE role = $1', ['supervisor']);
  for (const u of allUsers) {
    if (u.id !== req.user.id) {
      await queryAll(
        'INSERT INTO notifications (user_id, report_id, type, title, message) VALUES ($1, $2, $3, $4, $5)',
        [u.id, updated.id, 'status_update', `Status Update: ${updated.ticket_code}`, `Status diubah ke "${updated.status}" oleh ${req.user.name}`]
      );
    }
  }

  res.json(updated);
});

app.delete('/api/reports/:id', authMiddleware(['supervisor']), async (req, res) => {
  const existing = await queryOne('SELECT * FROM reports WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Tiket tidak ditemukan' });

  await queryAll('DELETE FROM reports WHERE id = $1', [req.params.id]);
  res.json({ message: 'Tiket berhasil dihapus' });
});

// Notifications
app.get('/api/notifications', authMiddleware(), async (req, res) => {
  const notifications = await queryAll(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  res.json(notifications);
});

app.get('/api/notifications/unread-count', authMiddleware(), async (req, res) => {
  const result = await queryOne(
    'SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND is_read = false',
    [req.user.id]
  );
  res.json({ count: result?.count || 0 });
});

app.put('/api/notifications/read', authMiddleware(), async (req, res) => {
  await queryAll('UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false', [req.user.id]);
  res.json({ message: 'Semua notifikasi ditandai dibaca' });
});

app.put('/api/notifications/:id/read', authMiddleware(), async (req, res) => {
  await queryAll('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ message: 'Notifikasi ditandai dibaca' });
});

// Dashboard
app.get('/api/dashboard/stats', authMiddleware(), async (req, res) => {
  const total = (await queryOne('SELECT COUNT(*)::int as c FROM reports'))?.c || 0;
  const open = (await queryOne("SELECT COUNT(*)::int as c FROM reports WHERE status = 'Open'"))?.c || 0;
  const inProgress = (await queryOne("SELECT COUNT(*)::int as c FROM reports WHERE status = 'In Progress'"))?.c || 0;
  const closed = (await queryOne("SELECT COUNT(*)::int as c FROM reports WHERE status = 'Closed'"))?.c || 0;
  res.json({ total, open, inProgress, closed });
});

app.get('/api/dashboard/charts', authMiddleware(), async (req, res) => {
  const byArea = await queryAll('SELECT line_area, COUNT(*)::int as count FROM reports GROUP BY line_area ORDER BY count DESC');
  const byUrgency = await queryAll('SELECT urgency, COUNT(*)::int as count FROM reports GROUP BY urgency');
  const byMonth = await queryAll("SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*)::int as count FROM reports GROUP BY month ORDER BY month DESC LIMIT 12");
  const byStatus = await queryAll('SELECT status, COUNT(*)::int as count FROM reports GROUP BY status');
  res.json({ byArea, byUrgency, byMonth, byStatus });
});

// Users
app.get('/api/users', authMiddleware(['supervisor']), async (req, res) => {
  const users = await queryAll('SELECT id, username, name, role, created_at FROM users ORDER BY created_at DESC');
  res.json(users);
});

app.post('/api/users', authMiddleware(['supervisor']), async (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) return res.status(400).json({ error: 'Semua field wajib diisi' });

  const existing = await queryOne('SELECT id FROM users WHERE username = $1', [username]);
  if (existing) return res.status(409).json({ error: 'Username sudah digunakan' });

  const hash = bcrypt.hashSync(password, 10);
  const result = await queryOne('INSERT INTO users (username, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id', [username, hash, name, role]);
  res.status(201).json({ id: result.id, username, name, role });
});

app.delete('/api/users/:id', authMiddleware(['supervisor']), async (req, res) => {
  if (req.user.id === parseInt(req.params.id)) return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri' });
  await queryAll('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ message: 'User berhasil dihapus' });
});

// Export CSV
app.get('/api/reports/export', authMiddleware(), async (req, res) => {
  const reports = await queryAll('SELECT * FROM reports ORDER BY created_at DESC');
  let csv = 'Kode Tiket,Tanggal,Pelapor,Lini Area,Mesin,Urgensi,Deskripsi,Status,Teknisi,Tindakan\n';
  reports.forEach(r => {
    csv += `"${r.ticket_code}","${r.created_at}","${r.reporter_name}","${r.line_area}","${r.machine_name}","${r.urgency}","${r.description}","${r.status}","${r.technician}","${r.action_note}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=Laporan_Kerusakan_Mesin_${new Date().toISOString().slice(0, 10)}.csv`);
  res.send(csv);
});

// Get local network IP
function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

// Start
async function start() {
  await initDatabase();
  const localIP = getLocalIP();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║  Tatalogam Lestari - Maintenance System                ║
  ║                                                      ║
  ║  Local:    http://localhost:${PORT}                     ║
  ║  Network:  http://${localIP}:${PORT}                     ║
  ║                                                      ║
  ║  Default accounts:                                   ║
  ║  admin / admin123            (Supervisor)            ║
  ║  operator / operator123      (Operator)              ║
  ║  maintenance / maintenance123  (Maintenance)         ║
  ╚══════════════════════════════════════════════════════╝
    `);
  });
}

start().catch(err => { console.error('Failed to start:', err); process.exit(1); });
