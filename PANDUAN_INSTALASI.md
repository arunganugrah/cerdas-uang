# Panduan Lengkap Cerdas Uang — Sampai Online

Panduan ini mengasumsikan kode aplikasi **Cerdas Uang** sudah Anda terima dalam
bentuk file `cerdas-uang.zip`. Ikuti urutan Bagian A → B → C, setiap perintah
Terminal bisa langsung disalin-tempel.

> Catatan posisi Terminal: sebelum menjalankan perintah apa pun, pastikan Anda
> berada di folder proyek. Aman selalu mengetik dulu:
> `cd ~/Projects/cerdas-uang`

---

## BAGIAN A — Memasang proyek di komputer

### A1. Siapkan folder proyek

1. Buat folder kerja, lalu pindahkan & ekstrak `cerdas-uang.zip` ke sana:

       mkdir -p ~/Projects
       cd ~/Projects
       unzip ~/Downloads/cerdas-uang.zip
       cd cerdas-uang

   (Bila zip-nya bukan di folder Downloads, sesuaikan path-nya.)

### A2. Pasang Node.js (bila belum punya)

1. Cek dulu apakah sudah terpasang:

       node -v

   Jika muncul versi (mis. `v20.11.0`), lanjut ke A3. Jika muncul "command not
   found", unduh dan pasang dari https://nodejs.org (pilih versi **LTS**).

### A3. Pasang semua dependency

    cd ~/Projects/cerdas-uang
    npm install

Proses ini mengunduh semua library yang dipakai (React, Firebase, dsb).
Tunggu sampai selesai — biasanya 1–2 menit.

### A4. Coba jalankan dulu (sebelum Firebase disambungkan)

    npm run dev

Buka `http://localhost:5173` di browser. Tampilan dasar Cerdas Uang akan
muncul, namun fitur login/sinkronisasi belum berfungsi — itu wajar, karena
Firebase belum disambungkan. Tekan `Ctrl+C` di Terminal untuk berhenti dulu,
lanjut ke Bagian B.

---

## BAGIAN B — Menyambungkan Firebase

### B1. Buat proyek Firebase (gratis)

1. Buka https://console.firebase.google.com — login dengan akun Google.
2. Klik **Add project** / **Tambah proyek**. Beri nama, misal `cerdas-uang`.
   Klik terus **Continue**. Untuk Google Analytics: boleh **dimatikan** (lebih
   simpel). Klik **Create project**, tunggu selesai, **Continue**.

### B2. Daftarkan aplikasi web & ambil config

1. Di halaman utama proyek, klik ikon **`</>`** (Web).
2. Beri nama app, misal `cerdas-uang-web`. **Jangan** centang Firebase Hosting
   (kita memakai Vercel). Klik **Register app**.
3. Muncul kode berisi objek `firebaseConfig` dengan beberapa nilai
   (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId,
   measurementId). **Biarkan halaman ini terbuka** — nilainya dipakai di B4.

### B3. Aktifkan 2 layanan

Di menu kiri Firebase Console:

- **Build > Authentication** → **Get started** → tab **Sign-in method** →
  aktifkan **Google** (klik, nyalakan toggle, pilih email support, **Save**) →
  aktifkan juga **Email/Password** → **Save**.
- **Build > Firestore Database** → **Create database** → pilih lokasi terdekat
  (mis. `asia-southeast2` untuk Jakarta) → mulai dalam **Production mode** →
  **Enable**.

> Catatan: kita TIDAK mengaktifkan **Storage**. Sejak akhir 2024, Firebase
> Storage versi gratis (Spark) sudah tidak tersedia untuk project baru — wajib
> upgrade ke Blaze meski pemakaiannya kecil. Solusinya, foto struk dikompresi
> habis langsung di browser lalu disimpan sebagai teks (base64) di Firestore
> — tetap gratis sepenuhnya di paket Spark, tanpa kartu kredit.

Kedua layanan di atas masih dalam paket gratis **Spark**. Anda tidak perlu
upgrade ke Blaze kecuali ingin mengaktifkan notifikasi terjadwal di Bagian
B7 (opsional, lihat catatan di sana).

### B4. Pasang config Firebase di proyek

Di Terminal:

    cd ~/Projects/cerdas-uang
    cp .env.example .env

Buka berkasnya:

    code .env

Isi setiap baris `VITE_FIREBASE_...=` dengan nilai yang sesuai dari B2.
Contoh setelah diisi (nilai Anda akan berbeda):

    VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
    VITE_FIREBASE_AUTH_DOMAIN=cerdas-uang.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=cerdas-uang
    VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
    VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
    VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

Baris `VITE_FIREBASE_VAPID_KEY` boleh dikosongkan dulu — diisi nanti di B7
(opsional, untuk notifikasi). Simpan (Cmd+S / Ctrl+S).

### B5. Pasang Security Rules (penting!)

**Firestore Rules** — di Console: Firestore Database > tab **Rules**, ganti
seluruh isinya dengan teks dari berkas `firestore.rules` yang sudah ada di
folder proyek Anda, lalu **Publish**.

Arti rules ini: setiap pengguna hanya bisa membaca dan menulis datanya
sendiri (transaksi, akun, foto struk yang tersimpan sebagai teks di dalam
dokumen transaksi) — tidak bisa melihat data pengguna lain. Ada juga
pembatasan ukuran khusus untuk koleksi `transactions`, sebagai pengaman kedua
agar foto struk yang disisipkan tidak melebihi batas 1MB per dokumen
Firestore (pengaman pertamanya sudah ditangani otomatis oleh aplikasi saat
mengompres foto).

### B6. Coba!

    npm run dev

Buka `http://localhost:5173`:

- Anda akan diarahkan ke `/auth` → klik **Lanjutkan dengan Google**, atau
  daftar dengan email & password.
- Setelah masuk, Anda akan melihat Dashboard kosong. Tap tombol **+** di
  tengah bawah untuk mencatat transaksi pertama Anda.
- Coba juga tombol **⚡ Cepat** di pojok kanan atas — ketik misalnya
  *"makan siang 35rb gopay"* dan lihat aplikasi otomatis menebak nominal,
  kategori, serta akunnya.
- Buka tab **Lainnya > Pengaturan** untuk memastikan status **Tersinkronisasi**
  muncul — tandanya Firebase sudah tersambung dengan benar.

Kalau ada error, buka Terminal yang menjalankan `npm run dev` dan baca tulisan
merahnya, atau buka Console browser (klik kanan → Inspect → tab Console) — itu
petunjuk masalahnya.

### B7. (Opsional) Aktifkan Notifikasi Pintar

Fitur ini mengirim notifikasi otomatis (peringatan budget, pengingat tagihan,
review bulanan) lewat Firebase Cloud Functions yang berjalan terjadwal.

> Catatan: langkah ini **memerlukan upgrade ke paket Blaze** di Firebase
> (pay-as-you-go). Selama pemakaian Anda di bawah 2 juta panggilan fungsi per
> bulan — yang sangat jauh dari kebutuhan 1 pengguna — biayanya tetap **Rp 0**.
> Anda bisa melewati langkah ini sepenuhnya; aplikasi tetap berjalan normal
> tanpa notifikasi terjadwal.

1. Firebase Console > **Project Settings (ikon gerigi)** > **Cloud Messaging**
   > scroll ke **Web configuration** > klik **Generate key pair**. Salin nilai
   **Key pair** yang muncul.
2. Tempel ke `.env`, baris `VITE_FIREBASE_VAPID_KEY=`.
3. Buka berkas `public/firebase-messaging-sw.js`, ganti seluruh nilai
   `GANTI_DENGAN_...` dengan nilai yang sama seperti di `.env` (file ini tidak
   bisa membaca `.env`, jadi nilainya ditulis langsung/hardcode).
4. Upgrade project ke **Blaze** lewat Console (klik ikon gerigi > Usage and
   billing > Modify plan), pasang kartu pembayaran sebagai jaga-jaga, lalu:

       npm install -g firebase-tools
       firebase login
       firebase init
       # Saat ditanya: pilih "Use an existing project" → pilih project Anda
       # Pilih fitur: Firestore, Functions (gunakan tombol spasi lalu Enter)
       firebase deploy --only functions

---

## BAGIAN C — Menerbitkan ke internet (GitHub + Vercel)

### C1. Simpan kode ke GitHub

1. Buat akun di https://github.com (gratis) bila belum punya.
2. Di Terminal:

       cd ~/Projects/cerdas-uang
       git init
       git add .
       git commit -m "Cerdas Uang v1.0"

3. Di GitHub: klik **+** kanan atas → **New repository**. Beri nama
   `cerdas-uang`, biarkan **kosong** (jangan centang "Add a README" — ini yang
   bisa bikin error saat push). Klik **Create repository**.
4. GitHub menampilkan blok "…or push an existing repository". Salin-tempel
   baris-barisnya ke Terminal. Bentuknya kira-kira:

       git remote add origin https://github.com/USERNAME-ANDA/cerdas-uang.git
       git branch -M main
       git push -u origin main

   Saat diminta login, ikuti petunjuk (biasanya lewat browser).

### C2. Terbitkan dengan Vercel

1. Buka https://vercel.com → **Sign up** pakai akun GitHub.
2. **Add New… > Project** → pilih repo `cerdas-uang` → **Import**.
3. Sebelum klik Deploy, buka bagian **Environment Variables**. Salin-tempel
   seluruh isi `.env` Anda satu per satu (nama variabel & nilainya) — ini
   wajib, karena Vercel tidak membaca file `.env` Anda secara otomatis.
4. Klik **Deploy**. Tunggu 1–2 menit.
5. Selesai — Anda dapat link seperti `https://cerdas-uang-xxxx.vercel.app`.
   Itu bisa dibuka siapa saja, di HP mana pun, dan langsung berfungsi sebagai
   aplikasi (PWA) yang bisa di-*install* lewat tombol "Add to Home Screen" /
   "Install app" di browser.

> Penting: di Firebase Console > Authentication > Settings > **Authorized
> domains**, tambahkan domain Vercel Anda (mis. `cerdas-uang-xxxx.vercel.app`)
> agar login Google/Email tetap jalan di situs online.

### C3. Ganti logo & ikon aplikasi

Logo bawaan di proyek hanyalah contoh sementara. Setelah Anda punya desain
sendiri:

1. Siapkan logo persegi (disarankan format PNG/SVG, minimal 512×512px).
2. Ganti berkas `public/logo.svg` dengan logo Anda, lalu generate ulang semua
   ukuran ikon (72px sampai 512px) ke folder `public/icons/` — bisa pakai
   situs gratis seperti https://realfavicongenerator.net atau alat favorit
   Anda sendiri.
3. Ganti juga `public/favicon.ico` dan `public/apple-touch-icon.png`.
4. Simpan perubahan, lalu ikuti langkah update situs di bawah agar tampil di
   versi online.

---

## Cara update situs nanti

Setiap kali Anda mengubah kode atau ingin menerbitkan perubahan:

    cd ~/Projects/cerdas-uang
    git add .
    git commit -m "perubahan saya"
    git push

Vercel otomatis menerbitkan ulang dalam ~1 menit. (Menambah transaksi,
akun, budget, atau goal lewat aplikasi TIDAK perlu push — itu langsung
tersimpan di Firebase/IndexedDB.)

---

## Ringkasan struktur folder akhir

    cerdas-uang/
      src/
        App.jsx              ← komponen utama & routing
        firebase.js          ← konfigurasi Firebase Anda
        db.js                ← skema database offline (IndexedDB)
        pages/               ← Dashboard, Transaksi, Akun, Budget, Goals, dst.
        components/          ← form input, grafik, navigasi
        utils/
          nlp.js              ← mesin parsing bahasa natural (tanpa AI)
          finance.js           ← skor kesehatan finansial, prediksi cashflow
          sync.js               ← sinkronisasi offline ke Firestore
          imageCompress.js      ← kompresi foto struk jadi base64 (tanpa Firebase Storage)
      functions/
        index.js              ← notifikasi terjadwal (opsional, lihat B7)
      public/
        icons/                 ← ikon PWA berbagai ukuran (ganti dengan logo Anda)
        logo.svg                ← logo dasar (ganti dengan desain Anda)
      .env                      ← kredensial Firebase Anda (jangan dibagikan/di-commit!)
      firestore.rules           ← aturan keamanan database

---

## Pertanyaan Umum

**Q: Apakah saya wajib pakai paket Blaze (berbayar) di Firebase?**
Tidak. Seluruh fitur inti — transaksi, akun, budget, goals, grafik, insights,
laporan, mode offline, termasuk foto struk — berjalan penuh di paket gratis
**Spark**. Blaze hanya diperlukan untuk fitur opsional Notifikasi Pintar
terjadwal di B7.

**Q: Kenapa aplikasi ini tidak memakai Firebase Storage untuk foto struk?**
Karena sejak akhir 2024, Firebase Storage versi gratis sudah tidak tersedia
untuk project baru — wajib upgrade ke Blaze meski pemakaiannya kecil.
Solusinya, foto struk dikompresi otomatis di browser (ukuran diperkecil,
kualitas diturunkan) lalu disimpan sebagai teks (base64) langsung di dalam
dokumen Firestore. Hasilnya tetap berfungsi normal dan tetap gratis
sepenuhnya.

**Q: Data saya aman tidak kalau disimpan di Firebase gratisan?**
Aman. `firestore.rules` memastikan hanya pemilik akun yang bisa
membaca/menulis datanya sendiri. Selama Anda tidak membagikan email &
password akun Google/Firebase Anda, data tetap privat.

**Q: Bagaimana kalau saya lupa mengisi `.env` dan langsung deploy?**
Aplikasi tetap bisa dibuka, tetapi semua fitur yang butuh Firebase (login,
sinkronisasi) akan gagal diam-diam. Selalu cek dulu di `localhost:5173`
sebelum push ke Vercel.
