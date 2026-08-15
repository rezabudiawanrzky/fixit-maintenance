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
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi' });

  const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);
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
app.get('/api/reports', authMiddleware(), (req, res) => {
  const { search, status, urgency, line_area } = req.query;
  let sql = 'SELECT * FROM reports WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (machine_name LIKE ? OR reporter_name LIKE ? OR ticket_code LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (urgency) { sql += ' AND urgency = ?'; params.push(urgency); }
  if (line_area) { sql += ' AND line_area = ?'; params.push(line_area); }

  sql += ' ORDER BY created_at DESC';
  res.json(queryAll(sql, params));
});

app.post('/api/reports', authMiddleware(['operator', 'supervisor']), (req, res) => {
  const { reporter_name, line_area, machine_name, urgency, description } = req.body;
  if (!reporter_name || !line_area || !machine_name || !urgency || !description) {
    return res.status(400).json({ error: 'Semua field wajib diisi' });
  }

  const ticket_code = 'REQ-' + Math.floor(100000 + Math.random() * 900000);
  const result = execute(
    'INSERT INTO reports (ticket_code, reporter_name, line_area, machine_name, urgency, description) VALUES (?, ?, ?, ?, ?, ?)',
    [ticket_code, reporter_name, line_area, machine_name, urgency, description]
  );

  const report = queryOne('SELECT * FROM reports WHERE id = ?', [result.lastInsertRowid]);

  const allUsers = queryAll('SELECT id, role FROM users WHERE role IN (?, ?)', ['maintenance', 'supervisor']);
  for (const u of allUsers) {
    execute(
      'INSERT INTO notifications (user_id, report_id, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [u.id, report.id, 'new_report', `Laporan Baru: ${ticket_code}`, `Kerusakan ${machine_name} di ${line_area} (${urgency})`]
    );
  }

  res.status(201).json(report);
});

app.put('/api/reports/:id', authMiddleware(['maintenance', 'supervisor']), (req, res) => {
  const { id } = req.params;
  const { status, technician, action_note } = req.body;

  const existing = queryOne('SELECT * FROM reports WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: 'Tiket tidak ditemukan' });

  execute(
    `UPDATE reports SET status = ?, technician = ?, action_note = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
    [status || existing.status, technician || existing.technician, action_note || existing.action_note, id]
  );

  const updated = queryOne('SELECT * FROM reports WHERE id = ?', [id]);

  const allUsers = queryAll('SELECT id FROM users WHERE role = ?', ['supervisor']);
  for (const u of allUsers) {
    if (u.id !== req.user.id) {
      execute(
        'INSERT INTO notifications (user_id, report_id, type, title, message) VALUES (?, ?, ?, ?, ?)',
        [u.id, updated.id, 'status_update', `Status Update: ${updated.ticket_code}`, `Status diubah ke "${updated.status}" oleh ${req.user.name}`]
      );
    }
  }

  res.json(updated);
});

app.delete('/api/reports/:id', authMiddleware(['supervisor']), (req, res) => {
  const existing = queryOne('SELECT * FROM reports WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Tiket tidak ditemukan' });

  execute('DELETE FROM reports WHERE id = ?', [req.params.id]);
  res.json({ message: 'Tiket berhasil dihapus' });
});

// Notifications
app.get('/api/notifications', authMiddleware(), (req, res) => {
  const notifications = queryAll(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  res.json(notifications);
});

app.get('/api/notifications/unread-count', authMiddleware(), (req, res) => {
  const result = queryOne(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
    [req.user.id]
  );
  res.json({ count: result?.count || 0 });
});

app.put('/api/notifications/read', authMiddleware(), (req, res) => {
  execute('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [req.user.id]);
  res.json({ message: 'Semua notifikasi ditandai dibaca' });
});

app.put('/api/notifications/:id/read', authMiddleware(), (req, res) => {
  execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Notifikasi ditandai dibaca' });
});

// Dashboard
app.get('/api/dashboard/stats', authMiddleware(), (req, res) => {
  const total = queryOne('SELECT COUNT(*) as c FROM reports')?.c || 0;
  const open = queryOne("SELECT COUNT(*) as c FROM reports WHERE status = 'Open'")?.c || 0;
  const inProgress = queryOne("SELECT COUNT(*) as c FROM reports WHERE status = 'In Progress'")?.c || 0;
  const closed = queryOne("SELECT COUNT(*) as c FROM reports WHERE status = 'Closed'")?.c || 0;
  res.json({ total, open, inProgress, closed });
});

app.get('/api/dashboard/charts', authMiddleware(), (req, res) => {
  const byArea = queryAll('SELECT line_area, COUNT(*) as count FROM reports GROUP BY line_area ORDER BY count DESC');
  const byUrgency = queryAll('SELECT urgency, COUNT(*) as count FROM reports GROUP BY urgency');
  const byMonth = queryAll("SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count FROM reports GROUP BY month ORDER BY month DESC LIMIT 12");
  const byStatus = queryAll('SELECT status, COUNT(*) as count FROM reports GROUP BY status');
  res.json({ byArea, byUrgency, byMonth, byStatus });
});

// Users
app.get('/api/users', authMiddleware(['supervisor']), (req, res) => {
  res.json(queryAll('SELECT id, username, name, role, created_at FROM users ORDER BY created_at DESC'));
});

app.post('/api/users', authMiddleware(['supervisor']), (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) return res.status(400).json({ error: 'Semua field wajib diisi' });

  const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) return res.status(409).json({ error: 'Username sudah digunakan' });

  const hash = bcrypt.hashSync(password, 10);
  const result = execute('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)', [username, hash, name, role]);
  res.status(201).json({ id: result.lastInsertRowid, username, name, role });
});

app.delete('/api/users/:id', authMiddleware(['supervisor']), (req, res) => {
  if (req.user.id === parseInt(req.params.id)) return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri' });
  execute('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ message: 'User berhasil dihapus' });
});

// Export CSV
app.get('/api/reports/export', authMiddleware(), (req, res) => {
  const reports = queryAll('SELECT * FROM reports ORDER BY created_at DESC');
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
