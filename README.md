# Ruang Tumbuh

PWA mobile-first untuk tracker goal, target, dan tugas harian. Aplikasi bekerja offline dan dapat dipasang ke layar utama ponsel.

## Fitur

- Dashboard progres harian dan total
- Goal, sub-goal, dan target angka
- Tugas harian dengan checklist
- Grafik konsistensi 7 hari
- Data lokal di browser (tidak hilang saat aplikasi ditutup)

## Publikasi gratis

1. Buat repositori GitHub lalu unggah seluruh isi folder ini.
2. Masuk ke Vercel dan pilih **Add New → Project**, lalu impor repositori tersebut.
3. Klik **Deploy**. Tidak perlu pengaturan build karena ini aplikasi statis.
4. Buka URL hasil deploy dari HP. Pilih **Add to Home Screen / Install app** di menu browser.

## Database cloud (Supabase)

Untuk sinkronisasi antar perangkat dan login, buat project Supabase gratis lalu jalankan file `supabase.sql` di **SQL Editor**. Setelah kredensial project tersedia, aplikasi dapat dihubungkan ke tabel tersebut melalui Supabase JavaScript client. Versi ini sengaja memakai penyimpanan lokal terlebih dahulu agar langsung dapat dipakai tanpa akun atau API key.
