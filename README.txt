NONTONKU ONLINE — PANDUAN DARI HP

HASIL AKHIR:
- Website publik: index.html
- Halaman admin: /admin.html
- Login admin memakai Supabase Auth
- Upload video dari HP
- Data film tersimpan online
- Video bisa diputar pengunjung

LANGKAH 1 — BUAT SUPABASE
1. Buka https://supabase.com/
2. Daftar/login.
3. Create new project.
4. Setelah project jadi, buka SQL Editor.
5. Salin semua isi file supabase.sql dan jalankan (Run).
6. Buka Authentication > Users > Add user.
7. Buat email + password admin.
8. Salin UUID user admin tersebut.
9. Kembali ke SQL Editor dan jalankan:
   insert into public.admin_users (user_id) values ('UUID_USER_ADMIN');
   Ganti UUID_USER_ADMIN dengan UUID akun admin.

LANGKAH 2 — AMBIL API
Supabase > Project Settings > API.
Ambil:
- Project URL
- Publishable key (atau anon key jika dashboard menampilkan itu)

Buka config.js dan ganti:
PASTE_SUPABASE_PROJECT_URL
SUDAH_DIISI_DI_config.js

JANGAN pernah memasukkan service_role key ke website.

LANGKAH 3 — ONLINEKAN DARI HP
1. Buka https://vercel.com/drop
2. Upload ZIP NontonKu.
3. Deploy.
4. Vercel akan memberikan URL website.
5. Link admin adalah:
   https://URL-KAMU.vercel.app/admin.html

CATATAN VIDEO:
- Paket Free Supabase saat ini membatasi ukuran satu file maksimal 50 MB.
- Untuk film lebih besar, gunakan paket/penyimpanan yang sesuai.
- Upload standar cocok untuk file kecil; untuk file di atas 6 MB Supabase merekomendasikan resumable upload/TUS.
- Website ini memakai upload standar agar pemasangan dari HP tetap sederhana.

LEGAL:
Upload hanya video/film yang kamu miliki atau punya izin untuk didistribusikan.


UPDATE: POSTER LANGSUNG DARI HP
- Versi ini sudah mendukung upload poster langsung sebagai file gambar dari HP; tidak perlu URL poster.
- Jalankan tambahan SQL pada file supabase.sql (bagian bucket posters) jika belum pernah dijalankan.
- Poster disimpan di Supabase Storage bucket `posters`.
- Batas poster pada halaman admin: 5 MB.


LINK FILM UNIK
Setiap film kini memakai URL seperti /film/judul-film/ID_FILM. File vercel.json diperlukan agar URL tersebut tetap membuka index.html saat di-deploy ke Vercel. Klik Bagikan Link pada detail film untuk membagikan URL film itu.
Catatan: preview Open Graph/thumbnail Facebook per film memerlukan metadata server-side atau halaman HTML khusus per film; fitur URL langsung ini saja belum menjamin thumbnail Facebook unik.


IKLAN ADSTERRA (DITAMBAHKAN)
- Kode zona yang diberikan dipasang di area iklan tepat di atas pemutar film.
- Script dimuat saat pemutar dibuka agar slot iklan tidak diinisialisasi ketika modal masih tersembunyi.
- Kode ini baru satu zona; area iklan beranda dan detail masih berupa placeholder. Untuk menampilkan iklan berbeda di area tersebut, tambahkan kode zona Adsterra masing-masing.
- Periksa tampilan setelah deployment. Pemblokir iklan, kebijakan browser, atau respons jaringan dapat membuat iklan tidak tampil.


LINK FILM + THUMBNAIL FACEBOOK (PEMBARUAN)
- URL tiap film memakai /film/slug/ID.
- Endpoint Vercel api/film.js mengambil data film dari Supabase dan menambahkan Open Graph metadata di sisi server (og:title, og:description, og:image, og:url), agar crawler Facebook dapat membaca poster.
- Poster harus berupa URL publik yang bisa diakses Facebook tanpa login.
- Setelah deploy, uji URL film lewat Facebook Sharing Debugger dan tekan Scrape Again untuk menyegarkan cache.
- Pastikan runtime Vercel Functions aktif pada project.
