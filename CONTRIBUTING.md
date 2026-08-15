# Panduan Kontribusi Tatalogam Lestari

Terima kasih atas minat Anda untuk berkontribusi pada Tatalogam Lestari! 🎉

## Cara Berkontribusi

### 1. Fork & Clone Repository

```bash
git clone https://github.com/username/fixit-maintenance.git
cd fixit-maintenance
npm install
```

### 2. Buat Branch Baru

```bash
git checkout -b fitur/nama-fitur-anda
```

Gunakan prefix yang sesuai:
- `fitur/` - untuk fitur baru
- `perbaikan/` - untuk bug fix
- `docs/` - untuk perubahan dokumentasi
- `refactor/` - untuk refactoring kode

### 3. Develop & Test

- Jalankan server dalam mode development:
  ```bash
  npm run dev
  ```
- Pastikan kode Anda berjalan tanpa error
- Test semua fitur yang terpengaruh oleh perubahan Anda

### 4. Commit Perubahan

Gunakan conventional commit messages:

```
feat: tambah fitur export PDF
fix: perbaiki bug filter tanggal
docs: update README bagian instalasi
refactor: simplifikasi logika autentikasi
style: perbaiki format kode
test: tambah unit test untuk API reports
```

### 5. Push & Pull Request

```bash
git push origin fitur/nama-fitur-anda
```

Buat Pull Request ke branch `main` dengan deskripsi yang jelas:
- Apa yang diubah
- Mengapa diubah
- Bagaimana cara test
- Screenshot (jika perubahan UI)

## Standar Kode

### JavaScript
- Gunakan ES6+ syntax
- Indentasi 2 spasi
- Gunakan `const` dan `let`, hindari `var`
- Nama fungsi dan variabel menggunakan camelCase
- Nama konstanta menggunakan UPPER_SNAKE_CASE

### Struktur File
```
fixit-maintenance/
├── server.js          # Express server & API routes
├── db.js              # Database layer
├── public/            # Frontend files
│   ├── index.html     # Dashboard utama
│   └── login.html     # Halaman login
└── data/              # SQLite database (auto-generated)
```

### API Endpoints
- Gunakan RESTful conventions
- Response format: JSON
- Error handling: gunakan status code yang sesuai (400, 401, 403, 404, 500)
- Autentikasi: JWT Bearer token di header `Authorization`

## Pelaporan Bug

Gunakan template berikut saat membuat issue:

```markdown
**Deskripsi Bug**
Deskripsi singkat dan jelas tentang bug

**Langkah Reproduksi**
1. Login sebagai '...'
2. Klik pada '...'
3. Scroll ke '...'
4. Lihat error

**Expected Behavior**
Apa yang seharusnya terjadi

**Actual Behavior**
Apa yang sebenarnya terjadi

**Screenshots**
Jika ada, tambahkan screenshot

**Environment**
- OS: [misal: Windows 10]
- Node.js: [misal: v18.17.0]
- Browser: [misal: Chrome 120]
```

## Fitur Baru

Untuk fitur besar, silakan buat issue terlebih dahulu untuk diskusi.

## Pertanyaan?

Jangan ragu untuk membuka issue jika ada pertanyaan.

## License

Dengan berkontribusi, Anda setuju bahwa kontribusi Anda akan dilisensikan di bawah lisensi MIT.

---

Terima kasih sudah berkontribusi! ❤️
