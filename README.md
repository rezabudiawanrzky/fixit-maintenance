# Tatalogam Lestari - Sistem Pelaporan Kerusakan Mesin

> Aplikasi web open source untuk pelaporan dan pelacakan kerusakan mesin di lingkungan manufaktur.

<div align="center">

![License](https://img.shields.io/github/license/rezabudiawanrzky/fixit-maintenance?color=blue)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0-green?logo=node.js)
![Status](https://img.shields.io/badge/status-active-success)
![Issues](https://img.shields.io/github/issues/rezabudiawanrzky/fixit-maintenance)
![Forks](https://img.shields.io/github/forks/rezabudiawanrzky/fixit-maintenance)
![Stars](https://img.shields.io/github/stars/rezabudiawanrzky/fixit-maintenance)

</div>

Tatalogam Lestari membantu tim pabrik mengelola laporan kerusakan mesin secara digital — dari pelaporan oleh operator, penugasan teknisi, hingga tracking perbaikan selesai.

## ✨ Fitur

- **Autentikasi Multi-Role** — Operator, Maintenance, dan Supervisor dengan akses berbeda
- **Dashboard Interaktif** — Statistik real-time dan grafik (kerusakan per area, distribusi urgensi, tren bulanan)
- **Pelaporan Kerusakan** — Form input sederhana untuk operator melaporkan kerusakan
- **Manajemen Tiket** — Tabel tiket dengan pencarian, filter status & urgensi, dan detail view
- **Update Status** — Maintenance dapat update status perbaikan, teknisi, dan catatan tindakan
- **Manajemen User** — Supervisor dapat menambah dan menghapus user
- **Export CSV** — Download semua laporan ke file CSV untuk analisis lanjutan
- **Responsive UI** — Tampilan adaptif untuk desktop dan tablet

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Backend | Node.js + Express |
| Database | PostgreSQL (production) / SQLite (development) |
| Autentikasi | JWT (bcryptjs + jsonwebtoken) |
| Frontend | Tailwind CSS + Chart.js + FontAwesome |
| PWA | Service Worker + Web App Manifest |

## 📦 Instalasi

### Prasyarat

- [Node.js](https://nodejs.org/) versi 18 atau lebih baru
- PostgreSQL 14+ (untuk production)

### Langkah Instalasi

```bash
# Clone repository
git clone https://github.com/rezabudiawanrzky/fixit-maintenance.git
cd fixit-maintenance

# Install dependencies
npm install

# Copy environment file dan sesuaikan
cp .env.example .env
# Edit .env dengan DATABASE_URL dan JWT_SECRET Anda

# Jalankan server
npm start
```

Server akan berjalan di **http://localhost:3000**

### Mode Development

```bash
npm run dev
```

Mode ini menggunakan `node --watch` untuk auto-restart saat ada perubahan file.

## 🚀 Cara Menggunakan

### Akun Default

| Username | Password | Role | Akses |
|----------|----------|------|-------|
| `admin` | `admin123` | Supervisor | Full access: semua fitur + kelola user |
| `operator` | `operator123` | Operator | Buat laporan kerusakan |
| `maintenance` | `maintenance123` | Maintenance | Update status perbaikan |

> **Penting:** Ganti password default segera setelah instalasi untuk penggunaan production.

### Alur Kerja

1. **Operator** melaporkan kerusakan mesin melalui form "Buat Laporan"
2. **Supervisor** melihat tiket yang masuk di Dashboard
3. **Maintenance** menerima tiket, update status ke "In Progress", dan mencatat tindakan perbaikan
4. Setelah selesai, status diubah ke "Closed"
5. **Supervisor** dapat export semua data ke CSV untuk analisis

## 📁 Struktur Proyek

```
fixit-maintenance/
├── server.js              # Express server & API routes
├── db.js                  # Database layer (SQLite via sql.js)
├── package.json           # Dependencies & scripts
├── LICENSE                # MIT License
├── README.md              # Dokumentasi ini
├── CONTRIBUTING.md        # Panduan kontribusi
├── CHANGELOG.md           # Riwayat perubahan
├── .gitignore
├── data/
│   └── fixit.db           # SQLite database (auto-generated)
└── public/
    ├── index.html         # Dashboard utama (SPA)
    └── login.html         # Halaman login
```

## 🔌 API Endpoints

### Autentikasi

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| POST | `/api/login` | Login & dapatkan JWT token | - |
| GET | `/api/me` | Info user yang sedang login | ✅ |

### Laporan Kerusakan

| Method | Endpoint | Deskripsi | Auth | Role |
|--------|----------|-----------|------|------|
| GET | `/api/reports` | List semua laporan (support filter) | ✅ | Semua |
| POST | `/api/reports` | Buat laporan baru | ✅ | Operator, Supervisor |
| PUT | `/api/reports/:id` | Update status perbaikan | ✅ | Maintenance, Supervisor |
| DELETE | `/api/reports/:id` | Hapus laporan | ✅ | Supervisor |
| GET | `/api/reports/export` | Export CSV | ✅ | Semua |

**Query Parameters** (`GET /api/reports`):
- `search` — Cari berdasarkan nama mesin, pelapor, atau kode tiket
- `status` — Filter: `Open`, `In Progress`, `Closed`
- `urgency` — Filter: `Rendah`, `Sedang`, `Tinggi`

### Dashboard

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| GET | `/api/dashboard/stats` | Statistik ringkasan | ✅ |
| GET | `/api/dashboard/charts` | Data untuk grafik | ✅ |

### Manajemen User

| Method | Endpoint | Deskripsi | Auth | Role |
|--------|----------|-----------|------|------|
| GET | `/api/users` | List semua user | ✅ | Supervisor |
| POST | `/api/users` | Tambah user baru | ✅ | Supervisor |
| DELETE | `/api/users/:id` | Hapus user | ✅ | Supervisor |

## 🔒 Keamanan

- Password di-hash menggunakan **bcrypt** (10 rounds)
- Autentikasi menggunakan **JWT** dengan expiry 24 jam
- Role-based access control di setiap endpoint API
- Token dikirim via `Authorization: Bearer` header
- **PENTING:** Ganti `JWT_SECRET` di environment variable dengan random string yang kuat
- **PENTING:** Ganti password default segera setelah instalasi

### Production Checklist
- [ ] Ganti JWT_SECRET dengan random string (min 32 karakter)
- [ ] Ganti semua password default
- [ ] Gunakan PostgreSQL (bukan SQLite) untuk data persisten
- [ ] Setup HTTPS (otomatis di Railway/Cloudflare)
- [ ] Backup database secara berkala

## 🤝 Kontribusi

Kontribusi sangat diterima! Silakan baca [CONTRIBUTING.md](CONTRIBUTING.md) untuk panduan lengkap.

1. Fork repository ini
2. Buat branch fitur baru (`git checkout -b fitur/nama-fitur`)
3. Commit perubahan (`git commit -m 'feat: tambah fitur baru'`)
4. Push ke branch (`git push origin fitur/nama-fitur`)
5. Buat Pull Request

## 📄 Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE).

## 🤝 Komunitas & Dukungan

- 📖 [Dokumentasi](#-cara-menggunakan)
- 🐛 [Laporkan Bug](https://github.com/rezabudiawanrzky/fixit-maintenance/issues/new?template=bug_report.md)
- 💡 [Minta Fitur](https://github.com/rezabudiawanrzky/fixit-maintenance/issues/new?template=feature_request.md)
-  [Diskusi](https://github.com/rezabudiawanrzky/fixit-maintenance/discussions)
- 📜 [Code of Conduct](CODE_OF_CONDUCT.md)

## 🙏 Acknowledgements

- [Express](https://expressjs.com/) — Web framework
- [sql.js](https://sql.js.org/) — SQLite compiled to WebAssembly
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
- [Chart.js](https://www.chartjs.org/) — Grafik interaktif
- [FontAwesome](https://fontawesome.com/) — Icon library

---

Dibuat dengan ❤️ untuk dunia manufaktur Indonesia.
