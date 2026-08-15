# Changelog

Semua perubahan signifikan pada proyek ini akan didokumentasikan di file ini.

Format berdasarkan [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/),
dan proyek ini menggunakan [Semantic Versioning](https://semver.org/lang/id/).

## [1.0.0] - 2026-08-14

### Fitur Utama
- **Autentikasi & Role-Based Access** - Login dengan 3 role: Operator, Maintenance, Supervisor
- **Dashboard Interaktif** - Stats cards dan 3 grafik (bar per area, doughnut urgensi, line tren bulanan)
- **Pelaporan Kerusakan** - Form input untuk operator melaporkan kerusakan mesin
- **Manajemen Tiket** - Tabel tiket dengan search, filter status & urgensi, dan detail view
- **Update Status Perbaikan** - Maintenance dapat update status, teknisi, dan catatan perbaikan
- **Manajemen User** - Supervisor dapat menambah dan menghapus user
- **Export CSV** - Download laporan kerusakan ke file CSV
- **Role-Based UI** - Tab dan tombol muncul sesuai role user

### Teknologi
- Backend: Node.js + Express
- Database: SQLite (sql.js)
- Auth: JWT (bcryptjs + jsonwebtoken)
- Frontend: Tailwind CSS + Chart.js + FontAwesome

### Akun Default
- `admin` / `admin123` (Supervisor)
- `operator` / `operator123` (Operator)
- `maintenance` / `maintenance123` (Maintenance)
