# 💰 Cerdas Uang

Aplikasi Progressive Web App (PWA) manajemen keuangan pribadi — gratis, offline-first, dan tanpa AI berbayar. Dibangun dengan React + Vite + Firebase (free tier) + Vercel.

## ✨ Fitur Utama

- **Input Cepat via Bahasa Natural** — ketik "makan siang 35rb gopay" langsung otomatis terparse, tanpa AI berbayar (pure regex/rule-based, mendukung Bahasa Indonesia)
- **Transaksi lengkap** — pemasukan/pengeluaran/transfer, kategori 2 tingkat, tag, foto struk, lokasi, template, draft otomatis
- **Multi akun** — kas, bank, e-wallet, kartu kredit (dengan tgl jatuh tempo), investasi, rekonsiliasi saldo
- **Budget** — per kategori, bulanan/tahunan, rollover sisa budget, peringatan otomatis
- **Goals tabungan** — progress bar, milestone, estimasi waktu tercapai
- **7 jenis grafik** — pie, bar, area, radar, cashflow projection, year-over-year
- **Insights Explorer** — calendar heatmap, treemap, statistik (median, std dev, quartile), export CSV
- **Laporan** — laba-rugi bulanan, net worth, review bulanan otomatis, skor kesehatan finansial
- **Prediksi Cashflow** — proyeksi saldo 30/60/90 hari ke depan
- **Smart notifikasi** — via Firebase Cloud Messaging + Cloud Functions (gratis, dalam free tier)
- **Offline-first penuh** — semua fitur berjalan tanpa internet via IndexedDB (Dexie.js), sync otomatis saat online

## 🛠️ Stack Teknologi (100% Gratis)

| Layer | Teknologi | Tier Gratis |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind | - |
| State | Zustand | - |
| Offline DB | Dexie.js (IndexedDB) | Unlimited (lokal) |
| Cloud DB | Firebase Firestore (termasuk foto struk sebagai base64) | 1GB storage, 50K read/20K write per hari |
| Auth | Firebase Auth | Unlimited untuk Google/Email |
| Push notif | Firebase Cloud Messaging | Unlimited |
| Scheduled jobs | Cloud Functions (Blaze, tetap gratis di bawah limit) | 2M invocations/bulan |
| Hosting | Vercel | Unlimited untuk personal use |
| Charts | Recharts | - |

> **Catatan penting:** aplikasi ini **tidak memakai Firebase Storage** secara
> sengaja. Sejak akhir 2024, Firebase Storage versi gratis (Spark) sudah
> tidak tersedia untuk project baru — wajib upgrade ke Blaze. Sebagai
> gantinya, foto struk dikompresi habis di browser (`src/utils/imageCompress.js`)
> menjadi teks base64 berukuran kecil (~puluhan-ratusan KB), lalu disimpan
> langsung sebagai field di dokumen Firestore. Tetap 100% gratis di paket
> Spark, tanpa perlu kartu kredit.

## 🚀 Setup dari Awal

### 1. Clone & Install
```bash
npm install
```

### 2. Setup Firebase

1. Buka [Firebase Console](https://console.firebase.google.com) → Buat project baru
2. Aktifkan **Authentication** → Sign-in method → Google + Email/Password
3. Aktifkan **Firestore Database** → mode production
4. Project Settings → General → scroll ke "Your apps" → tambah Web App → copy config

> Tidak perlu mengaktifkan **Storage** — sejak akhir 2024 Storage versi gratis
> sudah tidak tersedia untuk project baru (wajib Blaze). Aplikasi ini memang
> didesain untuk tidak memakainya; foto struk disimpan sebagai base64
> terkompresi langsung di Firestore.

### 3. Konfigurasi Environment
```bash
cp .env.example .env
```
Isi `.env` dengan kredensial dari Firebase Console (langkah 2.6 di atas).

### 4. Setup Push Notification (Opsional)
1. Firebase Console → Project Settings → Cloud Messaging → Web configuration
2. Generate **VAPID key**, masukkan ke `.env` sebagai `VITE_FIREBASE_VAPID_KEY`
3. Edit `public/firebase-messaging-sw.js`, ganti placeholder config dengan config Firebase Anda (sama seperti di `.env`, tapi hardcoded karena service worker tidak bisa baca env vars)

### 5. Deploy Firestore Rules & Functions
```bash
npm install -g firebase-tools
firebase login
firebase init    # pilih project yang sudah dibuat
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions   # perlu Blaze plan
```

### 6. Jalankan Lokal
```bash
npm run dev
```

### 7. Deploy ke Vercel
```bash
npm install -g vercel
vercel
```
Atau hubungkan repo GitHub ke [vercel.com](https://vercel.com) → Import Project. Jangan lupa tambahkan semua environment variables dari `.env` di Vercel Dashboard → Settings → Environment Variables.

## 📁 Struktur Folder

```
cerdas-uang/
├── public/                  # Static assets, manifest, service worker
│   ├── icons/                # PWA icons berbagai ukuran (ganti dengan logo Anda)
│   ├── logo.svg               # Logo dasar (placeholder, silakan ganti)
│   └── firebase-messaging-sw.js
├── functions/                # Firebase Cloud Functions (notifikasi terjadwal)
│   └── index.js
├── src/
│   ├── components/
│   │   ├── transactions/     # Form input, picker kategori/akun, image upload
│   │   ├── nlp/               # Quick Input modal (natural language)
│   │   ├── charts/             # Health score, cashflow mini chart
│   │   └── layout/             # Layout, navigasi, notifikasi
│   ├── pages/                  # Dashboard, Transaksi, Akun, Budget, Goals, dst.
│   ├── stores/useStore.js     # Zustand global state
│   ├── utils/
│   │   ├── nlp.js               # Parser bahasa natural (tanpa AI!)
│   │   ├── finance.js           # Health score, cashflow prediction, monthly review
│   │   └── sync.js               # Offline-first sync queue ke Firestore
│   ├── db.js                    # Skema IndexedDB (Dexie)
│   └── firebase.js              # Inisialisasi Firebase
└── vercel.json
```

## 🧠 Cara Kerja Input Bahasa Natural (Tanpa AI)

Mesin parsing di `src/utils/nlp.js` menggunakan:
1. **Kamus kata kunci** untuk deteksi tipe (pemasukan/pengeluaran) dan kategori (mis. "kopi" → kategori Kopi & Minuman)
2. **Regex parser nominal** — mengenali format "15rb", "1.5jt", "150000"
3. **Parser tanggal relatif** — "kemarin", "tadi", nama hari
4. **Confidence score** — jika parsing kurang yakin, user diminta konfirmasi/edit manual sebelum simpan

Anda bisa memperluas kamus kata kunci (`CATEGORY_MAP`, `ACCOUNT_MAP`) di file tersebut sesuai kebiasaan transaksi Anda sendiri.

## 📝 Catatan Penting

- **Logo/Icon**: Placeholder ikon di `public/icons/` dan `public/logo.svg` dibuat otomatis sebagai contoh. Ganti dengan desain Anda sendiri lalu generate ulang seluruh ukuran (72–512px) sebelum production.
- **Kategori default**: Sudah diisi otomatis (`seedDefaultData()` di `src/db.js`) dengan kategori umum Indonesia (Gojek, GrabFood, PLN, dst). Edit fungsi ini untuk menyesuaikan.
- **Firebase Free Tier cukup untuk personal use**: Firestore 50K read + 20K write/hari sangat cukup untuk 1 pengguna aktif. Cloud Functions free tier 2M invocation/bulan jauh lebih dari cukup untuk notifikasi terjadwal harian.
- **Offline-first**: Data selalu disimpan ke IndexedDB lokal dulu, baru disinkronkan ke Firestore. App tetap berfungsi 100% tanpa internet.

## 🔮 Pengembangan Lanjutan (Ide)

- Scan QRIS/struk dengan OCR client-side (Tesseract.js, masih gratis)
- Split bill dengan teman (perlu sistem invite/sharing)
- Widget home screen (PWA shortcuts sudah disiapkan di `vite.config.js`)
- Import CSV dari mutasi bank (mapping kolom manual)
