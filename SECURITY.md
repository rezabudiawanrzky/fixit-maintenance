# Security Policy - Tatalogam Lestari

## Melaporkan Kerentanan

Jika Anda menemukan kerentanan keamanan dalam proyek ini, kami sangat menghargai bantuan Anda untuk melaporkannya secara bertanggung jawab.

**JANGAN** membuka issue publik untuk masalah keamanan.

### Cara Melaporkan

1. Buka issue baru di repository ini
2. Beri label `security` pada issue
3. Jelaskan kerentanan yang ditemukan dengan detail
4. Jika memungkinkan, sertakan langkah reproduksi

Kami akan merespons laporan keamanan dalam waktu **48 jam**.

## Praktik Keamanan yang Diterapkan

- Password di-hash menggunakan **bcrypt** (10 rounds)
- Autentikasi menggunakan **JWT** dengan expiry 24 jam
- Role-based access control di setiap API endpoint
- Input validation di semua endpoint
- SQL injection prevention menggunakan parameterized queries
- Environment variables untuk konfigurasi sensitif

## Checklist Keamanan Production

Sebelum deploy ke production, pastikan:

- [ ] Ganti `JWT_SECRET` dengan random string minimal 32 karakter
- [ ] Ganti semua password default (admin, operator, maintenance)
- [ ] Gunakan PostgreSQL (bukan SQLite) untuk data persisten
- [ ] Setup HTTPS (SSL/TLS)
- [ ] Backup database secara berkala
- [ ] Update dependencies secara berkala (`npm audit fix`)
- [ ] Batasi akses database hanya dari IP yang diizinkan

## Versi yang Didukung

| Versi | Didukung |
|-------|----------|
| 1.x.x | ✅ Active |
| < 1.0 | ❌ End of Life |

## Terima Kasih

Terima kasih atas bantuan Anda dalam menjaga keamanan proyek ini! 
